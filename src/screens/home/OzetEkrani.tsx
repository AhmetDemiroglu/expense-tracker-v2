/* Özet (kök sekme). Tek ekrana sığar, yalnız son hareketler bölümü kendi içinde kayar.
   Sayılar: useOzet / useHafta (P4) ya da seçilen geçmiş dönem için çekirdeğin computeBudget çıktısı. Ekranda formül yok. */
import { useState } from "react";
import { CalendarPlus, RotateCcw } from "lucide-react";
import { WEEKDAY_NAMES_TR, WEEKDAY_SHORT_TR, formatDateTr, formatMoney, isInPeriod, type BudgetSnapshot, type DayInfo, type Period } from "@/core";
import { useBugun, useEtkinIslemler, useHafta, useVeri } from "@/data";
import { tr } from "@/metin";
import { TabPage, nav, sheets, type TabProps } from "@/shell";
import {
  Amount,
  Button,
  Card,
  EmptyState,
  NovaAvatar,
  ProgressBar,
  ScreenHeader,
  Section,
  Skeleton,
  SkeletonRows,
  TourInfoButton,
  WeekBars,
  cn,
  type NovaMood,
  type TourStep,
  type WeekBarDay,
} from "@/ui";
import { DagilimSayfasi, type DagilimTuru } from "./DagilimSayfasi";
import { YeniDonemSayfasi } from "./YeniDonemSayfasi";
import { useCevrimdisi, useGorunenDonem } from "./ortak";
import { CevrimdisiSerit, IslemSatiri } from "./parcalar";
import { useGorunenButce } from "./gorunenButce";

const OZET_TURU: TourStep[] = tr.ozet.tur.map((a) => ({ ...a }));

function aralik(p: Pick<Period, "start" | "end">): string {
  return tr.ozet.donemAraligi(formatDateTr(p.start, "dayMonth"), formatDateTr(p.end, "dayMonth"));
}

export function OzetEkrani(_: TabProps) {
  const durum = useVeri((s) => s.durum);
  const ayarDurumu = useVeri((s) => s.ayarDurumu);
  const { donem, aktifMi, ozet } = useGorunenButce();
  const cevrimdisi = useCevrimdisi();
  const [dagilim, setDagilim] = useState<DagilimTuru | null>(null);
  const [yeniDonem, setYeniDonem] = useState(false);

  const header = (
    <div data-tour="ozet-donem">
    <ScreenHeader
      title={donem ? donem.name : tr.ozet.baslik}
      subtitle={donem ? aralik(donem) : undefined}
      onTitleClick={donem ? () => sheets.open("donem-sec") : undefined}
      right={donem ? <TourInfoButton id="ozet" steps={OZET_TURU} /> : undefined}
    />
    </div>
  );

  let govde;
  if (durum === "yukleniyor" || durum === "bos") {
    govde = <Yukleniyor />;
  } else if (durum === "hata") {
    govde = (
      <EmptyState
        mood="uzgun"
        title={tr.ozet.yuklenemedi}
        text={tr.ortak.hata.genel}
        action={
          <Button variant="secondary" icon={<RotateCcw size={18} aria-hidden="true" />} onClick={() => void useVeri.getState().yenile()}>
            {tr.ortak.tekrarDene}
          </Button>
        }
      />
    );
  } else if (!donem || !ozet) {
    govde =
      ayarDurumu === "bilinmiyor" ? (
        <EmptyState mood="uyku" title={tr.ozet.baglantiBekleniyor} text={tr.ozet.baglantiBekleniyorMetin} />
      ) : (
        <EmptyState
          mood="selam"
          title={tr.ozet.donemYok}
          text={tr.ozet.donemYokMetin}
          action={<Button onClick={() => nav.push("ilk-kurulum")}>{tr.ozet.kurulumaBasla}</Button>}
        />
      );
  } else {
    govde = (
      <>
        {aktifMi ? <AnaKart ozet={ozet} onYeniDonem={() => setYeniDonem(true)} /> : <GecmisKart ozet={ozet} />}
        <Uclu ozet={ozet} onSec={setDagilim} />
        <SonHareketler donem={donem} />
      </>
    );
  }

  return (
    <TabPage header={header}>
      {cevrimdisi && durum === "hazir" ? <CevrimdisiSerit metin={tr.ozet.cevrimdisi} /> : null}
      {govde}
      <DagilimSayfasi tur={dagilim} onTur={setDagilim} onClose={() => setDagilim(null)} />
      <YeniDonemSayfasi open={yeniDonem} onClose={() => setYeniDonem(false)} />
    </TabPage>
  );
}

