"use client";

import React from "react";
import type { CSSProperties } from "react";
import type { TwTokens } from "../style/tokens";
import { tokensToClassName, tokensToInlineStyle } from "../style/tokensToTw";

type HeroAction = {
  text: string;
  href?: string;
  onClick?: () => void;
};

export type AdvancedHeroProps = {
  variant?: number;
  theme?: string;
  badge?: string;
  headline?: string;
  subheadline?: string;
  description?: string;
  primaryCta?: HeroAction;
  secondaryCta?: HeroAction;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
  style?: CSSProperties;
  overlay?: number;
  slideTokens?: TwTokens;
  titleTokens?: TwTokens;
  subtitleTokens?: TwTokens;
  primaryButtonTokens?: TwTokens;
  secondaryButtonTokens?: TwTokens;
};

type VariantPreset = {
  badge: string;
  headline: string;
  subtitle: string;
  description: string;
  bgFrom: string;
  bgTo: string;
  accent: string;
  surface: string;
  text: string;
};

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function toText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function clampOverlay(value: unknown, fallback = 0.34): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(0.85, n));
}

function pickVariant<T>(variants: T[], variant?: number): T {
  if (!variants.length) throw new Error("Missing variants");
  const n = Number(variant);
  if (!Number.isFinite(n)) return variants[0];
  const idx = Math.max(1, Math.min(variants.length, Math.round(n)));
  return variants[idx - 1];
}

function mergeStyle(...styles: Array<CSSProperties | undefined>): CSSProperties | undefined {
  const merged: CSSProperties = {};
  let hasAny = false;
  for (const style of styles) {
    if (!style) continue;
    Object.assign(merged, style);
    hasAny = true;
  }
  return hasAny ? merged : undefined;
}

function resolveContent(props: AdvancedHeroProps, preset: VariantPreset) {
  const headline = toText(props.headline) ?? preset.headline;
  const subtitleOverride = toText(props.subheadline);
  const descriptionOverride = toText(props.description);
  let subheadline = subtitleOverride ?? (descriptionOverride ? undefined : preset.subtitle);
  const description = descriptionOverride ?? preset.description;
  if (subheadline && description && subheadline.trim().toLowerCase() === description.trim().toLowerCase()) {
    subheadline = undefined;
  }
  const badge = toText(props.badge) ?? preset.badge;
  return { headline, subheadline, description, badge };
}

function actionNode(
  action: HeroAction | undefined,
  kind: "primary" | "secondary",
  fallbackColor: string,
  tokens?: TwTokens,
) {
  if (!action?.text) return null;
  const className = cls(
    "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90",
    kind === "primary" ? "text-black" : "border",
    tokensToClassName(tokens),
  );
  const style = mergeStyle(
    kind === "primary"
      ? { backgroundColor: fallbackColor }
      : { borderColor: `${fallbackColor}66`, color: fallbackColor, backgroundColor: `${fallbackColor}12` },
    tokensToInlineStyle(tokens),
  );
  if (action.href) {
    return (
      <a href={action.href} onClick={action.onClick} className={className} style={style}>
        {action.text}
      </a>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className} style={style}>
      {action.text}
    </button>
  );
}

function renderCtas(props: AdvancedHeroProps, fallbackColor: string) {
  const primary = actionNode(props.primaryCta, "primary", fallbackColor, props.primaryButtonTokens);
  const secondary = actionNode(props.secondaryCta, "secondary", fallbackColor, props.secondaryButtonTokens);
  if (!primary && !secondary) return null;
  return <div className="mt-6 flex flex-wrap items-center gap-3">{primary}{secondary}</div>;
}

