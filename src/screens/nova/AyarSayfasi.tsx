/* Mod (Danışman, Eğitmen) ve yanıt stili (kısa, dengeli, detaylı) alt sayfası; Nova profili P8'in ekranına bağlanır. */
import { UserRound } from "lucide-react";
import { tr } from "@/metin";
import type { RaporStili, SohbetModu } from "@/services/ai";
import { nav } from "@/shell";
import { Button, Segmented, Sheet } from "@/ui";
import { useNovaDurumu } from "./durum";

const MODLAR = (["advisor", "tutor"] as const).map((v) => ({ value: v, label: tr.nova.mod[v] }));
const STILLER = (["short", "balanced", "detailed"] as const).map((v) => ({ value: v, label: tr.nova.stil[v] }));

export function AyarSayfasi({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mod = useNovaDurumu((s) => s.mod);
  const stil = useNovaDurumu((s) => s.stil);
  const a = tr.nova.ayar;
  return (
    <Sheet open={open} onClose={onClose} title={a.baslik} footer={<Button full onClick={onClose}>{a.kapat}</Button>}>
      <div className="flex flex-col gap-5 pb-2">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text-2">{a.modEtiketi}</p>
          <Segmented<SohbetModu> full label={a.modEtiketi} value={mod} onChange={(v) => useNovaDurumu.getState().modAyarla(v)} options={MODLAR} />
          <p className="text-sm text-text-3">{a.modAciklama[mod]}</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text-2">{a.stilEtiketi}</p>
          <Segmented<RaporStili> full label={a.stilEtiketi} value={stil} onChange={(v) => useNovaDurumu.getState().stilAyarla(v)} options={STILLER} />
          <p className="text-sm text-text-3">{a.stilAciklama[stil]}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            full
            icon={<UserRound size={18} aria-hidden="true" />}
            onClick={() => {
              onClose();
              nav.push("nova-profili");
            }}
          >
            {a.profil}
          </Button>
          <p className="text-sm text-text-3">{a.profilAciklama}</p>
        </div>
      </div>
    </Sheet>
  );
}
