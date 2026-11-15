// Oturum store'u: kullanıcı, misafir, giriş eylemleri, hesap silme, misafirden hesaba aktarım.
// Oturum değişince veri deposu kendiliğinden bağlanır (FirestoreRepo ya da LocalRepo).

import { create } from "zustand";
import type { User } from "firebase/auth";
import { ACTIVE_GUEST_KEY, activationPatch } from "@/core";
import * as auth from "@/services/auth";
import { firebaseHazir, veritabani } from "@/services/firebase";
import { baglantiyiIzle } from "./baglanti";
import { bugunuIzle, useBugunStore } from "./bugun";
import { cihazDeposu } from "./depo/depolama";
import { FirestoreRepo } from "./depo/firestoreRepo";
import { sdkPortu } from "./depo/firestoreSdk";
import { LocalRepo } from "./depo/localRepo";
import { UygulamaHatasi, veriHatasinaCevir } from "./hatalar";
import { useTercihler } from "./tercihler";
import {
  aktarilabilirMisafirBul,
  aktarimKarariYaz,
  aktarimPlaniKur,
  demoMisafirOlustur,
  devamEdilebilirMisafirBul,
  kayitliMisafir,
  misafirPaketi,
  type MisafirOzeti,
} from "./misafir";
import { eskiSohbetiTemizle, sohbetiSil, sohbetSahibiniAyarla } from "./sohbet";
import { ayarYamasi, depoyaBaglan, useVeri, varsayilanAyarlar } from "./veri";

export type OturumDurumu = "baslatiliyor" | "girissiz" | "hesap" | "misafir";
export type Mesgul = null | "google" | "apple" | "eposta" | "kayit" | "cikis" | "silme" | "aktarim";

export interface Kullanici {
  uid: string;
  ad: string | null;
  eposta: string | null;
  epostaDogrulandi: boolean;
  saglayici: "google" | "apple" | "password" | "misafir";
  misafir: boolean;
  fotoUrl: string | null;
  /** E-posta + parola yöntemi var: "Parola değiştir"; yoksa (Google/Apple) "Parola oluştur" */
  parolaVar: boolean;
}

export interface SilmeSonucu {
  islem: number;
  donem: number;
  duzenli: number;
  /** Apple ile girmiş kullanıcıda token iptali sonucu */
  appleIptal: "yapildi" | "basarisiz" | "gerekmedi";
  /** Doluysa ekran başarı mesajından sonra bunu da gösterir (silme tamamlandı, Apple bağlantısı kaldı) */
  uyari: string | null;
}

export interface AktarimSonucu {
  eklenen: { islem: number; donem: number; duzenli: number };
  atlanan: number;
  ayarlarAktarildi: boolean;
}

export type { MisafirOzeti } from "./misafir";

interface OturumStore {
  durum: OturumDurumu;
  kullanici: Kullanici | null;
  mesgul: Mesgul;
  baslat(): void;
  googleIleGir(): Promise<void>;
  appleIleGir(): Promise<void>;
  epostaIleGir(eposta: string, parola: string): Promise<void>;
  kayitOl(eposta: string, parola: string, ad?: string): Promise<void>;
  dogrulamaGonder(): Promise<void>;
  sifreSifirla(eposta: string): Promise<void>;
  epostaDurumunuYenile(): Promise<boolean>;
  misafirBasla(): Promise<void>;
  /** Oturum kapalıyken: cihazda kaldığı yerden devam edilebilecek misafir */
  devamEdilebilirMisafir(): MisafirOzeti | null;
  misafirDevamEt(guestId: string): Promise<void>;
  /** Misafirden giriş ekranına: veri cihazda kalır, durum "girissiz" olur (kapı giriş ekranını açar) */
  giriseGec(): Promise<void>;
  adGuncelle(ad: string): Promise<void>;
  parolaDegistir(mevcut: string, yeni: string): Promise<void>;
  parolaOlustur(yeni: string): Promise<void>;
  /** Hassas işlem öncesi (parola oluşturma YENIDEN_GIRIS dönerse) */
  yenidenDogrula(parola?: string): Promise<void>;
  cikis(): Promise<void>;
  hesabiSil(parola?: string): Promise<SilmeSonucu>;
  aktarilabilirMisafir(): MisafirOzeti | null;
  misafirdenAktar(guestId: string): Promise<AktarimSonucu>;
  misafirAktariminiReddet(guestId: string): void;
}

function kullaniciFrom(u: User): Kullanici {
  return {
    uid: u.uid,
    ad: u.displayName,
    eposta: u.email,
    epostaDogrulandi: u.emailVerified,
    saglayici: auth.saglayiciAdi(u),
    parolaVar: auth.parolaVarMi(u),
    misafir: false,
    fotoUrl: u.photoURL,
  };
}

