import { test, expect } from "@playwright/test";

async function showFabric(page: any) {
  const study = page.locator(".design-study");
  if (await study.getAttribute("data-embedded") === "true" && await study.getAttribute("data-reduced-motion") !== "true") {
    await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(".rose-opening")!;
      const top = parseFloat(getComputedStyle(el.querySelector(".rose-opening-sticky")!).top);
      scrollTo(0, scrollY + el.getBoundingClientRect().top - top + (el.clientHeight - innerHeight + top) * .35);
    });
  } else await study.scrollIntoViewIfNeeded();
}

test("opening image shrinks with scroll and returns to its close-up when scrolling back", async ({
  page,
}) => {
  await page.goto("/");
  const opening = page.locator(".rose-opening");
  await expect(opening).toHaveAttribute("data-motion", "true");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  const photo = page.locator(".hero-image-wrap");
  const start = await photo.boundingBox();
  await page.evaluate(() => {
    const scene = document.querySelector(".rose-opening")!;
    window.scrollTo({ behavior: "instant", top:
      scene.getBoundingClientRect().top +
        window.scrollY +
        scene.clientHeight -
        window.innerHeight -
        30,
    });
  });
  await expect
    .poll(async () => (await photo.boundingBox())!.width)
    .toBeLessThan(start!.width * 0.8);
  await expect(page.locator(".hero-brand-card")).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect
    .poll(async () => (await photo.boundingBox())!.width)
    .toBeGreaterThan(start!.width * 0.95);
  await page.setViewportSize({ width: 360, height: 640 });
  await expect
    .poll(async () => (await photo.boundingBox())!.width)
    .toBeLessThan(start!.width);
  const mobileStart = await photo.boundingBox();
  await page.evaluate(() => {
    const scene = document.querySelector(".rose-opening")!;
    window.scrollTo({ behavior: "instant", top:
      scene.getBoundingClientRect().top +
        window.scrollY +
        scene.clientHeight -
        window.innerHeight -
        30,
    });
  });
  await expect
    .poll(async () => (await photo.boundingBox())!.width)
    .toBeLessThan(mobileStart!.width * 0.8);
  const action = await page
    .locator(".hero-actions .atelier-button")
    .boundingBox();
  expect(action!.y + action!.height).toBeLessThanOrEqual(640);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

test("pink homepage reads published CMS content and switches to English", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /أناقة تشبهكِ.*بكل تفاصيلكِ/ }),
  ).toBeVisible();
  await expect(page.locator('a[href="/p/rose-dress"]')).toBeVisible();
  await expect(
    page.locator('a[href="/p/rose-dress"] .product-price'),
  ).toContainText("320.50");
  await expect(page.locator('a[href="/c/dresses"]').first()).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".cinematic-home")).toHaveAttribute("dir", "ltr");
  await expect(
    page.getByText("Made for every side of you", { exact: true }),
  ).toBeVisible();
});

test("mobile menu closes with Escape and the page stays within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "فتح القائمة" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "القائمة" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "القائمة" })).not.toBeVisible();
  await expect(trigger).toBeFocused();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("scroll drives the 3D story and model colors are keyboard accessible", async ({
  page,
}) => {
  await page.goto("/");
  const study = page.locator(".design-study");
  await showFabric(page);
  await expect(page.locator(".model-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByRole("button", { name: "Lilac" }).click();
  await expect(page.getByRole("button", { name: "Lilac" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Rotate right" }).click();
  await expect(page.locator(".model-stage")).toHaveAttribute(
    "data-rotation",
    "1",
  );
  await page.evaluate(() => {
    const el = document.querySelector(".design-study")!;
    window.scrollTo(
      0,
      window.scrollY +
        el.getBoundingClientRect().top +
        el.clientHeight -
        window.innerHeight -
        50,
    );
  });
  await expect(page.locator(".design-study")).toHaveAttribute(
    "data-chapter",
    "2",
  );
  const stickyTop = await page
    .locator(".design-study-sticky")
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(stickyTop).toBeGreaterThanOrEqual(0);
  expect(stickyTop).toBeLessThan(100);
});

test("shopping navigation keeps the new chrome and returns to the animated homepage", async ({
  page,
  request,
}) => {
  // Compile the destination before measuring navigation in the development server.
  await request.get("/shop");
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".rose-opening")).toHaveAttribute("data-motion", "true");
  await page
    .getByRole("link", { name: "تسوّقي المجموعة", exact: true })
    .click();
  await expect(page).toHaveURL(/\/shop/);
  await expect(
    page.locator(".cinematic-interior-shell .atelier-header"),
  ).toBeVisible();
  await expect(
    page.locator(".rose-shop-intro").getByRole("heading", { name: /^المتجر/ }),
  ).toBeVisible();
  await page
    .locator(".atelier-header")
    .getByRole("link", { name: "Estabrek home" })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: /أناقة تشبهكِ.*بكل تفاصيلكِ/ }),
  ).toBeVisible();
});

test("search submits a real query to the existing search route", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "البحث", exact: true }).click();
  await page.getByRole("searchbox").fill("rose hijab");
  await page.getByRole("button", { name: "ابحثي", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=rose\+hijab/);
});

