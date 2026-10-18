import { test, expect, type Page } from "@playwright/test";

// Marketing pixels, site SEO and the custom-code safe mode, all set from the admin
// (settings.header.marketing / seo / safeMode). The trackers' own scripts can't load
// here (no internet); their queues (dataLayer, fbq.queue, ttq) show what was sent.
async function setMarketing(page: Page, on: boolean, safe = false) {
  await page.request.get(`http://127.0.0.1:4100/__test/marketing?on=${on ? 1 : 0}&safe=${safe ? 1 : 0}`);
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
}

/** Event names sent so far to GA4, Meta and TikTok. */
const sent = (page: Page) =>
  page.evaluate(() => {
    const w = window as any;
    const ga = (w.dataLayer ?? []).filter((a: any) => a?.[0] === "event").map((a: any) => a[1]);
    const meta = (w.fbq?.queue ?? []).filter((a: any) => a?.[0] === "track").map((a: any) => a[1]);
    const tiktok = (Array.isArray(w.ttq) ? w.ttq : []).filter((a: any) => a?.[0] === "track" || a?.[0] === "page").map((a: any) => (a[0] === "page" ? "page" : a[1]));
    return { ga, meta, tiktok };
  });

test.describe.serial("marketing settings", () => {
  // The real tracker scripts empty those queues once they load, so on a computer that is
  // online the result depended on how fast they arrived. They are answered with nothing.
  test.beforeEach(async ({ page }) => {
    await page.route(/googletagmanager\.com|connect\.facebook\.net|analytics\.tiktok\.com/, (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  });
  test.afterEach(async ({ page }) => { await setMarketing(page, false); });

  test("pixels load from the admin IDs and the shop events reach all three", async ({ page }) => {
    await setMarketing(page, true);
    await page.goto("/");
    await expect(page.locator('script[src*="googletagmanager.com/gtag/js?id=G-AB12CD34EF"]')).toHaveCount(1);
    await expect.poll(async () => (await sent(page)).ga).toContain("page_view");
    expect((await sent(page)).meta).toContain("PageView");
    expect((await sent(page)).tiktok).toContain("page");
    // Home title and description come from Settings → محركات البحث.
    await expect(page).toHaveTitle("استبرق — حجاب وفساتين محتشمة");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "وصف من الإدارة لمحركات البحث.");

    await page.goto("/p/rose-dress");
    await expect.poll(async () => (await sent(page)).ga).toContain("view_item");
    // A product's own search title is used as written.
    await expect(page).toHaveTitle("فستان الورد الناعم | استبرق");
    await page.locator(".rose-pdp-add").click();
    await expect.poll(async () => (await sent(page)).ga).toContain("add_to_cart");
    const s = await sent(page);
    expect(s.meta).toEqual(expect.arrayContaining(["ViewContent", "AddToCart"]));
    expect(s.tiktok).toEqual(expect.arrayContaining(["ViewContent", "AddToCart"]));
    const item = await page.evaluate(() => (window as any).dataLayer.find((a: any) => a?.[1] === "add_to_cart")?.[2]?.items?.[0]);
    expect(item).toMatchObject({ item_id: "rose-dress", item_name: "فستان الورد", quantity: 1 });
    expect(item.price).toBeGreaterThan(0);

    await page.goto("/cart");
    await page.getByLabel(/الاسم/).fill("سارة");
    await page.getByLabel(/رقم الهاتف/).fill("0599123456");
    await page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ }).click();
    await expect(page.getByRole("heading", { name: "شكراً لكِ، طلبكِ عندنا." })).toBeVisible();
    await expect.poll(async () => (await sent(page)).ga).toEqual(expect.arrayContaining(["begin_checkout", "generate_lead"]));
    expect((await sent(page)).meta).toEqual(expect.arrayContaining(["InitiateCheckout", "Lead"]));
    const lead = await page.evaluate(() => (window as any).dataLayer.find((a: any) => a?.[1] === "generate_lead")?.[2]);
    expect(lead.transaction_id).toBe("ORD-1042");
    expect(lead.value).toBeGreaterThan(0);
  });

  test("nothing is loaded when no ID is set", async ({ page }) => {
    await setMarketing(page, false);
    await page.goto("/");
    await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-color-selection-ready", "true");
    await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
    expect(await page.evaluate(() => typeof (window as any).fbq)).toBe("undefined");
  });

  test("safe mode keeps custom CSS, scripts and pixels off without deleting them", async ({ page }) => {
    await setMarketing(page, true, true);
    await page.goto("/");
    await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-color-selection-ready", "true");
    await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue("--estabrek-custom-css").trim())).toBe("");
    await setMarketing(page, true, false);
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).getPropertyValue("--estabrek-custom-css").trim())).toBe("1");
  });
});
