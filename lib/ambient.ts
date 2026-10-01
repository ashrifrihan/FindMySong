/**
 * Extracts vibrant and ambient colors from album covers or generates
 * harmonic palettes for YouTube Music & Apple Music-like ambient backgrounds.
 */

export interface AmbientPalette {
  primary: string;
  secondary: string;
  glow: string;
}

// Curated Apple Music-style dynamic palettes as instant fallbacks
const FALLBACK_PALETTES: AmbientPalette[] = [
  { primary: "#e11d48", secondary: "#7c3aed", glow: "rgba(225, 29, 72, 0.45)" }, // Vivid Crimson & Violet
  { primary: "#0284c7", secondary: "#0d9488", glow: "rgba(2, 132, 199, 0.45)" }, // Electric Azure & Teal
  { primary: "#8b5cf6", secondary: "#ec4899", glow: "rgba(139, 92, 246, 0.45)" }, // Purple & Hot Pink
  { primary: "#f59e0b", secondary: "#ea580c", glow: "rgba(245, 158, 11, 0.45)" }, // Sunset Amber & Orange
  { primary: "#10b981", secondary: "#06b6d4", glow: "rgba(16, 185, 129, 0.45)" }, // Emerald & Cyan
  { primary: "#6366f1", secondary: "#3b82f6", glow: "rgba(99, 102, 241, 0.45)" }, // Indigo & Royal Blue
];

/**
 * Hash string into a deterministic index
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a deterministic harmonic palette based on track title & artist
 */
export function getPaletteForTrack(title: string, artist: string): AmbientPalette {
  const index = hashString(`${title}:${artist}`) % FALLBACK_PALETTES.length;
  return FALLBACK_PALETTES[index];
}

/**
 * Extract dominant colors from an image URL using an offscreen canvas.
 * Falls back safely if CORS prevents reading canvas pixels.
 */
export async function extractPaletteFromImage(
  imageUrl: string,
  fallbackSeed = "FindMySong"
): Promise<AmbientPalette> {
  const fallback = FALLBACK_PALETTES[hashString(fallbackSeed) % FALLBACK_PALETTES.length];

  if (typeof window === "undefined" || !imageUrl) {
    return fallback;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";

    // Fast timeout in case image server blocks CORS
    const timeout = setTimeout(() => {
      resolve(fallback);
    }, 1200);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(fallback);
          return;
        }

        // Downscale to 16x16 for ultra-fast sampling
        canvas.width = 16;
        canvas.height = 16;
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        let r = 0, g = 0, b = 0, count = 0;
        let maxSaturation = 0;
        let vibrantR = 0, vibrantG = 0, vibrantB = 0;

        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i];
          const pg = data[i + 1];
          const pb = data[i + 2];
          const brightness = (pr + pg + pb) / 3;

          // Ignore extreme blacks and extreme whites
          if (brightness > 25 && brightness < 235) {
            r += pr;
            g += pg;
            b += pb;
            count++;

            // Measure saturation
            const max = Math.max(pr, pg, pb);
            const min = Math.min(pr, pg, pb);
            const sat = max === 0 ? 0 : (max - min) / max;

            if (sat > maxSaturation) {
              maxSaturation = sat;
              vibrantR = pr;
              vibrantG = pg;
              vibrantB = pb;
            }
          }
        }

        if (count === 0 || maxSaturation < 0.15) {
          resolve(fallback);
          return;
        }

        const avgR = Math.round(r / count);
        const avgG = Math.round(g / count);
        const avgB = Math.round(b / count);

        const primary = `rgb(${vibrantR}, ${vibrantG}, ${vibrantB})`;
        const secondary = `rgb(${avgR}, ${avgG}, ${avgB})`;
        const glow = `rgba(${vibrantR}, ${vibrantG}, ${vibrantB}, 0.5)`;

        resolve({ primary, secondary, glow });
      } catch {
        resolve(fallback);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(fallback);
    };

    img.src = imageUrl;
  });
}
