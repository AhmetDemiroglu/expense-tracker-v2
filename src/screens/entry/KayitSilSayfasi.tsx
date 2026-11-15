/* "kayit-sil" alt sayfası: sheets.open("kayit-sil", { id }). Taksitli kayıtta üç seçenek, düz kayıtta tek onay. */
import { useEffect } from "react";
import { categoryLabel, stripAutoSuffix } from "@/core";
import { useVeri } from "@/data";
import { tr } from "@/metin";
import type { SheetScreenProps } from "@/shell";
import { Button, Sheet } from "@/ui";
import { kalanTaksitler } from "../records/grup";
import { kayitlariSil } from "./silme";

export function KayitSilSayfasi({ open, close, params }: SheetScreenProps) {
  const id = typeof params.id === "string" ? params.id : null;
  const hepsi = useVeri((s) => s.islemler);
  const t = id ? hepsi.find((x) => x.id === id) : undefined;

  useEffect(() => {
    if (!t) close();
  }, [t, close]);
  if (!t) return null;

  const grup = t.installmentGroupId ? hepsi.filter((x) => x.installmentGroupId === t.installmentGroupId) : [];
  const kalan = kalanTaksitler(hepsi, t);
  const taksitli = grup.length > 1;
  const ad = (stripAutoSuffix(t.description).trim() || categoryLabel(t.category)).replace(/\s*\(\d+\/\d+\)$/, "");

  const sil = async (liste: typeof grup, mesaj: string) => {
    close();
    await kayitlariSil(liste, mesaj);
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={taksitli ? tr.kayitlar.taksitSil.baslik : tr.kayitlar.silOnay.baslik}
      subtitle={taksitli ? tr.kayitlar.taksitSil.altBaslik(ad, t.installmentIndex ?? 1, t.installmentCount ?? grup.length) : tr.kayitlar.silOnay.metin}
    >
      <div className="flex flex-col gap-2 pb-2">
        {taksitli ? (
          <>
            <Button variant="danger" full onClick={() => void sil([t], tr.kayitlar.silindi)}>
              {tr.kayitlar.taksitSil.yalnizBu}
            </Button>
            {kalan.length > 1 ? (
              <Button variant="danger" full onClick={() => void sil(kalan, tr.kayitlar.taksitSilindi(kalan.length))}>
                {`${tr.kayitlar.taksitSil.kalan} (${kalan.length})`}
              </Button>
            ) : null}
            {grup.length > kalan.length ? (
              <Button variant="danger" full onClick={() => void sil(grup, tr.kayitlar.taksitSilindi(grup.length))}>
                {`${tr.kayitlar.taksitSil.tumGrup} (${grup.length})`}
              </Button>
            ) : null}
          </>
        ) : (
          <Button variant="danger" full onClick={() => void sil([t], tr.kayitlar.silindi)}>
            {tr.ortak.sil}
          </Button>
        )}
        <Button variant="secondary" full onClick={close}>
          {tr.ortak.vazgec}
        </Button>
      </div>
    </Sheet>
  );
}
