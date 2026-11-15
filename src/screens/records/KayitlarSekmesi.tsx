/* Kayıtlar (kök sekme): dönem özet şeridi, tür süzgeci, arama, dönem ve gün gruplu liste. */
import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { formatDateTr, type LocalDate } from "@/core";
import { hataMesaji, useBaglanti, useBugun, useDonemOzetleri, useEtkinIslemler, useVeri } from "@/data";
import { tr } from "@/metin";
import { TabPage, sheets, type TabProps } from "@/shell";
import { Amount, Button, Card, EmptyState, Field, IconButton, PullToRefresh, ScreenHeader, Segmented, SkeletonRows, TourInfoButton, cn, toast } from "@/ui";
import { DONEMSIZ, grupla, gunEtiketi, pencele, type DonemGrubu, type TurSuzgeci } from "./grup";
import { KayitSatiri } from "./KayitSatiri";
import { KAYITLAR_TURU } from "./tur";

const t = tr.kayitlar;
const SAYFA = 60;

function GrupKarti({ g, bugun, acik, ac, limit, daha }: { g: DonemGrubu; bugun: LocalDate; acik: boolean; ac: () => void; limit: number; daha: () => void }) {
  const ad = g.donemId === DONEMSIZ ? t.donemDisi : g.ad;
  return (
    <Card variant="solid" pad="none" className="shrink-0">
      <button type="button" onClick={ac} aria-expanded={acik} className="pressable flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-semibold text-text">{ad}</span>
          <span className="text-xs text-text-3">
            {g.baslangic && g.bitis ? `${formatDateTr(g.baslangic, "short")} - ${formatDateTr(g.bitis, "short")}, ` : ""}
            {t.donemSatiri(g.adet)}
          </span>
        </span>
        <Amount value={g.net} size="sm" decimals={false} />
        <ChevronDown size={18} aria-hidden="true" className={cn("shrink-0 text-text-3 transition-transform duration-(--f-dur)", acik && "rotate-180")} />
      </button>
      {acik ? (
        <div className="flex flex-col">
          {pencele(g.gunler, limit).map((gun) => {
            const goster = gun.islemler;
            return (
              <div key={gun.date} className="border-t border-line" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 160px" }}>
                <div className="flex min-h-10 items-center justify-between gap-3 bg-surface-2 px-4 py-1.5">
                  <span className="text-sm font-medium text-text-2">{(() => { const e = gunEtiketi(gun.date, bugun); return e === "bugun" ? tr.ortak.bugun : e === "dun" ? tr.ortak.dun : formatDateTr(gun.date, "long"); })()}</span>
                  <Amount value={gun.net} size="sm" decimals={false} />
                </div>
                {goster.map((x) => (
                  <KayitSatiri key={x.id} t={x} />
                ))}
              </div>
            );
          })}
          {g.adet > limit ? (
            <Button variant="text" full onClick={daha}>
              {t.daha(g.adet - limit)}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export function KayitlarSekmesi({ active }: TabProps) {
  void active;
  const bugun = useBugun();
  const durum = useVeri((s) => s.durum);
  const donemler = useVeri((s) => s.donemler);
  const bozuk = useVeri((s) => s.bozuk.length);
  const onbellek = useVeri((s) => s.onbellektenMi);
  const cevrimici = useBaglanti((s) => s.cevrimici);
  const islemler = useEtkinIslemler();
  const ozetler = useDonemOzetleri();

  const [tur, setTur] = useState<TurSuzgeci>("tumu");
  const [sorgu, setSorgu] = useState("");
  const [aramaAcik, setAramaAcik] = useState(false);
  const [donemId, setDonemId] = useState<string | null>(null);
  const [ac, setAc] = useState<Record<string, boolean>>({});
  const [limitler, setLimitler] = useState<Record<string, number>>({});

  const gruplar = useMemo(() => grupla(islemler, donemler, { sorgu, tur, donemId }), [islemler, donemler, sorgu, tur, donemId]);
  const suzgecli = sorgu.trim() !== "" || tur !== "tumu" || donemId !== null;

  const temizle = () => {
    setSorgu("");
    setTur("tumu");
    setDonemId(null);
  };

  const yenile = async () => {
    try {
      await useVeri.getState().yenile();
    } catch (e) {
      toast.error(hataMesaji(e));
    }
  };

  const header = (
    <ScreenHeader
      title={t.baslik}
      right={
        <div className="flex items-center">
          <IconButton
            label={aramaAcik ? t.aramaKapat : t.aramaAc}
            variant="plain"
            onClick={() => {
              if (aramaAcik) setSorgu("");
              setAramaAcik(!aramaAcik);
            }}
          >
            {aramaAcik ? <X size={22} /> : <Search size={22} />}
          </IconButton>
          <TourInfoButton id="kayitlar" steps={KAYITLAR_TURU} />
        </div>
      }
    />
  );

  const yuk = durum === "yukleniyor" || durum === "bos";
  const hazirBos = durum === "hazir" && islemler.length === 0;

  return (
    <TabPage header={header}>
      {!yuk && durum !== "hata" && !hazirBos ? (
        <>
          {ozetler.length > 0 ? (
            <div data-tour="kayit-seridi" className="shrink-0">
              <div className="scroll-x -mx-(--page-x) flex gap-2 px-(--page-x) py-0.5" data-swipe-lock>
                {ozetler.map((o) => (
                  <Card
                    key={o.periodId}
                    variant="solid"
                    pad="none"
                    onClick={() => setDonemId(donemId === o.periodId ? null : o.periodId)}
                    aria-label={t.donemKarti.sec(o.name)}
                    className={cn("flex px-3 py-2 w-68 shrink-0 flex-col gap-0.5", donemId === o.periodId && "ring-2 ring-accent")}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="whitespace-nowrap text-sm font-semibold text-text">{o.name}</span>
                      <span className="whitespace-nowrap text-xs text-text-3">{o.savingsRate !== null && o.savingsRate > 0 ? t.donemKarti.tasarruf(o.savingsRate) : t.donemKarti.kayit(o.txCount)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <Amount value={o.totalIncome} kind="income" size="sm" decimals={false} />
                      <Amount value={o.totalExpense} kind="expense" size="sm" decimals={false} />
                      <span className="sr-only">{t.donemKarti.net}</span>
                      <Amount value={o.balance} size="sm" decimals={false} className="font-semibold" />
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
          <div data-tour="kayit-suzgec" className="flex shrink-0 flex-col gap-2">
            <Segmented<TurSuzgeci>
              full
              label={t.suzgec.grup}
              value={tur}
              onChange={setTur}
              options={[{ value: "tumu", label: t.suzgec.tumu }, { value: "gider", label: t.suzgec.gider }, { value: "gelir", label: t.suzgec.gelir }]}
            />
            {aramaAcik ? <Field type="search" value={sorgu} onChange={setSorgu} placeholder={t.aramaPlaceholder} autoFocus /> : null}
          </div>
          {!cevrimici || onbellek ? <p className="shrink-0 rounded-control bg-surface-2 px-3 py-2 text-sm text-text-2">{t.cevrimdisi}</p> : null}
          {bozuk > 0 ? <p className="shrink-0 rounded-control bg-surface-2 px-3 py-2 text-sm text-text-2">{t.bozuk(bozuk)}</p> : null}
        </>
      ) : null}

      <div data-tour="kayit-liste" className="flex min-h-0 flex-1 flex-col">
        {yuk ? (
          <Card variant="solid" pad="sm" className="shrink-0">
            <SkeletonRows count={6} />
          </Card>
        ) : durum === "hata" ? (
          <EmptyState mood="uzgun" title={t.hata.baslik} text={t.hata.metin} action={<Button onClick={() => void yenile()}>{tr.ortak.tekrarDene}</Button>} />
        ) : hazirBos ? (
          <EmptyState mood="selam" title={t.bos.baslik} text={t.bos.metin} action={<Button onClick={() => sheets.open("kayit-ekle")}>{t.bos.ekle}</Button>} />
        ) : gruplar.length === 0 ? (
          <EmptyState mood="dusunuyor" title={t.sonucYok.baslik} text={t.sonucYok.metin} action={suzgecli ? <Button variant="secondary" onClick={temizle}>{t.sonucYok.temizle}</Button> : undefined} />
        ) : (
          <PullToRefresh onRefresh={yenile} className="min-h-0 flex-1" contentClassName="flex flex-col gap-3">
            {gruplar.map((g, i) => (
              <GrupKarti
                key={g.donemId}
                g={g}
                bugun={bugun}
                acik={ac[g.donemId] ?? (i === 0 || suzgecli)}
                ac={() => setAc((a) => ({ ...a, [g.donemId]: !(a[g.donemId] ?? (i === 0 || suzgecli)) }))}
                limit={limitler[g.donemId] ?? SAYFA}
                daha={() => setLimitler((l) => ({ ...l, [g.donemId]: (l[g.donemId] ?? SAYFA) + SAYFA }))}
              />
            ))}
          </PullToRefresh>
        )}
      </div>
    </TabPage>
  );
}
