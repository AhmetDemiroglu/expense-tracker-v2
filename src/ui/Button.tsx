import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Glass } from "./Glass";

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cn("f-spin", className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type ButtonVariant = "primary" | "secondary" | "text" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  full?: boolean;
  icon?: ReactNode;
}

/* Tehlike düğmesi uyarı tonundadır: gider kırmızısı yalnız tutar ve durum içindir (marka kuralı). */
const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent",
  secondary: "bg-surface-2 text-text",
  text: "bg-transparent text-accent",
  danger: "bg-warn text-bg",
};
const SIZE = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-6 text-lg",
};

export function Button({ variant = "primary", size = "md", loading = false, full = false, icon, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "pressable relative inline-flex items-center justify-center gap-2 rounded-control font-semibold select-none disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        full && "w-full",
        className,
      )}
      {...rest}
    >
      <span className={cn("inline-flex items-center justify-center gap-2", loading && "invisible")}>
        {icon}
        {children}
      </span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      ) : null}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Erişilebilir ad (zorunlu). */
  label: string;
  variant?: "plain" | "tinted" | "glass";
  size?: "md" | "lg";
}

export function IconButton({ label, variant = "plain", size = "md", className, children, type = "button", ...rest }: IconButtonProps) {
  const box = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  if (variant === "glass") {
    return (
      <Glass as="button" tone="dense" radius="pill" type={type} aria-label={label} className={cn("pressable inline-flex shrink-0 items-center justify-center text-text", box, className)} {...rest}>
        {children}
      </Glass>
    );
  }
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "pressable inline-flex shrink-0 items-center justify-center rounded-pill text-text disabled:opacity-50",
        box,
        variant === "tinted" && "bg-surface-2",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
}

export function Chip({ selected = false, icon, className, children, type = "button", ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "pressable inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill border px-4 text-sm font-medium whitespace-nowrap",
        selected ? "border-transparent bg-accent text-on-accent" : "border-line bg-surface text-text-2",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
