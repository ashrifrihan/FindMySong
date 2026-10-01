"use client";

import React, { useState } from "react";
import { usePlayer } from "@/lib/player";
import {
  PlayIcon,
  PauseIcon,
  VolumeIcon,
  VolumeMuteIcon,
  RepeatIcon,
  CopyIcon,
  CheckIcon,
  CloseIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  NoteIcon,
} from "./Icons";
import { splitTitle } from "@/lib/displayTitle";

function formatTime(sec: number): string {
  if (isNaN(sec) || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function Player() {
  const {
    track,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    rate,
    isLooping,
    isExpanded,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setRate,
    toggleLoop,
    toggleExpand,
    closePlayer,
  } = usePlayer();

  const [copied, setCopied] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  if (!track) return null;

  const { name: cleanTitle, movie } = splitTitle(track.title);
  const subtitle = movie
    ? `${track.artist} · ${movie}`
    : track.album
    ? `${track.artist} · ${track.album}`
    : track.artist;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!track.code) return;

    const textToCopy = `${track.codeType || "ISRC"}:${track.code}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      navigator.vibrate?.(8);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Track copy
      fetch("/api/track-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: track.title,
          isrc: track.code,
          title: track.title,
          artist: track.artist,
          itemKey: track.key,
        }),
      }).catch(() => {});
    } catch {}
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek(val);
  };

  const rates = [0.8, 1.0, 1.25, 1.5];

  return (
    <aside
      className={`apple-player-dock${isExpanded ? " expanded" : ""}${isPlaying ? " playing" : ""}`}
      aria-label="Now Playing Music Player"
    >
      {/* ── Mini / Compact Island Bar ── */}
      <div className="player-island-glass" onClick={() => !isExpanded && toggleExpand()}>
        {/* Cover Art with subtle dynamic shadow */}
        <div className="player-cover-wrap">
          {track.cover ? (
            <img
              src={track.cover}
              alt=""
              className="player-cover-img"
              draggable={false}
            />
          ) : (
            <div className="player-cover-placeholder">
              <NoteIcon size={20} />
            </div>
          )}
          {isPlaying && <span className="player-pulse-ring" />}
        </div>

        {/* Track Meta */}
        <div className="player-meta-box">
          <p className="player-title" title={cleanTitle}>
            {cleanTitle}
          </p>
          <p className="player-subtitle" title={subtitle}>
            {subtitle}
          </p>
        </div>

        {/* Quick Island Action Controls */}
        <div className="player-quick-actions" onClick={(e) => e.stopPropagation()}>
          {track.code && (
            <button
              type="button"
              className={`player-quick-code pressable${copied ? " copied" : ""}`}
              onClick={handleCopyCode}
              aria-label={`Copy ${track.codeType || "ISRC"}: ${track.code}`}
              title="Copy code for Instagram"
            >
              {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
              <span>{copied ? "Copied" : track.code}</span>
            </button>
          )}

          {/* Play / Pause button */}
          <button
            type="button"
            className="player-play-btn pressable"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          </button>

          {/* Expand / Collapse toggle */}
          <button
            type="button"
            className="player-icon-btn pressable"
            onClick={toggleExpand}
            aria-label={isExpanded ? "Collapse music player" : "Expand music player options"}
          >
            {isExpanded ? <ChevronDownIcon size={18} /> : <ChevronUpIcon size={18} />}
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            className="player-icon-btn pressable close-btn"
            onClick={closePlayer}
            aria-label="Close music player"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      {/* ── Expanded Options Tray (Apple Music Style) ── */}
      {isExpanded && (
        <div className="player-expanded-tray" role="region" aria-label="Playback Options">
          {/* Timeline & Scrubber */}
          <div className="player-timeline">
            <span className="player-time">{formatTime(currentTime)}</span>
            <div className="player-scrubber-track">
              <input
                type="range"
                min={0}
                max={duration || 30}
                step={0.1}
                value={currentTime}
                onChange={handleScrubberChange}
                aria-label="Audio scrubber"
                className="player-slider"
                style={{ ["--progress" as any]: `${progressPercent}%` }}
              />
            </div>
            <span className="player-time">{formatTime(duration)}</span>
          </div>

          {/* Music Player Options Row */}
          <div className="player-options-grid">
            {/* Speed Options (Slowed 0.8x, Sped Up 1.25x for Reels) */}
            <div className="player-option-item">
              <span className="player-opt-label">Speed</span>
              <div className="player-segmented-pill">
                {rates.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`player-seg-btn pressable${rate === r ? " active" : ""}`}
                    onClick={() => setRate(r)}
                  >
                    {r === 0.8 ? "0.8× (Slowed)" : r === 1.25 ? "1.25× (Sped)" : `${r}×`}
                  </button>
                ))}
              </div>
            </div>

            {/* Loop / Repeat Option */}
            <div className="player-option-item">
              <span className="player-opt-label">Loop</span>
              <button
                type="button"
                className={`player-pill-toggle pressable${isLooping ? " active" : ""}`}
                onClick={toggleLoop}
                aria-pressed={isLooping}
                title="Loop 30s Hook"
              >
                <RepeatIcon size={15} />
                <span>{isLooping ? "Looping Hook" : "Repeat Off"}</span>
              </button>
            </div>

            {/* Volume & Mute Option */}
            <div className="player-option-item volume-opt">
              <span className="player-opt-label">Volume</span>
              <div className="player-volume-control">
                <button
                  type="button"
                  className="player-mute-btn pressable"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? <VolumeMuteIcon size={16} /> : <VolumeIcon size={16} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  aria-label="Volume slider"
                  className="player-slider volume-slider"
                  style={{ ["--progress" as any]: `${(isMuted ? 0 : volume) * 100}%` }}
                />
              </div>
            </div>

            {/* Instagram Quick Tip Bar */}
            <div className="player-ig-pill">
              <span className="ig-dot" />
              <span>
                Paste <strong>{track.codeType || "ISRC"}:{track.code || "..."}</strong> in Instagram Music search sticker
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
