import { tr } from "@/metin";

/** parseAmount hata nedenini kullanıcı metnine çevirir. */
export function amountErrorText(reason: "empty" | "invalid" | "zero" | "negative" | "too_large"): string {
  if (reason === "empty") return tr.ortak.tutar.bos;
  if (reason === "zero" || reason === "negative") return tr.ortak.tutar.sifir;
  if (reason === "too_large") return tr.ortak.tutar.cokBuyuk;
  return tr.ortak.tutar.gecersiz;
}
