/**
 * The home page under a store theme: the same sections the rose home reads (renderCmsPage),
 * each drawn by the theme (heroes.tsx, sections.tsx), with the theme's drawing between
 * them. Sections it has no design for are drawn by the CMS as before. The rose design's
 * own scenes (the film, the fabric study, seasons, collection worlds) stay with the rose design.
 */
import { isValidElement, type ReactNode } from "react";
import { CmsPageRenderer } from "@/cms";
import type { CmsSection, ProductMini } from "@/cms/types";
import type { CatalogCategory } from "@/lib/catalog";
import type { Lang } from "@/lib/i18n";
import { fontFaces, themePalette } from "../css";
import { SIGNATURES } from "../dna/signatures";
import type { StageOptions } from "../three/kinds";
import type { StoreTheme } from "../types";
import { LEADS_WITH } from "./openingLeads";
// Its client parts, scripts of their own (lazyHome.tsx says why).
import { DesignOpening, DesignSignature, StageHero, ThemeHero } from "./lazyHome";
import { OverlayLayer } from "@/pageTree/OverlayLayer";
import { marqueeWords } from "../words";
import type { ThProduct } from "./sections";
import { ThCollections, ThCta, ThDivider, ThFaq, ThMarquee, ThPanel, ThProducts, ThTestimonials, ThVideo } from "./lazyHome";

const QUIET = new Set(["minimal", "story", "bento", "split", "recipe", "spec", "gallery"]);
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
  // A design's page skeleton: its own opening, and the store's section it brings up right after it.
  const archetype = theme.design?.archetype;
  const lead = archetype ? LEADS_WITH[archetype] : undefined;
  let leadId: string | undefined;
  if (lead && hero) {
    const want = lead === "products" ? PRODUCT_TYPES : ["COLLECTIONS_GRID", "FEATURED_CATEGORIES"];
    const at = sorted.findIndex((s) => want.includes(s.type));
    const after = sorted.indexOf(hero) + 1;
    if (at > after) sorted.splice(after, 0, ...sorted.splice(at, 1));
    if (sorted[after] && want.includes(sorted[after].type)) leadId = sorted[after].id;
  }
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
          <OverlayLayer over={section.overlay} />
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
        <OverlayLayer over={section.overlay} />
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
          ) : archetype ? (
            <DesignOpening archetype={archetype} theme={theme} lang={lang} d={d} categories={cats} products={products} counts={{ products: products.length, categories: cats.length }} productImage={products.find((p) => p.imageUrl)?.imageUrl ?? null} />
          ) : (
            <ThemeHero theme={theme} lang={lang} d={d} categories={cats} counts={{ products: products.length, categories: cats.length }} productImage={products.find((p) => p.imageUrl)?.imageUrl ?? null} />
          )}
          {/* Skeletons whose opening already tells the promises (as chapters, callouts, steps, a list) don't run them again. */}
          {!archetype || !QUIET.has(archetype) ? <ThMarquee items={marqueeWords(theme, lang)} /> : null}
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

  // The design's signature section, right after its opening (and the section it brings up with it).
  // A home made in the editor from a design kit has none: it opens and goes on as its own page does.
  const sig = theme.design && hero ? SIGNATURES[theme.design.kind] : undefined;
  if (sig && theme.design) {
    const anchor = leadId ?? hero?.id;
    const at = anchor ? nodes.findIndex((n) => isValidElement(n) && (n.key === anchor || n.key === `native-${anchor}`)) : -1;
    const adds = Object.fromEntries(products.slice(0, 12).map((p) => [p.id || p.slug || p.title, renderQuickAdd({ productId: p.id, slug: p.slug })]));
    const signature = (
      <DesignSignature
        key="th-signature"
        sig={sig}
        title={theme.design.signature}
        theme={theme}
        lang={lang}
        products={products}
        categories={cats}
        picture={(hero?.data as Record<string, any> | undefined)?.backgroundImageUrl || products.find((p) => p.imageUrl)?.imageUrl || null}
        adds={adds}
        faces={sig.m === "script" && !sig.as ? fontFaces(["th-aref-ruqaa", "th-reem-kufi", "th-amiri"]) : undefined}
      />
    );
    if (at >= 0) nodes.splice(at + 1, 0, <ThDivider key="div-th-signature" theme={theme} />, signature);
    else nodes.unshift(signature);
  }

  return (
    <div className="th-home" data-th={theme.id} data-th-hero={theme.hero} data-th-card={theme.card} data-th-svg={theme.svg} data-th-shape={theme.design?.shape} data-th-skeleton={archetype}>
      <script dangerouslySetInnerHTML={{ __html: PENDING }} />
      {nodes}
    </div>
  );
}
