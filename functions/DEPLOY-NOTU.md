# Fintel sunucu deploy notu (3.0)

Proje: `expense-tracker-v2-f5a0b`. Bölge: `europe-west1`. Uçlar: `aiProxy`, `deleteAccount`.
Sözleşme: `kaynaklar/havuz/SOZLESMELER.md` > "Sunucu uçları".

**Sıra önemli:** önce indeksler ve kurallar, sonra fonksiyonlar, en son 3.0 uygulaması. Kurallar eski 2.x sürümünün yazma biçimini de kabul eder, 3.0'dan önce yayınlanabilir.

## Ön koşullar (bir kez, ~15 dk)

1. **Blaze planı:** Cloud Functions 2. nesil ve Secret Manager Blaze ister. Konsol > Kullanım ve faturalandırma > plan Blaze mi bak.
2. **Bütçe uyarısı:** Google Cloud konsolu > Faturalandırma > Bütçeler ve uyarılar > proje için aylık 10 $ bütçe, %50 / %90 / %100 e-posta uyarısı. Bütçe uyarısı harcamayı durdurmaz, yalnız haber verir.
3. **Gemini anahtarı:** AI Studio > API anahtarları > bu projeye (`expense-tracker-v2-f5a0b`) bağlı yeni anahtar. Google Cloud konsolunda anahtarı kısıtla: yalnız "Generative Language API". AI Studio'da projenin harcama sınırı ayarı varsa aylık 10 $ ver.
4. **Eski anahtarlar:** Groq ve Z.ai anahtarlarını kendi panellerinden sil (yayındaki 2.x APK'nın içinde açıkta duruyorlar, 3.0 bunları kullanmıyor).

## Deploy (~10 dk)

Mac'te genel `firebase` komutu kurulu değil. `functions/` içindeki yerel sürüm kullanılabilir: aşağıdaki her `firebase` yerine `functions/node_modules/.bin/firebase` yaz (Fintel kökünden), ya da bir kez `npm i -g firebase-tools`.

1. Testler:
   ```bash
   cd /Volumes/KIOXIA/Dev/SaaS/Fintel/functions && npm ci && npm test && npm run build
   ```
2. Konsoldaki mevcut kuralları yedekle: Firebase konsolu > Firestore > Kurallar > metnin tamamını kopyala, `kaynaklar/yedek/firestore.rules.2026-11-<gün>` dosyasına yapıştır (repoya girmez). İndeksler sekmesinin ekran görüntüsünü de al.
3. Giriş ve proje:
   ```bash
   firebase login
   ```
   ```bash
   cd /Volumes/KIOXIA/Dev/SaaS/Fintel && firebase use expense-tracker-v2-f5a0b
   ```
4. Secret (anahtarı komut sorunca yapıştır, ekrana ve geçmişe yazılmaz):
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```
5. İndeksler (oluşması birkaç dakika sürer, konsolda "Etkin" olmasını bekle):
   ```bash
   firebase deploy --only firestore:indexes
   ```
   Konsolda repoda olmayan eski indeks varsa CLI silmek isteyip istemediğini sorar: **Hayır** de.
6. Kurallar:
   ```bash
   firebase deploy --only firestore:rules
   ```
7. Fonksiyonlar:
   ```bash
   firebase deploy --only functions:aiProxy,functions:deleteAccount
   ```

## Duman testi (~5 dk)

1. **Model alanları** (deploy'dan önce de yapılabilir, anahtar yalnız bu komutun ortamında kalır):
   ```bash
   cd /Volumes/KIOXIA/Dev/SaaS/Fintel/functions && GEMINI_API_KEY='<anahtar>' DUMAN_FIS=/yol/bir-fis.jpg npm run test:duman
   ```
   Beklenen: iki model için rapor, sohbet ve fiş testleri geçer. `responseJsonSchema` ve `thinkingLevel` alanları gerçek istekle doğrulanmadı, ilk kontrol budur. 400 gelirse çıktıdaki `gemini failed` satırını P2 günlüğüne yapıştır.
2. **Eski sürüm:** telefondaki yayındaki 2.x'te işlem ekle, düzenle, sil, dönem kaydet, abonelik ekle. Hepsi çalışmalı (kurallar eski biçimi kabul ediyor).
3. **3.0** (P4 bağlayınca): giriş yap, fiş okut, Nova'ya soru sor. Hata olursa:
   ```bash
   firebase functions:log --only aiProxy
   ```

## Geri alma

- Kurallar: konsol > Firestore > Kurallar > yedekteki metni yapıştır > Yayınla (ya da konsolun kural geçmişinden önceki sürümü seç).
- Fonksiyonlar: 2.x bunları kullanmıyor, sorun olursa silmek güvenli:
  ```bash
  firebase functions:delete aiProxy deleteAccount --region europe-west1
  ```

## Maliyet (2026-11-15 fiyatlarıyla tahmin, ölçülmedi)

| İşlem | Model | İstek başına | Günlük kota |
|---|---|---|---|
| Fiş | `gemini-3.5-flash-lite` | ~0,002 $ | 30 |
| Rapor | aynı | ~0,003 $ | 10 |
| Sohbet | aynı | ~0,0016 $ | 60 |

- Kullanıcı başı en kötü gün (tüm kota): ~0,19 $. Gerçekçi ay (20 fiş, 4 rapor, 40 mesaj): ~0,12 $.
- Yedek model (`gemini-3.8-flash`) yalnız birincil düşerse çalışır, ~2 kat pahalı, 1 Ocak 2027'de fiyatı yaklaşık 2 katına çıkıyor.
- Cloud Functions: ayda 2 milyon çağrı ücretsiz, bu kullanımda ~0 $. `maxInstances` 10 ile sınırlı.

## Tarih notu: 1 Aralık 2026

`gemini-2.5-flash` 1 Aralık'ta kapanıp `gemini-3.5-flash-lite`'a yönleniyor. Fintel 3.0 bu modeli zaten doğrudan kullanıyor, yönlendirme 3.0'ı etkilemez. Eski 2.x'teki Gemini kodu hiç çağrılmıyordu (AI orada Groq ve Z.ai'deydi), 2.x de etkilenmez. Model adı değişirse yalnız `functions/src/modeller.ts` değişir, sonra 7. adım.

## Bilmen gerekenler

- Misafir modunda AI kapalı: misafir Firebase oturumu açmıyor, fonksiyon `AUTH_REQUIRED` döner.
- Hesap silme: istemci önce yeniden giriş yaptırır, fonksiyon son girişin 5 dakika içinde olmasını ister. Apple ile girişte Apple token iptali istemcide yapılır: konsol > Authentication > Apple sağlayıcısında Services ID ve "OAuth code flow" (Team ID, Key ID, özel anahtar) dolu olmalı.
- App Check açık değil. İstenirse sonra: konsolda App Check (Play Integrity, App Attest) kur, `functions/src/index.ts` içinde `enforceAppCheck: true`.
- Kural testleri Java 21 ister (Mac'teki Java 17). Android Studio'nun JDK'sıyla çalışır:
  ```bash
  cd /Volumes/KIOXIA/Dev/SaaS/Fintel/functions && JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" PATH="/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin:$PATH" npm run test:rules
  ```
