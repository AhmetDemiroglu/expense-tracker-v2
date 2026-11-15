/* Nova: Fintel'in yardımcı karakteri. Vizör ekranlı küçük robot, tamamen kodla çizilmiş hareketli SVG.
   Gözleri, kaşları, ağzı ve iki kolu var; ruh hali değişince yüz yumuşak geçişle değişir. Sürekli canlılık: göz kırpma,
   nefes, ara sıra kayan bakış. Sistemde "hareketi azalt" açıksa durur.
   Marka kuralı: yıldız, ışıltı, parıltı ve "yapay zeka" kalıp simgesi YOK. Renkler tokenlardan (ui.css --f-nova-*). */
import { useEffect, useId, useState, type CSSProperties } from "react";
import { useReducedMotion } from "../motion";
import { FACES, canBlink, isCompact, type NovaMood } from "./moods";

export interface NovaProps {
  mood?: NovaMood;
  /** Piksel. 28 (sohbet balonu yanı) ile 160 (boş durum, karşılama) arası. 48 altında sade çizilir. */
  size?: number;
  /** Erişilebilir ad. Verilmezse süs sayılır. */
  label?: string;
  className?: string;
}

const T = "transform var(--f-dur) var(--f-ease), opacity var(--f-dur) var(--f-ease)";
const FACE = "var(--f-nova-face)";
const st = (transform: string, opacity = 1): CSSProperties => ({ transform, opacity, transition: T });

/** Rastgele aralıkla göz kırpma ve bakış kayması. */
function useLife(active: boolean): { blink: boolean; glance: number } {
  const [blink, setBlink] = useState(false);
  const [glance, setGlance] = useState(0);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const wait = (ms: number, fn: () => void) => {
      timer = setTimeout(() => alive && fn(), ms);
    };
    const loop = () => {
      wait(1800 + Math.random() * 3200, () => {
        if (Math.random() < 0.3) {
          setGlance(Math.random() < 0.5 ? -2.2 : 2.2);
          wait(900, () => {
            setGlance(0);
            loop();
          });
        } else {
          setBlink(true);
          wait(130, () => {
            setBlink(false);
            loop();
          });
        }
      });
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [active]);
  return { blink: active && blink, glance: active ? glance : 0 };
}

