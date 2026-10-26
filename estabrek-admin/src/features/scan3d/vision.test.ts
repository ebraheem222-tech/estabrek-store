import { describe, expect, it } from "vitest";
import { MAT_CODE, MAT_R, type MatStyle } from "./mat";
import { draw, inBlob, type Blob } from "./testScene";
import {
  borderBand,
  cleanMask,
  codeProfile,
  edgeChange,
  findMat,
  fitEllipse,
  foregroundScore,
  gainOf,
  inkAndPaper,
  iou,
  matAngle,
  fitMatModel,
  matMap,
  matProject,
  matUnproject,
  scaleAbout,
  onEllipse,
  ringsInPlace,
  toEllipse,
  type Ellipse,
} from "./vision";

// The scan's picture work on drawn scenes: a mat seen from the front and above (an
// ellipse), turned by a known angle, a product standing on it, its shadow, a background.

const W = 480;
const H = 300;
const MAT: Ellipse = { cx: 240, cy: 205, a: 150, b: 55, phi: 0.02 };
// The drawn mat has no perspective: its rings share one centre.
const FIT = { outer: MAT, inner: scaleAbout(MAT, MAT_R.innerRingMid) };
const MODEL = fitMatModel(FIT);

describe("the printed mat's code", () => {
  it("is a maximum-length sequence: one sharp match all round", () => {
    expect(MAT_CODE).toHaveLength(63);
    expect(MAT_CODE.filter((b) => b).length).toBe(32);
    for (let s = 1; s < 63; s++) {
      let c = 0;
      for (let i = 0; i < 63; i++) c += (2 * MAT_CODE[i] - 1) * (2 * MAT_CODE[(i + s) % 63] - 1);
      expect(c).toBe(-1);
    }
  });
});

describe("ellipses", () => {
  it("are found again from points on them, a little noisy", () => {
    const e: Ellipse = { cx: 210, cy: 140, a: 120, b: 40, phi: 0.3 };
    const xs: number[] = [];
    const ys: number[] = [];
    for (let k = 0; k < 300; k++) {
      const [x, y] = onEllipse(e, 1 + Math.sin(k * 12.9898) * 0.004, (k / 300) * 2 * Math.PI);
      xs.push(x);
      ys.push(y);
    }
    const f = fitEllipse(xs, ys)!;
    expect(f.cx).toBeCloseTo(e.cx, 0);
    expect(f.cy).toBeCloseTo(e.cy, 0);
    expect(Math.abs(f.a - e.a)).toBeLessThan(1);
    expect(Math.abs(f.b - e.b)).toBeLessThan(1);
    expect(Math.abs(f.phi - e.phi)).toBeLessThan(0.01);
    const p = toEllipse(e, ...onEllipse(e, 0.8, 1.2));
    expect(p.r).toBeCloseTo(0.8, 6);
    expect(p.t).toBeCloseTo(1.2, 6);
  });
});

describe("the camera, from the mat's two rings", () => {
  it("is found again: its height, distance and scale, the perspective included", () => {
    const truth = { cx: 300, cy: 260, phi: 0.03, k: 180, rho: 0.22, e: (28 * Math.PI) / 180 };
    const ring = (R: number) => {
      const xs: number[] = [];
      const ys: number[] = [];
      for (let n = 0; n < 200; n++) {
        const [x, y] = matProject(truth, R, (n / 200) * 2 * Math.PI);
        xs.push(x);
        ys.push(y);
      }
      return fitEllipse(xs, ys)!;
    };
    const m = fitMatModel({ outer: ring(1), inner: ring(MAT_R.innerRingMid) });
    expect(Math.abs(m.e - truth.e)).toBeLessThan(0.02);
    expect(Math.abs(m.rho - truth.rho)).toBeLessThan(0.03);
    expect(Math.abs(m.k / truth.k - 1)).toBeLessThan(0.02);
    expect(Math.hypot(m.cx - truth.cx, m.cy - truth.cy)).toBeLessThan(1.5);
    // Back and forth through it.
    const [x, y] = matProject(m, 0.85, 1.1);
    const back = matUnproject(m, x, y);
    expect(back.r).toBeCloseTo(0.85, 5);
    expect(back.t).toBeCloseTo(1.1, 5);
  });
});

