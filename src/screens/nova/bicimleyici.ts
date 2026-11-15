/* Küçük ve güvenli biçimlendirici: yalnız paragraf, madde listesi ve **kalın**. HTML üretmez, AST döner;
   ekran bunu React düğümlerine çevirir (dangerouslySetInnerHTML yok). Saf, testli. */

export interface Parca {
  /** k: kalın, m: düz metin */
  t: "k" | "m";
  s: string;
}
export type Satir = Parca[];
export type Blok =
  | { t: "p"; satirlar: Satir[] }
  | { t: "ul"; ogeler: Satir[] }
  | { t: "ol"; ogeler: Satir[] };

const KALIN = /\*\*([^*\n]+?)\*\*/g;

export function satirCoz(s: string): Satir {
  const out: Satir = [];
  let son = 0;
  for (const m of s.matchAll(KALIN)) {
    const i = m.index ?? 0;
    if (i > son) out.push({ t: "m", s: s.slice(son, i) });
    out.push({ t: "k", s: m[1] ?? "" });
    son = i + m[0].length;
  }
  if (son < s.length) out.push({ t: "m", s: s.slice(son) });
  return out.length ? out : [{ t: "m", s }];
}

const MADDE = /^\s*(?:[-*•])\s+(.*)$/;
const NUMARALI = /^\s*\d{1,2}[.)]\s+(.*)$/;
const BASLIK = /^\s*#{1,6}\s+(.*)$/;

export function bicimCoz(metin: string): Blok[] {
  const bloklar: Blok[] = [];
  let acik: Blok | null = null;
  const kapat = () => {
    if (acik) bloklar.push(acik);
    acik = null;
  };
  for (const ham of metin.replace(/\r\n?/g, "\n").split("\n")) {
    const satir = ham.trimEnd();
    if (!satir.trim()) {
      kapat();
      continue;
    }
    const madde = MADDE.exec(satir);
    const num = madde ? null : NUMARALI.exec(satir);
    if (madde || num) {
      const tur = madde ? "ul" : "ol";
      const icerik = satirCoz((madde ?? num)?.[1] ?? "");
      if (acik && acik.t === tur) acik.ogeler.push(icerik);
      else {
        kapat();
        acik = { t: tur, ogeler: [icerik] };
      }
      continue;
    }
    const baslik = BASLIK.exec(satir);
    const govde: Satir = baslik ? [{ t: "k", s: (baslik[1] ?? "").replace(/\*\*/g, "") }] : satirCoz(satir.trim());
    if (acik && acik.t === "p") acik.satirlar.push(govde);
    else {
      kapat();
      acik = { t: "p", satirlar: [govde] };
    }
  }
  kapat();
  return bloklar;
}

/** Yazma efekti için: toplam n karaktere kadar gösterilen bloklar. Biçim (kalın, liste) bozulmaz. */
export function kisalt(bloklar: readonly Blok[], n: number): Blok[] {
  let kalan = Math.max(0, n);
  const satirKes = (s: Satir): Satir => {
    const out: Satir = [];
    for (const p of s) {
      if (kalan <= 0) break;
      const kes = p.s.slice(0, kalan);
      kalan -= kes.length;
      out.push({ t: p.t, s: kes });
    }
    return out;
  };
  const out: Blok[] = [];
  for (const b of bloklar) {
    if (kalan <= 0) break;
    if (b.t === "p") {
      const satirlar: Satir[] = [];
      for (const s of b.satirlar) {
        if (kalan <= 0) break;
        satirlar.push(satirKes(s));
      }
      out.push({ t: "p", satirlar });
    } else {
      const ogeler: Satir[] = [];
      for (const s of b.ogeler) {
        if (kalan <= 0) break;
        ogeler.push(satirKes(s));
      }
      out.push({ t: b.t, ogeler });
    }
  }
  return out;
}

/** Bloklardaki toplam karakter (yazma efektinin süresi için). */
export function uzunluk(bloklar: readonly Blok[]): number {
  let n = 0;
  for (const b of bloklar) {
    const satirlar = b.t === "p" ? b.satirlar : b.ogeler;
    for (const s of satirlar) for (const p of s) n += p.s.length;
  }
  return n;
}
