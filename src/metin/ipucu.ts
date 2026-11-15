/* İpucu turu metinleri (P10). Kullanım: tr.ipucu.<anahtar>. Em dash, en dash, "..." yok.
   Kural: her adım tek fikir, başlık en çok 3 sözcük, metin en çok 2 kısa cümle. */
export const ipucu = {
  /* Özet: ilk açılışta kendiliğinden gösterilir (en çok 5 adım). */
  ozet: [
    { target: "ozet-kart", title: "Kalan bütçe", text: "Dönem sonuna kadar elinde kalan tutar. Altında günlük limitin ve bugün harcayabileceğin tutar var." },
    { target: "ozet-hafta", title: "Hafta çubukları", text: "Bu haftanın günlük harcamaları. Bugünün çubuğu bakır, kesik çizgi günlük limitin." },
    { target: "ozet-uclu", title: "Gelir, gider, planlı", text: "Birine dokun, kategorilere göre dağılımı gör." },
    { target: "ozet-donem", title: "Dönem seçici", text: "Dönem adına dokunarak geçmiş dönemlerin özetine bakabilirsin." },
    { target: "ekle", title: "Kayıt ekle", text: "Gelir ya da gider eklemek için bu düğmeye dokun." },
  ],
} as const;
