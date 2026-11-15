/* Rapor iki parçadır: ekranda tek satırlık şerit (sohbete yer kalsın), ayrıntı alt sayfada.
   Sayılar çekirdekten (kategori dağılımı), model yalnız yüzdeyi önerir. */
import { AlertTriangle, ChevronRight, RefreshCw } from "lucide-react";
import { categoryLabel } from "@/core";
import { tr } from "@/metin";
import { useKategoriDagilimi } from "@/data";
import type { RaporYaniti } from "@/services/ai";
import { Amount, Button, Card, NovaAvatar, ProgressBar, Sheet, Spinner, type NovaMood } from "@/ui";
import { Bloklar } from "./Bloklar";
import { bicimCoz } from "./bicimleyici";
import type { RaporHatasi } from "./durum";
import { olasiTasarruf } from "./tasarruf";

const RAPOR_RUHU: Record<RaporYaniti["durum"]["ruhHali"], NovaMood> = { positive: "mutlu", neutral: "selam", critical: "uyari" };

export interface RaporSeridiProps {
  rapor: RaporYaniti | null;
  yukleniyor: boolean;
  hata: RaporHatasi | null;
  eski: boolean;
  onYenile: () => void;
  onAc: () => void;
}

/** Sohbetin üstündeki tek satır: durum etiketi, sayılar ve ayrıntı oku. */
export function RaporSeridi({ rapor, yukleniyor, hata, eski, onYenile, onAc }: RaporSeridiProps) {
  const r = tr.nova.rapor;
  if (yukleniyor) {
    return (
      <Card variant="solid" pad="none" className="shrink-0">
        <div className="flex min-h-14 items-center gap-3 px-3" aria-busy="true">
          <NovaAvatar mood="analiz" size={28} />
          <p className="min-w-0 flex-1 text-sm font-medium text-text-2">{r.yenileniyor}</p>
          <Spinner size={18} />
        </div>
      </Card>
    );
  }
  if (hata) {
    const kota = hata.kod === "QUOTA_EXCEEDED";
    return (
      <Card variant="solid" pad="none" className="shrink-0">
        <div className="flex min-h-14 flex-wrap items-center gap-2 px-3 py-2" role="alert">
          <NovaAvatar mood={kota ? "uyari" : "uzgun"} size={28} />
          <p className="min-w-0 flex-1 text-sm text-text-2">{kota ? tr.nova.hata.kotaSifirlanma : tr.nova.hata.raporBaslik}</p>
          {kota ? null : (
            <Button variant="text" size="sm" onClick={onYenile}>
              {tr.nova.hata.tekrar}
            </Button>
          )}
        </div>
      </Card>
    );
  }
  if (!rapor) {
    return (
      <Card variant="solid" pad="none" className="shrink-0">
        <button type="button" onClick={onYenile} className="pressable flex min-h-14 w-full items-center gap-3 px-3 text-left">
          <NovaAvatar mood="analiz" size={28} />
          <span className="min-w-0 flex-1 text-sm font-semibold text-text">{r.hazirla}</span>
          <ChevronRight size={18} className="shrink-0 text-text-3" aria-hidden="true" />
        </button>
      </Card>
    );
  }
  return (
    <Card variant="solid" pad="none" className="shrink-0" data-tour="nova-rapor">
      <button type="button" onClick={onAc} className="pressable flex min-h-14 w-full items-center gap-3 px-3 text-left">
        <NovaAvatar mood={RAPOR_RUHU[rapor.durum.ruhHali]} size={28} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-text">{r.durumEtiketi[rapor.durum.ruhHali]}</span>
          <span className="text-xs text-text-3">{r.sayilar(Math.min(4, rapor.tespitler.length), Math.min(3, rapor.oneriler.length))}</span>
        </span>
        {eski ? <AlertTriangle size={18} className="shrink-0 text-warn" aria-label={r.degisti} /> : null}
        <ChevronRight size={18} className="shrink-0 text-text-3" aria-hidden="true" />
      </button>
    </Card>
  );
}

export interface RaporSayfasiProps {
  open: boolean;
  onClose: () => void;
  rapor: RaporYaniti | null;
  yukleniyor: boolean;
  eski: boolean;
  onYenile: () => void;
}

/** Ayrıntı: durum, tespitler (en fazla 4), öneriler (en fazla 3), Nova notu. */
export function RaporSayfasi({ open, onClose, rapor, yukleniyor, eski, onYenile }: RaporSayfasiProps) {
  const dagilim = useKategoriDagilimi();
  const r = tr.nova.rapor;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={r.baslik}
      size="half"
      expandable
      footer={
        <Button full variant={eski ? "primary" : "secondary"} loading={yukleniyor} icon={<RefreshCw size={18} aria-hidden="true" />} onClick={onYenile}>
          {eski ? r.degisti : r.yenile}
        </Button>
      }
    >
      {rapor ? (
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex items-start gap-3">
            <NovaAvatar mood={RAPOR_RUHU[rapor.durum.ruhHali]} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-text-3">{r.durum}</p>
              <Bloklar bloklar={bicimCoz(rapor.durum.ozet)} />
            </div>
          </div>
          {rapor.tespitler.length ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-text-3">{r.tespitler}</p>
              <ul className="selectable flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-text">
                {rapor.tespitler.slice(0, 4).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {rapor.oneriler.length ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-text-3">{r.oneriler}</p>
              {rapor.oneriler.slice(0, 3).map((o, i) => {
                const toplam = o.kategori ? (dagilim.find((d) => d.category === o.kategori)?.total ?? 0) : 0;
                const yuzde = o.kesintiYuzdesi;
                const tasarruf = yuzde ? olasiTasarruf(toplam, yuzde) : 0;
                return (
                  <div key={i} className="flex flex-col gap-2 rounded-control bg-surface-2 p-3">
                    <p className="selectable text-sm font-semibold text-text">{o.baslik}</p>
                    <p className="selectable text-sm leading-relaxed text-text-2">{o.aciklama}</p>
                    {o.kategori || yuzde ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-text-2">
                        {o.kategori ? <span className="rounded-pill bg-surface px-3 py-1">{`${r.hedefKategori}: ${categoryLabel(o.kategori)}`}</span> : null}
                        {yuzde ? <span className="rounded-pill bg-surface px-3 py-1">{r.kesinti(yuzde)}</span> : null}
                      </div>
                    ) : null}
                    {yuzde && tasarruf > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-text-3">{r.tasarruf}</span>
                          <Amount value={tasarruf} size="sm" />
                        </div>
                        <ProgressBar value={yuzde / 100} tone="copper" label={r.tasarrufHedef} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {rapor.not ? (
            <div className="rounded-control border border-line px-3 py-2">
              <p className="text-xs font-medium text-text-3">{r.not}</p>
              <p className="selectable text-sm leading-relaxed text-text">{rapor.not}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-text-2">{r.bos}</p>
      )}
    </Sheet>
  );
}
