import { test, expect } from "@playwright/test";

function contrast(a: string, b: string) {
  const luminance = (color: string) => { const rgb = color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4); return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722; };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}

test("native CMS templates remain server-rendered when their libraries are split", async ({ browser, page, request }) => {
  // Compile the additional fixture route before testing its static HTML.
  await request.get("/native-templates");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto("http://127.0.0.1:3000/native-templates");
  for (const title of ["حملة بالقالب المنشور", "مزايا القالب المنشور", "خيارات القالب المنشور", "نموذج القالب المنشور", "صور القالب المنشور"]) {
    await expect(staticPage.getByText(title, { exact: true })).toBeVisible();
  }
  await expect(staticPage.getByRole("button", { name: "وجهة الحملة", exact: true })).toBeVisible();
  await context.close();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/native-templates");
  await expect(page.getByText("نموذج القالب المنشور", { exact: true })).toBeVisible();
  await page.locator("#native-contact input[type=email]").fill("preview@example.test");
  await expect(page.locator("#native-contact input[type=email]")).toHaveValue("preview@example.test");
  expect(errors).toEqual([]);
});

test("small-screen navigation buttons stay inside the viewport in both languages", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  for (const language of ["ar", "en"]) {
    if (language === "en") await page.getByRole("button", { name: "English", exact: true }).click();
    const bounds = await page.locator(".atelier-actions button, .atelier-actions a:visible").evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().width).map(el => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })));
    for (const box of bounds) { expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(360); }
  }
});

test("native home sections retain palette and motion controls from CMS", async ({ page }) => {
  await page.goto("/");
  const section = page.locator('[data-cms-section="rich"]');
  await expect(section).toHaveAttribute("data-rose-palette", "berry");
  await expect(section).toHaveAttribute("data-rose-intensity", "subtle");
  await expect(page.locator("#pink-campaign")).toHaveCount(1);
});

test("later campaigns preserve both authored destinations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "اكتشفي الحجاب", exact: true })).toHaveAttribute("href", "/shop?categoryId=hijabs");
  await expect(page.getByRole("link", { name: "اسألي عن الحملة", exact: true })).toHaveAttribute("href", "/contact");
});

test("published primary navigation survives disabled CMS navigation and manual color selection", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator(".atelier-desktop-nav");
  await expect(nav.getByRole("link", { name: "القائمة المنشورة", exact: true })).toHaveAttribute("href", "/shop");
  await page.locator(".design-study").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Lilac", exact: true }).click();
  await nav.getByRole("link", { name: "القائمة المنشورة", exact: true }).hover();
  const item = nav.getByRole("link", { name: "العرض الجديد", exact: true });
  await expect(item).toBeVisible();
  const colors = await item.evaluate(el => [getComputedStyle(el).color, getComputedStyle(el.parentElement!).backgroundColor]);
  expect(contrast(colors[0], colors[1])).toBeGreaterThanOrEqual(4.5);
});

test("authored campaign headings keep readable contrast on the stable home surface", async ({ page }) => {
  await page.goto("/");
  const campaign = page.locator('[data-cms-section="second-campaign"]');
  await campaign.scrollIntoViewIfNeeded();
  const colors = await campaign.locator("h2").evaluate(el => [getComputedStyle(el).color, getComputedStyle(document.querySelector(".cinematic-shell")!).backgroundColor]);
  expect(contrast(colors[0],colors[1])).toBeGreaterThanOrEqual(4.5);
});

test("native rich text remains readable on the neutral contact surface", async ({ page }) => {
  await page.goto("/contact");
  const colors = await page.locator("#our-message .prose p").evaluate(el => [getComputedStyle(el).color, getComputedStyle(el.closest("section")!).backgroundColor]);
  expect(contrast(colors[0],colors[1])).toBeGreaterThanOrEqual(4.5);
});

