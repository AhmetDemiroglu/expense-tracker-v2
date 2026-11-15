import { describe, expect, it } from "vitest";
import { handleAi, type AiDeps } from "../../src/ai";
import type { FetchLike } from "../../src/gemini";
import { MemoryQuotaStore } from "../../src/kota";
import { context, expectCode, JPEG_B64 } from "./yardimci";

function deps(responses: Array<{ status: number; body: unknown }>) {
  const bodies: Record<string, unknown>[] = [];
  let i = 0;
  const fetch: FetchLike = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    const r = responses[i++] ?? { status: 500, body: {} };
    return { ok: r.status === 200, status: r.status, json: async () => r.body, text: async () => "" };
  };
  const quota = new MemoryQuotaStore();
  const d: AiDeps = {
    quota,
    gemini: { apiKey: "k", fetch, timeoutMs: 1000, logger: { info: () => {}, warn: () => {} } },
    now: () => new Date("2026-11-15T09:00:00Z"),
  };
  return { d, quota, bodies, calls: () => i };
}

const textResponse = (text: string) => ({ status: 200, body: { candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }] } });

const receiptReq = { op: "receipt", image: { mimeType: "image/jpeg", data: JPEG_B64 }, today: "2026-11-15", timeZone: "Europe/Istanbul" };
const receiptJson = JSON.stringify({
  isReceipt: true, merchant: "BİM", date: null, total: 45.5, vat: null, categoryKey: "market", items: [], confidence: 0.8,
});

