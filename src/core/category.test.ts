import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryFromLegacy,
  categoryLabel,
  categoryLegacyName,
  isCategoryKey,
} from "./category";
import { trFold, trLower } from "./text";

// Eski sürümün enum değerleri (eski/types.ts): Firestore'da bu metinler duruyor.
const OLD_ENUM: Record<string, string> = {
  "Maaş": "maas",
  "Freelance / Ek İş": "ek_is",
  "Yatırım Geliri": "yatirim_geliri",
  "Kira Geliri": "kira_geliri",
  "Diğer Gelir": "diger_gelir",
  "Market & Pazar": "market",
  "Yeme & İçme (Restoran vb.)": "yeme_icme",
  "Toplu Taşıma": "toplu_tasima",
  "Araç & Yakıt": "arac_yakit",
  "Kira & Aidat": "kira",
  "Faturalar": "fatura",
  "Giyim & Aksesuar": "giyim",
  "Kozmetik & Bakım": "kozmetik",
  "Sağlık & İlaç": "saglik",
  "Spor & Üyelik": "spor",
  "Kuaför & Berber": "kuafor",
  "Ev Eşyası & Dekorasyon": "ev_esyasi",
  "Tamirat & Tadilat": "tamirat",
  "Eğitim & Kitap": "egitim",
  "Çocuk & Bebek": "cocuk",
  "Teknoloji & Elektronik": "teknoloji",
  "Abonelikler": "abonelik",
  "Eğlence & Hobi": "eglence",
  "Tatil & Seyahat": "tatil",
  "Kredi Kartı Ödemesi": "kredi_karti",
  "Borç / Kredi Ödemesi": "borc",
  "Vergi & Harçlar": "vergi",
  "Diğer Gider": "diger",
};

describe("category", () => {
  it("28 kategori: 5 gelir, 23 gider, anahtarlar tekil", () => {
    expect(INCOME_CATEGORIES.length).toBe(5);
    expect(EXPENSE_CATEGORIES.length).toBe(23);
    expect(new Set(CATEGORIES.map((c) => c.key)).size).toBe(28);
    expect(new Set(CATEGORIES.map((c) => c.legacyName)).size).toBe(28);
  });
  it("eski enum değerlerinin tamamı anahtara eşlenir ve aynen geri yazılır", () => {
    for (const [text, key] of Object.entries(OLD_ENUM)) {
      const type = INCOME_CATEGORIES.some((c) => c.key === key) ? "income" : "expense";
      const mapped = categoryFromLegacy(text, type);
      expect(mapped).toBe(key);
      expect(categoryLegacyName(mapped)).toBe(text);
    }
  });
  it("demo verisi adları (denetim 3.8)", () => {
    expect(categoryFromLegacy("Konut & Kira", "expense")).toBe("kira");
    expect(categoryFromLegacy("Gıda & Market", "expense")).toBe("market");
    expect(categoryFromLegacy("Ulaşım", "expense")).toBe("toplu_tasima");
    expect(categoryFromLegacy("Eğlence", "expense")).toBe("eglence");
    expect(categoryFromLegacy("Giyim", "expense")).toBe("giyim");
  });
  it("eski Gemini fiş okuma adları", () => {
    expect(categoryFromLegacy("Yeme & İçme", "expense")).toBe("yeme_icme");
    expect(categoryFromLegacy("Ev & Yaşam", "expense")).toBe("ev_esyasi");
    expect(categoryFromLegacy("Teknoloji", "expense")).toBe("teknoloji");
    expect(categoryFromLegacy("Sağlık", "expense")).toBe("saglik");
    expect(categoryFromLegacy("Eğitim", "expense")).toBe("egitim");
    expect(categoryFromLegacy("Faturalar", "expense")).toBe("fatura");
    expect(categoryFromLegacy("Diğer", "expense")).toBe("diger");
  });
  it("Groq: boş kategori yerine yazılan 'Diğer' türe göre eşlenir", () => {
    expect(categoryFromLegacy("Diğer", "income")).toBe("diger_gelir");
    expect(categoryFromLegacy("Diğer", "expense")).toBe("diger");
  });
  it("bilinmeyen, boş ve metin olmayan değer 'diğer' olur", () => {
    expect(categoryFromLegacy("Uzay Turizmi", "expense")).toBe("diger");
    expect(categoryFromLegacy("Uzay Turizmi", "income")).toBe("diger_gelir");
    expect(categoryFromLegacy("", "expense")).toBe("diger");
    expect(categoryFromLegacy(undefined, "expense")).toBe("diger");
    expect(categoryFromLegacy(42, "income")).toBe("diger_gelir");
  });
  it("büyük küçük harf ve boşluk farkına dayanıklı, anahtarın kendisini de tanır", () => {
    expect(categoryFromLegacy("  MARKET & PAZAR ", "expense")).toBe("market");
    expect(categoryFromLegacy("gıda&market", "expense")).toBe("market");
    expect(categoryFromLegacy("kredi_karti", "expense")).toBe("kredi_karti");
    expect(categoryFromLegacy("Kişisel Bakım", "expense")).toBe("kozmetik");
  });
  it("görünen adlarda uzun tire ve asistan adı yok", () => {
    for (const c of CATEGORIES) {
      expect(c.label).not.toMatch(/[–—]/);
      expect(c.label.length).toBeGreaterThan(0);
      expect(categoryLabel(c.key)).toBe(c.label);
    }
  });
  it("isCategoryKey", () => {
    expect(isCategoryKey("market")).toBe(true);
    expect(isCategoryKey("Market & Pazar")).toBe(false);
    expect(isCategoryKey(null)).toBe(false);
  });
});

describe("text", () => {
  it("Türkçe katlama cihazdan bağımsız", () => {
    expect(trFold("IŞIK İLE Çağrı")).toBe("isik ile cagri");
    expect(trFold("Gıda & Market")).toBe("gida market");
    expect(trFold("  Yeme/İçme (Restoran vb.) ")).toBe("yeme icme restoran vb");
    expect(trLower("IĞDIR İZMİR")).toBe("ığdır izmir");
  });
});
