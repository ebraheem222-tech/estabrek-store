import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const pagePath = "/en/slider-effects-demo";
const slider = (id: string) => `[data-tree-node="expanded-slider-${id}"]`;
const mediaFile = path.resolve(process.cwd(), "../.tmp/media-overlay-test.webm");
test.beforeEach(async ({ page }) => {
  await page.route("https://media.example.test/merchant-demo.webm", (route) => route.fulfill({ path: mediaFile, contentType: "video/webm" }));
});
test.beforeAll(async ({ browser }) => {
  if (fs.existsSync(mediaFile)) return;
  const page = await browser.newPage();
  try {
    const bytes = await page.evaluate(() => new Promise<number[]>((resolve, reject) => {
      const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 180;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#4a7d9b"; context.fillRect(0, 0, 320, 180);
      const stream = canvas.captureStream(12), recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = async () => { stream.getTracks().forEach((track) => track.stop()); resolve(Array.from(new Uint8Array(await new Blob(chunks, { type: "video/webm" }).arrayBuffer()))); };
      recorder.onerror = () => { stream.getTracks().forEach((track) => track.stop()); reject(new Error("Cannot record test clip")); };
      recorder.start(); setTimeout(() => recorder.stop(), 500);
    }));
    fs.mkdirSync(path.dirname(mediaFile), { recursive: true }); fs.writeFileSync(mediaFile, Buffer.from(bytes));
  } finally { await page.close(); }
});

test("image slices rotate separate original image crops, with usable caption links and synchronized controls", async ({ page }) => {
  await page.goto(pagePath);
  const root = page.locator(slider("slices"));
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-enhanced", "");
  if (await root.locator(".pt-slider-pause").count()) await root.locator(".pt-slider-pause").click();
  await expect(root.locator(".pt-slider-thumb")).toHaveCount(3);
  await root.locator(".pt-slider-thumb").nth(1).click();
  await expect(root).toHaveAttribute("data-at", "1");
  await expect(root.locator(".pt-slider-slices>span")).toHaveCount(8);
  const frames = await root.locator(".pt-slider-slices>span").evaluateAll((panels) => panels.map((panel) => ({ image: panel.querySelector("img")?.getAttribute("src"), rotate: panel.getAnimations()[0]?.effect instanceof KeyframeEffect ? (panel.getAnimations()[0].effect as KeyframeEffect).getKeyframes()[0].transform : "", delay: panel.getAnimations()[0]?.effect?.getTiming().delay })));
  expect(frames.every((frame) => frame.image === "/templates/experimental/foundry-2.svg" && String(frame.rotate).includes("rotateY"))).toBe(true);
  expect(Number(frames[7].delay)).toBeGreaterThan(Number(frames[0].delay));
  await expect(root.locator(".pt-slider-progress")).toHaveAttribute("aria-valuenow", "2");
  const active = root.locator('.pt-slide[data-slider-active="true"]');
  await expect(active.locator(".pt-slide-title")).toHaveText("Slide 2");
  await expect(active.locator(".pt-slide-text")).toHaveText("Description 2");
  await expect(active.locator(".pt-slide-cta")).toHaveText("Explore");
  await expect(active.locator("a")).toHaveAttribute("href", "/en/shop");
  await expect(root.locator(".pt-slider-slices")).toHaveCount(0);
  expect(await root.locator(".pt-slide").evaluateAll((slides) => slides.map((slide) => (slide as HTMLElement).inert))).toEqual([true, false, true]);
});

for (const effect of ["fade", "zoom", "wipe"] as const) {
  test(`${effect} uses its transition and allows thumbnails, keyboard and direct links`, async ({ page }) => {
    await page.goto(pagePath);
    const root = page.locator(slider(effect));
    await root.scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute("data-ready", "");
    if (await root.locator(".pt-slider-pause").count()) await root.locator(".pt-slider-pause").click();
    await root.locator(".pt-slider-next").click();
    await expect(root).toHaveAttribute("data-at", "1");
    const frames = await root.locator('.pt-slide[data-slider-active="true"]').evaluate((el) => (el.getAnimations()[0]?.effect as KeyframeEffect | undefined)?.getKeyframes());
    expect(frames?.length).toBeGreaterThan(1);
    if (effect === "zoom") expect(frames?.[0].transform).toContain("1.12");
    if (effect === "wipe") expect(frames?.[0].clipPath).toContain("inset(");
    if (effect === "fade") expect(frames?.[0].opacity).toBe("0");
    await root.locator(".pt-slides").focus();
    await page.keyboard.press("Home");
    await expect(root).toHaveAttribute("data-at", "0");
  });
}

test("coverflow displays dimensional neighbors, respects no-loop and supports mouse drag", async ({ page }) => {
  await page.goto(pagePath);
  const root = page.locator(slider("coverflow"));
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-enhanced", "");
  const cards = await root.locator(".pt-slide").evaluateAll((nodes) => nodes.map((el) => ({ transform: getComputedStyle(el).transform, opacity: Number(getComputedStyle(el).opacity), width: el.getBoundingClientRect().width })));
  expect(cards[1].opacity).toBeGreaterThan(0);
  expect(cards[1].transform).toContain("matrix3d");
  expect(cards[0].width).toBeLessThan((await root.boundingBox())!.width);
  await expect(root.locator(".pt-slider-prev")).toBeDisabled();
  await root.locator(".pt-slides").focus();
  await page.keyboard.press("End");
  await expect(root).toHaveAttribute("data-at", "2");
  await expect(root.locator(".pt-slider-next")).toBeDisabled();
  await page.keyboard.press("Home");
  await expect(root).toHaveAttribute("data-at", "0");
  const box = (await root.locator(".pt-slides").boundingBox())!;
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .3, box.y + box.height * .3, { steps: 8 });
  await page.mouse.up();
  await expect(root).toHaveAttribute("data-at", "1");
});

