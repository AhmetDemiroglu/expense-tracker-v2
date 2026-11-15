/* Türkçe metinlerin tek girişi. BU DOSYAYA DOKUNMA: her paket kendi dosyasını doldurur (ozet.ts, kayitlar.ts ...). */
import { ortak } from "./ortak";
import { ozet } from "./ozet";
import { takvim } from "./takvim";
import { kayitlar } from "./kayitlar";
import { nova } from "./nova";
import { ayarlar } from "./ayarlar";
import { giris } from "./giris";
import { ipucu } from "./ipucu";

export const tr = { ortak, ozet, takvim, kayitlar, nova, ayarlar, giris, ipucu } as const;
