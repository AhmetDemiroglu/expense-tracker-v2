/* Kayıtlar listesinin saf mantığı: süzme, dönem ve gün gruplama. DOM yok, testli.
   Gün neti: listedeki kayıtların gelir eksi gider toplamı (sumKurus ile). Bütçe hesabı değildir. */
import {
  categoryLabel,
  formatAmountInput,
  groupByPeriod,
  stripAutoSuffix,
  sumKurus,
  trFold,
  type Kurus,
  type LocalDate,
  type Period,
  type Transaction,
  type TxType,
} from "@/core";

export type TurSuzgeci = "tumu" | "gider" | "gelir";

export interface Suzgec {
  sorgu: string;
  tur: TurSuzgeci;
  /** Seçili dönem kimliği ("" dönem dışı). null: hepsi. */
  donemId: string | null;
}

export const DONEMSIZ = "";

/** Satırın başlığında görünen metin: açıklama (eski " (Otomatik)" eki atılır), yoksa kategori adı. */
export function baslikMetni(t: Transaction): string {
  const a = stripAutoSuffix(t.description).trim();
  return a || categoryLabel(t.category);
}

export function aramaMetni(t: Transaction): string {
  return trFold(`${t.description} ${categoryLabel(t.category)} ${formatAmountInput(t.amount)}`);
}

export function turUyar(t: Transaction, tur: TurSuzgeci): boolean {
  return tur === "tumu" || (tur === "gider" ? t.type === "expense" : t.type === "income");
}

export interface GunGrubu {
  date: LocalDate;
  net: Kurus;
  islemler: Transaction[];
}
export interface DonemGrubu {
  donemId: string;
  ad: string;
  baslangic: LocalDate | null;
  bitis: LocalDate | null;
  adet: number;
  net: Kurus;
  gunler: GunGrubu[];
}

const imzali = (t: Transaction): Kurus => (t.type === "income" ? t.amount : -t.amount);

/** Girdi: tarihe göre yeniden eskiye sıralı etkin kayıtlar. Dönemler başlangıca göre yeniden eskiye. */
export function grupla(islemler: readonly Transaction[], donemler: readonly Period[], suzgec: Suzgec): DonemGrubu[] {
  const q = trFold(suzgec.sorgu.trim());
  const secili = islemler.filter((t) => turUyar(t, suzgec.tur) && (!q || aramaMetni(t).includes(q)));
  const harita = groupByPeriod(secili, donemler);
  const sira: string[] = [...donemler.map((d) => d.id), DONEMSIZ];
  const sonuc: DonemGrubu[] = [];
  for (const id of sira) {
    if (suzgec.donemId !== null && suzgec.donemId !== id) continue;
    const liste = harita.get(id);
    if (!liste || liste.length === 0) continue;
    const gunHarita = new Map<LocalDate, Transaction[]>();
    for (const t of liste) {
      const g = gunHarita.get(t.date);
      if (g) g.push(t);
      else gunHarita.set(t.date, [t]);
    }
    const gunler: GunGrubu[] = [...gunHarita.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
      .map(([date, l]) => ({ date, islemler: l, net: sumKurus(l.map(imzali)) }));
    const d = donemler.find((p) => p.id === id);
    sonuc.push({
      donemId: id,
      ad: d?.name ?? "",
      baslangic: d?.start ?? null,
      bitis: d?.end ?? null,
      adet: liste.length,
      net: sumKurus(liste.map(imzali)),
      gunler,
    });
  }
  return sonuc;
}

/** "Bu ve sonraki taksitler": aynı grup, sıra numarası >= bu kaydınki. */
export function kalanTaksitler(hepsi: readonly Transaction[], t: Transaction): Transaction[] {
  if (!t.installmentGroupId || t.installmentIndex === undefined) return [t];
  const idx = t.installmentIndex;
  return hepsi.filter((x) => x.installmentGroupId === t.installmentGroupId && (x.installmentIndex ?? 0) >= idx);
}

export type { TxType };
