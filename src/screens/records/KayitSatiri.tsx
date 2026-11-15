import { categoryLabel, isAutoTransaction, isPlannedExpense, type Transaction } from "@/core";
import { tr } from "@/metin";
import { sheets } from "@/shell";
import { Amount, ListRow, SwipeRow } from "@/ui";
import { KategoriIkonu } from "../entry/ikonlar";
import { silmeyiBaslat } from "../entry/silme";
import { baslikMetni } from "./grup";

const ETIKET = "rounded-pill bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-2";

export function KayitSatiri({ t }: { t: Transaction }) {
  const e = tr.kayitlar.etiket;
  const taksit = t.installmentIndex !== undefined && (t.installmentCount ?? 0) > 1;
  return (
    <SwipeRow onDelete={() => void silmeyiBaslat(t.id)} onEdit={() => sheets.open("kayit-ekle", { id: t.id })}>
      <ListRow
        icon={<KategoriIkonu kategori={t.category} />}
        title={baslikMetni(t)}
        subtitle={
          <span className="flex flex-wrap items-center gap-1">
            <span>{categoryLabel(t.category)}</span>
            {taksit ? <span className={ETIKET}>{e.taksit(t.installmentIndex ?? 1, t.installmentCount ?? 1)}</span> : null}
            {isPlannedExpense(t) && !isAutoTransaction(t) && !taksit ? <span className={ETIKET}>{e.planli}</span> : null}
            {isAutoTransaction(t) ? <span className={ETIKET}>{e.otomatik}</span> : null}
          </span>
        }
        right={<Amount value={t.amount} kind={t.type} size="sm" />}
        onClick={() => sheets.open("kayit-ekle", { id: t.id })}
      />
    </SwipeRow>
  );
}
