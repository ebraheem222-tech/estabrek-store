import { expect, test } from "@playwright/test";
import { endlessOf, perfMarks, perfNeeded, perfOf } from "../src/pageTree/perf";

// An element's own speed settings as the shop reads them (pageTree/perf.ts): checked again, the page's marks, and
// whether the page needs them at work (TreePerf).

test("speed settings are read again; unknown values drop out", () => {
  expect(perfOf({ tier: "light", fps: 30, offscreen: "keep", rest: "keep", phone: "light", strong: true })).toEqual({ tier: "light", fps: 30, offscreen: "keep", rest: "keep", phone: "light", strong: true });
  expect(perfOf({ tier: "turbo", fps: 144 })).toBeNull();
  expect(perfOf(null)).toBeNull();
});

test("the page's marks: light, balanced, phones, strong devices, a frame cap, keeping on at rest, resting off screen", () => {
  expect(perfMarks({ tier: "light", phone: "light", strong: true, fps: 24, rest: "keep" }, true)).toEqual({
    "data-perf-tier": "light", "data-perf-phone": "light", "data-perf-strong": "", "data-perf-fps": "24", "data-own-pause": "", "data-perf-watch": "",
  });
  expect(perfMarks({ tier: "full" }, false)).toEqual({});
  // Endless motion rests off screen unless told to keep moving.
  expect(perfMarks(null, true)).toEqual({ "data-perf-watch": "" });
  expect(perfMarks({ offscreen: "keep" }, true)).toEqual({});
});

test("what moves without end, and when a page needs the settings at work", () => {
  expect(endlessOf({ type: "text" }, { loop: { kind: "float" } })).toBe(true);
  expect(endlessOf({ type: "image", props: { sparkle: { points: [] } } }, null)).toBe(true);
  expect(endlessOf({ type: "svg", props: { morph: { on: "hover" } } }, null)).toBe(false);
  expect(endlessOf({ type: "video", props: { autoplay: true } }, null)).toBe(true);
  expect(perfNeeded({ type: "heading", props: {} }, null)).toBe(false);
  expect(perfNeeded({ type: "heading", props: { perf: { phone: "light" } } }, null)).toBe(true);
  expect(perfNeeded({ type: "video", props: { autoplay: true, perf: { offscreen: "keep" } } }, null)).toBe(false);
});
