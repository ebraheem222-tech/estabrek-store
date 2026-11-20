import { test, expect, type Page } from "@playwright/test";
import { importDesign } from "../src/storeThemes/kits/importDesign";
import type { TreeNode } from "../src/pageTree/tree";

// A store with its own design (a client's setup: a template's header, home and footer) draws three trees on each
// page. Each tree's style used to carry the shared base rules too, after the trees before it, so the footer's copy
// undid the header's and the page's own rules (same weight, later wins): Liberty Market's white header bar became
// a column with a white button and an invisible name, and the hero's two buttons fell one under the other.
// Now the layout writes the base rules once, before all three (app/[lang]/layout.tsx, cms/renderCmsPage.tsx).
const API = "http://127.0.0.1:4100";
test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 1366, height: 900 } });

const liberty = importDesign("reference-liberty-market")!;
const pageTree = { version: 1, root: { id: "page", type: "page", props: {}, children: liberty.sections } };

/** Every stack the template lays out in a row (on a wide screen), and where it is. */
function rows(node: TreeNode, out: string[] = []): string[] {
  const base = (node.style as { base?: { direction?: string } } | undefined)?.base;
  if (node.type === "stack" && base?.direction === "row") out.push(node.id);
  for (const child of node.children ?? []) rows(child, out);
  return out;
}

async function own(page: Page) {
  await page.request.post(`${API}/__test/owned-design`, {
    data: { name: "Liberty Shop", theme: liberty.design.theme, mode: "dark", regions: { header: liberty.design.header, footer: liberty.design.footer }, page: { id: "owned-home", name: "Home", slug: "/", status: "PUBLISHED", format: 2, sections: [], tree: pageTree } },
  });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en"] } });
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/owned-design`, { data: {} });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en"] } });
});

test("a template's header, page and footer each keep their own rules: rows stay rows, colours stay theirs", async ({ page }) => {
  await own(page);
  await page.goto("/en");
  const header = page.locator('[data-store-design-region="header"]');
  await expect(header.locator(".pt-menu").first()).toBeVisible();

  // The base rules once, before the trees; none of the trees' own styles repeats them.
  await expect(page.locator("style#page-tree-base")).toHaveCount(1);
  const repeats = await page.locator("style[data-page-tree]").evaluateAll((all) => all.filter((s) => (s.textContent ?? "").includes(".pt-stack{display:flex;flex-direction:column")).length);
  expect(repeats).toBe(0);

  // The header bar: one row, its name in the template's purple, its button purple with white words.
  const bar = header.locator(".pt-stack").first();
  expect(await bar.evaluate((el) => getComputedStyle(el).flexDirection)).toBe("row");
  const box = await bar.boundingBox();
  expect(box!.height, "a bar, not a column of its parts").toBeLessThan(130);
  const purple = "rgb(116, 83, 252)";
  expect(await header.locator(".pt-btn-link").first().evaluate((el) => getComputedStyle(el).color)).toBe(purple);
  const cta = header.locator(".pt-btn-solid").first();
  expect(await cta.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(purple);
  expect(await cta.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");

  // Every row of the template (header, page and footer) is drawn as a row.
  const ids = [...rows(liberty.design.header.root), ...rows(pageTree.root as TreeNode), ...rows(liberty.design.footer.root)];
  expect(ids.length).toBeGreaterThan(3);
  const drawn = await page.evaluate((list) => list.map((id) => {
    const el = document.querySelector(`[data-tree-node="${id}"]`);
    return [id, el ? getComputedStyle(el).flexDirection : "missing"];
  }), ids);
  const wrong = drawn.filter(([, d]) => d !== "row" && d !== "missing");
  expect(wrong, "rows drawn as something else").toEqual([]);
  await page.screenshot({ path: "test-results/region-styles-liberty.png", fullPage: false });
});

test("a store without its own design keeps the base rules in its page's style", async ({ page }) => {
  await page.request.post(`${API}/__test/owned-design`, { data: {} });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en"] } });
  await page.goto("/en");
  await expect(page.locator("style#page-tree-base")).toHaveCount(0);
  const styles = await page.locator("style[data-page-tree]").evaluateAll((all) => all.map((s) => (s.textContent ?? "").includes(".pt-stack{display:flex;flex-direction:column")));
  // The home page here is a tree page (the stand-in's), so its style carries the base rules itself.
  if (styles.length) expect(styles.some(Boolean)).toBe(true);
});