function MediaSurface({
  imageSrc,
  imageAlt,
  className,
  style,
  fallbackFrom,
  fallbackTo,
  overlayTint,
}: {
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
  style?: CSSProperties;
  fallbackFrom: string;
  fallbackTo: string;
  overlayTint?: string;
}) {
  return (
    <div className={cls("relative overflow-hidden", className)} style={style} data-cms-media-surface>
      {imageSrc ? (
        <img src={imageSrc} alt={imageAlt ?? ""} className="h-full w-full object-cover cms-media-target" data-cms-media-surface />
      ) : (
        <div
          className="h-full w-full"
          style={{ background: `linear-gradient(135deg, ${fallbackFrom}, ${fallbackTo})` }}
          data-cms-media-surface
        />
      )}
      {overlayTint ? <div className="pointer-events-none absolute inset-0" style={{ background: overlayTint }} /> : null}
    </div>
  );
}

const DIAMOND_PRESETS: VariantPreset[] = [
  {
    badge: "Special Offer",
    headline: "Fashion Sale",
    subtitle: "Bold cuts for modern brands",
    description: "High-contrast hero with geometric framing for premium campaigns.",
    bgFrom: "#f9fafb",
    bgTo: "#e5e7eb",
    accent: "#ef4444",
    surface: "#111827",
    text: "#0f172a",
  },
  {
    badge: "Urban Drop",
    headline: "Street Edit",
    subtitle: "New capsule release",
    description: "Angular composition designed for energetic launches and promos.",
    bgFrom: "#111827",
    bgTo: "#1f2937",
    accent: "#fbbf24",
    surface: "#0f172a",
    text: "#f8fafc",
  },
  {
    badge: "Winter Line",
    headline: "Cold Wave",
    subtitle: "Layered essentials",
    description: "Use this layout when you need a strong editorial fashion direction.",
    bgFrom: "#0b1220",
    bgTo: "#172554",
    accent: "#38bdf8",
    surface: "#020617",
    text: "#e2e8f0",
  },
  {
    badge: "Limited",
    headline: "Velvet Collection",
    subtitle: "Luxe silhouettes",
    description: "Elegant palette and clipped media surfaces for boutique storytelling.",
    bgFrom: "#f5f3ff",
    bgTo: "#ede9fe",
    accent: "#8b5cf6",
    surface: "#2e1065",
    text: "#1f2937",
  },
  {
    badge: "Flash Sale",
    headline: "Night Mode",
    subtitle: "After-dark styles",
    description: "Dark base with bright accents, ideal for highlight-driven campaigns.",
    bgFrom: "#111827",
    bgTo: "#1e1b4b",
    accent: "#fb7185",
    surface: "#020617",
    text: "#f8fafc",
  },
];

const EDITORIAL_PRESETS: VariantPreset[] = [
  {
    badge: "Editorial",
    headline: "Black and White",
    subtitle: "Minimal column layout",
    description: "Strong typography and spacing with subtle vertical line rhythm.",
    bgFrom: "#f8f6f1",
    bgTo: "#ece9df",
    accent: "#111827",
    surface: "#e5e7eb",
    text: "#111827",
  },
  {
    badge: "Monochrome",
    headline: "Pure Form",
    subtitle: "Precision styling",
    description: "Great for agencies that want an art-direction feel without heavy decoration.",
    bgFrom: "#ffffff",
    bgTo: "#f5f5f5",
    accent: "#1f2937",
    surface: "#d1d5db",
    text: "#111827",
  },
  {
    badge: "Winter Editorial",
    headline: "Still Life",
    subtitle: "Texture and contrast",
    description: "Calm neutral palette with clear content hierarchy.",
    bgFrom: "#f9fafb",
    bgTo: "#ede9fe",
    accent: "#374151",
    surface: "#e2e8f0",
    text: "#1f2937",
  },
  {
    badge: "Noir",
    headline: "Night Studio",
    subtitle: "Clean luxury mode",
    description: "Light bars on a dark surface for premium product storytelling.",
    bgFrom: "#0f172a",
    bgTo: "#020617",
    accent: "#f8fafc",
    surface: "#111827",
    text: "#e2e8f0",
  },
  {
    badge: "Contrast",
    headline: "Red Line",
    subtitle: "Statement launch",
    description: "Pair this variation with bold product shots and short copy.",
    bgFrom: "#f3f4f6",
    bgTo: "#fff1f2",
    accent: "#b91c1c",
    surface: "#fee2e2",
    text: "#111827",
  },
];

