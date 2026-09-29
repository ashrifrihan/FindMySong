export type Kind = "song" | "album";

export interface Result {
  key: string;          // unique: "song-123" / "album-456"
  kind: Kind;
  title: string;
  artist: string;
  album?: string;
  cover: string;
  code: string | null;  // ISRC for songs, UPC for albums
  codeType: "ISRC" | "UPC";
  preview?: string;     // 30s mp3
  explicit?: boolean;
  year?: string;
  rank?: number;        // Deezer popularity score (0 - 1,000,000)
  score?: number;       // Algorithm composite relevance score
  soundKey?: string;
  versionType?: string; // "Original", "Remix", "Slowed", "Acoustic", etc.
  versions?: Result[];  // Grouped other versions of this same recording
  isBestMatch?: boolean;// Highlighted top best match
  copyCount?: number;   // Learnt copy frequency from Supabase
}

export interface SearchCorrection {
  original: string;
  corrected: string;
  type: "sound_alike" | "typo" | "learned" | "none";
}

export interface SearchResponse {
  results: Result[];
  remaining: number;
  limit: number;
  correction?: SearchCorrection;
  bestMatch?: Result;
}
