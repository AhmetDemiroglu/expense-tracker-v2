import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { guestStorageKeys, type LocalDate } from "@/core";
import { useBugunStore } from "./bugun";
import { bellekDeposu, type AnahtarDeger } from "./depo/depolama";
import { FirestoreRepo, KOLEKSIYON } from "./depo/firestoreRepo";
import { LocalRepo } from "./depo/localRepo";
import { sahteFirestore } from "./depo/sahteFirestore";
import { aktifDepo, depoyaBaglan, useVeri } from "./veri";
import { aySec, butceSec, aktifDonemSec, haftaSec, ozetSec } from "./turetilmis";

const D = (s: string) => s as LocalDate;
const G = "guest_test00001";

function bekle(): Promise<void> {
  return new Promise((r) => setTimeout(r, 5));
}

async function hazir(): Promise<void> {
  for (let i = 0; i < 20 && useVeri.getState().durum !== "hazir"; i += 1) await bekle();
  await bekle();
}

function misafirDeposu(): AnahtarDeger {
  const k = guestStorageKeys(G);
  return bellekDeposu({
    [k.settings]: JSON.stringify({ userId: G, periodName: "Kasım", periodStartDate: "2026-11-01", periodEndDate: "2026-11-30", monthlyIncome: 30000, fixedExpenses: 0, financialGoal: "savings" }),
    [k.periods]: JSON.stringify([{ id: "p1", userId: G, name: "Kasım", startDate: "2026-11-01", endDate: "2026-11-30", monthlyIncome: 30000, fixedExpenses: 0 }]),
    [k.transactions]: JSON.stringify([]),
    [k.recurring]: JSON.stringify([
      { id: "r1", userId: G, type: "expense", category: "Abonelikler", amount: 100, description: "Üyelik", frequency: "monthly", startDate: "2026-09-10", nextDueDate: "2026-09-10", isActive: true },
    ]),
  });
}

beforeEach(() => {
  useBugunStore.getState().ayarla(D("2026-11-15"));
});

afterEach(() => {
  depoyaBaglan(null);
});

describe("useVeri: yükleme ve düzenli ödeme üretimi", () => {
  it("misafir deposu yüklenir, kaçan vadeler deterministik kimlikle bir kez üretilir", async () => {
    const depo = misafirDeposu();
    depoyaBaglan(new LocalRepo(G, depo));
    await hazir();
    const s = useVeri.getState();
    expect(s.durum).toBe("hazir");
    expect(s.ayarDurumu).toBe("var");
    const uretilen = s.islemler.filter((t) => t.recurringId === "r1").map((t) => t.id).sort();
    expect(uretilen).toEqual(["r1_2026-09-10", "r1_2026-10-10", "r1_2026-11-10"]);
    expect(s.duzenliler[0]?.nextDueDate).toBe("2026-12-10");
    // StrictMode benzeri ikinci bağlanma çift üretmez.
    depoyaBaglan(new LocalRepo(G, depo));
    await hazir();
    const ham = JSON.parse(depo.getItem(guestStorageKeys(G).transactions) ?? "[]") as unknown[];
    expect(ham).toHaveLength(3);
  });

  it("oturum kapanınca store boşalır", async () => {
    depoyaBaglan(new LocalRepo(G, misafirDeposu()));
    await hazir();
    depoyaBaglan(null);
    expect(useVeri.getState()).toMatchObject({ durum: "bos", islemler: [], ayarlar: null });
    expect(aktifDepo()).toBeNull();
  });
});

