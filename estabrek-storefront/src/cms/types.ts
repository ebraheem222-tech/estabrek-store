// Shared CMS core types (Admin + Storefront).
import type { TwTokens } from "./style/tokens";

export type PageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type PageSectionType =
  | "HERO"
  | "RICH_TEXT"
  | "CUSTOM_HTML"
  | "GRID"
  | "BANNER"
  | "FEATURED_CATEGORIES"
  | "COLLECTIONS_GRID"
  | "PRODUCTS"
  | "PRODUCTS_GRID"
  | "PRODUCT_GRID"
  | "NEW_ARRIVALS_SLIDER"
  | "BEST_SELLERS_SLIDER"
  | "BRANDS_SLIDER"
  | "FEATURED_PRODUCTS"
  | "NEWSLETTER"
  | "IMAGE_GALLERY"
  | "FAQ"
  | "TESTIMONIALS"
  | "CTA"
  | "CARDS"
  | "VIDEO"
  | "BUTTON"
  | "INPUT"
  | "FORM";

export type CmsPage = {
  id: string;
  name: string;
  slug: string;
  status: PageStatus;

  // legacy / existing
  canonicalUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  noIndex?: boolean;
  customCss?: string | null;
  headScripts?: any;
  bodyScripts?: any;

  // SEO
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  robotsNoIndex?: boolean;
  robotsNoFollow?: boolean;
  jsonLd?: any;

  createdAt?: string;
  updatedAt?: string;
};

export type CmsSection = {
  id: string;
  pageId?: string;
  type: PageSectionType;
  data: CmsSectionData;
  order: number;
  isVisible: boolean;

  // SEO / accessibility
  anchorId?: string | null;
  ariaLabel?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

// -----------------------------
// CMS Step 1: composable sections
// -----------------------------

export type CmsLayoutType = "flex" | "grid";

export type CmsSectionLayout =
  | {
      type: "flex";
      direction?: "row" | "row-reverse" | "col" | "col-reverse";
      wrap?: boolean;
      gap?: string; // tailwind-ish e.g. "gap-4"
      justify?: string;
      align?: string;
    }
  | {
      type: "grid";
      cols?: number; // 1..12
      gap?: string; // e.g. "gap-6"
    };

export type CmsBackgroundType = "none" | "solid" | "gradient" | "glass" | "image";

export type CmsSectionStyle = {
  containerClass?: string;
  innerClass?: string;
  background?: {
    type: CmsBackgroundType;
    className?: string; // tailwind class preset
  };
};


// Minimal product data for rendering CMS-linked product cards
export type ProductMini = {
  id?: string;
  slug?: string;
  title: string;
  imageUrl?: string | null;
  priceText?: string | null;
};



// Components inside a section (Step 2+)
export type CmsComponentKind =
  | "text"
  | "button"
  | "image"
  | "icon"
  | "divider"
  | "spacer"
  | "badge"
  | "card"
  | "list"
  | "container"
  | "stack"
  | "row"
  | "grid"
  | "nav_menu"
  | "columns"
  | "data"
  | "productGrid"
  | "productSlider"
  | "categoryTiles"
  | "filtersBar";

export type CmsComponent = {
  id: string;
  kind: CmsComponentKind;
  name?: string;
  props?: any;
  twTokens?: TwTokens;
  tw?: { className?: string };
};

export type CmsSectionData = {
  layout?: CmsSectionLayout;
  style?: CmsSectionStyle;
  components?: CmsComponent[];
  [k: string]: any;
};

export type CmsPageWithSections = CmsPage & { sections: CmsSection[] };
