// Depo arayüzü: hesaplı kullanıcı (Firestore) ve misafir (localStorage) aynı sözleşmeyi uygular.
// Okuma ve yazma yalnız çekirdeğin okuyucu ve yazıcılarıyla yapılır (eski alan adları korunur).

import type { LocalDate, Period, Recurring, Settings, Transaction } from "@/core";
import type { UygulamaHatasi } from "../hatalar";

export type AyarDurumu = "var" | "yok" | "bilinmiyor";

export interface BozukKayit {
  koleksiyon: "islem" | "donem" | "duzenli" | "ayar";
  id: string;
  neden: string;
}

export interface VeriPaketi {
  islemler: Transaction[];
  donemler: Period[];
  duzenliler: Recurring[];
  ayarlar: Settings | null;
  /**
   * var: aktif dönemi olan ayar okundu.
   * yok: depo "ayar ya da aktif dönem yok" dedi (sunucu doğruladı ya da misafir deposu).
   * bilinmiyor: çevrimdışı ve önbellekte yok. İlk kurulum AÇILMAZ.
   */
  ayarDurumu: AyarDurumu;
  bozuk: BozukKayit[];
}

export interface PaketMeta {
  /** Veri sunucuyla doğrulanmadı (çevrimdışı önbellek) */
  onbellektenMi: boolean;
  /** Sunucuya ulaşmamış yerel yazım var */
  bekleyenYazim: boolean;
}

export interface ImlecGuncellemesi {
  id: string;
  nextDueDate: LocalDate;
  lastProcessedDate: LocalDate;
}

export interface Repository {
  readonly tur: "firestore" | "yerel";
  readonly userId: string;
  /** İlk paket ve sonraki her değişiklik. Dönen fonksiyon dinlemeyi bırakır. */
  dinle(paket: (p: VeriPaketi, m: PaketMeta) => void, hata: (e: UygulamaHatasi) => void): () => void;
  /** Ekler ya da günceller. Kayıttaki bilinmeyen eski alanlar korunur. */
  islemYaz(tx: Transaction): Promise<void>;
  /** Toplu yazım (500'lük parçalar). Kimlik deterministikse yeniden denenebilir. */
  islemleriYaz(txs: readonly Transaction[]): Promise<void>;
  islemleriSil(ids: readonly string[]): Promise<void>;
  donemYaz(p: Period): Promise<void>;
  donemSil(id: string): Promise<void>;
  duzenliYaz(r: Recurring): Promise<void>;
  duzenliSil(id: string): Promise<void>;
  /** Düzenli ödeme üretimi: önce işlemler, sonra imleçler (eski sürüm uyumu). */
  duzenliUret(create: readonly Transaction[], update: readonly ImlecGuncellemesi[]): Promise<void>;
  /** settings dokümanına BİRLEŞTİREREK yazar (writeSettings / activationPatch çıktısı). */
  ayarlarYaz(yama: Record<string, unknown>): Promise<void>;
}
