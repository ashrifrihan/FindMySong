// Liquid Glass "Clear ↔ Tinted" setting, like iOS 27's Display & Brightness slider.
export const TINT_KEY = "findmysong:tint";
export const DEFAULT_TINT = 0.35;

// Runs before paint (inlined in <head>) so there's no flash.
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
