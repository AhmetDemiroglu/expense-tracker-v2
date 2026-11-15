// aiProxy istek ve yanıt tipleri (P2 sözleşmesi, functions/src/sozlesme.ts ile aynı alan adları) ve
// yanıt doğrulama. Bozuk yanıt ekranı düşürmez: BOZUK_YANIT fırlatılır. Saf (testli).

import { categoryFromLegacy, isCategoryKey, parseLocalDate, type CategoryKey, type Kurus, type LocalDate } from "@/core";
import { UygulamaHatasi } from "@/data/hatalar";

export type AiIslem = "receipt" | "report" | "chat";
export type RaporStili = "short" | "balanced" | "detailed";
export type SohbetModu = "advisor" | "tutor";

export interface FinanceContext {
  userName?: string;
  today: string;
  period: { name: string; start: string; end: string; remainingDays: number };
  totals: {
    plannedIncome: number;
    extraIncome: number;
    planned: number;
    discretionary: number;
    balance: number;
    dailyLimit: number | null;
    todayRemaining: number | null;
    savingsRatePercent: number | null;
  };
  categories: { key: string; name: string; amount: number }[];
  recurring: { name: string; amount: number; frequency: "weekly" | "monthly" | "yearly" }[];
  recent: { date: string; categoryName: string; amount: number; type: "income" | "expense"; description: string }[];
  previousPeriod?: { name: string; balance: number; savingsRatePercent: number | null };
  profile?: {
    goal?: "debt_reduction" | "savings" | "investment" | "stability";
    savingsStyle?: "strict" | "balanced" | "relaxed";
    risk?: "low" | "medium" | "high";
  };
  style?: RaporStili;
}

export interface Kullanim {
  kullanilan: number;
  sinir: number;
}

export interface FisSonucu {
  fisMi: boolean;
  isletme: string | null;
  tarih: LocalDate | null;
  toplam: Kurus | null;
  kdv: Kurus | null;
  kategori: CategoryKey;
  kalemler: { ad: string; tutar: Kurus | null; adet: number | null }[];
  guven: number;
  kullanim: Kullanim;
}

export interface RaporYaniti {
  durum: { ozet: string; ruhHali: "positive" | "neutral" | "critical" };
  tespitler: string[];
  oneriler: { baslik: string; aciklama: string; kategori: CategoryKey | null; kesintiYuzdesi: number | null }[];
  not: string;
  kullanim: Kullanim;
}

export interface SohbetYaniti {
  yanit: string;
  kullanim: Kullanim;
}

type O = Record<string, unknown>;

function nesne(v: unknown): O | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as O) : null;
}

function bozuk(neden: string): UygulamaHatasi {
  return new UygulamaHatasi("BOZUK_YANIT", { neden: new Error(neden) });
}

function metin(v: unknown, sinir = 2000): string | null {
  return typeof v === "string" ? v.slice(0, sinir) : null;
}

function kurus(v: unknown): Kurus | null {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v < 1e13 ? v : null;
}

function kullanimOku(v: unknown): Kullanim {
  const o = nesne(v);
  const used = o && typeof o.used === "number" && Number.isFinite(o.used) ? o.used : 0;
  const limit = o && typeof o.limit === "number" && Number.isFinite(o.limit) ? o.limit : 0;
  return { kullanilan: used, sinir: limit };
}

export function fisYanitiOku(v: unknown): FisSonucu {
  const o = nesne(v);
  if (!o || typeof o.isReceipt !== "boolean") throw bozuk("isReceipt yok");
  const kalemlerHam = Array.isArray(o.items) ? o.items.slice(0, 40) : [];
  const kalemler: FisSonucu["kalemler"] = [];
  for (const k of kalemlerHam) {
    const x = nesne(k);
    const ad = x ? metin(x.name, 120) : null;
    if (!x || !ad) continue;
    const adet = typeof x.quantity === "number" && Number.isFinite(x.quantity) && x.quantity > 0 ? x.quantity : null;
    kalemler.push({ ad, tutar: kurus(x.amount), adet });
  }
  const tarihHam = metin(o.date, 10);
  const guven = typeof o.confidence === "number" && Number.isFinite(o.confidence) ? Math.min(1, Math.max(0, o.confidence)) : 0;
  const kategoriAnahtari = typeof o.categoryKey === "string" ? o.categoryKey : "diger_gider";
  return {
    fisMi: o.isReceipt,
    isletme: o.isReceipt ? metin(o.merchant, 80) : null,
    tarih: o.isReceipt && tarihHam ? parseLocalDate(tarihHam) : null,
    toplam: o.isReceipt ? kurus(o.total) : null,
    kdv: o.isReceipt ? kurus(o.vat) : null,
    // Sunucu anahtarı çekirdek anahtarına çevrilir (kira_aidat, faturalar, borc_odeme, diger_gider farklı adlı).
    kategori: categoryFromLegacy(kategoriAnahtari, "expense"),
    kalemler: o.isReceipt ? kalemler : [],
    guven,
    kullanim: kullanimOku(o.usage),
  };
}

