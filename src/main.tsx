import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { SplashScreen } from "@capacitor/splash-screen";
import { applyTheme, watchSystemTheme } from "./theme";

applyTheme();
watchSystemTheme();

const root = document.getElementById("root");
if (!root) throw new Error("#root bulunamadı");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/* capacitor.config: launchAutoHide false. Kabuk hazır olunca gizlenir (P3 bu çağrıyı kendi açılışına taşır). */
requestAnimationFrame(() => {
  void SplashScreen.hide().catch(() => {});
});
