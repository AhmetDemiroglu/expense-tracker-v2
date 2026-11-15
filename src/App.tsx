/* Uygulama girişi (P3). EKRAN PAKETLERİ BU DOSYAYA DOKUNMAZ: her ekran klasörü kendi kaydını verir
   (src/screens/<klasör>/kayit.tsx, `export const kayit: ScreenKayit`), burası hepsini toplar. */
import { lazy, Suspense, useState, type ReactNode } from "react";
import { Splash } from "@/brand";
import { AppShell, buildRegistry, type ScreenKayit } from "@/shell";
import { UiHost } from "@/ui";

const modules = import.meta.glob<{ kayit?: ScreenKayit }>("./screens/*/kayit.tsx", { eager: true });
const registry = buildRegistry(
  Object.values(modules).flatMap((m) => (m.kayit ? [m.kayit] : [])),
  (msg) => {
    if (import.meta.env.DEV) console.warn(`[kayit] ${msg}`);
  },
);

/* Veri açılışı: açılış animasyonu bunu bekler (Splash en çok 2,5 sn bekler). */
const ready = Promise.all(registry.ready.map((fn) => fn().catch(() => {})));

/* Vitrin yalnız geliştirmede: http://localhost:5173/?vitrin. Yayın paketine girmez. */
const Vitrin = import.meta.env.DEV ? lazy(() => import("./ui/Vitrin")) : null;
const showVitrin = import.meta.env.DEV && new URLSearchParams(window.location.search).has("vitrin");

export default function App() {
  const [splash, setSplash] = useState(true);

  if (showVitrin && Vitrin) {
    return (
      <Suspense fallback={null}>
        <Vitrin />
      </Suspense>
    );
  }

  const shell: ReactNode = (
    <AppShell tabs={registry.tabs} screens={registry.screens} sheets={registry.sheets} onAdd={registry.onAdd} onProfile={registry.onProfile} />
  );
  /* Kapılar (giriş, karşılama, ilk kurulum) kabuğu sarar; ilk kaydedilen en dışta. */
  const gated = registry.gates.reduceRight<ReactNode>((child, Gate) => <Gate>{child}</Gate>, shell);

  return (
    <>
      {gated}
      <UiHost />
      {splash ? <Splash ready={ready} onDone={() => setSplash(false)} /> : null}
    </>
  );
}
