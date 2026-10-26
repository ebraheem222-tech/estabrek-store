/**
 * The home page under a store theme: the same sections the rose home reads (renderCmsPage),
 * each drawn by the theme (heroes.tsx, sections.tsx), with the theme's drawing between
 * them. Sections it has no design for are drawn by the CMS as before. The rose design's
 * own scenes (the film, the fabric study, seasons, collection worlds) stay with the rose design.
 */
import type { ReactNode } from "react";
import { CmsPageRenderer } from "@/cms";
import type { CmsSection, ProductMini } from "@/cms/types";
import type { CatalogCategory } from "@/lib/catalog";
import type { Lang } from "@/lib/i18n";
import { themePalette } from "../css";
import type { StageOptions } from "../three/kinds";
import type { StoreTheme } from "../types";
import { ThemeHero } from "./heroes";
import { StageHero } from "./StageHero";
import { marqueeWords } from "../words";
import { ThCollections, ThCta, ThDivider, ThFaq, ThMarquee, ThPanel, ThProducts, ThTestimonials, ThVideo, type ThProduct } from "./sections";

const PRODUCT_TYPES = ["NEW_ARRIVALS_SLIDER", "BEST_SELLERS_SLIDER", "FEATURED_PRODUCTS", "PRODUCTS_GRID", "PRODUCT_GRID", "PRODUCTS"];
// Set before the first paint so the opening waits for its entrance (ThemeMotion), never more than 2.5 s.
const PENDING = `(function(){try{if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var r=document.documentElement;r.classList.add("th-pending");setTimeout(function(){r.classList.remove("th-pending")},2500)}catch(e){}})();`;

export function ThemedHome({
  theme,
  mode,
  stageOptions,
  lang,
  sections,
  productLookup,
  categories,
  renderQuickAdd,
  renderProductCard,
}: {
  theme: StoreTheme;
  mode?: "light" | "dark" | null;
  /** The store's own models and games for a gaming theme (header.storeThemeOptions). */
  stageOptions?: StageOptions;
  lang: Lang;
  sections: CmsSection[];
  productLookup: Record<string, ProductMini>;
  categories: CatalogCategory[];
  renderQuickAdd: (ref: { productId?: string; slug?: string }) => ReactNode;
  renderProductCard: (id: string) => ReactNode;
}) {
  const sorted = sections
    .filter((s) => s.isVisible !== false)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hero = sorted.find((s) => s.type === "HERO");
  const products = Object.entries(productLookup)
    .filter(([key]) => !key.startsWith("slug:"))
    .map(([, p]) => p as ThProduct);
  const cats = categories.map((c) => ({ id: String(c.id), name: c.name, slug: c.slug }));
  const nodes: ReactNode[] = [];
  let native: CmsSection[] = [];
  const flush = () => {
    if (!native.length) return;
    nodes.push(
      ...native.map((section) => (
        <div key={`native-${section.id}`} className="th-native" data-cms-section={section.id}>
          <CmsPageRenderer sections={[section]} markSections={false} productLookup={productLookup} renderQuickAdd={renderQuickAdd} renderProductCard={renderProductCard} />
        </div>
      )),
    );
    native = [];
  };
  const place = (section: CmsSection, node: ReactNode, divider = true) => {
    flush();
    if (divider && nodes.length) nodes.push(<ThDivider key={`div-${section.id}`} theme={theme} />);
    nodes.push(
      <div key={section.id} data-cms-section={section.id} id={section.anchorId || undefined} aria-label={section.ariaLabel || undefined}>
        {node}
      </div>,
    );
  };

  for (const section of sorted) {
    const d = (section.data ?? {}) as Record<string, any>;
    // Rose scenes the editor placed belong to the rose design.
    if ((section.type as string) === "TREE_NODE" && d.node?.type === "roseBlock") continue;
    const composed = d.components?.length || d.slides?.length || d.splitMode || d.tripleMode || (d.layout?.mode && d.layout.mode !== "stack");
    if (composed) {
      native.push(section);
      continue;
    }
    if (section.type === "HERO" && section.id === hero?.id) {
      place(
        section,
        <>
          {theme.hero === "stage" && theme.stage ? (
            <StageHero theme={theme} palette={themePalette(theme, mode).palette} lang={lang} d={d} categories={cats} options={stageOptions ?? {}} />
          ) : (
            <ThemeHero theme={theme} lang={lang} d={d} categories={cats} counts={{ products: products.length, categories: cats.length }} productImage={products.find((p) => p.imageUrl)?.imageUrl ?? null} />
          )}
          <ThMarquee items={marqueeWords(theme, lang)} />
        </>,
        false,
      );
    } else if (section.type === "HERO") place(section, <ThPanel d={d} theme={theme} lang={lang} />);
    else if (PRODUCT_TYPES.includes(section.type) && Array.isArray(d.productIds || d.products)) {
      const ids: string[] = d.productIds || d.products || [];
      const list = ids.map((id) => productLookup[id] as ThProduct | undefined).filter((p): p is ThProduct => Boolean(p));
      place(section, <ThProducts theme={theme} lang={lang} products={list} title={d.title} subtitle={d.subtitle} slider={section.type.endsWith("SLIDER")} />);
    } else if ((section.type === "COLLECTIONS_GRID" || section.type === "FEATURED_CATEGORIES") && Array.isArray(d.items)) {
      place(section, <ThCollections theme={theme} lang={lang} title={d.title} subtitle={d.subtitle} items={d.items} />);
    } else if (section.type === "TESTIMONIALS" && Array.isArray(d.items || d.testimonials)) {
      place(section, <ThTestimonials lang={lang} title={d.title} items={d.items || d.testimonials} />);
    } else if (section.type === "FAQ") place(section, <ThFaq lang={lang} title={d.title} items={d.items || []} />);
    else if (section.type === "CTA") place(section, <ThCta theme={theme} d={d} lang={lang} />);
    else if (section.type === "VIDEO" && typeof d.url === "string" && /\.mp4(?:[?#]|$)/i.test(d.url)) place(section, <ThVideo d={d} />);
    else native.push(section);
  }
  flush();

  return (
    <div className="th-home" data-th={theme.id} data-th-hero={theme.hero} data-th-card={theme.card} data-th-svg={theme.svg}>
      <script dangerouslySetInnerHTML={{ __html: PENDING }} />
      {nodes}
    </div>
  );
}
