import { describe, expect, it } from "vitest";
import { bicimCoz, kisalt, satirCoz, uzunluk } from "./bicimleyici";
import { novaDurumu, type RuhGirdisi } from "./ruhHali";
import { olasiTasarruf } from "./tasarruf";

const temel: RuhGirdisi = {
  aiAcik: true,
  cevrimici: true,
  veriBekleniyor: false,
  donemVar: true,
  kayitVar: true,
  raporYukleniyor: false,
  yanitBekleniyor: false,
  yaziyor: false,
  hataKodu: null,
  selamAktif: false,
  faz: "active",
  gunDurumu: "good",
  bakiyeEksi: false,
  raporRuhu: null,
};

describe("biçimleyici", () => {
  it("kalın ve düz metni ayırır, kapanmamış işareti düz bırakır", () => {
    expect(satirCoz("a **b** c")).toEqual([
      { t: "m", s: "a " },
      { t: "k", s: "b" },
      { t: "m", s: " c" },
    ]);
    expect(satirCoz("**açık")).toEqual([{ t: "m", s: "**açık" }]);
  });
  it("madde, numaralı liste, başlık ve paragrafı bloklar", () => {
    const b = bicimCoz("# Başlık\nmerhaba\n\n- bir\n* iki\n\n1. x\n2) y");
    expect(b.map((x) => x.t)).toEqual(["p", "ul", "ol"]);
    const ul = b[1];
    expect(ul && ul.t === "ul" && ul.ogeler.length).toBe(2);
  });
  it("HTML'i düz metin olarak bırakır", () => {
    const b = bicimCoz("<img src=x onerror=alert(1)>");
    expect(b[0]).toEqual({ t: "p", satirlar: [[{ t: "m", s: "<img src=x onerror=alert(1)>" }]] });
  });
  it("kısaltma karakter sayar ve biçimi korur", () => {
    const b = bicimCoz("ab **cd**\n- ef");
    expect(uzunluk(b)).toBe(7);
    const k = kisalt(b, 4);
    expect(uzunluk(k)).toBe(4);
    expect(kisalt(b, 99)).toEqual(b);
    expect(kisalt(b, 0)).toEqual([]);
  });
});

describe("olası tasarruf", () => {
  it("yüzdeyi kuruşa yuvarlar, geçersizde 0", () => {
    expect(olasiTasarruf(100_000, 10)).toBe(10_000);
    expect(olasiTasarruf(33_333, 10)).toBe(3_333);
    expect(olasiTasarruf(0, 10)).toBe(0);
    expect(olasiTasarruf(1000, 150)).toBe(1000);
  });
});

describe("Nova ruh hali", () => {
  it("misafirde uyku, veri beklerken uyku", () => {
    expect(novaDurumu({ ...temel, aiAcik: false }).ruh).toBe("uyku");
    expect(novaDurumu({ ...temel, veriBekleniyor: true }).ruh).toBe("uyku");
  });
  it("rapor analiz, yanıt düşünüyor, yazarken konuşuyor", () => {
    expect(novaDurumu({ ...temel, raporYukleniyor: true }).ruh).toBe("analiz");
    expect(novaDurumu({ ...temel, yanitBekleniyor: true }).ruh).toBe("dusunuyor");
    expect(novaDurumu({ ...temel, yaziyor: true }).ruh).toBe("konusuyor");
  });
  it("hatalar: kota uyarı, ağ ve sunucu üzgün", () => {
    expect(novaDurumu({ ...temel, hataKodu: "QUOTA_EXCEEDED" }).ruh).toBe("uyari");
    expect(novaDurumu({ ...temel, hataKodu: "AI_UNAVAILABLE" }).ruh).toBe("uzgun");
    expect(novaDurumu({ ...temel, cevrimici: false }).anahtar).toBe("cevrimdisi");
  });
  it("kayıt ve dönem yoksa selam", () => {
    expect(novaDurumu({ ...temel, kayitVar: false }).anahtar).toBe("kayitYok");
    expect(novaDurumu({ ...temel, donemVar: false }).anahtar).toBe("donemYok");
  });
  it("bütçe durumu: aşım ve açık uyarı, eksi biten dönem üzgün, iyi mutlu", () => {
    expect(novaDurumu({ ...temel, gunDurumu: "over" }).ruh).toBe("uyari");
    expect(novaDurumu({ ...temel, gunDurumu: "deficit" }).ruh).toBe("uyari");
    expect(novaDurumu({ ...temel, faz: "ended", bakiyeEksi: true }).ruh).toBe("uzgun");
    expect(novaDurumu({ ...temel }).ruh).toBe("mutlu");
    expect(novaDurumu({ ...temel, raporRuhu: "critical" }).ruh).toBe("uyari");
  });
  it("boşta selam yalnız sorun yokken", () => {
    expect(novaDurumu({ ...temel, selamAktif: true }).ruh).toBe("selam");
    expect(novaDurumu({ ...temel, selamAktif: true, gunDurumu: "over" }).ruh).toBe("uyari");
  });
});
