/* Üstüne binen ekranın düzeni: başlık yüzeyi (cam kapsül: geri düğmesi + başlık + eylemler) + güvenli alan. Sol kenardan geri jestini yığın yönetir. */
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { tr } from "@/metin";
import { goBack } from "@/ui/back";
import { IconButton } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { PullToRefresh } from "@/ui/PullToRefresh";
import { ScreenHeader } from "@/ui/Section";

export interface ScreenProps {
  title: string;
  /** Başlığın sağındaki düğme (ör. TourInfoButton). */
  right?: ReactNode;
  /** İçerik kayar (varsayılan). false: tek ekrana sığan düzen. */
  scroll?: boolean;
  onRefresh?: () => Promise<void> | void;
  /** Alta sabit alan (ör. Kaydet düğmesi). Klavye açılınca yukarı çıkar. */
  footer?: ReactNode;
  /** Geri düğmesi davranışı (varsayılan goBack). */
  onBack?: () => void;
  children: ReactNode;
  className?: string;
}

export function Screen({ title, right, scroll = true, onRefresh, footer, onBack, children, className }: ScreenProps) {
  const pad = cn("flex flex-col gap-3 px-(--page-x) pt-2", footer ? "pb-4" : "pb-[max(calc(var(--safe-bottom)+16px),calc(var(--kb-h)+var(--kb-gap)))]", className);
  return (
    <div className="absolute inset-0 flex flex-col">
      <header className="shrink-0 px-(--page-x) pt-[calc(var(--safe-top)+6px)] pb-1.5">
        <ScreenHeader
          title={title}
          left={
            <IconButton label={tr.ortak.geri} onClick={onBack ?? (() => void goBack())}>
              <ChevronLeft size={26} aria-hidden="true" />
            </IconButton>
          }
          right={right}
        />
      </header>
      {onRefresh ? (
        <PullToRefresh onRefresh={onRefresh} className="min-h-0 flex-1" contentClassName={pad}>
          {children}
        </PullToRefresh>
      ) : (
        <div className={cn("min-h-0 flex-1", scroll ? "scroll-y" : "f-fit", pad)}>{children}</div>
      )}
      {footer ? <div className="shrink-0 px-(--page-x) pt-3 pb-[max(calc(var(--safe-bottom)+16px),calc(var(--kb-h)+var(--kb-gap)))]">{footer}</div> : null}
    </div>
  );
}
