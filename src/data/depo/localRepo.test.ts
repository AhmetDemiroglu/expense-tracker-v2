import { describe, expect, it } from "vitest";
import { guestStorageKeys, type LocalDate, type Transaction } from "@/core";
import { bellekDeposu } from "./depolama";
import { LocalRepo } from "./localRepo";
import type { VeriPaketi } from "./tipler";

const G = "guest_ab12cd34e";
const K = guestStorageKeys(G);
const D = (s: string) => s as LocalDate;

/** Eski sürümün yazdığı biçim (denetim 2.3, demoService.ts, storageService.ts). */
function eskiMisafir() {
  return bellekDeposu({
    active_guest: G,
    [K.settings]: JSON.stringify({
      userId: G,
      monthlyIncome: 45000,
      fixedExpenses: 12850,
      periodStartDate: "2026-11-01",
      periodEndDate: "2026-11-30",
      periodName: "Kasım",
      currency: "TRY",
      financialGoal: "savings",
      savingsStyle: "balanced",
      riskTolerance: "medium",
    }),
    [K.periods]: JSON.stringify([
      { id: "p1", userId: G, name: "Kasım", startDate: "2026-11-01", endDate: "2026-11-30", monthlyIncome: 45000, fixedExpenses: 12850, isActive: true },
    ]),
    [K.transactions]: JSON.stringify([
      { id: "t1", userId: G, amount: 1250.5, type: "expense", category: "Gıda & Market", description: "Haftalık Alışveriş", date: "2026-11-10", createdAt: 1 },
      { id: "t2", userId: G, amount: 199.99, type: "expense", category: "Abonelikler", description: "Netflix (Otomatik)", date: "2026-11-05", createdAt: 2, ekAlan: "korunmali" },
      { id: "t3", userId: G, amount: null, type: "expense", category: "Diğer", description: "bozuk tutar", date: "2026-11-06", createdAt: 3 },
      { userId: G, amount: 10, type: "expense", category: "Diğer", description: "kimliksiz", date: "2026-11-06", createdAt: 4 },
      { id: "t5", userId: G, amount: 45000, type: "income", category: "Maaş", description: "Aylık Maaş", date: "2026-11-01", createdAt: 5 },
    ]),
    [K.recurring]: JSON.stringify([
      { id: "r1", userId: G, type: "expense", category: "Abonelikler", amount: 199.99, description: "Netflix", frequency: "monthly", startDate: "2026-10-05", nextDueDate: "2026-12-05", isActive: true, lastProcessedDate: "2026-11-05" },
    ]),
  });
}

function ilkPaket(repo: LocalRepo): Promise<VeriPaketi> {
  return new Promise((resolve, reject) => {
    const birak = repo.dinle(
      (p) => {
        birak();
        resolve(p);
      },
      reject,
    );
  });
}

