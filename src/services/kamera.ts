// Kamera ve dosya seçimi. Kamera: @capacitor/camera 8 takePhoto. Dosya (görsel ya da PDF): gizli
// <input type="file"> (Capacitor WebView'da Android ve iOS'ta çalışır, ek eklenti yok).
// Görsel uzun kenarı 1600 px'e küçültülür, JPEG 0,8 (HEIC de JPEG'e döner: sunucu HEIC almaz). En fazla 5 MB.
// PDF çevrilmeden gönderilir (sunucu okur, sözleşme v2), en fazla 4 MB.

import { Camera, CameraErrorCode } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { UygulamaHatasi } from "@/data/hatalar";

export const UZUN_KENAR = 1600;
export const JPEG_KALITE = 0.8;
export const AZAMI_BAYT = 5 * 1024 * 1024;
/** Sunucu PDF sınırı (çözülmüş) */
export const AZAMI_PDF_BAYT = 4 * 1024 * 1024;
/** Küçültmeden önce kabul edilen ham dosya sınırı */
const HAM_SINIR = 40 * 1024 * 1024;

export interface HazirGorsel {
  mimeType: "image/jpeg";
  /** base64, "data:" öneki YOK */
  data: string;
  /** önizleme için data URL */
  onizleme: string;
  bayt: number;
}

export interface HazirPdf {
  mimeType: "application/pdf";
  data: string;
  /** PDF'te önizleme yok: ekran dosya adını gösterir */
  onizleme: null;
  bayt: number;
  ad: string;
}

/** ai.fisOku'ya doğrudan verilir. */
export type HazirDosya = HazirGorsel | HazirPdf;

