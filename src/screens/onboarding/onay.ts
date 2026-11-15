/* İlk açılış onayı: sürüm numarası ve tarih, cihazda saklanır. Onay metni değişirse ONAY_SURUMU artırılır ve herkes bir kez daha görür.
   Eski "fintel_onboarding_completed" anahtarı onay sayılmaz (içerik yeni): o kullanıcı da bu ekranı bir kez görür.
   GEÇİCİ yer: kalıcı yeri P4'ün useTercihler'i (ISTEKLER satırı). O gelene kadar anahtar burada. */
import { create } from "zustand";

export const ONAY_SURUMU = 1;
export const ONAY_ANAHTARI = "fintel_onay";

export interface OnayKaydi {
  surum: number;
  /** ISO tarih ve saat. */
  tarih: string;
}

/** Depodaki metni okur. Bozuk ya da eksik kayıt: null. */
export function onayCoz(ham: string | null): OnayKaydi | null {
  if (!ham) return null;
  try {
    const v: unknown = JSON.parse(ham);
    if (typeof v !== "object" || v === null) return null;
    const { surum, tarih } = v as Record<string, unknown>;
    if (typeof surum !== "number" || !Number.isInteger(surum) || surum < 1 || typeof tarih !== "string" || !tarih) return null;
    return { surum, tarih };
  } catch {
    return null;
  }
}

/** Kayıt bu sürümü (ya da yenisini) kapsıyor mu. */
export function onayGecerli(kayit: OnayKaydi | null, surum: number = ONAY_SURUMU): boolean {
  return kayit !== null && kayit.surum >= surum;
}

function oku(): OnayKaydi | null {
  try {
    return onayCoz(localStorage.getItem(ONAY_ANAHTARI));
  } catch {
    return null;
  }
}

export const useOnay = create<{ tamam: boolean; onayla(): void }>((set) => ({
  tamam: onayGecerli(oku()),
  onayla() {
    const kayit: OnayKaydi = { surum: ONAY_SURUMU, tarih: new Date().toISOString() };
    try {
      localStorage.setItem(ONAY_ANAHTARI, JSON.stringify(kayit));
    } catch {
      /* depo dolu ya da kapalı: oturum boyunca bellekte kalır */
    }
    set({ tamam: true });
  },
}));