const ARCH_SPARK_PRESETS: VariantPreset[] = [
  {
    badge: "Spring Fashion",
    headline: "New Arrivals",
    subtitle: "Curated seasonal edit",
    description: "Arched frame and spark accents for playful yet premium hero banners.",
    bgFrom: "#fef9c3",
    bgTo: "#fde68a",
    accent: "#d97706",
    surface: "#fef3c7",
    text: "#78350f",
  },
  {
    badge: "Bloom Drop",
    headline: "Fresh Edit",
    subtitle: "Organic color story",
    description: "Soft tones and layered accents with strong CTA focus.",
    bgFrom: "#dcfce7",
    bgTo: "#bbf7d0",
    accent: "#15803d",
    surface: "#ecfccb",
    text: "#14532d",
  },
  {
    badge: "Golden Hour",
    headline: "Sunset Looks",
    subtitle: "Warm visual direction",
    description: "Use this for sunshine collections and highlighted brand moments.",
    bgFrom: "#fff7ed",
    bgTo: "#fed7aa",
    accent: "#ea580c",
    surface: "#ffedd5",
    text: "#7c2d12",
  },
  {
    badge: "Rose Capsule",
    headline: "Soft Season",
    subtitle: "Romantic details",
    description: "Balanced layout for beauty, fashion, and lifestyle campaigns.",
    bgFrom: "#fdf2f8",
    bgTo: "#fbcfe8",
    accent: "#be185d",
    surface: "#fce7f3",
    text: "#831843",
  },
  {
    badge: "Coastal",
    headline: "Ocean Mood",
    subtitle: "Breezy minimalism",
    description: "Blue accents and airy spacing designed for travel or summer ranges.",
    bgFrom: "#e0f2fe",
    bgTo: "#bae6fd",
    accent: "#0369a1",
    surface: "#dbeafe",
    text: "#0c4a6e",
  },
];

const BOTANICAL_PRESETS: VariantPreset[] = [
  {
    badge: "Organic Wave",
    headline: "Natural Collection",
    subtitle: "Flowing composition",
    description: "Soft wave backgrounds and grounded copy areas for product storytelling.",
    bgFrom: "#f0fdf4",
    bgTo: "#dcfce7",
    accent: "#16a34a",
    surface: "#bbf7d0",
    text: "#14532d",
  },
  {
    badge: "Leaf Edit",
    headline: "Earth Tone",
    subtitle: "Sustainable palette",
    description: "Use this style for eco brands, wellness, and handmade collections.",
    bgFrom: "#fffbeb",
    bgTo: "#fef3c7",
    accent: "#b45309",
    surface: "#fde68a",
    text: "#78350f",
  },
  {
    badge: "Garden",
    headline: "Botanic Drop",
    subtitle: "Fresh textures",
    description: "Rounded surfaces and fluid layers emphasize natural product visuals.",
    bgFrom: "#ecfdf5",
    bgTo: "#d1fae5",
    accent: "#047857",
    surface: "#a7f3d0",
    text: "#064e3b",
  },
  {
    badge: "Lush",
    headline: "Summer Wave",
    subtitle: "Bright calm rhythm",
    description: "Strong for landing pages that need soft decoration with clear messaging.",
    bgFrom: "#eef2ff",
    bgTo: "#e0e7ff",
    accent: "#4338ca",
    surface: "#c7d2fe",
    text: "#312e81",
  },
  {
    badge: "Bloomline",
    headline: "Petal Story",
    subtitle: "Modern botanical",
    description: "Elegant visual rhythm with enough contrast for strong CTA conversion.",
    bgFrom: "#fef2f2",
    bgTo: "#ffe4e6",
    accent: "#e11d48",
    surface: "#fecdd3",
    text: "#9f1239",
  },
];

