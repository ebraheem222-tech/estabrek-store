import { expect, test } from "@playwright/test";
import { sliderSlides } from "../src/pageTree/tree";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

test("safe slider slides keep all optional localized caption content", () => {
  expect(sliderSlides({ slides: [{ src: "/work.svg", title: { en: "Work" }, text: { he: "תיאור" }, cta: { ar: "اكتشف" }, href: "/shop" }, { src: "javascript:alert(1)" }] })).toEqual([{ src: "/work.svg", kind: "image", title: { en: "Work" }, text: { he: "תיאור" }, cta: { ar: "اكتشف" }, href: "/shop", alt: undefined, caption: undefined }]);
});

const effects = async () => {
  const path = "../src/pageTree/sliderEffects";
  const mod = await import(path).catch(() => ({}));
  expect(mod, "the slider effect contract is implemented").toHaveProperty("sliderSettings");
  return mod;
};

test("slider options normalize unsafe input and preserve legacy native scrolling", async () => {
  const { sliderSettings } = await effects();
  expect(sliderSettings({})).toEqual({ effect: "slide", axis: "x", duration: 0.7, zoom: 1, thumbnails: false, progress: false, captionPosition: "bottom", nativeLegacy: true });
  expect(sliderSettings({ effect: "custom", axis: "z", duration: Infinity, zoom: 4, thumbnails: "true", progress: 1, captionPosition: "custom" })).toMatchObject({ effect: "slide", axis: "x", duration: 0.7, zoom: 1, thumbnails: false, progress: false, captionPosition: "bottom" });
  expect(sliderSettings({ effect: "slices", axis: "y", duration: 0, zoom: 0.7, thumbnails: true, progress: true, captionPosition: "split" })).toMatchObject({ effect: "slices", axis: "y", duration: 0, zoom: 0.7, thumbnails: true, progress: true, captionPosition: "split", nativeLegacy: false });
});

test("neighbor geometry wraps coverflow only when looping and follows RTL and vertical axes", async () => {
  const { slideDistance, coverflowPose } = await effects();
  expect(slideDistance(4, 0, 5, true)).toBe(-1);
  expect(slideDistance(4, 0, 5, false)).toBe(4);
  expect(slideDistance(0, 4, 5, true)).toBe(1);
  expect(coverflowPose(1, "x", false)).toMatchObject({ transform: "translateX(46%) translateZ(-140px) rotateY(-38deg) scale(.78)", opacity: 0.8 });
  expect(coverflowPose(1, "x", true)).toMatchObject({ transform: "translateX(-46%) translateZ(-140px) rotateY(38deg) scale(.78)" });
  expect(coverflowPose(-1, "y", false)).toMatchObject({ transform: "translateY(-46%) translateZ(-140px) rotateX(-38deg) scale(.78)" });
  expect(coverflowPose(3, "x", false)).toMatchObject({ opacity: 0 });
});

test("every cinematic transition has distinct bounded frames and respects axis, direction and duration", async () => {
  const { transitionFrames, sliceFrames } = await effects();
  expect(transitionFrames("zoom", "x", 1).incoming[0]).toMatchObject({ opacity: 0, transform: "scale(1.12)" });
  expect(transitionFrames("wipe", "y", -1).incoming[0]).toMatchObject({ clipPath: "inset(0 0 100% 0)" });
  expect(transitionFrames("flip", "x", -1).incoming[0]).toMatchObject({ transform: "perspective(1200px) rotateY(-90deg)", opacity: 0 });
  expect(sliceFrames("x", 1)[0]).toMatchObject({ transform: "perspective(1000px) translateZ(-100px) rotateY(90deg)", opacity: 0 });
  expect(sliceFrames("y", -1)[0]).toMatchObject({ transform: "perspective(1000px) translateZ(-100px) rotateX(-90deg)" });
});

test("slider keyboard navigation is scoped, respects RTL and releases its listeners", async () => {
  const mod = await effects();
  expect(mod).toHaveProperty("bindSliderInput");
  const { JSDOM } = require("../../estabrek-admin/node_modules/jsdom");
  const dom = new JSDOM('<div id="slider"><div id="row" style="direction:rtl"><div></div><div></div><div></div></div><input></div>');
  const root = dom.window.document.querySelector("#slider"), row = dom.window.document.querySelector("#row");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window"), originalStyle = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "getComputedStyle", { configurable: true, value: dom.window.getComputedStyle.bind(dom.window) });
  let at = 0;
  try {
    const unbind = mod.bindSliderInput(root, row, mod.sliderSettings({ effect: "fade" }), () => at, (i: number) => { at = Math.max(0, Math.min(2, i)); }, false);
    row.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    expect(at).toBe(1);
    row.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    expect(at).toBe(2);
    root.querySelector("input").dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(at).toBe(2);
    unbind();
    row.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(at).toBe(2);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else Reflect.deleteProperty(globalThis, "window");
    if (originalStyle) Object.defineProperty(globalThis, "getComputedStyle", originalStyle); else Reflect.deleteProperty(globalThis, "getComputedStyle");
    dom.window.close();
  }
});

