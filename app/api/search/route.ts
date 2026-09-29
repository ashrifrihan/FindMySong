import { NextRequest, NextResponse, after } from "next/server";
import { DAILY_LIMIT, consume, remaining, getQuotaContext } from "@/lib/quota";
import { db } from "@/lib/supabase";

import type { Result, SearchCorrection } from "@/lib/types";
import { cleanSearchQuery } from "@/lib/queryCleaner";
import { generateSoundKey, generateSpellingVariants, similarityScore } from "@/lib/phonetics";
import { scoreAndRankResults } from "@/lib/ranking";
import {
  saveSongsToCatalog,
  queryOwnCatalog,
  getLearnedCorrection,
  getTrackCopyCounts,
} from "@/lib/db-music";
import { searchSpotifyTracks, searchSpotifyAlbums } from "@/lib/spotify";

export const dynamic = "force-dynamic";

// Deezer public API fallback
const API = "https://api.deezer.com";
const CACHE_MS = 24 * 60 * 60 * 1000;

async function dz(path: string, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(API + path, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Music service returned ${res.status}`);
    const data = await res.json();
    if (data?.error) throw new Error(data.error.message || "Music service error");
    return data;
  } catch (err: any) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Lightweight Deezer track search: only 1 API call, does NOT fetch track details upfront.
 */
async function fetchDeezerTracksLight(query: string, limit = 25): Promise<Result[]> {
  try {
    const list = await dz(`/search/track?q=${encodeURIComponent(query)}&limit=${limit}`);
    const items: any[] = list.data || [];
    if (items.length === 0) return [];

    return items.map((t) => ({
      key: `song-${t.id}`,
      kind: "song",
      title: t.title,
      artist: t.artist?.name ?? "",
      album: t.album?.title,
      cover: t.album?.cover_medium ?? "",
      code: null,
      codeType: "ISRC",
      preview: t.preview || undefined,
      explicit: !!t.explicit_lyrics,
      year: undefined,
      rank: t.rank || 0,
    } as Result));
  } catch {
    return [];
  }
}

/**
 * Lightweight Deezer album search: only 1 API call, does NOT fetch album details upfront.
 */
async function fetchDeezerAlbumsLight(query: string, limit = 10): Promise<Result[]> {
  try {
    const list = await dz(`/search/album?q=${encodeURIComponent(query)}&limit=${limit}`);
    const items: any[] = list.data || [];
    if (items.length === 0) return [];

    return items.map((a) => ({
      key: `album-${a.id}`,
      kind: "album",
      title: a.title,
      artist: a.artist?.name ?? "",
      cover: a.cover_medium ?? "",
      code: null,
      codeType: "UPC",
      explicit: !!a.explicit_lyrics,
      year: undefined,
    } as Result));
  } catch {
    return [];
  }
}

/**
 * Hydrate ISRC / UPC codes only for top ranked Deezer items (max 5 songs, 1 album)
 * This cuts Deezer requests from 42+ down to 1-6 calls only when Deezer is used.
 */
async function hydrateDeezerCodes(results: Result[], maxSongs = 5, maxAlbums = 1) {
  const songsToHydrate = results
    .filter((r) => r.kind === "song" && r.key.startsWith("song-") && !r.code)
    .slice(0, maxSongs);

  const albumsToHydrate = results
    .filter((r) => r.kind === "album" && r.key.startsWith("album-") && !r.code)
    .slice(0, maxAlbums);

  const promises: Promise<void>[] = [];

  for (const song of songsToHydrate) {
    const id = song.key.replace("song-", "");
    promises.push(
      dz(`/track/${id}`, 3000)
        .then((data) => {
          if (data?.isrc) song.code = data.isrc;
          if (data?.release_date) song.year = data.release_date.slice(0, 4);
        })
        .catch(() => {})
    );
  }

  for (const album of albumsToHydrate) {
    const id = album.key.replace("album-", "");
    promises.push(
      dz(`/album/${id}`, 3000)
        .then((data) => {
          if (data?.upc) album.code = data.upc;
          if (data?.release_date) album.year = data.release_date.slice(0, 4);
        })
        .catch(() => {})
    );
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
}

export async function GET(req: NextRequest) {
  const rawQ = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 120);
  const rawType = req.nextUrl.searchParams.get("type") || "all";
  const type = ["all", "song", "album", "artist"].includes(rawType) ? rawType : "all";
  const forceExact = req.nextUrl.searchParams.get("exact") === "true";

  if (!rawQ) {
    return NextResponse.json({ error: "Type a song, artist or album." }, { status: 400 });
  }

  // Step 1: Clean search text and parse intent
  const parsed = cleanSearchQuery(rawQ);
  if (type === "artist") {
    parsed.artistHint = parsed.cleaned;
  }
  const soundKey = generateSoundKey(parsed.cleaned);
  parsed.soundKey = soundKey;

  const phoneCookie = req.cookies.get("findmysong_phone")?.value;
  const quotaCtx = getQuotaContext(req.headers, phoneCookie);
  const cacheKey = `${type}:${parsed.cleaned}`;

  // ── Step 2: Run all database checks concurrently ──
  // Quota check, cache check, learned corrections, and own song catalog run simultaneously.
  const quotaPromise = remaining(quotaCtx.key, quotaCtx.limit).catch(() => quotaCtx.limit);
  const cachePromise = Promise.resolve(
    db()
      .from("search_cache")
      .select("results")
      .eq("key", cacheKey)
      .gte("created_at", new Date(Date.now() - CACHE_MS).toISOString())
      .maybeSingle()
  ).catch(() => null);
  const learnedPromise = !forceExact ? getLearnedCorrection(parsed.cleaned, soundKey) : Promise.resolve(null);
  const ownCatalogPromise = type !== "album" ? queryOwnCatalog(soundKey, parsed.cleaned) : Promise.resolve([]);

  const [currentLeft, cacheHitRes, learned, ownCatalogItems] = await Promise.all([
    quotaPromise,
    cachePromise,
    learnedPromise,
    ownCatalogPromise,
  ]);

  // Quota limit enforcement
  if (currentLeft <= 0 && !quotaCtx.isMember) {
    return NextResponse.json(
      {
        error: "You've used all 10 free searches for today. Create an account with your mobile number to unlock unlimited searches!",
        remaining: 0,
        limit: quotaCtx.limit,
        isMember: false,
      },
      { status: 429 }
    );
  }

  // ── Cache Hit: Return immediately without any music API requests ──
  const cachedData = cacheHitRes?.data?.results;
  if (Array.isArray(cachedData) && cachedData.length > 0) {
    const cachedResults = cachedData as Result[];
    const bestMatch = cachedResults.length > 0 && cachedResults[0].isBestMatch ? cachedResults[0] : undefined;

    let remainingQuota = currentLeft;
    try {
      remainingQuota = await consume(quotaCtx.key, quotaCtx.limit);
    } catch {
      remainingQuota = Math.max(0, currentLeft - 1);
    }

    return NextResponse.json({
      results: cachedResults,
      bestMatch,
      remaining: remainingQuota,
      limit: quotaCtx.limit,
      isMember: quotaCtx.isMember,
    });
  }

  // ── Step 3: Music Service Search (Spotify First, Deezer as Backup) ──
  let queryToSearch = parsed.cleaned;
  let correction: SearchCorrection | undefined;

  if (learned && learned.toLowerCase() !== parsed.cleaned) {
    queryToSearch = learned.toLowerCase();
    correction = {
      original: rawQ,
      corrected: learned,
      type: "learned",
    };
  }

  // Primary: Spotify with India market (IN) covers complete South Asian catalog and includes ISRCs natively
  const spotifyPromises: Promise<Result[]>[] = [];
  if (type === "all" || type === "song" || type === "artist") {
    spotifyPromises.push(searchSpotifyTracks(queryToSearch, 30));
  }
  if (type === "all" || type === "album" || type === "artist") {
    spotifyPromises.push(searchSpotifyAlbums(queryToSearch, 10));
  }

  const spotifyResults = (await Promise.all(spotifyPromises)).flat();
  let allCandidates = [...ownCatalogItems, ...spotifyResults];

  // ── Step 4: Spelling Retry (Limited to Spotify only, max 2 variants) ──
  const songCandidatesCount = allCandidates.filter((x) => x.kind === "song").length;
  if (songCandidatesCount <= 2 && type !== "album" && !forceExact) {
    const variants = generateSpellingVariants(parsed.cleaned).slice(0, 2);
    if (variants.length > 0) {
      const variantResults = await Promise.allSettled(
        variants.map((v) => searchSpotifyTracks(v, 15))
      );
      for (const res of variantResults) {
        if (res.status === "fulfilled" && res.value.length > 0) {
          allCandidates.push(...res.value);
          if (!correction) {
            correction = {
              original: rawQ,
              corrected: res.value[0].title,
              type: "sound_alike",
            };
          }
        }
      }
    }
  }

  // ── Step 5: Deezer Backup (Only called if Spotify found nothing) ──
  const totalSongsFound = allCandidates.filter((x) => x.kind === "song").length;
  if (totalSongsFound === 0) {
    const dzPromises: Promise<Result[]>[] = [];
    if (type === "all" || type === "song" || type === "artist") {
      dzPromises.push(fetchDeezerTracksLight(queryToSearch, 25));
    }
    if (type === "all" || type === "album" || type === "artist") {
      dzPromises.push(fetchDeezerAlbumsLight(queryToSearch, 10));
    }
    const dzResults = (await Promise.all(dzPromises)).flat();
    allCandidates.push(...dzResults);
  }

  // ── Step 6: Multi-signal scoring, copy counts & ranking ──
  const candidateIsrcs = allCandidates
    .map((c) => c.code)
    .filter((c): c is string => Boolean(c));
  const copyCounts = await getTrackCopyCounts(candidateIsrcs);
  const ranked = scoreAndRankResults(allCandidates, parsed, copyCounts);
  let finalResults = ranked.results;
  let bestMatch = ranked.bestMatch;

  // Hydrate ISRC codes only for top 5 ranked songs if they came from Deezer fallback
  await hydrateDeezerCodes(finalResults, 5, 1);

  // Filter "All" tab intelligently
  if (type === "all") {
    const topSongScore = finalResults.find((r) => r.kind === "song")?.score || 0;
    finalResults = finalResults.filter((r) => {
      if (r.kind !== "album") return true;
      const albumScore = r.score || 0;
      return albumScore >= 35 || albumScore >= topSongScore * 0.4;
    });
  }

  // "Did you mean..." banner check
  if (!correction && bestMatch && !forceExact) {
    const matchTitleLower = bestMatch.title.toLowerCase();
    const matchSoundKey = bestMatch.soundKey || generateSoundKey(matchTitleLower);

    if (
      matchTitleLower !== parsed.cleaned &&
      (matchSoundKey === soundKey || similarityScore(parsed.cleaned, matchTitleLower) > 0.65)
    ) {
      correction = {
        original: rawQ,
        corrected: bestMatch.title,
        type: matchSoundKey === soundKey ? "sound_alike" : "typo",
      };
    }
  }

  // ── Step 7: Background persistence via Next.js after() ──
  // Non-blocking and guaranteed to finish even in serverless environments
  if (finalResults.length > 0) {
    after(async () => {
      try {
        await saveSongsToCatalog(finalResults);
      } catch {}
      try {
        await db().from("search_cache").upsert({
          key: cacheKey,
          results: finalResults,
          created_at: new Date().toISOString(),
        });
      } catch {}
    });
  }

  // ── Step 8: Consume quota only when results are returned ──
  let remainingQuota = currentLeft;
  if (finalResults.length > 0) {
    try {
      remainingQuota = await consume(quotaCtx.key, quotaCtx.limit);
    } catch {
      remainingQuota = Math.max(0, currentLeft - 1);
    }
  }

  return NextResponse.json({
    results: finalResults,
    bestMatch,
    remaining: remainingQuota,
    limit: quotaCtx.limit,
    isMember: quotaCtx.isMember,
    correction,
  });
}
