// Ham kayıt <-> çekirdek tipi eşlemesi. İki depo da bunu kullanır: okuma ve yazma tek yerde.

import {
  readPeriod,
  readRecurring,
  readSettings,
  readTransaction,
  writePeriod,
  writeRecurring,
  writeTransaction,
  type Period,
  type ReadResult,
  type Recurring,
  type Settings,
  type Transaction,
} from "@/core";
import type { AyarDurumu, BozukKayit, VeriPaketi } from "./tipler";

export interface HamDokuman {
  id: string;
  veri: unknown;
}

function oku<T>(
  koleksiyon: BozukKayit["koleksiyon"],
  liste: readonly HamDokuman[],
  okuyucu: (id: string, raw: unknown) => ReadResult<T>,
  bozuk: BozukKayit[],
): T[] {
  const out: T[] = [];
  for (const d of liste) {
    const r = okuyucu(d.id, d.veri);
    if (r.ok) out.push(r.value);
    else bozuk.push({ koleksiyon, id: d.id, neden: r.reason });
  }
  return out;
}

export function islemSirala(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function donemSirala(a: Period, b: Period): number {
  if (a.start !== b.start) return a.start < b.start ? 1 : -1;
  return a.id < b.id ? -1 : 1;
}

/**
 * Ham dokümanlardan paket kurar.
 * ayarHam: undefined = doküman yok. ayarKesin: "yok" kararı verilebilir mi (sunucu doğruladı ya da yerel depo).
 */
export function paketKur(args: {
  userId: string;
  islemler: readonly HamDokuman[];
  donemler: readonly HamDokuman[];
  duzenliler: readonly HamDokuman[];
  ayarHam: unknown;
  ayarKesin: boolean;
  ekBozuk?: readonly BozukKayit[];
}): VeriPaketi {
  const bozuk: BozukKayit[] = [...(args.ekBozuk ?? [])];
  const islemler = oku("islem", args.islemler, readTransaction, bozuk).sort(islemSirala);
  const donemler = oku("donem", args.donemler, readPeriod, bozuk).sort(donemSirala);
  const duzenliler = oku("duzenli", args.duzenliler, readRecurring, bozuk);
  let ayarlar: Settings | null = null;
  if (args.ayarHam !== undefined) {
    const r = readSettings(args.userId, args.ayarHam);
    if (r.ok) ayarlar = r.value;
    else bozuk.push({ koleksiyon: "ayar", id: args.userId, neden: r.reason });
  }
  let ayarDurumu: AyarDurumu;
  if (ayarlar?.period) ayarDurumu = "var";
  else ayarDurumu = args.ayarKesin ? "yok" : "bilinmiyor";
  return { islemler, donemler, duzenliler, ayarlar, ayarDurumu, bozuk };
}

/** Yazıcının bu kayıtta koymadığı, ama eski kayıtta kalmış olabilecek isteğe bağlı alanlar silinir. */
const ISLEM_ISTEGE_BAGLI = [
  "recurringId",
  "dueDate",
  "installmentGroupId",
  "installmentIndex",
  "installmentCount",
  "planned",
] as const;
const DUZENLI_ISTEGE_BAGLI = ["lastProcessedDate"] as const;

export interface YazimVerisi {
  veri: Record<string, unknown>;
  /** Kayıtta varsa silinecek alanlar (yazıcı artık koymuyor) */
  silinecek: string[];
}

function eksikler(veri: Record<string, unknown>, anahtarlar: readonly string[]): string[] {
  return anahtarlar.filter((k) => !(k in veri));
}

export function islemVerisi(tx: Transaction): YazimVerisi {
  const veri = writeTransaction(tx);
  return { veri, silinecek: eksikler(veri, ISLEM_ISTEGE_BAGLI) };
}

export function donemVerisi(p: Period): YazimVerisi {
  return { veri: writePeriod(p), silinecek: [] };
}

export function duzenliVerisi(r: Recurring): YazimVerisi {
  const veri = writeRecurring(r);
  return { veri, silinecek: eksikler(veri, DUZENLI_ISTEGE_BAGLI) };
}

/** Misafir dizisindeki ham nesneyi günceller: bilinmeyen eski alanlar korunur, kimlik içeride. */
export function hamBirlestir(eski: unknown, y: YazimVerisi, id: string): Record<string, unknown> {
  const taban =
    typeof eski === "object" && eski !== null && !Array.isArray(eski) ? { ...(eski as Record<string, unknown>) } : {};
  for (const k of y.silinecek) delete taban[k];
  return { ...taban, ...y.veri, id };
}
