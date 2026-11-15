// Fiş okuma kategori anahtarları. Eski gider enum'u ile birebir (eski/types.ts).
// P1 çekirdeği farklı anahtar seçerse yalnız bu dosya değişir.

export const RECEIPT_CATEGORIES = [
  { key: "market", name: "Market & Pazar", hint: "süpermarket, bakkal, pazar, manav, kasap, fırın" },
  { key: "yeme_icme", name: "Yeme & İçme (Restoran vb.)", hint: "restoran, kafe, yemek siparişi, fast food" },
  { key: "toplu_tasima", name: "Toplu Taşıma", hint: "otobüs, metro, taksi, vapur, İstanbulkart dolum" },
  { key: "arac_yakit", name: "Araç & Yakıt", hint: "akaryakıt istasyonu, otopark, otoyol, oto servis" },
  { key: "kira_aidat", name: "Kira & Aidat", hint: "kira, site aidatı" },
  { key: "faturalar", name: "Faturalar", hint: "elektrik, su, doğalgaz, internet, telefon faturası" },
  { key: "giyim", name: "Giyim & Aksesuar", hint: "giyim, ayakkabı, çanta, takı" },
  { key: "kozmetik", name: "Kozmetik & Bakım", hint: "kozmetik, parfüm, kişisel bakım mağazası" },
  { key: "saglik", name: "Sağlık & İlaç", hint: "eczane, hastane, muayene, optik" },
  { key: "spor", name: "Spor & Üyelik", hint: "spor salonu, spor malzemesi" },
  { key: "kuafor", name: "Kuaför & Berber", hint: "kuaför, berber, güzellik salonu" },
  { key: "ev_esyasi", name: "Ev Eşyası & Dekorasyon", hint: "mobilya, ev tekstili, züccaciye, yapı market" },
  { key: "tamirat", name: "Tamirat & Tadilat", hint: "tamir, tesisat, usta işçiliği" },
  { key: "egitim", name: "Eğitim & Kitap", hint: "kitapçı, kırtasiye, kurs" },
  { key: "cocuk", name: "Çocuk & Bebek", hint: "bebek ürünleri, oyuncak" },
  { key: "teknoloji", name: "Teknoloji & Elektronik", hint: "elektronik mağazası, telefon, bilgisayar" },
  { key: "abonelik", name: "Abonelikler", hint: "dijital abonelik, üyelik yenileme" },
  { key: "eglence", name: "Eğlence & Hobi", hint: "sinema, konser, oyun, hobi malzemesi" },
  { key: "tatil", name: "Tatil & Seyahat", hint: "otel, uçak bileti, tur" },
  { key: "kredi_karti", name: "Kredi Kartı Ödemesi", hint: "kredi kartı borç ödemesi dekontu" },
  { key: "borc_odeme", name: "Borç / Kredi Ödemesi", hint: "kredi taksiti, borç ödemesi dekontu" },
  { key: "vergi", name: "Vergi & Harçlar", hint: "vergi, harç, ceza ödemesi" },
  { key: "diger_gider", name: "Diğer Gider", hint: "hiçbirine uymuyorsa" },
] as const;

export type ReceiptCategoryKey = (typeof RECEIPT_CATEGORIES)[number]["key"];

export const RECEIPT_CATEGORY_KEYS = RECEIPT_CATEGORIES.map((c) => c.key) as [
  ReceiptCategoryKey,
  ...ReceiptCategoryKey[],
];

export const FALLBACK_CATEGORY: ReceiptCategoryKey = "diger_gider";
