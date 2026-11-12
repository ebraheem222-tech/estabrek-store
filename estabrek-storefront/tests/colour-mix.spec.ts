import { test, expect, type Page } from "@playwright/test";
import { addToMix, blendColours, dyePaint, dyeStops, meshBackground, recencyWeights } from "../src/lib/colourMix";

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
  // A scene holding the page's colours: the mesh steps aside, the page's colour comes back.
  await shell.evaluate((el) => { el.dataset.themeHeld = "true"; });
  await expect.poll(async () => (await layer()).opacity).toBe("0");
  expect((await layer()).page).not.toBe("rgba(0, 0, 0, 0)");
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
