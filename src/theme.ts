/* Tema tercihi: gündüz, gece, sistem. Kayıt anahtarı ve değerleri index.html ön betiğiyle aynıdır, ikisi birlikte değişir.
   İlk boyamadan önce index.html içindeki betik data-theme'i yazar (titreme yok). Burası çalışma anını yönetir:
   kalıcı tercih, sistem değişimi, durum ve gezinme çubuğu simge rengi, theme-color. */
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";

export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "fintel_theme";

/* tokens.css --f-bg ile aynı (theme-color meta'sı CSS değişkeni okuyamaz). */
const BG: Record<ResolvedTheme, string> = { light: "#F6F5F1", dark: "#0A0E1C" };

const media = (): MediaQueryList | null =>
  typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

const listeners = new Set<() => void>();

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

function syncChrome(resolved: ResolvedTheme): void {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = BG[resolved];
  });
  if (Capacitor.isNativePlatform()) {
    /* Dark = koyu zemin üstünde açık simgeler. */
    void SystemBars.setStyle({ style: resolved === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
  }
}

export function applyTheme(pref: ThemePref = readThemePref()): ResolvedTheme {
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;
  syncChrome(resolved);
  listeners.forEach((fn) => fn());
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

/** Şu an uygulanmış tema (data-theme). */
export function currentTheme(): ResolvedTheme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Tema değişimini dinler (useTheme bunu kullanır). */
export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
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
