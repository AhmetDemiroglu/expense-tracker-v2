/* P5: Takvim sekmesi metinleri. Kullanım: tr.takvim.<anahtar>. Değişkenli metin fonksiyon olur. Em dash, en dash, "..." yok. */
export const takvim = {
  baslik: "Takvim",
  oncekiAy: "Önceki ay",
  sonrakiAy: "Sonraki ay",
  buAy: "Bu aya dön",
  donemAraligi: (bas: string, son: string) => `Dönem: ${bas} - ${son}`,
  donemYokAlt: "Aktif dönem yok",

  donemBasi: "Dönem başı",
  donemSonu: "Dönem sonu",
  bugun: "Bugün",

  durum: {
    good: "Limit içinde",
    warning: "Limite yakın",
    over: "Limit aşıldı",
    deficit: "Bütçe açıkta",
    none: "Harcama yok",
  },
  lejant: {
    iyi: "İyi",
    uyari: "Uyarı",
    asim: "Aşım",
    planli: "Planlı",
  },

  /* Gün hücresinin ekran okuyucu metni */
  gunEtiketi: (tarih: string, durum: string, ekler: string) => `${tarih}, ${durum}${ekler ? `, ${ekler}` : ""}`,
  planliOdemeVar: "planlı ödeme var",
  donemDisi: "dönem dışı",

  /* Gün alt sayfası */
  gunLimiti: "Günün limiti",
  harcanan: "Harcanan",
  kalan: "Kalan",
  asim: "Aşım",
  limitYok: "Bu gün aktif dönemin dışında, limit yok.",
  gelecekGun: "Bu gün henüz gelmedi. Limit bugünkü duruma göre hesaplanır.",
  planliOdemeler: "Planlı ödemeler",
  vadesiGelecek: "Vadesi gelecek",
  odendi: "Ödendi",
  gununKayitlari: "Günün kayıtları",
  kayitYok: "Bu güne kayıt yok",
  kayitYokMetin: "Bu güne bir gelir ya da gider ekleyebilirsin.",
  buGuneEkle: "Bu güne ekle",
  silindi: "Kayıt silindi",
  gelir: "Gelir",

  yuklenemedi: "Takvim yüklenemedi",
  cevrimdisi: "Çevrimdışı. Son kayıtlı veriler gösteriliyor.",

  /* Tur (P10 bağlar) */
  tur: [
    { target: "takvim-izgara", title: "Aylık takvim", text: "Her günün rengi limit durumunu gösterir. Yana kaydırarak ay değiştir." },
    { target: "takvim-lejant", title: "Renkler", text: "İyi, uyarı ve aşım renkleri. Saat simgeli takvim o gün planlı ödeme olduğunu gösterir." },
    { target: "takvim-oklar", title: "Ay değiştir", text: "Oklarla da önceki ya da sonraki aya geçebilirsin." },
  ],
} as const;
