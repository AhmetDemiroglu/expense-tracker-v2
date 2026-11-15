/* P5 ortak yardımcıları: Özet ve Takvim birlikte kullanır. Hesap yok: sayılar çekirdekten ve P4 seçicilerinden gelir. */
import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Briefcase,
  Building2,
  Bus,
  CircleDashed,
  CreditCard,
  Droplets,
  Dumbbell,
  Fuel,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  Scissors,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sofa,
  Ticket,
  TrendingUp,
  Utensils,
  Wallet,
  Wrench,
} from "lucide-react";
import { create } from "zustand";
import {
  addDays,
  categoryLabel,
  formatDateTr,
  isAutoTransaction,
  isPlannedExpense,
  stripAutoSuffix,
  type CategoryKey,
  type LocalDate,
  type Transaction,
} from "@/core";
import { useBaglanti, useVeri } from "@/data";
import { tr } from "@/metin";

export const KATEGORI_IKON: Record<CategoryKey, LucideIcon> = {
  maas: Wallet,
  ek_is: Briefcase,
  yatirim_geliri: TrendingUp,
  kira_geliri: Building2,
  diger_gelir: PiggyBank,
  market: ShoppingCart,
  yeme_icme: Utensils,
  toplu_tasima: Bus,
  arac_yakit: Fuel,
  kira: House,
  fatura: Receipt,
  giyim: Shirt,
  kozmetik: Droplets,
  saglik: HeartPulse,
  spor: Dumbbell,
  kuafor: Scissors,
  ev_esyasi: Sofa,
  tamirat: Wrench,
  egitim: GraduationCap,
  cocuk: Baby,
  teknoloji: Smartphone,
  abonelik: Repeat,
  eglence: Ticket,
  tatil: Plane,
  kredi_karti: CreditCard,
  borc: HandCoins,
  vergi: Landmark,
  diger: CircleDashed,
};

/** Görüntülenen dönem: null = aktif dönem. Özet ve dönem seçici alt sayfası paylaşır. */
export const useGorunenDonem = create<{ id: string | null; sec(id: string | null): void }>((set) => ({
  id: null,
  sec: (id) => set({ id }),
}));

/** "Bugün", "Dün" ya da "15 Kas". */
export function gunAdi(d: LocalDate, bugun: LocalDate): string {
  if (d === bugun) return tr.ortak.bugun;
  if (d === addDays(bugun, -1)) return tr.ortak.dun;
  if (d === addDays(bugun, 1)) return tr.ortak.yarin;
  return formatDateTr(d, "short");
}

/** Bir işlemin listede görünen adı: açıklama (otomatik eki olmadan) ya da kategori adı. */
export function islemAdi(t: Transaction): string {
  const ad = stripAutoSuffix(t.description).trim();
  return ad || categoryLabel(t.category);
}

/** Etiketler: planlı, otomatik, taksit. */
export function islemEtiketleri(t: Transaction): string[] {
  const e: string[] = [];
  if (t.installmentIndex && t.installmentCount) e.push(tr.ozet.taksitEtiket(t.installmentIndex, t.installmentCount));
  if (isAutoTransaction(t)) e.push(tr.ozet.otomatikEtiket);
  else if (t.type === "expense" && isPlannedExpense(t)) e.push(tr.ozet.planliEtiket);
  return e;
}

/** Çevrimdışı ya da önbellekten gösterilen veri. */
export function useCevrimdisi(): boolean {
  const cevrimici = useBaglanti((s) => s.cevrimici);
  const onbellek = useVeri((s) => s.onbellektenMi);
  return cevrimici === false || onbellek;
}

