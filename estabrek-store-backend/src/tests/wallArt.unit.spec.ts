import { describe, expect, test } from "vitest";
import { ProductDeepUpdateBody, WALL_CM, WALL_FRAMES } from "../modules/admin/catalog.schemas.js";
import * as shared from "../../../shared/wallArt";

// «شوفها على حيطك» (shared/wallArt.ts): a piece for a wall at its real size: its size read from a size's name, where
// it hangs on a wall the camera found, the drawn room, and the server's check of what the admin saves.

describe("a size read from a size's name", () => {
  test("width × height in centimetres, however it is written", () => {
    for (const [name, w, h] of [
      ["50×70", 50, 70], ["50 x 70 cm", 50, 70], ["50X70", 50, 70], ["50*70", 50, 70], ["٥٠×٧٠ سم", 50, 70], ["۵۰×۷۰", 50, 70],
      ["لوحة 60 في 90", 60, 90], ["0.5×0.7 م", 50, 70], ["500×700 mm", 50, 70], ["20x30 in", 50.8, 76.2], ["29,7 × 42", 29.7, 42],
      ["A3", 29.7, 42], ["A4 portrait", 21, 29.7], ["Poster A1", 59.4, 84.1],
    ] as const) expect(shared.sizeFromName(name), name).toEqual({ w, h });
  });
  test("nothing for a name that says no size, or a size no wall takes", () => {
    for (const name of ["S", "M", "XL", "كبير", "One size", "", "2x3", "600×700", null, 50]) expect(shared.sizeFromName(name), String(name)).toBeNull();
  });
  test("the size chosen's own size when it has one, else the product's", () => {
    const art = { w: 50, h: 70, frame: "wood" as const };
    expect(shared.wallSizeFor(art, "70×100")).toEqual({ w: 70, h: 100, frame: "wood" });
    expect(shared.wallSizeFor(art, "M")).toEqual(art);
    expect(shared.wallSizeFor(art, null)).toEqual(art);
  });
});

describe("the product's wall size", () => {
  test("both sides in range, the frame known (else none); null when it isn't a piece for a wall", () => {
    expect(shared.wallArtOf({ wallWidthCm: 50, wallHeightCm: 70, wallFrame: "gold" })).toEqual({ w: 50, h: 70, frame: "gold" });
    expect(shared.wallArtOf({ wallWidthCm: 50, wallHeightCm: 70, wallFrame: "neon" })).toEqual({ w: 50, h: 70, frame: "none" });
    for (const bad of [{}, { wallWidthCm: 50 }, { wallWidthCm: 4, wallHeightCm: 70 }, { wallWidthCm: 50, wallHeightCm: 501 }, { wallWidthCm: "50", wallHeightCm: 70 }, null]) expect(shared.wallArtOf(bad as never)).toBeNull();
  });
  test("the server takes the same frames and sizes, and refuses others", () => {
    expect([...WALL_FRAMES]).toEqual([...shared.WALL_FRAMES]);
    expect(WALL_CM).toEqual(shared.WALL_CM);
    const save = (product: Record<string, unknown>) => ProductDeepUpdateBody.safeParse({ product });
    expect(save({ wallWidthCm: 50, wallHeightCm: 70, wallFrame: "wood" }).success).toBe(true);
    expect(save({ wallWidthCm: null, wallHeightCm: null, wallFrame: null }).success).toBe(true);
    expect(save({ wallWidthCm: 600 }).success).toBe(false);
    expect(save({ wallHeightCm: 2 }).success).toBe(false);
    expect(save({ wallFrame: "neon" }).success).toBe(false);
  });
});

describe("hanging it on a wall the camera found", () => {
  // A hit test's pose: a 4×4 column-major matrix whose y axis is the surface's normal.
  const pose = (normal: [number, number, number], at: [number, number, number] = [0.2, 1.4, -2]) => {
    const n = normal.map((v) => v / Math.hypot(...normal));
    return [1, 0, 0, 0, n[0], n[1], n[2], 0, 0, 0, 1, 0, at[0], at[1], at[2], 1];
  };
  const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 5));
  test("a wall facing the room: its face toward us, its top up, its right to the right, where the camera hit", () => {
    const got = shared.wallPose(pose([0, 0, 1]))!;
    expect(got.position).toEqual([0.2, 1.4, -2]);
    close(got.basis, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    // A wall to the side (facing +x): still upright, its right toward −z.
    close(shared.wallPose(pose([1, 0, 0]))!.basis, [0, 0, -1, 0, 1, 0, 1, 0, 0]);
  });
  test("a wall leaning a little: its top still goes up, square to the wall", () => {
    const b = shared.wallPose(pose([0, 0.3, 1]))!.basis;
    const right = b.slice(0, 3), up = b.slice(3, 6), n = b.slice(6, 9);
    const dot = (a: number[], c: number[]) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
    expect(up[1]).toBeGreaterThan(0.9);
    expect(dot(up, n)).toBeCloseTo(0, 6);
    expect(dot(right, n)).toBeCloseTo(0, 6);
    expect(dot(right, up)).toBeCloseTo(0, 6);
  });
  test("a floor, a table or a ceiling takes nothing", () => {
    expect(shared.wallPose(pose([0, 1, 0]))).toBeNull();
    expect(shared.wallPose(pose([0, -1, 0]))).toBeNull();
    expect(shared.wallPose(pose([0, 1, 0.4]))).toBeNull();
  });
});

describe("the drawn room", () => {
  test("by centimetres: in the middle of the wall, its middle at eye level, never down onto the sofa", () => {
    const k = 720 / shared.ROOM.wallCm;
    const small = shared.roomBox({ w: 50, h: 70 }, 720, 3);
    expect(small.w).toBeCloseTo(56 * k);
    expect(small.h).toBeCloseTo(76 * k);
    expect(small.left + small.w / 2).toBeCloseTo(360);
    expect(small.bottomCm + 76 / 2).toBeCloseTo(shared.ROOM.eyeCm);
    // A tall one is lifted: its lowest edge 20 cm over the sofa's back.
    const tall = shared.roomBox({ w: 80, h: 160 }, 720);
    expect(tall.bottomCm).toBeCloseTo(shared.ROOM.sofaBackCm + 20);
  });
});
