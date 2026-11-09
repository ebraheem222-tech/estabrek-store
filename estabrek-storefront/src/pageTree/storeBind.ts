/**
 * The store's own page designs (W3; the API's lib/collections.ts STORE_TEMPLATES): one for every
 * product and one for every category. An element connects its words, picture or link to the
 * product's or category's values with `props.bind` (like to a collection's fields); here they're
 * filled for the page being drawn, in its language. A product list with the category "current"
 * shows the page's own category. Pure (tested).
 */
import type { PageTree, TreeNode } from "./tree";
import { formatMoney, getProductMinPrice, getProductPrimaryImage, type CatalogCategory, type CatalogProduct } from "@/lib/catalog";

type Lang = "ar" | "en" | "he";
type Kind = "words" | "src" | "href";
/** Each element prop's kind of value, and each value's. */
const PROP_KIND: Record<string, Kind> = { text: "words", label: "words", alt: "words", src: "src", href: "href" };
export const PRODUCT_VALUES: Record<string, Kind> = { title: "words", description: "words", price: "words", category: "words", image: "src", image2: "src", categoryUrl: "href" };
export const CATEGORY_VALUES: Record<string, Kind> = { title: "words", description: "words", image: "src" };
export const CURRENT_CATEGORY = "current";
const BINDABLE: Record<string, string[]> = { heading: ["text"], text: ["text"], button: ["label", "href"], image: ["src", "alt", "href"], video: ["src"] };

export type StoreValues = { values: Record<string, string | undefined>; kinds: Record<string, Kind>; url: string; categoryId?: string };

/** A product's values for its page. */
export function productValues(p: CatalogProduct): StoreValues {
  const pics = (p.items ?? []).flatMap((it) => (it.images ?? []).filter((im) => im?.url && im.view !== "3d" && !/\.(glb|gltf)(?:[?#]|$)/i.test(im.url)).map((im) => im.url as string));
  const min = getProductMinPrice(p);
  return {
    kinds: PRODUCT_VALUES,
    url: `/p/${encodeURIComponent(p.slug)}`,
    categoryId: p.category?.id,
    values: {
      title: p.title,
      description: typeof p.description === "string" ? p.description : undefined,
      price: min != null ? formatMoney(min, undefined) : undefined,
      category: p.category?.name,
      image: pics[0] ?? getProductPrimaryImage(p) ?? undefined,
      image2: pics[1],
      categoryUrl: p.category?.slug ? `/c/${encodeURIComponent(p.category.slug)}` : undefined,
    },
  };
}

/** A category's values for its page. */
export function categoryValues(c: CatalogCategory): StoreValues {
  const own = c as CatalogCategory & { description?: string | null; imageUrl?: string | null; image?: string | null };
  return { kinds: CATEGORY_VALUES, url: `/c/${encodeURIComponent(c.slug)}`, categoryId: c.id, values: { title: c.name, description: own.description ?? undefined, image: own.imageUrl ?? own.image ?? c.iconUrl ?? undefined } };
}

/** The design filled for one product or category, in the page's language; `bind` goes. */
export function bindStore(tree: PageTree, v: StoreValues, lang: Lang): PageTree {
  const walk = (n: TreeNode): TreeNode => {
    let props = n.props ?? {};
    const bind = props.bind as Record<string, string> | undefined;
    if (bind && typeof bind === "object") {
      const { bind: _bind, ...rest } = props;
      props = rest;
      for (const [prop, ref] of Object.entries(bind)) {
        if (!(BINDABLE[n.type] ?? []).includes(prop)) continue;
        const kind = PROP_KIND[prop];
        if (ref === "$url") { if (kind === "href") props = { ...props, href: v.url }; continue; }
        const value = v.values[ref];
        if (v.kinds[ref] !== kind) continue;
        // A value this product or category doesn't have: no words (the design's sample never shows as its own).
        if (!value) { if (kind === "words") props = { ...props, [prop]: {} }; continue; }
        props = { ...props, [prop]: kind === "words" ? { [lang]: value } : value };
      }
    }
    if (n.type === "products" && props.categoryId === CURRENT_CATEGORY) props = { ...props, categoryId: v.categoryId ?? "" };
    return { ...n, props, ...(n.children ? { children: n.children.map(walk) } : {}) };
  };
  return { ...tree, root: walk(tree.root) };
}
