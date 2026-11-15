/* Kapı kararı: saf fonksiyon. Oturum, veri ve tercih durumundan hangi adımın gösterileceğini seçer. */

export type KapiAdimi = "bekle" | "karsilama" | "giris" | "veri-yukleniyor" | "veri-hata" | "baglanti" | "aktarim" | "kurulum" | "kabuk";

export interface KapiGirdisi {
  oturum: "baslatiliyor" | "girissiz" | "hesap" | "misafir";
  veri: "bos" | "yukleniyor" | "hazir" | "hata";
  ayar: "var" | "yok" | "bilinmiyor";
  karsilamaTamam: boolean;
  /** Hesaplı kullanıcıda cihazda aktarılabilir misafir verisi var ve karar verilmedi. */
  aktarimBekliyor: boolean;
  /** Bu oturum için kabuk bir kez açıldı: geçici durumlar kabuğu söküp takmaz. */
  kabukAcildi: boolean;
}

export function kapiAdimi(g: KapiGirdisi): KapiAdimi {
  if (g.oturum === "baslatiliyor") return "bekle";
  if (g.oturum === "girissiz") return g.karsilamaTamam ? "giris" : "karsilama";
  if (g.kabukAcildi) return "kabuk";
  if (g.veri === "hata") return "veri-hata";
  if (g.veri !== "hazir") return "veri-yukleniyor";
  if (g.ayar === "bilinmiyor") return "baglanti";
  if (g.oturum === "hesap" && g.aktarimBekliyor) return "aktarim";
  if (g.ayar === "yok") return "kurulum";
  return "kabuk";
}
