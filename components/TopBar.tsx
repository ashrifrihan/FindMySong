"use client";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SettingsIcon, SunIcon, MoonIcon } from "./Icons";
import { applyTheme, applyTint, readTheme, readTint, resolvedTheme, type Theme } from "@/lib/appearance";

const TITLES: Record<string, string> = {
  "/": "FindMySong",
  "/search": "Search",
  "/saved": "Saved",
};

export default function TopBar() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    const onScroll = () => setScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close popover on outside click / Escape
  useEffect(() => {
    if (!settingsOpen) return;
    const close = (e: PointerEvent) => {
      if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node))
        setSettingsOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSettingsOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [settingsOpen]);

  function changeTheme(next: Theme) {
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
        {/* Left: Page title (hidden on home page to avoid duplicate brand header) */}
        {path !== "/" ? (
          <Link href="/" className="topbar-brand" aria-label="Go to home">
            <span className="brand-dot" aria-hidden />
            <span className="brand-text">{title}</span>
          </Link>
        ) : (
          <div className="topbar-brand-spacer" aria-hidden />
        )}

        <div className="topbar-actions">
          {/* Single clean Settings button on the right */}
          <button
            ref={btn}
            suppressHydrationWarning
            className={`glass-btn pressable${settingsOpen ? " active" : ""}`}
            aria-label="Settings and appearance"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>

      {/* Settings & Appearance popover */}
      <div
        ref={pop}
        className={`popover${settingsOpen ? " open" : ""}`}
        role="dialog"
        aria-label="Appearance and settings"
        aria-hidden={!settingsOpen}
      >
        <p className="pop-title">Settings & Appearance</p>

        {/* Theme mode selection */}
        <div className="pop-section">
          <label className="pop-section-label">Theme</label>
          <div className="pop-segmented" role="radiogroup" aria-label="Theme mode">
            <button
              type="button"
              className={`pop-seg-btn pressable${theme === "light" ? " active" : ""}`}
              onClick={() => changeTheme("light")}
            >
              <SunIcon size={14} /> Light
            </button>
            <button
              type="button"
              className={`pop-seg-btn pressable${theme === "dark" ? " active" : ""}`}
              onClick={() => changeTheme("dark")}
            >
              <MoonIcon size={14} /> Dark
            </button>
            <button
              type="button"
              className={`pop-seg-btn pressable${theme === "system" ? " active" : ""}`}
              onClick={() => changeTheme("system")}
            >
              Auto
            </button>
          </div>
        </div>

        {/* Liquid Glass slider */}
        <div className="pop-section">
          <label className="pop-section-label">Liquid Glass</label>
          <input
            type="range"
            suppressHydrationWarning
            min={0}
            max={1}
            step={0.01}
            value={tint}
            tabIndex={settingsOpen ? 0 : -1}
            aria-label="Glass tint, from clear to tinted"
            style={{ ["--p" as any]: `${tint * 100}%` }}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setTint(v);
              applyTint(v);
            }}
          />
          <div className="pop-scale">
            <span>Clear</span>
            <span>Tinted</span>
          </div>
        </div>
      </div>
    </header>
  );
}
