import type { CapacitorConfig } from "@capacitor/cli";

/* DİKKAT: appId, androidScheme ve ana makine adı (varsayılan "localhost") DEĞİŞMEZ.
   Misafir verisi WebView localStorage'ında, kaynak (https://localhost) değişirse kaybolur. */
const config: CapacitorConfig = {
  appId: "com.fintel.app",
  appName: "Fintel",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  /* WebView'ın kendi kaydırması kapalı: gövde zaten sabit, kayan yalnız iç listeler. Klavye çıkınca sistemin sayfayı itmesini
     (alanın klavyeye yapışması) ve bütün sayfanın lastik gibi esnemesini önler. Klavye payını düzen yönetir (src/ui/layout.ts). */
  ios: {
    scrollEnabled: false,
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ["google.com", "apple.com"],
    },
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      launchFadeOutDuration: 250,
      /* backgroundColor verilmez: iOS'ta açılış görünümünün zeminini sabit renge boyar, gece temasında açık zemin çıkar.
         Zemin native kaynaklardan gelir (SplashScreenBackground, splashscreen_background: gündüz ve gece). */
      showSpinner: false,
    },
    SystemBars: {
      insetsHandling: "css",
      style: "DEFAULT",
    },
    Keyboard: {
      resize: "none",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