export function Nova({ mood = "selam", size = 96, label, className }: NovaProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduce = useReducedMotion();
  const f = FACES[mood];
  const compact = isCompact(size);
  const { blink, glance } = useLife(!reduce);
  const blinking = blink && canBlink(mood);
  const lookX = f.look[0] + (f.eye === "open" ? glance : 0);
  const lookY = f.look[1];
  const es = f.eyeScale * (compact ? 1.2 : 1);
  const clip = `nv${uid}`;

  const eye = (cx: number) => {
    const open = f.eye === "open" || f.eye === "bar";
    const sx = f.eye === "bar" ? 1.5 : es;
    const sy = f.eye === "bar" ? 0.32 : blinking ? 0.12 : es;
    return (
      <g key={cx}>
        <ellipse rx="5" ry="6.4" fill={FACE} style={st(`translate(${cx + lookX}px, ${56 + lookY}px) scale(${sx}, ${sy})`, open ? 1 : 0)} />
        <path
          d="M-6.5 2.5Q0 -6.5 6.5 2.5"
          fill="none"
          stroke={FACE}
          strokeWidth={compact ? 4.4 : 3.4}
          strokeLinecap="round"
          style={st(`translate(${cx}px, ${56 + lookY}px) scale(1, ${f.eye === "down" ? -0.7 : 1})`, open ? 0 : 1)}
        />
      </g>
    );
  };

  const brow = (cx: number, side: 1 | -1) => {
    const b = f.brow;
    const dy = (b ? b[0] : 0) + (side === 1 && f.browRaise ? f.browRaise : 0);
    const rot = (b ? b[1] : 0) * side * -1;
    return <path d="M-5.5 0H5.5" stroke={FACE} strokeWidth="2.8" strokeLinecap="round" style={st(`translate(${cx + lookX * 0.5}px, ${44 + dy}px) rotate(${rot}deg)`, b && !compact ? 1 : 0)} />;
  };

  const armAngle = (side: "l" | "r"): number => {
    if (f.arms === "up") return -124;
    if (side === "r" && f.arms === "wave") return -118;
    return 0;
  };
  const arm = (side: "l" | "r") => {
    const x = side === "r" ? 100 : 20;
    const flip = side === "r" ? 1 : -1;
    const waving = side === "r" && f.arms === "wave" && !reduce;
    return (
      <g style={st(`translate(${x}px, 72px) scale(${flip}, 1) rotate(${armAngle(side)}deg)`)}>
        <g className={waving ? "f-nova-wave" : undefined}>
          <path d="M0 0L12 18" stroke="var(--f-nova-rim)" strokeWidth="8" strokeLinecap="round" />
          <circle cx="12.5" cy="19" r="6.2" fill="var(--f-nova-body)" stroke="var(--f-nova-rim)" strokeWidth="1.8" />
        </g>
      </g>
    );
  };

  const mouthY = compact ? 68.5 : 67.5;
  const curveScale = Math.abs(f.smile) < 0.4 ? (f.smile < 0 ? -0.4 : 0.4) : f.smile;

  return (
    <svg
      width={size}
      height={size}
      viewBox={compact ? "12 16 96 96" : "0 0 120 120"}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={{ overflow: "visible", flex: "none" }}
    >
      <defs>
        <clipPath id={clip}>
          <rect x="27" y="36" width="66" height="40" rx="18" />
        </clipPath>
      </defs>
      <g className={reduce ? undefined : mood === "basari" ? "f-nova-hop" : "f-nova-breathe"}>
        {compact ? null : (
          <>
            {arm("l")}
            {arm("r")}
            <path d="M60 23V14" stroke="var(--f-nova-rim)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="60" cy="11" r="4.4" fill="var(--f-copper)" className={f.extra === "alert" && !reduce ? "f-pulse" : undefined} />
          </>
        )}
        <rect x="16" y="22" width="88" height="82" rx="35" fill="var(--f-nova-body)" stroke="var(--f-nova-rim)" strokeWidth="2" />
        <rect x="27" y="36" width="66" height="40" rx="18" fill="var(--f-nova-visor)" />
        <g clipPath={`url(#${clip})`}>
          {f.extra === "scan" ? <rect x="27" y="36" width="66" height="2.4" fill={FACE} opacity="0.55" className={reduce ? undefined : "f-nova-scan"} /> : null}
          {eye(47)}
          {eye(73)}
          {brow(47, -1)}
          {brow(73, 1)}
          <path
            d="M-9 0Q0 9 9 0"
            fill="none"
            stroke={FACE}
            strokeWidth={compact ? 4.2 : 3.2}
            strokeLinecap="round"
            style={st(`translate(60px, ${mouthY - (f.smile < 0 ? -3 : 0)}px) scale(${f.mouthWidth}, ${curveScale})`, f.mouth === "curve" ? 1 : 0)}
          />
          <path d="M-8 0H8" stroke={FACE} strokeWidth={compact ? 4.2 : 3.2} strokeLinecap="round" style={st(`translate(60px, ${mouthY + 1.5}px) scale(${f.mouthWidth}, 1)`, f.mouth === "flat" ? 1 : 0)} />
          <g style={st(`translate(60px, ${mouthY + 1}px) scale(${f.mouthWidth}, ${f.smile})`, f.mouth === "open" ? 1 : 0)}>
            <ellipse rx="7.5" ry="5" fill={FACE} className={f.extra === "talk" && !reduce ? "f-nova-talk" : undefined} />
          </g>
        </g>
        {compact ? null : (
          <>
            <path d="M40 90H80" stroke="var(--f-nova-rim)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <g style={st("none", f.extra === "dots" ? 1 : 0)}>
              {[
                [98, 24, 2.4],
                [106, 16, 3.2],
                [114, 6, 4.2],
              ].map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill="var(--f-nova-rim)" className={f.extra === "dots" && !reduce ? "f-pulse" : undefined} style={{ animationDelay: `${i * 220}ms` }} />
              ))}
            </g>
            <g style={st("none", f.extra === "zz" ? 1 : 0)} fill="none" stroke="var(--f-text-3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M96 20h7l-7 8h7" className={f.extra === "zz" && !reduce ? "f-float" : undefined} />
              <path d="M106 4h9l-9 10h9" className={f.extra === "zz" && !reduce ? "f-float-slow" : undefined} />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

/** Sekme çubuğu ve küçük düğmeler için Nova simgesi (tek renk, çizgi). lucide ikonlarıyla aynı kullanım. */
export function NovaGlyph({ size = 22, strokeWidth = 2, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2.5v2.5" />
      <rect x="3.5" y="5" width="17" height="15.5" rx="6.5" />
      <rect x="6.6" y="8.6" width="10.8" height="6.6" rx="3.3" />
      <path d="M10 11.6v.6M14 11.6v.6" />
    </svg>
  );
}
