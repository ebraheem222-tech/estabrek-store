import { test, expect, type Page } from "@playwright/test";
import { addToMix, blendColours, deepInk, dyePaint, dyeStops, flowPaint, hexToOklab, meshBackground, recencyWeights } from "../src/lib/colourMix";
import { mixPaints } from "../src/lib/mixPaints";

// Mixing the shopper's colours (lib/colourMix.ts): colours tapped on the shop's cards blend into the store's
// theme, the header wearing them as a gradient mesh; the small bag wears the colours of what's in it.
const ROSE = "#c97794", LILAC = "#a08cbd", BERRY = "#6b2446";
const headerBg = (page: Page) => page.locator(".atelier-header").evaluate((el) => getComputedStyle(el).backgroundColor);
const headerImage = (page: Page) => page.locator(".atelier-header").evaluate((el) => getComputedStyle(el).backgroundImage);
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

test("blends look right: mauve from rose and lilac, the newest weighs most, one colour stays itself", () => {
  expect(blendColours([ROSE])).toBe(ROSE);
  expect(blendColours([ROSE, ROSE])).toBe(ROSE);
  const mauve = blendColours([ROSE, LILAC]);
  expect(mauve).toBe("#b582b0");
  // The other order leans to rose.
  expect(blendColours([LILAC, ROSE])).not.toBe(mauve);
  expect(recencyWeights(3)).toEqual([0.2, 0.3, 0.5]);
  // Opposite colours don't cancel out to grey: the result keeps its colour.
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(blendColours(["#e0115f", "#11e092"]).slice(i, i + 2), 16));
  expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(40);
  // One pool per colour, over the blend.
  expect(meshBackground([ROSE, LILAC, BERRY]).match(/radial-gradient/g)).toHaveLength(3);
  // The mix: the newest last, once; three at most.
  expect(addToMix([ROSE, LILAC], ROSE)).toEqual([LILAC, ROSE]);
  expect(addToMix([ROSE, LILAC, BERRY], "#111111")).toEqual([LILAC, BERRY, "#111111"]);
  // The dyes: three stops for the scarf (the last repeated), a flowing paint for the pictures (none for one colour).
  expect(dyeStops([ROSE])).toEqual([ROSE, ROSE, ROSE]);
  expect(dyeStops([ROSE, LILAC])).toEqual([ROSE, LILAC, LILAC]);
  expect(dyePaint([ROSE])).toBe("none");
  expect(dyePaint([ROSE, LILAC, BERRY])).toBe(`linear-gradient(115deg, ${ROSE} 8%, ${LILAC} 50%, ${BERRY} 92%)`);
});

