import { expect, test, type FrameLocator, type Page } from "@playwright/test";

// Keyframes with a path, played by the shop (pageTree/TreeMotion.tsx playKeys): the element travels the curve
// over the animation's time, arrives at its own place, and turns with the curve when asked.

const API = "http://127.0.0.1:4100";
/** The editor's frame in a language (Arabic reads from the right, so "across" is mirrored there). */
const harness = (lang: "en" | "ar") => `${API}/__studio-harness?src=${encodeURIComponent(`/${lang}/studio-frame?token=good-draft`)}`;
const send = (page: Page, msg: Record<string, unknown>) => page.evaluate((message) => (window as unknown as { send: (m: unknown) => void }).send(message), msg);
const node = (frame: FrameLocator, id: string) => frame.locator(`[data-tree-node="${id}"]`);

async function open(page: Page, lang: "en" | "ar" = "en") {
  const word = (id: string, path: object) => ({
    id, type: "heading", props: { text: { en: id }, level: 3 },
    motion: { keys: { on: "load", duration: 1.2, ease: "linear", parts: { self: [{ at: 0, opacity: 1 }, { at: 100, opacity: 1 }] }, path } },
  });
  const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{
    id: "paths", type: "section", props: {}, style: { base: { pad: [260, 16, 160, 320] } }, children: [
      word("arc", { kind: "arc", w: 200, h: 100 }),
      word("turning", { kind: "arc", w: 200, h: 100, turn: true }),
      word("leaves", { kind: "s", w: 150, h: 60, rest: "start" }),
    ],
  }] } };
  await page.request.post(`${API}/__test/preview-draft`, { data: { pageId: "motion-path", sections: [], tree, rev: 1, updatedAt: "" } });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(harness(lang));
  const frame = page.frameLocator("#f");
  await expect(node(frame, "arc")).toBeVisible();
  return frame;
}

type Seen = { x: number[]; y: number[]; turn: number[] };
/** Where the element stood and how it was turned, every frame for `ms`, the watch starting before the play. */
async function watch(page: Page, frame: FrameLocator, id: string, ms: number): Promise<Seen> {
  const watched = node(frame, id).evaluate((el, time) => new Promise<{ x: number[]; y: number[]; turn: number[] }>((done) => {
    const read = (name: string) => Number.parseFloat((el as HTMLElement).style.getPropertyValue(name)) || 0;
    const seen = { x: [] as number[], y: [] as number[], turn: [] as number[] };
    const until = performance.now() + time;
    const tick = () => {
      seen.x.push(read("--pt-kx"));
      seen.y.push(read("--pt-ky"));
      seen.turn.push(read("--pt-krz"));
      if (performance.now() < until) requestAnimationFrame(tick); else done(seen);
    };
    tick();
  }), ms);
  await send(page, { type: "motionPlay", nodeId: id });
  return watched;
}

test("an element travels its path and arrives at its own place", async ({ page }) => {
  const frame = await open(page);
  const arc = await watch(page, frame, "arc", 2200);
  // From 200 px before its place, up to 100 px above it on the way, and home.
  expect(Math.min(...arc.x)).toBeLessThan(-150);
  expect(Math.max(...arc.x)).toBeLessThanOrEqual(0.5);
  expect(Math.min(...arc.y)).toBeLessThan(-85);
  expect(Math.min(...arc.y)).toBeGreaterThan(-101);
  expect(arc.x.at(-1)).toBeCloseTo(0, 1);
  expect(arc.y.at(-1)).toBeCloseTo(0, 1);
  // It doesn't turn unless asked.
  expect(arc.turn.every((v) => v === 0)).toBe(true);
});

test("it turns with the curve when asked and is upright at its place", async ({ page }) => {
  const frame = await open(page);
  const turning = await watch(page, frame, "turning", 2200);
  // Climbing at first (turned far one way), level at the top, upright again at its place.
  expect(Math.min(...turning.turn)).toBeLessThan(-80);
  expect(turning.turn.at(-1)).toBeCloseTo(0, 0);
});

test("a path whose start is the element's place carries it away", async ({ page }) => {
  const frame = await open(page);
  const leaves = await watch(page, frame, "leaves", 2200);
  expect(Math.max(...leaves.x)).toBeGreaterThan(140);
  expect(leaves.x.at(-1)).toBeCloseTo(150, 0);
  expect(leaves.y.at(-1)).toBeCloseTo(-60, 0);
});

test("across is toward the line's end: mirrored in a page that reads from the right", async ({ page }) => {
  const frame = await open(page, "ar");
  const arc = await watch(page, frame, "arc", 2200);
  expect(Math.max(...arc.x)).toBeGreaterThan(150);
  expect(Math.min(...arc.x)).toBeGreaterThanOrEqual(-0.5);
  expect(Math.min(...arc.y)).toBeLessThan(-85);
  expect(arc.x.at(-1)).toBeCloseTo(0, 1);
});
