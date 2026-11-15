import { describe, expect, it } from "vitest";
import { applyBack, backStep, exitConfirmed, initialNav, mergeLayers, pop, popToRoot, push, replace, setTab, type Layer } from "./stack";

describe("yığın yönlendirici", () => {
  it("push benzersiz kimlik verir ve sırayı korur", () => {
    const s = push(push(initialNav, "ayarlar"), "ayarlar", { a: 1 });
    expect(s.stack.map((e) => e.name)).toEqual(["ayarlar", "ayarlar"]);
    expect(s.stack[0]?.id).not.toBe(s.stack[1]?.id);
    expect(s.stack[1]?.params).toEqual({ a: 1 });
  });

  it("pop en üsttekini çıkarır, boş yığında değişmez", () => {
    const s = push(push(initialNav, "a"), "b");
    expect(pop(s).stack.map((e) => e.name)).toEqual(["a"]);
    expect(pop(initialNav)).toBe(initialNav);
  });

  it("replace yalnız en üsttekini değiştirir", () => {
    const s = replace(push(push(initialNav, "a"), "b"), "c");
    expect(s.stack.map((e) => e.name)).toEqual(["a", "c"]);
    expect(replace(initialNav, "x").stack.map((e) => e.name)).toEqual(["x"]);
  });

  it("sekme değişimi yığını kapatır", () => {
    const s = setTab(push(initialNav, "a"), "nova");
    expect(s.tab).toBe("nova");
    expect(s.stack).toEqual([]);
    expect(setTab(initialNav, "ozet")).toBe(initialNav);
  });

  it("popToRoot hepsini kapatır", () => {
    expect(popToRoot(push(push(initialNav, "a"), "b")).stack).toEqual([]);
    expect(popToRoot(initialNav)).toBe(initialNav);
  });

  it("geri sırası: ekran, sonra ilk sekme, sonra çıkış", () => {
    let s = push(setTab(initialNav, "kayitlar"), "a");
    expect(backStep(s)).toBe("pop");
    s = applyBack(s);
    expect(s.stack).toEqual([]);
    expect(backStep(s)).toBe("tab");
    s = applyBack(s);
    expect(s.tab).toBe("ozet");
    expect(backStep(s)).toBe("exit");
    expect(applyBack(s)).toBe(s);
  });

  it("çıkış ikinci basış 2 sn içindeyse onaylanır", () => {
    expect(exitConfirmed(1000, null)).toBe(false);
    expect(exitConfirmed(2500, 1000)).toBe(true);
    expect(exitConfirmed(3001, 1000)).toBe(false);
    expect(exitConfirmed(900, 1000)).toBe(false);
  });
});

describe("katman birleştirme", () => {
  const live = (s: ReturnType<typeof push>): Layer[] => s.stack.map((entry) => ({ entry, mode: "live" }));

  it("pop: çıkan ekran en üstte kalır ve sağa kayar", () => {
    const two = push(push(initialNav, "a"), "b");
    const out = mergeLayers(live(two), pop(two).stack);
    expect(out.map((l) => `${l.entry.name}:${l.mode}`)).toEqual(["a:live", "b:pop"]);
  });

  it("replace: eski ekran yenisinin altında bekler", () => {
    const one = push(initialNav, "a");
    const out = mergeLayers(live(one), replace(one, "b").stack);
    expect(out.map((l) => `${l.entry.name}:${l.mode}`)).toEqual(["a:cover", "b:live"]);
  });

  it("popToRoot: hepsi çıkış katmanı olur", () => {
    const two = push(push(initialNav, "a"), "b");
    const out = mergeLayers(live(two), []);
    expect(out.map((l) => l.mode)).toEqual(["pop", "pop"]);
  });

  it("çıkmakta olan katman yeni push sırasında kaybolmaz", () => {
    const two = push(push(initialNav, "a"), "b");
    const afterPop = mergeLayers(live(two), pop(two).stack);
    const again = push(pop(two), "c");
    const out = mergeLayers(afterPop, again.stack);
    expect(out.map((l) => `${l.entry.name}:${l.mode}`)).toEqual(["a:live", "c:live", "b:pop"]);
  });
});
