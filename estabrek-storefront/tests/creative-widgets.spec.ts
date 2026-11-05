import { expect, test } from "@playwright/test";

test("piano is silent until enabled, keys are scoped and guitar chords remain playable", async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    const state = window as typeof window & { instrumentContexts: AudioContext[] };
    state.instrumentContexts = [];
    window.AudioContext = class extends Native { constructor(options?: AudioContextOptions) { super(options); state.instrumentContexts.push(this); } };
  });
  await page.goto("/en/expanded-demo");
  const piano = page.locator('[data-tree-node="instrument-piano"]');
  const guitar = page.locator('[data-tree-node="instrument-guitar"]');
  await expect(piano.locator("[data-note]")).toHaveCount(13);
  await expect(guitar.locator("[data-note]")).toHaveCount(54);
  await piano.getByRole("button", { name: "C4", exact: true }).focus();
  await page.keyboard.down("a");
  await expect(piano.locator('[data-note="60"]')).toHaveAttribute("aria-pressed", "true");
  await expect(guitar.locator('[data-active="true"]')).toHaveCount(0);
  await page.keyboard.up("a");
  await expect(piano.locator('[data-note="60"]')).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => (window as any).instrumentContexts.length)).toBe(0);
  await piano.locator("[data-instrument-sound]").click();
  expect(await page.evaluate(() => (window as any).instrumentContexts.length)).toBe(0);
  await piano.getByRole("button", { name: "C4", exact: true }).focus();
  await page.keyboard.down("a"); await page.keyboard.up("a");
  await expect.poll(() => page.evaluate(() => (window as any).instrumentContexts.length)).toBe(1);
  await piano.locator("[data-instrument-play]").click();
  await expect(piano.locator("[data-instrument-play]")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => Number(await piano.locator("progress").getAttribute("value"))).toBeGreaterThan(0);
  await piano.locator("[data-instrument-play]").click();
  const paused = await piano.locator("progress").getAttribute("value");
  await page.waitForTimeout(400);
  await expect(piano.locator("progress")).toHaveAttribute("value", paused!);
  await piano.locator("[data-instrument-stop]").click();
  await expect(piano.locator("progress")).toHaveAttribute("value", "0");
  await guitar.locator('[data-chord="C"]').click();
  expect(await guitar.locator('[data-active="true"]').count()).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("unsupported audio keeps visual notes usable with an explicit status", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true }); Object.defineProperty(window, "webkitAudioContext", { value: undefined, configurable: true }); });
  await page.goto("/en/expanded-demo");
  const piano = page.locator('[data-tree-node="instrument-piano"]');
  await piano.locator("[data-instrument-sound]").click();
  await piano.getByRole("button", { name: "C4", exact: true }).press("Enter");
  await expect(piano.getByRole("status")).toContainText("Audio is unavailable");
  await expect(piano.locator('[data-note="60"]')).toHaveAttribute("aria-pressed", "true");
});

test("held notes release after focus moves to a control or a modifier is pressed", async ({ page }) => {
  await page.goto("/en/expanded-demo");
  const piano = page.locator('[data-tree-node="instrument-piano"]');
  const note = piano.locator('[data-note="60"]');
  await note.focus(); await page.keyboard.down("a");
  await expect(note).toHaveAttribute("aria-pressed", "true");
  await piano.getByRole("slider", { name: "Volume" }).focus();
  await page.keyboard.up("a");
  await expect(note).toHaveAttribute("aria-pressed", "false");
  await note.focus(); await page.keyboard.down("a");
  await page.keyboard.down("Control"); await page.keyboard.up("a");
  await expect(note).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.up("Control");
});

test("charts use authored values, clocks show actual time, and sticky respects mobile overrides", async ({ page }) => {
  await page.goto("/en/expanded-demo");
  for (const kind of ["bar", "line", "donut"]) {
    const chart = page.locator(`[data-tree-node="chart-${kind}"]`);
    await expect(chart.getByText("Alpha", { exact: true })).toBeVisible();
    await expect(chart.locator("output").first()).toHaveText("25");
  }
  const clock = page.locator('[data-tree-node="live-clock"]');
  await expect(clock.locator("[data-clock-time]")).toHaveText(/\d{2}:\d{2}:\d{2}/);
  const iso = await clock.locator("time").getAttribute("datetime");
  expect(Math.abs(Date.now() - Date.parse(iso!))).toBeLessThan(5000);
  const card = page.locator('[data-tree-node="sticky-card-1"]');
  await expect(card).toHaveCSS("position", "sticky");
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 220));
  await expect.poll(async () => (await card.boundingBox())!.y).toBeGreaterThanOrEqual(23);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(card).toHaveCSS("position", "relative");
});
