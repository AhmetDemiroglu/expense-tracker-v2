/* "kayit-ekle" alt sayfası: sheets.open("kayit-ekle", { date?: LocalDate, id?: string }).
   Yeni kayıt, düzenleme (id), hızlı kayıt, tuş takımı, kategori, tarih, taksit, fiş. Hesap çekirdekten (girdi.ts). */
import { useEffect, useState } from "react";
import { CalendarDays, Minus, Plus } from "lucide-react";
import {
  CATEGORIES, categoryLabel, formatAmountInput, formatDateTr, isPlannedAtEntry, parseAmount, parseLocalDate, parseQuickEntry,
  type CategoryKey, type LocalDate, type TxType,
} from "@/core";
import { hataMesaji, useBugun, useEtkinIslemler, useOturum, useVeri } from "@/data";
import { tr } from "@/metin";
import type { SheetScreenProps } from "@/shell";
import {
  Amount, Button, Chip, DatePickSheet, Field, IconButton, Keypad, SectionLabel, Segmented, Sheet, amountErrorText, haptic, keypadDisplay, toast,
  useAutoTour,
} from "@/ui";
import { ACIKLAMA_SINIRI, formuKaydaCevir, hizliTarihler, onerilenKategoriler, taksitOnizle, turunKategorisi, type FisFormu, type FormDurumu } from "./girdi";
import { FisBolumu } from "./FisBolumu";
import { KategoriIkonu } from "./ikonlar";
import { ILK_KAYIT_TURU } from "./tur";

const t = tr.kayitlar;

const uuid = (): string => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

function Etiket({ ad, kontrol = false }: { ad: string; kontrol?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <SectionLabel>{ad}</SectionLabel>
      {kontrol ? <span className="text-xs font-semibold text-warn">{t.fis.kontrolEt}</span> : null}
    </div>
  );
}

