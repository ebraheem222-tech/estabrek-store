import { test, expect } from "@playwright/test";

test.describe("scroll video", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.get("http://127.0.0.1:4100/__test/hero-film?on=1");
    await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  });
  test.afterEach(async ({ page }) => {
    await page.request.get("http://127.0.0.1:4100/__test/hero-film?on=0");
    await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  });

  // One film file: the computer's 120 fps film (WebM where VP9 plays, else MP4), fetched
  // whole and played from memory. No frame packets, no other copies of the film.
  test("uses the 120 fps film without downloading other copies", async ({ page }) => {
    const images: string[] = [];
    const films: string[] = [];
    page.on("request", r => { if (/hero-frames.*\.bin/.test(r.url())) images.push(r.url()); });
    page.on("request", r => { if (/hero-film[^/]*\.(mp4|webm)$|hero-codec-lab\//.test(r.url())) films.push(new URL(r.url()).pathname); });
    await page.goto("/");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    expect(images).toEqual([]);
    expect(films.length).toBe(1);
    expect(films[0]).toMatch(/^\/editorial\/hero-film-120\.(webm|mp4)$/);
    await expect(page.locator(".rose-film")).toHaveAttribute("data-playback", "full");
    expect(await page.locator(".film-video").evaluate((v: HTMLVideoElement) => v.currentSrc.startsWith("blob:"))).toBe(true);
    expect(await page.locator(".film-video").evaluate((v: HTMLVideoElement) => [v.videoWidth, v.videoHeight, v.paused])).toEqual([1280, 720, true]);
    expect(await page.locator(".film-canvas").evaluate((c: HTMLCanvasElement) => [c.width, c.height])).toEqual([1280, 720]);
  });

  test("settles after fast forward/reverse scroll without reuploading idle frames", async ({ page }) => {
    await page.addInitScript(() => {
      const original = WebGLRenderingContext.prototype.texImage2D;
      const state = window as typeof window & { heroUploads: number };
      state.heroUploads = 0;
      WebGLRenderingContext.prototype.texImage2D = function (...args: Parameters<typeof original>) {
        if ((this.canvas as HTMLCanvasElement).classList.contains("film-canvas")) state.heroUploads++;
        return original.apply(this, args);
      };
    });
    await page.goto("/");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    await page.evaluate(async () => {
      const el = document.querySelector<HTMLElement>(".rose-film")!;
      const top = el.getBoundingClientRect().top + scrollY;
      for (const p of [.8, .2, .95, .3]) {
        scrollTo({ top: top + (el.offsetHeight - innerHeight) * p, behavior: "instant" });
        await new Promise(resolve => setTimeout(resolve, 35));
      }
    });
    // Settles on the frame for 30% of the opening (120 fps grid; the film plays over the
    // first 88% of the scroll), give or take a frame of pixel rounding, and stays there.
    const expected = await page.evaluate(() => {
      const v = document.querySelector<HTMLVideoElement>(".film-video")!;
      return Math.round(Math.min(1, 0.3 / 0.88) * (Math.ceil(v.duration * 120) - 1));
    });
    await expect.poll(async () => Math.abs(Number(await page.locator(".film-canvas").getAttribute("data-frame")) - expected)).toBeLessThanOrEqual(2);
    await page.waitForTimeout(700);
    const before = await page.evaluate(() => (window as typeof window & { heroUploads: number }).heroUploads);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as typeof window & { heroUploads: number }).heroUploads)).toBe(before);
    await expect(page.locator('.film-line[data-state="on"]')).toHaveCSS("color", "rgb(124, 95, 168)");
  });

  test("starts decoding when mobile preload supplies metadata before a picture", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "VideoDecoder", { value: undefined });
      const proto = HTMLMediaElement.prototype;
      const readiness = Object.getOwnPropertyDescriptor(proto, "readyState")!;
      const time = Object.getOwnPropertyDescriptor(proto, "currentTime")!;
      const started = new WeakSet<HTMLMediaElement>();
      Object.defineProperty(proto, "readyState", {
        configurable: true,
        get() {
          const value = readiness.get!.call(this);
          return this.classList.contains("film-video") && !started.has(this) && value >= 1 ? 1 : value;
        },
      });
      Object.defineProperty(proto, "currentTime", {
        configurable: true,
        get: time.get,
        set(value) { started.add(this); time.set!.call(this, value); },
      });
    });
    await page.goto("/");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".rose-film")).toHaveAttribute("data-playback", "full");
    await expect(page.locator('.film-line[data-state="on"]')).toContainText("أناقة تشبهكِ");
  });

});
