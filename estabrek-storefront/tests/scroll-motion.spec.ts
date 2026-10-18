import { test, expect } from "@playwright/test";
import { createScrollProgressMotion, springStep } from "../src/components/cinematic/scrollProgressMotion";

/** Drives the real controller with a fake display clock at `fps` for `seconds`. */
function run(fps: number, seconds: number, script: (motion: ReturnType<typeof createScrollProgressMotion>, t: number) => void) {
  const originals = ["document", "requestAnimationFrame", "cancelAnimationFrame"].map(key =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  let pending: FrameRequestCallback | null = null;
  let shown = 0;
  try {
    Object.defineProperty(globalThis, "document", { configurable: true, value: { hidden: false, addEventListener() {}, removeEventListener() {} } });
    Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, value: (callback: FrameRequestCallback) => { pending = callback; return 1; } });
    Object.defineProperty(globalThis, "cancelAnimationFrame", { configurable: true, value: () => { pending = null; } });
    const motion = createScrollProgressMotion(p => { shown = p; });
    const frames = Math.round(seconds * fps);
    for (let i = 0; i <= frames; i++) {
      const t = i / fps;
      script(motion, t);
      const callback = pending;
      pending = null;
      callback?.(1000 + t * 1000);
    }
    motion.stop();
    return shown;
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

test("the spring gives the same answer whatever the step: 20, 30, 60, 90, 120, 144, 165 fps", () => {
  const results = [20, 30, 60, 90, 120, 144, 165].map(fps => {
    // Already moving the other way, and a soft spring so one second is still mid-way.
    let value = 0.6, velocity = -2;
    for (let i = 0; i < fps; i++) ({ value, velocity } = springStep(value, 0.9, velocity, 0.5, 1 / fps));
    return value;
  });
  expect(0.9 - results[0]).toBeGreaterThan(0.01);
  expect(Math.max(...results) - Math.min(...results), results.join(", ")).toBeLessThan(1e-9);
});

test("every scroll scene shows the same place at the same moment on 20–240 fps displays", () => {
  const go = (motion: ReturnType<typeof createScrollProgressMotion>, t: number) => { if (t === 0) motion.target(0.8); };
  for (const at of [0.1, 0.2, 0.3]) { // moments that are a frame on every one of these screens
    const shown = [20, 30, 60, 90, 120, 180, 240].map(fps => run(fps, at, go));
    expect(Math.max(...shown) - Math.min(...shown), `${at}s: ${shown.join(", ")}`).toBeLessThan(1e-9);
  }
});

test("a reversal mid-way settles on the new place without overshoot at any frame rate", () => {
  // Scroll is sampled once a frame, so a slower screen learns of the reversal a little later;
  // every one still turns back smoothly and arrives.
  for (const fps of [20, 30, 60, 90, 120, 144, 165]) {
    let reversed = false;
    const shown = run(fps, 0.7, (motion, t) => {
      if (t === 0) motion.target(0.8);
      if (!reversed && t >= 0.1) { reversed = true; motion.target(0.3); }
    });
    expect(shown, `${fps}fps`).toBeGreaterThanOrEqual(0.3);
    expect(shown, `${fps}fps`).toBeLessThan(0.3005);
  }
});

test("a phone below 30 fps is not played in slow motion", () => {
  const go = (motion: ReturnType<typeof createScrollProgressMotion>, t: number) => { if (t === 0) motion.target(1); };
  const computer = run(120, 0.2, go);
  const busyPhone = run(20, 0.2, go);
  expect(computer).toBeGreaterThan(0.5);
  expect(Math.abs(busyPhone - computer)).toBeLessThan(0.002);
});

test("the spring settles on the target without overshoot", () => {
  let value = 0, velocity = 0;
  for (let i = 0; i < 120; i++) {
    ({ value, velocity } = springStep(value, 1, velocity, 0.09, 1 / 120));
    expect(value).toBeLessThanOrEqual(1);
  }
  expect(value).toBeCloseTo(1, 4);
  // Reversing at full speed slows down and comes back without passing the new target.
  ({ value, velocity } = springStep(0.5, 1, 0, 0.09, 0.05));
  const fast = velocity;
  for (let i = 0; i < 120; i++) {
    ({ value, velocity } = springStep(value, 0.2, velocity, 0.09, 1 / 60));
    expect(value).toBeGreaterThanOrEqual(0.2);
  }
  expect(fast).toBeGreaterThan(0);
  expect(value).toBeCloseTo(0.2, 3);
});