test("changing coverflow to another effect removes its old card geometry and neighbor visibility", async () => {
  const mod = await effects();
  const { JSDOM } = require("../../estabrek-admin/node_modules/jsdom");
  const dom = new JSDOM('<div id="row"><div><img class="pt-slide-media" src="/a.svg"></div><div><img class="pt-slide-media" src="/b.svg"></div><div><img class="pt-slide-media" src="/c.svg"></div></div>');
  const savedStyle = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
  Object.defineProperty(globalThis, "getComputedStyle", { configurable: true, value: dom.window.getComputedStyle.bind(dom.window) });
  try {
    const row = dom.window.document.querySelector("#row");
    const clear = mod.animateSlider(row, 0, 0, mod.sliderSettings({ effect: "coverflow" }), true, true);
    expect(row.children[1].style.transform).toContain("rotateY");
    clear();
    mod.animateSlider(row, 0, 1, mod.sliderSettings({ effect: "fade" }), true, true)();
    expect(Array.from(row.children).map((slide: any) => ({ transform: slide.style.transform, visibility: slide.style.visibility, opacity: slide.style.opacity }))).toEqual([{ transform: "", visibility: "", opacity: "" }, { transform: "", visibility: "", opacity: "" }, { transform: "", visibility: "", opacity: "" }]);
  } finally {
    if (savedStyle) Object.defineProperty(globalThis, "getComputedStyle", savedStyle); else Reflect.deleteProperty(globalThis, "getComputedStyle");
    dom.window.close();
  }
});

for (const input of ["wheel", "pointer"] as const) test(`a long rich caption keeps native ${input} scrolling and leaves its link usable`, async () => {
  const mod = await effects();
  const { JSDOM } = require("../../estabrek-admin/node_modules/jsdom");
  const dom = new JSDOM('<div id="slider"><div id="row"><div><span class="pt-slide-caption pt-slide-rich" style="max-height:64px;overflow:auto"><span id="text">Long description</span><a href="#details">Explore</a></span><img id="media"></div><div></div><div></div></div></div>');
  const root = dom.window.document.querySelector("#slider"), row = dom.window.document.querySelector("#row"), text = dom.window.document.querySelector("#text");
  text.textContent = "Merchant description ".repeat(300);
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, "window"), savedStyle = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "getComputedStyle", { configurable: true, value: dom.window.getComputedStyle.bind(dom.window) });
  let at = 0, captures = 0;
  row.hasPointerCapture = () => captures > 0;
  row.setPointerCapture = () => { captures++; };
  row.releasePointerCapture = () => {};
  const unbind = mod.bindSliderInput(root, row, mod.sliderSettings({ effect: "flip", axis: "y", duration: 0 }), () => at, (i: number) => { at = i; }, false);
  try {
    if (input === "wheel") {
      const wheel = new dom.window.WheelEvent("wheel", { deltaY: 140, bubbles: true, cancelable: true });
      text.dispatchEvent(wheel);
      expect(wheel.defaultPrevented, "the caption keeps its browser scroll behavior").toBe(false);
    } else {
      const pointer = (kind: string, y: number) => {
        const event = new dom.window.MouseEvent(kind, { button: 0, clientX: 100, clientY: y, bubbles: true, cancelable: true });
        Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: "touch" } });
        text.dispatchEvent(event); return event;
      };
      pointer("pointerdown", 140);
      const move = pointer("pointermove", 60);
      pointer("pointerup", 60);
      expect(move.defaultPrevented, "the caption keeps native touch panning").toBe(false);
      expect(captures, "reading does not capture the pointer for slide navigation").toBe(0);
    }
    expect(at).toBe(0);
    const click = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true });
    row.querySelector("a").dispatchEvent(click);
    expect(click.defaultPrevented, "caption interactions do not suppress a later link activation").toBe(false);
  } finally {
    unbind();
    if (savedWindow) Object.defineProperty(globalThis, "window", savedWindow); else Reflect.deleteProperty(globalThis, "window");
    if (savedStyle) Object.defineProperty(globalThis, "getComputedStyle", savedStyle); else Reflect.deleteProperty(globalThis, "getComputedStyle");
    dom.window.close();
  }
});
