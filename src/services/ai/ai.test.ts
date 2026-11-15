import { describe, expect, it } from "vitest";
import { categoryBreakdown, computeBudget, effectiveTransactions, type LocalDate, type Period, type Transaction } from "@/core";
import { finansBaglamiKur } from "./baglam";
import { aiHatasinaCevir, fisYanitiOku, raporYanitiOku, sohbetYanitiOku } from "./sema";
import { sahteFis } from "./sahte";

const D = (s: string) => s as LocalDate;

describe("fiş yanıtı şeması", () => {
  it("geçerli yanıt: sunucu kategori anahtarı çekirdeğe çevrilir, kuruş korunur", () => {
    const r = fisYanitiOku({
      isReceipt: true, merchant: "Örnek Market", date: "2026-11-14", total: 34_750, vat: 3_159, categoryKey: "kira_aidat",
      items: [{ name: "Süt", amount: 4_250, quantity: 2 }, { name: "", amount: 1 }, "bozuk"], confidence: 1.4, model: "m",
      usage: { op: "receipt", used: 3, limit: 30 },
    });
    expect(r).toMatchObject({ fisMi: true, isletme: "Örnek Market", tarih: "2026-11-14", toplam: 34_750, kdv: 3_159, kategori: "kira", guven: 1 });
    expect(r.kalemler).toEqual([{ ad: "Süt", tutar: 4_250, adet: 2 }]);
    expect(r.kullanim).toEqual({ kullanilan: 3, sinir: 30 });
    expect(fisYanitiOku({ isReceipt: true, categoryKey: "faturalar" }).kategori).toBe("fatura");
    expect(fisYanitiOku({ isReceipt: true, categoryKey: "borc_odeme" }).kategori).toBe("borc");
    expect(fisYanitiOku({ isReceipt: true, categoryKey: "diger_gider" }).kategori).toBe("diger");
  });

  it("fiş değil: hata değil, alanlar boş", () => {
    const r = fisYanitiOku({ isReceipt: false, merchant: "x", total: 100, items: [{ name: "a" }], categoryKey: "market" });
    expect(r).toMatchObject({ fisMi: false, isletme: null, toplam: null, kalemler: [] });
  });

  it("bozuk tarih ve tutar null olur; isReceipt yoksa BOZUK_YANIT", () => {
    const r = fisYanitiOku({ isReceipt: true, date: "2026-02-30", total: -5, vat: 1.5 });
    expect(r).toMatchObject({ tarih: null, toplam: null, kdv: null });
    expect(() => fisYanitiOku(null)).toThrow(expect.objectContaining({ kod: "BOZUK_YANIT" }));
    expect(() => fisYanitiOku({ merchant: "x" })).toThrow(expect.objectContaining({ kod: "BOZUK_YANIT" }));
  });
});

describe("rapor ve sohbet şeması", () => {
  it("rapor: geçersiz ruh hali nötr, bilinmeyen kategori null, yüzde sınırlı", () => {
    const r = raporYanitiOku({
      status: { summary: "İyi gidiyor.", mood: "harika" },
      findings: ["a", 3, "b"],
      suggestions: [
        { title: "Market", description: "Azalt", categoryKey: "market", suggestedCutPercent: 10 },
        { title: "Diğer", description: "", categoryKey: "yok_boyle", suggestedCutPercent: 150 },
        { description: "başlıksız" },
      ],
      note: "Not",
      usage: { used: 1, limit: 10 },
    });
    expect(r.durum).toEqual({ ozet: "İyi gidiyor.", ruhHali: "neutral" });
    expect(r.tespitler).toEqual(["a", "b"]);
    expect(r.oneriler).toEqual([
      { baslik: "Market", aciklama: "Azalt", kategori: "market", kesintiYuzdesi: 10 },
      { baslik: "Diğer", aciklama: "", kategori: null, kesintiYuzdesi: null },
    ]);
    expect(() => raporYanitiOku({ findings: [] })).toThrow(expect.objectContaining({ kod: "BOZUK_YANIT" }));
  });

  it("sohbet: boş yanıt bozuk sayılır", () => {
    expect(sohbetYanitiOku({ reply: "Merhaba", usage: { used: 2, limit: 60 } })).toEqual({ yanit: "Merhaba", kullanim: { kullanilan: 2, sinir: 60 } });
    expect(() => sohbetYanitiOku({ reply: "  " })).toThrow(expect.objectContaining({ kod: "BOZUK_YANIT" }));
  });
});

