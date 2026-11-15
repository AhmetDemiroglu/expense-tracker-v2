import { describe, expect, it } from "vitest";
import { buildBody, generate, type FetchLike, type GeminiDeps } from "../../src/gemini";
import { MODEL_CHAIN, thinkingLevelFor } from "../../src/modeller";
import { expectCode } from "./yardimci";

type Call = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

function fakeFetch(responses: Array<{ status: number; body: unknown } | Error>): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  let i = 0;
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    const r = responses[i++];
    if (r instanceof Error) throw r;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    };
  };
  return { fetch, calls };
}

const ok = (text: string, finishReason = "STOP") => ({
  status: 200,
  body: { candidates: [{ finishReason, content: { parts: [{ text: "düşünce", thought: true }, { text }] } }] },
});

const deps = (fetch: FetchLike): GeminiDeps => ({
  apiKey: "TEST_KEY",
  fetch,
  timeoutMs: 1000,
  logger: { info: () => {}, warn: () => {} },
});

const req = { systemInstruction: "s", contents: [{ role: "user" as const, parts: [{ text: "x" }] }], maxOutputTokens: 100, thinking: "MINIMAL" as const };
const asJson = (t: string) => JSON.parse(t) as { a: number };

describe("gemini istemcisi", () => {
  it("anahtar başlıkta, URL'de yok; birincil model önce", async () => {
    const f = fakeFetch([ok('{"a":1}')]);
    const r = await generate(deps(f.fetch), req, asJson);
    expect(r).toEqual({ value: { a: 1 }, model: MODEL_CHAIN[0] });
    expect(f.calls[0].url).not.toContain("TEST_KEY");
    expect(f.calls[0].url).toContain(`${MODEL_CHAIN[0]}:generateContent`);
    expect(f.calls[0].headers["x-goog-api-key"]).toBe("TEST_KEY");
  });

  it("düşünce parçaları yanıta girmez", async () => {
    const f = fakeFetch([ok("merhaba")]);
    expect((await generate(deps(f.fetch), req, (t) => t)).value).toBe("merhaba");
  });

  it("503'te yedeğe düşer", async () => {
    const f = fakeFetch([{ status: 503, body: { error: { message: "overloaded" } } }, ok('{"a":2}')]);
    const r = await generate(deps(f.fetch), req, asJson);
    expect(r.model).toBe(MODEL_CHAIN[1]);
  });

  it("RECITATION, SAFETY, MAX_TOKENS ve boş yanıtta yedeğe düşer", async () => {
    for (const finish of ["RECITATION", "SAFETY", "MAX_TOKENS"]) {
      const f = fakeFetch([ok('{"a":1}', finish), ok('{"a":3}')]);
      expect((await generate(deps(f.fetch), req, asJson)).model).toBe(MODEL_CHAIN[1]);
    }
    const f = fakeFetch([{ status: 200, body: { candidates: [] } }, ok('{"a":3}')]);
    expect((await generate(deps(f.fetch), req, asJson)).model).toBe(MODEL_CHAIN[1]);
  });

  it("şemaya uymayan yanıtta yedeğe düşer", async () => {
    const f = fakeFetch([ok("bozuk json"), ok('{"a":4}')]);
    expect((await generate(deps(f.fetch), req, asJson)).value).toEqual({ a: 4 });
  });

  it("ikisi de ağ/sunucu hatası: AI_UNAVAILABLE, ham hata istemciye dönmez", async () => {
    const f = fakeFetch([{ status: 429, body: { error: { message: "GIZLI_AYRINTI" } } }, new Error("ECONNRESET")]);
    const e = await expectCode(generate(deps(f.fetch), req, asJson), "AI_UNAVAILABLE");
    expect(JSON.stringify({ m: e.message, d: e.details })).not.toContain("GIZLI_AYRINTI");
  });

  it("ikisi de içerik hatası: AI_BAD_RESPONSE", async () => {
    const f = fakeFetch([ok("x"), { status: 200, body: { promptFeedback: { blockReason: "SAFETY" } } }]);
    await expectCode(generate(deps(f.fetch), req, asJson), "AI_BAD_RESPONSE");
  });

  it("düşünme düzeyi model başına: 3.8 Flash'ta MINIMAL yok, LOW gider", async () => {
    expect(thinkingLevelFor("gemini-3.5-flash-lite", "MINIMAL")).toBe("MINIMAL");
    expect(thinkingLevelFor("gemini-3.8-flash", "MINIMAL")).toBe("LOW");
    const f = fakeFetch([{ status: 500, body: {} }, ok("x")]);
    await generate(deps(f.fetch), req, (t) => t);
    const level = (b: Record<string, unknown>) => (b.generationConfig as { thinkingConfig: { thinkingLevel: string } }).thinkingConfig.thinkingLevel;
    expect(level(f.calls[0].body)).toBe("MINIMAL");
    expect(level(f.calls[1].body)).toBe("LOW");
  });

  it("gövde: temperature yok, şema varsa responseJsonSchema ve JSON MIME", () => {
    const b = buildBody("gemini-3.5-flash-lite", { ...req, responseJsonSchema: { type: "object" } });
    const gc = b.generationConfig as Record<string, unknown>;
    expect(gc.temperature).toBeUndefined();
    expect(gc.responseMimeType).toBe("application/json");
    expect(gc.responseJsonSchema).toEqual({ type: "object" });
    expect(gc.maxOutputTokens).toBe(100);
    expect(b.systemInstruction).toEqual({ parts: [{ text: "s" }] });
    const plain = buildBody("gemini-3.5-flash-lite", req).generationConfig as Record<string, unknown>;
    expect(plain.responseMimeType).toBeUndefined();
  });
});
