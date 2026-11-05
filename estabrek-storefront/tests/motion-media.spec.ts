import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test("all template profiles can be previewed and imported without changing their originals", async ({ page, request }) => {
  const flatten = (nodes: any[]): any[] => nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
  for (const id of ["fashion-boutique", "electronics-prism", "shoes-night"]) {
    const rich = await (await request.get(`/api/templates/${id}?motionEngine=anime&motionPreset=rich`)).json();
    const nodes = flatten([...rich.sections, ...rich.design.header.root.children, ...rich.design.footer.root.children]);
    const moving = nodes.filter((node) => node.motion);
    expect(moving.length, id).toBeGreaterThan(5);
    expect(moving.every((node) => node.motion.engine === "anime"), id).toBe(true);
    const none = await (await request.get(`/api/templates/${id}?motionPreset=none`)).json();
    expect(flatten([...none.sections, ...none.design.header.root.children, ...none.design.footer.root.children]).some((node) => node.motion), id).toBe(false);
    const original = await (await request.get(`/api/templates/${id}`)).json();
    expect(flatten(original.sections).some((node) => node.motion?.engine === "anime"), id).toBe(false);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/design-frame?template=electronics-prism&motionEngine=anime&motionPreset=rich");
  const configured = await page.locator("[data-pt-motion]").evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.getAttribute("data-pt-motion")!)));
  expect(configured.length).toBeGreaterThan(5);
  expect(configured.every((motion) => motion.engine === "anime")).toBe(true);
});

test.describe("editable layered video and model fallbacks", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://media.example.test/merchant-demo.webm", (route) => route.fulfill({ path: path.resolve(process.cwd(), "../.tmp/media-overlay-test.webm"), contentType: "video/webm" }));
  });
  test.beforeAll(async ({ browser }) => {
    // A tiny, generated test clip, independent of any store's real film or external CDN.
    const page = await browser.newPage();
    try {
      const bytes = await page.evaluate(() => new Promise<number[]>((resolve, reject) => {
        const canvas = document.createElement("canvas");
        canvas.width = 320; canvas.height = 180;
        const context = canvas.getContext("2d")!;
        let frame = 0;
        const draw = () => { context.fillStyle = frame++ % 2 ? "#5b99bf" : "#4a7d9b"; context.fillRect(0, 0, 320, 180); context.fillStyle = "white"; context.font = "22px sans-serif"; context.fillText("Merchant video demo", 35, 100); };
        draw();
        const stream = canvas.captureStream(12);
        const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
        const chunks: Blob[] = [];
        const interval = setInterval(draw, 80);
        recorder.ondataavailable = (event) => chunks.push(event.data);
        recorder.onerror = () => { clearInterval(interval); stream.getTracks().forEach((track) => track.stop()); reject(new Error("Cannot record test clip")); };
        recorder.onstop = async () => { clearInterval(interval); stream.getTracks().forEach((track) => track.stop()); resolve(Array.from(new Uint8Array(await new Blob(chunks, { type: "video/webm" }).arrayBuffer()))); };
        recorder.start();
        setTimeout(() => recorder.stop(), 1200);
      }));
      const file = path.resolve(process.cwd(), "../.tmp/media-overlay-test.webm");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(bytes));
    } finally { await page.close(); }
  });

  test("a real playing clip has black or coloured opacity below its foreground content", async ({ page }) => {
    await page.goto("/en/motion-media-demo");
    for (const [id, colour, opacity] of [["black-film", "#000000", "0.5"], ["colour-film", "#8b1538", "0.35"]]) {
      const video = page.locator(`[data-tree-node="${id}-video"]`);
      await video.scrollIntoViewIfNeeded();
      await expect(video).toHaveCSS("--pt-ov", colour);
      await expect(video).toHaveCSS("--pt-ovo", opacity);
      await expect(video.locator("video")).toHaveAttribute("aria-label", "Merchant showcase video");
      await expect.poll(() => video.locator("video").evaluate((element: HTMLVideoElement) => element.videoWidth > 0 && !element.paused && element.currentTime > 0)).toBe(true);
      const title = page.locator(`[data-tree-node="${id}-title"]`);
      await expect(title).toBeVisible();
      await expect(title).toHaveCSS("z-index", "2");
      const button = page.locator(`[data-tree-node="${id}-button"]`);
      await expect(button).toHaveAttribute("href", "/en/shop");
      await expect(button).toBeVisible();
    }
  });

  test("an unavailable merchant GLB keeps its own poster without breaking the page", async ({ page }) => {
    await page.goto("/en/motion-media-demo");
    const model = page.locator('[data-tree-node="model-fallback"]');
    await model.scrollIntoViewIfNeeded();
    await expect(model.locator(".pt-model3d-poster")).toBeVisible();
    await expect(model.locator(".pt-model3d-stage")).toHaveAttribute("data-model-state", "fallback");
    await expect(model.locator(".pt-model3d-poster")).toHaveAttribute("src", "/templates/electronics/hero.svg");
    await expect(page.getByRole("heading", { name: "Your video, your story" }).first()).toBeAttached();
  });
});
