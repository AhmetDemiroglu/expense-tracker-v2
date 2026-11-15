import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalDate, Transaction } from "@/core";

const yaz = vi.fn(async (_o: { path: string; data: string; directory: string; encoding: string }) => ({ uri: "file:///cache/x.csv" }));
const paylas = vi.fn(async (_o: { files?: string[] }) => ({}));

vi.mock("@capacitor/core", async (orijinal) => {
  const m = await orijinal<typeof import("@capacitor/core")>();
  return { ...m, Capacitor: { ...m.Capacitor, isNativePlatform: () => true, getPlatform: () => "android" } };
});
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: (o: Parameters<typeof yaz>[0]) => yaz(o) },
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
}));
vi.mock("@capacitor/share", () => ({ Share: { share: (o: Parameters<typeof paylas>[0]) => paylas(o) } }));

const { islemleriDisaAktar, BOM } = await import("./disaAktar");

const D = (s: string) => s as LocalDate;
const islemler: Transaction[] = [
  { id: "1", userId: "u", description: "Market", amount: 64_000, type: "expense", category: "market", date: D("2026-11-05"), createdAt: 1 },
];

beforeEach(() => {
  yaz.mockClear();
  paylas.mockClear();
});

describe("native CSV paylaşımı", () => {
  it("önbelleğe UTF-8 yazar, dosyayı paylaşım penceresine verir", async () => {
    await expect(islemleriDisaAktar(islemler, D("2026-11-15"))).resolves.toBe("paylasildi");
    expect(yaz).toHaveBeenCalledTimes(1);
    const o = yaz.mock.calls[0]?.[0];
    expect(o).toMatchObject({ path: "fintel-kayitlar-2026-11-15.csv", directory: "CACHE", encoding: "utf8" });
    expect(o?.data.startsWith(BOM)).toBe(true);
    expect(paylas.mock.calls[0]?.[0]).toMatchObject({ files: ["file:///cache/x.csv"] });
  });

  it("kullanıcı paylaşımı kapatırsa 'iptal', başka hata Türkçe hataya döner", async () => {
    paylas.mockRejectedValueOnce(new Error("Share canceled"));
    await expect(islemleriDisaAktar(islemler, D("2026-11-15"))).resolves.toBe("iptal");
    yaz.mockRejectedValueOnce(new Error("disk"));
    await expect(islemleriDisaAktar(islemler, D("2026-11-15"))).rejects.toMatchObject({ kod: "BILINMEYEN" });
  });
});
