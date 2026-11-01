import { describe, expect, it } from "vitest";
import { faceFiles, previewAsks, previewFamily } from "./fontPreview";
import type { TreeFontInfo } from "./storeThemes";

const font = (slug: string, name: string, source: "theme" | "google", q?: string): TreeFontInfo => ({ slug, name, kind: "sans", scripts: ["latin"], weights: [400, 700], source, q });

describe("the font picker's previews", () => {
  it("a library family goes by a name of its own, never the admin's own family's", () => {
    expect(previewFamily(font("ibm-plex-sans-arabic", "IBM Plex Sans Arabic", "google"))).toBe('"pv-ibm-plex-sans-arabic"');
    expect(previewFamily(font("cairo", "Cairo", "theme"))).toBe('"th-cairo"');
  });

  it("asks Google for the library families only, a few at a time, cut to the letters shown", () => {
    const fonts = [font("cairo", "Cairo", "theme"), ...Array.from({ length: 35 }, (_, i) => font(`f${i}`, `Font ${i}`, "google", `Font+${i}:wght@400..700`))];
    const asks = previewAsks(fonts);
    expect(asks.map((a) => a.fonts.length)).toEqual([30, 5]);
    expect(asks[0].url).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=Font\+0:wght@400\.\.700&family=Font\+1:/);
    expect(asks[0].url).not.toContain("Cairo");
    const text = decodeURIComponent(new URL(asks[0].url).searchParams.get("text")!);
    for (const c of "Font0123456789أבA") expect(text).toContain(c);
    expect(previewAsks([font("cairo", "Cairo", "theme")])).toEqual([]);
  });

  it("reads each family's first face from Google's stylesheet, from Google's font host only", () => {
    const css = `@font-face { font-family: 'Rubik Glitch'; font-style: normal; font-weight: 400; src: url(https://fonts.gstatic.com/l/font?kit=abc) format('woff2'); }
@font-face { font-family: 'Rubik Glitch'; font-weight: 700; src: url(https://fonts.gstatic.com/l/font?kit=def) format('woff2'); }
@font-face { font-family: 'Bad'; src: url(https://evil.test/x.woff2); }`;
    expect([...faceFiles(css)]).toEqual([["Rubik Glitch", "https://fonts.gstatic.com/l/font?kit=abc"]]);
  });
});
