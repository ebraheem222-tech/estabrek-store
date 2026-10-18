import { test, expect } from "@playwright/test";
import { storefrontPalette } from "../src/lib/storefrontPalette";

function contrast(a: string, b: string) {
  const luminance = (color: string) => {
    const channels = color.startsWith("#")
      ? [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
      : color.match(/[\d.]+/g)!.slice(0, 3).map(n => Number(n) * (color.startsWith("color(srgb") ? 255 : 1));
    const rgb = channels.map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

test("light, dark and saturated selections keep surfaces and controls readable", () => {
  for (const seed of ["#ffffff", "#000000", "#eee0d5", "#a08cbd", "#6b2446", "#ffef00", "#103450", "#ff0000", "#00ff00"]) {
    const palette = storefrontPalette(seed);
    expect(contrast(palette["--navbar-ink"], seed), `navbar ${seed}`).toBeGreaterThanOrEqual(4.5);
    for (const surface of ["--selection-page", "--selection-surface", "--selection-soft"]) {
      expect(contrast(palette["--selection-ink"], palette[surface]), `text ${seed}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette["--selection-muted"], palette[surface]), `secondary text ${seed}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette["--selection-accent"], palette[surface]), `accent ${seed}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("light selections retain visible field boundaries", () => {
  for (const seed of ["#ffffff", "#eee0d5", "#a08cbd"]) {
    const palette = storefrontPalette(seed);
    for (const surface of ["--selection-page", "--selection-surface", "--selection-soft"]) {
      expect(contrast(palette["--selection-control-line"] || palette["--selection-line"], palette[surface])).toBeGreaterThanOrEqual(3);
    }
  }
});

test("home keeps its surface while scrolling and places the fabric after products", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".rose-opening")).toHaveAttribute("data-motion", "true");
  const background = await page.locator(".cinematic-shell").evaluate(el => getComputedStyle(el).backgroundColor);
  await page.locator('[data-cms-section="collections"]').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator(".cinematic-shell").evaluate(el => getComputedStyle(el).backgroundColor)).toBe(background);
  await expect(page.locator(".rose-opening .design-study")).toHaveCount(0);
  expect(await page.locator(".design-study").evaluate(el => Boolean(document.querySelector('[data-cms-section="products"]')!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
});

test("fabric selection coordinates the full theme and survives later scroll chapters", async ({ page }) => {
  await page.goto("/");
  await page.locator(".design-study").scrollIntoViewIfNeeded();
  const background = await page.locator(".cinematic-shell").evaluate(el => getComputedStyle(el).backgroundColor);
  await page.getByRole("button", { name: "Lilac", exact: true }).click();
  await expect.poll(() => page.locator(".atelier-header").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(160, 140, 189)");
  await expect.poll(() => page.locator(".cinematic-shell").evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(background);
  const selectedBackground = await page.locator(".cinematic-shell").evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => {
    const el = document.querySelector(".design-study")!;
    scrollTo(0, scrollY + el.getBoundingClientRect().top + el.clientHeight - innerHeight - 20);
  });
  await expect(page.locator(".design-study")).toHaveAttribute("data-chapter", "2");
  await expect(page.locator(".model-stage")).toHaveAttribute("data-color", "Lilac");
  expect(await page.locator(".cinematic-shell").evaluate(el => getComputedStyle(el).backgroundColor)).toBe(selectedBackground);
  expect(await page.locator(".atelier-header").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(160, 140, 189)");
});

test("shop selection coordinates backgrounds, buttons, filters and footer without recoloring swatches", async ({ page }) => {
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  const surfaces = [".cinematic-shell", ".rose-shop-intro", ".rose-product-add>button", ".filters-sidebar .filters-container", ".atelier-footer"];
  const styles = () => Promise.all(surfaces.map(selector => page.locator(selector).first().evaluate(el => {
    const style = getComputedStyle(el);
    return [style.backgroundColor, style.backgroundImage, style.color];
  })));
  const before = await styles();
  const productImage = await page.locator(".rose-product-tile").first().locator("img").getAttribute("src");
  await page.locator(".rose-product-tile").first().getByRole("button", { name: "Rose", exact: true }).click();
  await expect.poll(() => page.locator(".atelier-header").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(201, 119, 148)");
  // The header now moves with the page instead of trailing it: wait for the whole glide to end.
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-gliding", /.*/);
  const after = await styles();
  surfaces.forEach((selector, index) => expect(after[index], selector).not.toEqual(before[index]));
  await page.evaluate(() => scrollTo(0, 0));
  expect(await styles()).toEqual(after);
  await expect(page.locator(".rose-product-tile").first().getByRole("button", { name: "Rose", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(".rose-product-tile").first().locator("img").getAttribute("src")).toBe(productImage);
  const swatch = await page.locator(".rose-product-tile").first().getByRole("button", { name: "Rose", exact: true }).evaluate(el => getComputedStyle(el, "::after").backgroundColor);
  expect(swatch).toBe("rgb(201, 119, 148)");
});

test("product detail and quick view swatches both update the navbar", async ({ page }) => {
  await page.goto("/p/rose-dress");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-color-selection-ready", "true");
  await page.locator('button.color-swatch[title="Rose"]').first().click();
  await expect.poll(() => page.locator(".atelier-header").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(201, 119, 148)");
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "معاينة فستان الورد", exact: true }).click();
  await page.locator('.rose-sheet button.color-swatch[title="Berry"]').click();
  await expect.poll(() => page.locator(".atelier-header").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(107, 36, 70)");
  expect(await page.locator(".atelier-header .atelier-brand").evaluate(el => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");
  const palette = await page.locator(".rose-sheet").evaluate(el => {
    const style = getComputedStyle(el);
    return [style.backgroundColor, getComputedStyle(document.querySelector(".cinematic-shell")!).getPropertyValue("--selection-surface").trim()];
  });
  expect(contrast(palette[0], palette[1])).toBeLessThan(1.01);
  const button = await page.locator(".rose-sheet .rose-pdp-add").evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
  expect(contrast(button[0], button[1])).toBeGreaterThanOrEqual(4.5);
  await expect(page.locator(".rose-sheet .rose-pdp-sizes button.active")).toBeVisible();
  // Global panels must stay readable even with ThemeWrap's inline dark text alias.
  await page.evaluate(() => document.documentElement.style.setProperty("--text", "#F7F4E9"));
  for (const seed of ["#ffffff", "#eee0d5", "#a08cbd"]) {
    await page.evaluate(color => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail:color })), seed);
    const size = await page.locator(".rose-sheet .rose-pdp-sizes button.active").evaluate(el => {
      const style = getComputedStyle(el);
      return { text:style.color, background:style.backgroundColor, gradient:style.backgroundImage };
    });
    const stops = size.gradient.match(/(?:rgba?|color)\([^)]*\)/g) || [size.background];
    stops.forEach(stop => expect(contrast(size.text, stop), `selected size ${seed}`).toBeGreaterThanOrEqual(4.5));
    const swatch = await page.locator(".rose-sheet .rose-pdp-swatch.active").evaluate(el => [getComputedStyle(el).borderColor, getComputedStyle(document.querySelector(".rose-sheet")!).backgroundColor]);
    expect(contrast(swatch[0], swatch[1]), `selected swatch ${seed}`).toBeGreaterThanOrEqual(3);
  }
});

test("about keeps its scroll palettes and tablet filters remain usable", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-rose-tone", "light");
  const background = await page.locator(".cinematic-shell").evaluate(el => getComputedStyle(el).backgroundColor);
  await page.locator(".rose-about-finale").scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator(".cinematic-shell").evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(background);
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/shop");
  await page.getByRole("button", { name: "الفلاتر", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "الفلاتر", exact: true });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: /Lilac/ }).click();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(page).toHaveURL(/colors=Lilac/);
  await expect(page.locator(".rose-product-tile")).toHaveCount(1);
});

test("desktop shoppers can filter child categories from the sidebar", async ({ page }) => {
  await page.goto("/shop");
  const sidebar = page.locator(".filters-sidebar");
  await sidebar.getByRole("button", { name: "Expand", exact: true }).click();
  await sidebar.getByRole("button", { name: "حجاب يومي", exact: true }).click();
  await expect(page).toHaveURL(/categoryId=daily-hijabs/);
});

test("mobile filters stay below the category row without overlapping it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 820]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");
    const categories = await page.locator(".rose-shop-categories").boundingBox();
    const toggle = await page.getByRole("button", { name: "الفلاتر", exact: true }).boundingBox();
    expect(categories).not.toBeNull();
    expect(toggle).not.toBeNull();
    expect(toggle!.y).toBeGreaterThanOrEqual(categories!.y + categories!.height);
    expect(toggle!.x).toBeGreaterThanOrEqual(0);
    expect(toggle!.x + toggle!.width).toBeLessThanOrEqual(width);
  }
});

test("global accessibility controls keep readable selected-theme surfaces", async ({ page }) => {
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  await page.locator(".rose-product-tile").first().getByRole("button", { name: "Rose", exact: true }).click();
  await page.getByRole("button", { name: "أدوات إمكانية الوصول", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "أدوات إمكانية الوصول", exact: true });
  const colors = await panel.evaluate(el => {
    const label = el.querySelector(".a11y-toggle-label")!;
    const description = el.querySelector(".a11y-toggle-desc")!;
    const background = getComputedStyle(el).backgroundColor;
    return [getComputedStyle(label).color, getComputedStyle(description).color, background];
  });
  expect(contrast(colors[0], colors[2])).toBeGreaterThanOrEqual(4.5);
  expect(contrast(colors[1], colors[2])).toBeGreaterThanOrEqual(4.5);
});

test("the chosen colour theme follows the shopper to other pages, except About", async ({ page }) => {
  const header = () => page.locator(".atelier-header").evaluate(el => getComputedStyle(el).backgroundColor);
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  await page.locator(".rose-product-tile").first().getByRole("button", { name: "Berry", exact: true }).click();
  await expect.poll(header).toBe("rgb(107, 36, 70)");
  await page.goto("/contact");
  await expect.poll(header).toBe("rgb(107, 36, 70)");
  await page.goto("/");
  await expect.poll(header).toBe("rgb(107, 36, 70)");
  await page.goto("/about");
  await expect(page.locator(".cinematic-shell")).not.toHaveAttribute("data-storefront-color", /.+/);
  await page.goto("/shop");
  await expect.poll(header).toBe("rgb(107, 36, 70)");
});

test("the hero campaign photo takes the chosen colour and keeps its own by default", async ({ page }) => {
  await page.goto("/");
  const tint = page.locator(".hero-campaign-tint");
  await expect(tint).toHaveCount(1);
  expect(await tint.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#2f3b57" })));
  await expect.poll(() => tint.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(47, 59, 87)");
  expect(await tint.evaluate(el => getComputedStyle(el).mixBlendMode)).toBe("color");
});

test("a product page takes the piece's colour on its own", async ({ page }) => {
  const header = () => page.locator(".atelier-header").evaluate(el => getComputedStyle(el).backgroundColor);
  // No colour chosen yet: the page opens in the piece's first colour, no tap needed.
  await page.goto("/p/rose-dress");
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", "#c97794");
  await expect.poll(header).toBe("rgb(201, 119, 148)");
  await expect(page.locator('button.color-swatch[title="Rose"]').first()).toHaveAttribute("aria-checked", "true");
  // The shopper's own colour wins when the piece comes in it.
  await page.locator('button.color-swatch[title="Berry"]').first().click();
  await expect.poll(header).toBe("rgb(107, 36, 70)");
  await page.reload();
  await expect(page.locator('button.color-swatch[title="Berry"]').first()).toHaveAttribute("aria-checked", "true");
  await expect.poll(header).toBe("rgb(107, 36, 70)");
});

test("a colour pick moves the header and the page together", async ({ page }) => {
  await page.goto("/p/rose-dress");
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", /#/);
  await page.waitForTimeout(900);
  // Sample the header against the page colour on every frame of the glide.
  const worst = await page.evaluate(() => new Promise<number>((resolve) => {
    const shell = document.querySelector<HTMLElement>(".cinematic-shell")!;
    const header = document.querySelector<HTMLElement>(".atelier-header")!;
    const rgb = (v: string) => (v.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const hex = (v: string) => v.startsWith("#") ? [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) : rgb(v);
    let max = 0;
    const t0 = performance.now();
    document.querySelector<HTMLButtonElement>('button.color-swatch[title="Berry"]')!.click();
    const loop = () => {
      const page = hex(getComputedStyle(shell).getPropertyValue("--navbar-bg").trim());
      const shown = rgb(getComputedStyle(header).backgroundColor);
      max = Math.max(max, ...page.map((c, i) => Math.abs(c - shown[i])));
      if (performance.now() - t0 < 1200) requestAnimationFrame(loop); else resolve(max);
    };
    requestAnimationFrame(loop);
  }));
  expect(worst).toBeLessThanOrEqual(2);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-gliding", /.*/);
});

test("a colour pick on the home page cross-fades in one step", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-color-selection-ready", "true");
  const supported = await page.evaluate(() => typeof (document as any).startViewTransition === "function");
  test.skip(!supported, "this browser has no view transitions; the colour glides instead");
  // Count style recalculation work: the new colours must land in one go, not frame by frame.
  const crossfading = page.locator("html[data-theme-crossfade]");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#6b2446" })));
  await expect(crossfading).toHaveCount(1);
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", "#6b2446");
  expect(await page.locator(".cinematic-shell").evaluate(el => getComputedStyle(el).getPropertyValue("--selection-seed").trim())).toBe("#6b2446");
  await expect(crossfading).toHaveCount(0);
  await expect.poll(() => page.locator(".atelier-header").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(107, 36, 70)");
});

test("search and about show their page shape at once while they load", async ({ page }) => {
  await page.goto("/contact");
  await page.waitForLoadState("networkidle");
  // Hold the server answer for the search page so the loading screen is visible.
  await page.route((url) => url.pathname === "/search", async (route) => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
  await page.evaluate(() => (window as any).next?.router?.push("/search?q=%D9%81%D8%B3%D8%AA%D8%A7%D9%86"));
  await expect(page.locator(".rose-search-skeleton")).toBeVisible();
  await expect(page.locator(".rose-search-skeleton")).toHaveCount(0, { timeout: 30000 });
});

test("a product's own colour stays on its page; only a real pick follows the shopper", async ({ page }) => {
  await page.goto("/p/rose-dress");
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", "#c97794");
  expect(await page.evaluate(() => localStorage.getItem("estabrek_theme_color"))).toBeNull();
  await page.goto("/");
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-color-selection-ready", "true");
  await expect(page.locator(".cinematic-shell")).not.toHaveAttribute("data-storefront-color", /.+/);
});

test("white and ivory do not wash the photos out to grey", async ({ page }) => {
  await page.goto("/");
  const tint = page.locator(".hero-campaign-tint");
  await expect(tint).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#f5f0e6" })));
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", "#f5f0e6");
  expect(await tint.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  await expect(page.locator(".rose-video-dye")).not.toHaveAttribute("data-on", "true");
  // A real colour still dyes them.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#2f3b57" })));
  await expect.poll(() => tint.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(47, 59, 87)");
  await expect(page.locator(".rose-video-dye")).toHaveAttribute("data-on", "true");
});

test("a colour saved by the old version (maybe a product's own) is dropped once", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("estabrek_theme_color", "#ffffff");
    localStorage.removeItem("estabrek_theme_seen");
  });
  await page.goto("/shop");
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-color-selection-ready", "true");
  await expect(page.locator(".cinematic-shell")).not.toHaveAttribute("data-storefront-color", /.+/);
  expect(await page.evaluate(() => localStorage.getItem("estabrek_theme_color"))).toBeNull();
});

test("a colour picked in another tab reaches the home page left open", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-color-selection-ready", "true");
  const other = await context.newPage();
  await other.goto("/p/rose-dress");
  await expect(other.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", "#c97794");
  await other.locator('button.color-swatch[title="Berry"]').first().click();
  await expect(other.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", "#6b2446");
  await page.bringToFront();
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", "#6b2446");
  await expect.poll(() => page.locator(".atelier-header").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(107, 36, 70)");
  // The product page left open keeps the piece's own colour when another tab picks.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#2f3b57" })));
  await other.bringToFront();
  await other.waitForTimeout(500);
  await expect(other.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", "#6b2446");
});
