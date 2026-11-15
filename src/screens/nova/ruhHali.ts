/* Nova'nın ruh hali ve durum cümlesi: tek saf fonksiyon (testli). Sözleşme tablosu: SOZLESMELER > Arayüz parçaları > Nova.
   Sohbet yanıtında ruh hali alanı yoktur: yanıttan sonra ruh hali bütçenin durumundan gelir, model metninden çıkarılmaz. */
import type { NovaMood } from "@/ui";

export type DurumAnahtari =
  | "kapali"
  | "raporHazirlaniyor"
  | "dusunuyor"
  | "yaziyor"
  | "kota"
  | "hata"
  | "cevrimdisi"
  | "veriBekleniyor"
  | "donemYok"
  | "kayitYok"
  | "selam"
  | "baslamadi"
  | "asim"
  | "acik"
  | "bitisEksi"
  | "kritik"
  | "pozitif"
  | "iyi"
  | "uyari"
  | "normal";

export interface RuhGirdisi {
  /** AI kullanılabilir mi (misafirde false) */
  aiAcik: boolean;
  cevrimici: boolean;
  /** Veri henüz gelmedi (ayarDurumu "bilinmiyor" ya da yükleniyor) */
  veriBekleniyor: boolean;
  donemVar: boolean;
  kayitVar: boolean;
  raporYukleniyor: boolean;
  yanitBekleniyor: boolean;
  /** Yanıt şu an yazılıyor (sonlu efekt) */
  yaziyor: boolean;
  hataKodu: string | null;
  /** Boşta ara sıra selam (tek sefer) */
  selamAktif: boolean;
  faz: "before" | "active" | "ended" | null;
  gunDurumu: "good" | "warning" | "over" | "deficit" | "none" | null;
  bakiyeEksi: boolean;
  raporRuhu: "positive" | "neutral" | "critical" | null;
}

export interface RuhSonucu {
  ruh: NovaMood;
  anahtar: DurumAnahtari;
}

export function novaDurumu(g: RuhGirdisi): RuhSonucu {
  if (!g.aiAcik) return { ruh: "uyku", anahtar: "kapali" };
  if (g.veriBekleniyor) return { ruh: "uyku", anahtar: "veriBekleniyor" };
  if (g.raporYukleniyor) return { ruh: "analiz", anahtar: "raporHazirlaniyor" };
  if (g.yanitBekleniyor) return { ruh: "dusunuyor", anahtar: "dusunuyor" };
  if (g.yaziyor) return { ruh: "konusuyor", anahtar: "yaziyor" };
  if (g.hataKodu === "QUOTA_EXCEEDED") return { ruh: "uyari", anahtar: "kota" };
  if (!g.cevrimici || g.hataKodu === "AG_YOK") return { ruh: "uzgun", anahtar: "cevrimdisi" };
  if (g.hataKodu) return { ruh: "uzgun", anahtar: "hata" };
  if (!g.donemVar) return { ruh: "selam", anahtar: "donemYok" };
  if (!g.kayitVar) return { ruh: "selam", anahtar: "kayitYok" };
  if (g.faz === "before") return { ruh: "uyku", anahtar: "baslamadi" };
  if (g.faz === "ended" && g.bakiyeEksi) return { ruh: "uzgun", anahtar: "bitisEksi" };
  if (g.gunDurumu === "over") return { ruh: "uyari", anahtar: "asim" };
  if (g.gunDurumu === "deficit") return { ruh: "uyari", anahtar: "acik" };
  if (g.raporRuhu === "critical") return { ruh: "uyari", anahtar: "kritik" };
  if (g.selamAktif) return { ruh: "selam", anahtar: "selam" };
  if (g.gunDurumu === "warning") return { ruh: "uyari", anahtar: "uyari" };
  if (g.raporRuhu === "positive") return { ruh: "mutlu", anahtar: "pozitif" };
  if (g.gunDurumu === "good") return { ruh: "mutlu", anahtar: "iyi" };
  return { ruh: "selam", anahtar: "normal" };
}
