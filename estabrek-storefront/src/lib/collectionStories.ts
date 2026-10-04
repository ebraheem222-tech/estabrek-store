import { listProducts } from "@/lib/api";
import { type CatalogCategory } from "@/lib/catalog";
import { toSeasonProduct, type SeasonProduct } from "@/lib/seasonalEdits";

export type StoryKey = "accessories" | "kids" | "incense";
export type StoryChapter = {
  key: StoryKey;
  categoryName: string;
  href: string;
  products: SeasonProduct[];
};

const ORDER: Array<[StoryKey, RegExp]> = [
  ["accessories", /accessor|إكسسوار|اكسسوار/i],
  ["kids", /kid|أطفال|اطفال|طفل/i],
  ["incense", /incense|بخور|مبخر|مباخر/i],
];

function findCategory(categories: CatalogCategory[], pattern: RegExp) {
  const matches = categories.filter((c) => pattern.test(c.slug) || pattern.test(c.name));
  // A top-level category also lists its children's products.
  return matches.find((c) => !c.parentId) ?? matches[0] ?? null;
}

/** Accessories → kids → incense chapters for the pinned collection scene, skipping missing categories. */
export async function loadCollectionStories(categories: CatalogCategory[], currencyCode: string): Promise<StoryChapter[]> {
  const found = ORDER.map(([key, pattern]) => ({ key, category: findCategory(categories, pattern) })).filter(
    (entry): entry is { key: StoryKey; category: CatalogCategory } => Boolean(entry.category),
  );
  return Promise.all(
    found.map(async ({ key, category }) => {
      const list = await listProducts({ categoryId: category.id, sort: "latest", page: 1, pageSize: 4, includeFacets: false, lite: true });
      return {
        key,
        categoryName: category.name,
        href: `/c/${encodeURIComponent(category.slug)}`,
        products: (list.items ?? []).slice(0, 4).map((p) => toSeasonProduct(p, currencyCode)),
      };
    }),
  );
}
