/* Dönem bittiğinde "Yeni dönemi başlat" onayı. Öneri çekirdekten (suggestNextPeriod, maaş günüyle), doğrulama çekirdekten (validatePeriod).
   Onayla: donemKaydet + donemAktifEt (P4). Otomatik açılmaz, kullanıcı onaylar. */
import { useMemo, useState } from "react";
import { formatDateTr, suggestNextPeriod, validatePeriod } from "@/core";
import { hataMesaji, useAktifDonem, useBugun, useVeri } from "@/data";
import { tr } from "@/metin";
import { Amount, Button, ListRow, Nova, Sheet, haptic, toast } from "@/ui";
import { useGorunenDonem } from "./ortak";

export function YeniDonemSayfasi({ open, onClose }: { open: boolean; onClose: () => void }) {
  const bugun = useBugun();
  const aktif = useAktifDonem();
  const ayarlar = useVeri((s) => s.ayarlar);
  const donemler = useVeri((s) => s.donemler);
  const [mesgul, setMesgul] = useState(false);

  const oneri = useMemo(() => suggestNextPeriod({ today: bugun, payday: ayarlar?.payday, previous: aktif }), [bugun, ayarlar?.payday, aktif]);
  const hatalar = useMemo(() => validatePeriod(oneri, donemler), [oneri, donemler]);
  const cakisma = hatalar.includes("overlap");

  const baslat = async () => {
    if (mesgul || hatalar.length) return;
    setMesgul(true);
    try {
      const p = await useVeri.getState().donemKaydet(oneri);
      await useVeri.getState().donemAktifEt(p.id);
      useGorunenDonem.getState().sec(null);
      haptic.success();
      toast(tr.ozet.baslatildi);
      onClose();
    } catch (e) {
      haptic.error();
      toast.error(hataMesaji(e));
    } finally {
      setMesgul(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={tr.ozet.yeniDonem}
      footer={
        <Button full loading={mesgul} disabled={hatalar.length > 0} onClick={() => void baslat()}>
          {tr.ozet.baslat}
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-center gap-3 rounded-card bg-surface-2 p-3">
          <Nova mood={cakisma ? "uyari" : "basari"} size={56} />
          <p className="text-sm text-text-2">{cakisma ? tr.ozet.cakisma : tr.ozet.yeniDonemMetin}</p>
        </div>
        <div className="flex flex-col rounded-card border border-line">
          <ListRow title={tr.ozet.donemAdi} right={<span className="text-sm font-medium text-text">{oneri.name}</span>} />
          <ListRow
            title={tr.ozet.tarihAraligi}
            right={<span className="text-sm text-text">{tr.ozet.donemAraligi(formatDateTr(oneri.start, "short"), formatDateTr(oneri.end, "short"))}</span>}
          />
          <ListRow title={tr.ozet.planlananGelir} right={<Amount value={oneri.plannedIncome} kind="income" size="sm" />} />
          <ListRow title={tr.ozet.sabitGiderler} right={<Amount value={oneri.fixedExpenses} kind="expense" size="sm" />} />
        </div>
      </div>
    </Sheet>
  );
}
