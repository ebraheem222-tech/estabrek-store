import { test, expect } from "@playwright/test";

for (const device of [
  { name: "desktop", width: 1440, height: 1000, cpu: 1 },
  { name: "phone", width: 393, height: 873, cpu: 1 },
  { name: "phone with 4x CPU slowdown", width: 393, height: 873, cpu: 4 },
]) test(`${device.name}: each decoded hero frame can paint before the next seek starts`, async ({ page }, testInfo) => {
  await page.request.get("http://127.0.0.1:4100/__test/hero-film?on=1");
  await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  try {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/?motion=full");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: device.cpu });
    const result = await page.evaluate(async () => {
      const hero = document.querySelector<HTMLElement>(".rose-film")!;
      const video = hero.querySelector<HTMLVideoElement>("video")!;
      const canvas = hero.querySelector<HTMLCanvasElement>("canvas.film-canvas")!;
      const gl = canvas.getContext("webgl")!;
      const upload = gl.texImage2D;
      let uploads = 0;
      gl.texImage2D = function (...args: Parameters<typeof upload>) {
        uploads++;
        return upload.apply(this, args);
      };
      const top = hero.getBoundingClientRect().top + scrollY;
      const distance = hero.offsetHeight - innerHeight;
      let decoded = 0, interrupted = 0;
      const onFrame = () => { decoded++; if (video.seeking) interrupted++; };
      video.addEventListener("seeked", onFrame);
      await new Promise<void>(resolve => {
        let start: number | undefined;
        const step = (time: number) => {
          start ??= time;
          const elapsed = time - start;
          const progress = elapsed < 1500 ? elapsed / 1500 : 2 - elapsed / 1500;
          scrollTo({ top: top + distance * Math.max(0, progress) * .8, behavior: "instant" });
          if (elapsed < 3000) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
      video.removeEventListener("seeked", onFrame);
      gl.texImage2D = upload;
      return { decoded, interrupted, uploads };
    });
    await testInfo.attach("hero-frame-pacing", { body: JSON.stringify(result), contentType: "application/json" });
    expect(result.decoded).toBeGreaterThan(10);
    expect(result.interrupted).toBe(0);
    expect(result.uploads).toBeGreaterThan(10);
    await expect.poll(() => page.locator(".film-video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeLessThan(.05);
  } finally {
    await page.request.get("http://127.0.0.1:4100/__test/hero-film?on=0");
    await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  }
});

test("jumping past the hero finishes the scarf before returning to the scene", async ({ page }) => {
  await page.request.get("http://127.0.0.1:4100/__test/hero-film?on=1");
  await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  try {
    await page.goto("/");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    const video = page.locator(".film-video");
    await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(".rose-film")!;
      scrollTo({ top: hero.getBoundingClientRect().top + scrollY + (hero.offsetHeight - innerHeight) * .4, behavior: "instant" });
    });
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(4);
    await page.evaluate(() => document.querySelector(".editorial-product-image")!.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.duration - v.currentTime)).toBeLessThan(.1);
    await expect(page.locator(".film-closing")).toHaveAttribute("data-state", "on");
    await page.evaluate(() => document.querySelector(".rose-film")!.scrollIntoView({ block: "start", behavior: "instant" }));
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeLessThan(.05);
    await expect(page.locator('.film-line[data-state="on"]')).toContainText("أناقة تشبهكِ");
  } finally {
    await page.request.get("http://127.0.0.1:4100/__test/hero-film?on=0");
    await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  }
});
