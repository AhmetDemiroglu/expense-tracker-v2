import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { LocalDate } from "@/core";

// Gerçek Firebase yapılandırması okunmasın: giriş yolu kapalı, yalnız misafir akışı.
vi.stubEnv("VITE_FIREBASE_API_KEY", "");
vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "");
vi.stubEnv("VITE_FIREBASE_APP_ID", "");

const { cihazDeposunuAyarla, bellekDeposu } = await import("./depo/depolama");
cihazDeposunuAyarla(bellekDeposu());
const veriApi = await import("./index");
const { useBugunStore } = await import("./bugun");

function bekle(): Promise<void> {
  return new Promise((r) => setTimeout(r, 5));
}

beforeAll(() => {
  useBugunStore.getState().ayarla("2026-11-15" as LocalDate);
});

afterAll(() => {
  vi.unstubAllEnvs();
  cihazDeposunuAyarla(null);
});

describe("useOturum (duman testi, @/data girişi)", () => {
  it("baslat -> girissiz, misafirBasla -> misafir + veri hazır, cikis -> girissiz", async () => {
    const { useOturum, useVeri, girisSecenekleri } = veriApi;
    expect(girisSecenekleri()).toEqual({ google: false, apple: false, eposta: true });
    useOturum.getState().baslat();
    expect(useOturum.getState().durum).toBe("girissiz");
    expect(useVeri.getState().durum).toBe("bos");

    await useOturum.getState().misafirBasla();
    expect(useOturum.getState().durum).toBe("misafir");
    expect(useOturum.getState().kullanici?.misafir).toBe(true);
    for (let i = 0; i < 20 && useVeri.getState().durum !== "hazir"; i += 1) await bekle();
    const v = useVeri.getState();
    expect(v.durum).toBe("hazir");
    expect(v.ayarDurumu).toBe("var");
    expect(v.islemler.length).toBeGreaterThan(5);

    await useOturum.getState().cikis();
    expect(useOturum.getState().durum).toBe("girissiz");
    expect(useVeri.getState().durum).toBe("bos");
  });
});
