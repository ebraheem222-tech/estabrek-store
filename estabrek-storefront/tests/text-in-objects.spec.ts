import { expect, test, type Page } from "@playwright/test";
import { cssLength } from "../src/pageTree/studioGeometry";

// Words inside objects can be written in place: inside a held (pinned) box that the scroll effects take
// out and put back while measuring, and inside things moved with translate/scale (a ring's cards).

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const draftNode = (page: Page, id: string) => page.evaluate((x) => (window as any).__canvasHarness.getNode(x), id);

test("lengths the browser computed are read in px, their % of the box", () => {
  expect(cssLength("12.5px", 100)).toBe(12.5);
  expect(cssLength("-50%", 80)).toBe(-40);
  expect(cssLength("calc(-50% + 121.2px)", 100)).toBeCloseTo(71.2, 5);
  expect(cssLength("calc(-50% - 328px)", 200)).toBe(-428);
  expect(cssLength("1em", 100)).toBeNull();
});

test("a word on a card of a held ring is written in place, even when the page measures again meanwhile", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(url);
  await ready(page);
  await page.getByRole("tab", { name: "+ Add" }).click();
  await page.locator('[data-testid="studio-add-item"][data-kind="ready-orbit"]').click();
  await ready(page);
  const word = frame(page).locator("[data-pt-orbit] h3").first();
  await expect(word).toBeVisible();
  const id = (await word.getAttribute("data-tree-node"))!;
  // The editor shows the new section for a few moments after adding it; then the word is brought into sight.
  await page.waitForTimeout(3000);
  await word.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1200);
  // Measured where it is, though its card is moved and scaled by the ring.
  await expect.poll(() => page.evaluate((x) => (window as any).__canvasHarness.getLayout()?.items.find((i: any) => i.id === x)?.geometry?.unsupported ?? null, id)).toBeNull();
  const r = await word.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const scale = box.width / (await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w));
  await page.mouse.dblclick(box.x + r.x * scale, box.y + r.y * scale);
  await expect(word).toHaveAttribute("contenteditable", "true");
  // The scroll effects measure again (the held box is taken out and put back): still writing.
  await word.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(700);
  await expect(word).toHaveAttribute("contenteditable", "true");
  // Typing starts once the page has measured again and the word has its focus back, steadily (a fixed wait was
  // too short on CI's slower machine: the first letters went in while the held box was out and were lost).
  await expect.poll(() => word.evaluate((el) => new Promise<boolean>((resolve) => {
    let steady = 0;
    const tick = () => {
      const doc = el.ownerDocument;
      if (!(doc.activeElement === el || el.contains(doc.activeElement)) || el.getAttribute("contenteditable") !== "true") return resolve(false);
      if (++steady >= 4) return resolve(true);
      window.setTimeout(tick, 120);
    };
    tick();
  })), { timeout: 15000 }).toBe(true);
  await page.keyboard.press("Control+A");
  // The editor selects the word's own text a moment after the keys: the first letter waits for it (on CI it
  // went in before, and only "entle" was saved).
  await expect.poll(() => word.evaluate((el) => {
    const sel = el.ownerDocument.getSelection();
    return Boolean(sel && sel.rangeCount && !sel.isCollapsed && el.contains(sel.anchorNode) && sel.toString().trim() === (el.textContent ?? "").trim());
  }), { timeout: 10000 }).toBe(true);
  await page.keyboard.type("Gentle");
  await page.keyboard.press("Enter");
  await expect.poll(async () => JSON.stringify((await draftNode(page, id))?.props?.text ?? (await draftNode(page, id))?.node?.props?.text)).toContain("Gentle");
});

