"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { GlassIcon } from "./Icons";
import { applyTint, readTint } from "@/lib/appearance";

const TITLES: Record<string, string> = { "/": "FindMySong", "/search": "Search", "/saved": "Saved" };

export default function TopBar() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [tint, setTint] = useState(0.35);
  const pop = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => setTint(readTint()), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const title = TITLES[path] ?? "FindMySong";

  return (
    <header className={`topbar${scrolled ? " scrolled" : ""}`}>
      <div className="topbar-in">
        <span className="inline-title" aria-hidden={!scrolled}>{title}</span>
        <button
          ref={btn}
          suppressHydrationWarning
          className="glass glass-btn pressable"
          aria-label="Glass appearance"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <GlassIcon size={20} />
        </button>
      </div>

      <div ref={pop} className={`glass popover${open ? " open" : ""}`} role="dialog" aria-label="Glass appearance" aria-hidden={!open}>
        <p className="pop-title">Liquid Glass</p>
        <input
          type="range"
          suppressHydrationWarning
          min={0}
          max={1}
          step={0.01}
          value={tint}
          tabIndex={open ? 0 : -1}
          aria-label="Glass tint, from clear to tinted"
          style={{ ["--p" as any]: `${tint * 100}%` }}
          onChange={(e) => { const v = parseFloat(e.target.value); setTint(v); applyTint(v); }}
        />
        <div className="pop-scale"><span>Clear</span><span>Tinted</span></div>
      </div>
    </header>
  );
}
