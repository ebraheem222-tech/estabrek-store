import { expect, test, type Page } from "@playwright/test";

// A picture's live effect (pageTree/pictureFxRun.ts) in a real browser, on a shop page: the graphics card draws
// the picture on a canvas over it while the pointer is on it, what it draws is the picture where the picture is
// (asked of the canvas itself, at points of a drawn picture whose colours are known), the canvas goes when the
// pointer leaves, and a reveal waits unseen until the picture scrolls into view. And in the editor: the effect is
// chosen from a picture's tools and tried on the page.

const host = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);
const live = (page: Page, id: string) => host(page, id).locator("canvas.pt-glfx[data-on]");
/** What the canvas drew at a point of the picture's box (fractions across and down): red, green, blue, alpha. */
async function drawnAt(page: Page, id: string, x: number, y: number) {
  const h = host(page, id);
  await h.evaluate((el, at) => { el.removeAttribute("data-pt-glfx-probe"); el.dispatchEvent(new CustomEvent("pt:glfx-probe", { detail: at })); }, { x, y });
  await expect(h).toHaveAttribute("data-pt-glfx-probe", /^\d+,\d+,\d+,\d+$/, { timeout: 5000 });
  return ((await h.getAttribute("data-pt-glfx-probe")) ?? "").split(",").map(Number);
}
const close = (got: number[], want: number[], by: number) => got.every((v, i) => Math.abs(v - want[i]) <= by);
const PALE = [244, 239, 230, 255], RED = [192, 57, 43, 255], NAVY = [31, 42, 90, 255];
async function over(page: Page, id: string, x: number, y: number) {
  // (Brought to the middle of the screen first: nothing of the shop's own sits over it there.)
  await host(page, id).evaluate((el) => el.scrollIntoView({ block: "center" }));
  const box = (await host(page, id).boundingBox())!;
  await page.mouse.move(box.x + box.width * x - 12, box.y + box.height * y - 8);
  await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 4 });
  return box;
}

test("the pointer on a picture: a canvas draws the picture where it is, and goes when the pointer leaves", async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en/picture-fx");

  // At rest: the picture itself, no canvas.
  for (const id of ["ripple", "liquid", "shift"]) await expect(host(page, id)).toHaveAttribute("data-pt-glfx-state", "rest", { timeout: 30000 });
  await expect(page.locator("canvas.pt-glfx")).toHaveCount(0);
  await expect(host(page, "plain")).not.toHaveAttribute("data-pt-glfx-state", /./);

  // Rings of water, in a box of the picture's own proportions. The pointer is top left, far from the discs.
  const box = await over(page, "ripple", 0.2, 0.2);
  await expect(live(page, "ripple")).toHaveCount(1, { timeout: 20000 });
  await expect(host(page, "ripple")).toHaveAttribute("data-pt-glfx-state", "on");
  const canvas = (await host(page, "ripple").locator("canvas").boundingBox())!;
  expect(Math.abs(canvas.width - box.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(canvas.height - box.height)).toBeLessThanOrEqual(1);
  // What it draws is the picture, the right way up: the red disc bottom right, the navy one above it, the pale ground.
  expect(close(await drawnAt(page, "ripple", 0.7375, 0.72), RED, 14)).toBe(true);
  expect(close(await drawnAt(page, "ripple", 0.83, 0.5), NAVY, 14)).toBe(true);
  expect(close(await drawnAt(page, "ripple", 0.5, 0.12), PALE, 8)).toBe(true);
  expect(close(await drawnAt(page, "ripple", 0.7375, 0.28), PALE, 8)).toBe(true);
  // The pointer leaves: the canvas steps aside, and is given back a few seconds later.
  await page.mouse.move(1100, 400);
  await expect(live(page, "ripple")).toHaveCount(0, { timeout: 10000 });
  await expect(host(page, "ripple")).toHaveAttribute("data-pt-glfx-state", "rest");
  await expect(host(page, "ripple").locator("canvas")).toHaveCount(0, { timeout: 12000 });

  // A flow, in a square box the wide picture is cut to fill: three quarters of its width show, so the red disc is
  // further right in the box than in the picture.
  await over(page, "liquid", 0.2, 0.2);
  await expect(live(page, "liquid")).toHaveCount(1, { timeout: 20000 });
  expect(close(await drawnAt(page, "liquid", 0.8167, 0.72), RED, 14)).toBe(true);
  expect(close(await drawnAt(page, "liquid", 0.3, 0.2), PALE, 8)).toBe(true);
  await page.mouse.move(1100, 400);
  await expect(live(page, "liquid")).toHaveCount(0, { timeout: 10000 });

  // A colour split, on a real photo: drawn whole (nothing see-through), and not one flat colour.
  await over(page, "shift", 0.5, 0.5);
  await expect(live(page, "shift")).toHaveCount(1, { timeout: 20000 });
  const a = await drawnAt(page, "shift", 0.25, 0.3), b = await drawnAt(page, "shift", 0.75, 0.7);
  expect(a[3]).toBe(255);
  expect(b[3]).toBe(255);
  expect(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])).toBeGreaterThan(12);
  await page.mouse.move(1100, 400);
  await expect(live(page, "shift")).toHaveCount(0, { timeout: 10000 });
  expect(errors).toEqual([]);
});

