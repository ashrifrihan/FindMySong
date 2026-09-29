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

/**
 * Inlined in <head> — runs before first paint to completely avoid theme flash.
 * Always resolves and sets data-theme to either 'dark' or 'light'.
 * Also synchronizes the browser meta theme-color bar and listens to live OS changes.
 */
export const themeBootScript = `try{var s=localStorage.getItem('${THEME_KEY}');var d=s==='light'||s==='dark'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',d);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d==='dark'?'#111118':'#f4f6fb');window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(e){if(!localStorage.getItem('${THEME_KEY}')){var n=e.matches?'dark':'light';document.documentElement.setAttribute('data-theme',n);var mc=document.querySelector('meta[name="theme-color"]');if(mc)mc.setAttribute('content',n==='dark'?'#111118':'#f4f6fb');}});}catch(e){}`;

export type Theme = "light" | "dark" | "system";

export function syncMetaThemeColor(isDark: boolean) {
  const color = isDark ? "#111118" : "#f4f6fb";
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    try { localStorage.removeItem(THEME_KEY); } catch {}
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", isDark ? "dark" : "light");
    syncMetaThemeColor(isDark);
  } else {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    syncMetaThemeColor(theme === "dark");
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
