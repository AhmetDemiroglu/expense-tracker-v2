/* Takvim (kök sekme). Aylık ızgara (Pazartesi başlangıç), 6 haftalık ay da tek ekrana sığar.
   Gün verisi P4'ün useAy seçicisinden (çekirdek monthDays). Doluluk = o günün harcaması / limiti, yalnız çizim için. */
import { useRef, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import {
  MONTH_NAMES_TR,
  WEEKDAY_SHORT_TR,
  dateParts,
  formatDateTr,
  monthGrid,
  type DayInfo,
  type LocalDate,
} from "@/core";
import { useAktifDonem, useAy, useBugun, useTakvimAcilisi, useVeri } from "@/data";
import { tr } from "@/metin";
import { TabPage, type TabProps } from "@/shell";
import { Button, Card, EmptyState, IconButton, ScreenHeader, Skeleton, TourInfoButton, cn, haptic, useDrag, useReducedMotion, type TourStep } from "@/ui";
import { useCevrimdisi } from "../home/ortak";
import { CevrimdisiSerit } from "../home/parcalar";
import { GunSayfasi } from "./GunSayfasi";

const TAKVIM_TURU: TourStep[] = tr.takvim.tur.map((a) => ({ ...a }));

const kaydir = (year: number, month: number, by: number) => {
  const i = year * 12 + (month - 1) + by;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
};

/* Durum tonu: dolgu ve nokta. Marka kuralı: gelir ve gider renkleri tutar ve DURUM için kullanılır.
   Planlı ödeme renkle değil simgeyle gösterilir (bakır ve uyarı tonu birbirine yakın). */
const TON: Record<DayInfo["status"], string> = {
  good: "bg-income",
  warning: "bg-warn",
  over: "bg-expense",
  deficit: "bg-expense",
  none: "",
};

export function TakvimEkrani(_: TabProps) {
  const durum = useVeri((s) => s.durum);
  const acilis = useTakvimAcilisi();
  const donem = useAktifDonem();
  const bugun = useBugun();
  const cevrimdisi = useCevrimdisi();
  const az = useReducedMotion();
  const [gorunum, setGorunum] = useState({ ...acilis, yon: 0, elle: false });
  const [sonAcilis, setSonAcilis] = useState(acilis);
  const [gun, setGun] = useState<LocalDate | null>(null);
  const izgara = useRef<HTMLDivElement>(null);

  /* Veri sonradan gelirse (ya da dönem değişirse) kullanıcı ay değiştirmediyse açılış ayına geç. */
  if (sonAcilis !== acilis) {
    setSonAcilis(acilis);
    if (!gorunum.elle) setGorunum({ ...acilis, yon: 0, elle: false });
  }

  const git = (by: number) => {
    haptic.selection();
    setGorunum((g) => ({ ...kaydir(g.year, g.month, by), yon: by, elle: true }));
  };

  useDrag(izgara, {
    axis: "x",
    yieldEdge: true,
    onMove: () => {},
    onEnd: ({ distance, velocity, cancelled }) => {
      if (cancelled) return;
      if (distance < -48 || velocity < -0.4) git(1);
      else if (distance > 48 || velocity > 0.4) git(-1);
    },
  });

  const hucreler = useAy(gorunum.year, gorunum.month);
  const bos = monthGrid(gorunum.year, gorunum.month);
  const acilistaMi = gorunum.year === acilis.year && gorunum.month === acilis.month;

  const header = (
    <ScreenHeader
      title={`${MONTH_NAMES_TR[gorunum.month - 1]} ${gorunum.year}`}
      subtitle={donem ? tr.takvim.donemAraligi(formatDateTr(donem.start, "short"), formatDateTr(donem.end, "short")) : tr.takvim.donemYokAlt}
      right={
        <div className="flex items-center">
          {!acilistaMi ? (
            <IconButton label={tr.takvim.buAy} onClick={() => setGorunum({ ...acilis, yon: 0, elle: false })}>
              <RotateCcw size={18} aria-hidden="true" />
            </IconButton>
          ) : null}
          <div data-tour="takvim-oklar" className="flex items-center">
            <IconButton label={tr.takvim.oncekiAy} onClick={() => git(-1)}>
              <ChevronLeft size={22} aria-hidden="true" />
            </IconButton>
            <IconButton label={tr.takvim.sonrakiAy} onClick={() => git(1)}>
              <ChevronRight size={22} aria-hidden="true" />
            </IconButton>
          </div>
          <TourInfoButton id="takvim" steps={TAKVIM_TURU} />
        </div>
      }
    />
  );

  if (durum === "hata") {
    return (
      <TabPage header={header}>
        <EmptyState
          mood="uzgun"
          title={tr.takvim.yuklenemedi}
          text={tr.ortak.hata.genel}
          action={
            <Button variant="secondary" onClick={() => void useVeri.getState().yenile()}>
              {tr.ortak.tekrarDene}
            </Button>
          }
        />
      </TabPage>
    );
  }

  const yukleniyor = durum === "yukleniyor" || durum === "bos";

  return (
    <TabPage header={header}>
      {cevrimdisi && durum === "hazir" ? <CevrimdisiSerit metin={tr.takvim.cevrimdisi} /> : null}
      <Card data-tour="takvim-izgara" pad="none" className="flex min-h-0 flex-1 flex-col gap-1 px-1 pt-2 pb-2">
        <div className="grid shrink-0 grid-cols-7 gap-0.5" aria-hidden="true">
          {WEEKDAY_SHORT_TR.map((d) => (
            <span key={d} className="py-1 text-center text-xs font-medium text-text-3">
              {d}
            </span>
          ))}
        </div>
        <div ref={izgara} data-swipe-lock="" className="f-clip flex min-h-0 flex-1 flex-col" style={{ touchAction: "pan-y" }}>
          <div
            key={`${gorunum.year}-${gorunum.month}`}
            role="grid"
            aria-label={`${MONTH_NAMES_TR[gorunum.month - 1]} ${gorunum.year}`}
            className="flex min-h-0 flex-1 flex-col gap-1"
            style={{ animation: gorunum.yon && !az ? `f-month-${gorunum.yon > 0 ? "next" : "prev"} var(--f-dur) var(--f-ease) both` : undefined }}
          >
            {bos.map((hafta, wi) => (
              <div key={wi} role="row" className="grid min-h-11 flex-1 grid-cols-7 gap-0.5">
                {hafta.map((h, di) => {
                  const hucre = hucreler?.[wi]?.[di];
                  return yukleniyor ? (
                    <Skeleton key={h.date} h="100%" radius={12} />
                  ) : (
                    <GunHucresi
                      key={h.date}
                      tarih={h.date}
                      ayIcinde={h.inMonth}
                      bilgi={hucre?.info ?? null}
                      bugun={h.date === bugun}
                      donemBasi={donem?.start === h.date}
                      donemSonu={donem?.end === h.date}
                      onSec={() => {
                        haptic.selection();
                        setGun(h.date);
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {donem ? <Lejant /> : null}
      </Card>
      <GunSayfasi gun={gun} onClose={() => setGun(null)} />
    </TabPage>
  );
}

function GunHucresi({
  tarih,
  ayIcinde,
  bilgi,
  bugun,
  donemBasi,
  donemSonu,
  onSec,
}: {
  tarih: LocalDate;
  ayIcinde: boolean;
  bilgi: DayInfo | null;
  bugun: boolean;
  donemBasi: boolean;
  donemSonu: boolean;
  onSec: () => void;
}) {
  const donemde = bilgi?.inPeriod ?? false;
  const durum = bilgi?.status ?? "none";
  const limit = bilgi?.limit ?? null;
  const harcama = bilgi?.spent ?? 0;
  /* Doluluk yalnız çizim için: 0..1. Limit yoksa ya da eksiyse tam dolu (durum rengi anlatır). */
  const doluluk = durum === "none" ? 0 : limit !== null && limit > 0 ? Math.min(1, harcama / limit) : harcama > 0 || durum === "deficit" ? 1 : 0;
  const planli = (bilgi?.plannedDue ?? 0) > 0 || (bilgi?.plannedSpent ?? 0) > 0;
  const soluk = !ayIcinde || !donemde;
  const ekler = [planli ? tr.takvim.planliOdemeVar : null, !donemde ? tr.takvim.donemDisi : null, donemBasi ? tr.takvim.donemBasi : null, donemSonu ? tr.takvim.donemSonu : null]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      role="gridcell"
      onClick={onSec}
      aria-current={bugun ? "date" : undefined}
      aria-label={tr.takvim.gunEtiketi(formatDateTr(tarih, "long"), tr.takvim.durum[durum], ekler)}
      className={cn(
        "pressable f-clip relative flex min-h-11 min-w-0 flex-col items-center justify-start rounded-control pt-1",
        donemde ? "bg-surface-2/70" : "bg-transparent",
        bugun && "ring-2 ring-copper ring-inset",
        durum === "deficit" && "ring-1 ring-expense/60 ring-inset",
      )}
    >
      {/* Doluluk: alttan yükselen dolgu, yalnız transform (scaleY). */}
      {doluluk > 0 ? (
        <span
          aria-hidden="true"
          className={cn("absolute inset-0 origin-bottom opacity-25 transition-transform duration-(--f-dur-slow) ease-fintel", TON[durum])}
          style={{ transform: `scaleY(${doluluk})` }}
        />
      ) : null}
      {/* Dönem başı ve sonu: kenarda bakır çizgi. */}
      {donemBasi ? <span aria-hidden="true" className="absolute top-1.5 bottom-1.5 left-0 w-1 rounded-pill bg-copper" /> : null}
      {donemSonu ? <span aria-hidden="true" className="absolute top-1.5 right-0 bottom-1.5 w-1 rounded-pill bg-copper" /> : null}
      <span className={cn("num relative text-sm", bugun ? "font-semibold text-text" : soluk ? "text-text-3 opacity-60" : "text-text")}>{dateParts(tarih).day}</span>
      <span className="relative mt-auto mb-1.5 flex h-1.5 items-center gap-1" aria-hidden="true">
        {durum !== "none" ? <span className={cn("h-1.5 w-1.5 rounded-pill", TON[durum])} /> : null}
      </span>
      {planli ? <CalendarClock size={12} strokeWidth={2.4} aria-hidden="true" className="absolute top-1 right-1 text-copper-text" /> : null}
    </button>
  );
}

function Lejant() {
  const ogeler: [string, string][] = [
    [tr.takvim.lejant.iyi, "bg-income"],
    [tr.takvim.lejant.uyari, "bg-warn"],
    [tr.takvim.lejant.asim, "bg-expense"],
  ];
  return (
    <div data-tour="takvim-lejant" className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pt-1">
      {ogeler.map(([ad, ton]) => (
        <span key={ad} className="flex items-center gap-1.5 text-xs text-text-2">
          <span className={cn("h-2 w-2 rounded-pill", ton)} aria-hidden="true" />
          {ad}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-xs text-text-2">
        <CalendarClock size={12} strokeWidth={2.4} aria-hidden="true" className="text-copper-text" />
        {tr.takvim.lejant.planli}
      </span>
    </div>
  );
}
