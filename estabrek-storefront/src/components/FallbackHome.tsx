import { getBootstrap, listCategories, listProducts } from "@/lib/api";
import { getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";
import { RoseHome } from "@/components/cinematic/RoseHome";
import { getProductBadge, getProductSecondaryImage } from "@/lib/productBadges";
import { loadSeasonalEdits } from "@/lib/seasonalEdits";
import { loadCollectionStories } from "@/lib/collectionStories";
import LegacyFallbackHome from "@/components/LegacyFallbackHome";

export default async function FallbackHome() {
  if (process.env.ESTABREK_HOME_MODE === "cms") return <LegacyFallbackHome />;
  const [bootstrap, categories, catalog] = await Promise.all([
    getBootstrap(),
    listCategories(),
    listProducts({
      sort: "latest",
      page: 1,
      pageSize: 4,
      includeFacets: false,
      lite: true,
    }),
  ]);
  const currencyCode = bootstrap.site.currencyCode || "ILS";
  const [seasons, stories] = await Promise.all([
    loadSeasonalEdits(categories ?? [], currencyCode),
    loadCollectionStories(categories ?? [], currencyCode),
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
      categories={categories ?? []}
      currencyCode={currencyCode}
      seasons={seasons}
      stories={stories}
    />
  );
}