test("home defers its heavy canvas until the separate fabric section is approached", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".rose-opening")).toHaveAttribute("data-motion", "true");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.locator(".design-study").scrollIntoViewIfNeeded();
  await expect(page.locator(".model-stage")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("canvas")).toHaveCount(1);
});

test("English shop translates shopping controls while preserving authored product titles", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".rose-shop-categories").getByRole("button", { name: "All pieces", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Sort by", exact: true })).toBeVisible();
  await expect(page.locator(".rose-product-tile").first().getByRole("button", { name: "Add to bag", exact: true })).toBeVisible();
  await expect(page.locator(".filters-container:visible").getByPlaceholder("Search products…")).toBeVisible();
  await expect(page.locator(".rose-product-tile h3").first()).toContainText("فستان الورد");
});

async function sceneScroll(page: any, progress: number) {
  await page.evaluate((p: number) => {
    const el = document.querySelector<HTMLElement>(".rose-opening")!;
    const sticky = el.querySelector<HTMLElement>(".rose-opening-sticky")!;
    const top = parseFloat(getComputedStyle(sticky).top) || 0;
    window.scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight + top) * p - top);
  }, progress);
}

test("about palette follows visible sections, reverses and resets on navigation", async ({ page }) => {
  await page.goto("/about");
  const shell = page.locator(".cinematic-shell");
  const color = () => shell.evaluate(el => getComputedStyle(el).backgroundColor);
  await expect.poll(color).toBe("rgb(247, 220, 232)");
  await page.locator(".rose-about-story").scrollIntoViewIfNeeded();
  await expect.poll(color).not.toBe("rgb(247, 220, 232)");
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(color).toBe("rgb(247, 220, 232)");
  await page.goto("/shop");
  await expect.poll(color).toBe("rgb(255, 248, 244)");
});

test("opening shrinks into the collection and leaves the fabric in its own section", async ({ page }) => {
  await page.goto("/");
  const opening = page.locator(".rose-opening");
  await expect(opening).toHaveAttribute("data-motion", "true");
  await expect(page.locator(".opening-wordmark")).toBeVisible();
  await expect(opening.locator(".design-study")).toHaveCount(0);
  await sceneScroll(page, 0.98);
  await expect(page.locator(".hero-brand-card")).toBeVisible();
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => opening.getAttribute("data-progress")).toBe("0.000");
  await page.locator(".design-study").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Pearl", exact: true }).click();
  await expect(page.locator(".model-stage")).toHaveAttribute("data-color", "Pearl");
  expect(await page.locator("canvas").count()).toBeLessThanOrEqual(1);
});

