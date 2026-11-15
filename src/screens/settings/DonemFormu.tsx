/* Dönem formu (alt sayfa "donem-form"): yeni, düzenle, "yeni dönemi başlat" önerisi. Doğrulama çekirdekten. */
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { daysInclusive, formatDateTr, suggestNextPeriod, validatePeriod, type Kurus, type LocalDate, type Period } from "@/core";
import { hataMesaji, useAktifDonem, useBugun, useVeri } from "@/data";
import { tr } from "@/metin";
import type { SheetScreenProps } from "@/shell";
import { AmountField, Button, DatePickSheet, Field, Sheet, haptic, toast } from "@/ui";

function baslangic(id: string | undefined, oneri: boolean, donemler: Period[], aktif: Period | null, bugun: LocalDate, payday?: number) {
  const mevcut = id ? donemler.find((d) => d.id === id) : undefined;
  if (mevcut) return { ad: mevcut.name, bas: mevcut.start, bit: mevcut.end, gelir: mevcut.plannedIncome, gider: mevcut.fixedExpenses };
  const onceki = oneri ? (aktif ?? donemler[0] ?? null) : null;
  const o = suggestNextPeriod({ today: bugun, payday, previous: onceki ?? undefined });
  return { ad: o.name, bas: o.start, bit: o.end, gelir: o.plannedIncome, gider: o.fixedExpenses };
}

export function DonemFormu({ open, close, params }: SheetScreenProps) {
  const t = tr.ayarlar.donemler.form;
  const id = typeof params.id === "string" ? params.id : undefined;
  const oneri = params.oneri === true;
  const bugun = useBugun();
  const donemler = useVeri((s) => s.donemler);
  const payday = useVeri((s) => s.ayarlar?.payday);
  const aktif = useAktifDonem();
  const [bas0] = useState(() => baslangic(id, oneri, donemler, aktif, bugun, payday));
  const [ad, setAd] = useState(bas0.ad);
  const [bas, setBas] = useState<LocalDate>(bas0.bas);
  const [bit, setBit] = useState<LocalDate>(bas0.bit);
  const [gelir, setGelir] = useState<Kurus | null>(bas0.gelir);
  const [gider, setGider] = useState<Kurus | null>(bas0.gider);
  const [secici, setSecici] = useState<"bas" | "bit" | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);

  const baslik = id ? t.duzenleBaslik : oneri ? t.oneriBaslik : t.yeniBaslik;
  const gun = bit >= bas ? daysInclusive(bas, bit) : 0;

  function hatalar(): string | null {
    if (!ad.trim()) return t.adGerekli;
    const adaylar = validatePeriod({ start: bas, end: bit, plannedIncome: gelir ?? 0, fixedExpenses: gider ?? 0 }, donemler, id);
    if (adaylar.includes("end_before_start")) return t.bitisOnce;
    if (adaylar.includes("negative_income")) return t.negatifGelir;
    if (adaylar.includes("negative_fixed")) return t.negatifGider;
    if (adaylar.includes("overlap")) {
      const adlar = donemler.filter((d) => d.id !== id && d.start <= bit && d.end >= bas).map((d) => d.name);
      return t.cakisma(adlar.join(", "));
    }
    return null;
  }

  async function kaydet() {
    const h = hatalar();
    setHata(h);
    if (h) {
      haptic.warning();
      return;
    }
    setKaydediyor(true);
    try {
      const v = useVeri.getState();
      const kayit = await v.donemKaydet({ ...(id ? { id } : {}), name: ad.trim(), start: bas, end: bit, plannedIncome: gelir ?? 0, fixedExpenses: gider ?? 0 });
      if (!id && (oneri || !aktif)) await v.donemAktifEt(kayit.id);
      haptic.success();
      toast(tr.ayarlar.donemler.kaydedildi);
      close();
    } catch (e) {
      setHata(hataMesaji(e));
      setKaydediyor(false);
    }
  }

  return (
    <Sheet open={open} onClose={close} title={baslik} subtitle={gun > 0 ? t.gunSayisi(gun) : undefined} size="full" footer={<Button full size="lg" loading={kaydediyor} onClick={() => void kaydet()}>{tr.ortak.kaydet}</Button>}>
      <div className="flex flex-col gap-3 pb-2">
        <Field label={t.ad} value={ad} onChange={setAd} maxLength={80} />
        <div className="grid grid-cols-2 gap-3">
          <TarihDugmesi etiket={t.baslangic} deger={bas} onClick={() => setSecici("bas")} />
          <TarihDugmesi etiket={t.bitis} deger={bit} onClick={() => setSecici("bit")} />
        </div>
        <AmountField label={t.gelir} value={gelir} onChange={setGelir} />
        <AmountField label={t.gider} value={gider} onChange={setGider} />
        {hata ? (
          <p role="alert" className="rounded-control bg-surface-2 px-3 py-2 text-sm text-warn">
            {hata}
          </p>
        ) : null}
      </div>
      <DatePickSheet open={secici !== null} onClose={() => setSecici(null)} title={t.tarihSec} today={bugun} value={secici === "bit" ? bit : bas} onChange={(d) => (secici === "bit" ? setBit(d) : setBas(d))} />
    </Sheet>
  );
}

function TarihDugmesi({ etiket, deger, onClick }: { etiket: string; deger: LocalDate; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="pressable flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-control border border-line bg-surface px-3 text-left">
      <span className="text-xs font-medium text-text-3">{etiket}</span>
      <span className="flex items-center gap-1.5 text-base font-medium text-text">
        <CalendarDays size={16} className="text-text-3" aria-hidden="true" />
        {formatDateTr(deger, "long")}
      </span>
    </button>
  );
}
