import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches;
}

const subscribe = (fn: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};

/** Sistemde "hareketi azalt" açık mı. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Sayı hedefe sayarak gider (ilk çizimde 0'dan). Hareketi azalt açıksa ya da enabled false ise doğrudan hedefi verir. */
export function useCountUp(target: number, opts: { duration?: number; enabled?: boolean } = {}): number {
  const { duration = 600, enabled = true } = opts;
  const reduce = useReducedMotion();
  const animate = enabled && !reduce;
  const [value, setValue] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (!animate) {
      shown.current = target;
      return;
    }
    const from = shown.current;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (target - from) * easeOut(t));
      shown.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, animate, duration]);

  return animate ? value : target;
}

/** İki kare bekler (yerleşim ve boyama otursun). */
export function twoFrames(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
