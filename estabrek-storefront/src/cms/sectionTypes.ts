import type { PageSectionType, CmsComponent } from "./types";
import type { TwTokens } from "./style/tokens";

// Shared CMS section data shapes.
// This file is intentionally framework-agnostic (works in Admin preview and Storefront).

export type UiTailwind = {
  /** Tailwind classes applied to the outer <section> */
  sectionClass?: string;
  /** Tailwind classes applied to the inner container */
  containerClass?: string;
};

export type ButtonData = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "outline";
  align?: "left" | "center" | "right";
  fullWidth?: boolean;
  openInNewTab?: boolean;
  ui?: UiTailwind;
};

export type InputData = {
  label?: string;
  name: string;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number" | "password";
  required?: boolean;
  disabled?: boolean;
  ui?: UiTailwind;
};

export type HeroSlide = {
  title: string;
  subtitle?: string;
  badge?: string;
  backgroundImageUrl?: string;
  overlay?: number; // 0..1
  align?: "left" | "center" | "right";
  primaryButton?: { label: string; href: string };
  secondaryButton?: { label: string; href: string };
  /** Optional per-pane/per-slide theme id (used by split hero mode). */
  themeId?: string;
  slideTokens?: TwTokens;
  titleTokens?: TwTokens;
  subtitleTokens?: TwTokens;
  primaryButtonTokens?: TwTokens;
  secondaryButtonTokens?: TwTokens;
};

export type HeroAnimPreset = "none" | "fade-up" | "zoom-in" | "slide-up" | "scale-in";

export type HeroData = HeroSlide & {
  /** Optional hero theme id (uses hero-themes renderer when set). */
  themeId?: string;
  /** Render hero in 3 columns (left content + center media + right indicators). */
  tripleMode?: boolean;
  /** Triple layout proportions. */
  tripleLayout?: "4:5:1" | "3:4:1" | "5:6:1";
  /** Gap between triple columns (px). */
  tripleGap?: number;
  /** Small heading above title in triple mode. */
  eyebrow?: string;
  /** Center media image for triple mode. */
  centerImageUrl?: string;
  centerImageAlt?: string;
  /** Right-side indicators in triple mode. */
  rightIndicators?: number;
  rightActiveIndicator?: number;
  /** Render two hero panes in one section (left/right). */
  splitMode?: boolean;
  /** Left/right width ratio for split mode. */
  splitRatio?: "1:1" | "3:2" | "2:3" | "7:5" | "5:7";
  /** Gap between left/right panes in px. */
  splitGap?: number;
  /** Right-side hero pane data (left pane uses root hero fields). */
  splitRight?: HeroSlide;
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
  components?: CmsComponent[];
  ui?: UiTailwind;
};

export type CustomHtmlData = {
  title?: string;
  html: string;
  components?: CmsComponent[];
  ui?: UiTailwind;
};

export type BannerData = {
  /** Optional alert/banner theme id (uses alert-themes renderer when set). */
  themeId?: string;
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
  mode?: "grid" | "container";
  title?: string;
  columns?: number; // 1..6
  items?: Array<{ title: string; text?: string; imageUrl?: string; href?: string; twTokens?: TwTokens; titleTokens?: TwTokens; textTokens?: TwTokens; imageTokens?: TwTokens; linkTokens?: TwTokens }>;
  blocks?: Array<{ type: PageSectionType; data: any; isVisible?: boolean }>;
  ui?: UiTailwind;
};

export type FeaturesData = {
  /** Optional feature theme id (uses feature-themes renderer when set). */
  themeId?: string;
  title?: string;
  subtitle?: string;
  columns?: number;
  items: Array<{ title: string; text?: string; icon?: string; iconUrl?: string; href?: string; twTokens?: TwTokens; titleTokens?: TwTokens; textTokens?: TwTokens; iconTokens?: TwTokens; linkTokens?: TwTokens }>;
  ui?: UiTailwind;
};

export type StatsData = {
  title?: string;
  subtitle?: string;
  columns?: number;
  items: Array<{ value: string; label?: string; subtext?: string; icon?: string; twTokens?: TwTokens; valueTokens?: TwTokens; labelTokens?: TwTokens; subtextTokens?: TwTokens; iconTokens?: TwTokens }>;
  ui?: UiTailwind;
};

export type TeamData = {
  title?: string;
  subtitle?: string;
  columns?: number;
  members: Array<{
    name: string;
    role?: string;
    bio?: string;
    avatarUrl?: string;
    socials?: Array<{ label?: string; href?: string }>;
    twTokens?: TwTokens;
    nameTokens?: TwTokens;
    roleTokens?: TwTokens;
    bioTokens?: TwTokens;
    avatarTokens?: TwTokens;
    socialTokens?: TwTokens;
  }>;
  ui?: UiTailwind;
};

