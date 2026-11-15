import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "./cn";
import { Glass } from "./Glass";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** glass: cam (sabit zemin üstünde). solid: düz yüzey (liste içi, alt sayfa içi). flat: çerçevesiz ikinci yüzey. */
  variant?: "glass" | "solid" | "flat";
  pad?: "none" | "sm" | "md";
  /** Camda kenar kırılması (ana kart gibi büyük ve tek yüzeyde). */
  lens?: boolean;
}

const PAD = { none: "", sm: "p-3", md: "p-4" };

export function Card({ variant = "glass", pad = "md", lens = false, className, onClick, children, ...rest }: CardProps) {
  const press = onClick ? "pressable cursor-pointer text-left w-full" : "";
  if (variant === "glass") {
    return (
      <Glass as={onClick ? "button" : "div"} lens={lens} onClick={onClick} className={cn("block", PAD[pad], press, className)} {...rest}>
        {children}
      </Glass>
    );
  }
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick as never}
      className={cn("block rounded-card", variant === "solid" ? "border border-line bg-surface" : "bg-surface-2", PAD[pad], press, className)}
      {...(rest as HTMLAttributes<HTMLElement>)}
    >
      {children}
    </Tag>
  );
}

export interface ListRowProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ListRow({ icon, title, subtitle, right, chevron = false, onClick, className }: ListRowProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn("flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left", onClick && "pressable", className)}
    >
      {icon ? <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-2 text-text-2">{icon}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-medium text-text">{title}</span>
        {subtitle ? <span className="text-sm text-text-3">{subtitle}</span> : null}
      </span>
      {right ? <span className="shrink-0 text-right">{right}</span> : null}
      {chevron ? <ChevronRight size={18} className="shrink-0 text-text-3" aria-hidden="true" /> : null}
    </Tag>
  );
}

/** Bölüm başlığı: küçük, 600, Türkçe büyük harf. */
export function SectionLabel({ children, className }: { children: string; className?: string }) {
  return <h3 className={cn("text-xs font-semibold tracking-[0.06em] text-text-3", className)}>{children.toLocaleUpperCase("tr")}</h3>;
}

export function Skeleton({ w, h = 16, radius, className }: { w?: number | string; h?: number | string; radius?: number | string; className?: string }) {
  const style: CSSProperties = { width: w ?? "100%", height: h, borderRadius: radius ?? "var(--f-radius-control)" };
  return <div aria-hidden="true" className={cn("f-shimmer", className)} style={style} />;
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3">
          <Skeleton w={40} h={40} />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton w="55%" h={14} />
            <Skeleton w="35%" h={12} />
          </div>
          <Skeleton w={72} h={14} />
        </div>
      ))}
    </div>
  );
}
