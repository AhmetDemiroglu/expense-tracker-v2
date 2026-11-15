/* Sürükleme ya da uzun basış bir tıklamayla bitmesin diye, yalnız O HAREKETİN kendi click olayı yutulur.
   Kalıcı bayrak yoktur: bastırma kısa bir süre sonra kendiliğinden düşer ve YENİ bir dokunuş (pointerdown) başladığı anda
   kesin olarak silinir. Böylece jestten sonraki ilk dokunuş hiçbir koşulda boşa gitmez. */

let deadline = 0;
let installed = false;

function install(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  /* Yeni dokunuş: önceki hareketten kalan bastırma geçersiz. */
  window.addEventListener(
    "pointerdown",
    () => {
      deadline = 0;
    },
    true,
  );
  window.addEventListener(
    "click",
    (e) => {
      if (!deadline) return;
      const active = performance.now() <= deadline;
      deadline = 0;
      if (!active) return;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );
}

/** Şu an süren hareketin ardından gelecek tek click olayını yutar. ms: en çok bu kadar beklenir. */
export function swallowNextClick(ms = 80): void {
  install();
  deadline = performance.now() + ms;
}

/** Yalnız test için. */
export function _clickGuardState(): { armed: boolean } {
  return { armed: deadline > 0 && performance.now() <= deadline };
}
