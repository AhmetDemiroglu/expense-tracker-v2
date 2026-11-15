/* Vitrin: tasarım sisteminin canlı örneği. YALNIZ geliştirmede açılır: http://localhost:5173/?vitrin (yayın paketine girmez).
   Sahte veriyle çalışan kabuk: 4 sekme, iki üst ekran, alt sayfalar, tur. Veri katmanına bağımlılık yoktur.
   Ekran paketleri buradan örnek alır. Buradaki örnek metinler üründe kullanılmaz (ürün metni src/metin altındadır). */
import { useState } from "react";
import { Bus, CalendarDays, Coffee, Home, Plus, Search, ShoppingCart, Wallet } from "lucide-react";
import { Logo, SeptimusImza } from "@/brand";
import { WEEKDAY_SHORT_TR, addDays, formatDateTr, formatMoney, parseAmount, startOfWeek, today as coreToday, type Kurus, type LocalDate } from "@/core";
import { tr } from "@/metin";
import { AppShell, Screen, TabPage, nav, sheets, useScreenActive, type ScreenProps, type SheetScreenProps } from "@/shell";
import {
  Amount,
  AmountField,
  Button,
  Card,
  Chip,
  DatePick,
  DatePickSheet,
  EmptyState,
  Field,
  Glass,
  IconButton,
  Keypad,
  ListRow,
  ProgressBar,
  Ring,
  SectionLabel,
  Segmented,
  Sheet,
  SkeletonRows,
  Spinner,
  SwipeRow,
  TourInfoButton,
  UiHost,
  WeekBars,
  confirm,
  inform,
  isLensEnabled,
  keypadDisplay,
  resetTours,
  setLensEnabled,
  toast,
  useAutoTour,
  useTheme,
  type ThemePref,
  type TourStep,
  type WeekBarDay,
} from "@/ui";

const BUGUN = coreToday();
const HAFTA = startOfWeek(BUGUN);
const HARCAMA = [38000, 72000, 24000, 131000, 55000, 0, 0];
const LIMIT = 104000;

const GUNLER: WeekBarDay[] = WEEKDAY_SHORT_TR.map((label, i) => {
  const gun = addDays(HAFTA, i);
  const value = HARCAMA[i] ?? 0;
  return { label, value, isToday: gun === BUGUN, future: gun > BUGUN, status: value > LIMIT * 1.2 ? "over" : value > LIMIT ? "warning" : "good" };
});

const OZET_TURU: TourStep[] = [
  { target: "ozet-kart", title: "Kalan bütçe", text: "Dönemin sonuna kadar harcayabileceğin tutar ve günlük limitin burada durur." },
  { target: "ozet-hafta", title: "Hafta çubukları", text: "Bu haftanın günlük harcamaları. Bugünün çubuğu bakır renktedir.", padding: 10 },
  { target: "ekle", title: "Kayıt ekle", text: "Gelir ya da gider eklemek için bu düğmeye dokun.", shape: "circle" },
  { target: "yok-boyle-hedef", title: "Bu adım atlanır", text: "Hedefi bulunmayan adım gösterilmez." },
  { target: "profil", title: "Profil ve ayarlar", text: "Görünüm, dönemler ve hesap ayarları burada.", shape: "circle" },
];

interface Kayit {
  id: number;
  ad: string;
  alt: string;
  tutar: Kurus;
  gelir?: boolean;
  ikon: typeof Home;
}
const ORNEK: Kayit[] = [
  { id: 1, ad: "Market", alt: "Bugün, fişten okundu", tutar: 64250, ikon: ShoppingCart },
  { id: 2, ad: "Maaş", alt: "Dönem başı", tutar: 5800000, gelir: true, ikon: Wallet },
  { id: 3, ad: "Kahve", alt: "Dün", tutar: 9500, ikon: Coffee },
  { id: 4, ad: "Toplu taşıma", alt: "Dün", tutar: 4000, ikon: Bus },
  { id: 5, ad: "Kira", alt: "1 Kasım, planlı", tutar: 2200000, ikon: Home },
];
const UZUN: Kayit[] = Array.from({ length: 14 }, (_, i) => ({ ...ORNEK[i % ORNEK.length]!, id: i + 1 }));