describe("LocalRepo: eski biçimli misafir verisi", () => {
  it("eski anahtarlardan okur: kuruş, kategori anahtarı, dönem, düzenli ödeme, ayar", async () => {
    const repo = new LocalRepo(G, eskiMisafir());
    const p = await ilkPaket(repo);
    expect(p.islemler.map((t) => t.id)).toEqual(["t1", "t2", "t5"]);
    const t1 = p.islemler.find((t) => t.id === "t1");
    expect(t1?.amount).toBe(125050);
    expect(t1?.category).toBe("market");
    expect(p.islemler.find((t) => t.id === "t2")?.category).toBe("abonelik");
    expect(p.donemler[0]?.plannedIncome).toBe(4_500_000);
    expect(p.duzenliler[0]?.amount).toBe(19999);
    expect(p.ayarlar?.period?.name).toBe("Kasım");
    expect(p.ayarlar?.financialGoal).toBe("savings");
    expect(p.ayarDurumu).toBe("var");
  });

  it("okunamayan kaydı 'bozuk' listesine koyar, silmez", async () => {
    const depo = eskiMisafir();
    const p = await ilkPaket(new LocalRepo(G, depo));
    expect(p.bozuk.map((b) => b.id).sort()).toEqual(["#3", "t3"]);
    expect(JSON.parse(depo.getItem(K.transactions) ?? "[]")).toHaveLength(5);
  });

  it("işlemler tarihe göre yeniden eskiye sıralı", async () => {
    const p = await ilkPaket(new LocalRepo(G, eskiMisafir()));
    expect(p.islemler.map((t) => t.date)).toEqual(["2026-11-10", "2026-11-05", "2026-11-01"]);
  });

  it("güncelleme: bilinmeyen alan ve bozuk kayıtlar korunur, eski alan adlarıyla yazılır", async () => {
    const depo = eskiMisafir();
    const repo = new LocalRepo(G, depo);
    const p = repo.oku();
    const t2 = p.islemler.find((t) => t.id === "t2") as Transaction;
    await repo.islemYaz({ ...t2, amount: 21_000 });
    const ham = JSON.parse(depo.getItem(K.transactions) ?? "[]") as Record<string, unknown>[];
    expect(ham).toHaveLength(5);
    const yeni = ham.find((o) => o.id === "t2");
    expect(yeni).toMatchObject({ id: "t2", amount: 210, category: "Abonelikler", ekAlan: "korunmali", userId: G });
    expect(ham.find((o) => o.id === "t3")).toMatchObject({ amount: null });
    expect(ham.some((o) => o.description === "kimliksiz")).toBe(true);
  });

  it("yeni işlem dizinin başına eklenir, planned alanı yazılır ve düzenlemede kaldırılabilir", async () => {
    const depo = eskiMisafir();
    const repo = new LocalRepo(G, depo);
    const tx: Transaction = {
      id: "yeni1", userId: "baska", description: "Kira", amount: 1_000_000, type: "expense",
      category: "kira", date: D("2026-11-25"), createdAt: 10, planned: true,
    };
    await repo.islemYaz(tx);
    let ham = JSON.parse(depo.getItem(K.transactions) ?? "[]") as Record<string, unknown>[];
    expect(ham[0]).toMatchObject({ id: "yeni1", planned: true, userId: G, category: "Kira & Aidat", amount: 10000 });
    const { planned: _p, ...plansiz } = tx;
    await repo.islemYaz(plansiz);
    ham = JSON.parse(depo.getItem(K.transactions) ?? "[]") as Record<string, unknown>[];
    expect("planned" in (ham[0] ?? {})).toBe(false);
  });

  it("ayarlar BİRLEŞTİREREK yazılır: Nova profili ve bilinmeyen alanlar silinmez", async () => {
    const depo = eskiMisafir();
    const repo = new LocalRepo(G, depo);
    await repo.ayarlarYaz({ payday: 15 });
    const s = JSON.parse(depo.getItem(K.settings) ?? "{}") as Record<string, unknown>;
    expect(s).toMatchObject({ payday: 15, financialGoal: "savings", riskTolerance: "medium", periodName: "Kasım", userId: G });
  });

  it("düzenli ödeme üretimi: işlemler ve imleç, eski alanlar korunur", async () => {
    const depo = eskiMisafir();
    const repo = new LocalRepo(G, depo);
    const r = repo.oku().duzenliler[0];
    if (!r) throw new Error("düzenli yok");
    await repo.duzenliUret(
      [{ id: "r1_2026-12-05", userId: G, description: "Netflix", amount: 19999, type: "expense", category: "abonelik", date: D("2026-12-05"), createdAt: 9, recurringId: "r1", dueDate: D("2026-12-05") }],
      [{ id: "r1", nextDueDate: D("2027-01-05"), lastProcessedDate: D("2026-12-05") }],
    );
    const rec = JSON.parse(depo.getItem(K.recurring) ?? "[]") as Record<string, unknown>[];
    expect(rec[0]).toMatchObject({ nextDueDate: "2027-01-05", lastProcessedDate: "2026-12-05", startDate: "2026-10-05" });
    const tx = JSON.parse(depo.getItem(K.transactions) ?? "[]") as Record<string, unknown>[];
    expect(tx[0]).toMatchObject({ id: "r1_2026-12-05", recurringId: "r1", dueDate: "2026-12-05" });
  });

  it("silme yalnız verilen kimliği siler", async () => {
    const depo = eskiMisafir();
    const repo = new LocalRepo(G, depo);
    await repo.islemleriSil(["t1"]);
    const ham = JSON.parse(depo.getItem(K.transactions) ?? "[]") as Record<string, unknown>[];
    expect(ham.map((o) => o.id)).toEqual(["t2", "t3", undefined, "t5"]);
  });

  it("bozuk JSON'un üzerine yazmadan önce yedek alınır", async () => {
    const depo = bellekDeposu({ [K.transactions]: "{bozuk" });
    const repo = new LocalRepo(G, depo);
    const p = repo.oku();
    expect(p.bozuk[0]).toMatchObject({ koleksiyon: "islem", neden: "JSON bozuk" });
    await repo.islemYaz({ id: "a", userId: G, description: "", amount: 100, type: "expense", category: "market", date: D("2026-11-01"), createdAt: 1 });
    expect(depo.getItem(`${K.transactions}__yedek`)).toBe("{bozuk");
  });

  it("ayar yoksa ayarDurumu 'yok' (misafir deposu kesin)", () => {
    const p = new LocalRepo(G, bellekDeposu()).oku();
    expect(p.ayarDurumu).toBe("yok");
    expect(p.islemler).toEqual([]);
  });

  it("depo doluysa DEPO_DOLU hatası", async () => {
    const depo = bellekDeposu();
    depo.setItem = () => {
      const e = new Error("dolu");
      e.name = "QuotaExceededError";
      throw e;
    };
    const repo = new LocalRepo(G, depo);
    await expect(
      repo.islemYaz({ id: "a", userId: G, description: "", amount: 100, type: "expense", category: "market", date: D("2026-11-01"), createdAt: 1 }),
    ).rejects.toMatchObject({ kod: "DEPO_DOLU" });
  });
});
