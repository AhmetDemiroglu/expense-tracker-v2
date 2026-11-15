/* Görünüm: gündüz, gece, sistem. */
import { Monitor, Moon, Sun } from "lucide-react";
import { useTercihler } from "@/data";
import { tr } from "@/metin";
import { Screen } from "@/shell";
import { Section, haptic, useTheme, type ThemePref } from "@/ui";
import { Ayirac, SecimSatiri } from "./ortak";

export function GorunumEkrani() {
  const t = tr.ayarlar.gorunum;
  const { pref } = useTheme();
  const sec = (p: ThemePref) => {
    haptic.selection();
    useTercihler.getState().temaDegistir(p);
  };
  return (
    <Screen title={t.baslik}>
      <Section title={t.baslikKart} variant="solid" pad="none">
        <SecimSatiri ad="tema" icon={<Sun size={20} aria-hidden="true" />} baslik={t.gunduz.ad} alt={t.gunduz.alt} secili={pref === "light"} onSec={() => sec("light")} />
        <Ayirac />
        <SecimSatiri ad="tema" icon={<Moon size={20} aria-hidden="true" />} baslik={t.gece.ad} alt={t.gece.alt} secili={pref === "dark"} onSec={() => sec("dark")} />
        <Ayirac />
        <SecimSatiri ad="tema" icon={<Monitor size={20} aria-hidden="true" />} baslik={t.sistem.ad} alt={t.sistem.alt} secili={pref === "system"} onSec={() => sec("system")} />
      </Section>
    </Screen>
  );
}
