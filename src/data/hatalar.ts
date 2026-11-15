// Tek hata türü. Ekran yalnız `mesaj`ı gösterir; ham hata kullanıcıya gitmez.

export type VeriHataKodu =
  | "AG_YOK"
  | "IZIN_YOK"
  | "OTURUM_YOK"
  | "GECERSIZ"
  | "BULUNAMADI"
  | "DEPO_DOLU"
  | "YENIDEN_GIRIS"
  | "IPTAL"
  | "SAGLAYICI_YOK"
  | "BILINMEYEN";

export type GirisHataKodu =
  | "HATALI_GIRIS"
  | "EPOSTA_KULLANIMDA"
  | "ZAYIF_PAROLA"
  | "GECERSIZ_EPOSTA"
  | "COK_DENEME"
  | "HESAP_FARKLI_YONTEM"
  | "SILME_YARIDA";

export type AiHataKodu =
  | "AUTH_REQUIRED"
  | "QUOTA_EXCEEDED"
  | "AI_UNAVAILABLE"
  | "AI_BAD_RESPONSE"
  | "TOO_LARGE"
  | "UNSUPPORTED_FILE"
  | "INVALID_REQUEST"
  | "BOZUK_YANIT";

export type CihazHataKodu = "KAMERA_YOK" | "GORSEL_BOZUK" | "DOSYA_BUYUK";

export type HataKodu = VeriHataKodu | GirisHataKodu | AiHataKodu | CihazHataKodu;

const VARSAYILAN_MESAJ: Record<HataKodu, string> = {
  AG_YOK: "İnternet bağlantısı yok. Bağlanınca yeniden dene.",
  IZIN_YOK: "Bu işlem için izin yok.",
  OTURUM_YOK: "Oturum kapalı. Yeniden giriş yap.",
  GECERSIZ: "Bilgiler geçersiz. Kontrol edip yeniden dene.",
  BULUNAMADI: "Kayıt bulunamadı.",
  DEPO_DOLU: "Cihazda yer kalmadı. Kayıt yapılamadı.",
  YENIDEN_GIRIS: "Güvenlik için yeniden giriş yapman gerekiyor.",
  IPTAL: "İşlem iptal edildi.",
  SAGLAYICI_YOK: "Bu giriş yöntemi şu an kullanılamıyor.",
  BILINMEYEN: "Bir şeyler ters gitti. Yeniden dene.",
  HATALI_GIRIS: "E-posta ya da parola hatalı.",
  EPOSTA_KULLANIMDA: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.",
  ZAYIF_PAROLA: "Parola en az 6 karakter olmalı.",
  GECERSIZ_EPOSTA: "E-posta adresi geçersiz.",
  COK_DENEME: "Çok fazla deneme yapıldı. Biraz bekleyip yeniden dene.",
  HESAP_FARKLI_YONTEM: "Bu e-posta başka bir giriş yöntemiyle kayıtlı. O yöntemle giriş yap.",
  SILME_YARIDA: "Hesap silme yarıda kaldı. Yeniden dene.",
  AUTH_REQUIRED: "Nova giriş yapınca açılır.",
  QUOTA_EXCEEDED: "Bugünlük hakkın doldu. Yarın yeniden açılır.",
  AI_UNAVAILABLE: "Nova şu an yanıt veremiyor. Biraz sonra yeniden dene.",
  AI_BAD_RESPONSE: "Okunamadı. Bilgileri elle girebilirsin.",
  TOO_LARGE: "Dosya çok büyük. Daha küçük bir dosya ya da yakından çekilmiş bir fotoğraf dene.",
  UNSUPPORTED_FILE: "Bu dosya okunamıyor. Fişin fotoğrafını ya da PDF'ini seç.",
  INVALID_REQUEST: "İstek geçersiz. Uygulamayı güncelleyip yeniden dene.",
  BOZUK_YANIT: "Yanıt okunamadı. Yeniden dene.",
  KAMERA_YOK: "Bu cihazda kamera bulunamadı.",
  GORSEL_BOZUK: "Görsel açılamadı. Fotoğrafı JPEG olarak seç ya da başka bir görsel dene.",
  DOSYA_BUYUK: "Dosya çok büyük. PDF en fazla 4 MB, görsel en fazla 5 MB olabilir.",
};

const TEKRAR_DENENEBILIR: ReadonlySet<HataKodu> = new Set<HataKodu>([
  "AG_YOK",
  "BILINMEYEN",
  "AI_UNAVAILABLE",
  "SILME_YARIDA",
  "BOZUK_YANIT",
  "COK_DENEME",
]);

export class UygulamaHatasi extends Error {
  readonly kod: HataKodu;
  readonly mesaj: string;
  readonly tekrarDenenebilir: boolean;
  /** QUOTA_EXCEEDED: sıfırlanma zamanı (ISO) */
  readonly sifirlanma?: string;

  constructor(kod: HataKodu, opts: { mesaj?: string; neden?: unknown; sifirlanma?: string } = {}) {
    super(opts.mesaj ?? VARSAYILAN_MESAJ[kod], { cause: opts.neden });
    this.name = "UygulamaHatasi";
    this.kod = kod;
    this.mesaj = opts.mesaj ?? VARSAYILAN_MESAJ[kod];
    this.tekrarDenenebilir = TEKRAR_DENENEBILIR.has(kod);
    if (opts.sifirlanma) this.sifirlanma = opts.sifirlanma;
  }
}

export function hataMi(e: unknown): e is UygulamaHatasi {
  return e instanceof UygulamaHatasi;
}

export function varsayilanMesaj(kod: HataKodu): string {
  return VARSAYILAN_MESAJ[kod];
}

function hamKod(e: unknown): string {
  if (typeof e === "object" && e !== null && "code" in e) {
    const c = (e as { code: unknown }).code;
    if (typeof c === "string") return c;
  }
  return "";
}

/**
 * Firestore ve tarayıcı depolama hatalarını türlere ayırır.
 * Ağ hatası "veri yok" gibi gösterilmez: AG_YOK ayrı koddur.
 */
export function veriHatasinaCevir(e: unknown): UygulamaHatasi {
  if (e instanceof UygulamaHatasi) return e;
  const code = hamKod(e).replace(/^firestore\//, "");
  switch (code) {
    case "unavailable":
    case "deadline-exceeded":
      return new UygulamaHatasi("AG_YOK", { neden: e });
    case "permission-denied":
      return new UygulamaHatasi("IZIN_YOK", {
        neden: e,
        mesaj: "Kayıt sunucu tarafından kabul edilmedi. Bilgileri kontrol et.",
      });
    case "unauthenticated":
      return new UygulamaHatasi("OTURUM_YOK", { neden: e });
    case "not-found":
      return new UygulamaHatasi("BULUNAMADI", { neden: e });
    case "invalid-argument":
    case "failed-precondition":
      return new UygulamaHatasi("GECERSIZ", { neden: e });
    case "resource-exhausted":
      return new UygulamaHatasi("AG_YOK", { neden: e, mesaj: "Sunucu şu an yoğun. Biraz sonra yeniden dene." });
    default:
      break;
  }
  if (typeof e === "object" && e !== null && "name" in e) {
    const name = (e as { name: unknown }).name;
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
      return new UygulamaHatasi("DEPO_DOLU", { neden: e });
    }
  }
  return new UygulamaHatasi("BILINMEYEN", { neden: e });
}

/** Her şeyi Türkçe, gösterilebilir metne çevirir. */
export function hataMesaji(e: unknown): string {
  if (e instanceof UygulamaHatasi) return e.mesaj;
  return veriHatasinaCevir(e).mesaj;
}
