/* Nova'nın hazır kullanım biçimleri: küçük avatar (sohbet, rapor kartı) ve sahne (boş durum, karşılama; kartın içinde). */
import type { ReactNode } from "react";
import { Card } from "../Card";
import { cn } from "../cn";
import { Nova } from "./Nova";
import type { NovaMood } from "./moods";

/** Yuvarlak zeminli küçük Nova. Sohbet balonu yanı ve rapor kartı başlığı için. */
export function NovaAvatar({ mood = "selam", size = 36, className }: { mood?: NovaMood; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-pill bg-surface-2", className)} style={{ width: size + 8, height: size + 8 }}>
      <Nova mood={mood} size={size} label="Nova" />
    </span>
  );
}

export interface NovaSahneProps {
  mood?: NovaMood;
  title: string;
  text?: string;
  action?: ReactNode;
  /** Nova'nın boyu (px). */
  size?: number;
  /** Yüzey: glass (sabit zemin üstünde), solid (liste ya da alt sayfa içinde), none (zaten bir kartın içindeyse). */
  surface?: "glass" | "solid" | "none";
  className?: string;
}

/** Büyük Nova + metin, bir kartın içinde. Boş durum ve karşılama için. */
export function NovaSahne({ mood = "selam", title, text, action, size = 128, surface = "glass", className }: NovaSahneProps) {
  const body = (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-4 py-6 text-center", surface === "none" && className)}>
      <Nova mood={mood} size={size} />
      <p className="mt-1 text-lg font-semibold text-text">{title}</p>
      {text ? <p className="max-w-xs text-sm text-text-2">{text}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
  if (surface === "none") return body;
  return (
    <Card variant={surface} pad="none" className={cn("shrink-0", className)}>
      {body}
    </Card>
  );
}
