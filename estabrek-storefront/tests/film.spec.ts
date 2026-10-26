import { test, expect, type Page } from "@playwright/test";

// The scarf film opening. The shared mock serves the photo opening by default;
// these tests switch the film on for themselves and back off afterwards.
async function setFilm(page: Page, on: boolean) {
  await page.request.get(`http://127.0.0.1:4100/__test/hero-film?on=${on ? 1 : 0}`);
  await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
}

test.describe.serial("opening film", () => {
  test.beforeEach(async ({ page }) => { await setFilm(page, true); });
  test.afterEach(async ({ page }) => { await setFilm(page, false); });

  const scrollTo = (page: Page, f: number) => page.evaluate((f) => {
    const el = document.querySelector<HTMLElement>(".rose-film")!;
    window.scrollTo({ behavior: "instant", top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * f });
  }, f);

  test("scrolling plays the scarf film and changes the headline line by line", async ({ page }) => {
    await page.goto("/");
    const film = page.locator(".rose-film");
    await expect(film).toHaveAttribute("data-motion", "true");
    await expect(page.locator(".rose-opening")).toHaveCount(0);
    // The film's black is taken out: the scarf is drawn on its own over the page.
    await expect(film).toHaveAttribute("data-cutout", "on");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    const frames = page.locator(".film-canvas");
    const on = page.locator('.film-line[data-state="on"]');
    await expect(on).toContainText("أناقة تشبهكِ");
    await scrollTo(page, 0.45);
    await expect.poll(async () => Number(await frames.getAttribute("data-frame"))).toBeGreaterThan(80);
    await expect(on).not.toContainText("أناقة تشبهكِ");
    // The decoded video follows scroll and stay still when the shopper stops (once the
    // scroll motion has eased in, a few tenths of a second).
    await page.waitForTimeout(900);
    const paused = await frames.getAttribute("data-frame");
    await page.waitForTimeout(250);
    expect(await frames.getAttribute("data-frame")).toBe(paused);
    await scrollTo(page, 0.97);
    await expect(film).toHaveAttribute("data-final", "true");
    await expect(page.locator(".film-closing")).toHaveAttribute("data-state", "on");
    await expect(page.locator(".rose-film .hero-description")).toContainText("حجاب، فساتين");
    // …and it runs backwards too.
    await scrollTo(page, 0);
    await expect(film).not.toHaveAttribute("data-final", /.*/);
    await expect.poll(async () => Number(await frames.getAttribute("data-frame"))).toBe(0);
    await expect(on).toContainText("أناقة تشبهكِ");
  });

  test("below the film, the hijab flies into the first hijab in the products once", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".rose-film")).toHaveAttribute("data-motion", "true");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    await scrollTo(page, 1);
    await page.waitForTimeout(600);
    await page.locator(".editorial-product-image").first().scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelector(".editorial-product-image")!.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(page.locator(".scarf-flight")).toHaveCount(1);
    // It lands on the hijab (the first card of the row is a dress).
    const landed = page.locator(".editorial-product[data-scarf-landed]");
    await expect(landed).toContainText("حجاب");
    await expect(page.locator(".scarf-flight-layer")).toHaveCount(0, { timeout: 5000 });
    // Nothing widened the page, and it does not fly again on the way back.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await scrollTo(page, 1);
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector(".editorial-product-image")!.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForTimeout(800);
    await expect(page.locator(".scarf-flight-layer")).toHaveCount(0);
  });

  test("the film keeps the shop button and Rose, and works on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator(".rose-film")).toHaveAttribute("data-motion", "true");
    await expect(page.locator(".rose-film .hero-actions a").first()).toHaveAttribute("href", "/shop");
    await expect(page.locator(".rose-film .hero-mascot")).toHaveCount(1);
    // On a phone the film sits above the words.
    const stage = await page.locator(".film-stage").boundingBox();
    const words = await page.locator(".film-copy").boundingBox();
    expect(stage!.y + stage!.height).toBeLessThanOrEqual(words!.y + 4);
  });
  test("the 120 fps film replaces frame packets, and the sparkles carry no blur filters", async ({ page }) => {
    const filmRequests: string[] = [];
    const packets: string[] = [];
    page.on("request", (r) => { if (/hero-film[^/]*\.(webm|mp4)$/.test(r.url())) filmRequests.push(r.url()); });
    page.on("request", (r) => { if (/hero-frames-v2\/.*\.bin$/.test(r.url())) packets.push(r.url()); });
    await page.goto("/");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    // The motion-interpolated 120 fps film (WebM where the browser plays VP9, else MP4).
    expect(filmRequests.some(s => /hero-film-120\.(webm|mp4)$/.test(s))).toBe(true);
    expect(packets).toEqual([]);
    // The browser may keep the film and its stills.
    const head = await page.request.get("/editorial/hero-film-still.webp");
    expect(head.headers()["cache-control"]).toContain("max-age=604800");
    // At the end the stars glow without filters (redrawn on every frame of the twinkle).
    await scrollTo(page, 0.97);
    await expect(page.locator(".rose-film")).toHaveAttribute("data-final", "true");
    const filters = await page.locator(".film-spark").evaluateAll((els) => els.map((el) => getComputedStyle(el).filter));
    expect(filters.length).toBeGreaterThan(0);
    expect(filters.every((f) => f === "none")).toBe(true);
  });

  test("Rose says hello only once the film is in and the shopper pauses", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    const bubble = page.locator(".rose-film .rose-mascot-bubble");
    await expect(bubble).toHaveAttribute("data-show", "true", { timeout: 8000 });
  });
});
