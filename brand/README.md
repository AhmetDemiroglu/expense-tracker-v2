# Fintel marka kiti

Logolar, uygulama ikonları, web ikonları ve tema kuralları. Tüm görseller `tools/marka.mjs` içindeki çizimden üretilir:
PNG'yi değil çizimi düzenle. Yazılar yola çevrilmiştir, yazı tipi kurmak gerekmez.

Seçim (2026-11-15): logo "Lira F", tema "Lacivert ve bakır", ikon dolu renk, isim "fintel" (Bricolage Grotesque 800,
küçük harf, tek renk), slogan "Evin hesabı, cebinde.", arayüz yazısı DM Sans, rakam DM Mono, karakter cam,
ana ekran hafta çubukları, alt bar yüzen kapsül.

## Klasörler

| Klasör | İçerik |
|---|---|
| `logo/svg`, `logo/png` | Simge, yatay ve dikey logo, yalnız yazı. Her biri açık ve koyu zemin için. |
| `app-icon/ios` | `AppIcon.appiconset` (açık, koyu, renklendirilmiş), açılış logosu ve zemin rengi. |
| `app-icon/android/res` | Başlatıcı ikonları (eski, yuvarlak, uyarlanabilir katmanlar, tek renk), açılış görselleri, renkler. |
| `app-icon/store` | App Store 1024 ve Google Play 512 (alfa kanalı yok). |
| `web` | `favicon.ico`, `favicon.svg`, Apple dokunma ikonu, PWA ikonları. |
| `social` | 1200 x 630 bağlantı önizleme görseli. |
| `tokens` | `tokens.css` ve `tokens.json`: renk, yazı, biçim, hareket değerleri. |
| `secim` | Seçim turlarının sayfaları (arşiv). |
| `tools` | Üretim aracı. |

## Logo dosyaları

| Dosya | Kullanım |
|---|---|
| `lockup-h-*` | Üst bar, sayfa başlığı, alçak alanlar. 40 px altı yükseklikte bu kullanılır. |
| `lockup-h-slogan-*` | Giriş ekranı, mağaza görseli, tanıtım sayfası. |
| `lockup-v-*`, `lockup-v-slogan-*` | Açılış, karşılama, kare alanlar. |
| `mark-light`, `mark-dark` | Yalnız simge: yükleme durumu, küçük yerler, boş durum. |
| `mark-onbrand` | Lacivert zemin üstünde simge. |
| `mark-mono` | Tek renk (beyaz). Bildirim ikonu ve damga için. |
| `wordmark-*` | Yalnız yazı. Simge zaten yanında duruyorsa. |
| `icon`, `icon-dark`, `icon-rounded` | Uygulama ikonu. |

`-light` açık zemin, `-dark` koyu zemin içindir.

## Logo kuralları

1. Simge: gövde ve üst kol tek renk, alt kol ikinci renk. Alt kol gövdenin önünden geçer.
2. Açık zeminde gövde lacivert, alt kol bakır. Koyu zeminde gövde bakır, alt kol beyaz.
3. İsim her zaman küçük harf ve tek renk: `fintel`. Cümle içinde "Fintel" yazılır.
4. Simgenin çevresinde en az bir kol kalınlığı kadar boşluk bırakılır.
5. Yapılmaz: eğmek, gölge eklemek, renk değiştirmek, yıldız ya da ok eklemek, İngilizce slogan.

## Renkler

| Ad | Gündüz | Gece | Kullanım |
|---|---|---|---|
| Zemin | `#F6F5F1` | `#0A0E1C` | Sayfa zemini, açılış |
| Yüzey | `#FFFFFF` | `#131A2E` | Kart, sayfa |
| Yüzey 2 | `#ECE9E1` | `#1B243D` | İkon kutusu, boş çubuk |
| Yazı | `#111830` | `#F5F7F6` | Ana metin, rakam |
| Yazı 2 | `#4A5270` | `#A9B1C7` | Alt metin |
| Yazı 3 | `#636A82` | `#8791AB` | Etiket, ipucu |
| Vurgu | `#1B2A52` | `#E3A862` | Düğme, seçili sekme, ilerleme |
| Bakır | `#D08B3E` | `#E3A862` | Süs ve dolgu |
| Gelir | `#0F7553` | `#4FD6A2` | Gelir tutarı |
| Gider | `#C53A25` | `#FF7A66` | Gider tutarı, limit aşımı |

