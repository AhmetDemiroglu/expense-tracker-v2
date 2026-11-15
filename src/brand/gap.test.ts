import { describe, expect, it } from "vitest";
import { sharpen, svgDataUri } from "./gap";
import hLight from "../../brand/logo/svg/lockup-h-light.svg?raw";
import vsDark from "../../brand/logo/svg/lockup-v-slogan-dark.svg?raw";
import markLight from "../../brand/logo/svg/mark-light.svg?raw";
import wordmark from "../../brand/logo/svg/wordmark-light.svg?raw";


const DOSYA: Record<string, string> = { "lockup-h-light.svg": hLight, "lockup-v-slogan-dark.svg": vsDark, "mark-light.svg": markLight, "wordmark-light.svg": wordmark };
const dosya = (ad: string) => DOSYA[ad] ?? "";

describe("logo keskinleştirme", () => {
  for (const ad of ["lockup-h-light.svg", "lockup-v-slogan-dark.svg", "mark-light.svg"]) {
    it(`${ad}: maske kırpma yoluna çevrilir`, () => {
      const out = sharpen(dosya(ad));
      expect(out).not.toContain("<mask");
      expect(out).not.toContain('mask="url(');
      expect(out).toContain("<clipPath");
      expect(out).toContain('clip-path="url(#');
      expect(out.match(/<clipPath id="([^"]+)"/)?.[1]).toBe(out.match(/clip-path="url\(#([^)]+)\)"/)?.[1]);
    });
  }
  it("maskesi olmayan dosya değişmez", () => {
    const raw = dosya("wordmark-light.svg");
    expect(sharpen(raw)).toBe(raw);
  });
  it("veri adresi svg olarak başlar", () => {
    expect(svgDataUri("<svg/>")).toBe("data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E");
  });
});
