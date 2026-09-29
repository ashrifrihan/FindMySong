"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ResultCard from "./ResultCard";
import Emoji from "./Emoji";
import { QUOTA_EVENT } from "./SearchForm";
import type { Result, SearchResponse } from "@/lib/types";

const TABS = [
  { id: "all", label: "All" },
  { id: "song", label: "Songs" },
  { id: "album", label: "Albums" },
];

export default function SearchResults({ q, type }: { q: string; type: string }) {
  const [state, setState] = useState<{ loading: boolean; error?: string; results?: Result[] }>({ loading: true });
  const lastKey = useRef("");

  useEffect(() => {
    const key = `${type}::${q}`;
    if (!q || lastKey.current === key) return;
    lastKey.current = key;

    // Reuse results from this browser session so going back doesn't use a search.
    const cacheKey = `findmysong:search:${key}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setState({ loading: false, results: JSON.parse(cached) }); return; }
    } catch {}

    setState({ loading: true });
    fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}`)
      .then(async (r) => {
        const d: SearchResponse & { error?: string } = await r.json();
        if (typeof d.remaining === "number") window.dispatchEvent(new CustomEvent(QUOTA_EVENT, { detail: d.remaining }));
        if (!r.ok) throw new Error(d.error || "Search failed. Try again.");
        try { sessionStorage.setItem(cacheKey, JSON.stringify(d.results)); } catch {}
        setState({ loading: false, results: d.results });
      })
      .catch((e) => setState({ loading: false, error: e.message }));
  }, [q, type]);

  const results = state.results ?? [];
  const songs = results.filter((r) => r.kind === "song");
  const albums = results.filter((r) => r.kind === "album");

  return (
    <>
      <nav className="chips" aria-label="Result type">
        {TABS.map((t) => (
          <Link key={t.id} replace className="glass chip pressable"
            href={`/search?q=${encodeURIComponent(q)}&type=${t.id}`}
            aria-current={type === t.id ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      {state.loading && (
        <div className="list" aria-busy="true" aria-label="Loading results">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton-card" />)}
        </div>
      )}

      {state.error && <p className="alert" role="alert">{state.error}</p>}

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
              {songs.length > 0 && (<><h2 className="group-title">Songs</h2><ul className="list">{songs.map((r) => <ResultCard key={r.key} item={r} />)}</ul></>)}
              {albums.length > 0 && (<><h2 className="group-title">Albums</h2><ul className="list">{albums.map((r) => <ResultCard key={r.key} item={r} />)}</ul></>)}
            </>
          ) : (
            <ul className="list">{results.map((r) => <ResultCard key={r.key} item={r} />)}</ul>
          )}
        </div>
      )}
    </>
  );
}
