// Tüm marka dosyalarını üretir: brand/ altına. Çalıştır: npm run build
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { BRAND as B, ICON_SCALE, markSvg, iconSvg, lockupSvg, adaptiveBgSvg, adaptiveFgSvg, centeredMarkSvg, aspect } from "./marka.mjs";

const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const w = (f, data) => { mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, data); };
const render = (svg, width) => new Resvg(svg, { fitTo: { mode: "width", value: width } }).render();
const png = (svg, width) => render(svg, width).asPng();

// Alfa kanalsız PNG (iOS ve mağaza ikonları için)
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function pngRGB(svg, width, bg = [0, 0, 0]) {
  const img = render(svg, width), W = img.width, H = img.height, px = img.pixels;
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, o = y * (W * 3 + 1) + 1 + x * 3, a = px[i + 3] / 255;
      for (let k = 0; k < 3; k++) raw[o + k] = Math.round(px[i + k] * a + bg[k] * (1 - a));
    }
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
function ico(svg, sizes) {
  const imgs = sizes.map((s) => png(svg, s));
  const head = Buffer.alloc(6 + 16 * imgs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
  let off = head.length;
  imgs.forEach((b, i) => {
    const e = 6 + i * 16, s = sizes[i];
    head[e] = s >= 256 ? 0 : s; head[e + 1] = s >= 256 ? 0 : s; head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(b.length, e + 8); head.writeUInt32LE(off, e + 12); off += b.length;
  });
  return Buffer.concat([head, ...imgs]);
}
const comp = (h) => [1, 3, 5].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3));
const inner = (svg) => svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
const DENS = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

// 1. Logo SVG ve PNG
const S = {
  "mark-light": markSvg("light"), "mark-dark": markSvg("dark"), "mark-onbrand": markSvg("onBrand"), "mark-mono": markSvg("mono"),
  "icon": iconSvg(), "icon-dark": iconSvg({ tone: "dark" }), "icon-rounded": iconSvg({ shape: "rounded" }),
  "lockup-h-light": lockupSvg({ layout: "h" }), "lockup-h-dark": lockupSvg({ layout: "h", theme: "dark" }),
  "lockup-h-slogan-light": lockupSvg({ layout: "h", tagline: true }), "lockup-h-slogan-dark": lockupSvg({ layout: "h", tagline: true, theme: "dark" }),
  "lockup-v-light": lockupSvg({ layout: "v" }), "lockup-v-dark": lockupSvg({ layout: "v", theme: "dark" }),
  "lockup-v-slogan-light": lockupSvg({ layout: "v", tagline: true }), "lockup-v-slogan-dark": lockupSvg({ layout: "v", tagline: true, theme: "dark" }),
  "wordmark-light": lockupSvg({ withMark: false }), "wordmark-dark": lockupSvg({ withMark: false, theme: "dark" }),
};
for (const [k, v] of Object.entries(S)) w(path.join(D, "logo", "svg", k + ".svg"), v);
for (const k of Object.keys(S)) {
  if (k === "icon" || k === "icon-dark") continue;
  w(path.join(D, "logo", "png", k + ".png"), png(S[k], k.startsWith("lockup-h") || k.startsWith("wordmark") ? 1600 : k.startsWith("icon") ? 512 : 800));
}

// 2. Mağaza ikonları (alfa yok)
w(path.join(D, "app-icon", "store", "app-store-1024.png"), pngRGB(S.icon, 1024));
w(path.join(D, "app-icon", "store", "google-play-512.png"), pngRGB(S.icon, 512));

