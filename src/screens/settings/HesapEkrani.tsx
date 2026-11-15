/* Hesap: ad, e-posta ve doğrulama, parola değiştir ya da oluştur, çıkış. Misafirde giriş çağrısı. */
import { useState } from "react";
import { BadgeCheck, MailWarning } from "lucide-react";
import { hataMesaji, useOturum } from "@/data";
import { tr } from "@/metin";
import { Screen, nav, sheets } from "@/shell";
import { Button, Card, EmptyState, Field, Section, confirm, haptic, toast } from "@/ui";
import { adGuncelle, parolaDegistir, parolaOlustur } from "./hesapIslemleri";

export function HesapEkrani() {
  const t = tr.ayarlar.hesap;
  const k = useOturum((s) => s.kullanici);
  const mesgul = useOturum((s) => s.mesgul);
  const [ad, setAd] = useState(k?.ad ?? "");
  const [adHata, setAdHata] = useState<string | undefined>();
  const [mevcut, setMevcut] = useState("");
  const [yeni, setYeni] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [pHata, setPHata] = useState<Record<string, string>>({});
  const [isleniyor, setIsleniyor] = useState<null | "ad" | "parola" | "dogrulama">(null);

  if (!k) return null;

  if (k.misafir) {
    return (
      <Screen title={t.baslik}>
        <EmptyState mood="uyku" title={t.misafirBaslik} text={t.misafirMetin} action={<Button onClick={() => sheets.open("giris")}>{tr.ayarlar.girisYap}</Button>} />
        <Button variant="secondary" size="lg" full onClick={() => void cikis(true)}>
          {t.cikis}
        </Button>
      </Screen>
    );
  }

  const parolaVar = k.saglayici === "password";

  async function adKaydet() {
    if (!ad.trim()) {
      setAdHata(t.adBos);
      return;
    }
    setAdHata(undefined);
    setIsleniyor("ad");
    try {
      await adGuncelle(ad);
      toast(t.adKaydedildi);
    } catch (e) {
      setAdHata(hataMesaji(e));
    } finally {
      setIsleniyor(null);
    }
  }

  async function dogrulamaGonder() {
    setIsleniyor("dogrulama");
    try {
      await useOturum.getState().dogrulamaGonder();
      toast(t.dogrulamaGitti);
    } catch (e) {
      toast.error(hataMesaji(e));
    } finally {
      setIsleniyor(null);
    }
  }

  async function dogrulamaYenile() {
    try {
      await useOturum.getState().epostaDurumunuYenile();
    } catch (e) {
      toast.error(hataMesaji(e));
    }
  }

  async function parolaKaydet() {
    const h: Record<string, string> = {};
    if (parolaVar && !mevcut) h.mevcut = t.mevcutGerekli;
    if (yeni.length < 6) h.yeni = t.parolaKisa;
    else if (tekrar !== yeni) h.tekrar = t.parolaUyusmuyor;
    setPHata(h);
    if (Object.keys(h).length > 0) return;
    setIsleniyor("parola");
    try {
      if (parolaVar) await parolaDegistir(mevcut, yeni);
      else await parolaOlustur(yeni);
      haptic.success();
      toast(parolaVar ? t.parolaKaydedildi : t.parolaOlustu);
      setMevcut("");
      setYeni("");
      setTekrar("");
    } catch (e) {
      setPHata({ genel: hataMesaji(e) });
    } finally {
      setIsleniyor(null);
    }
  }

  async function cikis(misafir: boolean) {
    const ok = await confirm({ title: t.cikisOnayBaslik, text: misafir ? t.misafirCikisOnay : t.cikisOnay, confirmLabel: t.cikis });
    if (!ok) return;
    try {
      await useOturum.getState().cikis();
      nav.popToRoot();
    } catch (e) {
      toast.error(`${t.cikisHata}: ${hataMesaji(e)}`);
    }
  }

  return (
    <Screen title={t.baslik}>
      <Section title={t.ad} variant="solid">
        <div className="flex flex-col gap-3">
          <Field label={t.ad} value={ad} onChange={setAd} error={adHata} maxLength={40} />
          <Button variant="secondary" loading={isleniyor === "ad"} onClick={() => void adKaydet()}>
            {t.adKaydet}
          </Button>
        </div>
      </Section>

      <Section title={t.eposta} variant="solid">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 text-base text-text">{k.eposta ?? t.epostaYok}</span>
            <span className={`flex shrink-0 items-center gap-1 text-sm font-medium ${k.epostaDogrulandi ? "text-income" : "text-warn"}`}>
              {k.epostaDogrulandi ? <BadgeCheck size={16} aria-hidden="true" /> : <MailWarning size={16} aria-hidden="true" />}
              {k.epostaDogrulandi ? t.dogrulandi : t.dogrulanmadi}
            </span>
          </div>
          {!k.epostaDogrulandi && k.eposta ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" loading={isleniyor === "dogrulama"} onClick={() => void dogrulamaGonder()}>
                {t.dogrulamaGonder}
              </Button>
              <Button size="sm" variant="text" onClick={() => void dogrulamaYenile()}>
                {t.dogrulamaYenile}
              </Button>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-3">{t.yontem}</span>
            <span className="font-medium text-text-2">{t.yontemler[k.saglayici]}</span>
          </div>
        </div>
      </Section>

      {k.eposta ? (
        <Section title={t.parolaBaslik} variant="solid">
          <div className="flex flex-col gap-3">
            {!parolaVar ? <p className="text-sm text-text-2">{t.parolaOlusturMetin}</p> : null}
            {parolaVar ? <Field label={t.mevcutParola} type="password" value={mevcut} onChange={setMevcut} error={pHata.mevcut} /> : null}
            <Field label={t.yeniParola} type="password" value={yeni} onChange={setYeni} error={pHata.yeni} />
            <Field label={t.yeniParolaTekrar} type="password" value={tekrar} onChange={setTekrar} error={pHata.tekrar} />
            {pHata.genel ? (
              <p role="alert" className="rounded-control bg-surface-2 px-3 py-2 text-sm text-warn">
                {pHata.genel}
              </p>
            ) : null}
            <Button variant="secondary" loading={isleniyor === "parola"} onClick={() => void parolaKaydet()}>
              {parolaVar ? t.parolaDegistir : t.parolaOlustur}
            </Button>
          </div>
        </Section>
      ) : null}

      <Card variant="solid">
        <Button full size="lg" variant="secondary" disabled={mesgul !== null} loading={mesgul === "cikis"} onClick={() => void cikis(false)}>
          {t.cikis}
        </Button>
      </Card>
    </Screen>
  );
}
