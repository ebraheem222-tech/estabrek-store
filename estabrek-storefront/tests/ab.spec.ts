import { test, expect, type Page } from "@playwright/test";
import { abHeadScript, abTests } from "../src/lib/ab";

// A/B tests (admin → تجارب A/B): this visit's side, no flash of the other
// opening, and what's counted (once per visit, no cookies).

const MOCK = "http://127.0.0.1:4100";
const hero = (split: number) => [{ id: "t-hero", kind: "heroOpening", field: null, a: "film", b: "photo", split }];

async function useTests(page: Page, tests: unknown[]) {
  await page.request.post(`${MOCK}/__test/ab`, { data: tests });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
}

async function useFilm(page: Page, on: boolean) {
  await page.request.get(`${MOCK}/__test/hero-film?on=${on ? 1 : 0}`);
  await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
}

const events = async (page: Page) => (await (await page.request.get(`${MOCK}/__test/ab-events`)).json()) as Array<{ type: string; cookie: string; e: Array<Record<string, unknown>> }>;
const flat = async (page: Page) => (await events(page)).flatMap((b) => b.e);

test.describe("A/B tests: the pieces", () => {
  test("only well-formed tests; the head script is safe to inline", () => {
    expect(abTests([{ id: "a", kind: "heroOpening", a: "film", b: "photo", split: 50 }, { id: "b", kind: "price", split: 50 }, null, "x"])).toHaveLength(1);
    expect(abTests("nope")).toEqual([]);
    const s = abHeadScript([{ id: "</script><script>", kind: "heroOpening", field: null, a: "film", b: "photo", split: 50 }]);
    expect(s).not.toContain("</script>");
    expect(s.startsWith("window.__estabrekAb=")).toBe(true);
  });
});

test.describe("A/B tests: the home page's opening", () => {
  test.afterEach(async ({ page }) => {
    await useTests(page, []);
    await useFilm(page, false);
  });

  test("this visit gets the photo while the page is set to the film, and the visit is counted", async ({ page }) => {
    await useFilm(page, true);
    await useTests(page, hero(100));
    await page.goto("/");
    await expect(page.locator(".rose-opening")).toBeVisible();
    await expect(page.locator(".rose-film")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-ab-hero"))).toBe(false);
    expect(await page.evaluate(() => sessionStorage.getItem("estabrek_ab"))).toBe('{"t-hero":"B"}');
    await expect.poll(() => flat(page), { timeout: 15_000 }).toEqual([{ x: "t-hero", v: "B", k: "visit" }]);
    const [sent] = await events(page);
    expect(sent.type).toMatch(/^text\/plain/);
    expect(sent.cookie).toBe("");
    // Again in the same visit: the same side, not counted twice.
    await page.reload();
    await expect(page.locator(".rose-opening")).toBeVisible();
    await page.waitForTimeout(1500);
    expect(await flat(page)).toHaveLength(1);
  });

  test("the other side keeps the film", async ({ page }) => {
    await useFilm(page, true);
    await useTests(page, hero(0));
    await page.goto("/");
    await expect(page.locator(".rose-film")).toBeVisible();
    await expect(page.locator(".rose-opening")).toHaveCount(0);
    await expect.poll(() => flat(page), { timeout: 15_000 }).toEqual([{ x: "t-hero", v: "A", k: "visit" }]);
  });

  test("an order is counted for the test this visit saw, with its total", async ({ page }) => {
    await useTests(page, hero(100));
    await page.goto("/");
    await expect.poll(() => flat(page), { timeout: 15_000 }).toHaveLength(1);
    await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }])));
    await page.goto("/cart");
    await page.getByLabel(/الاسم/).fill("سارة");
    await page.getByLabel(/رقم الهاتف/).fill("0599123456");
    await page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ }).click();
    await expect(page.getByRole("heading", { name: "شكراً لكِ، طلبكِ عندنا." })).toBeVisible();
    await expect.poll(async () => (await flat(page)).find((e) => e.k === "order"), { timeout: 15_000 }).toMatchObject({ x: "t-hero", v: "B", k: "order", a: expect.any(Number) });
  });

  test("browsers asking not to be tracked see the shop as set and send nothing", async ({ page }) => {
    await useFilm(page, true);
    await useTests(page, hero(100));
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true }));
    await page.goto("/");
    await expect(page.locator(".rose-film")).toBeVisible();
    await page.waitForTimeout(2000);
    expect(await events(page)).toEqual([]);
  });
});

test.describe("A/B tests: a motion setting", () => {
  test.afterEach(async ({ page }) => {
    await useTests(page, []);
  });

  test("this visit's side of the setting is used, and the visit is counted", async ({ page }) => {
    await useTests(page, [{ id: "t-glass", kind: "motion", field: "phoneGlass", a: false, b: true, split: 100 }]);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-phone-glass", "");
    // The admin's own setting stays as it is in the page.
    expect(await page.evaluate(() => (window as unknown as { __estabrekMotion: { phoneGlass: boolean } }).__estabrekMotion.phoneGlass)).toBe(false);
    await expect.poll(() => flat(page), { timeout: 15_000 }).toEqual([{ x: "t-glass", v: "B", k: "visit" }]);
  });
});

