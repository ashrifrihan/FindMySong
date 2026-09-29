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
}

export interface SearchResponse {
  results: Result[];
  remaining: number;
  limit: number;
}
