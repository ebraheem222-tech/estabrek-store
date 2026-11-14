import { expect, test, type Page } from "@playwright/test";

// An element's tools by name, in a real browser and in the inspector a new browser gets (beside the element, one
// section of settings at a time): the video editor, a video split into scroll scenes, a picture's editor, a 3D
// model's views and physics are one press away from the selection, and the inspector's search finds them.

const url = (more = "") => `http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&beside${more}`;
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const tool = (page: Page, id: string) => page.locator(`[data-testid="studio-tool"][data-tool="${id}"]`);
const rootKids = (page: Page) => page.evaluate(() => ((window as any).__canvasHarness.getDraft().tree.root.children as Array<{ id: string; type: string; children?: Array<{ id: string; type: string; props: Record<string, unknown>; children?: unknown[] }> }>));
async function pick(page: Page, id: string) {
  await page.getByTestId("studio-tab-layers").click();
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  await expect(page.getByTestId("studio-tools")).toBeVisible();
}

test("a video: its editor opens from the selection, and it is split into scroll scenes in one press", async ({ page }) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url("&video"));
  await ready(page);
  await pick(page, "clip");
  await expect(tool(page, "video-editor")).toContainText("The video editor");
  await expect(tool(page, "video-scenes")).toContainText("scenes");

  // Looked for by name, the tools stay; a word nothing has says so.
  const find = page.getByTestId("studio-insp-find");
  await find.fill("video editor");
  await expect(tool(page, "video-editor")).toBeVisible();
  await expect(page.getByTestId("studio-insp-none")).toHaveCount(0);
  await find.fill("zebra crossing");
  await expect(page.getByTestId("studio-insp-none")).toBeVisible();
  await find.fill("");

  // The editor itself, straight from the selection.
  await tool(page, "video-editor").click();
  const editor = page.getByTestId("studio-video-editor");
  await expect(editor.getByTestId("video-preview")).toBeVisible({ timeout: 30000 });
  await expect(editor.getByTestId("video-clip")).toHaveCount(1);
  await editor.getByTestId("video-close").click();
  await page.getByTestId("studio-focus-exit").click();

  // Split into scenes: a part of its own after the video's part, made of the same clip, and it is what's selected.
  // (From another section of the inspector: the tools stay on screen whichever section is open.)
  await pick(page, "clip");
  await tool(page, "motion").click();
  await expect(page.getByTestId("studio-insp-open")).toHaveAttribute("data-group", "motion");
  await tool(page, "video-scenes").click();
  await ready(page);
  const kids = await rootKids(page);
  expect(kids.map((k) => k.type)).toEqual(["section", "section"]);
  expect(kids[0].id).toBe("objects");
  const scene = kids[1].children![0];
  expect(scene.type).toBe("scrollScene");
  expect(scene.props.media).toMatchObject({ kind: "video", src: "/editorial/rose-campaign-mobile.mp4" });
  expect(scene.props.chapters).toBe(10);
  expect(scene.children).toHaveLength(3);
  await expect(page.getByTestId("studio-scroll-scene")).toBeInViewport({ timeout: 10000 });
  await expect(frame(page).locator(`[data-tree-node="${scene.id}"]`)).toHaveCount(1);
  // The video itself stays where it was.
  expect(kids[0].children!.some((c) => c.id === "clip" && c.type === "video")).toBe(true);
  // The scene says where its scenes are set, and is not offered as a physics body.
  await expect(tool(page, "scene-chapters")).toBeVisible();
  await expect(tool(page, "body-on")).toHaveCount(0);
});

test("a picture's editor and a 3D model's camera views open from the selection", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url("&sparkle"));
  await ready(page);

  await pick(page, "photo");
  await tool(page, "image-edit").click();
  await expect(page.getByTestId("studio-focus-panel")).toHaveAttribute("data-group", "image");
  await expect(page.getByTestId("studio-image-edit")).toBeInViewport({ timeout: 10000 });
  await page.getByTestId("studio-focus-exit").click();

  await pick(page, "model");
  await expect(tool(page, "model-stage")).toBeVisible();
  await tool(page, "model-views").click();
  await expect(page.getByTestId("studio-focus-panel")).toHaveAttribute("data-group", "model");
  await expect(page.getByTestId("studio-model-views")).toBeInViewport({ timeout: 10000 });
  await page.getByTestId("studio-focus-exit").click();
});

test("physics starts from any element: its holder becomes a world, and the body's and the world's settings show", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url());
  await ready(page);

  // A drawing in a part that is no world yet: one press makes the part a world.
  await pick(page, "drawing");
  await expect(tool(page, "body-on")).toContainText("Objects section");
  await tool(page, "body-on").click();
  await ready(page);
  const world = await page.evaluate(() => (window as any).__canvasHarness.getNode("objects").node.props.world);
  expect(world).toEqual({ start: "drop", walls: "open", bounce: 0.4, drag: true });
  // The drawing is still selected, now a body with its own settings in view.
  await expect(page.getByTestId("studio-body")).toBeInViewport({ timeout: 10000 });
  await expect(tool(page, "body")).toBeVisible();
  await expect(tool(page, "body-on")).toHaveCount(0);

  // The part itself: its tool goes to the world's settings.
  await pick(page, "objects");
  await tool(page, "world").click();
  await expect(page.getByTestId("studio-world-walls")).toBeInViewport({ timeout: 10000 });
  await expect(page.getByTestId("studio-world-field")).toBeVisible();
});

test("with nothing selected the inspector says where the bigger tools are", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  // The docked inspector: it is on screen before anything is picked.
  await page.goto("http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en");
  await ready(page);
  const guide = page.getByTestId("studio-tools-guide");
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("The video editor");
  await expect(guide).toContainText("Physics");
  await expect(guide.locator("li")).toHaveCount(8);
  // Once something is picked, its own tools take the guide's place.
  await page.getByTestId("studio-tab-layers").click();
  await page.locator('[data-testid="studio-layer"][data-node="model"]').click();
  await expect(page.getByTestId("studio-tools")).toBeVisible();
  await expect(guide).toHaveCount(0);
});