// 3. Android
const AR = path.join(D, "app-icon", "android", "res");
for (const [d, f] of Object.entries(DENS)) {
  w(path.join(AR, `mipmap-${d}`, "ic_launcher.png"), png(iconSvg({ shape: "rounded", scale: 0.76 }), 48 * f));
  w(path.join(AR, `mipmap-${d}`, "ic_launcher_round.png"), png(iconSvg({ shape: "circle", scale: 0.72 }), 48 * f));
  w(path.join(AR, `mipmap-${d}`, "ic_launcher_background.png"), png(adaptiveBgSvg(108), 108 * f));
  w(path.join(AR, `mipmap-${d}`, "ic_launcher_foreground.png"), png(adaptiveFgSvg(108), 108 * f));
  w(path.join(AR, `mipmap-${d}`, "ic_launcher_monochrome.png"), png(adaptiveFgSvg(108, { mono: true }), 108 * f));
  if (d === "ldpi") continue;
  // Android 12+: 288dp tuval, simge 192dp dairenin içinde.
  w(path.join(AR, `drawable-${d}`, "splashscreen_icon.png"), png(centeredMarkSvg("light", 288, { canvas: 288, box: 176 }), 288 * f));
  w(path.join(AR, `drawable-night-${d}`, "splashscreen_icon.png"), png(centeredMarkSvg("dark", 288, { canvas: 288, box: 176 }), 288 * f));
  // Android 11 ve altı: düz zemin üstünde ortalı simge.
  w(path.join(AR, `drawable-${d}`, "splashscreen_logo.png"), png(centeredMarkSvg("light", 120, { canvas: 120, box: 112 }), 120 * f));
  w(path.join(AR, `drawable-night-${d}`, "splashscreen_logo.png"), png(centeredMarkSvg("dark", 120, { canvas: 120, box: 112 }), 120 * f));
}
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@mipmap/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n</adaptive-icon>\n`;
w(path.join(AR, "mipmap-anydpi-v26", "ic_launcher.xml"), adaptiveXml);
w(path.join(AR, "mipmap-anydpi-v26", "ic_launcher_round.xml"), adaptiveXml);
w(path.join(AR, "values", "brand_colors.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="splashscreen_background">${B.splash}</color>\n    <color name="brand_accent">${B.acc}</color>\n</resources>\n`);
w(path.join(AR, "values-night", "brand_colors.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="splashscreen_background">${B.splashDark}</color>\n    <color name="brand_accent">${B.accDark}</color>\n</resources>\n`);

// 4. iOS
const IOS = path.join(D, "app-icon", "ios");
const tinted = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1024" height="1024"><rect width="100" height="100" fill="#000"/><g transform="translate(50 50) scale(${ICON_SCALE}) translate(-50 -50)">${inner(markSvg("mono"))}</g></svg>`;
w(path.join(IOS, "AppIcon.appiconset", "AppIcon-1024.png"), pngRGB(S.icon, 1024));
w(path.join(IOS, "AppIcon.appiconset", "AppIcon-1024-dark.png"), pngRGB(S["icon-dark"], 1024));
w(path.join(IOS, "AppIcon.appiconset", "AppIcon-1024-tinted.png"), pngRGB(tinted, 1024));
w(path.join(IOS, "AppIcon.appiconset", "Contents.json"), JSON.stringify({
  images: [
    { filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" },
    { appearances: [{ appearance: "luminosity", value: "dark" }], filename: "AppIcon-1024-dark.png", idiom: "universal", platform: "ios", size: "1024x1024" },
    { appearances: [{ appearance: "luminosity", value: "tinted" }], filename: "AppIcon-1024-tinted.png", idiom: "universal", platform: "ios", size: "1024x1024" },
  ], info: { author: "xcode", version: 1 },
}, null, 2));
const LS = path.join(IOS, "SplashScreenLogo.imageset");
const imgs = [];
for (const sc of [1, 2, 3]) {
  w(path.join(LS, `logo@${sc}x.png`), png(markSvg("light"), 220 * sc));
  w(path.join(LS, `logo-dark@${sc}x.png`), png(markSvg("dark"), 220 * sc));
  imgs.push({ filename: `logo@${sc}x.png`, idiom: "universal", scale: `${sc}x` });
  imgs.push({ appearances: [{ appearance: "luminosity", value: "dark" }], filename: `logo-dark@${sc}x.png`, idiom: "universal", scale: `${sc}x` });
}
w(path.join(LS, "Contents.json"), JSON.stringify({ images: imgs, info: { author: "xcode", version: 1 } }, null, 2));
const [lr, lgr, lb] = comp(B.splash), [dr, dg, db] = comp(B.splashDark);
w(path.join(IOS, "SplashScreenBackground.colorset", "Contents.json"), JSON.stringify({
  colors: [
    { color: { "color-space": "srgb", components: { alpha: "1.000", red: lr, green: lgr, blue: lb } }, idiom: "universal" },
    { appearances: [{ appearance: "luminosity", value: "dark" }], color: { "color-space": "srgb", components: { alpha: "1.000", red: dr, green: dg, blue: db } }, idiom: "universal" },
  ], info: { author: "xcode", version: 1 },
}, null, 2));

// 5. Web
const fav = iconSvg({ shape: "rounded", scale: 0.74 });
const maskable = iconSvg({ scale: 0.62 });
w(path.join(D, "web", "favicon.ico"), ico(fav, [16, 32, 48]));
w(path.join(D, "web", "favicon.svg"), fav);
w(path.join(D, "web", "icon-192.png"), png(fav, 192));
w(path.join(D, "web", "icon-512.png"), png(fav, 512));
w(path.join(D, "web", "icon-maskable-512.png"), pngRGB(maskable, 512));
w(path.join(D, "web", "apple-touch-icon.png"), pngRGB(S.icon, 180));

// 6. Bağlantı önizleme görseli (1200x630): koyu zemin, ortada sloganlı dikey logo
const lv = lockupSvg({ layout: "v", theme: "dark", tagline: true });
const lh = 400, lw = lh * aspect(lv);
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630"><defs><radialGradient id="g" cx="0.5" cy="0.1" r="0.9"><stop offset="0" stop-color="#1D2B55"/><stop offset="1" stop-color="${B.splashDark}"/></radialGradient></defs><rect width="1200" height="630" fill="url(#g)"/><svg x="${(1200 - lw) / 2}" y="${(630 - lh) / 2}" width="${lw}" height="${lh}" viewBox="${lv.match(/viewBox="([^"]+)"/)[1]}">${inner(lv)}</svg></svg>`;
w(path.join(D, "social", "og-default.svg"), og);
w(path.join(D, "social", "og-default.png"), pngRGB(og, 1200));
console.log("ok", D);
