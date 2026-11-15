import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { handleAi, type AiDeps } from "../../src/ai";
import type { FetchLike } from "../../src/gemini";
import { MemoryQuotaStore } from "../../src/kota";
import { pagesToKeep, preparePdf } from "../../src/pdf";
import { expectCode } from "./yardimci";

async function makePdf(pages: number): Promise<string> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) doc.addPage([300, 400]).drawText(`Sayfa ${i}`, { x: 20, y: 350, font, size: 14 });
  return Buffer.from(await doc.save()).toString("base64");
}

async function pageTexts(b64: string): Promise<number> {
  return (await PDFDocument.load(Buffer.from(b64, "base64"))).getPageCount();
}

describe("PDF hazırlığı", () => {
  it("tutulacak sayfalar: ilk 2 ve son 1", () => {
    expect(pagesToKeep(1)).toEqual([1]);
    expect(pagesToKeep(3)).toEqual([1, 2, 3]);
    expect(pagesToKeep(4)).toEqual([1, 2, 4]);
    expect(pagesToKeep(12)).toEqual([1, 2, 12]);
  });

  it("kısa PDF olduğu gibi kalır, uzun PDF 3 sayfaya iner", async () => {
    const short = await makePdf(2);
    expect(await preparePdf(short)).toEqual({ data: short, pageCount: 2, keptPages: [1, 2] });
    const long = await preparePdf(await makePdf(7));
    expect(long.pageCount).toBe(7);
    expect(long.keptPages).toEqual([1, 2, 7]);
    expect(await pageTexts(long.data)).toBe(3);
  });

  it("bozuk PDF UNSUPPORTED_FILE", async () => {
    await expectCode(preparePdf(Buffer.from("%PDF-1.7\nbozuk").toString("base64")), "UNSUPPORTED_FILE");
  });
});

describe("aiProxy PDF fişi", () => {
  function setup() {
    const bodies: Record<string, unknown>[] = [];
    const fetch: FetchLike = async (_u, init) => {
      bodies.push(JSON.parse(init.body));
      const text = JSON.stringify({ isReceipt: true, merchant: "Türk Telekom", date: "2026-11-01", total: 499.9, vat: 83.32, categoryKey: "faturalar", items: [], confidence: 0.9 });
      return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }] }), text: async () => "" };
    };
    const quota = new MemoryQuotaStore();
    const d: AiDeps = { quota, gemini: { apiKey: "k", fetch, timeoutMs: 1000, logger: { info: () => {}, warn: () => {} } }, now: () => new Date("2026-11-15T09:00:00Z") };
    return { d, quota, bodies };
  }
  const req = (data: string) => ({ op: "receipt", file: { mimeType: "application/pdf", data }, today: "2026-11-15", timeZone: "Europe/Istanbul" });

  it("PDF belge olarak gider, uzun faturada kırpılır ve prompt sayfaları söyler", async () => {
    const t = setup();
    const r = await handleAi({ uid: "u1" }, req(await makePdf(5)), t.d);
    expect(r).toMatchObject({ total: 49990, categoryKey: "faturalar", usage: { used: 1 } });
    const parts = (t.bodies[0] as { contents: { parts: Record<string, { mimeType?: string; data?: string } | string>[] }[] }).contents[0].parts;
    const inline = parts[0].inlineData as { mimeType: string; data: string };
    expect(inline.mimeType).toBe("application/pdf");
    expect(await pageTexts(inline.data)).toBe(3);
    expect(parts[1].text).toContain("Belge 5 sayfa");
    expect(parts[1].text).toContain("son sayfadadır");
  });

  it("okunamayan PDF kota yemez", async () => {
    const t = setup();
    await expectCode(handleAi({ uid: "u1" }, req(Buffer.from("%PDF-1.4\nxx").toString("base64")), t.d), "UNSUPPORTED_FILE");
    expect(t.quota.docs.size).toBe(0);
    expect(t.bodies).toHaveLength(0);
  });
});
