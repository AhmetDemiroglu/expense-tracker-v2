/* Kabuk dışı tam ekran düzen: karşılama, giriş, ilk kurulum, bekleme. Güvenli alan ve klavye payı hesaba katılır. */
import type { ReactNode } from "react";
import { cn } from "@/ui";

/** scroll true: içerik kayar. "fit": tek ekrana dengeli yayılır, sığmazsa kayar. false: kaymaz. */
export function TamEkran({ children, className, scroll = true }: { children: ReactNode; className?: string; scroll?: boolean | "fit" }) {
  return (
    <div
      className="fixed inset-0 flex flex-col bg-bg"
      style={{ zIndex: "var(--z-stack)", backgroundImage: "radial-gradient(120% 60% at 0% 0%, var(--f-glow-1), transparent 70%), radial-gradient(90% 50% at 100% 30%, var(--f-glow-2), transparent 70%)" }}
    >
      <div
        className={cn(
          "mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-3 px-(--page-x) pt-[calc(var(--safe-top)+12px)] pb-[max(calc(var(--safe-bottom)+16px),calc(var(--kb-h)+var(--kb-gap)))]",
          scroll === "fit" ? "f-fit" : scroll && "scroll-y",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