export function KayitEkleSayfasi({ open, close, params }: SheetScreenProps) {
  const bugun = useBugun();
  const islemler = useEtkinIslemler();
  const id = typeof params.id === "string" ? params.id : null;
  const onceki = useVeri((s) => (id ? s.islemler.find((x) => x.id === id) : undefined));
  const hazir = useVeri((s) => s.durum === "hazir");
  const duzenleme = onceki !== undefined;
  const paramTarih = parseLocalDate(params.date);

  const [tur, setTur] = useState<TxType>(onceki?.type ?? "expense");
  const [tutarMetni, setTutarMetni] = useState(onceki ? formatAmountInput(onceki.amount) : "");
  const [kategori, setKategori] = useState<CategoryKey | null>(onceki?.category ?? null);
  const [tarih, setTarih] = useState<LocalDate>(onceki?.date ?? paramTarih ?? bugun);
  const [not, setNot] = useState(onceki?.description ?? "");
  const [taksit, setTaksit] = useState(1);
  const [hizli, setHizli] = useState("");
  const [tarihAcik, setTarihAcik] = useState(false);
  const [kategoriAcik, setKategoriAcik] = useState(false);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState<{ tutar?: string; kategori?: string }>({});
  const [isaret, setIsaret] = useState<Pick<FisFormu, "tarihOkunamadi" | "tutarOkunamadi" | "dusukGuven"> | null>(null);

  useAutoTour("ilk-kayit", ILK_KAYIT_TURU, { when: open && !duzenleme });

  /* Düzenlenecek kayıt yoksa (silinmiş ya da yanlış kimlik) sayfa kendini kapatır. */
  useEffect(() => {
    if (id && hazir && !onceki && !kaydediyor) {
      toast.error(t.form.bulunamadi);
      close();
    }
  }, [id, hazir, onceki, kaydediyor, close]);

  const kurus = (() => {
    const p = parseAmount(tutarMetni);
    return p.ok ? p.kurus : null;
  })();
  const kilitliTur = onceki !== undefined && (onceki.installmentGroupId !== undefined || onceki.recurringId !== undefined);
  const oneri = onerilenKategoriler(islemler, tur);
  const chipler = kategori && !oneri.includes(kategori) ? [kategori, ...oneri.slice(0, -1)] : oneri;
  const onizleme = !duzenleme && tur === "expense" ? taksitOnizle(kurus, taksit, tarih) : null;
  const planli = tur === "expense" && isPlannedAtEntry(tarih, bugun);
  const { bugun: bg, dun } = hizliTarihler(bugun);

  const turSec = (yeni: TxType) => {
    setTur(yeni);
    setKategori((k) => turunKategorisi(k, yeni));
    if (yeni === "income") setTaksit(1);
    setHata((h) => ({ ...h, kategori: undefined }));
  };

  const hizliYaz = (v: string) => {
    setHizli(v);
    if (!v.trim()) return;
    const p = parseQuickEntry(v, bugun);
    if (p.amount !== null) setTutarMetni(formatAmountInput(p.amount));
    if (p.category) {
      setTur(p.type);
      setKategori(p.category);
      if (p.type === "income") setTaksit(1);
    }
    if (p.description) setNot(p.description);
    if (p.dateHint) setTarih(p.date);
    setHata({});
  };

  const fisUygula = (f: FisFormu) => {
    setTur("expense");
    setTutarMetni(f.tutarMetni);
    if (f.not) setNot(f.not);
    setTarih(f.tarih);
    setKategori(f.kategori);
    setIsaret({ tarihOkunamadi: f.tarihOkunamadi, tutarOkunamadi: f.tutarOkunamadi, dusukGuven: f.dusukGuven });
    setHata({});
  };

  const kaydet = async () => {
    if (kaydediyor) return;
    const form: FormDurumu = { tur, tutarMetni, kategori, tarih, not, taksit };
    const r = formuKaydaCevir(form, {
      bugun,
      userId: useOturum.getState().kullanici?.uid ?? "",
      now: Date.now(),
      idUret: uuid,
      ...(onceki ? { onceki } : {}),
    });
    if (!r.ok) {
      haptic.warning();
      setHata(
        r.hata === "tutar" ? { tutar: amountErrorText(r.neden ?? "invalid") } : r.hata === "taksitTutar" ? { tutar: t.form.taksitTutarKucuk } : { kategori: t.form.kategoriZorunlu },
      );
      return;
    }
    setHata({});
    setKaydediyor(true);
    try {
      const v = useVeri.getState();
      if (r.tur === "yeni") await v.islemEkle(r.islem);
      else if (r.tur === "taksit") await v.islemleriEkle(r.liste);
      else await v.islemGuncelle(r.islem);
      haptic.success();
      toast(r.tur === "guncelle" ? t.form.guncellendi : r.tur === "taksit" ? t.form.taksitEklendi(r.liste.length) : t.form.eklendi);
      close();
    } catch (e) {
      haptic.error();
      toast.error(hataMesaji(e) || t.form.kaydedilemedi);
      setKaydediyor(false);
    }
  };

  const ozetEtiket = hizli.trim() ? parseQuickEntry(hizli, bugun) : null;

  return (
    <>
      <Sheet
        open={open}
        onClose={close}
        size="full"
        title={duzenleme ? t.form.duzenleBaslik : t.form.yeniBaslik}
        footer={
          <div data-tour="kayit-kaydet">
            <Button full size="lg" loading={kaydediyor} onClick={() => void kaydet()}>
              {duzenleme ? t.form.guncelle : t.form.kaydet}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <Segmented<TxType>
            full
            label={t.form.tur}
            value={tur}
            onChange={turSec}
            options={kilitliTur ? [{ value: tur, label: tur === "income" ? t.form.gelir : t.form.gider }] : [{ value: "expense", label: t.form.gider }, { value: "income", label: t.form.gelir }]}
          />

          {!duzenleme ? (
            <div data-tour="kayit-hizli" className="flex flex-col gap-2">
              <Field label={t.form.hizli} value={hizli} onChange={hizliYaz} placeholder={t.form.hizliPlaceholder} hint={ozetEtiket ? undefined : t.form.hizliIpucu} maxLength={ACIKLAMA_SINIRI} />
              {ozetEtiket && ozetEtiket.amount !== null ? (
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-text-2" aria-live="polite">
                  <Amount value={ozetEtiket.amount} kind={ozetEtiket.type} size="sm" />
                  <span>{ozetEtiket.category ? categoryLabel(ozetEtiket.category) : t.form.kategoriSec}</span>
                  <span>{ozetEtiket.dateHint ? t.form.onizleme[({ today: "bugun", yesterday: "dun", tomorrow: "yarin" } as const)[ozetEtiket.dateHint]] : formatDateTr(ozetEtiket.date, "dayMonth")}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {!duzenleme ? <FisBolumu bugun={bugun} onSonuc={fisUygula} kapat={close} /> : null}

          <div data-tour="kayit-tutar" className="flex flex-col gap-3">
            <div className="flex flex-col items-center gap-1">
              <Etiket ad={t.form.tutar} kontrol={Boolean(isaret?.tutarOkunamadi || isaret?.dusukGuven)} />
              <p className="num text-center text-4xl font-medium text-text" aria-live="polite">
                ₺{keypadDisplay(tutarMetni)}
              </p>
              {hata.tutar ? (
                <p role="alert" className="text-sm font-medium text-warn">
                  {hata.tutar}
                </p>
              ) : null}
            </div>
            <Keypad value={tutarMetni} onChange={(v) => { setTutarMetni(v); setHata((h) => ({ ...h, tutar: undefined })); }} />
          </div>

          <div data-tour="kayit-kategori" className="flex flex-col gap-2">
            <Etiket ad={t.form.kategori} kontrol={Boolean(isaret?.dusukGuven)} />
            <div className="scroll-x flex gap-2 pb-1" data-swipe-lock>
              {chipler.map((k) => (
                <Chip key={k} selected={kategori === k} icon={<KategoriIkonu kategori={k} size={16} />} onClick={() => { setKategori(k); setHata((h) => ({ ...h, kategori: undefined })); }}>
                  {categoryLabel(k)}
                </Chip>
              ))}
              <Chip onClick={() => setKategoriAcik(true)}>{t.form.tumu}</Chip>
            </div>
            {hata.kategori ? (
              <p role="alert" className="text-sm font-medium text-warn">
                {hata.kategori}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Etiket ad={t.form.tarih} kontrol={Boolean(isaret?.tarihOkunamadi)} />
            <div className="scroll-x flex gap-2 pb-1" data-swipe-lock>
              <Chip selected={tarih === bg} onClick={() => setTarih(bg)}>
                {tr.ortak.bugun}
              </Chip>
              <Chip selected={tarih === dun} onClick={() => setTarih(dun)}>
                {tr.ortak.dun}
              </Chip>
              <Chip selected={tarih !== bg && tarih !== dun} icon={<CalendarDays size={16} aria-hidden="true" />} onClick={() => setTarihAcik(true)}>
                {tarih !== bg && tarih !== dun ? formatDateTr(tarih, "long") : t.form.tarihSec}
              </Chip>
            </div>
            {planli ? <p className="text-sm text-text-2">{t.form.planliNot}</p> : null}
          </div>

          {tur === "expense" && !duzenleme ? (
            <div className="flex flex-col gap-2">
              <Etiket ad={t.form.taksit} />
                  <div className="flex items-center gap-3">
                    <IconButton label={t.form.taksitAzalt} variant="tinted" onClick={() => { haptic.selection(); setTaksit((n) => Math.max(1, n - 1)); }}>
                      <Minus size={20} />
                    </IconButton>
                    <span className="num min-w-24 text-center text-base font-medium text-text" aria-live="polite">
                      {taksit === 1 ? t.form.taksitPesin : t.form.taksitSayisi(taksit)}
                    </span>
                    <IconButton label={t.form.taksitArtir} variant="tinted" onClick={() => { haptic.selection(); setTaksit((n) => Math.min(36, n + 1)); }}>
                      <Plus size={20} />
                    </IconButton>
                  </div>
                  {onizleme ? (
                    <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-text-2">
                      {onizleme.esit ? (
                        <>
                          <span>{t.form.taksitOnizleme.x(onizleme.adet)}</span>
                          <Amount value={onizleme.ilkTutar} size="sm" decimals />
                        </>
                      ) : (
                        <span>{t.form.taksitOnizleme.ilkBuyuk(onizleme.adet)}</span>
                      )}
                      <span>{t.form.taksitOnizleme.son(onizleme.sonAy, onizleme.sonYil)}</span>
                    </p>
                  ) : null}
            </div>
          ) : null}

          <Field label={t.form.not} value={not} onChange={setNot} placeholder={t.form.notPlaceholder} maxLength={ACIKLAMA_SINIRI} />
        </div>
      </Sheet>

      <DatePickSheet open={tarihAcik} onClose={() => setTarihAcik(false)} value={tarih} onChange={(d) => { setTarih(d); setTarihAcik(false); }} today={bugun} title={t.form.tarihSec} />

      <Sheet open={kategoriAcik} onClose={() => setKategoriAcik(false)} size="half" title={t.form.tumKategoriler}>
        <div className="flex flex-wrap gap-2 pb-2">
          {CATEGORIES.filter((k) => k.type === tur).map((k) => (
            <Chip
              key={k.key}
              selected={kategori === k.key}
              icon={<KategoriIkonu kategori={k.key} size={16} />}
              onClick={() => {
                setKategori(k.key);
                setHata((h) => ({ ...h, kategori: undefined }));
                setKategoriAcik(false);
              }}
            >
              {categoryLabel(k.key)}
            </Chip>
          ))}
        </div>
      </Sheet>
    </>
  );
}


