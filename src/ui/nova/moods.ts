/* Nova'nın ruh halleri: yüz ve kol ayarları. Saf veri (birim testli). */

export const NOVA_MOODS = ["selam", "mutlu", "uzgun", "dusunuyor", "konusuyor", "uyari", "basari", "uyku", "analiz", "saskin"] as const;
export type NovaMood = (typeof NOVA_MOODS)[number];

export interface NovaFace {
  /** open: yuvarlak göz. up: gülen kapalı göz. down: uyuyan kapalı göz. bar: tarayan çizgi göz. */
  eye: "open" | "up" | "down" | "bar";
  /** Açık gözün ölçeği (1 = normal). */
  eyeScale: number;
  /** Bakış kayması (birim: çizim birimi). */
  look: readonly [number, number];
  /** Kaş: [dikey kayma, dönüş derecesi]. Dönüş sol kaş içindir, sağ kaş aynalanır. null: kaş yok. */
  brow: readonly [number, number] | null;
  /** Sağ kaş ayrıca kalkık mı (düşünürken tek kaş). */
  browRaise?: number;
  /** curve: eğri ağız (smile değeri). flat: düz çizgi. open: açık ağız. */
  mouth: "curve" | "flat" | "open";
  /** Eğri ağız: 1 geniş gülüş, -1 üzgün. Açık ağız: yükseklik ölçeği. */
  smile: number;
  mouthWidth: number;
  /** Kollar: rest aşağıda, wave sağ kol havada sallar, up iki kol havada. */
  arms: "rest" | "wave" | "up";
  extra?: "dots" | "zz" | "scan" | "talk" | "alert";
}

export const FACES: Record<NovaMood, NovaFace> = {
  selam: { eye: "open", eyeScale: 1, look: [0, 0], brow: [-1, 0], mouth: "curve", smile: 0.8, mouthWidth: 1, arms: "wave" },
  mutlu: { eye: "up", eyeScale: 1, look: [0, 0], brow: null, mouth: "curve", smile: 1, mouthWidth: 1.15, arms: "rest" },
  uzgun: { eye: "open", eyeScale: 0.85, look: [0, 2], brow: [0, -20], mouth: "curve", smile: -0.75, mouthWidth: 0.8, arms: "rest" },
  dusunuyor: { eye: "open", eyeScale: 0.9, look: [3, -3], brow: [0, 4], browRaise: -3, mouth: "flat", smile: 0, mouthWidth: 0.6, arms: "rest", extra: "dots" },
  konusuyor: { eye: "open", eyeScale: 1, look: [0, 0], brow: [-1, 0], mouth: "open", smile: 0.7, mouthWidth: 0.8, arms: "rest", extra: "talk" },
  uyari: { eye: "open", eyeScale: 1.1, look: [0, 0], brow: [1, 18], mouth: "flat", smile: 0, mouthWidth: 0.8, arms: "rest", extra: "alert" },
  basari: { eye: "up", eyeScale: 1, look: [0, 0], brow: null, mouth: "open", smile: 1, mouthWidth: 1.1, arms: "up" },
  uyku: { eye: "down", eyeScale: 1, look: [0, 1], brow: null, mouth: "flat", smile: 0, mouthWidth: 0.4, arms: "rest", extra: "zz" },
  analiz: { eye: "bar", eyeScale: 1, look: [0, 0], brow: null, mouth: "flat", smile: 0, mouthWidth: 0.7, arms: "rest", extra: "scan" },
  saskin: { eye: "open", eyeScale: 1.3, look: [0, -1], brow: [-4, 0], mouth: "open", smile: 0.9, mouthWidth: 0.55, arms: "rest" },
};

/** Göz kırpar mı: yalnız açık gözlü ruh hallerinde. */
export function canBlink(mood: NovaMood): boolean {
  return FACES[mood].eye === "open";
}

/** Küçük boy: kollar, kaşlar ve ek öğeler çizilmez, yüz iri çizilir. */
export function isCompact(size: number): boolean {
  return size < 48;
}
