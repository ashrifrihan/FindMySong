import type { Result } from "./types";
import { generateSoundKey, similarityScore, levenshteinDistance } from "./phonetics";
import { cleanIndianTitle, type ParsedQuery } from "./queryCleaner";

const COMPILATION_INDICATORS = [
  /\bbest\s+of\b/i,
  /\bgreatest\s+hits\b/i,
  /\bessentials?\b/i,
  /\bcollection\b/i,
  /\bcompilation\b/i,
  /\bvarious\s+artists\b/i,
  /\btop\s+\d+\b/i,
  /\bparty\s+hits\b/i,
  /\bthrowback\b/i,
];

/**
 * Determine specific version type from title
 */
export function detectVersionType(title: string): string {
  const lower = title.toLowerCase();
  if (/\b(slowed(\s*\+?\s*reverb)?|reverb)\b/i.test(lower)) return "Slowed + Reverb";
  if (/\b(sped\s*up|speed\s*up|speedup)\b/i.test(lower)) return "Sped Up";
  if (/\b8d(\s+audio)?\b/i.test(lower)) return "8D Audio";
  if (/\blo-?fi\b/i.test(lower)) return "Lofi";
  if (/\bremix\b/i.test(lower)) return "Remix";
  if (/\bacoustic\b/i.test(lower)) return "Acoustic";
  if (/\blive\b/i.test(lower)) return "Live";
  if (/\bbgm\b/i.test(lower)) return "BGM";
  if (/\btheme(\s+track|\s+music)?\b/i.test(lower)) return "Theme";
  if (/\binstrumental\b/i.test(lower)) return "Instrumental";
  if (/\bkaraoke\b/i.test(lower)) return "Karaoke";
  if (/\bcover\b/i.test(lower)) return "Cover";
  return "Original";
}

/**
 * Normalize a title to extract its base/canonical song name
 * e.g. "Hukum - From 'Jailer' (Remix)" -> "hukum"
 */
