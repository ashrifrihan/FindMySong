"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, SearchIcon } from "./Icons";

// Floating Liquid Glass tab bar. Auto-hides on scroll down, reappears on scroll up or at bottom.
export default function TabBar() {
  const path = usePathname();
  const onSaved = path.startsWith("/saved");
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setHidden(false);
      return;
    }

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 60;

      if (atBottom) {
        setHidden(false);
      } else if (Math.abs(dy) > 8) {
        if (dy > 0 && y > 80) {
          setHidden(true);
        } else if (dy < 0) {
          setHidden(false);
        }
      }
      lastY.current = Math.max(0, y);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`tabbar${hidden ? " hidden" : ""}`} aria-label="Main">
      <Link href="/" className="tab pressable" aria-current={!onSaved ? "page" : undefined}>
        <SearchIcon size={22} /><span>Search</span>
      </Link>
      <Link href="/saved" className="tab pressable" aria-current={onSaved ? "page" : undefined}>
        <BookmarkIcon size={22} filled={onSaved} /><span>Saved</span>
      </Link>
    </nav>
  );
}
