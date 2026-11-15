import { describe, expect, it } from "vitest";
import type { LocalDate, Period, Transaction } from "@/core";
import { grupla, kalanTaksitler, baslikMetni } from "./grup";

const d = (s: string) => s as LocalDate;
const tx = (id: string, date: string, amount: number, type: "income" | "expense", extra: Partial<Transaction> = {}): Transaction => ({
  id, userId: "u", description: id, amount, type, category: type === "income" ? "maas" : "market", date: d(date), createdAt: 1, ...extra,
});
const donem = (id: string, start: string, end: string): Period => ({ id, userId: "u", name: id, start: d(start), end: d(end), plannedIncome: 0, fixedExpenses: 0 });

describe("grupla", () => {
  const donemler = [donem("kasim", "2026-11-01", "2026-11-30"), donem("ekim", "2026-10-01", "2026-10-31")];
  const liste = [tx("a", "2026-11-14", 500, "expense"), tx("b", "2026-11-14", 2000, "income"), tx("c", "2026-10-20", 700, "expense"), tx("d", "2026-08-01", 100, "expense")];

  it("dönem ve güne böler, gün neti gelir eksi gider", () => {
    const g = grupla(liste, donemler, { sorgu: "", tur: "tumu", donemId: null });
    expect(g.map((x) => x.donemId)).toEqual(["kasim", "ekim", ""]);
    expect(g[0]?.gunler[0]?.net).toBe(1500);
    expect(g[1]?.net).toBe(-700);
  });
  it("tür ve arama süzer, dönem seçimi tek dönem bırakır", () => {
    expect(grupla(liste, donemler, { sorgu: "", tur: "gelir", donemId: null })).toHaveLength(1);
    expect(grupla(liste, donemler, { sorgu: "MARKET", tur: "tumu", donemId: "ekim" })).toHaveLength(1);
    expect(grupla(liste, donemler, { sorgu: "yok-boyle", tur: "tumu", donemId: null })).toHaveLength(0);
  });
});

describe("kalanTaksitler", () => {
  const g = (i: number) => tx(`t${i}`, "2026-11-01", 100, "expense", { installmentGroupId: "G", installmentIndex: i, installmentCount: 4 });
  it("bu ve sonrakileri verir", () => {
    const hepsi = [g(1), g(2), g(3), g(4), tx("x", "2026-11-01", 5, "expense")];
    expect(kalanTaksitler(hepsi, g(3)).map((t) => t.id)).toEqual(["t3", "t4"]);
    expect(kalanTaksitler(hepsi, hepsi[4]!)).toHaveLength(1);
  });
});

describe("baslikMetni", () => {
  it("açıklama yoksa kategori adı, eski otomatik eki atar", () => {
    expect(baslikMetni(tx("a", "2026-11-14", 1, "expense", { description: "" }))).toBe("Market");
    expect(baslikMetni(tx("a", "2026-11-14", 1, "expense", { description: "Netflix (Otomatik)", category: "abonelik" }))).toBe("Netflix");
  });
});

import { pencele } from "./grup";
describe("pencele", () => {
  it("ilk N kaydı gün gruplarını keserek verir", () => {
    const g = (date: string, n: number) => ({ date: d(date), net: 0, islemler: Array.from({ length: n }, (_, i) => tx(`${date}-${i}`, date, 1, "expense")) });
    const r = pencele([g("2026-11-15", 3), g("2026-11-14", 3), g("2026-11-13", 3)], 4);
    expect(r.map((x) => x.islemler.length)).toEqual([3, 1]);
  });
});
