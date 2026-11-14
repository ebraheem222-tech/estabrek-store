import { expect, test } from "vitest";
import { contrast, contrastGrade, harmony, hexToLch, inGamut, lchToHex, luminance, modularScale, readableOn, SCALE_RATIOS, tonalScale, TONES } from "../../../shared/colour";

// Colour and scale maths for the design variables (shared/colour.ts).

test("a colour reads as OKLCH and comes back the same", () => {
  expect(hexToLch("#ffffff")).toMatchObject({ L: expect.closeTo(1, 3), C: expect.closeTo(0, 3) });
  expect(hexToLch("#000000")).toMatchObject({ L: 0, C: 0, h: 0 });
  const red = hexToLch("#ff0000")!;
  expect(red.L).toBeCloseTo(0.628, 3);
  expect(red.C).toBeCloseTo(0.2577, 3);
  expect(red.h).toBeCloseTo(29.23, 1);
  for (const hex of ["#c86b98", "#8e3f68", "#1d1a1f", "#fbf7f4", "#d23c4b", "#00ff88", "#123456", "#ffffff", "#000000"]) expect(lchToHex(hexToLch(hex)!), hex).toBe(hex);
  // Short and with transparency: read as the same colour.
  expect(hexToLch("#f00")).toEqual(red);
  expect(hexToLch("#ff000080")).toEqual(red);
  for (const bad of ["red", "#12", "#gggggg", "", "rgb(0,0,0)"]) expect(hexToLch(bad), bad).toBeNull();
});

test("a colour a screen can't show is calmed, its hue and lightness kept", () => {
  const wild = { L: 0.7, C: 0.4, h: 150 };
  const shown = inGamut(wild);
  expect(shown.L).toBe(0.7);
  expect(shown.h).toBe(150);
  expect(shown.C).toBeLessThan(0.3);
  expect(shown.C).toBeGreaterThan(0.1);
  // What it gives is that colour, as nearly as hex can say it.
  const back = hexToLch(lchToHex(wild))!;
  expect(back.L).toBeCloseTo(0.7, 1);
  expect(Math.abs(back.h - 150)).toBeLessThan(4);
  // One that shows already is left alone.
  const calm = { L: 0.6, C: 0.05, h: 300 };
  expect(inGamut(calm)).toEqual(calm);
  expect(inGamut({ L: 1.4, C: -1, h: 400 })).toEqual({ L: 1, C: 0, h: 40 });
});

test("how well two colours read on each other, and the grade it earns", () => {
  expect(luminance("#ffffff")).toBeCloseTo(1, 6);
  expect(luminance("#000000")).toBe(0);
  expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 6);
  expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 6);
  expect(contrast("#c86b98", "#c86b98")).toBe(1);
  // The well known edge: #767676 on white just passes for text, #777777 just doesn't.
  expect(contrast("#767676", "#ffffff")!).toBeGreaterThanOrEqual(4.5);
  expect(contrast("#777777", "#ffffff")!).toBeLessThan(4.5);
  expect(contrast("pink", "#ffffff")).toBeNull();
  expect([21, 7, 6.9, 4.5, 4.4, 3, 2.9, 1].map(contrastGrade)).toEqual(["AAA", "AAA", "AA", "AA", "large", "large", "fail", "fail"]);
  // The store's rose takes dark words; its ink takes white ones.
  expect(readableOn("#c86b98")).toBe("#111111");
  expect(readableOn("#1d1a1f")).toBe("#ffffff");
  expect(readableOn("#fbf7f4", "#fbf7f4", "#1d1a1f")).toBe("#1d1a1f");
});

test("a tonal scale: one hue from nearly white to nearly black, the colour itself in it", () => {
  const scale = tonalScale("#c86b98");
  expect(scale.map((t) => t.step)).toEqual(TONES.map((t) => t[0]));
  const own = scale.filter((t) => t.own);
  expect(own).toEqual([{ step: 500, value: "#c86b98", own: true }]);
  const lch = scale.map((t) => hexToLch(t.value)!);
  for (let i = 1; i < lch.length; i++) expect(lch[i].L, String(scale[i].step)).toBeLessThan(lch[i - 1].L);
  const hue = hexToLch("#c86b98")!.h;
  for (const c of lch.filter((x) => x.C > 0.03)) expect(Math.abs(c.h - hue)).toBeLessThan(6);
  // The ends are calmer than the middle, and read on each other.
  expect(lch[0].C).toBeLessThan(lch[5].C / 2);
  expect(contrast(scale[0].value, scale[9].value)!).toBeGreaterThan(7);
  // A grey gives greys; what isn't a colour gives nothing.
  for (const t of tonalScale("#808080")) expect(hexToLch(t.value)!.C).toBeLessThan(0.01);
  expect(tonalScale("rose")).toEqual([]);
  // A very light colour sits at the light end.
  expect(tonalScale("#fbf7f4").find((t) => t.own)?.step).toBe(50);
});

test("the colours that go with one keep its lightness and turn its hue", () => {
  const base = hexToLch("#c86b98")!;
  const [opposite] = harmony("#c86b98", "complement").map((h) => hexToLch(h)!);
  expect(Math.abs(Math.abs(opposite.h - base.h) - 180)).toBeLessThan(5);
  expect(opposite.L).toBeCloseTo(base.L, 1);
  expect(harmony("#c86b98", "neighbours")).toHaveLength(2);
  expect(harmony("#c86b98", "triad")).toHaveLength(2);
  expect(harmony("#c86b98", "split")).toHaveLength(2);
  const turns = harmony("#c86b98", "triad").map((h) => (hexToLch(h)!.h - base.h + 360) % 360);
  expect(Math.abs(turns[0] - 120)).toBeLessThan(6);
  expect(Math.abs(turns[1] - 240)).toBeLessThan(6);
  expect(harmony("nope", "triad")).toEqual([]);
  // A grey has no hue to turn: nothing goes with it this way.
  for (const grey of ["#808080", "#000000", "#ffffff"]) expect(harmony(grey, "complement"), grey).toEqual([]);
});

test("a modular scale grows by its ratio, in whole pixels, never two the same", () => {
  expect(modularScale(4, 2, 5)).toEqual([4, 8, 16, 32, 64]);
  expect(modularScale(4, 1.5, 6)).toEqual([4, 6, 9, 14, 20, 30]);
  // Too slow a ratio for whole pixels: each still a pixel more than the last.
  expect(modularScale(1, 1.125, 5)).toEqual([1, 2, 3, 4, 5]);
  // It stops at the most a space can be.
  expect(modularScale(100, 2, 6)).toEqual([100, 200, 400]);
  expect(modularScale(8, 4 / 3, 4, { round: 4 })).toEqual([8, 12, 16, 20]);
  expect(modularScale(0, 2, 5)).toEqual([]);
  expect(modularScale(4, 1, 5)).toEqual([]);
  const golden = SCALE_RATIOS.find((r) => r.id === "golden")!.ratio;
  expect(golden).toBeCloseTo(1.618, 3);
  expect(modularScale(8, golden, 5)).toEqual([8, 13, 21, 34, 55]);
});
