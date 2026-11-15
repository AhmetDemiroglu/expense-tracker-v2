// Firestore kural testleri. Emülatörde çalışır: `npm run test:rules` (proje `demo-fintel`, canlıya dokunmaz).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  const hostPort = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8085";
  const [host, port] = hostPort.split(":");
  env = await initializeTestEnvironment({
    projectId: "demo-fintel",
    firestore: { rules: readFileSync(resolve(__dirname, "../../../firestore.rules"), "utf8"), host, port: Number(port) },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const alice = () => env.authenticatedContext("alice").firestore() as unknown as Firestore;
const bob = () => env.authenticatedContext("bob").firestore() as unknown as Firestore;
const anon = () => env.unauthenticatedContext().firestore() as unknown as Firestore;

/** Kurallar atlanarak tohum veri. */
async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, path), data);
  });
}

// ---- Eski sürümün (2.x) birebir yazdığı gövdeler (eski/services/storageService.ts) ----
const oldTx = {
  userId: "alice",
  description: "Migros",
  amount: 245.5,
  type: "expense",
  category: "Market & Pazar",
  date: "2026-11-14",
  createdAt: 1763112000000,
};
const oldSettings = {
  userId: "alice",
  periodName: "Kasım 2026",
  periodStartDate: "2026-11-01",
  periodEndDate: "2026-11-30",
  monthlyIncome: 50000,
  fixedExpenses: 15000,
  currency: "TRY",
  financialGoal: "savings",
  savingsStyle: "balanced",
  riskTolerance: "medium",
};
const oldPeriod = {
  userId: "alice",
  name: "Kasım 2026",
  startDate: "2026-11-01",
  endDate: "2026-11-30",
  monthlyIncome: 50000,
  fixedExpenses: 15000,
};
const oldRecurring = {
  userId: "alice",
  type: "expense",
  category: "Abonelikler",
  amount: 229.99,
  description: "Netflix",
  frequency: "monthly",
  startDate: "2026-11-05",
  nextDueDate: "2026-11-05",
  isActive: true,
};

describe("eski sürüm yazma biçimi", () => {
  it("işlem: addDoc, sonra id alanıyla tam updateDoc, sonra silme", async () => {
    const db = alice();
    const ref = await assertSucceeds(addDoc(collection(db, "transactions"), oldTx));
    await assertSucceeds(updateDoc(ref, { ...oldTx, id: ref.id, amount: 300 }));
    await assertSucceeds(deleteDoc(ref));
  });

  it("işlem: istemci UUID kimliği ve otomatik abonelik kaydı", async () => {
    const db = alice();
    await assertSucceeds(setDoc(doc(db, "transactions", "8f14e45f-ceea-4672-9e6b-6a5d1c3b2f10"), oldTx));
    await assertSucceeds(
      addDoc(collection(db, "transactions"), { ...oldTx, description: "Netflix (Otomatik)", category: "Abonelikler" }),
    );
  });

  it("işlem listesi: where userId + orderBy date desc", async () => {
    await seed("transactions/t1", oldTx);
    await seed("transactions/t2", { ...oldTx, userId: "bob" });
    const db = alice();
    await assertSucceeds(getDocs(query(collection(db, "transactions"), where("userId", "==", "alice"), orderBy("date", "desc"))));
  });

  it("settings: birleştirmesiz setDoc, ilk girişte olmayan dokümanı okuma", async () => {
    const db = alice();
    await assertSucceeds(getDoc(doc(db, "settings", "alice")));
    await assertSucceeds(setDoc(doc(db, "settings", "alice"), oldSettings));
    // Dönem aktif etme: Nova alanları olmadan tam yazım (eski davranış).
    const { financialGoal, savingsStyle, riskTolerance, ...withoutNova } = oldSettings;
    void financialGoal;
    void savingsStyle;
    void riskTolerance;
    await assertSucceeds(setDoc(doc(db, "settings", "alice"), withoutNova));
  });

  it("dönem: istemci UUID ile setDoc ve addDoc, startDate sıralı liste", async () => {
    const db = alice();
    await assertSucceeds(setDoc(doc(db, "budget_periods", "2b1c7f00-0000-4000-8000-000000000001"), oldPeriod));
    await assertSucceeds(addDoc(collection(db, "budget_periods"), oldPeriod));
    await assertSucceeds(
      getDocs(query(collection(db, "budget_periods"), where("userId", "==", "alice"), orderBy("startDate", "desc"))),
    );
  });

  it("düzenli ödeme: addDoc, kısmi updateDoc, id alanıyla tam updateDoc", async () => {
    const db = alice();
    const ref = await assertSucceeds(addDoc(collection(db, "recurring_transactions"), oldRecurring));
    await assertSucceeds(updateDoc(ref, { nextDueDate: "2026-12-05", lastProcessedDate: "2026-11-15" }));
    await assertSucceeds(updateDoc(ref, { ...oldRecurring, id: ref.id, isActive: false }));
    await assertSucceeds(getDocs(query(collection(db, "recurring_transactions"), where("userId", "==", "alice"))));
  });
});

