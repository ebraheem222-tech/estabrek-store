// Shared CMS section data shapes.
// This file is intentionally framework-agnostic (works in Admin preview and Storefront).

export type UiTailwind = {
  /** Tailwind classes applied to the outer <section> */
  sectionClass?: string;
  /** Tailwind classes applied to the inner container */
  containerClass?: string;
};

export type HeroSlide = {
  title: string;
  subtitle?: string;
  backgroundImageUrl?: string;
  overlay?: number; // 0..1
  align?: "left" | "center" | "right";
  primaryButton?: { label: string; href: string };
  secondaryButton?: { label: string; href: string };
};

export type HeroAnimPreset = "none" | "fade-up" | "zoom-in" | "slide-up" | "scale-in";

export type HeroData = HeroSlide & {
  /** Slider mode */
  slides?: HeroSlide[];
  /** Autoplay interval ms (e.g. 5000). 0/undefined disables autoplay */
  autoplayMs?: number;
  /** Show dots */
  showDots?: boolean;
  /** Slide/background animation */
  slideAnim?: HeroAnimPreset;
  /** Slide animation duration (ms) */
  slideDuration?: number;
  /** Content animation */
  contentAnim?: HeroAnimPreset;
  /** Content animation duration (ms) */
  contentDuration?: number;
  /** Content animation delay (ms) */
  contentDelay?: number;
  ui?: UiTailwind;
};

export type RichTextData = {
  title?: string;
  html: string;
  ui?: UiTailwind;
};

export type CustomHtmlData = {
  title?: string;
  html: string;
  ui?: UiTailwind;
};

export type BannerData = {
  text: string;
  variant?: "info" | "success" | "warning" | "danger";
  linkLabel?: string;
  linkHref?: string;
  // legacy/compat
  href?: string;
  buttonText?: string;
  tone?: "info" | "success" | "warning" | "danger";
  ui?: UiTailwind;
};

export type GridData = {
  title?: string;
  columns?: number; // 2..4
  items: Array<{ title: string; text?: string; imageUrl?: string; href?: string }>;
  ui?: UiTailwind;
};

export type FeaturedCategoriesData = {
  title?: string;
  subtitle?: string;
  items: Array<{
    label: string;
    href: string;
    imageUrl?: string;
    categoryId?: string;
  }>;
  showArrows?: boolean;
  ui?: UiTailwind;
};

export type CollectionsGridData = {
  title?: string;
  subtitle?: string;
  columns?: number; // 2..6
  items: Array<{
    label: string;
    href: string;
    imageUrl?: string;
    categoryId?: string;
  }>;
  ui?: UiTailwind;
};

export type ProductsSliderData = {
  title?: string;
  limit?: number; // 1..50
  ui?: UiTailwind;
};

export type BrandsSliderData = {
  title?: string;
  items: Array<{ name: string; logoUrl?: string; href?: string }>;
  ui?: UiTailwind;
};

export type FeaturedProductsData = {
  title?: string;
  productIds?: string[];
  productSlugs?: string[];
  columns?: number; // 2..4
  ui?: UiTailwind;
};

export type NewsletterData = {
  title?: string;
  text?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ui?: UiTailwind;
};

export type ImageGalleryData = {
  title?: string;
  columns?: number; // 2..6
  images: Array<{ url: string; alt?: string }>;
  ui?: UiTailwind;
};

export type FaqData = {
  title?: string;
  items: Array<{ question: string; answer: string }>;
  ui?: UiTailwind;
};

export type TestimonialsData = {
  title?: string;
  items: Array<{ name: string; role?: string; quote: string; avatarUrl?: string }>;
  ui?: UiTailwind;
};

export type CtaData = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  align?: "left" | "center" | "right";
  buttonLabel?: string;
  buttonHref?: string;
  ui?: UiTailwind;
};

export type CardsCard = {
  title?: string;
  text?: string;
  imageUrl?: string;
  badge?: string;
  buttonLabel?: string;
  buttonHref?: string;
};

export type CardsData = {
  title?: string;
  subtitle?: string;
  cards?: CardsCard[];
  ui?: UiTailwind & {
    cardsClass?: string;
    cardClass?: string;
    imageClass?: string;
  };
};

export type VideoData = {
  title?: string;
  subtitle?: string;
  url: string;
  posterUrl?: string;
  provider?: "AUTO" | "YOUTUBE" | "VIMEO" | "MP4";
  aspect?: "16/9" | "4/3" | "1/1" | "9/16";
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  ui?: UiTailwind;
};
