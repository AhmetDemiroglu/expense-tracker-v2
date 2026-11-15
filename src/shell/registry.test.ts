import { describe, expect, it } from "vitest";
import { buildRegistry, type ScreenKayit } from "./registry";

const A = () => null;
const B = () => null;

describe("ekran kayıt defteri", () => {
  it("kayıtları birleştirir", () => {
    const list: ScreenKayit[] = [
      { tabs: { ozet: A }, screens: { "donem-sec": A } },
      { tabs: { kayitlar: B }, sheets: { "kayit-ekle": B }, onAdd: () => {} },
      { screens: { ayarlar: B }, onProfile: () => {}, gate: ({ children }) => children, ready: async () => {} },
    ];
    const reg = buildRegistry(list);
    expect(Object.keys(reg.tabs).sort()).toEqual(["kayitlar", "ozet"]);
    expect(Object.keys(reg.screens).sort()).toEqual(["ayarlar", "donem-sec"]);
    expect(Object.keys(reg.sheets)).toEqual(["kayit-ekle"]);
    expect(reg.onAdd).toBeTypeOf("function");
    expect(reg.onProfile).toBeTypeOf("function");
    expect(reg.gates).toHaveLength(1);
    expect(reg.ready).toHaveLength(1);
  });

  it("aynı ad iki kez verilirse ilki kalır ve uyarır", () => {
    const warns: string[] = [];
    const reg = buildRegistry([{ screens: { x: A }, tabs: { ozet: A } }, { screens: { x: B }, tabs: { ozet: B } }], (m) => warns.push(m));
    expect(reg.screens.x).toBe(A);
    expect(reg.tabs.ozet).toBe(A);
    expect(warns).toHaveLength(2);
  });

  it("boş liste boş defter verir", () => {
    const reg = buildRegistry([]);
    expect(reg.tabs).toEqual({});
    expect(reg.onAdd).toBeUndefined();
  });
});
