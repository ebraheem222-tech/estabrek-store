import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const runtime = ts.transpileModule(readFileSync(new URL("../src/pageTree/sceneCanvas.ts", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
// The scenes rest with the page (lib/pageIdleCore.ts, their one import): handed to them as `require` gives it.
const idleCore = ts.transpileModule(readFileSync(new URL("../src/lib/pageIdleCore.ts", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;

test("all section scenes paint distinct still backgrounds without blocking merchant content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/scene-demo");
  const drawings: string[] = [];
  for (const kind of ["constellation", "orbs", "waves", "grid", "starfield", "ribbons", "snow", "fireworks"]) {
    const canvas = page.locator(`canvas[data-pt-scene="${kind}"]`);
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute("data-scene-state", "static");
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
    await expect(canvas).toHaveCSS("pointer-events", "none");
    const drawing = await canvas.evaluate((el: HTMLCanvasElement) => {
      const image = el.getContext("2d")!.getImageData(0, 0, el.width, el.height);
      return { painted: image.data.some((value, index) => index % 4 === 3 && value > 0), image: el.toDataURL(), ratio: el.width / el.getBoundingClientRect().width };
    });
    expect(drawing.painted, kind).toBe(true); expect(drawing.ratio).toBeLessThanOrEqual(2.01); drawings.push(drawing.image);
  }
  expect(new Set(drawings).size).toBe(8);
  const link = page.locator('[data-tree-node="scene-content-link"]');
  await link.scrollIntoViewIfNeeded();
  await link.evaluate((element) => element.addEventListener("click", (event) => { event.preventDefault(); element.setAttribute("data-clicked", "yes"); }));
  await link.click(); await expect(link).toHaveAttribute("data-clicked", "yes");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("native scene runtime pauses offscreen and hidden, freezes reduced motion, and disposes observers and frames", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setContent('<style>body{margin:0}section{position:relative;isolation:isolate;height:440px}canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;color:#8b5cf6;border-color:#38bdf8}a{position:relative;z-index:1}</style><section><canvas></canvas><a href="#end">Content link</a></section><div style="height:2000px" id="end"></div>');
  await page.evaluate(({ source, idle }) => {
    const target = window as unknown as { sceneDispose: () => void; sceneDraws: number; sceneDisconnects: number; sceneFrames: Set<number> };
    target.sceneDraws = 0; target.sceneDisconnects = 0; target.sceneFrames = new Set();
    const originalRequest = requestAnimationFrame.bind(window), originalCancel = cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { const id = originalRequest((now) => { target.sceneFrames.delete(id); cb(now); }); target.sceneFrames.add(id); return id; };
    window.cancelAnimationFrame = (id) => { target.sceneFrames.delete(id); originalCancel(id); };
    const NativeIntersection = IntersectionObserver, NativeResize = ResizeObserver;
    window.IntersectionObserver = class extends NativeIntersection { disconnect() { target.sceneDisconnects++; super.disconnect(); } };
    window.ResizeObserver = class extends NativeResize { disconnect() { target.sceneDisconnects++; super.disconnect(); } };
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) { target.sceneDraws++; clear.apply(this, args); };
    const api = {} as { mountScene: (canvas: HTMLCanvasElement, spec: object) => () => void };
    const core = {};
    new Function("exports", idle)(core);
    new Function("exports", "require", source)(api, () => core);
    target.sceneDispose = api.mountScene(document.querySelector("canvas")!, { kind: "constellation", amount: 32, speed: 1, intensity: 1, interactive: true });
  }, { source: runtime, idle: idleCore });
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene-state", "running");
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(canvas).toHaveAttribute("data-scene-state", "paused");
  expect(await page.evaluate(() => (window as unknown as { sceneFrames: Set<number> }).sceneFrames.size)).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(canvas).toHaveAttribute("data-scene-state", "running");
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(canvas).toHaveAttribute("data-scene-state", "paused");
  expect(await page.evaluate(() => (window as unknown as { sceneFrames: Set<number> }).sceneFrames.size)).toBe(0);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(canvas).toHaveAttribute("data-scene-state", "static");
  const still = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
  await page.mouse.move(50, 50); await page.mouse.move(400, 300);
  expect(await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL())).toBe(still);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(canvas).toHaveAttribute("data-scene-state", "running");
  const disposed = await page.evaluate(() => {
    const target = window as unknown as { sceneDispose: () => void; sceneDraws: number; sceneDisconnects: number; sceneFrames: Set<number> };
    target.sceneDispose(); document.querySelector("section")!.style.height = "550px";
    document.dispatchEvent(new Event("visibilitychange"));
    return { frames: target.sceneFrames.size, disconnects: target.sceneDisconnects, draws: target.sceneDraws };
  });
  expect(disposed.frames).toBe(0); expect(disposed.disconnects).toBe(2);
  await page.mouse.move(60, 60); await page.setViewportSize({ width: 600, height: 600 });
  expect(await page.evaluate(() => (window as unknown as { sceneDraws: number }).sceneDraws)).toBe(disposed.draws);
});
