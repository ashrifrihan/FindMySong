/**
 * Step 1: Clean search text and parse intent.
 * Removes filler words, extracts artist/song splits, and detects modifier keywords.
 */

export interface ParsedQuery {
  raw: string;
  cleaned: string;          // Main search query stripped of fillers
  soundKey: string;
  artistHint?: string;      // Separated artist if user typed "artist - song" or "song by artist"
  songHint?: string;        // Separated song title if parsed
  userTypedModifiers: {
    remix: boolean;
    karaoke: boolean;
    instrumental: boolean;
    cover: boolean;
    tribute: boolean;
    slowed: boolean;
    spedUp: boolean;
    lofi: boolean;
    live: boolean;
    acoustic: boolean;
    eightD: boolean;
    bgm: boolean;
    theme: boolean;
  };
}

// Words frequently appended by users that degrade music API ranking
const FILLER_PATTERNS = [
  /\bfull\s+video(\s+song)?\b/gi,
  /\bofficial\s+(video|audio|lyric\s+video|track|music\s+video)\b/gi,
  /\blyric(s)?(\s+video)?\b/gi,
  /\bvideo\s+song(s)?\b/gi,
  /\baudio\s+song(s)?\b/gi,
  /\breels?(\s+audio|\s+version|\s+trend)?\b/gi,
  /\b(mp3|status|ringtone)\b/gi,
  /\bsongs?\b/gi, // e.g. "rathima song" -> "rathima"
  /\btracks?\b/gi,
];

// Indian soundtrack title patterns to clean for better matching
const INDIAN_TITLE_CLEANERS = [
  /\s*[\(\[](from\s+['"].*?['"]|from\s+[^)\]]+)[\)\]]/gi,
  /\s*[-–—]\s*(from\s+['"].*?['"]|from\s+.*)/gi,
  /\s*[\(\[](tamil|telugu|hindi|malayalam|kannada)[\)\]]/gi,
  /\s*[-–—]\s*(tamil|telugu|hindi|malayalam|kannada)\b/gi,
  /\s*[\(\[](original\s+motion\s+picture\s+soundtrack|ost|original\s+score|original\s+soundtrack)[\)\]]/gi,
];

/**
 * Strips Indian soundtrack suffixes like (From "Leo"), - Tamil, etc.
 * Useful for matching sound keys and similarity while retaining the full title for display.
 */
export function cleanIndianTitle(title: string): string {
  let cleaned = title;
  for (const pattern of INDIAN_TITLE_CLEANERS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

export function cleanSearchQuery(rawQuery: string): ParsedQuery {
  const raw = (rawQuery || "").trim();
  const lower = raw.toLowerCase();

  // Detect explicit modifiers requested by the user
  const userTypedModifiers = {
    remix: /\bremix(ed)?\b/i.test(lower),
    karaoke: /\bkaraoke\b/i.test(lower),
    instrumental: /\binstrumental\b/i.test(lower),
    cover: /\bcover\b/i.test(lower),
    tribute: /\btribute\b/i.test(lower),
    slowed: /\b(slowed|reverb)\b/i.test(lower),
    spedUp: /\b(sped\s*up|speed\s*up|speedup)\b/i.test(lower),
    lofi: /\b(lo-?fi|chill)\b/i.test(lower),
    live: /\blive(\s+performance|\s+concert)?\b/i.test(lower),
    acoustic: /\bacoustic(al)?\b/i.test(lower),
    eightD: /\b(8d|3d\s+audio)\b/i.test(lower),
    bgm: /\bbgm\b/i.test(lower),
    theme: /\btheme(\s+music|\s+track)?\b/i.test(lower),
  };

  // Strip punctuation and symbols (preserve letters, numbers, spaces, and hyphens initially for artist split)
  let working = lower
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!?,;:"'’`~@#$%^&*()_+={}\[\]|\\<>\/]/g, " ");

  let artistHint: string | undefined;
  let songHint: string | undefined;

  // Check for "song by artist" or "song from artist"
  const byMatch = working.match(/^(.*?)\s+(?:by|from)\s+(.*)$/i);
  if (byMatch && byMatch[1].trim() && byMatch[2].trim()) {
    songHint = byMatch[1].trim();
    artistHint = byMatch[2].trim();
  } else {
    // Check for "artist - song" or "song - artist"
    const dashMatch = working.match(/^(.*?)\s*[-–—]\s*(.*)$/);
    if (dashMatch && dashMatch[1].trim() && dashMatch[2].trim()) {
      artistHint = dashMatch[1].trim();
      songHint = dashMatch[2].trim();
    }
  }

  // Remove filler words
  for (const pattern of FILLER_PATTERNS) {
    working = working.replace(pattern, " ");
  }

  // Replace hyphens and dashes with spaces now that splits are extracted
  working = working.replace(/[-–—]/g, " ");

  // Collapse spaces and trim
  const cleaned = working.replace(/\s+/g, " ").trim();

  if (artistHint) {
    for (const pattern of FILLER_PATTERNS) artistHint = artistHint.replace(pattern, " ");
    artistHint = artistHint.replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();
  }
  if (songHint) {
    for (const pattern of FILLER_PATTERNS) songHint = songHint.replace(pattern, " ");
    songHint = songHint.replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();
  }

  return {
    raw,
    cleaned: cleaned || raw.toLowerCase().trim(),
    soundKey: "",
    artistHint: artistHint || undefined,
    songHint: songHint || undefined,
    userTypedModifiers,
  };
}
