import { Delete } from "lucide-react";
import { tr } from "@/metin";
import { cn } from "./cn";
import { keypadPress } from "./gesture";
import { haptic } from "./haptics";

export interface KeypadProps {
  /** Metin biçimi "1234,56" (binlik ayraç yok). Kuruş için çekirdeğin parseAmount'u, gösterim için keypadDisplay. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "sil"] as const;

/** Tutar tuş takımı. Sistem klavyesi açılmaz, tek elle kullanılır. */
export function Keypad({ value, onChange, className }: KeypadProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          aria-label={k === "sil" ? tr.ortak.tutar.sil : k === "," ? tr.ortak.tutar.virgul : k}
          onClick={() => {
            haptic.light();
            onChange(keypadPress(value, k));
          }}
          className="pressable num flex min-h-14 items-center justify-center rounded-control bg-surface-2 text-2xl font-medium text-text"
        >
          {k === "sil" ? <Delete size={24} aria-hidden="true" /> : k}
        </button>
      ))}
    </div>
  );
}
