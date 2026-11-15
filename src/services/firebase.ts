// Firebase yapılandırması. Değerler import.meta.env'den (VITE_FIREBASE_*, gizli değildir).
// Tembel başlatma: modül yüklenince hiçbir şey çalışmaz (testler ve eksik .env için).

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import { Capacitor } from "@capacitor/core";
import { UygulamaHatasi } from "@/data/hatalar";

/** Sunucu uçlarının bölgesi (P2). Bölgesiz çağrı us-central1'e gider ve 404 alır. */
export const FONKSIYON_BOLGESI = "europe-west1";

function yapilandirma() {
  const env = import.meta.env;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
}

export function firebaseHazir(): boolean {
  const c = yapilandirma();
  return Boolean(c.apiKey && c.projectId && c.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let fns: Functions | null = null;

export function firebaseUygulamasi(): FirebaseApp {
  if (app) return app;
  if (!firebaseHazir()) {
    throw new UygulamaHatasi("SAGLAYICI_YOK", { mesaj: "Uygulama yapılandırması eksik. Hesapsız deneyebilirsin." });
  }
  app = getApps()[0] ?? initializeApp(yapilandirma());
  return app;
}

/**
 * Native'de getAuth() iOS WebView'da asılı kalabiliyor (popup çözücüsü iframe yükler).
 * initializeAuth ile aynı kalıcılık (IndexedDB önce): var olan Android oturumları açık kalır.
 */
export function kimlikDogrulama(): Auth {
  if (auth) return auth;
  const a = firebaseUygulamasi();
  auth = Capacitor.isNativePlatform()
    ? initializeAuth(a, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
    : initializeAuth(a, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
  auth.languageCode = "tr";
  return auth;
}

/** Kalıcı yerel önbellek açık: çevrimdışı açılış ve yazım. */
export function veritabani(): Firestore {
  if (db) return db;
  const a = firebaseUygulamasi();
  db = initializeFirestore(a, {
    localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
  });
  return db;
}

export function fonksiyonlar(): Functions {
  if (fns) return fns;
  fns = getFunctions(firebaseUygulamasi(), FONKSIYON_BOLGESI);
  return fns;
}
