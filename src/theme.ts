/* Tema tercihi. Kayıt anahtarı ve değerleri index.html ön betiğiyle aynıdır, ikisi birlikte değişir.
   P3/P8 ayar ekranı bu modülü kullanır. */
export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "fintel_theme";

const media = (): MediaQueryList | null =>
  typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* depolama kapalıysa sistem tercihi */
  }
  return "system";
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref !== "system") return pref;
  return media()?.matches ? "dark" : "light";
}

export function applyTheme(pref: ThemePref = readThemePref()): ResolvedTheme {
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

export function setThemePref(pref: ThemePref): ResolvedTheme {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* yoksay */
  }
  return applyTheme(pref);
}

/** Sistem teması değişince (tercih "system" ise) data-theme'i günceller. Dönen fonksiyon dinlemeyi bırakır. */
export function watchSystemTheme(onChange?: (t: ResolvedTheme) => void): () => void {
  const mq = media();
  if (!mq) return () => {};
  const handler = () => {
    if (readThemePref() === "system") onChange?.(applyTheme("system"));
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
