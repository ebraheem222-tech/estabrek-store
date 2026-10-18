import { test, expect } from "@playwright/test";
import { createFilmScrubber } from "../src/components/cinematic/heroFilmPlayback";
import { advanceScrollMotion } from "../src/components/cinematic/heroScrollMotion";

test("scroll motion follows elapsed time consistently at 15/30/60/120/165fps", () => {
  const positions = [15, 30, 60, 120, 165].map(fps => {
    let position = 0;
    let elapsed = 0;
    while (elapsed < .5 - 1e-9) {
      const dt = Math.min(1 / fps, .5 - elapsed);
      position = advanceScrollMotion(position, 1, dt);
      elapsed += dt;
    }
    return position;
  });
  expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1e-10);
  // Smooth time 0.11 s (heroScrollMotion.ts): 99% of the way in half a second.
  expect(positions[0]).toBeGreaterThan(.985);
  expect(advanceScrollMotion(0, 1, .1)).toBeGreaterThan(.55);
  expect(advanceScrollMotion(0, 1, .1)).toBeLessThan(.9);
});

test("scroll motion reverses without overshoot and remains stable after a missed frame", () => {
  const forward = advanceScrollMotion(.2, .8, .03);
  expect(forward).toBeGreaterThan(.2);
  expect(forward).toBeLessThan(.8);
  const reverse = advanceScrollMotion(forward, .1, .05);
  expect(reverse).toBeGreaterThan(.1);
  expect(reverse).toBeLessThan(forward);
  expect(advanceScrollMotion(.3, .9, 5)).toBeCloseTo(.9);
  expect(advanceScrollMotion(.3, .9, 0)).toBe(.3);
});

test("a completed seek is presented before another target can start decoding", () => {
  const originals = ["document", "requestAnimationFrame", "cancelAnimationFrame", "HTMLMediaElement"].map(key =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  let pending: FrameRequestCallback | null = null;
  const targets: number[] = [];
  const presented: number[] = [];
  try {
    Object.defineProperty(globalThis, "document", { configurable: true, value: { hidden: false, documentElement: { dataset: {} }, addEventListener() {}, removeEventListener() {} } });
    Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, value: (callback: FrameRequestCallback) => { pending = callback; return 1; } });
    Object.defineProperty(globalThis, "cancelAnimationFrame", { configurable: true, value: () => { pending = null; } });
    Object.defineProperty(globalThis, "HTMLMediaElement", { configurable: true, value: { HAVE_METADATA: 1, HAVE_CURRENT_DATA: 2 } });
    const beat = (time: number) => { const callback = pending; pending = null; callback?.(time); };
    class Video extends EventTarget {
      readyState = 2;
      duration = 10;
      seeking = false;
      private time = 0;
      get currentTime() { return this.time; }
      set currentTime(value: number) { this.time = value; this.seeking = true; targets.push(value); }
    }
    const video = new Video();
    const scrubber = createFilmScrubber(video as unknown as HTMLVideoElement, index => presented.push(index));
    try {
      scrubber.update(.5);
      beat(1000);
      expect(targets).toHaveLength(1);
      scrubber.update(.9);
      scrubber.update(.1); // Coalesce a rapid reversal while decoding.
      // Browsers clear seeking before dispatching the queued seeked event.
      video.seeking = false;
      beat(1100);
      expect(targets).toHaveLength(1);
      video.dispatchEvent(new Event("seeked"));
      expect(presented).toEqual([600]); // 120 fps: half way through 10 s
      expect(targets).toHaveLength(1);
      beat(1200);
      expect(targets).toHaveLength(2);
      expect(targets[1]).toBeCloseTo(1.00083, 4); // frame 120, a tenth into it
    } finally { scrubber.stop(); }
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

// Exercise the real scheduler with a deterministic display clock. Browser
// integration tests separately exercise native media decoding and WebGL.
// There is no fixed seek budget: the screen paces it, one seek per frame at most,
// and the next only after the last one was shown.
test("fast decoders get at most one seek per display frame on 90/120/144Hz displays", () => {
  const originals = ["document", "requestAnimationFrame", "cancelAnimationFrame", "HTMLMediaElement"].map(key =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  try {
    for (const hz of [90, 120, 144]) {
      let pending: FrameRequestCallback | null = null;
      let seeks = 0;
      Object.defineProperty(globalThis, "document", { configurable: true, value: { hidden: false, documentElement: { dataset: {} }, addEventListener() {}, removeEventListener() {} } });
      Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, value: (callback: FrameRequestCallback) => { pending = callback; return 1; } });
      Object.defineProperty(globalThis, "cancelAnimationFrame", { configurable: true, value: () => { pending = null; } });
      Object.defineProperty(globalThis, "HTMLMediaElement", { configurable: true, value: { HAVE_METADATA: 1, HAVE_CURRENT_DATA: 2 } });
      class ReadyVideo extends EventTarget {
        readyState = 2;
        duration = 10;
        seeking = false;
        private time = 0;
        get currentTime() { return this.time; }
        set currentTime(value: number) { this.time = value; seeks++; this.dispatchEvent(new Event("seeked")); }
      }
      const video = new ReadyVideo();
      const scrubber = createFilmScrubber(video as unknown as HTMLVideoElement, () => {});
      for (let i = 0; i < hz * 10; i++) {
        // Distinct frame targets allow every budgeted seek to complete instantly.
        scrubber.update(((i * 17) % 239) / 238);
        const callback = pending;
        pending = null;
        if (callback) (callback as FrameRequestCallback)(1000 + i * 1000 / hz);
      }
      scrubber.stop();
      expect(seeks, `${hz}Hz`).toBeLessThanOrEqual(hz * 10);
      expect(seeks, `${hz}Hz`).toBeGreaterThanOrEqual(hz * 10 * 0.95);
    }
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
