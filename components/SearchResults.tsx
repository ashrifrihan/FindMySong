"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ResultCard from "./ResultCard";
import Emoji from "./Emoji";
import { QUOTA_EVENT } from "./SearchForm";
import type { Result, SearchCorrection, SearchResponse } from "@/lib/types";

const TABS = [
  { id: "all", label: "All" },
  { id: "song", label: "Songs" },
  { id: "artist", label: "Artists" },
  { id: "album", label: "Albums" },
];

export default function SearchResults({
  q,
  type,
  exact = false,
  initialLang = "tamil",
}: {
  q: string;
  type: string;
  exact?: boolean;
  initialLang?: string;
}) {
  const [langPref, setLangPref] = useState(initialLang || "tamil");
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    results?: Result[];
    correction?: SearchCorrection;
    bestMatch?: Result;
  }>({ loading: true });

  // Pagination: load 10 songs at a time
  const [visibleCount, setVisibleCount] = useState(10);
  const lastKey = useRef("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fms_lang_pref");
      if (saved === "tamil" || saved === "all") {
        setLangPref(saved);
      }
    } catch {}
  }, []);

  function handleLangChange(pref: string) {
    setLangPref(pref);
    try {
      localStorage.setItem("fms_lang_pref", pref);
    } catch {}
  }

  useEffect(() => {
    setVisibleCount(10);
    const key = `${type}::${q}::exact=${exact}::lang=${langPref}`;
    if (!q || lastKey.current === key) return;
    lastKey.current = key;

    // Session cache check
    const cacheKey = `findmysong:search:${key}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setState({
          loading: false,
          results: parsed.results,
          correction: parsed.correction,
          bestMatch: parsed.bestMatch,
        });
        return;
      }
    } catch {}

    setState({ loading: true });
    const exactParam = exact ? "&exact=true" : "";
    fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}&lang=${langPref}${exactParam}`)
      .then(async (r) => {
        const d: SearchResponse & { error?: string } = await r.json();
        if (typeof d.remaining === "number") {
          window.dispatchEvent(
            new CustomEvent(QUOTA_EVENT, { detail: d.remaining })
          );
        }
        if (!r.ok) throw new Error(d.error || "Search failed. Try again.");

        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              results: d.results,
              correction: d.correction,
              bestMatch: d.bestMatch,
            })
          );
        } catch {}

        setState({
          loading: false,
          results: d.results,
          correction: d.correction,
          bestMatch: d.bestMatch,
        });
      })
      .catch((e) => setState({ loading: false, error: e.message }));
  }, [q, type, exact, langPref]);

  const results = state.results ?? [];
  const correction = state.correction;
  const songs = results.filter((r) => r.kind === "song");
  const albums = results.filter((r) => r.kind === "album");

  // Display initial 10 songs with "Load more"
  const displayedSongs = songs.slice(0, visibleCount);
  const hasMoreSongs = songs.length > visibleCount;

  return (
    <>
      <div className="search-results-controls">
        <nav className="chips" aria-label="Result type">
          {TABS.map((t) => (
            <Link
              key={t.id}
              replace
              className="glass chip pressable"
              href={`/search?q=${encodeURIComponent(q)}&type=${t.id}&lang=${langPref}${exact ? "&exact=true" : ""}`}
              aria-current={type === t.id ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="lang-pref-switcher" role="radiogroup" aria-label="Language priority">
          <button
            type="button"
            className={`lang-pref-chip pressable${langPref === "tamil" ? " active" : ""}`}
            onClick={() => handleLangChange("tamil")}
            title="Prioritize Tamil originals, film tracks, and South Asian releases"
          >
            <span className="lang-badge">🌟</span> Tamil First
          </button>
          <button
            type="button"
            className={`lang-pref-chip pressable${langPref === "all" ? " active" : ""}`}
            onClick={() => handleLangChange("all")}
            title="Standard ranking across all languages"
          >
            <span className="lang-badge">🌐</span> All
          </button>
        </div>
      </div>

      {/* ── Layer 5: "Showing results for..." / "Did you mean...?" banner ── */}
      {!state.loading && correction && !exact && (
        <div className="correction-banner" role="status">
          <span className="correction-lead">Showing results for </span>
          <span className="correction-target">{correction.corrected}</span>
          <span className="correction-sep">·</span>
          <Link
            href={`/search?q=${encodeURIComponent(correction.original)}&type=${type}&exact=true`}
            className="correction-fallback"
          >
            Search instead for <em>{correction.original}</em>
          </Link>
        </div>
      )}

      {state.loading && (
        <div className="list" aria-busy="true" aria-label="Loading results">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      )}

      {state.error && (
        <div className="alert-card" role="alert">
          {state.error}
        </div>
      )}

      {!state.loading && !state.error && results.length === 0 && (
        <div className="empty">
          <Emoji char="🔎" size={72} className="big" />
          <h2>No results for “{q}”</h2>
          <p>Check the spelling, or try the artist name with the song title.</p>
        </div>
      )}

      {!state.loading && !state.error && results.length > 0 && (
        <div className="reveal" key={`${type}-${q}`}>
          {type === "all" ? (
            <>
              {displayedSongs.length > 0 && (
                <>
                  <h2 className="group-title">
                    Songs {songs.length > 10 && `(${displayedSongs.length}/${songs.length})`}
                  </h2>
                  <ul className="list">
                    {displayedSongs.map((r) => (
                      <ResultCard key={r.key} item={r} query={q} />
                    ))}
                  </ul>

                  {/* Load more button */}
                  {hasMoreSongs && (
                    <div className="load-more-wrap">
                      <button
                        type="button"
                        className="load-more-btn pressable"
                        onClick={() => setVisibleCount((prev) => prev + 10)}
                      >
                        Load more songs (+10)
                      </button>
                    </div>
                  )}
                </>
              )}

              {albums.length > 0 && (
                <>
                  <h2 className="group-title">Albums & Soundtracks</h2>
                  <ul className="list">
                    {albums.map((r) => (
                      <ResultCard key={r.key} item={r} query={q} />
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <>
              <ul className="list">
                {(type === "song" ? displayedSongs : results).map((r) => (
                  <ResultCard key={r.key} item={r} query={q} />
                ))}
              </ul>

              {/* Load more for song tab */}
              {type === "song" && hasMoreSongs && (
                <div className="load-more-wrap">
                  <button
                    type="button"
                    className="load-more-btn pressable"
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                  >
                    Load more songs (+10)
                  </button>
                </div>
              )}
            </>
          )}

          {/* Instagram regional licensing disclaimer note */}
          <div className="ig-disclaimer-note" role="note">
            <span className="ig-disclaimer-icon">💡</span>
            <p className="ig-disclaimer-text">
              Copy the code and paste directly into Instagram Music sticker search.{" "}
              <em>If a song doesn&apos;t appear in Instagram, it may not be licensed in your country or may be restricted on business accounts.</em>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
