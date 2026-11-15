import type { ReactNode } from "react";
import { cn } from "./cn";

type Art = "kayit" | "takvim" | "nova" | "arama" | "genel";

const S = { fill: "none", stroke: "var(--f-text-3)", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function ArtSvg({ art }: { art: Art }) {
  return (
    <svg width="132" height="104" viewBox="0 0 132 104" aria-hidden="true">
      <ellipse cx="66" cy="94" rx="40" ry="5" fill="var(--f-surface-2)" />
      {art === "kayit" ? (
        <g className="f-float">
          <path {...S} fill="var(--f-surface)" d="M42 14h48v66l-8-5-8 5-8-5-8 5-8-5-8 5z" />
          <path {...S} pathLength={1} className="f-draw" d="M52 30h28M52 42h28M52 54h16" />
          <g className="f-pulse">
            <circle cx="92" cy="22" r="12" fill="var(--f-copper)" />
            <path d="M92 16v12M86 22h12" stroke="var(--f-on-copper)" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </g>
      ) : null}
      {art === "takvim" ? (
        <g className="f-float">
          <rect {...S} fill="var(--f-surface)" x="34" y="18" width="64" height="60" rx="10" />
          <path {...S} d="M34 34h64M50 12v12M82 12v12" />
          {[0, 1, 2, 3].map((c) =>
            [0, 1, 2].map((r) =>
              c === 2 && r === 1 ? null : <circle key={`${c}-${r}`} cx={46 + c * 13.5} cy={44 + r * 11} r="2.4" fill="var(--f-text-3)" opacity="0.5" />,
            ),
          )}
          <circle className="f-pulse" cx="73" cy="55" r="5" fill="var(--f-copper)" />
        </g>
      ) : null}
      {art === "nova" ? (
        <g>
          <ellipse {...S} strokeDasharray="3 6" cx="66" cy="48" rx="38" ry="14" opacity="0.6" />
          <path className="f-float" fill="var(--f-copper)" d="M66 18c2 14 8 20 22 22-14 2-20 8-22 22-2-14-8-20-22-22 14-2 20-8 22-22z" />
          <circle className="f-float-slow" cx="100" cy="30" r="4" fill="var(--f-accent)" />
          <circle className="f-float-slow" cx="32" cy="64" r="3" fill="var(--f-text-3)" />
        </g>
      ) : null}
      {art === "arama" ? (
        <g className="f-float">
          <circle {...S} fill="var(--f-surface)" cx="60" cy="44" r="24" />
          <path {...S} strokeWidth={5} d="M78 62l16 16" />
          <path {...S} pathLength={1} className="f-draw" stroke="var(--f-copper)" d="M50 44h20M50 36h12" />
        </g>
      ) : null}
      {art === "genel" ? (
        <g>
          <rect {...S} className="f-float" fill="var(--f-surface)" x="36" y="26" width="60" height="44" rx="10" />
          <path {...S} pathLength={1} className="f-draw" d="M48 42h36M48 54h22" />
          <circle className="f-float-slow" cx="100" cy="22" r="5" fill="var(--f-copper)" />
          <circle className="f-float-slow" cx="30" cy="72" r="3.5" fill="var(--f-accent)" />
        </g>
      ) : null}
    </svg>
  );
}

export interface EmptyStateProps {
  art?: Art;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ art = "genel", title, text, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-8 text-center", className)}>
      <ArtSvg art={art} />
      <p className="text-lg font-semibold text-text">{title}</p>
      {text ? <p className="max-w-xs text-sm text-text-2">{text}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
