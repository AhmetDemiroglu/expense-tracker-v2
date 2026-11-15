/* Kabuk içinden açılan giriş alt sayfası: sheets.open("giris"). Misafir "giriş yapınca açılır" yerlerinden çağrılır. */
import { useEffect } from "react";
import type { SheetScreenProps } from "@/shell";
import { useOturum } from "@/data";
import { tr } from "@/metin";
import { Sheet } from "@/ui";
import { GirisSecenekleri } from "./GirisSecenekleri";

export function GirisSayfasi({ open, close }: SheetScreenProps) {
  const t = tr.giris.giris;
  const hesap = useOturum((s) => s.durum === "hesap");
  useEffect(() => {
    if (open && hesap) close();
  }, [open, hesap, close]);
  return (
    <Sheet open={open} onClose={close} title={t.sheetBaslik} subtitle={t.sheetMetin}>
      <div className="pb-2">
        <GirisSecenekleri onTamam={close} />
      </div>
    </Sheet>
  );
}