describe("aiProxy", () => {
  it("oturumsuz ve anonim çağrı AUTH_REQUIRED, Gemini çağrılmaz", async () => {
    const t = deps([]);
    await expectCode(handleAi(null, receiptReq, t.d), "AUTH_REQUIRED");
    await expectCode(handleAi({ uid: "a", signInProvider: "anonymous" }, receiptReq, t.d), "AUTH_REQUIRED");
    expect(t.calls()).toBe(0);
  });

  it("fiş: başarılı yanıt, kuruş, tarih null, kota bilgisi", async () => {
    const t = deps([textResponse(receiptJson)]);
    const r = await handleAi({ uid: "u1", signInProvider: "google.com" }, receiptReq, t.d);
    expect(r).toMatchObject({ isReceipt: true, merchant: "BİM", date: null, total: 4550, model: "gemini-3.5-flash-lite", usage: { op: "receipt", used: 1, limit: 30 } });
    // Görsel ve bugünün tarihi modele gidiyor, şema isteniyor.
    const body = t.bodies[0] as { contents: { parts: Record<string, unknown>[] }[]; generationConfig: Record<string, unknown> };
    expect(body.contents[0].parts[0]).toEqual({ inlineData: { mimeType: "image/jpeg", data: JPEG_B64 } });
    expect(JSON.stringify(body.contents[0].parts[1])).toContain("2026-11-15");
    expect(body.generationConfig.responseJsonSchema).toBeTruthy();
  });

  it("AI iki modelde de düşerse kota iade edilir", async () => {
    const t = deps([{ status: 503, body: {} }, { status: 503, body: {} }]);
    await expectCode(handleAi({ uid: "u1" }, receiptReq, t.d), "AI_UNAVAILABLE");
    expect(t.quota.docs.get("u1")?.receipt).toBe(0);
  });

  it("geçersiz istek kota yemez", async () => {
    const t = deps([]);
    await expectCode(handleAi({ uid: "u1" }, { op: "receipt" }, t.d), "INVALID_REQUEST");
    expect(t.quota.docs.size).toBe(0);
  });

  it("kota dolunca Gemini çağrılmaz", async () => {
    const t = deps([]);
    t.quota.docs.set("u1", { day: "2026-11-15", report: 10 });
    await expectCode(handleAi({ uid: "u1" }, { op: "report", context: context() }, t.d), "QUOTA_EXCEEDED");
    expect(t.calls()).toBe(0);
  });

  it("rapor: prompt sayıları biçimli taşır ve sayı uydurmama kuralını içerir", async () => {
    const report = JSON.stringify({
      status: { summary: "İyi", mood: "positive" },
      findings: ["a", "b"],
      suggestions: [{ title: "t", description: "d", categoryKey: "market", suggestedCutPercent: 10 }],
      note: "n",
    });
    const t = deps([textResponse(report)]);
    const r = await handleAi({ uid: "u1" }, { op: "report", context: context() }, t.d);
    expect(r).toMatchObject({ status: { mood: "positive" }, usage: { op: "report", used: 1, limit: 10 } });
    const body = t.bodies[0] as { systemInstruction: { parts: { text: string }[] }; contents: { parts: { text: string }[] }[] };
    const system = body.systemInstruction.parts[0].text;
    expect(system).toContain("Sayıları sen hesaplamazsın");
    expect(system).toContain("Yatırım tavsiyesi verme");
    expect(system).toContain("Uzun tire");
    expect(body.contents[0].parts[0].text).toContain("₺17.999,50");
  });

  it("sohbet: geçmiş rollerle gider, yanıt düz metin, em dash temizlenir", async () => {
    const t = deps([textResponse("Merhaba \u2014 nasılsın?")]);
    const r = await handleAi(
      { uid: "u1" },
      { op: "chat", mode: "tutor", messages: [{ role: "user", text: "selam" }, { role: "model", text: "selam" }, { role: "user", text: "faiz ne?" }] },
      t.d,
    );
    expect(r).toMatchObject({ reply: "Merhaba - nasılsın?", usage: { op: "chat", used: 1, limit: 60 } });
    const body = t.bodies[0] as { contents: { role: string }[]; generationConfig: Record<string, unknown> };
    expect(body.contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(body.generationConfig.responseJsonSchema).toBeUndefined();
  });
});

describe("aiProxy kota iadesi ve kırpma", () => {
  it("içerik hatası (AI_BAD_RESPONSE) hakkı iade etmez", async () => {
    const t = deps([textResponse("bozuk"), textResponse("bozuk")]);
    await expectCode(handleAi({ uid: "u1" }, receiptReq, t.d), "AI_BAD_RESPONSE");
    expect(t.quota.docs.get("u1")?.receipt).toBe(1);
  });

  it("sohbet: sınıra takılan ama dolu yanıt kabul edilir, yedeğe düşülmez", async () => {
    const t = deps([{ status: 200, body: { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "Uzun cevabın başı" }] } }] } }]);
    const r = await handleAi({ uid: "u1" }, { op: "chat", mode: "advisor", messages: [{ role: "user", text: "anlat" }] }, t.d);
    expect(r).toMatchObject({ reply: "Uzun cevabın başı", model: "gemini-3.5-flash-lite" });
    expect(t.calls()).toBe(1);
  });

  it("rapor bağlamında uzun açıklama ve fazla satır reddedilmez, kırpılır", async () => {
    const report = JSON.stringify({ status: { summary: "x", mood: "neutral" }, findings: ["a", "b"], suggestions: [{ title: "t", description: "d", categoryKey: null, suggestedCutPercent: null }], note: "n" });
    const t = deps([textResponse(report)]);
    const recent = Array.from({ length: 45 }, (_, i) => ({ date: "2026-11-14", categoryName: "Market & Pazar", amount: 100 + i, type: "expense", description: "A".repeat(150) }));
    await handleAi({ uid: "u1" }, { op: "report", context: context({ recent }) }, t.d);
    const text = (t.bodies[0] as { contents: { parts: { text: string }[] }[] }).contents[0].parts[0].text;
    expect(text.match(/\| gider \|/g)).toHaveLength(30);
    expect(text).toContain("A".repeat(80) + "\n");
    expect(text).not.toContain("A".repeat(81));
  });
});
