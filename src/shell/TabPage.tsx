/* Kök sekme düzeni: üst bar ve alt kapsül paylarını kurar. Başlık (dönem adı, eylemler) header ile verilir: yüzen yazı yok.
   scroll yok: içerik tek ekrana sığar (flex kolon). scroll: içerik kayar. onRefresh: aşağı çekip yenileme. */
import type { ReactNode } from "react";
import { cn } from "@/ui/cn";
import { PullToRefresh } from "@/ui/PullToRefresh";

export interface TabPageProps {
  /** Sabit başlık yüzeyi (ScreenHeader): içerikle birlikte kaymaz. Dönem adı, ekran başlığı ve eylemler buraya. */
  header?: ReactNode;
  scroll?: boolean;
  onRefresh?: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
}

const PAD = "px-(--page-x) pt-2 pb-(--content-bottom)";

export function TabPage({ header, scroll = false, onRefresh, children, className }: TabPageProps) {
  return (
    <div className="absolute inset-0 flex flex-col pt-(--content-top)">
      {header ? <div className="shrink-0 px-(--page-x) pt-2">{header}</div> : null}
      {onRefresh ? (
        <PullToRefresh onRefresh={onRefresh} className="min-h-0 flex-1" contentClassName={cn("flex flex-col gap-3", PAD, className)}>
          {children}
        </PullToRefresh>
      ) : scroll ? (
        <div className={cn("scroll-y flex min-h-0 flex-1 flex-col gap-3", PAD, className)}>{children}</div>
      ) : (
        <div className={cn("f-fit flex min-h-0 flex-1 flex-col gap-3", PAD, className)}>{children}</div>
      )}
    </div>
  );
}