const ARCH_GRADIENT_PRESETS: VariantPreset[] = [
  {
    badge: "Gradient Arch",
    headline: "New Collection",
    subtitle: "Pastel launch style",
    description: "Arched media frame and balanced copy block for premium campaigns.",
    bgFrom: "#dbeafe",
    bgTo: "#f5d0fe",
    accent: "#4338ca",
    surface: "#c4b5fd",
    text: "#1f2937",
  },
  {
    badge: "Soft Flow",
    headline: "Fresh Arrival",
    subtitle: "Elegant pastel mode",
    description: "Ideal for beauty and fashion stores that want a polished appearance.",
    bgFrom: "#ccfbf1",
    bgTo: "#fbcfe8",
    accent: "#0f766e",
    surface: "#99f6e4",
    text: "#134e4a",
  },
  {
    badge: "Rose Gradient",
    headline: "Romance Edit",
    subtitle: "Warm subtle contrast",
    description: "Combines strong headline focus with soft decorative atmosphere.",
    bgFrom: "#fee2e2",
    bgTo: "#fecdd3",
    accent: "#be123c",
    surface: "#fda4af",
    text: "#881337",
  },
  {
    badge: "Green Gradient",
    headline: "Eco Story",
    subtitle: "Clean modern tone",
    description: "Good default for sustainable catalogs and organic product releases.",
    bgFrom: "#dcfce7",
    bgTo: "#bbf7d0",
    accent: "#166534",
    surface: "#86efac",
    text: "#14532d",
  },
  {
    badge: "Golden Gradient",
    headline: "Sunrise Looks",
    subtitle: "Warm premium mode",
    description: "Creates a rich launch frame with high readability for mobile and desktop.",
    bgFrom: "#fef9c3",
    bgTo: "#fde68a",
    accent: "#92400e",
    surface: "#fcd34d",
    text: "#78350f",
  },
];

export const DiamondCutHero: React.FC<AdvancedHeroProps> = (props) => {
  const preset = pickVariant(DIAMOND_PRESETS, props.variant);
  const content = resolveContent(props, preset);
  const overlay = clampOverlay(props.overlay, 0.3);
  const titleClass = tokensToClassName(props.titleTokens);
  const subtitleClass = tokensToClassName(props.subtitleTokens);
  const titleStyle = tokensToInlineStyle(props.titleTokens);
  const subtitleStyle = tokensToInlineStyle(props.subtitleTokens);
  return (
    <section
      className={cls(
        "relative isolate overflow-hidden rounded-2xl border border-black/10",
        "grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:items-center md:p-8",
        props.className,
        tokensToClassName(props.slideTokens),
      )}
      style={mergeStyle(
        { background: `linear-gradient(135deg, ${preset.bgFrom}, ${preset.bgTo})`, color: preset.text },
        tokensToInlineStyle(props.slideTokens),
        props.style,
      )}
    >
      <div className="relative z-10">
        <div className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ backgroundColor: `${preset.accent}22`, color: preset.accent }}>
          {content.badge}
        </div>
        <h2 className={cls("text-3xl font-black uppercase leading-tight md:text-5xl", titleClass)} style={titleStyle}>{content.headline}</h2>
        <p className={cls("mt-3 max-w-[42ch] text-sm opacity-80 md:text-base", subtitleClass)} style={subtitleStyle}>{content.description}</p>
        {renderCtas(props, preset.accent)}
      </div>

      <div className="relative z-10 min-h-[250px] md:min-h-[320px]">
        <div className="absolute right-3 top-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ backgroundColor: preset.surface, color: "#ffffff" }}>
          {content.badge}
        </div>
        <MediaSurface
          imageSrc={props.imageSrc}
          imageAlt={props.imageAlt}
          className="absolute inset-3 border border-white/40 shadow-lg"
          style={{ clipPath: "polygon(14% 0%, 100% 0%, 86% 100%, 0% 100%)", backgroundColor: preset.surface }}
          fallbackFrom={preset.surface}
          fallbackTo={preset.accent}
          overlayTint={`linear-gradient(120deg, rgba(0,0,0,${overlay * 0.65}) 0%, transparent 55%)`}
        />
        <MediaSurface
          imageSrc={props.imageSrc}
          imageAlt={props.imageAlt}
          className="absolute bottom-4 left-0 h-24 w-32 border border-white/50 md:h-28 md:w-36"
          style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", backgroundColor: preset.accent }}
          fallbackFrom={preset.accent}
          fallbackTo={preset.surface}
          overlayTint={`rgba(0,0,0,${overlay * 0.35})`}
        />
        <MediaSurface
          imageSrc={props.imageSrc}
          imageAlt={props.imageAlt}
          className="absolute bottom-1 right-1 h-20 w-28 border border-white/50 md:h-24 md:w-32"
          style={{ clipPath: "polygon(14% 0%, 100% 14%, 86% 100%, 0% 86%)", backgroundColor: preset.surface }}
          fallbackFrom={preset.surface}
          fallbackTo={preset.accent}
          overlayTint={`rgba(255,255,255,${overlay * 0.1})`}
        />
      </div>
    </section>
  );
};

