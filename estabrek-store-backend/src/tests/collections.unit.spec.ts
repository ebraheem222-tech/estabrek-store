import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { bindTree, expandLists, itemAddress, listIdsOf, sortItems, type CollectionLite, type ItemLite } from "../lib/collectionTree.js";
import { checkItemData, CollectionBody, defaultStoreTemplate, defaultTemplate, PRESETS, STORE_TEMPLATES } from "../lib/collections.js";

// Content collections (W3): fields of their own, an item's page from one template, lists, and
// elements connected to fields.

const blog: CollectionLite = { id: "c1", slug: "blog", fields: PRESETS.blog.fields };
const items: ItemLite[] = [
  { id: "i1", slug: "spring", data: { title: { en: "Spring", ar: "الربيع" }, cover: "/a.jpg", date: "2026-03-01", excerpt: { en: "Light colours" } }, publishedAt: "2026-03-01", sort: 2 },
  { id: "i2", slug: "autumn", data: { title: { en: "Autumn" }, cover: "/b.jpg", date: "2026-09-01" }, publishedAt: "2026-09-01", sort: 1 },
];
type N = { id: string; type: string; props: Record<string, any>; style?: any; children?: N[] };
const card: N = { id: "card", type: "stack", props: {}, children: [
  { id: "pic", type: "image", props: { src: "/templates/photo-1.svg", bind: { src: "cover", href: "$url" } } },
  { id: "ttl", type: "heading", props: { text: { en: "Sample" }, bind: { text: "title" } } },
  { id: "go", type: "button", props: { label: { en: "Read" }, href: "/", bind: { href: "$url" } } },
] };
const page = (...children: N[]) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: {}, children }] } });
const list = (props: Record<string, unknown> = {}): N => ({ id: "list", type: "collectionList", props: { collectionId: "c1", ...props }, children: [structuredClone(card)] });
const ok = (t: unknown) => { const r = checkTree(t); return r.ok ? [] : r.issues.map((i) => `${i.path}: ${i.message}`); };

describe("collections", () => {
  test("every ready collection is valid, and its item page design passes the page check", () => {
    for (const [key, p] of Object.entries(PRESETS)) {
      expect(CollectionBody.safeParse({ slug: p.slug, name: p.name, fields: p.fields }).success, key).toBe(true);
      expect(ok(defaultTemplate({ slug: p.slug, fields: p.fields })), key).toEqual([]);
    }
  });

  test("addresses the shop uses, odd slugs and doubled fields are refused", () => {
    for (const bad of [{ slug: "shop" }, { slug: "Blog" }, { slug: "a/b" }, { fields: [{ id: "x", type: "text" }, { id: "x", type: "text" }] }, { fields: [{ id: "t", type: "select" }] }]) {
      expect(CollectionBody.safeParse({ slug: "blog", name: { en: "Blog" }, fields: PRESETS.blog.fields, ...bad }).success, JSON.stringify(bad)).toBe(false);
    }
  });

  test("an item's values are checked by their field's kind; unknown ones are dropped", () => {
    const r = checkItemData(PRESETS.blog.fields, { title: { en: "Hi" }, cover: "https://x.test/a.jpg", date: "2026-11-09T10:00:00Z", other: 1 });
    expect(r).toEqual({ ok: true, data: { title: { en: "Hi" }, cover: "https://x.test/a.jpg", date: "2026-11-09" } });
    const bad = checkItemData(PRESETS.blog.fields, { title: {}, cover: "javascript:alert(1)", date: "soon" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.issues.map((i) => i.field)).toEqual(["title", "cover", "date"]);
    expect(checkItemData(PRESETS.faq.fields, { question: { en: "Q" }, answer: { en: "A" }, topic: "nope" }).ok).toBe(false);
  });

  test("an item's page: connected elements take its values, the rest stay as designed", () => {
    const t = bindTree(page(structuredClone(card)) as never, items[0], blog) as any;
    const [pic, ttl, go] = t.root.children[0].children[0].children;
    expect(pic.props).toEqual({ src: "/a.jpg", href: "/blog/spring" });
    expect(ttl.props.text).toEqual({ en: "Spring", ar: "الربيع" });
    expect(go.props).toMatchObject({ label: { en: "Read" }, href: "/blog/spring" });
    expect(JSON.stringify(t)).not.toContain('"bind"');
    // A field of the wrong kind, or an empty one, leaves the element's own.
    const odd = bindTree(page({ id: "x", type: "heading", props: { text: { en: "Own" }, bind: { text: "cover" } } }) as never, items[0], blog) as any;
    expect(odd.root.children[0].children[0].props.text).toEqual({ en: "Own" });
    // Dates and numbers come in each language.
    const d = bindTree(page({ id: "d", type: "text", props: { text: { en: "" }, bind: { text: "date" } } }) as never, items[0], blog) as any;
    expect(d.root.children[0].children[0].props.text.en).toBe("1 March 2026");
  });

  test("a list draws its card once per item in its order, the first keeping the card's ids", () => {
    const data = new Map([["c1", { collection: blog, items }]]);
    const out = expandLists(page(list({ sort: "oldest", columns: 2 })) as never, data) as any;
    const grid = out.root.children[0].children[0];
    expect(grid.type).toBe("grid");
    expect(grid.style.base.columns).toBe(2);
    expect(grid.children.map((c: N) => c.children![1].props.text.en)).toEqual(["Spring", "Autumn"]);
    expect(grid.children[0].id).toBe("card");
    expect(grid.children[1].id).not.toBe("card");
    const ids = grid.children.flatMap((c: N) => [c.id, ...c.children!.map((k) => k.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(sortItems(items, "order", blog).map((i) => i.slug)).toEqual(["autumn", "spring"]);
    expect(expandLists(page(list({ limit: 1 })) as never, data).root.children![0].children![0].children).toHaveLength(1);
  });

  test("an empty list shows its card in the editor, its own words (or nothing) in the shop", () => {
    const none = new Map([["c1", { collection: blog, items: [] }]]);
    expect((expandLists(page(list()) as never, none, { preview: true }) as any).root.children[0].children[0].children[0].id).toBe("card");
    expect((expandLists(page(list({ empty: { en: "Soon" } })) as never, none) as any).root.children[0].children[0].children[0].props.text).toEqual({ en: "Soon" });
    expect((expandLists(page(list()) as never, none) as any).root.children[0].children[0].children).toEqual([]);
  });

  test("the page check takes lists and connections, and refuses odd ones; addresses split", () => {
    expect(ok(page(list({ limit: 6, sort: "newest", columns: 3 })))).toEqual([]);
    expect(ok(page({ id: "h", type: "heading", props: { text: { en: "x" }, bind: { text: "title", href: "$url" } } }))).toEqual([]);
    expect(ok(page({ id: "h", type: "heading", props: { text: { en: "x" }, bind: { colour: "title" } } }))).not.toEqual([]);
    expect(ok(page(list({ limit: 99 })))).not.toEqual([]);
    expect(listIdsOf(page(list()) as never)).toEqual(["c1"]);
    expect(itemAddress("/blog/spring")).toEqual({ collection: "blog", item: "spring" });
    expect(itemAddress("/blog")).toBeNull();
  });

  test("the product page and category page designs pass the page check, at addresses the shop never serves", () => {
    for (const kind of ["product", "category"] as const) {
      expect(ok(defaultStoreTemplate(kind)), kind).toEqual([]);
      expect(STORE_TEMPLATES[kind].slug.startsWith("/__")).toBe(true);
    }
    expect(JSON.stringify(defaultStoreTemplate("product"))).toContain('"productDetail"');
  });
});
