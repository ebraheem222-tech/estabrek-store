import { expect, test } from "vitest";
import { findSparkles, safeSparkle, toShownBox } from "../../../../shared/sparkle";

/** A dark picture with a bright square: its four corners are where the stars belong. */
function square(w = 64, h = 64, from = 16, to = 48, alphaOutside = 255) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const inside = x >= from && x < to && y >= from && y < to;
      const i = (y * w + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = inside ? 240 : 20;
      px[i + 3] = inside ? 255 : alphaOutside;
    }
  return px;
}

test("on a bright square the corners are found, at its four corners, spread apart", () => {
  const pts = findSparkles(square(), 64, 64, { mode: "corners", count: 4, spread: 0.2 });
  expect(pts).toHaveLength(4);
  const near = (x: number, y: number) => pts.some((p) => Math.abs(p.x - x) < 0.08 && Math.abs(p.y - y) < 0.08);
  expect(near(0.25, 0.25) && near(0.75, 0.25) && near(0.25, 0.75) && near(0.75, 0.75)).toBe(true);
  for (const p of pts) expect(p.s).toBeGreaterThan(0.5);
});

test("edges find the outline; highlights find bright places; a flat picture has none", () => {
  const edges = findSparkles(square(), 64, 64, { mode: "edges", count: 12, spread: 0.05 });
  // Every star sits on the square's outline.
  for (const p of edges) expect(Math.min(Math.abs(p.x - 0.25), Math.abs(p.x - 0.75), Math.abs(p.y - 0.25), Math.abs(p.y - 0.75))).toBeLessThan(0.06);
  expect(findSparkles(new Uint8ClampedArray(32 * 32 * 4).fill(128), 32, 32)).toEqual([]);
  // Stars stay apart: none closer than the spread.
  const all = findSparkles(square(), 64, 64, { count: 30, spread: 0.1 });
  for (const a of all) for (const b of all) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(0.1 - 0.02);
});

test("a cut-out picture keeps its stars on the product", () => {
  const pts = findSparkles(square(64, 64, 16, 48, 0), 64, 64, { mode: "edges", count: 20, spread: 0.03, productOnly: true });
  expect(pts.length).toBeGreaterThan(0);
  for (const p of pts) {
    expect(p.x).toBeGreaterThanOrEqual(0.24);
    expect(p.x).toBeLessThanOrEqual(0.76);
  }
});

test("points move to where the picture shows them: cover crops, contain leaves room", () => {
  // A 200×100 picture in a 100×100 box.
  const cover = toShownBox([{ x: 0.5, y: 0.5 }, { x: 0.05, y: 0.5 }], { w: 200, h: 100 }, { w: 100, h: 100 }, "cover");
  expect(cover).toEqual([{ x: 0.5, y: 0.5 }]);
  const contain = toShownBox([{ x: 0, y: 0 }], { w: 200, h: 100 }, { w: 100, h: 100 }, "contain");
  expect(contain).toEqual([{ x: 0, y: 0.25 }]);
});

test("saved stars are checked again before the shop draws them", () => {
  expect(safeSparkle({ points: [{ x: 0.2, y: 0.3, s: 1.2 }, { x: 2, y: 0 }], shape: "star", color: "#ffd700", size: 18, speed: 1.6, when: "hover", glow: true }))
    .toEqual({ points: [{ x: 0.2, y: 0.3, s: 1.2 }], shape: "star", color: "#ffd700", size: 18, speed: 1.6, when: "hover", glow: true });
  expect(safeSparkle({ points: [{ x: 0.5, y: 0.5 }], color: "url(x)", shape: "rocket", size: 900 })).toEqual({ points: [{ x: 0.5, y: 0.5 }] });
  expect(safeSparkle({ points: [] })).toBeNull();
  expect(safeSparkle("x")).toBeNull();
});
