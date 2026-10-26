import { describe, test, expect } from "vitest";
import { ScanLink, ScanManifest } from "../lib/scanManifest.js";
import { spinOf } from "../lib/productSpins.js";

// 360° scans (admin → الوسائط → مسح 3D): the sheet's manifest is checked before it is kept.

const good = {
  version: 1,
  cols: 9,
  rows: 8,
  cellW: 240,
  cellH: 320,
  frames: Array.from({ length: 72 }, (_, k) => ({ angle: k * 5, time: 1.2 + k * 0.1 })),
  elevation: 22.5,
  heightMm: 180,
  video: { name: "controller.mp4", duration: 12.4, width: 1920, height: 1080 },
  checks: [{ id: "turn", level: "ok", value: 360 }],
};

describe("a scan's manifest", () => {
  test("a whole one passes", () => {
    expect(ScanManifest.parse(good)).toEqual(good);
    expect(ScanManifest.parse({ ...good, elevation: null, heightMm: null }).elevation).toBeNull();
  });

  test("anything off is refused", () => {
    expect(ScanManifest.safeParse({ ...good, version: 2 }).success).toBe(false);
    expect(ScanManifest.safeParse({ ...good, cols: 2, rows: 2 }).success).toBe(false); // 72 frames in 4 cells
    expect(ScanManifest.safeParse({ ...good, frames: good.frames.slice(0, 4) }).success).toBe(false);
    expect(ScanManifest.safeParse({ ...good, frames: [{ angle: 400, time: 0 }, ...good.frames.slice(1)] }).success).toBe(false);
    expect(ScanManifest.safeParse({ ...good, checks: [{ id: "turn", level: "great" }] }).success).toBe(false);
    expect(ScanManifest.safeParse({ ...good, extra: "<script>" }).success).toBe(false);
  });
});

describe("a scan as a product's 360° view", () => {
  const plain = { ...good, elevation: null, heightMm: null, checks: [], mode: "plain", background: "#ffffff", product: { id: "prod_1", itemId: "item_red" }, model: { url: "https://res.cloudinary.com/x/raw/upload/m.glb" } };

  test("a plain video's view, linked to a product's colour, with its 3D model, passes; odd links don't", () => {
    expect(ScanManifest.parse(plain)).toEqual(plain);
    expect(ScanManifest.parse({ ...plain, product: null, model: null, background: "cut" }).product).toBeNull();
    expect(ScanManifest.safeParse({ ...plain, background: "red" }).success).toBe(false);
    expect(ScanManifest.safeParse({ ...plain, product: { id: "a b" } }).success).toBe(false);
    expect(ScanManifest.safeParse({ ...plain, model: { url: "javascript:alert(1)" } }).success).toBe(false);
    expect(ScanManifest.safeParse({ ...plain, model: { url: "//evil.test/m.glb" } }).success).toBe(false);
    expect(ScanLink.parse({ productId: "prod_1", itemId: null, modelUrl: "/uploads/models/m.glb" })).toEqual({ productId: "prod_1", itemId: null, modelUrl: "/uploads/models/m.glb" });
    expect(ScanLink.safeParse({ productId: "x", extra: 1 }).success).toBe(false);
  });

  test("the shop gets its sheet's grid, the colour it shows and its model; a broken one is left out", () => {
    const local = (rel: string) => `http://api.test${rel}`;
    expect(spinOf({ id: "s1", url: null, filename: "scans/a.webp", videoMeta: plain }, local)).toEqual({ id: "s1", url: "http://api.test/uploads/scans/a.webp", cols: 9, rows: 8, cellW: 240, cellH: 320, count: 72, itemId: "item_red", modelUrl: "https://res.cloudinary.com/x/raw/upload/m.glb" });
    expect(spinOf({ id: "s2", url: "https://res.cloudinary.com/x/s.webp", filename: "x", videoMeta: { ...good, elevation: null, heightMm: null } }, local)).toMatchObject({ url: "https://res.cloudinary.com/x/s.webp", itemId: null, modelUrl: null });
    expect(spinOf({ id: "s3", url: null, filename: "x", videoMeta: { version: 9 } }, local)).toBeNull();
  });
});
