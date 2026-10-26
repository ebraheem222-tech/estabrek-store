import { test, expect, type Page } from "@playwright/test";
import { deviceKind, osKind, pageKind } from "../src/lib/rum";

// Real shoppers' speed (admin → مراقبة السرعة والأولوية → تجربة الزباين): one small
// report per page, when it's left. Only the kind of page, device and system, and
// the numbers: no address, no browser string, no cookies.

const MOCK = "http://127.0.0.1:4100";

async function usePerformance(page: Page, performance: unknown | null) {
  if (performance) await page.request.post(`${MOCK}/__test/performance`, { data: performance });
  else await page.request.get(`${MOCK}/__test/performance?off=1`);
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
}

const reports = async (page: Page) => (await (await page.request.get(`${MOCK}/__test/rum`)).json()) as Array<Record<string, unknown> & { r: Array<Record<string, unknown>> }>;

test.describe("Shoppers' speed: describing a visit", () => {
  test("a page is only its kind", () => {
    expect(pageKind("/")).toBe("home");
    expect(pageKind("/p/rose-dress")).toBe("product");
    expect(pageKind("/c/hijabs/")).toBe("category");
    expect(pageKind("/shop?sort=new")).toBe("shop");
    expect(pageKind("/checkout")).toBe("checkout");
    expect(pageKind("/order/ESB-1042")).toBe("order");
    expect(pageKind("/wishlist")).toBe("page");
    expect(pageKind("/eid-collection")).toBe("page"); // a page from the admin's page builder
    expect(pageKind("/a/b/c")).toBe("other");
  });

  test("the system and the kind of device", () => {
    expect(osKind("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/128 Mobile")).toBe("android");
    expect(osKind("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)")).toBe("ios");
    expect(osKind("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605", 5)).toBe("ios"); // an iPad asking for the desktop site
    expect(osKind("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605", 0)).toBe("mac");
    expect(osKind("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("windows");
    expect(osKind("Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)")).toBe("linux");
    expect(osKind("curl/8")).toBe("other");
    expect(deviceKind(false, 390)).toBe("desktop");
    expect(deviceKind(true, 390)).toBe("phone");
    expect(deviceKind(true, 820)).toBe("tablet");
  });
});

test.describe("Shoppers' speed: the report", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.get(`${MOCK}/__test/rum?reset=1`);
  });
  test.afterEach(async ({ page }) => {
    await usePerformance(page, null);
  });

  test("a page reports when it's left: kinds and numbers only, no cookies, as a simple text request", async ({ page }) => {
    await usePerformance(page, null);
    await page.goto("/p/rose-dress");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);
    await page.goto("about:blank");
    await expect.poll(async () => (await reports(page)).length, { timeout: 15_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(1000);
    const all = await reports(page);
    const keys = all.flatMap((s) => Object.keys((s.r[0] as { m: object }).m));
    expect(keys).toEqual([...new Set(keys)]); // each number once
    expect(all.length).toBeLessThanOrEqual(2);
    const sent = all[0];
    expect(sent.type).toMatch(/^text\/plain/);
    expect(sent.cookie).toBe("");
    expect(Object.keys(sent).sort()).toEqual(["cookie", "r", "type"]);
    expect(sent.r).toHaveLength(1);
    const record = sent.r[0] as { page: string; device: string; os: string; m: Record<string, number> };
    expect(Object.keys(record).sort()).toEqual(["device", "m", "os", "page"]);
    expect(record.page).toBe("product");
    expect(record.device).toBe("desktop");
    expect(["windows", "mac", "linux"]).toContain(record.os);
    expect(record.m.ttfb).toBeGreaterThanOrEqual(0);
    expect(record.m.fcp).toBeGreaterThan(0);
    for (const v of Object.values(record.m)) expect(Number.isFinite(v)).toBe(true);
    expect(JSON.stringify(sent)).not.toContain("rose-dress");
  });

  test("moving to another page inside the shop: the last page reports, the new one starts", async ({ page }) => {
    await usePerformance(page, null);
    await page.goto("/about");
    await page.waitForLoadState("load");
    await page.locator('header a[href="/shop"]').first().click();
    await page.waitForURL(/\/shop$/);
    await expect.poll(async () => (await reports(page)).map((s) => s.r[0].page), { timeout: 15_000 }).toEqual(["page"]);
    await page.waitForTimeout(800);
    await page.goto("about:blank");
    // A page's last numbers can come in two small reports (web-vitals finishes some only
    // as the page closes); what matters is the order and that nothing is counted twice.
    await expect
      .poll(async () => [...new Set((await reports(page)).map((s) => s.r[0].page))], { timeout: 15_000 })
      .toEqual(["page", "shop"]);
    await page.waitForTimeout(1500);
    const seen = new Map<string, string[]>();
    for (const s of await reports(page)) {
      const r = s.r[0] as { page: string; m: Record<string, number> };
      seen.set(r.page, [...(seen.get(r.page) ?? []), ...Object.keys(r.m)]);
    }
    for (const [kind, keys] of seen) expect(keys, kind).toEqual([...new Set(keys)]);
    expect(seen.get("page")).toEqual(expect.arrayContaining(["ttfb", "fcp"]));
  });

  test("the admin's share: 0% sends nothing", async ({ page }) => {
    await usePerformance(page, { rumPercent: 0 });
    await page.goto("/p/rose-dress");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);
    await page.goto("about:blank");
    await page.waitForTimeout(2500);
    expect(await reports(page)).toEqual([]);
  });

  test("browsers asking not to be tracked send nothing", async ({ page }) => {
    await usePerformance(page, null);
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true }));
    await page.goto("/p/rose-dress");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);
    await page.goto("about:blank");
    await page.waitForTimeout(2500);
    expect(await reports(page)).toEqual([]);
  });
});
