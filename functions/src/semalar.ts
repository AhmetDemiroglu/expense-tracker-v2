// Modelden istenen yapılandırılmış çıktı (responseJsonSchema) ve yanıt doğrulama.
// Şema anahtarları belge listesiyle sınırlı (aistudio.google.com/docs/structured-output, 2026-11-15):
// type, properties, required, enum, minimum/maximum, minItems/maxItems, nullable için type dizisi.
// minLength/maxLength gibi zorlanmayan sınırlar burada zod ile denetlenir.
import { z } from "zod";
import { FALLBACK_CATEGORY, RECEIPT_CATEGORY_KEYS, type ReceiptCategoryKey } from "./kategoriler";
import { isValidLocalDate } from "./sozlesme";

// ---------- Ortak temizlik ----------

/** Em dash ve en dash'i normal tireye çevirir, gereksiz boşluğu atar. */
export function cleanText(s: string, max: number): string {
  return s
    .replace(/\s*[\u2014\u2013]\s*/g, " - ")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, max);
}

/** TL (ondalıklı) -> kuruş. Geçersizse null. */
export function tlToKurus(v: number | null | undefined): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const k = Math.round(v * 100);
  return Math.abs(k) > 100_000_000_000 ? null : k;
}

function parseJson(text: string): unknown {
  // Şemalı yanıt düz JSON gelir; yine de kod çiti gelirse temizlenir.
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t);
}

// ---------- Fiş ----------

export const receiptModelSchema = {
  type: "object",
  properties: {
    isReceipt: { type: "boolean", description: "Görsel ya da belge bir fiş, fatura ya da ödeme dekontu mu." },
    merchant: { type: ["string", "null"], description: "Fişi kesen işletmenin adı. Ürün markası değil." },
    date: {
      type: ["string", "null"],
      description: "Fişte açıkça yazan işlem tarihi, yyyy-MM-dd. Fişte tarih yoksa ya da okunamıyorsa null.",
    },
    total: { type: ["number", "null"], description: "Ödenen genel toplam, TL, ondalık nokta ile (1.234,56 TL -> 1234.56)." },
    vat: { type: ["number", "null"], description: "Toplam KDV tutarı, TL. Yazmıyorsa null." },
    categoryKey: { type: "string", enum: RECEIPT_CATEGORY_KEYS },
    items: {
      type: "array",
      maxItems: 40,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          amount: { type: ["number", "null"], description: "Satır tutarı, TL." },
          quantity: { type: ["number", "null"] },
        },
        required: ["name", "amount", "quantity"],
      },
    },
    confidence: { type: "number", minimum: 0, maximum: 1, description: "Okumanın doğruluğuna güven, 0 ile 1 arası." },
  },
  required: ["isReceipt", "merchant", "date", "total", "vat", "categoryKey", "items", "confidence"],
} as const;

const receiptRaw = z.object({
  isReceipt: z.boolean(),
  merchant: z.string().nullable(),
  date: z.string().nullable(),
  total: z.number().nullable(),
  vat: z.number().nullable(),
  categoryKey: z.string(),
  items: z.array(z.object({ name: z.string(), amount: z.number().nullable(), quantity: z.number().nullable() })),
  confidence: z.number(),
});

export type ReceiptResult = {
  isReceipt: boolean;
  merchant: string | null;
  date: string | null;
  total: number | null;
  vat: number | null;
  categoryKey: ReceiptCategoryKey;
  items: { name: string; amount: number | null; quantity: number | null }[];
  confidence: number;
};

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Fiş tarihi kuralı: geçerli gün, 2000 ve sonrası, bugünden en fazla 1 gün ileri. Değilse null. */
export function sanitizeReceiptDate(date: string | null, today: string): string | null {
  if (!date) return null;
  const d = date.trim();
  if (!isValidLocalDate(d)) return null;
  if (d < "2000-01-01") return null;
  if (d > addDays(today, 1)) return null;
  return d;
}

