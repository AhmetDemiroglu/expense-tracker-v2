// Fintel marka çizimleri: simge, ikon ve yazılı logo SVG üretimi.
// Seçim (2026-11-15): logo "Lira F", tema "Lacivert ve bakır", ikon dolu renk,
// isim "fintel" (Bricolage Grotesque 800, küçük harf, tek renk), slogan "Evin hesabı, cebinde."
import opentype from "opentype.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const loadFont = (pkg, file) => {
  const b = readFileSync(path.join(here, "node_modules", "@fontsource", pkg, "files", file));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
// Her yazı tipi iki dosya: latin ve latin-ext (ı, ğ, ş, İ ikincisinde).
const WORD = [loadFont("bricolage-grotesque", "bricolage-grotesque-latin-800-normal.woff"), loadFont("bricolage-grotesque", "bricolage-grotesque-latin-ext-800-normal.woff")];
const SANS = [loadFont("dm-sans", "dm-sans-latin-600-normal.woff"), loadFont("dm-sans", "dm-sans-latin-ext-600-normal.woff")];

export const BRAND = {
  name: "fintel",
  title: "Fintel",
  tagline: "Evin hesabı, cebinde.",
  iconBg: ["#27396D", "#0F1834"],
  iconBgDark: ["#161E36", "#070A14"],
  onBrand: { a: ["#F8E2BE", "#D9A566"], pop: "#FFFFFF" },
  light: { a: ["#27396D", "#0F1834"], pop: "#D08B3E" },
  dark: { a: ["#F0C28C", "#D99A52"], pop: "#FFFFFF" },
  ink: "#111830", acc: "#1B2A52", copper: "#D08B3E",
  inkDark: "#F5F7F6", accDark: "#E3A862",
  splash: "#F6F5F1", splashDark: "#0A0E1C",
};

let uid = 0;
const lg = (id, c, x1, y1, x2, y2) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>`;

// Yuvarlak uçlu çubuk: (x1,y1) ile (x2,y2) arası, kalınlık w. Stroke yerine dolu şekil: her yerde aynı çizilir.
function bar(x1, y1, x2, y2, w, fill) {
  const L = Math.hypot(x2 - x1, y2 - y1), ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const r = (n) => +n.toFixed(3);
  return `<rect x="${r(x1 - w / 2)}" y="${r(y1 - w / 2)}" width="${r(L + w)}" height="${r(w)}" rx="${r(w / 2)}" transform="rotate(${r(ang)} ${r(x1)} ${r(y1)})" fill="${fill}"/>`;
}

// Lira F ölçüleri (100x100 kutu): Ahmet'in seçtiği taslakla aynı iskelet. Gövde iki kolu da keser (lira işareti gibi),
// kollar aynı eğimde. Görünen kutu x 17.5..82.5, y 9.5..90.5: kutuya ortalı.
const W = 13, GAP = 2.4;
const STEM = [41, 16, 41, 84];
const TOP = [24, 38, 76, 20];
const LOW = [24, 60, 67, 45.1];
const SHIFT = "translate(0 0)";
// Görünen kutunun 100'lük kutudaki payı: yazılı logoda hizalama için.
const VIS = { x: 0.175, w: 0.65, y: 0.095, h: 0.81 };

/**
 * Simge. variant: onBrand | light | dark | mono
 * Gövde ve üst kol tek renk. Alt kol ikinci renkte ve gövdenin önünden geçer: çevresinde ince boşluk var.
 */
export function markInner(variant, opts = {}) {
  const id = `fm${++uid}`;
  const mono = variant === "mono";
  const c = mono ? null : BRAND[variant];
  const main = mono ? opts.monoColor || "#FFFFFF" : `url(#${id}a)`;
  const pop = mono ? opts.monoColor || "#FFFFFF" : c.pop;
  const defs =
    (mono ? "" : lg(`${id}a`, c.a, 26, 10, 78, 90)) +
    `<mask id="${id}k" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff"/>${bar(...((opts.geo && opts.geo.low) || LOW), W + GAP * 2, "#000")}</mask>`;
  // opts.geo: karşılaştırma panosu için iskelet denemesi { stem, top, low, shift }
  const G = opts.geo || {};
  const stem = G.stem || STEM, top = G.top || TOP, low = G.low || LOW;
  const body =
    `<g transform="${G.shift || SHIFT}"><g mask="url(#${id}k)">${bar(...stem, W, main)}${bar(...top, W, main)}</g>${bar(...low, W, pop)}</g>`;
  return { defs, body };
}

