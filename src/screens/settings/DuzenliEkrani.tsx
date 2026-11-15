/* Düzenli ödemeler: liste, ekle, düzenle, sil, pasife al. */
import { Plus } from "lucide-react";
import { categoryLabel, formatDateTr, stripAutoSuffix, type Recurring } from "@/core";
import { hataMesaji, useVeri } from "@/data";
import { tr } from "@/metin";
import { Screen, sheets } from "@/shell";
import { Amount, Button, Card, EmptyState, IconButton, ListRow, SwipeRow, confirm, toast } from "@/ui";

export function DuzenliEkrani() {
  const t = tr.ayarlar.duzenli;
  const liste = useVeri((s) => s.duzenliler);

  async function sil(r: Recurring) {
    if (!(await confirm({ title: t.silOnayBaslik, text: t.silOnay(r.description), confirmLabel: t.sil, danger: true }))) return;
    try {
      await useVeri.getState().duzenliSil(r.id);
      toast(t.silindi);
    } catch (e) {
      toast.error(hataMesaji(e));
    }
  }

  async function pasifToggle(r: Recurring) {
    try {
      const { id, userId: _u, ...gerisi } = r;
      void _u;
      await useVeri.getState().duzenliKaydet({ ...gerisi, id, isActive: !r.isActive });
      toast(r.isActive ? t.pasifeAlindi : t.aktifEdildi);
    } catch (e) {
      toast.error(hataMesaji(e));
    }
  }

  return (
    <Screen
      title={t.baslik}
      right={
        <IconButton label={t.yeni} variant="tinted" onClick={() => sheets.open("duzenli-form")}>
          <Plus size={22} aria-hidden="true" />
        </IconButton>
      }
    >
      {liste.length === 0 ? (
        <EmptyState mood="selam" title={t.bos.baslik} text={t.bos.metin} action={<Button onClick={() => sheets.open("duzenli-form")}>{t.yeni}</Button>} />
      ) : (
        liste.map((r) => (
          <Card key={r.id} variant="solid" pad="none" className="overflow-hidden">
            <SwipeRow onDelete={() => void sil(r)} onEdit={() => sheets.open("duzenli-form", { id: r.id })}>
              <ListRow
                title={stripAutoSuffix(r.description)}
                subtitle={`${t.sikliklar[r.frequency]}, ${categoryLabel(r.category)}. ${r.isActive ? t.sonraki(formatDateTr(r.nextDueDate, "long")) : t.pasif}`}
                right={<Amount value={r.amount} kind={r.type === "income" ? "income" : "expense"} size="sm" />}
                onClick={() => sheets.open("duzenli-form", { id: r.id })}
                className={r.isActive ? "" : "opacity-60"}
              />
            </SwipeRow>
            <div className="flex justify-end border-t border-line px-2 py-1">
              <Button variant="text" size="sm" onClick={() => void pasifToggle(r)}>
                {r.isActive ? t.pasifeAl : t.aktifEt}
              </Button>
            </div>
          </Card>
        ))
      )}
    </Screen>
  );
}
