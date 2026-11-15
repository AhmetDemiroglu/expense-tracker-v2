/* Kaydırma kabı en üstteyken aşağı çekme (aşağı çekip yenileme, alt sayfayı içerikten çekip kapatma).
   Dikey kaydırma tarayıcıya ait olduğu için Pointer Events burada çalışmaz: pasif olmayan touchmove + preventDefault. */
import { useEffect, useRef, type RefObject } from "react";
import { VelocityTracker } from "./gesture";

export interface PullOptions {
  enabled?: boolean;
  onStart?: () => void;
  onMove: (distance: number) => void;
  onEnd: (result: { distance: number; velocity: number; cancelled: boolean }) => void;
}

const SLOP = 8;

export function usePullDown(scroller: RefObject<HTMLElement | null>, options: PullOptions): void {
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });
  const enabled = options.enabled !== false;

  useEffect(() => {
    const el = scroller.current;
    if (!el || !enabled) return;
    let armed = false;
    let active = false;
    let sx = 0;
    let sy = 0;
    let last = 0;
    let tracker = new VelocityTracker();

    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || !t || el.scrollTop > 0) {
        armed = false;
        return;
      }
      armed = true;
      active = false;
      sx = t.clientX;
      sy = t.clientY;
      last = 0;
      tracker = new VelocityTracker();
    };
    const move = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!armed || !t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (!active) {
        if (dy < -4 || (Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy)) || el.scrollTop > 0) {
          armed = false;
          return;
        }
        if (dy < SLOP) return;
        active = true;
        opts.current.onStart?.();
      }
      if (e.cancelable) e.preventDefault();
      last = Math.max(0, dy - SLOP);
      tracker.add(last, e.timeStamp);
      opts.current.onMove(last);
    };
    const end = (cancelled: boolean) => () => {
      if (active) opts.current.onEnd({ distance: cancelled ? 0 : last, velocity: cancelled ? 0 : tracker.get(), cancelled });
      armed = false;
      active = false;
    };
    const onEnd = end(false);
    const onCancel = end(true);

    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onCancel);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [scroller, enabled]);
}
