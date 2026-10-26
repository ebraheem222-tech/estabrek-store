import { describe, expect, it } from "vitest";
import {
  MaskHistory,
  applyMask,
  brushStrength,
  composite,
  dab,
  flatten,
  keptShare,
  logitsToMask,
  maskBounds,
  maskFromAlpha,
  parseHex,
  resizeMask,
  stroke,
  toModelInput,
  type Brush,
  type Mask,
} from "./cutout";

const mask = (w: number, h: number, v = 0): Mask => ({ w, h, data: new Uint8ClampedArray(w * h).fill(v) });
const rgba = (w: number, h: number, rgb: [number, number, number]) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([...rgb, 255], i * 4);
  return { w, h, data };
};

describe("the model's input and output", () => {
  it("three normalised planes, red first", () => {
    const px = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 124, 116, 104, 255]);
    const x = toModelInput(px, 2);
    expect(x.length).toBe(12);
    expect(x[0]).toBeCloseTo((1 - 0.485) / 0.229, 5); // red plane, first pixel
    expect(x[4 + 1]).toBeCloseTo((1 - 0.456) / 0.224, 5); // green plane, second pixel
    expect(x[8 + 2]).toBeCloseTo((1 - 0.406) / 0.225, 5); // blue plane, third pixel
    expect(Math.abs(x[3])).toBeLessThan(0.01); // a mid grey is about 0
  });

  it("logits → 0–255 with a sigmoid; a broken value is background", () => {
    const m = logitsToMask([-20, 0, 20, Number.NaN], 2);
    expect(Array.from(m.data)).toEqual([0, 128, 255, 0]);
  });

  it("a mask stretched keeps its values and its edges in place", () => {
    const m = { w: 2, h: 1, data: new Uint8ClampedArray([0, 255]) };
    const big = resizeMask(m, 4, 2);
    expect(Array.from(big.data.slice(0, 4))).toEqual([0, 64, 191, 255]);
    expect(Array.from(big.data.slice(4))).toEqual(Array.from(big.data.slice(0, 4)));
    expect(resizeMask(m, 2, 1).data).not.toBe(m.data); // a copy, even at the same size
  });

  it("Cloudinary's cut-out: its alpha is the mask", () => {
    const img = { w: 2, h: 1, data: new Uint8ClampedArray([9, 9, 9, 0, 9, 9, 9, 200]) };
    expect(Array.from(maskFromAlpha(img).data)).toEqual([0, 200]);
  });
});

