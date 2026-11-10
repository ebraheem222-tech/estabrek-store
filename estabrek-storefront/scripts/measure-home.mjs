#!/usr/bin/env node
/**
 * The home's weight on a mid-range phone, against its budgets.
 *
 *   node scripts/measure-home.mjs [address] [runs]      (default: the live shop, 3 runs)
 *
 * A Pixel-sized screen with the processor 4× slower and a 4G line (9 Mbps, 60 ms), like a mid-range Android
 * phone; the graphics card draws the 3D (without it headless Chrome draws on the processor, far slower than a
 * phone). Prints the middle run of each figure and which ones are over budget; exits with 1 if any is.
 * Read-only: it only opens the page and scrolls it.
 */
import { chromium, devices } from "playwright";

/** What the home may cost on that phone (Google's "good" lines for the first three). */
export const BUDGET = {
  lcpMs: 2500, // the biggest picture or text painted
  cls: 0.1, // how much the page jumps while loading
  tbtMs: 600, // time the page can't answer a tap while loading (long tasks after the first paint)
  jsKB: 600, // JavaScript sent (compressed)
};
// Also shown, without a budget: the drawing surfaces alive before any scroll. The 3D scenes are built ahead in
// small parts while the page is idle (motion settings: prebuild3d), so scrolling into them doesn't freeze; that
// work shows up in tbtMs on a slow phone.

const base = process.argv[2] || "https://estabrek-store.vercel.app";
const runs = Number(process.argv[3] || 3);
const browser = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const results = [];
for (let run = 0; run < runs; run++) {
  const context = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    const w = window;
    w.__m = { lcp: 0, cls: 0, fcp: 0, long: [] };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) w.__m.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__m.long.push([e.startTime, e.duration]); }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") w.__m.fcp = e.startTime; }).observe({ type: "paint", buffered: true });
  });
  await page.goto(`${base}/`, { waitUntil: "load", timeout: 300000 });
  await page.waitForTimeout(8000);
  results.push(await page.evaluate(() => {
    const m = window.__m;
    const js = performance.getEntriesByType("resource").filter((r) => r.initiatorType === "script" || /\.js(\?|$)/.test(r.name));
    return {
      fcpMs: Math.round(m.fcp), lcpMs: Math.round(m.lcp), cls: +m.cls.toFixed(3),
      tbtMs: Math.round(m.long.filter(([s]) => s > m.fcp).reduce((a, [, d]) => a + Math.max(0, d - 50), 0)),
      jsKB: Math.round(js.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
      canvasesAtLoad: document.querySelectorAll("canvas").length,
    };
  }));
  await context.close();
}
await browser.close();
const middle = (key) => results.map((r) => r[key]).sort((a, b) => a - b)[Math.floor(results.length / 2)];
let over = 0;
for (const key of ["fcpMs", "lcpMs", "cls", "tbtMs", "jsKB", "canvasesAtLoad"]) {
  const value = middle(key), limit = BUDGET[key];
  const bad = limit !== undefined && value > limit;
  if (bad) over++;
  console.log(`${key.padEnd(15)} ${String(value).padStart(7)}  ${limit === undefined ? "" : `budget ${limit}`}${bad ? "  ← over" : ""}`);
}
process.exit(over ? 1 : 0);