/* ---------- Yükleniyor ---------- */

function Yukleniyor() {
  return (
    <>
      <Card className="flex shrink-0 flex-col gap-3" aria-busy="true" aria-label={tr.ortak.yukleniyor}>
        <Skeleton w="40%" h={14} />
        <Skeleton w="70%" h={40} />
        <Skeleton w="90%" h={14} />
        <Skeleton h={8} />
      </Card>
      <div className="grid shrink-0 grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Card key={i} pad="sm" className="flex flex-col gap-2">
            <Skeleton w="60%" h={12} />
            <Skeleton w="80%" h={16} />
          </Card>
        ))}
      </div>
      <Section title={tr.ozet.sonHareketler} scroll>
        <SkeletonRows count={3} />
      </Section>
    </>
  );
}

/* ---------- Aktif dönemin ana kartı ---------- */

const DURUM_RUH: Record<BudgetSnapshot["todayStatus"], NovaMood> = { good: "mutlu", warning: "uyari", over: "uyari", deficit: "uyari", none: "selam" };

function haftaGunleri(hafta: readonly DayInfo[]): WeekBarDay[] {
  return hafta.map((g, i) => ({
    label: WEEKDAY_SHORT_TR[i] ?? "",
    value: g.spent,
    isToday: g.isToday,
    future: g.isFuture,
    status: g.status === "deficit" ? "over" : g.status,
    a11y: tr.ozet.haftaGunu(WEEKDAY_NAMES_TR[i] ?? "", formatMoney(g.spent)),
  }));
}

function MiniDeger({ etiket, children, className }: { etiket: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="text-xs text-text-2">{etiket}</span>
      <span className="flex min-h-6 items-center">{children}</span>
    </div>
  );
}