describe("yeni alanlar", () => {
  it("deterministik düzenli ödeme kimliği kabul, uyuşmayan kimlik ret", async () => {
    const db = alice();
    const tx = { ...oldTx, recurringId: "rec1", dueDate: "2026-11-05", date: "2026-11-05" };
    await assertSucceeds(getDoc(doc(db, "transactions", "rec1_2026-11-05")));
    await assertSucceeds(setDoc(doc(db, "transactions", "rec1_2026-11-05"), tx));
    // Aynı kimliğe ikinci yazım üzerine yazar (çift kayıt oluşmaz).
    await assertSucceeds(setDoc(doc(db, "transactions", "rec1_2026-11-05"), tx));
    await assertFails(setDoc(doc(db, "transactions", "rec1_2026-11-06"), tx));
    await assertFails(setDoc(doc(db, "transactions", "rec2_2026-11-05"), tx));
    await assertFails(setDoc(doc(db, "transactions", "rec1_2026-11-05"), { ...oldTx }));
  });

  it("taksit alanları 1-36", async () => {
    const db = alice();
    const base = { ...oldTx, installmentGroupId: "g1", installmentCount: 6, createdAt: serverTimestamp() };
    await assertSucceeds(addDoc(collection(db, "transactions"), { ...base, installmentIndex: 1 }));
    await assertFails(addDoc(collection(db, "transactions"), { ...base, installmentIndex: 0 }));
    await assertFails(addDoc(collection(db, "transactions"), { ...base, installmentIndex: 1, installmentCount: 37 }));
    await assertFails(addDoc(collection(db, "transactions"), { ...base, installmentIndex: 1.5 }));
  });

  it("settings: activePeriodId ve payday", async () => {
    const db = alice();
    await assertSucceeds(setDoc(doc(db, "settings", "alice"), { ...oldSettings, activePeriodId: "p1", payday: 15 }));
    await assertSucceeds(setDoc(doc(db, "settings", "alice"), { payday: 31 }, { merge: true }));
    await assertFails(setDoc(doc(db, "settings", "alice"), { payday: 32 }, { merge: true }));
    await assertFails(setDoc(doc(db, "settings", "alice"), { payday: 0 }, { merge: true }));
  });
});

