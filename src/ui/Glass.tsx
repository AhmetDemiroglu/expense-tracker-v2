/* Cam yüzey. Onaylı web reçetesi (GGHub glass-capsule): şeffaf ton + ince bulanıklık + yalnız kenarda kırılma + parlama katmanı.
   Kırılma SVG feDisplacementMap ile yapılır ve yalnız Chromium'da (Android WebView) çalışır; iOS WKWebView'da ve kırılma
   kapalıyken buzlu cam + parlama kalır. Süzgeç katmanları içeriğin KARDEŞİDİR: camın atasına opacity / filter verilmez. */
import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import { isLensEnabled, subscribeLens } from "./glassMode";

const EDGE_BAND = 14;
const EDGE_POWER = 3.2;
const LENS_SCALE = 48;

const mapCache = new Map<string, string | null>();

/** Yuvarlak köşeli dikdörtgenin SDF'inden yer değiştirme haritası. Merkez ve dış bölge nötr (128). */
function buildDisplacementMap(width: number, height: number, radius: number): string | null {
  const key = `${width}x${height}x${Math.round(radius)}`;
  const hit = mapCache.get(key);
  if (hit !== undefined) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    mapCache.set(key, null);
    return null;
  }
  const image = ctx.createImageData(width, height);
  const data = image.data;
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const cx = width / 2;
  const cy = height / 2;
  const hx = width / 2 - r;
  const hy = height / 2 - r;
  for (let y = 0; y < height; y++) {
    const py = y + 0.5 - cy;
    const qy = Math.abs(py) - hy;
    for (let x = 0; x < width; x++) {
      const px = x + 0.5 - cx;
      const qx = Math.abs(px) - hx;
      const i = (y * width + x) * 4;
      const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
      let nx = 0;
      let ny = 0;
      if (d < 0 && -d < EDGE_BAND) {
        if (qx > 0 && qy > 0) {
          const len = Math.hypot(qx, qy) || 1;
          nx = qx / len;
          ny = qy / len;
        } else if (qx > qy) {
          nx = 1;
        } else {
          ny = 1;
        }
        nx *= Math.sign(px) || 1;
        ny *= Math.sign(py) || 1;
        const strength = Math.pow(1 - -d / EDGE_BAND, EDGE_POWER);
        nx *= strength;
        ny *= strength;
      }
      data[i] = Math.round(128 + nx * 127);
      data[i + 1] = Math.round(128 + ny * 127);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const url = canvas.toDataURL("image/png");
  if (mapCache.size > 40) mapCache.clear();
  mapCache.set(key, url);
  return url;
}

function supportsLens(id: string): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false;
  return CSS.supports("backdrop-filter", `url(#${id})`);
}

export interface GlassProps extends HTMLAttributes<HTMLElement> {
  /** clear: sabit zemin üstündeki kart. dense: altından içerik geçen, üstünde yazı duran yüzey. */
  tone?: "clear" | "dense";
  /** Kenar kırılması (yalnız Chromium). Büyük ve az sayıda yüzeyde açılır. */
  lens?: boolean;
  radius?: "card" | "control" | "pill";
  as?: ElementType;
  /** as="button" için. */
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  children?: ReactNode;
}

export function Glass({ tone = "clear", lens = false, radius = "card", as, className, children, ...rest }: GlassProps) {
  const Tag: ElementType = as ?? "div";
  const id = `fg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const ref = useRef<HTMLElement>(null);
  const allowed = useSyncExternalStore(subscribeLens, isLensEnabled, () => false);
  const [map, setMap] = useState<{ url: string; w: number; h: number } | null>(null);
  const wantLens = lens && allowed;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !wantLens || !supportsLens(id)) return;
    let frame = 0;
    const generate = () => {
      frame = 0;
      const width = Math.round(el.offsetWidth);
      const height = Math.round(el.offsetHeight);
      if (width < 2 || height < 2) return;
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, height / 2);
      const url = buildDisplacementMap(width, height, r);
      setMap(url ? { url, w: width, h: height } : null);
    };
    /* İlk harita eşzamanlı: boş feImage bütün arka planı kaydırır. */
    generate();
    const observer = new ResizeObserver(() => {
      if (!frame) frame = requestAnimationFrame(generate);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      setMap(null);
    };
  }, [id, wantLens]);

  const lensOn = wantLens && map !== null;

  return (
    <Tag ref={ref} data-tone={tone} data-radius={radius} data-lens={lensOn} className={cn("f-glass", className)} {...rest}>
      <span aria-hidden="true" className="f-glass-stack">
        {lensOn ? (
          <svg width="0" height="0" className="absolute" focusable="false">
            <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              {/* Ölçü px olarak verilir: yüzde verilince Chromium haritayı yanlış kutuya çiziyor (köşede yıldız biçimli iz). */}
              <feImage href={map.url} x="0" y="0" width={map.w} height={map.h} preserveAspectRatio="none" result="lensMap" />
              <feDisplacementMap in="SourceGraphic" in2="lensMap" scale={LENS_SCALE} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </svg>
        ) : null}
        <span className="f-glass-base" />
        <span className="f-glass-refract" style={{ backdropFilter: lensOn ? `url(#${id}) brightness(1.03)` : "none" }} />
        <span className="f-glass-shine" />
      </span>
      {children}
    </Tag>
  );
}
