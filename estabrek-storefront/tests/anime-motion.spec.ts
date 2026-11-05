import { test, expect, type Page, type FrameLocator } from "@playwright/test";

const API = "http://127.0.0.1:4100";
const HARNESS = `${API}/__studio-harness?src=${encodeURIComponent("/studio-frame?token=good-draft")}`;
const send = (page: Page, msg: Record<string, unknown>) => page.evaluate(message => (window as any).send(message), msg);
const node = (frame: FrameLocator, id: string) => frame.locator(`[data-tree-node="${id}"]`);
const variable = (frame: FrameLocator, id: string, name: string) => node(frame, id).evaluate((el, key) => Number.parseFloat((el as HTMLElement).style.getPropertyValue(key)) || 0, name);

async function openDraft(page: Page) {
  const word = (id: string, motion: object) => ({ id, type: "heading", props: { text: { ar: id }, level: 2 }, motion: { engine: "anime", ...motion } });
  const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{
    id: "motions", type: "section", props: {}, style: { base: { pad: [16, 16, 16, 16] } }, children: [
      word("anime-entry", { enter: { kind: "up", duration: 1, distance: 70 } }),
      word("anime-loop", { loop: { kind: "float", duration: 0.6 } }),
      word("anime-hover", { hover: { kind: "lift", amount: 2 } }),
      word("anime-lite", { phone: "lite", enter: { kind: "up", duration: 1 }, loop: { kind: "float", duration: 0.6 }, hover: { kind: "lift" } }),
      word("anime-off", { phone: "off", enter: { kind: "up", duration: 1 } }),
      { id: "space", type: "spacer", props: {}, style: { base: { height: "900px" } } },
      word("anime-scroll", { scroll: { kind: "keys", from: { y: 0 }, to: { y: 120 }, start: 90, end: 30 } }),
      { id: "after", type: "spacer", props: {}, style: { base: { height: "1200px" } } },
    ],
  }] } };
  await page.request.post(`${API}/__test/preview-draft`, { data: { pageId: "anime-motion", sections: [], tree, rev: 1, updatedAt: "" } });
  await page.goto(HARNESS);
  const frame = page.frameLocator("#f");
  await expect(node(frame, "anime-entry")).toBeVisible();
  return frame;
}

test("Anime is selected lazily and editor play can repeat without hiding the final content", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const frame = await openDraft(page);
  const entry = node(frame, "anime-entry");
  await expect(entry).toHaveAttribute("data-pt-engine", "anime");
  expect(await variable(frame, "anime-entry", "--pt-ey")).toBe(0);
  for (let play = 0; play < 2; play++) {
    await send(page, { type: "motionPlay", nodeId: "anime-entry" });
    await expect.poll(() => variable(frame, "anime-entry", "--pt-ey")).toBeGreaterThan(5);
    await expect.poll(() => variable(frame, "anime-entry", "--pt-ey")).toBe(0);
    expect(await entry.evaluate(el => getComputedStyle(el).opacity)).toBe("1");
  }
  expect(errors).toEqual([]);
});

test("Anime hover and loops move real channels, and stopping live restores their original values", async ({ page }) => {
  const frame = await openDraft(page);
  await expect(node(frame, "anime-hover")).toHaveAttribute("data-pt-engine", "anime");
  await node(frame, "anime-hover").dispatchEvent("pointerenter");
  await expect.poll(() => variable(frame, "anime-hover", "--pt-hy")).toBeLessThan(-5);
  await node(frame, "anime-hover").dispatchEvent("pointerleave");
  await expect.poll(() => variable(frame, "anime-hover", "--pt-hy")).toBe(0);
  await send(page, { type: "motionLive", on: true });
  await expect.poll(() => variable(frame, "anime-loop", "--pt-ly")).toBeLessThan(-1);
  await send(page, { type: "motionLive", on: false });
  await expect.poll(() => variable(frame, "anime-loop", "--pt-ly")).toBe(0);
  await page.waitForTimeout(350);
  expect(await variable(frame, "anime-loop", "--pt-ly")).toBe(0);
});

test("Anime scroll follows ScrollTrigger progress in both directions", async ({ page }) => {
  const frame = await openDraft(page);
  const scroll = node(frame, "anime-scroll");
  await expect(scroll).toHaveAttribute("data-pt-engine", "anime");
  // Heights use the page tree's unit-bearing length schema. Verify the real
  // geometry so the top of the document is genuinely before this scroll scene.
  expect(await node(frame, "space").evaluate(el => el.getBoundingClientRect().height)).toBe(900);
  expect(await node(frame, "after").evaluate(el => el.getBoundingClientRect().height)).toBe(1200);
  expect(await scroll.evaluate(el => el.getBoundingClientRect().top - innerHeight * 0.9)).toBeGreaterThan(0);
  await expect.poll(() => variable(frame, "anime-scroll", "--pt-my")).toBeLessThan(1);
  await scroll.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.3 + 50));
  await expect.poll(() => variable(frame, "anime-scroll", "--pt-my")).toBeGreaterThan(110);
  await scroll.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => variable(frame, "anime-scroll", "--pt-my")).toBeLessThan(1);
});

test("phone lite keeps entry while phone off stays shown and still", async ({ page }) => {
  const frame = await openDraft(page);
  await page.locator("#f").evaluate(el => { (el as HTMLIFrameElement).style.width = "390px"; });
  await send(page, { type: "motionLive", on: true });
  await expect.poll(() => variable(frame, "anime-lite", "--pt-ey")).toBeGreaterThan(1);
  await expect.poll(() => variable(frame, "anime-lite", "--pt-ey")).toBe(0);
  expect(await variable(frame, "anime-lite", "--pt-ly")).toBe(0);
  expect(await variable(frame, "anime-off", "--pt-ey")).toBe(0);
  expect(await node(frame, "anime-off").evaluate(el => getComputedStyle(el).opacity)).toBe("1");
});

test("reduced motion shows every element and switching it on cancels running Anime players", async ({ page }) => {
  const frame = await openDraft(page);
  await send(page, { type: "motionLive", on: true });
  await expect.poll(() => variable(frame, "anime-loop", "--pt-ly")).toBeLessThan(-1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => variable(frame, "anime-loop", "--pt-ly")).toBe(0);
  await page.waitForTimeout(350);
  expect(await variable(frame, "anime-loop", "--pt-ly")).toBe(0);
  expect(await node(frame, "anime-entry").evaluate(el => getComputedStyle(el).opacity)).toBe("1");
  await page.reload();
  await expect(node(frame, "anime-entry")).toBeVisible();
  expect(await node(frame, "anime-entry").getAttribute("data-pt-engine")).toBeNull();
});
