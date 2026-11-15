import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { applyTheme, watchSystemTheme } from "./theme";
import { initLayout } from "./ui/layout";

/* Tema ilk boyamadan önce index.html içindeki betikle uygulanır; burada çubuk renkleri ve dinleyiciler kurulur.
   Native açılış ekranını Splash bileşeni gizler. */
applyTheme();
watchSystemTheme();
initLayout();

/* Native his: uzun basınca tarayıcı menüsü ve iki parmakla yakınlaştırma yok (yazı alanları ve seçilebilir metin hariç). */
window.addEventListener("contextmenu", (e) => {
  if (!(e.target as Element | null)?.closest?.("input, textarea, [contenteditable], .selectable")) e.preventDefault();
});
window.addEventListener("gesturestart", (e) => e.preventDefault());

const root = document.getElementById("root");
if (!root) throw new Error("#root bulunamadı");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
