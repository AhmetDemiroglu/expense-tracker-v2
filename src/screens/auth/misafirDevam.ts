/* GEÇİCİ (P4 sağlayınca silinir, ISTEKLER satırı): cihazda kalmış misafir verisini bulur ve "Kaldığın yerden devam et"
   için active_guest'i yazıp sayfayı yeniler. Tek dosyada tutulur, başka yerde localStorage'a dokunulmaz. */
import { ACTIVE_GUEST_KEY, GUEST_PREFIX } from "@/core";

export interface DevamMisafir {
  guestId: string;
  islem: number;
}

function say(ls: Storage, anahtar: string): number {
  try {
    const v: unknown = JSON.parse(ls.getItem(anahtar) ?? "[]");
    return Array.isArray(v) ? v.length : 0;
  } catch {
    return 0;
  }
}

/** Oturumu kapalı iken cihazda kaydı olan en kalabalık misafir. */
export function devamEdilebilirMisafir(): DevamMisafir | null {
  try {
    const ls = globalThis.localStorage;
    let en: DevamMisafir | null = null;
    for (let i = 0; i < ls.length; i += 1) {
      const m = /^tx_(guest_[A-Za-z0-9]+)$/.exec(ls.key(i) ?? "");
      if (!m?.[1] || !m[1].startsWith(GUEST_PREFIX)) continue;
      const n = say(ls, `tx_${m[1]}`);
      if (n > 0 && (!en || n > en.islem)) en = { guestId: m[1], islem: n };
    }
    return en;
  } catch {
    return null;
  }
}

export function misafirDevamEt(guestId: string): void {
  try {
    globalThis.localStorage.setItem(ACTIVE_GUEST_KEY, guestId);
  } catch {
    return;
  }
  globalThis.location.reload();
}
