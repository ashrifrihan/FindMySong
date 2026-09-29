"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpIcon, BoltIcon, SearchIcon, NoteIcon } from "./Icons";

export const QUOTA_EVENT = "findmysong:quota";

interface SuggestionItem {
  key: string;
  title: string;
  artist: string;
  cover?: string;
  code?: string;
  codeType?: string;
  kind?: string;
}

export default function SearchForm({
  initialQ = "",
  type = "all",
  autoFocus = false,
  variant = "default", // "hero" | "default"
}: {
  initialQ?: string;
  type?: string;
  autoFocus?: boolean;
  variant?: "hero" | "default";
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [left, setLeft] = useState<number | null>(null);
  const [limit, setLimit] = useState(10);

  // Layer 7: Typing suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => setQ(initialQ), [initialQ]);

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.remaining === "number") setLeft(d.remaining);
        setLimit(d.limit);
      })
      .catch(() => {});
    const onQuota = (e: Event) => setLeft((e as CustomEvent<number>).detail);
    window.addEventListener(QUOTA_EVENT, onQuota);
    return () => window.removeEventListener(QUOTA_EVENT, onQuota);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.suggestions) && d.suggestions.length > 0) {
            setSuggestions(d.suggestions);
            setShowSuggestions(true);
            setHighlightIndex(-1);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        })
        .catch(() => {
          setSuggestions([]);
        });
    }, 220);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [q]);

  // Click outside to dismiss suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function submitQuery(queryText: string) {
    const v = queryText.trim();
    if (!v || left === 0) return;
    setShowSuggestions(false);
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(`/search?q=${encodeURIComponent(v)}&type=${type}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (highlightIndex >= 0 && suggestions[highlightIndex]) {
      const selected = suggestions[highlightIndex];
      setQ(selected.title);
      submitQuery(selected.title);
      return;
    }
    submitQuery(q);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  function onSelectSuggestion(item: SuggestionItem) {
    setQ(item.title);
    setShowSuggestions(false);
    submitQuery(item.title);
  }

  const out = left === 0;
  const isHero = variant === "hero";
  const barClass = isHero ? "hero-search" : "search-bar";
  const goClass = isHero ? "hero-go" : "search-go";
  const quotaClass = isHero ? "hero-quota" : "search-quota";

  return (
    <div className="search-form-wrap" ref={containerRef}>
      <form className={barClass} onSubmit={submit} role="search">
        <SearchIcon size={20} />
        <label htmlFor="q" className="sr-only">
          Search music
        </label>
        <input
          id="q"
          suppressHydrationWarning
          type="search"
          placeholder="Songs, artists or albums…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          autoFocus={autoFocus}
        />
        <button
          className={`${goClass} pressable`}
          type="submit"
          suppressHydrationWarning
          disabled={!q.trim() || out}
          aria-label="Search"
        >
          <ArrowUpIcon size={20} />
        </button>
      </form>

      {/* Layer 7: Typing Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions-dropdown" role="listbox" aria-label="Suggestions">
          {suggestions.map((item, idx) => (
            <li
              key={item.key}
              role="option"
              aria-selected={highlightIndex === idx}
              className={`suggestion-item${highlightIndex === idx ? " highlighted" : ""}`}
              onClick={() => onSelectSuggestion(item)}
            >
              <div className="suggestion-art">
                {item.cover ? (
                  <img src={item.cover} alt="" />
                ) : (
                  <NoteIcon size={16} />
                )}
              </div>
              <div className="suggestion-info">
                <span className="suggestion-title">{item.title}</span>
                <span className="suggestion-artist">{item.artist}</span>
              </div>
              {item.code && (
                <span className="suggestion-badge">{item.codeType || "ISRC"}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Quota indicator - Apple iOS widget style (only show in hero) */}
      {isHero && (
        <div className={`${quotaClass}${out ? " empty" : ""}`} aria-live="polite">
          <div className="quota-pill">
            <span className="quota-icon">
              <BoltIcon size={14} />
            </span>
            <div className="quota-track" aria-hidden>
              <div
                className="quota-fill"
                style={{
                  width: left === null ? "100%" : `${(left / limit) * 100}%`,
                }}
              />
            </div>
            <span className="quota-text">
              {left === null
                ? `${limit} left`
                : out
                ? "0 left"
                : `${left} left`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
