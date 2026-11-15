/* Yerleşim kuralı (Ahmet, 2026-11-15): YÜZEN YAZI YOK. Her başlık, etiket, tutar ve düğme bir yüzeyin içinde durur.
   Bu dosyadaki iki parça kuralı uygulatır: ScreenHeader (ekran ya da dönem başlığı + eylemler) ve Section (başlıklı kart). */
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, SectionLabel } from "./Card";
import { cn } from "./cn";
import { Glass } from "./Glass";

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Verilirse başlık düğmedir ve yanında aşağı ok çıkar (ör. dönem seçici). */
  onTitleClick?: () => void;
  /** Başlığın solu (ör. geri düğmesi). */
  left?: ReactNode;
  /** Sağdaki eylemler (ör. TourInfoButton, IconButton). */
  right?: ReactNode;
  /** Kenar kırılması (yalnız kabuğun üst barı gibi tek ve büyük yüzeyde). */
  lens?: boolean;
  className?: string;
}

/** Başlık yüzeyi: cam kapsül. Ekran başlığı, dönem adı ve eylem simgeleri bunun içinde durur. */
export function ScreenHeader({ title, subtitle, onTitleClick, left, right, lens = false, className }: ScreenHeaderProps) {
  const text = (
    <span className="flex min-w-0 flex-col text-left">
      <span className="flex items-center gap-1 text-base font-semibold text-text">
        {title}
        {onTitleClick ? <ChevronDown size={18} className="shrink-0 text-text-3" aria-hidden="true" /> : null}
      </span>
      {subtitle ? <span className="text-xs text-text-3">{subtitle}</span> : null}
    </span>
  );
  return (
    <Glass tone="dense" lens={lens} radius="pill" className={cn("flex min-h-13 shrink-0 items-center gap-1 py-1", left ? "pl-1" : "pl-5", right ? "pr-1" : "pr-5", className)}>
      {left}
      {onTitleClick ? (
        <button type="button" onClick={onTitleClick} className="pressable flex min-h-11 min-w-0 flex-1 items-center">
          {text}
        </button>
      ) : (
        <h1 className="flex min-h-11 min-w-0 flex-1 items-center">{text}</h1>
      )}
      {right}
    </Glass>
  );
}

export interface SectionProps {
  /** Bölüm başlığı: kartın içinde başlık satırı olur. */
  title?: string;
  /** Başlık satırının sağı (ör. "Tümü" düğmesi). */
  right?: ReactNode;
  /** glass: sabit zemin üstünde. solid: liste ve form. */
  variant?: "glass" | "solid";
  /** İçerik boşluğu. none: liste satırları kenara kadar uzanır. */
  pad?: "none" | "md";
  /** İçerik kendi içinde kayar (tek ekrana sığan sekmede esneyen bölüm). En az bir satır görünür kalır (min 112 px). */
  scroll?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Başlıklı kart. Bölüm başlığı, liste, boş durum ve düğme grupları bunun içinde durur. */
export function Section({ title, right, variant = "solid", pad = "md", scroll = false, children, className, contentClassName, ...rest }: SectionProps & { "data-tour"?: string }) {
  return (
    <Card variant={variant} pad="none" className={cn("flex flex-col", scroll ? "min-h-28 shrink overflow-hidden" : "shrink-0", className)} {...rest}>
      {title || right ? (
        <div className="flex min-h-11 shrink-0 items-center justify-between gap-3 px-4 pt-2">
          {title ? <SectionLabel>{title}</SectionLabel> : <span />}
          {right}
        </div>
      ) : null}
      <div className={cn("flex min-h-0 flex-col", pad === "md" ? "gap-3 px-4 pb-4" : "pb-1", !title && !right && pad === "md" && "pt-4", scroll && "scroll-y flex-1", contentClassName)}>{children}</div>
    </Card>
  );
}