test("published CMS section order, hidden sections, FAQ and native content are retained", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("وصف الحملة من لوحة الإدارة")).toBeVisible();
  await expect(page.locator("#pink-campaign")).toHaveAttribute(
    "aria-label",
    "حملة استبرق",
  );
  await expect(
    page.getByRole("link", { name: "قصتنا في الحملة", exact: true }),
  ).toHaveAttribute("href", "/about");
  await expect(page.getByText("عنوان مخفي")).toHaveCount(0);
  await expect(page.locator("[data-cms-section]")).toHaveCount(7);
  const ids = await page
    .locator("[data-cms-section]")
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-cms-section")),
    );
  expect(ids).toEqual(["hero", "second-campaign", "products", "collections", "faq", "cta", "rich"]);
  await page.getByText("كيف أختار المقاس؟").click();
  await expect(
    page.getByText("تفاصيل المقاسات متاحة في صفحة المنتج."),
  ).toBeVisible();
  await page.getByText("نص إضافي من CMS").scrollIntoViewIfNeeded();
  await expect(page.getByText("نص إضافي من CMS")).toBeVisible();
});

test("mobile Arabic content and model controls stay within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await showFabric(page);
  await expect(page.getByRole("button", { name: "Pearl" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("reduced motion retains all content and removes the long sticky scene", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".rose-opening")).toHaveAttribute(
    "data-motion",
    "false",
  );
  await expect(
    page.getByRole("heading", { name: /أناقة تشبهكِ.*بكل تفاصيلكِ/ }),
  ).toBeVisible();
  const study = page.locator(".design-study");
  await showFabric(page);
  await expect(study).toHaveAttribute("data-reduced-motion", "true");
  await expect(
    page.getByRole("heading", {
      name: /خفة.*ترافق يومكِ/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /اختاري لونكِ.*يتلوّن الموقع معكِ/ }),
  ).toBeVisible();
  const ratio = await study.evaluate(
    (el) => el.clientHeight / window.innerHeight,
  );
  expect(ratio).toBeLessThan(1.6);
});

test("WebGL failure shows a visual fallback and working controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: any[]
    ) {
      if (type.includes("webgl")) return null;
      return original.apply(this, [type, ...args] as any);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/");
  await showFabric(page);
  await expect(
    page.getByRole("img", { name: "تصوّر لحجاب منسدل" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pearl" }).click();
  await expect(page.getByRole("button", { name: "Pearl" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("3D rotation controls fit on a short mobile screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  await showFabric(page);
  const control = page.getByRole("button", { name: "Rotate right" });
  await expect(control).toBeVisible();
  const bounds = await control.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(640);
  await control.click();
  await expect(page.locator(".model-stage")).toHaveAttribute("data-rotation", "1");
});

test("disabling scroll animation in CMS shows a static opening and all fabric chapters", async ({
  page,
}) => {
  await page.route("**/v1/storefront/bootstrap", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.site.header.storefront.scrollAnimationsEnabled = false;
    await route.fulfill({ response, json: data });
  });
  await page.goto("/");
  await expect(page.locator(".design-study")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
  await expect(page.locator(".rose-opening")).toHaveAttribute(
    "data-motion",
    "false",
  );
  await expect(
    page.getByRole("heading", { name: /اختاري لونكِ.*يتلوّن الموقع معكِ/ }),
  ).toHaveCount(1);
  const position = await page
    .locator(".rose-opening-sticky")
    .evaluate((el) => getComputedStyle(el).position);
  expect(position).not.toBe("sticky");
  await page.locator(".rose-video").scrollIntoViewIfNeeded();
  await expect(page.locator(".rose-video")).toHaveAttribute("data-playback", "paused");
  await page.getByRole("button", { name: "تشغيل الفيديو", exact: true }).click();
  await expect(page.locator(".rose-video")).toHaveAttribute("data-playback", "playing");
});

test("without JavaScript the campaign and every fabric chapter remain readable", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: "http://127.0.0.1:3000",
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".rose-opening")).toHaveAttribute(
    "data-motion",
    "false",
  );
  await expect(
    page.getByRole("heading", { name: /خفة.*ترافق يومكِ/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: /اختاري لونكِ.*يتلوّن الموقع معكِ/ }),
  ).toHaveCount(1);
  const ratio = await page
    .locator(".design-study")
    .evaluate((el) => el.clientHeight / window.innerHeight);
  expect(ratio).toBeLessThan(1.6);
  await expect(
    page.getByRole("img", { name: "تصوّر لحجاب منسدل" }),
  ).toBeVisible();
  await context.close();
});

test("Rose greets on the home hero and cheers when a colour is picked", async ({ page }) => {
  await page.goto("/");
  const rose = page.locator(".hero-mascot");
  await expect(rose).toHaveCount(1);
  await expect(rose.getByRole("img")).toHaveAttribute("aria-label", /رَزان|Rose/);
  await expect(rose.locator(".rose-mascot-bubble")).toHaveAttribute("data-show", "true", { timeout: 6000 });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#9fb3a1" })));
  await expect(rose.locator(".rose-mascot-bubble")).toContainText(/اللون|colour/);
  // Her hijab follows the shopper's colour.
  await expect.poll(() => rose.evaluate((el) => getComputedStyle(el).getPropertyValue("--m-hijab").trim())).not.toBe("");
});

test("Rose follows the shopper and cheers when a piece goes in the bag", async ({ page }) => {
  await page.goto("/p/rose-dress");
  const rose = page.locator(".rose-companion");
  await expect(rose).toHaveCount(1);
  await expect(rose).not.toHaveAttribute("data-away", "true");
  await page.getByRole("button", { name: /أضيفي للحقيبة|Add to bag/ }).first().click();
  await expect(rose.locator(".rose-mascot-bubble")).toHaveAttribute("data-show", "true");
  await expect(rose.locator(".rose-mascot-bubble")).toContainText(/سلة|سلتك|موفّق|bag|pick/);
  await expect(rose.locator("[data-bag]")).toBeVisible();
});

test("Rose changes outfit with the collection and is the shop chat", async ({ page }) => {
  await page.route("**/api/chatbot/message", (route) => route.fulfill({ json: { ok: true, reply: "أهلاً! هاي اقتراحاتي 🌸", products: [] } }));
  await page.goto("/c/dresses");
  const rose = page.locator(".rose-companion");
  await expect(rose.locator(".rose-mascot")).toHaveAttribute("data-outfit", "dress", { timeout: 8000 });
  await expect(page.locator(".chat-widget-root")).toHaveCount(0);
  await rose.getByRole("button", { name: /رزان|Rose/ }).first().click();
  const chat = page.getByRole("dialog", { name: /رزان|Rose/ });
  await expect(chat).toBeVisible();
  await chat.getByRole("textbox").fill("عندكم مقاس L؟");
  await chat.getByRole("textbox").press("Enter");
  await expect(chat).toContainText("هاي اقتراحاتي");
  await page.keyboard.press("Escape");
  await expect(chat).toHaveCount(0);
});

test("Tapping Rose opens her panel with WhatsApp even when the chatbot is off", async ({ page }) => {
  // The store turned the chatbot off but WhatsApp on (as on the live shop).
  await page.route("**/v1/storefront/bootstrap", async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    json.site.header.storefront = { ...json.site.header.storefront, chatbotEnabled: false, whatsappEnabled: true, whatsappNumber: "0599123456" };
    await route.fulfill({ response: res, json });
  });
  await page.goto("/p/rose-dress");
  const rose = page.locator(".rose-companion");
  // WhatsApp sits beside Rose; the separate floating button is not drawn on top of her.
  await expect(rose.locator(".rose-companion-wa")).toBeVisible();
  await expect(page.locator(".whatsapp-floating-btn")).toHaveCount(0);
  await rose.getByRole("button", { name: /رزان|Rose/ }).first().click();
  const panel = page.getByRole("dialog", { name: /رزان|Rose/ });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: /واتساب|WhatsApp/ }).first()).toHaveAttribute("href", /wa\.me\/\d*599123456/);
  await expect(panel.getByRole("textbox")).toHaveCount(0);
  await expect(rose.locator(".rose-companion-wa")).toHaveCount(0);
});
