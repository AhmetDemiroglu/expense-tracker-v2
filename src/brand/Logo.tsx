/* Fintel logosu. Varyantlar brand/logo/svg dosyalarından gelir, temaya göre açık ya da koyu sürüm seçilir.
   40 px altı yükseklikte yatay logo kullanılır (brand/README). */
import { useTheme } from "@/ui/useTheme";
import hLight from "../../brand/logo/svg/lockup-h-light.svg";
import hDark from "../../brand/logo/svg/lockup-h-dark.svg";
import vLight from "../../brand/logo/svg/lockup-v-light.svg";
import vDark from "../../brand/logo/svg/lockup-v-dark.svg";
import hsLight from "../../brand/logo/svg/lockup-h-slogan-light.svg";
import hsDark from "../../brand/logo/svg/lockup-h-slogan-dark.svg";
import vsLight from "../../brand/logo/svg/lockup-v-slogan-light.svg";
import vsDark from "../../brand/logo/svg/lockup-v-slogan-dark.svg";
import { LogoMark } from "./LogoMark";

type Variant = "mark" | "horizontal" | "vertical" | "slogan" | "vertical-slogan";

/* [açık, koyu, en / boy] */
const FILES: Record<Exclude<Variant, "mark">, readonly [string, string, number]> = {
  horizontal: [hLight, hDark, 368.4 / 158],
  vertical: [vLight, vDark, 240.9 / 321.3],
  slogan: [hsLight, hsDark, 439.66 / 158],
  "vertical-slogan": [vsLight, vsDark, 310.16 / 370.74],
};

export interface LogoProps {
  /** mark: yalnız simge. horizontal: üst bar. vertical: açılış, karşılama. slogan: sloganlı yatay. vertical-slogan: sloganlı dikey. */
  variant?: Variant;
  /** Yükseklik (px). */
  height?: number;
  /** Lacivert zemin üstünde (yalnız mark). */
  onBrand?: boolean;
  /** Temayı zorla (varsayılan: uygulama teması). */
  theme?: "light" | "dark";
  className?: string;
}

export function Logo({ variant = "horizontal", height = 28, onBrand = false, theme, className }: LogoProps) {
  const { resolved } = useTheme();
  const t = theme ?? resolved;
  if (variant === "mark") return <LogoMark size={height} tone={onBrand ? "onBrand" : t} className={className} title="Fintel" />;
  const [light, dark, ratio] = FILES[variant];
  return <img src={t === "dark" ? dark : light} alt="Fintel" height={height} width={Math.round(height * ratio)} draggable={false} className={className} style={{ height, width: "auto" }} />;
}
