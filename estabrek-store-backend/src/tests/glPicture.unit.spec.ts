import { describe, expect, test } from "vitest";
import { picturePoints } from "../../../estabrek-storefront/src/pageTree/glPicture";
import { rng } from "../../../estabrek-storefront/src/pageTree/glShapes";
import * as shop from "../../../estabrek-storefront/src/pageTree/glScene";
import { GL_PICTURE_MODES } from "../lib/pageTree.js";

// How words or a picture become a WebGL scene's dots (the shop's pageTree/glPicture.ts), checked on drawn pictures.
type Paint = (x: number, y: number) => [number, number, number] | null;
/** A W × H picture on a white ground, painted where `paint` says. */
function picture(W: number, H: number, paint: Paint) {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = paint(x, y) ?? [255, 255, 255], k = (y * W + x) * 4;
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  return d;
}
/** Back from the scene's units to the picture's pixels (the points are centred on what is drawn, `k` scene units each). */
const toPixels = (pos: Float32Array, i: number, cx: number, cy: number, k: number) => [pos[i * 3] / k + cx, -pos[i * 3 + 1] / k + cy];
const W = 160, H = 120;
const square = picture(W, H, (x, y) => (x >= 40 && x < 120 && y >= 20 && y < 100 ? [20, 40, 160] : null));
// The square is 80 px; fitted to 1.6 scene units, so k = 0.02 and its middle is (80, 60).
const K = 1.6 / 80;