describe("sahiplik", () => {
  it("başkasının dokümanı okunamaz, değiştirilemez, silinemez", async () => {
    await seed("transactions/t1", oldTx);
    const db = bob();
    await assertFails(getDoc(doc(db, "transactions", "t1")));
    await assertFails(updateDoc(doc(db, "transactions", "t1"), { amount: 1 }));
    await assertFails(deleteDoc(doc(db, "transactions", "t1")));
  });

  it("başkası adına oluşturulamaz, sahip değiştirilemez", async () => {
    await assertFails(addDoc(collection(bob(), "transactions"), oldTx));
    await seed("transactions/t1", oldTx);
    await assertFails(updateDoc(doc(alice(), "transactions", "t1"), { userId: "bob" }));
  });

  it("filtresiz ya da başkasının listesi reddedilir", async () => {
    await seed("transactions/t1", oldTx);
    await assertFails(getDocs(collection(alice(), "transactions")));
    await assertFails(getDocs(query(collection(bob(), "transactions"), where("userId", "==", "alice"))));
  });

  it("oturumsuz erişim kapalı", async () => {
    await seed("transactions/t1", oldTx);
    await assertFails(getDoc(doc(anon(), "transactions", "t1")));
    await assertFails(addDoc(collection(anon(), "transactions"), oldTx));
    await assertFails(getDoc(doc(anon(), "settings", "alice")));
  });

  it("settings yalnız kendi kimliğiyle, userId uyuşmalı", async () => {
    await seed("settings/alice", oldSettings);
    await assertFails(getDoc(doc(bob(), "settings", "alice")));
    await assertFails(setDoc(doc(bob(), "settings", "alice"), { ...oldSettings, userId: "bob" }));
    await assertFails(setDoc(doc(alice(), "settings", "alice"), { ...oldSettings, userId: "bob" }));
    await assertFails(getDocs(collection(alice(), "settings")));
  });

  it("dönem ve düzenli ödeme: başkası okuyamaz", async () => {
    await seed("budget_periods/p1", oldPeriod);
    await seed("recurring_transactions/r1", oldRecurring);
    await assertFails(getDoc(doc(bob(), "budget_periods", "p1")));
    await assertFails(getDoc(doc(bob(), "recurring_transactions", "r1")));
    await assertSucceeds(getDoc(doc(alice(), "budget_periods", "p1")));
  });
});

describe("ai_usage yalnız sunucudan yazılır", () => {
  it("kendi sayacını okur, yazamaz; başkasınınkini okuyamaz", async () => {
    await seed("ai_usage/alice", { day: "2026-11-15", receipt: 1, report: 0, chat: 0 });
    await assertSucceeds(getDoc(doc(alice(), "ai_usage", "alice")));
    await assertFails(setDoc(doc(alice(), "ai_usage", "alice"), { day: "2026-11-15", receipt: 0 }));
    await assertFails(deleteDoc(doc(alice(), "ai_usage", "alice")));
    await assertFails(getDoc(doc(bob(), "ai_usage", "alice")));
  });
});

describe("alan doğrulama", () => {
  it("tutar: NaN, negatif, metin reddedilir", async () => {
    const db = alice();
    await assertFails(addDoc(collection(db, "transactions"), { ...oldTx, amount: NaN }));
    await assertFails(addDoc(collection(db, "transactions"), { ...oldTx, amount: -5 }));
    await assertFails(addDoc(collection(db, "transactions"), { ...oldTx, amount: "245,50" }));
    await assertFails(addDoc(collection(db, "recurring_transactions"), { ...oldRecurring, amount: NaN }));
  });

  it("tarih, tür, kategori ve sıklık denetlenir", async () => {
    const db = alice();
    await assertFails(addDoc(collection(db, "transactions"), { ...oldTx, date: "14.11.2026" }));
    await assertFails(addDoc(collection(db, "transactions"), { ...oldTx, type: "transfer" }));
    await assertFails(addDoc(collection(db, "transactions"), { ...oldTx, category: "x".repeat(81) }));
    await assertFails(addDoc(collection(db, "transactions"), { ...oldTx, description: "x".repeat(201) }));
    await assertFails(addDoc(collection(db, "recurring_transactions"), { ...oldRecurring, frequency: "daily" }));
    await assertFails(addDoc(collection(db, "budget_periods"), { ...oldPeriod, startDate: "2026-12-01" }));
  });

  it("zorunlu alan eksikse ret, 40 alan üstü ret, bilinmeyen birkaç alan serbest", async () => {
    const db = alice();
    const { category, ...noCategory } = oldTx;
    void category;
    await assertFails(addDoc(collection(db, "transactions"), noCategory));
    const many: Record<string, unknown> = { ...oldTx };
    for (let i = 0; i < 40; i++) many[`f${i}`] = i;
    await assertFails(addDoc(collection(db, "transactions"), many));
    await assertSucceeds(addDoc(collection(db, "transactions"), { ...oldTx, note: "eski bir alan" }));
  });

  it("tanımsız koleksiyon kapalı", async () => {
    await assertFails(setDoc(doc(alice(), "users", "alice"), { userId: "alice" }));
  });
});
