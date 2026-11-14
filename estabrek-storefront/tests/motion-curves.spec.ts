import { expect, test, type FrameLocator, type Page } from "@playwright/test";

// An entrance played by the shop with a free curve and with a stagger's order (pageTree/TreeMotion.tsx): a loose
// spring carries the element past its place and back, and what comes in one after another starts from the last
// one or from the middle. Both engines (GSAP and Anime) play them.

const API = "http://127.0.0.1:4100";
const HARNESS = `${API}/__studio-harness?src=${encodeURIComponent("/studio-frame?token=good-draft")}`;
const send = (page: Page, msg: Record<string, unknown>) => page.evaluate((message) => (window as unknown as { send: (m: unknown) => void }).send(message), msg);
const node = (frame: FrameLocator, id: string) => frame.locator(`[data-tree-node="${id}"]`);

type Engine = "gsap" | "anime";
async function open(page: Page, engine: Engine) {
  const word = (id: string, motion?: object) => ({ id, type: "heading", props: { text: { en: id }, level: 3 }, ...(motion ? { motion: { engine, ...motion } } : {}) });
  const row = (id: string, order?: string) => ({
    id, type: "stack", props: {}, style: { base: { direction: "row", gap: 12 } },
    motion: { engine, enter: { kind: "up", duration: 0.4, distance: 60, stagger: 0.6, ...(order ? { order } : {}) } },
    children: [0, 1, 2, 3].map((i) => word(`${id}-${i}`)),
  });
  const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{
    id: "curves", type: "section", props: {}, style: { base: { pad: [120, 16, 120, 16] } }, children: [
      word("spring", { enter: { kind: "up", duration: 1.2, distance: 100, ease: "spring(1,100,4)" } }),
      word("plain", { enter: { kind: "up", duration: 1.2, distance: 100, ease: "smooth" } }),
      row("usual"), row("last", "last"), row("center", "center"),
    ],
  }] } };
  await page.request.post(`${API}/__test/preview-draft`, { data: { pageId: "motion-curves", sections: [], tree, rev: 1, updatedAt: "" } });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(HARNESS);
  const frame = page.frameLocator("#f");
  await expect(node(frame, "spring")).toBeVisible();
  await expect(node(frame, "spring")).toHaveAttribute("data-pt-engine", engine);
  return frame;
}

/** How far down from its place an element stands while it comes in (0 at rest). */
const SHIFT = `(el) => Number.parseFloat(el.style.getPropertyValue("--pt-ey")) || 0`;

/** The lowest and highest place an entrance passes through while it plays, sampled every frame for `ms` (the watch starts first, then the play). */
async function travel(page: Page, frame: FrameLocator, id: string, ms: number) {
  const watched = node(frame, id).evaluate((el, [code, time]) => new Promise<{ min: number; max: number }>((done) => {
    const shift = (0, eval)(code as string) as (e: Element) => number;
    const range = { min: Infinity, max: -Infinity };
    const until = performance.now() + (time as number);
    const tick = () => {
      const v = shift(el);
      range.min = Math.min(range.min, v);
      range.max = Math.max(range.max, v);
      if (performance.now() < until) requestAnimationFrame(tick); else done(range);
    };
    tick();
  }), [SHIFT, ms] as const);
  await send(page, { type: "motionPlay", nodeId: id });
  return watched;
}

/** Where each of a row's four things stands at the moment the one named `lead` is half way in. */
async function whenHalfWay(page: Page, frame: FrameLocator, id: string, lead: number) {
  const watched = node(frame, id).evaluate((el, [code, first]) => new Promise<number[]>((done) => {
    const shift = (0, eval)(code as string) as (e: Element) => number;
    const kids = Array.from(el.querySelectorAll(":scope > [data-tree-node]"));
    const until = performance.now() + 6000;
    let started = false;
    const tick = () => {
      const now = kids.map(shift);
      // Wait for the play to put them at their start, then for the leading one to be half way.
      if (!started) started = now.some((v) => v > 50);
      else if (now[first as number] < 30) return done(now);
      if (performance.now() < until) requestAnimationFrame(tick); else done(now);
    };
    tick();
  }), [SHIFT, lead] as const);
  await send(page, { type: "motionPlay", nodeId: id });
  return watched;
}

for (const engine of ["gsap", "anime"] as const) {
  test(`${engine}: a loose spring carries an entrance past its place and back; the usual curve doesn't`, async ({ page }) => {
    const frame = await open(page, engine);
    // Coming up from 100 px below: the spring goes above its place (a negative shift), then settles on it.
    const spring = await travel(page, frame, "spring", 2200);
    // (A spring is fast at first: by the first frames it is already well on its way.)
    expect(spring.max).toBeGreaterThan(20);
    expect(spring.min).toBeLessThan(-5);
    await expect.poll(() => node(frame, "spring").evaluate((el) => Number.parseFloat((el as HTMLElement).style.getPropertyValue("--pt-ey")) || 0)).toBe(0);
    const plain = await travel(page, frame, "plain", 2200);
    expect(plain.max).toBeGreaterThan(20);
    expect(plain.min).toBeGreaterThan(-1);
  });

  test(`${engine}: a stagger starts from the first, the last or the middle, as its order says`, async ({ page }) => {
    const frame = await open(page, engine);
    // The usual order: the first is half way while the others still wait at their start.
    const usual = await whenHalfWay(page, frame, "usual", 0);
    expect(usual[0]).toBeLessThan(30);
    for (const i of [1, 2, 3]) expect(usual[i], `usual ${i}`).toBeGreaterThan(55);
    // From the last.
    const last = await whenHalfWay(page, frame, "last", 3);
    expect(last[3]).toBeLessThan(30);
    for (const i of [0, 1, 2]) expect(last[i], `last ${i}`).toBeGreaterThan(55);
    // From the middle: the middle two together, the two ends still waiting.
    const center = await whenHalfWay(page, frame, "center", 1);
    expect(center[1]).toBeLessThan(30);
    expect(center[2]).toBeLessThan(45);
    for (const i of [0, 3]) expect(center[i], `center ${i}`).toBeGreaterThan(55);
  });
}