export const EditorialLinesHero: React.FC<AdvancedHeroProps> = (props) => {
  const preset = pickVariant(EDITORIAL_PRESETS, props.variant);
  const content = resolveContent(props, preset);
  const overlay = clampOverlay(props.overlay, 0.28);
  const variant = Number.isFinite(Number(props.variant)) ? Math.max(1, Math.min(5, Math.round(Number(props.variant)))) : 1;
  const barA = 120 + variant * 16;
  const barB = 70 + variant * 11;
  return (
    <section
      className={cls(
        "relative isolate overflow-hidden rounded-2xl border border-black/10",
        "grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)] md:items-stretch md:p-7",
        props.className,
        tokensToClassName(props.slideTokens),
      )}
      style={mergeStyle(
        { background: `linear-gradient(180deg, ${preset.bgFrom}, ${preset.bgTo})`, color: preset.text },
        tokensToInlineStyle(props.slideTokens),
        props.style,
      )}
    >
      <div className="relative z-10 flex flex-col justify-between gap-4">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.18em] opacity-60">{content.badge}</div>
          <h2 className={cls("text-3xl font-black uppercase leading-tight md:text-5xl", tokensToClassName(props.titleTokens))} style={tokensToInlineStyle(props.titleTokens)}>
            {content.headline}
          </h2>
          <p className={cls("mt-2 text-sm opacity-75 md:text-base", tokensToClassName(props.subtitleTokens))} style={tokensToInlineStyle(props.subtitleTokens)}>
            {content.subheadline}
          </p>
        </div>
        <p className="max-w-[40ch] text-xs opacity-65 md:text-sm">{content.description}</p>
        {renderCtas(props, preset.accent)}
      </div>

      <div className="relative hidden items-end gap-3 md:flex">
        <div style={{ width: 22, height: barA, backgroundColor: preset.accent, opacity: 0.88 }} />
        <div style={{ width: 34, height: barB, backgroundColor: preset.accent, opacity: 0.55 }} />
      </div>

      <div className="relative min-h-[220px] overflow-hidden rounded-xl border border-black/10">
        <MediaSurface
          imageSrc={props.imageSrc}
          imageAlt={props.imageAlt}
          className="absolute inset-0"
          fallbackFrom={preset.surface}
          fallbackTo={preset.bgTo}
          overlayTint={`linear-gradient(90deg, rgba(0,0,0,${overlay}) 0%, transparent 60%)`}
        />
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white/60 to-transparent" />
      </div>
    </section>
  );
};

