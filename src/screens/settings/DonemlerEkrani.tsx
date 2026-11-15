/* Dönemler: liste, aktif et, düzenle, sil, yeni. */
import { Pencil, Plus, Trash2 } from "lucide-react";
import { daysInclusive, formatDateTr, type Period } from "@/core";
import { hataMesaji, useAktifDonem, useVeri } from "@/data";
import { tr } from "@/metin";
import { Screen, sheets } from "@/shell";
import { Amount, Button, Card, EmptyState, IconButton, confirm, haptic, toast } from "@/ui";

export function DonemlerEkrani() {
  const t = tr.ayarlar.donemler;
  const donemler = useVeri((s) => s.donemler);
  const aktif = useAktifDonem();

  async function aktifEt(p: Period) {
    if (!(await confirm({ title: t.aktifEt, text: t.aktifEtOnay(p.name), confirmLabel: t.aktifEt }))) return;
    try {
      await useVeri.getState().donemAktifEt(p.id);
      haptic.success();
      toast(t.aktifEdildi);
    } catch (e) {
      toast.error(hataMesaji(e));
    }
  }

  async function sil(p: Period) {
    const buAktif = aktif?.id === p.id;
    const ok = await confirm({ title: t.silOnayBaslik, text: buAktif ? t.aktifSilOnay(p.name) : t.silOnay(p.name), confirmLabel: t.sil, danger: true });
    if (!ok) return;
    try {
      await useVeri.getState().donemSil(p.id);
      toast(t.silindi);
    } catch (e) {
      toast.error(hataMesaji(e));
    }
  }

  return (
    <Screen
      title={t.baslik}
      right={
        <IconButton label={t.yeni} variant="tinted" onClick={() => sheets.open("donem-form")}>
          <Plus size={22} aria-hidden="true" />
        </IconButton>
      }
    >
      {donemler.length === 0 ? (
        <EmptyState mood="selam" title={t.bos.baslik} text={t.bos.metin} action={<Button onClick={() => sheets.open("donem-form")}>{t.yeni}</Button>} />
      ) : (
        donemler.map((p) => {
          const buAktif = aktif?.id === p.id;
          return (
            <Card key={p.id} variant="solid" className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="text-base font-semibold text-text">{p.name}</span>
                  <span className="text-sm text-text-3">{t.aralik(formatDateTr(p.start, "short"), formatDateTr(p.end, "short"), daysInclusive(p.start, p.end))}</span>
                </div>
                {buAktif ? <span className="shrink-0 rounded-pill bg-accent px-3 py-1 text-xs font-semibold text-on-accent">{t.aktif}</span> : null}
              </div>
              <div className="flex gap-6">
                <div className="flex flex-col">
                  <span className="text-xs text-text-3">{t.gelir}</span>
                  <Amount value={p.plannedIncome} size="sm" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-text-3">{t.gider}</span>
                  <Amount value={p.fixedExpenses} size="sm" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!buAktif ? (
                  <Button size="sm" variant="secondary" onClick={() => void aktifEt(p)}>
                    {t.aktifEt}
                  </Button>
                ) : null}
                <div className="ml-auto flex gap-1">
                  <IconButton label={t.duzenle} variant="tinted" onClick={() => sheets.open("donem-form", { id: p.id })}>
                    <Pencil size={18} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={t.sil} variant="tinted" onClick={() => void sil(p)}>
                    <Trash2 size={18} aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
