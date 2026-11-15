/* Alttan açılan sayfa. Tutma çizgisinden, başlıktan ya da içerik en üstteyken içerikten aşağı çekince kapanır.
   Perdeye dokunma ve geri tuşu da kapatır. Yalnız transform hareket eder, perde ayrı bir öğe olarak solar. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { tr } from "@/metin";
import { useBackLayer } from "./back";
import { cn } from "./cn";
import { nearestDetent, rubber, shouldDismiss } from "./gesture";
import { useDrag } from "./useDrag";
import { usePullDown } from "./usePullDown";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** auto: içerik kadar. half: ekranın yarısı. full: tam boy. */
  size?: "auto" | "half" | "full";
  /** half iken yukarı çekince tam boya çıkar. */
  expandable?: boolean;
  footer?: ReactNode;
  /** false: çekerek, perdeyle ve geri tuşuyla kapanmaz (zorunlu adım). */
  dismissible?: boolean;
  children?: ReactNode;
  className?: string;
}

type Phase = "closed" | "opening" | "open" | "closing";

const HALF = "56dvh";
const FULL = "calc(100dvh - var(--safe-top) - 12px)";
const HALF_OFFSET = `calc(100% - ${HALF})`;

export function Sheet({ open, onClose, title, subtitle, size = "auto", expandable = false, footer, dismissible = true, children, className }: SheetProps) {
  const [phase, setPhase] = useState<Phase>("closed");
  /* 0: tam açık, 1: yarım (yalnız expandable). */
  const [detent, setDetent] = useState(expandable ? 1 : 0);
  const panel = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const base = useRef(0);
  const multi = expandable && size === "half";

  if (open && (phase === "closed" || phase === "closing")) {
    setPhase("opening");
    setDetent(multi ? 1 : 0);
  } else if (!open && (phase === "open" || phase === "opening")) {
    setPhase("closing");
  }

  useEffect(() => {
    if (phase === "opening") {
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setPhase("open")));
      return () => cancelAnimationFrame(id);
    }
    if (phase === "closing") {
      const id = setTimeout(() => setPhase("closed"), 440);
      return () => clearTimeout(id);
    }
  }, [phase]);

  useBackLayer(open, () => {
    if (dismissible) onClose();
    return true;
  });

  const offsets = (): number[] => {
    const el = panel.current;
    if (!multi || !el) return [0];
    return [0, Math.max(0, el.offsetHeight - window.innerHeight * 0.56)];
  };

  const setY = (y: number | null) => {
    const el = panel.current;
    if (!el) return;
    if (y === null) {
      el.removeAttribute("data-dragging");
      el.style.removeProperty("--sheet-y");
    } else {
      el.setAttribute("data-dragging", "true");
      el.style.setProperty("--sheet-y", `${Math.round(y)}px`);
    }
  };

  const onStart = () => {
    base.current = offsets()[detent] ?? 0;
  };
  const onMove = (d: number) => {
    const y = base.current + d;
    setY(y < 0 ? rubber(y, 200, 0.5) : y);
  };
  const onEnd = ({ distance, velocity, cancelled }: { distance: number; velocity: number; cancelled: boolean }) => {
    const list = offsets();
    const y = base.current + distance;
    const lowest = list[list.length - 1] ?? 0;
    setY(null);
    if (cancelled) return;
    if (dismissible && shouldDismiss(y - lowest, velocity)) {
      onClose();
      return;
    }
    setDetent(nearestDetent(Math.max(0, y), velocity, list));
  };

  const active = phase === "open";
  useDrag(handle, { axis: "y", enabled: active && (dismissible || multi), onStart, onMove, onEnd });
  usePullDown(scroller, { enabled: active && dismissible, onStart, onMove, onEnd });

  if (phase === "closed") return null;

  const shown = phase === "open";
  const rest = multi && detent === 1 ? HALF_OFFSET : "0px";
  const height = size === "full" || multi ? FULL : size === "half" ? `min(${HALF}, ${FULL})` : undefined;

  return createPortal(
    <div className="f-clip fixed inset-0" style={{ zIndex: "var(--z-sheet)" }} role="dialog" aria-modal="true" aria-label={title}>
      <div className="f-scrim" data-show={shown} onClick={() => dismissible && onClose()} />
      <div
        ref={panel}
        className={cn(
          "f-sheet-panel absolute inset-x-0 bottom-0 mx-auto flex max-w-xl flex-col rounded-t-[calc(var(--f-radius-card)+8px)] bg-surface shadow-(--f-shadow-sheet)",
          className,
        )}
        style={{
          height,
          maxHeight: FULL,
          ["--sheet-rest" as string]: rest,
          transform: shown ? "translateY(var(--sheet-y, var(--sheet-rest)))" : "translateY(100%)",
        }}
      >
        <div
          className="flex min-h-0 flex-1 flex-col"
          style={{
            height: multi ? "calc(100% - var(--sheet-y, var(--sheet-rest)))" : undefined,
            flex: multi ? "none" : undefined,
            paddingBottom: "max(calc(var(--safe-bottom) + 16px), calc(var(--kb-h) + 12px))",
          }}
        >
          <div ref={handle} className="shrink-0 touch-none pt-2.5">
            <div className="mx-auto h-1.5 w-10 rounded-pill bg-surface-2" />
            {title || dismissible ? (
              <div className="flex items-start gap-3 px-5 pt-2 pb-2">
                <div className="min-w-0 flex-1 pt-2">
                  {title ? <h2 className="text-xl font-semibold text-text">{title}</h2> : null}
                  {subtitle ? <p className="mt-1 text-sm text-text-2">{subtitle}</p> : null}
                </div>
                {dismissible ? (
                  <button
                    type="button"
                    aria-label={tr.ortak.kapat}
                    onClick={onClose}
                    className="pressable -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-text-2"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div ref={scroller} className="scroll-y min-h-0 flex-1 px-5 pb-2">
            {children}
          </div>
          {footer ? <div className="shrink-0 px-5 pt-3">{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
