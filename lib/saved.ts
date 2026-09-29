"use client";
import type { Result } from "./types";

// Saved list lives in Supabase; this keeps one shared copy in the page
// and updates it instantly (optimistic), rolling back if the server fails.
const EVENT = "findmysong:saved-change";
let items: Result[] | null = null;
let loading: Promise<void> | null = null;

const emit = () => window.dispatchEvent(new Event(EVENT));

export function loadSaved() {
  if (items) return Promise.resolve();
  if (!loading) {
    loading = fetch("/api/saved")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => { items = d.items || []; })
      .catch(() => { items = []; })
      .finally(emit);
  }
  return loading;
}

export const getSaved = () => items; // null while loading
export const isSaved = (key: string) => !!items?.some((r) => r.key === key);

export async function toggleSaved(item: Result) {
  await loadSaved();
  const prev = items ?? [];
  const was = prev.some((r) => r.key === item.key);
  items = was ? prev.filter((r) => r.key !== item.key) : [item, ...prev];
  emit();
  try {
    const res = was
      ? await fetch(`/api/saved?key=${encodeURIComponent(item.key)}`, { method: "DELETE" })
      : await fetch("/api/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item }) });
    if (!res.ok) throw new Error();
  } catch {
    items = prev;
    emit();
  }
}

export function onSavedChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
