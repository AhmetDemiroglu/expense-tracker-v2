/* Hakkında: sürüm (yapı bilgisinden), gizlilik ve koşullar, iletişim, imza. "Geliştirici" başlığı yok. */
import { useEffect, useState } from "react";
import { ExternalLink, Mail, ShieldCheck, FileText } from "lucide-react";
import { Logo, SeptimusImza } from "@/brand";
import { tr } from "@/metin";
import { Screen } from "@/shell";
import { uygulamaSurumu } from "@/services/platform";
import { Card, ListRow, Section } from "@/ui";
import { Ayirac } from "./ortak";

export function HakkindaEkrani() {
  const t = tr.ayarlar.hakkinda;
  const [surum, setSurum] = useState<string>("");
  useEffect(() => {
    let iptal = false;
    void uygulamaSurumu().then((s) => {
      if (!iptal) setSurum(s);
    });
    return () => {
      iptal = true;
    };
  }, []);

  return (
    <Screen title={t.baslik}>
      <Card variant="glass" className="flex flex-col items-center gap-3 py-5">
        <Logo variant="vertical-slogan" height={128} />
        <p className="text-sm text-text-3">
          {t.surum} {surum}
        </p>
      </Card>
      <Section variant="solid" pad="none">
        <a href={t.gizlilikUrl} target="_blank" rel="noreferrer" className="block">
          <ListRow icon={<ShieldCheck size={20} aria-hidden="true" />} title={t.gizlilik} right={<ExternalLink size={16} className="text-text-3" aria-hidden="true" />} />
        </a>
        <Ayirac />
        <a href={t.kosullarUrl} target="_blank" rel="noreferrer" className="block">
          <ListRow icon={<FileText size={20} aria-hidden="true" />} title={t.kosullar} right={<ExternalLink size={16} className="text-text-3" aria-hidden="true" />} />
        </a>
        <Ayirac />
        <a href={`mailto:${t.iletisimAdres}`} className="block">
          <ListRow icon={<Mail size={20} aria-hidden="true" />} title={t.iletisim} subtitle={t.iletisimAdres} />
        </a>
      </Section>
      <Card variant="solid" className="flex justify-center py-4">
        <SeptimusImza size={20} />
      </Card>
    </Screen>
  );
}
