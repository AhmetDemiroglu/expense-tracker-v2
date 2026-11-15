/* Düzenli ödeme formu (alt sayfa "duzenli-form"). Yeni: nextDueDate = initialNextDueDate.
   Düzenleme: sıklık ya da başlangıç değişirse nextDueDateAfterEdit, değişmezse imleç korunur (startDate YAZILMAZ). */
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, formatDateTr, initialNextDueDate, nextDueDateAfterEdit, stripAutoSuffix, type CategoryKey, type Frequency, type Kurus, type LocalDate, type TxType } from "@/core";
import { hataMesaji, useBugun, useVeri } from "@/data";
import { tr } from "@/metin";
import type { SheetScreenProps } from "@/shell";
import { AmountField, Button, Chip, DatePickSheet, Field, Segmented, Sheet, haptic, toast } from "@/ui";

export function DuzenliFormu({ open, close, params }: SheetScreenProps) {
  const t = tr.ayarlar.duzenli.form;
  const id = typeof params.id === "string" ? params.id : undefined;
  const bugun = useBugun();
  const mevcut = useVeri((s) => (id ? s.duzenliler.find((r) => r.id === id) : undefined));
  const [tur, setTur] = useState<TxType>(mevcut?.type ?? "expense");
  const [ad, setAd] = useState(mevcut ? stripAutoSuffix(mevcut.description) : "");
  const [tutar, setTutar] = useState<Kurus | null>(mevcut?.amount ?? null);
  const [kategori, setKategori] = useState<CategoryKey>(mevcut?.category ?? "fatura");
  const [siklik, setSiklik] = useState<Frequency>(mevcut?.frequency ?? "monthly");
  const [baslangic, setBaslangic] = useState<LocalDate>(mevcut?.startDate ?? bugun);
  const [aktif, setAktif] = useState(mevcut?.isActive ?? true);
  const [tarihAcik, setTarihAcik] = useState(false);
  const [hata, setHata] = useState<Record<string, string>>({});
  const [kaydediyor, setKaydediyor] = useState(false);

  const kategoriler = tur === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function turDegis(v: TxType) {
    setTur(v);
    setKategori(v === "expense" ? "fatura" : "maas");
  }

  async function kaydet() {
    const h: Record<string, string> = {};
    if (!ad.trim()) h.ad = t.adGerekli;
    if (tutar === null || tutar <= 0) h.tutar = t.tutarGerekli;
    setHata(h);
    if (Object.keys(h).length > 0 || tutar === null) {
      haptic.warning();
      return;
    }
    setKaydediyor(true);
    try {
      const kural = { frequency: siklik, startDate: baslangic };
      let nextDueDate: LocalDate;
      if (!mevcut) nextDueDate = initialNextDueDate(kural);
      else if (mevcut.frequency !== siklik || mevcut.startDate !== baslangic) nextDueDate = nextDueDateAfterEdit(mevcut, kural);
      else nextDueDate = mevcut.nextDueDate;
      const taban = mevcut ? (({ userId: _u, ...r }) => (void _u, r))(mevcut) : {};
      await useVeri.getState().duzenliKaydet({
        ...taban,
        type: tur,
        category: kategori,
        amount: tutar,
        description: ad.trim(),
        frequency: siklik,
        startDate: baslangic,
        nextDueDate,
        isActive: aktif,
      });
      haptic.success();
      toast(tr.ayarlar.duzenli.kaydedildi);
      close();
    } catch (e) {
      setHata({ genel: hataMesaji(e) });
      setKaydediyor(false);
    }
  }

  return (
    <Sheet open={open} onClose={close} title={id ? t.duzenleBaslik : t.yeniBaslik} size="full" footer={<Button full size="lg" loading={kaydediyor} onClick={() => void kaydet()}>{tr.ortak.kaydet}</Button>}>
      <div className="flex flex-col gap-3 pb-2">
        <Segmented
          full
          label={t.tur}
          value={tur}
          onChange={turDegis}
          options={[
            { value: "expense", label: t.gider },
            { value: "income", label: t.gelir },
          ]}
        />
        <Field label={t.ad} placeholder={t.adIpucu} value={ad} onChange={setAd} error={hata.ad} maxLength={80} />
        <AmountField label={t.tutar} value={tutar} onChange={setTutar} error={hata.tutar} />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-2">{t.kategori}</span>
          <div className="scroll-x flex gap-2 pb-1" data-swipe-lock>
            {kategoriler.map((c) => (
              <Chip key={c.key} selected={kategori === c.key} onClick={() => setKategori(c.key)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-2">{t.siklik}</span>
          <Segmented
            full
            label={t.siklik}
            value={siklik}
            onChange={setSiklik}
            options={[
              { value: "weekly", label: tr.ayarlar.duzenli.sikliklar.weekly },
              { value: "monthly", label: tr.ayarlar.duzenli.sikliklar.monthly },
              { value: "yearly", label: tr.ayarlar.duzenli.sikliklar.yearly },
            ]}
          />
        </div>
        <button type="button" onClick={() => setTarihAcik(true)} className="pressable flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-control border border-line bg-surface px-3 text-left">
          <span className="text-xs font-medium text-text-3">{t.baslangic}</span>
          <span className="flex items-center gap-1.5 text-base font-medium text-text">
            <CalendarDays size={16} className="text-text-3" aria-hidden="true" />
            {formatDateTr(baslangic, "long")}
          </span>
        </button>
        {mevcut ? (
          <Segmented
            full
            label={tr.ayarlar.duzenli.pasif}
            value={aktif ? "a" : "p"}
            onChange={(v) => setAktif(v === "a")}
            options={[
              { value: "a", label: tr.ayarlar.duzenli.aktifEdildi },
              { value: "p", label: tr.ayarlar.duzenli.pasif },
            ]}
          />
        ) : null}
        {mevcut ? <p className="text-sm text-text-3">{t.uyari}</p> : null}
        {hata.genel ? (
          <p role="alert" className="rounded-control bg-surface-2 px-3 py-2 text-sm text-warn">
            {hata.genel}
          </p>
        ) : null}
      </div>
      <DatePickSheet open={tarihAcik} onClose={() => setTarihAcik(false)} title={t.baslangic} today={bugun} value={baslangic} onChange={setBaslangic} />
    </Sheet>
  );
}
