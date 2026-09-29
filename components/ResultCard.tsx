"use client";
import { useEffect, useRef, useState } from "react";
import type { Result } from "@/lib/types";
import { isSaved, loadSaved, onSavedChange, toggleSaved } from "@/lib/saved";
import {
  BookmarkIcon,
  CheckIcon,
  CopyIcon,
  NoteIcon,
  PauseIcon,
  PlayIcon,
  ChevronDownIcon,
  SparklesIcon,
} from "./Icons";

// Only one preview plays at a time.
let currentAudio: HTMLAudioElement | null = null;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export default function ResultCard({
  item,
  query = "",
}: {
  item: Result;
  query?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [copiedVersionKey, setCopiedVersionKey] = useState<string | null>(null);
  const [playingVersionKey, setPlayingVersionKey] = useState<string | null>(null);

  const audio = useRef<HTMLAudioElement | null>(null);
  const versionAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const sync = () => setSaved(isSaved(item.key));
    const off = onSavedChange(sync);
    loadSaved().then(sync);
    return off;
  }, [item.key]);

  useEffect(() => {
    return () => {
      audio.current?.pause();
      versionAudio.current?.pause();
    };
  }, []);

  async function handleCopy(targetItem: Result, isSubVersion = false) {
    if (!targetItem.code) return;
    const textToCopy = `${targetItem.codeType}:${targetItem.code}`;

    if (await copyText(textToCopy)) {
      navigator.vibrate?.(8);
      if (isSubVersion) {
        setCopiedVersionKey(targetItem.key);
        setTimeout(() => setCopiedVersionKey(null), 1800);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }

      // Layer 6: Track copy event to learn and improve ranking over time
      fetch("/api/track-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          isrc: targetItem.code,
          title: targetItem.title,
          artist: targetItem.artist,
          itemKey: targetItem.key,
        }),
      }).catch(() => {});
    }
  }

  function onPlay() {
    if (!item.preview) return;
    if (versionAudio.current) versionAudio.current.pause();

    if (!audio.current) {
      audio.current = new Audio(item.preview);
      audio.current.onended = () => setPlaying(false);
      audio.current.onpause = () => setPlaying(false);
      audio.current.onplay = () => setPlaying(true);
    }

    if (playing) {
      audio.current.pause();
    } else {
      if (currentAudio && currentAudio !== audio.current) currentAudio.pause();
      currentAudio = audio.current;
      audio.current.play().catch(() => {});
    }
  }

  function onPlayVersion(v: Result) {
    if (!v.preview) return;
    if (audio.current) audio.current.pause();

    if (playingVersionKey === v.key && versionAudio.current) {
      versionAudio.current.pause();
      setPlayingVersionKey(null);
      return;
    }

    if (versionAudio.current) versionAudio.current.pause();
    const a = new Audio(v.preview);
    versionAudio.current = a;
    a.onended = () => setPlayingVersionKey(null);
    a.onpause = () => setPlayingVersionKey(null);
    a.onplay = () => setPlayingVersionKey(v.key);

    if (currentAudio && currentAudio !== a) currentAudio.pause();
    currentAudio = a;
    a.play().catch(() => {});
  }

  const subtitle =
    item.kind === "song" && item.album
      ? `${item.artist} · ${item.album}`
      : item.artist;

  const otherVersions = item.versions || [];
  const hasVersions = otherVersions.length > 0;

  return (
    <li className={`result-card${item.isBestMatch ? " best-match-card" : ""}`}>
      {/* ── Header: sky-gradient with blurred album art backdrop ── */}
      <div className="rc-header">
        {/* Blurred cover behind everything */}
        {item.cover && (
          <div
            className="rc-header-bg"
            style={{ backgroundImage: `url(${item.cover})` }}
            aria-hidden
          />
        )}

        {/* Album art + play button */}
        <button
          suppressHydrationWarning
          className={`rc-art pressable${playing ? " playing" : ""}`}
          onClick={onPlay}
          disabled={!item.preview}
          aria-label={
            item.preview
              ? `${playing ? "Pause" : "Play"} preview of ${item.title}`
              : item.title
          }
        >
          {item.cover ? (
            <img src={item.cover} alt="" loading="lazy" />
          ) : (
            <div className="rc-art-placeholder">
              <NoteIcon size={28} />
            </div>
          )}
          {item.preview && (
            <span className="rc-play-btn">
              <span className="rc-play-btn-inner">
                {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
              </span>
            </span>
          )}
        </button>

        {/* Title, artist, meta badges */}
        <div className="rc-info">
          {item.isBestMatch && (
            <div className="rc-best-badge">
              <SparklesIcon size={12} />
              <span>Best Match</span>
            </div>
          )}
          <p className="rc-title">{item.title}</p>
          <p className="rc-artist">{subtitle}</p>
          <div className="rc-meta">
            <span className="rc-badge">
              {item.kind === "song" ? "Song" : "Album"}
            </span>
            {item.versionType && item.versionType !== "Original" && (
              <span className="rc-badge version-tag">{item.versionType}</span>
            )}
            {item.explicit && <span className="rc-badge">E</span>}
            {item.year && <span className="rc-year">{item.year}</span>}
          </div>
        </div>

        {/* Save/bookmark button */}
        <button
          suppressHydrationWarning
          className="rc-save"
          aria-pressed={saved}
          aria-label={saved ? "Remove from Saved" : "Save"}
          onClick={() => toggleSaved(item)}
        >
          <BookmarkIcon size={18} filled={saved} />
        </button>
      </div>

      {/* ── Body: code copy button ── */}
      <div className="rc-body">
        {item.code ? (
          <button
            suppressHydrationWarning
            className={`rc-code pressable${copied ? " copied" : ""}`}
            onClick={() => handleCopy(item)}
            aria-label={`Copy ${item.codeType} code: ${item.code}`}
          >
            <span className="rc-code-label">{item.codeType}</span>
            <span className="rc-code-value">
              {copied ? "Copied!" : item.code}
            </span>
            {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
          </button>
        ) : (
          <span className="rc-code none">
            <span className="rc-code-label">{item.codeType}</span>
            <span className="rc-code-value">Not available</span>
          </span>
        )}

        {/* Step 5: Grouped versions toggle button */}
        {hasVersions && (
          <button
            type="button"
            className={`rc-versions-toggle pressable${showVersions ? " open" : ""}`}
            onClick={() => setShowVersions(!showVersions)}
            aria-expanded={showVersions}
            aria-label={`${otherVersions.length} other versions available`}
          >
            <span>{otherVersions.length} more</span>
            <ChevronDownIcon size={14} />
          </button>
        )}
      </div>

      {/* Step 5: Other Versions Dropdown/Drawer */}
      {hasVersions && showVersions && (
        <div className="rc-versions-drawer" role="region" aria-label="Other versions">
          <p className="rc-versions-title">Other versions & remixes</p>
          <ul className="rc-versions-list">
            {otherVersions.map((v) => {
              const vCopied = copiedVersionKey === v.key;
              const vPlaying = playingVersionKey === v.key;

              return (
                <li key={v.key} className="rc-version-item">
                  <div className="rc-version-info">
                    <span className="rc-version-badge">
                      {v.versionType || "Alternate"}
                    </span>
                    <span className="rc-version-title">{v.title}</span>
                  </div>

                  <div className="rc-version-actions">
                    {v.preview && (
                      <button
                        type="button"
                        className="rc-version-play pressable"
                        onClick={() => onPlayVersion(v)}
                        aria-label={vPlaying ? "Pause preview" : "Play preview"}
                      >
                        {vPlaying ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
                      </button>
                    )}

                    {v.code ? (
                      <button
                        type="button"
                        className={`rc-version-code pressable${vCopied ? " copied" : ""}`}
                        onClick={() => handleCopy(v, true)}
                        aria-label={`Copy ${v.codeType}: ${v.code}`}
                      >
                        <span className="rc-code-val">
                          {vCopied ? "Copied" : v.code}
                        </span>
                        {vCopied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                      </button>
                    ) : (
                      <span className="rc-version-code none">No code</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}
