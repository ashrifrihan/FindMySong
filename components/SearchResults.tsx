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
  { id: "album", label: "Albums" },
];

export default function SearchResults({
  q,
  type,
  exact = false,
}: {
  q: string;
  type: string;
  exact?: boolean;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    results?: Result[];
    correction?: SearchCorrection;
    bestMatch?: Result;
  }>({ loading: true });

  const lastKey = useRef("");

  useEffect(() => {
    const key = `${type}::${q}::exact=${exact}`;
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
    fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}${exactParam}`)
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
  }, [q, type, exact]);

  const results = state.results ?? [];
  const correction = state.correction;
  const songs = results.filter((r) => r.kind === "song");
  const albums = results.filter((r) => r.kind === "album");

  return (
    <>
      <nav className="chips" aria-label="Result type">
        {TABS.map((t) => (
          <Link
            key={t.id}
            replace
            className="glass chip pressable"
            href={`/search?q=${encodeURIComponent(q)}&type=${t.id}${exact ? "&exact=true" : ""}`}
            aria-current={type === t.id ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

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
          <Emoji char="🔍" size={72} className="big" />
          <h2>No results for “{q}”</h2>
          <p>Check the spelling, or try the artist name with the song title.</p>
        </div>
      )}

      {!state.loading && !state.error && results.length > 0 && (
        <div className="reveal" key={`${type}-${q}`}>
          {type === "all" ? (
            <>
              {songs.length > 0 && (
                <>
                  <h2 className="group-title">Songs</h2>
                  <ul className="list">
                    {songs.map((r) => (
                      <ResultCard key={r.key} item={r} query={q} />
                    ))}
                  </ul>
                </>
              )}
              {albums.length > 0 && (
                <>
                  <h2 className="group-title">Albums</h2>
                  <ul className="list">
                    {albums.map((r) => (
                      <ResultCard key={r.key} item={r} query={q} />
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <ul className="list">
              {results.map((r) => (
                <ResultCard key={r.key} item={r} query={q} />
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
