import { describe, expect, it } from "vitest";
import { addDays, autoTransactionId, type LocalDate, type Transaction } from "@/core";
import { FirestoreRepo, KOLEKSIYON } from "./firestoreRepo";
import { sahteFirestore } from "./sahteFirestore";
import type { PaketMeta, VeriPaketi } from "./tipler";

const U = "uid_1";
const D = (s: string) => s as LocalDate;

function ilkPaket(repo: FirestoreRepo): Promise<[VeriPaketi, PaketMeta]> {
  return new Promise((resolve, reject) => {
    const birak = repo.dinle(
      (p, m) => {
        birak();
        resolve([p, m]);
      },
      reject,
    );
  });
}

function tx(id: string, extra: Partial<Transaction> = {}): Transaction {
  return { id, userId: U, description: "Deneme kaydı", amount: 10_000, type: "expense", category: "market", date: D("2026-11-10"), createdAt: 1, ...extra };
}

describe("FirestoreRepo: okuma eşlemesi", () => {
  it("doc.id esas alınır, doküman içindeki eski id yok sayılır, başka kullanıcı gelmez", async () => {
    const f = sahteFirestore();
    f.koy(KOLEKSIYON.islem, "dokA", { id: "eski-id", userId: U, amount: 12.5, type: "expense", category: "Faturalar", description: "Elektrik", date: "2026-11-03", createdAt: 1 });
    f.koy(KOLEKSIYON.islem, "dokB", { userId: "baska", amount: 1, type: "expense", category: "Diğer", description: "", date: "2026-11-03", createdAt: 1 });
    f.koy(KOLEKSIYON.islem, "dokC", { userId: U, amount: -5, type: "expense", category: "Diğer", description: "", date: "2026-11-03" });
    f.koy(KOLEKSIYON.ayar, U, { userId: U, periodName: "Kasım", periodStartDate: "2026-11-01", periodEndDate: "2026-11-30", monthlyIncome: 30000, fixedExpenses: 0 });
    const [p, m] = await ilkPaket(new FirestoreRepo(U, f));
    expect(p.islemler).toHaveLength(1);
    expect(p.islemler[0]).toMatchObject({ id: "dokA", amount: 1250, category: "fatura" });
    expect(p.bozuk).toEqual([{ koleksiyon: "islem", id: "dokC", neden: "tutar gecersiz" }]);
    expect(p.ayarDurumu).toBe("var");
    expect(m.onbellektenMi).toBe(false);
  });

  it("ayar yok: sunucu doğruladıysa 'yok', çevrimdışı önbellekte 'bilinmiyor'", async () => {
    const f = sahteFirestore();
    const [p1] = await ilkPaket(new FirestoreRepo(U, f));
    expect(p1.ayarDurumu).toBe("yok");
    f.cevrimdisi = true;
    const [p2, m2] = await ilkPaket(new FirestoreRepo(U, f));
    expect(p2.ayarDurumu).toBe("bilinmiyor");
    expect(m2.onbellektenMi).toBe(true);
  });

  it("ayarda dönem yoksa (yalnız Nova alanları) 'yok'", async () => {
    const f = sahteFirestore();
    f.koy(KOLEKSIYON.ayar, U, { userId: U, financialGoal: "savings" });
    const [p] = await ilkPaket(new FirestoreRepo(U, f));
    expect(p.ayarDurumu).toBe("yok");
    expect(p.ayarlar?.financialGoal).toBe("savings");
  });
});

describe("FirestoreRepo: yazma", () => {
  it("settings birleştirerek yazılır, Nova profili silinmez, userId her zaman", async () => {
    const f = sahteFirestore();
    f.koy(KOLEKSIYON.ayar, U, { userId: U, financialGoal: "debt_reduction", savingsStyle: "strict", riskTolerance: "low", periodName: "Eski" });
    const repo = new FirestoreRepo(U, f);
    await repo.ayarlarYaz({ periodName: "Kasım", periodStartDate: "2026-11-01" });
    expect(f.veri.get(KOLEKSIYON.ayar)?.get(U)).toMatchObject({
      userId: U, financialGoal: "debt_reduction", savingsStyle: "strict", riskTolerance: "low", periodName: "Kasım",
    });
    const son = f.yazimlar.at(-1);
    expect(son).toMatchObject({ tur: "set", birlestir: true });
  });

  it("işlem güncellemesinde bilinmeyen alan korunur, kaldırılan isteğe bağlı alan silinir", async () => {
    const f = sahteFirestore();
    f.koy(KOLEKSIYON.islem, "t1", { userId: U, amount: 100, type: "expense", category: "Market & Pazar", description: "", date: "2026-11-20", createdAt: 1, planned: true, eskiAlan: 7 });
    const repo = new FirestoreRepo(U, f);
    await repo.islemYaz(tx("t1", { date: D("2026-11-10") }));
    const d = f.veri.get(KOLEKSIYON.islem)?.get("t1");
    expect(d).toMatchObject({ eskiAlan: 7, date: "2026-11-10", amount: 100, category: "Market & Pazar" });
    expect(d && "planned" in d).toBe(false);
  });

  it("düzenli ödeme üretimi: deterministik kimlik, 500'lük parçalar, önce işlemler sonra imleç", async () => {
    const f = sahteFirestore();
    const repo = new FirestoreRepo(U, f);
    const create: Transaction[] = [];
    let gun = D("2010-01-04");
    for (let i = 0; i < 1203; i += 1) {
      create.push(tx(autoTransactionId("r1", gun), { recurringId: "r1", dueDate: gun, date: gun, category: "abonelik" }));
      gun = addDays(gun, 7);
    }
    await repo.duzenliUret(create, [{ id: "r1", nextDueDate: D("2033-01-03"), lastProcessedDate: D("2026-11-15") }]);
    expect(f.topluBoyutlari).toEqual([500, 500, 203, 1]);
    const son = f.yazimlar.at(-1);
    expect(son).toMatchObject({ koleksiyon: KOLEKSIYON.duzenli, id: "r1", birlestir: true });
    const ilk = f.yazimlar[0];
    expect(ilk && ilk.tur === "set" && ilk.id).toBe("r1_2010-01-04");
    expect(ilk && ilk.tur === "set" && ilk.veri).toMatchObject({ recurringId: "r1", dueDate: "2010-01-04" });
    // Yeniden deneme çift kayıt üretmez (aynı kimlikler).
    await repo.duzenliUret(create, []);
    expect(f.veri.get(KOLEKSIYON.islem)?.size).toBe(1203);
  });

  it("sunucu reddi türlü hataya çevrilir", async () => {
    const f = sahteFirestore();
    f.reddet = { code: "permission-denied", message: "Missing or insufficient permissions." };
    await expect(new FirestoreRepo(U, f).islemYaz(tx("x"))).rejects.toMatchObject({ kod: "IZIN_YOK" });
    f.reddet = { code: "unavailable" };
    await expect(new FirestoreRepo(U, f).islemYaz(tx("x"))).rejects.toMatchObject({ kod: "AG_YOK" });
  });

  it("dönem eski alan adlarıyla yazılır", async () => {
    const f = sahteFirestore();
    await new FirestoreRepo(U, f).donemYaz({ id: "p1", userId: "x", name: "Kasım", start: D("2026-11-01"), end: D("2026-11-30"), plannedIncome: 3_000_050, fixedExpenses: 0 });
    expect(f.veri.get(KOLEKSIYON.donem)?.get("p1")).toEqual({
      userId: U, name: "Kasım", startDate: "2026-11-01", endDate: "2026-11-30", monthlyIncome: 30000.5, fixedExpenses: 0,
    });
  });
});