describe("the mat in the video", () => {
  const plate = draw({ w: W, h: H, mat: MAT, theta: 0, mirror: 1 });

  it("is found in the empty frame: its two rings, one centre", () => {
    const fit = findMat(plate)!;
    expect(fit).not.toBeNull();
    expect(Math.abs(fit.outer.cx - MAT.cx)).toBeLessThan(2);
    expect(Math.abs(fit.outer.cy - MAT.cy)).toBeLessThan(2);
    expect(Math.abs(fit.outer.a / MAT.a - 1)).toBeLessThan(0.03);
    expect(Math.abs(fit.outer.b / MAT.b - 1)).toBeLessThan(0.06);
    expect(Math.abs(fit.inner.a / fit.outer.a - MAT_R.innerRingMid)).toBeLessThan(0.03);
    expect(findMat(draw({ w: W, h: H, mat: null, theta: 0, mirror: 1 }))).toBeNull();
  });

  it("tells how far it has turned, also half hidden by the product, mirrored or not", () => {
    for (const mirror of [1, -1] as const)
      for (const theta of [0, 37.5, 123, 250.2, 359]) {
        const product: Blob = { cx: 240, cy: 140, rx: 70, ry: 95, rgb: [200, 40, 60] };
        const img = draw({ w: W, h: H, mat: MAT, theta, mirror, product });
        const { v, w } = codeProfile(img, MODEL, inkAndPaper(img, MODEL));
        const got = matAngle(v, w);
        const err = Math.abs(((got.theta - theta + 540) % 360) - 180);
        expect(got.mirror).toBe(mirror);
        expect(err).toBeLessThan(1.5);
        expect(got.score).toBeGreaterThan(0.7);
      }
  });

  it("knows when the camera has moved: the rings aren't where they were", () => {
    const colours = inkAndPaper(plate, MODEL);
    expect(ringsInPlace(plate, MODEL, colours)).toBeGreaterThan(0.9);
    const moved = draw({ w: W, h: H, mat: { ...MAT, cx: MAT.cx + 9, cy: MAT.cy - 6 }, theta: 0, mirror: 1 });
    expect(ringsInPlace(moved, MODEL, colours)).toBeLessThan(0.5);
  });
});

describe("the product's mask", () => {
  const plate = draw({ w: W, h: H, mat: MAT, theta: 10, mirror: 1 });
  const band = borderBand(W, H);
  const truth = (b: Blob) => {
    const m = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) m[y * W + x] = inBlob(b, x, y) ? 1 : 0;
    return m;
  };

  const maskOf = (style: MatStyle, rgb: [number, number, number]) => {
    const plate = draw({ w: W, h: H, mat: MAT, theta: 10, mirror: 1, style });
    const product: Blob = { cx: 240, cy: 140, rx: 60, ry: 100, rgb };
    const shadow: Blob = { cx: 300, cy: 225, rx: 70, ry: 14, rgb: [0, 0, 0] };
    const theta = 200;
    const frame = draw({ w: W, h: H, mat: MAT, theta, mirror: 1, product, shadow, gain: 0.85, style });
    const gain = gainOf(frame, plate, band);
    expect(gain).toBeCloseTo(1 / 0.85, 1);
    const score = foregroundScore(frame, plate, gain, 0.01, { map: matMap(MODEL, W, H), theta, mirror: 1, colours: inkAndPaper(frame, MODEL) });
    return { m: cleanMask(score, W, H), product };
  };

  it("is the product on the coloured mat, black, white, grey or red, over the turning code too; its shadow is left out", () => {
    for (const rgb of [
      [200, 40, 60],
      [20, 20, 22],
      [240, 240, 238],
      [96, 96, 100],
    ] as Array<[number, number, number]>) {
      const { m, product } = maskOf("colour", rgb);
      const tr = truth(product);
      // On failure: how many pixels were wrong each way.
      let extra = 0;
      let missing = 0;
      for (let i = 0; i < tr.length; i++) {
        if (m.mask[i] && !tr[i]) extra++;
        if (!m.mask[i] && tr[i]) missing++;
      }
      expect(iou(m.mask, tr), `${rgb}: ${extra} extra, ${missing} missing`).toBeGreaterThan(0.95);
      expect(m.touches).toEqual({ left: false, right: false, top: false, bottom: false });
    }
  });

  it("on the black-and-white mat a coloured product is whole; a black one loses only what is over the mat's black", () => {
    expect(iou(maskOf("mono", [200, 40, 60]).m.mask, truth(maskOf("mono", [200, 40, 60]).product))).toBeGreaterThan(0.95);
    const black = maskOf("mono", [20, 20, 22]);
    expect(iou(black.m.mask, truth(black.product))).toBeGreaterThan(0.85);
  });

  it("sees a change at the frame's edges (something came in, the camera moved)", () => {
    const same = draw({ w: W, h: H, mat: MAT, theta: 10, mirror: 1 });
    expect(edgeChange(same, plate, band, 1, 0.01)).toBeLessThan(0.01);
    const changed = draw({ w: W, h: H, mat: MAT, theta: 10, mirror: 1, edgeThing: true });
    expect(edgeChange(changed, plate, band, 1, 0.01)).toBeGreaterThan(0.05);
  });
});
