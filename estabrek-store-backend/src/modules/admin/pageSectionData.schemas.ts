import { z } from "zod";

/**
 * CMS Section Data Validation
 *
 * Goal: validate SHAPE + apply safe defaults, without being overly strict.
 * (We can tighten rules later, especially for PUBLISHED pages.)
 */

export const PageSectionTypeZ = z.enum([
  "HERO",
  "RICH_TEXT",
  "CUSTOM_HTML",
  "GRID",
  "FEATURES",
  "STATS",
  "TEAM",
  "PRICING",
  "CONTACT",
  "BANNER",
  "FEATURED_CATEGORIES",
  "COLLECTIONS_GRID",
  "NEW_ARRIVALS_SLIDER",
  "BEST_SELLERS_SLIDER",
  "BRANDS_SLIDER",
  "FEATURED_PRODUCTS",
  "NEWSLETTER",
  "IMAGE_GALLERY",
  "FAQ",
  "TESTIMONIALS",
  "CTA",
  "CARDS",
  "VIDEO",
]);

const asString = (v: unknown) => (v == null ? "" : typeof v === "string" ? v : String(v));
const asBool = (v: unknown) => (typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : undefined);
const asNumber = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};

const zText = (max = 5000) => z.preprocess(asString, z.string().max(max));
const zOptText = (max = 5000) => z.preprocess((v) => (v == null ? undefined : asString(v)), z.string().max(max).optional());

/**
 * We accept:
 * - absolute URLs (http/https)
 * - root-relative paths (/uploads/..)
 * - data URIs (data:image/..)
 * - empty string
 */
const zUrlish = z.preprocess(asString, z.string().max(2048).refine((s) => {
  if (!s) return true;
  return s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/") || s.startsWith("data:");
}, { message: "Invalid URL/path" }));

const UiTailwindZ = z.object({
  sectionClass: zOptText(1000),
  containerClass: zOptText(1000),
}).passthrough();

const AlignZ = z.enum(["left", "center", "right"]);
const BannerVariantZ = z.enum(["info", "success", "warning", "danger"]);
const VideoProviderZ = z.enum(["AUTO", "YOUTUBE", "VIMEO", "MP4"]);
const VideoAspectZ = z.enum(["16/9", "4/3", "1/1", "9/16"]);

const ButtonZ = z.object({
  label: zText(120),
  href: zText(2048),
}).passthrough();