export function markSvg(variant, size, opts = {}) {
  const m = markInner(variant, opts);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${size ? ` width="${size}" height="${size}"` : ""}><defs>${m.defs}</defs>${m.body}</svg>`;
}

// Simgenin ikon karesindeki ölçeği. 0.8: simge yüksekliğin ~%65'i, genişliğin ~%52'si.
export const ICON_SCALE = 0.8;
// Android uyarlanabilir ön katmanda simge kutusu (108 birim). 62: en uç nokta 66dp güvenli dairenin içinde.
export const ADAPTIVE_BOX = 62;

/** Kare uygulama ikonu. shape: square | rounded | circle. tone: brand | dark */
export function iconSvg({ size = 1024, shape = "square", tone = "brand", scale = ICON_SCALE, geo = null } = {}) {
  const id = `fi${++uid}`;
  const bg = tone === "dark" ? BRAND.iconBgDark : BRAND.iconBg;
  const m = markInner(tone === "dark" ? "dark" : "onBrand", { geo });
  const clip = shape === "rounded" ? `<clipPath id="${id}s"><rect x="4" y="4" width="92" height="92" rx="21"/></clipPath>` : shape === "circle" ? `<clipPath id="${id}s"><circle cx="50" cy="50" r="46"/></clipPath>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"><defs>${m.defs}${clip}` +
    lg(`${id}bg`, bg, 0, 0, 100, 100) +
    `<radialGradient id="${id}h" cx="0.26" cy="0" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="${tone === "dark" ? 0.08 : 0.2}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<filter id="${id}f" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1.6" stdDeviation="2" flood-color="#03060F" flood-opacity=".35"/></filter>` +
    `</defs><g${clip ? ` clip-path="url(#${id}s)"` : ""}><rect width="100" height="100" fill="url(#${id}bg)"/><rect width="100" height="100" fill="url(#${id}h)"/>` +
    `<g filter="url(#${id}f)"><g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${m.body}</g></g></g></svg>`
  );
}

export function adaptiveBgSvg(size) {
  const id = `fab${++uid}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}"><defs>${lg(id, BRAND.iconBg, 0, 0, 108, 108)}<radialGradient id="${id}h" cx="0.3" cy="0.12" r="0.85"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="108" height="108" fill="url(#${id})"/><rect width="108" height="108" fill="url(#${id}h)"/></svg>`;
}
export function adaptiveFgSvg(size, { mono = false, box = ADAPTIVE_BOX } = {}) {
  const m = markInner(mono ? "mono" : "onBrand");
  const off = (108 - box) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}"><defs>${m.defs}</defs><g transform="translate(${off} ${off}) scale(${box / 100})">${m.body}</g></svg>`;
}
/** Düz ya da saydam zemin üstünde ortalı simge (açılış ekranı). */
export function centeredMarkSvg(variant, size, { canvas = 100, box = 60, bg = null } = {}) {
  const m = markInner(variant);
  const off = (canvas - box) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}" width="${size}" height="${size}"><defs>${m.defs}</defs>${bg ? `<rect width="${canvas}" height="${canvas}" fill="${bg}"/>` : ""}<g transform="translate(${off} ${off}) scale(${box / 100})">${m.body}</g></svg>`;
}

