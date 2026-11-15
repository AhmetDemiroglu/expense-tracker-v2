// Fiş/fatura PDF'i: sayfa say, uzunsa ilk N + son M sayfayı tut. Okunamayan PDF UNSUPPORTED_FILE.
import { PDFDocument } from "pdf-lib";
import { PDF_KEEP_FIRST, PDF_KEEP_LAST } from "./ayarlar";
import { apiError } from "./hatalar";

export type PreparedPdf = { data: string; pageCount: number; keptPages: number[] };

/** Tutulacak sayfa numaraları (1 tabanlı). */
export function pagesToKeep(pageCount: number, first = PDF_KEEP_FIRST, last = PDF_KEEP_LAST): number[] {
  if (pageCount <= first + last) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const head = Array.from({ length: first }, (_, i) => i + 1);
  const tail = Array.from({ length: last }, (_, i) => pageCount - last + i + 1);
  return [...head, ...tail];
}

export async function preparePdf(base64: string): Promise<PreparedPdf> {
  let src: PDFDocument;
  let pageCount: number;
  try {
    // pdf-lib bozuk dosyayı da yükleyebilir, hata sayfa ağacına erişince çıkar.
    src = await PDFDocument.load(Buffer.from(base64, "base64"), { ignoreEncryption: true, updateMetadata: false });
    pageCount = src.getPageCount();
  } catch {
    throw apiError("UNSUPPORTED_FILE");
  }
  if (pageCount === 0) throw apiError("UNSUPPORTED_FILE");
  const keep = pagesToKeep(pageCount);
  if (keep.length === pageCount) return { data: base64, pageCount, keptPages: keep };

  try {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, keep.map((p) => p - 1));
    copied.forEach((p) => out.addPage(p));
    const bytes = await out.save();
    return { data: Buffer.from(bytes).toString("base64"), pageCount, keptPages: keep };
  } catch {
    // Kırpılamayan (şifreli vb.) PDF: sayfa sınırı aşılmışsa okumayı reddet.
    throw apiError("UNSUPPORTED_FILE");
  }
}