describe("AI hata eşleme", () => {
  it("details.code esas alınır, Türkçe mesaj seçilir, ham mesaj gösterilmez", () => {
    const kota = aiHatasinaCevir({ code: "functions/resource-exhausted", message: "raw", details: { code: "QUOTA_EXCEEDED", resetsAt: "2026-11-15T21:00:00.000Z" } });
    expect(kota).toMatchObject({ kod: "QUOTA_EXCEEDED", sifirlanma: "2026-11-15T21:00:00.000Z", tekrarDenenebilir: false });
    expect(kota.mesaj).toContain("Yarın");
    expect(aiHatasinaCevir({ code: "functions/unavailable", details: { code: "AI_UNAVAILABLE" } })).toMatchObject({ kod: "AI_UNAVAILABLE", tekrarDenenebilir: true });
    expect(aiHatasinaCevir({ code: "functions/internal", details: { code: "AI_BAD_RESPONSE" } }).mesaj).toContain("elle");
    expect(aiHatasinaCevir({ code: "functions/unauthenticated", details: { code: "AUTH_REQUIRED" } }).kod).toBe("AUTH_REQUIRED");
    expect(aiHatasinaCevir({ code: "functions/invalid-argument", details: { code: "TOO_LARGE" } }).kod).toBe("TOO_LARGE");
    expect(aiHatasinaCevir({ code: "functions/internal", message: "internal" }, true).kod).toBe("AG_YOK");
    expect(aiHatasinaCevir({ code: "functions/not-found" }).kod).toBe("AI_UNAVAILABLE");
    for (const e of [kota, aiHatasinaCevir(new Error("x"))]) expect(e.mesaj).not.toMatch(/[—–]/);
  });
});

describe("FinanceContext", () => {
  it("sayılar çekirdekten, P2 eşlemesiyle (extraIncome = incomeTx, savingsRatePercent = savingsRate)", () => {
    const donem: Period = { id: "p", userId: "u", name: "Kasım", start: D("2026-11-01"), end: D("2026-11-30"), plannedIncome: 3_000_000, fixedExpenses: 500_000 };
    const islemler: Transaction[] = [
      { id: "a", userId: "u", description: "Market (Otomatik)", amount: 64_000, type: "expense", category: "market", date: D("2026-11-10"), createdAt: 1 },
      { id: "b", userId: "u", description: "Ek iş", amount: 100_000, type: "income", category: "ek_is", date: D("2026-11-05"), createdAt: 2 },
      { id: "c", userId: "u", description: "Gelecek", amount: 1_000, type: "expense", category: "market", date: D("2026-11-20"), createdAt: 3 },
    ];
    const girdi = { period: donem, transactions: islemler, recurrences: [], today: D("2026-11-15") };
    const ozet = computeBudget(girdi);
    const ctx = finansBaglamiKur({
      bugun: D("2026-11-15"), donem, ozet, kategoriler: categoryBreakdown(girdi), duzenliler: [],
      islemler: effectiveTransactions(islemler), donemOzetleri: [], ayarlar: null, ad: "Deneme Kullanıcı", stil: "short",
    });
    expect(ctx.totals).toEqual({
      plannedIncome: ozet.plannedIncome, extraIncome: ozet.incomeTx, planned: ozet.planned, discretionary: ozet.discretionary,
      balance: ozet.balance, dailyLimit: ozet.dailyLimit, todayRemaining: ozet.todayRemaining, savingsRatePercent: ozet.savingsRate,
    });
    expect(ctx.period).toEqual({ name: "Kasım", start: "2026-11-01", end: "2026-11-30", remainingDays: ozet.remainingDays });
    expect(ctx.userName).toBe("Deneme");
    expect(ctx.recent.map((r) => r.description)).toEqual(["Market", "Ek iş"]); // gelecek tarihli yok, " (Otomatik)" eksiz
    expect(ctx.categories[0]).toMatchObject({ key: "market", name: expect.any(String) });
    expect(ctx.style).toBe("short");
  });
});

describe("sahte sağlayıcı", () => {
  it("görsel ve PDF örneği aynı doğrulayıcıdan geçer", async () => {
    const g = fisYanitiOku(await sahteFis("2026-11-15"));
    const p = fisYanitiOku(await sahteFis("2026-11-15", true));
    expect(g).toMatchObject({ fisMi: true, kategori: "market", tarih: "2026-11-15" });
    expect(p).toMatchObject({ fisMi: true, kategori: "fatura", toplam: 84_990 });
  });
});
