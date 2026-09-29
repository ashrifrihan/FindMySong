import { NextRequest, NextResponse } from "next/server";
import { DAILY_LIMIT, consume, ipFrom } from "@/lib/quota";
import { db } from "@/lib/supabase";
import type { Result } from "@/lib/types";

export const dynamic = "force-dynamic";

// Deezer's public API: no key needed, returns ISRC (tracks) and UPC (albums).
const API = "https://api.deezer.com";
const CACHE_MS = 24 * 60 * 60 * 1000;

async function dz(path: string) {
  const res = await fetch(API + path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Music service returned ${res.status}`);
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message || "Music service error");
  return data;
}

type Settled<T> = PromiseSettledResult<T>;
const val = (s: Settled<any>) => (s.status === "fulfilled" ? s.value : null);

async function searchSongs(q: string, limit: number): Promise<Result[]> {
  const list = await dz(`/search/track?q=${encodeURIComponent(q)}&limit=${limit}`);
  const items: any[] = list.data || [];
  const details = await Promise.allSettled(items.map((t) => dz(`/track/${t.id}`)));
  return items.map((t, i) => {
    const d = val(details[i]);
    return {
      key: `song-${t.id}`,
      kind: "song",
      title: t.title,
      artist: t.artist?.name ?? "",
      album: t.album?.title,
      cover: t.album?.cover_medium ?? "",
      code: d?.isrc ?? null,
      codeType: "ISRC",
      preview: t.preview || undefined,
      explicit: !!t.explicit_lyrics,
      year: d?.release_date?.slice(0, 4),
    } as Result;
  });
}

async function searchAlbums(q: string, limit: number): Promise<Result[]> {
  const list = await dz(`/search/album?q=${encodeURIComponent(q)}&limit=${limit}`);
  const items: any[] = list.data || [];
  const details = await Promise.allSettled(items.map((a) => dz(`/album/${a.id}`)));
  return items.map((a, i) => {
    const d = val(details[i]);
    return {
      key: `album-${a.id}`,
      kind: "album",
      title: a.title,
      artist: a.artist?.name ?? "",
      cover: a.cover_medium ?? "",
      code: d?.upc ?? null,
      codeType: "UPC",
      explicit: !!a.explicit_lyrics,
      year: d?.release_date?.slice(0, 4),
    } as Result;
  });
}

async function runSearch(q: string, type: string) {
  if (type === "song") return searchSongs(q, 15);
  if (type === "album") return searchAlbums(q, 12);
  const [songs, albums] = await Promise.all([searchSongs(q, 10), searchAlbums(q, 5)]);
  return [...songs, ...albums];
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 120);
  const rawType = req.nextUrl.searchParams.get("type") || "all";
  const type = ["all", "song", "album"].includes(rawType) ? rawType : "all";

  if (!q) return NextResponse.json({ error: "Type a song, artist or album." }, { status: 400 });

  let left: number = DAILY_LIMIT;
  try {
    left = await consume(ipFrom(req.headers));
  } catch (err: any) {
    console.warn("Quota check error:", err?.message || err);
  }

  if (left < 0) {
    return NextResponse.json(
      { error: "You've used all 10 searches for today. They reset at midnight UTC.", remaining: 0, limit: DAILY_LIMIT },
      { status: 429 }
    );
  }

  const cacheKey = `${type}:${q.toLowerCase()}`;
  let results: Result[] | null = null;

  try {
    const { data: hit } = await db()
      .from("search_cache")
      .select("results")
      .eq("key", cacheKey)
      .gte("created_at", new Date(Date.now() - CACHE_MS).toISOString())
      .maybeSingle();

    if (hit?.results && Array.isArray(hit.results)) {
      results = hit.results as Result[];
    }
  } catch (cacheErr: any) {
    // If cache lookup fails (e.g. Supabase permission), proceed to live search
  }

  if (!results) {
    try {
      results = await runSearch(q, type);
      // Best-effort cache save
      try {
        await db().from("search_cache").upsert({ key: cacheKey, results, created_at: new Date().toISOString() });
      } catch {}
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message || "Search failed. Try again.", remaining: left, limit: DAILY_LIMIT },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ results, remaining: left, limit: DAILY_LIMIT });
}
