/* Turun görsel katmanı: karartma, hedefin çevresinde delik ve açıklama balonu.
   KAYMA OLMAMASI İÇİN KURALLAR (hepsi burada uygulanır):
   1. Katman body altında ve position: fixed; ölçüler katmanın kendi kutusuna göredir (hedef kutusu eksi katman kutusu).
      Böylece dönüşümlü (transform) kapsayıcı, alt sayfa, güvenli alan ve görünüm kayması sonucu değiştirmez.
   2. Ölçümden önce: adımın before işi, document.fonts.ready, iki kare, hedef "oturana" kadar bekleme
      (art arda üç karede aynı ölçü: ekran geçişi ve alt sayfa animasyonu bitmiş demektir).
   3. Hedef görünür alanda değilse kendi kaydırma kabının ortasına getirilir (scrollIntoView YOK), iki kare beklenir,
      yeniden oturması beklenir.
   4. Adım boyunca hedef her karede yeniden ölçülür (düzen sonradan kayarsa delik izler). ResizeObserver, visualViewport,
      pencere boyutu ve yön değişiminde güvenli alan ve klavye payları yenilenir.
   5. Balon ölçülür, sığdığı tarafa konur, sığmıyorsa yön değiştirir.
   6. Hedef bulunamazsa adım atlanır. */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tr } from "@/metin";
import { useBackLayer } from "../back";
import { Button } from "../Button";
import { cn } from "../cn";
import { haptic } from "../haptics";
import { keyboardInset, safeInsets } from "../layout";
import { twoFrames } from "../motion";
import { holeFor, holeMaxHeightFor, isInView, placeBubble, sameRect, type Rect, type Viewport } from "./placement";
import { advanceTour, endTour, useTourStore, type TourStep } from "./store";

const FIND_TIMEOUT = 900;
const SETTLE_TIMEOUT = 1200;

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Aynı ad birden çok yerde olabilir (gizli sekme): görünür ve etkin olanı seç. */
function findTarget(name: string): HTMLElement | null {
  const list = document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(name)}"]`);
  for (const el of list) {
    if (el.closest("[inert]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (getComputedStyle(el).visibility === "hidden") continue;
    return el;
  }
  return null;
}

/** Hedefi, içinde durduğu KAYDIRILABİLİR kabın ortasına getirir. scrollIntoView kullanılmaz: o, overflow: hidden
    kapları da (sekme kaydırıcı, kabuk) kaydırır ve bütün düzeni bozar. Kaydırma yapıldıysa true. */
function scrollToCenter(el: HTMLElement): boolean {
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const oy = getComputedStyle(a).overflowY;
    if ((oy !== "auto" && oy !== "scroll") || a.scrollHeight <= a.clientHeight + 1) continue;
    const box = a.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const before = a.scrollTop;
    a.scrollTop = before + (r.top + r.height / 2) - (box.top + box.height / 2);
    return a.scrollTop !== before;
  }
  return false;
}

