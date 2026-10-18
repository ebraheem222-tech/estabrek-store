import { test, expect } from "@playwright/test";

test.describe("adaptive hero film", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.get("http://127.0.0.1:4100/__test/hero-film?on=1");
    await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  });
  test.afterEach(async ({ page }) => {
    await page.request.get("http://127.0.0.1:4100/__test/hero-film?on=0");
    await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  });

  test("scroll video keeps the 120 fps film despite continuous-playback estimates", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaCapabilities", { value: {
        decodingInfo: async () => ({ supported: true, smooth: false, powerEfficient: false }),
      } });
    });
    const sources: string[] = [];
    page.on("request", r => { if (/hero-film[^/]*\.(mp4|webm)$/.test(r.url())) sources.push(r.url()); });
    await page.goto("/");
    await expect(page.locator('.film-canvas')).toHaveAttribute("data-ready", "true");
    expect(sources.some(s => /hero-film-120\.(webm|mp4)$/.test(s))).toBe(true);
    await expect(page.locator(".rose-film")).toHaveAttribute("data-playback", "full");
  });

  test("reduced motion keeps the scarf still without downloading a film", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const sources: string[] = [];
    page.on("request", r => { if (/hero-film[^/]*\.(mp4|webm)$|hero-frames-v2\/.*\.bin$/.test(r.url())) sources.push(r.url()); });
    await page.goto("/");
    await expect(page.locator(".rose-film")).toHaveAttribute("data-playback", "static");
    await expect(page.locator(".film-still")).toBeVisible();
    expect(sources).toEqual([]);
    await expect(page.locator(".film-play-toggle")).toHaveCount(0);
  });

  test("data saver skips the video download and the long scroll scene", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", { value: { saveData: true, effectiveType: "4g" } });
    });
    const sources: string[] = [];
    page.on("request", r => { if (/hero-film[^/]*\.(mp4|webm)$|hero-frames-v2\/.*\.bin$/.test(r.url())) sources.push(r.url()); });
    await page.goto("/");
    await expect(page.locator(".rose-film")).toHaveAttribute("data-playback", "static");
    await expect(page.locator(".rose-film")).toHaveAttribute("data-motion", "false");
    expect(await page.locator(".rose-film").evaluate(el => el.clientHeight)).toBeLessThan(1200);
    expect(sources).toEqual([]);
  });

  test("lite mode keeps the original scroll story and changing headline colours", async ({ page }) => {
    await page.goto("/?motion=lite");
    const film = page.locator(".rose-film");
    const frames = page.locator(".film-canvas");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    await expect(film).toHaveAttribute("data-motion", "true");
    await expect(page.locator(".film-play-toggle, .film-stage-label, .film-signature, .film-eyebrow")).toHaveCount(0);
    expect(await frames.evaluate((c: HTMLCanvasElement) => [c.width, c.height])).toEqual([1280, 720]);
    const on = page.locator('.film-line[data-state="on"]');
    const lines = ["أناقة تشبهكِ", "نعومةٌ تلتفّ حولكِ", "تفاصيل تحكي ذوقكِ", "ألوانٌ تشبه مزاجكِ"];
    const colours = ["rgb(178, 72, 106)", "rgb(124, 95, 168)", "rgb(63, 127, 120)", "rgb(168, 122, 44)"];
    for (let i = 0; i < lines.length; i++) {
      await page.evaluate(f => {
        const el = document.querySelector<HTMLElement>(".rose-film")!;
        window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * f, behavior: "instant" });
      }, i * .21 + .05);
      await expect(on).toContainText(lines[i]);
      await expect(on).toHaveCSS("color", colours[i]);
    }
    await expect.poll(async () => Number(await frames.getAttribute("data-frame"))).toBeGreaterThan(180);
  });

  test("failed video requests retain the scarf still and shopping actions", async ({ page }) => {
    await page.route(/hero-film[^/]*\.(mp4|webm)$/, route => route.abort());
    await page.goto("/");
    const still = page.locator(".film-still");
    await expect(still).toBeVisible();
    await expect(page.locator(".rose-film")).toHaveAttribute("data-motion", "false");
    await expect(page.locator(".rose-film .film-cta")).toBeVisible();
    expect(await still.evaluate(el => getComputedStyle(el).visibility)).toBe("visible");
  });

  // Slow frames only lower the 3D scenes' frame rate (motionBudget.ts); the opening film
  // never switches mode in the middle of a visit, so nothing on screen jumps.
  test("a slower device keeps its place when frames slow down", async ({ page }) => {
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      const times = new WeakMap<FrameRequestCallback, number>();
      window.requestAnimationFrame = callback => raf(time => {
        // A fixed slow beat also works on 144/165Hz screens, where multiplying
        // real timestamps by three still produces healthy ~18ms frame gaps.
        const next = document.documentElement.dataset.testSlowFrames === "true"
          ? (times.get(callback) ?? time) + 50 : time;
        times.set(callback, next);
        callback(next);
      });
    });
    await page.goto("/");
    const film = page.locator(".rose-film");
    await expect(film).toHaveAttribute("data-playback", "full");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(".rose-film")!;
      window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * .5, behavior: "instant" });
    });
    const on = page.locator('.film-line[data-state="on"]');
    await expect(on).toContainText("تفاصيل تحكي ذوقكِ");
    const frames = page.locator(".film-canvas");
    await expect.poll(async () => Number(await frames.getAttribute("data-frame"))).toBeGreaterThan(120);
    // Wait until the scroll motion has fully eased in (the picture stops changing).
    let frame = await frames.getAttribute("data-frame");
    await expect.poll(async () => {
      await page.waitForTimeout(400);
      const now = await frames.getAttribute("data-frame");
      const still = now === frame;
      frame = now;
      return still;
    }).toBe(true);
    const height = await film.evaluate(el => el.clientHeight);
    await page.evaluate(() => { document.documentElement.dataset.testSlowFrames = "true"; });
    await page.waitForTimeout(2500);
    await expect(film).toHaveAttribute("data-playback", "full");
    await expect(film).toHaveAttribute("data-motion", "true");
    await expect(on).toContainText("تفاصيل تحكي ذوقكِ");
    await expect(on).toHaveCSS("color", "rgb(63, 127, 120)");
    expect(await frames.getAttribute("data-frame")).toBe(frame);
    expect(await film.evaluate(el => el.clientHeight)).toBe(height);
    expect(await frames.evaluate((c: HTMLCanvasElement) => [c.width, c.height])).toEqual([1280, 720]);
  });

  test("the scroll story returns when reduced motion is switched off", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".rose-film")).toHaveAttribute("data-playback", "static");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator(".rose-film")).toHaveAttribute("data-motion", "true");
    await expect(page.locator('.film-line[data-state="on"]')).toContainText("أناقة تشبهكِ");
  });

  test("video rendering does not require ImageBitmap", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "createImageBitmap", { value: undefined });
    });
    await page.goto("/?motion=lite");
    await expect(page.locator(".rose-film")).toHaveAttribute("data-motion", "true");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    expect(await page.locator(".film-canvas").evaluate((c: HTMLCanvasElement) => c.width)).toBe(1280);
  });
});
