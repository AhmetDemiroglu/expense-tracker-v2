/* Özet ekranının gösterdiği dönem: aktif dönem (P4 seçicileri) ya da dönem seçiciden seçilen başka bir dönem.
   Başka dönemin sayıları da çekirdekten gelir (prepareBudget, computeBudget, categoryBreakdown); burada formül yok. */
import { useMemo } from "react";
import { categoryBreakdown, computeBudget, prepareBudget, type BudgetSnapshot, type CategoryTotal, type Period, type TxType } from "@/core";
import { useAktifDonem, useBugun, useKategoriDagilimi, useOzet, useVeri } from "@/data";
import { useGorunenDonem } from "./ortak";

export interface GorunenButce {
  donem: Period | null;
  /** true: aktif dönem (limit, hafta çubukları gösterilir). false: yalnız özet. */
  aktifMi: boolean;
  ozet: BudgetSnapshot | null;
}

export function useGorunenButce(): GorunenButce {
  const aktif = useAktifDonem();
  const aktifOzet = useOzet();
  const seciliId = useGorunenDonem((s) => s.id);
  const donemler = useVeri((s) => s.donemler);
  const islemler = useVeri((s) => s.islemler);
  const duzenliler = useVeri((s) => s.duzenliler);
  const bugun = useBugun();

  const secili = seciliId && seciliId !== aktif?.id ? (donemler.find((p) => p.id === seciliId) ?? null) : null;
  const baskaOzet = useMemo(
    () => (secili ? computeBudget(prepareBudget({ period: secili, transactions: islemler, recurrences: duzenliler, today: bugun })) : null),
    [secili, islemler, duzenliler, bugun],
  );

  if (secili) return { donem: secili, aktifMi: false, ozet: baskaOzet };
  return { donem: aktif, aktifMi: true, ozet: aktifOzet };
}

const BOS: CategoryTotal[] = [];

/** Görünen dönemin kategori dağılımı. */
export function useGorunenDagilim(tur: TxType): CategoryTotal[] {
  const aktifDagilim = useKategoriDagilimi(tur);
  const { donem, aktifMi } = useGorunenButce();
  const islemler = useVeri((s) => s.islemler);
  const duzenliler = useVeri((s) => s.duzenliler);
  const bugun = useBugun();
  const baska = useMemo(
    () => (!aktifMi && donem ? categoryBreakdown(prepareBudget({ period: donem, transactions: islemler, recurrences: duzenliler, today: bugun }), tur) : null),
    [aktifMi, donem, islemler, duzenliler, bugun, tur],
  );
  return aktifMi ? aktifDagilim : (baska ?? BOS);
}
