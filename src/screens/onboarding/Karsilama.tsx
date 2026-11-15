/* Karşılama: 3 sayfa, yatay kaydırma (useDrag) ve düğmeyle. Son sayfada sözleşme ve gizlilik onayı. */
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { Logo } from "@/brand";
import { useTercihler } from "@/data";
import { tr } from "@/metin";
import { Button, cn, haptic, useDrag, useReducedMotion } from "@/ui";
import { TamEkran } from "../auth/TamEkran";
import { KarsilamaSanati } from "./KarsilamaSanati";

const N = tr.giris.karsilama.sayfalar.length;

export function Karsilama() {
  const t = tr.giris.karsilama;
  const [sayfa, setSayfa] = useState(0);
  const [kayma, setKayma] = useState(0);
  const [onay, setOnay] = useState(false);
  const [uyari, setUyari] = useState(false);
  const alan = useRef<HTMLDivElement>(null);
  const azalt = useReducedMotion();
  const son = sayfa === N - 1;

  useDrag(alan, {
    axis: "x",
    onMove: (d) => setKayma(d),
    onEnd: ({ distance, velocity, cancelled }) => {
      setKayma(0);
      if (cancelled) return;
      const ileri = distance < -60 || velocity < -0.4;
      const geri = distance > 60 || velocity > 0.4;
      if (ileri && sayfa < N - 1) {
        setSayfa(sayfa + 1);
        haptic.selection();
      } else if (geri && sayfa > 0) {
        setSayfa(sayfa - 1);
        haptic.selection();
      }
    },
  });

  function ileri() {
    if (!son) {
      setSayfa(sayfa + 1);
      haptic.selection();
      return;
    }
    if (!onay) {
      setUyari(true);
      haptic.warning();
      return;
    }
    haptic.success();
    useTercihler.getState().karsilamayiTamamla();
  }

  const s = t.sayfalar[sayfa];
  return (
    <TamEkran scroll={false}>
      <div className="flex shrink-0 items-center justify-between">
        <Logo variant="horizontal" height={30} />
        {!son ? (
          <Button variant="text" size="sm" onClick={() => setSayfa(N - 1)}>
            {t.atla}
          </Button>
        ) : (
          <span className="min-h-11" />
        )}
      </div>
      <div ref={alan} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 touch-pan-y" aria-live="polite">
        <div
          className="h-[min(38dvh,260px)] w-full max-w-72 shrink-0"
          style={{ transform: `translateX(${kayma * 0.5}px)`, transition: kayma === 0 && !azalt ? "transform var(--f-dur) var(--f-ease)" : "none" }}
        >
          <KarsilamaSanati key={sayfa} sayfa={sayfa} />
        </div>
        <div className="flex flex-col items-center gap-2 px-2 text-center" style={{ transform: `translateX(${kayma * 0.25}px)` }}>
          <h1 className="text-2xl font-semibold text-text">{s?.baslik}</h1>
          <p className="text-base text-text-2">{s?.metin}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-3">
        {son ? (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-left">
            <input
              type="checkbox"
              className="sr-only"
              checked={onay}
              onChange={(e) => {
                setOnay(e.target.checked);
                setUyari(false);
              }}
            />
            <span aria-hidden="true" className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2", onay ? "border-accent bg-accent text-on-accent" : uyari ? "border-warn" : "border-text-3")}>
              {onay ? <Check size={16} strokeWidth={3} /> : null}
            </span>
            <span className="text-sm text-text-2">
              {t.onay}{" "}
              <a className="font-medium text-copper-text underline" href={tr.ayarlar.hakkinda.kosullarUrl} target="_blank" rel="noreferrer">
                {t.kosullar}
              </a>
              {", "}
              <a className="font-medium text-copper-text underline" href={tr.ayarlar.hakkinda.gizlilikUrl} target="_blank" rel="noreferrer">
                {t.gizlilik}
              </a>
              {uyari ? <span role="alert" className="block font-medium text-warn">{t.onayGerekli}</span> : null}
            </span>
          </label>
        ) : null}
        <div className="flex items-center justify-center gap-2" role="tablist" aria-label={t.sayfaEtiketi(sayfa + 1, N)}>
          {t.sayfalar.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === sayfa} aria-label={t.sayfaEtiketi(i + 1, N)} onClick={() => setSayfa(i)} className="pressable flex h-6 w-6 items-center justify-center">
              <span className={cn("h-2 rounded-pill transition-[width,opacity]", i === sayfa ? "w-6 bg-accent" : "w-2 bg-text-3 opacity-50")} />
            </button>
          ))}
        </div>
        <Button size="lg" full onClick={ileri}>
          {son ? t.baslat : t.ileri}
        </Button>
      </div>
    </TamEkran>
  );
}
