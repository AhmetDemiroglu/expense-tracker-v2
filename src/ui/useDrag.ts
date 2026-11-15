/* Tek parmak sürükleme: eksen kilidi, hız, iptal. Pointer Events (dokunma ve fare).
   Kurallar: yanlış eksene kilitlenen hareket bırakılır; pointercancel bırakma DEĞİL iptaldir (Android sistem geri jesti
   sol kenarı alır, ardından geri tuşu olayı gelir: bırakma sayılırsa çift geri olur). */
import { useEffect, useRef, type RefObject } from "react";
import { GESTURE, lockAxis, VelocityTracker, type Axis } from "./gesture";

export interface DragEnd {
  /** Eksen boyunca toplam hareket (px, işaretli). */
  distance: number;
  /** px/ms, işaretli. */
  velocity: number;
  cancelled: boolean;
}

export interface DragOptions {
  axis: Axis;
  enabled?: boolean;
  /** Yalnız öğenin sol kenarından bu kadar px içinde başlayan dokunuş. */
  edge?: number;
  /** Bu özniteliği taşıyan bir alt öğeden başlayan dokunuş alınmaz (ör. "data-swipe-lock"). */
  lockAttr?: string;
  /** Sol kenar geri bölgesine (data-edge-back içindeyken) yol ver. */
  yieldEdge?: boolean;
  /** Eksen kilitlenirken son söz: false dönerse jest alınmaz. */
  canStart?: (info: { dx: number; dy: number; target: Element }) => boolean;
  onStart?: () => void;
  onMove: (distance: number) => void;
  onEnd: (result: DragEnd) => void;
}

export function useDrag(ref: RefObject<HTMLElement | null>, options: DragOptions): void {
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });
  const enabled = options.enabled !== false;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let cleanupMove: (() => void) | null = null;

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0) || cleanupMove) return;
      const o = opts.current;
      const target = e.target as Element;
      if (o.lockAttr) {
        const locked = target.closest?.(`[${o.lockAttr}]`);
        if (locked && locked !== el && el.contains(locked)) return;
      }
      const box = el.getBoundingClientRect();
      if (o.edge !== undefined && e.clientX - box.left > o.edge) return;
      if (o.yieldEdge) {
        const host = el.closest("[data-edge-back]");
        if (host && e.clientX - host.getBoundingClientRect().left <= GESTURE.edge) return;
      }

      const sx = e.clientX;
      const sy = e.clientY;
      const id = e.pointerId;
      const tracker = new VelocityTracker();
      let active = false;
      let last = 0;

      const finish = (cancelled: boolean) => {
        cleanupMove?.();
        cleanupMove = null;
        if (!active) return;
        try {
          el.releasePointerCapture(id);
        } catch {
          /* yakalama yoksa */
        }
        if (!cancelled) {
          /* Sürükleme bir tıklamayla bitmesin. */
          const stop = (ev: Event) => {
            ev.stopPropagation();
            ev.preventDefault();
          };
          window.addEventListener("click", stop, { capture: true, once: true });
          setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 60);
        }
        opts.current.onEnd({ distance: cancelled ? 0 : last, velocity: cancelled ? 0 : tracker.get(), cancelled });
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return;
        const dx = ev.clientX - sx;
        const dy = ev.clientY - sy;
        const cur = opts.current;
        if (!active) {
          const axis = lockAxis(dx, dy);
          if (!axis) return;
          if (axis !== cur.axis || (cur.canStart && !cur.canStart({ dx, dy, target }))) {
            finish(true);
            return;
          }
          active = true;
          try {
            el.setPointerCapture(id);
          } catch {
            /* yoksay */
          }
          cur.onStart?.();
        }
        last = cur.axis === "x" ? dx : dy;
        tracker.add(last, ev.timeStamp);
        cur.onMove(last);
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId === id) finish(false);
      };
      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId === id) finish(true);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      cleanupMove = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
      };
    };

    el.addEventListener("pointerdown", onDown);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      cleanupMove?.();
      cleanupMove = null;
    };
  }, [ref, enabled]);
}