export type PricingData = {
  /** Optional pricing theme id (uses pricing-themes renderer when set). */
  themeId?: string;
  title?: string;
  subtitle?: string;
  columns?: number;
  plans: Array<{
    name: string;
    price?: string;
    period?: string;
    description?: string;
    badge?: string;
    highlight?: boolean;
    features?: string[];
    ctaLabel?: string;
    ctaHref?: string;
    twTokens?: TwTokens;
    nameTokens?: TwTokens;
    priceTokens?: TwTokens;
    periodTokens?: TwTokens;
    descriptionTokens?: TwTokens;
    badgeTokens?: TwTokens;
    featureTokens?: TwTokens;
    ctaTokens?: TwTokens;
  }>;
  ui?: UiTailwind;
};

export type ContactData = {
  /** Optional contact form theme id (uses contact-forms renderer when set). */
  themeId?: string;
  title?: string;
  subtitle?: string;
  items?: Array<{
    label?: string;
    value?: string;
    href?: string;
    icon?: string;
    twTokens?: TwTokens;
    labelTokens?: TwTokens;
    valueTokens?: TwTokens;
    iconTokens?: TwTokens;
  }>;
  mapEmbedUrl?: string;
  mapTokens?: TwTokens;
  form?: {
    title?: string;
    subtitle?: string;
    action?: string;
    method?: "POST" | "GET";
    submitLabel?: string;
    fields?: Array<{
      label?: string;
      name: string;
      type?: "text" | "email" | "tel" | "textarea";
      placeholder?: string;
      required?: boolean;
      twTokens?: TwTokens;
      labelTokens?: TwTokens;
      inputTokens?: TwTokens;
    }>;
    twTokens?: TwTokens;
    titleTokens?: TwTokens;
    subtitleTokens?: TwTokens;
    fieldTokens?: TwTokens;
    labelTokens?: TwTokens;
    inputTokens?: TwTokens;
    submitTokens?: TwTokens;
  };
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
    twTokens?: TwTokens;
    labelTokens?: TwTokens;
    imageTokens?: TwTokens;
    linkTokens?: TwTokens;
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
    twTokens?: TwTokens;
    labelTokens?: TwTokens;
    imageTokens?: TwTokens;
    linkTokens?: TwTokens;
  }>;
  ui?: UiTailwind;
};

export type ProductsSliderData = {
  /** Optional slider theme id (uses slider-themes renderer when set). */
  themeId?: string;
  title?: string;
  limit?: number; // 1..50
  ui?: UiTailwind;
};

export type BrandsSliderData = {
  /** Optional slider theme id (uses slider-themes renderer when set). */
  themeId?: string;
  title?: string;
  items: Array<{ name: string; logoUrl?: string; href?: string; twTokens?: TwTokens; nameTokens?: TwTokens; logoTokens?: TwTokens; linkTokens?: TwTokens }>;
  ui?: UiTailwind;
};

export type FeaturedProductsData = {
  title?: string;
  productIds?: string[];
  productSlugs?: string[];
  products?: string[];
  columns?: number; // 2..4
  ui?: UiTailwind;
};

export type NewsletterData = {
  title?: string;
  text?: string;
  placeholder?: string;
  buttonLabel?: string;
  success?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ui?: UiTailwind;
};

export type ImageGalleryData = {
  title?: string;
  columns?: number; // 2..6
  images: Array<{ url: string; alt?: string; twTokens?: TwTokens; imageTokens?: TwTokens }>;
  ui?: UiTailwind;
};

export type FaqData = {
  title?: string;
  items: Array<{ question?: string; answer?: string; q?: string; a?: string; twTokens?: TwTokens; questionTokens?: TwTokens; answerTokens?: TwTokens }>;
  ui?: UiTailwind;
};

export type TestimonialsData = {
  title?: string;
  items?: Array<{ name: string; role?: string; quote: string; avatarUrl?: string; twTokens?: TwTokens; nameTokens?: TwTokens; roleTokens?: TwTokens; quoteTokens?: TwTokens; avatarTokens?: TwTokens }>;
  testimonials?: Array<{ name: string; role?: string; quote: string; avatarUrl?: string; twTokens?: TwTokens; nameTokens?: TwTokens; roleTokens?: TwTokens; quoteTokens?: TwTokens; avatarTokens?: TwTokens }>;
  ui?: UiTailwind;
};

export type CtaData = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  align?: "left" | "center" | "right";
  buttonLabel?: string;
  buttonHref?: string;
  button?: { label: string; href: string };
  ui?: UiTailwind;
};

export type CardsCard = {
  title?: string;
  text?: string;
  imageUrl?: string;
  badge?: string;
  buttonLabel?: string;
  buttonHref?: string;
  href?: string;
  linkHref?: string;
  productId?: string;
  twTokens?: TwTokens;
  titleTokens?: TwTokens;
  textTokens?: TwTokens;
  badgeTokens?: TwTokens;
  buttonTokens?: TwTokens;
  imageTokens?: TwTokens;
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
  ratio?: "16:9" | "4:3" | "1:1";
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  ui?: UiTailwind;
};
