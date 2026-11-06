import { describe, expect, it } from "vitest";
import {
  boundsOfQuad, cmsTransform, embedPlane, inverse3, inverse4, localAxisDelta,
  multiply3, multiply4, planeFromQuad, planeQuad, project3, project4, resizePlane,
  type Mat3, type Mat4, type Plane, type Point, type Size,
} from "../../../shared/geometry/plane";

const I: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const translate = (x: number, y: number): Mat3 => [1, 0, x, 0, 1, y, 0, 0, 1];
const close = (actual: Point | null, expected: Point, digits = 7) => {
  expect(actual).not.toBeNull();
  expect(actual!.x).toBeCloseTo(expected.x, digits);
  expect(actual!.y).toBeCloseTo(expected.y, digits);
};
const frameOf = (holder: Plane, size: Size, look: Record<string, unknown>, layout: Point, rtl = false): Plane => ({
  ...size,
  matrix: multiply3(holder.matrix, multiply3(translate(layout.x, layout.y), cmsTransform(look, size, rtl)!)),
});
const at = (plane: Plane, x: number, y: number) => project3(plane.matrix, { x: x * plane.w, y: y * plane.h })!;
const deltaBetween = (a: Point, b: Point): Point => ({ x: b.x - a.x, y: b.y - a.y });

describe("planar coordinate contract", () => {
  it("composes row-major matrices with column points in CSS order", () => {
    const m = multiply3([2, 0, 10, 0, 3, 20, 0, 0, 1], [0, -1, 4, 1, 0, 5, 0, 0, 1]);
    expect(m).toEqual([0, -2, 18, 3, 0, 35, 0, 0, 1]);
    close(project3(m, { x: 2, y: 7 }), { x: 4, y: 41 });
  });

  it("round trips deterministic affine and perspective points without losing decimals", () => {
    let seed = 931;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 80; i++) {
      const m: Mat3 = [0.5 + rand(), rand() * 0.3, rand() * 300, -rand() * 0.3, 0.5 + rand(), rand() * 200, rand() * 0.0002, rand() * 0.0002, 1];
      const p = { x: rand() * 500, y: rand() * 400 };
      close(project3(inverse3(m)!, project3(m, p)!), p, 8);
    }
  });

  it("inverts actual 4D transforms and embeds a plane without inventing depth", () => {
    const a: Mat4 = [2, 0, 0, 11, 0, 3, 0, 17, 0, 0, 4, -6, 0, 0, -0.001, 1];
    const b: Mat4 = [0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const m = multiply4(a, b);
    const p = { x: 5.2, y: 11.3, z: 20.5 };
    const restored = project4(inverse4(m)!, project4(m, p)!)!;
    close(restored, p);
    expect(restored.z).toBeCloseTo(p.z, 8);
    const h: Mat3 = [1.2, 0.2, 40, 0.1, 0.9, 20, 0.001, -0.002, 1];
    close(project4(embedPlane(h), { x: 50, y: 25 }), { x: 105, y: 47.5 });
    expect(project4(embedPlane(h), { x: 50, y: 25 })!.z).toBe(0);
  });

  it("recovers a nonuniform affine frame from measured local dimensions", () => {
    const m = planeFromQuad({ w: 80, h: 40 }, [{ x: 30, y: 40 }, { x: 150, y: 0 }, { x: 160, y: 80 }, { x: 40, y: 120 }]);
    close(project3(m!, { x: 20, y: 10 }), { x: 62.5, y: 50 });
    expect(boundsOfQuad(planeQuad(m!, { w: 80, h: 40 })!)).toEqual({ x: 30, y: 0, w: 130, h: 120 });
  });

  it("recovers the interior of a projective quad rather than fitting its AABB", () => {
    const m = planeFromQuad({ w: 100, h: 50 }, [
      { x: 40, y: 20 }, { x: 160 / 1.1, y: 30 / 1.1 },
      { x: 170, y: 75 }, { x: 50 / 0.9, y: 65 / 0.9 },
    ]);
    close(project3(m!, { x: 50, y: 25 }), { x: 105, y: 47.5 });
  });

  it("rejects singular, near edge-on, nonfinite, folded and camera-crossing geometry", () => {
    expect(inverse3([1, 0, 0, 0, 1e-13, 0, 0, 0, 1])).toBeNull();
    expect(inverse4([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])).toBeNull();
    expect(inverse3([1, 0, Infinity, 0, 1, 0, 0, 0, 1])).toBeNull();
    expect(project3(I, { x: NaN, y: 0 })).toBeNull();
    expect(project4([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1, 1], { x: 0, y: 0, z: 2 })).toBeNull();
    expect(planeQuad([1, 0, 0, 0, 1, 0, -0.02, 0, 1], { w: 100, h: 50 })).toBeNull();
    expect(planeFromQuad({ w: 100, h: 50 }, [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 100, y: 0 }, { x: 0, y: 50 }])).toBeNull();
    expect(boundsOfQuad([{ x: Infinity, y: 0 }])).toBeNull();
  });
});