test("vertical flip uses split content, while reduced motion and RTL retain keyboard navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pagePath);
  const root = page.locator(slider("vertical"));
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-axis", "y");
  await expect(root).toHaveAttribute("data-caption", "split");
  await root.locator(".pt-slides").focus();
  await page.keyboard.press("ArrowDown");
  await expect(root).toHaveAttribute("data-at", "1");
  expect(await root.locator(".pt-slide").evaluateAll((nodes) => nodes.reduce((count, el) => count + el.getAnimations().length, 0))).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.goto("/he/slider-effects-demo");
  const rtl = page.locator(slider("coverflow"));
  await rtl.scrollIntoViewIfNeeded();
  await expect(rtl).toHaveAttribute("data-at", "0");
  await rtl.locator(".pt-slides").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(rtl).toHaveAttribute("data-at", "1");
});

test("video slices use a simple fade and only the active video plays", async ({ page }) => {
  await page.goto(pagePath);
  const root = page.locator(slider("video"));
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-ready", "");
  expect(await root.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await root.locator(".pt-slider-next").click();
  await expect(root).toHaveAttribute("data-at", "1");
  await expect(root.locator(".pt-slider-slices")).toHaveCount(0);
  await expect.poll(() => root.locator("video").evaluate((v: HTMLVideoElement) => !v.paused && v.muted)).toBe(true);
  await root.locator(".pt-slider-next").click();
  await expect.poll(() => root.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test("the server preserves a native scrolling fallback without scripts", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: "http://127.0.0.1:3000" });
  const page = await context.newPage();
  try {
    await page.goto(pagePath);
    const root = page.locator(slider("slices"));
    await expect(root.locator(".pt-slide")).toHaveCount(3);
    await expect(root.locator(".pt-slider-arrow")).toHaveCount(0);
    expect(await root.locator(".pt-slides").evaluate((row) => row.scrollWidth > row.clientWidth)).toBe(true);
    await expect(root.locator(".pt-slide-title").first()).toHaveText("Slide 1");
    expect(await page.locator(`${slider("video")} video`).getAttribute("autoplay")).toBeNull();
  } finally { await context.close(); }
});

test("long vertical captions scroll by wheel without changing the selected slide", async ({ page }) => {
  await page.goto(pagePath);
  const root = page.locator(slider("vertical"));
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-at", "0");
  const caption = root.locator('.pt-slide[data-slider-active="true"] .pt-slide-rich');
  await caption.evaluate((el) => {
    const node = el as HTMLElement;
    node.style.height = "64px"; node.style.maxHeight = "64px";
    node.querySelector(".pt-slide-text")!.textContent = "Merchant description to read while scrolling. ".repeat(300);
    node.scrollTop = 0;
  });
  expect(await caption.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  const box = (await caption.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => caption.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await expect(root).toHaveAttribute("data-at", "0");
  await expect(root.locator('.pt-slide[data-slider-active="true"] .pt-slide-link')).toHaveAttribute("href", "/en/shop");
});

test("long vertical captions keep native touch scrolling while image swipes still change slides", async ({ page, browser }) => {
  await page.goto(pagePath);
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const phone = await context.newPage();
  try {
    await phone.goto(pagePath);
    const root = phone.locator(slider("vertical"));
    await root.scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute("data-at", "0");
    const caption = root.locator('.pt-slide[data-slider-active="true"] .pt-slide-rich');
    await caption.evaluate((el) => {
      const node = el as HTMLElement;
      node.style.height = "64px"; node.style.maxHeight = "64px";
      node.querySelector(".pt-slide-text")!.textContent = "Merchant description to read while scrolling. ".repeat(300);
      node.scrollTop = 0;
    });
    const cdp = await context.newCDPSession(phone);
    const swipe = async (x: number, from: number, to: number) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from }] });
      for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: from + (to - from) * i / 10 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    const surface = await caption.evaluate((el) => {
      const box = el.getBoundingClientRect(), root = el.closest(".pt-slider")!, bounds = root.getBoundingClientRect();
      const thumbs = root.querySelector(".pt-slider-thumbs")!.getBoundingClientRect();
      const from = Math.min(box.bottom, bounds.bottom, thumbs.top) - 8, to = box.top + 8, x = box.x + box.width / 2;
      return { box: box.toJSON(), root: bounds.toJSON(), thumbs: thumbs.toJSON(), from, to, x, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, firstContentTop: el.firstElementChild!.getBoundingClientRect().top, hitIsCaption: el.contains(document.elementFromPoint(x, from)) };
    });
    await test.info().attach("mobile-caption-geometry", { body: JSON.stringify(surface), contentType: "application/json" });
    expect(surface.box.bottom, "the caption stays inside the visible slider").toBeLessThanOrEqual(surface.root.bottom + 1);
    expect(surface.firstContentTop, "the start of a long caption remains reachable at scrollTop zero").toBeGreaterThanOrEqual(surface.box.top);
    expect(surface.from - surface.to, "the caption offers an unobscured touch reading area").toBeGreaterThanOrEqual(40);
    expect(surface.hitIsCaption, "the gesture begins on caption text, clear of the thumbnail controls").toBe(true);
    await swipe(surface.x, surface.from, surface.to);
    await expect.poll(() => caption.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect(root).toHaveAttribute("data-at", "0");
    const imageBox = (await root.locator('.pt-slide[data-slider-active="true"] .pt-slide-media').boundingBox())!;
    await swipe(imageBox.x + imageBox.width / 2, imageBox.y + imageBox.height * .8, imageBox.y + imageBox.height * .2);
    await expect(root).toHaveAttribute("data-at", "1");
  } finally { await context.close(); }
});
