/* Hesap: sade özet listesi. Ad (düzenle), e-posta ve doğrulama, giriş yöntemi rozeti, parola satırı (alt sayfa açar),
   en altta ayrı bölümde hesabı sil. Parola alanları ekranda açık form olarak durmaz. Çıkış Ayarlar'ın alt bilgisindedir. */
import { useState } from "react";
import { BadgeCheck, KeyRound, LogIn, Mail, MailWarning, Pencil, Trash2, UserRound } from "lucide-react";
import { hataMesaji, useOturum } from "@/data";
import { tr } from "@/metin";
import { Screen, sheets } from "@/shell";
import { Button, EmptyState, Field, ListRow, Section, Sheet, cn, haptic, toast } from "@/ui";
import { adGuncelle, parolaDegistir, parolaOlustur } from "./hesapIslemleri";
import { useHesapSilme } from "./hesapSilme";
import { Ayirac } from "./ortak";

function Rozet({ children, ton = "notr" }: { children: string; ton?: "notr" | "iyi" | "uyari" }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-pill px-2.5 text-xs font-semibold whitespace-nowrap",
        ton === "iyi" ? "bg-surface-2 text-income" : ton === "uyari" ? "bg-surface-2 text-warn" : "bg-surface-2 text-text-2",
      )}
    >
      {children}
    </span>
  );
}

export function HesapEkrani() {
  const t = tr.ayarlar.hesap;
  const k = useOturum((s) => s.kullanici);
  const silme = useHesapSilme();
  const [adAcik, setAdAcik] = useState(false);
  const [ad, setAd] = useState("");
  const [adHata, setAdHata] = useState<string | undefined>();
  const [parolaAcik, setParolaAcik] = useState(false);
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
      </Screen>
    );
  }

  const parolaVar = k.parolaVar || k.saglayici === "password";

  function adAc() {
    setAd(k?.ad ?? "");
    setAdHata(undefined);
    setAdAcik(true);
  }

  async function adKaydet() {
    if (!ad.trim()) {
      setAdHata(t.adBos);
      return;
    }
    setIsleniyor("ad");
    try {
      await adGuncelle(ad);
      toast(t.adKaydedildi);
      setAdAcik(false);
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

  function parolaAc() {
    setMevcut("");
    setYeni("");
    setTekrar("");
    setPHata({});
    setParolaAcik(true);
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
      setParolaAcik(false);
    } catch (e) {
      setPHata({ genel: hataMesaji(e) });
    } finally {
      setIsleniyor(null);
    }
  }

  return (
    <Screen title={t.baslik}>
      <Section title={t.yonetimBaslik} variant="solid" pad="none">
        <ListRow
          icon={<UserRound size={20} aria-hidden="true" />}
          title={t.ad}
          subtitle={k.ad || t.adYok}
          right={<Pencil size={18} className="text-text-3" aria-label={t.adDuzenle} />}
          onClick={adAc}
        />
        <Ayirac />
        <ListRow
          icon={<Mail size={20} aria-hidden="true" />}
          title={t.eposta}
          subtitle={<span className="selectable break-all">{k.eposta ?? t.epostaYok}</span>}
          right={
            k.eposta ? (
              <Rozet ton={k.epostaDogrulandi ? "iyi" : "uyari"}>{k.epostaDogrulandi ? t.dogrulandi : t.dogrulanmadi}</Rozet>
            ) : undefined
          }
        />
        {!k.epostaDogrulandi && k.eposta ? (
          <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pl-16">
            <Button size="sm" variant="secondary" icon={<MailWarning size={16} aria-hidden="true" />} loading={isleniyor === "dogrulama"} onClick={() => void dogrulamaGonder()}>
              {t.dogrulamaGonder}
            </Button>
            <Button size="sm" variant="text" icon={<BadgeCheck size={16} aria-hidden="true" />} onClick={() => void dogrulamaYenile()}>
              {t.dogrulamaYenile}
            </Button>
          </div>
        ) : null}
        <Ayirac />
        <ListRow icon={<LogIn size={20} aria-hidden="true" />} title={t.yontem} right={<Rozet>{t.yontemler[k.saglayici]}</Rozet>} />
      </Section>

      {k.eposta ? (
        <Section title={t.guvenlikBaslik} variant="solid" pad="none">
          <ListRow
            icon={<KeyRound size={20} aria-hidden="true" />}
            title={<span className={parolaVar ? undefined : "text-text-2"}>{parolaVar ? t.parolaDegistir : t.parolaOlustur}</span>}
            subtitle={parolaVar ? t.parolaSatirAlt : t.parolaOlusturAlt}
            chevron
            onClick={parolaAc}
          />
        </Section>
      ) : null}

      <Section title={t.tehlikeBaslik} variant="solid" pad="none">
        <ListRow
          icon={<Trash2 size={20} className="text-expense" aria-hidden="true" />}
          title={t.silSatir}
          subtitle={t.silSatirAlt}
          chevron
          onClick={() => void silme.baslat()}
        />
      </Section>

      <Sheet
        open={adAcik}
        onClose={() => setAdAcik(false)}
        title={t.adDuzenle}
        footer={
          <Button full size="lg" loading={isleniyor === "ad"} onClick={() => void adKaydet()}>
            {t.adKaydet}
          </Button>
        }
      >
        <div className="pb-2">
          <Field label={t.ad} value={ad} onChange={setAd} error={adHata} maxLength={40} autoFocus onSubmit={() => void adKaydet()} />
        </div>
      </Sheet>

      <Sheet
        open={parolaAcik}
        onClose={() => setParolaAcik(false)}
        title={parolaVar ? t.parolaDegistir : t.parolaOlustur}
        subtitle={parolaVar ? undefined : t.parolaOlusturMetin}
        footer={
          <Button full size="lg" loading={isleniyor === "parola"} onClick={() => void parolaKaydet()}>
            {tr.ortak.kaydet}
          </Button>
        }
      >
        <div className="flex flex-col gap-3 pb-2">
          {parolaVar ? <Field label={t.mevcutParola} type="password" value={mevcut} onChange={setMevcut} error={pHata.mevcut} autoFocus /> : null}
          <Field label={t.yeniParola} type="password" value={yeni} onChange={setYeni} error={pHata.yeni} hint={tr.giris.eposta.parolaIpucu} autoFocus={!parolaVar} />
          <Field label={t.yeniParolaTekrar} type="password" value={tekrar} onChange={setTekrar} error={pHata.tekrar} onSubmit={() => void parolaKaydet()} />
          {pHata.genel ? (
            <p role="alert" className="rounded-control bg-surface-2 px-3 py-2 text-sm text-warn">
              {pHata.genel}
            </p>
          ) : null}
        </div>
      </Sheet>

      {silme.sayfa}
    </Screen>
  );
}
