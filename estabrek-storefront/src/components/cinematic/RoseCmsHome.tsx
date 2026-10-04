import type { ReactNode } from "react";
import type { CmsSection, ProductMini } from "@/cms/types";
import type { CatalogCategory } from "@/lib/catalog";
import { CmsPageRenderer } from "@/cms";
import { RoseHomeFrame, RoseFabricStudy, RoseNativeSections } from "./RoseHome";
import { sectionPalette } from "./roseDesign";
import { RoseVideoSection } from "./RoseVideoSection";
import {
  RoseHero,
  RoseProductGrid,
  RoseCollections,
  RoseEditorialPanel,
  RoseFaq,
  RoseCta,
  RoseTestimonials,
  RoseInstagram,
} from "./RoseSections";
import { RoseSeasons } from "./RoseSeasons";
import { RoseCollectionStory } from "./RoseCollectionStory";
import type { StoryChapter } from "@/lib/collectionStories";
import type { SeasonEdit } from "@/lib/seasonalEdits";

export function RoseCmsHome({
  sections,
  productLookup,
  categories,
  logoUrl,
  siteName,
  renderQuickAdd,
  renderProductCard,
  seasons = [],
  stories = [],
}: {
  sections: CmsSection[];
  productLookup: Record<string, ProductMini>;
  categories: CatalogCategory[];
  logoUrl?: string | null;
  siteName?: string | null;
  renderQuickAdd: (ref: { productId?: string; slug?: string }) => ReactNode;
  renderProductCard: (id: string) => ReactNode;
  /** Winter → spring pinned scene; hidden from Admin with hero.roseSeasonsEnabled = false. */
  seasons?: SeasonEdit[];
  /** Accessories → kids → incense scene; hidden from Admin with hero.roseStoriesEnabled = false. */
  stories?: StoryChapter[];
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
  const isCollections = (s: CmsSection) =>
    (s.type === "COLLECTIONS_GRID" || s.type === "FEATURED_CATEGORIES") &&
    Array.isArray((s.data as any)?.items);
  const showSeasons = (hero?.data as any)?.roseSeasonsEnabled !== false && seasons.length > 0;
  // The seasonal scene opens the shopping part of the page, right above the first
  // products ("وصل حديثاً"); without a products section it follows the hero.
  const seasonsBefore = firstProducts?.id;
  const seasonsAfter = seasonsBefore ? undefined : sorted.find(isCollections)?.id || hero?.id;
  const showStories = (hero?.data as any)?.roseStoriesEnabled !== false && stories.length > 0;
  // The collection worlds follow the collections grid; without one they come before Instagram/FAQ.
  const storiesAfter = sorted.find(isCollections)?.id;
  let storiesShown = false;
  const hasTestimonials = sorted.some((s) => s.type === "TESTIMONIALS");
  const instagramBefore = sorted.find((s) => s.type === "FAQ")?.id || sorted.find((s) => s.type === "CTA")?.id;
  const instagramImages = Object.entries(productLookup)
    .filter(([key]) => !key.startsWith("slug:"))
    .map(([, p]) => p.imageUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);
  let instagramShown = false;
  const nodes: ReactNode[] = [];
  let native: CmsSection[] = [];
  const flush = () => {
    if (!native.length) return;
    nodes.push(...native.map(section => (
      <div key={`native-${section.id}`} data-cms-section={section.id} data-rose-palette={sectionPalette(section.type, (section.data as any)?.rosePresentation)} data-rose-explicit={(section.data as any)?.rosePresentation?.palette || undefined} data-rose-intensity={(section.data as any)?.rosePresentation?.motionIntensity || "cinematic"}>
      <RoseNativeSections>
        <CmsPageRenderer
          sections={[section]}
          productLookup={productLookup}
          renderQuickAdd={renderQuickAdd}
          renderProductCard={renderProductCard}
        />
      </RoseNativeSections>
      </div>
    )));
    native = [];
  };
  for (const section of sorted) {
    const d = (section.data ?? {}) as any;
    if (section.id === seasonsBefore && showSeasons) {
      flush();
      nodes.push(<RoseSeasons key="seasons" seasons={seasons} />);
    }
    if (showStories && !storiesShown && !storiesAfter && section.id === instagramBefore) {
      flush();
      storiesShown = true;
      nodes.push(<RoseCollectionStory key="stories" chapters={stories} />);
    }
    if (!hasTestimonials && !instagramShown && section.id === instagramBefore) {
      flush();
      instagramShown = true;
      nodes.push(<RoseInstagram key="instagram" images={instagramImages} />);
    }
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
              openingStudy={false}
              showVideo={!sorted.some(s => s.type === "VIDEO")}
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
      } else if (section.type === "TESTIMONIALS" && Array.isArray(d.items || d.testimonials))
        node = <RoseTestimonials title={d.title} items={d.items || d.testimonials || []} />;
      else if (section.type === "FAQ")
        node = <RoseFaq title={d.title} items={d.items || []} />;
      else if (section.type === "CTA") node = <RoseCta data={d} />;
      else if (section.type === "VIDEO" && d.url && (d.provider === "MP4" || ((!d.provider || d.provider === "AUTO") && /\.mp4(?:[?#]|$)/i.test(d.url)))) node = <RoseVideoSection data={d} />;
    }
    if (node) {
      flush();
      nodes.push(
        <div
          key={section.id}
          data-cms-section={section.id}
          data-rose-palette={sectionPalette(section.type, d.rosePresentation)}
          data-rose-explicit={d.rosePresentation?.palette || undefined}
          data-rose-intensity={d.rosePresentation?.motionIntensity || "cinematic"}
          id={section.anchorId || undefined}
          aria-label={section.ariaLabel || undefined}
        >
          {node}
        </div>,
      );
    } else native.push(section);
    if (section.id === studyAfter && showStudy) {
      flush();
      nodes.push(<RoseFabricStudy key="fabric-study" words={(hero?.data as any)?.roseStoryWords} />);
    }
    if (showStories && !storiesShown && section.id === storiesAfter) {
      flush();
      storiesShown = true;
      nodes.push(<RoseCollectionStory key="stories" chapters={stories} />);
    }
    if (section.id === seasonsAfter && showSeasons) {
      flush();
      nodes.push(<RoseSeasons key="seasons" seasons={seasons} />);
    }
  }
  flush();
  if (showStories && !storiesShown) nodes.push(<RoseCollectionStory key="stories" chapters={stories} />);
  if (!hasTestimonials && !instagramShown) nodes.push(<RoseInstagram key="instagram" images={instagramImages} />);
  return <RoseHomeFrame>{nodes}</RoseHomeFrame>;
}
