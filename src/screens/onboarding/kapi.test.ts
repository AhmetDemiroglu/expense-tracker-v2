import { describe, expect, it } from "vitest";
import { kapiAdimi, type KapiGirdisi } from "./kapi";

const temel: KapiGirdisi = { oturum: "hesap", veri: "hazir", ayar: "var", karsilamaTamam: true, aktarimBekliyor: false, kabukAcildi: false };
const k = (o: Partial<KapiGirdisi>) => kapiAdimi({ ...temel, ...o });

describe("kapiAdimi", () => {
  it("oturum başlarken bekler", () => expect(k({ oturum: "baslatiliyor" })).toBe("bekle"));
  it("ilk kez: karşılama, sonra giriş", () => {
    expect(k({ oturum: "girissiz", karsilamaTamam: false })).toBe("karsilama");
    expect(k({ oturum: "girissiz", karsilamaTamam: true })).toBe("giris");
  });
  it("oturum varken karşılama gösterilmez", () => expect(k({ karsilamaTamam: false })).toBe("kabuk"));
  it("veri gelene kadar bekler, hatada hata ekranı", () => {
    expect(k({ veri: "yukleniyor" })).toBe("veri-yukleniyor");
    expect(k({ veri: "bos" })).toBe("veri-yukleniyor");
    expect(k({ veri: "hata" })).toBe("veri-hata");
  });
  it("ayar bilinmiyorsa kurulum AÇILMAZ", () => expect(k({ ayar: "bilinmiyor" })).toBe("baglanti"));
  it("ayar yoksa kurulum", () => expect(k({ ayar: "yok", oturum: "misafir" })).toBe("kurulum"));
  it("aktarım önerisi kurulumdan önce gelir, yalnız hesapta", () => {
    expect(k({ ayar: "yok", aktarimBekliyor: true })).toBe("aktarim");
    expect(k({ ayar: "var", aktarimBekliyor: true })).toBe("aktarim");
    expect(k({ oturum: "misafir", ayar: "yok", aktarimBekliyor: true })).toBe("kurulum");
  });
  it("kabuk bir kez açıldıysa geçici durum onu sökmez", () => {
    expect(k({ kabukAcildi: true, veri: "yukleniyor", ayar: "bilinmiyor" })).toBe("kabuk");
    expect(k({ kabukAcildi: true, ayar: "yok" })).toBe("kabuk");
  });
  it("çıkışta kabuk açık kalmaz", () => expect(k({ oturum: "girissiz", kabukAcildi: true })).toBe("giris"));
});
