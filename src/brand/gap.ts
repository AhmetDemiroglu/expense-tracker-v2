/* Simgede alt kolun çevresindeki boşluk. Marka kitindeki SVG'ler bunu <mask> ile yapar; WebKit (iOS Safari ve WKWebView)
   maskeyi düşük çözünürlükte işleyip simgeyi bulandırdığı için uygulamada aynı biçim kırpma yoluyla (vektör, keskin) çizilir. */

/** Her yeri kaplayan dış dikdörtgen eksi kol biçimi (evenodd). Kolun eğik eksenindedir: rotate(-19.112 24 60). */
export const GAP_CLIP = "M-200 -200H300V300H-200Z M24 51.1H69.508A8.9 8.9 0 0 1 69.508 68.9H24A8.9 8.9 0 0 1 24 51.1Z";

const MASK = /<mask id="([^"]+)"[^>]*>.*?<\/mask>/s;

/** Marka kitinden gelen SVG metninde maskeyi kırpma yoluna çevirir. Maske yoksa metni aynen döndürür. */
export function sharpen(svg: string): string {
  const m = MASK.exec(svg);
  if (!m) return svg;
  const id = m[1];
  return svg
    .replace(MASK, `<clipPath id="${id}"><path transform="rotate(-19.112 24 60)" clip-rule="evenodd" d="${GAP_CLIP}"/></clipPath>`)
    .replace(`mask="url(#${id})"`, `clip-path="url(#${id})"`);
}

/** SVG metnini <img src> için veri adresine çevirir. */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
