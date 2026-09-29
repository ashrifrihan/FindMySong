"use client";
import React from "react";

interface EmojiProps {
  char: string;
  size: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Universal Native Emoji renderer.
 * Uses high-resolution system emoji typography:
 * - iOS & macOS render Apple Color Emoji
 * - Android renders Noto Color Emoji
 * - Windows renders Segoe UI Emoji
 * Eliminates external CDN dependencies, network image requests, and copyright risks.
 */
export default function Emoji({ char, size, className = "", style }: EmojiProps) {
  return (
    <span
      className={`emoji-char ${className}`}
      style={{
        fontSize: `${size}px`,
        lineHeight: 1,
        display: "inline-block",
        verticalAlign: "-0.14em",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        userSelect: "none",
        WebkitUserSelect: "none",
        ...style,
      }}
      aria-hidden
    >
      {char}
    </span>
  );
}