describe("CMS transform and movement axes", () => {
  it("matches origin, anchor, move, rotation and scale CSS order including RTL", () => {
    const look = { origin: "top", rotateZ: 90, scale: 2, moveX: 10, moveY: 5, layer: { x: 50, y: 50, anchor: "center" } };
    close(project3(cmsTransform(look, { w: 100, h: 50 }, false)!, { x: 0, y: 0 }), { x: 10, y: -120 });
    close(project3(cmsTransform(look, { w: 100, h: 50 }, true)!, { x: 100, y: 50 }), { x: 10, y: 80 });
  });

  it("applies X then Y CSS rotations from right to left before perspective division", () => {
    const m = cmsTransform({ origin: "top", rotateX: 60, rotateY: 30, perspective: 800, scale: 1.2, moveX: 10, moveY: 20 }, { w: 200, h: 100 }, false)!;
    close(project3(m, { x: 0, y: 0 }), { x: 100 + (10 - 60 * Math.sqrt(3)) / 0.9625, y: (20 - 30 * Math.sqrt(3)) / 0.9625 });
    expect(cmsTransform({ rotateY: 90 }, { w: 200, h: 100 }, false)).toBeNull();
    expect(cmsTransform({ scale: NaN }, { w: 200, h: 100 }, false)).toBeNull();
  });

  it("projects an allowed local axis by nearest screen distance under skew", () => {
    const skew: Mat3 = [2, 1, 20, 0, 1, 30, 0, 0, 1];
    close(localAxisDelta(skew, { x: 10, y: 20 }, { x: 0, y: 10 }, "vertical"), { x: 0, y: 5 });
    close(localAxisDelta(skew, { x: 10, y: 20 }, { x: 0, y: 10 }, "horizontal"), { x: 0, y: 0 });
    close(localAxisDelta(skew, { x: 10, y: 20 }, { x: 0, y: 10 }, "both"), { x: -5, y: 10 });
  });

  it("maps perspective movement with start and end points instead of a linear delta", () => {
    const m: Mat3 = [1, 0, 0, 0, 1, 0, 0.01, 0, 1];
    close(localAxisDelta(m, { x: 100, y: 40 }, { x: 10, y: -4 }, "free"), { x: 50, y: 0 });
    close(localAxisDelta(m, { x: 100, y: 40 }, { x: 10, y: -4 }, "horizontal"), { x: 50, y: 0 });
  });
});