export function parseReceipt(text: string, today: string): ReceiptResult {
  const raw = receiptRaw.parse(parseJson(text));
  const empty: ReceiptResult = {
    isReceipt: false,
    merchant: null,
    date: null,
    total: null,
    vat: null,
    categoryKey: FALLBACK_CATEGORY,
    items: [],
    confidence: Math.min(1, Math.max(0, raw.confidence)),
  };
  if (!raw.isReceipt) return empty;

  const total = tlToKurus(raw.total);
  const vat = tlToKurus(raw.vat);
  const category = (RECEIPT_CATEGORY_KEYS as readonly string[]).includes(raw.categoryKey)
    ? (raw.categoryKey as ReceiptCategoryKey)
    : FALLBACK_CATEGORY;
  const merchant = raw.merchant ? cleanText(raw.merchant, 80) : "";

  return {
    isReceipt: true,
    merchant: merchant || null,
    date: sanitizeReceiptDate(raw.date, today),
    total: total !== null && total > 0 ? total : null,
    vat: vat !== null && vat >= 0 && (total === null || vat <= total) ? vat : null,
    categoryKey: category,
    items: raw.items
      .slice(0, 40)
      .map((i) => ({
        name: cleanText(i.name, 80),
        amount: tlToKurus(i.amount),
        quantity: typeof i.quantity === "number" && Number.isFinite(i.quantity) && i.quantity > 0 ? i.quantity : null,
      }))
      .filter((i) => i.name.length > 0),
    confidence: Math.min(1, Math.max(0, raw.confidence)),
  };
}

// ---------- Rapor ----------

export const reportModelSchema = {
  type: "object",
  properties: {
    status: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Dönem durumunun 2-3 cümlelik özeti." },
        mood: { type: "string", enum: ["positive", "neutral", "critical"] },
      },
      required: ["summary", "mood"],
    },
    findings: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          categoryKey: { type: ["string", "null"], description: "Verilen kategori anahtarlarından biri ya da null." },
          suggestedCutPercent: { type: ["integer", "null"], minimum: 1, maximum: 100 },
        },
        required: ["title", "description", "categoryKey", "suggestedCutPercent"],
      },
    },
    note: { type: "string", description: "Kısa, motive edici kapanış notu." },
  },
  required: ["status", "findings", "suggestions", "note"],
} as const;

const reportRaw = z.object({
  status: z.object({ summary: z.string().min(1), mood: z.enum(["positive", "neutral", "critical"]) }),
  findings: z.array(z.string()).min(1),
  suggestions: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        categoryKey: z.string().nullable(),
        suggestedCutPercent: z.number().nullable(),
      }),
    )
    .min(1),
  note: z.string(),
});

export type ReportResult = {
  status: { summary: string; mood: "positive" | "neutral" | "critical" };
  findings: string[];
  suggestions: { title: string; description: string; categoryKey: string | null; suggestedCutPercent: number | null }[];
  note: string;
};

export function parseReport(text: string, allowedCategoryKeys: readonly string[]): ReportResult {
  const raw = reportRaw.parse(parseJson(text));
  return {
    status: { summary: cleanText(raw.status.summary, 600), mood: raw.status.mood },
    findings: raw.findings.slice(0, 4).map((f) => cleanText(f, 300)).filter(Boolean),
    suggestions: raw.suggestions.slice(0, 3).map((s) => {
      const cut = s.suggestedCutPercent;
      return {
        title: cleanText(s.title, 80),
        description: cleanText(s.description, 400),
        categoryKey: s.categoryKey && allowedCategoryKeys.includes(s.categoryKey) ? s.categoryKey : null,
        suggestedCutPercent: typeof cut === "number" && Number.isFinite(cut) && cut >= 1 && cut <= 100 ? Math.round(cut) : null,
      };
    }),
    note: cleanText(raw.note, 300),
  };
}

// ---------- Sohbet ----------

export function parseChat(text: string): { reply: string } {
  const reply = cleanText(text, 6000);
  if (!reply) throw new Error("empty");
  return { reply };
}
