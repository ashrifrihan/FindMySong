"use client";

import React from "react";
import { usePlayer } from "@/lib/player";

/**
 * AmbientBackground
 * Provides a dynamic animated fluid canvas inspired by YouTube Music Ambient Mode
 * and Apple Music Sing glowing canvas.
 * Seamlessly adapts between neutral Apple frosted glass when idle,
 * and glowing harmonic hues extracted from the playing song's artwork.
 */
export default function AmbientBackground() {
  const { track, isPlaying } = usePlayer();

  return (
    <div
      className={`ambient-canvas${track ? " has-track" : ""}${isPlaying ? " is-playing" : ""}`}
      aria-hidden="true"
    >
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />
      <div className="ambient-orb ambient-orb-4" />
      <div className="ambient-overlay" />
    </div>
  );
}
