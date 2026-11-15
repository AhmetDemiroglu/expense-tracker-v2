/* P5: Özet sekmesi metinleri. Kullanım: tr.ozet.<anahtar>. Değişkenli metin fonksiyon olur. Em dash, en dash, "..." yok. */
export const ozet = {
  baslik: "Özet",
  donemSec: "Dönem seç",
  donemAraligi: (bas: string, son: string) => `${bas} - ${son}`,

  kalanButce: "Kalan bütçe",
  bakiye: "Dönem bakiyesi",
  acik: "Bütçe açıkta",
  gunlukLimit: "Günlük limit",
  bugunKalan: "Bugün kalan",
  bugunAsim: "Bugün aşım",
  kalanGun: "Kalan gün",
  baslangic: "Başlangıç",
  donemSuresi: "Dönem süresi",
  gunSayisi: (n: number) => `${n} gün`,
  gunSonra: (n: number) => (n === 1 ? "Yarın" : `${n} gün sonra`),
  ilkGunLimiti: "İlk gün limiti",
  haftaEtiketi: "Bu haftanın günlük harcamaları",
  haftaGunu: (gun: string, tutar: string) => `${gun}, ${tutar}`,
  donemIlerleme: "Dönem ilerlemesi",
  ilerlemeMetni: (gecen: number, toplam: number) => `${toplam} günün ${gecen}. günü`,

  durum: {
    iyi: "Bugün limitin içindesin",
    uyari: "Bugün limite yaklaştın",
    asim: "Bugünün limiti aşıldı",
    acik: "Gelirden fazla gider planlandı. Günlük limit eksiye düştü.",
    hic: "Bugün henüz harcama yok",
  },

  gelir: "Gelir",
  gider: "Gider",
  planli: "Planlı",
  net: "Net",
  tasarruf: "Tasarruf",
  tasarrufYuzde: (n: number) => `%${n}`,
  kayitSayisi: (n: number) => `${n} kayıt`,

  sonHareketler: "Son hareketler",
  tumu: "Tümü",
  hareketYok: "Bu dönemde henüz kayıt yok",
  hareketYokMetin: "İlk gelirini ya da giderini ekle, özet kendiliğinden dolsun.",
  ilkKayit: "Kayıt ekle",
  planliEtiket: "planlı",
  otomatikEtiket: "otomatik",
  taksitEtiket: (i: number, n: number) => `${i} / ${n} taksit`,

  /* Dönem durumları */
  baslamadi: "Dönem henüz başlamadı",
  baslamadiDurum: "Dönem henüz başlamadı. Limit ilk gün için hesaplandı.",
  bitti: "Dönem tamamlandı",
  bittiArtida: "Dönemi artıda kapattın.",
  bittiEksi: "Dönem ekside bitti.",
  yeniDonemBaslat: "Yeni dönemi başlat",

  /* Geçmiş dönem */
  gecmisDonem: "Geçmiş dönem",
  gecmisMetin: "Bu dönem için yalnız özet gösterilir.",
  aktifeDon: "Aktif döneme dön",
  gelecekDonem: "Gelecek dönem",

  /* Dönem yok, yükleniyor, hata, çevrimdışı */
  donemYok: "Henüz dönem yok",
  donemYokMetin: "Maaş gününü ve aylık gelirini gir, günlük limitini birlikte çıkaralım.",
  kurulumaBasla: "Kuruluma başla",
  baglantiBekleniyor: "Bağlantı bekleniyor",
  baglantiBekleniyorMetin: "Verilerin sunucudan gelince özet açılacak.",
  yuklenemedi: "Özet yüklenemedi",
  cevrimdisi: "Çevrimdışı. Son kayıtlı veriler gösteriliyor.",

  /* Dönem seçici */
  donemler: "Dönemler",
  aktif: "Aktif",
  donemleriYonet: "Dönemleri yönet",
  donemListesiBos: "Kayıtlı başka dönem yok",

  /* Dağılım */
  dagilim: "Dağılım",
  giderDagilimi: "Gider dağılımı",
  gelirDagilimi: "Gelir dağılımı",
  planliDagilimi: "Planlı giderler",
  dagilimBos: "Bu dönemde bu türde kayıt yok",
  sabitGelir: "Sabit gelir",
  ekGelir: "Ek gelirler",
  sabitGider: "Sabit giderler",
  duzenliOdenen: "Düzenli ödemeler (ödendi)",
  planliKayit: "Taksit ve ileri tarihli giderler",
  bekleyenVade: "Vadesi gelecek düzenli ödemeler",
  kendiHarcaman: "Kendi harcamaların",
  toplam: "Toplam",
  payYuzde: (n: number) => `%${n}`,

  /* Yeni dönem onayı */
  yeniDonem: "Yeni dönem",
  yeniDonemMetin: "Gelir ve sabit giderler önceki dönemden kopyalandı. Sonra Ayarlar'dan değiştirebilirsin.",
  donemAdi: "Dönem adı",
  tarihAraligi: "Tarih aralığı",
  planlananGelir: "Planlanan gelir",
  sabitGiderler: "Sabit giderler",
  baslat: "Başlat",
  baslatildi: "Yeni dönem başladı",
  cakisma: "Bu tarihler başka bir dönemle çakışıyor. Dönemleri Ayarlar'dan düzenle.",

  /* Tur (P10 bağlar) */
  tur: [
    { target: "ozet-kart", title: "Kalan bütçe", text: "Dönem sonuna kadar kalan tutar, günlük limitin ve bugün kalan burada." },
    { target: "ozet-hafta", title: "Hafta çubukları", text: "Bu haftanın günlük harcamaları. Bugünün çubuğu bakır, kesik çizgi limitin." },
    { target: "ozet-uclu", title: "Gelir, gider, planlı", text: "Birine dokun, kategorilere göre dağılımı gör." },
    { target: "ozet-donem", title: "Dönem seçici", text: "Dönem adına dokunup geçmiş dönemlerin özetine bakabilirsin." },
  ],
} as const;
