/* Klavye payı: --kb-h. WebView klavyeyle küçüldüyse (Android) klavye zaten görünümün dışındadır, değer 0 olur.
   iOS'ta WebView küçülmez (Keyboard.resize = none): pay klavye yüksekliğidir. Desen: PureScan app/layout.js. */
import { useSyncExternalStore } from "react";
import { Keyboard } from "@capacitor/keyboard";
import { isNative } from "./platform";

const setVar = (name: string, px: number) => document.documentElement.style.setProperty(name, `${Math.max(0, Math.round(px))}px`);

/** Klavyenin görünüme bindiği pay. full: klavyesiz yükseklik, now: şu anki, kb: klavye yüksekliği. */
export function keyboardOverlap(full: number, now: number, kb: number): number {
  if (!kb) return 0;
  const resizedBy = Math.max(0, full - now);
  if (resizedBy >= kb * 0.5) return 0;
  return Math.max(0, kb - resizedBy);
}

let keyboardOpen = false;
const listeners = new Set<() => void>();
function setKeyboardOpen(v: boolean): void {
  if (keyboardOpen === v) return;
  keyboardOpen = v;
  listeners.forEach((fn) => fn());
}
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, () => keyboardOpen, () => false);
}

/** Şu anki klavye payı (px). Tur yerleşimi kullanır. */
export function keyboardInset(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--kb-h")) || 0;
}

/** Güvenli alan payları (px), ölçülerek. */
export function safeInsets(): { top: number; bottom: number; left: number; right: number } {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding:var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left)";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const out = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return out;
}

function revealFocused(): void {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || !/^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
  const r = el.getBoundingClientRect();
  if (r.bottom > window.innerHeight - keyboardInset() - 12 || r.top < 0) el.scrollIntoView({ block: "center", behavior: "smooth" });
}

let started = false;

/** Bir kez çağrılır (main.tsx). */
export function initLayout(): void {
  if (started) return;
  started = true;
  let width = window.innerWidth;
  let full = window.innerHeight;
  let kb = 0;
  const apply = () => setVar("--kb-h", keyboardOverlap(full, window.innerHeight, kb));
  const onResize = () => {
    if (window.innerWidth !== width) {
      width = window.innerWidth;
      full = window.innerHeight;
    } else {
      full = Math.max(full, window.innerHeight);
    }
    apply();
  };
  window.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("resize", onResize);
  if (!isNative) return;
  const show = (info: { keyboardHeight: number }) => {
    kb = info?.keyboardHeight || 0;
    apply();
    setKeyboardOpen(true);
  };
  void Keyboard.addListener("keyboardWillShow", show);
  void Keyboard.addListener("keyboardDidShow", (info) => {
    show(info);
    setTimeout(revealFocused, 280);
  });
  document.addEventListener("focusin", () => {
    if (kb) setTimeout(revealFocused, 50);
  });
  void Keyboard.addListener("keyboardWillHide", () => {
    kb = 0;
    apply();
    setKeyboardOpen(false);
  });
}
