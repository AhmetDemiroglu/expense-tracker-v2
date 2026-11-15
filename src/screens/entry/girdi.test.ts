import { describe, expect, it } from "vitest";
import type { LocalDate, Transaction } from "@/core";
import { fisiFormaCevir, formuKaydaCevir, onerilenKategoriler, taksitOnizle, type FormDurumu } from "./girdi";

const d = (s: string) => s as LocalDate;
const BUGUN = d("2026-11-15");
let n = 0;
const baglam = { bugun: BUGUN, userId: "u", now: 1000, idUret: () => `id${++n}` };
const form = (p: Partial<FormDurumu> = {}): FormDurumu => ({ tur: "expense", tutarMetni: "640", kategori: "market", tarih: BUGUN, not: "", taksit: 1, ...p });

describe("formuKaydaCevir", () => {
  it("tutar ve kategori zorunlu", () => {
    expect(formuKaydaCevir(form({ tutarMetni: "" }), baglam)).toMatchObject({ ok: false, hata: "tutar" });
    expect(formuKaydaCevir(form({ tutarMetni: "0" }), baglam)).toMatchObject({ ok: false, hata: "tutar", neden: "zero" });
    expect(formuKaydaCevir(form({ kategori: null }), baglam)).toMatchObject({ ok: false, hata: "kategori" });
  });
  it("bugünkü gider planlı değil, ileri tarihli gider planlı, gelir asla", () => {
    const a = formuKaydaCevir(form(), baglam);
    expect(a.ok && a.tur === "yeni" && a.islem.planned).toBeUndefined();
    const b = formuKaydaCevir(form({ tarih: d("2026-11-20") }), baglam);
    expect(b.ok && b.tur === "yeni" && b.islem.planned).toBe(true);
    const c = formuKaydaCevir(form({ tur: "income", kategori: "maas", tarih: d("2026-11-20") }), baglam);
    expect(c.ok && c.tur === "yeni" && "planned" in c.islem).toBe(false);
  });
  it("taksit planı kurar, tutar taksitten küçükse hata verir", () => {
    const r = formuKaydaCevir(form({ tutarMetni: "3000", taksit: 6, not: "Televizyon" }), baglam);
    expect(r.ok && r.tur === "taksit" && r.liste).toHaveLength(6);
    if (r.ok && r.tur === "taksit") expect(r.liste[0]?.description).toBe("Televizyon (1/6)");
    expect(formuKaydaCevir(form({ tutarMetni: "0,05", taksit: 6 }), baglam)).toMatchObject({ ok: false, hata: "taksitTutar" });
  });
  it("düzenlemede planlı alanı: tarih değişmezse korunur, değişirse yeniden değerlendirilir", () => {
    const onceki: Transaction = { id: "x", userId: "u", description: "Kira", amount: 100, type: "expense", category: "kira", date: d("2026-11-25"), createdAt: 1, planned: true };
    const ayni = formuKaydaCevir(form({ tarih: d("2026-11-25"), kategori: "kira" }), { ...baglam, onceki });
    expect(ayni.ok && ayni.tur === "guncelle" && ayni.islem.planned).toBe(true);
    const gecmis = formuKaydaCevir(form({ tarih: d("2026-11-10"), kategori: "kira" }), { ...baglam, onceki });
    expect(gecmis.ok && gecmis.tur === "guncelle" && gecmis.islem.planned).toBeUndefined();
    expect(gecmis.ok && gecmis.tur === "guncelle" && gecmis.islem.id).toBe("x");
  });
});

describe("taksitOnizle", () => {
  it("son taksit ayını verir", () => {
    const o = taksitOnizle(300000, 6, d("2026-11-15"));
    expect(o).toMatchObject({ adet: 6, ilkTutar: 50000, esit: true, sonAy: "Nisan", sonYil: 2027 });
    expect(taksitOnizle(300000, 1, BUGUN)).toBeNull();
    expect(taksitOnizle(null, 6, BUGUN)).toBeNull();
  });
});

describe("onerilenKategoriler", () => {
  it("son kullanılan önde, kalan sırayla dolar", () => {
    const l: Transaction[] = [
      { id: "1", userId: "u", description: "", amount: 1, type: "expense", category: "kahve" as never, date: BUGUN, createdAt: 1 },
      { id: "2", userId: "u", description: "", amount: 1, type: "expense", category: "spor", date: BUGUN, createdAt: 1 },
    ];
    const r = onerilenKategoriler(l.slice(1), "expense", 4);
    expect(r[0]).toBe("spor");
    expect(r).toHaveLength(4);
    expect(new Set(r).size).toBe(4);
  });
});

describe("fisiFormaCevir", () => {
  const fis = { fisMi: true, isletme: "Örnek Market", tarih: null, toplam: 34750, kdv: null, kategori: "market", kalemler: [], guven: 0.4, kullanim: { kullanilan: 1, sinir: 30 } } as never;
  it("tarih yoksa bugün ve işaretli, düşük güven işaretli", () => {
    const f = fisiFormaCevir(fis, BUGUN, (k) => String(k / 100));
    expect(f).toMatchObject({ tutarMetni: "347.5", not: "Örnek Market", tarih: BUGUN, tarihOkunamadi: true, dusukGuven: true, kategori: "market" });
  });
});
