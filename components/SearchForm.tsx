"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpIcon, BoltIcon, SearchIcon, NoteIcon, SparklesIcon } from "./Icons";
import MobileAuthModal from "./MobileAuthModal";

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

const SEARCH_MODES = [
  { id: "all", label: "All", placeholder: "Search songs, artists or movies" },
  { id: "song", label: "Song", placeholder: "Search songs, artists or movies" },
  { id: "artist", label: "Artist", placeholder: "Search songs, artists or movies" },
  { id: "album", label: "Album / Movie", placeholder: "Search songs, artists or movies" },
];

export default function SearchForm({
  initialQ = "",
  type = "all",
  initialLang = "tamil",
  autoFocus = false,
  variant = "default", // "hero" | "default"
}: {
  initialQ?: string;
  type?: string;
  initialLang?: string;
  autoFocus?: boolean;
  variant?: "hero" | "default";
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [searchMode, setSearchMode] = useState(type || "all");
  const [langPref, setLangPref] = useState(initialLang || "tamil");
  const [left, setLeft] = useState<number | null>(null);
  const [limit, setLimit] = useState(10);
  const [isMember, setIsMember] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Layer 7: Typing suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fms_lang_pref");
      if (saved === "tamil" || saved === "all") {
        setLangPref(saved);
      }
    } catch {}
  }, []);

  function handleLangPrefChange(pref: string) {
    setLangPref(pref);
    try {
      localStorage.setItem("fms_lang_pref", pref);
    } catch {}
  }

  useEffect(() => {
    setQ(initialQ);
    setIsNavigating(false);
  }, [initialQ]);
  useEffect(() => setSearchMode(type || "all"), [type]);
  useEffect(() => {
    if (initialLang) setLangPref(initialLang);
  }, [initialLang]);

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.remaining === "number") setLeft(d.remaining);
        if (typeof d.limit === "number") setLimit(d.limit);
        if (d.isMember) setIsMember(true);
      })
      .catch(() => {});

    const onQuota = (e: Event) => {
      const remainingVal = (e as CustomEvent<number>).detail;
      setLeft(remainingVal);
      if (remainingVal >= 900) setIsMember(true);
    };

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
    if (!v) return;

    if (left === 0 && !isMember) {
      setModalOpen(true);
      return;
    }

    setIsNavigating(true);
    setShowSuggestions(false);
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(`/search?q=${encodeURIComponent(v)}&type=${searchMode}&lang=${langPref}`);
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

  function onModeChange(modeId: string) {
    setSearchMode(modeId);
    if (!isHero && q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}&type=${modeId}&lang=${langPref}`);
    }
  }

  const out = left === 0 && !isMember;
  const isHero = variant === "hero";
  const barClass = isHero ? "hero-search" : "search-bar";
  const goClass = isHero ? "hero-go" : "search-go";
  const quotaClass = isHero ? "hero-quota" : "search-quota";

  const currentPlaceholder =
    SEARCH_MODES.find((m) => m.id === searchMode)?.placeholder ||
    "Songs, artists, BGMs, movies or albums…";

  return (
    <div className={`search-form-wrap${isHero ? " hero-mode-wrap" : ""}`} ref={containerRef}>
      {/* ── 1. Search Box FIRST right below top bar ── */}
      <form className={barClass} onSubmit={submit} role="search">
        <SearchIcon size={20} />
        <label htmlFor="q" className="sr-only">
          Search music
        </label>
        <input
          id="q"
          suppressHydrationWarning
          type="search"
          placeholder={currentPlaceholder}
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
          className={`${goClass} pressable${isNavigating ? " is-searching" : ""}`}
          type="submit"
          suppressHydrationWarning
          disabled={!q.trim() || isNavigating}
          aria-label={isNavigating ? "Searching..." : "Search"}
        >
          {isNavigating ? (
            <span className="search-btn-spinner" aria-hidden />
          ) : (
            <ArrowUpIcon size={20} />
          )}
        </button>
      </form>

      {/* ── 2. Full-width Filter Row + Tamil first chip on next line ── */}
      <div className="search-controls-bar">
        <div className="search-mode-selector" role="tablist" aria-label="Filter type">
          {SEARCH_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={searchMode === mode.id}
              className={`search-mode-pill pressable${searchMode === mode.id ? " active" : ""}`}
              onClick={() => onModeChange(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Line 2: Tamil first toggle chip */}
        <div className={`search-lang-row${isHero ? " hero-align" : ""}`}>
          <button
            type="button"
            className={`tamil-toggle-chip pressable${langPref === "tamil" ? " on" : " off"}`}
            aria-pressed={langPref === "tamil"}
            onClick={() => handleLangPrefChange(langPref === "tamil" ? "all" : "tamil")}
            title="Prioritize Tamil originals, film tracks, and South Asian releases"
          >
            <span className="tamil-star" aria-hidden>{langPref === "tamil" ? "★" : "☆"}</span>
            <span>Tamil first</span>
          </button>
        </div>
      </div>

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
                  <img
                    src={item.cover}
                    alt=""
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  />
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
          <button
            type="button"
            className="quota-pill pressable"
            onClick={() => setModalOpen(true)}
            aria-label={isMember ? "Unlimited member status" : "Daily search quota. Click for unlimited"}
          >
            <span className="quota-icon">
              {isMember ? <SparklesIcon size={13} /> : <BoltIcon size={14} />}
            </span>
            {!isMember && (
              <div className="quota-track" aria-hidden>
                <div
                  className="quota-fill"
                  style={{
                    width: left === null ? "100%" : `${(left / limit) * 100}%`,
                  }}
                />
              </div>
            )}
            <span className="quota-text">
              {isMember
                ? "✨ Unlimited Searches"
                : left === null
                ? `${limit} free left`
                : out
                ? "0 left · Unlock Unlimited"
                : `${left} left · Unlock Unlimited`}
            </span>
          </button>
        </div>
      )}

      {/* Mobile Auth Modal for unlocking Unlimited Searches */}
      <MobileAuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setIsMember(true);
          setLeft(999);
        }}
      />
    </div>
  );
}
