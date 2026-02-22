import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PageSectionType } from "../../api/pages.api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { cn } from "../../components/ui/cn";
import { MediaLibraryModal } from "../../components/media/MediaLibraryModal";
import { MediaUrlInput } from "../../components/media/MediaUrlInput";
import { listCategories, type CatalogCategory } from "../../api/catalog.api";
import DOMPurify from "dompurify";
import type { TwTokens } from "../../cms/style/tokens";
import type { CmsComponent } from "../../cms/types";
import { heroThemes, heroCategories } from "../../cms/hero-themes";
import { contactFormThemes, contactFormCategories } from "../../cms/contact-forms";
import { featureThemes, featureCategories } from "../../cms/feature-themes";
import { pricingThemes, pricingCategories } from "../../cms/pricing-themes";
import { sliderThemes, sliderCategories } from "../../cms/slider-themes";
import { alertThemes } from "../../cms/alert-themes";
import {
  externalHeroThemes,
  externalHeroThemeCategories,
  externalFeatureThemes,
  externalFeatureThemeCategories,
  externalPricingThemes,
  externalPricingThemeCategories,
  externalBannerThemes,
  externalBannerThemeCategories,
  externalCategoryThemes,
  externalCategoryThemeCategories,
  type ExternalThemeOption,
} from "../../cms/theme-packs/externalThemePacks";
import { ResponsiveTokensPanel } from "./ResponsiveTokensPanel";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * NOTE: Some section editors were written using <TextInput /> / <TextAreaInput /> with a simplified
 * onChange signature: (value: string) => void.
 *
 * Our UI <Input /> component uses the native onChange event, so we wrap it here to avoid
 * runtime ReferenceErrors and event/value mixups.
 */
type SimpleInputProps = {
  label?: string;
  value?: any;
  placeholder?: string;
  className?: string;
  type?: string;
  dir?: "ltr" | "rtl";
  onChange: (value: string) => void;
};

function TextInput({ onChange, ...props }: SimpleInputProps) {
  return (
    <Input
      {...props}
      value={props.value ?? ""}
      onValueChange={onChange}
    />
  );
}

type SimpleTextAreaProps = {
  label?: string;
  value?: any;
  placeholder?: string;
  className?: string;
  rows?: number;
  dir?: "ltr" | "rtl";
  onChange: (value: string) => void;
};

function TextAreaInput({
  label,
  value,
  placeholder,
  className,
  rows = 4,
  dir,
  onChange,
}: SimpleTextAreaProps) {
  return (
    <div className="space-y-2">
      {label ? (
        <label className="block text-sm font-medium text-white/80">{label}</label>
      ) : null}
      <textarea
        rows={rows}
        dir={dir}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-white/[0.18] focus:ring-2 focus:ring-white/10",
          className
        )}
      />
    </div>
  );
}

type ThemeOption = { id: string; name: string; nameAr?: string; category: string };

function renderThemeOptions(categories: string[], themes: ThemeOption[]) {
  return categories.map((category) => {
    const list = themes.filter((theme) => theme.category === category);
    if (!list.length) return null;
    return (
      <optgroup key={category} label={category}>
        {list.map((theme) => (
          <option key={theme.id} value={theme.id} className="bg-surface-900 text-white">
            {theme.name || theme.id}
          </option>
        ))}
      </optgroup>
    );
  });
}

const HERO_THEME_OPTIONS: ThemeOption[] = [...heroThemes, ...externalHeroThemes];
const HERO_THEME_CATEGORIES = Array.from(new Set([...heroCategories, ...externalHeroThemeCategories]));

const FEATURE_THEME_OPTIONS: ThemeOption[] = [...featureThemes, ...externalFeatureThemes];
const FEATURE_THEME_CATEGORIES = Array.from(new Set([...featureCategories, ...externalFeatureThemeCategories]));

const PRICING_THEME_OPTIONS: ThemeOption[] = [...pricingThemes, ...externalPricingThemes];
const PRICING_THEME_CATEGORIES = Array.from(new Set([...pricingCategories, ...externalPricingThemeCategories]));

const BANNER_BASE_THEMES = alertThemes.filter((theme) => theme.style === "banner") as ThemeOption[];
const BANNER_THEME_OPTIONS: ThemeOption[] = [...BANNER_BASE_THEMES, ...externalBannerThemes];
const BANNER_THEME_CATEGORIES = Array.from(
  new Set([...BANNER_BASE_THEMES.map((theme) => theme.category), ...externalBannerThemeCategories])
);

const CATEGORY_THEME_OPTIONS: ThemeOption[] = externalCategoryThemes;
const CATEGORY_THEME_CATEGORIES = externalCategoryThemeCategories;

function TokensPanel({
  label,
  tokens,
  onChange,
}: {
  label: string;
  tokens?: TwTokens;
  onChange: (next: TwTokens) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <details
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3"
      onToggle={(e) => setIsOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-sm font-semibold text-white/80">
        تنسيق متقدم: {label}
      </summary>
      {isOpen ? (
        <div className="mt-3">
          <ResponsiveTokensPanel tokens={tokens as any} onChange={onChange as any} />
        </div>
      ) : null}
    </details>
  );
}


type CommonErrors = Record<string, string | undefined>;

export type UiTailwind = {
  /** Tailwind classes applied to the outer <section> */
  sectionClass?: string;
  /** Tailwind classes applied to the inner container */
  containerClass?: string;
};

export type SectionLayoutMode = "stack" | "row" | "grid";

export type SectionLayout = {
  mode?: SectionLayoutMode;
  group?: string;
  columns?: number;
  span?: number;
};

function normalizeUi(ui: any): UiTailwind {
  if (!ui || typeof ui !== "object") return {};
  return {
    sectionClass: typeof ui.sectionClass === "string" ? ui.sectionClass : "",
    containerClass: typeof ui.containerClass === "string" ? ui.containerClass : "",
  };
}

function UiClassesEditor({
  value,
  onChange,
}: {
  value: any;
  onChange: (next: any) => void;
}) {
  const ui = normalizeUi(value?.ui);
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Tailwind (اختياري)</div>
          <div className="text-xs opacity-70">بتقدر تضيف className للـSection والـContainer (بدون ما نكسر الثيم).</div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChange({ ...(value ?? {}), ui: { sectionClass: "", containerClass: "" } })}
        >
          تصفير
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Section classes"
          placeholder="مثال: py-10 bg-white/[0.02]"
          value={ui.sectionClass ?? ""}
          onChange={(v) => onChange({ ...(value ?? {}), ui: { ...ui, sectionClass: v } })}
          dir="ltr"
        />
        <Input
          label="Container classes"
          placeholder="مثال: max-w-6xl px-4"
          value={ui.containerClass ?? ""}
          onChange={(v) => onChange({ ...(value ?? {}), ui: { ...ui, containerClass: v } })}
          dir="ltr"
        />
      </div>

      <div className="mt-3 text-xs opacity-60">
        نصيحة: خلي الـContainer classes خفيف (مثلاً max-w-6xl) عشان ما يتعارض مع التصميم.
      </div>
    </div>
  );
}

function SectionLayoutEditor({
  value,
  onChange,
}: {
  value: any;
  onChange: (next: any) => void;
}) {
  const rawLayout = value?.layout && typeof value.layout === "object" ? value.layout : {};
  const mode = (rawLayout.mode as SectionLayoutMode) ?? "stack";
  const group = typeof rawLayout.group === "string" ? rawLayout.group : "";
  const columns = Math.min(6, Math.max(1, Number(rawLayout.columns ?? 2)));
  const span = Math.min(columns, Math.max(1, Number(rawLayout.span ?? 1)));

  const updateLayout = (patch: Partial<SectionLayout>) => {
    const next = { ...rawLayout, ...patch };
    onChange({ ...(value ?? {}), layout: next });
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
      <div className="text-sm font-semibold">ترتيب القسم داخل الصفحة</div>
      <Select
        label="طريقة العرض"
        value={mode}
        onChange={(v) => updateLayout({ mode: v as SectionLayoutMode })}
        options={[
          { value: "stack", label: "عمودي (Stack)" },
          { value: "row", label: "أفقي (Row)" },
          { value: "grid", label: "شبكة (Grid)" },
        ]}
      />

      {mode !== "stack" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Row/Group ID (اختياري)"
            value={group}
            onChange={(v) => updateLayout({ group: v })}
            placeholder="مثال: row-1 (اتركه فارغ للتجميع التلقائي)"
            dir="ltr"
          />
          <Select
            label="عدد الأعمدة"
            value={String(columns)}
            onChange={(v) => {
              const nextCols = Math.min(6, Math.max(1, Number(v) || 1));
              const nextSpan = Math.min(nextCols, span);
              updateLayout({ columns: nextCols, span: nextSpan });
            }}
            options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
          />
          <Select
            label="عرض القسم (Span)"
            value={String(span)}
            onChange={(v) => updateLayout({ span: Math.min(columns, Math.max(1, Number(v) || 1)) })}
            options={Array.from({ length: columns }, (_, i) => {
              const n = i + 1;
              return { value: String(n), label: String(n) };
            })}
          />
        </div>
      ) : (
        <div className="text-xs opacity-60">اختر Row أو Grid لوضع عدة Sections في نفس الصف.</div>
      )}

      <div className="text-xs opacity-60">
        لو تركته فارغ، الأقسام المتجاورة بنفس الوضع وعدد الأعمدة تتجمّع تلقائيًا. لفصل صفوف متعددة استخدم Group ID مختلف.
      </div>
      <div className="text-xs opacity-60">
        للتحكم بالعرض/الارتفاع استخدم "تنسيق القسم المتقدم" &gt; الحجم (auto / % / px / vh / vw).
      </div>
    </div>
  );
}

const SECTION_TYPE_OPTIONS: Array<{ value: PageSectionType; label: string }> = [
  { value: "HERO", label: "HERO" },
  { value: "RICH_TEXT", label: "RICH_TEXT" },
  { value: "CUSTOM_HTML", label: "CUSTOM_HTML" },
  { value: "GRID", label: "GRID" },
  { value: "FEATURES", label: "FEATURES" },
  { value: "STATS", label: "STATS" },
  { value: "TEAM", label: "TEAM" },
  { value: "PRICING", label: "PRICING" },
  { value: "CONTACT", label: "CONTACT" },
  { value: "BANNER", label: "BANNER" },
  { value: "FEATURED_CATEGORIES", label: "FEATURED_CATEGORIES" },
  { value: "COLLECTIONS_GRID", label: "COLLECTIONS_GRID" },
  { value: "NEW_ARRIVALS_SLIDER", label: "NEW_ARRIVALS_SLIDER" },
  { value: "BEST_SELLERS_SLIDER", label: "BEST_SELLERS_SLIDER" },
  { value: "BRANDS_SLIDER", label: "BRANDS_SLIDER" },
  { value: "FEATURED_PRODUCTS", label: "FEATURED_PRODUCTS" },
  { value: "NEWSLETTER", label: "NEWSLETTER" },
  { value: "IMAGE_GALLERY", label: "IMAGE_GALLERY" },
  { value: "FAQ", label: "FAQ" },
  { value: "TESTIMONIALS", label: "TESTIMONIALS" },
  { value: "CTA", label: "CTA" },
  { value: "CARDS", label: "CARDS" },
  { value: "VIDEO", label: "VIDEO" },
];

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
  /** Theme id to render from hero-themes */
  themeId?: string;
  /** Render hero in 3 columns (left content + center media + right indicators). */
  tripleMode?: boolean;
  /** Triple layout proportions. */
  tripleLayout?: "4:5:1" | "3:4:1" | "5:6:1";
  /** Gap between triple columns in px. */
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

export type FaqData = {
  title?: string;
  items: Array<{ question: string; answer: string; twTokens?: TwTokens; questionTokens?: TwTokens; answerTokens?: TwTokens }>;
  ui?: UiTailwind;
};

export type GridData = {
  mode?: "grid" | "container";
  title?: string;
  columns?: number; // 2..4
  items: Array<{ title: string; text?: string; imageUrl?: string; href?: string; twTokens?: TwTokens; titleTokens?: TwTokens; textTokens?: TwTokens; imageTokens?: TwTokens; linkTokens?: TwTokens }>;
  blocks?: Array<{ type: PageSectionType; data: any; isVisible?: boolean }>;
  ui?: UiTailwind;
};

export type FeaturesData = {
  themeId?: string;
  title?: string;
  subtitle?: string;
  columns?: number; // 2..6
  items: Array<{
    title: string;
    text?: string;
    icon?: string;
    iconUrl?: string;
    href?: string;
    twTokens?: TwTokens;
    titleTokens?: TwTokens;
    textTokens?: TwTokens;
    iconTokens?: TwTokens;
    linkTokens?: TwTokens;
  }>;
  ui?: UiTailwind;
};

export type StatsData = {
  title?: string;
  subtitle?: string;
  columns?: number; // 2..6
  items: Array<{
    value: string;
    label?: string;
    subtext?: string;
    icon?: string;
    twTokens?: TwTokens;
    valueTokens?: TwTokens;
    labelTokens?: TwTokens;
    subtextTokens?: TwTokens;
    iconTokens?: TwTokens;
  }>;
  ui?: UiTailwind;
};

export type TeamMember = {
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
};

export type TeamData = {
  title?: string;
  subtitle?: string;
  columns?: number; // 2..6
  members: TeamMember[];
  ui?: UiTailwind;
};

export type PricingPlan = {
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
};

export type PricingData = {
  themeId?: string;
  title?: string;
  subtitle?: string;
  columns?: number; // 2..4
  plans: PricingPlan[];
  ui?: UiTailwind;
};

export type ContactFormField = {
  label?: string;
  name: string;
  type?: "text" | "email" | "tel" | "textarea";
  placeholder?: string;
  required?: boolean;
  twTokens?: TwTokens;
  labelTokens?: TwTokens;
  inputTokens?: TwTokens;
};

export type ContactData = {
  /** Theme id to render from contact-forms */
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
    fields?: ContactFormField[];
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
  themeId?: string;
  title?: string;
  subtitle?: string;
  items: Array<{
    label: string;
    href: string;
    imageUrl?: string;
    categoryId?: string;
    iconKey?: string;
    accentColor?: string;
    twTokens?: TwTokens;
    labelTokens?: TwTokens;
    imageTokens?: TwTokens;
    linkTokens?: TwTokens;
  }>;
  showArrows?: boolean;
  ui?: UiTailwind;
};

export type CollectionsGridData = {
  themeId?: string;
  title?: string;
  subtitle?: string;
  columns?: number; // 2..6
  items: Array<{
    label: string;
    href: string;
    imageUrl?: string;
    categoryId?: string;
    iconKey?: string;
    accentColor?: string;
    twTokens?: TwTokens;
    labelTokens?: TwTokens;
    imageTokens?: TwTokens;
    linkTokens?: TwTokens;
  }>;
  ui?: UiTailwind;
};

export type ProductsSliderData = {
  themeId?: string;
  title?: string;
  limit?: number; // 1..50
  ui?: UiTailwind;
};

export type BrandsSliderData = {
  themeId?: string;
  title?: string;
  items: Array<{ name: string; logoUrl?: string; href?: string; twTokens?: TwTokens; nameTokens?: TwTokens; logoTokens?: TwTokens; linkTokens?: TwTokens }>;
  ui?: UiTailwind;
};

export type ImageGalleryData = {
  title?: string;
  columns?: number; // 2..6
  images: Array<{ url: string; alt?: string; twTokens?: TwTokens; imageTokens?: TwTokens }>;
  ui?: UiTailwind;
};

export type BannerData = {
  themeId?: string;
  text: string;
  variant?: "info" | "success" | "warning" | "danger";
  linkLabel?: string;
  linkHref?: string;
  ui?: UiTailwind;
};

export type GlobalAnnouncementData = {
  enabled?: boolean;
  text?: string;
  href?: string;
  buttonText?: string;
  ui?: UiTailwind;
};

export type GlobalHeaderData = {
  sticky?: boolean;
  showSearch?: boolean;
  showMenu?: boolean;
  showCta?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  brandText?: string;
  ui?: UiTailwind;
};

