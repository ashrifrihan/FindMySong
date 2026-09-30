"use client";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SettingsIcon, SunIcon, MoonIcon, MonitorIcon, XIcon, SparklesIcon } from "./Icons";
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

  function resetTint() {
    setTint(0.35);
    applyTint(0.35);
  }

  const title = TITLES[path] ?? "FindMySong";

  return (
    <header className={`topbar${scrolled ? " scrolled" : ""}`}>
      <div className="topbar-in">
        {/* Left: Brand title and dot - always shown on all pages like search page */}
        <Link href="/" className="topbar-brand" aria-label="FindMySong Home">
          <span className="brand-dot" aria-hidden />
          <span className="brand-text">{title}</span>
        </Link>

        <div className="topbar-actions">
          {/* Settings button on the right */}
          <button
            ref={btn}
            suppressHydrationWarning
            className={`glass-btn pressable${settingsOpen ? " active" : ""}`}
            aria-label="Appearance settings"
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <SettingsIcon size={18} />
          </button>
        </div>

        {/* Settings & Appearance popover - anchored within topbar-in */}
        <div
          ref={pop}
          className={`popover${settingsOpen ? " open" : ""}`}
          role="dialog"
          aria-label="Appearance and settings"
          aria-hidden={!settingsOpen}
        >
          {/* Header */}
          <div className="pop-header">
            <div className="pop-header-title-wrap">
              <span className="pop-header-icon-box">
                <SparklesIcon size={14} />
              </span>
              <span className="pop-title">Appearance</span>
            </div>
            <button
              type="button"
              className="pop-close-btn pressable"
              aria-label="Close appearance settings"
              onClick={() => setSettingsOpen(false)}
            >
              <XIcon size={15} />
            </button>
          </div>

          {/* Theme mode segmented controller */}
          <div className="pop-section">
            <div className="pop-section-head">
              <span className="pop-section-label">Theme Mode</span>
              <span className="pop-badge-status">{theme === "system" ? (isDark ? "Auto (Dark)" : "Auto (Light)") : theme}</span>
            </div>
            <div className="pop-segmented" role="radiogroup" aria-label="Theme mode">
              <button
                type="button"
                role="radio"
                aria-checked={theme === "light"}
                className={`pop-seg-btn pressable${theme === "light" ? " active" : ""}`}
                onClick={() => changeTheme("light")}
              >
                <SunIcon size={14} />
                <span>Light</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === "dark"}
                className={`pop-seg-btn pressable${theme === "dark" ? " active" : ""}`}
                onClick={() => changeTheme("dark")}
              >
                <MoonIcon size={14} />
                <span>Dark</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === "system"}
                className={`pop-seg-btn pressable${theme === "system" ? " active" : ""}`}
                onClick={() => changeTheme("system")}
              >
                <MonitorIcon size={14} />
                <span>Auto</span>
              </button>
            </div>
          </div>

          {/* Liquid Glass slider */}
          <div className="pop-section">
            <div className="pop-section-head">
              <span className="pop-section-label">Liquid Glass</span>
              <span className="pop-value-badge">{Math.round(tint * 100)}%</span>
            </div>
            <p className="pop-section-desc">Frosted transparency &amp; blur density</p>
            <div className="pop-slider-wrap">
              <input
                type="range"
                suppressHydrationWarning
                min={0}
                max={1}
                step={0.01}
                value={tint}
                tabIndex={settingsOpen ? 0 : -1}
                aria-label="Glass tint percentage"
                style={{ ["--p" as any]: `${tint * 100}%` }}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setTint(v);
                  applyTint(v);
                }}
              />
            </div>
            <div className="pop-scale">
              <span>0% Clear</span>
              <span>100% Frosted</span>
            </div>
          </div>

          {/* Reset button if tint altered */}
          {Math.round(tint * 100) !== 35 && (
            <button
              type="button"
              className="pop-reset-btn pressable"
              onClick={resetTint}
            >
              Reset to default (35%)
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

