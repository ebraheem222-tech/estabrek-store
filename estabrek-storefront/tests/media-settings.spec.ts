import { expect, test, type Page } from "@playwright/test";

// A clip's and a picture's settings, from the editor to the page: how a clip starts (pressed, by itself, once it's
// seen, under the pointer), its speed, its buttons and what loads first; a picture's link in a new tab and its
// frame's proportions; and a picture or clip with a box of its own fills it without being stretched. Each has its
// cards under the inspector's sections (its content, its behaviour, its look).

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&video&sparkle";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const info = (page: Page) => page.getByTestId("studio-info");
async function open(page: Page, more = "") {
  await page.setViewportSize({ width: 1440, height: 900 });
  // A clip plays by itself only for a visitor who hasn't asked for less motion.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`${url}${more}`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await page.getByTestId("studio-tab-layers").click();
}
async function pick(page: Page, id: string) {
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  await expect(info(page)).toContainText(id);
}
const choose = (page: Page, group: string, value: string) => info(page).locator(`[data-testid="${group}"] [data-value="${value}"]`).click();
const clip = (page: Page) => frame(page).locator('video[data-tree-node="clip"], [data-tree-node="clip"] video').first();
const photo = (page: Page) => frame(page).locator('img[data-tree-node="photo"], [data-tree-node="photo"] img').first();
const propsOf = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId).node.props, id);

test("a clip's playing: once it's seen it plays without sound or buttons; pressed again, its buttons are back", async ({ page }) => {
  test.setTimeout(180000);
  await open(page);
  await pick(page, "clip");
  // Its own cards: the clip, and how it plays.
  await expect(info(page).getByTestId("studio-element")).toBeVisible();
  await expect(info(page).getByTestId("studio-video-play")).toBeVisible();
  await expect(clip(page)).toHaveAttribute("controls", "");
  await expect(clip(page)).toHaveAttribute("preload", "metadata");
  // A clip in a box of its own fills it (no empty bands).
  await expect(clip(page)).toHaveCSS("object-fit", "cover");

  await choose(page, "studio-video-start", "view");
  await expect.poll(async () => (await propsOf(page, "clip")).playOn).toBe("view");
  await expect(info(page).getByTestId("studio-video-self")).toBeVisible();
  await expect(info(page).getByTestId("studio-video-controls")).toHaveCount(0);
  await expect(clip(page)).toHaveAttribute("data-pt-video", /"on":"view"/);
  await expect(clip(page)).not.toHaveAttribute("controls", "");
  await expect.poll(() => clip(page).evaluate((v: HTMLVideoElement) => v.muted && !v.paused)).toBe(true);

  // Faster, and nothing loaded before it's played.
  await choose(page, "studio-video-speed", "1.5");
  await expect.poll(() => clip(page).evaluate((v: HTMLVideoElement) => v.playbackRate)).toBe(1.5);
  await choose(page, "studio-video-preload", "none");
  await expect(clip(page)).toHaveAttribute("preload", "none");

  // Back to being pressed: it rests, its buttons show, and the download button can be hidden.
  await choose(page, "studio-video-start", "press");
  await expect(clip(page)).toHaveAttribute("controls", "");
  await expect.poll(() => clip(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect(clip(page)).toHaveAttribute("data-pt-video", /^\{"speed":1.5\}$/);
  await info(page).getByTestId("studio-video-nodownload").check();
  await expect(clip(page)).toHaveAttribute("controlslist", "nodownload");
  expect(await propsOf(page, "clip")).toMatchObject({ speed: 1.5, preload: "none", noDownload: true });

  // One step back at a time.
  await page.getByTestId("studio-undo").click();
  await expect(clip(page)).not.toHaveAttribute("controlslist", "nodownload");
});

test("a picture fills its own box without being stretched; its link opens in a new tab; its frame takes proportions", async ({ page }) => {
  test.setTimeout(180000);
  await open(page);
  await pick(page, "photo");
  await expect(info(page).getByTestId("studio-element")).toBeVisible();
  await expect(info(page).getByTestId("studio-image-link")).toBeVisible();
  // 360 × 260 for a picture of 3:2: cut at its edges, not squeezed.
  await expect(photo(page)).toHaveCSS("object-fit", "cover");

  const href = info(page).getByTestId("studio-prop-href");
  await href.fill("/shop");
  await href.blur();
  const link = frame(page).locator('a.pt-image-link:has([data-tree-node="photo"])');
  await expect(link).toHaveAttribute("href", /\/shop$/);
  await expect(link).not.toHaveAttribute("target", "_blank");
  await info(page).getByTestId("studio-image-newtab").check();
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);

  // Its frame's proportions: the height follows the width.
  await choose(page, "studio-media-aspect", "16/9");
  await expect.poll(async () => { const b = (await photo(page).boundingBox())!; return Math.round((b.width / b.height) * 100) / 100; }).toBeCloseTo(16 / 9, 1);
  const style = await page.evaluate(() => (window as any).__canvasHarness.getNode("photo").node.style.base);
  expect(style).toMatchObject({ aspect: "16/9", width: "360px" });
  expect(style.height).toBeUndefined();
});

test("beside the element, a clip's cards stand under their sections: the clip under content, its playing under behaviour", async ({ page }) => {
  test.setTimeout(180000);
  await open(page, "&beside");
  await pick(page, "clip");
  await expect(page.getByTestId("studio-insp-open")).toHaveAttribute("data-group", "content");
  await expect(info(page).getByTestId("studio-element")).toBeVisible();
  await expect(info(page).getByTestId("studio-video-play")).toBeHidden();
  await page.locator('[data-testid="studio-beside-tab"][data-group="behaviour"]').click();
  await expect(info(page).getByTestId("studio-video-play")).toBeVisible();
  await expect(info(page).getByTestId("studio-element")).toBeHidden();
  await page.locator('[data-testid="studio-beside-tab"][data-group="look"]').click();
  await expect(info(page).getByTestId("studio-media-style")).toBeVisible();
  await expect(info(page).getByTestId("studio-media-style")).toContainText("The clip in its frame");
});
