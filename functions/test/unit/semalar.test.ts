import { describe, expect, it } from "vitest";
import { RECEIPT_CATEGORY_KEYS } from "../../src/kategoriler";
import { formatKurus } from "../../src/promptlar";
import {
  cleanText,
  parseReceipt,
  parseReport,
  receiptModelSchema,
  reportModelSchema,
  sanitizeReceiptDate,
  tlToKurus,
} from "../../src/semalar";

const ALLOWED_KEYS = new Set([
  "type", "properties", "required", "enum", "minimum", "maximum", "minItems", "maxItems",
  "items", "description", "title", "format", "additionalProperties", "prefixItems",
]);

function walk(node: unknown, path: string, out: string[]) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  for (const [k, v] of Object.entries(node)) {
    if (!ALLOWED_KEYS.has(k)) out.push(`${path}.${k}`);
    if (k === "properties") for (const [pk, pv] of Object.entries(v as object)) walk(pv, `${path}.${pk}`, out);
    else if (k === "items") walk(v, `${path}[]`, out);
  }
}

describe("model şemaları", () => {
  it("yalnız belgelenen JSON Schema anahtarlarını kullanır", () => {
    const bad: string[] = [];
    walk(receiptModelSchema, "receipt", bad);
    walk(reportModelSchema, "report", bad);
    expect(bad).toEqual([]);
  });
  it("her nesnede tüm alanlar required (model alan atlamasın)", () => {
    const check = (node: { properties?: Record<string, unknown>; required?: readonly string[] }) => {
      if (node.properties) expect([...(node.required ?? [])].sort()).toEqual(Object.keys(node.properties).sort());
    };
    check(receiptModelSchema as never);
    check(reportModelSchema as never);
    check(reportModelSchema.properties.suggestions.items as never);
    check(receiptModelSchema.properties.items.items as never);
  });
  it("fiş kategori listesi şemada", () => {
    expect(receiptModelSchema.properties.categoryKey.enum).toEqual(RECEIPT_CATEGORY_KEYS);
  });
});

const rawReceipt = (o: Record<string, unknown> = {}) =>
  JSON.stringify({
    isReceipt: true,
    merchant: "Migros",
    date: "2026-11-14",
    total: 1234.56,
    vat: 205.76,
    categoryKey: "market",
    items: [{ name: "Ekmek", amount: 15, quantity: 2 }],
    confidence: 0.9,
    ...o,
  });

describe("fiş yanıtı", () => {
  it("TL'yi kuruşa çevirir", () => {
    const r = parseReceipt(rawReceipt(), "2026-11-15");
    expect(r.total).toBe(123456);
    expect(r.vat).toBe(20576);
    expect(r.items[0]).toEqual({ name: "Ekmek", amount: 1500, quantity: 2 });
    expect(tlToKurus(0.1 + 0.2)).toBe(30);
  });
  it("tarihsiz fiş: tarih null kalır, bugün yazılmaz", () => {
    expect(parseReceipt(rawReceipt({ date: null }), "2026-11-15").date).toBeNull();
  });
  it("gelecek, bozuk ve çok eski tarih null olur", () => {
    expect(sanitizeReceiptDate("2026-11-16", "2026-11-15")).toBe("2026-11-16"); // saat dilimi payı
    expect(sanitizeReceiptDate("2026-11-17", "2026-11-15")).toBeNull();
    expect(sanitizeReceiptDate("2026-13-01", "2026-11-15")).toBeNull();
    expect(sanitizeReceiptDate("14.11.2026", "2026-11-15")).toBeNull();
    expect(sanitizeReceiptDate("1999-12-31", "2026-11-15")).toBeNull();
  });
  it("bilinmeyen kategori diger_gider, sıfır toplam null, KDV toplamı aşamaz", () => {
    const r = parseReceipt(rawReceipt({ categoryKey: "Gıda & Market", total: 0, vat: 5 }), "2026-11-15");
    expect(r.categoryKey).toBe("diger_gider");
    expect(r.total).toBeNull();
    expect(parseReceipt(rawReceipt({ total: 10, vat: 20 }), "2026-11-15").vat).toBeNull();
  });
  it("fiş değilse alanlar boş", () => {
    const r = parseReceipt(rawReceipt({ isReceipt: false }), "2026-11-15");
    expect(r).toMatchObject({ isReceipt: false, merchant: null, date: null, total: null, items: [] });
  });
  it("şemaya uymayan yanıt hata fırlatır (yedeğe düşülür)", () => {
    expect(() => parseReceipt("{bozuk", "2026-11-15")).toThrow();
    expect(() => parseReceipt(JSON.stringify({ isReceipt: true }), "2026-11-15")).toThrow();
  });
  it("satıcı adındaki em dash temizlenir", () => {
    expect(parseReceipt(rawReceipt({ merchant: "A101 \u2014 Şube" }), "2026-11-15").merchant).toBe("A101 - Şube");
  });
});

describe("rapor yanıtı", () => {
  const raw = (o: Record<string, unknown> = {}) =>
    JSON.stringify({
      status: { summary: "İyi gidiyor \u2013 devam.", mood: "positive" },
      findings: ["a", "b", "c", "d", "e"],
      suggestions: [
        { title: "Market", description: "Liste yap", categoryKey: "market", suggestedCutPercent: 15 },
        { title: "Uydurma", description: "x", categoryKey: "borsa", suggestedCutPercent: 500 },
      ],
      note: "Harika",
      ...o,
    });
  it("izinsiz kategori ve aralık dışı yüzde null olur, en fazla 4 tespit", () => {
    const r = parseReport(raw(), ["market", "yeme_icme"]);
    expect(r.findings).toHaveLength(4);
    expect(r.suggestions[0]).toMatchObject({ categoryKey: "market", suggestedCutPercent: 15 });
    expect(r.suggestions[1]).toMatchObject({ categoryKey: null, suggestedCutPercent: null });
    expect(r.status.summary).toBe("İyi gidiyor - devam.");
  });
  it("eksik alan hata", () => {
    expect(() => parseReport(JSON.stringify({ status: { summary: "x", mood: "ok" } }), [])).toThrow();
  });
});

describe("biçim", () => {
  it("kuruş -> ₺ metni", () => {
    expect(formatKurus(1248050)).toBe("₺12.480,50");
    expect(formatKurus(-500)).toBe("-₺5,00");
    expect(formatKurus(5)).toBe("₺0,05");
    expect(formatKurus(100000000)).toBe("₺1.000.000,00");
  });
  it("tire temizliği", () => {
    expect(cleanText("a\u2014b \u2013 c", 100)).toBe("a - b - c");
  });
});
