import { expect, test, type Page } from "@playwright/test";

// What a picture's pixels say, in a real browser: the shop's frame reads a drawn picture (a red disc and a navy one,
// bottom right, on a pale ground), the editor shows its colours, adds them to the variables, dresses the picture's
// part in them, and puts the picture's focus point on its subject.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&beside&subject";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const tool = (page: Page, id: string) => page.locator(`[data-testid="studio-tool"][data-tool="${id}"]`);
const styleOf = (page: Page, id: string) => page.evaluate((x) => (window as any).__canvasHarness.getNode(x)?.node?.style?.base ?? {}, id);
const rootVar = (page: Page, name: string) => frame(page).locator("html").evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
/** How far two colours are apart, as the biggest difference of a channel (0–255). */
const channels = (c: string) => (c.startsWith("#") ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number));
const near = (a: string, b: string) => Math.max(...channels(a).map((v, i) => Math.abs(v - channels(b)[i])));
async function pick(page: Page, id: string) {
  await page.getByTestId("studio-tab-layers").click();
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  await expect(page.getByTestId("studio-tools")).toBeVisible();
}

test("a picture's colours are read, become variables and dress its part; its focus goes to its subject", async ({ page }) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  await pick(page, "target");

  // Its colours: the pale ground first (most of the picture), then the red disc, then the navy one.
  await tool(page, "image-colours").click();
  const card = page.getByTestId("studio-picture-colours");
  await expect(card).toBeVisible({ timeout: 15000 });
  const found = await card.getByTestId("studio-picture-colour").evaluateAll((els) => els.map((el) => ({ hex: el.getAttribute("data-hex")!, share: Number((el.textContent ?? "").match(/(\d+)%/)?.[1]) })));
  expect(found).toHaveLength(3);
  expect(near(found[0].hex, "#f4efe6")).toBeLessThanOrEqual(6);
  expect(near(found[1].hex, "#c0392b")).toBeLessThanOrEqual(10);
  expect(near(found[2].hex, "#1f2a5a")).toBeLessThanOrEqual(10);
  expect(found[0].share).toBeGreaterThanOrEqual(88);
  expect(found[1].share).toBeGreaterThanOrEqual(4);
  // What a page makes of them: the pale ground, the navy as ink, the red as the accent.
  const roles = card.getByTestId("studio-picture-roles");
  const [ground, ink, accent] = await Promise.all(["data-ground", "data-ink", "data-accent"].map((a) => roles.getAttribute(a))) as string[];
  expect(ground).toBe(found[0].hex);
  expect(ink).toBe(found[2].hex);
  expect(accent).toBe(found[1].hex);

  // To the variables: three new colours, in the shop's frame by name; a second press has nothing to add.
  await expect(card.getByTestId("studio-picture-add")).toContainText("+3");
  await card.getByTestId("studio-picture-add").click();
  await ready(page);
  await expect.poll(() => rootVar(page, "--tk-c-photo")).toBe(found[0].hex);
  expect(await rootVar(page, "--tk-c-photo-2")).toBe(found[1].hex);
  expect(await rootVar(page, "--tk-c-photo-3")).toBe(found[2].hex);
  await expect(card.getByTestId("studio-picture-add")).toBeDisabled();

  // The picture's part dressed in them: its ground and its words' colour.
  await expect(card.getByTestId("studio-picture-dress")).toContainText("Objects section");
  await card.getByTestId("studio-picture-dress").click();
  await ready(page);
  const part = await styleOf(page, "objects");
  expect(part.bg).toBe(ground);
  expect(part.color).toBe(ink);
  const drawn = await frame(page).locator('[data-tree-node="objects"]').evaluate((el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, color: cs.color }; });
  expect(near(drawn.bg, ground)).toBeLessThanOrEqual(1);
  expect(near(drawn.color, ink)).toBeLessThanOrEqual(1);
  // A moving backdrop of its colours: the two that aren't the ground, fading from the part's corners.
  await card.getByTestId("studio-picture-backdrop").click();
  await ready(page);
  const dressed = await styleOf(page, "objects");
  expect(dressed.mesh).toEqual({ colors: [found[1].hex, found[2].hex], soft: 65, move: true, speed: 0.8 });
  expect(dressed.bg).toBe(ground);
  const layers = await frame(page).locator('[data-tree-node="objects"]').evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(layers.match(/radial-gradient/g) ?? []).toHaveLength(2);
  await card.getByTestId("studio-picture-close").click();
  await expect(card).toHaveCount(0);

  // The focus point: found by name in the inspector's search, then put on the discs (bottom right).
  await page.getByTestId("studio-insp-find").fill("find the subject");
  await page.getByTestId("studio-media-find-subject").click();
  await ready(page);
  const focus = (await styleOf(page, "target")).focus as { x: number; y: number };
  expect(focus.x).toBeGreaterThanOrEqual(68);
  expect(focus.x).toBeLessThanOrEqual(82);
  expect(focus.y).toBeGreaterThanOrEqual(58);
  expect(focus.y).toBeLessThanOrEqual(74);
  await expect(frame(page).locator('img[data-tree-node="target"], [data-tree-node="target"] img').first()).toHaveCSS("object-position", `${focus.x}% ${focus.y}%`);
});
