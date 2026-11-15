import { describe, expect, it } from "vitest";
import { base64DecodedBytes, isValidLocalDate, parseAiRequest } from "../../src/sozlesme";
import { context, expectCode, JPEG_B64, PNG_B64 } from "./yardimci";

const receipt = (image: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  op: "receipt",
  image,
  today: "2026-11-15",
  timeZone: "Europe/Istanbul",
  ...extra,
});

describe("istek doğrulama", () => {
  it("geçerli fiş isteğini kabul eder", () => {
    const r = parseAiRequest(receipt({ mimeType: "image/jpeg", data: JPEG_B64 }));
    expect(r.op).toBe("receipt");
  });

  it("bilinmeyen işlem INVALID_REQUEST", async () => {
    await expectCode(() => parseAiRequest({ op: "sil" }), "INVALID_REQUEST");
    await expectCode(() => parseAiRequest(null), "INVALID_REQUEST");
    await expectCode(() => parseAiRequest("metin"), "INVALID_REQUEST");
  });

  it("izinsiz tür UNSUPPORTED_FILE (gif, heic)", async () => {
    await expectCode(() => parseAiRequest(receipt({ mimeType: "image/gif", data: JPEG_B64 })), "UNSUPPORTED_FILE");
    await expectCode(() => parseAiRequest(receipt({ mimeType: "image/heic", data: JPEG_B64 })), "UNSUPPORTED_FILE");
  });

  it("PDF kabul, başı %PDF- değilse UNSUPPORTED_FILE, 4 MB üstü TOO_LARGE", async () => {
    const pdf = Buffer.from("%PDF-1.7\n%xxxx\n").toString("base64");
    const r = parseAiRequest({ op: "receipt", file: { mimeType: "application/pdf", data: pdf }, today: "2026-11-15", timeZone: "Europe/Istanbul" });
    if (r.op !== "receipt") throw new Error();
    expect(r.file.mimeType).toBe("application/pdf");
    await expectCode(() => parseAiRequest(receipt({ mimeType: "application/pdf", data: JPEG_B64 })), "UNSUPPORTED_FILE");
    const big = pdf.slice(0, 12) + "A".repeat(Math.ceil((4.1 * 1024 * 1024 * 4) / 3 / 4) * 4);
    await expectCode(() => parseAiRequest(receipt({ mimeType: "application/pdf", data: big })), "TOO_LARGE");
  });

  it("file ve eski image adı: ikisinden yalnız biri", async () => {
    const img = { mimeType: "image/jpeg", data: JPEG_B64 };
    expect(parseAiRequest({ op: "receipt", file: img, today: "2026-11-15", timeZone: "Europe/Istanbul" }).op).toBe("receipt");
    await expectCode(() => parseAiRequest({ op: "receipt", file: img, image: img, today: "2026-11-15", timeZone: "Europe/Istanbul" }), "INVALID_REQUEST");
    await expectCode(() => parseAiRequest({ op: "receipt", today: "2026-11-15", timeZone: "Europe/Istanbul" }), "INVALID_REQUEST");
  });

  it("bildirilen tür ile dosya başı uyuşmazsa UNSUPPORTED_FILE", async () => {
    await expectCode(() => parseAiRequest(receipt({ mimeType: "image/jpeg", data: PNG_B64 })), "UNSUPPORTED_FILE");
    expect(parseAiRequest(receipt({ mimeType: "image/png", data: PNG_B64 })).op).toBe("receipt");
  });

  it("bozuk base64 ve data: öneki reddedilir", async () => {
    await expectCode(() => parseAiRequest(receipt({ mimeType: "image/jpeg", data: "data:image/jpeg;base64," + JPEG_B64 })), "INVALID_REQUEST");
    await expectCode(() => parseAiRequest(receipt({ mimeType: "image/jpeg", data: "@@@@" })), "INVALID_REQUEST");
    await expectCode(() => parseAiRequest(receipt({ mimeType: "image/jpeg", data: "" })), "INVALID_REQUEST");
  });

  it("5 MB üstü görsel TOO_LARGE, 8 MB üstü istek TOO_LARGE", async () => {
    const big = JPEG_B64.slice(0, 20) + "A".repeat(Math.ceil((5.1 * 1024 * 1024 * 4) / 3 / 4) * 4);
    expect(base64DecodedBytes(big)).toBeGreaterThan(5 * 1024 * 1024);
    await expectCode(() => parseAiRequest(receipt({ mimeType: "image/jpeg", data: big })), "TOO_LARGE");
    const huge = receipt({ mimeType: "image/jpeg", data: JPEG_B64 }, { pad: "x".repeat(9 * 1024 * 1024) });
    await expectCode(() => parseAiRequest(huge), "TOO_LARGE");
  });

  it("geçersiz tarih ve saat dilimi reddedilir", async () => {
    await expectCode(() => parseAiRequest(receipt({ mimeType: "image/jpeg", data: JPEG_B64 }, { today: "2026-02-30" })), "INVALID_REQUEST");
    await expectCode(() => parseAiRequest(receipt({ mimeType: "image/jpeg", data: JPEG_B64 }, { timeZone: "Mars/Olympus" })), "INVALID_REQUEST");
    expect(isValidLocalDate("2028-02-29")).toBe(true);
    expect(isValidLocalDate("2026-02-29")).toBe(false);
    expect(isValidLocalDate("15.11.2026")).toBe(false);
  });

  it("rapor: tutar kuruş tamsayı olmalı, dönem başı sonu aşamaz", async () => {
    expect(parseAiRequest({ op: "report", context: context() }).op).toBe("report");
    const ctx = context();
    (ctx.totals as Record<string, unknown>).balance = 12.5;
    await expectCode(() => parseAiRequest({ op: "report", context: ctx }), "INVALID_REQUEST");
    const ters = context({ period: { name: "x", start: "2026-12-01", end: "2026-11-01", remainingDays: 0 } });
    await expectCode(() => parseAiRequest({ op: "report", context: ters }), "INVALID_REQUEST");
  });

  it("hata ayrıntısı yalnız alan yollarını taşır", async () => {
    const e = await expectCode(() => parseAiRequest({ op: "report", context: { today: "x" } }), "INVALID_REQUEST");
    const details = e.details as { fields: string[] };
    expect(Array.isArray(details.fields)).toBe(true);
    expect(JSON.stringify(details)).not.toContain("Expected");
  });

  it("sohbet: son 12 mesaj alınır, son mesaj kullanıcıdan olmalı", async () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "model", text: `m${i}` }));
    messages.push({ role: "user", text: "son" });
    const r = parseAiRequest({ op: "chat", mode: "advisor", messages });
    if (r.op !== "chat") throw new Error();
    expect(r.messages).toHaveLength(12);
    expect(r.messages[11].text).toBe("son");
    await expectCode(
      () => parseAiRequest({ op: "chat", mode: "advisor", messages: [{ role: "user", text: "a" }, { role: "model", text: "b" }] }),
      "INVALID_REQUEST",
    );
    await expectCode(() => parseAiRequest({ op: "chat", mode: "advisor", messages: [{ role: "user", text: "x".repeat(2001) }] }), "INVALID_REQUEST");
  });
});
