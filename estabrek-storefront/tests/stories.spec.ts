import { test, expect } from "@playwright/test";
import { storyReelsOf, storyViews, unseenFirst } from "../src/pageTree/storyData";

// The shop's story circles (admin → القصص; the page editor's «شريط القصص»): tests/catalog-server.mjs /stories-demo, an
// Arabic page read right to left, with the test server's reels.
const API = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;

test.describe("story bar", () => {
  test("the reels as the bar draws them: ended ones out, some by id, links in the page's language, unseen first", () => {
    const raw = storyReelsOf({ reels: [
      { id: "a", title: { ar: "أ", en: "A" }, cover: null, endsAt: null, updatedAt: "1", slides: [{ id: "1", kind: "image", src: "/a.jpg", productId: "p1" }, { id: "2", kind: "image", src: "javascript:alert(1)" }] },
      { id: "b", title: { ar: "ب" }, cover: "/b.jpg", endsAt: "2020-01-01T00:00:00Z", updatedAt: "1", slides: [{ id: "1", kind: "image", src: "/b.jpg" }] },
      { id: "c", title: { ar: "ج" }, cover: null, endsAt: null, updatedAt: "2", slides: [{ id: "1", kind: "video", src: "/c.mp4", poster: "/c.jpg", href: "https://example.test/x", label: { en: "Go" } }] },
    ] });
    expect(raw.map((r) => r.slides.length)).toEqual([1, 1, 1]);
    const link = (path: string) => (path.startsWith("/") ? `/en${path}` : path);
    const views = storyViews(raw, { p1: { slug: "rose-dress", title: "Rose dress", image: "/r.jpg" } }, { lang: "en", main: "ar", link, shopThis: "Shop this piece", now: Date.parse("2026-11-28T00:00:00Z") });
    expect(views.map((v) => [v.id, v.title, v.cover])).toEqual([["a", "A", "/a.jpg"], ["c", "ج", "/c.jpg"]]);
    expect(views[0].slides[0].link).toEqual({ href: "/en/p/rose-dress", label: "Shop this piece", product: { title: "Rose dress", image: "/r.jpg" } });
    expect(views[1].slides[0].link).toEqual({ href: "https://example.test/x", label: "Go", product: null });
    expect(storyViews(raw, {}, { lang: "ar", main: "ar", link, shopThis: "x", only: ["c", "a"] }).map((v) => v.id)).toEqual(["c", "a"]);
    expect(unseenFirst(views, { a: "1" }).map((v) => v.id)).toEqual(["c", "a"]);
    // A reel changed since it was seen counts as new again.
    expect(unseenFirst(views, { a: "0" }).map((v) => v.id)).toEqual(["a", "c"]);
  });

  test("circles and cards in a row; a circle plays full screen, on by itself and by the keys, and is told and remembered", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/stories-demo");
    const bar = page.locator('[data-tree-node="bar"] .pt-sb');
    await expect(bar).toHaveAttribute("aria-label", "قصص");
    await expect(bar.locator(".pt-sb-item")).toHaveCount(2);
    await expect(bar.locator(".pt-sb-name")).toHaveText(["وصل جديد", "من الكواليس"]);
    const cards = page.locator('[data-tree-node="bar-cards"] .pt-sb');
    await expect(cards).toHaveClass(/pt-sb-cards/);
    await expect(cards.locator(".pt-sb-item")).toHaveCount(1);
    await expect(cards.locator(".pt-sb-name")).toHaveCount(0);
    await expect(cards.locator(".pt-sb-on")).toHaveText("من الكواليس");

    // Opened: its two lines at the top, its words, the product's button (its picture, its name).
    await bar.locator('[data-story="reel-new"]').click();
    const viewer = page.locator("dialog.pt-sv");
    await expect(viewer).toHaveAttribute("open", "");
    await expect(viewer).toHaveAttribute("aria-label", "وصل جديد");
    await expect(viewer.locator(".pt-sv-line")).toHaveCount(2);
    await expect(viewer.locator(".pt-sv-caption")).toHaveText("شالات الموسم");
    const button = viewer.locator(".pt-sv-link");
    await expect(button).toHaveAttribute("href", "/p/rose-dress");
    await expect(button.locator("strong")).toHaveText("تسوّقي هالقطعة");
    await expect(button.locator("small")).toHaveText("فستان الورد");
    // On by itself after its two seconds: the second picture and its own link.
    await expect(button).toHaveAttribute("href", "/shop?sort=new", { timeout: 5000 });
    await expect(button.locator("strong")).toHaveText("شوفي الكل");
    // Paused with the space bar; on to the next circle with the arrow toward the page's end (left, right to left).
    await page.keyboard.press(" ");
    await expect(viewer.getByRole("button", { name: "كمّلي" })).toBeVisible();
    await page.keyboard.press(" ");
    await page.keyboard.press("ArrowLeft");
    await expect(viewer).toHaveAttribute("aria-label", "من الكواليس");
    await expect(viewer.locator("video.pt-sv-media")).toHaveAttribute("src", "/editorial/hero-film-120.mp4");
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);

    // Seen to its end: its ring grey and its place after the unseen ones, also after a reload.
    await expect(bar.locator(".pt-sb-item").first().locator("button")).toHaveAttribute("data-story", "reel-film");
    await expect(bar.locator('[data-story="reel-new"]')).toHaveClass(/pt-sb-seen/);
    await page.reload();
    await expect(page.locator('[data-tree-node="bar"] [data-story="reel-new"]')).toHaveClass(/pt-sb-seen/);
    // The store was told each opening.
    const told = await (await page.request.get(`${API}/__test/story-events`)).json() as Array<{ id: string; event: string }>;
    expect(told).toEqual(expect.arrayContaining([{ id: "reel-new", event: "view" }, { id: "reel-film", event: "view" }]));
  });

  test("a tap on the far side goes on, the near side back; swiping down closes; the product's button is told", async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 860 });
    await page.goto("/stories-demo");
    await page.locator('[data-tree-node="bar"] [data-story="reel-new"]').click();
    const viewer = page.locator("dialog.pt-sv");
    const stage = viewer.locator(".pt-sv-stage");
    const box = (await stage.boundingBox())!;
    const link = viewer.locator(".pt-sv-link");
    // Right to left: the far side is the left.
    await page.keyboard.press(" ");
    await page.mouse.click(box.x + box.width * 0.15, box.y + box.height / 2);
    await expect(link).toHaveAttribute("href", "/shop?sort=new");
    await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
    await expect(link).toHaveAttribute("href", "/p/rose-dress");
    // Its press is told (the page itself isn't followed here: the dev server builds a page the first time it's asked).
    await page.evaluate(() => document.addEventListener("click", (e) => { if ((e.target as Element).closest(".pt-sv-link")) e.preventDefault(); }));
    await link.click();
    await expect.poll(async () => ((await (await page.request.get(`${API}/__test/story-events`)).json()) as Array<{ id: string; event: string }>).some((e) => e.id === "reel-new" && e.event === "tap")).toBe(true);
    // Swiping down closes.
    await page.goto("/stories-demo");
    await page.locator('[data-tree-node="bar"] [data-story="reel-film"]').click();
    const again = page.locator("dialog.pt-sv .pt-sv-stage");
    const b = (await again.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + 200);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + 420, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator("dialog.pt-sv")).toHaveCount(0);
  });
});
