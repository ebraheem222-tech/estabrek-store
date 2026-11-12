import { test, expect, type Page } from "@playwright/test";

// The home page's sections in numbers (lib/homeStats.ts) and the home order test (A/B kind "homeOrder").
const MOCK = "http://127.0.0.1:4100";

test.describe.configure({ mode: "serial" });

async function useTests(page: Page, tests: unknown[]) {
  await page.request.post(`${MOCK}/__test/ab`, { data: tests });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
}
const stats = async (page: Page) => (await (await page.request.get(`${MOCK}/__test/home-stats`)).json()) as Array<{ s: string; k: string }>;
const keys = (page: Page) => page.locator(".rose-home > [data-home-key]").evaluateAll((els) => els.map((el) => el.getAttribute("data-home-key")!));
/** The keys in the order they show on screen (top to bottom). */
const shownOrder = (page: Page) =>
  page.locator(".rose-home > [data-home-key]").evaluateAll((els) =>
    els.map((el) => ({ k: el.getAttribute("data-home-key")!, y: el.getBoundingClientRect().top + scrollY })).sort((a, b) => a.y - b.y).map((x) => x.k),
  );

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ baseURL: "http://127.0.0.1:3000" });
  await useTests(page, []);
  await page.close();
});

test("each section says once a visit: seen, tapped, and the bag add that followed", async ({ page }) => {
  await useTests(page, []);
  await page.request.delete(`${MOCK}/__test/home-stats`);
  await page.goto("/");
  const all = await keys(page);
  expect(all.length).toBeGreaterThan(3);
  expect(all.every((k) => /^(s:[A-Za-z0-9_-]+|b:[a-z]+)$/.test(k))).toBe(true);
  // Scrolled through slowly: the sections are seen.
  for (let y = 0; y < 6; y++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(1300); }
  // A tap on a product in a section, then the piece into the bag.
  const link = page.locator('.rose-home > [data-home-key] a[href^="/p/"]').first();
  const from = await link.evaluate((a) => a.closest("[data-home-key]")!.getAttribute("data-home-key"));
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.waitForURL(/\/p\//);
  await page.locator(".rose-pdp-add").click();
  await page.waitForTimeout(3600);
  const got = await stats(page);
  expect(got.filter((e) => e.k === "seen").length).toBeGreaterThan(1);
  expect(got).toContainEqual({ s: from, k: "tap" });
  expect(got).toContainEqual({ s: from, k: "bag" });
  // Once a visit: no section seen twice.
  const seen = got.filter((e) => e.k === "seen").map((e) => e.s);
  expect(new Set(seen).size).toBe(seen.length);
});

test("side B shows the sections in the order tried; side A as published", async ({ page }) => {
  await useTests(page, []);
  await page.goto("/");
  const published = (await keys(page)).filter((k) => k.startsWith("s:"));
  expect(published.length).toBeGreaterThan(2);
  // B: the opening first, the rest of the page's sections the other way round.
  const tried = [published[0], ...published.slice(1).reverse()];
  await useTests(page, [{ id: "t-order", kind: "homeOrder", field: null, a: "published", b: tried, split: 100 }]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-home-order", "B");
  expect((await shownOrder(page)).filter((k) => k.startsWith("s:"))).toEqual(tried);
  // The visit is counted for side B.
  await expect.poll(async () => (await (await page.request.get(`${MOCK}/__test/ab-events`)).json()).flatMap((b: { e: unknown[] }) => b.e)).toContainEqual({ x: "t-order", v: "B", k: "visit" });

  // Side A: as published, nothing moved.
  await useTests(page, [{ id: "t-order-a", kind: "homeOrder", field: null, a: "published", b: tried, split: 0 }]);
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-home-order", /.*/);
  expect((await shownOrder(page)).filter((k) => k.startsWith("s:"))).toEqual(published);
});
