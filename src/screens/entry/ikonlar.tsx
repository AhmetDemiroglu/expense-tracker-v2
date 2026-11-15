/* Kategori anahtarı -> simge. Yıldız ve ışıltı simgesi kullanılmaz (Nova kuralı). */
import {
  Baby, Briefcase, CircleEllipsis, Clapperboard, CreditCard, Dumbbell, Fuel, GraduationCap, HeartPulse, House, KeyRound, Landmark,
  Plane, Receipt, Repeat, Scissors, Shirt, ShoppingCart, Smartphone, Sofa, SprayCan, TrendingUp, Utensils, Wallet, Wrench, Bus, FileText,
  type LucideIcon,
} from "lucide-react";
import type { CategoryKey } from "@/core";

const IKON: Record<CategoryKey, LucideIcon> = {
  maas: Wallet,
  ek_is: Briefcase,
  yatirim_geliri: TrendingUp,
  kira_geliri: KeyRound,
  diger_gelir: CircleEllipsis,
  market: ShoppingCart,
  yeme_icme: Utensils,
  toplu_tasima: Bus,
  arac_yakit: Fuel,
  kira: House,
  fatura: Receipt,
  giyim: Shirt,
  kozmetik: SprayCan,
  saglik: HeartPulse,
  spor: Dumbbell,
  kuafor: Scissors,
  ev_esyasi: Sofa,
  tamirat: Wrench,
  egitim: GraduationCap,
  cocuk: Baby,
  teknoloji: Smartphone,
  abonelik: Repeat,
  eglence: Clapperboard,
  tatil: Plane,
  kredi_karti: CreditCard,
  borc: Landmark,
  vergi: FileText,
  diger: CircleEllipsis,
};

export function KategoriIkonu({ kategori, size = 20 }: { kategori: CategoryKey; size?: number }) {
  const I = IKON[kategori];
  return <I size={size} aria-hidden="true" />;
}
