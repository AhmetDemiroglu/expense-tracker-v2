// AI istemcisi: yalnız P2'nin aiProxy ucunu çağırır (callable, europe-west1). İstemcide HİÇBİR sağlayıcı anahtarı yok.
// Sayılar çekirdekten hesaplanıp isteğe konur; bugünün tarihi ve saat dilimi eklenir.

import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { today } from "@/core";
import { UygulamaHatasi } from "@/data/hatalar";
import { guncelButce, kategoriSec, ozetSec, etkinIslemlerSec, donemOzetleriSec } from "@/data/turetilmis";
import { useVeri } from "@/data/veri";
import { aktifKullanici } from "../auth";
import { fonksiyonlar, veritabani } from "../firebase";
import { finansBaglamiKur, saatDilimi } from "./baglam";
import { sahteFis, sahteKota, sahteRapor, sahteSohbet } from "./sahte";
import {
  aiHatasinaCevir,
  fisYanitiOku,
  raporYanitiOku,
  sohbetYanitiOku,
  type FinanceContext,
  type FisSonucu,
  type Kullanim,
  type RaporStili,
  type RaporYaniti,
  type SohbetModu,
  type SohbetYaniti,
} from "./sema";

export type { FinanceContext, FisSonucu, Kullanim, RaporStili, RaporYaniti, SohbetModu, SohbetYaniti } from "./sema";
export { aiHatasinaCevir, fisYanitiOku, raporYanitiOku, sohbetYanitiOku } from "./sema";
export { finansBaglamiKur } from "./baglam";

/** Sunucuya giden sohbet geçmişi sınırı (sunucu da son 12'yi alır). */
export const SUNUCU_MESAJ_SINIRI = 12;

export function sahteMi(): boolean {
  return import.meta.env.VITE_AI_SAHTE === "1";
}

/** Misafirde AI kapalı (Firebase oturumu yok, sunucu AUTH_REQUIRED döner). Ekran çağırmadan düğmeyi kilitler. */
export function aiKullanilabilir(): boolean {
  return sahteMi() || aktifKullanici() !== null;
}

function cevrimdisi(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

async function cagir(govde: Record<string, unknown>): Promise<unknown> {
  if (!aktifKullanici()) throw new UygulamaHatasi("AUTH_REQUIRED");
  if (cevrimdisi()) throw new UygulamaHatasi("AG_YOK");
  try {
    // Sunucu en kötü ~50 sn (iki model x 25 sn): 70 sn'den kısa verilmez.
    const fn = httpsCallable(fonksiyonlar(), "aiProxy", { timeout: 70_000 });
    const r = await fn(govde);
    return r.data;
  } catch (e) {
    throw aiHatasinaCevir(e, cevrimdisi());
  }
}

/** Güncel veriden FinanceContext. Aktif dönem yoksa null. */
export function guncelBaglam(stil?: RaporStili): FinanceContext | null {
  const { ctx, donem, bugun } = guncelButce();
  const ozet = ozetSec(ctx);
  if (!ctx || !donem || !ozet) return null;
  const s = useVeri.getState();
  return finansBaglamiKur({
    bugun,
    donem,
    ozet,
    kategoriler: kategoriSec(ctx, "expense"),
    duzenliler: s.duzenliler,
    islemler: etkinIslemlerSec(s.islemler),
    donemOzetleri: donemOzetleriSec(s.donemler, donem, s.islemler, s.duzenliler, bugun),
    ayarlar: s.ayarlar,
    ad: aktifKullanici()?.displayName ?? null,
    ...(stil ? { stil } : {}),
  });
}

export interface GorselGirdisi {
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";
  /** base64, "data:" öneki YOK */
  data: string;
}

async function fisOku(g: GorselGirdisi): Promise<FisSonucu> {
  const today = guncelButce().bugun;
  const ham = sahteMi()
    ? await sahteFis(today)
    : await cagir({ op: "receipt", image: { mimeType: g.mimeType, data: g.data }, today, timeZone: saatDilimi() });
  return fisYanitiOku(ham);
}

async function raporAl(ayar: { stil?: RaporStili } = {}): Promise<RaporYaniti> {
  const context = guncelBaglam(ayar.stil);
  if (!context) throw new UygulamaHatasi("GECERSIZ", { mesaj: "Rapor için önce bir dönem oluştur." });
  const ham = sahteMi() ? await sahteRapor(context) : await cagir({ op: "report", context });
  return raporYanitiOku(ham);
}

async function sohbet(args: {
  mod: SohbetModu;
  mesajlar: readonly { role: "user" | "model"; text: string }[];
  stil?: RaporStili;
  /** false: genel finans sohbeti (bağlamsız) */
  baglamla?: boolean;
}): Promise<SohbetYaniti> {
  const mesajlar = args.mesajlar
    .filter((m) => m.text.trim())
    .slice(-SUNUCU_MESAJ_SINIRI)
    .map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }));
  const son = mesajlar[mesajlar.length - 1];
  if (!son || son.role !== "user") throw new UygulamaHatasi("GECERSIZ", { mesaj: "Mesaj boş." });
  const context = args.baglamla === false ? null : guncelBaglam(args.stil);
  const ham = sahteMi()
    ? await sahteSohbet(son.text)
    : await cagir({ op: "chat", mode: args.mod, messages: mesajlar, ...(context ? { context } : {}) });
  return sohbetYanitiOku(ham);
}

/** Kalan günlük hak (ai_usage/{uid}). day bugün değilse sayaçlar 0 (P2). */
async function kotaDurumu(): Promise<{ receipt: Kullanim; report: Kullanim; chat: Kullanim }> {
  if (sahteMi()) return sahteKota();
  const u = aktifKullanici();
  if (!u) throw new UygulamaHatasi("AUTH_REQUIRED");
  const SINIR = { receipt: 30, report: 10, chat: 60 };
  try {
    const s = await getDoc(doc(veritabani(), "ai_usage", u.uid));
    const d = s.exists() ? (s.data() as Record<string, unknown>) : {};
    // Kota günü sunucuda İstanbul günüdür.
    const bugunMu = d.day === today("Europe/Istanbul");
    const sayi = (k: string): number => (bugunMu && typeof d[k] === "number" ? (d[k] as number) : 0);
    return {
      receipt: { kullanilan: sayi("receipt"), sinir: SINIR.receipt },
      report: { kullanilan: sayi("report"), sinir: SINIR.report },
      chat: { kullanilan: sayi("chat"), sinir: SINIR.chat },
    };
  } catch (e) {
    throw aiHatasinaCevir(e, cevrimdisi());
  }
}

export const ai = { fisOku, raporAl, sohbet, kotaDurumu };