export function extractBaseTitle(title: string): string {
  const cleanedIndian = cleanIndianTitle(title);
  return cleanedIndian
    .toLowerCase()
    .replace(/\s*[\(\[](remix|live|acoustic|slowed|sped\s*up|speed\s*up|lo-?fi|karaoke|instrumental|cover|reverb|bgm|theme)[^\)\]]*[\)\]]/gi, "")
    .replace(/\s*[-–—]\s*(remix|live|acoustic|slowed|sped\s*up|speed\s*up|lo-?fi|karaoke|instrumental|cover|bgm|theme)\b/gi, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


/**
 * Step 3: Deduplicate identical recordings sharing the same ISRC code.
 * Keeps the best copy (original album/single, avoids "Best of 2024" compilations).
 */
export function deduplicateByCode(items: Result[]): Result[] {
  const map = new Map<string, Result>();

  for (const item of items) {
    if (!item.code) {
      // If no code, keep it under its unique key
      map.set(item.key, item);
      continue;
    }

    const codeKey = `${item.codeType}:${item.code}`;
    const existing = map.get(codeKey);

    if (!existing) {
      map.set(codeKey, item);
      continue;
    }

    // Compare which version is better to display
    const itemIsCompilation = item.album ? COMPILATION_INDICATORS.some((p) => p.test(item.album!)) : false;
    const existingIsCompilation = existing.album ? COMPILATION_INDICATORS.some((p) => p.test(existing.album!)) : false;

    if (existingIsCompilation && !itemIsCompilation) {
      // Replace compilation with non-compilation
      map.set(codeKey, item);
    } else if (itemIsCompilation === existingIsCompilation) {
      // Prefer the one with higher popularity rank or earliest release year
      const itemRank = item.rank || 0;
      const existingRank = existing.rank || 0;
      if (itemRank > existingRank) {
        map.set(codeKey, item);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Step 4: Multi-signal scoring engine.
 */
export function calculateItemScore(
  item: Result,
  parsed: ParsedQuery,
  querySoundKey: string,
  userCopiesMap?: Map<string, number>
): number {
  let score = 0;
  const cleanQ = parsed.cleaned;
  const titleLower = (item.title || "").toLowerCase();
  const artistLower = (item.artist || "").toLowerCase();
  const albumLower = (item.album || "").toLowerCase();

  const titleSoundKey = item.soundKey || generateSoundKey(titleLower);
  const artistSoundKey = generateSoundKey(artistLower);

  const cleanIndian = cleanIndianTitle(item.title).toLowerCase();
  const cleanIndianSoundKey = generateSoundKey(cleanIndian);

  // 1. Exact match signals (against full title and cleaned Indian movie title)
  if (titleLower === cleanQ || cleanIndian === cleanQ) {
    score += 120;
  } else if (titleLower.startsWith(cleanQ) || cleanIndian.startsWith(cleanQ)) {
    score += 50;
  } else if (titleLower.includes(cleanQ) || cleanIndian.includes(cleanQ)) {
    score += 30;
  }

  // 2. Sound-alike match (Layer 1)
  const soundKeyMatched =
    (titleSoundKey && querySoundKey && (titleSoundKey === querySoundKey || titleSoundKey.includes(querySoundKey))) ||
    (cleanIndianSoundKey && querySoundKey && (cleanIndianSoundKey === querySoundKey || cleanIndianSoundKey.includes(querySoundKey)));

  if (titleSoundKey === querySoundKey || cleanIndianSoundKey === querySoundKey) {
    score += 95;
  } else if (
    titleSoundKey.startsWith(querySoundKey) ||
    querySoundKey.startsWith(titleSoundKey) ||
    cleanIndianSoundKey.startsWith(querySoundKey)
  ) {
    score += 55;
  } else if (soundKeyMatched) {
    score += 40;
  } else {
    // Edit distance on sound keys (Layer 2)
    const dist = Math.min(
      levenshteinDistance(titleSoundKey, querySoundKey),
      levenshteinDistance(cleanIndianSoundKey, querySoundKey)
    );
    if (dist <= 1 && titleSoundKey.length >= 4) {
      score += 50;
    } else if (dist <= 2 && titleSoundKey.length >= 7) {
      score += 30;
    }
  }

  // 3. Typo similarity score (Layer 2)
  const titleSim = Math.max(
    similarityScore(cleanQ, titleLower),
    similarityScore(cleanQ, cleanIndian)
  );
  if (titleSim > 0.8) {
    score += Math.round(titleSim * 40);
  }


  // 4. Artist match signals
  if (parsed.artistHint) {
    if (artistLower.includes(parsed.artistHint.toLowerCase())) {
      score += 60;
    } else if (artistSoundKey.includes(generateSoundKey(parsed.artistHint))) {
      score += 45;
    }
  } else {
    // If the query matches artist name
    if (artistLower === cleanQ) {
      score += 65;
    } else if (artistLower.includes(cleanQ)) {
      score += 35;
    } else if (artistSoundKey === querySoundKey) {
      score += 40;
    }
  }

  // 5. Popularity from Deezer rank (0 - 1,000,000)
  if (typeof item.rank === "number" && item.rank > 0) {
    score += Math.min(30, Math.round(item.rank / 28000));
  }

  // 6. Has ISRC code boost (indispensable for Instagram)
  if (item.code) {
    score += 25;
  }

  // 7. Original release vs compilations
  if (item.album && COMPILATION_INDICATORS.some((p) => p.test(item.album!))) {
    score -= 15;
  }

  // 8. Negative signals for karaoke, covers, tributes, slowed, lofi (unless user requested!)
  const mods = parsed.userTypedModifiers;
  const version = detectVersionType(item.title);

  if (/karaoke|instrumental|tribute|backing\s+track/i.test(titleLower)) {
    if (!mods.karaoke && !mods.instrumental && !mods.tribute) {
      score -= 75;
    }
  }

  if (/\bcover\b/i.test(titleLower)) {
    if (!mods.cover) {
      score -= 60;
    }
  }

  if (/slowed|reverb/i.test(titleLower)) {
    if (!mods.slowed) {
      score -= 40;
    }
  }

  if (/sped\s*up|speed\s*up/i.test(titleLower)) {
    if (!mods.spedUp) {
      score -= 40;
    }
  }

  if (/lo-?fi/i.test(titleLower)) {
    if (!mods.lofi) {
      score -= 35;
    }
  }

  if (/8d(\s+audio)?/i.test(titleLower)) {
    if (!mods.eightD) {
      score -= 35;
    }
  }

  if (/\bremix\b/i.test(titleLower)) {
    if (!mods.remix) {
      score -= 20;
    }
  }

  if (/\blive\b/i.test(titleLower)) {
    if (!mods.live) {
      score -= 20;
    }
  }

  if (/\bacoustic\b/i.test(titleLower)) {
    if (!mods.acoustic) {
      score -= 20;
    }
  }

  if (/\b(bgm|theme|background\s+score|ost)\b/i.test(titleLower)) {
    if (mods.bgm || mods.theme) {
      score += 90; // Big boost when user actually searched for BGM/Theme!
    } else {
      score -= 25; // Slight push down for general searches so main song appears first
    }
  }

  // 9. Small boost for recent releases (within last 3 years)
  if (item.year) {

    const currentYear = new Date().getFullYear();
    const releaseYear = parseInt(item.year, 10);
    if (!isNaN(releaseYear) && currentYear - releaseYear <= 2) {
      score += 5;
    }
  }

  // 10. Step 6: Learn from users (Copy count boost)
  if (userCopiesMap && item.code) {
    const copies = userCopiesMap.get(item.code) || 0;
    if (copies > 0) {
      score += Math.min(60, copies * 15);
    }
  }

  return score;
}

/**
 * Step 5: Group alternate versions (remixes, slowed, live, acoustic) under original.
 */
export function groupSongVersions(songs: Result[]): Result[] {
  const groups = new Map<string, Result[]>();

  for (const song of songs) {
    const base = extractBaseTitle(song.title);
    const artist = (song.artist || "").toLowerCase().trim();
    const groupKey = `${artist}::${base}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(song);
  }

  const output: Result[] = [];

  for (const [, list] of groups) {
    if (list.length === 1) {
      list[0].versionType = detectVersionType(list[0].title);
      output.push(list[0]);
      continue;
    }

    // Sort list: original / highest scoring first
    list.sort((a, b) => {
      const aIsOrig = detectVersionType(a.title) === "Original" ? 1 : 0;
      const bIsOrig = detectVersionType(b.title) === "Original" ? 1 : 0;
      if (aIsOrig !== bIsOrig) return bIsOrig - aIsOrig;
      return (b.score || 0) - (a.score || 0);
    });

    const canonical = list[0];
    canonical.versionType = detectVersionType(canonical.title);

    const otherVersions = list.slice(1).map((v) => ({
      ...v,
      versionType: detectVersionType(v.title),
    }));

    if (otherVersions.length > 0) {
      canonical.versions = otherVersions;
    }

    output.push(canonical);
  }

  // Re-sort the grouped output by canonical score
  output.sort((a, b) => (b.score || 0) - (a.score || 0));

  return output;
}

/**
 * Full ranking and deduplication pipeline
 */
export function scoreAndRankResults(
  items: Result[],
  parsed: ParsedQuery,
  userCopiesMap?: Map<string, number>
): { results: Result[]; bestMatch?: Result } {
  const querySoundKey = generateSoundKey(parsed.cleaned);

  // 1. Deduplicate by ISRC code
  const deduplicated = deduplicateByCode(items);

  // 2. Score each item
  for (const item of deduplicated) {
    item.soundKey = generateSoundKey(item.title);
    item.score = calculateItemScore(item, parsed, querySoundKey, userCopiesMap);
  }

  // Separate songs and albums
  const songs = deduplicated.filter((x) => x.kind === "song");
  const albums = deduplicated.filter((x) => x.kind === "album");

  // Step 5: Group song versions
  const groupedSongs = groupSongVersions(songs);

  // Sort albums by score
  albums.sort((a, b) => (b.score || 0) - (a.score || 0));

  const finalResults = [...groupedSongs, ...albums];

  // Identify Best Match (top song with high score and clear separation)
  let bestMatch: Result | undefined;
  if (groupedSongs.length > 0) {
    const top = groupedSongs[0];
    if ((top.score || 0) >= 120) {
      top.isBestMatch = true;
      bestMatch = top;
    }
  }

  return { results: finalResults, bestMatch };
}
