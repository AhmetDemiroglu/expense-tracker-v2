/* Klavye payı: --kb-h. WebView klavyeyle küçüldüyse (Android) klavye zaten görünümün dışındadır, değer 0 olur.
   iOS'ta WebView küçülmez (Keyboard.resize = none): pay klavye yüksekliğidir. Desen: PureScan app/layout.js. */
import { useSyncExternalStore } from "react";
import { Keyboard } from "@capacitor/keyboard";
import { isIOS, isNative } from "./platform";

const setVar = (name: string, px: number) => document.documentElement.style.setProperty(name, `${Math.max(0, Math.round(px))}px`);

/** Klavyenin görünüme bindiği pay. full: klavyesiz yükseklik, now: şu anki, kb: klavye yüksekliği. */
export function keyboardOverlap(full: number, now: number, kb: number): number {
  if (!kb) return 0;
  const resizedBy = Math.max(0, full - now);
  if (resizedBy >= kb * 0.5) return 0;
  return Math.max(0, kb - resizedBy);
}

/** Web'de (iOS Safari, Android Chrome) klavye payı: görsel görünümün alttan kısaldığı miktar. Küçük farklar klavye sayılmaz
    (adres çubuğunun açılıp kapanması). */
export function webKeyboardInset(innerHeight: number, viewHeight: number, viewOffsetTop: number): number {
  const inset = Math.round(innerHeight - viewHeight - viewOffsetTop);
  return inset > 120 ? inset : 0;
}

const textFocused = (): boolean => {
  const el = document.activeElement;
  return el instanceof HTMLElement && (/^(INPUT|TEXTAREA)$/.test(el.tagName) || el.isContentEditable);
};

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

/** Odaktaki alanı görünür bölgenin ortasına getirmek için kaydırma miktarı (px, + aşağı). Alan zaten rahatça görünüyorsa 0.
    top / bottom: alanın kenarları. visTop / visBottom: kaydırma kabının klavyenin üstünde kalan görünür bölgesi. */
export function revealDelta(top: number, bottom: number, visTop: number, visBottom: number, margin = 28): number {
  if (visBottom - visTop < 40) return 0;
  if (top >= visTop + margin && bottom <= visBottom - margin) return 0;
  return Math.round((top + bottom) / 2 - (visTop + visBottom) / 2);
}

/** Odaktaki yazı alanını, içinde durduğu kaydırma kabında, klavyenin üstünde kalan bölgenin ortasına getirir.
    scrollIntoView kullanılmaz (gizli taşmalı kabuk kaplarını da kaydırır). Kaydırılacak kap yoksa bir şey yapmaz:
    o durumda alanı klavyenin üstünde tutan şey düzenin alt boşluğudur (--kb-h + --kb-gap). */
function revealFocused(): void {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || !/^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
  let box: HTMLElement | null = null;
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const oy = getComputedStyle(a).overflowY;
    if ((oy === "auto" || oy === "scroll") && a.scrollHeight > a.clientHeight + 1) {
      box = a;
      break;
    }
  }
  if (!box) return;
  const r = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  const visBottom = Math.min(b.bottom, window.innerHeight - keyboardInset() - 8);
  const delta = revealDelta(r.top, r.bottom, b.top, visBottom);
  if (delta) box.scrollTo({ top: box.scrollTop + delta, behavior: "smooth" });
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
  if (!isNative) {
    /* Web: klavye olayı yok, görsel görünümden okunur. iOS Safari klavye açılınca sayfayı küçültmez, üstüne bindirir
       ve odaktaki alanı göstermek için sayfayı kaydırır: alan kapanınca kayma geri alınır (sabit kabuk yerinden oynamasın). */
    const vv = window.visualViewport;
    if (!vv) return;
    let lastInset = 0;
    const sync = () => {
      const inset = textFocused() ? webKeyboardInset(window.innerHeight, vv.height, vv.offsetTop) : 0;
      setVar("--kb-h", inset);
      setKeyboardOpen(inset > 0);
      if (inset > 0 && inset !== lastInset) {
        /* Düzen klavye payıyla yukarı çıktıktan sonra alan ortalanır ve Safari'nin sayfaya verdiği kayma geri alınır:
           alan zaten klavyenin üstünde ve arada boşluk var, sayfanın itilmesine gerek kalmaz. */
        setTimeout(() => {
          revealFocused();
          if (window.scrollY !== 0) window.scrollTo(0, 0);
        }, 280);
      }
      lastInset = inset;
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    document.addEventListener("focusin", () => setTimeout(sync, 300));
    document.addEventListener("focusout", () =>
      setTimeout(() => {
        sync();
        if (!textFocused() && (window.scrollY !== 0 || vv.offsetTop !== 0)) window.scrollTo(0, 0);
      }, 120),
    );
    return;
  }
  window.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("resize", onResize);
  /* iOS: WebView'ın kendi kaydırması kapatılır. Açık kalırsa klavye çıkınca sistem sayfayı, alan klavyenin tam üstüne
     gelecek kadar iter (alan klavyeye yapışık görünür) ve bizim alt boşluğumuzla birlikte ekran iki kez kayar.
     Kapalıyken yeri yalnız düzen belirler: alt boşluk = klavye + --kb-gap, odaktaki alan görünür bölgenin ortasına gelir. */
  if (isIOS) void Keyboard.setScroll({ isDisabled: true }).catch(() => {});
  const show = (info: { keyboardHeight: number }) => {
    kb = info?.keyboardHeight || 0;
    apply();
    setKeyboardOpen(true);
  };
  void Keyboard.addListener("keyboardWillShow", show);
  void Keyboard.addListener("keyboardDidShow", (info) => {
    show(info);
    setTimeout(revealFocused, 300);
  });
  document.addEventListener("focusin", () => {
    if (kb) setTimeout(revealFocused, 80);
  });
  void Keyboard.addListener("keyboardWillHide", () => {
    kb = 0;
    apply();
    setKeyboardOpen(false);
  });
}