test("scrolling plays the campaign clip forwards and backwards, with no pause button", async ({ page }) => {
  await page.goto("/");
  const section = page.locator(".rose-video");
  await expect(section).toHaveAttribute("data-motion", "true");
  await expect(section.locator("video")).toHaveAttribute("poster", "/editorial/rose-campaign-poster.webp");
  await expect(page.getByRole("button", { name: "إيقاف الفيديو", exact: true })).toHaveCount(0);
  const scrollTo = (f: number) => section.evaluate((el, f) => {
    const top = el.getBoundingClientRect().top + scrollY;
    window.scrollTo(0, top + (el.offsetHeight - innerHeight) * f);
  }, f);
  await scrollTo(0);
  await expect(section).toHaveAttribute("data-playback", "scrubbing");
  await scrollTo(0.7);
  await expect.poll(() => section.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(4);
  expect(await section.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await scrollTo(0.05);
  await expect.poll(() => section.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeLessThan(2);
});

test("with reduced motion the campaign clip is a poster with play and pause", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.locator(".rose-video");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute("data-motion", "false");
  await expect(section).toHaveAttribute("data-playback", "paused");
  await page.getByRole("button", { name: "تشغيل الفيديو", exact: true }).click();
  await expect(section).toHaveAttribute("data-playback", "playing");
  await page.getByRole("button", { name: "إيقاف الفيديو", exact: true }).click();
  await expect(section).toHaveAttribute("data-playback", "paused");
});

test("campaign video failure retains the poster, message and retry control", async ({ page }) => {
  await page.route("**/editorial/rose-campaign*.{mp4,webm}", route => route.abort());
  await page.goto("/");
  await page.locator(".rose-video").scrollIntoViewIfNeeded();
  await expect(page.locator(".rose-video")).toHaveAttribute("data-playback", "error");
  await expect(page.locator(".video-error-poster")).toBeVisible();
  await expect(page.locator(".rose-video").getByRole("status")).toContainText("تعذّر تحميل الفيديو");
  const retry = page.getByRole("button", { name: "إعادة تحميل الفيديو", exact: true });
  await expect(retry).toBeEnabled();
  await page.unroute("**/editorial/rose-campaign*.{mp4,webm}");
  await retry.click();
  await expect(page.locator(".video-error-poster")).toHaveCount(0);
});

test("shop color, size, price and availability filters keep their URL and product state", async ({ page }) => {
  await page.goto("/shop");
  const filters = page.locator(".filters-container:visible");
  await filters.getByRole("button", { name: /Lilac/ }).click();
  await expect(page).toHaveURL(/colors=Lilac/);
  await expect(page.locator(".rose-product-tile")).toHaveCount(1);
  await filters.getByRole("button", { name: /One size/ }).click();
  await expect(page).toHaveURL(/sizeIds=one/);
  await filters.getByPlaceholder("الحد الأدنى").fill("180");
  await expect(page).toHaveURL(/minPrice=180/);
  await filters.getByPlaceholder("الحد الأقصى").fill("200");
  await expect(page).toHaveURL(/maxPrice=200/);
  await filters.getByRole("button", { name: "المتوفر فقط", exact: true }).click();
  await expect(page).toHaveURL(/inStock=1/);
  await expect(page.locator(".rose-product-tile h3")).toContainText("شال وردي");
  await page.reload();
  await expect(page.locator(".rose-product-tile")).toHaveCount(1);
  await expect(filters.getByPlaceholder("الحد الأقصى")).toHaveValue("200");
});

test("a delayed load-more response cannot append products from the previous filters", async ({ page }) => {
  await page.goto("/shop");
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/v1/catalog/products?**", async route => {
    if (new URL(route.request().url()).searchParams.get("page") === "2") {
      const response = await route.fetch();
      await held;
      await route.fulfill({ response }).catch(() => {});
    } else await route.continue();
  });
  const request = page.waitForRequest(req => req.url().includes("/catalog/products?") && new URL(req.url()).searchParams.get("page") === "2");
  await page.getByRole("button", { name: "تحميل المزيد", exact: true }).click();
  await request;
  await page.locator(".rose-shop-categories").getByRole("button", { name: "فساتين", exact: true }).click();
  await expect(page.locator(".rose-product-tile")).toHaveCount(1);
  release();
  await expect(page.locator(".rose-product-tile h3")).toContainText("فستان الورد");
  await expect(page.locator(".rose-product-tile")).toHaveCount(1);
});

test("rose shop preserves category URLs, sort, load-more, and browser history", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.locator(".rose-shop-intro")).toBeVisible();
  await expect(page.locator(".rose-product-tile")).toHaveCount(2);
  await page.getByRole("button", { name: "تحميل المزيد", exact: true }).click();
  await expect(page.locator(".rose-product-tile")).toHaveCount(3);
  await page.locator(".rose-shop-categories").getByRole("button", { name: "حجاب", exact: true }).click();
  await expect(page).toHaveURL(/categoryId=hijabs/);
  await expect(page.locator(".rose-product-tile")).toHaveCount(2);
  await page.locator(".rose-shop-toolbar select").selectOption("price_asc");
  await expect(page).toHaveURL(/sort=price_asc/);
  await expect(page.locator(".rose-product-tile h3").first()).toContainText("شال وردي");
  await page.goBack();
  await expect(page.locator(".rose-shop-toolbar select")).toHaveValue("latest");
  await page.goBack();
  await expect(page).not.toHaveURL(/categoryId=/);
  await expect(page.locator(".rose-product-tile")).toHaveCount(2);
});

