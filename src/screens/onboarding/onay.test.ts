import { describe, expect, it } from "vitest";
import { ONAY_SURUMU, onayCoz, onayGecerli } from "./onay";

describe("ilk açılış onayı", () => {
  it("kayıt yoksa onay geçerli değil", () => {
    expect(onayGecerli(onayCoz(null))).toBe(false);
    expect(onayGecerli(onayCoz(""))).toBe(false);
  });
  it("eski karşılama anahtarının değeri onay sayılmaz", () => {
    expect(onayCoz("true")).toBeNull();
  });
  it("bozuk kayıt onay sayılmaz", () => {
    expect(onayCoz("{")).toBeNull();
    expect(onayCoz('{"surum":"1","tarih":"2026-11-15"}')).toBeNull();
    expect(onayCoz('{"surum":1}')).toBeNull();
    expect(onayCoz('{"surum":0,"tarih":"2026-11-15"}')).toBeNull();
  });
  it("güncel sürüm geçerli, eski sürüm yeniden sorulur", () => {
    const kayit = onayCoz(JSON.stringify({ surum: ONAY_SURUMU, tarih: "2026-11-15T10:00:00.000Z" }));
    expect(kayit).toEqual({ surum: ONAY_SURUMU, tarih: "2026-11-15T10:00:00.000Z" });
    expect(onayGecerli(kayit)).toBe(true);
    expect(onayGecerli(kayit, ONAY_SURUMU + 1)).toBe(false);
    expect(onayGecerli({ surum: 3, tarih: "x" }, 2)).toBe(true);
  });
});
