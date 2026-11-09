import { expect, test } from "@playwright/test";
import { bindStore, categoryValues, productValues } from "../src/pageTree/storeBind";
import { importDesign } from "../src/storeThemes/kits/importDesign";

// The store's own product and category page designs (W3): made once in the editor, filled for
// every product and category with their own values.

const design = (kind: "product" | "category", children: unknown[]) => ({
  id: `${kind}-design`, name: `${kind} page`, slug: `/__${kind}-page`, kind: `${kind}Template`, status: "PUBLISHED", format: 2, sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "main", type: "section", props: { contained: true }, children }] } },
});

test.describe("store page designs as data", () => {
  test("a product's and a category's values fill connected elements in the page's language", () => {
    const tree = design("product", [
      { id: "h", type: "heading", props: { text: { en: "Name" }, bind: { text: "title" } } },
      { id: "p", type: "text", props: { text: { en: "Price" }, bind: { text: "price" } } },
      { id: "i", type: "image", props: { src: "/x.svg", bind: { src: "image", href: "$url" } } },
      { id: "c", type: "button", props: { label: { en: "Category" }, href: "/", bind: { label: "category", href: "categoryUrl" } } },
      { id: "l", type: "products", props: { source: "category", categoryId: "current", limit: 4 } },
      { id: "x", type: "heading", props: { text: { en: "Own" }, bind: { text: "image" } } },
    ]).tree as any;
    const product = { id: "p1", slug: "rose-dress", title: "Rose dress", minPrice: 320, category: { id: "dresses", slug: "dresses", name: "Dresses" }, items: [{ id: "a", images: [{ url: "/a.jpg" }, { url: "/b.jpg" }] }] } as any;
    const out = bindStore(tree, productValues(product), "en") as any;
    const [h, p, i, c, l, x] = out.root.children[0].children;
    expect(h.props).toEqual({ text: { en: "Rose dress" } });
    expect(p.props.text.en).toMatch(/320/);
    expect(i.props).toEqual({ src: "/a.jpg", href: "/p/rose-dress" });
    expect(c.props).toMatchObject({ label: { en: "Dresses" }, href: "/c/dresses" });
    expect(l.props.categoryId).toBe("dresses");
    // A value of the wrong kind leaves the element's own.
    expect(x.props.text).toEqual({ en: "Own" });
    // A product without a description: no words, never the design's sample sentence.
    const noText = bindStore(design("product", [{ id: "d", type: "text", props: { text: { en: "The product's description" }, bind: { text: "description" } } }]).tree as any, productValues(product), "en") as any;
    expect(noText.root.children[0].children[0].props.text).toEqual({});
    const cat = bindStore(design("category", [{ id: "h", type: "heading", props: { text: { en: "x" }, bind: { text: "title" } } }]).tree as any, categoryValues({ id: "d", slug: "dresses", name: "فساتين" }), "ar") as any;
    expect(cat.root.children[0].children[0].props.text).toEqual({ ar: "فساتين" });
  });
});

const API = "http://127.0.0.1:4100";
const reset = async (request: import("@playwright/test").APIRequestContext) => {
  await request.post(`${API}/__test/store-template`, { data: { kind: "product", page: null } });
  await request.post(`${API}/__test/store-template`, { data: { kind: "category", page: null } });
  await request.post(`${API}/__test/owned-design`, { data: {} });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages"], paths: ["/"] } });
};

test.describe("a product page from the store's design", () => {
  test.afterEach(async ({ request }) => reset(request));

  test("in a store on its own design, the design is drawn for the product: its name in a connected heading, and its own buying box", async ({ page, request }) => {
    // A store running on its own design (header.storeDesign.mode "cms").
    const own = importDesign("fashion-quiet")!;
    const prefix = (tree: any, region: string) => {
      let i = 0;
      const walk = (n: any): any => ({ ...n, id: `${region}_${i++}`, ...(n.children ? { children: n.children.map(walk) } : {}) });
      return { ...tree, root: walk(tree.root) };
    };
    await request.post(`${API}/__test/owned-design`, { data: { name: "Paper Shop", theme: own.design.theme, regions: { header: prefix(own.design.header, "header"), footer: prefix(own.design.footer, "footer") }, page: { id: "owned-home", name: "Home", slug: "/", status: "PUBLISHED", format: 2, sections: [], tree: { version: 1, root: { id: "page", type: "page", props: {}, children: own.sections } } } } });
    await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages"], paths: ["/"] } });
    await page.request.post(`${API}/__test/store-template`, { data: { kind: "product", page: design("product", [
      { id: "banner", type: "heading", props: { level: 1, text: { en: "Product name here" }, bind: { text: "title" } } },
      { id: "detail", type: "productDetail", props: {} },
      { id: "note", type: "text", props: { text: { en: "Made with care in our studio" } } },
    ]) } });
    await page.goto("/en/p/rose-dress");
    const banner = page.locator('[data-tree-node="banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).not.toHaveText("Product name here");
    await expect(page.locator('[data-tree-node="note"]')).toHaveText("Made with care in our studio");
    // The product's own pictures, choices and add-to-cart, inside the design.
    await expect(page.locator('[data-tree-node="detail"] button').first()).toBeVisible();
    await expect(page.locator(".pt-product-detail-empty")).toHaveCount(0);
  });

  test("a rose store keeps its rose product and category pages, even with designs published in the editor", async ({ page, request }) => {
    await request.post(`${API}/__test/store-template`, { data: { kind: "product", page: design("product", [{ id: "banner", type: "heading", props: { level: 1, text: { en: "Product name here" }, bind: { text: "title" } } }]) } });
    await request.post(`${API}/__test/store-template`, { data: { kind: "category", page: design("category", [{ id: "cat-banner", type: "heading", props: { level: 1, text: { en: "The category" }, bind: { text: "title" } } }]) } });
    await page.goto("/p/rose-dress");
    await expect(page.locator(".rose-pdp")).toBeVisible();
    await expect(page.locator('[data-tree-node="banner"]')).toHaveCount(0);
    await page.goto("/c/dresses");
    await expect(page.locator(".rose-category-intro")).toBeVisible();
    await expect(page.locator('[data-tree-node="cat-banner"]')).toHaveCount(0);
    // The category's own colour stays in its opening: the header keeps the store's.
    const shell = page.locator(".cinematic-shell");
    await expect(shell).not.toHaveAttribute("data-navbar-color", /.+/);
    await expect.poll(() => page.locator(".rose-category-intro").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--selection-accent"))).not.toBe("");
  });
});
