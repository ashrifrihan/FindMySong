/**
 * Phonetic Sound-Key Engine & Fuzzy Matching
 * Specialised for Tamil, Sinhala, and South Asian Romanized spellings.
 * 
 * Rules:
 * - th, dh, d, t -> treated as one sound ('d')
 * - aa, a -> 'a'
 * - ee, ii, i, y (in the middle/non-initial) -> 'i'
 * - oo, u -> 'u'
 * - zh, ll, l -> 'l'
 * - sh, s -> 's'
 * - ph, f -> 'f'
 * - Consonant + h (kh, gh, bh, ch) -> drop h
 * - Double consonants (nn, mm, ll, dd, tt, kk, pp, etc.) -> single letter
 */

/**
 * Generates a normalized phonetic sound key for a word or phrase.
 * Example:
 * "radhimaa" -> "radima"
 * "rathima"  -> "radima"
 * "naa ready" -> "naredi"
 * "na ready"  -> "naredi"
 */
export function generateSoundKey(input: string): string {
  if (!input) return "";

  let s = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s]/g, " ")   // replace non-alphanumeric with space
    .trim();

  // Split into words so we can apply intra-word rules
  const words = s.split(/\s+/).filter(Boolean);

  const processedWords = words.map((w) => {
    let word = w;

    // 1. Ph / f
    word = word.replace(/ph/g, "f");

    // 2. Zh / ll / l -> l
    word = word.replace(/zh/g, "l");

    // 3. Sh / s -> s
    word = word.replace(/sh/g, "s");

    // 4. Th / dh / t / d -> d
    word = word.replace(/th/g, "d").replace(/dh/g, "d").replace(/t/g, "d");

    // 5. Consonant + h -> drop h (kh -> k, gh -> g, bh -> b, jh -> j, ch -> c)
    word = word.replace(/([kgbjc])h/g, "$1");

    // 6. Long vowels to short vowels:
    // aa -> a
    word = word.replace(/aa+/g, "a");
    // ee / ii -> i
    word = word.replace(/ee+/g, "i").replace(/ii+/g, "i");
    // oo -> u
    word = word.replace(/oo+/g, "u");

    // 7. Middle 'y' acting as vowel sound 'i' (e.g. "readi" vs "ready", "mayilirage" vs "mailirage")
    // If 'y' is between consonants or at the end of word preceded by consonant:
    word = word.replace(/([^aeiou\s])y(?=[^aeiou\s]|$)/g, "$1i");

    // 8. Collapse consecutive identical letters (nn -> n, mm -> m, ll -> l, dd -> d, etc.)
    word = word.replace(/([a-z])\1+/g, "$1");

    return word;
  });

  return processedWords.join(" ").trim();
}

/**
 * Generates 2-4 high-probability spelling variants for Deezer fallback searches.
 * When Deezer fails on "rathima", these variants allow finding "radhima", "radhimaa", "rathimaa".
 */
export function generateSpellingVariants(query: string): string[] {
  const q = query.toLowerCase().trim();
  const variants = new Set<string>();

  // Rule A: th <-> dh <-> d
  if (q.includes("th")) {
    variants.add(q.replace(/th/g, "dh"));
    variants.add(q.replace(/th/g, "d"));
  }
  if (q.includes("dh")) {
    variants.add(q.replace(/dh/g, "th"));
    variants.add(q.replace(/dh/g, "d"));
  }
  if (q.includes("d") && !q.includes("dh")) {
    variants.add(q.replace(/d/g, "th"));
    variants.add(q.replace(/d/g, "dh"));
  }

  // Rule B: a <-> aa at end of word or middle
  if (/a$/.test(q)) {
    variants.add(q + "a");
  } else if (/aa$/.test(q)) {
    variants.add(q.slice(0, -1));
  }

  // Rule C: i <-> ee <-> y
  if (q.includes("i")) {
    variants.add(q.replace(/i/g, "ee"));
  }
  if (q.includes("ee")) {
    variants.add(q.replace(/ee/g, "i"));
  }
  if (q.endsWith("i")) {
    variants.add(q.slice(0, -1) + "y");
  } else if (q.endsWith("y")) {
    variants.add(q.slice(0, -1) + "i");
  }

  // Rule D: u <-> oo
  if (q.includes("u")) {
    variants.add(q.replace(/u/g, "oo"));
  }
  if (q.includes("oo")) {
    variants.add(q.replace(/oo/g, "u"));
  }

  // Rule E: zh <-> l
  if (q.includes("zh")) {
    variants.add(q.replace(/zh/g, "l"));
  }

  // Rule F: s <-> sh
  if (q.includes("sh")) {
    variants.add(q.replace(/sh/g, "s"));
  } else if (q.includes("s")) {
    variants.add(q.replace(/s/g, "sh"));
  }

  // Combinations (e.g. rathima -> radhimaa)
  if (q.includes("th") && q.endsWith("a")) {
    variants.add(q.replace(/th/g, "dh") + "a");
    variants.add(q.replace(/th/g, "d") + "a");
  }

  // Remove the original query itself
  variants.delete(q);

  // Return up to 3 most relevant variants
  return Array.from(variants).slice(0, 3);
}

/**
 * Standard Levenshtein edit distance
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Returns similarity ratio between 0 and 1
 */
export function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Trigram similarity (mimics PostgreSQL pg_trgm similarity function)
 */
export function trigramSimilarity(a: string, b: string): number {
  const cleanA = `  ${a.toLowerCase()} `;
  const cleanB = `  ${b.toLowerCase()} `;

  const getTrigrams = (str: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < str.length - 2; i++) {
      set.add(str.slice(i, i + 3));
    }
    return set;
  };

  const triA = getTrigrams(cleanA);
  const triB = getTrigrams(cleanB);

  if (triA.size === 0 && triB.size === 0) return 1.0;
  if (triA.size === 0 || triB.size === 0) return 0.0;

  let intersection = 0;
  for (const tri of triA) {
    if (triB.has(tri)) intersection++;
  }

  const union = triA.size + triB.size - intersection;
  return union > 0 ? intersection / union : 0.0;
}
