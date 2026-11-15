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

describe("useOturum: misafir devam ve girişe geç", () => {
  it("giriseGec veriyi bırakır; girissiz iken devam önerilir ve misafirDevamEt aynı veriyi açar", async () => {
    const { useOturum, useVeri, useTercihler } = veriApi;
    await useOturum.getState().misafirBasla();
    for (let i = 0; i < 20 && useVeri.getState().durum !== "hazir"; i += 1) await bekle();
    const guestId = useOturum.getState().kullanici?.uid ?? "";
    const t = await useVeri.getState().islemEkle({ description: "Simit", amount: 1_500, type: "expense", category: "yeme_icme", date: "2026-11-15" as LocalDate });

    expect(useOturum.getState().devamEdilebilirMisafir()).toBeNull(); // misafirken önerilmez
    await useOturum.getState().giriseGec();
    expect(useOturum.getState().durum).toBe("girissiz");
    expect(useTercihler.getState().karsilamaTamam).toBe(true); // kapı doğrudan giriş ekranı

    const oneri = useOturum.getState().devamEdilebilirMisafir();
    expect(oneri?.guestId).toBe(guestId);
    expect(oneri?.islem).toBeGreaterThan(5);

    await useOturum.getState().misafirDevamEt(guestId);
    expect(useOturum.getState().durum).toBe("misafir");
    for (let i = 0; i < 20 && useVeri.getState().durum !== "hazir"; i += 1) await bekle();
    expect(useVeri.getState().islemler.some((x) => x.id === t.id)).toBe(true);
    await useOturum.getState().cikis();
  });

  it("geçersiz misafir kimliği reddedilir", async () => {
    await expect(veriApi.useOturum.getState().misafirDevamEt("baska_1")).rejects.toMatchObject({ kod: "GECERSIZ" });
  });
});

describe("Nova tercihleri ve sohbet yeniden deneme", () => {
  it("novaMod ve novaStil kalıcı yazılır", async () => {
    const { useTercihler } = veriApi;
    const { cihazDeposu } = await import("./depo/depolama");
    useTercihler.getState().novaModDegistir("tutor");
    useTercihler.getState().novaStilDegistir("short");
    expect(useTercihler.getState()).toMatchObject({ novaMod: "tutor", novaStil: "short" });
    expect(JSON.parse(cihazDeposu().getItem("fintel_nova_tercih") ?? "{}")).toEqual({ mod: "tutor", stil: "short" });
  });

  it("tekrarDene ikinci kullanıcı balonu eklemeden yanıt ister", async () => {
    const { useSohbet } = veriApi;
    const ai = await import("@/services/ai");
    const sohbet = vi.spyOn(ai.ai, "sohbet");
    sohbet.mockRejectedValueOnce(new (await import("./hatalar")).UygulamaHatasi("AI_UNAVAILABLE"));
    sohbet.mockResolvedValueOnce({ yanit: "Merhaba", kullanim: { kullanilan: 1, sinir: 60 } });
    useSohbet.setState({ sahip: "u-test", mesajlar: [], bekliyor: false, hata: null });

    await useSohbet.getState().gonder("Selam", { mod: "advisor" });
    expect(useSohbet.getState().hata?.kod).toBe("AI_UNAVAILABLE");
    expect(useSohbet.getState().mesajlar.map((m) => m.rol)).toEqual(["user"]);
    expect(useSohbet.getState().tekrarDenenebilir()).toBe(true);

    await useSohbet.getState().tekrarDene({ mod: "advisor" });
    expect(useSohbet.getState().mesajlar.map((m) => [m.rol, m.metin])).toEqual([["user", "Selam"], ["model", "Merhaba"]]);
    expect(useSohbet.getState().hata).toBeNull();
    expect(useSohbet.getState().tekrarDenenebilir()).toBe(false);
    expect(sohbet.mock.calls[1]?.[0].mesajlar).toEqual([{ role: "user", text: "Selam" }]);
    sohbet.mockRestore();
  });
});
