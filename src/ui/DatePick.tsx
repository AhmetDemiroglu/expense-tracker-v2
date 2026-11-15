/* Takvimli gün seçici. Çekirdeğin LocalDate'i ile çalışır (Date nesnesi yok). Ay değişimi oklarla ya da yana kaydırarak. */
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LocalDate } from "@/core";
import { MONTH_NAMES_TR, WEEKDAY_SHORT_TR, dateParts, formatDateTr, monthGrid } from "@/core";
import { tr } from "@/metin";
import { Button, IconButton } from "./Button";
import { cn } from "./cn";
import { haptic } from "./haptics";
import { Sheet } from "./Sheet";
import { useDrag } from "./useDrag";

export interface DatePickProps {
  value: LocalDate;
  onChange: (value: LocalDate) => void;
  today: LocalDate;
  min?: LocalDate;
  max?: LocalDate;
  /** Günün altına nokta: { "2026-11-14": "dot" }. */
  marks?: Readonly<Record<string, "dot">>;
  className?: string;
}

const shift = (year: number, month: number, by: number) => {
  const i = year * 12 + (month - 1) + by;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
};

export function DatePick({ value, onChange, today, min, max, marks, className }: DatePickProps) {
  const init = dateParts(value);
  const [view, setView] = useState({ year: init.year, month: init.month, dir: 0 });
  const grid = useRef<HTMLDivElement>(null);
  const weeks = monthGrid(view.year, view.month);

  const go = (by: number) => {
    haptic.selection();
    setView((v) => ({ ...shift(v.year, v.month, by), dir: by }));
  };

  useDrag(grid, {
    axis: "x",
    yieldEdge: true,
    onMove: () => {},
    onEnd: ({ distance, velocity, cancelled }) => {
      if (cancelled) return;
      if (distance < -48 || velocity < -0.4) go(1);
      else if (distance > 48 || velocity > 0.4) go(-1);
    },
  });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <IconButton label={tr.ortak.tarih.oncekiAy} onClick={() => go(-1)}>
          <ChevronLeft size={22} aria-hidden="true" />
        </IconButton>
        <p aria-live="polite" className="text-base font-semibold text-text">
          {MONTH_NAMES_TR[view.month - 1]} <span className="num">{view.year}</span>
        </p>
        <IconButton label={tr.ortak.tarih.sonrakiAy} onClick={() => go(1)}>
          <ChevronRight size={22} aria-hidden="true" />
        </IconButton>
      </div>
      <div className="grid grid-cols-7" aria-hidden="true">
        {WEEKDAY_SHORT_TR.map((d) => (
          <span key={d} className="py-1 text-center text-xs font-medium text-text-3">
            {d}
          </span>
        ))}
      </div>
      <div ref={grid} data-swipe-lock="" style={{ touchAction: "pan-y" }}>
        <div
          key={`${view.year}-${view.month}`}
          className="grid grid-cols-7 gap-y-1"
          style={{ animation: view.dir ? `f-month-${view.dir > 0 ? "next" : "prev"} var(--f-dur) var(--f-ease) both` : undefined }}
        >
          {weeks.flat().map((cell) => {
            const d = cell.date;
            const off = (min !== undefined && d < min) || (max !== undefined && d > max);
            const selected = d === value;
            const isToday = d === today;
            return (
              <button
                key={d}
                type="button"
                disabled={off}
                aria-label={formatDateTr(d, "long")}
                aria-pressed={selected}
                onClick={() => {
                  haptic.selection();
                  onChange(d);
                }}
                className="flex min-h-11 items-center justify-center disabled:opacity-30"
              >
                <span
                  className={cn(
                    "num relative flex h-10 w-10 items-center justify-center rounded-pill text-base",
                    selected ? "bg-accent font-medium text-on-accent" : cell.inMonth ? "text-text" : "text-text-3 opacity-50",
                    isToday && !selected && "ring-2 ring-copper",
                  )}
                >
                  {dateParts(d).day}
                  {marks?.[d] ? <span className={cn("absolute bottom-1 h-1 w-1 rounded-pill", selected ? "bg-on-accent" : "bg-copper")} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export interface DatePickSheetProps extends Omit<DatePickProps, "className"> {
  open: boolean;
  onClose: () => void;
  title?: string;
}

/** Gün seçici alt sayfada. Güne dokununca seçer ve kapanır. */
export function DatePickSheet({ open, onClose, title, onChange, today, min, max, ...rest }: DatePickSheetProps) {
  const pick = (d: LocalDate) => {
    onChange(d);
    onClose();
  };
  const todayAllowed = (min === undefined || today >= min) && (max === undefined || today <= max);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title ?? tr.ortak.tarih.tarihSec}
      footer={
        todayAllowed ? (
          <Button variant="secondary" full onClick={() => pick(today)}>
            {tr.ortak.bugun}
          </Button>
        ) : undefined
      }
    >
      <DatePick {...rest} today={today} min={min} max={max} onChange={pick} />
    </Sheet>
  );
}
