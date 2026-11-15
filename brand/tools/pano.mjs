// Hızlı bakış panosu: ikonlar, simge varyantları, küçük boyutlar ve yazılı logolar tek PNG'de.
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { BRAND as B, markSvg, iconSvg, lockupSvg, adaptiveFgSvg, adaptiveBgSvg, aspect } from "./marka.mjs";

const out = process.argv[2] || "../pano.png";
const W = 1800;
let items = "";
const put = (svg, x, y, w, h) => {
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const vb = svg.match(/viewBox="([^"]+)"/)[1];
  items += `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}">${inner}</svg>`;
};
const box = (x, y, w, h, fill) => { items += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="${fill}"/>`; };

let y = 20;
put(iconSvg({ shape: "rounded" }), 20, y, 300, 300);
put(iconSvg({ shape: "rounded", tone: "dark" }), 340, y, 300, 300);
box(660, y, 300, 300, "#FFFFFF"); put(markSvg("light"), 690, y + 30, 240, 240);
box(980, y, 300, 300, B.splashDark); put(markSvg("dark"), 1010, y + 30, 240, 240);
box(1300, y, 300, 300, "#5A5F6B"); put(markSvg("mono"), 1330, y + 30, 240, 240);
// Android uyarlanabilir ikon: daire maske
items += `<clipPath id="cm"><circle cx="1700" cy="${y + 80}" r="66"/></clipPath><g clip-path="url(#cm)">`;
put(adaptiveBgSvg(216), 1592, y - 28, 216, 216);
put(adaptiveFgSvg(216), 1592, y - 28, 216, 216);
items += `</g>`;
// Android tema ikonu (tek renk)
items += `<circle cx="1700" cy="${y + 232}" r="66" fill="#D7E3FF"/><clipPath id="cm2"><circle cx="1700" cy="${y + 232}" r="66"/></clipPath><g clip-path="url(#cm2)">`;
put(adaptiveFgSvg(216, { mono: true }).replace(/#FFFFFF/g, "#1B2A52"), 1592, y + 124, 216, 216);
items += `</g>`;

y += 330;
[120, 96, 60, 40, 29, 20, 16].reduce((x, s) => { put(iconSvg({ shape: "rounded" }), x, y + (120 - s), s, s); return x + s + 24; }, 20);
[120, 96, 60, 40, 29, 20, 16].reduce((x, s) => { put(iconSvg({ shape: "rounded", tone: "dark" }), x, y + (120 - s), s, s); return x + s + 24; }, 620);
box(1220, y, 560, 120, "#FFFFFF");
[96, 60, 40, 29, 20, 16].reduce((x, s) => { put(markSvg("light"), x, y + 12 + (96 - s), s, s); return x + s + 22; }, 1240);

y += 150;
const rows = [["light", B.splash], ["dark", B.splashDark]];
rows.forEach(([theme, bg], i) => {
  const yy = y + i * 240;
  box(20, yy, 1000, 220, bg);
  const lh = lockupSvg({ layout: "h", theme, tagline: true });
  put(lh, 60, yy + 40, 140 * aspect(lh), 140);
  box(1040, yy, 740, 220, bg);
  const l2 = lockupSvg({ layout: "h", theme });
  put(l2, 1080, yy + 55, 110 * aspect(l2), 110);
  const sm = lockupSvg({ layout: "h", theme });
  put(sm, 1560, yy + 96, 28 * aspect(sm), 28);
});
y += 500;
rows.forEach(([theme, bg], i) => {
  box(20 + i * 460, y, 440, 480, bg);
  const lv = lockupSvg({ layout: "v", theme, tagline: true });
  const h = 380; put(lv, 20 + i * 460 + (440 - h * aspect(lv)) / 2, y + 50, h * aspect(lv), h);
});
box(940, y, 840, 230, B.splash);
const wmk = lockupSvg({ withMark: false }); put(wmk, 990, y + 70, 90 * aspect(wmk), 90);
box(940, y + 250, 840, 230, B.splashDark);
const wmd = lockupSvg({ withMark: false, theme: "dark", tagline: true }); put(wmd, 990, y + 300, 130 * aspect(wmd), 130);
y += 500;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}" viewBox="0 0 ${W} ${y}"><rect width="100%" height="100%" fill="#ECEEEA"/>${items}</svg>`;
writeFileSync(out, new Resvg(svg, { background: "#ECEEEA" }).render().asPng());
console.log("ok", out);
