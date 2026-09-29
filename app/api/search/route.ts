import { NextRequest, NextResponse } from "next/server";
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
// Run in Mumbai, India for full Indian/Tamil music licensing availability
export const preferredRegion = ["bom1"];


// Deezer public API
const API = "https://api.deezer.com";
const CACHE_MS = 24 * 60 * 60 * 1000;

async function dz(path: string, timeoutMs = 4500) {
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

type Settled<T> = PromiseSettledResult<T>;
const val = (s: Settled<any>) => (s.status === "fulfilled" ? s.value : null);

/**
 * Fetch tracks from Deezer and look up ISRCs
 */
async function fetchDeezerTracks(query: string, limit = 25): Promise<Result[]> {
  try {
    const list = await dz(`/search/track?q=${encodeURIComponent(query)}&limit=${limit}`);
    const items: any[] = list.data || [];
    if (items.length === 0) return [];

    // Parallel fetch track details for ISRC and release year
    const details = await Promise.allSettled(
      items.map((t) => dz(`/track/${t.id}`, 3500))
    );

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
        rank: t.rank || 0,
      } as Result;
    });
  } catch {
    return [];
  }
}

/**
 * Fetch albums from Deezer
 */
async function fetchDeezerAlbums(query: string, limit = 10): Promise<Result[]> {
  try {
    const list = await dz(`/search/album?q=${encodeURIComponent(query)}&limit=${limit}`);
    const items: any[] = list.data || [];
    if (items.length === 0) return [];

    const details = await Promise.allSettled(
      items.map((a) => dz(`/album/${a.id}`, 3500))
    );

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
  } catch {
    return [];
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

  // Check remaining quota before searching
  let currentLeft: number = quotaCtx.limit;
  try {
    currentLeft = await remaining(quotaCtx.key, quotaCtx.limit);
  } catch {
    // Memory fallback handles this
  }

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


  // Cache key normalized by cleaned query text (e.g. "Naa Ready" & "naa ready song" share cache)
  const cacheKey = `${type}:${parsed.cleaned}`;
  let cachedResults: Result[] | null = null;
  let correction: SearchCorrection | undefined;

  try {
    const { data: hit } = await db()
      .from("search_cache")
      .select("results")
      .eq("key", cacheKey)
      .gte("created_at", new Date(Date.now() - CACHE_MS).toISOString())
      .maybeSingle();

    if (hit?.results && Array.isArray(hit.results) && hit.results.length > 0) {
      cachedResults = hit.results as Result[];
    }
  } catch {
    // If cache lookup fails, proceed to search
  }

  let finalResults: Result[] = [];
  let bestMatch: Result | undefined;

  if (cachedResults) {
    finalResults = cachedResults;
    if (finalResults.length > 0 && finalResults[0].isBestMatch) {
      bestMatch = finalResults[0];
    }
  } else {
    // ── Layer 6: Learned Corrections check ──
    let queryToSearch = parsed.cleaned;
    let usedCorrection = false;

    if (!forceExact) {
      const learned = await getLearnedCorrection(parsed.cleaned, soundKey);
      if (learned && learned.toLowerCase() !== parsed.cleaned) {
        queryToSearch = learned.toLowerCase();
        usedCorrection = true;
        correction = {
          original: rawQ,
          corrected: learned,
          type: "learned",
        };
      }
    }

    // ── Layer 3: Query own song catalog in Supabase first ──
    const ownCatalogItems = (type !== "album") ? await queryOwnCatalog(soundKey, parsed.cleaned) : [];

    // ── Query Deezer (Step 2: 25-30 songs instead of 10) ──
    const searchPromises: Promise<Result[]>[] = [];

    if (type === "all" || type === "song" || type === "artist") {
      // Primary: Spotify with India market (IN) for complete Tamil, Indian & film music catalogue
      searchPromises.push(searchSpotifyTracks(queryToSearch, 30));
      // Secondary / Backup: Deezer
      searchPromises.push(fetchDeezerTracks(queryToSearch, 30));
    }
    if (type === "all" || type === "album" || type === "artist") {
      searchPromises.push(searchSpotifyAlbums(queryToSearch, 10));
      searchPromises.push(fetchDeezerAlbums(queryToSearch, 10));
    }


    const initialResultsArrays = await Promise.all(searchPromises);
    let allCandidates = [...ownCatalogItems, ...initialResultsArrays.flat()];

    // ── Layer 4: Retry with corrected spellings if needed ──
    // If returned 0 songs or very few results, try 2-3 phonetically likely variants
    const songCount = allCandidates.filter((x) => x.kind === "song").length;
    if (songCount <= 2 && type !== "album" && !forceExact) {
      const variants = generateSpellingVariants(parsed.cleaned);
      if (variants.length > 0) {
        const variantPromises = variants.flatMap((v) => [
          searchSpotifyTracks(v, 15),
          fetchDeezerTracks(v, 15),
        ]);
        const variantResults = await Promise.allSettled(variantPromises);
        for (const res of variantResults) {
          if (res.status === "fulfilled" && res.value.length > 0) {
            allCandidates.push(...res.value);
            if (!correction) {
              const bestVariant = res.value[0];
              correction = {
                original: rawQ,
                corrected: bestVariant.title,
                type: "sound_alike",
              };
            }
          }
        }
      }
    }

    // ── Step 4 & 5: Multi-signal scoring, deduplication & version grouping ──
    const copyCounts = await getTrackCopyCounts();
    const ranked = scoreAndRankResults(allCandidates, parsed, copyCounts);
    finalResults = ranked.results;
    bestMatch = ranked.bestMatch;

    // Filter "All" tab intelligently (Step 7)
    if (type === "all") {
      const topSongScore = finalResults.find((r) => r.kind === "song")?.score || 0;
      // If album similarity is very poor, remove noise albums from "All" tab
      finalResults = finalResults.filter((r) => {
        if (r.kind !== "album") return true;
        const albumScore = r.score || 0;
        return albumScore >= 35 || albumScore >= topSongScore * 0.4;
      });
    }

    // ── Layer 5: "Did you mean..." banner check ──
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

    // ── Layer 3: Save discovered songs to catalog (non-blocking) ──
    if (finalResults.length > 0) {
      saveSongsToCatalog(finalResults).catch(() => {});
      // Cache results for 24h
      (async () => {
        try {
          await db()
            .from("search_cache")
            .upsert({
              key: cacheKey,
              results: finalResults,
              created_at: new Date().toISOString(),
            });
        } catch {}
      })();
    }
  }

  // ── Quota Rule: Only count against daily limit if it returned results! ──
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

