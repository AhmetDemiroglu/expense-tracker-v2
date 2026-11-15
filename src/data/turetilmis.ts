// Türetilmiş seçiciler. Hesap YALNIZ çekirdekten; burada formül yok.
// Kararlı referans: aynı girdiyle aynı nesne döner (zustand 5'te yeni nesne sonsuz çizim döngüsü yaratır).
// Önbellek modül düzeyinde: aynı veriyi okuyan tüm ekranlar tek hesabı paylaşır.

import {
  activePeriod,
  calendarAnchor,
  categoryBreakdown,
  computeBudget,
  dateParts,
  dayInfo,
  effectiveTransactions,
  monthDays,
  periodSummaries,
  prepareBudget,
  weekSeries,
  type BudgetContext,
  type BudgetSnapshot,
  type CategoryTotal,
  type DayInfo,
  type LocalDate,
  type MonthDayCell,
  type Period,
  type PeriodSummary,
  type Recurring,
  type Settings,
  type Transaction,
  type TxType,
} from "@/core";
import { useBugunStore } from "./bugun";
import { useVeri } from "./veri";
import { islemSirala } from "./depo/esleme";

/** Son çağrının argümanları (===) aynıysa önceki sonucu döner. */
function sonSonuc<A extends unknown[], R>(fn: (...a: A) => R): (...a: A) => R {
  let sonArg: A | null = null;
  let son: R;
  return (...a: A): R => {
    if (sonArg && sonArg.length === a.length && sonArg.every((x, i) => x === a[i])) return son;
    son = fn(...a);
    sonArg = a;
    return son;
  };
}

export const aktifDonemSec = sonSonuc((ayarlar: Settings | null, donemler: readonly Period[]): Period | null =>
  activePeriod(ayarlar, donemler),
);

export const butceSec = sonSonuc(
  (
    donem: Period | null,
    islemler: readonly Transaction[],
    duzenliler: readonly Recurring[],
    bugun: LocalDate,
  ): BudgetContext | null =>
    donem ? prepareBudget({ period: donem, transactions: islemler, recurrences: duzenliler, today: bugun }) : null,
);

interface BaglamOnbellegi {
  ozet?: BudgetSnapshot;
  anchor?: { year: number; month: number };
  hafta: Map<string, DayInfo[]>;
  ay: Map<string, MonthDayCell[][]>;
  gun: Map<string, DayInfo>;
  kategori: Map<string, CategoryTotal[]>;
}

const onbellek = new WeakMap<BudgetContext, BaglamOnbellegi>();

function kutu(ctx: BudgetContext): BaglamOnbellegi {
  let k = onbellek.get(ctx);
  if (!k) {
    k = { hafta: new Map(), ay: new Map(), gun: new Map(), kategori: new Map() };
    onbellek.set(ctx, k);
  }
  return k;
}

function sinirli<K, V>(m: Map<K, V>, anahtar: K, uret: () => V, sinir = 64): V {
  const v = m.get(anahtar);
  if (v !== undefined) return v;
  const yeni = uret();
  if (m.size >= sinir) {
    const ilk = m.keys().next();
    if (!ilk.done) m.delete(ilk.value);
  }
  m.set(anahtar, yeni);
  return yeni;
}

export function ozetSec(ctx: BudgetContext | null): BudgetSnapshot | null {
  if (!ctx) return null;
  const k = kutu(ctx);
  if (!k.ozet) k.ozet = computeBudget(ctx);
  return k.ozet;
}

export function haftaSec(ctx: BudgetContext | null, gun?: LocalDate): DayInfo[] | null {
  if (!ctx) return null;
  return sinirli(kutu(ctx).hafta, gun ?? "", () => weekSeries(ctx, gun));
}

export function aySec(ctx: BudgetContext | null, yil: number, ay: number): MonthDayCell[][] | null {
  if (!ctx) return null;
  return sinirli(kutu(ctx).ay, `${yil}-${ay}`, () => monthDays(ctx, yil, ay));
}

export function gunSec(ctx: BudgetContext | null, gun: LocalDate): DayInfo | null {
  if (!ctx) return null;
  return sinirli(kutu(ctx).gun, gun, () => dayInfo(ctx, gun), 400);
}