export type GlobalFooterData = {
  aboutTitle?: string;
  aboutText?: string;
  showNewsletter?: boolean;
  newsletterTitle?: string;
  newsletterPlaceholder?: string;
  newsletterButtonLabel?: string;
  showSocial?: boolean;
  copyright?: string;
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

export type TestimonialsData = {
  title?: string;
  items: Array<{ name: string; role?: string; quote: string; avatarUrl?: string; twTokens?: TwTokens; nameTokens?: TwTokens; roleTokens?: TwTokens; quoteTokens?: TwTokens; avatarTokens?: TwTokens }>;
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

export type CardsCard = {
  title?: string;
  text?: string;
  imageUrl?: string;
  badge?: string;
  buttonLabel?: string;
  buttonHref?: string;
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

// eslint-disable-next-line react-refresh/only-export-components
export function defaultDataForType(type: PageSectionType): any {
  switch (type) {
    case "GLOBAL_ANNOUNCEMENT":
      return {
        enabled: true,
        text: "",
        href: "",
        buttonText: "تفاصيل",
        ui: { sectionClass: "", containerClass: "" },
      } satisfies GlobalAnnouncementData;
    case "GLOBAL_HEADER":
      return {
        sticky: true,
        showSearch: true,
        showMenu: true,
        showCta: false,
        ctaLabel: "",
        ctaHref: "",
        brandText: "",
        ui: { sectionClass: "", containerClass: "" },
      } satisfies GlobalHeaderData;
    case "GLOBAL_FOOTER":
      return {
        aboutTitle: "عن المتجر",
        aboutText: "",
        showNewsletter: true,
        newsletterTitle: "النشرة البريدية",
        newsletterPlaceholder: "اكتب بريدك",
        newsletterButtonLabel: "اشترك",
        showSocial: true,
        copyright: "",
        ui: { sectionClass: "", containerClass: "" },
      } satisfies GlobalFooterData;
    case "HERO":
      return {
        title: "",
        subtitle: "",
        eyebrow: "",
        backgroundImageUrl: "",
        overlay: 0.35,
        align: "center",
        primaryButton: { label: "", href: "" },
        secondaryButton: { label: "", href: "" },
        tripleMode: false,
        tripleLayout: "4:5:1",
        tripleGap: 24,
        centerImageUrl: "",
        centerImageAlt: "",
        rightIndicators: 4,
        rightActiveIndicator: 1,
        splitMode: false,
        splitRatio: "1:1",
        splitGap: 24,
        slideAnim: "none",
        slideDuration: 600,
        contentAnim: "fade-up",
        contentDuration: 400,
        contentDelay: 0,
        ui: { sectionClass: "", containerClass: "" },
      } satisfies HeroData;
    case "RICH_TEXT":
      return { title: "", html: "", ui: { sectionClass: "", containerClass: "" } } satisfies RichTextData;
    case "CUSTOM_HTML":
      return { title: "", html: "", ui: { sectionClass: "", containerClass: "" } } satisfies CustomHtmlData;
    case "FAQ":
      return {
        title: "",
        items: [{ question: "", answer: "" }],
        ui: { sectionClass: "", containerClass: "" },
      } satisfies FaqData;
    case "GRID":
      return {
        mode: "grid",
        title: "",
        columns: 3,
        items: [{ title: "", text: "", imageUrl: "", href: "" }],
        blocks: [],
        ui: { sectionClass: "", containerClass: "" },
      } satisfies GridData;
    case "FEATURES":
      return {
        title: "المميزات",
        subtitle: "",
        columns: 3,
        items: [{ title: "ميزة", text: "شرح مختصر", icon: "✨", iconUrl: "", href: "" }],
        ui: { sectionClass: "", containerClass: "" },
      } satisfies FeaturesData;
    case "STATS":
      return {
        title: "أرقام سريعة",
        subtitle: "",
        columns: 3,
        items: [{ value: "10K+", label: "عميل سعيد", subtext: "", icon: "" }],
        ui: { sectionClass: "", containerClass: "" },
      } satisfies StatsData;
    case "TEAM":
      return {
        title: "فريق العمل",
        subtitle: "",
        columns: 3,
        members: [{ name: "اسم", role: "الدور", bio: "نبذة قصيرة", avatarUrl: "", socials: [] }],
        ui: { sectionClass: "", containerClass: "" },
      } satisfies TeamData;
    case "PRICING":
      return {
        title: "خطط الأسعار",
        subtitle: "",
        columns: 3,
        plans: [{ name: "الخطة الأساسية", price: "99$", period: "شهرياً", description: "", features: ["ميزة 1", "ميزة 2"], ctaLabel: "اشترك", ctaHref: "#", highlight: false, badge: "" }],
        ui: { sectionClass: "", containerClass: "" },
      } satisfies PricingData;
    case "CONTACT":
      return {
        title: "تواصل معنا",
        subtitle: "",
        items: [
          { label: "الهاتف", value: "+970 000 000 000", href: "tel:+970000000000", icon: "📞" },
          { label: "البريد", value: "info@example.com", href: "mailto:info@example.com", icon: "✉️" },
        ],
        mapEmbedUrl: "",
        form: {
          title: "راسلنا",
          subtitle: "",
          action: "",
          method: "POST",
          submitLabel: "إرسال",
          fields: [
            { label: "الاسم", name: "name", type: "text", placeholder: "", required: true },
            { label: "البريد الإلكتروني", name: "email", type: "email", placeholder: "", required: true },
            { label: "الرسالة", name: "message", type: "textarea", placeholder: "", required: true },
          ],
        },
        ui: { sectionClass: "", containerClass: "" },
      } satisfies ContactData;
    case "IMAGE_GALLERY":
      return {
        title: "",
        columns: 3,
        images: [],
        ui: { sectionClass: "", containerClass: "" },
      } satisfies ImageGalleryData;
    case "BANNER":
      return {
        text: "",
        variant: "info",
        linkLabel: "",
        linkHref: "",
        ui: { sectionClass: "", containerClass: "" },
      } satisfies BannerData;
    case "FEATURED_CATEGORIES":
      return {
        title: "تصنيفات مميزة",
        subtitle: "",
        items: [],
        showArrows: true,
        ui: { sectionClass: "", containerClass: "" },
      } satisfies FeaturedCategoriesData;
    case "COLLECTIONS_GRID":
      return {
        title: "مجموعات",
        subtitle: "",
        columns: 4,
        items: [],
        ui: { sectionClass: "", containerClass: "" },
      } satisfies CollectionsGridData;
    case "NEW_ARRIVALS_SLIDER":
      return {
        title: "وصل حديثاً",
        limit: 12,
        ui: { sectionClass: "", containerClass: "" },
      } satisfies ProductsSliderData;
    case "BEST_SELLERS_SLIDER":
      return {
        title: "الأكثر مبيعاً",
        limit: 12,
        ui: { sectionClass: "", containerClass: "" },
      } satisfies ProductsSliderData;
    case "BRANDS_SLIDER":
      return {
        title: "علامات تجارية",
        items: [],
        ui: { sectionClass: "", containerClass: "" },
      } satisfies BrandsSliderData;
    case "CTA":
      return {
        title: "",
        subtitle: "",
        imageUrl: "",
        align: "center",
        buttonLabel: "",
        buttonHref: "",
        ui: { sectionClass: "", containerClass: "" },
      } satisfies CtaData;
    case "TESTIMONIALS":
      return {
        title: "",
        items: [{ name: "", role: "", quote: "", avatarUrl: "" }],
        ui: { sectionClass: "", containerClass: "" },
      } satisfies TestimonialsData;
    case "FEATURED_PRODUCTS":
      return {
        title: "",
        productIds: [],
        productSlugs: [],
        columns: 4,
        ui: { sectionClass: "", containerClass: "" },
      } satisfies FeaturedProductsData;
    case "NEWSLETTER":
      return {
        title: "",
        text: "",
        ctaLabel: "",
        ctaHref: "",
        ui: { sectionClass: "", containerClass: "" },
      } satisfies NewsletterData;
    case "CARDS":
      // IMPORTANT: defaultDataForType must return the *data object* (not templates list).
      // Templates are provided by templatesForType(). Returning templates here will crash
      // the editor and cause a blank page.
      return {
        title: "Cards",
        subtitle: "",
        cards: [
          {
            title: "Card 1",
            text: "وصف قصير",
            imageUrl: "",
            badge: "",
            buttonLabel: "إقرأ المزيد",
            buttonHref: "#",
          },
        ],
        ui: {
          sectionClass: "",
          containerClass: "",
          cardsClass: "flex flex-wrap gap-4",
          cardClass:
            "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] rounded-2xl border border-white/10 bg-white/5 p-4",
          imageClass: "w-full h-40 object-cover rounded-xl border border-white/10",
        },
      } satisfies CardsData;

    case "VIDEO":
      return {
        title: "",
        subtitle: "",
        url: "",
        posterUrl: "",
        provider: "AUTO",
        aspect: "16/9",
        autoplay: false,
        muted: true,
        loop: false,
        controls: true,
        ui: { sectionClass: "", containerClass: "" },
      } satisfies VideoData;
    default:
      return { ui: { sectionClass: "", containerClass: "" } };
  }
}

export type SectionTemplate = {
  id: string;
  label: string;
  data: any;
};

function sanitizeTemplateId(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  return normalized || "theme";
}

function buildThemeTemplates<TData extends { themeId?: string }>(
  options: ExternalThemeOption[],
  idPrefix: string,
  labelPrefix: string,
  createData: (theme: ExternalThemeOption) => TData
): SectionTemplate[] {
  return options.map((theme) => ({
    id: `${idPrefix}_${sanitizeTemplateId(theme.id)}`,
    label: `${labelPrefix}: ${theme.name || theme.id}`,
    data: createData(theme),
  }));
}

const CATEGORY_TEMPLATE_ITEMS: Array<{
  label: string;
  href: string;
  iconKey: string;
  accentColor: string;
}> = [
  { label: "فساتين", href: "/shop?category=dresses", iconKey: "tshirt", accentColor: "#ec4899" },
  { label: "عبايات", href: "/shop?category=abayas", iconKey: "star", accentColor: "#8b5cf6" },
  { label: "إكسسوارات", href: "/shop?category=accessories", iconKey: "gem", accentColor: "#f59e0b" },
  { label: "مباخر", href: "/shop?category=incense", iconKey: "coffee", accentColor: "#06b6d4" },
  { label: "أطفال", href: "/shop?category=kids", iconKey: "heart", accentColor: "#22c55e" },
  { label: "معاصم", href: "/shop?category=bracelets", iconKey: "watch", accentColor: "#fb7185" },
];

// Templates جاهزة لتسريع بناء الصفحات (بدون ما تكتب من الصفر)
// eslint-disable-next-line react-refresh/only-export-components
export function templatesForType(type: PageSectionType): SectionTemplate[] {
  switch (type) {
    case "GLOBAL_ANNOUNCEMENT":
      return [
        {
          id: "global_announcement_promo",
          label: "Global Announcement - Promo",
          data: {
            enabled: true,
            text: "شحن مجاني للطلبات فوق 199 شيكل",
            href: "/shop",
            buttonText: "تسوق الآن",
            ui: { sectionClass: "", containerClass: "" },
          } satisfies GlobalAnnouncementData,
        },
      ];

    case "GLOBAL_HEADER":
      return [
        {
          id: "global_header_store",
          label: "Global Header - Store",
          data: {
            sticky: true,
            showSearch: true,
            showMenu: true,
            showCta: true,
            ctaLabel: "تواصل معنا",
            ctaHref: "/contact",
            brandText: "",
            ui: { sectionClass: "", containerClass: "" },
          } satisfies GlobalHeaderData,
        },
      ];

    case "GLOBAL_FOOTER":
      return [
        {
          id: "global_footer_store",
          label: "Global Footer - Store",
          data: {
            aboutTitle: "عن المتجر",
            aboutText: "اكتب نبذة قصيرة عن البراند أو المتجر.",
            showNewsletter: true,
            newsletterTitle: "اشترك بالنشرة البريدية",
            newsletterPlaceholder: "اكتب بريدك",
            newsletterButtonLabel: "اشترك",
            showSocial: true,
            copyright: "",
            ui: { sectionClass: "", containerClass: "" },
          } satisfies GlobalFooterData,
        },
      ];

    case "HERO":
      return [
        {
          id: "hero_centered_cta",
          label: "Hero - وسط + CTA",
          data: {
            title: "عنوان رئيسي",
            subtitle: "وصف قصير يشرح شو بتبيع/بتقدّم.",
            backgroundImageUrl: "",
            overlay: 0.35,
            align: "center",
            primaryButton: { label: "تسوق الآن", href: "/shop" },
            secondaryButton: { label: "اعرف أكثر", href: "/about" },
            ui: { sectionClass: "", containerClass: "" },
          } satisfies HeroData,
        },
        {
          id: "hero_left_minimal",
          label: "Hero - يسار (Minimal)",
          data: {
            title: "عنوان نظيف وبسيط",
            subtitle: "جملة ثانية قصيرة.",
            backgroundImageUrl: "",
            overlay: 0.2,
            align: "left",
            primaryButton: { label: "ابدأ", href: "/shop" },
            secondaryButton: { label: "", href: "" },
            ui: { sectionClass: "", containerClass: "" },
          } satisfies HeroData,
        },
        ...buildThemeTemplates(externalHeroThemes, "hero_pack", "Hero Pack", (theme) => ({
          themeId: theme.id,
          title: "عنوان رئيسي",
          subtitle: "وصف مختصر لقسم الهيرو",
          backgroundImageUrl: "",
          overlay: 0.25,
          align: "center",
          primaryButton: { label: "تسوق الآن", href: "/shop" },
          secondaryButton: { label: "اعرف أكثر", href: "/about" },
          ui: { sectionClass: "", containerClass: "" },
        }) satisfies HeroData),
      ];

    case "RICH_TEXT":
      return [
        {
          id: "components_only",
          label: "Components فقط",
          data: {
            title: "",
            html: "",
            components: [
              {
                id: "c-components-text",
                kind: "text",
                name: "Text",
                props: { as: "p", text: "مكوّن جديد" },
              },
            ],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies RichTextData,
        },
        {
          id: "rich_about",
          label: "RichText - من نحن",
          data: {
            title: "من نحن",
            html: `<p>اكتب قصة المتجر بشكل مختصر وواضح.</p>\n<ul>\n  <li>جودة عالية</li>\n  <li>توصيل سريع</li>\n  <li>دعم ممتاز</li>\n</ul>`,
            ui: { sectionClass: "", containerClass: "" },
          } satisfies RichTextData,
        },
        {
          id: "rich_policy",
          label: "RichText - سياسة الإرجاع",
          data: {
            title: "سياسة الإرجاع",
            html: `<h3>الإرجاع خلال 14 يوم</h3>\n<p>المنتج لازم يكون بحالته الأصلية مع التغليف.</p>\n<h4>كيف ترجع المنتج؟</h4>\n<ol>\n  <li>تواصل معنا</li>\n  <li>أرسل رقم الطلب</li>\n  <li>نرتّب الاستلام</li>\n</ol>`,
            ui: { sectionClass: "", containerClass: "" },
          } satisfies RichTextData,
        },
      ];

    case "CUSTOM_HTML":
      return [
        {
          id: "custom_embed",
          label: "Custom HTML - Embed",
          data: {
            title: "Embed",
            html: `<div class="rounded-2xl border border-white/10 p-4">\n  <p>حط كود HTML هون (مثلاً map / widget).</p>\n</div>`,
            ui: { sectionClass: "", containerClass: "" },
          } satisfies CustomHtmlData,
        },
      ];

    case "FAQ":
      return [
        {
          id: "faq_shipping",
          label: "FAQ - الشحن والإرجاع",
          data: {
            title: "أسئلة شائعة",
            items: [
              { question: "كم مدة التوصيل؟", answer: "عادةً من 1-3 أيام عمل حسب المنطقة." },
              { question: "هل في إرجاع؟", answer: "نعم، الإرجاع خلال 14 يوم حسب الشروط." },
              { question: "كيف أتواصل؟", answer: "عن طريق واتساب أو البريد الموجودين بالفوتر." },
            ],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies FaqData,
        },
      ];

    case "GRID":
      return [
        {
          id: "grid_features",
          label: "Grid - مميزات (3 أعمدة)",
          data: {
            mode: "grid",
            title: "ليش تختارنا؟",
            columns: 3,
            items: [
              { title: "جودة ممتازة", text: "منتجات مختارة بعناية." },
              { title: "توصيل سريع", text: "خلال أيام قليلة." },
              { title: "دعم سريع", text: "نرد عليك بأسرع وقت." },
            ],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies GridData,
        },
        {
          id: "grid_container",
          label: "Container - Sections داخل قسم",
          data: {
            mode: "container",
            title: "قسم يحتوي أقسام",
            columns: 2,
            blocks: [
              { type: "RICH_TEXT", data: { title: "من نحن", html: "<p>نبذة قصيرة عن النشاط.</p>", ui: { sectionClass: "", containerClass: "" } } },
              { type: "FAQ", data: { title: "أسئلة شائعة", items: [{ question: "سؤال؟", answer: "جواب مختصر." }], ui: { sectionClass: "", containerClass: "" } } },
            ],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies GridData,
        },
      ];

    case "FEATURES":
      return [
        {
          id: "features_basic",
          label: "Features - 3 أعمدة",
          data: {
            title: "المميزات",
            subtitle: "ليش تختارنا؟",
            columns: 3,
            items: [
              { title: "جودة ممتازة", text: "منتجات مختارة بعناية.", icon: "✨" },
              { title: "توصيل سريع", text: "خلال أيام قليلة.", icon: "🚚" },
              { title: "دعم سريع", text: "نرد عليك بأسرع وقت.", icon: "💬" },
            ],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies FeaturesData,
        },
        ...buildThemeTemplates(externalFeatureThemes, "features_pack", "Features Pack", (theme) => ({
          themeId: theme.id,
          title: "المميزات",
          subtitle: "ليش تختارنا؟",
          columns: 3,
          items: [
            { title: "جودة ممتازة", text: "منتجات مختارة بعناية.", icon: "✨" },
            { title: "توصيل سريع", text: "خلال أيام قليلة.", icon: "🚚" },
            { title: "دعم سريع", text: "نرد عليك بأسرع وقت.", icon: "💬" },
          ],
          ui: { sectionClass: "", containerClass: "" },
        }) satisfies FeaturesData),
      ];

    case "STATS":
      return [
        {
          id: "stats_basic",
          label: "Stats - أرقام",
          data: {
            title: "أرقام تتكلم",
            subtitle: "",
            columns: 3,
            items: [
              { value: "10K+", label: "عميل سعيد" },
              { value: "120+", label: "منتج متوفر" },
              { value: "4.9/5", label: "تقييم العملاء" },
            ],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies StatsData,
        },
      ];

    case "TEAM":
      return [
        {
          id: "team_basic",
          label: "Team - الفريق",
          data: {
            title: "فريق العمل",
            subtitle: "الناس اللي يشتغلوا خلف الكواليس",
            columns: 3,
            members: [
              { name: "سارة", role: "المديرة", bio: "خبرة 8 سنوات", avatarUrl: "" },
              { name: "محمد", role: "المبيعات", bio: "مهتم بخدمة العملاء", avatarUrl: "" },
              { name: "ليان", role: "التسويق", bio: "صانعة محتوى", avatarUrl: "" },
            ],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies TeamData,
        },
      ];

    case "PRICING":
      return [
        {
          id: "pricing_basic",
          label: "Pricing - خطط أسعار",
          data: {
            title: "خطط الأسعار",
            subtitle: "اختر الخطة الأنسب لك",
            columns: 3,
            plans: [
              { name: "أساسية", price: "29$", period: "شهرياً", features: ["ميزة 1", "ميزة 2"], ctaLabel: "ابدأ", ctaHref: "#" },
              { name: "احترافية", price: "59$", period: "شهرياً", features: ["ميزة 1", "ميزة 2", "ميزة 3"], ctaLabel: "اشترك", ctaHref: "#", highlight: true, badge: "الأفضل" },
              { name: "شركات", price: "99$", period: "شهرياً", features: ["ميزة 1", "ميزة 2", "ميزة 3", "ميزة 4"], ctaLabel: "تواصل معنا", ctaHref: "#" },
            ],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies PricingData,
        },
        ...buildThemeTemplates(externalPricingThemes, "pricing_pack", "Pricing Pack", (theme) => ({
          themeId: theme.id,
          title: "خطط الأسعار",
          subtitle: "اختر الخطة الأنسب لك",
          columns: 3,
          plans: [
            { name: "أساسية", price: "29$", period: "شهرياً", features: ["ميزة 1", "ميزة 2"], ctaLabel: "ابدأ", ctaHref: "#" },
            { name: "احترافية", price: "59$", period: "شهرياً", features: ["ميزة 1", "ميزة 2", "ميزة 3"], ctaLabel: "اشترك", ctaHref: "#", highlight: true, badge: "الأفضل" },
            { name: "شركات", price: "99$", period: "شهرياً", features: ["ميزة 1", "ميزة 2", "ميزة 3", "ميزة 4"], ctaLabel: "تواصل معنا", ctaHref: "#" },
          ],
          ui: { sectionClass: "", containerClass: "" },
        }) satisfies PricingData),
      ];

    case "CONTACT":
      return [
        {
          id: "contact_basic",
          label: "Contact - تواصل",
          data: {
            title: "تواصل معنا",
            subtitle: "نرد عليك بسرعة",
            items: [
              { label: "الهاتف", value: "+970 000 000 000", href: "tel:+970000000000", icon: "📞" },
              { label: "البريد", value: "info@example.com", href: "mailto:info@example.com", icon: "✉️" },
              { label: "العنوان", value: "القدس - شارع المثال", href: "", icon: "📍" },
            ],
            mapEmbedUrl: "",
            form: {
              title: "راسلنا",
              subtitle: "",
              action: "",
              method: "POST",
              submitLabel: "إرسال",
              fields: [
                { label: "الاسم", name: "name", type: "text", required: true },
                { label: "البريد الإلكتروني", name: "email", type: "email", required: true },
                { label: "الرسالة", name: "message", type: "textarea", required: true },
              ],
            },
            ui: { sectionClass: "", containerClass: "" },
          } satisfies ContactData,
        },
      ];

    case "FEATURED_CATEGORIES":
      return [
        {
          id: "featured_categories_slider",
          label: "تصنيفات مميزة (سلايدر)",
          data: {
            title: "تسوّق حسب التصنيف",
            subtitle: "اختار القسم اللي بدك ياه",
            items: [],
            showArrows: true,
            ui: { sectionClass: "", containerClass: "" },
          } satisfies FeaturedCategoriesData,
        },
        ...buildThemeTemplates(externalCategoryThemes, "featured_categories_pack", "Category Pack", (theme) => ({
          themeId: theme.id,
          title: "تسوّق حسب التصنيف",
          subtitle: "اختار القسم اللي بدك ياه",
          items: CATEGORY_TEMPLATE_ITEMS.map((item) => ({ ...item })),
          showArrows: true,
          ui: { sectionClass: "", containerClass: "" },
        }) satisfies FeaturedCategoriesData),
      ];

    case "COLLECTIONS_GRID":
      return [
        {
          id: "collections_grid",
          label: "مجموعات (Grid)",
          data: {
            title: "مجموعات",
            subtitle: "أشهر الأقسام",
            columns: 4,
            items: [],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies CollectionsGridData,
        },
        ...buildThemeTemplates(externalCategoryThemes, "collections_pack", "Collections Pack", (theme) => ({
          themeId: theme.id,
          title: "مجموعات",
          subtitle: "أشهر الأقسام",
          columns: 4,
          items: CATEGORY_TEMPLATE_ITEMS.map((item) => ({ ...item })),
          ui: { sectionClass: "", containerClass: "" },
        }) satisfies CollectionsGridData),
      ];

    case "NEW_ARRIVALS_SLIDER":
      return [
        {
          id: "new_arrivals_slider",
          label: "وصل حديثا (Products Slider)",
          data: {
            title: "وصل حديثا",
            limit: 12,
            ui: { sectionClass: "", containerClass: "" },
          } satisfies ProductsSliderData,
        },
      ];

    case "BEST_SELLERS_SLIDER":
      return [
        {
          id: "best_sellers_slider",
          label: "الأكثر مبيعا (Products Slider)",
          data: {
            title: "الأكثر مبيعا",
            limit: 12,
            ui: { sectionClass: "", containerClass: "" },
          } satisfies ProductsSliderData,
        },
      ];

    case "BRANDS_SLIDER":
      return [
        {
          id: "brands_slider",
          label: "Brands Slider",
          data: {
            title: "علاماتنا المفضلة",
            items: [
              { name: "Brand One", logoUrl: "", href: "" },
              { name: "Brand Two", logoUrl: "", href: "" },
              { name: "Brand Three", logoUrl: "", href: "" },
              { name: "Brand Four", logoUrl: "", href: "" },
            ],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies BrandsSliderData,
        },
      ];

    case "IMAGE_GALLERY":
      return [
        {
          id: "gallery_3cols",
          label: "Gallery - 3 أعمدة",
          data: {
            title: "صور من متجرنا",
            columns: 3,
            images: [],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies ImageGalleryData,
        },
      ];

    case "BANNER":
      return [
        {
          id: "banner_sale",
          label: "Banner - إعلان",
          data: {
            text: "خصم 15% على كل المنتجات هذا الأسبوع!",
            variant: "success",
            linkLabel: "تسوق الآن",
            linkHref: "/shop",
            ui: { sectionClass: "", containerClass: "" },
          } satisfies BannerData,
        },
        ...buildThemeTemplates(externalBannerThemes, "banner_pack", "Banner Pack", (theme) => ({
          themeId: theme.id,
          text: "خصم 15% على كل المنتجات هذا الأسبوع!",
          variant: "success",
          linkLabel: "تسوق الآن",
          linkHref: "/shop",
          ui: { sectionClass: "", containerClass: "" },
        }) satisfies BannerData),
      ];

    case "CTA":
      return [
        {
          id: "cta_join",
          label: "CTA - دعوة لاتخاذ إجراء",
          data: {
            title: "بدك تساعدنا نكبر؟",
            subtitle: "تابعنا على انستغرام وشوف الجديد أول بأول.",
            imageUrl: "",
            align: "center",
            buttonLabel: "تابعنا",
            buttonHref: "https://instagram.com",
            ui: { sectionClass: "", containerClass: "" },
          } satisfies CtaData,
        },
      ];

    case "TESTIMONIALS":
      return [
        {
          id: "testimonials_basic",
          label: "Testimonials - 3 آراء",
          data: {
            title: "آراء الزبائن",
            items: [
              { name: "سارة", role: "", quote: "تجربة ممتازة وسرعة توصيل." },
              { name: "محمد", role: "", quote: "جودة عالية، أكيد برجع أشتري." },
              { name: "ليان", role: "", quote: "التعامل محترم والدعم سريع." },
            ],
            ui: { sectionClass: "", containerClass: "" },
          } satisfies TestimonialsData,
        },
      ];

    case "FEATURED_PRODUCTS":
      return [
        {
          id: "featured_products",
          label: "Featured Products - IDs",
          data: {
            title: "منتجات مميزة",
            productIds: [],
            columns: 4,
            ui: { sectionClass: "", containerClass: "" },
          } satisfies FeaturedProductsData,
        },
      ];

    case "NEWSLETTER":
      return [
        {
          id: "newsletter_simple",
          label: "Newsletter - بسيط",
          data: {
            title: "انضم للنشرة البريدية",
            text: "اشترك ليصلك كل جديد والعروض الخاصة.",
            ctaLabel: "اشترك الآن",
            ctaHref: "/contact",
            ui: { sectionClass: "", containerClass: "" },
          } satisfies NewsletterData,
        },
      ];

    case "CARDS":
      return [
        {
          id: "cards",
          label: "Cards (Flexbox)",
          data: {
            title: "Cards",
            subtitle: "",
            cards: [
              {
                title: "Card 1",
                text: "وصف قصير",
                imageUrl: "",
                badge: "",
                buttonLabel: "إقرأ المزيد",
                buttonHref: "#",
              },
            ],
            ui: {
              sectionClass: "",
              containerClass: "",
              cardsClass: "flex flex-wrap gap-4",
              cardClass: "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] rounded-2xl border border-white/10 bg-white/5 p-4",
              imageClass: "w-full h-40 object-cover rounded-xl border border-white/10",
            },
          } satisfies CardsData,
        },
      ];

    case "VIDEO":
      return [
        {
          id: "video_youtube",
          label: "Video - YouTube",
          data: {
            title: "شوف الفيديو",
            subtitle: "شرح سريع عن المنتج/المتجر.",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            posterUrl: "",
            provider: "AUTO",
            aspect: "16/9",
            autoplay: false,
            muted: true,
            loop: false,
            controls: true,
            ui: { sectionClass: "", containerClass: "" },
          } satisfies VideoData,
        },
      ];

    default:
      return [];
  }
}

function TextArea({
  label,
  value,
  onChange,
  error,
  dir = "rtl",
  placeholder,
  rows = 6,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  dir?: "rtl" | "ltr";
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      {label ? <label className="block text-sm font-medium text-white/80">{label}</label> : null}
      <textarea
        className={
          "w-full rounded-xl border bg-white/[0.03] p-3 text-sm text-white placeholder:text-white/30 outline-none transition-all " +
          (error ? "border-red-500/50 focus:ring-2 focus:ring-red-500/30" : "border-white/[0.08] hover:border-white/[0.12] focus:ring-2 focus:ring-accent-500/30")
        }
        rows={rows}
        dir={dir}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <div className="text-xs text-red-400">{error}</div> : null}
    </div>
  );
}

function DividerTitle({ title }: { title: string }) {
  return <div className="text-sm font-semibold text-white/80">{title}</div>;
}

function moveInArray<T>(arr: T[], from: number, to: number) {
  const next = arr.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

function uid(prefix = "k") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-3 h-9 w-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] text-sm opacity-60 hover:opacity-100 hover:bg-white/10"
          title="اسحب لإعادة الترتيب"
          {...attributes}
          {...listeners}
        >
          ☰
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

const HERO_ANIM_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fade-up", label: "Fade up" },
  { value: "zoom-in", label: "Zoom in" },
  { value: "slide-up", label: "Slide up" },
  { value: "scale-in", label: "Scale in" },
];

const HERO_DURATION_OPTIONS = [150, 200, 300, 400, 600, 800, 1000];
const HERO_DELAY_OPTIONS = [0, 75, 100, 150, 200, 300, 500, 700, 1000];
const HERO_SPLIT_RATIO_OPTIONS = [
  { value: "1:1", label: "50 / 50" },
  { value: "3:2", label: "60 / 40" },
  { value: "2:3", label: "40 / 60" },
  { value: "7:5", label: "58 / 42" },
  { value: "5:7", label: "42 / 58" },
];
const HERO_TRIPLE_LAYOUT_OPTIONS = [
  { value: "4:5:1", label: "40 / 50 / 10" },
  { value: "3:4:1", label: "37 / 50 / 13" },
  { value: "5:6:1", label: "42 / 50 / 8" },
];

function HeroEditor({ value, onChange, errors }: { value: HeroData; onChange: (v: HeroData) => void; errors?: CommonErrors }) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [mediaTarget, setMediaTarget] = useState<"left" | "right" | "center">("left");
  const themeId = value.themeId ?? "";
  const tripleMode = (value as any).tripleMode === true;
  const tripleLayout = (value as any).tripleLayout ?? "4:5:1";
  const tripleGap = Math.max(0, Math.min(64, Number((value as any).tripleGap ?? 24) || 24));
  const splitMode = (value as any).splitMode === true;
  const splitRatio = (value as any).splitRatio ?? "1:1";
  const splitGap = Math.max(0, Math.min(64, Number((value as any).splitGap ?? 24) || 24));
  const splitRight = ((value as any).splitRight && typeof (value as any).splitRight === "object"
    ? (value as any).splitRight
    : {
        title: "",
        subtitle: "",
        badge: "",
        backgroundImageUrl: "",
        overlay: 0.35,
        align: "center",
        primaryButton: { label: "", href: "" },
        secondaryButton: { label: "", href: "" },
      }) as HeroSlide;
  const rightThemeId = splitRight.themeId ?? "";

  const slides = Array.isArray((value as any).slides) ? ((value as any).slides as HeroSlide[]) : [];
  const isSlider = !splitMode && !tripleMode && slides.length > 0;

  const pickFromRoot = (): HeroSlide => ({
    title: (value as any).title ?? "",
    subtitle: (value as any).subtitle,
    badge: (value as any).badge,
    backgroundImageUrl: (value as any).backgroundImageUrl,
    overlay: (value as any).overlay,
    align: (value as any).align,
    primaryButton: (value as any).primaryButton,
    secondaryButton: (value as any).secondaryButton,
    slideTokens: (value as any).slideTokens,
    titleTokens: (value as any).titleTokens,
    subtitleTokens: (value as any).subtitleTokens,
    primaryButtonTokens: (value as any).primaryButtonTokens,
    secondaryButtonTokens: (value as any).secondaryButtonTokens,
  });

  const applyToRoot = (s: HeroSlide) => {
    const next: any = { ...value };
    next.title = s.title ?? "";
    next.subtitle = s.subtitle;
    next.badge = s.badge;
    next.backgroundImageUrl = s.backgroundImageUrl;
    next.overlay = s.overlay;
    next.align = s.align;
    next.primaryButton = s.primaryButton;
    next.secondaryButton = s.secondaryButton;
    next.slideTokens = s.slideTokens;
    next.titleTokens = s.titleTokens;
    next.subtitleTokens = s.subtitleTokens;
    next.primaryButtonTokens = s.primaryButtonTokens;
    next.secondaryButtonTokens = s.secondaryButtonTokens;
    delete next.slides;
    delete next.autoplayMs;
    delete next.showDots;
    onChange(next);
  };

  const updateSlide = (idx: number, patch: Partial<HeroSlide>) => {
    const nextSlides = slides.slice();
    nextSlides[idx] = { ...(nextSlides[idx] ?? { title: "" }), ...patch };
    onChange({ ...(value as any), slides: nextSlides });
  };

  const updateSlideTokens = (patch: Partial<HeroSlide>) => {
    if (isSlider) {
      updateSlide(activeSlide, patch);
    } else {
      onChange({ ...(value as any), ...patch });
    }
  };

  const updateSplitRight = (patch: Partial<HeroSlide>) => {
    onChange({ ...(value as any), splitRight: { ...splitRight, ...patch } });
  };

  const setSplitMode = (enabled: boolean) => {
    if (enabled) {
      const next: any = { ...(value as any), splitMode: true, splitRatio, splitGap, splitRight, tripleMode: false };
      delete next.slides;
      delete next.autoplayMs;
      delete next.showDots;
      onChange(next);
      return;
    }
    onChange({ ...(value as any), splitMode: false });
  };

  const setTripleMode = (enabled: boolean) => {
    if (enabled) {
      const next: any = {
        ...(value as any),
        tripleMode: true,
        tripleLayout,
        tripleGap,
        splitMode: false,
        rightIndicators: Number((value as any).rightIndicators ?? 4),
        rightActiveIndicator: Number((value as any).rightActiveIndicator ?? 1),
      };
      delete next.slides;
      delete next.autoplayMs;
      delete next.showDots;
      onChange(next);
      return;
    }
    onChange({ ...(value as any), tripleMode: false });
  };

  const removeSlide = (idx: number) => {
    const nextSlides = slides.slice();
    nextSlides.splice(idx, 1);
    if (nextSlides.length === 0) {
      applyToRoot(pickFromRoot());
      return;
    }
    onChange({ ...(value as any), slides: nextSlides });
    setActiveSlide((s) => Math.max(0, Math.min(nextSlides.length - 1, s)));
  };

  const addSlide = () => {
    const nextSlides = slides.concat([{ title: "سلايد جديد", align: "center", overlay: 0.35 } as any]);
    onChange({ ...(value as any), slides: nextSlides });
    setActiveSlide(nextSlides.length - 1);
  };

  const s = isSlider ? (slides[activeSlide] ?? slides[0]) : pickFromRoot();
  const align = (s.align ?? "center") as any;
  const rightAlign = (splitRight.align ?? "center") as any;
  const slideAnim = (value as any).slideAnim ?? "none";
  const contentAnim = (value as any).contentAnim ?? "fade-up";
  const slideDuration = Number((value as any).slideDuration ?? 600);
  const contentDuration = Number((value as any).contentDuration ?? 400);
  const contentDelay = Number((value as any).contentDelay ?? 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="Hero Theme" />
        {!splitMode ? (
          <Select
            label="Hero theme"
            value={themeId}
            placeholder="Default (classic hero)"
            onChange={(v) => {
              const nextTheme = String(v ?? "").trim();
              onChange({ ...(value as any), themeId: nextTheme || undefined });
            }}
          >
            {renderThemeOptions(HERO_THEME_CATEGORIES, HERO_THEME_OPTIONS)}
          </Select>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Left hero theme"
              value={themeId}
              placeholder="Default"
              onChange={(v) => {
                const nextTheme = String(v ?? "").trim();
                onChange({ ...(value as any), themeId: nextTheme || undefined });
              }}
            >
              {renderThemeOptions(HERO_THEME_CATEGORIES, HERO_THEME_OPTIONS)}
            </Select>
            <Select
              label="Right hero theme"
              value={rightThemeId}
              placeholder="Default"
              onChange={(v) => {
                const nextTheme = String(v ?? "").trim();
                updateSplitRight({ themeId: nextTheme || undefined });
              }}
            >
              {renderThemeOptions(HERO_THEME_CATEGORIES, HERO_THEME_OPTIONS)}
            </Select>
          </div>
        )}
        {themeId || rightThemeId ? (
          <div className="text-xs opacity-70">
            Theme mode renders the selected template. In split mode, each pane can use a different theme.
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="وضع الهيرو" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm opacity-80">
            {tripleMode ? "ثلاثة أعمدة (Left / Center / Right)" : splitMode ? "تقسيم عمودين (Left / Right)" : isSlider ? "سلايدر (عدة سلايدات)" : "سلايد واحد"}
          </div>
          <div className="flex flex-wrap gap-2">
            {!tripleMode ? (
              <Button type="button" variant="ghost" onClick={() => setTripleMode(true)}>
                تفعيل 3 أعمدة
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setTripleMode(false)}>
                تعطيل 3 أعمدة
              </Button>
            )}
            {!splitMode ? (
              <Button type="button" variant="ghost" onClick={() => setSplitMode(true)}>
                تفعيل تقسيم عمودين
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setSplitMode(false)}>
                تعطيل التقسيم
              </Button>
            )}
            {!splitMode && !tripleMode ? (
              !isSlider ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onChange({ ...(value as any), slides: [pickFromRoot()], autoplayMs: 5000, showDots: true })}
                >
                  تحويل إلى سلايدر
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={() => applyToRoot(slides[0] ?? pickFromRoot())}>
                  تعطيل السلايدر (سلايد واحد)
                </Button>
              )
            ) : null}
          </div>
        </div>

        {tripleMode ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Triple layout"
              value={tripleLayout}
              onChange={(v) => onChange({ ...(value as any), tripleLayout: (v as any) ?? "4:5:1" })}
              options={HERO_TRIPLE_LAYOUT_OPTIONS}
            />
            <Input
              label="Gap بين الأعمدة (px)"
              value={String(tripleGap)}
              onChange={(v) => onChange({ ...(value as any), tripleGap: Math.max(0, Math.min(64, Number(v) || 0)) })}
              dir="ltr"
            />
          </div>
        ) : null}

        {splitMode ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Split ratio"
              value={splitRatio}
              onChange={(v) => onChange({ ...(value as any), splitRatio: (v as any) ?? "1:1" })}
              options={HERO_SPLIT_RATIO_OPTIONS}
            />
            <Input
              label="Gap بين الأعمدة (px)"
              value={String(splitGap)}
              onChange={(v) => onChange({ ...(value as any), splitGap: Math.max(0, Math.min(64, Number(v) || 0)) })}
              dir="ltr"
            />
          </div>
        ) : null}

        {isSlider ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Autoplay (ms)"
              value={String((value as any).autoplayMs ?? 5000)}
              onChange={(v) => onChange({ ...(value as any), autoplayMs: Number(v) })}
              dir="ltr"
            />
            <Select
              label="Dots"
              value={String((value as any).showDots ?? true)}
              onChange={(v) => onChange({ ...(value as any), showDots: v === "true" })}
              options={[
                { value: "true", label: "إظهار" },
                { value: "false", label: "إخفاء" },
              ]}
            />
          </div>
        ) : null}
      </div>

      {!splitMode && !tripleMode ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
          <DividerTitle title="Animations" />
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Slide animation"
              value={slideAnim}
              onChange={(v) => onChange({ ...(value as any), slideAnim: v as any })}
              options={HERO_ANIM_OPTIONS}
            />
            <Select
              label="Slide duration (ms)"
              value={String(slideDuration)}
              onChange={(v) => onChange({ ...(value as any), slideDuration: Number(v) })}
              options={HERO_DURATION_OPTIONS.map((v) => ({ value: String(v), label: String(v) }))}
            />
            <Select
              label="Content animation"
              value={contentAnim}
              onChange={(v) => onChange({ ...(value as any), contentAnim: v as any })}
              options={HERO_ANIM_OPTIONS}
            />
            <Select
              label="Content duration (ms)"
              value={String(contentDuration)}
              onChange={(v) => onChange({ ...(value as any), contentDuration: Number(v) })}
              options={HERO_DURATION_OPTIONS.map((v) => ({ value: String(v), label: String(v) }))}
            />
            <Select
              label="Content delay (ms)"
              value={String(contentDelay)}
              onChange={(v) => onChange({ ...(value as any), contentDelay: Number(v) })}
              options={HERO_DELAY_OPTIONS.map((v) => ({ value: String(v), label: String(v) }))}
            />
          </div>
        </div>
      ) : null}

      {isSlider ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <DividerTitle title="السلايدات" />
            <Button type="button" variant="ghost" onClick={addSlide}>
              + إضافة سلايد
            </Button>
          </div>

          <div className="space-y-2">
            {slides.map((it, idx) => (
              <div
                key={idx}
                className={
                  "flex items-center justify-between gap-2 rounded-xl border p-3 " +
                  (idx === activeSlide ? "border-accent-500/50 bg-white/[0.04]" : "border-white/[0.08] bg-white/[0.02]")
                }
              >
                <button type="button" className="flex-1 text-right text-sm font-medium hover:underline" onClick={() => setActiveSlide(idx)}>
                  {it.title || `سلايد ${idx + 1}`}
                </button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (idx === 0) return;
                      const next = moveInArray(slides, idx, idx - 1);
                      onChange({ ...(value as any), slides: next });
                      setActiveSlide(idx - 1);
                    }}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (idx === slides.length - 1) return;
                      const next = moveInArray(slides, idx, idx + 1);
                      onChange({ ...(value as any), slides: next });
                      setActiveSlide(idx + 1);
                    }}
                  >
                    ↓
                  </Button>
                  <Button type="button" variant="danger" onClick={() => removeSlide(idx)}>
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          label="العنوان"
          value={s.title ?? ""}
          onChange={(v) => (isSlider ? updateSlide(activeSlide, { title: v }) : onChange({ ...value, title: v }))}
          error={errors?.title}
        />
        <Select
          label="المحاذاة"
          value={align}
          onChange={(v) => (isSlider ? updateSlide(activeSlide, { align: (v as any) ?? "center" }) : onChange({ ...value, align: (v as any) ?? "center" }))}
          options={[
            { value: "left", label: "يسار" },
            { value: "center", label: "وسط" },
            { value: "right", label: "يمين" },
          ]}
        />
        <Input
          label="شارة (اختياري)"
          value={s.badge ?? ""}
          onChange={(v) => (isSlider ? updateSlide(activeSlide, { badge: v }) : onChange({ ...value, badge: v }))}
        />
      </div>

      <TextArea
        label="وصف مختصر"
        value={s.subtitle ?? ""}
        onChange={(v) => (isSlider ? updateSlide(activeSlide, { subtitle: v }) : onChange({ ...value, subtitle: v }))}
        rows={3}
      />

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="الخلفية" />
        <div className="grid gap-3 md:grid-cols-2">
          <MediaUrlInput
            label="Background Image URL"
            value={s.backgroundImageUrl ?? ""}
            onChange={(v) => (isSlider ? updateSlide(activeSlide, { backgroundImageUrl: v }) : onChange({ ...value, backgroundImageUrl: v }))}
            placeholder="https://..."
          />
          <Input
            label="Overlay (0..1)"
            value={String(s.overlay ?? 0.35)}
            onChange={(v) => (isSlider ? updateSlide(activeSlide, { overlay: Number(v) }) : onChange({ ...value, overlay: Number(v) }))}
            error={errors?.overlay}
            dir="ltr"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMediaTarget("left");
              setMediaOpen(true);
            }}
          >
            اختر من المكتبة
          </Button>
          {s.backgroundImageUrl ? (
            <Button type="button" variant="danger" onClick={() => (isSlider ? updateSlide(activeSlide, { backgroundImageUrl: "" }) : onChange({ ...value, backgroundImageUrl: "" }))}>
              إزالة
            </Button>
          ) : null}
        </div>

        <MediaLibraryModal
          open={mediaOpen}
          onClose={() => setMediaOpen(false)}
          onSelect={(url) => {
            if (tripleMode && mediaTarget === "center") {
              onChange({ ...(value as any), centerImageUrl: url });
            } else if (splitMode && mediaTarget === "right") {
              updateSplitRight({ backgroundImageUrl: url });
            } else if (isSlider) {
              updateSlide(activeSlide, { backgroundImageUrl: url });
            } else {
              onChange({ ...value, backgroundImageUrl: url });
            }
            setMediaOpen(false);
          }}
        />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="الأزرار" />
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="زر أساسي - Label"
            value={s.primaryButton?.label ?? ""}
            onChange={(v) => {
              const pb = { ...(s.primaryButton ?? { label: "", href: "" }), label: v };
              if (isSlider) {
                updateSlide(activeSlide, { primaryButton: pb });
              } else {
                onChange({ ...value, primaryButton: pb });
              }
            }}
          />
          <Input
            label="زر أساسي - Link"
            value={s.primaryButton?.href ?? ""}
            onChange={(v) => {
              const pb = { ...(s.primaryButton ?? { label: "", href: "" }), href: v };
              if (isSlider) {
                updateSlide(activeSlide, { primaryButton: pb });
              } else {
                onChange({ ...value, primaryButton: pb });
              }
            }}
            dir="ltr"
          />
          <Input
            label="زر ثانوي - Label"
            value={s.secondaryButton?.label ?? ""}
            onChange={(v) => {
              const sb = { ...(s.secondaryButton ?? { label: "", href: "" }), label: v };
              if (isSlider) {
                updateSlide(activeSlide, { secondaryButton: sb });
              } else {
                onChange({ ...value, secondaryButton: sb });
              }
            }}
          />
          <Input
            label="زر ثانوي - Link"
            value={s.secondaryButton?.href ?? ""}
            onChange={(v) => {
              const sb = { ...(s.secondaryButton ?? { label: "", href: "" }), href: v };
              if (isSlider) {
                updateSlide(activeSlide, { secondaryButton: sb });
              } else {
                onChange({ ...value, secondaryButton: sb });
              }
            }}
            dir="ltr"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="تنسيق متقدم (السلايد)" />
        <div className="space-y-3">
          <TokensPanel label="السلايد" tokens={s.slideTokens} onChange={(t) => updateSlideTokens({ slideTokens: t })} />
          <TokensPanel label="العنوان" tokens={s.titleTokens} onChange={(t) => updateSlideTokens({ titleTokens: t })} />
          <TokensPanel label="الوصف" tokens={s.subtitleTokens} onChange={(t) => updateSlideTokens({ subtitleTokens: t })} />
          <TokensPanel label="زر أساسي" tokens={s.primaryButtonTokens} onChange={(t) => updateSlideTokens({ primaryButtonTokens: t })} />
          <TokensPanel label="زر ثانوي" tokens={s.secondaryButtonTokens} onChange={(t) => updateSlideTokens({ secondaryButtonTokens: t })} />
        </div>
      </div>

      {tripleMode ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
          <DividerTitle title="Triple Mode (Center / Right)" />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Eyebrow (اختياري)"
              value={String((value as any).eyebrow ?? "")}
              onChange={(v) => onChange({ ...(value as any), eyebrow: v })}
            />
            <Input
              label="Center image alt (اختياري)"
              value={String((value as any).centerImageAlt ?? "")}
              onChange={(v) => onChange({ ...(value as any), centerImageAlt: v })}
            />
            <MediaUrlInput
              label="Center image URL"
              value={String((value as any).centerImageUrl ?? "")}
              onChange={(v) => onChange({ ...(value as any), centerImageUrl: v })}
              placeholder="https://..."
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Right indicators"
                value={String((value as any).rightIndicators ?? 4)}
                onChange={(v) => onChange({ ...(value as any), rightIndicators: Math.max(1, Math.min(10, Number(v) || 4)) })}
                dir="ltr"
              />
              <Input
                label="Active index"
                value={String((value as any).rightActiveIndicator ?? 1)}
                onChange={(v) => onChange({ ...(value as any), rightActiveIndicator: Math.max(1, Math.min(10, Number(v) || 1)) })}
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMediaTarget("center");
                setMediaOpen(true);
              }}
            >
              اختر صورة الوسط من المكتبة
            </Button>
            {(value as any).centerImageUrl ? (
              <Button type="button" variant="danger" onClick={() => onChange({ ...(value as any), centerImageUrl: "" })}>
                إزالة صورة الوسط
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {splitMode ? (
        <>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <DividerTitle title="Hero Right (المحتوى)" />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input
                label="العنوان"
                value={splitRight.title ?? ""}
                onChange={(v) => updateSplitRight({ title: v })}
              />
              <Select
                label="المحاذاة"
                value={rightAlign}
                onChange={(v) => updateSplitRight({ align: (v as any) ?? "center" })}
                options={[
                  { value: "left", label: "يسار" },
                  { value: "center", label: "وسط" },
                  { value: "right", label: "يمين" },
                ]}
              />
            </div>
          </div>

          <TextArea
            label="Hero Right - وصف مختصر"
            value={splitRight.subtitle ?? ""}
            onChange={(v) => updateSplitRight({ subtitle: v })}
            rows={3}
          />

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
            <DividerTitle title="Hero Right - الخلفية" />
            <div className="grid gap-3 md:grid-cols-2">
              <MediaUrlInput
                label="Background Image URL"
                value={splitRight.backgroundImageUrl ?? ""}
                onChange={(v) => updateSplitRight({ backgroundImageUrl: v })}
                placeholder="https://..."
              />
              <Input
                label="Overlay (0..1)"
                value={String(splitRight.overlay ?? 0.35)}
                onChange={(v) => updateSplitRight({ overlay: Number(v) })}
                dir="ltr"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setMediaTarget("right");
                  setMediaOpen(true);
                }}
              >
                اختر من المكتبة
              </Button>
              {splitRight.backgroundImageUrl ? (
                <Button type="button" variant="danger" onClick={() => updateSplitRight({ backgroundImageUrl: "" })}>
                  إزالة
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
            <DividerTitle title="Hero Right - الأزرار" />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="زر أساسي - Label"
                value={splitRight.primaryButton?.label ?? ""}
                onChange={(v) => updateSplitRight({ primaryButton: { ...(splitRight.primaryButton ?? { label: "", href: "" }), label: v } })}
              />
              <Input
                label="زر أساسي - Link"
                value={splitRight.primaryButton?.href ?? ""}
                onChange={(v) => updateSplitRight({ primaryButton: { ...(splitRight.primaryButton ?? { label: "", href: "" }), href: v } })}
                dir="ltr"
              />
              <Input
                label="زر ثانوي - Label"
                value={splitRight.secondaryButton?.label ?? ""}
                onChange={(v) => updateSplitRight({ secondaryButton: { ...(splitRight.secondaryButton ?? { label: "", href: "" }), label: v } })}
              />
              <Input
                label="زر ثانوي - Link"
                value={splitRight.secondaryButton?.href ?? ""}
                onChange={(v) => updateSplitRight({ secondaryButton: { ...(splitRight.secondaryButton ?? { label: "", href: "" }), href: v } })}
                dir="ltr"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
            <DividerTitle title="Hero Right - تنسيق متقدم" />
            <div className="space-y-3">
              <TokensPanel label="السلايد" tokens={splitRight.slideTokens} onChange={(t) => updateSplitRight({ slideTokens: t })} />
              <TokensPanel label="العنوان" tokens={splitRight.titleTokens} onChange={(t) => updateSplitRight({ titleTokens: t })} />
              <TokensPanel label="الوصف" tokens={splitRight.subtitleTokens} onChange={(t) => updateSplitRight({ subtitleTokens: t })} />
              <TokensPanel label="زر أساسي" tokens={splitRight.primaryButtonTokens} onChange={(t) => updateSplitRight({ primaryButtonTokens: t })} />
              <TokensPanel label="زر ثانوي" tokens={splitRight.secondaryButtonTokens} onChange={(t) => updateSplitRight({ secondaryButtonTokens: t })} />
            </div>
          </div>
        </>
      ) : null}

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function HtmlWysiwyg({
  label,
  value,
  onChange,
  error,
}: {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  error?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<"wysiwyg" | "html">("wysiwyg");
  const [draft, setDraft] = useState<string>(value ?? "");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setDraft(value ?? "");
    if (mode === "wysiwyg" && ref.current && (ref.current.innerHTML ?? "") !== (value ?? "")) {
      ref.current.innerHTML = value ?? "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const sanitize = (html: string) => {
    // Keep it consistent with storefront sanitizer; strip scripts, allow basic tags.
    return DOMPurify.sanitize(html ?? "", {
      USE_PROFILES: { html: true },
    });
  };

  const exec = (cmd: string, arg?: string) => {
    // document.execCommand is deprecated but still the simplest lightweight choice.
    try {
      document.execCommand(cmd, false, arg);
    } catch {
      // ignore
    }
  };

  const applyAndSync = () => {
    const html = mode === "wysiwyg" ? (ref.current?.innerHTML ?? "") : draft;
    const clean = sanitize(html);
    setDraft(clean);
    if (ref.current && mode === "wysiwyg") ref.current.innerHTML = clean;
    onChange(clean);
  };

  return (
    <div className="space-y-2">
      {label ? <div className="text-sm font-medium opacity-90">{label}</div> : null}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2">
        <button type="button" className="h-9 rounded-xl px-3 text-sm hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>B</button>
        <button type="button" className="h-9 rounded-xl px-3 text-sm italic hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}>I</button>
        <button type="button" className="h-9 rounded-xl px-3 text-sm underline hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}>U</button>
        <span className="mx-1 h-6 w-px bg-white/10" />
        <button type="button" className="h-9 rounded-xl px-3 text-sm hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>• List</button>
        <button type="button" className="h-9 rounded-xl px-3 text-sm hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")}>1. List</button>
        <span className="mx-1 h-6 w-px bg-white/10" />
        <button type="button" className="h-9 rounded-xl px-3 text-sm hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "<p>")}>P</button>
        <button type="button" className="h-9 rounded-xl px-3 text-sm hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "<h2>")}>H2</button>
        <button type="button" className="h-9 rounded-xl px-3 text-sm hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "<h3>")}>H3</button>
        <span className="mx-1 h-6 w-px bg-white/10" />
        <button
          type="button"
          className="h-9 rounded-xl px-3 text-sm hover:bg-white/10"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const url = prompt("رابط (URL):", "https://");
            if (!url) return;
            exec("createLink", url);
          }}
        >
          Link
        </button>
        <button type="button" className="h-9 rounded-xl px-3 text-sm hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("unlink")}>Unlink</button>
        <button type="button" className="h-9 rounded-xl px-3 text-sm hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("removeFormat")}>Clear</button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className={cn(
              "h-9 rounded-xl px-3 text-sm",
              mode === "wysiwyg" ? "bg-white/10" : "hover:bg-white/10"
            )}
            onClick={() => setMode("wysiwyg")}
          >
            Editor
          </button>
          <button
            type="button"
            className={cn(
              "h-9 rounded-xl px-3 text-sm",
              mode === "html" ? "bg-white/10" : "hover:bg-white/10"
            )}
            onClick={() => setMode("html")}
          >
            HTML
          </button>
          <Button size="sm" variant="secondary" onClick={applyAndSync}>
            Apply
          </Button>
        </div>
      </div>

      {mode === "html" ? (
        <TextArea
          label={undefined}
          value={draft}
          onChange={(v) => setDraft(v)}
          rows={10}
          dir="ltr"
          error={error}
        />
      ) : (
        <div
          className={cn(
            "min-h-[240px] rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm leading-7",
            "focus:outline-none focus:ring-2 focus:ring-white/10"
          )}
          ref={ref}
          dir="rtl"
          contentEditable
          suppressContentEditableWarning
          onInput={() => {
            // local draft only; sync on blur/apply
            setDraft(ref.current?.innerHTML ?? "");
          }}
          onBlur={applyAndSync}
        />
      )}

      {error ? <div className="text-xs text-red-400">{error}</div> : null}
      <div className="text-[11px] opacity-60">نصيحة: للتحكم المتقدم استخدم تبويب HTML. الحفظ النهائي يتم بعد sanitize.</div>
    </div>
  );
}

function RichTextEditor({ value, onChange, errors }: { value: RichTextData; onChange: (v: RichTextData) => void; errors?: CommonErrors }) {
  return (
    <div className="space-y-4">
      <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
      <HtmlWysiwyg
        label="المحتوى"
        value={value.html ?? ""}
        onChange={(html) => onChange({ ...value, html })}
        error={errors?.html}
      />
      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function CustomHtmlEditor({ value, onChange, errors }: { value: CustomHtmlData; onChange: (v: CustomHtmlData) => void; errors?: CommonErrors }) {
  return (
    <div className="space-y-4">
      <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
      <TextArea
        label="HTML (متقدّم)"
        value={value.html ?? ""}
        onChange={(v) => onChange({ ...value, html: v })}
        error={errors?.html}
        dir="ltr"
        rows={10}
        placeholder="<div>...</div>"
      />
      <div className="text-xs text-amber-200/80">ملاحظة: الأفضل تلتزم بعناصر آمنة (بدون سكربتات) حسب إعدادات الـsanitize بالمتجر.</div>
      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function FaqEditor({ value, onChange, errors }: { value: FaqData; onChange: (v: FaqData) => void; errors?: CommonErrors }) {
  const items = Array.isArray(value.items) ? value.items : [];
  // Ensure stable keys for drag & drop
  useEffect(() => {
    if (!items.length) return;
    if (items.every((it: any) => typeof it.__key === "string" && it.__key)) return;
    const next = items.map((it: any) => ({ ...it, __key: it.__key ?? uid("faq") }));
    onChange({ ...value, items: next as any });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  return (
    <div className="space-y-4">
      <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
      {errors?.items ? <div className="text-xs text-red-400">{errors.items}</div> : null}

      <div className="space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const oldIndex = items.findIndex((x: any) => x.__key === active.id);
            const newIndex = items.findIndex((x: any) => x.__key === over.id);
            if (oldIndex < 0 || newIndex < 0) return;
            onChange({ ...value, items: arrayMove(items as any[], oldIndex, newIndex) as any });
          }}
        >
          <SortableContext items={(items as any[]).map((x: any) => x.__key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((it: any, idx: number) => (
                <SortableRow key={it.__key ?? idx} id={it.__key ?? String(idx)}>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold opacity-80">سؤال #{idx + 1}</div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => onChange({ ...value, items: items.filter((_: any, i: number) => i !== idx) })}
                          disabled={items.length <= 1}
                        >
                          حذف
                        </Button>
                      </div>
                    </div>

                    <Input
                      label="السؤال"
                      value={it.question ?? ""}
                      onChange={(v) => {
                        const next = items.slice();
                        next[idx] = { ...it, question: v };
                        onChange({ ...value, items: next });
                      }}
                    />
                    <TextArea
                      label="الجواب"
                      value={it.answer ?? ""}
                      onChange={(v) => {
                        const next = items.slice();
                        next[idx] = { ...it, answer: v };
                        onChange({ ...value, items: next });
                      }}
                      rows={4}
                    />

                    <div className="space-y-3">
                      <TokensPanel
                        label="العنصر"
                        tokens={it.twTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, twTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TokensPanel
                        label="السؤال"
                        tokens={it.questionTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, questionTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TokensPanel
                        label="الجواب"
                        tokens={it.answerTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, answerTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                    </div>
                  </div>
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          variant="secondary"
          onClick={() => onChange({ ...value, items: [...items, { question: "", answer: "", __key: uid("faq") }] as any })}
        >
          + إضافة سؤال
        </Button>
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function GridEditor({ value, onChange, errors }: { value: GridData; onChange: (v: GridData) => void; errors?: CommonErrors }) {
  const items = Array.isArray(value.items) ? value.items : [];
  const blocks = Array.isArray(value.blocks) ? value.blocks : [];
  const mode = (value.mode ?? "grid") as "grid" | "container";
  const cols = Number(value.columns ?? 3);
  const [newBlockType, setNewBlockType] = useState<PageSectionType>("RICH_TEXT");
  const [openBlockKey, setOpenBlockKey] = useState<string | null>(null);

  useEffect(() => {
    if (!items.length) return;
    if (items.every((it: any) => typeof it.__key === "string" && it.__key)) return;
    const next = items.map((it: any) => ({ ...it, __key: it.__key ?? uid("grid") }));
    onChange({ ...value, items: next as any });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!blocks.length) return;
    if (blocks.every((it: any) => typeof it.__key === "string" && it.__key)) return;
    const next = blocks.map((it: any) => ({ ...it, __key: it.__key ?? uid("block") }));
    onChange({ ...value, blocks: next as any });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const addBlock = () => {
    const next = blocks.concat([{ type: newBlockType, data: defaultDataForType(newBlockType), isVisible: true, __key: uid("block") } as any]);
    onChange({ ...value, blocks: next });
    setOpenBlockKey((next[next.length - 1] as any).__key ?? null);
  };

  const addThreeContentPreset = () => {
    const groupId = `hero-3-${Date.now().toString(36)}`;
    const nextBlocks = [
      {
        type: "RICH_TEXT" as PageSectionType,
        isVisible: true,
        __key: uid("block"),
        data: {
          ...defaultDataForType("RICH_TEXT"),
          title: "HEADER",
          html: "<h2 style='margin:0 0 12px;font-size:40px;line-height:1.05;font-weight:800'>YOUR TITLE<br/>IS HERE</h2><p style='margin:0 0 18px;opacity:.75'>Subtitle, you can describe your product here.</p><p style='margin:0'><a href='/shop' style='display:inline-block;padding:10px 16px;border-radius:9999px;border:1px solid rgba(255,255,255,.25);margin-inline-end:8px'>Shop now</a><a href='/video' style='display:inline-block;padding:10px 16px;border-radius:9999px;border:1px solid rgba(255,255,255,.25)'>Watch video</a></p>",
          layout: { mode: "grid", group: groupId, columns: 10, span: 4 },
        },
      },
      {
        type: "IMAGE_GALLERY" as PageSectionType,
        isVisible: true,
        __key: uid("block"),
        data: {
          ...defaultDataForType("IMAGE_GALLERY"),
          title: "",
          columns: 1,
          images: [{ url: "", alt: "hero-center-image" }],
          layout: { mode: "grid", group: groupId, columns: 10, span: 5 },
        },
      },
      {
        type: "CUSTOM_HTML" as PageSectionType,
        isVisible: true,
        __key: uid("block"),
        data: {
          ...defaultDataForType("CUSTOM_HTML"),
          title: "",
          html: "<div style='display:flex;flex-direction:column;align-items:center;gap:10px;justify-content:center;height:100%'><span style='width:8px;height:8px;border-radius:9999px;background:#d77f59'></span><span style='width:6px;height:6px;border-radius:9999px;background:rgba(255,255,255,.45)'></span><span style='width:6px;height:6px;border-radius:9999px;background:rgba(255,255,255,.45)'></span><span style='width:6px;height:6px;border-radius:9999px;background:rgba(255,255,255,.45)'></span></div>",
          layout: { mode: "grid", group: groupId, columns: 10, span: 1 },
        },
      },
    ];
    onChange({
      ...value,
      mode: "container",
      blocks: [...blocks, ...nextBlocks] as any,
    });
    setOpenBlockKey((nextBlocks[0] as any).__key ?? null);
  };

  const updateBlock = (idx: number, patch: any) => {
    const next = blocks.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...value, blocks: next });
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= blocks.length) return;
    onChange({ ...value, blocks: moveInArray(blocks, idx, j) as any });
  };

  const removeBlock = (idx: number) => {
    const next = blocks.slice();
    next.splice(idx, 1);
    onChange({ ...value, blocks: next });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <Select
          label="وضع القسم"
          value={mode}
          onChange={(v) => onChange({ ...value, mode: v as any })}
          options={[
            { value: "grid", label: "Grid (عناصر)" },
            { value: "container", label: "Container (Sections)" },
          ]}
        />
      </div>

      {mode === "grid" ? (
        <Select
          label="عدد الأعمدة"
          value={String(cols)}
          onChange={(v) => onChange({ ...value, columns: Number(v) })}
          options={[
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
          ]}
          error={errors?.columns}
        />
      ) : null}

      {errors?.items ? <div className="text-xs text-red-400">{errors.items}</div> : null}

      {mode === "container" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="نوع القسم"
              value={newBlockType}
              onChange={(v) => setNewBlockType(v as PageSectionType)}
              options={SECTION_TYPE_OPTIONS}
            />
            <Button variant="secondary" onClick={addBlock}>+ إضافة Section</Button>
            <Button variant="ghost" onClick={addThreeContentPreset}>+ قالب 3 محتوى (Left/Center/Right)</Button>
          </div>

          {blocks.length ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                const oldIndex = blocks.findIndex((x: any, i: number) => (x.__key ?? `block-${i}`) === active.id);
                const newIndex = blocks.findIndex((x: any, i: number) => (x.__key ?? `block-${i}`) === over.id);
                if (oldIndex < 0 || newIndex < 0) return;
                onChange({ ...value, blocks: arrayMove(blocks as any[], oldIndex, newIndex) as any });
              }}
            >
              <SortableContext
                items={(blocks as any[]).map((x: any, i: number) => x.__key ?? `block-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {blocks.map((block: any, idx: number) => {
                    const key = String(block.__key ?? `block-${idx}`);
                    const isOpen = openBlockKey === key;
                    return (
                      <SortableRow key={key} id={key}>
                        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              className="text-sm font-semibold hover:underline"
                              onClick={() => setOpenBlockKey(isOpen ? null : key)}
                            >
                              {block.type} #{idx + 1}
                            </button>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 text-xs opacity-80">
                                <input
                                  type="checkbox"
                                  checked={block.isVisible !== false}
                                  onChange={(e) => updateBlock(idx, { isVisible: e.target.checked })}
                                />
                                ظاهر
                              </label>
                              <Button size="sm" variant="ghost" onClick={() => moveBlock(idx, -1)} disabled={idx === 0}>↑</Button>
                              <Button size="sm" variant="ghost" onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1}>↓</Button>
                              <Button size="sm" variant="danger" onClick={() => removeBlock(idx)}>حذف</Button>
                            </div>
                          </div>

                          {isOpen ? (
                            <div className="mt-4">
                              <SectionEditor
                                type={block.type as PageSectionType}
                                value={block.data ?? {}}
                                onChange={(next) => updateBlock(idx, { data: next })}
                              />
                            </div>
                          ) : null}
                        </div>
                      </SortableRow>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm opacity-70">
              لا يوجد Sections داخل الـContainer بعد.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event;
              if (!over || active.id === over.id) return;
              const oldIndex = items.findIndex((x: any) => x.__key === active.id);
              const newIndex = items.findIndex((x: any) => x.__key === over.id);
              if (oldIndex < 0 || newIndex < 0) return;
              onChange({ ...value, items: arrayMove(items as any[], oldIndex, newIndex) as any });
            }}
          >
            <SortableContext items={(items as any[]).map((x: any) => x.__key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {items.map((it: any, idx: number) => (
                  <SortableRow key={it.__key ?? idx} id={it.__key ?? String(idx)}>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold opacity-80">عنصر #{idx + 1}</div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => onChange({ ...value, items: items.filter((_: any, i: number) => i !== idx) })}
                            disabled={items.length <= 1}
                          >
                            حذف
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          label="العنوان"
                          value={it.title ?? ""}
                          onChange={(v) => {
                            const next = items.slice();
                            next[idx] = { ...it, title: v };
                            onChange({ ...value, items: next });
                          }}
                        />
                        <Input
                          label="الرابط (اختياري)"
                          value={it.href ?? ""}
                          onChange={(v) => {
                            const next = items.slice();
                            next[idx] = { ...it, href: v };
                            onChange({ ...value, items: next });
                          }}
                          dir="ltr"
                        />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <MediaUrlInput
                          label="Image URL (اختياري)"
                          value={it.imageUrl ?? ""}
                          onChange={(v) => {
                            const next = items.slice();
                            next[idx] = { ...it, imageUrl: v };
                            onChange({ ...value, items: next });
                          }}
                        />
                        <TextArea
                          label="النص"
                          value={it.text ?? ""}
                          onChange={(v) => {
                            const next = items.slice();
                            next[idx] = { ...it, text: v };
                            onChange({ ...value, items: next });
                          }}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-3">
                        <TokensPanel
                          label="العنصر"
                          tokens={it.twTokens}
                          onChange={(t) => {
                            const next = items.slice();
                            next[idx] = { ...it, twTokens: t };
                            onChange({ ...value, items: next });
                          }}
                        />
                        <TokensPanel
                          label="العنوان"
                          tokens={it.titleTokens}
                          onChange={(t) => {
                            const next = items.slice();
                            next[idx] = { ...it, titleTokens: t };
                            onChange({ ...value, items: next });
                          }}
                        />
                        <TokensPanel
                          label="النص"
                          tokens={it.textTokens}
                          onChange={(t) => {
                            const next = items.slice();
                            next[idx] = { ...it, textTokens: t };
                            onChange({ ...value, items: next });
                          }}
                        />
                        <TokensPanel
                          label="الصورة"
                          tokens={it.imageTokens}
                          onChange={(t) => {
                            const next = items.slice();
                            next[idx] = { ...it, imageTokens: t };
                            onChange({ ...value, items: next });
                          }}
                        />
                        <TokensPanel
                          label="الرابط"
                          tokens={it.linkTokens}
                          onChange={(t) => {
                            const next = items.slice();
                            next[idx] = { ...it, linkTokens: t };
                            onChange({ ...value, items: next });
                          }}
                        />
                      </div>
                    </div>
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button variant="secondary" onClick={() => onChange({ ...value, items: [...items, { title: "", text: "", imageUrl: "", href: "", __key: uid("grid") }] as any })}>
            + إضافة عنصر
          </Button>
        </div>
      )}

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function FeaturesEditor({ value, onChange, errors }: { value: FeaturesData; onChange: (v: FeaturesData) => void; errors?: CommonErrors }) {
  const items = Array.isArray(value.items) ? value.items : [];
  const themeId = value.themeId ?? "";
  useEffect(() => {
    if (!items.length) return;
    if (items.every((it: any) => typeof it.__key === "string" && it.__key)) return;
    const next = items.map((it: any) => ({ ...it, __key: it.__key ?? uid("feat") }));
    onChange({ ...value, items: next as any });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const cols = Number(value.columns ?? 3);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="Feature Theme" />
        <Select
          label="Feature theme"
          value={themeId}
          placeholder="Default"
          onChange={(v) => {
            const nextTheme = String(v ?? "").trim();
            onChange({ ...value, themeId: nextTheme || undefined });
          }}
        >
          {renderThemeOptions(FEATURE_THEME_CATEGORIES, FEATURE_THEME_OPTIONS)}
        </Select>
        {themeId ? (
          <div className="text-xs opacity-70">Theme mode renders the selected template for the section.</div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <Input label="Subtitle (اختياري)" value={value.subtitle ?? ""} onChange={(v) => onChange({ ...value, subtitle: v })} />
      </div>

      <Select
        label="عدد الأعمدة"
        value={String(cols)}
        onChange={(v) => onChange({ ...value, columns: Number(v) })}
        options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
        error={errors?.columns}
      />

      {errors?.items ? <div className="text-xs text-red-400">{errors.items}</div> : null}

      <div className="space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const oldIndex = items.findIndex((x: any) => x.__key === active.id);
            const newIndex = items.findIndex((x: any) => x.__key === over.id);
            if (oldIndex < 0 || newIndex < 0) return;
            onChange({ ...value, items: arrayMove(items as any[], oldIndex, newIndex) as any });
          }}
        >
          <SortableContext items={(items as any[]).map((x: any) => x.__key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((it: any, idx: number) => (
                <SortableRow key={it.__key ?? idx} id={it.__key ?? String(idx)}>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold opacity-80">ميزة #{idx + 1}</div>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onChange({ ...value, items: items.filter((_: any, i: number) => i !== idx) })}
                        disabled={items.length <= 1}
                      >
                        حذف
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <TextInput
                        label="الأيقونة (Emoji)"
                        value={it.icon ?? ""}
                        onChange={(v) => {
                          const next = items.slice();
                          next[idx] = { ...it, icon: v };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <MediaUrlInput
                        label="Icon Image URL (اختياري)"
                        value={it.iconUrl ?? ""}
                        onChange={(v) => {
                          const next = items.slice();
                          next[idx] = { ...it, iconUrl: v };
                          onChange({ ...value, items: next });
                        }}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <TextInput
                        label="العنوان"
                        value={it.title ?? ""}
                        onChange={(v) => {
                          const next = items.slice();
                          next[idx] = { ...it, title: v };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TextInput
                        label="الرابط (اختياري)"
                        value={it.href ?? ""}
                        onChange={(v) => {
                          const next = items.slice();
                          next[idx] = { ...it, href: v };
                          onChange({ ...value, items: next });
                        }}
                        dir="ltr"
                      />
                    </div>

                    <TextArea
                      label="النص"
                      value={it.text ?? ""}
                      onChange={(v) => {
                        const next = items.slice();
                        next[idx] = { ...it, text: v };
                        onChange({ ...value, items: next });
                      }}
                      rows={3}
                    />

                    <div className="space-y-3">
                      <TokensPanel
                        label="العنصر"
                        tokens={it.twTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, twTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TokensPanel
                        label="الأيقونة"
                        tokens={it.iconTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, iconTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TokensPanel
                        label="العنوان"
                        tokens={it.titleTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, titleTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TokensPanel
                        label="النص"
                        tokens={it.textTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, textTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TokensPanel
                        label="الرابط"
                        tokens={it.linkTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, linkTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                    </div>
                  </div>
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          variant="secondary"
          onClick={() => onChange({ ...value, items: [...items, { title: "", text: "", icon: "", iconUrl: "", href: "", __key: uid("feat") }] as any })}
        >
          + إضافة ميزة
        </Button>
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function StatsEditor({ value, onChange, errors }: { value: StatsData; onChange: (v: StatsData) => void; errors?: CommonErrors }) {
  const items = Array.isArray(value.items) ? value.items : [];
  useEffect(() => {
    if (!items.length) return;
    if (items.every((it: any) => typeof it.__key === "string" && it.__key)) return;
    const next = items.map((it: any) => ({ ...it, __key: it.__key ?? uid("stat") }));
    onChange({ ...value, items: next as any });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const cols = Number(value.columns ?? 3);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <Input label="Subtitle (اختياري)" value={value.subtitle ?? ""} onChange={(v) => onChange({ ...value, subtitle: v })} />
      </div>

      <Select
        label="عدد الأعمدة"
        value={String(cols)}
        onChange={(v) => onChange({ ...value, columns: Number(v) })}
        options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
        error={errors?.columns}
      />

      {errors?.items ? <div className="text-xs text-red-400">{errors.items}</div> : null}

      <div className="space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const oldIndex = items.findIndex((x: any) => x.__key === active.id);
            const newIndex = items.findIndex((x: any) => x.__key === over.id);
            if (oldIndex < 0 || newIndex < 0) return;
            onChange({ ...value, items: arrayMove(items as any[], oldIndex, newIndex) as any });
          }}
        >
          <SortableContext items={(items as any[]).map((x: any) => x.__key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((it: any, idx: number) => (
                <SortableRow key={it.__key ?? idx} id={it.__key ?? String(idx)}>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold opacity-80">رقم #{idx + 1}</div>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onChange({ ...value, items: items.filter((_: any, i: number) => i !== idx) })}
                        disabled={items.length <= 1}
                      >
                        حذف
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <TextInput
                        label="القيمة"
                        value={it.value ?? ""}
                        onChange={(v) => {
                          const next = items.slice();
                          next[idx] = { ...it, value: v };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TextInput
                        label="التسمية (اختياري)"
                        value={it.label ?? ""}
                        onChange={(v) => {
                          const next = items.slice();
                          next[idx] = { ...it, label: v };
                          onChange({ ...value, items: next });
                        }}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <TextInput
                        label="أيقونة (اختياري)"
                        value={it.icon ?? ""}
                        onChange={(v) => {
                          const next = items.slice();
                          next[idx] = { ...it, icon: v };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TextInput
                        label="نص إضافي (اختياري)"
                        value={it.subtext ?? ""}
                        onChange={(v) => {
                          const next = items.slice();
                          next[idx] = { ...it, subtext: v };
                          onChange({ ...value, items: next });
                        }}
                      />
                    </div>

                    <div className="space-y-3">
                      <TokensPanel
                        label="العنصر"
                        tokens={it.twTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, twTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TokensPanel
                        label="القيمة"
                        tokens={it.valueTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, valueTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TokensPanel
                        label="التسمية"
                        tokens={it.labelTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, labelTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TokensPanel
                        label="النص الإضافي"
                        tokens={it.subtextTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, subtextTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                      <TokensPanel
                        label="الأيقونة"
                        tokens={it.iconTokens}
                        onChange={(t) => {
                          const next = items.slice();
                          next[idx] = { ...it, iconTokens: t };
                          onChange({ ...value, items: next });
                        }}
                      />
                    </div>
                  </div>
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          variant="secondary"
          onClick={() => onChange({ ...value, items: [...items, { value: "", label: "", subtext: "", icon: "", __key: uid("stat") }] as any })}
        >
          + إضافة رقم
        </Button>
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function TeamEditor({ value, onChange, errors }: { value: TeamData; onChange: (v: TeamData) => void; errors?: CommonErrors }) {
  const members = Array.isArray(value.members) ? value.members : [];
  const cols = Number(value.columns ?? 3);

  function updateMember(idx: number, patch: Partial<TeamMember>) {
    const next = members.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...value, members: next });
  }

  function addMember() {
    onChange({ ...value, members: [...members, { name: "", role: "", bio: "", avatarUrl: "", socials: [] }] });
  }

  function removeMember(idx: number) {
    const next = members.slice();
    next.splice(idx, 1);
    onChange({ ...value, members: next });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <Input label="Subtitle (اختياري)" value={value.subtitle ?? ""} onChange={(v) => onChange({ ...value, subtitle: v })} />
      </div>

      <Select
        label="عدد الأعمدة"
        value={String(cols)}
        onChange={(v) => onChange({ ...value, columns: Number(v) })}
        options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
        error={errors?.columns}
      />

      {errors?.items ? <div className="text-xs text-red-400">{errors.items}</div> : null}

      <div className="space-y-3">
        {members.map((member, idx) => (
          <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold opacity-80">عضو #{idx + 1}</div>
              <Button size="sm" variant="danger" onClick={() => removeMember(idx)} disabled={members.length <= 1}>
                حذف
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TextInput label="الاسم" value={member.name ?? ""} onChange={(v) => updateMember(idx, { name: v })} />
              <TextInput label="الدور (اختياري)" value={member.role ?? ""} onChange={(v) => updateMember(idx, { role: v })} />
            </div>

            <TextAreaInput label="نبذة (اختياري)" value={member.bio ?? ""} onChange={(v) => updateMember(idx, { bio: v })} rows={3} />

            <MediaUrlInput label="Avatar URL (اختياري)" value={member.avatarUrl ?? ""} onChange={(v) => updateMember(idx, { avatarUrl: v })} />

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold opacity-80">روابط اجتماعية</div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateMember(idx, { socials: [...(member.socials ?? []), { label: "", href: "" }] })}
                >
                  + إضافة رابط
                </Button>
              </div>
              {(member.socials ?? []).length ? (
                <div className="space-y-2">
                  {(member.socials ?? []).map((s, sIdx) => (
                    <div key={sIdx} className="grid gap-3 md:grid-cols-2">
                      <TextInput
                        label="Label"
                        value={s.label ?? ""}
                        onChange={(v) => {
                          const socials = [...(member.socials ?? [])];
                          socials[sIdx] = { ...socials[sIdx], label: v };
                          updateMember(idx, { socials });
                        }}
                      />
                      <TextInput
                        label="Link"
                        value={s.href ?? ""}
                        onChange={(v) => {
                          const socials = [...(member.socials ?? [])];
                          socials[sIdx] = { ...socials[sIdx], href: v };
                          updateMember(idx, { socials });
                        }}
                        dir="ltr"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs opacity-60">(لا يوجد روابط)</div>
              )}
            </div>

            <div className="space-y-3">
              <TokensPanel label="العنصر" tokens={member.twTokens} onChange={(t) => updateMember(idx, { twTokens: t })} />
              <TokensPanel label="الاسم" tokens={member.nameTokens} onChange={(t) => updateMember(idx, { nameTokens: t })} />
              <TokensPanel label="الدور" tokens={member.roleTokens} onChange={(t) => updateMember(idx, { roleTokens: t })} />
              <TokensPanel label="النبذة" tokens={member.bioTokens} onChange={(t) => updateMember(idx, { bioTokens: t })} />
              <TokensPanel label="الصورة" tokens={member.avatarTokens} onChange={(t) => updateMember(idx, { avatarTokens: t })} />
              <TokensPanel label="روابط اجتماعية" tokens={member.socialTokens} onChange={(t) => updateMember(idx, { socialTokens: t })} />
            </div>
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={addMember}>+ إضافة عضو</Button>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function PricingEditor({ value, onChange, errors }: { value: PricingData; onChange: (v: PricingData) => void; errors?: CommonErrors }) {
  const plans = Array.isArray(value.plans) ? value.plans : [];
  const cols = Number(value.columns ?? 3);
  const themeId = value.themeId ?? "";

  function updatePlan(idx: number, patch: Partial<PricingPlan>) {
    const next = plans.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...value, plans: next });
  }

  function addPlan() {
    onChange({ ...value, plans: [...plans, { name: "", price: "", period: "", description: "", features: [], ctaLabel: "", ctaHref: "", highlight: false, badge: "" }] });
  }

  function removePlan(idx: number) {
    const next = plans.slice();
    next.splice(idx, 1);
    onChange({ ...value, plans: next });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="Pricing Theme" />
        <Select
          label="Pricing theme"
          value={themeId}
          placeholder="Default"
          onChange={(v) => {
            const nextTheme = String(v ?? "").trim();
            onChange({ ...value, themeId: nextTheme || undefined });
          }}
        >
          {renderThemeOptions(PRICING_THEME_CATEGORIES, PRICING_THEME_OPTIONS)}
        </Select>
        {themeId ? (
          <div className="text-xs opacity-70">Theme mode renders the selected template for the section.</div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <Input label="Subtitle (اختياري)" value={value.subtitle ?? ""} onChange={(v) => onChange({ ...value, subtitle: v })} />
      </div>

      <Select
        label="عدد الأعمدة"
        value={String(cols)}
        onChange={(v) => onChange({ ...value, columns: Number(v) })}
        options={[2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
        error={errors?.columns}
      />

      {errors?.items ? <div className="text-xs text-red-400">{errors.items}</div> : null}

      <div className="space-y-3">
        {plans.map((plan, idx) => (
          <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold opacity-80">خطة #{idx + 1}</div>
              <Button size="sm" variant="danger" onClick={() => removePlan(idx)} disabled={plans.length <= 1}>
                حذف
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <TextInput label="الاسم" value={plan.name ?? ""} onChange={(v) => updatePlan(idx, { name: v })} />
              <TextInput label="السعر" value={plan.price ?? ""} onChange={(v) => updatePlan(idx, { price: v })} />
              <TextInput label="الفترة (مثال: شهرياً)" value={plan.period ?? ""} onChange={(v) => updatePlan(idx, { period: v })} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TextInput label="Badge (اختياري)" value={plan.badge ?? ""} onChange={(v) => updatePlan(idx, { badge: v })} />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!plan.highlight}
                  onChange={(e) => updatePlan(idx, { highlight: e.target.checked })}
                />
                تمييز الخطة
              </label>
            </div>

            <TextAreaInput label="الوصف (اختياري)" value={plan.description ?? ""} onChange={(v) => updatePlan(idx, { description: v })} rows={3} />

            <TextArea
              label="المزايا (سطر لكل ميزة)"
              value={(plan.features ?? []).join("\n")}
              onChange={(v) => updatePlan(idx, { features: v.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) })}
              rows={4}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <TextInput label="زر CTA" value={plan.ctaLabel ?? ""} onChange={(v) => updatePlan(idx, { ctaLabel: v })} />
              <TextInput label="رابط CTA" value={plan.ctaHref ?? ""} onChange={(v) => updatePlan(idx, { ctaHref: v })} dir="ltr" />
            </div>

            <div className="space-y-3">
              <TokensPanel label="الخطة" tokens={plan.twTokens} onChange={(t) => updatePlan(idx, { twTokens: t })} />
              <TokensPanel label="الاسم" tokens={plan.nameTokens} onChange={(t) => updatePlan(idx, { nameTokens: t })} />
              <TokensPanel label="السعر" tokens={plan.priceTokens} onChange={(t) => updatePlan(idx, { priceTokens: t })} />
              <TokensPanel label="الفترة" tokens={plan.periodTokens} onChange={(t) => updatePlan(idx, { periodTokens: t })} />
              <TokensPanel label="الوصف" tokens={plan.descriptionTokens} onChange={(t) => updatePlan(idx, { descriptionTokens: t })} />
              <TokensPanel label="الشارة" tokens={plan.badgeTokens} onChange={(t) => updatePlan(idx, { badgeTokens: t })} />
              <TokensPanel label="المزايا" tokens={plan.featureTokens} onChange={(t) => updatePlan(idx, { featureTokens: t })} />
              <TokensPanel label="زر CTA" tokens={plan.ctaTokens} onChange={(t) => updatePlan(idx, { ctaTokens: t })} />
            </div>
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={addPlan}>+ إضافة خطة</Button>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function ContactEditor({ value, onChange, errors }: { value: ContactData; onChange: (v: ContactData) => void; errors?: CommonErrors }) {
  const items = Array.isArray(value.items) ? value.items : [];
  const form = value.form ?? { fields: [] };
  const fields = Array.isArray(form.fields) ? form.fields : [];
  const themeId = value.themeId ?? "";

  const updateItem = (idx: number, patch: any) => {
    const next = items.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...value, items: next });
  };

  const updateForm = (patch: any) => {
    onChange({ ...value, form: { ...form, ...patch } });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="Contact Form Theme" />
        <Select
          label="Form theme"
          value={themeId}
          placeholder="Default (classic contact)"
          onChange={(v) => {
            const nextTheme = String(v ?? "").trim();
            onChange({ ...value, themeId: nextTheme || undefined });
          }}
        >
          {renderThemeOptions(contactFormCategories, contactFormThemes)}
        </Select>
        {themeId ? (
          <div className="text-xs opacity-70">
            Theme mode renders the selected template and maps form fields automatically.
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <Input label="Subtitle (اختياري)" value={value.subtitle ?? ""} onChange={(v) => onChange({ ...value, subtitle: v })} />
      </div>

      {errors?.items ? <div className="text-xs text-red-400">{errors.items}</div> : null}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold opacity-80">وسائل التواصل</div>
          <Button size="sm" variant="ghost" onClick={() => onChange({ ...value, items: [...items, { label: "", value: "", href: "", icon: "" }] })}>
            + إضافة وسيلة
          </Button>
        </div>
        {items.length ? (
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <TextInput label="Label" value={it.label ?? ""} onChange={(v) => updateItem(idx, { label: v })} />
                  <TextInput label="Value" value={it.value ?? ""} onChange={(v) => updateItem(idx, { value: v })} />
                  <TextInput label="Href (اختياري)" value={it.href ?? ""} onChange={(v) => updateItem(idx, { href: v })} dir="ltr" />
                  <TextInput label="Icon (Emoji)" value={it.icon ?? ""} onChange={(v) => updateItem(idx, { icon: v })} />
                </div>
                <div className="space-y-3">
                  <TokensPanel label="العنصر" tokens={it.twTokens} onChange={(t) => updateItem(idx, { twTokens: t })} />
                  <TokensPanel label="العنوان" tokens={it.labelTokens} onChange={(t) => updateItem(idx, { labelTokens: t })} />
                  <TokensPanel label="القيمة" tokens={it.valueTokens} onChange={(t) => updateItem(idx, { valueTokens: t })} />
                  <TokensPanel label="الأيقونة" tokens={it.iconTokens} onChange={(t) => updateItem(idx, { iconTokens: t })} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs opacity-60">(لا يوجد عناصر)</div>
        )}
      </div>

      <MediaUrlInput
        label="Map Embed URL (اختياري)"
        value={value.mapEmbedUrl ?? ""}
        onChange={(v) => onChange({ ...value, mapEmbedUrl: v })}
        placeholder="https://..."
      />
      <TokensPanel label="الخريطة" tokens={value.mapTokens} onChange={(t) => onChange({ ...value, mapTokens: t })} />

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <div className="text-sm font-semibold opacity-80">نموذج تواصل (اختياري)</div>
        <div className="grid gap-3 md:grid-cols-2">
          <TextInput label="Form Title" value={form.title ?? ""} onChange={(v) => updateForm({ title: v })} />
          <TextInput label="Form Subtitle" value={form.subtitle ?? ""} onChange={(v) => updateForm({ subtitle: v })} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <TextInput label="Action URL" value={form.action ?? ""} onChange={(v) => updateForm({ action: v })} dir="ltr" />
          <Select
            label="Method"
            value={form.method ?? "POST"}
            onChange={(v) => updateForm({ method: v as any })}
            options={[
              { value: "POST", label: "POST" },
              { value: "GET", label: "GET" },
            ]}
          />
          <TextInput label="Submit Label" value={form.submitLabel ?? ""} onChange={(v) => updateForm({ submitLabel: v })} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold opacity-80">حقول النموذج</div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateForm({ fields: [...fields, { label: "", name: "", type: "text", placeholder: "", required: false }] })}
            >
              + إضافة حقل
            </Button>
          </div>
          {fields.length ? (
            <div className="space-y-3">
              {fields.map((f: ContactFormField, idx: number) => (
                <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-4">
                    <TextInput
                      label="Label"
                      value={f.label ?? ""}
                      onChange={(v) => {
                        const next = fields.slice();
                        next[idx] = { ...next[idx], label: v };
                        updateForm({ fields: next });
                      }}
                    />
                    <TextInput
                      label="Name"
                      value={f.name ?? ""}
                      onChange={(v) => {
                        const next = fields.slice();
                        next[idx] = { ...next[idx], name: v };
                        updateForm({ fields: next });
                      }}
                      dir="ltr"
                    />
                    <Select
                      label="Type"
                      value={f.type ?? "text"}
                      onChange={(v) => {
                        const next = fields.slice();
                        next[idx] = { ...next[idx], type: v as any };
                        updateForm({ fields: next });
                      }}
                      options={[
                        { value: "text", label: "text" },
                        { value: "email", label: "email" },
                        { value: "tel", label: "tel" },
                        { value: "textarea", label: "textarea" },
                      ]}
                    />
                    <TextInput
                      label="Placeholder"
                      value={f.placeholder ?? ""}
                      onChange={(v) => {
                        const next = fields.slice();
                        next[idx] = { ...next[idx], placeholder: v };
                        updateForm({ fields: next });
                      }}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!f.required}
                        onChange={(e) => {
                          const next = fields.slice();
                          next[idx] = { ...next[idx], required: e.target.checked };
                          updateForm({ fields: next });
                        }}
                      />
                      مطلوب
                    </label>
                  </div>
                  <div className="space-y-3">
                    <TokensPanel
                      label="الحقل"
                      tokens={f.twTokens}
                      onChange={(t) => {
                        const next = fields.slice();
                        next[idx] = { ...next[idx], twTokens: t };
                        updateForm({ fields: next });
                      }}
                    />
                    <TokensPanel
                      label="التسمية"
                      tokens={f.labelTokens}
                      onChange={(t) => {
                        const next = fields.slice();
                        next[idx] = { ...next[idx], labelTokens: t };
                        updateForm({ fields: next });
                      }}
                    />
                    <TokensPanel
                      label="الإدخال"
                      tokens={f.inputTokens}
                      onChange={(t) => {
                        const next = fields.slice();
                        next[idx] = { ...next[idx], inputTokens: t };
                        updateForm({ fields: next });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs opacity-60">(لا يوجد حقول)</div>
          )}
        </div>

        <div className="space-y-3">
          <TokensPanel label="النموذج" tokens={form.twTokens} onChange={(t) => updateForm({ twTokens: t })} />
          <TokensPanel label="عنوان النموذج" tokens={form.titleTokens} onChange={(t) => updateForm({ titleTokens: t })} />
          <TokensPanel label="الوصف" tokens={form.subtitleTokens} onChange={(t) => updateForm({ subtitleTokens: t })} />
          <TokensPanel label="حاوية الحقل" tokens={form.fieldTokens} onChange={(t) => updateForm({ fieldTokens: t })} />
          <TokensPanel label="تسمية الحقل" tokens={form.labelTokens} onChange={(t) => updateForm({ labelTokens: t })} />
          <TokensPanel label="إدخال الحقل" tokens={form.inputTokens} onChange={(t) => updateForm({ inputTokens: t })} />
          <TokensPanel label="زر الإرسال" tokens={form.submitTokens} onChange={(t) => updateForm({ submitTokens: t })} />
        </div>
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function ImageGalleryEditor({ value, onChange, errors }: { value: ImageGalleryData; onChange: (v: ImageGalleryData) => void; errors?: CommonErrors }) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const images = Array.isArray(value.images) ? value.images : [];
  const cols = Number(value.columns ?? 3);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <Select
          label="عدد الأعمدة"
          value={String(cols)}
          onChange={(v) => onChange({ ...value, columns: Number(v) })}
          options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" }, { value: "6", label: "6" }]}
          error={errors?.columns}
        />
      </div>

      {errors?.images ? <div className="text-xs text-red-400">{errors.images}</div> : null}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DividerTitle title="الصور" />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setMediaOpen(true)}>
              + إضافة من المكتبة
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange({ ...value, images: [...images, { url: "", alt: "" }] })}
            >
              + إضافة يدوي
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {images.map((im, idx) => (
            <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold opacity-80">صورة #{idx + 1}</div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (idx === 0) return;
                      onChange({ ...value, images: moveInArray(images, idx, idx - 1) });
                    }}
                    disabled={idx === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (idx === images.length - 1) return;
                      onChange({ ...value, images: moveInArray(images, idx, idx + 1) });
                    }}
                    disabled={idx === images.length - 1}
                  >
                    ↓
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => onChange({ ...value, images: images.filter((_, i) => i != idx) })}>
                    حذف
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <MediaUrlInput
                  label="URL"
                  value={im.url ?? ""}
                  onChange={(v) => {
                    const next = images.slice();
                    next[idx] = { ...im, url: v };
                    onChange({ ...value, images: next });
                  }}
                />
                <Input
                  label="Alt (اختياري)"
                  value={im.alt ?? ""}
                  onChange={(v) => {
                    const next = images.slice();
                    next[idx] = { ...im, alt: v };
                    onChange({ ...value, images: next });
                  }}
                />
              </div>
              {im.url ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <img src={im.url} className="h-28 w-full rounded-xl object-cover border border-white/[0.08]" />
              ) : null}

              <div className="space-y-3">
                <TokensPanel
                  label="الصورة"
                  tokens={im.imageTokens}
                  onChange={(t) => {
                    const next = images.slice();
                    next[idx] = { ...im, imageTokens: t };
                    onChange({ ...value, images: next });
                  }}
                />
                <TokensPanel
                  label="الحاوية"
                  tokens={im.twTokens}
                  onChange={(t) => {
                    const next = images.slice();
                    next[idx] = { ...im, twTokens: t };
                    onChange({ ...value, images: next });
                  }}
                />
              </div>
            </div>
          ))}

          {!images.length ? <div className="text-xs opacity-70">(لا يوجد صور)</div> : null}
        </div>

        <MediaLibraryModal
          open={mediaOpen}
          onClose={() => setMediaOpen(false)}
          onSelect={(url) => {
            onChange({ ...value, images: [...images, { url, alt: "" }] });
            setMediaOpen(false);
          }}
        />
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function BannerEditor({ value, onChange, errors }: { value: BannerData; onChange: (v: BannerData) => void; errors?: CommonErrors }) {
  const themeId = value.themeId ?? "";
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="Banner Theme" />
        <Select
          label="Banner theme"
          value={themeId}
          placeholder="Default"
          onChange={(v) => {
            const nextTheme = String(v ?? "").trim();
            onChange({ ...value, themeId: nextTheme || undefined });
          }}
        >
          {renderThemeOptions(BANNER_THEME_CATEGORIES, BANNER_THEME_OPTIONS)}
        </Select>
        {themeId ? (
          <div className="text-xs opacity-70">Theme mode renders the selected template for the banner.</div>
        ) : null}
      </div>

      <TextArea label="النص" value={value.text ?? ""} onChange={(v) => onChange({ ...value, text: v })} rows={3} error={errors?.text} />
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="النوع"
          value={value.variant ?? "info"}
          onChange={(v) => onChange({ ...value, variant: (v as any) ?? "info" })}
          options={[
            { value: "info", label: "Info" },
            { value: "success", label: "Success" },
            { value: "warning", label: "Warning" },
            { value: "danger", label: "Danger" },
          ]}
        />
        <div />
        <Input label="Link Label (اختياري)" value={value.linkLabel ?? ""} onChange={(v) => onChange({ ...value, linkLabel: v })} />
        <Input label="Link Href (اختياري)" value={value.linkHref ?? ""} onChange={(v) => onChange({ ...value, linkHref: v })} dir="ltr" />
      </div>
      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function GlobalAnnouncementEditor({
  value,
  onChange,
  errors,
}: {
  value: GlobalAnnouncementData;
  onChange: (v: GlobalAnnouncementData) => void;
  errors?: CommonErrors;
}) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.enabled !== false}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        تفعيل الشريط العلوي
      </label>

      <TextArea
        label="نص الشريط"
        value={value.text ?? ""}
        onChange={(v) => onChange({ ...value, text: v })}
        rows={3}
        error={errors?.text}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="الرابط (اختياري)"
          value={value.href ?? ""}
          onChange={(v) => onChange({ ...value, href: v })}
          dir="ltr"
        />
        <Input
          label="نص الزر (اختياري)"
          value={value.buttonText ?? ""}
          onChange={(v) => onChange({ ...value, buttonText: v })}
        />
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function GlobalHeaderEditor({
  value,
  onChange,
}: {
  value: GlobalHeaderData;
  onChange: (v: GlobalHeaderData) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="اسم المتجر (اختياري)"
          value={value.brandText ?? ""}
          onChange={(v) => onChange({ ...value, brandText: v })}
        />
        <div />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.sticky !== false}
            onChange={(e) => onChange({ ...value, sticky: e.target.checked })}
          />
          Sticky Header
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.showMenu !== false}
            onChange={(e) => onChange({ ...value, showMenu: e.target.checked })}
          />
          إظهار القائمة
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.showSearch !== false}
            onChange={(e) => onChange({ ...value, showSearch: e.target.checked })}
          />
          إظهار البحث
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!value.showCta}
            onChange={(e) => onChange({ ...value, showCta: e.target.checked })}
          />
          إظهار زر CTA
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="CTA Label"
          value={value.ctaLabel ?? ""}
          onChange={(v) => onChange({ ...value, ctaLabel: v })}
          disabled={!value.showCta}
        />
        <Input
          label="CTA Link"
          value={value.ctaHref ?? ""}
          onChange={(v) => onChange({ ...value, ctaHref: v })}
          dir="ltr"
          disabled={!value.showCta}
        />
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function GlobalFooterEditor({
  value,
  onChange,
}: {
  value: GlobalFooterData;
  onChange: (v: GlobalFooterData) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="عنوان قسم عن المتجر"
          value={value.aboutTitle ?? ""}
          onChange={(v) => onChange({ ...value, aboutTitle: v })}
        />
        <Input
          label="حقوق النشر (اختياري)"
          value={value.copyright ?? ""}
          onChange={(v) => onChange({ ...value, copyright: v })}
        />
      </div>

      <TextArea
        label="نص عن المتجر"
        value={value.aboutText ?? ""}
        onChange={(v) => onChange({ ...value, aboutText: v })}
        rows={3}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.showNewsletter !== false}
            onChange={(e) => onChange({ ...value, showNewsletter: e.target.checked })}
          />
          إظهار النشرة البريدية
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.showSocial !== false}
            onChange={(e) => onChange({ ...value, showSocial: e.target.checked })}
          />
          إظهار روابط السوشال
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          label="عنوان النشرة"
          value={value.newsletterTitle ?? ""}
          onChange={(v) => onChange({ ...value, newsletterTitle: v })}
          disabled={value.showNewsletter === false}
        />
        <Input
          label="Placeholder"
          value={value.newsletterPlaceholder ?? ""}
          onChange={(v) => onChange({ ...value, newsletterPlaceholder: v })}
          disabled={value.showNewsletter === false}
        />
        <Input
          label="زر الاشتراك"
          value={value.newsletterButtonLabel ?? ""}
          onChange={(v) => onChange({ ...value, newsletterButtonLabel: v })}
          disabled={value.showNewsletter === false}
        />
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function CtaEditor({ value, onChange, errors }: { value: CtaData; onChange: (v: CtaData) => void; errors?: CommonErrors }) {
  const [mediaOpen, setMediaOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="العنوان" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} error={errors?.title} />
        <Select
          label="المحاذاة"
          value={value.align ?? "center"}
          onChange={(v) => onChange({ ...value, align: (v as any) ?? "center" })}
          options={[{ value: "left", label: "يسار" }, { value: "center", label: "وسط" }, { value: "right", label: "يمين" }]}
        />
      </div>
      <TextArea label="وصف (اختياري)" value={value.subtitle ?? ""} onChange={(v) => onChange({ ...value, subtitle: v })} rows={3} />

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="صورة (اختياري)" />
        <MediaUrlInput label="Image URL" value={value.imageUrl ?? ""} onChange={(v) => onChange({ ...value, imageUrl: v })} />
        <div className="flex gap-2 flex-wrap">
          <Button type="button" variant="ghost" onClick={() => setMediaOpen(true)}>
            اختر من المكتبة
          </Button>
          {value.imageUrl ? (
            <Button type="button" variant="danger" onClick={() => onChange({ ...value, imageUrl: "" })}>
              إزالة
            </Button>
          ) : null}
        </div>
        <MediaLibraryModal
          open={mediaOpen}
          onClose={() => setMediaOpen(false)}
          onSelect={(url) => {
            onChange({ ...value, imageUrl: url });
            setMediaOpen(false);
          }}
        />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="زر (اختياري)" />
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Button Label" value={value.buttonLabel ?? ""} onChange={(v) => onChange({ ...value, buttonLabel: v })} />
          <Input label="Button Href" value={value.buttonHref ?? ""} onChange={(v) => onChange({ ...value, buttonHref: v })} dir="ltr" />
        </div>
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function TestimonialsEditor({ value, onChange, errors }: { value: TestimonialsData; onChange: (v: TestimonialsData) => void; errors?: CommonErrors }) {
  const [pickForIndex, setPickForIndex] = useState<number | null>(null);
  const items = Array.isArray(value.items) ? value.items : [];
  return (
    <div className="space-y-4">
      <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
      {errors?.items ? <div className="text-xs text-red-400">{errors.items}</div> : null}

      <div className="space-y-3">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold opacity-80">رأي #{idx + 1}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => {
                  if (idx == 0) return;
                  onChange({ ...value, items: moveInArray(items, idx, idx - 1) });
                }} disabled={idx == 0}>↑</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  if (idx == items.length - 1) return;
                  onChange({ ...value, items: moveInArray(items, idx, idx + 1) });
                }} disabled={idx == items.length - 1}>↓</Button>
                <Button size="sm" variant="danger" onClick={() => onChange({ ...value, items: items.filter((_, i) => i !== idx) })} disabled={items.length <= 1}>حذف</Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input label="الاسم" value={it.name ?? ""} onChange={(v) => {
                const next = items.slice();
                next[idx] = { ...it, name: v };
                onChange({ ...value, items: next });
              }} />
              <Input label="الدور (اختياري)" value={it.role ?? ""} onChange={(v) => {
                const next = items.slice();
                next[idx] = { ...it, role: v };
                onChange({ ...value, items: next });
              }} />
            </div>

            <TextArea label="النص" value={it.quote ?? ""} onChange={(v) => {
              const next = items.slice();
              next[idx] = { ...it, quote: v };
              onChange({ ...value, items: next });
            }} rows={4} />

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <DividerTitle title="Avatar (اختياري)" />
              <MediaUrlInput label="Avatar URL" value={it.avatarUrl ?? ""} onChange={(v) => {
                const next = items.slice();
                next[idx] = { ...it, avatarUrl: v };
                onChange({ ...value, items: next });
              }} />
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="ghost" onClick={() => setPickForIndex(idx)}>اختر من المكتبة</Button>
                {it.avatarUrl ? <Button size="sm" variant="danger" onClick={() => {
                  const next = items.slice();
                  next[idx] = { ...it, avatarUrl: "" };
                  onChange({ ...value, items: next });
                }}>إزالة</Button> : null}
              </div>
              {it.avatarUrl ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <img src={it.avatarUrl} className="h-16 w-16 rounded-full object-cover border border-white/[0.08]" />
              ) : null}
            </div>

            <div className="space-y-3">
              <TokensPanel
                label="العنصر"
                tokens={it.twTokens}
                onChange={(t) => {
                  const next = items.slice();
                  next[idx] = { ...it, twTokens: t };
                  onChange({ ...value, items: next });
                }}
              />
              <TokensPanel
                label="الاسم"
                tokens={it.nameTokens}
                onChange={(t) => {
                  const next = items.slice();
                  next[idx] = { ...it, nameTokens: t };
                  onChange({ ...value, items: next });
                }}
              />
              <TokensPanel
                label="الدور"
                tokens={it.roleTokens}
                onChange={(t) => {
                  const next = items.slice();
                  next[idx] = { ...it, roleTokens: t };
                  onChange({ ...value, items: next });
                }}
              />
              <TokensPanel
                label="النص"
                tokens={it.quoteTokens}
                onChange={(t) => {
                  const next = items.slice();
                  next[idx] = { ...it, quoteTokens: t };
                  onChange({ ...value, items: next });
                }}
              />
              <TokensPanel
                label="الصورة"
                tokens={it.avatarTokens}
                onChange={(t) => {
                  const next = items.slice();
                  next[idx] = { ...it, avatarTokens: t };
                  onChange({ ...value, items: next });
                }}
              />
            </div>
          </div>
        ))}

        <Button variant="secondary" onClick={() => onChange({ ...value, items: [...items, { name: "", role: "", quote: "", avatarUrl: "" }] })}>
          + إضافة رأي
        </Button>
      </div>

      <MediaLibraryModal
        open={pickForIndex !== null}
        onClose={() => setPickForIndex(null)}
        onSelect={(url) => {
          const idx = pickForIndex;
          if (idx === null) return;
          const next = items.slice();
          next[idx] = { ...next[idx], avatarUrl: url };
          onChange({ ...value, items: next });
          setPickForIndex(null);
        }}
      />

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function useCategoriesList() {
  const [cats, setCats] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    let mounted = true;
    listCategories()
      .then((d) => {
        if (!mounted) return;
        setCats(Array.isArray(d) ? d : []);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message ?? "فشل تحميل التصنيفات");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const options = useMemo(() => {
    const sorted = [...cats].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    return sorted.map((c) => ({ value: c.id, label: `${c.name}  (/c/${c.slug})` }));
  }, [cats]);

  const byId = useMemo(() => {
    const m: Record<string, CatalogCategory> = {};
    for (const c of cats) m[c.id] = c;
    return m;
  }, [cats]);

  return { cats, byId, options, loading, error };
}

function FeaturedCategoriesEditor({ value, onChange, errors }: { value: FeaturedCategoriesData; onChange: (v: FeaturedCategoriesData) => void; errors?: CommonErrors }) {
  const { options, byId, loading, error } = useCategoriesList();
  const [pickId, setPickId] = useState<string>("");
  const themeId = value.themeId ?? "";

  const addFromCategory = () => {
    const id = pickId.trim();
    if (!id) return;
    const c = byId[id];
    if (!c) return;
    const next = [...(value.items ?? [])];
    if (next.some((x) => x.categoryId === id)) return;
    next.push({ categoryId: id, label: c.name, href: `/c/${c.slug}` });
    onChange({ ...value, items: next });
  };

  const updateItem = (idx: number, patch: Partial<(FeaturedCategoriesData["items"][number])>) => {
    const next = [...(value.items ?? [])];
    next[idx] = { ...next[idx], ...patch } as any;
    onChange({ ...value, items: next });
  };
  const removeItem = (idx: number) => {
    const next = [...(value.items ?? [])];
    next.splice(idx, 1);
    onChange({ ...value, items: next });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان" value={value.title ?? ""} onChange={(e: any) => onChange({ ...value, title: e.target.value })} />
        <Input label="Subtitle (اختياري)" value={value.subtitle ?? ""} onChange={(e: any) => onChange({ ...value, subtitle: e.target.value })} />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="Category Theme" />
        <Select
          label="Category theme"
          value={themeId}
          placeholder="Default"
          onChange={(v) => {
            const nextTheme = String(v ?? "").trim();
            onChange({ ...value, themeId: nextTheme || undefined });
          }}
        >
          {renderThemeOptions(CATEGORY_THEME_CATEGORIES, CATEGORY_THEME_OPTIONS)}
        </Select>
        {themeId ? <div className="text-xs opacity-70">Theme mode renders a category-pack template.</div> : null}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Select
              label="أضف تصنيف"
              value={pickId}
              onChange={(v) => setPickId(String(v ?? ""))}
              options={[{ value: "", label: loading ? "تحميل..." : "اختر تصنيف" }, ...options]}
            />
          </div>
          <Button type="button" onClick={addFromCategory} disabled={!pickId || loading}>
            إضافة
          </Button>
        </div>
        {error ? <div className="mt-2 text-xs text-red-400">{error}</div> : null}
        {errors?.items ? <div className="mt-2 text-xs text-red-400">{errors.items}</div> : null}

        <div className="mt-4 space-y-3">
          {(value.items ?? []).map((it, idx) => (
            <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput label="Label" value={it.label ?? ""} onChange={(v) => updateItem(idx, { label: v })} />
                <TextInput label="Link" value={it.href ?? ""} onChange={(v) => updateItem(idx, { href: v })} dir="ltr" />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <MediaUrlInput label="Image URL (اختياري)" value={it.imageUrl ?? ""} onChange={(v) => updateItem(idx, { imageUrl: v })} />
                <div className="flex items-end justify-end">
                  <Button type="button" variant="danger" onClick={() => removeItem(idx)}>
                    حذف
                  </Button>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                <TokensPanel
                  label="العنصر"
                  tokens={it.twTokens}
                  onChange={(t) => updateItem(idx, { twTokens: t } as any)}
                />
                <TokensPanel
                  label="العنوان"
                  tokens={it.labelTokens}
                  onChange={(t) => updateItem(idx, { labelTokens: t } as any)}
                />
                <TokensPanel
                  label="الصورة"
                  tokens={it.imageTokens}
                  onChange={(t) => updateItem(idx, { imageTokens: t } as any)}
                />
                <TokensPanel
                  label="الرابط"
                  tokens={it.linkTokens}
                  onChange={(t) => updateItem(idx, { linkTokens: t } as any)}
                />
              </div>
              <div className="mt-2 text-xs opacity-60">
                {it.categoryId ? `categoryId: ${it.categoryId}` : "(عنصر مخصص بدون categoryId)"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value.showArrows ?? true} onChange={(e) => onChange({ ...value, showArrows: e.target.checked })} />
        إظهار الأسهم
      </label>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function CollectionsGridEditor({ value, onChange, errors }: { value: CollectionsGridData; onChange: (v: CollectionsGridData) => void; errors?: CommonErrors }) {
  const { options, byId, loading, error } = useCategoriesList();
  const [pickId, setPickId] = useState<string>("");
  const themeId = value.themeId ?? "";

  const addFromCategory = () => {
    const id = pickId.trim();
    if (!id) return;
    const c = byId[id];
    if (!c) return;
    const next = [...(value.items ?? [])];
    if (next.some((x) => x.categoryId === id)) return;
    next.push({ categoryId: id, label: c.name, href: `/c/${c.slug}` });
    onChange({ ...value, items: next });
  };

  const updateItem = (idx: number, patch: Partial<(CollectionsGridData["items"][number])>) => {
    const next = [...(value.items ?? [])];
    next[idx] = { ...next[idx], ...patch } as any;
    onChange({ ...value, items: next });
  };
  const removeItem = (idx: number) => {
    const next = [...(value.items ?? [])];
    next.splice(idx, 1);
    onChange({ ...value, items: next });
  };

  const cols = value.columns ?? 4;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان" value={value.title ?? ""} onChange={(e: any) => onChange({ ...value, title: e.target.value })} />
        <Input label="Subtitle (اختياري)" value={value.subtitle ?? ""} onChange={(e: any) => onChange({ ...value, subtitle: e.target.value })} />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="Category Theme" />
        <Select
          label="Category theme"
          value={themeId}
          placeholder="Default"
          onChange={(v) => {
            const nextTheme = String(v ?? "").trim();
            onChange({ ...value, themeId: nextTheme || undefined });
          }}
        >
          {renderThemeOptions(CATEGORY_THEME_CATEGORIES, CATEGORY_THEME_OPTIONS)}
        </Select>
        {themeId ? <div className="text-xs opacity-70">Theme mode renders a category-pack template.</div> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="عدد الأعمدة"
          value={String(cols)}
          onChange={(v) => onChange({ ...value, columns: Number(v) })}
          options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
        />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Select
              label="أضف مجموعة (تصنيف)"
              value={pickId}
              onChange={(v) => setPickId(String(v ?? ""))}
              options={[{ value: "", label: loading ? "تحميل..." : "اختر تصنيف" }, ...options]}
            />
          </div>
          <Button type="button" onClick={addFromCategory} disabled={!pickId || loading}>
            إضافة
          </Button>
        </div>
        {error ? <div className="mt-2 text-xs text-red-400">{error}</div> : null}
        {errors?.items ? <div className="mt-2 text-xs text-red-400">{errors.items}</div> : null}

        <div className="mt-4 space-y-3">
          {(value.items ?? []).map((it, idx) => (
            <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput label="Label" value={it.label ?? ""} onChange={(v) => updateItem(idx, { label: v })} />
                <TextInput label="Link" value={it.href ?? ""} onChange={(v) => updateItem(idx, { href: v })} dir="ltr" />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <MediaUrlInput label="Image URL (اختياري)" value={it.imageUrl ?? ""} onChange={(v) => updateItem(idx, { imageUrl: v })} />
                <div className="flex items-end justify-end">
                  <Button type="button" variant="danger" onClick={() => removeItem(idx)}>
                    حذف
                  </Button>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                <TokensPanel
                  label="العنصر"
                  tokens={it.twTokens}
                  onChange={(t) => updateItem(idx, { twTokens: t } as any)}
                />
                <TokensPanel
                  label="العنوان"
                  tokens={it.labelTokens}
                  onChange={(t) => updateItem(idx, { labelTokens: t } as any)}
                />
                <TokensPanel
                  label="الصورة"
                  tokens={it.imageTokens}
                  onChange={(t) => updateItem(idx, { imageTokens: t } as any)}
                />
                <TokensPanel
                  label="الرابط"
                  tokens={it.linkTokens}
                  onChange={(t) => updateItem(idx, { linkTokens: t } as any)}
                />
              </div>
              <div className="mt-2 text-xs opacity-60">
                {it.categoryId ? `categoryId: ${it.categoryId}` : "(عنصر مخصص بدون categoryId)"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function NewsletterEditor({ value, onChange }: { value: NewsletterData; onChange: (v: NewsletterData) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="العنوان" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <Input label="CTA Label" value={value.ctaLabel ?? ""} onChange={(v) => onChange({ ...value, ctaLabel: v })} />
      </div>
      <Input label="CTA Link" value={value.ctaHref ?? ""} onChange={(v) => onChange({ ...value, ctaHref: v })} dir="ltr" />
      <TextArea label="النص" value={value.text ?? ""} onChange={(v) => onChange({ ...value, text: v })} rows={4} />
      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function FeaturedProductsEditor({ value, onChange, errors }: { value: FeaturedProductsData; onChange: (v: FeaturedProductsData) => void; errors?: CommonErrors }) {
  const text = (Array.isArray(value.productSlugs) ? value.productSlugs : Array.isArray(value.productIds) ? value.productIds : []).join("\n");
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <Select
          label="عدد الأعمدة"
          value={String(value.columns ?? 4)}
          onChange={(v) => onChange({ ...value, columns: Number(v) })}
          options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]}
        />
      </div>

      <TextArea
        label="Product IDs / Slugs"
        value={text}
        onChange={(v) => {
          const idsOrSlugs = v
            .split(/\r?\n/)
            .map((x) => x.trim())
            .filter(Boolean);
          onChange({ ...value, productIds: idsOrSlugs, productSlugs: idsOrSlugs });
        }}
        error={errors?.productIds}
        dir="ltr"
        rows={7}
        placeholder={`cuid_1
cuid_2
or-product-slug`}
      />

      <div className="text-xs opacity-70">ملاحظة: لاحقًا يمكن إضافة منتقي منتجات (بحث + إضافة) لملء هذه القيم.</div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function ProductsSliderEditor({
  value,
  onChange,
  label,
}: {
  value: ProductsSliderData;
  onChange: (v: ProductsSliderData) => void;
  label: string;
}) {
  const themeId = value.themeId ?? "";
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="Slider Theme" />
        <Select
          label="Slider theme"
          value={themeId}
          placeholder="Default"
          onChange={(v) => {
            const nextTheme = String(v ?? "").trim();
            onChange({ ...value, themeId: nextTheme || undefined });
          }}
        >
          {renderThemeOptions(sliderCategories, sliderThemes)}
        </Select>
        {themeId ? (
          <div className="text-xs opacity-70">Theme mode renders the selected slider template.</div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="text-sm font-semibold">{label}</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
          <Input
            label="عدد المنتجات"
            type="number"
            value={String(value.limit ?? 12)}
            onChange={(v) => {
              const n = Math.max(1, Math.min(50, Number(v) || 12));
              onChange({ ...value, limit: n });
            }}
          />
        </div>
        <div className="mt-2 text-xs opacity-70">
          سيتم جلب المنتجات تلقائياً من الـbackend (بدون اختيار يدوي).
        </div>
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

function BrandsSliderEditor({ value, onChange }: { value: BrandsSliderData; onChange: (v: BrandsSliderData) => void }) {
  const items = Array.isArray(value.items) ? value.items : [];
  const themeId = value.themeId ?? "";

  function update(i: number, patch: Partial<(typeof items)[number]>) {
    const next = items.map((x, idx) => (idx === i ? { ...x, ...patch } : x));
    onChange({ ...value, items: next });
  }
  function remove(i: number) {
    onChange({ ...value, items: items.filter((_, idx) => idx !== i) });
  }
  function add() {
    onChange({ ...value, items: [...items, { name: "", logoUrl: "", href: "" }] });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
        <DividerTitle title="Slider Theme" />
        <Select
          label="Slider theme"
          value={themeId}
          placeholder="Default"
          onChange={(v) => {
            const nextTheme = String(v ?? "").trim();
            onChange({ ...value, themeId: nextTheme || undefined });
          }}
        >
          {renderThemeOptions(sliderCategories, sliderThemes)}
        </Select>
        {themeId ? (
          <div className="text-xs opacity-70">Theme mode renders the selected slider template.</div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <div className="flex items-end justify-end">
          <Button type="button" onClick={add}>إضافة Brand</Button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="الاسم" value={it.name ?? ""} onChange={(v) => update(idx, { name: v })} />
              <MediaUrlInput label="Logo URL" value={it.logoUrl ?? ""} onChange={(v) => update(idx, { logoUrl: v })} />
              <TextInput label="Link (اختياري)" value={it.href ?? ""} onChange={(v) => update(idx, { href: v })} dir="ltr" />
            </div>
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="danger" onClick={() => remove(idx)}>حذف</Button>
            </div>
            <div className="mt-3 space-y-3">
              <TokensPanel label="العنصر" tokens={it.twTokens} onChange={(t) => update(idx, { twTokens: t } as any)} />
              <TokensPanel label="الاسم" tokens={it.nameTokens} onChange={(t) => update(idx, { nameTokens: t } as any)} />
              <TokensPanel label="الشعار" tokens={it.logoTokens} onChange={(t) => update(idx, { logoTokens: t } as any)} />
              <TokensPanel label="الرابط" tokens={it.linkTokens} onChange={(t) => update(idx, { linkTokens: t } as any)} />
            </div>
          </div>
        ))}
        {!items.length ? <div className="text-sm opacity-70">(أضف عناصر لعرضها)</div> : null}
      </div>

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}


function CardsEditor({ value, onChange }: { value: CardsData; onChange: (v: CardsData) => void; errors?: CommonErrors }) {
  const cards = value.cards ?? [];

  function updateCard(i: number, patch: Partial<CardsCard>) {
    const next = cards.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    onChange({ ...value, cards: next });
  }

  function removeCard(i: number) {
    const next = cards.filter((_, idx) => idx !== i);
    onChange({ ...value, cards: next });
  }

  function addCard() {
    onChange({
      ...value,
      cards: [
        ...cards,
        { title: "Card", text: "", imageUrl: "", badge: "", buttonLabel: "", buttonHref: "" } satisfies CardsCard,
      ],
    });
  }

  function moveCard(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= cards.length) return;
    const next = [...cards];
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    onChange({ ...value, cards: next });
  }

  const ui = (value.ui ?? {}) as any;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput label="Title" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <TextInput label="Subtitle" value={value.subtitle ?? ""} onChange={(v) => onChange({ ...value, subtitle: v })} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="Tailwind: sectionClass"
          value={ui.sectionClass ?? ""}
          onChange={(v) => onChange({ ...value, ui: { ...ui, sectionClass: v } })}
          dir="ltr"
        />
        <TextInput
          label="Tailwind: containerClass"
          value={ui.containerClass ?? ""}
          onChange={(v) => onChange({ ...value, ui: { ...ui, containerClass: v } })}
          dir="ltr"
        />
        <TextInput
          label="Tailwind: cardsClass"
          value={ui.cardsClass ?? "flex flex-wrap gap-4"}
          onChange={(v) => onChange({ ...value, ui: { ...ui, cardsClass: v } })}
          dir="ltr"
        />
        <TextInput
          label="Tailwind: cardClass"
          value={ui.cardClass ?? ""}
          onChange={(v) => onChange({ ...value, ui: { ...ui, cardClass: v } })}
          dir="ltr"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white/90">Cards</div>
        <Button type="button" variant="secondary" onClick={addCard}>
          + إضافة Card
        </Button>
      </div>

      <div className="space-y-4">
        {cards.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm opacity-80">
            ما في Cards بعد. اضغط “إضافة Card”.
          </div>
        ) : null}

        {cards.map((c, idx) => (
          <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-white/90">Card #{idx + 1}</div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => moveCard(idx, -1)} disabled={idx === 0}>
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => moveCard(idx, 1)}
                  disabled={idx === cards.length - 1}
                >
                  ↓
                </Button>
                <Button type="button" size="sm" variant="danger" onClick={() => removeCard(idx)}>
                  حذف
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextInput label="Title" value={c.title ?? ""} onChange={(v) => updateCard(idx, { title: v })} />
              <TextInput label="Badge" value={c.badge ?? ""} onChange={(v) => updateCard(idx, { badge: v })} />
              <TextAreaInput label="Text" value={c.text ?? ""} onChange={(v) => updateCard(idx, { text: v })} rows={3} />
              <div className="space-y-2">
                <MediaUrlInput
                  label="Image URL"
                  value={c.imageUrl ?? ""}
                  onChange={(v) => updateCard(idx, { imageUrl: v })}
                />
                <TextInput
                  label="Tailwind: imageClass"
                  value={ui.imageClass ?? "w-full h-40 object-cover rounded-xl border border-white/10"}
                  onChange={(v) => onChange({ ...value, ui: { ...ui, imageClass: v } })}
                  dir="ltr"
                />
              </div>
              <TextInput
                label="Button label"
                value={c.buttonLabel ?? ""}
                onChange={(v) => updateCard(idx, { buttonLabel: v })}
              />
              <TextInput
                label="Button href"
                value={c.buttonHref ?? ""}
                onChange={(v) => updateCard(idx, { buttonHref: v })}
                dir="ltr"
              />
            </div>
            <div className="mt-4 space-y-3">
              <TokensPanel label="الكرت" tokens={c.twTokens} onChange={(t) => updateCard(idx, { twTokens: t })} />
              <TokensPanel label="العنوان" tokens={c.titleTokens} onChange={(t) => updateCard(idx, { titleTokens: t })} />
              <TokensPanel label="النص" tokens={c.textTokens} onChange={(t) => updateCard(idx, { textTokens: t })} />
              <TokensPanel label="الشارة" tokens={c.badgeTokens} onChange={(t) => updateCard(idx, { badgeTokens: t })} />
              <TokensPanel label="الزر" tokens={c.buttonTokens} onChange={(t) => updateCard(idx, { buttonTokens: t })} />
              <TokensPanel label="الصورة" tokens={c.imageTokens} onChange={(t) => updateCard(idx, { imageTokens: t })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoEditor({ value, onChange, errors }: { value: VideoData; onChange: (v: VideoData) => void; errors?: CommonErrors }) {
  const [mediaOpen, setMediaOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="عنوان (اختياري)" value={value.title ?? ""} onChange={(v) => onChange({ ...value, title: v })} />
        <Select
          label="Aspect"
          value={value.aspect ?? "16/9"}
          onChange={(v) => onChange({ ...value, aspect: (v as any) ?? "16/9" })}
          options={[
            { value: "16/9", label: "16/9" },
            { value: "4/3", label: "4/3" },
            { value: "1/1", label: "1/1" },
            { value: "9/16", label: "9/16" },
          ]}
        />
      </div>

      <TextArea label="Subtitle (اختياري)" value={value.subtitle ?? ""} onChange={(v) => onChange({ ...value, subtitle: v })} rows={3} />

      <MediaUrlInput
        label="Video URL (YouTube/Vimeo/MP4)"
        value={value.url ?? ""}
        onChange={(v) => onChange({ ...value, url: v })}
        placeholder="https://..."
      />
      {errors?.url ? <div className="text-xs text-red-400">{errors.url}</div> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="Provider"
          value={value.provider ?? "AUTO"}
          onChange={(v) => onChange({ ...value, provider: (v as any) ?? "AUTO" })}
          options={[{ value: "AUTO", label: "AUTO" }, { value: "YOUTUBE", label: "YouTube" }, { value: "VIMEO", label: "Vimeo" }, { value: "MP4", label: "MP4" }]}
        />
        <MediaUrlInput
          label="Poster URL (اختياري)"
          value={value.posterUrl ?? ""}
          onChange={(v) => onChange({ ...value, posterUrl: v })}
          placeholder="https://..."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={() => setMediaOpen(true)}>
          اختر Poster من المكتبة
        </Button>
        {value.posterUrl ? (
          <Button type="button" variant="danger" onClick={() => onChange({ ...value, posterUrl: "" })}>
            إزالة
          </Button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <DividerTitle title="خيارات التشغيل" />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.controls} onChange={(e) => onChange({ ...value, controls: e.target.checked })} />
            Controls
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.autoplay} onChange={(e) => onChange({ ...value, autoplay: e.target.checked })} />
            Autoplay
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.muted} onChange={(e) => onChange({ ...value, muted: e.target.checked })} />
            Muted
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.loop} onChange={(e) => onChange({ ...value, loop: e.target.checked })} />
            Loop
          </label>
        </div>
        <div className="mt-2 text-xs opacity-60">ملاحظة: YouTube ما بدعم كل الخيارات (حسب embed).</div>
      </div>

      <MediaLibraryModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(url) => {
          onChange({ ...value, posterUrl: url });
          setMediaOpen(false);
        }}
      />

      <UiClassesEditor value={value} onChange={onChange as any} />
    </div>
  );
}

export function SectionEditor({
  type,
  value,
  onChange,
  errors,
}: {
  type: PageSectionType;
  value: any;
  onChange: (v: any) => void;
  errors?: CommonErrors;
}) {
  const baseValue = value && typeof value === "object" ? value : {};
  const sectionTokens =
    (baseValue as any)?.twTokens && typeof (baseValue as any).twTokens === "object"
      ? ((baseValue as any).twTokens as TwTokens)
      : ({} as TwTokens);

  let content: React.ReactNode;
  switch (type) {
    case "GLOBAL_ANNOUNCEMENT":
      content = <GlobalAnnouncementEditor value={value as GlobalAnnouncementData} onChange={onChange} errors={errors} />;
      break;
    case "GLOBAL_HEADER":
      content = <GlobalHeaderEditor value={value as GlobalHeaderData} onChange={onChange} />;
      break;
    case "GLOBAL_FOOTER":
      content = <GlobalFooterEditor value={value as GlobalFooterData} onChange={onChange} />;
      break;
    case "HERO":
      content = <HeroEditor value={value as HeroData} onChange={onChange} errors={errors} />;
      break;
    case "RICH_TEXT":
      content = <RichTextEditor value={value as RichTextData} onChange={onChange} errors={errors} />;
      break;
    case "CUSTOM_HTML":
      content = <CustomHtmlEditor value={value as CustomHtmlData} onChange={onChange} errors={errors} />;
      break;
    case "FAQ":
      content = <FaqEditor value={value as FaqData} onChange={onChange} errors={errors} />;
      break;
    case "GRID":
      content = <GridEditor value={value as GridData} onChange={onChange} errors={errors} />;
      break;
    case "FEATURES":
      content = <FeaturesEditor value={value as FeaturesData} onChange={onChange} errors={errors} />;
      break;
    case "STATS":
      content = <StatsEditor value={value as StatsData} onChange={onChange} errors={errors} />;
      break;
    case "TEAM":
      content = <TeamEditor value={value as TeamData} onChange={onChange} errors={errors} />;
      break;
    case "PRICING":
      content = <PricingEditor value={value as PricingData} onChange={onChange} errors={errors} />;
      break;
    case "CONTACT":
      content = <ContactEditor value={value as ContactData} onChange={onChange} errors={errors} />;
      break;
    case "FEATURED_CATEGORIES":
      content = <FeaturedCategoriesEditor value={value as FeaturedCategoriesData} onChange={onChange} errors={errors} />;
      break;
    case "COLLECTIONS_GRID":
      content = <CollectionsGridEditor value={value as CollectionsGridData} onChange={onChange} errors={errors} />;
      break;
    case "NEW_ARRIVALS_SLIDER":
      content = <ProductsSliderEditor value={value as ProductsSliderData} onChange={onChange as any} label="New Arrivals (Products Slider)" />;
      break;
    case "BEST_SELLERS_SLIDER":
      content = <ProductsSliderEditor value={value as ProductsSliderData} onChange={onChange as any} label="Best Sellers (Products Slider)" />;
      break;
    case "BRANDS_SLIDER":
      content = <BrandsSliderEditor value={value as BrandsSliderData} onChange={onChange as any} />;
      break;
    case "IMAGE_GALLERY":
      content = <ImageGalleryEditor value={value as ImageGalleryData} onChange={onChange} errors={errors} />;
      break;
    case "BANNER":
      content = <BannerEditor value={value as BannerData} onChange={onChange} errors={errors} />;
      break;
    case "CTA":
      content = <CtaEditor value={value as CtaData} onChange={onChange} errors={errors} />;
      break;
    case "TESTIMONIALS":
      content = <TestimonialsEditor value={value as TestimonialsData} onChange={onChange} errors={errors} />;
      break;
    case "FEATURED_PRODUCTS":
      content = <FeaturedProductsEditor value={value as FeaturedProductsData} onChange={onChange} errors={errors} />;
      break;
    case "NEWSLETTER":
      content = <NewsletterEditor value={value as NewsletterData} onChange={onChange} />;
      break;
    case "CARDS":
      content = <CardsEditor value={value as CardsData} onChange={onChange} errors={errors} />;
      break;
    case "VIDEO":
      content = <VideoEditor value={value as VideoData} onChange={onChange} errors={errors} />;
      break;
    default:
      content = (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="text-sm opacity-80">???? ????? ?? ?????? Editor ???? ???. ?????? Advanced JSON.</div>
        </div>
      );
      break;
  }

  return (
    <div className="space-y-4">
      {content}
      <SectionLayoutEditor value={baseValue} onChange={onChange} />
      <ResponsiveTokensPanel
        tokens={sectionTokens as any}
        onChange={(next) => onChange({ ...baseValue, twTokens: next })}
      />
    </div>
  );
}