describe("useVeri: iyimser güncelleme ve geri alma", () => {
  it("misafir: ekleme hemen görünür, depo doluysa geri alınır ve hata fırlatır", async () => {
    const depo = misafirDeposu();
    depoyaBaglan(new LocalRepo(G, depo));
    await hazir();
    const once = useVeri.getState().islemler.length;
    const t = await useVeri.getState().islemEkle({ description: "Market", amount: 64_000, type: "expense", category: "market", date: D("2026-11-15") });
    expect(useVeri.getState().islemler.some((x) => x.id === t.id)).toBe(true);
    expect(useVeri.getState().islemler).toHaveLength(once + 1);

    depo.setItem = () => {
      const e = new Error("dolu");
      e.name = "QuotaExceededError";
      throw e;
    };
    await expect(
      useVeri.getState().islemEkle({ description: "Taksi", amount: 12_050, type: "expense", category: "toplu_tasima", date: D("2026-11-15") }),
    ).rejects.toMatchObject({ kod: "DEPO_DOLU" });
    expect(useVeri.getState().islemler).toHaveLength(once + 1);
  });

  it("hesaplı: eylem sunucu onayını beklemez, ret gelince geri alınır ve sonYazimHatasi dolar", async () => {
    const f = sahteFirestore();
    f.koy(KOLEKSIYON.ayar, "u1", { userId: "u1", periodName: "Kasım", periodStartDate: "2026-11-01", periodEndDate: "2026-11-30", monthlyIncome: 30000, fixedExpenses: 0 });
    f.koy(KOLEKSIYON.islem, "t1", { userId: "u1", amount: 50, type: "expense", category: "Market & Pazar", description: "Eski", date: "2026-11-02", createdAt: 1 });
    depoyaBaglan(new FirestoreRepo("u1", f));
    await hazir();
    f.reddet = { code: "permission-denied" };
    await useVeri.getState().islemSil("t1");
    expect(useVeri.getState().islemler.find((x) => x.id === "t1")).toBeUndefined();
    await bekle();
    expect(useVeri.getState().islemler.find((x) => x.id === "t1")).toBeDefined();
    expect(useVeri.getState().sonYazimHatasi?.kod).toBe("IZIN_YOK");
    useVeri.getState().yazimHatasiniTemizle();
    expect(useVeri.getState().sonYazimHatasi).toBeNull();
  });

  it("güncelleme geri alınınca önceki hali döner", async () => {
    const f = sahteFirestore();
    f.koy(KOLEKSIYON.islem, "t1", { userId: "u1", amount: 50, type: "expense", category: "Market & Pazar", description: "Eski", date: "2026-11-02", createdAt: 1 });
    depoyaBaglan(new FirestoreRepo("u1", f));
    await hazir();
    const t1 = useVeri.getState().islemler[0];
    if (!t1) throw new Error("yok");
    f.reddet = { code: "invalid-argument" };
    await useVeri.getState().islemGuncelle({ ...t1, description: "Yeni" });
    expect(useVeri.getState().islemler[0]?.description).toBe("Yeni");
    await bekle();
    expect(useVeri.getState().islemler[0]?.description).toBe("Eski");
  });

  it("dönem aktif etme Nova profilini silmez (birleştirme)", async () => {
    const f = sahteFirestore();
    f.koy(KOLEKSIYON.ayar, "u1", { userId: "u1", financialGoal: "investment", riskTolerance: "high" });
    f.koy(KOLEKSIYON.donem, "p2", { userId: "u1", name: "Aralık", startDate: "2026-12-01", endDate: "2026-12-31", monthlyIncome: 40000, fixedExpenses: 5000 });
    depoyaBaglan(new FirestoreRepo("u1", f));
    await hazir();
    expect(useVeri.getState().ayarDurumu).toBe("yok");
    await useVeri.getState().donemAktifEt("p2");
    expect(useVeri.getState().ayarDurumu).toBe("var");
    await bekle();
    expect(f.veri.get(KOLEKSIYON.ayar)?.get("u1")).toMatchObject({
      financialGoal: "investment", riskTolerance: "high", activePeriodId: "p2", periodName: "Aralık", monthlyIncome: 40000,
    });
  });

  it("ayarlarKaydet yalnız değişen alanları yazar", async () => {
    const f = sahteFirestore();
    f.koy(KOLEKSIYON.ayar, "u1", { userId: "u1", periodName: "Kasım", periodStartDate: "2026-11-01", periodEndDate: "2026-11-30", monthlyIncome: 30000, fixedExpenses: 0, bilinmeyen: 1 });
    depoyaBaglan(new FirestoreRepo("u1", f));
    await hazir();
    await useVeri.getState().ayarlarKaydet({ savingsStyle: "strict" });
    await bekle();
    const son = f.yazimlar.at(-1);
    expect(son && son.tur === "set" && son.veri).toEqual({ userId: "u1", savingsStyle: "strict" });
    expect(f.veri.get(KOLEKSIYON.ayar)?.get("u1")).toMatchObject({ bilinmeyen: 1, periodName: "Kasım", savingsStyle: "strict" });
  });

  it("geçersiz tutar fırlatır, durum değişmez", async () => {
    depoyaBaglan(new LocalRepo(G, misafirDeposu()));
    await hazir();
    const once = useVeri.getState().islemler;
    await expect(
      useVeri.getState().islemEkle({ description: "", amount: 12.5, type: "expense", category: "market", date: D("2026-11-15") }),
    ).rejects.toMatchObject({ kod: "GECERSIZ" });
    expect(useVeri.getState().islemler).toBe(once);
  });
});

describe("seçiciler: kararlı referans, hesap çekirdekten", () => {
  it("aynı girdiyle aynı nesne döner", async () => {
    depoyaBaglan(new LocalRepo(G, misafirDeposu()));
    await hazir();
    const s = useVeri.getState();
    const bugun = useBugunStore.getState().bugun;
    const d1 = aktifDonemSec(s.ayarlar, s.donemler);
    const d2 = aktifDonemSec(s.ayarlar, s.donemler);
    expect(d1).toBe(d2);
    const c1 = butceSec(d1, s.islemler, s.duzenliler, bugun);
    const c2 = butceSec(d2, s.islemler, s.duzenliler, bugun);
    expect(c1).toBe(c2);
    expect(ozetSec(c1)).toBe(ozetSec(c2));
    expect(haftaSec(c1)).toBe(haftaSec(c1));
    expect(aySec(c1, 2026, 11)).toBe(aySec(c1, 2026, 11));
    expect(haftaSec(c1)).toHaveLength(7);
    // Düzenli ödeme planlı: 30.000 TL, 3 x 1 TL ödeme
    expect(ozetSec(c1)?.plannedIncome).toBe(3_000_000);
  });
});
