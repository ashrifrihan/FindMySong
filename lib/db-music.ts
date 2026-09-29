import { db } from "./supabase";
import type { Result } from "./types";
import { generateSoundKey, similarityScore, trigramSimilarity } from "./phonetics";

// In-memory resilient fallback cache for runtime reliability
const localSongCatalog = new Map<string, Result>();
const localCorrections = new Map<string, { targetTitle: string; targetIsrc: string; count: number }>();
const localCopiesMap = new Map<string, number>();

/**
 * Layer 3: Save discovered songs to the local Supabase songs catalog.
 * Runs non-blocking / background.
 */
export async function saveSongsToCatalog(items: Result[]) {
  // Always update in-memory cache
  for (const item of items) {
    if (item.kind === "song") {
      localSongCatalog.set(item.key, item);
      if (item.code) {
        localCopiesMap.set(item.code, (localCopiesMap.get(item.code) || 0));
      }
    }
  }

  // Best-effort Supabase upsert
  try {
    const songsToUpsert = items
      .filter((i) => i.kind === "song")
      .map((i) => ({
        key: i.key,
        isrc: i.code || null,
        title: i.title,
        artist: i.artist,
        album: i.album || null,
        cover: i.cover || null,
        preview: i.preview || null,
        year: i.year || null,
        explicit: !!i.explicit,
        sound_key: i.soundKey || generateSoundKey(i.title),
        artist_sound_key: generateSoundKey(i.artist),
        rank: i.rank || 0,
        updated_at: new Date().toISOString(),
      }));

    if (songsToUpsert.length === 0) return;

    await db().from("songs").upsert(songsToUpsert, { onConflict: "key" });
  } catch (err) {
    // Graceful fallback: silent or debug log
  }
}

/**
 * Layer 3: Query own song catalog by sound key or text similarity before Deezer.
 */
export async function queryOwnCatalog(soundKey: string, cleanQuery: string): Promise<Result[]> {
  const matches: Result[] = [];
  const seenKeys = new Set<string>();

  // 1. Try Supabase query
  try {
    const { data, error } = await db()
      .from("songs")
      .select("*")
      .or(`sound_key.eq.${soundKey},title.ilike.%${cleanQuery}%`)
      .order("copy_count", { ascending: false })
      .limit(15);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const item: Result = {
          key: row.key,
          kind: "song",
          title: row.title,
          artist: row.artist,
          album: row.album || undefined,
          cover: row.cover || "",
          code: row.isrc || null,
          codeType: "ISRC",
          preview: row.preview || undefined,
          explicit: !!row.explicit,
          year: row.year || undefined,
          rank: row.rank || 0,
          copyCount: row.copy_count || 0,
          soundKey: row.sound_key,
        };
        seenKeys.add(item.key);
        matches.push(item);
      }
    }
  } catch {
    // Proceed to memory fallback
  }

  // 2. Check in-memory catalog
  for (const item of localSongCatalog.values()) {
    if (seenKeys.has(item.key)) continue;

    const itemSoundKey = item.soundKey || generateSoundKey(item.title);
    const trigramSim = trigramSimilarity(item.title, cleanQuery);

    if (itemSoundKey === soundKey || trigramSim > 0.45 || item.title.toLowerCase().includes(cleanQuery)) {
      item.copyCount = localCopiesMap.get(item.code || "") || 0;
      matches.push(item);
      seenKeys.add(item.key);
    }
  }

  return matches;
}

/**
 * Layer 6: Get learned corrections for a query.
 * e.g. "rathima" -> "Radhimaa"
 */
export async function getLearnedCorrection(query: string, soundKey: string): Promise<string | null> {
  const q = query.toLowerCase().trim();

  // Check in-memory corrections
  const mem = localCorrections.get(q);
  if (mem && mem.count >= 2) {
    return mem.targetTitle;
  }

  // Check Supabase
  try {
    const { data } = await db()
      .from("search_corrections")
      .select("target_title, copy_count")
      .or(`query.eq.${q},sound_key.eq.${soundKey}`)
      .order("copy_count", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.target_title && (data.copy_count || 0) >= 2) {
      return data.target_title;
    }
  } catch {
    // Graceful fallback
  }

  return null;
}

/**
 * Layer 6: Get copies map for popular tracks to boost them in ranking.
 */
export async function getTrackCopyCounts(): Promise<Map<string, number>> {
  const map = new Map<string, number>(localCopiesMap);

  try {
    const { data } = await db()
      .from("songs")
      .select("isrc, copy_count")
      .gt("copy_count", 0);

    if (Array.isArray(data)) {
      for (const row of data) {
        if (row.isrc && row.copy_count) {
          map.set(row.isrc, Math.max(map.get(row.isrc) || 0, row.copy_count));
        }
      }
    }
  } catch {}

  return map;
}

/**
 * Layer 6: Record a copy event to learn what users found.
 */
export async function recordCopy(
  query: string,
  isrc: string,
  title: string,
  artist: string,
  itemKey: string
) {
  const q = (query || "").toLowerCase().trim();
  const sk = generateSoundKey(q);

  // Update memory counts
  if (isrc) {
    localCopiesMap.set(isrc, (localCopiesMap.get(isrc) || 0) + 1);
  }
  if (q && isrc) {
    const existing = localCorrections.get(q) || { targetTitle: title, targetIsrc: isrc, count: 0 };
    existing.count += 1;
    existing.targetTitle = title;
    localCorrections.set(q, existing);
  }

  // Update Supabase
  try {
    await db().rpc("record_song_copy", {
      p_query: q,
      p_sound_key: sk,
      p_isrc: isrc,
      p_title: title,
      p_artist: artist,
      p_item_key: itemKey,
    });
  } catch {
    // If RPC is unavailable, attempt direct updates
    try {
      if (itemKey) {
        // Best effort songs update
        const { data: song } = await db().from("songs").select("copy_count").eq("key", itemKey).maybeSingle();
        if (song) {
          await db().from("songs").update({ copy_count: (song.copy_count || 0) + 1 }).eq("key", itemKey);
        }
      }
      if (q && isrc) {
        await db().from("search_corrections").upsert({
          query: q,
          target_isrc: isrc,
          sound_key: sk,
          target_title: title,
          target_artist: artist,
          copy_count: 1,
          last_copied: new Date().toISOString(),
        }, { onConflict: "query,target_isrc" });
      }
    } catch {}
  }
}
