/* Aşağı çekip yenileme. Bu bileşen kaydırma kabının KENDİSİDİR: içine ikinci bir kaydırıcı konmaz. */
import { useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { tr } from "@/metin";
import { Spinner } from "./Button";
import { cn } from "./cn";
import { GESTURE, rubber } from "./gesture";
import { haptic } from "./haptics";
import { usePullDown } from "./usePullDown";

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  /** İçerik sarmalayıcısının sınıfı (boşluklar buraya). */
  contentClassName?: string;
}

const HOLD = 52;

export function PullToRefresh({ onRefresh, disabled = false, children, className, contentClassName }: PullToRefreshProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "pull" | "ready" | "busy">("idle");
  const ready = useRef(false);

  const paint = (y: number, animate: boolean) => {
    const t = animate ? "transform var(--f-dur) var(--f-ease)" : "none";
    if (content.current) {
      content.current.style.transition = t;
      content.current.style.transform = y ? `translate3d(0,${y}px,0)` : "";
    }
    if (badge.current) {
      badge.current.style.transition = animate ? `${t}, opacity var(--f-dur) var(--f-ease)` : "none";
      badge.current.style.transform = `translate3d(-50%,${Math.min(y, HOLD + 20) - 44}px,0)`;
      badge.current.style.opacity = String(Math.min(1, y / GESTURE.pull));
    }
  };

  usePullDown(scroller, {
    enabled: !disabled && state !== "busy",
    onStart: () => {
      ready.current = false;
      setState("pull");
    },
    onMove: (d) => {
      const y = rubber(d, 260, 0.9);
      paint(y, false);
      const r = y >= GESTURE.pull;
      if (r !== ready.current) {
        ready.current = r;
        setState(r ? "ready" : "pull");
        if (r) haptic.light();
      }
    },
    onEnd: ({ cancelled }) => {
      if (cancelled || !ready.current) {
        paint(0, true);
        setState("idle");
        return;
      }
      setState("busy");
      paint(HOLD, true);
      void Promise.resolve()
        .then(onRefresh)
        .catch(() => {})
        .finally(() => {
          paint(0, true);
          setState("idle");
        });
    },
  });

  return (
    <div ref={scroller} className={cn("scroll-y relative h-full", className)}>
      <div
        ref={badge}
        role="status"
        aria-label={state === "busy" ? tr.ortak.yenileniyor : state === "ready" ? tr.ortak.yenilemekIcinBirak : undefined}
        className="pointer-events-none absolute top-0 left-1/2 z-1 flex h-10 w-10 items-center justify-center rounded-pill border border-line bg-surface text-text-2 opacity-0 shadow-(--f-shadow-float)"
        style={{ transform: "translate3d(-50%,-44px,0)" }}
      >
        {state === "busy" ? (
          <Spinner size={18} />
        ) : (
          <ArrowDown size={18} aria-hidden="true" className={cn("transition-transform duration-(--f-dur-fast)", state === "ready" && "rotate-180")} />
        )}
      </div>
      <div ref={content} className={contentClassName}>
        {children}
      </div>
    </div>
  );
}
