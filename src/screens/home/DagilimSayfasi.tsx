/* Gelir, gider ve planlı dağılımı (Özet'teki üçlüye dokununca). Paylar çekirdeğin categoryBreakdown çıktısıdır.
   Halka elle SVG; giriş hareketi yalnız transform ve opacity (f-dagilim-giris), çubuklar scaleX ile dolar. */
import { useEffect, useState } from "react";
import "./ozet.css";
import { categoryLabel, sumKurus, type CategoryTotal, type Kurus } from "@/core";
import { tr } from "@/metin";
import { Amount, EmptyState, ListRow, Segmented, Sheet, cn, useReducedMotion } from "@/ui";
import { KategoriIkon } from "./parcalar";
import { useGorunenButce, useGorunenDagilim } from "./gorunenButce";

export type DagilimTuru = "income" | "expense" | "planned";

/* Kategori renkleri: bakır ve yazı tonları dönüşümlü (gece vurgu = bakır olduğu için vurgu kullanılmaz). Gelir ve gider rengi yok. */
const RENKLER = [
  "var(--f-copper)",
  "var(--f-text-2)",
  "color-mix(in oklab, var(--f-copper) 55%, var(--f-surface-2))",
  "color-mix(in oklab, var(--f-text-2) 50%, var(--f-surface-2))",
  "color-mix(in oklab, var(--f-copper) 30%, var(--f-surface-2))",
  "var(--f-text-3)",
  "color-mix(in oklab, var(--f-text-2) 25%, var(--f-surface-2))",
];
const renk = (i: number) => RENKLER[i % RENKLER.length]!;

/** İlk kareden sonra true: dolarak gelme için (bileşen tür değişiminde key ile yeniden kurulur). */
function useGirdi(): boolean {
  const [girdi, setGirdi] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGirdi(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return girdi;
}

function Halka({ dilimler, ortada }: { dilimler: readonly CategoryTotal[]; ortada: Kurus }) {
  const az = useReducedMotion();
  const R = 40;
  const C = 2 * Math.PI * R;
  const uzunluklar = dilimler.map((d) => (d.share / 100) * C);
  const baslar = uzunluklar.map((_, i) => uzunluklar.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="relative mx-auto grid h-40 w-40 shrink-0 place-items-center">
      <svg
        viewBox="0 0 100 100"
        className="col-start-1 row-start-1 h-40 w-40"
        style={az ? undefined : { animation: "f-dagilim-giris 520ms var(--f-ease) both" }}
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--f-surface-2)" strokeWidth="12" />
        <g transform="rotate(-90 50 50)">
          {dilimler.map((d, i) => {
            const uzun = uzunluklar[i] ?? 0;
            return (
              <circle
                key={d.category}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={renk(i)}
                strokeWidth="12"
                strokeDasharray={`${Math.max(0, uzun - 0.8)} ${C}`}
                strokeDashoffset={-(baslar[i] ?? 0)}
              />
            );
          })}
        </g>
      </svg>
      <div className="col-start-1 row-start-1 flex flex-col items-center">
        <span className="text-xs text-text-3">{tr.ozet.toplam}</span>
        <Amount value={ortada} size="md" decimals={false} />
      </div>
    </div>
  );
}

function PayCubugu({ pay, i, girdi }: { pay: number; i: number; girdi: boolean }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-pill bg-surface-2" aria-hidden="true">
      <span
        className="block h-full w-full origin-left rounded-pill transition-transform duration-(--f-dur-slow) ease-fintel"
        style={{ background: renk(i), transform: `scaleX(${girdi ? pay / 100 : 0})`, transitionDelay: `${i * 40}ms` }}
      />
    </span>
  );
}

function KategoriListesi({ tur }: { tur: "income" | "expense" }) {
  const liste = useGorunenDagilim(tur);
  const { ozet } = useGorunenButce();
  const girdi = useGirdi();
  if (!liste.length || !ozet) return <EmptyState surface="none" size={72} mood="dusunuyor" title={tr.ozet.dagilimBos} />;
  const toplam = sumKurus(liste.map((d) => d.total));
  return (
    <div className="flex flex-col gap-3">
      <Halka dilimler={liste} ortada={toplam} />
      {tur === "income" && ozet.plannedIncome > 0 ? (
        <div className="flex flex-col rounded-card border border-line">
          <ListRow title={tr.ozet.sabitGelir} right={<Amount value={ozet.plannedIncome} kind="income" size="sm" />} />
          <ListRow title={tr.ozet.ekGelir} right={<Amount value={ozet.incomeTx} kind="income" size="sm" />} />
        </div>
      ) : null}
      <ul className="flex flex-col">
        {liste.map((d, i) => (
          <li key={d.category} className="flex flex-col gap-1.5 py-2">
            <div className="flex min-h-11 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-surface-2 text-text-2" style={{ color: renk(i) }}>
                <KategoriIkon kategori={d.category} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium text-text">{categoryLabel(d.category)}</span>
                <span className="text-xs text-text-3">
                  {tr.ozet.payYuzde(d.share)} · {tr.ozet.kayitSayisi(d.count)}
                </span>
              </span>
              <Amount value={d.total} kind={tur} size="sm" />
            </div>
            <PayCubugu pay={d.share} i={i} girdi={girdi} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanliListesi() {
  const { ozet } = useGorunenButce();
  if (!ozet) return null;
  const satirlar: [string, Kurus][] = [
    [tr.ozet.sabitGider, ozet.fixed],
    [tr.ozet.duzenliOdenen, ozet.autoPaid],
    [tr.ozet.planliKayit, ozet.plannedTx],
    [tr.ozet.bekleyenVade, ozet.duePending],
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col rounded-card border border-line">
        {satirlar.map(([ad, tutar]) => (
          <ListRow key={ad} title={ad} right={<Amount value={tutar} kind={tutar > 0 ? "expense" : "neutral"} size="sm" />} />
        ))}
        <ListRow title={<span className="font-semibold">{tr.ozet.planli}</span>} right={<Amount value={ozet.planned} kind="expense" size="sm" />} />
      </div>
      <div className="flex flex-col rounded-card border border-line">
        <ListRow title={tr.ozet.kendiHarcaman} right={<Amount value={ozet.discretionary} kind="expense" size="sm" />} />
        <ListRow title={<span className="font-semibold">{tr.ozet.toplam}</span>} right={<Amount value={ozet.totalExpense} kind="expense" size="sm" />} />
      </div>
    </div>
  );
}

export function DagilimSayfasi({ tur, onTur, onClose }: { tur: DagilimTuru | null; onTur: (t: DagilimTuru) => void; onClose: () => void }) {
  /* Kapanırken içerik kaybolmasın: son tür tutulur. */
  const [son, setSon] = useState<DagilimTuru>("expense");
  if (tur && tur !== son) setSon(tur);
  const gorunen = tur ?? son;
  const baslik = gorunen === "income" ? tr.ozet.gelirDagilimi : gorunen === "expense" ? tr.ozet.giderDagilimi : tr.ozet.planliDagilimi;
  return (
    <Sheet open={tur !== null} onClose={onClose} title={baslik} size="half" expandable>
      <div className={cn("flex flex-col gap-4 pb-2")}>
        <Segmented<DagilimTuru>
          full
          value={gorunen}
          onChange={onTur}
          options={[
            { value: "expense", label: tr.ozet.gider },
            { value: "income", label: tr.ozet.gelir },
            { value: "planned", label: tr.ozet.planli },
          ]}
        />
        {gorunen === "planned" ? <PlanliListesi /> : <KategoriListesi key={gorunen} tur={gorunen} />}
      </div>
    </Sheet>
  );
}