test("a reveal waits unseen until the picture scrolls into view, then leaves the picture as it is", async ({ page }) => {
  test.setTimeout(150000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en/picture-fx");
  const h = host(page, "reveal");
  await expect(h).toHaveAttribute("data-pt-glfx-state", "rest", { timeout: 30000 });
  // Far down the page: it waits, unseen, with no canvas yet.
  await expect(h).toHaveAttribute("data-pt-glfx-wait", "");
  await expect(h.locator("img")).toHaveCSS("opacity", "0");
  await expect(h.locator("canvas")).toHaveCount(0);
  await h.scrollIntoViewIfNeeded();
  await expect(live(page, "reveal")).toHaveCount(1, { timeout: 20000 });
  // It ends with the picture itself on the page and the canvas gone.
  await expect(h).not.toHaveAttribute("data-pt-glfx-wait", "", { timeout: 15000 });
  await expect(h.locator("img")).toHaveCSS("opacity", "1");
  await expect(h.locator("canvas")).toHaveCount(0, { timeout: 10000 });
  // Once: scrolled away and back, nothing plays again.
  await page.evaluate(() => window.scrollTo(0, 0));
  await h.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await expect(h.locator("canvas")).toHaveCount(0);
  await expect(h.locator("img")).toHaveCSS("opacity", "1");
});

test("with reduced motion the pictures stay as they are: no canvas, nothing hidden", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en/picture-fx");
  await expect(host(page, "ripple").locator("img")).toBeVisible();
  await over(page, "ripple", 0.5, 0.5);
  await page.waitForTimeout(1500);
  await expect(page.locator("canvas.pt-glfx")).toHaveCount(0);
  await expect(host(page, "ripple")).not.toHaveAttribute("data-pt-glfx-state", /./);
  await expect(host(page, "reveal")).not.toHaveAttribute("data-pt-glfx-wait", "");
  await host(page, "reveal").scrollIntoViewIfNeeded();
  await expect(host(page, "reveal").locator("img")).toHaveCSS("opacity", "1");
});

test("in the editor a picture's effect is chosen from its tools and tried on the page", async ({ page }) => {
  test.setTimeout(240000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&beside&subject");
  const ready = () => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  const frame = page.frameLocator('[data-testid="studio-frame"]');
  const glfxOf = () => page.evaluate(() => (window as any).__canvasHarness.getNode("target")?.node?.props?.glfx ?? null);
  await ready();
  await page.getByTestId("studio-tab-layers").click();
  await page.locator('[data-testid="studio-layer"][data-node="target"]').click();
  await page.locator('[data-testid="studio-tool"][data-tool="image-fx"]').click();
  const panel = page.getByTestId("studio-picture-fx");
  await expect(panel).toBeInViewport({ timeout: 10000 });
  await expect(panel.getByTestId("studio-picture-fx-try")).toHaveCount(0);

  // Rings of water: saved on the picture, and the page's picture is ready for it.
  await panel.getByTestId("studio-picture-fx-kind").selectOption("ripple");
  await ready();
  expect(await glfxOf()).toEqual({ kind: "ripple" });
  const target = frame.locator('[data-tree-node="target"]');
  await expect(target).toHaveAttribute("data-pt-glfx", /ripple/);
  await expect(target).toHaveAttribute("data-pt-glfx-state", "rest", { timeout: 30000 });
  // Tried from the editor: it plays on the page by itself, then the picture is itself again.
  await panel.getByTestId("studio-picture-fx-try").click();
  await expect(target.locator("canvas.pt-glfx[data-on]")).toHaveCount(1, { timeout: 20000 });
  await expect(target.locator("canvas.pt-glfx[data-on]")).toHaveCount(0, { timeout: 15000 });

  // None: the effect goes from the picture and from the page.
  await panel.getByTestId("studio-picture-fx-kind").selectOption("");
  await ready();
  expect(await glfxOf()).toBeNull();
  await expect(target).not.toHaveAttribute("data-pt-glfx", /./);
});
