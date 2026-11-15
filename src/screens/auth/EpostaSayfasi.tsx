/* E-posta ile giriş, kayıt ve parola sıfırlama: tek alt sayfa, üç kip. */
import { useState } from "react";
import { hataMesaji, useOturum } from "@/data";
import { iptalMi } from "./hata";
import { tr } from "@/metin";
import { Button, Field, Sheet, toast } from "@/ui";

type Kip = "giris" | "kayit" | "sifirla";

const E_POSTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface EpostaSayfasiProps {
  open: boolean;
  onClose: () => void;
  /** Giriş ya da kayıt başarılı olunca. */
  onTamam?: () => void;
}

export function EpostaSayfasi({ open, onClose, onTamam }: EpostaSayfasiProps) {
  const t = tr.giris.eposta;
  const mesgul = useOturum((s) => s.mesgul);
  const [kip, setKip] = useState<Kip>("giris");
  const [eposta, setEposta] = useState("");
  const [parola, setParola] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [ad, setAd] = useState("");
  const [hata, setHata] = useState<Record<string, string>>({});
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [ariyor, setAriyor] = useState(false);

  const baslik = kip === "giris" ? t.girisBaslik : kip === "kayit" ? t.kayitBaslik : t.sifirlaBaslik;

  function dogrula(): Record<string, string> {
    const h: Record<string, string> = {};
    if (!eposta.trim()) h.eposta = t.epostaGerekli;
    else if (!E_POSTA.test(eposta.trim())) h.eposta = t.epostaGecersiz;
    if (kip !== "sifirla") {
      if (!parola) h.parola = t.parolaGerekli;
      else if (kip === "kayit" && parola.length < 6) h.parola = t.parolaKisa;
    }
    if (kip === "kayit" && !h.parola && tekrar !== parola) h.tekrar = t.parolaUyusmuyor;
    return h;
  }

  async function gonder() {
    const h = dogrula();
    setHata(h);
    setBilgi(null);
    if (Object.keys(h).length > 0) return;
    setAriyor(true);
    try {
      const o = useOturum.getState();
      if (kip === "giris") await o.epostaIleGir(eposta, parola);
      else if (kip === "kayit") {
        await o.kayitOl(eposta, parola, ad.trim() || undefined);
        toast(t.dogrulamaGitti);
      } else {
        await o.sifreSifirla(eposta);
        setBilgi(t.sifirlaGitti);
        return;
      }
      onTamam?.();
      onClose();
    } catch (e) {
      if (!iptalMi(e)) setHata({ genel: hataMesaji(e) });
    } finally {
      setAriyor(false);
    }
  }

  function kipDegistir(k: Kip) {
    setKip(k);
    setHata({});
    setBilgi(null);
  }

  const gonderEtiket = kip === "giris" ? t.girisYap : kip === "kayit" ? t.kayitOl : t.sifirlaGonder;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={baslik}
      size="auto"
      footer={
        <Button full size="lg" loading={ariyor || mesgul === "eposta" || mesgul === "kayit"} onClick={() => void gonder()}>
          {gonderEtiket}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-3 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          void gonder();
        }}
      >
        {kip === "kayit" ? <Field label={t.ad} hint={t.adIpucu} value={ad} onChange={setAd} maxLength={40} /> : null}
        <Field label={t.eposta} type="email" value={eposta} onChange={setEposta} error={hata.eposta} autoFocus />
        {kip !== "sifirla" ? (
          <Field label={t.parola} type="password" value={parola} onChange={setParola} error={hata.parola} hint={kip === "kayit" ? t.parolaIpucu : undefined} />
        ) : null}
        {kip === "kayit" ? <Field label={t.parolaTekrar} type="password" value={tekrar} onChange={setTekrar} error={hata.tekrar} /> : null}
        {hata.genel ? (
          <p role="alert" className="rounded-control bg-surface-2 px-3 py-2 text-sm text-warn">
            {hata.genel}
          </p>
        ) : null}
        {bilgi ? (
          <p role="status" className="rounded-control bg-surface-2 px-3 py-2 text-sm text-text-2">
            {bilgi}
          </p>
        ) : null}
        <div className="flex flex-col gap-1">
          {kip === "giris" ? (
            <>
              <Button variant="text" onClick={() => kipDegistir("sifirla")}>
                {t.sifremiUnuttum}
              </Button>
              <Button variant="text" onClick={() => kipDegistir("kayit")}>
                {t.hesapYok}
              </Button>
            </>
          ) : kip === "kayit" ? (
            <Button variant="text" onClick={() => kipDegistir("giris")}>
              {t.hesapVar}
            </Button>
          ) : (
            <Button variant="text" onClick={() => kipDegistir("giris")}>
              {t.geriGiris}
            </Button>
          )}
        </div>
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Sheet>
  );
}