function StepView({ step, index, total, last }: { step: TourStep; index: number; total: number; last: boolean }) {
  const layer = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Rect | null>(null);
  const [vp, setVp] = useState<Viewport | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let insets = safeInsets();
    let lastRect: Rect | null = null;
    let lastVp = "";

    const viewport = (): Viewport | null => {
      const o = layer.current?.getBoundingClientRect();
      if (!o) return null;
      return { w: o.width, h: o.height, top: insets.top, bottom: insets.bottom + keyboardInset(), left: insets.left, right: insets.right };
    };
    const rectOf = (el: HTMLElement): Rect | null => {
      const o = layer.current?.getBoundingClientRect();
      if (!o) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
    };
    /** Art arda üç karede aynı ölçü gelene kadar bekler. */
    const settle = async (el: HTMLElement) => {
      const t0 = performance.now();
      let prev: Rect | null = null;
      let same = 0;
      while (alive && same < 3 && performance.now() - t0 < SETTLE_TIMEOUT) {
        await frame();
        const cur = rectOf(el);
        same = sameRect(prev, cur) ? same + 1 : 0;
        prev = cur;
      }
    };
    const refreshInsets = () => {
      insets = safeInsets();
    };

    void (async () => {
      try {
        await step.before?.();
      } catch {
        /* hazırlık başarısızsa hedef zaten bulunamaz ve adım atlanır */
      }
      await (document.fonts?.ready ?? Promise.resolve());
      await twoFrames();
      let el = findTarget(step.target);
      const t0 = performance.now();
      while (alive && !el && performance.now() - t0 < FIND_TIMEOUT) {
        await frame();
        el = findTarget(step.target);
      }
      if (!alive) return;
      if (!el) {
        advanceTour();
        return;
      }
      await settle(el);
      const v0 = viewport();
      const r0 = rectOf(el);
      if (v0 && r0 && !isInView(r0, v0, 0) && scrollToCenter(el)) {
        await twoFrames();
        await settle(el);
      }
      if (!alive) return;
      const loop = () => {
        if (!alive) return;
        let cur = el;
        if (!cur || !cur.isConnected) {
          cur = findTarget(step.target);
          el = cur;
        }
        const r = cur ? rectOf(cur) : null;
        const v = viewport();
        if (r && r.w > 0 && r.h > 0 && !sameRect(r, lastRect)) {
          lastRect = r;
          setTarget(r);
        }
        if (v) {
          const sig = `${v.w},${v.h},${v.top},${v.bottom},${v.left},${v.right}`;
          if (sig !== lastVp) {
            lastVp = sig;
            setVp(v);
          }
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
    })();

    window.addEventListener("resize", refreshInsets);
    window.addEventListener("orientationchange", refreshInsets);
    window.visualViewport?.addEventListener("resize", refreshInsets);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(refreshInsets) : null;
    ro?.observe(document.documentElement);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", refreshInsets);
      window.removeEventListener("orientationchange", refreshInsets);
      window.visualViewport?.removeEventListener("resize", refreshInsets);
      ro?.disconnect();
    };
    // Adım değişince bileşen key ile yeniden kurulur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Balonun gerçek ölçüsü (yazı büyütme ve metin uzunluğu dahil). */
  useEffect(() => {
    const el = bubble.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Uzun hedefte (kısa ekran, büyük yazı) balon deliğin üstüne ya da altına sığmazsa delik kısaltılır: üst kısım gösterilir. */
  const hole0 = target && vp ? holeFor(target, vp, { padding: step.padding, shape: step.shape }) : null;
  const place0 = hole0 && vp && size ? placeBubble(hole0, size, vp, step.placement) : null;
  const kisalt = !!(target && vp && size && hole0 && place0?.side === "over" && step.shape !== "circle");
  const hole = kisalt && target && vp && size && hole0 ? holeFor(target, vp, { padding: step.padding, shape: step.shape, maxH: holeMaxHeightFor(size.h, vp, hole0.y) }) : hole0;
  const place = kisalt && hole && vp && size ? placeBubble(hole, size, vp, step.placement) : place0;
  const ready = hole !== null && place !== null;

  const next = () => {
    if (last) haptic.success();
    else haptic.selection();
    advanceTour();
  };

  return (
    <div ref={layer} className="fixed inset-0" style={{ zIndex: "var(--z-tour)" }} role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Karartma: delik hazır olana kadar düz perde, sonra deliğin gölgesi. Her yere dokunmak ilerletir. */}
      <button type="button" aria-label={last ? tr.ortak.tur.bitti : tr.ortak.tur.ileri} onClick={next} className="absolute inset-0 h-full w-full cursor-default overflow-hidden">
        {hole ? (
          <span
            className="absolute block"
            style={{
              left: hole.x,
              top: hole.y,
              width: hole.w,
              height: hole.h,
              borderRadius: hole.r,
              boxShadow: "0 0 0 200vmax var(--f-tour-dim)",
              transition: "left var(--f-dur) var(--f-ease), top var(--f-dur) var(--f-ease), width var(--f-dur) var(--f-ease), height var(--f-dur) var(--f-ease)",
            }}
          >
            <span className="absolute -inset-0.5 block border-2 border-copper" style={{ borderRadius: hole.r + 2 }} />
            <span className="f-tour-ring absolute -inset-0.5 block border-2 border-copper" style={{ borderRadius: hole.r + 2 }} />
          </span>
        ) : (
          <span className="f-fade absolute inset-0 block" style={{ background: "var(--f-tour-dim)" }} />
        )}
      </button>

      <div
        ref={bubble}
        className={cn("absolute top-0 left-0 flex w-[min(calc(100vw-24px),22.5rem)] flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-(--f-shadow-float)", ready && "f-fade")}
        style={{
          transform: place ? `translate3d(${Math.round(place.x)}px,${Math.round(place.y)}px,0)` : undefined,
          visibility: ready ? "visible" : "hidden",
        }}
      >
        {place && place.side !== "over" ? (
          <span
            aria-hidden="true"
            className={cn("absolute h-3.5 w-3.5 rotate-45 border-line bg-surface", place.side === "below" ? "-top-2 border-t border-l" : "-bottom-2 border-r border-b")}
            style={{ left: place.arrowX - 7 }}
          />
        ) : null}
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 text-base font-semibold text-text">{step.title}</p>
          <span className="num shrink-0 rounded-pill bg-surface-2 px-2 py-0.5 text-xs text-text-2">{tr.ortak.tur.adim(index + 1, total)}</span>
        </div>
        <p className="text-sm text-text-2">{step.text}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex flex-1 gap-1" aria-hidden="true">
            {Array.from({ length: total }, (_, k) => (
              <span key={k} className={cn("h-1.5 rounded-pill transition-all", k === index ? "w-5 bg-accent" : "w-1.5 bg-surface-2")} />
            ))}
          </span>
          {last ? null : (
            <Button variant="text" size="sm" className="text-text-3" onClick={endTour}>
              {tr.ortak.tur.atla}
            </Button>
          )}
          <Button size="sm" onClick={next}>
            {last ? tr.ortak.tur.bitti : tr.ortak.tur.ileri}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Bir kez yerleştirilir (UiHost içinde). */
export function TourHost() {
  const active = useTourStore((s) => s.active);
  useBackLayer(active !== null, () => {
    endTour();
    return true;
  });
  if (!active) return null;
  const step = active.steps[active.index];
  if (!step) return null;
  return createPortal(
    <StepView key={`${active.run}-${active.index}`} step={step} index={active.index} total={active.steps.length} last={active.index === active.steps.length - 1} />,
    document.body,
  );
}
