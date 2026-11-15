import type { Kurus } from "@/core";
import { formatMoney } from "@/core";
import { cn } from "./cn";
import { useCountUp } from "./motion";

export interface AmountProps {
  /** Tamsayı kuruş. income ve expense için pozitif verilir. */
  value: Kurus;
  /** income: "+₺" ve gelir rengi. expense: "-₺" ve gider rengi. neutral: işaret değerden, renk yazı rengi. */
  kind?: "neutral" | "income" | "expense";
  size?: "sm" | "md" | "lg" | "hero";
  /** Kuruş gösterilsin mi. Varsayılan: hero ve lg kuruşsuz, diğerleri kuruşlu. */
  decimals?: boolean;
  /** Değer değişince sayarak geçer. */
  animate?: boolean;
  className?: string;
}

const SIZE = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl tracking-tight",
  hero: "text-4xl tracking-tight",
};

export function Amount({ value, kind = "neutral", size = "md", decimals, animate = false, className }: AmountProps) {
  const shown = useCountUp(value, { enabled: animate });
  const showDecimals = decimals ?? (size === "sm" || size === "md");
  const abs = Math.abs(shown);
  const text =
    kind === "income"
      ? formatMoney(abs, { decimals: showDecimals, sign: "always" })
      : kind === "expense"
        ? formatMoney(-abs, { decimals: showDecimals })
        : formatMoney(shown, { decimals: showDecimals });
  const full = kind === "income" ? formatMoney(Math.abs(value), { sign: "always" }) : kind === "expense" ? formatMoney(-Math.abs(value)) : formatMoney(value);
  return (
    <span
      aria-label={animate ? full : undefined}
      className={cn("num font-medium whitespace-nowrap", SIZE[size], kind === "income" ? "text-income" : kind === "expense" ? "text-expense" : "text-text", className)}
    >
      {text}
    </span>
  );
}
