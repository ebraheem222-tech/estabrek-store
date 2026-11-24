import { getBootstrap, getPublicSettings, listCategories, listProducts } from "@/lib/api";
import { formatMoney, getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";
import { RoseHome } from "@/components/cinematic/RoseHome";
import ProductCard from "@/components/ProductCard";
import { QuickAddButton } from "@/components/QuickAddButton";
import type { CmsSection, ProductMini } from "@/cms/types";
import { langConfigOf } from "@/lib/i18n";
import { storeThemeOf } from "@/storeThemes";
import { ThemedHome } from "@/storeThemes/home/ThemedHome";
import { stageOptionsOf } from "@/storeThemes/three/kinds";
import { getProductBadge, getProductSecondaryImage } from "@/lib/productBadges";
import { loadSeasonalEdits } from "@/lib/seasonalEdits";
import { loadCollectionStories } from "@/lib/collectionStories";
import LegacyFallbackHome from "@/components/LegacyFallbackHome";
import type { Lang } from "@/lib/i18n";
import { localizeCategories } from "@/lib/localize";

/**
 * The home when the store has none of its own published: the rose home for the store that wears the rose
 * design; any other store gets its theme's home (its opening, its newest products and its categories), never
 * the rose design's film, guide and pictures.
 */
export default async function FallbackHome({ lang }: { lang?: Lang } = {}) {
  if (process.env.ESTABREK_HOME_MODE === "cms") return <LegacyFallbackHome />;
  const [bootstrap, categories, catalog, settings] = await Promise.all([
    getBootstrap(),
    listCategories(),
    listProducts({
      lang,
      sort: "latest",
      page: 1,
      pageSize: 4,
      includeFacets: false,
      lite: true,
    }),
    getPublicSettings().catch(() => null),
  ]);
  const currencyCode = bootstrap.site.currencyCode || "ILS";
  const header = (settings?.site as { header?: unknown } | undefined)?.header ?? (bootstrap.site as { header?: unknown }).header;
  const themed = storeThemeOf(header);
  if (themed) {
    const lookup: Record<string, ProductMini> = {};
    for (const p of catalog.items ?? []) {
      const imageUrl = getProductPrimaryImage(p);
      const price = getProductMinPrice(p);
      const entry = { id: p.id, slug: p.slug ?? undefined, title: p.title, imageUrl, secondaryImageUrl: getProductSecondaryImage(p, imageUrl), badge: getProductBadge(p), priceText: price != null ? formatMoney(price, currencyCode) : null, category: p.category?.name || "", colors: (p.items ?? []).map((item) => item.colorHex ?? "").filter((c) => /^#[0-9a-f]{3,8}$/i.test(c)) };
      lookup[p.id] = entry;
      if (p.slug) lookup[`slug:${p.slug}`] = entry;
    }
    const cats = lang ? localizeCategories(categories ?? [], lang) : categories ?? [];
    const ids = (catalog.items ?? []).map((p) => p.id);
    const sections: CmsSection[] = [
      { id: "home-opening", type: "HERO", order: 0, isVisible: true, data: {} },
      ...(ids.length ? [{ id: "home-products", type: "PRODUCTS_GRID", order: 1, isVisible: true, data: { productIds: ids } } as CmsSection] : []),
      ...(cats.length ? [{ id: "home-collections", type: "COLLECTIONS_GRID", order: 2, isVisible: true, data: { items: cats.slice(0, 8).map((c) => ({ label: c.name, slug: c.slug })) } } as CmsSection] : []),
    ];
    return (
      <ThemedHome
        theme={themed.theme}
        mode={themed.mode}
        stageOptions={stageOptionsOf(header, themed.theme.id)}
        lang={lang ?? langConfigOf(header).default}
        sections={sections}
        productLookup={lookup}
        categories={cats}
        renderProductCard={(id) => <ProductCard productId={id} />}
        renderQuickAdd={(ref) => <QuickAddButton productId={ref.productId} slug={ref.slug} buttonLabel="أضف للسلة" />}
      />
    );
  }
  const [seasons, stories] = await Promise.all([
    loadSeasonalEdits(categories ?? [], currencyCode, lang),
    loadCollectionStories(categories ?? [], currencyCode, lang),
  ]);
  const products = (catalog.items ?? []).map((product) => ({
    id: product.id,
    title: product.title,
    slug: product.slug,
    image: getProductPrimaryImage(product),
    secondaryImage: getProductSecondaryImage(product, getProductPrimaryImage(product)),
    badge: getProductBadge(product),
    price: getProductMinPrice(product),
    category: product.category?.name ?? "",
    colors: (product.items ?? [])
      .map((item) => item.colorHex ?? "")
      .filter((color) => /^#[0-9a-f]{3,8}$/i.test(color)),
  }));
  return (
    <RoseHome
      products={products}
      categories={lang ? localizeCategories(categories, lang) : categories ?? []}
      currencyCode={currencyCode}
      seasons={seasons}
      stories={stories}
    />
  );
}