const BOS_KATEGORI: CategoryTotal[] = [];

export function kategoriSec(ctx: BudgetContext | null, tur: TxType = "expense"): CategoryTotal[] {
  if (!ctx) return BOS_KATEGORI;
  return sinirli(kutu(ctx).kategori, tur, () => categoryBreakdown(ctx, tur));
}

const bugunAyi = sonSonuc((bugun: LocalDate) => {
  const p = dateParts(bugun);
  return { year: p.year, month: p.month };
});

export function takvimAcilisiSec(ctx: BudgetContext | null, bugun: LocalDate): { year: number; month: number } {
  if (!ctx) return bugunAyi(bugun);
  const k = kutu(ctx);
  if (!k.anchor) k.anchor = calendarAnchor(ctx);
  return k.anchor;
}

export const etkinIslemlerSec = sonSonuc((islemler: readonly Transaction[]): Transaction[] =>
  [...effectiveTransactions(islemler)].sort(islemSirala),
);

/**
 * Dönem özetleri. Aktif dönemin değerleri settings kopyasından gelir (tek kaynak);
 * kayıtlı karşılığı olmayan aktif dönem (eski sürüm, kimlik "active") da listeye girer.
 */
export const donemOzetleriSec = sonSonuc(
  (
    donemler: readonly Period[],
    aktif: Period | null,
    islemler: readonly Transaction[],
    duzenliler: readonly Recurring[],
    bugun: LocalDate,
  ): PeriodSummary[] => {
    let liste: Period[] = [...donemler];
    if (aktif) {
      const i = liste.findIndex((p) => p.id === aktif.id);
      if (i >= 0) liste[i] = aktif;
      else liste = [aktif, ...liste];
    }
    return periodSummaries(liste, islemler, duzenliler, bugun);
  },
);

// ---------------- React kancaları ----------------

export function useBugun(): LocalDate {
  return useBugunStore((s) => s.bugun);
}

export function useAktifDonem(): Period | null {
  const ayarlar = useVeri((s) => s.ayarlar);
  const donemler = useVeri((s) => s.donemler);
  return aktifDonemSec(ayarlar, donemler);
}

export function useButce(): BudgetContext | null {
  const donem = useAktifDonem();
  const islemler = useVeri((s) => s.islemler);
  const duzenliler = useVeri((s) => s.duzenliler);
  const bugun = useBugun();
  return butceSec(donem, islemler, duzenliler, bugun);
}

export function useOzet(): BudgetSnapshot | null {
  return ozetSec(useButce());
}

export function useHafta(gun?: LocalDate): DayInfo[] | null {
  return haftaSec(useButce(), gun);
}

export function useAy(yil: number, ay: number): MonthDayCell[][] | null {
  return aySec(useButce(), yil, ay);
}

export function useGun(gun: LocalDate): DayInfo | null {
  return gunSec(useButce(), gun);
}

export function useTakvimAcilisi(): { year: number; month: number } {
  const ctx = useButce();
  const bugun = useBugun();
  return takvimAcilisiSec(ctx, bugun);
}

export function useKategoriDagilimi(tur?: TxType): CategoryTotal[] {
  return kategoriSec(useButce(), tur);
}

export function useEtkinIslemler(): Transaction[] {
  return etkinIslemlerSec(useVeri((s) => s.islemler));
}

export function useDonemOzetleri(): PeriodSummary[] {
  const donemler = useVeri((s) => s.donemler);
  const aktif = useAktifDonem();
  const islemler = useVeri((s) => s.islemler);
  const duzenliler = useVeri((s) => s.duzenliler);
  const bugun = useBugun();
  return donemOzetleriSec(donemler, aktif, islemler, duzenliler, bugun);
}

/** Kanca dışı erişim (AI bağlamı, dışa aktarma): güncel bütçe bağlamı. */
export function guncelButce(): { ctx: BudgetContext | null; donem: Period | null; bugun: LocalDate } {
  const s = useVeri.getState();
  const bugun = useBugunStore.getState().bugun;
  const donem = aktifDonemSec(s.ayarlar, s.donemler);
  return { ctx: butceSec(donem, s.islemler, s.duzenliler, bugun), donem, bugun };
}
