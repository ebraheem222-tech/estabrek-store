import type { ReactNode } from "react";
import type { CmsSection, ProductMini } from "@/cms/types";
import type { CatalogCategory } from "@/lib/catalog";
import { CmsPageRenderer } from "@/cms";
import { RoseHomeFrame, RoseFabricStudy, RoseNativeSections } from "./RoseHome";
import {
  RoseHero,
  RoseProductGrid,
  RoseCollections,
  RoseEditorialPanel,
  RoseFaq,
  RoseCta,
} from "./RoseSections";

export function RoseCmsHome({
  sections,
  productLookup,
  categories,
  logoUrl,
  siteName,
  renderQuickAdd,
  renderProductCard,
}: {
  sections: CmsSection[];
  productLookup: Record<string, ProductMini>;
  categories: CatalogCategory[];
  logoUrl?: string | null;
  siteName?: string | null;
  renderQuickAdd: (ref: { productId?: string; slug?: string }) => ReactNode;
  renderProductCard: (id: string) => ReactNode;
}) {
  const sorted = sections
    .filter((s) => s.isVisible !== false)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hero = sorted.find((s) => s.type === "HERO");
  const productTypes = [
    "NEW_ARRIVALS_SLIDER",
    "BEST_SELLERS_SLIDER",
    "FEATURED_PRODUCTS",
    "PRODUCTS_GRID",
    "PRODUCT_GRID",
    "PRODUCTS",
  ];
  const firstProducts = sorted.find((s) => productTypes.includes(s.type));
  const studyAfter = firstProducts?.id || hero?.id;
  const showStudy =
    Boolean(hero) && (hero?.data as any)?.rose3dEnabled !== false;
  const nodes: ReactNode[] = [];
  let native: CmsSection[] = [];
  const flush = () => {
    if (!native.length) return;
    nodes.push(
      <RoseNativeSections key={`native-${native[0].id}`}>
        <CmsPageRenderer
          sections={native}
          productLookup={productLookup}
          renderQuickAdd={renderQuickAdd}
          renderProductCard={renderProductCard}
        />
      </RoseNativeSections>,
    );
    native = [];
  };
  for (const section of sorted) {
    const d = (section.data ?? {}) as any;
    let node: ReactNode;
    const composed =
      d.components?.length ||
      d.slides?.length ||
      d.splitMode ||
      d.tripleMode ||
      (d.layout?.mode && d.layout.mode !== "stack");
    if (!composed) {
      if (section.type === "HERO")
        node =
          section.id === hero?.id ? (
            <RoseHero
              data={d}
              categories={categories}
              logoUrl={logoUrl}
              siteName={siteName}
              showStudy={showStudy}
            />
          ) : (
            <RoseEditorialPanel data={d} />
          );
      else if (
        productTypes.includes(section.type) &&
        Array.isArray(d.productIds || d.products)
      ) {
        const ids = d.productIds || d.products || [];
        const products = ids
          .map((id: string) => productLookup[id])
          .filter(Boolean);
        node = (
          <RoseProductGrid
            products={products}
            title={d.title}
            subtitle={d.subtitle}
            layout={section.type.endsWith("SLIDER") ? "slider" : "grid"}
            categories={categories}
            anchor={
              section.id === firstProducts?.id
                ? "arrivals"
                : `products-${section.id}`
            }
          />
        );
      } else if (
        (section.type === "COLLECTIONS_GRID" ||
          section.type === "FEATURED_CATEGORIES") &&
        Array.isArray(d.items)
      ) {
        node = (
          <RoseCollections
            title={d.title}
            subtitle={d.subtitle}
            items={d.items || []}
            anchor={
              sorted.find(
                (s) =>
                  s.type === "COLLECTIONS_GRID" ||
                  s.type === "FEATURED_CATEGORIES",
              )?.id === section.id
                ? "collections"
                : `collections-${section.id}`
            }
          />
        );
      } else if (section.type === "FAQ")
        node = <RoseFaq title={d.title} items={d.items || []} />;
      else if (section.type === "CTA") node = <RoseCta data={d} />;
    }
    if (node) {
      flush();
      nodes.push(
        <div
          key={section.id}
          data-cms-section={section.id}
          id={section.anchorId || undefined}
          aria-label={section.ariaLabel || undefined}
        >
          {node}
        </div>,
      );
    } else native.push(section);
    if (section.id === studyAfter && showStudy) {
      flush();
      nodes.push(<RoseFabricStudy key="fabric-study" />);
    }
  }
  flush();
  return <RoseHomeFrame>{nodes}</RoseHomeFrame>;
}
