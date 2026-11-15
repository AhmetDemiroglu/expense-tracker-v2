/* Nova ekranının oturum içi durumu: rapor, mod ve stil. Kullanıcıya bağlıdır: kullanıcı değişince sıfırlanır
   (sekmeler sökülmediği için bir sonraki kullanıcı öncekinin raporunu görmesin). Kalıcı değildir (P4'te mod ve stil için yer yok: ISTEKLER). */
import { create } from "zustand";
import { ai, type RaporStili, type RaporYaniti, type SohbetModu } from "@/services/ai";
import { guncelButce } from "@/data/turetilmis";
import { hataMesaji, UygulamaHatasi } from "@/data";

export interface RaporHatasi {
  kod: string;
  mesaj: string;
  tekrarDenenebilir: boolean;
}

interface NovaDurumu {
  uid: string | null;
  mod: SohbetModu;
  stil: RaporStili;
  rapor: RaporYaniti | null;
  raporYukleniyor: boolean;
  raporHatasi: RaporHatasi | null;
  /** Raporun hazırlandığı andaki bütçe bağlamı (kararlı referans): değişirse "Veriler değişti" */
  raporBaglami: unknown;
  sahibiAyarla(uid: string | null): void;
  modAyarla(m: SohbetModu): void;
  stilAyarla(s: RaporStili): void;
  raporuYenile(): Promise<void>;
}

const BOS = {
  rapor: null,
  raporYukleniyor: false,
  raporHatasi: null,
  raporBaglami: null,
} as const;

export const useNovaDurumu = create<NovaDurumu>((set, get) => ({
  uid: null,
  mod: "advisor",
  stil: "balanced",
  ...BOS,

  sahibiAyarla(uid) {
    if (get().uid === uid) return;
    set({ uid, mod: "advisor", stil: "balanced", ...BOS });
  },
  modAyarla(mod) {
    set({ mod });
  },
  stilAyarla(stil) {
    set({ stil });
  },
  async raporuYenile() {
    if (get().raporYukleniyor) return;
    const uid = get().uid;
    const baglam = guncelButce().ctx;
    set({ raporYukleniyor: true, raporHatasi: null });
    try {
      const r = await ai.raporAl({ stil: get().stil });
      if (get().uid !== uid) return;
      set({ rapor: r, raporYukleniyor: false, raporBaglami: baglam });
    } catch (e) {
      if (get().uid !== uid) return;
      const h = e instanceof UygulamaHatasi ? e : null;
      set({
        raporYukleniyor: false,
        raporHatasi: { kod: h?.kod ?? "BILINMEYEN", mesaj: hataMesaji(e), tekrarDenenebilir: h?.tekrarDenenebilir ?? true },
      });
    }
  },
}));
