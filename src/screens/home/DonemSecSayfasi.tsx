/* Ortak alt sayfa "donem-sec" (P5): kayıtlı dönemler, aktif işareti, görüntülenen dönem. Seçim dönemi AKTİF ETMEZ:
   Özet o dönemin özetini gösterir. Aktif etmek ve düzenlemek Ayarlar > Dönemler (P8, ekran adı "donemler"). */
import { Check } from "lucide-react";
import { formatDateTr } from "@/core";
import { useAktifDonem, useDonemOzetleri } from "@/data";
import { tr } from "@/metin";
import { nav, type SheetScreenProps } from "@/shell";
import { Amount, Button, EmptyState, Sheet, cn, haptic } from "@/ui";
import { useGorunenDonem } from "./ortak";

export function DonemSecSayfasi({ open, close }: SheetScreenProps) {
  const ozetler = useDonemOzetleri();
  const aktif = useAktifDonem();
  const seciliId = useGorunenDonem((s) => s.id);
  const sec = useGorunenDonem((s) => s.sec);
  const gorunen = seciliId ?? aktif?.id ?? null;

  return (
    <Sheet
      open={open}
      onClose={close}
      title={tr.ozet.donemler}
      size={ozetler.length > 4 ? "half" : "auto"}
      expandable={ozetler.length > 4}
      footer={
        <Button
          variant="secondary"
          full
          onClick={() => {
            close();
            nav.push("donemler");
          }}
        >
          {tr.ozet.donemleriYonet}
        </Button>
      }
    >
      {ozetler.length ? (
        <ul className="flex flex-col gap-2 pb-2">
          {ozetler.map((o) => {
            const aktifMi = o.periodId === aktif?.id;
            const secili = o.periodId === gorunen;
            return (
              <li key={o.periodId}>
                <button
                  type="button"
                  aria-pressed={secili}
                  onClick={() => {
                    haptic.selection();
                    sec(aktifMi ? null : o.periodId);
                    close();
                  }}
                  className={cn(
                    "pressable flex min-h-14 w-full items-center gap-3 rounded-card border px-4 py-2 text-left",
                    secili ? "border-accent bg-surface-2" : "border-line bg-surface",
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
                      {o.name}
                      {aktifMi ? <span className="rounded-pill bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">{tr.ozet.aktif}</span> : null}
                    </span>
                    <span className="text-xs text-text-3">{tr.ozet.donemAraligi(formatDateTr(o.start, "short"), formatDateTr(o.end, "short"))}</span>
                  </span>
                  <Amount value={o.balance} size="sm" decimals={false} />
                  <span className="grid h-6 w-6 shrink-0 place-items-center text-accent">{secili ? <Check size={20} aria-hidden="true" /> : null}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState surface="none" mood="dusunuyor" size={72} title={tr.ozet.donemListesiBos} />
      )}
    </Sheet>
  );
}