// Yazı: harf harf yol. fonts: sırayla denenir, harfi içeren ilk dosya kullanılır.
export function textPath(fonts, text, size, tracking = 0) {
  let d = "", cx = 0, x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity, prev = null;
  for (const ch of text) {
    const font = fonts.find((f) => f.charToGlyphIndex(ch) > 0) || fonts[0];
    const g = font.charToGlyph(ch);
    if (prev && prev.font === font) cx += (font.getKerningValue(prev.g, g) / font.unitsPerEm) * size;
    const p = g.getPath(cx, 0, size);
    d += p.toPathData(2);
    if (p.commands.length) { const b = p.getBoundingBox(); x1 = Math.min(x1, b.x1); y1 = Math.min(y1, b.y1); x2 = Math.max(x2, b.x2); y2 = Math.max(y2, b.y2); }
    cx += (g.advanceWidth / font.unitsPerEm) * size + tracking * size;
    prev = { font, g };
  }
  return { d, x1, y1, x2, y2, width: x2 - x1, height: y2 - y1 };
}

/**
 * Yazılı logo. layout: h (yatay) | v (dikey). theme: light | dark.
 * withMark: false ise yalnız yazı. tagline: true ise slogan eklenir.
 */
export function lockupSvg({ layout = "h", theme = "light", withMark = true, tagline = false, height = null } = {}) {
  const dark = theme === "dark";
  const ink = dark ? BRAND.inkDark : BRAND.ink;
  const F = 100;
  const wm = textPath(WORD, BRAND.name, F, -0.04);
  const tg = tagline ? textPath(SANS, BRAND.tagline, 0.3 * F, 0.005) : null;
  const tgGap = 0.24 * F;
  const textH = wm.height + (tg ? tgGap + tg.height : 0);
  const m = withMark ? markInner(dark ? "dark" : "light") : null;
  let parts = "", Wd, Hd;
  const word = (x, top) => `<path transform="translate(${(x - wm.x1).toFixed(2)} ${(top - wm.y1).toFixed(2)})" fill="${ink}" d="${wm.d}"/>`;
  const tag = (x, top) => `<path transform="translate(${(x - tg.x1).toFixed(2)} ${(top - tg.y1).toFixed(2)})" fill="${ink}" opacity=".68" d="${tg.d}"/>`;

  if (layout === "h") {
    const M = withMark ? 1.5 * F : 0;
    const x = withMark ? M * VIS.w + 0.3 * F : 0;
    Hd = Math.max(M, textH);
    const top = (Hd - textH) / 2;
    if (withMark) parts += `<g transform="translate(${(-M * VIS.x).toFixed(2)} ${((Hd - M) / 2).toFixed(2)}) scale(${M / 100})">${m.body}</g>`;
    parts += word(x, top);
    if (tg) parts += tag(x + 0.02 * F, top + wm.height + tgGap);
    Wd = x + Math.max(wm.width, tg ? tg.width + 0.02 * F : 0);
  } else {
    const M = withMark ? 2.5 * F : 0;
    Wd = Math.max(wm.width, tg ? tg.width : 0, M * VIS.w);
    const cx = Wd / 2;
    if (withMark) parts += `<g transform="translate(${(cx - M / 2).toFixed(2)} ${(-M * VIS.y).toFixed(2)}) scale(${M / 100})">${m.body}</g>`;
    const top = withMark ? M * VIS.h + 0.34 * F : 0;
    parts += word(cx - wm.width / 2, top);
    if (tg) parts += tag(cx - tg.width / 2, top + wm.height + tgGap);
    Hd = top + textH;
  }
  const pad = 4;
  const vb = [-pad, -pad, Wd + pad * 2, Hd + pad * 2];
  const dims = height ? ` width="${((vb[2] / vb[3]) * height).toFixed(1)}" height="${height}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map((n) => n.toFixed(2)).join(" ")}"${dims}><defs>${m ? m.defs : ""}</defs>${parts}</svg>`;
}
export function aspect(svg) {
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
  return vb[2] / vb[3];
}
export const FONTS = { WORD, SANS };
