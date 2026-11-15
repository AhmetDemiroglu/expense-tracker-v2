import { useId, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { tr } from "@/metin";
import type { Kurus } from "@/core";
import { formatAmountInput, parseAmount } from "@/core";
import { cn } from "./cn";

interface Shell {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

function FieldShell({ id, label, hint, error, className, children }: Shell & { id: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-text-2">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-sm font-medium text-warn">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-sm text-text-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const BOX = "flex min-h-12 items-center gap-2 rounded-control border bg-surface px-4 transition-colors focus-within:border-accent";
/* 16 px altı yazı iOS'ta odaklanınca sayfayı yakınlaştırır: giriş alanı her zaman text-base. */
const INPUT = "min-w-0 flex-1 bg-transparent py-3 text-base text-text outline-none placeholder:text-text-3";

export interface FieldProps extends Shell {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password" | "search";
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  right?: ReactNode;
  left?: ReactNode;
  autoFocus?: boolean;
  disabled?: boolean;
  onSubmit?: () => void;
}

export function Field({ value, onChange, type = "text", multiline = false, maxLength, placeholder, right, left, autoFocus, disabled, onSubmit, ...shell }: FieldProps) {
  const id = useId();
  const described = shell.error || shell.hint ? `${id}-msg` : undefined;
  /* Parola alanı: göster / gizle düğmesi alanın içinde. */
  const [acik, setAcik] = useState(false);
  const parola = type === "password";
  return (
    <FieldShell id={id} {...shell}>
      <div className={cn(BOX, shell.error ? "border-warn" : "border-line", disabled && "opacity-50")}>
        {left}
        {multiline ? (
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLength}
            placeholder={placeholder}
            rows={3}
            disabled={disabled}
            aria-invalid={!!shell.error}
            aria-describedby={described}
            className={cn(INPUT, "resize-none")}
          />
        ) : (
          <input
            id={id}
            type={parola && acik ? "text" : type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit?.();
            }}
            maxLength={maxLength}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={disabled}
            enterKeyHint={type === "search" ? "search" : "done"}
            autoCapitalize={type === "text" ? "sentences" : "none"}
            autoCorrect="off"
            aria-invalid={!!shell.error}
            aria-describedby={described}
            className={INPUT}
          />
        )}
        {parola ? (
          <button
            type="button"
            aria-label={acik ? tr.ortak.parolaGizle : tr.ortak.parolaGoster}
            aria-pressed={acik}
            onClick={() => setAcik((v) => !v)}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-text-3"
          >
            {acik ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        ) : null}
        {right}
      </div>
    </FieldShell>
  );
}

export interface AmountFieldProps extends Shell {
  value: Kurus | null;
  onChange: (value: Kurus | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/** Klavyeyle tutar girişi. Türkçe yazım: "1.234,56", "1234,5", "640". Geçersizken onChange(null). */
export function AmountField({ value, onChange, placeholder = "0", autoFocus, ...shell }: AmountFieldProps) {
  const id = useId();
  const [text, setText] = useState(() => (value == null ? "" : formatAmountInput(value)));
  const [seen, setSeen] = useState(value);
  /* Dış değer değiştiyse (ör. fişten okundu) metni eşitle: kullanıcının yazdığı metinle aynı tutarsa dokunma. */
  if (value !== seen) {
    setSeen(value);
    const parsed = parseAmount(text);
    const current = parsed.ok ? parsed.kurus : null;
    if (current !== value) setText(value == null ? "" : formatAmountInput(value));
  }
  return (
    <FieldShell id={id} {...shell}>
      <div className={cn(BOX, shell.error ? "border-warn" : "border-line")}>
        <span className="num text-base text-text-3" aria-hidden="true">
          ₺
        </span>
        <input
          id={id}
          inputMode="decimal"
          value={text}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-invalid={!!shell.error}
          aria-describedby={shell.error || shell.hint ? `${id}-msg` : undefined}
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9.,\s]/g, "");
            setText(next);
            const parsed = parseAmount(next);
            const k = parsed.ok ? parsed.kurus : null;
            setSeen(k);
            onChange(k);
          }}
          className={cn(INPUT, "num")}
        />
      </div>
    </FieldShell>
  );
}
