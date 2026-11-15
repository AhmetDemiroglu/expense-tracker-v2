import { cn } from "./cn";
import { haptic } from "./haptics";

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  full?: boolean;
  className?: string;
  /** Erişilebilir grup adı. */
  label?: string;
}

export function Segmented<T extends string>({ value, onChange, options, full = false, className, label }: SegmentedProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const n = Math.max(1, options.length);
  return (
    <div role="radiogroup" aria-label={label} className={cn("relative inline-flex rounded-control bg-surface-2 p-1", full && "flex w-full", className)}>
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 rounded-[calc(var(--f-radius-control)-4px)] bg-surface shadow-sm transition-transform duration-(--f-dur) ease-fintel"
        style={{ width: `calc((100% - 8px) / ${n})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              if (on) return;
              haptic.selection();
              onChange(o.value);
            }}
            className={cn("relative z-1 min-h-11 flex-1 px-4 text-sm font-semibold whitespace-nowrap transition-colors", on ? "text-text" : "text-text-3")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
