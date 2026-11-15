/* Giriş düğmeleri: Apple (iOS'ta üstte), Google, e-posta. Kapıdaki tam ekranda ve kabuk içindeki "giris" alt sayfasında aynı parça. */
import { useState, type ReactNode } from "react";
import { Mail } from "lucide-react";
import { girisSecenekleri, useOturum } from "@/data";
import { tr } from "@/metin";
import { Button, isIOS } from "@/ui";
import { EpostaSayfasi } from "./EpostaSayfasi";
import { hataGoster } from "./hata";
import { AppleIkon, GoogleIkon } from "./markalar";

export function GirisSecenekleri({ onTamam, ek }: { onTamam?: () => void; ek?: ReactNode }) {
  const t = tr.giris.giris;
  const mesgul = useOturum((s) => s.mesgul);
  const sec = girisSecenekleri();
  const [eposta, setEposta] = useState(false);

  async function dene(is: () => Promise<void>) {
    try {
      await is();
      onTamam?.();
    } catch (e) {
      hataGoster(e);
    }
  }

  const apple = sec.apple ? (
    <Button key="apple" size="lg" full icon={<AppleIkon />} loading={mesgul === "apple"} disabled={mesgul !== null} onClick={() => void dene(() => useOturum.getState().appleIleGir())}>
      {t.apple}
    </Button>
  ) : null;
  const google = sec.google ? (
    <Button key="google" size="lg" full variant={isIOS && apple ? "secondary" : "primary"} icon={<GoogleIkon />} loading={mesgul === "google"} disabled={mesgul !== null} onClick={() => void dene(() => useOturum.getState().googleIleGir())}>
      {t.google}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-2.5">
      {isIOS ? [apple, google] : [google, apple]}
      <Button size="lg" full variant="secondary" icon={<Mail size={20} aria-hidden="true" />} disabled={mesgul !== null} onClick={() => setEposta(true)}>
        {t.eposta}
      </Button>
      {ek}
      <EpostaSayfasi open={eposta} onClose={() => setEposta(false)} onTamam={onTamam} />
    </div>
  );
}