/** Dosya başı "%PDF-" mi. Saf (testli). */
export function pdfMi(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

/** Bayttan öneksiz base64. Saf (testli). */
export function bytesBase64(bytes: Uint8Array): string {
  let ikili = "";
  const PARCA = 0x8000;
  for (let i = 0; i < bytes.length; i += PARCA) {
    ikili += String.fromCharCode(...bytes.subarray(i, i + PARCA));
  }
  return btoa(ikili);
}

/** PDF dosyasını gönderime hazırlar: tür (dosya başı) ve 4 MB sınırı denetlenir. */
export async function pdfHazirla(dosya: Blob, ad = "belge.pdf"): Promise<HazirPdf> {
  if (dosya.size > AZAMI_PDF_BAYT) throw new UygulamaHatasi("DOSYA_BUYUK", { mesaj: "PDF en fazla 4 MB olabilir." });
  const bytes = new Uint8Array(await dosya.arrayBuffer());
  if (!pdfMi(bytes)) throw new UygulamaHatasi("UNSUPPORTED_FILE");
  return { mimeType: "application/pdf", data: bytesBase64(bytes), onizleme: null, bayt: bytes.length, ad };
}

/** Hedef boyut: uzun kenar en fazla `sinir`, oran korunur. Saf (testli). */
export function hedefBoyut(genislik: number, yukseklik: number, sinir = UZUN_KENAR): { w: number; h: number } {
  const uzun = Math.max(genislik, yukseklik);
  if (uzun <= sinir || uzun <= 0) return { w: Math.max(1, Math.round(genislik)), h: Math.max(1, Math.round(yukseklik)) };
  const k = sinir / uzun;
  return { w: Math.max(1, Math.round(genislik * k)), h: Math.max(1, Math.round(yukseklik * k)) };
}

/** base64'ün çözülmüş bayt sayısı. Saf (testli). */
export function base64Bayt(b64: string): number {
  const temiz = b64.replace(/\s/g, "");
  const dolgu = temiz.endsWith("==") ? 2 : temiz.endsWith("=") ? 1 : 0;
  return Math.floor((temiz.length * 3) / 4) - dolgu;
}

function kameraHatasi(e: unknown): UygulamaHatasi | null {
  const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
  const message = typeof e === "object" && e !== null && "message" in e ? String((e as { message: unknown }).message) : "";
  if (code === CameraErrorCode.TakePhotoCancelled || /cancel/i.test(message)) return null; // vazgeçti
  if (code === CameraErrorCode.CameraPermissionDenied || code === CameraErrorCode.GalleryPermissionDenied || /permission|denied/i.test(message)) {
    return new UygulamaHatasi("IZIN_YOK", { neden: e, mesaj: "Kamera ya da galeri izni yok. Ayarlardan izin verebilirsin." });
  }
  if (code === CameraErrorCode.NoCameraAvailable) return new UygulamaHatasi("KAMERA_YOK", { neden: e });
  if (code === CameraErrorCode.InvalidImageData) return new UygulamaHatasi("GORSEL_BOZUK", { neden: e });
  return new UygulamaHatasi("GORSEL_BOZUK", { neden: e });
}

async function gorselYukle(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      // HEIC gibi biçimlerde img öğesine düş
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Herhangi bir görsel blob'unu küçültülmüş JPEG'e çevirir. */
/** HEIC/HEIF mi (tür ya da uzantı). Saf (testli). */
export function heicMi(tur: string, ad = ""): boolean {
  return /^image\/hei[cf](-sequence)?$/i.test(tur) || /\.hei[cf]$/i.test(ad);
}

export const HEIC_MESAJI = "Bu fotoğraf biçimi okunamadı, kamerayla çek ya da JPEG seç.";

/**
 * Herhangi bir görseli (HEIC dahil) küçültülmüş JPEG'e çevirir. Sunucu HEIC almaz: çıktı her zaman JPEG.
 * Tarayıcı görseli açamazsa düz Türkçe hata (HEIC için ayrı mesaj).
 */
export async function gorseliHazirla(blob: Blob, ad = ""): Promise<HazirGorsel> {
  if (blob.size > HAM_SINIR) throw new UygulamaHatasi("DOSYA_BUYUK");
  const heic = heicMi(blob.type, ad || (blob instanceof File ? blob.name : ""));
  let kaynak: ImageBitmap | HTMLImageElement;
  try {
    kaynak = await gorselYukle(blob);
  } catch (e) {
    throw new UygulamaHatasi("GORSEL_BOZUK", heic ? { neden: e, mesaj: HEIC_MESAJI } : { neden: e });
  }
  const gw = "naturalWidth" in kaynak ? kaynak.naturalWidth : kaynak.width;
  const gh = "naturalHeight" in kaynak ? kaynak.naturalHeight : kaynak.height;
  const { w, h } = hedefBoyut(gw, gh);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d");
  if (!c) throw new UygulamaHatasi("GORSEL_BOZUK");
  c.fillStyle = "#ffffff"; // saydam PNG siyaha dönmesin
  c.fillRect(0, 0, w, h);
  c.drawImage(kaynak, 0, 0, w, h);
  if ("close" in kaynak) kaynak.close();
  let kalite = JPEG_KALITE;
  let dataUrl = canvas.toDataURL("image/jpeg", kalite);
  let data = dataUrl.slice(dataUrl.indexOf(",") + 1);
  while (base64Bayt(data) > AZAMI_BAYT && kalite > 0.4) {
    kalite -= 0.15;
    dataUrl = canvas.toDataURL("image/jpeg", kalite);
    data = dataUrl.slice(dataUrl.indexOf(",") + 1);
  }
  // JPEG kodlayamayan tarayıcı PNG'ye düşer: sunucuya yanlış tür gitmesin.
  if (!dataUrl.startsWith("data:image/jpeg")) {
    throw new UygulamaHatasi("GORSEL_BOZUK", heic ? { mesaj: HEIC_MESAJI } : {});
  }
  const bayt = base64Bayt(data);
  if (bayt > AZAMI_BAYT) throw new UygulamaHatasi("DOSYA_BUYUK");
  return { mimeType: "image/jpeg", data, onizleme: dataUrl, bayt };
}

async function webYolundanBlob(webPath: string): Promise<Blob> {
  const r = await fetch(webPath);
  if (!r.ok) throw new UygulamaHatasi("GORSEL_BOZUK");
  return r.blob();
}

/**
 * Gizli dosya girişi. iOS WebView'da girişin DOM'da olması gerekir: gizli eklenir, bitince kaldırılır.
 * Vazgeçme "cancel" olayıyla anlaşılır (olayı desteklemeyen eski WebView'da söz bekler, sonraki seçimde çözülür).
 */
function webDosyaSec(accept: string, capture: boolean): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;opacity:0";
    input.setAttribute("aria-hidden", "true");
    if (capture) input.setAttribute("capture", "environment");
    let bitti = false;
    const bitir = (f: File | null): void => {
      if (bitti) return;
      bitti = true;
      input.remove();
      resolve(f);
    };
    input.onchange = () => bitir(input.files?.[0] ?? null);
    input.addEventListener("cancel", () => bitir(null));
    document.body.appendChild(input);
    input.click();
  });
}

/** Kamerayla fiş çek. null = vazgeçti. */
export async function fisCek(): Promise<HazirGorsel | null> {
  if (!Capacitor.isNativePlatform()) {
    const f = await webDosyaSec("image/*", true);
    return f ? gorseliHazirla(f) : null;
  }
  try {
    const r = await Camera.takePhoto({
      quality: 85,
      targetWidth: UZUN_KENAR,
      targetHeight: UZUN_KENAR,
      correctOrientation: true,
      saveToGallery: false,
    });
    if (!r.webPath) throw new UygulamaHatasi("GORSEL_BOZUK");
    return gorseliHazirla(await webYolundanBlob(r.webPath));
  } catch (e) {
    if (e instanceof UygulamaHatasi) throw e;
    const h = kameraHatasi(e);
    if (!h) return null;
    throw h;
  }
}

/** Galeriden ya da dosyalardan görsel veya PDF seç (gizli dosya girişi, her platformda). null = vazgeçti. */
export async function galeridenSec(): Promise<HazirDosya | null> {
  const f = await webDosyaSec("image/*,application/pdf", false);
  if (!f) return null;
  const pdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
  if (pdf) return pdfHazirla(f, f.name || "belge.pdf");
  if (f.type && !f.type.startsWith("image/")) throw new UygulamaHatasi("UNSUPPORTED_FILE");
  return gorseliHazirla(f);
}
