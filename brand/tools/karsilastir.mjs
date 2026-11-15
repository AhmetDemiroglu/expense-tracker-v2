// Tepe karşılaştırması: seçilen iskelet ve iki alternatif. Çıktı: ../secim/tepe-karsilastirma.png
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { BRAND as B, markSvg, iconSvg } from "./marka.mjs";
const V = [
  ["1", null],
  ["2", { stem: [41, 27, 41, 86], top: [24, 40, 76, 22], low: [24, 62, 67, 47.1], shift: "translate(0 -4)" }],
  ["3", { stem: [38, 33.5, 38, 86], top: [31, 36, 78, 19.7], low: [24, 60, 64, 46.1], shift: "translate(-1 -3)" }],
];
let items = "";
const put = (svg, x, y, w) => { items += `<svg x="${x}" y="${y}" width="${w}" height="${w}" viewBox="0 0 100 100">${svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg>`; };
V.forEach(([n, geo], i) => {
  const x = 30 + i * 590;
  put(iconSvg({ shape: "rounded", geo }), x, 30, 260);
  items += `<rect x="${x + 280}" y="30" width="260" height="260" rx="40" fill="#fff"/>`;
  put(markSvg("light", null, { geo }), x + 300, 50, 220);
  items += `<rect x="${x}" y="310" width="540" height="150" rx="30" fill="${B.splashDark}"/>`;
  put(markSvg("dark", null, { geo }), x + 30, 325, 120);
  [60, 40, 29, 20].reduce((xx, s) => { put(iconSvg({ shape: "rounded", geo }), xx, 355 + (60 - s) / 2, s); return xx + s + 18; }, x + 200);
  items += `<circle cx="${x + 270}" cy="520" r="30" fill="#111830"/><rect x="${x + 262}" y="${n === "1" ? 500 : 504}" width="16" height="${n === "1" ? 40 : 32}" fill="none"/>`;
  // rakam: basit çubuklarla (yazı tipi gerektirmez)
  const d = { 1: "M-4 -10L4 -14V14", 2: "M-8 -8Q0 -18 8 -8Q10 -2 -8 14H9", 3: "M-8 -12H8L0 -2Q10 0 8 8Q4 16 -8 12" }[n];
  items += `<path transform="translate(${x + 270} 520)" d="${d}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="570" viewBox="0 0 1800 570"><rect width="100%" height="100%" fill="#ECEEEA"/>${items}</svg>`;
writeFileSync("../secim/tepe-karsilastirma.png", new Resvg(svg).render().asPng());
console.log("ok");