test("rose shop shows empty results and recovers from a catalog request error", async ({ page }) => {
  await page.goto("/shop?q=does-not-exist");
  await expect(page.getByText("لا توجد منتجات مطابقة")).toBeVisible();
  await page.goto("/shop");
  let fails = true;
  await page.route("**/v1/catalog/products?**", route => fails ? route.fulfill({ status: 503, json: { message: "Unavailable" } }) : route.continue());
  await page.locator(".rose-shop-toolbar select").selectOption("price_desc");
  await expect(page.locator(".rose-catalog-error")).toContainText("تعذّر تحميل المنتجات");
  fails = false;
  await page.getByRole("button", { name: "إعادة المحاولة" }).click();
  await expect(page.locator(".rose-catalog-error")).toHaveCount(0);
  await expect(page.locator(".rose-product-tile h3").first()).toContainText("فستان الورد");
});

test("contact keeps authored content and custom fields and submits to the existing service", async ({ page }) => {
  let payload: any;
  let fails = true;
  await page.route("**/v1/ugc/contact", async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: fails ? 503 : 200, json: fails ? { message: "حاولي مرة أخرى" } : { ok: true } });
  });
  await page.goto("/contact");
  await expect(page.locator(".rose-contact")).toBeVisible();
  await expect(page.locator("#our-message")).toContainText("رسالة من لوحة الإدارة");
  await expect(page.getByText("تفاصيل التواصل من CMS")).toBeVisible();
  await page.getByLabel("الاسم", { exact: true }).fill("Test customer");
  await page.getByLabel("البريد الإلكتروني", { exact: true }).fill("test@example.test");
  await page.getByLabel("رقم الطلب", { exact: true }).fill("ORDER-42");
  await page.getByLabel("الرسالة", { exact: true }).fill("Fixture-only contact message");
  await page.getByRole("button", { name: "أرسلي الرسالة" }).click();
  await expect(page.locator(".rose-contact").getByRole("alert")).toContainText("حاولي مرة أخرى");
  await expect(page.getByLabel("رقم الطلب", { exact: true })).toHaveValue("ORDER-42");
  fails = false;
  await page.getByRole("button", { name: "أرسلي الرسالة" }).click();
  await expect(page.locator(".rose-contact").getByRole("status")).toContainText("وصلت رسالتكِ");
  expect(payload.fields.order_ref).toBe("ORDER-42");
  expect(payload.name).toBe("Test customer");
});

test("about tells the store story without invented statistics and links to real pages", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator(".rose-about")).toBeVisible();
  await expect(page.getByRole("heading", { name: "أناقة تشبهكِ." })).toBeVisible();
  await expect(page.locator(".rose-about")).not.toContainText("10,000");
  await expect(page.locator(".rose-about")).not.toContainText("500+");
  await expect(page.locator('.rose-about a[href="/shop"]').first()).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".rose-about")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "Modesty, beautifully yours." })).toBeVisible();
});

test("mobile shop filters trap focus, close with Escape and restore the trigger", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/shop");
  const trigger = page.locator(".mobile-filter-toggle:visible");
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Close filters" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("category pages use the rose shop design and keep their own category", async ({ page }) => {
  await page.goto("/c/dresses");
  await expect(page.locator(".rose-category-intro h1")).toContainText("فساتين");
  await expect(page.locator(".rose-crumbs")).toContainText("المتجر");
  await expect(page.locator(".rose-product-tile").first()).toBeVisible();
  await expect(page.locator(".rose-product-tile")).toHaveCount(1);
  await expect(page).toHaveURL(/\/c\/dresses$/);
});