İkon zemini: `#27396D` -> `#0F1834`. Ölçülen kontrast: ana yazı 16:1, alt metin 7:1, etiket 4,8:1, gelir 5,2:1, gider 4,8:1.

Renk kuralları:
1. Gündüz vurgu lacivert, gece vurgu bakırdır. Bakır gündüz modunda yazı rengi olmaz (kontrast 2,6:1): yalnız dolgu.
   Bakır tonunda yazı gerekirse `#8F5716`.
2. Bakır alanın en fazla ~%10'unu kaplar: ekle düğmesi, bugünün çubuğu, küçük nokta.
3. Gelir yeşili ve gider kırmızısı yalnız tutar ve durum için kullanılır. Düğme ve süs bu renkleri almaz.
4. Renk tek başına anlam taşımaz: tutarın başında + ya da - işareti de bulunur.

## Yazı

| Rol | Yazı tipi | Not |
|---|---|---|
| Arayüz | DM Sans 400, 500, 600, 700 | Tüm metinler. Türkçe harfler ve ₺ ölçülerek doğrulandı. |
| Rakam | DM Mono 400, 500 | Tutar, bakiye, tarih rakamı. Eş aralıklı: kolonlar hizalı durur. |
| Logo | Bricolage Grotesque 800 | Yalnız logoda. Arayüzde başlık olarak kullanılmaz. |

Yazı kuralları:
1. Tutar yazımı: `₺12.480,50`. Binlik nokta, kuruş virgül, işaret başta. Gider `-₺642,50`, gelir `+₺58.000`.
2. Ana ekrandaki büyük tutarda kuruş gösterilmez, listede gösterilir.
3. Büyük harfli etiket yalnız bölüm başlığında (11 px, 600, harf aralığı .06em). Türkçe büyük harf `toLocaleUpperCase("tr")` ile.
4. Metin "..." ile kesilmez: sığmıyorsa alt satıra iner ya da kısa adı kullanılır.
5. Yazı tipleri uygulamaya gömülür (woff2), ağdan yüklenmez.

## Arayüz karakteri: cam

1. Kartlar yarı saydam cam yüzeydir, arkada lacivert ve bakır tonlu yumuşak ışık zemini durur.
2. Cam değerleri `tokens.css` içinde. Kart köşesi 20, denetim köşesi 14.
3. Alt bar yüzen cam kapsüldür, ekle düğmesi ayrı yüzer ve bakırdır.
4. Android'de (Chromium) kenar kırılmalı gerçek cam uygulanır: SVG `feDisplacementMap` reçetesi, referans GGHub `glass-capsule.tsx`.
   iOS web görünümünde bu desteklenmez: bulanık cam + parlama katmanı kullanılır.
5. İki cam yüzey bitiştirilmez, aralarında en az 8 px kalır. Yazısı camın üstünde duran ve altından içerik geçen
   yüzeyde yoğun ton (14 px bulanıklık) kullanılır.
6. Gürültü, gökkuşağı saçağı, dekoratif dalga yok.

## Düzen

1. Ana ekran: kalan bütçe ve günlük limit solda, haftanın günlük harcama çubukları sağda. Bugünün çubuğu vurgulu.
2. Ana ekranlar kaydırmadan tek ekrana sığar. Liste ekranlarında yalnız liste kayar.
3. Sekmeler arası geçiş sağa sola kaydırmayla da yapılır. Geri dönüş sol kenardan kaydırmayla.
4. Dokunma hedefi en az 44 x 44. Güvenli alan (çentik, alt çizgi) her ekranda hesaba katılır.

## Hareket

1. Eğri `cubic-bezier(0.22, 1, 0.36, 1)`. Süreler: 160, 260, 420 ms.
2. Rakamlar değişirken sayarak geçer, çubuklar ve halkalar dolarak gelir.
3. Sistemde "hareketi azalt" açıksa yalnız kısa geçiş kalır.

## Yeniden üretim

```bash
cd brand/tools
npm install
npm run build
```

`npm run build` tüm dosyaları ve `pano.png` bakış panosunu yeniden üretir.