function misafirKullanici(guestId: string): Kullanici {
  return {
    uid: guestId,
    ad: "Misafir",
    eposta: null,
    epostaDogrulandi: false,
    saglayici: "misafir",
    misafir: true,
    fotoUrl: null,
    parolaVar: false,
  };
}

/** Hesapla girmeden önce açık olan misafir (aktarım önerisinde önce o gelir) */
const SON_MISAFIR_ANAHTARI = "fintel_son_misafir";

let basladi = false;
let sonHesapUid: string | null = null;

export const useOturum = create<OturumStore>((set, get) => {
  function misafiriAc(guestId: string): void {
    set({ durum: "misafir", kullanici: misafirKullanici(guestId) });
    sohbetSahibiniAyarla(guestId);
    depoyaBaglan(new LocalRepo(guestId, cihazDeposu()));
  }

  function kullaniciyiYenile(): void {
    const u = auth.aktifKullanici();
    if (u && get().durum === "hesap") set({ kullanici: kullaniciFrom(u) });
  }

  function girissiz(): void {
    set({ durum: "girissiz", kullanici: null });
    sohbetSahibiniAyarla(null);
    depoyaBaglan(null);
  }

  function hesabiAc(u: User): void {
    const k = kullaniciFrom(u);
    // Hesapla girildi: misafir kimliği bırakılır (veri cihazda kalır, aktarım önerisi için en son misafir hatırlanır).
    try {
      const g = kayitliMisafir(cihazDeposu());
      if (g) cihazDeposu().setItem(SON_MISAFIR_ANAHTARI, g);
      cihazDeposu().removeItem(ACTIVE_GUEST_KEY);
    } catch {
      // yok say
    }
    set({ durum: "hesap", kullanici: k });
    if (sonHesapUid !== u.uid) {
      sonHesapUid = u.uid;
      sohbetSahibiniAyarla(u.uid);
      depoyaBaglan(new FirestoreRepo(u.uid, sdkPortu(veritabani())));
    }
  }

  async function mesgulIle<T>(m: Exclude<Mesgul, null>, is: () => Promise<T>): Promise<T> {
    if (get().mesgul) throw new UygulamaHatasi("IPTAL", { mesaj: "Önceki işlem sürüyor." });
    set({ mesgul: m });
    try {
      return await is();
    } finally {
      set({ mesgul: null });
    }
  }

  return {
    durum: "baslatiliyor",
    kullanici: null,
    mesgul: null,

    baslat() {
      if (basladi) return;
      basladi = true;
      bugunuIzle();
      baglantiyiIzle();
      eskiSohbetiTemizle();
      if (!firebaseHazir()) {
        const g = kayitliMisafir(cihazDeposu());
        if (g) misafiriAc(g);
        else girissiz();
        return;
      }
      auth.oturumuDinle((u) => {
        if (u) {
          hesabiAc(u);
          return;
        }
        sonHesapUid = null;
        const g = kayitliMisafir(cihazDeposu());
        if (g) misafiriAc(g);
        else girissiz();
      });
    },

    googleIleGir: () => mesgulIle("google", () => auth.googleIleGir()),
    appleIleGir: () => mesgulIle("apple", () => auth.appleIleGir()),
    epostaIleGir: (e, p) => mesgulIle("eposta", () => auth.epostaIleGir(e, p)),
    kayitOl: (e, p, ad) => mesgulIle("kayit", () => auth.kayitOl(e, p, ad)),
    dogrulamaGonder: () => auth.dogrulamaGonder(),
    sifreSifirla: (e) => auth.sifreSifirla(e),

    async epostaDurumunuYenile() {
      const ok = await auth.epostaDurumunuYenile();
      const u = auth.aktifKullanici();
      if (u && get().durum === "hesap") set({ kullanici: kullaniciFrom(u) });
      return ok;
    },

    async misafirBasla() {
      const guestId = demoMisafirOlustur(cihazDeposu(), useBugunStore.getState().bugun, Date.now());
      misafiriAc(guestId);
    },

    cikis: () =>
      mesgulIle("cikis", async () => {
        const k = get().kullanici;
        if (!k) return;
        if (k.misafir) {
          // Eski davranış: yalnız active_guest silinir, veri cihazda kalır.
          cihazDeposu().removeItem(ACTIVE_GUEST_KEY);
          girissiz();
          return;
        }
        sohbetiSil(k.uid);
        await auth.cikisYap();
        // onAuthStateChanged null ile girissiz'e geçirir.
      }),

    hesabiSil: (parola) =>
      mesgulIle("silme", async () => {
        const k = get().kullanici;
        if (!k) throw new UygulamaHatasi("OTURUM_YOK");
        if (k.misafir) {
          const repo = new LocalRepo(k.uid, cihazDeposu());
          const p = repo.oku();
          repo.tumunuSil();
          cihazDeposu().removeItem(ACTIVE_GUEST_KEY);
          sohbetiSil(k.uid);
          girissiz();
          return {
            islem: p.islemler.length,
            donem: p.donemler.length,
            duzenli: p.duzenliler.length,
            appleIptal: "gerekmedi",
            uyari: null,
          };
        }
        const r = await auth.hesabiKaliciSil(parola);
        sohbetiSil(k.uid);
        return {
          islem: r.transactions,
          donem: r.budget_periods,
          duzenli: r.recurring_transactions,
          appleIptal: r.appleIptal,
          uyari: r.uyari,
        };
      }),

    devamEdilebilirMisafir() {
      if (get().durum !== "girissiz") return null;
      return devamEdilebilirMisafirBul(cihazDeposu(), cihazDeposu().getItem(SON_MISAFIR_ANAHTARI));
    },

    async misafirDevamEt(guestId) {
      if (!guestId.startsWith("guest_")) throw new UygulamaHatasi("GECERSIZ");
      if (get().durum === "hesap") throw new UygulamaHatasi("GECERSIZ", { mesaj: "Önce hesabından çıkış yap." });
      try {
        cihazDeposu().setItem(ACTIVE_GUEST_KEY, guestId);
      } catch (e) {
        throw veriHatasinaCevir(e);
      }
      misafiriAc(guestId);
    },

    async giriseGec() {
      const k = get().kullanici;
      if (!k?.misafir) return;
      // Veri silinmez; en son misafir hatırlanır (giriş sonrası aktarım ve "devam et" önce onu önerir).
      try {
        cihazDeposu().setItem(SON_MISAFIR_ANAHTARI, k.uid);
        cihazDeposu().removeItem(ACTIVE_GUEST_KEY);
      } catch {
        // yok say
      }
      useTercihler.getState().karsilamayiTamamla();
      girissiz();
    },

    async adGuncelle(ad) {
      await auth.adGuncelle(ad);
      kullaniciyiYenile();
    },

    parolaDegistir: (mevcut, yeni) => auth.parolaDegistir(mevcut, yeni),

    async parolaOlustur(yeni) {
      await auth.parolaOlustur(yeni);
      kullaniciyiYenile();
    },

    async yenidenDogrula(parola) {
      await auth.yenidenDogrula(parola);
    },

    aktarilabilirMisafir() {
      if (get().durum !== "hesap") return null;
      return aktarilabilirMisafirBul(cihazDeposu(), cihazDeposu().getItem(SON_MISAFIR_ANAHTARI));
    },

    misafirdenAktar: (guestId) =>
      mesgulIle("aktarim", async () => {
        const k = get().kullanici;
        if (!k || k.misafir) throw new UygulamaHatasi("OTURUM_YOK");
        const v = useVeri.getState();
        if (v.durum !== "hazir" || v.onbellektenMi) {
          throw new UygulamaHatasi("AG_YOK", { mesaj: "Aktarım için internet bağlantısı gerekli." });
        }
        const hedef = {
          islemler: v.islemler,
          donemler: v.donemler,
          duzenliler: v.duzenliler,
          ayarlar: v.ayarlar,
          ayarDurumu: v.ayarDurumu,
          bozuk: v.bozuk,
        };
        const plan = aktarimPlaniKur(misafirPaketi(cihazDeposu(), guestId), hedef, k.uid);
        // Aktarım bilinçli bir eylem: sunucu onayı beklenir (doğrudan depo, iyimser değil).
        const repo = new FirestoreRepo(k.uid, sdkPortu(veritabani()));
        await repo.islemleriYaz(plan.islemler);
        for (const p of plan.donemler) await repo.donemYaz(p);
        for (const r of plan.duzenliler) await repo.duzenliYaz(r);
        if (plan.ayarlar) {
          const { donem, profil } = plan.ayarlar;
          const s = { ...varsayilanAyarlar(k.uid), ...profil };
          await repo.ayarlarYaz({
            ...ayarYamasi(s, ["financialGoal", "savingsStyle", "riskTolerance", ...(profil.payday ? (["payday"] as const) : [])]),
            ...activationPatch(donem),
          });
        }
        aktarimKarariYaz(cihazDeposu(), guestId, `aktarildi:${k.uid}`);
        return {
          eklenen: { islem: plan.islemler.length, donem: plan.donemler.length, duzenli: plan.duzenliler.length },
          atlanan: plan.atlanan,
          ayarlarAktarildi: plan.ayarlar !== null,
        };
      }),

    misafirAktariminiReddet(guestId) {
      aktarimKarariYaz(cihazDeposu(), guestId, "reddedildi");
    },
  };
});

/** Senkron: hangi giriş düğmeleri gösterilir. false olan gizlenir. */
export function girisSecenekleri(): { google: boolean; apple: boolean; eposta: true } {
  return auth.girisSecenekleri();
}
