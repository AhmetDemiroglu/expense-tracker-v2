import { describe, expect, it } from "vitest";
import type { LocalDate, Transaction } from "@/core";
import { girisHatasinaCevir, silmeHatasinaCevir } from "./auth/hatalar";
import { BOM, CSV_BASLIK, csvDosyaAdi, csvHucre, islemlerCsv } from "./disaAktar";
import { base64Bayt, hedefBoyut } from "./kamera";

const D = (s: string) => s as LocalDate;

describe("CSV", () => {
  const islemler: Transaction[] = [
    { id: "1", userId: "u", description: "Market; haftalık", amount: 123_456, type: "expense", category: "market", date: D("2026-11-05"), createdAt: 1 },
    { id: "2", userId: "u", description: "Maaş", amount: 4_500_000, type: "income", category: "maas", date: D("2026-11-01"), createdAt: 2 },
    { id: "3", userId: "u", description: '=HYPERLINK("x")', amount: 50, type: "expense", category: "diger", date: D("2026-11-02"), createdAt: 3, planned: true },
    { id: "4", userId: "u", description: "Netflix (Otomatik)", amount: 19_999, type: "expense", category: "abonelik", date: D("2026-11-03"), createdAt: 4, recurringId: "r", dueDate: D("2026-11-03") },
    { id: "5", userId: "u", description: "TV (2/6)", amount: 500_000, type: "expense", category: "teknoloji", date: D("2026-12-03"), createdAt: 5, installmentGroupId: "g", installmentIndex: 2, installmentCount: 6 },
  ];
  const csv = islemlerCsv(islemler);
  const satirlar = csv.slice(1).split("\r\n");

  it("UTF-8 BOM, CRLF, ';' ayraç, Türkçe başlık", () => {
    expect(csv.startsWith(BOM)).toBe(true);
    expect(satirlar[0]).toBe(CSV_BASLIK.join(";"));
    expect(satirlar[0]).toContain("Açıklama");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("tarih gg.aa.yyyy, tutar virgüllü ve gider eksi, ayraç içeren hücre tırnaklı", () => {
    expect(satirlar[1]).toBe('05.11.2026;Gider;' + satirlar[1]?.split(";")[2] + ';"Market; haftalık";-1234,56;;;');
    expect(satirlar[2]?.split(";")[4]).toBe("45000");
  });

  it("formül enjeksiyonu engellenir, otomatik eki kaldırılır, taksit ve işaretler yazılır", () => {
    expect(satirlar[3]).toContain(`"'=HYPERLINK(""x"")"`);
    expect(satirlar[3]?.endsWith(";Evet")).toBe(true);
    expect(satirlar[4]?.split(";")[3]).toBe("Netflix");
    expect(satirlar[4]?.split(";")[6]).toBe("Evet");
    expect(satirlar[5]?.split(";")[5]).toBe("2/6");
  });

  it("hücre kaçışı ve dosya adı", () => {
    expect(csvHucre('a"b')).toBe('"a""b"');
    expect(csvHucre("-500", false)).toBe("-500");
    expect(csvHucre("+90 555")).toBe("'+90 555");
    expect(csvDosyaAdi(D("2026-11-15"))).toBe("fintel-kayitlar-2026-11-15.csv");
  });
});

describe("kamera yardımcıları", () => {
  it("uzun kenar 1600'e küçülür, oran korunur, küçük görsel büyütülmez", () => {
    expect(hedefBoyut(4032, 3024)).toEqual({ w: 1600, h: 1200 });
    expect(hedefBoyut(3000, 6000)).toEqual({ w: 800, h: 1600 });
    expect(hedefBoyut(800, 600)).toEqual({ w: 800, h: 600 });
  });

  it("base64 bayt sayısı", () => {
    expect(base64Bayt("TWFu")).toBe(3);
    expect(base64Bayt("TWE=")).toBe(2);
    expect(base64Bayt("TQ==")).toBe(1);
  });
});

describe("giriş hata eşleme", () => {
  it("sağlayıcı kodları Türkçe hataya çevrilir, ham mesaj gitmez", () => {
    const vakalar: [unknown, string][] = [
      [{ code: "auth/popup-closed-by-user" }, "IPTAL"],
      [{ code: "", message: "The user canceled the sign-in flow." }, "IPTAL"],
      [{ code: "12501" }, "IPTAL"],
      [{ code: "auth/invalid-credential" }, "HATALI_GIRIS"],
      [{ code: "auth/wrong-password" }, "HATALI_GIRIS"],
      [{ code: "auth/email-already-in-use" }, "EPOSTA_KULLANIMDA"],
      [{ code: "auth/weak-password" }, "ZAYIF_PAROLA"],
      [{ code: "auth/invalid-email" }, "GECERSIZ_EPOSTA"],
      [{ code: "auth/too-many-requests" }, "COK_DENEME"],
      [{ code: "auth/account-exists-with-different-credential" }, "HESAP_FARKLI_YONTEM"],
      [{ code: "auth/network-request-failed" }, "AG_YOK"],
      [{ code: "auth/requires-recent-login" }, "YENIDEN_GIRIS"],
      [{ code: "auth/operation-not-allowed" }, "SAGLAYICI_YOK"],
      [{ code: "UNIMPLEMENTED", message: "not implemented on web" }, "SAGLAYICI_YOK"],
      [{ code: "x", message: '{"error":{"code":400}}' }, "BILINMEYEN"],
    ];
    for (const [e, kod] of vakalar) {
      const h = girisHatasinaCevir(e);
      expect(h.kod).toBe(kod);
      expect(h.mesaj).not.toMatch(/auth\/|error|[—–]/);
    }
  });

  it("hesap silme hataları", () => {
    expect(silmeHatasinaCevir({ code: "functions/failed-precondition", details: { code: "REAUTH_REQUIRED" } }).kod).toBe("YENIDEN_GIRIS");
    expect(silmeHatasinaCevir({ code: "functions/internal", details: { code: "DELETE_FAILED" } })).toMatchObject({ kod: "SILME_YARIDA", tekrarDenenebilir: true });
    expect(silmeHatasinaCevir({ code: "functions/unavailable" }).kod).toBe("AG_YOK");
  });
});

describe("PDF fiş dosyası", async () => {
  const { AZAMI_PDF_BAYT, bytesBase64, pdfHazirla, pdfMi } = await import("./kamera");
  const pdfBayt = new TextEncoder().encode("%PDF-1.7\n%deneme\n");

  it("dosya başından PDF tanınır, base64 doğru", () => {
    expect(pdfMi(pdfBayt)).toBe(true);
    expect(pdfMi(new TextEncoder().encode("<html>"))).toBe(false);
    expect(bytesBase64(new TextEncoder().encode("Man"))).toBe("TWFu");
    expect(atob(bytesBase64(pdfBayt))).toBe("%PDF-1.7\n%deneme\n");
  });

  it("PDF çevrilmeden hazırlanır; tür uyuşmazsa UNSUPPORTED_FILE, 4 MB üstü DOSYA_BUYUK", async () => {
    const r = await pdfHazirla(new Blob([pdfBayt], { type: "application/pdf" }), "fatura.pdf");
    expect(r).toMatchObject({ mimeType: "application/pdf", onizleme: null, bayt: pdfBayt.length, ad: "fatura.pdf" });
    expect(r.data).toBe(bytesBase64(pdfBayt));
    await expect(pdfHazirla(new Blob(["merhaba"], { type: "application/pdf" }))).rejects.toMatchObject({ kod: "UNSUPPORTED_FILE" });
    await expect(pdfHazirla(new Blob([new Uint8Array(AZAMI_PDF_BAYT + 1)]))).rejects.toMatchObject({ kod: "DOSYA_BUYUK" });
  });
});