const RUH_HALI = ["positive", "neutral", "critical"] as const;

export function raporYanitiOku(v: unknown): RaporYaniti {
  const o = nesne(v);
  const durum = o ? nesne(o.status) : null;
  const ozet = durum ? metin(durum.summary) : null;
  if (!o || !durum || !ozet) throw bozuk("status.summary yok");
  const ruh = RUH_HALI.find((r) => r === durum.mood) ?? "neutral";
  const tespitler = (Array.isArray(o.findings) ? o.findings : [])
    .map((f) => metin(f))
    .filter((f): f is string => !!f)
    .slice(0, 6);
  const oneriler: RaporYaniti["oneriler"] = [];
  for (const s of Array.isArray(o.suggestions) ? o.suggestions.slice(0, 5) : []) {
    const x = nesne(s);
    const baslik = x ? metin(x.title, 200) : null;
    if (!x || !baslik) continue;
    const yuzde =
      typeof x.suggestedCutPercent === "number" && Number.isInteger(x.suggestedCutPercent) && x.suggestedCutPercent >= 1 && x.suggestedCutPercent <= 100
        ? x.suggestedCutPercent
        : null;
    oneriler.push({
      baslik,
      aciklama: metin(x.description) ?? "",
      kategori: isCategoryKey(x.categoryKey) ? x.categoryKey : null,
      kesintiYuzdesi: yuzde,
    });
  }
  return {
    durum: { ozet, ruhHali: ruh },
    tespitler,
    oneriler,
    not: metin(o.note) ?? "",
    kullanim: kullanimOku(o.usage),
  };
}

export function sohbetYanitiOku(v: unknown): SohbetYaniti {
  const o = nesne(v);
  const yanit = o ? metin(o.reply, 8000) : null;
  if (!o || !yanit || !yanit.trim()) throw bozuk("reply yok");
  return { yanit, kullanim: kullanimOku(o.usage) };
}

const AI_KODLARI = new Set([
  "AUTH_REQUIRED",
  "QUOTA_EXCEEDED",
  "AI_UNAVAILABLE",
  "AI_BAD_RESPONSE",
  "TOO_LARGE",
  "UNSUPPORTED_FILE",
  "INVALID_REQUEST",
]);

/** Callable hatasını Türkçe hataya çevirir. Yalnız details.code'a bakılır; ham mesaj gösterilmez. */
export function aiHatasinaCevir(e: unknown, cevrimdisi = false): UygulamaHatasi {
  if (e instanceof UygulamaHatasi) return e;
  const o = nesne(e);
  const details = o ? nesne(o.details) : null;
  const ozel = details && typeof details.code === "string" ? details.code : "";
  if (AI_KODLARI.has(ozel)) {
    const sifirlanma = details && typeof details.resetsAt === "string" ? details.resetsAt : undefined;
    return new UygulamaHatasi(ozel as "QUOTA_EXCEEDED", { neden: e, sifirlanma });
  }
  if (cevrimdisi) return new UygulamaHatasi("AG_YOK", { neden: e });
  const code = o && typeof o.code === "string" ? o.code.replace(/^functions\//, "") : "";
  switch (code) {
    case "unauthenticated":
      return new UygulamaHatasi("AUTH_REQUIRED", { neden: e });
    case "resource-exhausted":
      return new UygulamaHatasi("QUOTA_EXCEEDED", { neden: e });
    case "invalid-argument":
      return new UygulamaHatasi("INVALID_REQUEST", { neden: e });
    case "deadline-exceeded":
    case "unavailable":
      return new UygulamaHatasi("AI_UNAVAILABLE", { neden: e });
    default:
      return new UygulamaHatasi("AI_UNAVAILABLE", { neden: e });
  }
}
