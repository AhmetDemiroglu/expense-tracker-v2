/* Güne dokununca açılan alt sayfa: o günün limiti, harcanan, kalan (çekirdek dayInfo, P4 useGun), planlı ödemeler,
   günün kayıtları (düzenle: P6'nın "kayit-ekle" sayfası; sil: geri alınabilir) ve "Bu güne ekle". */
import { useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { categoryLabel, formatDateTr, occurrencesBetween, type DayInfo, type LocalDate, type Transaction } from "@/core";
import { hataMesaji, useBugun, useEtkinIslemler, useGun, useVeri } from "@/data";
import { tr } from "@/metin";
import { sheets } from "@/shell";
import { Amount, Button, EmptyState, ListRow, Section, Sheet, SwipeRow, haptic, toast } from "@/ui";
import { IslemSatiri, KategoriIkon } from "../home/parcalar";

function Deger({ etiket, children }: { etiket: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-text-2">{etiket}</span>
      <span className="flex min-h-6 items-center">{children}</span>
    </div>
  );
}

function Ozet({ bilgi }: { bilgi: DayInfo }) {
  const asim = bilgi.remaining !== null && bilgi.remaining < 0;
  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface-2 p-4">
      <div className="grid grid-cols-3 gap-2">
        <Deger etiket={tr.takvim.gunLimiti}>{bilgi.limit !== null ? <Amount value={bilgi.limit} size="md" decimals={false} /> : <span className="text-base text-text-3">-</span>}</Deger>
        <Deger etiket={tr.takvim.harcanan}>
          <Amount value={bilgi.spent} size="md" decimals={false} />
        </Deger>
        <Deger etiket={asim ? tr.takvim.asim : tr.takvim.kalan}>
          {bilgi.remaining !== null ? <Amount value={bilgi.remaining} kind={asim ? "expense" : "neutral"} size="md" decimals={false} /> : <span className="text-base text-text-3">-</span>}
        </Deger>
      </div>
      {bilgi.limit === null ? <p className="text-xs text-text-3">{tr.takvim.limitYok}</p> : bilgi.isFuture ? <p className="text-xs text-text-3">{tr.takvim.gelecekGun}</p> : null}
    </div>
  );
}

export function GunSayfasi({ gun, onClose }: { gun: LocalDate | null; onClose: () => void }) {
  const bugun = useBugun();
  /* Kapanırken içerik kaybolmasın: son gün tutulur. */
  const [son, setSon] = useState<LocalDate>(gun ?? bugun);
  if (gun && gun !== son) setSon(gun);
  const gorunen = gun ?? son;

  const bilgi = useGun(gorunen);
  const islemler = useEtkinIslemler();
  const duzenliler = useVeri((s) => s.duzenliler);
  const gunun = islemler.filter((t) => t.date === gorunen);
  const bekleyen =
    bilgi && bilgi.plannedDue > 0
      ? duzenliler.filter(
          (r) =>
            r.isActive &&
            r.type === "expense" &&
            occurrencesBetween(r, gorunen, gorunen).length > 0 &&
            !islemler.some((t) => t.recurringId === r.id && t.dueDate === gorunen),
        )
      : [];

  const duzenle = (t: Transaction) => sheets.open("kayit-ekle", { id: t.id });
  const sil = async (t: Transaction) => {
    if (t.installmentGroupId) {
      /* Taksit silme seçimi (yalnız bu / kalanlar) kayıt sayfasında. */
      toast(tr.takvim.taksitSil);
      duzenle(t);
      return;
    }
    try {
      await useVeri.getState().islemSil(t.id);
      haptic.medium();
      toast({
        message: tr.takvim.silindi,
        action: {
          label: tr.ortak.geriAl,
          onClick: () => {
            useVeri
              .getState()
              .islemEkle({ ...t })
              .catch((e: unknown) => toast.error(hataMesaji(e)));
          },
        },
      });
    } catch (e) {
      toast.error(hataMesaji(e));
    }
  };

  const durumMetni = bilgi ? tr.takvim.durum[bilgi.status] : undefined;

  return (
    <Sheet
      open={gun !== null}
      onClose={onClose}
      title={formatDateTr(gorunen, "long")}
      subtitle={gorunen === bugun ? `${tr.takvim.bugun} · ${durumMetni ?? ""}` : durumMetni}
      size="half"
      expandable
      footer={
        <Button full icon={<Plus size={18} aria-hidden="true" />} onClick={() => sheets.open("kayit-ekle", { date: gorunen })}>
          {tr.takvim.buGuneEkle}
        </Button>
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        {bilgi ? <Ozet bilgi={bilgi} /> : <p className="rounded-card bg-surface-2 p-4 text-sm text-text-2">{tr.takvim.limitYok}</p>}

        {bekleyen.length ? (
          <Section title={tr.takvim.planliOdemeler} pad="none" className="f-clip">
            {bekleyen.map((r) => (
              <ListRow
                key={r.id}
                icon={<KategoriIkon kategori={r.category} />}
                title={r.description || categoryLabel(r.category)}
                subtitle={
                  <span className="flex items-center gap-1">
                    <CalendarClock size={14} aria-hidden="true" />
                    {tr.takvim.vadesiGelecek}
                  </span>
                }
                right={<Amount value={r.amount} kind="expense" size="sm" />}
              />
            ))}
          </Section>
        ) : null}

        <Section title={tr.takvim.gununKayitlari} pad="none" className="f-clip">
          {gunun.length ? (
            gunun.map((t) => (
              <SwipeRow key={t.id} onEdit={() => duzenle(t)} onDelete={() => void sil(t)} editLabel={tr.ortak.duzenle} deleteLabel={tr.ortak.sil}>
                <div className="bg-surface">
                  <IslemSatiri t={t} bugun={bugun} tarihGoster={false} onClick={() => duzenle(t)} />
                </div>
              </SwipeRow>
            ))
          ) : (
            <EmptyState surface="none" size={64} mood="selam" title={tr.takvim.kayitYok} text={tr.takvim.kayitYokMetin} />
          )}
        </Section>
      </div>
    </Sheet>
  );
}
