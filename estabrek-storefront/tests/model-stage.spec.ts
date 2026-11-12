import { expect, test, type Page } from "@playwright/test";
import { model3dMoves, model3dOf } from "../src/pageTree/model3d";

// A 3D model's stage (pageTree/model3d.ts, Model3dCanvas, css.ts): a stand or a ring of light under it, something
// drawn behind it in plain CSS, a way in the first time it's seen, sparkles around it, turning back after it's
// turned by hand. Unknown values fall back; nothing moves for "reduce motion".

test("the stage's settings are read again: known kinds only, colours and counts in range", () => {
  const s = model3dOf({ model: "watch", floor: "pedestal", backdrop: { kind: "spot", color: "#ffe9a8" }, intro: "drop", sparkles: { count: 40 }, drag: true, back: true })!;
  expect(s.floor).toBe("pedestal");
  expect(s.backdrop).toEqual({ kind: "spot", color: "#ffe9a8" });
  expect(s.intro).toBe("drop");
  expect(s.sparkles).toEqual({ count: 40, color: "accent", size: 2 });
  expect(s.back).toBe(true);
  // Sparkles move, so the model is drawn while it's seen.
  expect(model3dMoves(s)).toBe(true);
  const plain = model3dOf({ model: "watch", floor: "lava", backdrop: { kind: "fireworks" }, intro: "explode", sparkles: { count: 5000 }, back: true })!;
  expect(plain).toMatchObject({ floor: "shadow", backdrop: null, intro: null, sparkles: null, back: false });
  // The backdrop's colour defaults to the store's light colour; turning back needs turning by hand, and no link.
  expect(model3dOf({ model: "watch", backdrop: { kind: "glow" } })!.backdrop).toEqual({ kind: "glow", color: "accent-soft" });
  expect(model3dOf({ model: "watch", drag: true, back: true, href: "/shop" })!.back).toBe(false);
});

const stage = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"] .pt-model3d-stage`);
const behind = (page: Page, id: string) => stage(page, id).evaluate((el) => getComputedStyle(el, "::before").backgroundImage);

test("on the page: each stage is drawn behind its model, which fades in when ready", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 700, height: 1420 });
  await page.goto("/en/stage-demo");
  for (const [id, kind] of [["m-stand", "glow"], ["m-halo", "sunrise"], ["m-spot", "spot"], ["m-rings", "rings"]] as const) {
    await expect(stage(page, id)).toHaveAttribute("data-backdrop", kind);
    await expect(stage(page, id)).toHaveAttribute("data-model-state", "ready", { timeout: 30000 });
    expect(await behind(page, id)).toMatch(/gradient/);
    // Its canvas is shown once ready (it starts see-through and fades in).
    await expect.poll(() => stage(page, id).locator("canvas").evaluate((c) => getComputedStyle(c.parentElement!).opacity), { timeout: 10000 }).toBe("1");
  }
  // The backdrop's own colour, and the store's light colour when none is set.
  expect(await stage(page, "m-spot").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--pt-3d-bd"))).toBe("#ffe9a8");
  expect(await stage(page, "m-stand").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--pt-3d-bd"))).toBe("var(--accent-soft)");
});

test("turned by hand, the model's canvas keeps drawing and nothing breaks; reduce motion keeps the stage", async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 700, height: 1420 });
  await page.goto("/en/stage-demo");
  await expect(stage(page, "m-rings")).toHaveAttribute("data-model-state", "ready", { timeout: 30000 });
  const box = (await stage(page, "m-rings").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(box.x + box.width / 2 + i * 20, box.y + box.height / 2);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  await expect(stage(page, "m-rings")).toHaveAttribute("data-model-state", "ready");
  expect(await behind(page, "m-rings")).toMatch(/gradient/);
  expect(errors).toEqual([]);
});