export const ArchSparklHero: React.FC<AdvancedHeroProps> = (props) => {
  const preset = pickVariant(ARCH_SPARK_PRESETS, props.variant);
  const content = resolveContent(props, preset);
  const overlay = clampOverlay(props.overlay, 0.32);
  return (
    <section
      className={cls(
        "relative isolate overflow-hidden rounded-2xl border border-black/10",
        "p-6 md:p-8",
        props.className,
        tokensToClassName(props.slideTokens),
      )}
      style={mergeStyle(
        { background: `linear-gradient(135deg, ${preset.bgFrom}, ${preset.bgTo})`, color: preset.text },
        tokensToInlineStyle(props.slideTokens),
        props.style,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute left-[46%] top-8 text-xl opacity-40">*</span>
        <span className="absolute right-10 top-6 text-2xl opacity-40">*</span>
        <span className="absolute bottom-8 left-[54%] text-lg opacity-35">*</span>
      </div>

      <div className="relative z-10 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div>
          <div className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ backgroundColor: `${preset.accent}25`, color: preset.accent }}>
            {content.badge}
          </div>
          <h2 className={cls("text-3xl font-black leading-tight md:text-5xl", tokensToClassName(props.titleTokens))} style={tokensToInlineStyle(props.titleTokens)}>
            {content.headline}
          </h2>
          <p className={cls("mt-2 max-w-[44ch] text-sm opacity-80 md:text-base", tokensToClassName(props.subtitleTokens))} style={tokensToInlineStyle(props.subtitleTokens)}>
            {content.subheadline}
          </p>
          <p className="mt-2 max-w-[46ch] text-xs opacity-70 md:text-sm">{content.description}</p>
          {renderCtas(props, preset.accent)}
        </div>

        <div className="relative mx-auto w-full max-w-[360px]">
          <div className="absolute -inset-4 rounded-[42%_42%_18%_18%/34%_34%_12%_12%]" style={{ backgroundColor: `${preset.accent}22` }} />
          <MediaSurface
            imageSrc={props.imageSrc}
            imageAlt={props.imageAlt}
            className="relative aspect-[4/5] w-full border border-white/60 shadow-xl"
            style={{ borderRadius: "42% 42% 18% 18% / 34% 34% 12% 12%" }}
            fallbackFrom={preset.surface}
            fallbackTo={preset.bgTo}
            overlayTint={`linear-gradient(180deg, transparent 0%, rgba(0,0,0,${overlay * 0.9}) 100%)`}
          />
          <span className="absolute right-4 top-4 rounded-full px-3 py-1 text-[11px] font-semibold" style={{ backgroundColor: "#ffffffb3", color: preset.text }}>
            {content.badge}
          </span>
        </div>
      </div>
    </section>
  );
};

