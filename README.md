# Fintel

Evin hesabı, cebinde. Türkçe kişisel bütçe uygulaması: dönem bütçesi, günlük limit, kayıtlar, düzenli ödemeler,
fiş okuma ve Nova asistanı. Android'de yayında (`com.fintel.app`), iOS sürümü hazırlanıyor.

Sürüm 3.0 baştan yazıldı. Eski kod git geçmişinde durur.

Web sürümü: https://app.fintel.septimuslab.com (eski adres https://expense-tracker-v2-f5a0b.web.app de çalışır). Tanıtım: https://fintel.septimuslab.com/marketing/

## Teknoloji

- React 19, TypeScript (strict), Vite 7, Tailwind 4
- Capacitor 8 (Android, iOS)
- Firebase: Authentication, Firestore, Cloud Functions (AI proxy)
- zustand, vitest, eslint

## Kurulum

Node 22 gerekir.

```bash
npm install
npm run dev
```

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Tip denetimi ve üretim paketi (`dist/`) |
| `npm run test` | Birim testleri (vitest) |
| `npm run lint` | eslint |
| `npm run cap:sync` | Paketi üretir, native projelere kopyalar |
| `npm run cap:android` | Senkronlar ve Android Studio'yu açar |

## Klasörler

| Klasör | İçerik |
|---|---|
| `src/core` | Saf hesap çekirdeği ve testleri |
| `src/data`, `src/services` | Veri katmanı, giriş, AI istemcisi |
| `src/ui`, `src/shell` | Tasarım sistemi, tema tokenları, kabuk |
| `src/screens` | Ekranlar |
| `functions/` | Cloud Functions |
| `android/`, `ios/` | Native projeler (elle yönetilir, `expo prebuild` benzeri yeniden üretim yok) |
| `brand/` | Marka kiti, logo ve tema kuralları |

## Android derleme

```bash
npm run cap:android
```

Android Studio'dan imzalı AAB alınır. Sürüm numarası `android/app/build.gradle` içindedir.

## Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyala ve `VITE_FIREBASE_*` değerlerini doldur. İstemcide AI anahtarı bulunmaz, AI çağrıları sunucu üzerinden yapılır.

## İletişim

info@septimuslab.com · by SeptimusLab
