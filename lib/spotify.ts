import type { Result } from "./types";

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Fetch a Spotify Client Credentials token.
 * Tokens are cached in-memory until near expiry.
 */
async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  // Reuse cached token if valid for at least another 60 seconds
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  try {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("Spotify auth failed with status:", res.status);
      return null;
    }

    const data: SpotifyTokenResponse = await res.json();
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return cachedToken;
  } catch (err) {
    console.warn("Failed to get Spotify access token:", err);
    return null;
  }
}

/**
 * Search Spotify for tracks using market=IN (India) so regional Tamil, Telugu,
 * Hindi, and South Asian songs are fully available regardless of server location.
 */
export async function searchSpotifyTracks(query: string, limit = 25): Promise<Result[]> {
  const token = await getSpotifyAccessToken();
  if (!token) return [];

  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&market=IN&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    const tracks: any[] = data.tracks?.items || [];

    return tracks.map((t) => {
      const isrc = t.external_ids?.isrc || null;
      const albumImages = t.album?.images || [];
      const cover = albumImages[1]?.url || albumImages[0]?.url || "";
      const artists = (t.artists || []).map((a: any) => a.name).join(", ");

      return {
        key: `spotify-song-${t.id}`,
        kind: "song",
        title: t.name,
        artist: artists,
        album: t.album?.name,
        cover,
        code: isrc,
        codeType: "ISRC",
        preview: t.preview_url || undefined,
        explicit: !!t.explicit,
        year: t.album?.release_date?.slice(0, 4),
        rank: (t.popularity || 0) * 10000, // Normalize 0-100 to 0-1,000,000 scale
      } as Result;
    });
  } catch (err) {
    console.warn("Spotify track search error:", err);
    return [];
  }
}

/**
 * Search Spotify for albums using market=IN
 */
export async function searchSpotifyAlbums(query: string, limit = 10): Promise<Result[]> {
  const token = await getSpotifyAccessToken();
  if (!token) return [];

  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&market=IN&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    const albums: any[] = data.albums?.items || [];

    return albums.map((a) => {
      const images = a.images || [];
      const cover = images[1]?.url || images[0]?.url || "";
      const artists = (a.artists || []).map((art: any) => art.name).join(", ");
      const upc = a.external_ids?.upc || null;

      return {
        key: `spotify-album-${a.id}`,
        kind: "album",
        title: a.name,
        artist: artists,
        cover,
        code: upc,
        codeType: "UPC",
        year: a.release_date?.slice(0, 4),
      } as Result;
    });
  } catch (err) {
    console.warn("Spotify album search error:", err);
    return [];
  }
}
