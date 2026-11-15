import { describe, expect, it } from "vitest";
import { ACTIVE_GUEST_KEY, guestStorageKeys, type LocalDate, type Period, type Recurring, type Transaction } from "@/core";
import { bellekDeposu } from "./depo/depolama";
import type { VeriPaketi } from "./depo/tipler";
import {
  aktarilabilirMisafirBul,
  aktarimKarariYaz,
  aktarimPlaniKur,
  demoIslemKimlikleri,
  demoMisafirOlustur,
  kayitliMisafir,
  kullaniciKayitlari,
  misafirPaketi,
} from "./misafir";

const D = (s: string) => s as LocalDate;
const UID = "hesap_1";

function paket(p: Partial<VeriPaketi> = {}): VeriPaketi {
  return { islemler: [], donemler: [], duzenliler: [], ayarlar: null, ayarDurumu: "yok", bozuk: [], ...p };
}

function t(id: string, extra: Partial<Transaction> = {}): Transaction {
  return { id, userId: "guest_x", description: "Kahve", amount: 9_500, type: "expense", category: "yeme_icme", date: D("2026-11-10"), createdAt: 1_000_000, ...extra };
}

function p(id: string, start: string, end: string, name = "Dönem"): Period {
  return { id, userId: "guest_x", name, start: D(start), end: D(end), plannedIncome: 3_000_000, fixedExpenses: 0 };
}

function r(id: string, extra: Partial<Recurring> = {}): Recurring {
  return {
    id, userId: "guest_x", type: "expense", category: "abonelik", amount: 19_999, description: "Netflix",
    frequency: "monthly", startDate: D("2026-10-05"), nextDueDate: D("2026-12-05"), isActive: true, ...extra,
  };
}

describe("demo tanıma", () => {
  it("yeni demo kimlik önekiyle, eski demo parmak izi ve aynı anda oluşturulmayla tanınır", () => {
    const eskiDemo = [
      t("a", { description: "Aylık Maaş", amount: 4_500_000, type: "income", category: "maas", createdAt: 5000 }),
      t("b", { description: "Ev Kirası", amount: 1_200_000, category: "kira", createdAt: 5000 }),
      t("c", { description: "Elektrik", amount: 85_000, category: "fatura", createdAt: 5001 }),
      t("d", { description: "Benzin", amount: 35_000, category: "arac_yakit", createdAt: 5001 }),
      t("e", { description: "Eksikler", amount: 22_000, category: "market", createdAt: 5002 }),
    ];
    const kendi = [
      t("demo_guest_x_3", { createdAt: 1 }),
      t("k1", { description: "Eksikler", amount: 22_000, category: "market", createdAt: 9_999_999 }), // tek başına: kullanıcının
      t("k2", { description: "Ev Kirası", amount: 1_250_000, category: "kira", createdAt: 5000 }), // düzenlenmiş demo: kullanıcının
    ];
    const ids = demoIslemKimlikleri([...eskiDemo, ...kendi]);
    expect([...ids].sort()).toEqual(["a", "b", "c", "d", "demo_guest_x_3", "e"]);
  });

  it("'Hesapsız dene' çekirdeğin demo verisini eski anahtarlarla yazar; kullanıcı kaydı sayılmaz", () => {
    const depo = bellekDeposu();
    const g = demoMisafirOlustur(depo, D("2026-11-15"), 1_700_000_000_000);
    expect(g).toMatch(/^guest_[a-z0-9]{9}$/);
    expect(kayitliMisafir(depo)).toBe(g);
    const k = guestStorageKeys(g);
    expect(depo.getItem(k.transactions)).not.toBeNull();
    const pk = misafirPaketi(depo, g);
    expect(pk.ayarDurumu).toBe("var");
    expect(pk.islemler.length).toBeGreaterThan(5);
    const kk = kullaniciKayitlari(pk);
    expect(kk).toMatchObject({ islemler: [], donemler: [], duzenliler: [], ayarlar: null });
    expect(aktarilabilirMisafirBul(depo)).toBeNull();
  });
});