test("every mix makes readable paints: buttons in each colour's button colour, headings in their deep versions", () => {
  // Up to four colours flow, evenly; the same colour twice is one.
  expect(flowPaint([ROSE, LILAC, BERRY, "#214364"], 170)).toBe(`linear-gradient(170deg, ${ROSE} 8%, ${LILAC} 36%, ${BERRY} 64%, #214364 92%)`);
  expect(flowPaint([ROSE, ROSE])).toBe("none");
  // Deep ink: a light pick goes deep enough to read, keeping its hue; dark ones stay themselves.
  const luminance = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
  for (const light of ["#f48b90", "#cbf0ff", "#ffffff", "#deceb2"]) {
    const ink = deepInk(light);
    expect(hexToOklab(ink).L).toBeLessThan(0.405); // 0.4, give or take the hex's rounding
    // At least 6:1 on white.
    expect(1.05 / (luminance(ink) + 0.05)).toBeGreaterThan(6);
  }
  expect(deepInk("#000000")).toBe("#000000");
  expect(deepInk("#0a0e19")).toBe("#0a0e19");
  const pinkHue = Math.atan2(hexToOklab("#f48b90").b, hexToOklab("#f48b90").a), deepHue = Math.atan2(hexToOklab(deepInk("#f48b90")).b, hexToOklab(deepInk("#f48b90")).a);
  expect(Math.abs(pinkHue - deepHue)).toBeLessThan(0.15);
  // The real store's colours, light and dark, two and three: all four paints.
  for (const mix of [["#214364", "#4b1d2d"], ["#f48b90", "#cbf0ff"], ["#166353", "#b67d5a", "#450a21"], ["#deceb2", "#151515"], ["#000000", "#ffffff"]]) {
    const paints = mixPaints(mix);
    expect(Object.keys(paints).sort()).toEqual(["--mix-accent-paint", "--mix-decor-paint", "--mix-ink-paint", "--mix-soft-paint"]);
    expect(paints["--mix-accent-paint"]).toMatch(/^linear-gradient\(115deg/);
    expect(paints["--mix-ink-paint"]).toMatch(/^linear-gradient\(170deg/);
    expect(paints["--mix-soft-paint"]).toContain("radial-gradient");
  }
});

test("the whole page wears the mix: its background, the campaign photo and the film, and steps aside for a scene", async ({ page }) => {
  const mix = [ROSE, LILAC, BERRY];
  await page.addInitScript(([m, blend]) => {
    localStorage.setItem("estabrek_theme_mix", JSON.stringify(m));
    localStorage.setItem("estabrek_theme_color", blend);
    localStorage.setItem("estabrek_theme_seen", String(Date.now()));
  }, [mix, blendColours(mix)] as const);
  await page.goto("/");
  const shell = page.locator(".cinematic-shell");
  await expect(shell).toHaveAttribute("data-colour-mix", mix.join(" "));
  await expect(page.locator("html")).toHaveAttribute("data-colour-mix", mix.join(" "));
  // The page: a light mesh behind everything, its own colour clear above it.
  const layer = () => shell.evaluate((el) => { const s = getComputedStyle(el, "::before"); return { image: s.backgroundImage, opacity: s.opacity, position: s.position, page: getComputedStyle(el).backgroundColor }; });
  await expect.poll(async () => (await layer()).image).toContain("radial-gradient");
  expect(await layer()).toMatchObject({ position: "fixed", opacity: "1", page: "rgba(0, 0, 0, 0)" });
  // The campaign photo's dye flows through the colours.
  expect(await page.locator(".hero-campaign-tint").first().evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("linear-gradient");
  // The campaign film too.
  const film = page.locator(".rose-video-dye").first();
  await film.scrollIntoViewIfNeeded();
  await expect.poll(() => film.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("linear-gradient");
  // Buttons are filled with the colours flowing, big headings are written in them, the footer wears a soft mesh.
  const button = page.locator(".cinematic-shell .atelier-button.button-dark").first();
  const fill = () => button.evaluate((el) => getComputedStyle(el).backgroundImage);
  await expect.poll(fill).toContain("linear-gradient(115deg");
  const heading = page.locator(".rose-video-copy > h2").first();
  expect(await heading.evaluate((el) => { const s = getComputedStyle(el); return { image: s.backgroundImage.slice(0, 22), clip: s.backgroundClip || s.getPropertyValue("-webkit-background-clip"), fill: s.webkitTextFillColor }; }))
    .toEqual({ image: "linear-gradient(170deg", clip: "text", fill: "rgba(0, 0, 0, 0)" });
  expect(await page.locator(".atelier-footer").evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("radial-gradient");
  // The floating buttons outside the shell too, and the paints are on the page for them.
  expect(await page.locator("html").evaluate((el) => el.style.getPropertyValue("--mix-accent-paint"))).toContain("linear-gradient");
  // A scene holding the page's colours: the mesh steps aside, the page's colour comes back, and so do the
  // buttons' and headings' own colours.
  await shell.evaluate((el) => { el.dataset.themeHeld = "true"; });
  await expect.poll(async () => (await layer()).opacity).toBe("0");
  expect((await layer()).page).not.toBe("rgba(0, 0, 0, 0)");
  expect(await fill()).toBe("none");
  expect(await heading.evaluate((el) => getComputedStyle(el).webkitTextFillColor)).not.toBe("rgba(0, 0, 0, 0)");
});

test("colours tapped on the shop's cards blend; the header wears them as a mesh; a second tap keeps one", async ({ page }) => {
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  const shell = page.locator(".cinematic-shell");
  const tile = (name: string) => page.locator(".rose-product-tile").getByRole("button", { name, exact: true }).first();

  // One colour: the store in it, as before.
  await tile("Rose").click();
  await expect.poll(() => headerBg(page)).toBe(rgb(ROSE));
  await expect(shell).not.toHaveAttribute("data-colour-mix", /.*/);

  // A second colour blends with it; the header is a mesh of both.
  await tile("Lilac").click();
  const mauve = blendColours([ROSE, LILAC]);
  await expect.poll(() => headerBg(page)).toBe(rgb(mauve));
  await expect(shell).toHaveAttribute("data-colour-mix", `${ROSE} ${LILAC}`);
  await expect(shell).toHaveAttribute("data-storefront-color", mauve);
  await expect.poll(() => headerImage(page)).toContain("radial-gradient");
  // The dyes are told the colours the store now wears.
  const told = page.evaluate(() => new Promise<string[]>((resolve) => window.addEventListener("storefront-colours", (e) => resolve((e as CustomEvent<{ colours: string[] }>).detail.colours), { once: true })));
  await tile("Rose").click();
  expect(await told).toEqual([LILAC, ROSE]);
  await tile("Lilac").click();
  await expect(shell).toHaveAttribute("data-colour-mix", `${ROSE} ${LILAC}`);

  // The next page opens in the mix.
  await page.reload();
  await expect.poll(() => headerBg(page)).toBe(rgb(mauve));
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-colour-mix", `${ROSE} ${LILAC}`);

  // Tapping the newest colour again keeps it alone.
  await tile("Lilac").click();
  await expect.poll(() => headerBg(page)).toBe(rgb(LILAC));
  await expect(page.locator(".cinematic-shell")).not.toHaveAttribute("data-colour-mix", /.*/);
  expect(await headerImage(page)).toBe("none");
});

test("the small bag wears the colours of the pieces in it", async ({ page }) => {
  await page.goto("/p/rose-dress");
  // A rose dress already in the bag.
  await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }])));
  await page.reload();
  // The berry one added.
  await page.getByRole("radiogroup", { name: "اللون" }).getByRole("radio", { name: /Berry/ }).click();
  await page.locator(".rose-pdp-add").click();
  const panel = page.locator(".rose-minibag-panel");
  await expect(page.locator(".rose-minibag")).toHaveAttribute("data-open", "true");
  await expect(panel).toHaveAttribute("data-mixed", `${ROSE} ${BERRY}`);
  await expect(panel.locator(".rose-minibag-colours i")).toHaveCount(2);
  const mesh = await panel.evaluate((el) => getComputedStyle(el).getPropertyValue("--minibag-mesh"));
  expect(mesh.match(/radial-gradient/g)).toHaveLength(2);
  // Its head wears the mesh; its words stay readable on it.
  const head = await panel.locator(".rose-minibag-head").evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(head).toContain("radial-gradient");
});