export const BotanicalWaveHero: React.FC<AdvancedHeroProps> = (props) => {
  const preset = pickVariant(BOTANICAL_PRESETS, props.variant);
  const content = resolveContent(props, preset);
  const overlay = clampOverlay(props.overlay, 0.3);
  return (
    <section
      className={cls(
        "relative isolate overflow-hidden rounded-2xl border border-black/10",
        "p-6 md:p-8",
        props.className,
        tokensToClassName(props.slideTokens),
      )}
      style={mergeStyle(
        { background: `linear-gradient(140deg, ${preset.bgFrom}, ${preset.bgTo})`, color: preset.text },
        tokensToInlineStyle(props.slideTokens),
        props.style,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 bottom-[-60px] h-44 w-72 rounded-[50%] bg-white/40" />
        <div className="absolute right-[-80px] top-[-70px] h-52 w-80 rounded-[45%] bg-white/35" />
        <div className="absolute left-[28%] top-[8%] h-24 w-24 rounded-full" style={{ backgroundColor: `${preset.accent}33` }} />
      </div>

      <div className="relative z-10 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div>
          <div className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ backgroundColor: `${preset.accent}25`, color: preset.accent }}>
            {content.badge}
          </div>
          <h2 className={cls("text-3xl font-black leading-tight md:text-5xl", tokensToClassName(props.titleTokens))} style={tokensToInlineStyle(props.titleTokens)}>
            {content.headline}
          </h2>
          <p className={cls("mt-2 text-sm opacity-80 md:text-base", tokensToClassName(props.subtitleTokens))} style={tokensToInlineStyle(props.subtitleTokens)}>
            {content.subheadline}
          </p>
          <p className="mt-2 max-w-[44ch] text-xs opacity-70 md:text-sm">{content.description}</p>
          {renderCtas(props, preset.accent)}
        </div>

        <div className="relative mx-auto w-full max-w-[350px]">
          <MediaSurface
            imageSrc={props.imageSrc}
            imageAlt={props.imageAlt}
            className="aspect-[4/5] w-full border border-white/50 shadow-xl"
            style={{ borderRadius: "38% 62% 57% 43% / 32% 43% 57% 68%" }}
            fallbackFrom={preset.surface}
            fallbackTo={preset.bgTo}
            overlayTint={`linear-gradient(180deg, rgba(255,255,255,${overlay * 0.25}) 0%, rgba(0,0,0,${overlay * 0.68}) 100%)`}
          />
        </div>
      </div>
    </section>
  );
};

export const ArchGradientHero: React.FC<AdvancedHeroProps> = (props) => {
  const preset = pickVariant(ARCH_GRADIENT_PRESETS, props.variant);
  const content = resolveContent(props, preset);
  const overlay = clampOverlay(props.overlay, 0.33);
  return (
    <section
      className={cls(
        "relative isolate overflow-hidden rounded-2xl border border-black/10",
        "p-6 md:p-8",
        props.className,
        tokensToClassName(props.slideTokens),
      )}
      style={mergeStyle(
        { background: `linear-gradient(135deg, ${preset.bgFrom}, ${preset.bgTo})`, color: preset.text },
        tokensToInlineStyle(props.slideTokens),
        props.style,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-8 top-8 h-7 w-7 rotate-45 border border-black/20" />
        <div className="absolute left-10 top-10 h-6 w-6 rounded-full border border-black/20" />
        <div className="absolute bottom-10 right-12 text-lg opacity-40">*</div>
      </div>

      <div className="relative z-10 grid items-center gap-8 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[320px]">
          <div className="relative rounded-[180px_180px_20px_20px] p-2" style={{ backgroundColor: `${preset.surface}80` }}>
            <MediaSurface
              imageSrc={props.imageSrc}
              imageAlt={props.imageAlt}
              className="aspect-[3/4] w-full border border-white/50"
              style={{ borderRadius: "170px 170px 16px 16px" }}
              fallbackFrom={preset.surface}
              fallbackTo={preset.bgTo}
              overlayTint={`linear-gradient(180deg, rgba(0,0,0,${overlay * 0.58}) 0%, transparent 45%)`}
            />
          </div>
        </div>

        <div>
          <div className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ backgroundColor: `${preset.accent}22`, color: preset.accent }}>
            {content.badge}
          </div>
          <h2 className={cls("text-3xl font-black leading-tight md:text-5xl", tokensToClassName(props.titleTokens))} style={tokensToInlineStyle(props.titleTokens)}>
            {content.headline}
          </h2>
          <p className={cls("mt-2 text-sm opacity-80 md:text-base", tokensToClassName(props.subtitleTokens))} style={tokensToInlineStyle(props.subtitleTokens)}>
            {content.subheadline}
          </p>
          <p className="mt-2 max-w-[46ch] text-xs opacity-70 md:text-sm">{content.description}</p>
          {renderCtas(props, preset.accent)}
        </div>
      </div>
    </section>
  );
};

