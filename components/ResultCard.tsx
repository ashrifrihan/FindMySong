"use client";
import { useEffect, useRef, useState } from "react";
import type { Result } from "@/lib/types";
import { isSaved, loadSaved, onSavedChange, toggleSaved } from "@/lib/saved";
import { BookmarkIcon, CheckIcon, CopyIcon, NoteIcon, PauseIcon, PlayIcon } from "./Icons";

// Only one preview plays at a time.
let current: HTMLAudioElement | null = null;

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

export default function ResultCard({ item }: { item: Result }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const sync = () => setSaved(isSaved(item.key));
    const off = onSavedChange(sync);
    loadSaved().then(sync);
    return off;
  }, [item.key]);

  useEffect(() => () => audio.current?.pause(), []);

  async function onCopy() {
    if (!item.code) return;
    if (await copyText(item.code)) {
      navigator.vibrate?.(8);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  function onPlay() {
    if (!item.preview) return;
    if (!audio.current) {
      audio.current = new Audio(item.preview);
      audio.current.onended = () => setPlaying(false);
      audio.current.onpause = () => setPlaying(false);
      audio.current.onplay  = () => setPlaying(true);
    }
    if (playing) {
      audio.current.pause();
    } else {
      if (current && current !== audio.current) current.pause();
      current = audio.current;
      audio.current.play().catch(() => {});
    }
  }

  const artist = item.artist;
  const subtitle = item.kind === "song" && item.album ? `${item.artist} · ${item.album}` : item.artist;

  return (
    <li className="result-card">
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
            <div className="rc-art-placeholder"><NoteIcon size={28} /></div>
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
          <p className="rc-title">{item.title}</p>
          <p className="rc-artist">{subtitle}</p>
          <div className="rc-meta">
            <span className="rc-badge">{item.kind === "song" ? "Song" : "Album"}</span>
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
            onClick={onCopy}
            aria-label={`Copy ${item.codeType} code: ${item.code}`}
          >
            <span className="rc-code-label">{item.codeType}</span>
            <span className="rc-code-value">{copied ? "Copied!" : item.code}</span>
            {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
          </button>
        ) : (
          <span className="rc-code none">
            <span className="rc-code-label">{item.codeType}</span>
            <span className="rc-code-value">Not available</span>
          </span>
        )}
      </div>
    </li>
  );
}
