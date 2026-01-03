import React from "react";
import HeroSlider from "./HeroSlider";
import NewsletterForm from "@/components/NewsletterForm";
import { FormSection } from "./sections/FormSection";
import { ComponentsRenderer } from "./ComponentsRenderer";
import { TypewriterText } from "@/components/effects/TypewriterText";
import type { CmsSection, PageSectionType, ProductMini } from "../types";
import { sanitizeHtml } from "../sanitizeHtml";
import type {
  BannerData,
  CtaData,
  CustomHtmlData,
  FaqData,
  FeaturesData,
  StatsData,
  TeamData,
  PricingData,
  ContactData,
  FeaturedCategoriesData,
  FeaturedProductsData,
  CollectionsGridData,
  GridData,
  ButtonData,
  InputData,
  HeroData,
  ImageGalleryData,
  RichTextData,
  TestimonialsData,
  CardsData,
  VideoData,
} from "../sectionTypes";
import { SectionDecorations } from "@/cms/decorations/DecorationLayer";
import type { DecorLayer, TwTokens } from "@/cms/style/tokens";
import { DECOR_PRESETS } from "@/cms/style/tokens";
import { tokensToClassName, tokensToInlineStyle } from "@/cms/style/tokensToTw";

import { DEFAULT_MOTION_BY_SECTION_TYPE } from "@/motion/gsapPresets";

type QuickAddRef = { productId?: string; slug?: string };

function extractProductSlugFromHref(href: string): string | null {
  if (!href) return null;
  const clean = href.split("?")[0].split("#")[0];
  // Allow /p/<slug> or p/<slug>
  const m = clean.match(/^\/?p\/(.+)$/);
  if (!m) return null;
  const slug = decodeURIComponent(m[1] ?? "").trim();
  if (!slug || slug.includes("/")) return null;
  return slug;
}

function getCardProductRef(card: any): QuickAddRef | null {
  if (card && typeof card.productId === "string" && card.productId.trim()) {
    return { productId: card.productId.trim() };
  }
  const href =
    (typeof card?.buttonHref === "string" ? card.buttonHref : "") ||
    (typeof card?.href === "string" ? card.href : "") ||
    (typeof card?.linkHref === "string" ? card.linkHref : "");
  if (!href) return null;
  const slug = extractProductSlugFromHref(href);
  return slug ? { slug } : null;
}

function resolveProductMini(ref: QuickAddRef | null, productLookup?: Record<string, ProductMini>): ProductMini | null {
  if (!ref || !productLookup) return null;
  if (ref.productId && productLookup[ref.productId]) return productLookup[ref.productId];
  if (ref.slug) {
    const k = `slug:${ref.slug}`;
    if (productLookup[k]) return productLookup[k];
  }
  return null;
}

function safeNum(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function cls(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

const HERO_ANIM_CLASS: Record<string, string> = {
  "fade-up": "anim-fade-up",
  "zoom-in": "anim-zoom-in",
  "slide-up": "anim-slide-up",
  "scale-in": "animate-scale-in",
};

function heroAnimClass(anim?: string, duration?: number, delay?: number) {
  if (!anim || anim === "none") return "";
  const dur = Number.isFinite(duration as number) ? `animation-duration-${duration}` : "";
  const del = Number.isFinite(delay as number) ? `animation-delay-${delay}` : "";
  return cls(HERO_ANIM_CLASS[anim] ?? "", dur, del);
}

const SPLIT_TEXT_EFFECTS = new Set(["wave", "bounce"]);

function splitTextWithEffect(text: string, effect?: string): { content: React.ReactNode; ariaLabel?: string } {
  if (!text || !effect || !SPLIT_TEXT_EFFECTS.has(effect)) {
    return { content: text };
  }
  const delayStep = effect === "wave" ? 0.06 : 0.04;
  const letters = Array.from(text);
  const content = letters.map((ch, idx) => (
    <span key={`${idx}-${ch}`} aria-hidden="true" style={{ animationDelay: `${idx * delayStep}s` }}>
      {ch === " " ? "\u00a0" : ch}
    </span>
  ));
  return { content, ariaLabel: text };
}

function textEffectClass(tokens?: any) {
  return tokensToClassName({ textEffect: tokens?.textEffect } as any);
}

function cardEffectClass(tokens?: any) {
  return tokensToClassName({ cardTemplate: tokens?.cardTemplate, hoverExtended: tokens?.hoverExtended, state: tokens?.state } as any);
}

function resolveFieldTokens<T>(fieldTokens: T | undefined | null, fallback?: T): T | undefined {
  if (fieldTokens === undefined || fieldTokens === null) return fallback;
  if (!fallback || typeof fieldTokens !== "object" || typeof fallback !== "object") return fieldTokens;
  const baseTypography = (fallback as any).typography;
  if (!baseTypography || typeof baseTypography !== "object") return fieldTokens;
  const fieldTypography = (fieldTokens as any).typography;
  return {
    ...(fieldTokens as any),
    typography: { ...baseTypography, ...(fieldTypography ?? {}) },
  } as T;
}

function stripTextEffectTokens(tokens?: any) {
  if (!tokens || typeof tokens !== "object" || !("textEffect" in tokens)) return tokens;
  return { ...tokens, textEffect: undefined };
}

function hasTypographyOverrides(tokens?: any): boolean {
  const typography = tokens?.typography;
  if (!typography || typeof typography !== "object") return false;
  return Object.values(typography).some((v) => v !== undefined && v !== null && v !== "" && v !== "default");
}

function tokensClass(tokens?: any): string {
  return cls(tokensToClassName(stripTextEffectTokens(tokens)), hasTypographyOverrides(tokens) ? "cms-section-text" : undefined);
}

function tokensStyle(tokens?: any): React.CSSProperties | undefined {
  return tokensToInlineStyle(tokens);
}

function textContent(text: string, tokens?: any) {
  const value = typeof text === "string" ? text : String(text ?? "");
  const effect = tokens?.textEffect;
  const typewriter = tokens?.typewriter;
  const typewriterTexts = Array.isArray(typewriter?.texts) && typewriter.texts.length
    ? typewriter.texts
    : value
      ? [value]
      : [];
  const useTypewriter = !!(typewriter?.enabled && typewriterTexts.length);

  if (useTypewriter) {
    const allowEffect = effect && effect !== "none" && !SPLIT_TEXT_EFFECTS.has(effect) && effect !== "typewriter";
    const typewriterClass = allowEffect ? textEffectClass(tokens) : "";
    return {
      useTypewriter: true,
      ariaLabel: undefined as string | undefined,
      className: "",
      content: (
        <TypewriterText
          texts={typewriterTexts}
          typeSpeed={typewriter?.speed}
          deleteSpeed={typewriter?.deleteSpeed}
          pauseTime={typewriter?.pauseTime}
          loop={typewriter?.loop ?? true}
          textClassName={typewriterClass || undefined}
        />
      ),
    };
  }

  const split = splitTextWithEffect(value, effect);
  return { useTypewriter: false, ariaLabel: split.ariaLabel, className: textEffectClass(tokens), content: split.content };
}

function uiSectionClass(data: any) {
  const ui = data?.ui;
  const base = typeof ui?.sectionClass === "string" ? ui.sectionClass : "";
  const tokens = data?.twTokens;
  return cls(base, tokensToClassName(stripTextEffectTokens(tokens)));
}

function uiSectionStyle(data: any) {
  const tokens = data?.twTokens;
  return tokensToInlineStyle(tokens);
}

function uiContainerClass(data: any) {
  const ui = data?.ui;
  return typeof ui?.containerClass === "string" ? ui.containerClass : "";
}

function sectionTextScopeProps(data: any) {
  const tokens = data?.twTokens;
  const typography = tokens?.typography;
  if (!typography) return null;
  return {
    className: cls("cms-section-text", tokensToClassName({ typography } as any)),
    style: tokensToInlineStyle({ typography } as any),
  };
}

function SectionTextScope({ data, children }: { data: any; children: React.ReactNode }) {
  const props = sectionTextScopeProps(data);
  if (!props) return <>{children}</>;
  return (
    <div className={props.className} style={props.style}>
      {children}
    </div>
  );
}

type DecorPresetValue = { before?: DecorLayer; after?: DecorLayer };

function sectionDecorations(tokens?: TwTokens) {
  const decor = tokens?.decor;
  if (!decor) return null;
  const preset = decor.preset ? (DECOR_PRESETS[decor.preset] as DecorPresetValue) : undefined;
  const before = decor.before ?? preset?.before;
  const after = decor.after ?? preset?.after;
  const hasBefore = !!before?.shape && before.shape !== "none";
  const hasAfter = !!after?.shape && after.shape !== "none";
  if (!hasBefore && !hasAfter) return null;
  return { before: hasBefore ? before : undefined, after: hasAfter ? after : undefined };
}

const INLINE_DECOR_TAGS = new Set([
  "span",
  "a",
  "button",
  "label",
  "strong",
  "em",
  "small",
  "b",
  "i",
  "u",
  "code",
  "kbd",
  "mark",
  "s",
  "sub",
  "sup",
]);

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function wrapDecorations(node: React.ReactElement, tokens?: TwTokens) {
  const decorations = sectionDecorations(tokens);
  if (!decorations) return node;
  const className = node.props?.className;
  const wantsOverflowHidden = typeof className === "string" && className.includes("overflow-hidden");
  const cleanedClassName =
    wantsOverflowHidden && typeof className === "string"
      ? className.replace(/\boverflow-hidden\b/g, "").trim()
      : className;
  const tagName = typeof node.type === "string" ? node.type : undefined;
  const isInline = !!tagName && INLINE_DECOR_TAGS.has(tagName);
  const isVoid = !!tagName && VOID_ELEMENTS.has(tagName);
  const mergedClassName = cls(cleanedClassName, "relative", "overflow-visible");
  const innerClassName = cls(
    "relative z-10",
    wantsOverflowHidden ? "overflow-hidden" : undefined,
    isInline ? "inline-block" : "block"
  );
  const innerStyle = wantsOverflowHidden ? { borderRadius: "inherit" } : undefined;
  if (isVoid) {
    const Wrapper = isInline ? "span" : "div";
    return (
      <Wrapper className={cls("relative overflow-visible", isInline ? "inline-block" : "block")}>
        <SectionDecorations decorations={decorations} className="z-0" />
        <span className={innerClassName} style={innerStyle}>
          {node}
        </span>
      </Wrapper>
    );
  }
  return React.cloneElement(
    node,
    { className: mergedClassName },
    <>
      <SectionDecorations decorations={decorations} className="z-0" />
      <span className={innerClassName} style={innerStyle}>
        {node.props?.children}
      </span>
    </>
  );
}

function renderComponentsBlock(data: any, productLookup?: Record<string, ProductMini>) {
  const components = data?.components;
  if (!Array.isArray(components) || !components.length) return null;
  const inheritTokens = data?.twTokens?.typography ? { typography: data.twTokens.typography } : undefined;
  return (
    <ComponentsRenderer
      components={components as any}
      productLookup={productLookup as any}
      inheritTokens={inheritTokens}
    />
  );
}

type SectionLayoutMode = "stack" | "row" | "grid";

type SectionLayoutConfig = {
  mode: SectionLayoutMode;
  group?: string;
  columns: number;
  span: number;
};

type SectionGroup = {
  key: string;
  groupKey?: string;
  mode: SectionLayoutMode;
  columns: number;
  sections: CmsSection[];
};

const SECTION_GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-4",
  5: "grid-cols-1 md:grid-cols-5",
  6: "grid-cols-1 md:grid-cols-6",
};

const SECTION_COL_SPAN: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeSectionLayout(raw: any): SectionLayoutConfig {
  const layout = raw && typeof raw === "object" ? raw : {};
  const mode = layout.mode === "row" || layout.mode === "grid" ? layout.mode : "stack";
  const group = typeof layout.group === "string" ? layout.group.trim() : "";
  const columns = clampInt(layout.columns, 1, 6, 2);
  const span = clampInt(layout.span, 1, columns, 1);
  return { mode, group: group || undefined, columns, span };
}

function buildSectionGroups(sections: CmsSection[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  for (const sec of sections) {
    const layout = normalizeSectionLayout((sec as any)?.data?.layout);
    const groupKey =
      layout.mode !== "stack"
        ? (layout.group ? `${layout.mode}:${layout.group}` : `auto:${layout.mode}:${layout.columns}`)
        : "";
    const last = groups[groups.length - 1];
    if (groupKey && last && last.groupKey === groupKey) {
      last.sections.push(sec);
    } else {
      const key = groupKey ? `${groupKey}:${sec.id}` : `${layout.mode}:${sec.id}`;
      groups.push({ key, groupKey: groupKey || undefined, mode: layout.mode, columns: layout.columns, sections: [sec] });
    }
  }
  return groups;
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (u.hostname.includes("youtube")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      // /embed/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("embed");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch {
    // ignore
  }
  return null;
}

function vimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const id = parts.find((p) => /^\d+$/.test(p));
    return id || null;
  } catch {
    return null;
  }
}

