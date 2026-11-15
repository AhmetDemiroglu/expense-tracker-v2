// Nova sohbet geçmişi: kullanıcıya bağlı, cihazda, son 60 mesaj. Sunucuya son 12 gider.
// Çıkışta ve hesap silmede temizlenir. Eski kullanıcıdan bağımsız sessionStorage anahtarları silinir.

import { create } from "zustand";
import { ai, type RaporStili, type RaporYaniti, type SohbetModu } from "@/services/ai";
import { cihazDeposu, jsonOku, type AnahtarDeger } from "./depo/depolama";
import { UygulamaHatasi, veriHatasinaCevir } from "./hatalar";
import { yeniKimlik } from "./kimlik";

export const SOHBET_SINIRI = 60;
const ONEK = "fintel_nova_";

export interface SohbetMesaji {
  id: string;
  rol: "user" | "model";
  metin: string;
  zaman: number;
  rapor?: RaporYaniti;
}

interface SohbetDurumu {
  sahip: string | null;
  mesajlar: SohbetMesaji[];
  bekliyor: boolean;
  hata: UygulamaHatasi | null;
  gonder(metin: string, ayar: { mod: SohbetModu; stil?: RaporStili }): Promise<void>;
  raporEkle(r: RaporYaniti): void;
  temizle(): void;
}

function anahtar(uid: string): string {
  return `${ONEK}${uid}`;
}

function oku(depo: AnahtarDeger, uid: string): SohbetMesaji[] {
  const v = jsonOku(depo, anahtar(uid));
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (m): m is SohbetMesaji =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as SohbetMesaji).id === "string" &&
        ((m as SohbetMesaji).rol === "user" || (m as SohbetMesaji).rol === "model") &&
        typeof (m as SohbetMesaji).metin === "string",
    )
    .slice(-SOHBET_SINIRI);
}

function kaydet(uid: string | null, mesajlar: SohbetMesaji[]): void {
  if (!uid) return;
  try {
    cihazDeposu().setItem(anahtar(uid), JSON.stringify(mesajlar.slice(-SOHBET_SINIRI)));
  } catch {
    // depo dolu: geçmiş yalnız bu oturumda kalır
  }
}

export const useSohbet = create<SohbetDurumu>((set, get) => ({
  sahip: null,
  mesajlar: [],
  bekliyor: false,
  hata: null,

  async gonder(metin, ayar) {
    const temiz = metin.trim();
    if (!temiz || get().bekliyor) return;
    const sahip = get().sahip;
    const kullanici: SohbetMesaji = { id: yeniKimlik(), rol: "user", metin: temiz.slice(0, 2000), zaman: Date.now() };
    const mesajlar = [...get().mesajlar, kullanici].slice(-SOHBET_SINIRI);
    set({ mesajlar, bekliyor: true, hata: null });
    kaydet(sahip, mesajlar);
    try {
      const r = await ai.sohbet({
        mod: ayar.mod,
        ...(ayar.stil ? { stil: ayar.stil } : {}),
        // Rapor mesajı geçmişe girerse sunucuya yalnız özet gider (P2).
        mesajlar: mesajlar.map((m) => ({ role: m.rol, text: m.rapor ? m.rapor.durum.ozet : m.metin })),
      });
      if (get().sahip !== sahip) return; // kullanıcı değişti
      const yanit: SohbetMesaji = { id: yeniKimlik(), rol: "model", metin: r.yanit, zaman: Date.now() };
      const yeni = [...get().mesajlar, yanit].slice(-SOHBET_SINIRI);
      set({ mesajlar: yeni, bekliyor: false });
      kaydet(sahip, yeni);
    } catch (e) {
      if (get().sahip !== sahip) return;
      // Fırlatılmaz: ekran `hata` alanını gösterir (ön koşul olmadan çağrılabilsin).
      set({ bekliyor: false, hata: e instanceof UygulamaHatasi ? e : veriHatasinaCevir(e) });
    }
  },

  raporEkle(r) {
    const m: SohbetMesaji = { id: yeniKimlik(), rol: "model", metin: r.durum.ozet, zaman: Date.now(), rapor: r };
    const mesajlar = [...get().mesajlar, m].slice(-SOHBET_SINIRI);
    set({ mesajlar });
    kaydet(get().sahip, mesajlar);
  },

  temizle() {
    const sahip = get().sahip;
    if (sahip) {
      try {
        cihazDeposu().removeItem(anahtar(sahip));
      } catch {
        // yok say
      }
    }
    set({ mesajlar: [], hata: null, bekliyor: false });
  },
}));

/** Oturum değişince: o kullanıcının geçmişi yüklenir. null: bellek boşalır (depodaki silinmez). */
export function sohbetSahibiniAyarla(uid: string | null): void {
  if (useSohbet.getState().sahip === uid) return;
  useSohbet.setState({ sahip: uid, mesajlar: uid ? oku(cihazDeposu(), uid) : [], bekliyor: false, hata: null });
}

/** Çıkış ve hesap silme: kullanıcının geçmişi cihazdan silinir. */
export function sohbetiSil(uid: string | null): void {
  if (uid) {
    try {
      cihazDeposu().removeItem(anahtar(uid));
    } catch {
      // yok say
    }
  }
  if (useSohbet.getState().sahip === uid) useSohbet.setState({ mesajlar: [], hata: null, bekliyor: false });
}

/** Eski sürümün kullanıcıdan bağımsız anahtarları (oturumlar arası sızıntı). */
export function eskiSohbetiTemizle(): void {
  try {
    globalThis.sessionStorage?.removeItem("nova_chat_history");
    globalThis.sessionStorage?.removeItem("nova_analysis");
  } catch {
    // yok say
  }
}
