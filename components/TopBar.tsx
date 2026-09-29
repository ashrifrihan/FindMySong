"use client";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { GlassIcon, MoonIcon, SunIcon } from "./Icons";
import { applyTheme, applyTint, readTheme, readTint, resolvedTheme, type Theme } from "@/lib/appearance";

const TITLES: Record<string, string> = {
  "/": "FindMySong",
  "/search": "Search",
  "/saved": "Saved",
};

export default function TopBar() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [glassOpen, setGlassOpen] = useState(false);
  const [tint, setTint] = useState(0.35);
  const [theme, setTheme] = useState<Theme>("system");
  const [isDark, setIsDark] = useState(false);
  const pop = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  // Read persisted values on mount
  useEffect(() => {
    setTint(readTint());
    const t = readTheme();
    setTheme(t);
    setIsDark(resolvedTheme() === "dark");
  }, []);

  // Keep isDark in sync when theme or system changes
  useEffect(() => {
    const update = () => setIsDark(resolvedTheme() === "dark");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    update();
    return () => mq.removeEventListener("change", update);
  }, [theme]);

  // Scroll detection for frosted topbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close glass popover on outside click / Escape
  useEffect(() => {
    if (!glassOpen) return;
    const close = (e: PointerEvent) => {
      if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node))
        setGlassOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setGlassOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [glassOpen]);

  function toggleTheme() {
    const next: Theme = isDark ? "light" : "dark";

    if (!document.startViewTransition) {
      applyTheme(next);
      setTheme(next);
      setIsDark(next === "dark");
      return;
    }

    document.startViewTransition(() => {
      flushSync(() => {
        applyTheme(next);
        setTheme(next);
        setIsDark(next === "dark");
      });
    });
  }

  const title = TITLES[path] ?? "FindMySong";

  return (
    <header className={`topbar${scrolled ? " scrolled" : ""}`}>
      <div className="topbar-in">
        <span className="inline-title" aria-hidden={!scrolled}>{title}</span>

        <div className="topbar-actions">
          {/* Dark / Light mode toggle */}
          <button
            suppressHydrationWarning
            className="glass-btn pressable theme-toggle-btn"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
          >
            <div className={`theme-icon-container ${isDark ? "is-dark" : "is-light"}`}>
              <span className="icon-sun"><SunIcon size={18} /></span>
              <span className="icon-moon"><MoonIcon size={18} /></span>
            </div>
          </button>

          {/* Glass tint popover trigger */}
          <button
            ref={btn}
            suppressHydrationWarning
            className="glass-btn pressable"
            aria-label="Glass appearance"
            aria-expanded={glassOpen}
            onClick={() => setGlassOpen((o) => !o)}
          >
            <GlassIcon size={18} />
          </button>
        </div>
      </div>

      {/* Glass tint popover */}
      <div
        ref={pop}
        className={`popover${glassOpen ? " open" : ""}`}
        role="dialog"
        aria-label="Glass appearance"
        aria-hidden={!glassOpen}
      >
        <p className="pop-title">Liquid Glass</p>
        <input
          type="range"
          suppressHydrationWarning
          min={0} max={1} step={0.01}
          value={tint}
          tabIndex={glassOpen ? 0 : -1}
          aria-label="Glass tint, from clear to tinted"
          style={{ ["--p" as any]: `${tint * 100}%` }}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setTint(v);
            applyTint(v);
          }}
        />
        <div className="pop-scale"><span>Clear</span><span>Tinted</span></div>
      </div>
    </header>
  );
}
