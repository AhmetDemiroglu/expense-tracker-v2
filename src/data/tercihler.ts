// Arayüz tercihleri: tema, karşılama, ipuçları. localStorage (ilk karede senkron okunur).

import { create } from "zustand";
import { readThemePref, setThemePref, type ThemePref } from "@/theme";
import { cihazDeposu, jsonOku } from "./depo/depolama";

/** Eski sürümle ortak anahtar ("true") */
export const KARSILAMA_ANAHTARI = "fintel_onboarding_completed";
export const IPUCU_ANAHTARI = "fintel_ipuclari";

function ipuclariOku(): Record<string, true> {
  const v = jsonOku(cihazDeposu(), IPUCU_ANAHTARI);
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  const out: Record<string, true> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (x === true) out[k] = true;
  return out;
}

function guvenliTema(): ThemePref {
  try {
    return readThemePref();
  } catch {
    return "system";
  }
}

interface TercihDurumu {
  tema: ThemePref;
  karsilamaTamam: boolean;
  ipuclari: Record<string, true>;
  temaDegistir(p: ThemePref): void;
  karsilamayiTamamla(): void;
  ipucuGoruldu(anahtar: string): boolean;
  ipucuIsaretle(anahtar: string): void;
  ipuclariniSifirla(): void;
}

export const useTercihler = create<TercihDurumu>((set, get) => ({
  tema: guvenliTema(),
  karsilamaTamam: cihazDeposu().getItem(KARSILAMA_ANAHTARI) === "true",
  ipuclari: ipuclariOku(),

  temaDegistir(p) {
    setThemePref(p);
    set({ tema: p });
  },

  karsilamayiTamamla() {
    try {
      cihazDeposu().setItem(KARSILAMA_ANAHTARI, "true");
    } catch {
      // depo dolu: oturum boyunca bellekte kalır
    }
    set({ karsilamaTamam: true });
  },

  ipucuGoruldu(anahtar) {
    return get().ipuclari[anahtar] === true;
  },

  ipucuIsaretle(anahtar) {
    const ipuclari = { ...get().ipuclari, [anahtar]: true as const };
    try {
      cihazDeposu().setItem(IPUCU_ANAHTARI, JSON.stringify(ipuclari));
    } catch {
      // yok say
    }
    set({ ipuclari });
  },

  ipuclariniSifirla() {
    try {
      cihazDeposu().removeItem(IPUCU_ANAHTARI);
    } catch {
      // yok say
    }
    set({ ipuclari: {} });
  },
}));
