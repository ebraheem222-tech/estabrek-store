import { listProducts } from "@/lib/api";
import { formatMoney, getProductMinPrice, getProductPrimaryImage, type CatalogCategory, type CatalogProduct } from "@/lib/catalog";
import { getProductBadge, getProductSecondaryImage, type ProductBadge } from "@/lib/productBadges";

export type SeasonKey = "winter" | "spring";
export type SeasonProduct = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  secondaryImageUrl: string | null;
  priceText: string;
  badge: ProductBadge | null;
};
export type SeasonEdit = {
  key: SeasonKey;
  categoryName: string | null;
  href: string;
  products: SeasonProduct[];
};

/** Card data shared by the seasonal and collection scenes. */
export function toSeasonProduct(p: CatalogProduct, currencyCode: string): SeasonProduct {
  const imageUrl = getProductPrimaryImage(p);
  const price = getProductMinPrice(p);
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    imageUrl,
    secondaryImageUrl: getProductSecondaryImage(p, imageUrl),
    priceText: price != null ? formatMoney(price, currencyCode) : "",
    badge: getProductBadge(p),
  };
}

const MATCHERS: Record<SeasonKey, RegExp[]> = {
  winter: [/winter|شتو|شتاء/i],
  // A dedicated spring category wins; otherwise the summer edit stands in.
  spring: [/spring|ربيع/i, /summer|صيف/i],
};

function findCategory(categories: CatalogCategory[], key: SeasonKey) {
  for (const pattern of MATCHERS[key]) {
    const hit = categories.find((c) => pattern.test(c.slug) || pattern.test(c.name));
    if (hit) return hit;
  }
  return null;
}

/** Up to four pieces per season for the pinned winter → spring scene on the homepage. */
export async function loadSeasonalEdits(categories: CatalogCategory[], currencyCode: string): Promise<SeasonEdit[]> {
  const keys: SeasonKey[] = ["winter", "spring"];
  // Without seasonal categories in the catalog there is nothing to stage.
  if (!keys.some((key) => findCategory(categories, key))) return [];
  return Promise.all(
    keys.map(async (key) => {
      const category = findCategory(categories, key);
      if (!category) return { key, categoryName: null, href: "/shop", products: [] };
      const list = await listProducts({ categoryId: category.id, sort: "latest", page: 1, pageSize: 4, includeFacets: false, lite: true });
      const products = (list.items ?? []).slice(0, 4).map((p) => toSeasonProduct(p, currencyCode));
      return { key, categoryName: category.name, href: `/c/${encodeURIComponent(category.slug)}`, products };
    }),
  );
}
