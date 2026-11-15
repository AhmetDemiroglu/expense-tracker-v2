/* Öneri kartındaki "olası tasarruf": kategori toplamının önerilen kesinti yüzdesi kadarı (tam kuruş, yuvarlanır).
   Model sayı üretmez: toplam çekirdekten (kategori dağılımı), yüzde modelin önerisidir. Kuruş tamsayıdır. */
import { percentage, type Kurus } from "@/core";

export function olasiTasarruf(toplam: Kurus, yuzde: number): Kurus {
  if (!Number.isFinite(toplam) || toplam <= 0 || !Number.isFinite(yuzde) || yuzde <= 0) return 0;
  return percentage(toplam, Math.min(100, yuzde));
}
