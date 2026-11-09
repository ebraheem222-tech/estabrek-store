import { expect, test, type Page } from "@playwright/test";

// In the editor: a section set to stay, then be covered by the next one; the preview draws it.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const sections = (page: Page) => page.evaluate(() => ((window as any).__canvasHarness.getDraft().tree.root.children as any[]).filter((n) => n.type === "section").map((n) => ({ id: n.id, cover: n.props?.cover })));

test("a section set to stay and be covered: its panel, the draft and the preview", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  const [first] = await sections(page);
  expect(first).toBeTruthy();
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator(`[data-testid="studio-layer"][data-node="${first.id}"]`).click();
  const panel = page.getByTestId("studio-cover");
  await expect(panel).toBeVisible();
  await panel.getByTestId("studio-cover-on").check();
  await expect.poll(async () => (await sections(page))[0].cover).toEqual({ hold: 1, under: "dim", phone: true });
  await panel.getByRole("button", { name: "Blurs" }).click();
  await expect.poll(async () => (await sections(page))[0].cover?.under).toBe("blur");
  await ready(page);
  // The preview holds it, with its room under it and a blur layer over it.
  const held = frame(page).locator(`[data-tree-node="${first.id}"]`);
  await expect(held).toHaveAttribute("data-pt-cover", /"under":"blur"/);
  await expect(held.locator(".pt-cover-shade")).toHaveCount(1);
  expect(await held.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
  await expect(frame(page).locator(".pt-cover-room")).toHaveCount(1);
  // A section added after it: the preview's script finds it (through the home's boxes) and pulls it up over it.
  await page.getByRole("tab", { name: "+ Add" }).click();
  await page.locator('[data-testid="studio-add-where"] [data-where="after"]').click();
  await page.locator('[data-testid="studio-add-item"][data-kind="ready-intro"]').click();
  await expect.poll(async () => (await sections(page)).length).toBe(2);
  const [, added] = await sections(page);
  await ready(page);
  const next = frame(page).locator(".pt-cover-next");
  await expect(next).toHaveCount(1);
  await expect(next.locator(`[data-tree-node="${added.id}"]`)).toHaveCount(1);
  await expect.poll(() => held.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--pt-cv-d")))).toBeGreaterThan(100);
  const pull = await next.evaluate((el) => parseFloat(getComputedStyle(el).marginTop));
  const d = await held.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--pt-cv-d")));
  expect(pull).toBeLessThanOrEqual(-d);
  // It starts right where the room under the held one ends.
  const gap = await held.evaluate((el) => {
    const room = el.nextElementSibling!.getBoundingClientRect();
    const n = document.querySelector(".pt-cover-next")!.getBoundingClientRect();
    return Math.round(n.top - (room.bottom - parseFloat(getComputedStyle(el).getPropertyValue("--pt-cv-d"))));
  });
  expect(Math.abs(gap)).toBeLessThanOrEqual(1);
  // Scrolled inside the preview: it stays at the top, and the added section rises over its lower part.
  const seen = await held.evaluate(async (el) => {
    // Where it starts to stick: its box (which never moves) at its sticking point.
    const start = window.scrollY + el.parentElement!.getBoundingClientRect().top - parseFloat(getComputedStyle(el).top || "0");
    const room = el.nextElementSibling!.getBoundingClientRect().height;
    const d = parseFloat(getComputedStyle(el).getPropertyValue("--pt-cv-d"));
    // Past its hold, and half way through being covered.
    window.scrollTo({ top: start + (room - d) + d / 2, behavior: "instant" as ScrollBehavior });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = el.getBoundingClientRect();
    const n = document.querySelector(".pt-cover-next")!.getBoundingClientRect();
    const probeY = Math.min(r.bottom, innerHeight) - 4;
    const hit = document.elementFromPoint(r.left + r.width / 2, probeY);
    return { top: Math.round(r.top - parseFloat(getComputedStyle(el).top || "0")), nextTop: Math.round(n.top), bottom: Math.round(Math.min(r.bottom, innerHeight)), overNext: Boolean(hit && document.querySelector(".pt-cover-next")!.contains(hit)) };
  });
  expect(Math.abs(seen.top)).toBeLessThanOrEqual(1);
  expect(seen.nextTop).toBeLessThan(seen.bottom);
  expect(seen.overNext).toBe(true);
});