function AnaKart({ ozet, onYeniDonem }: { ozet: BudgetSnapshot; onYeniDonem: () => void }) {
  const hafta = useHafta();
  const acik = ozet.balance < 0 || (ozet.dailyLimit !== null && ozet.dailyLimit < 0);

  if (ozet.phase === "ended") {
    const artida = ozet.balance >= 0;
    return (
      <Card lens data-tour="ozet-kart" className="flex shrink-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium text-text-2">{tr.ozet.bakiye}</span>
            <Amount value={ozet.balance} size="hero" animate />
            <span className="text-sm text-text-2">
              {tr.ozet.bitti}. {artida ? tr.ozet.bittiArtida : tr.ozet.bittiEksi}
            </span>
          </div>
          <NovaAvatar mood={artida ? "basari" : "uzgun"} size={52} />
        </div>
        <Button full icon={<CalendarPlus size={18} aria-hidden="true" />} onClick={onYeniDonem}>
          {tr.ozet.yeniDonemBaslat}
        </Button>
      </Card>
    );
  }

  const once = ozet.phase === "before";
  const bugunAsim = ozet.todayRemaining !== null && ozet.todayRemaining < 0;
  const durumMetni = once
    ? tr.ozet.baslamadiDurum
    : acik
      ? tr.ozet.durum.acik
      : ozet.todaySpent === 0
        ? tr.ozet.durum.hic
        : ozet.todayStatus === "over"
          ? tr.ozet.durum.asim
          : ozet.todayStatus === "warning"
            ? tr.ozet.durum.uyari
            : tr.ozet.durum.iyi;
  const ruh: NovaMood = once ? "uyku" : acik ? "uyari" : ozet.todaySpent === 0 ? "selam" : DURUM_RUH[ozet.todayStatus];

  return (
    <Card lens data-tour="ozet-kart" className="flex shrink-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium text-text-2">{acik ? tr.ozet.acik : tr.ozet.kalanButce}</span>
          <Amount value={ozet.balance} size="hero" animate />
        </div>
        {hafta && !once ? (
          <div data-tour="ozet-hafta" className="shrink-0 pt-1">
            <WeekBars days={haftaGunleri(hafta)} limit={ozet.dailyLimit !== null && ozet.dailyLimit > 0 ? ozet.dailyLimit : null} compact height={64} />
          </div>
        ) : (
          <NovaAvatar mood="uyku" size={48} />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniDeger etiket={once ? tr.ozet.ilkGunLimiti : tr.ozet.gunlukLimit}>
          {ozet.dailyLimit !== null ? <Amount value={ozet.dailyLimit} size="md" decimals={false} animate /> : null}
        </MiniDeger>
        {once ? (
          <MiniDeger etiket={tr.ozet.baslangic}>
            <span className="text-base font-medium text-text">{tr.ozet.gunSonra(ozet.daysUntilStart)}</span>
          </MiniDeger>
        ) : (
          <MiniDeger etiket={bugunAsim ? tr.ozet.bugunAsim : tr.ozet.bugunKalan}>
            {ozet.todayRemaining !== null ? (
              <Amount value={ozet.todayRemaining} kind={bugunAsim ? "expense" : "neutral"} size="md" decimals={false} animate />
            ) : null}
          </MiniDeger>
        )}
        <MiniDeger etiket={tr.ozet.kalanGun}>
          <span className="num text-base font-medium text-text">{once ? ozet.totalDays : ozet.remainingDays}</span>
        </MiniDeger>
      </div>

      <div className="flex flex-col gap-1.5">
        <ProgressBar value={ozet.totalDays > 0 ? ozet.elapsedDays / ozet.totalDays : 0} tone="copper" label={tr.ozet.donemIlerleme} />
        <div className="flex items-center gap-2">
          <NovaAvatar mood={ruh} size={28} />
          <span className="text-sm text-text-2" role="status">
            {durumMetni}
          </span>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Geçmiş ya da gelecek dönem: yalnız özet ---------- */

function GecmisKart({ ozet }: { ozet: BudgetSnapshot }) {
  const sec = useGorunenDonem((s) => s.sec);
  return (
    <Card lens data-tour="ozet-kart" className="flex shrink-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium text-text-2">{ozet.phase === "before" ? tr.ozet.gelecekDonem : tr.ozet.gecmisDonem}</span>
          <Amount value={ozet.balance} size="hero" animate />
          <span className="text-sm text-text-2">{tr.ozet.gecmisMetin}</span>
        </div>
        <NovaAvatar mood={ozet.balance >= 0 ? "mutlu" : "uzgun"} size={48} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MiniDeger etiket={tr.ozet.tasarruf}>
          <span className="num text-base font-medium text-text">{ozet.savingsRate !== null ? tr.ozet.tasarrufYuzde(ozet.savingsRate) : "-"}</span>
        </MiniDeger>
        <MiniDeger etiket={tr.ozet.donemSuresi}>
          <span className="text-base font-medium text-text">{tr.ozet.gunSayisi(ozet.totalDays)}</span>
        </MiniDeger>
      </div>
      <Button variant="secondary" full onClick={() => sec(null)}>
        {tr.ozet.aktifeDon}
      </Button>
    </Card>
  );
}

/* ---------- Gelir, gider, planlı ---------- */

function Uclu({ ozet, onSec }: { ozet: BudgetSnapshot; onSec: (t: DagilimTuru) => void }) {
  const kutular: { tur: DagilimTuru; ad: string; deger: number; kind: "income" | "expense" | "neutral" }[] = [
    { tur: "income", ad: tr.ozet.gelir, deger: ozet.totalIncome, kind: "income" },
    { tur: "expense", ad: tr.ozet.gider, deger: ozet.discretionary, kind: "expense" },
    { tur: "planned", ad: tr.ozet.planli, deger: ozet.planned, kind: "neutral" },
  ];
  return (
    <div data-tour="ozet-uclu" className="grid shrink-0 grid-cols-3 gap-2">
      {kutular.map((k) => (
        <Card key={k.tur} pad="sm" onClick={() => onSec(k.tur)} className="flex min-h-14 min-w-0 flex-col gap-0.5">
          <span className="text-xs text-text-2">{k.ad}</span>
          <Amount value={k.deger} kind={k.kind} size="sm" decimals={false} animate />
        </Card>
      ))}
    </div>
  );
}

/* ---------- Son 3 hareket ---------- */

function SonHareketler({ donem }: { donem: Period }) {
  const bugun = useBugun();
  const islemler = useEtkinIslemler();
  const son = islemler.filter((t) => t.date <= bugun && isInPeriod(donem, t.date)).slice(0, 3);
  return (
    <Section
      title={tr.ozet.sonHareketler}
      pad="none"
      scroll
      right={
        <Button variant="text" size="sm" onClick={() => nav.setTab("kayitlar")}>
          {tr.ozet.tumu}
        </Button>
      }
    >
      {son.length ? (
        son.map((t) => <IslemSatiri key={t.id} t={t} bugun={bugun} onClick={() => sheets.open("kayit-ekle", { id: t.id })} />)
      ) : (
        <EmptyState
          surface="none"
          size={72}
          mood="selam"
          title={tr.ozet.hareketYok}
          text={tr.ozet.hareketYokMetin}
          action={<Button onClick={() => sheets.open("kayit-ekle")}>{tr.ozet.ilkKayit}</Button>}
        />
      )}
    </Section>
  );
}