describe("the result", () => {
  it("transparent: the photo's colours with the mask as alpha", () => {
    const img = rgba(2, 1, [10, 20, 30]);
    const m = { w: 2, h: 1, data: new Uint8ClampedArray([0, 255]) };
    expect(Array.from(applyMask(img, m))).toEqual([10, 20, 30, 0, 10, 20, 30, 255]);
    // Ghost: part of what was removed shows through (the editor), the kept part stays.
    expect(Array.from(applyMask(img, m, undefined, undefined, 0.5))).toEqual([10, 20, 30, 128, 10, 20, 30, 255]);
  });

  it("on white or a colour: opaque, blended at soft edges", () => {
    const img = rgba(3, 1, [0, 0, 0]);
    const m = { w: 3, h: 1, data: new Uint8ClampedArray([0, 128, 255]) };
    expect(Array.from(flatten(img, m, [255, 255, 255]))).toEqual([255, 255, 255, 255, 127, 127, 127, 255, 0, 0, 0, 255]);
    expect(Array.from(composite(img, m, "#ff0000").slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(composite(img, m, "transparent").slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(Array.from(composite(img, m, "not a colour").slice(0, 4))).toEqual([0, 0, 0, 0]); // stays transparent
  });

  it("colours as #rgb or #rrggbb", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("1a2B3c")).toEqual([26, 43, 60]);
    expect(parseHex("#12")).toBeNull();
    expect(parseHex("")).toBeNull();
  });

  it("bounds and share of what is kept", () => {
    const m = mask(10, 10);
    expect(maskBounds(m)).toBeNull();
    m.data[3 * 10 + 4] = 255;
    m.data[6 * 10 + 7] = 255;
    expect(maskBounds(m)).toEqual({ x0: 4, y0: 3, x1: 8, y1: 7 });
    expect(keptShare(m)).toBeCloseTo(0.02, 5);
  });
});

describe("the fix-up brush", () => {
  const keep: Brush = { mode: "keep", radius: 4, softness: 0 };

  it("hard edge: full inside, nothing outside; soft edge: fades out", () => {
    expect(brushStrength(0, 4, 0)).toBe(1);
    expect(brushStrength(3.9, 4, 0)).toBe(1);
    expect(brushStrength(4, 4, 0)).toBe(0);
    expect(brushStrength(0, 4, 1)).toBe(1);
    expect(brushStrength(2, 4, 1)).toBeGreaterThan(0.3);
    expect(brushStrength(2, 4, 1)).toBeLessThan(0.7);
    expect(brushStrength(3.9, 4, 1)).toBeLessThan(0.05);
  });

  it("keep brings the product back; erase removes; each only inside its circle", () => {
    const m = mask(20, 20);
    const box = dab(m, 10, 10, keep);
    expect(box).toEqual({ x0: 6, y0: 6, x1: 15, y1: 15 });
    expect(m.data[10 * 20 + 10]).toBe(255);
    expect(m.data[10 * 20 + 16]).toBe(0);
    dab(m, 10, 10, { mode: "erase", radius: 2, softness: 0 });
    expect(m.data[10 * 20 + 10]).toBe(0);
    expect(m.data[10 * 20 + 13]).toBe(255); // outside the smaller eraser
  });

  it("going over the same place again never goes past the brush's own edge", () => {
    const m = mask(20, 20);
    const soft: Brush = { mode: "keep", radius: 6, softness: 1 };
    dab(m, 10, 10, soft);
    const once = m.data[10 * 20 + 14];
    dab(m, 10, 10, soft);
    expect(m.data[10 * 20 + 14]).toBe(once);
    expect(once).toBeGreaterThan(0);
    expect(once).toBeLessThan(255);
  });

  it("a stroke leaves no gaps and reports the box it changed", () => {
    const m = mask(40, 10);
    const box = stroke(m, [5, 5], [35, 5], { mode: "keep", radius: 2, softness: 0 });
    for (let x = 5; x <= 35; x++) expect(m.data[5 * 40 + x]).toBe(255);
    expect(box).toEqual({ x0: 3, y0: 3, x1: 38, y1: 8 });
  });

  it("the edge of the picture is safe", () => {
    const m = mask(5, 5);
    expect(dab(m, 0, 0, keep)).toEqual({ x0: 0, y0: 0, x1: 5, y1: 5 });
    expect(dab(m, -50, -50, keep)).toBeNull();
  });
});

describe("undo", () => {
  it("undoes and redoes strokes, keeping only the box each one touched", () => {
    const m = mask(30, 30);
    const h = new MaskHistory(m);
    expect(h.canUndo).toBe(false);
    h.begin();
    h.commit(stroke(m, [5, 5], [10, 5], { mode: "keep", radius: 3, softness: 0 }));
    const afterFirst = m.data.slice();
    h.begin();
    h.commit(dab(m, 20, 20, { mode: "keep", radius: 3, softness: 0 }));
    expect(h.canUndo).toBe(true);
    expect(h.undo()).toEqual({ x0: 17, y0: 17, x1: 24, y1: 24 });
    expect(Array.from(m.data)).toEqual(Array.from(afterFirst));
    h.undo();
    expect(m.data.every((v) => v === 0)).toBe(true);
    expect(h.undo()).toBeNull();
    h.redo();
    expect(Array.from(m.data)).toEqual(Array.from(afterFirst));
    expect(h.canRedo).toBe(true);
    // A new stroke clears what could be redone.
    h.begin();
    h.commit(dab(m, 1, 1, { mode: "erase", radius: 1, softness: 0 }));
    expect(h.canRedo).toBe(false);
  });

  it("back to the model's result is one step", () => {
    const m = mask(4, 4, 255);
    const original = m.data.slice();
    const h = new MaskHistory(m);
    h.begin();
    h.commit(dab(m, 2, 2, { mode: "erase", radius: 1, softness: 0 }));
    const edited = m.data.slice();
    h.replace(original);
    expect(Array.from(m.data)).toEqual(Array.from(original));
    h.undo();
    expect(Array.from(m.data)).toEqual(Array.from(edited));
  });

  it("old steps go first past the limit", () => {
    const m = mask(10, 10);
    const h = new MaskHistory(m, 2);
    for (const x of [2, 5, 8]) {
      h.begin();
      h.commit(dab(m, x, 5, { mode: "keep", radius: 1, softness: 0 }));
    }
    expect(h.undo()).not.toBeNull();
    expect(h.undo()).not.toBeNull();
    expect(h.undo()).toBeNull();
    expect(m.data[5 * 10 + 2]).toBe(255); // the first stroke can't be undone any more
  });

  it("a stroke that changed nothing adds no step", () => {
    const m = mask(5, 5);
    const h = new MaskHistory(m);
    h.begin();
    h.commit(null);
    expect(h.canUndo).toBe(false);
  });
});
