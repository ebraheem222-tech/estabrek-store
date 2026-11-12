import { expect, test, type Page } from "@playwright/test";

// The video editor (focus mode, A4): opened from a video, its clip read from the shop; it plays on a canvas;
// the clip is cut at the play head and trimmed; words are added and changed; the frame turns 9:16; "Make the video"
// saves the project with the element and the page shows the made video (the test page answers like the backend).

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&video";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);

test("a video is cut, trimmed, worded and reshaped in the editor, and made", async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect.poll(async () => Number(await page.getByTestId("studio-overlay").getAttribute("data-shapes")), { timeout: 30000 }).toBeGreaterThanOrEqual(4);
  const rect = await frame(page).locator('[data-tree-node="clip"]').evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const viewport = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport);
  const scale = box.width / viewport.w;
  await page.mouse.dblclick(box.x + rect.x * scale, box.y + rect.y * scale);
  await expect(page.getByTestId("studio-focus-bar")).toHaveAttribute("data-group", "video");
  await page.getByTestId("studio-video-open").click();

  // The clip, read from the shop, starts the project; the preview draws it.
  const editor = page.getByTestId("studio-video-editor");
  await expect(editor.getByTestId("video-preview")).toBeVisible({ timeout: 30000 });
  await expect(editor.getByTestId("video-clip")).toHaveCount(1);
  const total = await editor.getByTestId("video-time").textContent();

  // It plays: the clock moves.
  await editor.getByTestId("video-play").click();
  await expect.poll(async () => (await editor.getByTestId("video-time").textContent())!.split(" / ")[0], { timeout: 10000 }).not.toBe("0:00.0");
  await editor.getByTestId("video-play").click();

  // Cut at the play head (moved by a click on the ruler): two clips.
  const ruler = (await editor.getByTestId("video-ruler").boundingBox())!;
  await page.mouse.click(ruler.x + ruler.width * 0.4, ruler.y + ruler.height / 2);
  await editor.getByTestId("video-split").click();
  await expect(editor.getByTestId("video-clip")).toHaveCount(2);
  // The second clip's end trimmed by dragging its edge.
  const second = editor.getByTestId("video-clip").nth(1);
  const end = (await second.getByTestId("video-trim-out").boundingBox())!;
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x - 80, end.y + end.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await editor.getByTestId("video-time").textContent())!.split(" / ")[1]).not.toBe(total!.split(" / ")[1]);
  await expect(editor.getByTestId("video-clip-panel")).toBeVisible();
  await editor.getByTestId("video-clip-speed").selectOption("2");

  // Words over it, changed, at the top.
  await editor.getByTestId("video-add-words").click();
  await editor.getByTestId("video-words-text").fill("تخفيضات الصيف");
  await editor.locator('[data-testid="video-words-place"][data-place="top"]').click();
  await editor.getByTestId("video-words-box").check();
  // The frame for phones.
  await editor.locator('[data-testid="video-ratio"][data-ratio="9:16"]').click();
  await expect(editor.getByTestId("video-preview")).toHaveAttribute("data-ratio", "9:16");
  await editor.getByTestId("video-fade").check();
  await page.screenshot({ path: testInfo.outputPath("video-editor.png") });

  // Made: the element shows the made video, and the project is kept with it.
  await editor.getByTestId("video-save").click();
  await expect.poll(async () => (await readNode(page, "clip"))?.props?.src).toMatch(/made=2$/);
  const saved = (await readNode(page, "clip")).props.edit.project;
  expect(saved.clips).toHaveLength(2);
  expect(saved.clips[1].speed).toBe(2);
  expect(saved).toMatchObject({ ratio: "9:16", fade: true, words: [{ text: "تخفيضات الصيف", place: "top", box: true }] });
  await expect(editor.getByTestId("video-note")).toBeVisible();

  // Opened again, it is the same project.
  await editor.getByTestId("video-close").click();
  await page.getByTestId("studio-video-open").click();
  await expect(page.getByTestId("studio-video-editor").getByTestId("video-clip")).toHaveCount(2);
  await expect(page.getByTestId("studio-video-editor").getByTestId("video-words")).toHaveCount(1);
});