test("the checkout wears the colours of what's in the bag, on that page only", async ({ page }) => {
  const LILAC_PICK = LILAC;
  await page.goto("/");
  await page.evaluate((own) => {
    localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }, { variantId: "berry-m", quantity: 2 }]));
    localStorage.setItem("estabrek_theme_color", own);
    localStorage.setItem("estabrek_theme_seen", String(Date.now()));
    localStorage.removeItem("estabrek_theme_mix");
  }, LILAC_PICK);
  await page.goto("/cart");
  // The most bought counts most (it goes last); the header, the page and the headings wear the mix.
  await expect(page.locator("html")).toHaveAttribute("data-colour-mix", `${ROSE} ${BERRY}`);
  await expect.poll(() => headerImage(page)).toContain("radial-gradient");
  await expect.poll(() => page.locator(".rose-cart-head > h1").evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("linear-gradient(170deg");
  // Her own colour isn't touched: the next page wears it again.
  expect(await page.evaluate(() => [localStorage.getItem("estabrek_theme_color"), localStorage.getItem("estabrek_theme_mix")])).toEqual([LILAC_PICK, null]);
  await page.goto("/shop");
  await expect(page.locator("html")).toHaveAttribute("data-storefront-color", LILAC_PICK);
  await expect(page.locator("html")).not.toHaveAttribute("data-colour-mix", /./);
});

test("a scene's colours take the header over a mix (the seasons' winter blue, not the mix)", async ({ page }) => {
  const mix = [ROSE, LILAC, BERRY];
  await page.addInitScript(([m, blend]) => {
    localStorage.setItem("estabrek_theme_mix", JSON.stringify(m));
    localStorage.setItem("estabrek_theme_color", blend);
    localStorage.setItem("estabrek_theme_seen", String(Date.now()));
  }, [mix, blendColours(mix)] as const);
  await page.goto("/");
  const shell = page.locator(".cinematic-shell");
  await expect(shell).toHaveAttribute("data-colour-mix", mix.join(" "));
  await expect.poll(() => headerImage(page)).toContain("radial-gradient");
  await shell.evaluate((el) => { el.dataset.themeHeld = "true"; });
  await expect.poll(() => headerImage(page)).toBe("none");
  await shell.evaluate((el) => { delete el.dataset.themeHeld; });
  await expect.poll(() => headerImage(page)).toContain("radial-gradient");
});
