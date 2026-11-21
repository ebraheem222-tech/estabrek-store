import { expect, test, type Page } from "@playwright/test";

// In the editor: a ready ring that turns with the scroll from the Add panel, and the page's cursor.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const draft = (page: Page) => page.evaluate(() => (window as any).__canvasHarness.getDraft().tree);

test("a ready ring from the Add panel turns in the preview, and the page takes a cursor", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  await page.getByRole("tab", { name: "+ Add" }).click();
  await page.locator('[data-testid="studio-add-item"][data-kind="ready-orbit"]').click();
  await expect.poll(async () => JSON.stringify((await draft(page)).root.children)).toContain('"orbit"');
  const ring = ((await draft(page)).root.children as any[]).flatMap((s) => s.children ?? []).find((n) => n.motion?.scroll?.kind === "orbit");
  await ready(page);
  const shown = frame(page).locator(`[data-tree-node="${ring.id}"]`);
  await expect(shown).toHaveAttribute("data-pt-orbit", "circle");
  await expect(shown.locator(":scope > [data-tree-node]")).toHaveCount(6);
  // Its things are placed around the ring, each somewhere else.
  const spots = await shown.locator(":scope > [data-tree-node]").evaluateAll((els) => els.map((e) => (e as HTMLElement).style.translate));
  expect(new Set(spots).size).toBe(6);

  // The page's cursor, from the page's own settings.
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  const root = (await draft(page)).root.id;
  await page.locator(`[data-testid="studio-layer"][data-node="${root}"]`).click();
  await page.locator('[data-testid="studio-page-cursor"] [data-cursor-kind="ring"]').click();
  await expect.poll(async () => (await draft(page)).root.props.cursor).toEqual({ kind: "ring" });
});

test("a held ring is measured again when the page changes, not all the time", async ({ page }) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  await page.getByRole("tab", { name: "+ Add" }).click();
  await page.locator('[data-testid="studio-add-item"][data-kind="ready-orbit"]').click();
  await ready(page);
  const ring = frame(page).locator("[data-pt-orbit]").first();
  await expect(ring).toBeVisible();
  // Held by GSAP: it sits in a holder of its own (the pin's spacer) while the page scrolls past.
  await expect(frame(page).locator(".pin-spacer")).toHaveCount(1);

  // How many times the ring is taken out of its holder and put back (a new measure of the page) in a while.
  const takenOutIn = (ms: number) => ring.evaluate((_, wait) => new Promise<number>((resolve) => {
    let taken = 0;
    const seen = new MutationObserver((list) => {
      for (const m of list) for (const n of m.removedNodes) if (n instanceof HTMLElement && n.classList.contains("pin-spacer")) taken++;
    });
    seen.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => { seen.disconnect(); resolve(taken); }, wait);
  }), ms);

  // The page comes to rest: measuring it once doesn't ask for the next measure (it went round about three
  // times a second for ever, each measure's own moving of the ring taken for a change of the page).
  await expect(async () => expect(await takenOutIn(2500)).toBe(0)).toPass({ timeout: 45000 });

  // The page grows above the ring with nothing added or removed (as when a picture loads): measured again,
  // once, and the ring is held from its new place.
  const top = () => frame(page).locator(".pin-spacer").evaluate((el) => Math.round(window.scrollY + el.getBoundingClientRect().top));
  const before = await top();
  const counting = takenOutIn(4000);
  await ring.evaluate(() => {
    const first = document.querySelector<HTMLElement>("[data-page-tree-root] .pt-section, .pt-section")!;
    first.style.marginTop = "320px";
  });
  expect(await counting).toBeGreaterThanOrEqual(1);
  await expect(async () => expect(await takenOutIn(2500)).toBe(0)).toPass({ timeout: 45000 });
  const after = await top();
  expect(after - before).toBe(320);
  // Its turn starts from the new place: still at rest just before it (from the old place, 320px earlier, it
  // would be a quarter of the way round by here), turning once the page has scrolled past it.
  const spotAt = async (y: number) => {
    await ring.evaluate((_, to) => window.scrollTo({ top: to, behavior: "instant" as ScrollBehavior }), y);
    await page.waitForTimeout(1500);
    return ring.locator(":scope > [data-tree-node]").first().evaluate((el) => (el as HTMLElement).style.translate);
  };
  const rest = await spotAt(0);
  expect(await spotAt(after - 40)).toBe(rest);
  expect(await spotAt(after + 600)).not.toBe(rest);
});
