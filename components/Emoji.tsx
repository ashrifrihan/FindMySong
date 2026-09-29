"use client";
import { useState } from "react";

/**
 * Renders Apple iOS emoji using emoji-datasource-apple images from jsDelivr.
 * URL format: https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/{codepoint}.png
 * where codepoint is the lowercase hex codepoint(s) joined by dashes (e.g. "1f3b5" for 🎵).
 *
 * Falls back to the raw character if the image fails to load.
 */

const CDN = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64";

/**
 * Maps emoji character → its unified codepoint string for the Apple CDN.
 * To get the codepoint: [...emoji].map(c => c.codePointAt(0)!.toString(16)).join('-')
 */
export const APPLE_EMOJI: Record<string, string> = {
  // Music / app emojis
  "🎵": "1f3b5",
  "🎧": "1f3a7",
  "🎸": "1f3b8",
  "💿": "1f4bf",
  "🎤": "1f3a4",
  "🎶": "1f3b6",
  "🎹": "1f3b9",
  "🎷": "1f3b7",
  "🎺": "1f3ba",
  "🥁": "1f941",
  "🪗": "1fa97",
  "🎻": "1f3bb",
  "🎼": "1f3bc",
  "📻": "1f4fb",
  "🔍": "1f50d",

  // Fun / animals (used in old hero, kept for compatibility)
  "🐶": "1f436",
  "🦊": "1f98a",
  "🦉": "1f989",
  "🐷": "1f437",

  // UI / actions
  "✨": "2728",
  "❤️": "2764-fe0f",
  "🔖": "1f516",
  "📋": "1f4cb",
  "✅": "2705",
  "⭐": "2b50",
};

/** Convert any emoji character to its Apple CDN URL automatically */
function emojiToCdnUrl(emoji: string): string | null {
  // Check our manual map first (handles multi-codepoint emoji correctly)
  const manual = APPLE_EMOJI[emoji];
  if (manual) return `${CDN}/${manual}.png`;

  // Auto-derive from codepoints
  const points = [...emoji]
    .map((c) => c.codePointAt(0)?.toString(16))
    .filter(Boolean) as string[];
  if (points.length === 0) return null;
  return `${CDN}/${points.join("-")}.png`;
}

interface EmojiProps {
  char: string;
  size: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Emoji({ char, size, className = "", style }: EmojiProps) {
  const [failed, setFailed] = useState(false);
  const url = emojiToCdnUrl(char);

  if (!url || failed) {
    return (
      <span
        className={`emoji-char ${className}`}
        style={{ fontSize: size * 0.88, lineHeight: 1, ...style }}
        aria-hidden
      >
        {char}
      </span>
    );
  }

  return (
    <img
      className={className}
      src={url}
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      onError={() => setFailed(true)}
      style={style}
    />
  );
}
