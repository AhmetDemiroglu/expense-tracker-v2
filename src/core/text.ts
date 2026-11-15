// Türkçe metin eşleştirme yardımcıları. toLocaleLowerCase kullanılmaz: cihazlar arasında fark eder.

const FOLD: Record<string, string> = {
  İ: "i",
  I: "i",
  ı: "i",
  Ş: "s",
  ş: "s",
  Ç: "c",
  ç: "c",
  Ğ: "g",
  ğ: "g",
  Ü: "u",
  ü: "u",
  Ö: "o",
  ö: "o",
  Â: "a",
  â: "a",
  Î: "i",
  î: "i",
  Û: "u",
  û: "u",
};

/**
 * Eşleştirme anahtarı: küçük harf, Türkçe harfler ASCII'ye, harf ve rakam dışı her şey tek boşluk.
 * "Gıda & Market" -> "gida market", "IŞIK" -> "isik"
 */
export function trFold(text: string): string {
  let out = "";
  for (const ch of text) {
    const mapped = FOLD[ch];
    out += mapped !== undefined ? mapped : ch.toLowerCase();
  }
  return out
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Türkçe kurallı küçük harf (İ -> i, I -> ı), aksanlar korunur. */
export function trLower(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ch === "İ") out += "i";
    else if (ch === "I") out += "ı";
    else out += ch.toLowerCase();
  }
  return out;
}
