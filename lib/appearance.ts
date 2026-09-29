// ─── Glass Tint ───────────────────────────────────────────────
export const TINT_KEY = "findmysong:tint";
export const DEFAULT_TINT = 0.35;

export const tintBootScript = `try{var t=parseFloat(localStorage.getItem('${TINT_KEY}')||localStorage.getItem('trackcode:tint'));if(!isNaN(t))document.documentElement.style.setProperty('--tint',String(t))}catch(e){}`;

export function applyTint(v: number) {
  document.documentElement.style.setProperty("--tint", String(v));
  try { localStorage.setItem(TINT_KEY, String(v)); } catch {}
}

export function readTint() {
  try {
    const v = parseFloat(localStorage.getItem(TINT_KEY) || localStorage.getItem("trackcode:tint") || "");
    return isNaN(v) ? DEFAULT_TINT : v;
  } catch { return DEFAULT_TINT; }
}

// ─── Dark / Light Mode ────────────────────────────────────────
export const THEME_KEY = "findmysong:theme";

/** Inlined in <head> — runs before paint to avoid flash */
export const themeBootScript = `try{var th=localStorage.getItem('${THEME_KEY}');if(th)document.documentElement.setAttribute('data-theme',th)}catch(e){}`;

export type Theme = "light" | "dark" | "system";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    try { localStorage.removeItem(THEME_KEY); } catch {}
  } else {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }
}

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY) as Theme | null;
    return v === "light" || v === "dark" ? v : "system";
  } catch { return "system"; }
}

export function resolvedTheme(): "light" | "dark" {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light") return "light";
    if (stored === "dark") return "dark";
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