function KayitSatiri({ k }: { k: Kayit }) {
  const Ikon = k.ikon;
  return <ListRow icon={<Ikon size={20} aria-hidden="true" />} title={k.ad} subtitle={k.alt} right={<Amount value={k.tutar} kind={k.gelir ? "income" : "expense"} size="sm" />} />;
}

/* ---------- Sekmeler ---------- */

function OzetSekmesi() {
  const active = useScreenActive();
  useAutoTour("vitrin-ozet", OZET_TURU, { when: active });
  return (
    <TabPage>
      <div className="flex items-center justify-between">
        <button type="button" className="min-h-11 text-left text-base font-semibold text-text" onClick={() => toast("Dönem seçici burada açılır")}>
          Kasım 2026
        </button>
        <TourInfoButton id="vitrin-ozet" steps={OZET_TURU} />
      </div>
      <Card lens data-tour="ozet-kart" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium text-text-2">Kalan bütçe</span>
            <Amount value={1248050} size="hero" animate />
            <span className="text-sm text-text-2">
              Günde <span className="num">{formatMoney(LIMIT, { decimals: false })}</span>, 12 gün kaldı
            </span>
          </div>
          <div data-tour="ozet-hafta">
            <WeekBars days={GUNLER} limit={LIMIT} compact height={64} />
          </div>
        </div>
        <ProgressBar value={0.62} label="Dönem ilerlemesi" />
      </Card>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["Gelir", 5800000, "income"],
            ["Gider", 2351950, "expense"],
            ["Planlı", 2200000, "neutral"],
          ] as const
        ).map(([ad, tutar, tur]) => (
          <Card key={ad} pad="sm" className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-text-2">{ad}</span>
            <Amount value={tutar} kind={tur} size="sm" decimals={false} />
          </Card>
        ))}
      </div>
      <SectionLabel>Son hareketler</SectionLabel>
      <Card variant="solid" pad="none" className="scroll-y min-h-0">
        {ORNEK.slice(0, 2).map((k) => (
          <KayitSatiri key={k.id} k={k} />
        ))}
      </Card>
    </TabPage>
  );
}

function TakvimSekmesi() {
  const [gun, setGun] = useState<LocalDate>(BUGUN);
  return (
    <TabPage scroll>
      <Card>
        <DatePick value={gun} onChange={setGun} today={BUGUN} marks={{ [addDays(BUGUN, -1)]: "dot", [addDays(BUGUN, -3)]: "dot" }} />
      </Card>
      <Card variant="solid" pad="sm">
        <p className="text-sm text-text-2">
          Seçilen gün: <span className="font-semibold text-text">{formatDateTr(gun, "long")}</span>. Takvimin üstünde yana kaydırmak ayı değiştirir, sekmeyi değil (data-swipe-lock).
        </p>
      </Card>
      <WeekBars days={GUNLER} limit={LIMIT} onSelect={(i) => toast(GUNLER[i]?.label ?? "")} />
    </TabPage>
  );
}

function KayitlarSekmesi() {
  const [liste, setListe] = useState(UZUN);
  const [ara, setAra] = useState("");
  const gorunen = liste.filter((k) => k.ad.toLocaleLowerCase("tr").includes(ara.toLocaleLowerCase("tr")));
  return (
    <TabPage onRefresh={() => new Promise((r) => setTimeout(r, 900))}>
      <Field value={ara} onChange={setAra} type="search" placeholder={tr.ortak.ara} left={<Search size={18} className="text-text-3" aria-hidden="true" />} />
      {gorunen.length ? (
        <Card variant="solid" pad="none" className="overflow-hidden">
          {gorunen.map((k) => (
            <SwipeRow
              key={k.id}
              onEdit={() => sheets.open("ornek", { ad: k.ad })}
              onDelete={() => {
                const onceki = liste;
                setListe((l) => l.filter((x) => x.id !== k.id));
                toast({ message: tr.ortak.silindi, action: { label: tr.ortak.geriAl, onClick: () => setListe(onceki) } });
              }}
            >
              <div className="bg-surface">
                <KayitSatiri k={k} />
              </div>
            </SwipeRow>
          ))}
        </Card>
      ) : (
        <EmptyState art="arama" title="Sonuç yok" text="Başka bir kelime dene." />
      )}
    </TabPage>
  );
}

