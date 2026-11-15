/* Geçici ekran (P0). P3 kabuğu kurunca değiştirilir. */
import logoLight from "../brand/logo/svg/lockup-v-slogan-light.svg";
import logoDark from "../brand/logo/svg/lockup-v-slogan-dark.svg";

export default function App() {
  return (
    <main className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-bg px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-text">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 20% 15%, var(--f-glow-1), transparent 70%), radial-gradient(55% 40% at 85% 85%, var(--f-glow-2), transparent 70%)",
        }}
      />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-8 rounded-card border border-glass-line bg-glass px-8 py-10 shadow-[0_12px_40px_rgba(10,14,28,0.12)] backdrop-blur-xl">
        <img src={logoLight} alt="fintel" className="h-44 w-auto dark:hidden" />
        <img src={logoDark} alt="fintel" className="hidden h-44 w-auto dark:block" />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-semibold">Fintel 3.0 hazırlanıyor</p>
          <p className="text-sm text-text-2">Yeni sürüm üzerinde çalışıyoruz.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-pill bg-copper" />
          <span className="num text-sm text-text-3">₺12.480,50</span>
        </div>
      </div>
    </main>
  );
}