export const FAMILIES = [
  { id: "diamond", name: "Diamond Cut", count: 5, Component: DiamondCutHero },
  { id: "editorial", name: "Editorial Lines", count: 5, Component: EditorialLinesHero },
  { id: "arch", name: "Arch and Sparkle", count: 5, Component: ArchSparklHero },
  { id: "botanical", name: "Botanical Wave", count: 5, Component: BotanicalWaveHero },
  { id: "arch-gradient", name: "Arch Gradient", count: 5, Component: ArchGradientHero },
] as const;

type AdvancedLayout = "centered" | "left" | "right" | "split" | "fullscreen" | "minimal" | "asymmetric";

type AdvancedThemeFamily = {
  familyId: (typeof FAMILIES)[number]["id"];
  idPrefix: string;
  name: string;
  nameAr: string;
  layout: AdvancedLayout;
  tags: string[];
};

const ADVANCED_THEME_FAMILIES: AdvancedThemeFamily[] = [
  {
    familyId: "diamond",
    idPrefix: "advanced-diamond",
    name: "Advanced Diamond Cut",
    nameAr: "دايموند متقدم",
    layout: "asymmetric",
    tags: ["advanced", "diamond", "fashion", "geometric"],
  },
  {
    familyId: "editorial",
    idPrefix: "advanced-editorial",
    name: "Advanced Editorial Lines",
    nameAr: "تحريري متقدم",
    layout: "split",
    tags: ["advanced", "editorial", "minimal", "luxury"],
  },
  {
    familyId: "arch",
    idPrefix: "advanced-arch",
    name: "Advanced Arch Sparkle",
    nameAr: "آرتش متقدم",
    layout: "split",
    tags: ["advanced", "arch", "sparkle", "fashion"],
  },
  {
    familyId: "botanical",
    idPrefix: "advanced-botanical",
    name: "Advanced Botanical Wave",
    nameAr: "بوتانيكال متقدم",
    layout: "split",
    tags: ["advanced", "botanical", "organic", "wave"],
  },
  {
    familyId: "arch-gradient",
    idPrefix: "advanced-arch-gradient",
    name: "Advanced Arch Gradient",
    nameAr: "تدرج متقدم",
    layout: "split",
    tags: ["advanced", "gradient", "arch", "pastel"],
  },
];

const ADVANCED_COMPONENT_BY_FAMILY: Record<(typeof FAMILIES)[number]["id"], React.FC<AdvancedHeroProps>> = {
  diamond: DiamondCutHero,
  editorial: EditorialLinesHero,
  arch: ArchSparklHero,
  botanical: BotanicalWaveHero,
  "arch-gradient": ArchGradientHero,
};

function buildAdvancedThemeId(idPrefix: string, variant: number) {
  return `${idPrefix}-v${variant}`;
}

export const advancedHeroThemes = ADVANCED_THEME_FAMILIES.flatMap((family) =>
  Array.from({ length: 5 }, (_, index) => {
    const variant = index + 1;
    return {
      id: buildAdvancedThemeId(family.idPrefix, variant),
      name: `${family.name} V${variant}`,
      nameAr: `${family.nameAr} ${variant}`,
      category: "Advanced",
      layout: family.layout,
      tags: [...family.tags, `v${variant}`],
    };
  }),
);

export const advancedHeroThemeComponents: Record<string, React.FC<AdvancedHeroProps>> = Object.fromEntries(
  ADVANCED_THEME_FAMILIES.flatMap((family) => {
    const FamilyComponent = ADVANCED_COMPONENT_BY_FAMILY[family.familyId];
    return Array.from({ length: 5 }, (_, index) => {
      const variant = index + 1;
      const key = buildAdvancedThemeId(family.idPrefix, variant);
      const Wrapped: React.FC<AdvancedHeroProps> = (props) => <FamilyComponent {...props} variant={variant} />;
      Wrapped.displayName = `${family.idPrefix}-v${variant}`;
      return [key, Wrapped];
    });
  }),
);