describe("words and pictures made into dots", () => {
  test("the same ways as the shop's", () => {
    expect([...GL_PICTURE_MODES]).toEqual([...shop.GL_PICTURE_MODES]);
  });

  test("pixels: every dot on the drawn part, none on the white ground, in its colour", () => {
    const d = picturePoints(square, W, H, 2000, rng(1), "pixels", 1.6, 1.6)!;
    for (let i = 0; i < 2000; i++) {
      const [x, y] = toPixels(d.pos, i, 80, 60, K);
      expect(x >= 39.5 && x <= 120.5 && y >= 19.5 && y <= 100.5).toBe(true);
      expect([d.col[i * 3], d.col[i * 3 + 1], d.col[i * 3 + 2]].map((v) => Math.round(v * 255))).toEqual([20, 40, 160]);
    }
  });

  test("edges: the dots lie on the square's outline, not inside it, and run along it", () => {
    const d = picturePoints(square, W, H, 1500, rng(2), "edges", 1.6, 1.6)!;
    let along = 0;
    for (let i = 0; i < 1500; i++) {
      const [x, y] = toPixels(d.pos, i, 80, 60, K);
      const fromEdge = Math.min(Math.abs(x - 40), Math.abs(x - 120), Math.abs(y - 20), Math.abs(y - 100));
      expect(fromEdge).toBeLessThan(2.5);
      // On a side, the line's direction is that side's.
      const tx = Math.abs(d.tan[i * 2]), ty = Math.abs(d.tan[i * 2 + 1]);
      const vertical = Math.min(Math.abs(x - 40), Math.abs(x - 120)) < Math.min(Math.abs(y - 20), Math.abs(y - 100));
      if (vertical ? ty > 0.9 : tx > 0.9) along++;
    }
    expect(along / 1500).toBeGreaterThan(0.8);
  });

  test("features: the first dots are sparks on the square's four corners", () => {
    const d = picturePoints(square, W, H, 1000, rng(3), "features", 1.6, 1.6)!;
    const sparks: number[][] = [];
    for (let i = 0; i < 1000 && d.rad[i] > 0; i++) sparks.push(toPixels(d.pos, i, 80, 60, K));
    expect(sparks.length).toBeGreaterThanOrEqual(4);
    for (const corner of [[40, 20], [120, 20], [40, 100], [120, 100]]) {
      expect(Math.min(...sparks.map(([x, y]) => Math.hypot(x - corner[0], y - corner[1])))).toBeLessThan(5);
    }
  });

  test("blobs: three discs are found where they are, at their sizes, in their colours", () => {
    const discs = [{ x: 35, y: 60, r: 6, c: [220, 30, 30] }, { x: 80, y: 60, r: 12, c: [30, 160, 60] }, { x: 128, y: 60, r: 20, c: [40, 60, 200] }] as const;
    const img = picture(W, H, (x, y) => discs.find((s) => (x - s.x) ** 2 + (y - s.y) ** 2 <= s.r * s.r)?.c.slice() as [number, number, number] ?? null);
    const d = picturePoints(img, W, H, 800, rng(4), "blobs", 1.6, 1.6)!;
    // Drawn from x 29 to 148, y 40 to 80: its middle (88.5, 60), k = 1.6 / 119.
    const k = 1.6 / 119;
    const big: Array<{ x: number; y: number; r: number; c: number[] }> = [];
    for (let i = 0; i < 800 && d.rad[i] > 0; i++) {
      const [x, y] = toPixels(d.pos, i, 88.5, 60, k);
      big.push({ x, y, r: d.rad[i] / k, c: [d.col[i * 3], d.col[i * 3 + 1], d.col[i * 3 + 2]].map((v) => Math.round(v * 255)) });
    }
    for (const s of discs) {
      const near = big.filter((b) => Math.hypot(b.x - s.x, b.y - s.y) < s.r * 0.5).sort((a, b) => b.r - a.r)[0];
      expect(near, `the disc of ${s.r}`).toBeTruthy();
      expect(near.r).toBeGreaterThan(s.r * 0.5);
      expect(near.r).toBeLessThan(s.r * 2);
      expect(near.c).toEqual([...s.c]);
    }
  });

  test("stipple: more ink where it is darker, and the dots spread apart (Lloyd)", () => {
    // A band from black (left) to light grey (right) on white.
    const img = picture(W, H, (x, y) => (y >= 20 && y < 100 && x >= 20 && x < 140 ? [Math.round(((x - 20) / 120) * 200), Math.round(((x - 20) / 120) * 200), Math.round(((x - 20) / 120) * 200)] : null));
    const n = 1200, d = picturePoints(img, W, H, n, rng(5), "stipple", 1.6, 1.6)!;
    const k = 1.6 / 120;
    let left = 0, right = 0;
    const pts: number[][] = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = toPixels(d.pos, i, 80, 60, k);
      pts.push([x, y]);
      if (x < 60) left++;
      else if (x >= 100) right++;
    }
    expect(left).toBeGreaterThan(right * 2);
    // Relaxed: no two dots in the dark third almost on top of each other.
    const dark = pts.filter(([x]) => x < 60);
    let closest = Infinity;
    for (let a = 0; a < dark.length; a++) for (let b = a + 1; b < dark.length; b++) closest = Math.min(closest, Math.hypot(dark[a][0] - dark[b][0], dark[a][1] - dark[b][1]));
    expect(closest).toBeGreaterThan(0.25);
  });

  test("palette: a picture of two colours (with a little noise) comes out in two", () => {
    const r = rng(6);
    const img = picture(W, H, (x, y) => (y < 20 || y >= 100 ? null : x < 80 ? [200 + Math.round(r() * 20), 40, 40] : [40, 40, 200 + Math.round(r() * 20)]));
    const d = picturePoints(img, W, H, 1500, rng(7), "palette", 1.6, 1.6)!;
    const seen = new Set<string>();
    for (let i = 0; i < 1500; i++) seen.add([d.col[i * 3], d.col[i * 3 + 1], d.col[i * 3 + 2]].map((v) => Math.round(v * 255)).join(","));
    expect(seen.size).toBeLessThanOrEqual(6);
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });

  test("nothing drawn (all ground) gives no dots", () => {
    expect(picturePoints(picture(40, 40, () => null), 40, 40, 100, rng(8), "edges", 1, 1)).toBeNull();
  });
});
