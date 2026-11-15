/* Boş durum: Nova + metin, bir kartın içinde (yüzen yazı yok). Duruma göre ruh hali seçilir. */
import type { ReactNode } from "react";
import { NovaSahne } from "./nova/parts";
import type { NovaMood } from "./nova/moods";

export interface EmptyStateProps {
  /** Nova'nın ruh hali. Varsayılan selam (el sallar). Sonuç yok: dusunuyor. Hata: uzgun. Hazırlanıyor: uyku. */
  mood?: NovaMood;
  title: string;
  text?: string;
  action?: ReactNode;
  /** Nova'nın boyu (px). */
  size?: number;
  /** none: zaten bir kartın (Section) içindeyse. */
  surface?: "glass" | "solid" | "none";
  className?: string;
}

export function EmptyState({ mood = "selam", size = 112, surface = "glass", ...rest }: EmptyStateProps) {
  return <NovaSahne mood={mood} size={size} surface={surface} {...rest} />;
}
