import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { searchSpotifyTracks } from "@/lib/spotify";

export const dynamic = "force-dynamic";

/**
 * On-demand endpoint to fetch and cache an ISRC code for a song.
 * Rarely fails because single requests do not trigger bulk rate limits.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  const title = (req.nextUrl.searchParams.get("title") || "").trim();
  const artist = (req.nextUrl.searchParams.get("artist") || "").trim();

  if (!id && (!title || !artist)) {
    return NextResponse.json({ error: "Missing song identifiers" }, { status: 400 });
  }

  // 1. Check Supabase songs catalog first
  try {
    let query = db().from("songs").select("isrc, year").not("isrc", "is", null);
    if (id) {
      query = query.eq("key", id);
    } else {
      query = query.ilike("title", title).ilike("artist", `%${artist}%`);
    }
    const { data: existing } = await query.limit(1).maybeSingle();
    if (existing?.isrc) {
      return NextResponse.json({
        code: existing.isrc,
        codeType: "ISRC",
        year: existing.year || undefined,
        source: "catalog",
      });
    }
  } catch {}

  // 2. Query Spotify using title + artist (Spotify always returns ISRCs and release year)
  if (title) {
    try {
      const spotifyQuery = artist ? `track:${title} artist:${artist}` : title;
      const spotifyResults = await searchSpotifyTracks(spotifyQuery, 3);
      const match = spotifyResults.find((s) => s.code);
      if (match?.code) {
        // Persist to Supabase so it's cached permanently
        try {
          await db().from("songs").upsert({
            key: id || match.key,
            isrc: match.code,
            title: match.title || title,
            artist: match.artist || artist,
            year: match.year,
            updated_at: new Date().toISOString(),
          });
        } catch {}

        return NextResponse.json({
          code: match.code,
          codeType: "ISRC",
          year: match.year,
          source: "spotify",
        });
      }
    } catch {}
  }

  // 3. Query Deezer track details if id starts with "song-"
  if (id.startsWith("song-")) {
    const deezerId = id.replace("song-", "");
    try {
      const res = await fetch(`https://api.deezer.com/track/${deezerId}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.isrc) {
          const year = data.release_date ? data.release_date.slice(0, 4) : undefined;
          try {
            await db().from("songs").upsert({
              key: id,
              isrc: data.isrc,
              title: data.title || title,
              artist: data.artist?.name || artist,
              year,
              updated_at: new Date().toISOString(),
            });
          } catch {}

          return NextResponse.json({
            code: data.isrc,
            codeType: "ISRC",
            year,
            source: "deezer",
          });
        }
      }
    } catch {}
  }

  return NextResponse.json({ error: "Code not available for this recording" }, { status: 404 });
}
