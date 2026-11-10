import { test, expect, type Page } from "@playwright/test";

// The home's showpieces (app/rose-wonders.css): the particles, the rooms, the store's world, the page hero,
// story mode, and the secret behind the logo. They're off in the fixture; /__test/wonders switches them on.
const API = "http://127.0.0.1:4100";

const wonders = async (page: Page, on: boolean) => {
  await page.request.get(`${API}/__test/wonders?on=${on ? 1 : 0}`);
  await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
};
const delivery = async (page: Page, on: boolean) => {
  await page.request.get(`${API}/__test/delivery?on=${on ? 1 : 0}`);
  await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["settings", "cms:bootstrap", "cms:pages"] } });
};
/** Scrolls so that the given share (0–1) of a tall section's scroll room has gone by. */
const scrollThrough = (page: Page, selector: string, share: number) =>
  page.locator(selector).evaluate((el, s) => {
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + (el.scrollHeight - window.innerHeight) * s);
  }, share);

test.describe.serial("the home's showpieces", () => {
  test.beforeAll(async ({ request }) => {
    await request.get(`${API}/__test/wonders?on=1`);
    await request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  });
  test.afterAll(async ({ request }) => {
    await request.get(`${API}/__test/wonders?on=0`);
    await request.get(`${API}/__test/delivery?on=0`);
    await request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["settings", "cms:bootstrap", "cms:pages"] } });
  });

  test("the particles: the logo, then a hijab, then a bag, with the words changing as you scroll", async ({ page }) => {
    await page.goto("/");
    const section = page.locator(".rose-particles");
    await expect(section).toHaveCount(1);
    await expect(section.locator("canvas.rose-particles-canvas")).toHaveCount(1);
    // It comes right after the opening, and it's marked as a scene of its own (the page hero steps aside).
    await expect(page.locator('[data-rose-block="particles"]')).toHaveAttribute("data-hero-busy", "true");
    await scrollThrough(page, ".rose-particles", 0.05);
    await expect(section.locator(".rose-particles-pill li").first()).toHaveAttribute("data-on", "true");
    await scrollThrough(page, ".rose-particles", 0.5);
    await expect(section.locator(".rose-particles-words h2")).toHaveText("حجابات بكل لون.");
    await scrollThrough(page, ".rose-particles", 0.97);
    await expect(section.locator(".rose-particles-words h2")).toHaveText("وبكبسة بتوصلك.");
    await expect(section.locator(".rose-particles-pill li").last()).toHaveAttribute("data-on", "true");
    // The canvas really draws.
    const drawn = await section.locator("canvas").evaluate((c: HTMLCanvasElement) => {
      const ctx = c.getContext("2d");
      if (!ctx || !c.width) return 0;
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 3; i < data.length; i += 4 * 97) if (data[i] > 0) lit++;
      return lit;
    });
    expect(drawn).toBeGreaterThan(10);
  });

  test("the particles wear a colour per chapter from the theme's, and the page (the header too) follows it", async ({ page }) => {
    await page.goto("/");
    const seed = () => page.locator(".atelier-header").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--selection-seed").trim());
    expect(await seed()).toBe("");
    await scrollThrough(page, ".rose-particles", 0.04);
    await expect.poll(seed).toMatch(/^#[0-9a-f]{6}$/i);
    await page.waitForTimeout(1500); // the glide settles
    const logo = await seed();
    await scrollThrough(page, ".rose-particles", 0.97);
    await expect(page.locator(".rose-particles-words h2")).toHaveText("وبكبسة بتوصلك.");
    await expect.poll(seed).not.toBe(logo);
    // The section's background is drawn from the colour it wears.
    const bg = await page.locator(".rose-particles-stage").evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain("radial-gradient");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(seed, { timeout: 8000 }).toBe("");
  });

  test("the rooms: one piece lit at a time, the next one comes in as you scroll", async ({ page }) => {
    await page.goto("/");
    const rooms = page.locator(".rose-rooms .rose-room");
    expect(await rooms.count()).toBeGreaterThan(1);
    await scrollThrough(page, ".rose-rooms", 0.02);
    await expect(rooms.first()).toHaveAttribute("data-lit", "true");
    await expect(page.locator(".rose-rooms .rose-room[data-lit]")).toHaveCount(1);
    await scrollThrough(page, ".rose-rooms", 0.98);
    await expect(rooms.last()).toHaveAttribute("data-lit", "true");
    await expect(rooms.first()).not.toHaveAttribute("data-lit", /.+/);
    await expect(rooms.first().locator("a.rose-room-alcove")).toHaveAttribute("href", /^\/p\//);
  });

  test("the store's world: islands for the collections; a tap opens one", async ({ page }) => {
    await page.goto("/");
    const world = page.locator(".rose-world");
    await world.scrollIntoViewIfNeeded();
    await expect(world).toHaveAttribute("data-mode", "collections");
    // No delivery prices set: no tabs, just the collections.
    await expect(world.locator(".rose-world-tabs")).toHaveCount(0);
    const isle = world.getByRole("button", { name: "فساتين" });
    await expect(isle).toBeVisible();
    await isle.click();
    await expect(isle).toHaveAttribute("data-picked", "true");
    const card = world.locator(".rose-world-card");
    await expect(card).toContainText("فساتين");
    await expect(card.getByRole("link")).toHaveAttribute("href", /\/c\/dresses/);
    // Zoom and back.
    const map = world.locator(".rose-world-map");
    const before = await map.evaluate((el) => (el as HTMLElement).style.transform);
    await world.getByRole("button", { name: "تكبير" }).click();
    await expect.poll(() => map.evaluate((el) => (el as HTMLElement).style.transform)).not.toBe(before);
  });

  test("the store's world: the delivery map with the cities, their prices and the free delivery line", async ({ page }) => {
    await delivery(page, true);
    try {
      await page.goto("/");
      const world = page.locator(".rose-world");
      await world.scrollIntoViewIfNeeded();
      await world.getByRole("tab", { name: "التوصيل" }).click();
      await expect(world).toHaveAttribute("data-mode", "delivery");
      await expect(world.locator(".rose-pin")).toHaveCount(4);
      await expect(world.locator(".rose-pin[data-home]")).toContainText("القدس");
      await expect(world.locator(".rose-pin", { hasText: "حيفا" }).locator(".rose-pin-fee")).toContainText("35");
      const legend = world.locator(".rose-world-legend");
      await expect(legend).toContainText("الداخل");
      await expect(legend).toContainText("50");
      await expect(legend.locator(".rose-world-free")).toContainText("800");
      await world.locator(".rose-pin", { hasText: "الناصرة" }).click();
      await expect(world.locator(".rose-world-card")).toContainText("الناصرة");
    } finally {
      await delivery(page, false);
    }
  });

  test("the page hero rides along the home, and steps aside at the sections with a scene of their own", async ({ page }) => {
    await page.goto("/");
    const level = await page.evaluate(() => document.documentElement.dataset.motionLevel);
    test.skip(level === "lite", "a light device gets no page hero");
    const hero = page.locator(".rose-page-hero");
    await expect(hero).toHaveCount(1);
    expect(await hero.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
    // In the middle of the particles (a scene of its own): it isn't drawn.
    await scrollThrough(page, ".rose-particles", 0.5);
    await expect(hero).not.toHaveAttribute("data-active", /.+/, { timeout: 5000 });
    // At a plain section it comes back.
    await page.locator(".rose-page-frame.rose-home > *").last().evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(hero).toHaveAttribute("data-active", "true");
  });

  test("story mode: the chapters on the rail, the one you're in, and Razan saying a word", async ({ page }) => {
    await page.goto("/");
    const rail = page.locator(".rose-story-rail");
    await expect(rail).toBeVisible();
    const steps = rail.locator("li");
    expect(await steps.count()).toBeGreaterThan(3);
    await expect(steps.first()).toHaveAttribute("aria-current", "step");
    await expect(rail.locator(".rose-story-now")).toHaveText("البداية");
    // Razan hears of each new chapter.
    await page.evaluate(() => {
      (window as unknown as { said: string[] }).said = [];
      window.addEventListener("rose:say", (e) => (window as unknown as { said: string[] }).said.push((e as CustomEvent<{ text: string }>).detail.text));
    });
    await scrollThrough(page, ".rose-particles", 0.5);
    await expect(rail.locator(".rose-story-now")).toHaveText("الحكاية");
    await expect.poll(() => page.evaluate(() => (window as unknown as { said: string[] }).said.join(" | "))).toContain("لوجو");
    // A tap on the last chapter goes there.
    await steps.last().locator("button").click();
    await expect(steps.last()).toHaveAttribute("aria-current", "step");
  });

  test("the page wears the lit room's piece colour while the rooms hold the screen, and gives it back after", async ({ page }) => {
    await page.goto("/");
    const seed = () => page.locator(".atelier-header").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--selection-seed").trim());
    expect(await seed()).toBe("");
    await scrollThrough(page, ".rose-rooms", 0.02);
    await expect.poll(seed).toMatch(/^#[0-9a-f]{6}$/i);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(seed, { timeout: 8000 }).toBe("");
  });

  test("a tap on an island washes the sea and dresses the page in its collection's colour; closing it gives it back", async ({ page }) => {
    await page.goto("/");
    const world = page.locator(".rose-world");
    await world.scrollIntoViewIfNeeded();
    const seed = () => page.locator(".atelier-header").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--selection-seed").trim());
    await world.getByRole("button", { name: "حجاب" }).click();
    await expect(world).toHaveAttribute("data-dressed", "true");
    await expect.poll(seed).toMatch(/^#[0-9a-f]{6}$/i);
    // The section's whole surface takes the colour too.
    await expect.poll(() => world.evaluate((el) => Number(getComputedStyle(el, "::before").opacity))).toBeGreaterThan(0.95);
    await world.locator(".rose-world-card-close").click();
    await expect(world).not.toHaveAttribute("data-dressed", /.+/);
    await expect.poll(seed, { timeout: 8000 }).toBe("");
  });

  test("the rooms and the flying 3D silk show only once the owner switches them on", async ({ page }) => {
    await page.request.get(`${API}/__test/wonders?on=1&unset=rooms,hero`);
    await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
    try {
      await page.goto("/");
      await expect(page.locator(".rose-particles")).toHaveCount(1);
      await expect(page.locator(".rose-rooms")).toHaveCount(0);
      await page.waitForTimeout(800);
      await expect(page.locator(".rose-page-hero")).toHaveCount(0);
    } finally {
      await page.request.get(`${API}/__test/wonders?on=1`);
      await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
    }
  });

  test("on a phone, story mode is a small pill at the bottom of the screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator(".rose-story-rail")).toBeHidden();
    const pill = page.locator(".rose-story-pill");
    await expect(pill).toBeVisible();
    await expect(pill.locator("strong")).toHaveText("البداية");
    await pill.click();
    await expect(pill.locator("strong")).not.toHaveText("البداية");
    // While the "you viewed" note shows at the bottom, the pill steps aside.
    await page.evaluate(() => { const note = document.querySelector(".rose-recent") ?? Object.assign(document.body.appendChild(document.createElement("div")), { className: "rose-recent" }); note.setAttribute("aria-hidden", "false"); });
    await expect(pill).toHaveAttribute("data-yield", "");
    await expect.poll(() => pill.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.05);
    await page.evaluate(() => document.querySelector(".rose-recent")?.setAttribute("aria-hidden", "true"));
    await expect(pill).not.toHaveAttribute("data-yield", /.*/);
  });
});

test.describe.serial("the store's secret", () => {
  const secret = async (page: Page, data: { code?: string; text?: string; enabled?: boolean }) => {
    await page.request.post(`${API}/__test/secret`, { data });
    await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["settings", "cms:bootstrap"], paths: ["/"] } });
  };
  test.afterEach(async ({ page }) => secret(page, {}));

  const hold = async (page: Page, ms: number) => {
    const brand = page.locator(".atelier-header .atelier-brand");
    const box = await brand.boundingBox();
    if (!box) throw new Error("no logo");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
  };

  test("holding the logo down opens the hidden coupon to copy; a tap still opens the home", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await secret(page, { code: "ROSE10" });
    await page.goto("/shop");
    await hold(page, 1500);
    const dialog = page.getByRole("dialog", { name: "سرّ المتجر" });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/shop$/); // the long press didn't open the home
    await expect(dialog.locator(".rose-secret-code")).toContainText("ROSE10");
    await dialog.locator(".rose-secret-code").click();
    await expect(dialog.locator(".rose-secret-code")).toContainText("انتسخ");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ROSE10");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    // A short press is a plain tap.
    await hold(page, 120);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("dialog", { name: "سرّ المتجر" })).toHaveCount(0);
  });

  test("with no code, a sweet word; switched off, nothing", async ({ page }) => {
    await secret(page, {});
    await page.goto("/shop");
    await hold(page, 1500);
    const dialog = page.getByRole("dialog", { name: "سرّ المتجر" });
    await expect(dialog).toContainText("خليه بيننا");
    await expect(dialog.locator(".rose-secret-code")).toHaveCount(0);
    await dialog.getByRole("button", { name: "تمام" }).click();
    await secret(page, { enabled: false });
    await page.goto("/shop");
    await hold(page, 1500);
    await page.waitForTimeout(300);
    await expect(page.getByRole("dialog", { name: "سرّ المتجر" })).toHaveCount(0);
  });
});

test.describe("the collections story in each collection's colour", () => {
  const story = async (page: Page, on: boolean) => {
    await page.request.get(`${API}/__test/collections-story?on=${on ? 1 : 0}`);
    await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  };
  test.afterEach(async ({ page }) => story(page, false));

  test("the page (the header too) takes each collection's colour in turn, and gives it back after", async ({ page }) => {
    await story(page, true);
    await page.goto("/");
    const section = page.locator(".rose-collections-scroll");
    await expect(section).toHaveCount(1);
    const seed = () => page.locator(".atelier-header").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--selection-seed").trim());
    await section.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 40));
    await expect(section.locator(".rose-cs-name")).toHaveText("فساتين");
    await expect.poll(seed).toMatch(/^#[0-9a-f]{6}$/i);
    await page.waitForTimeout(1200); // the glide settles
    const first = await seed();
    await section.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + el.offsetHeight - window.innerHeight - 20));
    await expect(section.locator(".rose-cs-name")).toHaveText("حجاب");
    await expect.poll(seed).not.toBe(first);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(seed, { timeout: 8000 }).toBe("");
  });
});
