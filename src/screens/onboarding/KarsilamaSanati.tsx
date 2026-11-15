/* Karşılamanın üç hareketli SVG sahnesi. Renkler tema değişkenlerinden, hareket yalnız transform ve opacity. */
import { Nova } from "@/ui";
import "./karsilama.css";

const BOY = 2 * Math.PI * 70;

/* 1: ev ve düşen kuruşlar */
function Ev() {
  return (
    <svg viewBox="0 0 280 240" className="h-full w-full" aria-hidden="true">
      <g className="kr-yuz">
        <path d="M60 120 140 52l80 68v82a12 12 0 0 1-12 12H72a12 12 0 0 1-12-12z" fill="var(--f-surface)" stroke="var(--f-line)" strokeWidth="2" />
        <path d="M48 124 140 44l92 80" fill="none" stroke="var(--f-accent)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="118" y="146" width="44" height="68" rx="10" fill="var(--f-accent)" />
        <circle cx="152" cy="182" r="3.5" fill="var(--f-on-accent)" />
        <rect x="76" y="136" width="28" height="26" rx="6" fill="var(--f-surface-2)" />
        <rect x="176" y="136" width="28" height="26" rx="6" fill="var(--f-surface-2)" />
      </g>
      {[70, 140, 210].map((x, i) => (
        <g key={x} className="kr-dus" style={{ animationDelay: `${i * 0.85}s` }}>
          <circle cx={x} cy="40" r="13" fill="var(--f-copper)" />
          <text x={x} y="45" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--f-on-copper)">
            ₺
          </text>
        </g>
      ))}
    </svg>
  );
}

/* 2: halka ve hafta çubukları */
function Limit() {
  const yuksek = [34, 52, 28, 60, 44, 70, 38];
  return (
    <svg viewBox="0 0 280 240" className="h-full w-full" aria-hidden="true">
      <g transform="translate(140 96)">
        <circle r="70" fill="none" stroke="var(--f-line)" strokeWidth="14" />
        <circle
          r="70"
          fill="none"
          stroke="var(--f-accent)"
          strokeWidth="14"
          strokeLinecap="round"
          transform="rotate(-90)"
          className="kr-ciz"
          style={{ ["--kr-boy" as string]: BOY, ["--kr-hedef" as string]: BOY * 0.28 }}
        />
        <text y="8" textAnchor="middle" fontSize="26" fontWeight="600" fill="var(--f-text)" fontFamily="DM Mono, monospace">
          ₺1.240
        </text>
      </g>
      <g transform="translate(34 190)">
        {yuksek.map((h, i) => (
          <rect key={i} x={i * 34} y={-h} width="20" height={h} rx="6" fill={i === 5 ? "var(--f-copper)" : "var(--f-accent)"} opacity={i === 5 ? 1 : 0.55} className="kr-cubuk" style={{ animationDelay: `${0.3 + i * 0.1}s` }} />
        ))}
      </g>
    </svg>
  );
}

/* 3: Nova ve fiş */
function NovaSanat() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <Nova mood="selam" size={150} />
      <svg viewBox="0 0 80 100" className="kr-fis absolute right-[14%] bottom-[8%] h-24 w-20" aria-hidden="true">
        <path d="M8 6h64v86l-8-6-8 6-8-6-8 6-8-6-8 6-8-6z" fill="var(--f-surface)" stroke="var(--f-line)" strokeWidth="2" />
        <rect x="18" y="22" width="44" height="5" rx="2.5" fill="var(--f-text-3)" />
        <rect x="18" y="36" width="30" height="5" rx="2.5" fill="var(--f-line)" />
        <rect x="18" y="50" width="38" height="5" rx="2.5" fill="var(--f-line)" />
        <rect x="18" y="66" width="24" height="8" rx="4" fill="var(--f-copper)" />
      </svg>
    </div>
  );
}

export function KarsilamaSanati({ sayfa }: { sayfa: number }) {
  return sayfa === 0 ? <Ev /> : sayfa === 1 ? <Limit /> : <NovaSanat />;
}