export const HeroDataZ = z.object({
  title: zText(200),
  subtitle: zOptText(500),
  backgroundImageUrl: zUrlish.optional(),
  overlay: z.preprocess(asNumber, z.number().min(0).max(1)).optional(),
  align: AlignZ.optional(),
  primaryButton: ButtonZ.optional(),
  secondaryButton: ButtonZ.optional(),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  subtitle: v.subtitle ?? "",
  backgroundImageUrl: v.backgroundImageUrl ?? "",
  overlay: typeof v.overlay === "number" ? Math.max(0, Math.min(1, v.overlay)) : 0.35,
  align: v.align ?? "center",
  primaryButton: v.primaryButton ?? { label: "", href: "" },
  secondaryButton: v.secondaryButton ?? { label: "", href: "" },
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const RichTextDataZ = z.object({
  title: zOptText(200),
  html: zText(100000),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  html: v.html ?? "",
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const CustomHtmlDataZ = z.object({
  title: zOptText(200),
  html: zText(200000),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  html: v.html ?? "",
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const FaqDataZ = z.object({
  title: zOptText(200),
  items: z.array(z.object({
    question: zText(500),
    answer: zText(5000),
  }).passthrough()).default([]),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  items: Array.isArray(v.items) ? v.items : [],
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const GridDataZ = z.object({
  title: zOptText(200),
  mode: z.enum(["grid", "container"]).optional(),
  columns: z.preprocess(asNumber, z.number().int().min(1).max(6)).optional(),
  items: z.array(z.object({
    title: zText(200),
    text: zOptText(2000),
    imageUrl: zUrlish.optional(),
    href: zOptText(2048),
  }).passthrough()).default([]),
  blocks: z.array(z.object({
    type: PageSectionTypeZ,
    data: z.any(),
    isVisible: z.preprocess(asBool, z.boolean()).optional(),
  }).passthrough()).default([]),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  mode: v.mode ?? "grid",
  columns: typeof v.columns === "number" ? v.columns : 3,
  items: Array.isArray(v.items) ? v.items : [],
  blocks: Array.isArray(v.blocks) ? v.blocks : [],
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const FeaturesDataZ = z.object({
  title: zOptText(200),
  subtitle: zOptText(500),
  columns: z.preprocess(asNumber, z.number().int().min(1).max(6)).optional(),
  items: z.array(z.object({
    title: zText(200),
    text: zOptText(2000),
    icon: zOptText(120),
    iconUrl: zUrlish.optional(),
    href: zOptText(2048),
  }).passthrough()).default([]),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  subtitle: v.subtitle ?? "",
  columns: typeof v.columns === "number" ? v.columns : 3,
  items: Array.isArray(v.items) ? v.items : [],
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const StatsDataZ = z.object({
  title: zOptText(200),
  subtitle: zOptText(500),
  columns: z.preprocess(asNumber, z.number().int().min(1).max(6)).optional(),
  items: z.array(z.object({
    value: zText(120),
    label: zOptText(200),
    subtext: zOptText(500),
    icon: zOptText(120),
  }).passthrough()).default([]),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  subtitle: v.subtitle ?? "",
  columns: typeof v.columns === "number" ? v.columns : 3,
  items: Array.isArray(v.items) ? v.items : [],
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const TeamDataZ = z.object({
  title: zOptText(200),
  subtitle: zOptText(500),
  columns: z.preprocess(asNumber, z.number().int().min(1).max(6)).optional(),
  members: z.array(z.object({
    name: zText(200),
    role: zOptText(200),
    bio: zOptText(2000),
    avatarUrl: zUrlish.optional(),
    socials: z.array(z.object({
      label: zOptText(120),
      href: zOptText(2048),
    }).passthrough()).default([]),
  }).passthrough()).default([]),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  subtitle: v.subtitle ?? "",
  columns: typeof v.columns === "number" ? v.columns : 3,
  members: Array.isArray(v.members) ? v.members : [],
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const PricingDataZ = z.object({
  title: zOptText(200),
  subtitle: zOptText(500),
  columns: z.preprocess(asNumber, z.number().int().min(1).max(6)).optional(),
  plans: z.array(z.object({
    name: zText(200),
    price: zOptText(120),
    period: zOptText(80),
    description: zOptText(1000),
    badge: zOptText(80),
    highlight: z.preprocess(asBool, z.boolean()).optional(),
    features: z.array(zText(300)).default([]),
    ctaLabel: zOptText(120),
    ctaHref: zOptText(2048),
  }).passthrough()).default([]),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  subtitle: v.subtitle ?? "",
  columns: typeof v.columns === "number" ? v.columns : 3,
  plans: Array.isArray(v.plans) ? v.plans : [],
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const ContactDataZ = z.object({
  title: zOptText(200),
  subtitle: zOptText(500),
  items: z.array(z.object({
    label: zOptText(120),
    value: zOptText(500),
    href: zOptText(2048),
    icon: zOptText(120),
  }).passthrough()).default([]),
  mapEmbedUrl: zUrlish.optional(),
  form: z.object({
    title: zOptText(200),
    subtitle: zOptText(500),
    action: zOptText(2048),
    method: z.enum(["POST", "GET"]).optional(),
    submitLabel: zOptText(120),
    fields: z.array(z.object({
      label: zOptText(120),
      name: zText(80),
      type: z.enum(["text", "email", "tel", "textarea"]).optional(),
      placeholder: zOptText(200),
      required: z.preprocess(asBool, z.boolean()).optional(),
    }).passthrough()).default([]),
  }).passthrough().optional(),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  subtitle: v.subtitle ?? "",
  items: Array.isArray(v.items) ? v.items : [],
  mapEmbedUrl: v.mapEmbedUrl ?? "",
  form: v.form ?? undefined,
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const FeaturedCategoriesDataZ = z.object({
  title: zOptText(200),
  subtitle: zOptText(500),
  items: z.array(z.object({
    label: zText(200),
    href: zText(2048),
    imageUrl: zUrlish.optional(),
    categoryId: zOptText(200),
  }).passthrough()).default([]),
  showArrows: z.preprocess(asBool, z.boolean()).optional(),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  subtitle: v.subtitle ?? "",
  items: Array.isArray(v.items) ? v.items : [],
  showArrows: v.showArrows ?? true,
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const CollectionsGridDataZ = z.object({
  title: zOptText(200),
  subtitle: zOptText(500),
  columns: z.preprocess(asNumber, z.number().int().min(1).max(12)).optional(),
  items: z.array(z.object({
    label: zText(200),
    href: zText(2048),
    imageUrl: zUrlish.optional(),
    categoryId: zOptText(200),
  }).passthrough()).default([]),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  subtitle: v.subtitle ?? "",
  columns: typeof v.columns === "number" ? v.columns : 4,
  items: Array.isArray(v.items) ? v.items : [],
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const ProductsSliderDataZ = z.object({
  title: zOptText(200),
  limit: z.preprocess(asNumber, z.number().int().min(1).max(50)).optional(),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  limit: typeof v.limit === "number" ? v.limit : 12,
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const BrandsSliderDataZ = z.object({
  title: zOptText(200),
  items: z.array(z.object({
    name: zText(200),
    logoUrl: zUrlish.optional(),
    href: zOptText(2048),
  }).passthrough()).default([]),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  items: Array.isArray(v.items) ? v.items : [],
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const NewsletterDataZ = z.object({
  title: zOptText(200),
  text: zOptText(2000),
  ctaLabel: zOptText(120),
  ctaHref: zOptText(2048),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  text: v.text ?? "",
  ctaLabel: v.ctaLabel ?? "",
  ctaHref: v.ctaHref ?? "",
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const ImageGalleryDataZ = z.object({
  title: zOptText(200),
  columns: z.preprocess(asNumber, z.number().int().min(1).max(12)).optional(),
  images: z.array(z.object({
    url: zUrlish,
    alt: zOptText(200),
  }).passthrough()).default([]),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  columns: typeof v.columns === "number" ? v.columns : 3,
  images: Array.isArray(v.images) ? v.images : [],
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const BannerDataZ = z.object({
  text: zText(2000),
  variant: BannerVariantZ.optional(),
  linkLabel: zOptText(120),
  linkHref: zOptText(2048),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  text: v.text ?? "",
  variant: v.variant ?? "info",
  linkLabel: v.linkLabel ?? "",
  linkHref: v.linkHref ?? "",
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const FeaturedProductsDataZ = z.object({
  title: zOptText(200),
  productIds: z.array(zText(128)).default([]),
  columns: z.preprocess(asNumber, z.number().int().min(1).max(12)).optional(),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  productIds: Array.isArray(v.productIds) ? v.productIds : [],
  columns: typeof v.columns === "number" ? v.columns : 4,
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const TestimonialsDataZ = z.object({
  title: zOptText(200),
  items: z.array(z.object({
    name: zText(200),
    role: zOptText(200),
    quote: zText(5000),
    avatarUrl: zUrlish.optional(),
  }).passthrough()).default([]),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  items: Array.isArray(v.items) ? v.items : [],
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const CtaDataZ = z.object({
  title: zText(200),
  subtitle: zOptText(500),
  imageUrl: zUrlish.optional(),
  align: AlignZ.optional(),
  buttonLabel: zOptText(120),
  buttonHref: zOptText(2048),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  subtitle: v.subtitle ?? "",
  imageUrl: v.imageUrl ?? "",
  align: v.align ?? "center",
  buttonLabel: v.buttonLabel ?? "",
  buttonHref: v.buttonHref ?? "",
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

const CardsCardZ = z.object({
  title: zOptText(200),
  text: zOptText(2000),
  imageUrl: zUrlish.optional(),
  badge: zOptText(120),
  buttonLabel: zOptText(120),
  buttonHref: zOptText(2048),
}).passthrough();

export const CardsDataZ = z.object({
  title: zOptText(200),
  subtitle: zOptText(500),
  cards: z.array(CardsCardZ).default([]),
  ui: UiTailwindZ.extend({
    cardsClass: zOptText(1000),
    cardClass: zOptText(1000),
    imageClass: zOptText(1000),
  }).optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  subtitle: v.subtitle ?? "",
  cards: Array.isArray(v.cards) ? v.cards : [],
  ui: v.ui ?? { sectionClass: "", containerClass: "", cardsClass: "", cardClass: "", imageClass: "" },
}));

export const VideoDataZ = z.object({
  title: zOptText(200),
  subtitle: zOptText(500),
  url: zUrlish, // allow empty string (drafts)
  posterUrl: zUrlish.optional(),
  provider: VideoProviderZ.optional(),
  aspect: VideoAspectZ.optional(),
  autoplay: z.preprocess(asBool, z.boolean()).optional(),
  muted: z.preprocess(asBool, z.boolean()).optional(),
  loop: z.preprocess(asBool, z.boolean()).optional(),
  controls: z.preprocess(asBool, z.boolean()).optional(),
  ui: UiTailwindZ.optional(),
}).passthrough().transform((v) => ({
  ...v,
  title: v.title ?? "",
  subtitle: v.subtitle ?? "",
  url: v.url ?? "",
  posterUrl: v.posterUrl ?? "",
  provider: v.provider ?? "AUTO",
  aspect: v.aspect ?? "16/9",
  autoplay: v.autoplay ?? false,
  muted: v.muted ?? true,
  loop: v.loop ?? false,
  controls: v.controls ?? true,
  ui: v.ui ?? { sectionClass: "", containerClass: "" },
}));

export const SectionDataByTypeZ: Record<z.infer<typeof PageSectionTypeZ>, z.ZodTypeAny> = {
  HERO: HeroDataZ,
  RICH_TEXT: RichTextDataZ,
  CUSTOM_HTML: CustomHtmlDataZ,
  GRID: GridDataZ,
  FEATURES: FeaturesDataZ,
  STATS: StatsDataZ,
  TEAM: TeamDataZ,
  PRICING: PricingDataZ,
  CONTACT: ContactDataZ,
  BANNER: BannerDataZ,
  FEATURED_CATEGORIES: FeaturedCategoriesDataZ,
  COLLECTIONS_GRID: CollectionsGridDataZ,
  NEW_ARRIVALS_SLIDER: ProductsSliderDataZ,
  BEST_SELLERS_SLIDER: ProductsSliderDataZ,
  BRANDS_SLIDER: BrandsSliderDataZ,
  FEATURED_PRODUCTS: FeaturedProductsDataZ,
  NEWSLETTER: NewsletterDataZ,
  IMAGE_GALLERY: ImageGalleryDataZ,
  FAQ: FaqDataZ,
  TESTIMONIALS: TestimonialsDataZ,
  CTA: CtaDataZ,
  CARDS: CardsDataZ,
  VIDEO: VideoDataZ,
};

export function validateSectionData(type: z.infer<typeof PageSectionTypeZ>, data: unknown) {
  const schema = SectionDataByTypeZ[type];
  return schema.parse(data ?? {});
}

// ------------------------------
// Publish-time validation
// ------------------------------

export type CmsPublishIssue = {
  type: z.infer<typeof PageSectionTypeZ>;
  message: string;
};

function isBlank(v: unknown) {
  return typeof v !== "string" || v.trim().length === 0;
}

function hasAnyText(...vals: Array<unknown>) {
  return vals.some((v) => typeof v === "string" && v.trim().length > 0);
}

/**
 * Stricter validation when publishing a page.
 * Assumes `data` has already been normalized by `validateSectionData()`.
 */
export function getPublishIssuesForSection(type: z.infer<typeof PageSectionTypeZ>, data: any): CmsPublishIssue[] {
  const issues: CmsPublishIssue[] = [];

  switch (type) {
    case "HERO": {
      if (!hasAnyText(data?.title, data?.subtitle) && isBlank(data?.backgroundImageUrl)) {
        issues.push({ type, message: "HERO: لازم تحط عنوان أو صورة خلفية." });
      }
      break;
    }

    case "RICH_TEXT": {
      if (isBlank(data?.html)) issues.push({ type, message: "RICH_TEXT: محتوى النص فاضي." });
      break;
    }

    case "CUSTOM_HTML": {
      if (isBlank(data?.html)) issues.push({ type, message: "CUSTOM_HTML: محتوى الـHTML فاضي." });
      break;
    }

    case "FAQ": {
      const items = Array.isArray(data?.items) ? data.items : [];
      const ok = items.some((it: any) => hasAnyText(it?.question) && hasAnyText(it?.answer));
      if (!ok) issues.push({ type, message: "FAQ: لازم تحط سؤال/جواب واحد على الأقل." });
      break;
    }

    case "GRID": {
      if (data?.mode === "container") {
        const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
        if (!blocks.length) issues.push({ type, message: "GRID: لازم تضيف Section واحد على الأقل داخل الـContainer." });
      } else {
        const items = Array.isArray(data?.items) ? data.items : [];
        const ok = items.some((it: any) => hasAnyText(it?.title, it?.text) || !isBlank(it?.imageUrl));
        if (!ok) issues.push({ type, message: "GRID: لازم تحط عنصر واحد على الأقل." });
      }
      break;
    }

    case "FEATURES": {
      const items = Array.isArray(data?.items) ? data.items : [];
      const ok = items.some((it: any) => hasAnyText(it?.title, it?.text) || !isBlank(it?.iconUrl) || hasAnyText(it?.icon));
      if (!ok) issues.push({ type, message: "FEATURES: لازم تحط ميزة واحدة على الأقل." });
      break;
    }

    case "STATS": {
      const items = Array.isArray(data?.items) ? data.items : [];
      const ok = items.some((it: any) => hasAnyText(it?.value));
      if (!ok) issues.push({ type, message: "STATS: لازم تحط رقم واحد على الأقل." });
      break;
    }

    case "TEAM": {
      const members = Array.isArray(data?.members) ? data.members : [];
      const ok = members.some((it: any) => hasAnyText(it?.name) || !isBlank(it?.avatarUrl));
      if (!ok) issues.push({ type, message: "TEAM: لازم تحط عضو واحد على الأقل." });
      break;
    }

    case "PRICING": {
      const plans = Array.isArray(data?.plans) ? data.plans : [];
      const ok = plans.some((it: any) => hasAnyText(it?.name, it?.price));
      if (!ok) issues.push({ type, message: "PRICING: لازم تحط خطة واحدة على الأقل." });
      break;
    }

    case "CONTACT": {
      const items = Array.isArray(data?.items) ? data.items : [];
      const hasForm = Array.isArray(data?.form?.fields) && data.form.fields.length > 0;
      if (!items.length && !hasForm && isBlank(data?.mapEmbedUrl)) {
        issues.push({ type, message: "CONTACT: لازم تضيف وسيلة تواصل أو نموذج أو خريطة." });
      }
      break;
    }

    case "IMAGE_GALLERY": {
      const images = Array.isArray(data?.images) ? data.images : [];
      const ok = images.some((im: any) => hasAnyText(im?.url));
      if (!ok) issues.push({ type, message: "IMAGE_GALLERY: لازم تحط صورة واحدة على الأقل." });
      break;
    }

    case "BANNER": {
      if (isBlank(data?.text)) issues.push({ type, message: "BANNER: النص فاضي." });
      break;
    }

    case "FEATURED_CATEGORIES": {
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) issues.push({ type, message: "FEATURED_CATEGORIES: لازم تضيف تصنيف واحد على الأقل." });
      break;
    }

    case "COLLECTIONS_GRID": {
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) issues.push({ type, message: "COLLECTIONS_GRID: لازم تضيف مجموعة واحدة على الأقل." });
      break;
    }

    case "BRANDS_SLIDER": {
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) issues.push({ type, message: "BRANDS_SLIDER: لازم تضيف براند واحد على الأقل." });
      break;
    }

    case "CTA": {
      if (isBlank(data?.title)) issues.push({ type, message: "CTA: العنوان مطلوب." });
      // if one button field is present, require the other.
      const hasLabel = hasAnyText(data?.buttonLabel);
      const hasHref = hasAnyText(data?.buttonHref);
      if ((hasLabel && !hasHref) || (!hasLabel && hasHref)) {
        issues.push({ type, message: "CTA: لازم تحط buttonLabel + buttonHref مع بعض." });
      }
      break;
    }

    case "TESTIMONIALS": {
      const items = Array.isArray(data?.items) ? data.items : [];
      const ok = items.some((it: any) => hasAnyText(it?.name) && hasAnyText(it?.quote));
      if (!ok) issues.push({ type, message: "TESTIMONIALS: لازم تحط تقييم واحد على الأقل (name + quote)." });
      break;
    }

    case "FEATURED_PRODUCTS": {
      const ids = Array.isArray(data?.productIds) ? data.productIds : [];
      if (ids.length === 0) issues.push({ type, message: "FEATURED_PRODUCTS: لازم تختار منتجات." });
      break;
    }

    case "NEWSLETTER": {
      if (!hasAnyText(data?.title, data?.text)) {
        issues.push({ type, message: "NEWSLETTER: لازم تحط عنوان أو نص." });
      }
      break;
    }

    case "CARDS": {
      const cards = Array.isArray(data?.cards) ? data.cards : [];
      const ok = cards.some((c: any) => hasAnyText(c?.title, c?.text) || !isBlank(c?.imageUrl));
      if (!ok) issues.push({ type, message: "CARDS: لازم تحط Card واحد على الأقل." });
      break;
    }

    case "VIDEO": {
      if (isBlank(data?.url)) issues.push({ type, message: "VIDEO: لازم تحط رابط الفيديو." });
      break;
    }
  }

  return issues;
}