function NovaSekmesi() {
  return (
    <TabPage scroll>
      <EmptyState art="nova" title="Nova hazırlanıyor" text="Yükleniyor durumu için iskelet satırlar aşağıda." action={<Button onClick={() => nav.push("parcalar")}>Parçaları aç</Button>} />
      <SkeletonRows count={3} />
    </TabPage>
  );
}

/* ---------- Üst ekranlar ---------- */

function Bolum({ ad, children }: { ad: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>{ad}</SectionLabel>
      {children}
    </section>
  );
}

function ParcalarEkrani(_: ScreenProps) {
  const { pref, setPref } = useTheme();
  const [lens, setLens] = useState(isLensEnabled());
  const [buyuk, setBuyuk] = useState(false);
  const [tur, setTur] = useState<"gider" | "gelir">("gider");
  const [cip, setCip] = useState("Market");
  const [metin, setMetin] = useState("");
  const [tutar, setTutar] = useState<Kurus | null>(64250);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sayfa, setSayfa] = useState<"" | "auto" | "half" | "full">("");
  const [deger, setDeger] = useState(1248050);

  return (
    <Screen title="Parçalar" right={<IconButton label="Dönüştür" onClick={() => nav.push("detay")}><Plus size={22} aria-hidden="true" /></IconButton>}>
      <Bolum ad="Görünüm">
        <Segmented<ThemePref>
          full
          label="Tema"
          value={pref}
          onChange={setPref}
          options={[
            { value: "light", label: tr.ortak.tema.gunduz },
            { value: "dark", label: tr.ortak.tema.gece },
            { value: "system", label: tr.ortak.tema.sistem },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Chip
            selected={lens}
            onClick={() => {
              setLensEnabled(!lens);
              setLens(!lens);
            }}
          >
            Kenar kırılması
          </Chip>
          <Chip
            selected={buyuk}
            onClick={() => {
              document.documentElement.style.fontSize = buyuk ? "" : "130%";
              setBuyuk(!buyuk);
            }}
          >
            Büyük yazı
          </Chip>
        </div>
      </Bolum>

      <Bolum ad="Logo ve imza">
        <Card className="flex flex-wrap items-center gap-5">
          <Logo variant="mark" height={44} />
          <Logo variant="horizontal" height={36} />
          <Logo variant="vertical" height={96} />
          <Logo variant="slogan" height={44} />
        </Card>
        <div className="flex justify-center py-1">
          <SeptimusImza />
        </div>
      </Bolum>

      <Bolum ad="Cam">
        <div className="grid grid-cols-2 gap-3">
          <Glass lens className="p-4 text-sm text-text">
            Şeffaf ton, kenar kırılmalı
          </Glass>
          <Glass tone="dense" lens className="p-4 text-sm text-text">
            Yoğun ton
          </Glass>
          <Glass className="p-4 text-sm text-text">Kırılmasız (iOS yedeği)</Glass>
          <Card variant="solid" className="text-sm text-text">
            Düz kart
          </Card>
        </div>
      </Bolum>

      <Bolum ad="Düğmeler">
        <div className="flex flex-wrap gap-2">
          <Button>{tr.ortak.kaydet}</Button>
          <Button variant="secondary">{tr.ortak.vazgec}</Button>
          <Button variant="text">{tr.ortak.duzenle}</Button>
          <Button variant="danger">{tr.ortak.sil}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            loading={yukleniyor}
            icon={<Plus size={18} aria-hidden="true" />}
            onClick={() => {
              setYukleniyor(true);
              setTimeout(() => setYukleniyor(false), 1200);
            }}
          >
            Yükleniyor durumu
          </Button>
          <IconButton label="Takvim" variant="tinted">
            <CalendarDays size={20} aria-hidden="true" />
          </IconButton>
          <IconButton label="Takvim" variant="glass">
            <CalendarDays size={20} aria-hidden="true" />
          </IconButton>
          <Spinner />
        </div>
        <Segmented value={tur} onChange={setTur} options={[{ value: "gider", label: "Gider" }, { value: "gelir", label: "Gelir" }]} full />
        <div className="scroll-x -mx-(--page-x) flex gap-2 px-(--page-x)" data-swipe-lock="">
          {["Market", "Yeme içme", "Toplu taşıma", "Kira", "Fatura", "Eğlence"].map((c) => (
            <Chip key={c} selected={cip === c} onClick={() => setCip(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </Bolum>

      <Bolum ad="Alanlar">
        <Field label="Açıklama" value={metin} onChange={setMetin} placeholder="Örnek kayıt" hint="En çok 500 karakter" maxLength={500} />
        <Field label="Not" value="" onChange={() => {}} error="Bu alan boş bırakılamaz" />
        <AmountField label="Tutar" value={tutar} onChange={setTutar} hint={tutar == null ? "Geçerli bir tutar gir" : formatMoney(tutar)} />
      </Bolum>

      <Bolum ad="Tutar">
        <Card variant="solid" className="flex flex-col gap-2">
          <Amount value={deger} size="hero" animate />
          <div className="flex flex-wrap items-center gap-4">
            <Amount value={64250} kind="expense" />
            <Amount value={5800000} kind="income" />
            <Amount value={-50000} size="lg" />
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDeger((d) => (d > 1000000 ? 284500 : 1248050))}>
            Sayarak değiş
          </Button>
        </Card>
      </Bolum>

      <Bolum ad="Grafik">
        <Card className="flex items-center gap-4">
          <Ring value={0.62} size={112} label="Dönemin yüzde 62'si geçti">
            <span className="text-xs text-text-2">Kalan</span>
            <Amount value={1248050} size="md" decimals={false} />
          </Ring>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <ProgressBar value={0.62} label="İlerleme" />
            <ProgressBar value={0.9} tone="warn" label="Sınıra yakın" />
            <ProgressBar value={0.35} tone="copper" label="Bakır" />
          </div>
        </Card>
        <Card>
          <WeekBars days={GUNLER} limit={LIMIT} />
        </Card>
      </Bolum>

      <Bolum ad="Katmanlar">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setSayfa("auto")}>
            Alt sayfa
          </Button>
          <Button variant="secondary" onClick={() => setSayfa("half")}>
            Yarım, genişler
          </Button>
          <Button variant="secondary" onClick={() => setSayfa("full")}>
            Tam boy
          </Button>
          <Button variant="secondary" onClick={() => sheets.open("ornek")}>
            Tuş takımı
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const ok = await confirm({ title: "Kayıt silinsin mi?", text: "Bu işlem geri alınamaz.", confirmLabel: tr.ortak.sil, danger: true });
              toast(ok ? tr.ortak.silindi : "Vazgeçildi");
            }}
          >
            Onay
          </Button>
          <Button variant="secondary" onClick={() => void inform({ title: "Bilgi", text: "Tek düğmeli kutu." })}>
            Bilgi
          </Button>
          <Button variant="secondary" onClick={() => toast(tr.ortak.kaydedildi)}>
            Toast
          </Button>
          <Button variant="secondary" onClick={() => toast.error(tr.ortak.hata.baglanti)}>
            Hata
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              resetTours();
              toast("İpuçları sıfırlandı");
            }}
          >
            İpuçlarını sıfırla
          </Button>
        </div>
      </Bolum>

      <Bolum ad="Boş durumlar">
        <div className="grid grid-cols-2 gap-2">
          {(["kayit", "takvim", "nova", "arama", "genel"] as const).map((a) => (
            <Card key={a} variant="solid" pad="none">
              <EmptyState art={a} title={a} className="px-2 py-4" />
            </Card>
          ))}
        </div>
      </Bolum>

      <Sheet
        open={sayfa !== ""}
        onClose={() => setSayfa("")}
        title="Örnek sayfa"
        subtitle="Aşağı çek, perdeye dokun ya da geri tuşuna bas."
        size={sayfa === "" ? "auto" : sayfa}
        expandable={sayfa === "half"}
        footer={
          <Button full onClick={() => setSayfa("")}>
            {tr.ortak.tamam}
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Açıklama" value={metin} onChange={setMetin} placeholder="Klavye açılınca sayfa yukarı çıkar" />
          <div data-tour="sayfa-hedef">
            <Card variant="flat" pad="sm">
              <p className="text-sm text-text-2">Alt sayfa içindeki tur hedefi.</p>
            </Card>
          </div>
          {sayfa !== "auto" ? ORNEK.concat(ORNEK).map((k, i) => <KayitSatiri key={i} k={k} />) : null}
          <TourInfoButton id="vitrin-sayfa" steps={[{ target: "sayfa-hedef", title: "Alt sayfada hedef", text: "Dönüşümlü kapsayıcı içindeki hedef de doğru ölçülür." }]} />
        </div>
      </Sheet>
    </Screen>
  );
}

function DetayEkrani(_: ScreenProps) {
  const [not, setNot] = useState("");
  return (
    <Screen
      title="İkinci ekran"
      footer={
        <Button full onClick={() => nav.popToRoot()}>
          Köke dön
        </Button>
      }
    >
      <Card>
        <p className="text-sm text-text-2">Sol kenardan sağa çekerek geri dön. Android geri tuşu da aynı yığını kullanır.</p>
      </Card>
      <Card variant="solid" pad="none" className="overflow-hidden">
        {ORNEK.map((k) => (
          <SwipeRow key={k.id} onDelete={() => toast(tr.ortak.silindi)} onEdit={() => toast(tr.ortak.duzenle)}>
            <div className="bg-surface">
              <KayitSatiri k={k} />
            </div>
          </SwipeRow>
        ))}
      </Card>
      <Field label="Not" value={not} onChange={setNot} multiline placeholder="Deneme" />
    </Screen>
  );
}

/* ---------- Ortak alt sayfa ---------- */

function OrnekSayfa({ open, close, params }: SheetScreenProps) {
  const [metin, setMetin] = useState("");
  const [gun, setGun] = useState<LocalDate>(BUGUN);
  const [takvim, setTakvim] = useState(false);
  const sonuc = parseAmount(metin);
  return (
    <>
      <Sheet
        open={open}
        onClose={close}
        title={typeof params.ad === "string" ? params.ad : tr.ortak.kayitEkle}
        footer={
          <Button
            full
            disabled={!sonuc.ok}
            onClick={() => {
              toast(tr.ortak.kaydedildi);
              close();
            }}
          >
            {tr.ortak.kaydet}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="num text-center text-4xl font-medium text-text" aria-live="polite">
            ₺{keypadDisplay(metin)}
          </p>
          <div className="flex justify-center">
            <Chip icon={<CalendarDays size={16} aria-hidden="true" />} onClick={() => setTakvim(true)}>
              {gun === BUGUN ? tr.ortak.bugun : formatDateTr(gun, "dayMonth")}
            </Chip>
          </div>
          <Keypad value={metin} onChange={setMetin} />
        </div>
      </Sheet>
      <DatePickSheet open={takvim} onClose={() => setTakvim(false)} value={gun} onChange={setGun} today={BUGUN} max={addDays(BUGUN, 365)} />
    </>
  );
}

export default function Vitrin() {
  return (
    <>
      <AppShell
        tabs={{ ozet: OzetSekmesi, takvim: TakvimSekmesi, kayitlar: KayitlarSekmesi, nova: NovaSekmesi }}
        screens={{ parcalar: ParcalarEkrani, detay: DetayEkrani }}
        sheets={{ ornek: OrnekSayfa }}
        onAdd={() => sheets.open("ornek")}
        onProfile={() => nav.push("parcalar")}
      />
      <UiHost />
    </>
  );
}
