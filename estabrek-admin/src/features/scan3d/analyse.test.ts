import { describe, expect, it } from "vitest";
import { analyse, type Analysis, type CheckId } from "./analyse";
import { draw, type Blob, type Scene } from "./testScene";
import type { Ellipse, Img } from "./vision";

// A whole filmed turn, drawn: a second of the mat turning with nothing on it, a hand
// putting the product down, then the product turning on the mat (5° a frame). The
// product's width changes with its angle, as a real one's would.

const W = 320;
const H = 200;
const MAT: Ellipse = { cx: 160, cy: 140, a: 100, b: 36, phi: 0 };
type Shot = { frames: Img[]; times: number[]; truth: number[] };

function film(opts: { turn?: number; noPlate?: boolean; spoil?: (k: number, s: Scene) => Scene } = {}): Shot {
  const frames: Img[] = [];
  const times: number[] = [];
  const truth: number[] = [];
  const base = (theta: number): Scene => ({ w: W, h: H, mat: MAT, theta, mirror: -1 });
  const product = (angle: number): Blob => ({ cx: 160, cy: 92, rx: 26 + 12 * Math.abs(Math.cos((angle * Math.PI) / 180)), ry: 56, rgb: [205, 45, 60] });
  let t = 0;
  let theta = 0;
  const shoot = (s: Scene, angle = NaN) => {
    frames.push(draw(s));
    times.push(t);
    truth.push(angle);
    t += 0.1;
  };
  if (!opts.noPlate) for (let k = 0; k < 10; k++, theta += 5) shoot(base(theta));
  // The hand comes in from the left with the product.
  for (let k = 0; k < 3; k++, theta += 5) shoot({ ...base(theta), product: product(0), extra: { cx: 40, cy: 90, rx: 60, ry: 22, rgb: [214, 170, 140] } });
  const steps = Math.round((opts.turn ?? 400) / 5);
  for (let k = 0; k < steps; k++, theta += 5) {
    const s: Scene = { ...base(theta), product: product(k * 5) };
    shoot(opts.spoil ? opts.spoil(k, s) : s, k * 5);
  }
  return { frames, times, truth };
}

const check = (a: Analysis, id: CheckId) => a.checks.find((c) => c.id === id);

describe("a filmed turn", { timeout: 60_000 }, () => {
  it("a good one: the empty start, the mat, one whole turn at the right angles", async () => {
    const shot = film();
    const seen: number[] = [];
    const a = await analyse({ frames: shot.frames, times: shot.times, onProgress: (f) => seen.push(f) });
    expect(a.verdict).not.toBe("reject");
    expect(a.checks.filter((c) => c.level === "reject")).toEqual([]);
    expect(a.plate!.seconds).toBeGreaterThan(0.6);
    expect(a.mat!.mirror).toBe(-1);
    expect(a.mat!.elevation).toBeCloseTo((Math.asin(36 / 100) * 180) / Math.PI, 0);
    expect(a.rotation).toBe(360);
    expect(a.turn.length).toBeGreaterThan(68);
    // Each frame's angle from the turn's first frame, as drawn.
    const first = shot.truth[a.turn[0].index];
    for (const f of a.turn) expect(Math.abs(f.angle - (shot.truth[f.index] - first))).toBeLessThan(2);
    // The product's size from the mat: 112 px tall; the mat's 92.5 mm is 100 px wide.
    expect(a.heightMm! / 10).toBeGreaterThan(10);
    expect(seen.at(-1)).toBeCloseTo(1, 5);
  });

  it("is refused when the background changes during the turn", async () => {
    const a = await analyse(film({ spoil: (k, s) => (k > 20 && k < 45 ? { ...s, edgeThing: true } : s) }));
    expect(a.verdict).toBe("reject");
    expect(check(a, "edges")!.level).toBe("reject");
  });

  it("is refused when the camera moves", async () => {
    const a = await analyse(film({ spoil: (k, s) => (k > 30 ? { ...s, shift: [7, -5] } : s) }));
    expect(a.verdict).toBe("reject");
    expect(a.checks.filter((c) => c.level === "reject").map((c) => c.id)).toEqual(expect.arrayContaining(["camera"]));
  });

  it("is refused when the product turns less than a whole turn", async () => {
    const a = await analyse(film({ turn: 250 }));
    expect(check(a, "turn")).toMatchObject({ level: "reject" });
    expect(check(a, "turn")!.value).toBeLessThan(260);
  });

  it("is refused without the empty start (the background can't be known)", async () => {
    const a = await analyse(film({ noPlate: true }));
    expect(check(a, "plate")).toMatchObject({ level: "reject" });
    expect(a.turn).toEqual([]);
  });
});