function Section({
  section,
  renderProductCard,
  renderQuickAdd,
  productLookup,
  depth = 0,
  seen,
}: {
  section: CmsSection;
  renderProductCard?: (productId: string) => React.ReactNode;
  renderQuickAdd?: (ref: QuickAddRef) => React.ReactNode;
  productLookup?: Record<string, ProductMini>;
  depth?: number;
  seen?: Set<any>;
}) {
  if (depth > 50) return null; // safety against runaway nesting
  const nextSeen = new Set(seen ?? []);
  if (nextSeen.has(section)) return null;
  nextSeen.add(section);
  const nextDepth = depth + 1;

  const type = (section as any).type as string;
  const data = (section as any).data;
  const anchorId = (section.anchorId ?? "").trim();
  const ariaLabel = (section.ariaLabel ?? "").trim();
  const attrs: any = {};
  if (anchorId) attrs.id = anchorId;
  if (ariaLabel) attrs["aria-label"] = ariaLabel;

  // GSAP motion preset (optional). Default is picked from the section type.
  // Admin/DB can override with `data.motionPreset`.
  const tokenMotion = (data as any)?.twTokens?.motion ?? {};
  const motionPreset =
    tokenMotion?.anim ??
    tokenMotion?.preset ??
    (data as any)?.motionPreset ??
    DEFAULT_MOTION_BY_SECTION_TYPE[type] ??
    "none";
  if (motionPreset && motionPreset !== "none") {
    attrs["data-motion"] = motionPreset;
    if (tokenMotion?.duration !== undefined) attrs["data-motion-duration"] = String(tokenMotion.duration);
    if (tokenMotion?.delay !== undefined) attrs["data-motion-delay"] = String(tokenMotion.delay);
    if (tokenMotion?.easing) attrs["data-motion-easing"] = String(tokenMotion.easing);
    if (tokenMotion?.stagger !== undefined) attrs["data-motion-stagger"] = String(tokenMotion.stagger);
    if (tokenMotion?.staggerDir) attrs["data-motion-stagger-dir"] = String(tokenMotion.staggerDir);
    if (tokenMotion?.threshold !== undefined) attrs["data-motion-threshold"] = String(tokenMotion.threshold);
    if (tokenMotion?.once !== undefined) attrs["data-motion-once"] = String(tokenMotion.once);
    if (tokenMotion?.scrub !== undefined) attrs["data-motion-scrub"] = String(tokenMotion.scrub);
  }

  if (!data || typeof data !== "object") return null;

  if (type === "HERO") {
    const d = data as HeroData;

    // Slider mode: if `slides` is a non-empty array, render a carousel
    const hasSlides = Array.isArray((d as any).slides) && (d as any).slides.length > 0;
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;

    if (hasSlides) {
      return wrapDecorations(
        <section {...attrs} className={cls("overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03]", uiSectionClass(d))} style={uiSectionStyle(d)}>
          <SectionTextScope data={d}>
            <div className={cls("relative", uiContainerClass(d))}>
              <HeroSlider data={d} textTokens={sectionTokens} />
            </div>
          </SectionTextScope>
          {componentsBlock}
        </section>,
        sectionTokens
      );
    }

    const overlay = Math.min(1, Math.max(0, safeNum(d.overlay, 0.35)));
    const align = d.align ?? "center";
    const justify = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";
    const slideTokens = resolveFieldTokens((d as any).slideTokens);
    const baseSlideTokens = slideTokens ?? sectionTokens;
    const titleTokens = resolveFieldTokens((d as any).titleTokens, baseSlideTokens);
    const subtitleTokens = resolveFieldTokens((d as any).subtitleTokens, baseSlideTokens);
    const primaryButtonTokens = resolveFieldTokens((d as any).primaryButtonTokens, baseSlideTokens);
    const secondaryButtonTokens = resolveFieldTokens((d as any).secondaryButtonTokens, baseSlideTokens);
    const titleData = textContent(String(d.title ?? ""), titleTokens);
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), subtitleTokens) : null;
    const primaryLabelData = d.primaryButton?.label ? textContent(String(d.primaryButton.label), primaryButtonTokens) : null;
    const secondaryLabelData = d.secondaryButton?.label ? textContent(String(d.secondaryButton.label), secondaryButtonTokens) : null;
    const slideAnim = (d as any).slideAnim ?? "none";
    const slideDuration = safeNum((d as any).slideDuration, 600);
    const contentAnim = (d as any).contentAnim ?? "fade-up";
    const contentDuration = safeNum((d as any).contentDuration, 400);
    const contentDelay = safeNum((d as any).contentDelay, 0);
    const slideAnimClass = heroAnimClass(slideAnim, slideDuration, 0);
    const contentAnimClass = heroAnimClass(contentAnim, contentDuration, contentDelay);

    return wrapDecorations(
      <section {...attrs} className={cls("overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03]", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div
          className={cls("relative min-h-[260px]", uiContainerClass(d), slideAnimClass, tokensClass(slideTokens))}
          style={
            d.backgroundImageUrl
              ? {
                  backgroundImage: `url(${d.backgroundImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  ...(tokensStyle(slideTokens) ?? {}),
                }
              : tokensStyle(slideTokens)
          }
        >
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
          <SectionTextScope data={d}>
            <div className={cls("relative flex h-full min-h-[260px] flex-col justify-center gap-3 p-8", justify, contentAnimClass)}>
              {wrapDecorations(
                <h2 className={cls("text-2xl font-bold", tokensClass(titleTokens), titleData.className)} style={tokensStyle(titleTokens)} aria-label={titleData.ariaLabel}>
                  {titleData.content}
                </h2>,
                titleTokens
              )}
              {subtitleData ? wrapDecorations(
                <p className={cls("max-w-[60ch] text-sm opacity-90", tokensClass(subtitleTokens), subtitleData.className)} style={tokensStyle(subtitleTokens)} aria-label={subtitleData.ariaLabel}>
                  {subtitleData.content}
                </p>,
                subtitleTokens
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {d.primaryButton?.label ? (
                  d.primaryButton?.href ? (
                    wrapDecorations(
                      <a
                        href={d.primaryButton.href}
                        className={cls(
                          "rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95",
                          tokensClass(primaryButtonTokens),
                          primaryLabelData?.className
                        )}
                        style={{ backgroundColor: "var(--accent-2, #ffffff)", ...(tokensStyle(primaryButtonTokens) ?? {}) }}
                        aria-label={primaryLabelData?.ariaLabel}
                      >
                        {primaryLabelData?.content ?? d.primaryButton.label}
                      </a>,
                      primaryButtonTokens
                    )
                  ) : (
                    wrapDecorations(
                      <span
                        className={cls(
                          "rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] opacity-90",
                          tokensClass(primaryButtonTokens),
                          primaryLabelData?.className
                        )}
                        style={{ backgroundColor: "var(--accent-2, #ffffff)", ...(tokensStyle(primaryButtonTokens) ?? {}) }}
                        aria-label={primaryLabelData?.ariaLabel}
                      >
                        {primaryLabelData?.content ?? d.primaryButton.label}
                      </span>,
                      primaryButtonTokens
                    )
                  )
                ) : null}
                {d.secondaryButton?.label ? (
                  d.secondaryButton?.href ? (
                    wrapDecorations(
                      <a
                        href={d.secondaryButton.href}
                        className={cls(
                          "rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-semibold hover:bg-white/[0.08]",
                          tokensClass(secondaryButtonTokens),
                          secondaryLabelData?.className
                        )}
                        style={tokensStyle(secondaryButtonTokens)}
                        aria-label={secondaryLabelData?.ariaLabel}
                      >
                        {secondaryLabelData?.content ?? d.secondaryButton.label}
                      </a>,
                      secondaryButtonTokens
                    )
                  ) : (
                    wrapDecorations(
                      <span
                        className={cls(
                          "rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/90",
                          tokensClass(secondaryButtonTokens),
                          secondaryLabelData?.className
                        )}
                        style={tokensStyle(secondaryButtonTokens)}
                        aria-label={secondaryLabelData?.ariaLabel}
                      >
                        {secondaryLabelData?.content ?? d.secondaryButton.label}
                      </span>,
                      secondaryButtonTokens
                    )
                  )
                ) : null}
              </div>
            </div>
          </SectionTextScope>
        </div>
        {componentsBlock}
      </section>
    );
  }

  if (type === "RICH_TEXT") {
    const d = data as RichTextData;
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const htmlEffectClass = textEffectClass(sectionTokens);
    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-3 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            <div
              className={cls("prose prose-invert max-w-none", htmlEffectClass)}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(d.html ?? "") }}
            />
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "CUSTOM_HTML") {
    const d = data as CustomHtmlData;
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const htmlEffectClass = textEffectClass(sectionTokens);
    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-4xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <div className={cls("prose prose-invert max-w-none", htmlEffectClass)} dangerouslySetInnerHTML={{ __html: sanitizeHtml(d.html ?? "") }} />
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "BANNER") {
    const d = data as BannerData;
    const variant = d.variant ?? d.tone ?? "info";
    const linkLabel = d.linkLabel ?? d.buttonText;
    const linkHref = d.linkHref ?? d.href;
    const color =
      variant === "success"
        ? "border-emerald-500/30 bg-emerald-500/10"
        : variant === "warning"
          ? "border-amber-500/30 bg-amber-500/10"
          : variant === "danger"
            ? "border-red-500/30 bg-red-500/10"
            : "border-sky-500/30 bg-sky-500/10";

    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const textData = textContent(String(d.text ?? ""), sectionTokens);
    const linkValue = linkLabel || linkHref || "";
    const linkData = linkHref ? textContent(String(linkValue), sectionTokens) : null;

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border p-5", color, uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
          <div className={cls("flex flex-col gap-2 md:flex-row md:items-center md:justify-between", uiContainerClass(d))}>
            <div className={cls("text-sm opacity-90", textData.className)} aria-label={textData.ariaLabel}>
              {textData.content}
            </div>
            {linkLabel && linkHref ? (
              <a
                className={cls(
                  "text-sm font-semibold underline decoration-white/30 underline-offset-4 hover:decoration-white/60",
                  linkData?.className
                )}
                href={linkHref}
                aria-label={linkData?.ariaLabel}
              >
                {linkData?.content ?? linkLabel}
              </a>
            ) : null}
          </div>
        </SectionTextScope>
        {componentsBlock}
      </section>,
      sectionTokens
    );
  }

  if (type === "CTA") {
    const d = data as CtaData;
    const align = d.align ?? "center";
    const justify = align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";
    const buttonLabel = d.buttonLabel ?? d.button?.label;
    const buttonHref = d.buttonHref ?? d.button?.href;
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    const buttonData = buttonLabel ? textContent(String(buttonLabel), sectionTokens) : null;

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <div className={cls("flex flex-col gap-3", justify)}>
              {titleData ? (
                <div className={cls("text-xl font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                  {titleData.content}
                </div>
              ) : null}
              {subtitleData ? (
                <div className={cls("text-sm opacity-80", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
                  {subtitleData.content}
                </div>
              ) : null}
              {buttonLabel && buttonHref ? (
                <a
                  href={buttonHref}
                  className={cls(
                    "mt-2 inline-flex w-fit rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95",
                    buttonData?.className
                  )}
                  style={{ backgroundColor: "var(--accent-2, #ffffff)" }}
                  aria-label={buttonData?.ariaLabel}
                >
                  {buttonData?.content ?? buttonLabel}
                </a>
              ) : null}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "FAQ") {
    const d = data as FaqData;
    const items = Array.isArray(d.items) ? d.items : [];
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-3 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            <div className="space-y-3">
              {items.map((it, idx) => {
                const question = it.question ?? it.q ?? "";
                const answer = it.answer ?? it.a ?? "";
                if (!question && !answer) return null;
                const itemTokens = resolveFieldTokens((it as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const questionTokens = resolveFieldTokens((it as any).questionTokens, baseItemTokens);
                const answerTokens = resolveFieldTokens((it as any).answerTokens, baseItemTokens);
                const questionData = textContent(String(question), questionTokens);
                const answerData = textContent(String(answer), answerTokens);
                const node = (
                  <div
                    key={idx}
                    className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4", tokensClass(itemTokens))}
                    style={tokensStyle(itemTokens)}
                  >
                    {wrapDecorations(
                      <div className={cls("text-sm font-semibold", tokensClass(questionTokens), questionData.className)} style={tokensStyle(questionTokens)} aria-label={questionData.ariaLabel}>
                        {questionData.content}
                      </div>,
                      questionTokens
                    )}
                    {wrapDecorations(
                      <div className={cls("mt-1 text-sm opacity-80", tokensClass(answerTokens), answerData.className)} style={tokensStyle(answerTokens)} aria-label={answerData.ariaLabel}>
                        {answerData.content}
                      </div>,
                      answerTokens
                    )}
                  </div>
                );
                return wrapDecorations(node, itemTokens);
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "GRID") {
    const d = data as GridData;

    if (d?.mode === "container") {
      const blocks = Array.isArray((d as any).blocks) ? (d as any).blocks : [];
      const componentsBlock = renderComponentsBlock(d, productLookup);
      const sectionTokens = (d as any)?.twTokens;
      const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
      return wrapDecorations(
        <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
          <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
            {titleData ? (
              <SectionTextScope data={d}>
                <h3 className={cls("mb-4 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                  {titleData.content}
                </h3>
              </SectionTextScope>
            ) : null}
            <div className="space-y-5">
              {blocks
                .filter((b: any) => b && b.type)
                .map((b: any, i: number) => (
                  <Section
                    key={(b.id ?? `${section.id}-b-${i}`) as any}
                    section={{ id: `${section.id}-b-${i}`, type: b.type, data: b.data, order: i, isVisible: b.isVisible !== false } as any}
                    renderProductCard={renderProductCard}
                    renderQuickAdd={renderQuickAdd}
                    productLookup={productLookup}
                    depth={nextDepth}
                    seen={nextSeen}
                  />
                ))}
            </div>
          </div>
          {componentsBlock}
        </section>,
        sectionTokens
      );
    }

    
    const columns = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-4 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            <div className={cls("grid gap-4", columns === 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-4")}>
              {(d.items ?? []).map((it, idx) => {
                const itemTokens = resolveFieldTokens((it as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const titleTokens = resolveFieldTokens((it as any).titleTokens, baseItemTokens);
                const textTokens = resolveFieldTokens((it as any).textTokens, baseItemTokens);
                const imageTokens = resolveFieldTokens((it as any).imageTokens);
                const itemTitleData = textContent(String(it.title ?? ""), titleTokens);
                const itemTextData = it.text ? textContent(String(it.text), textTokens) : null;
                const node = (
                  <div
                    key={idx}
                    className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4", tokensClass(itemTokens))}
                    style={tokensStyle(itemTokens)}
                  >
                    {it.imageUrl ? (
                      <img
                        src={it.imageUrl}
                        alt={it.title}
                        className={cls("mb-3 h-28 w-full rounded-xl object-cover", tokensClass(imageTokens))}
                        style={tokensStyle(imageTokens)}
                      />
                    ) : null}
                    {wrapDecorations(
                      <div className={cls("text-sm font-semibold", tokensClass(titleTokens), itemTitleData.className)} style={tokensStyle(titleTokens)} aria-label={itemTitleData.ariaLabel}>
                        {itemTitleData.content}
                      </div>,
                      titleTokens
                    )}
                    {itemTextData ? wrapDecorations(
                      <div className={cls("mt-1 text-sm opacity-80", tokensClass(textTokens), itemTextData.className)} style={tokensStyle(textTokens)} aria-label={itemTextData.ariaLabel}>
                        {itemTextData.content}
                      </div>,
                      textTokens
                    ) : null}
                  </div>
                );
                return wrapDecorations(node, itemTokens);
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "FEATURES") {
    const d = data as FeaturesData;
    const items = Array.isArray(d.items) ? d.items : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const gridCols =
      cols <= 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : cols === 4 ? "md:grid-cols-4" : cols === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            {subtitleData ? (
              <div className={cls("mt-1 text-sm opacity-80", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
                {subtitleData.content}
              </div>
            ) : null}
            <div className={cls("mt-4 grid gap-4", gridCols)}>
              {items.length ? (
                items.map((it, idx) => {
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const titleTokens = resolveFieldTokens((it as any).titleTokens, baseItemTokens);
                  const textTokens = resolveFieldTokens((it as any).textTokens, baseItemTokens);
                  const iconTokens = resolveFieldTokens((it as any).iconTokens, baseItemTokens);
                  const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                  const wrapperClass = cls(
                    "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
                    tokensClass(itemTokens),
                    it.href ? tokensClass(linkTokens) : undefined
                  );
                  const wrapperStyle = { ...(tokensStyle(itemTokens) ?? {}), ...(it.href ? (tokensStyle(linkTokens) ?? {}) : {}) };
                  const content = (
                    <>
                      <div className="flex items-center gap-2">
                        {it.iconUrl ? (
                          wrapDecorations(
                            <img src={it.iconUrl} alt="" className={cls("h-8 w-8 rounded-lg", tokensClass(iconTokens))} style={tokensStyle(iconTokens)} />,
                            iconTokens
                          )
                        ) : it.icon ? (
                          wrapDecorations(
                            <span className={cls("text-lg", tokensClass(iconTokens))} style={tokensStyle(iconTokens)}>{it.icon}</span>,
                            iconTokens
                          )
                        ) : null}
                        {(() => {
                          const titleData = textContent(String(it.title ?? ""), titleTokens);
                          return wrapDecorations(
                            <div className={cls("text-sm font-semibold", tokensClass(titleTokens), titleData.className)} style={tokensStyle(titleTokens)} aria-label={titleData.ariaLabel}>
                              {titleData.content}
                            </div>,
                            titleTokens
                          );
                        })()}
                      </div>
                      {it.text ? (() => {
                        const textData = textContent(String(it.text), textTokens);
                        return wrapDecorations(
                          <div className={cls("mt-2 text-sm opacity-80", tokensClass(textTokens), textData.className)} style={tokensStyle(textTokens)} aria-label={textData.ariaLabel}>
                            {textData.content}
                          </div>,
                          textTokens
                        );
                      })() : null}
                    </>
                  );
                  const node = it.href ? (
                    <a key={idx} href={it.href} className={wrapperClass} style={wrapperStyle}>
                      {content}
                    </a>
                  ) : (
                    <div key={idx} className={wrapperClass} style={wrapperStyle}>
                      {content}
                    </div>
                  );
                  return wrapDecorations(node, itemTokens);
                })
              ) : (
                <div className="text-sm opacity-70">(لا يوجد عناصر)</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "STATS") {
    const d = data as StatsData;
    const items = Array.isArray(d.items) ? d.items : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const gridCols =
      cols <= 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : cols === 4 ? "md:grid-cols-4" : cols === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            {subtitleData ? (
              <div className={cls("mt-1 text-sm opacity-80", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
                {subtitleData.content}
              </div>
            ) : null}
            <div className={cls("mt-4 grid gap-4", gridCols)}>
              {items.length ? (
                items.map((it, idx) => {
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const valueTokens = resolveFieldTokens((it as any).valueTokens, baseItemTokens);
                  const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                  const subtextTokens = resolveFieldTokens((it as any).subtextTokens, baseItemTokens);
                  const iconTokens = resolveFieldTokens((it as any).iconTokens, baseItemTokens);
                  const node = (
                    <div
                      key={idx}
                      className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-center", tokensClass(itemTokens))}
                      style={tokensStyle(itemTokens)}
                    >
                      {it.icon ? (
                        wrapDecorations(
                          <div className={cls("text-lg", tokensClass(iconTokens))} style={tokensStyle(iconTokens)}>
                            {it.icon}
                          </div>,
                          iconTokens
                        )
                      ) : null}
                      {(() => {
                        const valueData = textContent(String(it.value ?? ""), valueTokens);
                        return wrapDecorations(
                          <div className={cls("text-2xl font-semibold", tokensClass(valueTokens), valueData.className)} style={tokensStyle(valueTokens)} aria-label={valueData.ariaLabel}>
                            {valueData.content}
                          </div>,
                          valueTokens
                        );
                      })()}
                      {it.label ? (() => {
                        const labelData = textContent(String(it.label), labelTokens);
                        return wrapDecorations(
                          <div className={cls("text-sm opacity-80", tokensClass(labelTokens), labelData.className)} style={tokensStyle(labelTokens)} aria-label={labelData.ariaLabel}>
                            {labelData.content}
                          </div>,
                          labelTokens
                        );
                      })() : null}
                      {it.subtext ? (() => {
                        const subtextData = textContent(String(it.subtext), subtextTokens);
                        return wrapDecorations(
                          <div className={cls("mt-1 text-xs opacity-60", tokensClass(subtextTokens), subtextData.className)} style={tokensStyle(subtextTokens)} aria-label={subtextData.ariaLabel}>
                            {subtextData.content}
                          </div>,
                          subtextTokens
                        );
                      })() : null}
                    </div>
                  );
                  return wrapDecorations(node, itemTokens);
                })
              ) : (
                <div className="text-sm opacity-70">(لا يوجد عناصر)</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "TEAM") {
    const d = data as TeamData;
    const members = Array.isArray(d.members) ? d.members : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const gridCols =
      cols <= 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : cols === 4 ? "md:grid-cols-4" : cols === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            {subtitleData ? (
              <div className={cls("mt-1 text-sm opacity-80", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
                {subtitleData.content}
              </div>
            ) : null}
            <div className={cls("mt-4 grid gap-4", gridCols)}>
              {members.length ? (
                members.map((m, idx) => {
                  const itemTokens = resolveFieldTokens((m as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const nameTokens = resolveFieldTokens((m as any).nameTokens, baseItemTokens);
                  const roleTokens = resolveFieldTokens((m as any).roleTokens, baseItemTokens);
                  const bioTokens = resolveFieldTokens((m as any).bioTokens, baseItemTokens);
                  const avatarTokens = resolveFieldTokens((m as any).avatarTokens);
                  const socialTokens = resolveFieldTokens((m as any).socialTokens, baseItemTokens);
                  const nameData = textContent(String(m.name || "Member"), nameTokens);
                  const roleData = m.role ? textContent(String(m.role), roleTokens) : null;
                  const bioData = m.bio ? textContent(String(m.bio), bioTokens) : null;
                  const socials = Array.isArray(m.socials) ? m.socials : [];
                  const node = (
                    <div key={idx} className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4", tokensClass(itemTokens))} style={tokensStyle(itemTokens)}>
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" className={cls("mb-3 h-12 w-12 rounded-full object-cover", tokensClass(avatarTokens))} style={tokensStyle(avatarTokens)} />
                      ) : null}
                      {wrapDecorations(
                        <div className={cls("text-sm font-semibold", tokensClass(nameTokens), nameData.className)} style={tokensStyle(nameTokens)} aria-label={nameData.ariaLabel}>
                          {nameData.content}
                        </div>,
                        nameTokens
                      )}
                      {roleData ? wrapDecorations(
                        <div className={cls("text-xs opacity-70", tokensClass(roleTokens), roleData.className)} style={tokensStyle(roleTokens)} aria-label={roleData.ariaLabel}>
                          {roleData.content}
                        </div>,
                        roleTokens
                      ) : null}
                      {bioData ? wrapDecorations(
                        <div className={cls("mt-2 text-sm opacity-80", tokensClass(bioTokens), bioData.className)} style={tokensStyle(bioTokens)} aria-label={bioData.ariaLabel}>
                          {bioData.content}
                        </div>,
                        bioTokens
                      ) : null}
                      {socials.length ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs opacity-70">
                          {socials.map((s, sIdx) => {
                            const label = s.label || s.href || "";
                            if (!label) return null;
                            const socialData = textContent(String(label), socialTokens);
                            return wrapDecorations(
                              <span
                                key={`${label}-${sIdx}`}
                                className={cls(tokensClass(socialTokens), socialData.className)}
                                style={tokensStyle(socialTokens)}
                                aria-label={socialData.ariaLabel}
                              >
                                {socialData.content}
                              </span>,
                              socialTokens
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                  return wrapDecorations(node, itemTokens);
                })
              ) : (
                <div className="text-sm opacity-70">(لا يوجد أعضاء)</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "PRICING") {
    const d = data as PricingData;
    const plans = Array.isArray(d.plans) ? d.plans : [];
    const cols = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const gridCols = cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            {subtitleData ? (
              <div className={cls("mt-1 text-sm opacity-80", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
                {subtitleData.content}
              </div>
            ) : null}
            <div className={cls("mt-4 grid gap-4", gridCols)}>
              {plans.length ? (
                plans.map((p, idx) => {
                  const planTokens = resolveFieldTokens((p as any).twTokens);
                  const basePlanTokens = planTokens ?? sectionTokens;
                  const nameTokens = resolveFieldTokens((p as any).nameTokens, basePlanTokens);
                  const priceTokens = resolveFieldTokens((p as any).priceTokens, basePlanTokens);
                  const periodTokens = resolveFieldTokens((p as any).periodTokens, priceTokens ?? basePlanTokens);
                  const descriptionTokens = resolveFieldTokens((p as any).descriptionTokens, basePlanTokens);
                  const badgeTokens = resolveFieldTokens((p as any).badgeTokens, basePlanTokens);
                  const featureTokens = resolveFieldTokens((p as any).featureTokens, basePlanTokens);
                  const ctaTokens = resolveFieldTokens((p as any).ctaTokens, basePlanTokens);
                  const nameData = textContent(String(p.name || "Plan"), nameTokens);
                  const priceData = p.price ? textContent(String(p.price), priceTokens) : null;
                  const periodData = p.period ? textContent(String(p.period), periodTokens) : null;
                  const descriptionData = p.description ? textContent(String(p.description), descriptionTokens) : null;
                  const badgeData = p.badge ? textContent(String(p.badge), badgeTokens) : null;
                  const ctaData = p.ctaLabel ? textContent(String(p.ctaLabel), ctaTokens) : null;
                  const node = (
                    <div
                      key={idx}
                      className={cls(
                        "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
                        tokensClass(planTokens),
                        p.highlight ? "ring-1 ring-[color:var(--accent-2)]/40" : undefined
                      )}
                      style={tokensStyle(planTokens)}
                    >
                      {badgeData ? wrapDecorations(
                        <div className={cls("text-[11px] opacity-70", tokensClass(badgeTokens), badgeData.className)} style={tokensStyle(badgeTokens)} aria-label={badgeData.ariaLabel}>
                          {badgeData.content}
                        </div>,
                        badgeTokens
                      ) : null}
                      {wrapDecorations(
                        <div className={cls("text-sm font-semibold", tokensClass(nameTokens), nameData.className)} style={tokensStyle(nameTokens)} aria-label={nameData.ariaLabel}>
                          {nameData.content}
                        </div>,
                        nameTokens
                      )}
                      {priceData ? wrapDecorations(
                        <div className={cls("mt-2 text-2xl", tokensClass(priceTokens), priceData.className)} style={tokensStyle(priceTokens)} aria-label={priceData.ariaLabel}>
                          {priceData.content}
                          {periodData ? wrapDecorations(
                            <span className={cls("text-xs opacity-60", tokensClass(periodTokens), periodData.className)} style={tokensStyle(periodTokens)} aria-label={periodData.ariaLabel}>
                              {" "}
                              {periodData.content}
                            </span>,
                            periodTokens
                          ) : null}
                        </div>,
                        priceTokens
                      ) : null}
                      {descriptionData ? wrapDecorations(
                        <div className={cls("mt-2 text-sm opacity-80", tokensClass(descriptionTokens), descriptionData.className)} style={tokensStyle(descriptionTokens)} aria-label={descriptionData.ariaLabel}>
                          {descriptionData.content}
                        </div>,
                        descriptionTokens
                      ) : null}
                      {Array.isArray(p.features) && p.features.length ? (
                        <ul className={cls("mt-3 list-disc ps-5 text-sm opacity-80", tokensClass(featureTokens))} style={tokensStyle(featureTokens)}>
                          {p.features.map((f, fIdx) => {
                            const featureData = textContent(String(f), featureTokens);
                            return wrapDecorations(
                              <li key={fIdx} className={featureData.className} aria-label={featureData.ariaLabel}>
                                {featureData.content}
                              </li>,
                              featureTokens
                            );
                          })}
                        </ul>
                      ) : null}
                      {ctaData ? (
                        p.ctaHref ? (
                          wrapDecorations(
                            <a
                              href={p.ctaHref}
                              className={cls("mt-4 inline-flex items-center rounded-xl border border-white/10 px-3 py-2 text-sm", tokensClass(ctaTokens), ctaData.className)}
                              style={tokensStyle(ctaTokens)}
                              aria-label={ctaData.ariaLabel}
                            >
                              {ctaData.content}
                            </a>,
                            ctaTokens
                          )
                        ) : (
                          wrapDecorations(
                            <span
                              className={cls("mt-4 inline-flex items-center rounded-xl border border-white/10 px-3 py-2 text-sm", tokensClass(ctaTokens), ctaData.className)}
                              style={tokensStyle(ctaTokens)}
                              aria-label={ctaData.ariaLabel}
                            >
                              {ctaData.content}
                            </span>,
                            ctaTokens
                          )
                        )
                      ) : null}
                    </div>
                  );
                  return wrapDecorations(node, planTokens);
                })
              ) : (
                <div className="text-sm opacity-70">(لا يوجد خطط)</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "CONTACT") {
    const d = data as ContactData;
    const items = Array.isArray(d.items) ? d.items : [];
    const form = d.form ?? {};
    const fields = Array.isArray(form.fields) ? form.fields : [];
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            {subtitleData ? (
              <div className={cls("mt-1 text-sm opacity-80", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
                {subtitleData.content}
              </div>
            ) : null}
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                {items.length ? (
                  items.map((it, idx) => {
                    const itemTokens = resolveFieldTokens((it as any).twTokens);
                    const baseItemTokens = itemTokens ?? sectionTokens;
                    const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                    const valueTokens = resolveFieldTokens((it as any).valueTokens, baseItemTokens);
                    const iconTokens = resolveFieldTokens((it as any).iconTokens, baseItemTokens);
                    const labelData = textContent(String(it.label || "Contact"), labelTokens);
                    const valueData = it.value ? textContent(String(it.value), valueTokens) : null;
                    const node = (
                      <div key={idx} className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4", tokensClass(itemTokens))} style={tokensStyle(itemTokens)}>
                        <div className="flex items-center gap-2">
                          {it.icon ? (
                            wrapDecorations(
                              <span className={cls(tokensClass(iconTokens))} style={tokensStyle(iconTokens)}>
                                {it.icon}
                              </span>,
                              iconTokens
                            )
                          ) : null}
                          {wrapDecorations(
                            <div className={cls("text-sm font-semibold", tokensClass(labelTokens), labelData.className)} style={tokensStyle(labelTokens)} aria-label={labelData.ariaLabel}>
                              {labelData.content}
                            </div>,
                            labelTokens
                          )}
                        </div>
                        {valueData ? (
                          it.href ? (
                            wrapDecorations(
                              <a
                                href={it.href}
                                className={cls("text-sm opacity-80 underline", tokensClass(valueTokens), valueData.className)}
                                style={tokensStyle(valueTokens)}
                                aria-label={valueData.ariaLabel}
                              >
                                {valueData.content}
                              </a>,
                              valueTokens
                            )
                          ) : (
                            wrapDecorations(
                              <div className={cls("text-sm opacity-80", tokensClass(valueTokens), valueData.className)} style={tokensStyle(valueTokens)} aria-label={valueData.ariaLabel}>
                                {valueData.content}
                              </div>,
                              valueTokens
                            )
                          )
                        ) : null}
                      </div>
                    );
                    return wrapDecorations(node, itemTokens);
                  })
                ) : (
                  <div className="text-sm opacity-70">(لا توجد بيانات تواصل)</div>
                )}
                {d.mapEmbedUrl ? (() => {
                  const mapTokens = resolveFieldTokens((d as any).mapTokens, sectionTokens);
                  const node = (
                    <div
                      className={cls("h-64 w-full overflow-hidden rounded-2xl border border-white/10", tokensClass(mapTokens))}
                      style={tokensStyle(mapTokens)}
                    >
                      <iframe
                        title="map"
                        src={d.mapEmbedUrl}
                        className="h-full w-full"
                        loading="lazy"
                      />
                    </div>
                  );
                  return wrapDecorations(node, mapTokens);
                })() : null}
              </div>
              {(() => {
                const formTokens = resolveFieldTokens((form as any).twTokens, sectionTokens);
                const formTitleTokens = resolveFieldTokens((form as any).titleTokens, formTokens ?? sectionTokens);
                const formSubtitleTokens = resolveFieldTokens((form as any).subtitleTokens, formTokens ?? sectionTokens);
                const formFieldTokens = resolveFieldTokens((form as any).fieldTokens, formTokens ?? sectionTokens);
                const formLabelTokens = resolveFieldTokens((form as any).labelTokens, formFieldTokens ?? formTokens ?? sectionTokens);
                const formInputTokens = resolveFieldTokens((form as any).inputTokens, formFieldTokens ?? formTokens ?? sectionTokens);
                const submitTokens = resolveFieldTokens((form as any).submitTokens, formTokens ?? sectionTokens);
                const formNode = (
                  <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4", tokensClass(formTokens))} style={tokensStyle(formTokens)}>
                    {form.title ? (() => {
                      const formTitleData = textContent(String(form.title), formTitleTokens);
                      return wrapDecorations(
                        <div className={cls("text-sm font-semibold", tokensClass(formTitleTokens), formTitleData.className)} style={tokensStyle(formTitleTokens)} aria-label={formTitleData.ariaLabel}>
                          {formTitleData.content}
                        </div>,
                        formTitleTokens
                      );
                    })() : null}
                    {form.subtitle ? (() => {
                      const formSubtitleData = textContent(String(form.subtitle), formSubtitleTokens);
                      return wrapDecorations(
                        <div className={cls("mt-1 text-xs opacity-70", tokensClass(formSubtitleTokens), formSubtitleData.className)} style={tokensStyle(formSubtitleTokens)} aria-label={formSubtitleData.ariaLabel}>
                          {formSubtitleData.content}
                        </div>,
                        formSubtitleTokens
                      );
                    })() : null}
                    <form className="mt-4 space-y-3" action={form.action || "#"} method={form.method || "POST"}>
                      {fields.map((f, idx) => {
                        const fieldTokens = resolveFieldTokens((f as any).twTokens, formFieldTokens ?? formTokens ?? sectionTokens);
                        const labelTokens = resolveFieldTokens((f as any).labelTokens, formLabelTokens ?? fieldTokens ?? formTokens ?? sectionTokens);
                        const inputTokens = resolveFieldTokens((f as any).inputTokens, formInputTokens ?? fieldTokens ?? formTokens ?? sectionTokens);
                        const fieldNode = (
                          <div key={`${f.name}-${idx}`} className={cls("space-y-1", tokensClass(fieldTokens))} style={tokensStyle(fieldTokens)}>
                            {(() => {
                              const labelText = `${f.label || f.name}${f.required ? " *" : ""}`;
                              const labelData = textContent(labelText, labelTokens);
                              return wrapDecorations(
                                <label className={cls("text-xs opacity-70", tokensClass(labelTokens), labelData.className)} style={tokensStyle(labelTokens)} aria-label={labelData.ariaLabel}>
                                  {labelData.content}
                                </label>,
                                labelTokens
                              );
                            })()}
                            {f.type === "textarea" ? (
                              wrapDecorations(
                                <textarea
                                  name={f.name}
                                  placeholder={f.placeholder ?? ""}
                                  required={!!f.required}
                                  className={cls("w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm outline-none", tokensClass(inputTokens))}
                                  style={tokensStyle(inputTokens)}
                                  rows={4}
                                />,
                                inputTokens
                              )
                            ) : (
                              wrapDecorations(
                                <input
                                  type={f.type ?? "text"}
                                  name={f.name}
                                  placeholder={f.placeholder ?? ""}
                                  required={!!f.required}
                                  className={cls("w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm outline-none", tokensClass(inputTokens))}
                                  style={tokensStyle(inputTokens)}
                                />,
                                inputTokens
                              )
                            )}
                          </div>
                        );
                        return wrapDecorations(fieldNode, fieldTokens);
                      })}
                      {(() => {
                        const submitText = form.submitLabel || "إرسال";
                        const submitData = textContent(String(submitText), submitTokens);
                        return wrapDecorations(
                          <button
                            type="submit"
                            className={cls("inline-flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm", tokensClass(submitTokens), submitData.className)}
                            style={tokensStyle(submitTokens)}
                            aria-label={submitData.ariaLabel}
                          >
                            {submitData.content}
                          </button>,
                          submitTokens
                        );
                      })()}
                    </form>
                  </div>
                );
                return wrapDecorations(formNode, formTokens);
              })()}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "FEATURED_CATEGORIES") {
    const d = data as FeaturedCategoriesData;
    const items = Array.isArray(d.items) ? d.items : [];
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <div className="mb-4 flex flex-col gap-1">
              {titleData ? (
                <h3 className={cls("text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                  {titleData.content}
                </h3>
              ) : null}
              {subtitleData ? (
                <p className={cls("text-sm opacity-80", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
                  {subtitleData.content}
                </p>
              ) : null}
            </div>

            <div className="relative">
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {items.map((it, idx) => {
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                  const imageTokens = resolveFieldTokens((it as any).imageTokens);
                  const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                  const labelData = textContent(String(it.label ?? ""), labelTokens);
                  const node = (
                    <a
                      key={idx}
                      href={it.href}
                      className={cls(
                        "snap-start shrink-0 w-[220px] rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 hover:bg-white/[0.04]",
                        tokensClass(itemTokens),
                        tokensClass(linkTokens)
                      )}
                      style={{ ...(tokensStyle(itemTokens) ?? {}), ...(tokensStyle(linkTokens) ?? {}) }}
                    >
                      {it.imageUrl ? (
                        <img
                          src={it.imageUrl}
                          alt={it.label}
                          className={cls("h-32 w-full rounded-xl object-cover", tokensClass(imageTokens))}
                          style={tokensStyle(imageTokens)}
                        />
                      ) : null}
                      {wrapDecorations(
                        <div className={cls("mt-3 text-sm font-semibold", tokensClass(labelTokens), labelData.className)} style={tokensStyle(labelTokens)} aria-label={labelData.ariaLabel}>
                          {labelData.content}
                        </div>,
                        labelTokens
                      )}
                      <div className="mt-1 text-xs opacity-70">تسوّق الآن</div>
                    </a>
                  );
                  return wrapDecorations(node, itemTokens);
                })}
              </div>
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "COLLECTIONS_GRID") {
    const d = data as CollectionsGridData;
    const items = Array.isArray(d.items) ? d.items : [];
    const columns = Math.min(6, Math.max(2, safeNum(d.columns, 4)));
    const clsCols = columns <= 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : columns === 4 ? "md:grid-cols-4" : columns === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <div className="mb-4 flex flex-col gap-1">
              {titleData ? (
                <h3 className={cls("text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                  {titleData.content}
                </h3>
              ) : null}
              {subtitleData ? (
                <p className={cls("text-sm opacity-80", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
                  {subtitleData.content}
                </p>
              ) : null}
            </div>

            <div className={cls("grid gap-4", clsCols)}>
              {items.map((it, idx) => {
                const itemTokens = resolveFieldTokens((it as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                const imageTokens = resolveFieldTokens((it as any).imageTokens);
                const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                const labelData = textContent(String(it.label ?? ""), labelTokens);
                const node = (
                  <a
                    key={idx}
                    href={it.href}
                    className={cls(
                      "group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 hover:bg-white/[0.04]",
                      tokensClass(itemTokens),
                      tokensClass(linkTokens)
                    )}
                    style={{ ...(tokensStyle(itemTokens) ?? {}), ...(tokensStyle(linkTokens) ?? {}) }}
                  >
                    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
                      {it.imageUrl ? (
                        <img
                          src={it.imageUrl}
                          alt={it.label}
                          className={cls("h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]", tokensClass(imageTokens))}
                          style={tokensStyle(imageTokens)}
                        />
                      ) : (
                        <div className={cls("h-40 w-full", tokensClass(imageTokens))} style={tokensStyle(imageTokens)} />
                      )}
                    </div>
                    {wrapDecorations(
                      <div className={cls("mt-3 text-sm font-semibold", tokensClass(labelTokens), labelData.className)} style={tokensStyle(labelTokens)} aria-label={labelData.ariaLabel}>
                        {labelData.content}
                      </div>,
                      labelTokens
                    )}
                  </a>
                );
                return wrapDecorations(node, itemTokens);
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "IMAGE_GALLERY") {
    const d = data as ImageGalleryData;
    const columns = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const clsCols = columns <= 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : columns === 4 ? "md:grid-cols-4" : columns === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-4 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            <div className={cls("grid gap-3", clsCols)}>
              {(d.images ?? []).map((im, idx) => {
                const itemTokens = resolveFieldTokens((im as any).twTokens);
                const imageTokens = resolveFieldTokens((im as any).imageTokens);
                const node = (
                  <div key={idx} className={tokensClass(itemTokens)} style={tokensStyle(itemTokens)}>
                    <img
                      src={im.url}
                      alt={im.alt ?? ""}
                      className={cls("h-40 w-full rounded-2xl object-cover", tokensClass(imageTokens))}
                      style={tokensStyle(imageTokens)}
                    />
                  </div>
                );
                return wrapDecorations(node, itemTokens);
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }


  

  if (type === "BUTTON") {
    const d = data as ButtonData;
    const align = (d.align ?? "left");
    const wrap = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
    const variant = d.variant ?? "primary";
    const clsBtn =
      variant === "primary"
        ? "bg-black text-white hover:opacity-90"
        : variant === "secondary"
        ? "bg-white text-black hover:bg-white/90"
        : "border border-white/20 bg-transparent text-white hover:bg-white/10";
    const targetProps = d.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const labelData = textContent(String(d.label ?? "زر"), sectionTokens);
    return wrapDecorations(
      <section {...attrs} className={cls(uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto w-full max-w-6xl px-4", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <div className={cls("flex", wrap)}>
              <a
                href={d.href ?? "#"}
                {...targetProps}
                className={cls(
                  "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition",
                  clsBtn,
                  d.fullWidth ? "w-full" : "",
                  labelData.className
                )}
                aria-label={labelData.ariaLabel}
              >
                {labelData.content}
              </a>
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "INPUT") {
    const d = data as InputData;
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const labelData = d.label ? textContent(String(d.label), sectionTokens) : null;
    return wrapDecorations(
      <section {...attrs} className={cls(uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto w-full max-w-6xl px-4", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <div className="space-y-2">
              {labelData ? (
                <div className={cls("text-sm font-medium opacity-90", labelData.className)} aria-label={labelData.ariaLabel}>
                  {labelData.content}
                </div>
              ) : null}
              <input
                name={d.name}
                type={d.type ?? "text"}
                placeholder={d.placeholder ?? ""}
                required={!!d.required}
                disabled={!!d.disabled}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/25"
              />
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }
  if (type === "FORM") {
    const componentsBlock = renderComponentsBlock(data, productLookup);
    const sectionTokens = (data as any)?.twTokens;
    const node = (
      <div {...attrs}>
        <FormSection data={data as any} />
        {componentsBlock}
      </div>
    );
    return wrapDecorations(node, sectionTokens);
  }

  if (type === "NEWSLETTER") {
    const d = (data ?? {}) as any;
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const node = (
      <div {...attrs} className={cls(uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
          <NewsletterForm
            title={d.title}
            text={d.text}
            placeholder={d.placeholder}
            buttonLabel={d.buttonLabel ?? d.ctaLabel}
            successMessage={d.success}
            textTokens={d?.twTokens}
          />
        </SectionTextScope>
        {componentsBlock}
      </div>
    );
    return wrapDecorations(node, sectionTokens);
  }

  if (type === "TESTIMONIALS") {
    const d = data as TestimonialsData;
    const items = Array.isArray(d.items) ? d.items : Array.isArray(d.testimonials) ? d.testimonials : [];
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-4 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              {items.map((t, idx) => {
                const itemTokens = resolveFieldTokens((t as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const nameTokens = resolveFieldTokens((t as any).nameTokens, baseItemTokens);
                const roleTokens = resolveFieldTokens((t as any).roleTokens, baseItemTokens);
                const quoteTokens = resolveFieldTokens((t as any).quoteTokens, baseItemTokens);
                const nameData = textContent(String(t.name ?? ""), nameTokens);
                const roleData = t.role ? textContent(String(t.role), roleTokens) : null;
                const quoteData = textContent(String(t.quote ?? ""), quoteTokens);
                const node = (
                  <div
                    key={idx}
                    className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4", tokensClass(itemTokens))}
                    style={tokensStyle(itemTokens)}
                  >
                    {wrapDecorations(
                      <div className={cls("text-sm font-semibold", tokensClass(nameTokens), nameData.className)} style={tokensStyle(nameTokens)} aria-label={nameData.ariaLabel}>
                        {nameData.content}
                      </div>,
                      nameTokens
                    )}
                    {roleData ? wrapDecorations(
                      <div className={cls("text-xs opacity-70", tokensClass(roleTokens), roleData.className)} style={tokensStyle(roleTokens)} aria-label={roleData.ariaLabel}>
                        {roleData.content}
                      </div>,
                      roleTokens
                    ) : null}
                    {wrapDecorations(
                      <div className={cls("mt-2 text-sm opacity-90", tokensClass(quoteTokens), quoteData.className)} style={tokensStyle(quoteTokens)} aria-label={quoteData.ariaLabel}>
                        "{quoteData.content}"
                      </div>,
                      quoteTokens
                    )}
                  </div>
                );
                return wrapDecorations(node, itemTokens);
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "NEW_ARRIVALS_SLIDER" || type === "BEST_SELLERS_SLIDER") {
    const d = data as any;
    const title = d?.title ?? (type === "NEW_ARRIVALS_SLIDER" ? "وصل حديثاً" : "الأكثر مبيعاً");
    const ids = Array.isArray(d?.productIds) ? d.productIds.filter(Boolean) : [];
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = textContent(String(title), sectionTokens);
    const emptyData = textContent("(لا يوجد منتجات - تأكد من الـlimit أو وجود طلبات/منتجات)", sectionTokens);

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-4 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}

            {ids.length ? (
              <div className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2">
                {ids.map((id: string) => {
                  const idData = textContent(String(id), sectionTokens);
                  const placeholderData = textContent("(عنصر تجريبي)", sectionTokens);
                  return (
                    <div key={id} className="min-w-[220px] snap-start md:min-w-[260px]">
                      {renderProductCard ? (
                        renderProductCard(id)
                      ) : (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className={cls("text-sm font-semibold", idData.className)} aria-label={idData.ariaLabel}>
                            {idData.content}
                          </div>
                          <div className={cls("mt-1 text-xs opacity-70", placeholderData.className)} aria-label={placeholderData.ariaLabel}>
                            {placeholderData.content}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={cls("text-sm opacity-70", emptyData.className)} aria-label={emptyData.ariaLabel}>
                {emptyData.content}
              </div>
            )}
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "BRANDS_SLIDER") {
    const d = data as any;
    const title = d?.title ?? "علامات تجارية";
    const items = Array.isArray(d?.items) ? d.items : [];
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = textContent(String(title), sectionTokens);
    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-4 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}

            {items.length ? (
              <div className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2">
                {items.map((b: any, idx: number) => {
                  const name = String(b?.name ?? "");
                  const href = typeof b?.href === "string" && b.href ? b.href : null;
                  const logoUrl = typeof b?.logoUrl === "string" && b.logoUrl ? b.logoUrl : null;
                  const itemTokens = resolveFieldTokens(b?.twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const nameTokens = resolveFieldTokens(b?.nameTokens, baseItemTokens);
                  const logoTokens = resolveFieldTokens(b?.logoTokens, baseItemTokens);
                  const linkTokens = resolveFieldTokens(b?.linkTokens, baseItemTokens);
                  const nameData = textContent(name || "Brand", nameTokens);
                  const Card = (
                    <div
                      className={cls("flex h-20 w-44 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4", tokensClass(itemTokens))}
                      style={tokensStyle(itemTokens)}
                    >
                      {logoUrl ? (
                        wrapDecorations(
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoUrl}
                            alt={name}
                            className={cls("max-h-10 max-w-[140px] object-contain", tokensClass(logoTokens))}
                            style={tokensStyle(logoTokens)}
                          />,
                          logoTokens
                        )
                      ) : (
                        wrapDecorations(
                          <span className={cls("text-sm font-semibold", tokensClass(nameTokens), nameData.className)} style={tokensStyle(nameTokens)} aria-label={nameData.ariaLabel}>
                            {nameData.content}
                          </span>,
                          nameTokens
                        )
                      )}
                    </div>
                  );
                  const node = (
                    <div key={idx} className="snap-start">
                      {href ? (
                        <a href={href} className={cls("block", tokensClass(linkTokens))} style={tokensStyle(linkTokens)} aria-label={name || "brand"}>
                          {Card}
                        </a>
                      ) : (
                        Card
                      )}
                    </div>
                  );
                  return wrapDecorations(node, itemTokens);
                })}
              </div>
            ) : (
              <div className="text-sm opacity-70">(أضف Brands داخل الـCMS)</div>
            )}
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "FEATURED_PRODUCTS" || type === "PRODUCTS" || type === "PRODUCTS_GRID" || type === "PRODUCT_GRID") {
    const d = data as FeaturedProductsData;
    const cols = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const ids = Array.isArray(d.productIds)
      ? d.productIds.filter(Boolean)
      : Array.isArray((d as any).products)
        ? (d as any).products.filter(Boolean)
        : [];
    const gridClass = cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const emptyData = textContent("(??? productIds ?? productSlugs ???? ????????)", sectionTokens);

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-4 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}

            {ids.length ? (
              <div className={cls("grid gap-4", gridClass)}>
                {ids.map((id: string) => {
                  const idData = textContent(String(id), sectionTokens);
                  const placeholderData = textContent("(عنصر تجريبي)", sectionTokens);
                  return (
                    <div key={id}>
                      {renderProductCard ? (
                        renderProductCard(id)
                      ) : (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className={cls("text-sm font-semibold", idData.className)} aria-label={idData.ariaLabel}>
                            {idData.content}
                          </div>
                          <div className={cls("mt-1 text-xs opacity-70", placeholderData.className)} aria-label={placeholderData.ariaLabel}>
                            {placeholderData.content}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={cls("text-sm opacity-70", emptyData.className)} aria-label={emptyData.ariaLabel}>
                {emptyData.content}
              </div>
            )}
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }



  if (type === "CARDS") {
    // `data` is passed into this component; using an undefined `section` variable
    // crashes the Preview at runtime when rendering CARDS sections.
    const d = data as CardsData;
    const ui: any = d.ui ?? {};
    const cards = d.cards ?? [];
    const sectionClass = ui.sectionClass || "py-8";
    const sectionTokens = (d as any)?.twTokens;
    const tokenClass = tokensClass(sectionTokens);
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const titleData = d.title ? textContent(String(d.title ?? ""), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle ?? ""), sectionTokens) : null;

    return wrapDecorations(
      <section {...attrs} className={cls(sectionClass, tokenClass)} style={uiSectionStyle(d)}>
        <div className={ui.containerClass || "mx-auto max-w-5xl px-4"}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h2 className={cls("text-2xl font-semibold text-white", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h2>
            ) : null}
            {subtitleData ? (
              <p className={cls("mt-1 text-white/70", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
                {subtitleData.content}
              </p>
            ) : null}

            <div className={ui.cardsClass || "mt-6 flex flex-wrap gap-4"}>
              {cards.map((c, idx) => {
                const ref = getCardProductRef(c);
                const prod = resolveProductMini(ref, productLookup);
                const title = c.title || prod?.title;
                const img = c.imageUrl || prod?.imageUrl;
                const priceText = prod?.priceText;
                const cardTokens = resolveFieldTokens((c as any).twTokens);
                const cardEffects = cardEffectClass(cardTokens ?? sectionTokens);
                const baseCardTokens = cardTokens ?? sectionTokens;
                const titleTokens = resolveFieldTokens((c as any).titleTokens, baseCardTokens);
                const textTokens = resolveFieldTokens((c as any).textTokens, baseCardTokens);
                const badgeTokens = resolveFieldTokens((c as any).badgeTokens, baseCardTokens);
                const buttonTokens = resolveFieldTokens((c as any).buttonTokens, baseCardTokens);
                const imageTokens = resolveFieldTokens((c as any).imageTokens);
                const cardTitleData = title ? textContent(String(title), titleTokens) : null;
                const badgeData = c.badge ? textContent(String(c.badge), badgeTokens) : null;
                const priceData = priceText ? textContent(String(priceText), textTokens) : null;
                const textData = c.text ? textContent(String(c.text), textTokens) : null;
                const buttonData = c.buttonLabel ? textContent(String(c.buttonLabel), buttonTokens) : null;

                const node = (
                  <div
                    key={idx}
                    className={cls(
                      ui.cardClass ||
                        "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] rounded-2xl border border-white/10 bg-white/5 p-4",
                      cardEffects,
                      tokensClass(cardTokens)
                    )}
                    style={tokensStyle(cardTokens)}
                  >
                    {img ? (
                      wrapDecorations(
                        <img
                          src={img}
                          alt={c.title ?? ""}
                          className={cls(ui.imageClass || "w-full h-40 object-cover rounded-xl border border-white/10", tokensClass(imageTokens))}
                          style={tokensStyle(imageTokens)}
                        />,
                        imageTokens
                      )
                    ) : null}

                    <div className="mt-3 flex items-start justify-between gap-2">
                      {cardTitleData ? (
                        wrapDecorations(
                          <div className={cls("text-white font-semibold", tokensClass(titleTokens), cardTitleData.className)} style={tokensStyle(titleTokens)} aria-label={cardTitleData.ariaLabel}>
                            {cardTitleData.content}
                          </div>,
                          titleTokens
                        )
                      ) : (
                        <div />
                      )}
                      {badgeData ? (
                        wrapDecorations(
                          <div className={cls("shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80", tokensClass(badgeTokens), badgeData.className)} style={tokensStyle(badgeTokens)} aria-label={badgeData.ariaLabel}>
                            {badgeData.content}
                          </div>,
                          badgeTokens
                        )
                      ) : null}
                    </div>
                    {priceData ? wrapDecorations(
                      <div className={cls("mt-1 text-sm text-white/80", tokensClass(textTokens), priceData.className)} style={tokensStyle(textTokens)} aria-label={priceData.ariaLabel}>
                        {priceData.content}
                      </div>,
                      textTokens
                    ) : null}

                    {textData ? wrapDecorations(
                      <div className={cls("mt-2 text-sm text-white/70", tokensClass(textTokens), textData.className)} style={tokensStyle(textTokens)} aria-label={textData.ariaLabel}>
                        {textData.content}
                      </div>,
                      textTokens
                    ) : null}

                    {(() => {
                      const hasView = !!(c.buttonLabel && c.buttonHref);
                      const hasQuick = !!(ref && renderQuickAdd);
                      if (!hasView && !hasQuick) return null;

                      return (
                        <div className={cls("mt-4", hasView && hasQuick ? "flex gap-2" : "")}>
                          {hasView ? (
                            wrapDecorations(
                              <a
                                href={c.buttonHref}
                                className={cls(
                                  "inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15",
                                  hasQuick ? "flex-1" : "",
                                  tokensClass(buttonTokens),
                                  buttonData?.className
                                )}
                                style={tokensStyle(buttonTokens)}
                                aria-label={buttonData?.ariaLabel}
                              >
                                {buttonData?.content ?? c.buttonLabel}
                              </a>,
                              buttonTokens
                            )
                          ) : null}

                          {hasQuick ? (
                            <div className={hasView ? "flex-1" : ""}>{renderQuickAdd!(ref!)}</div>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>
                );
                return wrapDecorations(node, cardTokens);
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }
  if (type === "VIDEO") {
    const d = data as VideoData;
    const aspect = d.aspect ?? d.ratio ?? "16/9";
    const aspectClass = aspect === "9/16" ? "aspect-[9/16]" : aspect === "1/1" ? "aspect-square" : aspect === "4/3" ? "aspect-[4/3]" : "aspect-video";
    const componentsBlock = renderComponentsBlock(d, productLookup);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    const placeholderData = textContent("(ضع رابط الفيديو)", sectionTokens);

    const yt = d.url ? youtubeId(d.url) : null;
    const vm = d.url ? vimeoId(d.url) : null;

    return wrapDecorations(
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-2 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            {subtitleData ? (
              <div className={cls("mb-4 text-sm opacity-80", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
                {subtitleData.content}
              </div>
            ) : null}

            <div className={cls("overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40", aspectClass)}>
              {yt ? (
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${yt}`}
                  title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : vm ? (
                <iframe
                  className="h-full w-full"
                  src={`https://player.vimeo.com/video/${vm}`}
                  title="Vimeo video"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : d.url ? (
                <video
                  className="h-full w-full"
                  src={d.url}
                  poster={d.posterUrl ?? undefined}
                  controls={d.controls ?? true}
                  autoPlay={!!d.autoplay}
                  muted={!!d.muted}
                  loop={!!d.loop}
                />
              ) : (
                <div className={cls("flex h-full w-full items-center justify-center text-sm opacity-70", placeholderData.className)} aria-label={placeholderData.ariaLabel}>
                  {placeholderData.content}
                </div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  return null;
}

export function CmsPageRenderer({
  sections,
  renderProductCard,
  renderQuickAdd,
  productLookup,
  className,
}: {
  sections: CmsSection[];
  renderProductCard?: (productId: string) => React.ReactNode;
  renderQuickAdd?: (ref: QuickAddRef) => React.ReactNode;
  productLookup?: Record<string, ProductMini>;
  className?: string;
}) {
  const sorted = (sections ?? []).filter((s) => s.isVisible !== false).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const seen = new Set<any>();
  const groups = buildSectionGroups(sorted);

  return (
    <div className={cls("space-y-5", className)}>
      {groups.flatMap((group) => {
        const renderSectionItem = (sec: CmsSection) => {
          const layout = normalizeSectionLayout((sec as any)?.data?.layout);
          const span = clampInt(layout.span, 1, group.columns, 1);
          const colSpanClass = group.mode === "grid" ? SECTION_COL_SPAN[span] : undefined;
          const rowStyle =
            group.mode === "row" && group.columns > 0
              ? {
                  flex: `0 0 ${(span / group.columns) * 100}%`,
                  maxWidth: `${(span / group.columns) * 100}%`,
                }
              : undefined;

          return (
            <div key={sec.id} className={cls(colSpanClass)} style={rowStyle}>
              <Section
                section={sec as any}
                renderProductCard={renderProductCard}
                renderQuickAdd={renderQuickAdd}
                productLookup={productLookup}
                depth={0}
                seen={seen}
              />
            </div>
          );
        };

        if (group.mode === "stack") {
          return group.sections.map(renderSectionItem);
        }

        const groupClass =
          group.mode === "row"
            ? "flex flex-wrap items-stretch gap-5"
            : cls("grid gap-5", SECTION_GRID_COLS[group.columns] ?? SECTION_GRID_COLS[2]);

        return (
          <div key={group.key} className={groupClass}>
            {group.sections.map(renderSectionItem)}
          </div>
        );
      })}
    </div>
  );
}


// Backwards-compatible name (used by older Admin preview code)
export const PageRenderer = CmsPageRenderer;
