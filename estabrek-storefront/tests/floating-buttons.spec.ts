import { test, expect, type Page } from "@playwright/test";
import { importDesign } from "../src/storeThemes/kits/importDesign";

// A client's shop on a phone (samoray1337.vercel.app): the chat's button was the assistant's own orange and purple
// picture, sitting on the bottom bar over «السلة», the accessibility button half on it too, and the bar kept its
// own navy whatever the template. Now the chat is one round button in the store's accent above the bar, the
// accessibility button above it, and the bar wears the theme (ChatWidget, MobileBottomNav, globals.css).
const API = "http://127.0.0.1:4100";
test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const liberty = importDesign("reference-liberty-market")!;
async function own(page: Page) {
  await page.request.post(`${API}/__test/floating`, { data: { bottomNav: true, chat: true, a11y: true } });
  await page.request.post(`${API}/__test/owned-design`, {
    data: { name: "Float Shop", theme: liberty.design.theme, mode: "dark", regions: { header: liberty.design.header, footer: liberty.design.footer }, page: { id: "owned-home", name: "Home", slug: "/", status: "PUBLISHED", format: 2, sections: [], tree: { version: 1, root: { id: "page", type: "page", props: {}, children: liberty.sections } } } },
  });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en"] } });
}
test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/floating`, { data: {} });
  await request.post(`${API}/__test/owned-design`, { data: {} });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en"] } });
});

/** A colour as the page computes it from a CSS value (a variable, a mix). */
const computed = (page: Page, css: string, prop: "color" | "backgroundColor" = "color") =>
  page.evaluate(([value, p]) => {
    const probe = document.createElement("div");
    probe.style[p as "color"] = value;
    document.body.appendChild(probe);
    const out = getComputedStyle(probe)[p as "color"];
    probe.remove();
    return out;
  }, [css, prop] as const);

test("on a phone: the chat in the store's accent above the bottom bar, the accessibility button above the chat, the bar in the theme", async ({ page }) => {
  await own(page);
  await page.goto("/en");
  const nav = page.locator(".mobile-bottom-nav");
  const chat = page.getByTestId("assistant-launcher");
  await expect(nav).toBeVisible();
  await expect(chat).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-bottom-nav", "");

  const navBox = (await nav.boundingBox())!;
  const chatBox = (await chat.boundingBox())!;
  expect(chatBox.y + chatBox.height, "the chat ends above the bar").toBeLessThanOrEqual(navBox.y);
  expect(chatBox.width).toBeLessThanOrEqual(56);

  // The store's accent, with words that read on it.
  const accent = await computed(page, "var(--th-accent)", "backgroundColor");
  expect(await chat.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(accent);
  expect(await chat.locator("img").count(), "no picture of its own colours").toBe(0);

  // The accessibility button stands above the chat, not on it nor on the bar.
  const a11y = page.locator(".a11y-fab");
  if (await a11y.count()) {
    const a = (await a11y.boundingBox())!;
    expect(a.y + a.height, "accessibility above the chat").toBeLessThanOrEqual(chatBox.y + 1);
  }

  // The bar wears the theme: its active item in the accent, its words the theme's muted.
  const active = nav.locator(".mobile-nav-item.active").first();
  if (await active.count()) expect(await active.evaluate((el) => getComputedStyle(el).color)).toBe(await computed(page, "var(--th-accent)"));
  expect(await nav.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe("none");
  await page.screenshot({ path: "test-results/floating-buttons-phone.png" });
});

test("opened, the chat's panel stays above the bar too", async ({ page }) => {
  await page.goto("/en");
  await page.getByTestId("assistant-launcher").click();
  const navBox = (await page.locator(".mobile-bottom-nav").boundingBox())!;
  const root = (await page.locator(".chat-widget-root").boundingBox())!;
  expect(root.y + root.height).toBeLessThanOrEqual(navBox.y + 1);
});

test("the live chat (the assistant off): its button in the store's accent above the bar, the accessibility button above it; scroll-to-top above the bar", async ({ page }) => {
  await page.request.post(`${API}/__test/floating`, { data: { bottomNav: true, chat: false, liveChat: true, a11y: true, toTop: true } });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms:settings", "cms:bootstrap"], paths: ["/", "/en"] } });
  const nav = page.locator(".mobile-bottom-nav");
  const live = page.locator(".live-chat-button");
  // The stand-in's settings reach the page once the shop's cache lets go of the earlier ones: opened again until then.
  await expect(async () => {
    await page.goto("/en");
    await expect(live).toBeVisible({ timeout: 4000 });
  }).toPass({ timeout: 45_000 });
  await expect(page.getByTestId("assistant-launcher")).toHaveCount(0);
  const navBox = (await nav.boundingBox())!;
  // The buttons glide to their place (their transitions move `bottom` and `transform`): measured once settled.
  const bottomOf = (l: typeof live) => async () => {
    const b = await l.boundingBox();
    return b ? b.y + b.height : Infinity;
  };
  await expect.poll(bottomOf(live), { message: "the live chat ends above the bar" }).toBeLessThanOrEqual(navBox.y + 1);
  const liveBox = (await live.boundingBox())!;
  expect(liveBox.width).toBeLessThanOrEqual(48);
  expect(await live.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe("none");
  expect(await live.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await computed(page, "var(--th-accent)", "backgroundColor"));
  const a = (await page.locator(".a11y-fab").boundingBox())!;
  expect(a.y + a.height, "accessibility above the live chat").toBeLessThanOrEqual(liveBox.y + 1);
  // Scrolled down: the scroll-to-top button shows above the bar, in the accent.
  await page.mouse.wheel(0, 2400);
  const top = page.locator(".scroll-to-top.visible");
  await expect(top).toBeVisible();
  await expect.poll(bottomOf(top), { message: "scroll-to-top above the bar" }).toBeLessThanOrEqual(navBox.y + 1);
  expect(await top.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe("none");
  await page.screenshot({ path: "test-results/floating-live-chat-phone.png" });
});

test("a themed store takes every accent from its theme, not the Rose design's two colours (the scroll progress bar too)", async ({ page }) => {
  await page.request.post(`${API}/__test/floating`, { data: { bottomNav: true, progress: true, accent: "#8b5cf6", accent2: "#f59e0b" } });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms:settings", "cms:bootstrap"], paths: ["/", "/en"] } });
  const bar = page.locator(".scroll-progress-bar");
  await expect(async () => {
    await page.goto("/en");
    await expect(bar).toBeAttached({ timeout: 4000 });
  }).toPass({ timeout: 45_000 });
  // No Rose colour put on the page itself.
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue("--accent"))).toBe("");
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
  const strong = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--th-strong").trim());
  expect(accent).toBe(strong);
  const image = await bar.evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(image).not.toContain("139, 92, 246");
  expect(image).not.toContain("245, 158, 11");
});

