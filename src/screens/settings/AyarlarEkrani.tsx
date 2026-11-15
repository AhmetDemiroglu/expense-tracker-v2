/* Ayarlar ana listesi (üst bardaki profil düğmesinden açılır). */
import { CalendarClock, Info, Lightbulb, Palette, Repeat, ShieldCheck, UserRound, Database } from "lucide-react";
import { useOturum } from "@/data";
import { tr } from "@/metin";
import { Screen, nav, sheets } from "@/shell";
import { Button, Card, ListRow, NovaAvatar, Section, TourInfoButton, resetTours, toast } from "@/ui";
import { Ayirac } from "./ortak";

export function AyarlarEkrani() {
  const t = tr.ayarlar;
  const kullanici = useOturum((s) => s.kullanici);
  const misafir = kullanici?.misafir ?? true;

  return (
    <Screen title={t.baslik} right={<TourInfoButton id="ayarlar" steps={t.tur.ayarlar} />}>
      <Card variant="glass" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <NovaAvatar mood={misafir ? "selam" : "mutlu"} size={48} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-semibold text-text">{misafir ? t.misafirBaslik : (kullanici?.ad ?? kullanici?.eposta ?? "")}</span>
            <span className="text-sm text-text-3">{misafir ? t.misafirMetin : (kullanici?.eposta ?? "")}</span>
          </div>
        </div>
        {misafir ? (
          <Button full onClick={() => sheets.open("giris")}>
            {t.girisYap}
          </Button>
        ) : null}
      </Card>

      <Section variant="solid" pad="none">
        <div data-tour="ayarlar-donem">
          <ListRow icon={<CalendarClock size={20} aria-hidden="true" />} title={t.liste.donemler.baslik} subtitle={t.liste.donemler.alt} chevron onClick={() => nav.push("donemler")} />
        </div>
        <Ayirac />
        <div data-tour="ayarlar-duzenli">
          <ListRow icon={<Repeat size={20} aria-hidden="true" />} title={t.liste.duzenli.baslik} subtitle={t.liste.duzenli.alt} chevron onClick={() => nav.push("duzenli-odemeler")} />
        </div>
        <Ayirac />
        <div data-tour="ayarlar-nova">
          <ListRow icon={<UserRound size={20} aria-hidden="true" />} title={t.liste.nova.baslik} subtitle={t.liste.nova.alt} chevron onClick={() => nav.push("nova-profili")} />
        </div>
      </Section>

      <Section variant="solid" pad="none">
        <div data-tour="ayarlar-gorunum">
          <ListRow icon={<Palette size={20} aria-hidden="true" />} title={t.liste.gorunum.baslik} subtitle={t.liste.gorunum.alt} chevron onClick={() => nav.push("gorunum")} />
        </div>
        <Ayirac />
        <ListRow icon={<ShieldCheck size={20} aria-hidden="true" />} title={t.liste.hesap.baslik} subtitle={t.liste.hesap.alt} chevron onClick={() => nav.push("hesap")} />
        <Ayirac />
        <ListRow icon={<Database size={20} aria-hidden="true" />} title={t.liste.veriler.baslik} subtitle={t.liste.veriler.alt} chevron onClick={() => nav.push("verilerim")} />
      </Section>

      <Section variant="solid" pad="none">
        <ListRow
          icon={<Lightbulb size={20} aria-hidden="true" />}
          title={t.liste.ipuclari.baslik}
          subtitle={t.liste.ipuclari.alt}
          onClick={() => {
            resetTours();
            toast(t.ipuclariSifirlandi);
          }}
        />
        <Ayirac />
        <ListRow icon={<Info size={20} aria-hidden="true" />} title={t.liste.hakkinda.baslik} subtitle={t.liste.hakkinda.alt} chevron onClick={() => nav.push("hakkinda")} />
      </Section>
    </Screen>
  );
}
