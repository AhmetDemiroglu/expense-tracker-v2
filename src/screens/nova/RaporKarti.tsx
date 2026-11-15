/* Rapor kartı: dönem durumu, tespitler (en fazla 4), öneriler (en fazla 3), Nova notu. Sayılar çekirdekten (kategori dağılımı). */
import { RefreshCw } from "lucide-react";
import { categoryLabel } from "@/core";
import { tr } from "@/metin";
import { useKategoriDagilimi } from "@/data";
import type { RaporYaniti } from "@/services/ai";
import { Amount, Button, NovaAvatar, ProgressBar, Section, SkeletonRows, type NovaMood } from "@/ui";
import { Bloklar } from "./Bloklar";
import { bicimCoz } from "./bicimleyici";
import type { RaporHatasi } from "./durum";
import { olasiTasarruf } from "./tasarruf";

const RAPOR_RUHU: Record<RaporYaniti["durum"]["ruhHali"], NovaMood> = { positive: "mutlu", neutral: "selam", critical: "uyari" };

export interface RaporKartiProps {
  rapor: RaporYaniti | null;
  yukleniyor: boolean;
  hata: RaporHatasi | null;
  eski: boolean;
  onYenile: () => void;
}

export function RaporKarti({ rapor, yukleniyor, hata, eski, onYenile }: RaporKartiProps) {
  const dagilim = useKategoriDagilimi();
  const r = tr.nova.rapor;
  return (
    <Section
      title={r.baslik}
      data-tour="nova-rapor"
      right={
        rapor || hata ? (
          <Button variant="text" size="sm" icon={<RefreshCw size={16} aria-hidden="true" />} onClick={onYenile} disabled={yukleniyor}>
            {r.yenile}
          </Button>
        ) : null
      }
    >
      {yukleniyor ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label={r.yenileniyor}>
          <div className="flex items-center gap-3">
            <NovaAvatar mood="analiz" size={36} />
            <p className="text-sm font-medium text-text-2">{r.yenileniyor}</p>
          </div>
          <SkeletonRows count={3} />
        </div>
      ) : hata ? (
        <div className="flex flex-col gap-3" role="alert">
          <div className="flex items-center gap-3">
            <NovaAvatar mood={hata.kod === "QUOTA_EXCEEDED" ? "uyari" : "uzgun"} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text">{hata.kod === "QUOTA_EXCEEDED" ? tr.nova.hata.kotaBaslik : tr.nova.hata.raporBaslik}</p>
              <p className="text-sm text-text-2">{hata.kod === "QUOTA_EXCEEDED" ? tr.nova.hata.kotaSifirlanma : hata.mesaj}</p>
            </div>
          </div>
        </div>
      ) : rapor ? (
        <div className="flex flex-col gap-4">
          {eski ? (
            <Button variant="secondary" size="sm" full icon={<RefreshCw size={16} aria-hidden="true" />} onClick={onYenile}>
              {r.degisti}
            </Button>
          ) : null}
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
              <ul className="selectable flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-text list-disc">
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
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-2">{r.bos}</p>
          <Button full onClick={onYenile}>
            {r.hazirla}
          </Button>
        </div>
      )}
    </Section>
  );
}
