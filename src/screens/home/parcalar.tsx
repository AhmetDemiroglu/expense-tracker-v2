/* P5 ortak parçaları (bileşenler): Özet ve Takvim birlikte kullanır. */
import { CircleDashed, WifiOff } from "lucide-react";
import { categoryLabel, type CategoryKey, type LocalDate, type Transaction } from "@/core";
import { Amount, Card, ListRow } from "@/ui";
import { KATEGORI_IKON, gunAdi, islemAdi, islemEtiketleri } from "./ortak";

export function KategoriIkon({ kategori, size = 20 }: { kategori: CategoryKey; size?: number }) {
  const Ikon = KATEGORI_IKON[kategori] ?? CircleDashed;
  return <Ikon size={size} aria-hidden="true" />;
}

export function IslemSatiri({ t, bugun, tarihGoster = true, onClick }: { t: Transaction; bugun: LocalDate; tarihGoster?: boolean; onClick?: () => void }) {
  const alt = [tarihGoster ? gunAdi(t.date, bugun) : null, categoryLabel(t.category), ...islemEtiketleri(t)].filter(Boolean).join(" · ");
  return (
    <ListRow
      icon={<KategoriIkon kategori={t.category} />}
      title={islemAdi(t)}
      subtitle={alt}
      right={<Amount value={t.amount} kind={t.type === "income" ? "income" : "expense"} size="sm" />}
      onClick={onClick}
    />
  );
}

export function CevrimdisiSerit({ metin }: { metin: string }) {
  return (
    <Card variant="solid" pad="sm" className="flex shrink-0 items-center gap-2" role="status">
      <WifiOff size={18} className="shrink-0 text-text-3" aria-hidden="true" />
      <span className="text-sm text-text-2">{metin}</span>
    </Card>
  );
}
