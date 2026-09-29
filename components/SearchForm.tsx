"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpIcon, SearchIcon } from "./Icons";

export const QUOTA_EVENT = "findmysong:quota";

export default function SearchForm({
  initialQ = "",
  type = "all",
  autoFocus = false,
  variant = "default",   // "hero" | "default"
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v || left === 0) return;
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(`/search?q=${encodeURIComponent(v)}&type=${type}`);
  }

  const out = left === 0;
  const isHero = variant === "hero";
  const barClass = isHero ? "hero-search" : "search-bar";
  const goClass  = isHero ? "hero-go"    : "search-go";
  const quotaClass = isHero ? "hero-quota" : "search-quota";

  return (
    <div>
      <form className={barClass} onSubmit={submit} role="search">
        <SearchIcon size={20} />
        <label htmlFor="q" className="sr-only">Search music</label>
        <input
          id="q"
          suppressHydrationWarning
          type="search"
          placeholder="Songs, artists or albums…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
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

      {/* Quota indicator */}
      <p className={quotaClass} aria-live="polite">
        {left !== null && (
          <span className="dots" aria-hidden>
            {Array.from({ length: limit }, (_, i) => (
              <i key={i} className={i < left ? "on" : ""} />
            ))}
          </span>
        )}
        {left === null
          ? `${limit} searches a day`
          : out
          ? "No searches left today — resets at midnight UTC."
          : `${left} of ${limit} searches left today`}
      </p>
    </div>
  );
}
