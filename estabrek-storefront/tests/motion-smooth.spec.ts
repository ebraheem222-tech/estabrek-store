import { expect, test, type FrameLocator, type Page } from "@playwright/test";

// Smooth keyframes played by the shop (pageTree/TreeMotion.tsx playKeys): three moments that turn a corner (right,
// then down). The usual way goes straight to the corner and straight down; the smooth way rounds it, and still
// ends at the last moment's place.

const API = "http://127.0.0.1:4100";
const HARNESS = `${API}/__studio-harness?src=${encodeURIComponent("/en/studio-frame?token=good-draft")}`;
const send = (page: Page, msg: Record<string, unknown>) => page.evaluate((message) => (window as unknown as { send: (m: unknown) => void }).send(message), msg);
const node = (frame: FrameLocator, id: string) => frame.locator(`[data-tree-node="${id}"]`);

async function open(page: Page) {
  const word = (id: string, smooth: boolean) => ({
    id, type: "heading", props: { text: { en: id }, level: 3 },
    motion: { keys: { on: "load", duration: 1.2, ease: "linear", ...(smooth ? { smooth: true } : {}), parts: { self: [{ at: 0, x: 0, y: 0 }, { at: 50, x: 100, y: 0 }, { at: 100, x: 100, y: 100 }] } } },
  });
  const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "corner", type: "section", props: {}, style: { base: { pad: [80, 16, 240, 16] } }, children: [word("usual", false), word("smooth", true)] }] } };
  await page.request.post(`${API}/__test/preview-draft`, { data: { pageId: "motion-smooth", sections: [], tree, rev: 1, updatedAt: "" } });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(HARNESS);
  const frame = page.frameLocator("#f");
  await expect(node(frame, "smooth")).toBeVisible();
  return frame;
}

/** Every place the element stood while its keyframes played (the watch starts before the play). */
async function route(page: Page, frame: FrameLocator, id: string, ms: number) {
  const watched = node(frame, id).evaluate((el, time) => new Promise<{ x: number[]; y: number[] }>((done) => {
    const read = (name: string) => Number.parseFloat((el as HTMLElement).style.getPropertyValue(name)) || 0;
    const seen = { x: [] as number[], y: [] as number[] };
    const until = performance.now() + time;
    const tick = () => {
      seen.x.push(read("--pt-kx"));
      seen.y.push(read("--pt-ky"));
      if (performance.now() < until) requestAnimationFrame(tick); else done(seen);
    };
    tick();
  }), ms);
  await send(page, { type: "motionPlay", nodeId: id });
  return watched;
}

test("the usual way turns the corner on the spot; the smooth way rounds it and ends in the same place", async ({ page }) => {
  const frame = await open(page);
  const usual = await route(page, frame, "usual", 2200);
  // Straight to the corner and straight down: never past it, never above the line.
  expect(Math.max(...usual.x)).toBeLessThanOrEqual(100.5);
  expect(Math.min(...usual.y)).toBeGreaterThanOrEqual(-0.5);
  expect(usual.x.at(-1)).toBeCloseTo(100, 0);
  expect(usual.y.at(-1)).toBeCloseTo(100, 0);

  const smooth = await route(page, frame, "smooth", 2200);
  // Rounding the corner: carried a little past it and, before it, a little above the line.
  expect(Math.max(...smooth.x)).toBeGreaterThan(102);
  expect(Math.min(...smooth.y)).toBeLessThan(-2);
  expect(smooth.x.at(-1)).toBeCloseTo(100, 0);
  expect(smooth.y.at(-1)).toBeCloseTo(100, 0);
});
