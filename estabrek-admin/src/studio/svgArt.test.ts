import { describe, expect, it } from "vitest";
import { artIsSafe, hasLines, importSvg, lineWidthOf, normColour, paletteOf, recolor, setLineWidth } from "./svgArt";
import { SHAPES, defaultsOf, shapeByKey, smoothClosed } from "./svgShapes";
import { drawingHasLines, drawingMorphs, presetsFor } from "./look";

const FILE = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="120" height="60" version="1.1">
  <title>Logo</title>
  <style>.st0{fill:#FF0000;stroke:rgb(0,0,255);stroke-width:2} .st1,.st2{opacity:.5} svg path{fill:red}</style>
  <script>alert(1)</script>
  <defs><linearGradient id="g1"><stop offset="0" stop-color="gold"/><stop offset="1" style="stop-color:rgba(0,0,0,0.5)"/></linearGradient></defs>
  <g class="st1" onclick="alert(2)" transform="translate(4 4)">
    <path class="st0" d="M0 0 L 100 0 L 50 40 Z"/>
    <circle cx="60" cy="30" r="10" fill="url('#g1')" style="stroke:none"/>
    <image href="https://x.test/a.png" width="10" height="10"/>
    <use xlink:href="#g1"/>
    <text x="0" y="50">Hi</text>
    <foreignObject width="10" height="10"><div>x</div></foreignObject>
    <rect x="1" y="1" width="5" height="5" fill="red" data-name="box"/>
  </g>
</svg>`;

describe("drawings in the editor", () => {
  it("an SVG file becomes safe data: shapes and colours kept, everything else left out and named", () => {
    const r = importSvg(FILE);
    expect(r.problem).toBeUndefined();
    expect(r.art?.viewBox).toBe("0 0 120 60");
    const g = r.art!.nodes[1];
    expect(r.art!.nodes[0]).toEqual({ t: "defs", a: {}, c: [{ t: "linearGradient", a: { id: "g1" }, c: [{ t: "stop", a: { offset: "0", "stop-color": "#ffd700" } }, { t: "stop", a: { offset: "1", "stop-color": "#00000080" } }] }] });
    expect(g.t).toBe("g");
    expect(g.a).toEqual({ transform: "translate(4 4)", opacity: ".5" });
    // The class rule colours the path; inline style beats the attribute; a gradient reference is tidied.
    expect(g.c!.map((n) => n.t)).toEqual(["path", "circle", "rect"]);
    expect(g.c![0].a).toEqual({ d: "M0 0 L 100 0 L 50 40 Z", fill: "#ff0000", stroke: "#0000ff", "stroke-width": "2" });
    expect(g.c![1].a).toEqual({ cx: "60", cy: "30", r: "10", fill: "url(#g1)", stroke: "none" });
    expect(g.c![2].a.fill).toBe("#ff0000");
    expect(r.dropped.sort()).toEqual(["foreignObject", "image", "onclick", "script", "style rule", "text", "use"].sort());
    expect(artIsSafe(r.art!)).toBe(true);
  });

  it("what isn't an SVG, is too big or has nothing allowed is refused with the reason", () => {
    expect(importSvg("<html><body>hi</body></html>").problem).toBe("notSvg");
    expect(importSvg("<svg").problem).toBe("notSvg");
    expect(importSvg(`<svg viewBox="0 0 1 1">${"x".repeat(410_000)}</svg>`).problem).toBe("big");
    expect(importSvg('<svg viewBox="0 0 1 1"><script>x</script></svg>')).toMatchObject({ problem: "empty", dropped: ["script"] });
  });

  it("colours written any way become hex; a drawing's colours and lines change everywhere", () => {
    expect(normColour("RGB(255, 0, 128)")).toBe("#ff0080");
    expect(normColour("rgba(0,0,0,50%)")).toBe("#00000080");
    expect(normColour("Navy")).toBe("#000080");
    expect(normColour("hsl(1,2%,3%)")).toBeNull();
    const art = importSvg(FILE).art!;
    expect(paletteOf(art)).toEqual(["#ffd700", "#00000080", "#ff0000", "#0000ff"]);
    const red = recolor(art, "#ff0000", "accent");
    expect(paletteOf(red)).toEqual(["#ffd700", "#00000080", "accent", "#0000ff"]);
    expect(paletteOf(art)).toContain("#ff0000"); // the original stays as it was
    expect(hasLines(art) && lineWidthOf(art)).toBe(2);
    expect(lineWidthOf(setLineWidth(art, 7.25))).toBe(7.3);
  });

  it("every ready drawing is safe data, the same knobs draw the same, and some have a second shape", () => {
    for (const s of SHAPES) {
      const a = s.make(defaultsOf(s));
      expect(artIsSafe(a), s.key).toBe(true);
      expect(JSON.stringify(s.make(defaultsOf(s)))).toBe(JSON.stringify(a));
      for (const kn of s.knobs) expect(artIsSafe(s.make({ ...defaultsOf(s), [kn.key]: kn.max })), `${s.key} ${kn.key}`).toBe(true);
    }
    const blob = shapeByKey("blob")!;
    expect(blob.make({ points: 7, wobble: 0.3, seed: 1 })).not.toEqual(blob.make({ points: 7, wobble: 0.3, seed: 2 }));
    expect(SHAPES.filter((s) => s.make(defaultsOf(s)).morph).map((s) => s.key)).toEqual(["blob", "wave", "seal", "sparkle"]);
    expect(smoothClosed([[0, 0], [10, 0], [10, 10]])).toMatch(/^M0 0 C.* Z$/);
  });

  it("a drawing's own motions show only when it can do them", () => {
    const of = (key: string) => {
      const s = shapeByKey(key)!;
      return { id: "d", type: "svg", props: { shape: key, art: s.make(defaultsOf(s)) } };
    };
    expect(drawingHasLines(of("squiggle")) && !drawingHasLines(of("blob"))).toBe(true);
    expect(drawingMorphs(of("blob")) && !drawingMorphs(of("squiggle"))).toBe(true);
    const keys = (n: ReturnType<typeof of>) => presetsFor("svg", n).map((p) => p.key);
    expect(keys(of("squiggle"))).toEqual(expect.arrayContaining(["draw", "dash"]));
    expect(keys(of("squiggle"))).not.toContain("morph");
    expect(keys(of("blob"))).toContain("morph");
    expect(presetsFor("text").map((p) => p.key)).not.toContain("draw");
  });
});
