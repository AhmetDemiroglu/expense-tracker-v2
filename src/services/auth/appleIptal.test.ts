import { describe, expect, it, vi } from "vitest";
import { APPLE_IPTAL_UYARISI, appleKodIptalIstegi, appleKoduIptalEt, silmeAkisi, type SilmeAdimlari } from "./appleIptal";

describe("Apple kod iptali isteği", () => {
  it("iOS SDK ile aynı gövde: apple.com, AUTHORIZATION_CODE, kod ve Firebase ID token", () => {
    const { url, init } = appleKodIptalIstegi("anahtar 1", "kimlik-belirteci", "kod-123");
    expect(url).toBe("https://identitytoolkit.googleapis.com/v2/accounts:revokeToken?key=anahtar%201");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ providerId: "apple.com", tokenType: "AUTHORIZATION_CODE", token: "kod-123", idToken: "kimlik-belirteci" });
  });

  it("sunucu hata dönerse fırlatır", async () => {
    const ok = vi.fn(async () => new Response("{}", { status: 200 }));
    await expect(appleKoduIptalEt({ apiKey: "a", idToken: "b", kod: "c" }, ok)).resolves.toBeUndefined();
    const kotu = vi.fn(async () => new Response("{}", { status: 400 }));
    await expect(appleKoduIptalEt({ apiKey: "a", idToken: "b", kod: "c" }, kotu)).rejects.toThrow();
  });
});

function adimlar(over: Partial<SilmeAdimlari<string>> = {}): { a: SilmeAdimlari<string>; sira: string[] } {
  const sira: string[] = [];
  const a: SilmeAdimlari<string> = {
    yenidenDogrula: async () => (sira.push("dogrula"), { apple: true, belirtec: { tur: "kod", deger: "k" } }),
    iptalEt: async () => {
      sira.push("iptal");
    },
    sunucuSil: async () => (sira.push("sil"), "silindi"),
    cikis: async () => {
      sira.push("cikis");
    },
    ...over,
  };
  return { a, sira };
}

describe("hesap silme akışı", () => {
  it("sıra: yeniden doğrula, iptal, sunucu silme, çıkış", async () => {
    const { a, sira } = adimlar();
    await expect(silmeAkisi(a)).resolves.toEqual({ sonuc: "silindi", appleIptal: "yapildi", uyari: null });
    expect(sira).toEqual(["dogrula", "iptal", "sil", "cikis"]);
  });

  it("iptal başarısızsa silme sürer, kullanıcıya düz uyarı döner", async () => {
    const { a, sira } = adimlar({ iptalEt: async () => Promise.reject(new Error("400")) });
    const r = await silmeAkisi(a);
    expect(r).toEqual({ sonuc: "silindi", appleIptal: "basarisiz", uyari: APPLE_IPTAL_UYARISI });
    expect(sira).toEqual(["dogrula", "sil", "cikis"]);
    expect(r.uyari).not.toMatch(/[—–]/);
  });

  it("Apple kullanıcısında belirteç gelmezse 'basarisiz'; Apple değilse iptal hiç çağrılmaz", async () => {
    const yok = adimlar({ yenidenDogrula: async () => ({ apple: true }) });
    expect((await silmeAkisi(yok.a)).appleIptal).toBe("basarisiz");
    const iptal = vi.fn(async () => undefined);
    const google = adimlar({ yenidenDogrula: async () => ({ apple: false }), iptalEt: iptal });
    expect(await silmeAkisi(google.a)).toMatchObject({ appleIptal: "gerekmedi", uyari: null });
    expect(iptal).not.toHaveBeenCalled();
  });

  it("yeniden doğrulama ya da sunucu silme hatası silmeyi durdurur", async () => {
    const d = adimlar({ yenidenDogrula: async () => Promise.reject(new Error("iptal")) });
    await expect(silmeAkisi(d.a)).rejects.toThrow("iptal");
    expect(d.sira).toEqual([]);
    const s = adimlar({ sunucuSil: async () => Promise.reject(new Error("sunucu")) });
    await expect(silmeAkisi(s.a)).rejects.toThrow("sunucu");
    expect(s.sira).toEqual(["dogrula", "iptal"]);
  });
});
