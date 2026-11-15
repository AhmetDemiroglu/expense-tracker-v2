/* Nova kök sekmesi: üstte Nova ve durum cümlesi (sabit), ortada kayan alan (rapor kartı + sohbet), altta sabit giriş yüzeyi.
   Ruh hali tek saf fonksiyondan (ruhHali.ts). Sayıları model üretmez: çekirdek ve P4 seçicileri. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Send, SlidersHorizontal, Trash2 } from "lucide-react";
import { tr } from "@/metin";
import {
  hataMesaji,
  useAktifDonem,
  useBaglanti,
  useButce,
  useEtkinIslemler,
  useOturum,
  useOzet,
  useSohbet,
  useVeri,
  UygulamaHatasi,
} from "@/data";
import { aiKullanilabilir } from "@/services/ai";
import { nav, sheets, TabPage, type TabProps } from "@/shell";
import {
  Button,
  Card,
  Chip,
  confirm,
  EmptyState,
  Field,
  haptic,
  IconButton,
  NovaAvatar,
  NovaSahne,
  ScreenHeader,
  toast,
  TourInfoButton,
  useKeyboardOpen,
  useReducedMotion,
  type NovaMood,
  type TourStep,
} from "@/ui";
import { AyarSayfasi } from "./AyarSayfasi";
import "./nova.css";
import { Bloklar } from "./Bloklar";
import { bicimCoz, kisalt, uzunluk } from "./bicimleyici";
import { useNovaDurumu } from "./durum";
import { RaporSayfasi, RaporSeridi } from "./RaporKarti";
import { novaDurumu } from "./ruhHali";

const TUR_ID = "nova";
const TUR_ADIMLARI: TourStep[] = tr.nova.tur.map((a) => ({ target: a.target, title: a.baslik, text: a.metin }));

interface Yazan {
  id: string;
  n: number;
  toplam: number;
}

export function NovaSekmesi({ active }: TabProps) {
  const reduced = useReducedMotion();
  const klavye = useKeyboardOpen();
  const kullanici = useOturum((s) => s.kullanici);
  const uid = kullanici?.uid ?? null;
  const aiAcik = aiKullanilabilir();
  const cevrimici = useBaglanti((s) => s.cevrimici);
  const veriDurum = useVeri((s) => s.durum);
  const ayarDurumu = useVeri((s) => s.ayarDurumu);
  const donem = useAktifDonem();
  const ozet = useOzet();
  const butce = useButce();
  const kayitSayisi = useEtkinIslemler().length;

  const mesajlar = useSohbet((s) => s.mesajlar);
  const bekliyor = useSohbet((s) => s.bekliyor);
  const sohbetHata = useSohbet((s) => s.hata);
  const { mod, stil, rapor, raporYukleniyor, raporHatasi, raporBaglami } = useNovaDurumu();

  const [metin, setMetin] = useState("");
  const [ayarAcik, setAyarAcik] = useState(false);
  const [raporAcik, setRaporAcik] = useState(false);
  const [selam, setSelam] = useState(false);
  const [yazan, setYazan] = useState<Yazan | null>(null);
  const kaydirma = useRef<HTMLDivElement>(null);

  useEffect(() => {
    useNovaDurumu.getState().sahibiAyarla(uid);
  }, [uid]);

  /* Yazma efekti yalnız bu oturumda canlı gelen yanıta uygulanır: geçmiş ve kullanıcı değişimi anında görünür.
     Canlı bayrağı gönderirken (olay işleyicisinde) kalkar, yanıt gelince render sırasında tüketilir. */
  const [canli, setCanli] = useState(false);
  const sonMesaj = mesajlar[mesajlar.length - 1];
  const [gorulenSon, setGorulenSon] = useState<string | null>(sonMesaj?.id ?? null);
  if ((sonMesaj?.id ?? null) !== gorulenSon) {
    setGorulenSon(sonMesaj?.id ?? null);
    if (sonMesaj && sonMesaj.rol === "model" && !sonMesaj.rapor && canli) {
      setCanli(false);
      const toplam = uzunluk(bicimCoz(sonMesaj.metin));
      if (toplam > 0 && !reduced) setYazan({ id: sonMesaj.id, n: 0, toplam });
    }
  }
  const yazanId = yazan?.id;
  const yazanToplam = yazan?.toplam ?? 0;
  useEffect(() => {
    if (!yazanId) return;
    /* Sonlu efekt: en çok 2,6 sn, 50 ms adımlarla. Bitince zamanlayıcı kalmaz. */
    const sure = Math.min(2600, Math.max(600, yazanToplam * 14));
    const adim = Math.max(1, Math.ceil(yazanToplam / (sure / 50)));
    const t = setInterval(() => {
      setYazan((p) => (!p || p.id !== yazanId ? p : p.n + adim >= p.toplam ? null : { ...p, n: p.n + adim }));
    }, 50);
    return () => clearInterval(t);
  }, [yazanId, yazanToplam]);

  /* Boşta ara sıra selam: tek sefer, yalnız sekme önde. Etkileşim zamanlayıcıyı yeniler. */
  useEffect(() => {
    if (!active || reduced || !aiAcik) return;
    const a = setTimeout(() => setSelam(true), 9000);
    const b = setTimeout(() => setSelam(false), 12000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      setSelam(false);
    };
  }, [active, reduced, aiAcik, mesajlar.length, bekliyor]);

  const veriBekleniyor = veriDurum === "yukleniyor" || veriDurum === "bos" || ayarDurumu === "bilinmiyor";
  const eski = !!raporBaglami && raporBaglami !== butce;
  const hataKodu = sohbetHata?.kod ?? raporHatasi?.kod ?? null;

  const durum = novaDurumu({
    aiAcik,
    cevrimici,
    veriBekleniyor,
    donemVar: !!donem,
    kayitVar: kayitSayisi > 0,
    raporYukleniyor,
    yanitBekleniyor: bekliyor,
    yaziyor: !!yazan,
    hataKodu,
    selamAktif: selam,
    faz: ozet?.phase ?? null,
    gunDurumu: ozet?.todayStatus ?? null,
    bakiyeEksi: !!ozet && ozet.balance < 0,
    raporRuhu: rapor?.durum.ruhHali ?? null,
  });

  const kota = hataKodu === "QUOTA_EXCEEDED";
  const gonderebilir = aiAcik && cevrimici && !bekliyor && !kota;

  const gonder = (soru: string) => {
    const t = soru.trim();
    if (!t || !gonderebilir) return;
    haptic.light();
    setMetin("");
    setCanli(true);
    void useSohbet.getState().gonder(t, { mod, stil });
  };

  /* P4 `gonder` her çağrıda kullanıcı balonu ekler: yeniden denemede yanıtsız son kullanıcı mesajı önce çıkarılır (ISTEKLER). */
  const tekrarDene = () => {
    const m = useSohbet.getState().mesajlar;
    const son = m[m.length - 1];
    if (!son || son.rol !== "user") return;
    useSohbet.setState({ mesajlar: m.slice(0, -1), hata: null });
    setCanli(true);
    void useSohbet.getState().gonder(son.metin, { mod, stil });
  };

  const temizle = async () => {
    const tamam = await confirm({ title: tr.nova.sohbet.temizleBaslik, text: tr.nova.sohbet.temizleMetin, confirmLabel: tr.nova.sohbet.temizle, danger: true });
    if (!tamam) return;
    useSohbet.getState().temizle();
    toast(tr.nova.sohbet.temizlendi);
  };

  const kopyala = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      haptic.selection();
      toast(tr.nova.sohbet.kopyalandi);
    } catch {
      toast.error(tr.nova.sohbet.kopyalanamadi);
    }
  };

  const girisYap = async () => {
    const tamam = await confirm({ title: tr.nova.bos.misafirOnayBaslik, text: tr.nova.bos.misafirOnayMetin, confirmLabel: tr.nova.bos.misafirEylem });
    if (tamam) void useOturum.getState().cikis();
  };

  const sonModelId = useMemo(() => [...mesajlar].reverse().find((m) => m.rol === "model")?.id ?? null, [mesajlar]);

  /* Ekranın ana gövdesi: duruma göre sahne ya da rapor + sohbet. */
  let govde: React.ReactNode;
  if (!aiAcik) {
    govde = <EmptyState mood="uyku" title={tr.nova.bos.misafirBaslik} text={tr.nova.bos.misafirMetin} action={<Button onClick={() => void girisYap()}>{tr.nova.bos.misafirEylem}</Button>} />;
  } else if (veriBekleniyor) {
    govde = <EmptyState mood="uyku" title={tr.nova.bos.bekleniyorBaslik} text={tr.nova.bos.bekleniyorMetin} />;
  } else if (!donem) {
    govde = <EmptyState mood="selam" title={tr.nova.bos.donemBaslik} text={tr.nova.bos.donemMetin} action={<Button onClick={() => nav.push("ayarlar")}>{tr.nova.bos.donemEylem}</Button>} />;
  } else if (kayitSayisi === 0) {
    govde = <EmptyState mood="selam" title={tr.nova.bos.kayitBaslik} text={tr.nova.bos.kayitMetin} action={<Button onClick={() => sheets.open("kayit-ekle")}>{tr.nova.bos.kayitEylem}</Button>} />;
  }
  const tamEkran = govde === undefined;

  /* Sohbet ve yazma değişince en alta kaydır (scrollIntoView yasak: scrollTop). */
  const yazanN = yazan?.n ?? 0;
  useEffect(() => {
    const el = kaydirma.current;
    if (el) el.scrollTop = tamEkran ? el.scrollHeight : 0;
  }, [tamEkran, mesajlar.length, bekliyor, sohbetHata, yazanN]);

  const yanitMoodu = (id: string): NovaMood => (id === sonModelId ? (yazan?.id === id ? "konusuyor" : durum.ruh === "dusunuyor" || durum.ruh === "analiz" ? "mutlu" : durum.ruh) : "mutlu");

  return (
    <TabPage
      className="pb-0"
      header={
        <ScreenHeader
          left={<NovaAvatar mood={durum.ruh} size={40} className="mr-1" />}
          title={tr.nova.baslik}
          subtitle={tr.nova.durum[durum.anahtar]}
          right={
            <>
              <TourInfoButton id={TUR_ID} steps={TUR_ADIMLARI} />
              {tamEkran ? (
                <IconButton label={tr.nova.sohbet.temizle} disabled={mesajlar.length === 0} onClick={() => void temizle()}>
                  <Trash2 size={20} aria-hidden="true" />
                </IconButton>
              ) : null}
              <IconButton label={tr.nova.ayar.ac} data-tour="nova-ayar" onClick={() => setAyarAcik(true)}>
                <SlidersHorizontal size={20} aria-hidden="true" />
              </IconButton>
            </>
          }
        />
      }
    >
      <span className="sr-only" role="status" aria-live="polite">
        {tr.nova.durum[durum.anahtar]}
      </span>

      {tamEkran ? (
        <RaporSeridi
          rapor={rapor}
          yukleniyor={raporYukleniyor}
          hata={raporHatasi}
          eski={eski}
          onYenile={() => void useNovaDurumu.getState().raporuYenile()}
          onAc={() => setRaporAcik(true)}
        />
      ) : null}

      {/* Kayan tek bölge sohbettir. Kenarlardaki yumuşak geçiş kaydırmanın köşeli kesilmesini önler. */}
      <div ref={kaydirma} className="scroll-y nova-fade flex min-h-0 flex-1 flex-col gap-3">
        {govde ?? (
          <>
            <div className="flex shrink-0 flex-col gap-3" aria-label={tr.nova.sohbet.baslik}>
              {mesajlar.length === 0 && !bekliyor ? (
                <NovaSahne mood={durum.ruh} size={96} surface="solid" title={tr.nova.sohbet.sahneBaslik} text={tr.nova.sohbet.bos} className="shrink-0" />
              ) : null}
              {mesajlar.map((m) => {
                if (m.rol === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <p className="selectable max-w-[85%] rounded-card rounded-br-md bg-accent px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-on-accent">{m.metin}</p>
                    </div>
                  );
                }
                const bloklar = bicimCoz(m.metin);
                const yaziyor = yazan?.id === m.id;
                return (
                  <div key={m.id} className="flex items-end gap-2">
                    <NovaAvatar mood={yanitMoodu(m.id)} size={28} />
                    <div className="min-w-0 max-w-[85%] rounded-card rounded-bl-md bg-surface-2 px-4 py-3 text-text">
                      <Bloklar bloklar={yaziyor ? kisalt(bloklar, yazan.n) : bloklar} />
                      {!yaziyor && m.id === sonModelId ? (
                        <div className="-mb-2 flex justify-end">
                          <IconButton label={tr.nova.sohbet.kopyala} onClick={() => void kopyala(m.metin)}>
                            <Copy size={16} aria-hidden="true" />
                          </IconButton>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {bekliyor ? (
                <div className="flex items-end gap-2" role="status" aria-label={tr.nova.sohbet.yaziyor}>
                  <NovaAvatar mood="dusunuyor" size={28} />
                  <div className="flex gap-1.5 rounded-card rounded-bl-md bg-surface-2 px-4 py-4" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="size-2 animate-pulse rounded-pill bg-text-3" style={{ animationDelay: `${i * 160}ms` }} />
                    ))}
                  </div>
                </div>
              ) : null}
              {sohbetHata ? <SohbetHatasi hata={sohbetHata} cevrimici={cevrimici} onTekrar={tekrarDene} /> : null}
              {!cevrimici && !sohbetHata ? (
                <Card variant="flat" className="shrink-0">
                  <p className="text-sm font-semibold text-text">{tr.nova.hata.cevrimdisiBaslik}</p>
                  <p className="text-sm text-text-2">{tr.nova.hata.cevrimdisiMetin}</p>
                </Card>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="shrink-0" style={{ paddingBottom: klavye ? "calc(var(--kb-h) + 8px)" : "var(--content-bottom)" }}>
        <Card variant="solid" pad="none" className="flex flex-col gap-2 px-3 pt-2 pb-2">
          {tamEkran ? (
            <>
              <div className="scroll-x -mx-1 flex gap-2 px-1" data-swipe-lock="" data-tour="nova-sorular" aria-label={tr.nova.sohbet.hizliSorular}>
                {tr.nova.sohbet.sorular.map((q) => (
                  <Chip key={q.ad} onClick={() => gonder(q.soru)}>
                    {q.ad}
                  </Chip>
                ))}
              </div>
              <div data-tour="nova-giris">
                <Field
                  value={metin}
                  onChange={setMetin}
                  placeholder={tr.nova.sohbet.giris}
                  maxLength={500}
                  disabled={!gonderebilir && !bekliyor}
                  onSubmit={() => gonder(metin)}
                  right={
                    <IconButton label={tr.nova.sohbet.gonder} variant="tinted" disabled={!gonderebilir || !metin.trim()} onClick={() => gonder(metin)}>
                      <Send size={20} aria-hidden="true" />
                    </IconButton>
                  }
                />
              </div>
            </>
          ) : null}
          <p className="text-center text-xs text-text-3">{tr.nova.uyari}</p>
        </Card>
      </div>

      <RaporSayfasi
        open={raporAcik}
        onClose={() => setRaporAcik(false)}
        rapor={rapor}
        yukleniyor={raporYukleniyor}
        eski={eski}
        onYenile={() => void useNovaDurumu.getState().raporuYenile()}
      />
      <AyarSayfasi open={ayarAcik} onClose={() => setAyarAcik(false)} />
    </TabPage>
  );
}

function SohbetHatasi({ hata, cevrimici, onTekrar }: { hata: UygulamaHatasi; cevrimici: boolean; onTekrar: () => void }) {
  const kota = hata.kod === "QUOTA_EXCEEDED";
  const baslik = kota ? tr.nova.hata.kotaBaslik : hata.kod === "AG_YOK" || !cevrimici ? tr.nova.hata.cevrimdisiBaslik : tr.nova.hata.sunucuBaslik;
  return (
    <div className="flex items-end gap-2" role="alert">
      <NovaAvatar mood={kota ? "uyari" : "uzgun"} size={28} />
      <Card variant="flat" className="flex min-w-0 max-w-[85%] flex-col gap-2">
        <p className="text-sm font-semibold text-text">{baslik}</p>
        <p className="text-sm text-text-2">{kota ? tr.nova.hata.kotaSifirlanma : hataMesaji(hata)}</p>
        {hata.tekrarDenenebilir && !kota ? (
          <Button size="sm" variant="secondary" onClick={onTekrar}>
            {tr.nova.hata.tekrar}
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
