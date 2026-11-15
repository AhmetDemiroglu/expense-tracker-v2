import { describe, expect, it } from "vitest";
import { localDate, type Transaction } from "@/core";
import { gunAdi, islemAdi, islemEtiketleri } from "./ortak";

const bugun = localDate(2026, 11, 15);
const tx = (o: Partial<Transaction>): Transaction => ({
  id: "t1",
  userId: "u",
  description: "Market",
  amount: 64000,
  type: "expense",
  category: "market",
  date: bugun,
  createdAt: 0,
  ...o,
});

describe("P5 ortak yardımcılar", () => {
  it("gün adı: bugün, dün, yarın, kısa tarih", () => {
    expect(gunAdi(bugun, bugun)).toBe("Bugün");
    expect(gunAdi(localDate(2026, 11, 14), bugun)).toBe("Dün");
    expect(gunAdi(localDate(2026, 11, 16), bugun)).toBe("Yarın");
    expect(gunAdi(localDate(2026, 11, 2), bugun)).toBe("2 Kas");
  });

  it("işlem adı: otomatik eki atılır, boşsa kategori adı", () => {
    expect(islemAdi(tx({ description: "Netflix (Otomatik)", category: "abonelik" }))).toBe("Netflix");
    expect(islemAdi(tx({ description: "  " }))).toBe("Market");
  });

  it("etiketler: taksit, otomatik, planlı", () => {
    expect(islemEtiketleri(tx({}))).toEqual([]);
    expect(islemEtiketleri(tx({ planned: true }))).toEqual(["planlı"]);
    expect(islemEtiketleri(tx({ recurringId: "r1", dueDate: bugun }))).toEqual(["otomatik"]);
    expect(islemEtiketleri(tx({ installmentGroupId: "g", installmentIndex: 2, installmentCount: 6 }))).toEqual(["2 / 6 taksit", "planlı"]);
    expect(islemEtiketleri(tx({ type: "income", category: "maas", planned: true }))).toEqual([]);
  });
});
