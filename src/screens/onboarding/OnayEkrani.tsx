/* İlk açılış onayı: sabit üst başlık (logo + başlık), ortada kendi içinde kayan maddeler, sabit alt bölüm (bağlantılar + onay düğmesi).
   Onay verilmeden uygulamaya geçilmez. Metin: tr.giris.onay (mağaza "Veri gerçekleri" tablosu ve gizlilik sayfasıyla aynı gerçekler). */
import { Cloud, EyeOff, ReceiptText, Trash2, Wallet } from "lucide-react";
import { Logo } from "@/brand";
import { tr } from "@/metin";
import { Button, Card, NovaGlyph, haptic } from "@/ui";
import { TamEkran } from "../auth/TamEkran";
import { useOnay } from "./onay";

/* İkinci madde Nova: yapay zeka kalıp simgesi yerine Nova'nın kendi simgesi. */
const IKONLAR = [Wallet, NovaGlyph, ReceiptText, Cloud, EyeOff, Trash2];

export function OnayEkrani() {
  const t = tr.giris.onay;
  const h = tr.ayarlar.hakkinda;
  return (
    <TamEkran scroll={false} className="gap-0">
      <header className="flex shrink-0 flex-col gap-3 pb-3">
        <Logo variant="horizontal" height={32} />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-text">{t.baslik}</h1>
          <p className="text-sm text-text-2">{t.alt}</p>
        </div>
      </header>

      <Card variant="solid" pad="none" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ul className="scroll-y flex min-h-0 flex-1 flex-col px-4 py-1" aria-label={t.baslik}>
          {t.maddeler.map((m, i) => {
            const Ikon = IKONLAR[i] ?? Wallet;
            return (
              <li key={m.baslik} className={`flex gap-3 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-2 text-text-2">
                  <Ikon size={20} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-base font-semibold text-text">{m.baslik}</span>
                  <span className="text-sm leading-relaxed text-text-2">{m.metin}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <footer className="flex shrink-0 flex-col gap-3 pt-3">
        <p className="text-center text-xs leading-relaxed text-text-3">
          {t.altMetin}{" "}
          <a className="font-semibold text-text-2 underline underline-offset-2" href={h.kosullarUrl} target="_blank" rel="noreferrer">
            {t.kosullar}
          </a>
          {", "}
          <a className="font-semibold text-text-2 underline underline-offset-2" href={h.gizlilikUrl} target="_blank" rel="noreferrer">
            {t.gizlilik}
          </a>
        </p>
        <Button
          size="lg"
          full
          onClick={() => {
            haptic.success();
            useOnay.getState().onayla();
          }}
        >
          {t.kabul}
        </Button>
      </footer>
    </TamEkran>
  );
}