describe("resize in local dimensions with a fixed opposite point", () => {
  const holder: Plane = { matrix: [0.75, -0.8, 180, 1.2, 1.6, 70, 0, 0, 1], w: 900, h: 700 };
  for (const angle of [44.9, 45, 45.1]) {
    for (const origin of ["top", "center", "bottom"]) {
      it(`retains local size and the opposite corner at ${angle} degrees, ${origin} origin`, () => {
        const look = { rotateZ: angle, scale: 1.4, origin };
        const frame = frameOf(holder, { w: 200, h: 100 }, look, { x: 30, y: 40 });
        const delta = { x: frame.matrix[0] * 40 + frame.matrix[1] * 20, y: frame.matrix[3] * 40 + frame.matrix[4] * 20 };
        const result = resizePlane(frame, holder, look, "se", delta, { rtl: false })!;
        expect(result).not.toBeNull();
        expect(result.size.w).toBeCloseTo(240, 6);
        expect(result.size.h).toBeCloseTo(120, 6);
        close(project3(result.matrix, { x: 0, y: 0 }), at(frame, 0, 0));
        const oldActive = at(frame, 1, 1);
        close(project3(result.matrix, { x: result.size.w, y: result.size.h }), { x: oldActive.x + delta.x, y: oldActive.y + delta.y });
      });
    }
  }

  it("retains the entire opposite affine edge when resizing west", () => {
    const look = { rotateZ: 33, origin: "bottom" };
    const frame = frameOf(holder, { w: 200, h: 100 }, look, { x: 80, y: 60 });
    const delta = { x: frame.matrix[0] * 25, y: frame.matrix[3] * 25 };
    const result = resizePlane(frame, holder, look, "w", delta, { rtl: false })!;
    expect(result.size.w).toBeCloseTo(175, 6);
    expect(result.size.h).toBeCloseTo(100, 6);
    close(project3(result.matrix, { x: result.size.w, y: 0 }), at(frame, 1, 0));
    close(project3(result.matrix, { x: result.size.w, y: result.size.h }), at(frame, 1, 1));
  });

  for (const rtl of [false, true]) {
    for (const origin of ["top", "center", "bottom"]) {
      it(`solves its own X/Y perspective corner resize, ${origin} origin, rtl=${rtl}`, () => {
        const look = { rotateX: 28, rotateY: -34, rotateZ: 17, perspective: 700, moveX: 13, moveY: -8, origin, layer: { x: 40, y: 30, anchor: "bottom-end" } };
        const frame = frameOf(holder, { w: 180, h: 90 }, look, { x: 140, y: 100 }, rtl);
        const wantedSize = { w: 235, h: 125 };
        const newOwn = cmsTransform(look, wantedSize, rtl)!;
        const oldFixedHolder = project3(inverse3(holder.matrix)!, at(frame, 1, 1))!;
        const newFixedOwn = project3(newOwn, { x: wantedSize.w, y: wantedSize.h })!;
        const wanted = frameOf(holder, wantedSize, look, deltaBetween(newFixedOwn, oldFixedHolder), rtl);
        const result = resizePlane(frame, holder, look, "nw", deltaBetween(at(frame, 0, 0), at(wanted, 0, 0)), { rtl })!;
        expect(result).not.toBeNull();
        expect(result.size.w).toBeCloseTo(235, 5);
        expect(result.size.h).toBeCloseTo(125, 5);
        close(project3(result.matrix, { x: result.size.w, y: result.size.h }), at(frame, 1, 1));
        close(project3(result.matrix, { x: 0, y: 0 }), at(wanted, 0, 0), 5);
        close(result.layout, deltaBetween(newFixedOwn, oldFixedHolder), 5);
      });
    }
  }

  it("enforces minimums and a kept ratio without moving the fixed corner", () => {
    const frame = frameOf(holder, { w: 200, h: 100 }, {}, { x: 30, y: 40 });
    const result = resizePlane(frame, holder, {}, "nw", { x: 3000, y: 4000 }, { rtl: false, keep: true, min: 8 })!;
    expect(result.size).toEqual({ w: 16, h: 8 });
    close(project3(result.matrix, { x: 16, y: 8 }), at(frame, 1, 1));
  });

  it("reanchors after dimension constraints and rejects infeasible dimensions", () => {
    const frame = frameOf(holder, { w: 200, h: 100 }, { origin: "bottom", rotateZ: 35 }, { x: 30, y: 40 });
    const result = resizePlane(frame, holder, { origin: "bottom", rotateZ: 35 }, "nw", { x: 30, y: 30 }, { rtl: false, constrain: () => ({ w: 180, h: 120 }) })!;
    expect(result.size).toEqual({ w: 180, h: 120 });
    close(project3(result.matrix, { x: 180, y: 120 }), at(frame, 1, 1));
    expect(resizePlane(frame, holder, { origin: "bottom", rotateZ: 35 }, "nw", { x: 30, y: 30 }, { rtl: false, constrain: () => null })).toBeNull();
  });

  it("rejects unsupported context recovery and edge-on geometry without a patch", () => {
    const frame: Plane = { matrix: [1, 0.2, 30, 0, 1, 40, 0, 0, 1], w: 200, h: 100 };
    expect(resizePlane(frame, { matrix: I, w: 900, h: 700 }, {}, "se", { x: 20, y: 10 }, { rtl: false })).toBeNull();
    expect(resizePlane({ ...frame, matrix: [1e-14, 0, 30, 0, 1, 40, 0, 0, 1] }, { matrix: I, w: 900, h: 700 }, {}, "se", { x: 20, y: 10 }, { rtl: false })).toBeNull();
  });

  it("accepts browser serialized transform rounding within a screen residual budget", () => {
    const look = { origin: "bottom", rotateX: 28, rotateY: -34, rotateZ: 17, perspective: 700 };
    const exact = frameOf(holder, { w: 180, h: 90 }, look, { x: 140, y: 100 });
    const frame = { ...exact, matrix: exact.matrix.map((value) => Number(value.toPrecision(6))) as unknown as Mat3 };
    const result = resizePlane(frame, holder, look, "se", { x: 30, y: 15 }, { rtl: false });
    expect(result).not.toBeNull();
    close(project3(result!.matrix, { x: 0, y: 0 }), at(frame, 0, 0));
    close(project3(result!.matrix, { x: result!.size.w, y: result!.size.h }), { x: at(frame, 1, 1).x + 30, y: at(frame, 1, 1).y + 15 }, 5);
  });
});
