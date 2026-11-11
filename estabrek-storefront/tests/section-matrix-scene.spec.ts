import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const runtime = ts.transpileModule(readFileSync(new URL("../src/pageTree/sceneCanvas.ts", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
// The scenes rest with the page (lib/pageIdleCore.ts, their one import): handed to them as `require` gives it.
const idleCore = ts.transpileModule(readFileSync(new URL("../src/lib/pageIdleCore.ts", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;

for (const width of [1280, 390]) {
  test(`matrix rain paints a still background at ${width}px and releases its animation when hidden`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setContent('<style>body{margin:0;background:#0f051a;color:#fff;font-family:monospace}section{position:relative;isolation:isolate;height:650px;overflow:hidden;display:grid;place-items:center}canvas{position:absolute;inset:0;z-index:-1;width:100%;height:100%;pointer-events:none;color:#00ffff;border-color:#fff}article{text-align:center;padding:24px;background:#0f051acc;border:1px solid #00ffff44;max-width:75%}h1{font-size:clamp(28px,5vw,64px)}a{display:inline-block;color:#00ffff;padding:16px;border:1px solid currentColor}</style><section><canvas aria-hidden="true"></canvas><article><p>PROCEDURAL SECTION SCENE</p><h1>NEXUS FLOW</h1><a href="#details">Explore systems</a></article></section><div style="height:2000px" id="details"></div>');
    await page.evaluate(({ source, idle }) => {
      const api = {} as { mountScene: (canvas: HTMLCanvasElement, spec: object) => () => void };
      const core = {};
    new Function("exports", idle)(core);
    new Function("exports", "require", source)(api, () => core);
      const state = window as unknown as { disposeMatrix: () => void };
      state.disposeMatrix = api.mountScene(document.querySelector("canvas")!, { kind: "matrix", amount: 56, speed: 1, intensity: 1, interactive: true });
      document.querySelector("a")!.addEventListener("click", (event) => { event.preventDefault(); document.querySelector("a")!.setAttribute("data-clicked", "yes"); });
    }, { source: runtime, idle: idleCore });
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("data-scene-state", "static");
    const still = await canvas.evaluate((element: HTMLCanvasElement) => {
      const pixels = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
      return { painted: pixels.some((value, index) => index % 4 === 3 && value > 0), data: element.toDataURL() };
    });
    expect(still.painted).toBe(true);
    await page.mouse.move(10, 10); await page.mouse.move(width - 10, 500);
    expect(await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL())).toBe(still.data);
    await page.getByRole("link", { name: "Explore systems" }).click();
    await expect(page.getByRole("link")).toHaveAttribute("data-clicked", "yes");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`matrix-${width}.png`) });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(canvas).toHaveAttribute("data-scene-state", "running");
    await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL())).not.toBe(still.data);
    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect(canvas).toHaveAttribute("data-scene-state", "paused");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(canvas).toHaveAttribute("data-scene-state", "running");
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await expect(canvas).toHaveAttribute("data-scene-state", "paused");
    await page.evaluate(() => (window as unknown as { disposeMatrix: () => void }).disposeMatrix());
  });
}
