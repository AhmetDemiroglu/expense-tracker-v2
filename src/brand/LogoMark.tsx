/* Fintel simgesi (Lira F), satır içi SVG. Kaynak çizim: brand/logo/svg/mark-*.svg (geometri birebir).
   Kural: gövde ve üst kol tek renk, alt kol ikinci renk ve gövdenin önünden geçer. */
import { useId } from "react";

const PALETTE = {
  light: { a: "#27396D", b: "#0F1834", arm: "#D08B3E" },
  dark: { a: "#F0C28C", b: "#D99A52", arm: "#FFFFFF" },
  onBrand: { a: "#F8E2BE", b: "#D9A566", arm: "#FFFFFF" },
} as const;

export interface LogoMarkProps {
  size?: number;
  tone: keyof typeof PALETTE;
  /** Parçalar sırayla çizilir: gövde, üst kol, alt kol (açılış). */
  animate?: boolean;
  className?: string;
  title?: string;
}

export function LogoMark({ size = 32, tone, animate = false, className, title }: LogoMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const c = PALETTE[tone];
  const grad = `fl${uid}g`;
  const mask = `fl${uid}m`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={[animate ? "f-logo-anim" : "", className ?? ""].join(" ").trim() || undefined}
    >
      <defs>
        <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="26" y1="10" x2="78" y2="90">
          <stop offset="0" stopColor={c.a} />
          <stop offset="1" stopColor={c.b} />
        </linearGradient>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          <g transform="rotate(-19.112 24 60)">
            <rect className="f-logo-part f-logo-arm2" x="15.1" y="51.1" width="63.308" height="17.8" rx="8.9" fill="#000" />
          </g>
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        <g transform="rotate(90 41 16)">
          <rect className="f-logo-part f-logo-stem" x="34.5" y="9.5" width="81" height="13" rx="6.5" fill={`url(#${grad})`} />
        </g>
        <g transform="rotate(-19.093 24 38)">
          <rect className="f-logo-part f-logo-arm1" x="17.5" y="31.5" width="68.027" height="13" rx="6.5" fill={`url(#${grad})`} />
        </g>
      </g>
      <g transform="rotate(-19.112 24 60)">
        <rect className="f-logo-part f-logo-arm2" x="17.5" y="53.5" width="58.508" height="13" rx="6.5" fill={c.arm} />
      </g>
    </svg>
  );
}
