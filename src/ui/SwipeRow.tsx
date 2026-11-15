/* Kaydırmalı satır. Sola: Sil görünür, sonuna kadar kaydırınca doğrudan çalışır. Sağa: Düzenle.
   Dokunuş eşi: satıra uzun basınca iki düğme de açılır. Onay ve geri alma çağıran ekranın işidir. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { tr } from "@/metin";
import { swallowNextClick } from "./clickGuard";
import { cn } from "./cn";
import { rowRest, rubber } from "./gesture";
import { haptic } from "./haptics";
import { useDrag } from "./useDrag";

export interface SwipeRowProps {
  onDelete?: () => void;
  onEdit?: () => void;
  deleteLabel?: string;
  editLabel?: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

const BTN = 76;
const LONG_PRESS = 480;

type Rest = "closed" | "delete" | "edit" | "both";

/* Aynı anda tek satır açık kalır. */
let closeOpenRow: (() => void) | null = null;

export function SwipeRow({ onDelete, onEdit, deleteLabel, editLabel, disabled = false, children, className }: SwipeRowProps) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const [rest, setRest] = useState<Rest>("closed");
  const startX = useRef(0);
  const crossed = useRef(false);

  const restX = useCallback(
    (r: Rest): number => (r === "delete" ? -BTN : r === "edit" ? BTN : r === "both" ? -(BTN * ((onDelete ? 1 : 0) + (onEdit ? 1 : 0))) : 0),
    [onDelete, onEdit],
  );

  const paint = useCallback((x: number, animate: boolean) => {
    const c = content.current;
    if (!c) return;
    const t = animate ? "transform var(--f-dur) var(--f-ease)" : "none";
    const w = animate ? "width var(--f-dur) var(--f-ease)" : "none";
    c.style.transition = t;
    c.style.transform = `translate3d(${x}px,0,0)`;
    if (left.current) {
      left.current.style.transition = w;
      left.current.style.width = `${Math.max(0, x)}px`;
    }
    if (right.current) {
      right.current.style.transition = w;
      right.current.style.width = `${Math.max(0, -x)}px`;
    }
  }, []);

  /* Kimliği sabit kapatıcı: "aynı anda tek satır açık" kaydı bununla tutulur. */
  const closeSelf = useCallback(() => {
    setRest("closed");
    paint(0, true);
  }, [paint]);

  const settle = useCallback(
    (r: Rest) => {
      setRest(r);
      paint(restX(r), true);
      if (r === "closed") {
        if (closeOpenRow === closeSelf) closeOpenRow = null;
      } else {
        if (closeOpenRow && closeOpenRow !== closeSelf) closeOpenRow();
        closeOpenRow = closeSelf;
      }
    },
    [paint, restX, closeSelf],
  );
  useEffect(
    () => () => {
      if (closeOpenRow === closeSelf) closeOpenRow = null;
    },
    [closeSelf],
  );

  /* Açıkken satır dışına dokunmak kapatır. */
  useEffect(() => {
    if (rest === "closed") return;
    const down = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) settle("closed");
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [rest, settle]);

  const fire = (kind: "delete" | "edit") => {
    settle("closed");
    if (kind === "delete") {
      haptic.warning();
      onDelete?.();
    } else {
      haptic.light();
      onEdit?.();
    }
  };

  const width = () => root.current?.offsetWidth ?? 320;

  useDrag(root, {
    axis: "x",
    enabled: !disabled && (!!onDelete || !!onEdit),
    yieldEdge: true,
    canStart: ({ dx }) => (dx < 0 ? !!onDelete || rest !== "closed" : !!onEdit || rest !== "closed"),
    onStart: () => {
      cancelLong();
      startX.current = restX(rest);
      crossed.current = false;
    },
    onMove: (d) => {
      let x = startX.current + d;
      if ((x < 0 && !onDelete) || (x > 0 && !onEdit)) x = rubber(x, width(), 0.25);
      paint(x, false);
      const full = Math.abs(x) > width() * 0.6;
      if (full !== crossed.current) {
        crossed.current = full;
        haptic.light();
      }
    },
    onEnd: ({ distance, velocity, cancelled }) => {
      if (cancelled) {
        settle(rest);
        return;
      }
      const x = startX.current + distance;
      const r = rowRest(x, velocity, width(), { del: !!onDelete, edit: !!onEdit });
      if (r === "delete-full") fire("delete");
      else if (r === "edit-full") fire("edit");
      else settle(r);
    },
  });

  /* Uzun basış: iki düğmeyi de açar (kaydırmanın dokunuş eşi). */
  const long = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelLong = () => {
    if (long.current) clearTimeout(long.current);
    long.current = null;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || rest !== "closed" || (!onDelete && !onEdit)) return;
    const sx = e.clientX;
    const sy = e.clientY;
    cancelLong();
    long.current = setTimeout(() => {
      long.current = null;
      haptic.medium();
      settle("both");
      /* Parmak kalkınca gelecek click yutulur; yeni bir dokunuş bastırmayı siler. */
      swallowNextClick(10000);
    }, LONG_PRESS);
    const move = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) done();
    };
    const done = () => {
      cancelLong();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", done);
      window.removeEventListener("pointercancel", done);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", done);
    window.addEventListener("pointercancel", done);
  };

  const open = rest !== "closed";
  const showEditRight = rest === "both" && !!onEdit;
  const actionBtn = "flex h-full shrink-0 flex-col items-center justify-center gap-1 text-xs font-semibold";

  return (
    <div
      ref={root}
      data-swipe-lock=""
      className={cn("relative overflow-hidden", className)}
      style={{ touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {onEdit ? (
        <div ref={left} className="absolute inset-y-0 left-0 flex w-0 justify-start overflow-hidden bg-accent text-on-accent" aria-hidden={rest !== "edit"}>
          <button type="button" tabIndex={rest === "edit" ? 0 : -1} onClick={() => fire("edit")} className={actionBtn} style={{ width: BTN }}>
            <Pencil size={18} aria-hidden="true" />
            {editLabel ?? tr.ortak.duzenle}
          </button>
        </div>
      ) : null}
      <div ref={right} className="absolute inset-y-0 right-0 flex w-0 justify-end overflow-hidden" aria-hidden={rest !== "delete" && rest !== "both"}>
        {showEditRight ? (
          <button type="button" onClick={() => fire("edit")} className={cn(actionBtn, "bg-accent text-on-accent")} style={{ width: BTN }}>
            <Pencil size={18} aria-hidden="true" />
            {editLabel ?? tr.ortak.duzenle}
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            tabIndex={rest === "delete" || rest === "both" ? 0 : -1}
            onClick={() => fire("delete")}
            className={cn(actionBtn, "bg-warn text-bg", showEditRight ? "" : "flex-1")}
            style={{ minWidth: BTN }}
          >
            <Trash2 size={18} aria-hidden="true" />
            {deleteLabel ?? tr.ortak.sil}
          </button>
        ) : null}
      </div>
      <div
        ref={content}
        className="relative will-change-transform"
        onClickCapture={(e) => {
          if (!open) return;
          e.stopPropagation();
          e.preventDefault();
          settle("closed");
        }}
      >
        {children}
      </div>
    </div>
  );
}