describe("misafirden hesaba aktarım planı", () => {
  it("hedef boşsa kullanıcının tüm kayıtları, dönemi ve Nova profili doğrudan aktarılır", () => {
    const misafir = paket({
      islemler: [t("t1"), t("t2", { amount: 64_000, category: "market", description: "Market" }), t("demo_guest_x_1")],
      donemler: [p("p1", "2026-11-01", "2026-11-30", "Kasım")],
      duzenliler: [r("r1")],
      ayarlar: {
        userId: "guest_x", currency: "TRY", financialGoal: "debt_reduction", savingsStyle: "strict", riskTolerance: "low", payday: 1,
        activePeriodId: "p1", period: { name: "Kasım", start: D("2026-11-01"), end: D("2026-11-30"), plannedIncome: 3_000_000, fixedExpenses: 0 },
      },
      ayarDurumu: "var",
    });
    const plan = aktarimPlaniKur(misafir, paket(), UID);
    expect(plan.islemler.map((x) => x.id).sort()).toEqual(["t1", "t2"]);
    expect(plan.islemler.every((x) => x.userId === UID)).toBe(true);
    expect(plan.donemler.map((x) => x.id)).toEqual(["p1"]);
    expect(plan.duzenliler.map((x) => [x.id, x.userId])).toEqual([["r1", UID]]);
    expect(plan.ayarlar?.donem.id).toBe("p1");
    expect(plan.ayarlar?.profil).toEqual({ financialGoal: "debt_reduction", savingsStyle: "strict", riskTolerance: "low", payday: 1 });
    expect(plan.atlanan).toBe(0);
  });

  it("hedef doluysa çift kayıt üretmez: aynı içerik sayımlı eşleşir, dönem çakışması atlanır, ayar ellenmez", () => {
    const misafir = paket({
      islemler: [t("g1"), t("g2"), t("g3", { description: "Netflix (Otomatik)", category: "abonelik", amount: 19_999, date: D("2026-11-05") }), t("g4", { recurringId: "r1", dueDate: D("2026-11-05"), date: D("2026-11-05"), description: "Netflix", category: "abonelik", amount: 19_999 })],
      donemler: [p("gp", "2026-11-01", "2026-11-30")],
      duzenliler: [r("r1")],
      ayarlar: { userId: "guest_x", currency: "TRY", financialGoal: "savings", savingsStyle: "balanced", riskTolerance: "medium", period: { name: "Dönem", start: D("2026-11-01"), end: D("2026-11-30"), plannedIncome: 1, fixedExpenses: 0 } },
    });
    const hedef = paket({
      islemler: [
        { ...t("h1"), userId: UID }, // aynı kahve (1 tane)
        { ...t("h2", { description: "netflix", category: "abonelik", amount: 19_999, date: D("2026-11-05") }), userId: UID },
      ],
      donemler: [{ ...p("hp", "2026-11-10", "2026-12-09"), userId: UID }],
      duzenliler: [{ ...r("hr", { description: "NETFLIX" }), userId: UID }],
      ayarDurumu: "var",
    });
    const plan = aktarimPlaniKur(misafir, hedef, UID);
    // g1 hedefteki kahveyle eşleşti, g2 aktarılır; g3 (eski otomatik) hedefteki netflix ile eşleşti; g4 atlanan düzenli ödemenin işlemi
    expect(plan.islemler.map((x) => x.id)).toEqual(["g2"]);
    expect(plan.duzenliler).toEqual([]);
    expect(plan.donemler).toEqual([]);
    expect(plan.ayarlar).toBeNull();
    expect(plan.atlanan).toBe(5);
  });

  it("aynı aktarım iki kez çalışırsa ikinci planda hiçbir şey yoktur (kimlikler korunur)", () => {
    const misafir = paket({ islemler: [t("t1"), t("t2", { amount: 1 })], donemler: [p("p1", "2026-11-01", "2026-11-30")], duzenliler: [r("r1")] });
    const ilk = aktarimPlaniKur(misafir, paket(), UID);
    const hedef = paket({ islemler: ilk.islemler, donemler: ilk.donemler, duzenliler: ilk.duzenliler, ayarDurumu: "var" });
    const ikinci = aktarimPlaniKur(misafir, hedef, UID);
    expect(ikinci.islemler).toEqual([]);
    expect(ikinci.donemler).toEqual([]);
    expect(ikinci.duzenliler).toEqual([]);
  });

  it("hedef ayarı 'bilinmiyor' (çevrimdışı) iken ayar aktarılmaz", () => {
    const misafir = paket({
      ayarlar: { userId: "g", currency: "TRY", financialGoal: "savings", savingsStyle: "balanced", riskTolerance: "medium", period: { name: "Kasım", start: D("2026-11-01"), end: D("2026-11-30"), plannedIncome: 1, fixedExpenses: 0 } },
    });
    expect(aktarimPlaniKur(misafir, paket({ ayarDurumu: "bilinmiyor" }), UID).ayarlar).toBeNull();
    // Kayıtlı karşılığı olmayan eski aktif dönem: kayıt olarak da eklenir
    const plan = aktarimPlaniKur(misafir, paket({ ayarDurumu: "yok" }), UID);
    expect(plan.ayarlar?.donem.name).toBe("Kasım");
    expect(plan.donemler).toHaveLength(1);
    expect(plan.donemler[0]?.id).not.toBe("active");
  });
});

describe("cihazdaki misafirler", () => {
  it("kendi kaydı olan misafir önerilir, karar verilince bir daha önerilmez", () => {
    const g = "guest_abcdefghi";
    const k = guestStorageKeys(g);
    const depo = bellekDeposu({
      [k.transactions]: JSON.stringify([{ id: "x1", userId: g, amount: 12, type: "expense", category: "Diğer", description: "Simit", date: "2026-11-01", createdAt: 1 }]),
      [ACTIVE_GUEST_KEY]: g,
    });
    expect(aktarilabilirMisafirBul(depo)).toEqual({ guestId: g, islem: 1, donem: 0, duzenli: 0, ayarVar: false });
    aktarimKarariYaz(depo, g, "reddedildi");
    expect(aktarilabilirMisafirBul(depo)).toBeNull();
  });
});
