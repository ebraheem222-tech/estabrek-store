import { describe, expect, it } from "vitest";
import { difference, findTurn, greyOf, maskBox, sheetGrid, turnTimes, unionBox } from "./plainTurn";

/** A "product" turning: a pattern that repeats every `period` frames (a stripe moving round). */
function turning(count: number, period: number, w = 64, h = 48) {
  return Array.from({ length: count }, (_, k) => {
    const data = new Uint8ClampedArray(w * h * 4);
    const phase = (k % period) / period;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const inside = x > 16 && x < 48 && y > 8 && y < 40;
        const v = inside ? 128 + 120 * Math.sin((x / 32 + phase) * Math.PI * 2) : 230;
        const i = (y * w + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 255;
      }
    return { w, h, data };
  });
}

describe("a 360° view from a plain video", () => {
  it("finds one turn: the frame most like the first once it came back round", () => {
    const frames = turning(60, 24).map((f) => greyOf(f, 32));
    const times = frames.map((_, k) => k * 0.25);
    const t = findTurn(frames, times)!;
    expect(t.start).toBe(0);
    expect(t.end).toBe(6); // frame 24
    expect(t.score).toBeGreaterThan(0.9);
    // Two and a half turns filmed: still the first one.
    expect(findTurn(turning(60, 20).map((f) => greyOf(f, 32)), times)!.end).toBe(5);
  });

  it("gives no answer when it looks the same all round or never comes back", () => {
    const still = turning(30, 1).map((f) => greyOf(f, 32));
    expect(findTurn(still, still.map((_, k) => k))).toBeNull();
    const half = turning(12, 48).map((f) => greyOf(f, 32));
    expect(findTurn(half, half.map((_, k) => k))).toBeNull();
  });

  it("small grey frames compare 0 when the same, more the more they differ", () => {
    const [a, b] = turning(2, 4).map((f) => greyOf(f, 32));
    expect(difference(a, a)).toBe(0);
    expect(difference(a, b)).toBeGreaterThan(0.05);
    expect(difference(a, { ...b, w: 3 })).toBe(1);
    expect(greyOf(turning(1, 2, 640, 480)[0], 48)).toMatchObject({ w: 48, h: 36 });
  });

  it("frames evenly round the turn, a square-ish sheet, and the box around the product", () => {
    expect(turnTimes(1, 5, 4)).toEqual([1, 2, 3, 4]);
    expect(turnTimes(0, 3.6, 36)).toHaveLength(36);
    expect(sheetGrid(72, 240, 320)).toEqual({ cols: 10, rows: 8 });
    expect(sheetGrid(36, 320, 320)).toEqual({ cols: 6, rows: 6 });
    const mask = new Uint8Array(10 * 10);
    mask[2 * 10 + 3] = 255;
    mask[7 * 10 + 6] = 200;
    expect(maskBox(mask, 10, 10)).toEqual({ x0: 3, y0: 2, x1: 6, y1: 7 });
    expect(maskBox(new Uint8Array(4), 2, 2)).toBeNull();
    expect(unionBox([{ x0: 20, y0: 10, x1: 60, y1: 50 }, null, { x0: 30, y0: 5, x1: 80, y1: 40 }], 100, 100)).toEqual({ x0: 16, y0: 2, x1: 84, y1: 53 });
    expect(unionBox([null], 50, 40)).toEqual({ x0: 0, y0: 0, x1: 49, y1: 39 });
  });
});
