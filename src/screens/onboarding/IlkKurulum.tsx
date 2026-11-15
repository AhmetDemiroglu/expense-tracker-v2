/* İlk kurulum: maaş günü, aylık gelir, sabit giderler. Sonunda ilk dönem çekirdeğin önerisiyle oluşur.
   Kapıda (ayarı olmayan kullanıcı) tam ekran, "ilk-kurulum" ekranı olarak (P5 çağrısı) üst ekran. */
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { formatDateTr, suggestNextPeriod } from "@/core";
import { hataMesaji, useBugun, useVeri } from "@/data";
import { tr } from "@/metin";
import { Screen, nav } from "@/shell";
import { AmountField, Button, Card, Chip, IconButton, NovaSahne, ProgressBar, Section, haptic, toast, type NovaMood } from "@/ui";
import { TamEkran } from "../auth/TamEkran";

const HIZLI_GUNLER = [1, 5, 10, 15, 20, 25, 30] as const;

function KurulumAdimlari({ kapat }: { kapat?: () => void }) {
  const t = tr.giris.kurulum;
  const bugun = useBugun();
  const donemler = useVeri((s) => s.donemler);
  const [adim, setAdim] = useState(0);
  const [gun, setGun] = useState(1);
  const [gelir, setGelir] = useState<number | null>(null);
  const [gider, setGider] = useState<number | null>(0);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);

  const onceki = donemler[0] ?? null;
  const oneri = suggestNextPeriod({ today: bugun, payday: gun, previous: onceki ? { start: onceki.start, end: onceki.end, plannedIncome: 0, fixedExpenses: 0 } : null });
  const son = adim === 2;
  const gelirHata = adim === 1 && gelir === null ? tr.ortak.tutar.bos : undefined;

  const mood: NovaMood = adim === 0 ? "selam" : adim === 1 ? "mutlu" : "dusunuyor";
  const baslik = adim === 0 ? t.maas.baslik : adim === 1 ? t.gelir.baslik : t.gider.baslik;
  const metin = adim === 0 ? t.maas.metin : adim === 1 ? t.gelir.metin : t.gider.metin;

  async function bitir() {
    setKaydediyor(true);
    setHata(null);
    try {
      const v = useVeri.getState();
      const d = await v.donemKaydet({ name: oneri.name, start: oneri.start, end: oneri.end, plannedIncome: gelir ?? 0, fixedExpenses: gider ?? 0 });
      await v.donemAktifEt(d.id);
      await v.ayarlarKaydet({ payday: gun });
      haptic.success();
      toast(t.olustu);
      kapat?.();
    } catch (e) {
      setHata(hataMesaji(e));
      setKaydediyor(false);
    }
  }

  function ileri() {
    if (adim === 1 && gelir === null) {
      haptic.warning();
      return;
    }
    if (son) void bitir();
    else {
      setAdim(adim + 1);
      haptic.selection();
    }
  }

  return (
    <>
      <Card variant="solid" className="flex flex-col gap-2" aria-label={t.ust(adim + 1, 3)}>
        <ProgressBar value={(adim + 1) / 3} tone="copper" label={t.ust(adim + 1, 3)} />
        <p className="text-xs text-text-3">{t.ust(adim + 1, 3)}</p>
      </Card>
      <NovaSahne mood={mood} size={104} title={baslik} text={metin} />
      <Section title={adim === 0 ? t.maas.etiket : adim === 1 ? t.gelir.etiket : t.gider.etiket} variant="solid">
        {adim === 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <IconButton label={t.maas.azalt} variant="tinted" onClick={() => setGun((g) => (g <= 1 ? 31 : g - 1))}>
                <Minus size={20} aria-hidden="true" />
              </IconButton>
              <p className="text-center text-xl font-semibold text-text" aria-live="polite">
                {t.maas.gun(gun)}
              </p>
              <IconButton label={t.maas.artir} variant="tinted" onClick={() => setGun((g) => (g >= 31 ? 1 : g + 1))}>
                <Plus size={20} aria-hidden="true" />
              </IconButton>
            </div>
            <div className="scroll-x flex gap-2" data-swipe-lock>
              {HIZLI_GUNLER.map((g) => (
                <Chip key={g} selected={gun === g} onClick={() => setGun(g)}>
                  {g}
                </Chip>
              ))}
            </div>
            {gun > 28 ? <p className="text-sm text-text-3">{t.maas.ipucu}</p> : null}
          </div>
        ) : adim === 1 ? (
          <AmountField label={t.gelir.etiket} value={gelir} onChange={setGelir} error={gelirHata} autoFocus />
        ) : (
          <div className="flex flex-col gap-3">
            <AmountField label={t.gider.etiket} value={gider} onChange={setGider} autoFocus />
            <div className="rounded-control bg-surface-2 p-3">
              <p className="text-xs font-medium text-text-3">{t.ozetBaslik}</p>
              <p className="text-base font-semibold text-text">{oneri.name}</p>
              <p className="text-sm text-text-2">{formatDateTr(oneri.start, "long")} - {formatDateTr(oneri.end, "long")}</p>
            </div>
          </div>
        )}
      </Section>
      {hata ? (
        <p role="alert" className="rounded-control bg-surface-2 px-3 py-2 text-sm text-warn">
          {t.hata}: {hata}
        </p>
      ) : null}
      <div className="mt-auto flex gap-2 pt-1">
        {adim > 0 ? (
          <Button variant="secondary" size="lg" disabled={kaydediyor} onClick={() => setAdim(adim - 1)}>
            {t.geri}
          </Button>
        ) : null}
        <Button size="lg" full loading={kaydediyor} onClick={ileri}>
          {son ? t.bitir : t.ileri}
        </Button>
      </div>
    </>
  );
}

/** Kapı adımı: ayarı olmayan kullanıcı. */
export function IlkKurulumKapisi() {
  return (
    <TamEkran>
      <KurulumAdimlari />
    </TamEkran>
  );
}

/** Üst ekran: `nav.push("ilk-kurulum")`. Bitince kendini kapatır. */
export function IlkKurulumEkrani() {
  return (
    <Screen title={tr.giris.kurulum.baslik} scroll>
      <KurulumAdimlari kapat={() => nav.pop()} />
    </Screen>
  );
}
