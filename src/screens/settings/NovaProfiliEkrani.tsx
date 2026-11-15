/* Nova profili: hedef, tasarruf tarzı, risk. Seçim anında kaydedilir, dönem değişimi bunu silmez. */
import type { Settings } from "@/core";
import { hataMesaji, useVeri } from "@/data";
import { tr } from "@/metin";
import { Screen } from "@/shell";
import { NovaSahne, Section, haptic, toast } from "@/ui";
import { Ayirac, SecimSatiri } from "./ortak";

type Hedef = Settings["financialGoal"];
type Tarz = Settings["savingsStyle"];
type Risk = Settings["riskTolerance"];

const HEDEFLER: Hedef[] = ["debt_reduction", "savings", "investment", "stability"];
const TARZLAR: Tarz[] = ["strict", "balanced", "relaxed"];
const RISKLER: Risk[] = ["low", "medium", "high"];

export function NovaProfiliEkrani() {
  const t = tr.ayarlar.nova;
  const ayar = useVeri((s) => s.ayarlar);
  const hedef = ayar?.financialGoal ?? "stability";
  const tarz = ayar?.savingsStyle ?? "balanced";
  const risk = ayar?.riskTolerance ?? "medium";

  async function kaydet(yama: Partial<Pick<Settings, "financialGoal" | "savingsStyle" | "riskTolerance">>) {
    haptic.selection();
    try {
      await useVeri.getState().ayarlarKaydet(yama);
      toast(t.kaydedildi);
    } catch (e) {
      toast.error(hataMesaji(e));
    }
  }

  return (
    <Screen title={t.baslik}>
      <NovaSahne mood="mutlu" size={96} title={t.sahneBaslik} text={t.metin} />
      <Section title={t.hedef.baslik} variant="solid" pad="none">
        {HEDEFLER.map((h, i) => (
          <div key={h}>
            {i > 0 ? <Ayirac /> : null}
            <SecimSatiri ad="hedef" baslik={t.hedef[h].ad} alt={t.hedef[h].alt} secili={hedef === h} onSec={() => void kaydet({ financialGoal: h })} />
          </div>
        ))}
      </Section>
      <Section title={t.tarz.baslik} variant="solid" pad="none">
        {TARZLAR.map((h, i) => (
          <div key={h}>
            {i > 0 ? <Ayirac /> : null}
            <SecimSatiri ad="tarz" baslik={t.tarz[h].ad} alt={t.tarz[h].alt} secili={tarz === h} onSec={() => void kaydet({ savingsStyle: h })} />
          </div>
        ))}
      </Section>
      <Section title={t.risk.baslik} variant="solid" pad="none">
        {RISKLER.map((h, i) => (
          <div key={h}>
            {i > 0 ? <Ayirac /> : null}
            <SecimSatiri ad="risk" baslik={t.risk[h].ad} alt={t.risk[h].alt} secili={risk === h} onSec={() => void kaydet({ riskTolerance: h })} />
          </div>
        ))}
      </Section>
      <p className="rounded-control bg-surface-2 px-3 py-2 text-center text-sm text-text-3">{t.uyari}</p>
    </Screen>
  );
}
