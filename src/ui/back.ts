/* Tek geri yolu. Sıra: açık katmanlar (onay, alt sayfa, tur; son açılan önce) > ekranın kendi işleyicisi
   (useBackHandler) > kabuk (üst ekran, ilk sekme). Android geri tuşu, geri düğmesi ve kenar jesti aynı yolu kullanır. */
import { useEffect, useRef } from "react";

type Handler = () => boolean;

const layers: Handler[] = [];
const interceptors: Handler[] = [];
let fallback: Handler | null = null;

/** Açık bir katman (alt sayfa, onay) kendini kaydeder. Dönen fonksiyon kaydı siler. */
export function pushBackLayer(fn: Handler): () => void {
  layers.push(fn);
  return () => {
    const i = layers.lastIndexOf(fn);
    if (i >= 0) layers.splice(i, 1);
  };
}

export function useBackLayer(active: boolean, handler: Handler): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!active) return;
    return pushBackLayer(() => ref.current());
  }, [active]);
}

/** Ekran kendi geri davranışını tanımlar. true dönerse işlendi sayılır. */
export function useBackHandler(handler: Handler, enabled = true): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    const fn = () => ref.current();
    interceptors.push(fn);
    return () => {
      const i = interceptors.lastIndexOf(fn);
      if (i >= 0) interceptors.splice(i, 1);
    };
  }, [enabled]);
}

/** Kabuk kendi geri davranışını (üst ekranı kapat, ilk sekmeye dön) buraya bağlar. */
export function setBackFallback(fn: Handler | null): void {
  fallback = fn;
}

/** true: geri işlendi. false: yapılacak bir şey kalmadı (kabuk çıkışı yönetir). */
export function goBack(): boolean {
  const top = layers[layers.length - 1];
  if (top) {
    top();
    return true;
  }
  for (let i = interceptors.length - 1; i >= 0; i--) {
    if (interceptors[i]?.() === true) return true;
  }
  return fallback ? fallback() : false;
}

/** Yalnız test için. */
export function _resetBack(): void {
  layers.length = 0;
  interceptors.length = 0;
  fallback = null;
}
