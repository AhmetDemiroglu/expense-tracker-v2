/* Hareketli grafik parçaları: ilerleme şeridi, halka, hafta çubukları. Elle SVG ve CSS, kütüphane yok. */
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "./cn";

type Tone = "accent" | "copper" | "warn" | "expense";
const TONE_BG: Record<Tone, string> = { accent: "bg-accent", copper: "bg-copper", warn: "bg-warn", expense: "bg-expense" };
const TONE_VAR: Record<Tone, string> = { accent: "var(--f-accent)", copper: "var(--f-copper)", warn: "var(--f-warn)", expense: "var(--f-expense)" };

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

/** İlk kareden sonra true: dolarak gelme animasyonu için. */
function useEntered(): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return entered;
}

export interface ProgressBarProps {
  /** 0..1 */
  value: number;
  tone?: Tone;
  /** Erişilebilir ad. */
  label?: string;
  className?: string;
}

export function ProgressBar({ value, tone = "accent", label, className }: ProgressBarProps) {
  const entered = useEntered();
  const v = clamp01(value);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn("h-2 w-full overflow-hidden rounded-pill bg-surface-2", className)}
    >
      <div
        className={cn("h-full w-full rounded-pill transition-transform duration-(--f-dur-slow) ease-fintel", TONE_BG[tone])}
        style={{ transform: `translateX(${-(1 - (entered ? v : 0)) * 100}%)` }}
      />
    </div>
  );
}

export interface RingProps {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  label?: string;
  className?: string;
  children?: ReactNode;
}

export function Ring({ value, size = 120, stroke = 10, tone = "accent", label, className, children }: RingProps) {
  const entered = useEntered();
  const v = clamp01(value);
  const r = 50 - (stroke * 100) / size / 2;
  const sw = (stroke * 100) / size;
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={label ?? `%${Math.round(v * 100)}`}
        className="col-start-1 row-start-1"
      >
        <g fill="none" strokeWidth={sw} transform="rotate(-90 50 50)">
          <circle cx="50" cy="50" r={r} stroke="var(--f-surface-2)" />
          <circle
            cx="50"
            cy="50"
            r={r}
            stroke={TONE_VAR[tone]}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - (entered ? v : 0)}
            style={{ transition: "stroke-dashoffset 900ms var(--f-ease)" }}
          />
        </g>
      </svg>
      {children ? <div className="col-start-1 row-start-1 flex flex-col items-center text-center">{children}</div> : null}
    </div>
  );
}

export interface WeekBarDay {
  /** Kısa gün adı: "Pzt". */
  label: string;
  /** O günün harcaması (limit ile aynı birim, kuruş). */
  value: number;
  isToday?: boolean;
  /** Gün durumu: üstte küçük işaret. over: limit aşıldı, warning: sınıra yakın. */
  status?: "good" | "warning" | "over" | "none";
  future?: boolean;
  /** Ekran okuyucu metni: "Pazartesi, 380 lira". */
  a11y?: string;
}

export interface WeekBarsProps {
  days: readonly WeekBarDay[];
  /** Günlük limit: kesik çizgi olarak çizilir. */
  limit?: number | null;
  /** Çubuk alanının yüksekliği (px). */
  height?: number;
  /** Dar sürüm: gün adları yok (ana karttaki sağ sütun). */
  compact?: boolean;
  onSelect?: (index: number) => void;
  className?: string;
}

/** Haftanın 7 günü. Bugün bakır, diğer günler soluk vurgu. Çubuklar sırayla dolarak gelir. */
export function WeekBars({ days, limit, height = 72, compact = false, onSelect, className }: WeekBarsProps) {
  const top = Math.max(1, ...days.map((d) => d.value), limit ? limit * 1.15 : 0);
  const limitPct = limit && limit > 0 ? Math.min(100, (limit / top) * 100) : null;
  return (
    <div className={cn("flex flex-col gap-1.5", compact ? "w-auto" : "w-full", className)}>
      <div className={cn("relative flex items-end", compact ? "gap-1.5" : "justify-between gap-2")} style={{ height }}>
        {limitPct !== null ? (
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-dashed border-text-3/50" style={{ bottom: `${limitPct}%` }} />
        ) : null}
        {days.map((d, i) => {
          const pct = d.future ? 4 : Math.max(4, Math.min(100, (d.value / top) * 100));
          const bar = (
            <span className="relative flex h-full w-full items-end justify-center">
              <span className={cn("relative block rounded-pill", compact ? "w-2" : "w-3")} style={{ height: `${pct}%` }}>
                <span
                  className={cn("f-bar-grow absolute inset-0 rounded-pill", d.isToday ? "bg-copper" : d.future ? "bg-surface-2" : "bg-accent/30")}
                  style={{ animationDelay: `${i * 45}ms` }}
                />
                {d.status === "over" || d.status === "warning" ? (
                  <span
                    aria-hidden="true"
                    className={cn("absolute -top-2.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-pill", d.status === "over" ? "bg-expense" : "bg-warn")}
                  />
                ) : null}
              </span>
            </span>
          );
          return onSelect && !compact ? (
            <button key={i} type="button" aria-label={d.a11y ?? d.label} onClick={() => onSelect(i)} className="h-full min-w-0 flex-1">
              {bar}
            </button>
          ) : (
            <span key={i} role="img" aria-label={d.a11y ?? d.label} className={cn("h-full", compact ? "w-2" : "min-w-0 flex-1")}>
              {bar}
            </span>
          );
        })}
      </div>
      {compact ? null : (
        <div className="flex justify-between gap-2" aria-hidden="true">
          {days.map((d, i) => (
            <span key={i} className={cn("min-w-0 flex-1 text-center text-xs", d.isToday ? "font-semibold text-text" : "text-text-3")}>
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
