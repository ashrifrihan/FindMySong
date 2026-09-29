"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ResultCard from "@/components/ResultCard";
import { getSaved, loadSaved, onSavedChange } from "@/lib/saved";
import type { Result } from "@/lib/types";

export default function SavedPage() {
  const [items, setItems] = useState<Result[] | null>(null);

  useEffect(() => {
    const sync = () => setItems(getSaved() ? [...getSaved()!] : null);
    const off = onSavedChange(sync);
    loadSaved().then(sync);
    return off;
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <h1>Saved</h1>
          {items && items.length > 0 && (
            <span className="page-count">{items.length} {items.length === 1 ? "item" : "items"}</span>
          )}
        </div>
      </div>

      {items === null ? (
        <div className="list" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton-card" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎧</div>
          <h2>Nothing saved yet</h2>
          <p>Tap the bookmark on any result to keep its code here for later.</p>
          <Link href="/" className="btn-primary pressable">Search music</Link>
        </div>
      ) : (
        <ul className="list reveal">{items.map((r) => <ResultCard key={r.key} item={r} />)}</ul>
      )}
    </>
  );
}
