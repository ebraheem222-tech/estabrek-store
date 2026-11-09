import { expect, test } from "@playwright/test";
import { bindStore, categoryValues, productValues } from "../src/pageTree/storeBind";

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

test.describe("a product page from the store's design", () => {
  test.afterEach(async ({ request }) => {
    await request.post("http://127.0.0.1:4100/__test/store-template", { data: { kind: "product", page: null } });
  });

  test("the design is drawn for the product: its name in a connected heading, and its own buying box", async ({ page }) => {
    await page.request.post("http://127.0.0.1:4100/__test/store-template", { data: { kind: "product", page: design("product", [
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
});