test("letters written while the page measures again after every key land where the last key left the caret", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(url);
  await ready(page);
  await page.getByRole("tab", { name: "+ Add" }).click();
  await page.locator('[data-testid="studio-add-item"][data-kind="ready-orbit"]').click();
  await ready(page);
  const word = frame(page).locator("[data-pt-orbit] h3").first();
  await expect(word).toBeVisible();
  const id = (await word.getAttribute("data-tree-node"))!;
  await page.waitForTimeout(3000);
  await word.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1200);
  await expect.poll(() => page.evaluate((x) => (window as any).__canvasHarness.getLayout()?.items.find((i: any) => i.id === x)?.geometry?.unsupported ?? null, id)).toBeNull();
  const r = await word.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const scale = box.width / (await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w));
  await page.mouse.dblclick(box.x + r.x * scale, box.y + r.y * scale);
  await expect(word).toHaveAttribute("contenteditable", "true");
  await expect.poll(() => word.evaluate((el) => el.ownerDocument.activeElement === el)).toBe(true);
  // The worst moment, every time: the scroll effects measure again (the editor's view was committed) inside the
  // very key that wrote a letter, before the browser has told anyone where the caret now is. The held ring is
  // taken out and put back, so the word loses its focus once per key (counted, to know it really happened).
  await word.evaluate((el) => {
    const w = window as any;
    w.__wordLeft = 0;
    el.addEventListener("blur", () => void w.__wordLeft++);
    el.addEventListener("input", () => window.dispatchEvent(new Event("studio-view-commit")));
  });
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Gentle");
  await expect(word).toHaveText("Gentle");
  expect(await word.evaluate(() => (window as any).__wordLeft)).toBeGreaterThanOrEqual(6);
  // A new line (what Enter writes in a text of several lines) and measured again: the caret is still on the new
  // line, not back at the end of the one before (both are the same count of letters into the words).
  await word.evaluate(() => document.execCommand("insertLineBreak"));
  await page.keyboard.type("touch");
  await expect.poll(() => word.evaluate((el) => (el as HTMLElement).innerText.trim())).toBe("Gentle\ntouch");
  // Back with the arrows into the first line, measured again before the next key: written there.
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Home");
  await word.evaluate(() => window.dispatchEvent(new Event("studio-view-commit")));
  await page.keyboard.type("So ");
  await expect.poll(() => word.evaluate((el) => (el as HTMLElement).innerText.trim())).toBe("So Gentle\ntouch");
  await expect(word).toHaveAttribute("contenteditable", "true");
  await page.keyboard.press("Enter");
  await expect.poll(async () => JSON.stringify((await draftNode(page, id))?.props?.text ?? (await draftNode(page, id))?.node?.props?.text)).toContain("So Gentle\\ntouch");
});

test("when the page in the frame reloads in the middle of writing, other words can still be written", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(url);
  await ready(page);
  const dbl = async (selector: string) => {
    const el = frame(page).locator(selector).first();
    await el.evaluate((x) => x.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(800);
    const r = await el.evaluate((x) => { const b = x.getBoundingClientRect(); return { x: b.x + Math.min(b.width / 2, 20), y: b.y + b.height / 2 }; });
    const box = (await page.getByTestId("studio-frame").boundingBox())!;
    const scale = box.width / (await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w));
    await page.mouse.dblclick(box.x + r.x * scale, box.y + r.y * scale);
  };
  await dbl('[data-tree-node="headline"] strong');
  await expect(frame(page).locator("[contenteditable]")).toHaveCount(1);
  // The frame reloads by itself while writing (a lost connection, a new version of the shop…).
  await frame(page).locator("body").evaluate(() => location.reload());
  await expect.poll(() => page.evaluate(() => (window as any).__canvasHarness.getLayout()?.items?.length ?? 0), { timeout: 60000 }).toBeGreaterThan(0);
  await page.waitForTimeout(1500);
  await dbl('[data-tree-node="body-copy"] em');
  await expect(frame(page).locator("[contenteditable]")).toHaveCount(1);
});

test("words inside a programme, a comparison table and a filtered gallery are written in place", async ({ page }) => {
  test.setTimeout(200000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(url);
  await ready(page);
  await page.getByRole("tab", { name: "+ Add" }).click();
  for (const k of ["reference-festava", "reference-tiya", "reference-scholar"]) {
    await page.locator(`[data-testid="studio-add-item"][data-kind="${k}"]`).click();
    await ready(page);
  }
  await page.waitForTimeout(3000);
  const write = async (owner: string, field: string, words: string) => {
    const el = frame(page).locator(`[data-tree-node].pt-${owner}`).locator(`[data-pt-field="${field}"]`).first();
    const id = (await frame(page).locator(`[data-tree-node].pt-${owner}`).first().getAttribute("data-tree-node"))!;
    await el.evaluate((x) => x.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(900);
    const r = await el.evaluate((x) => { const b = x.getBoundingClientRect(); return { x: b.x + Math.min(b.width / 2, 20), y: b.y + b.height / 2 }; });
    const box = (await page.getByTestId("studio-frame").boundingBox())!;
    const scale = box.width / (await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w));
    await page.mouse.dblclick(box.x + r.x * scale, box.y + r.y * scale);
    await expect(frame(page).locator("[contenteditable]")).toHaveCount(1);
    await page.keyboard.press("Control+A");
    await page.keyboard.type(words);
    await page.keyboard.press("Enter");
    const path = field.split(".");
    await expect.poll(async () => {
      let at: any = (await draftNode(page, id))?.node?.props ?? (await draftNode(page, id))?.props;
      for (const k of path) at = at?.[/^\d+$/.test(k) ? Number(k) : k];
      return at?.en;
    }).toBe(words);
  };
  await write("schedule", "items.0.day", "Opening day");
  await write("comparison", "rows.0.label", "Free delivery");
  await write("filterGallery", "items.1.category", "Bestsellers");
});
