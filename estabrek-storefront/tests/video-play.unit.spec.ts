import { expect, test } from "@playwright/test";
import { videoPlay } from "../src/pageTree/videoPlay";
import { treeCss } from "../src/pageTree/css";
import { treeNeeds, type PageTree } from "../src/pageTree/tree";

// How a clip element plays, from its settings (pageTree/videoPlay.ts), and how a picture or a clip fills a box of
// its own (pageTree/css.ts).

test("a clip waits to be pressed: its buttons show, its sound is its own, its first frame loads", () => {
  expect(videoPlay({})).toEqual({ autoPlay: false, muted: false, controls: true, preload: "metadata", noDownload: false, live: null });
  expect(videoPlay({ muted: true, controls: false, noDownload: true, preload: "none" })).toEqual({ autoPlay: false, muted: true, controls: false, preload: "none", noDownload: true, live: null });
  expect(videoPlay(undefined).controls).toBe(true);
});

test("a clip that plays by itself has no sound and no buttons: at once, once it's seen, under the pointer", () => {
  expect(videoPlay({ autoplay: true })).toMatchObject({ autoPlay: true, muted: true, controls: false, live: null });
  expect(videoPlay({ playOn: "view" })).toMatchObject({ autoPlay: false, muted: true, controls: false, live: { on: "view" } });
  expect(videoPlay({ playOn: "hover", controls: true })).toMatchObject({ muted: true, controls: false, live: { on: "hover" } });
  // At once wins over the other two; an unknown way is the usual one.
  expect(videoPlay({ autoplay: true, playOn: "hover" })).toMatchObject({ autoPlay: true, live: null });
  expect(videoPlay({ playOn: "always" })).toMatchObject({ muted: false, controls: true, live: null });
});

test("a light element never plays by itself: it gets its buttons back, and still has no sound until pressed", () => {
  expect(videoPlay({ autoplay: true }, true)).toMatchObject({ autoPlay: false, muted: true, controls: true, live: null });
  expect(videoPlay({ playOn: "view" }, true)).toMatchObject({ autoPlay: false, controls: true, live: null });
  expect(videoPlay({ playOn: "view", controls: false }, true).controls).toBe(false);
});

test("its speed: only a real one other than its own, with or without another way of playing", () => {
  expect(videoPlay({ speed: 1.5 }).live).toEqual({ speed: 1.5 });
  expect(videoPlay({ speed: 0.5, playOn: "hover" }).live).toEqual({ on: "hover", speed: 0.5 });
  for (const speed of [1, 0.1, 9, "2", NaN]) expect(videoPlay({ speed }).live, String(speed)).toBeNull();
  expect(videoPlay({ preload: "everything" }).preload).toBe("metadata");
});

test("a picture or a clip with a box of its own fills it, cut at its edges; its own fill and focus still win", () => {
  const tree = (style?: Record<string, unknown>): PageTree => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "pic", type: "image", props: { src: "/a.jpg" }, ...(style ? { style } : {}) }] }] } }) as PageTree;
  const css = treeCss(tree({ base: { width: "360px", height: "260px" } }));
  expect(css).toContain(".pt-image,.pt-video{object-fit:var(--pt-fit,cover);object-position:var(--pt-focus,50% 50%)}");
  // Its own choice is written on the element itself, after the usual one.
  const own = treeCss(tree({ base: { fit: "contain", focus: { x: 20, y: 80 } } }));
  expect(own).toContain("object-fit:contain");
  expect(own).toContain("object-position:20% 80%");
  expect(own.indexOf(".pt-pic{")).toBeGreaterThan(own.indexOf(".pt-image,.pt-video{object-fit"));
});

test("the page loads its media runtime only for a clip that needs it: one it plays itself, or one with a speed", () => {
  const withClip = (props: Record<string, unknown>): PageTree => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "v", type: "video", props: { src: "/a.mp4", ...props } }] }] } }) as PageTree;
  expect(treeNeeds(withClip({})).media).toBe(false);
  expect(treeNeeds(withClip({ autoplay: true, loop: true })).media).toBe(false);
  expect(treeNeeds(withClip({ playOn: "view" })).media).toBe(true);
  expect(treeNeeds(withClip({ playOn: "hover" })).media).toBe(true);
  expect(treeNeeds(withClip({ speed: 2 })).media).toBe(true);
  expect(treeNeeds(withClip({ speed: 1 })).media).toBe(false);
});
