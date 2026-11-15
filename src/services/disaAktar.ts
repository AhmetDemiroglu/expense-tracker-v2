// CSV dışa aktarma: Türkçe başlık, ";" ayraç, UTF-8 BOM, CRLF (Excel TR'de doğru açılır).
// Native: @capacitor/filesystem + @capacitor/share (paket kurulunca çalışır, registerPlugin ile çağrılır).
// Eklenti yoksa: Web Share (dosyalı), o da yoksa indirme.

import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  categoryLabel,
  formatAmountInput,
  formatDateTr,
  stripAutoSuffix,
  type LocalDate,
  type Transaction,
} from "@/core";
import { UygulamaHatasi } from "@/data/hatalar";

/** Excel'in UTF-8 olarak açması için */
export const BOM = String.fromCharCode(0xfeff);

export const CSV_BASLIK = ["Tarih", "Tür", "Kategori", "Açıklama", "Tutar (TL)", "Taksit", "Düzenli ödeme", "Planlı"] as const;

/** Hücre kaçışı: ; " ve satır sonu tırnaklanır. Formül enjeksiyonuna karşı metin hücreleri ' ile başlar. */
export function csvHucre(deger: string, metin = true): string {
  let v = deger;
  if (metin && /^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  if (/[;"\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function islemlerCsv(islemler: readonly Transaction[]): string {
  const satirlar = [CSV_BASLIK.join(";")];
  for (const t of islemler) {
    const tutar = (t.type === "expense" ? "-" : "") + formatAmountInput(t.amount);
    const taksit = t.installmentIndex && t.installmentCount ? `${t.installmentIndex}/${t.installmentCount}` : "";
    satirlar.push(
      [
        csvHucre(formatDateTr(t.date, "numeric")),
        csvHucre(t.type === "income" ? "Gelir" : "Gider"),
        csvHucre(categoryLabel(t.category)),
        csvHucre(stripAutoSuffix(t.description)),
        csvHucre(tutar, false),
        csvHucre(taksit),
        t.recurringId ? "Evet" : "",
        t.planned ? "Evet" : "",
      ].join(";"),
    );
  }
  return `${BOM}${satirlar.join("\r\n")}\r\n`;
}

export function csvDosyaAdi(bugun: LocalDate): string {
  return `fintel-kayitlar-${bugun}.csv`;
}

interface FilesystemEklentisi {
  writeFile(o: { path: string; data: string; directory: string; encoding: string }): Promise<{ uri: string }>;
}
interface ShareEklentisi {
  share(o: { title?: string; text?: string; url?: string; files?: string[]; dialogTitle?: string }): Promise<unknown>;
}

const Filesystem = registerPlugin<FilesystemEklentisi>("Filesystem");
const Share = registerPlugin<ShareEklentisi>("Share");

function iptalMi(e: unknown): boolean {
  const m = typeof e === "object" && e !== null && "message" in e ? String((e as { message: unknown }).message) : "";
  const n = typeof e === "object" && e !== null && "name" in e ? String((e as { name: unknown }).name) : "";
  return n === "AbortError" || /cancel/i.test(m);
}

export async function islemleriDisaAktar(
  islemler: readonly Transaction[],
  bugun: LocalDate,
): Promise<"paylasildi" | "indirildi" | "iptal"> {
  const icerik = islemlerCsv(islemler);
  const ad = csvDosyaAdi(bugun);
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Filesystem") && Capacitor.isPluginAvailable("Share")) {
      const { uri } = await Filesystem.writeFile({ path: ad, data: icerik, directory: "CACHE", encoding: "utf8" });
      await Share.share({ title: "Fintel kayıtları", files: [uri], dialogTitle: "Kayıtları paylaş" });
      return "paylasildi";
    }
    if (Capacitor.isNativePlatform()) {
      // Android WebView indirme bağlantısını işlemez: eklenti yoksa sessizce "indirildi" denmez.
      throw new UygulamaHatasi("SAGLAYICI_YOK", { mesaj: "Dışa aktarma bu cihazda henüz kullanılamıyor." });
    }
    const dosya = new File([icerik], ad, { type: "text/csv;charset=utf-8" });
    if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [dosya] })) {
      await navigator.share({ files: [dosya], title: "Fintel kayıtları" });
      return "paylasildi";
    }
    const url = URL.createObjectURL(dosya);
    const a = document.createElement("a");
    a.href = url;
    a.download = ad;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return "indirildi";
  } catch (e) {
    if (e instanceof UygulamaHatasi) throw e;
    if (iptalMi(e)) return "iptal";
    throw new UygulamaHatasi("BILINMEYEN", { neden: e, mesaj: "Dosya hazırlanamadı. Yeniden dene." });
  }
}
