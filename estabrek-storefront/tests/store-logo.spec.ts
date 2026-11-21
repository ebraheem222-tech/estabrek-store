import { test, expect } from "@playwright/test";
import { usableLogo, withStoreLogo } from "../src/pageTree/storeLogo";
import type { PageTree } from "../src/pageTree/tree";

// A client changed the logo in Settings and its header kept the first one: the setup had copied the logo's address
// into the header's "Store logo". Drawn now with the store's logo as it is (pageTree/storeLogo.ts).
const API = "http://127.0.0.1:4100";
const OLD = "https://res.cloudinary.com/demo/image/upload/old-logo.jpg";
const NEW = "https://res.cloudinary.com/demo/image/upload/new-logo.png";
const header = (logo: Record<string, unknown>): PageTree =>
  ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "hdr", type: "section", props: { contained: true }, children: [{ id: "bar", type: "stack", props: {}, style: { base: { direction: "row", justify: "between" } }, children: [{ id: "logo", name: "Store logo", ...logo }, { id: "menu", type: "menu", props: { items: [{ label: { en: "Shop" }, href: "/shop" }], layout: "row" } }] }] }] } }) as unknown as PageTree;
const find = (t: PageTree, id: string): any => {
  const walk = (n: any): any => (n.id === id ? n : (n.children ?? []).map(walk).find(Boolean));
  return walk(t.root);
};

test("a logo picture takes the store's logo now; its own size and look stay", () => {
  const tree = header({ type: "image", props: { src: OLD, alt: { en: "Shop" }, href: "/" }, style: { base: { width: "120px" } } });
  const out = withStoreLogo(tree, NEW, "Shop");
  expect(find(out, "logo").props).toMatchObject({ src: NEW, href: "/" });
  expect(find(out, "logo").style.base.width).toBe("120px");
  // The saved design isn't touched.
  expect(find(tree, "logo").props.src).toBe(OLD);
  // The same logo already: the very same tree.
  expect(withStoreLogo(out, NEW, "Shop")).toBe(out);
});

test("the store's name as words becomes the logo once there is one; no logo, nothing changes", () => {
  const tree = header({ type: "button", props: { label: { en: "Shop" }, href: "/", variant: "link" } });
  const out = withStoreLogo(tree, NEW, "My shop");
  expect(find(out, "logo")).toMatchObject({ type: "image", props: { src: NEW, href: "/", alt: { en: "My shop" } } });
  for (const none of [null, "", "javascript:alert(1)", "http://plain.example/logo.png", 42]) expect(withStoreLogo(tree, none, "x")).toBe(tree);
  expect(usableLogo("/uploads/images/logo.png")).toBe("/uploads/images/logo.png");
  // Only the part named so: another picture stays.
  const other = header({ type: "image", props: { src: OLD } });
  find(other, "logo").name = "Hero picture";
  expect(withStoreLogo(other, NEW, "x")).toBe(other);
});

test("a store's own design shows the logo changed in Settings, not the one copied into its header", async ({ page }) => {
  const design = header({ type: "image", props: { src: OLD, alt: { en: "Logo Shop" }, href: "/" }, style: { base: { width: "150px", height: "64px", fit: "contain" } } });
  const theme = (await import("../src/storeThemes/registry")).themeById("mega-market");
  await page.request.post(`${API}/__test/owned-design`, { data: { name: "Logo Shop", logo: NEW, theme, mode: "light", regions: { header: design, footer: null }, page: { id: "owned-home", name: "Home", slug: "/", status: "PUBLISHED", format: 2, sections: [], tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [] } } } } });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en"] } });
  try {
    await page.goto("/en");
    const img = page.locator('[data-store-design-region="header"] [data-tree-node="logo"] img, [data-store-design-region="header"] img[data-tree-node="logo"]').first();
    await expect(img).toBeAttached();
    const src = await img.evaluate((el) => (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src);
    expect(decodeURIComponent(src)).toContain("new-logo");
    expect(decodeURIComponent(src)).not.toContain("old-logo");
  } finally {
    await page.request.post(`${API}/__test/owned-design`, { data: {} });
    await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en"] } });
  }
});
