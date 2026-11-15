// Kamera ve dosya seçimi (@capacitor/camera 8 yeni API: takePhoto / chooseFromGallery).
// Görsel uzun kenarı 1600 px'e küçültülür, JPEG 0,8 (sunucu önerisi, ~300 KB). En fazla 5 MB.
// PDF: sunucu PDF almıyor, istemcinin görsele çevirmesi pdfjs gerektirir (ISTEKLER'de karar bekliyor):
// şimdilik PDF seçilirse PDF_DESTEKLENMIYOR.

import { Camera, CameraErrorCode, MediaTypeSelection } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { UygulamaHatasi } from "@/data/hatalar";

export const UZUN_KENAR = 1600;
export const JPEG_KALITE = 0.8;
export const AZAMI_BAYT = 5 * 1024 * 1024;
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
export async function gorseliHazirla(blob: Blob): Promise<HazirGorsel> {
  if (blob.type === "application/pdf") throw new UygulamaHatasi("PDF_DESTEKLENMIYOR");
  if (blob.size > HAM_SINIR) throw new UygulamaHatasi("DOSYA_BUYUK");
  let kaynak: ImageBitmap | HTMLImageElement;
  try {
    kaynak = await gorselYukle(blob);
  } catch (e) {
    throw new UygulamaHatasi("GORSEL_BOZUK", { neden: e });
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
  const bayt = base64Bayt(data);
  if (bayt > AZAMI_BAYT) throw new UygulamaHatasi("DOSYA_BUYUK");
  return { mimeType: "image/jpeg", data, onizleme: dataUrl, bayt };
}

async function webYolundanBlob(webPath: string): Promise<Blob> {
  const r = await fetch(webPath);
  if (!r.ok) throw new UygulamaHatasi("GORSEL_BOZUK");
  return r.blob();
}

/** Web: dosya penceresi. Vazgeçilirse null (focus geri gelince anlaşılır). */
function webDosyaSec(accept: string, capture: boolean): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    if (capture) input.setAttribute("capture", "environment");
    let bitti = false;
    input.onchange = () => {
      bitti = true;
      resolve(input.files?.[0] ?? null);
    };
    input.addEventListener("cancel", () => {
      if (!bitti) resolve(null);
    });
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

/** Galeriden ya da dosyadan görsel seç. null = vazgeçti. */
export async function galeridenSec(): Promise<HazirGorsel | null> {
  if (!Capacitor.isNativePlatform()) {
    const f = await webDosyaSec("image/*,application/pdf", false);
    return f ? gorseliHazirla(f) : null;
  }
  try {
    const r = await Camera.chooseFromGallery({
      mediaType: MediaTypeSelection.Photo,
      allowMultipleSelection: false,
      quality: 85,
      targetWidth: UZUN_KENAR,
      targetHeight: UZUN_KENAR,
      correctOrientation: true,
    });
    const ilk = r.results[0];
    if (!ilk) return null;
    if (!ilk.webPath) throw new UygulamaHatasi("GORSEL_BOZUK");
    return gorseliHazirla(await webYolundanBlob(ilk.webPath));
  } catch (e) {
    if (e instanceof UygulamaHatasi) throw e;
    const h = kameraHatasi(e);
    if (!h) return null;
    throw h;
  }
}
