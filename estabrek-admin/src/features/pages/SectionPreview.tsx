import React from "react";
import { useEffect, useState } from "react";
import type { PageSectionType } from "../../api/pages.api";
import type {
  BannerData,
  CtaData,
  CustomHtmlData,
  FaqData,
  FeaturedCategoriesData,
  FeaturedProductsData,
  CollectionsGridData,
  GridData,
  FeaturesData,
  StatsData,
  TeamData,
  PricingData,
  ContactData,
  HeroData,
  ImageGalleryData,
  NewsletterData,
  ProductsSliderData,
  RichTextData,
  TestimonialsData,
  BrandsSliderData,
  CardsData,
  VideoData,
} from "./SectionEditor";
import { sanitizeHtml } from "../../lib/sanitizeHtml";
import { CmsComponentsRenderer } from "./CmsComponentsRenderer";
import { TypewriterText } from "../../components/effects/TypewriterText";
import { SectionDecorations } from "../../cms/decorations/DecorationLayer";
import { DECOR_SIZE_HEIGHTS } from "../../cms/shapes/shapeRegistry";
import type { TwTokens } from "../../cms/style/tokens";
import { tokensToClassName, tokensToInlineStyle } from "../../cms/style/tokensToTw";

function safeNum(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function cls(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
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

function sectionDecorations(tokens?: TwTokens) {
  const decor = tokens?.decor;
  if (!decor) return null;
  const before = decor.before;
  const after = decor.after;
  const hasBefore = !!before?.shape && before.shape !== "none";
  const hasAfter = !!after?.shape && after.shape !== "none";
  if (!hasBefore && !hasAfter) return null;
  return { before: hasBefore ? before : undefined, after: hasAfter ? after : undefined };
}

function previewDecorMargins(tokens?: TwTokens): React.CSSProperties | undefined {
  const decor = tokens?.decor;
  if (!decor) return undefined;
  const offsets = { top: 0, bottom: 0, left: 0, right: 0 };
  const applyLayer = (layer?: any) => {
    if (!layer?.shape || layer.shape === "none") return;
    const placement = layer.placement ?? "bottom";
    const sizeKey = layer.size ?? "md";
    const size = DECOR_SIZE_HEIGHTS[sizeKey] ?? DECOR_SIZE_HEIGHTS.md ?? 100;
    if (placement === "top") offsets.top = Math.max(offsets.top, size);
    if (placement === "bottom") offsets.bottom = Math.max(offsets.bottom, size);
    if (placement === "left") offsets.left = Math.max(offsets.left, size);
    if (placement === "right") offsets.right = Math.max(offsets.right, size);
  };
  applyLayer(decor.before);
  applyLayer(decor.after);
  if (!offsets.top && !offsets.bottom && !offsets.left && !offsets.right) return undefined;
  return {
    marginTop: offsets.top || undefined,
    marginBottom: offsets.bottom || undefined,
    marginLeft: offsets.left || undefined,
    marginRight: offsets.right || undefined,
  };
}

function SectionShell({
  data,
  className,
  children,
}: {
  data: any;
  className: string;
  children: React.ReactNode;
}) {
  const tokens = data?.twTokens as TwTokens | undefined;
  const decorations = sectionDecorations(tokens);
  const hasDecorations = !!decorations;
  const wantsOverflowHidden = typeof className === "string" && className.includes("overflow-hidden");
  const baseClassName =
    hasDecorations && wantsOverflowHidden && typeof className === "string"
      ? className.replace(/\boverflow-hidden\b/g, "").trim()
      : className;
  const previewMargins = previewDecorMargins(tokens);
  const baseStyle = uiSectionStyle(data);
  const shellStyle = previewMargins ? { ...previewMargins, ...(baseStyle ?? {}) } : baseStyle;
  return (
    <div
      className={cls(
        baseClassName,
        uiSectionClass(data),
        hasDecorations ? "relative overflow-visible" : undefined
      )}
      style={shellStyle}
    >
      {hasDecorations ? <SectionDecorations decorations={decorations ?? undefined} className="z-0" /> : null}
      <div
        className={cls(
          hasDecorations ? "relative z-10" : undefined,
          wantsOverflowHidden ? "overflow-hidden" : undefined
        )}
        style={wantsOverflowHidden ? { borderRadius: "inherit" } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

function wrapPreview(data: any, node: React.ReactNode) {
  const tokens = data?.twTokens as TwTokens | undefined;
  const decorations = sectionDecorations(tokens);
  if (!decorations) return node;
  const previewMargins = previewDecorMargins(tokens);
  return (
    <div className="relative overflow-visible" style={previewMargins}>
      <SectionDecorations decorations={decorations ?? undefined} className="z-0" />
      <div className="relative z-10">{node}</div>
    </div>
  );
}

function sectionComponents(data: any) {
  const list = data?.components;
  return Array.isArray(list) ? list : [];
}

function renderComponentsBlock(data: any) {
  const components = sectionComponents(data);
  if (!components.length) return null;
  const inheritTokens = data?.twTokens?.typography ? { typography: data.twTokens.typography } : undefined;
  return (
    <div className="mt-4">
      <CmsComponentsRenderer components={components} inheritTokens={inheritTokens} />
    </div>
  );
}

function HeroPreview({ data }: { data: HeroData }) {
  const slides = Array.isArray((data as any).slides) ? ((data as any).slides as any[]) : [];
  const hasSlides = slides.length > 0;
  const [activeSlide, setActiveSlide] = useState(0);
  const autoplayMs = safeNum((data as any).autoplayMs, 0);
  const showDots = (data as any).showDots ?? true;
  const activeIndex = hasSlides ? Math.min(activeSlide, slides.length - 1) : 0;

  useEffect(() => {
    if (!hasSlides || !autoplayMs || autoplayMs <= 0) return;
    const id = setInterval(() => {
      setActiveSlide((idx) => (idx + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(id);
  }, [autoplayMs, hasSlides, slides.length]);

  const s = hasSlides ? slides[activeIndex] ?? slides[0] : data;
  const overlay = Math.min(1, Math.max(0, safeNum((s as any).overlay ?? data.overlay, 0.35)));
  const align = ((s as any).align ?? data.align ?? "center") as any;
  const justify = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";
  const componentsBlock = renderComponentsBlock(data);
  const primaryButton = (s as any).primaryButton;
  const secondaryButton = (s as any).secondaryButton;
  const sectionTokens = (data as any)?.twTokens;
  const slideTokens = resolveFieldTokens((s as any).slideTokens);
  const baseSlideTokens = slideTokens ?? sectionTokens;
  const titleTokens = resolveFieldTokens((s as any).titleTokens, baseSlideTokens);
  const subtitleTokens = resolveFieldTokens((s as any).subtitleTokens, baseSlideTokens);
  const primaryButtonTokens = resolveFieldTokens((s as any).primaryButtonTokens, baseSlideTokens);
  const secondaryButtonTokens = resolveFieldTokens((s as any).secondaryButtonTokens, baseSlideTokens);
  const titleValue = (s as any).title || "(بدون عنوان)";
  const titleData = textContent(String(titleValue), titleTokens);
  const subtitleValue = (s as any).subtitle;
  const subtitleData = subtitleValue ? textContent(String(subtitleValue), subtitleTokens) : null;
  const primaryLabelData = primaryButton?.label ? textContent(String(primaryButton.label), primaryButtonTokens) : null;
  const secondaryLabelData = secondaryButton?.label ? textContent(String(secondaryButton.label), secondaryButtonTokens) : null;
  const slideAnim = (data as any).slideAnim ?? "none";
  const slideDuration = safeNum((data as any).slideDuration, 600);
  const contentAnim = (data as any).contentAnim ?? "fade-up";
  const contentDuration = safeNum((data as any).contentDuration, 400);
  const contentDelay = safeNum((data as any).contentDelay, 0);
  const slideAnimClass = heroAnimClass(slideAnim, slideDuration, 0);
  const contentAnimClass = heroAnimClass(contentAnim, contentDuration, contentDelay);
  const slideKey = `${activeIndex}-${slideAnim}-${slideDuration}`;
  const contentKey = `${activeIndex}-${contentAnim}-${contentDuration}-${contentDelay}`;

  return (
    <SectionShell data={data} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      <div
        key={slideKey}
        className={cls("relative min-h-[180px]", uiContainerClass(data), slideAnimClass, tokensClass(slideTokens))}
        style={
          (s as any).backgroundImageUrl
            ? {
                backgroundImage: `url(${(s as any).backgroundImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                ...(tokensStyle(slideTokens) ?? {}),
              }
            : tokensStyle(slideTokens)
        }
      >
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
        <SectionTextScope data={data}>
        <div key={contentKey} className={cls("relative p-6 flex flex-col gap-3", justify, contentAnimClass)}>
          <div
            className={cls("text-lg font-semibold", tokensClass(titleTokens), titleData.className)}
            style={tokensStyle(titleTokens)}
            aria-label={titleData.ariaLabel}
          >
            {titleData.content}
          </div>
          {subtitleData ? (
            <div
              className={cls("text-sm opacity-80 max-w-[40ch]", tokensClass(subtitleTokens), subtitleData.className)}
              style={tokensStyle(subtitleTokens)}
              aria-label={subtitleData.ariaLabel}
            >
              {subtitleData.content}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {primaryButton?.label ? (
              primaryButton?.href ? (
                <a
                  href={primaryButton.href}
                  className={cls(
                    "inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95",
                    tokensClass(primaryButtonTokens),
                    primaryLabelData?.className
                  )}
                  style={{ backgroundColor: "var(--accent-2, #ffffff)", ...(tokensStyle(primaryButtonTokens) ?? {}) }}
                  aria-label={primaryLabelData?.ariaLabel}
                >
                  {primaryLabelData?.content ?? primaryButton.label}
                </a>
              ) : (
                <span
                  className={cls(
                    "inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold text-[color:var(--accent-contrast,#0B0B0B)] opacity-90",
                    tokensClass(primaryButtonTokens),
                    primaryLabelData?.className
                  )}
                  style={{ backgroundColor: "var(--accent-2, #ffffff)", ...(tokensStyle(primaryButtonTokens) ?? {}) }}
                  aria-label={primaryLabelData?.ariaLabel}
                >
                  {primaryLabelData?.content ?? primaryButton.label}
                </span>
              )
            ) : null}
            {secondaryButton?.label ? (
              secondaryButton?.href ? (
                <a
                  href={secondaryButton.href}
                  className={cls(
                    "inline-flex items-center px-3 py-1 text-xs font-semibold border rounded-xl border-white/20",
                    tokensClass(secondaryButtonTokens),
                    secondaryLabelData?.className
                  )}
                  style={tokensStyle(secondaryButtonTokens)}
                  aria-label={secondaryLabelData?.ariaLabel}
                >
                  {secondaryLabelData?.content ?? secondaryButton.label}
                </a>
              ) : (
                <span
                  className={cls(
                    "inline-flex items-center px-3 py-1 text-xs font-semibold border rounded-xl border-white/20",
                    tokensClass(secondaryButtonTokens),
                    secondaryLabelData?.className
                  )}
                  style={tokensStyle(secondaryButtonTokens)}
                  aria-label={secondaryLabelData?.ariaLabel}
                >
                  {secondaryLabelData?.content ?? secondaryButton.label}
                </span>
              )
            ) : null}
          </div>
        </div>
        </SectionTextScope>
        {showDots && slides.length > 1 ? (
          <div className="absolute flex items-center gap-2 -translate-x-1/2 bottom-3 left-1/2">
            {slides.map((_: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={cls(
                  "h-2 w-2 rounded-full transition",
                  idx === activeIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
      {componentsBlock}
    </SectionShell>
  );
}

export function SectionPreview({ type, data }: { type: PageSectionType; data: any }) {
  if (!data || typeof data !== "object") {
    return <div className="text-xs opacity-70">?? ???? ?????? ????????.</div>;
  }
  if (type === "HERO") {
    return <HeroPreview data={data as HeroData} />;
  }

  if (type === "RICH_TEXT") {
    const d = data as RichTextData;
    const safe = sanitizeHtml(d.html || "");
    const hasComponents = sectionComponents(d).length > 0;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const htmlEffectClass = textEffectClass(sectionTokens);
    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
        {titleData ? (
          <div className={cls("mb-2 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
            {titleData.content}
          </div>
        ) : null}
        <div
          className={cls(
            "text-sm leading-6 opacity-90 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-2 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5 [&_a]:underline",
            htmlEffectClass
          )}
          dangerouslySetInnerHTML={{ __html: safe || (hasComponents ? "" : "<p class='opacity-60'>(محتوى)</p>") }}
        />
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "CUSTOM_HTML") {
    const d = data as CustomHtmlData;
    const safe = sanitizeHtml(d.html || "");
    const hasComponents = sectionComponents(d).length > 0;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = textContent("Custom HTML", sectionTokens);
    const noteData = textContent("(المعاينة بتعمل sanitize - بالستورهونت ممكن يكون نفس الشي أو حسب إعداداتك)", sectionTokens);
    const htmlEffectClass = textEffectClass(sectionTokens);
    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
        <div className={cls("mb-2 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
          {titleData.content}
        </div>
        <div className={cls("mb-3 text-xs opacity-60", noteData.className)} aria-label={noteData.ariaLabel}>
          {noteData.content}
        </div>
        <div
          className={cls("text-sm leading-6 opacity-90 [&_a]:underline", htmlEffectClass)}
          dangerouslySetInnerHTML={{ __html: safe || (hasComponents ? "" : "<p class='opacity-60'>(HTML)</p>") }}
        />
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "FAQ") {
    const d = data as FaqData;
    const items = Array.isArray(d.items) ? d.items : [];
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
        {titleData ? (
          <div className={cls("mb-2 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
            {titleData.content}
          </div>
        ) : null}
        <div className="space-y-2">
          {items.length ? (
            items.slice(0, 6).map((it, i) => {
              const itemTokens = resolveFieldTokens((it as any).twTokens);
              const baseItemTokens = itemTokens ?? sectionTokens;
              const questionTokens = resolveFieldTokens((it as any).questionTokens, baseItemTokens);
              const answerTokens = resolveFieldTokens((it as any).answerTokens, baseItemTokens);
              const questionText = it.question || "(سؤال)";
              const questionData = textContent(String(questionText), questionTokens);
              const answerData = it.answer ? textContent(String(it.answer ?? ""), answerTokens) : null;
              return (
                <details
                  key={i}
                  className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] p-3", tokensClass(itemTokens))}
                  style={tokensStyle(itemTokens)}
                >
                  <summary
                    className={cls("text-sm font-medium cursor-pointer", tokensClass(questionTokens), questionData.className)}
                    style={tokensStyle(questionTokens)}
                    aria-label={questionData.ariaLabel}
                  >
                    {questionData.content}
                  </summary>
                  {answerData ? (
                    <div
                      className={cls("mt-2 text-sm whitespace-pre-wrap opacity-80", tokensClass(answerTokens), answerData.className)}
                      style={tokensStyle(answerTokens)}
                      aria-label={answerData.ariaLabel}
                    >
                      {answerData.content}
                    </div>
                  ) : null}
                </details>
              );
            })
          ) : (
            <div className="text-xs opacity-70">(لا يوجد أسئلة)</div>
          )}
        </div>
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "GRID") {
    const d = data as GridData;
    if (d?.mode === "container") {
      const blocks = Array.isArray(d.blocks) ? d.blocks : [];
      const componentsBlock = renderComponentsBlock(d);
      return wrapPreview(d, (
        <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
          <SectionTextScope data={d}>
            {d.title ? <div className="mb-3 text-sm font-semibold">{d.title}</div> : null}
            <div className="space-y-2">
              {blocks.length ? (
                blocks.map((b: any, i: number) => (
                  <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs">
                    Section: {b?.type ?? "(نوع)"}
                  </div>
                ))
              ) : (
                <div className="text-xs opacity-70">(لا يوجد Sections داخل الـContainer)</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      ));
    }
    const cols = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const items = Array.isArray(d.items) ? d.items : [];
    const gridCols = cols === 2 ? "sm:grid-cols-2" : cols === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;

    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
        {titleData ? (
          <div className={cls("mb-3 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
            {titleData.content}
          </div>
        ) : null}
        <div className={cls("grid gap-2", gridCols)}>
          {items.length ? (
            items.slice(0, 8).map((it, i) => {
              const itemTokens = resolveFieldTokens((it as any).twTokens);
              const baseItemTokens = itemTokens ?? sectionTokens;
              const titleTokens = resolveFieldTokens((it as any).titleTokens, baseItemTokens);
              const textTokens = resolveFieldTokens((it as any).textTokens, baseItemTokens);
              const imageTokens = resolveFieldTokens((it as any).imageTokens);
              const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
              const itemTitle = it.title || "(عنوان)";
              const itemTitleData = textContent(String(itemTitle), titleTokens);
              const itemTextData = it.text ? textContent(String(it.text), textTokens) : null;
              const hrefData = it.href ? textContent(String(it.href), linkTokens) : null;
              return (
                <div
                  key={i}
                  className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] p-3", tokensClass(itemTokens))}
                  style={tokensStyle(itemTokens)}
                >
                  {it.imageUrl ? (
                    <img
                      src={it.imageUrl}
                      alt=""
                      className={cls("object-cover w-full h-20 mb-2 rounded-lg", tokensClass(imageTokens))}
                      style={tokensStyle(imageTokens)}
                    />
                  ) : null}
                  <div className={cls("text-sm font-medium", tokensClass(titleTokens), itemTitleData.className)} style={tokensStyle(titleTokens)} aria-label={itemTitleData.ariaLabel}>
                    {itemTitleData.content}
                  </div>
                  {itemTextData ? (
                    <div className={cls("mt-1 text-xs whitespace-pre-wrap opacity-80", tokensClass(textTokens), itemTextData.className)} style={tokensStyle(textTokens)} aria-label={itemTextData.ariaLabel}>
                      {itemTextData.content}
                    </div>
                  ) : null}
                  {hrefData ? (
                    <div className={cls("mt-2 text-[11px] opacity-60", tokensClass(linkTokens), hrefData.className)} style={tokensStyle(linkTokens)} aria-label={hrefData.ariaLabel}>
                      {hrefData.content}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="text-xs opacity-70">(لا يوجد عناصر)</div>
          )}
        </div>
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "FEATURES") {
    const d = data as FeaturesData;
    const items = Array.isArray(d.items) ? d.items : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const gridCols =
      cols <= 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : cols === 4 ? "sm:grid-cols-4" : cols === 5 ? "sm:grid-cols-5" : "sm:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
          {titleData ? (
            <div className={cls("mb-1 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
              {titleData.content}
            </div>
          ) : null}
          {subtitleData ? (
            <div className={cls("mb-3 text-xs opacity-70", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
              {subtitleData.content}
            </div>
          ) : null}
          <div className={cls("grid gap-2", gridCols)}>
            {items.length ? (
              items.slice(0, 8).map((it, i) => {
                const itemTokens = resolveFieldTokens((it as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const titleTokens = resolveFieldTokens((it as any).titleTokens, baseItemTokens);
                const textTokens = resolveFieldTokens((it as any).textTokens, baseItemTokens);
                const iconTokens = resolveFieldTokens((it as any).iconTokens, baseItemTokens);
                const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                const itemTitle = it.title || "(ميزة)";
                const itemTitleData = textContent(String(itemTitle), titleTokens);
                const itemTextData = it.text ? textContent(String(it.text), textTokens) : null;
                const wrapperClass = cls(
                  "rounded-xl border border-white/[0.08] bg-white/[0.02] p-3",
                  tokensClass(itemTokens),
                  it.href ? tokensClass(linkTokens) : undefined
                );
                const wrapperStyle = {
                  ...(tokensStyle(itemTokens) ?? {}),
                  ...(it.href ? (tokensStyle(linkTokens) ?? {}) : {}),
                };
                const content = (
                  <>
                    <div className="flex items-center gap-2">
                      {it.iconUrl ? (
                        <img
                          src={it.iconUrl}
                          alt=""
                          className={cls("h-6 w-6 rounded-md", tokensClass(iconTokens))}
                          style={tokensStyle(iconTokens)}
                        />
                      ) : it.icon ? (
                        <span className={cls(tokensClass(iconTokens))} style={tokensStyle(iconTokens)}>
                          {it.icon}
                        </span>
                      ) : null}
                      <div className={cls("text-sm font-semibold", tokensClass(titleTokens), itemTitleData.className)} style={tokensStyle(titleTokens)} aria-label={itemTitleData.ariaLabel}>
                        {itemTitleData.content}
                      </div>
                    </div>
                    {itemTextData ? (
                      <div className={cls("mt-2 text-xs opacity-80", tokensClass(textTokens), itemTextData.className)} style={tokensStyle(textTokens)} aria-label={itemTextData.ariaLabel}>
                        {itemTextData.content}
                      </div>
                    ) : null}
                  </>
                );
                return it.href ? (
                  <a key={i} href={it.href} className={wrapperClass} style={wrapperStyle}>
                    {content}
                  </a>
                ) : (
                  <div key={i} className={wrapperClass} style={wrapperStyle}>
                    {content}
                  </div>
                );
              })
            ) : (
              <div className="text-xs opacity-70">(لا يوجد عناصر)</div>
            )}
          </div>
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "STATS") {
    const d = data as StatsData;
    const items = Array.isArray(d.items) ? d.items : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const gridCols =
      cols <= 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : cols === 4 ? "sm:grid-cols-4" : cols === 5 ? "sm:grid-cols-5" : "sm:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
          {titleData ? (
            <div className={cls("mb-1 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
              {titleData.content}
            </div>
          ) : null}
          {subtitleData ? (
            <div className={cls("mb-3 text-xs opacity-70", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
              {subtitleData.content}
            </div>
          ) : null}
          <div className={cls("grid gap-2", gridCols)}>
            {items.length ? (
              items.slice(0, 8).map((it, i) => {
                const itemTokens = resolveFieldTokens((it as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const valueTokens = resolveFieldTokens((it as any).valueTokens, baseItemTokens);
                const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                const subtextTokens = resolveFieldTokens((it as any).subtextTokens, baseItemTokens);
                const iconTokens = resolveFieldTokens((it as any).iconTokens, baseItemTokens);
                const valueData = textContent(String(it.value ?? ""), valueTokens);
                const labelData = it.label ? textContent(String(it.label), labelTokens) : null;
                const subtextData = it.subtext ? textContent(String(it.subtext), subtextTokens) : null;
                return (
                  <div
                    key={i}
                    className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-center", tokensClass(itemTokens))}
                    style={tokensStyle(itemTokens)}
                  >
                    {it.icon ? (
                      <div className={cls("text-lg", tokensClass(iconTokens))} style={tokensStyle(iconTokens)}>
                        {it.icon}
                      </div>
                    ) : null}
                    <div className={cls("text-lg font-semibold", tokensClass(valueTokens), valueData.className)} style={tokensStyle(valueTokens)} aria-label={valueData.ariaLabel}>
                      {valueData.content}
                    </div>
                    {labelData ? (
                      <div className={cls("text-xs opacity-70", tokensClass(labelTokens), labelData.className)} style={tokensStyle(labelTokens)} aria-label={labelData.ariaLabel}>
                        {labelData.content}
                      </div>
                    ) : null}
                    {subtextData ? (
                      <div className={cls("text-[11px] opacity-60", tokensClass(subtextTokens), subtextData.className)} style={tokensStyle(subtextTokens)} aria-label={subtextData.ariaLabel}>
                        {subtextData.content}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="text-xs opacity-70">(لا يوجد عناصر)</div>
            )}
          </div>
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "TEAM") {
    const d = data as TeamData;
    const members = Array.isArray(d.members) ? d.members : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const gridCols =
      cols <= 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : cols === 4 ? "sm:grid-cols-4" : cols === 5 ? "sm:grid-cols-5" : "sm:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
          {titleData ? (
            <div className={cls("mb-1 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
              {titleData.content}
            </div>
          ) : null}
          {subtitleData ? (
            <div className={cls("mb-3 text-xs opacity-70", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
              {subtitleData.content}
            </div>
          ) : null}
          <div className={cls("grid gap-2", gridCols)}>
            {members.length ? (
              members.slice(0, 8).map((m, i) => {
                const itemTokens = resolveFieldTokens((m as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const nameTokens = resolveFieldTokens((m as any).nameTokens, baseItemTokens);
                const roleTokens = resolveFieldTokens((m as any).roleTokens, baseItemTokens);
                const bioTokens = resolveFieldTokens((m as any).bioTokens, baseItemTokens);
                const avatarTokens = resolveFieldTokens((m as any).avatarTokens);
                const socialTokens = resolveFieldTokens((m as any).socialTokens, baseItemTokens);
                const nameData = textContent(String(m.name || "(اسم)"), nameTokens);
                const roleData = m.role ? textContent(String(m.role), roleTokens) : null;
                const bioData = m.bio ? textContent(String(m.bio), bioTokens) : null;
                const socials = Array.isArray(m.socials) ? m.socials : [];
                return (
                  <div key={i} className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] p-3", tokensClass(itemTokens))} style={tokensStyle(itemTokens)}>
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt=""
                        className={cls("h-10 w-10 rounded-full object-cover mb-2", tokensClass(avatarTokens))}
                        style={tokensStyle(avatarTokens)}
                      />
                    ) : null}
                    <div className={cls("text-sm font-semibold", tokensClass(nameTokens), nameData.className)} style={tokensStyle(nameTokens)} aria-label={nameData.ariaLabel}>
                      {nameData.content}
                    </div>
                    {roleData ? (
                      <div className={cls("text-xs opacity-70", tokensClass(roleTokens), roleData.className)} style={tokensStyle(roleTokens)} aria-label={roleData.ariaLabel}>
                        {roleData.content}
                      </div>
                    ) : null}
                    {bioData ? (
                      <div className={cls("mt-2 text-xs opacity-80", tokensClass(bioTokens), bioData.className)} style={tokensStyle(bioTokens)} aria-label={bioData.ariaLabel}>
                        {bioData.content}
                      </div>
                    ) : null}
                    {socials.length ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] opacity-70">
                        {socials.map((s, sIdx) => {
                          const label = s.label || s.href || "";
                          if (!label) return null;
                          const socialData = textContent(String(label), socialTokens);
                          return (
                            <span
                              key={`${label}-${sIdx}`}
                              className={cls(tokensClass(socialTokens), socialData.className)}
                              style={tokensStyle(socialTokens)}
                              aria-label={socialData.ariaLabel}
                            >
                              {socialData.content}
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="text-xs opacity-70">(لا يوجد أعضاء)</div>
            )}
          </div>
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "PRICING") {
    const d = data as PricingData;
    const plans = Array.isArray(d.plans) ? d.plans : [];
    const cols = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const gridCols = cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
          {titleData ? (
            <div className={cls("mb-1 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
              {titleData.content}
            </div>
          ) : null}
          {subtitleData ? (
            <div className={cls("mb-3 text-xs opacity-70", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
              {subtitleData.content}
            </div>
          ) : null}
          <div className={cls("grid gap-2", gridCols)}>
            {plans.length ? (
              plans.slice(0, 6).map((p, i) => {
                const planTokens = resolveFieldTokens((p as any).twTokens);
                const basePlanTokens = planTokens ?? sectionTokens;
                const nameTokens = resolveFieldTokens((p as any).nameTokens, basePlanTokens);
                const priceTokens = resolveFieldTokens((p as any).priceTokens, basePlanTokens);
                const periodTokens = resolveFieldTokens((p as any).periodTokens, priceTokens ?? basePlanTokens);
                const descriptionTokens = resolveFieldTokens((p as any).descriptionTokens, basePlanTokens);
                const badgeTokens = resolveFieldTokens((p as any).badgeTokens, basePlanTokens);
                const featureTokens = resolveFieldTokens((p as any).featureTokens, basePlanTokens);
                const ctaTokens = resolveFieldTokens((p as any).ctaTokens, basePlanTokens);
                const nameData = textContent(String(p.name || "(خطة)"), nameTokens);
                const priceData = p.price ? textContent(String(p.price), priceTokens) : null;
                const periodData = p.period ? textContent(String(p.period), periodTokens) : null;
                const descriptionData = p.description ? textContent(String(p.description), descriptionTokens) : null;
                const badgeData = p.badge ? textContent(String(p.badge), badgeTokens) : null;
                const ctaData = p.ctaLabel ? textContent(String(p.ctaLabel), ctaTokens) : null;
                return (
                  <div
                    key={i}
                    className={cls(
                      "rounded-xl border border-white/[0.08] bg-white/[0.02] p-3",
                      tokensClass(planTokens),
                      p.highlight ? "ring-1 ring-accent-500/40" : undefined
                    )}
                    style={tokensStyle(planTokens)}
                  >
                    {badgeData ? (
                      <div className={cls("text-[11px] opacity-70", tokensClass(badgeTokens), badgeData.className)} style={tokensStyle(badgeTokens)} aria-label={badgeData.ariaLabel}>
                        {badgeData.content}
                      </div>
                    ) : null}
                    <div className={cls("text-sm font-semibold", tokensClass(nameTokens), nameData.className)} style={tokensStyle(nameTokens)} aria-label={nameData.ariaLabel}>
                      {nameData.content}
                    </div>
                    {priceData ? (
                      <div className={cls("mt-1 text-lg", tokensClass(priceTokens), priceData.className)} style={tokensStyle(priceTokens)} aria-label={priceData.ariaLabel}>
                        {priceData.content}
                        {periodData ? (
                          <span className={cls("text-xs opacity-60", tokensClass(periodTokens), periodData.className)} style={tokensStyle(periodTokens)} aria-label={periodData.ariaLabel}>
                            {" "}
                            {periodData.content}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {descriptionData ? (
                      <div className={cls("mt-1 text-xs opacity-70", tokensClass(descriptionTokens), descriptionData.className)} style={tokensStyle(descriptionTokens)} aria-label={descriptionData.ariaLabel}>
                        {descriptionData.content}
                      </div>
                    ) : null}
                    {Array.isArray(p.features) && p.features.length ? (
                      <ul className={cls("mt-2 list-disc ps-5 text-xs opacity-80", tokensClass(featureTokens))} style={tokensStyle(featureTokens)}>
                        {p.features.slice(0, 4).map((f, idx) => {
                          const featureData = textContent(String(f), featureTokens);
                          return (
                            <li key={idx} className={featureData.className} aria-label={featureData.ariaLabel}>
                              {featureData.content}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    {ctaData ? (
                      <div className={cls("mt-3 inline-flex items-center rounded-xl border border-white/10 px-3 py-1 text-xs", tokensClass(ctaTokens), ctaData.className)} style={tokensStyle(ctaTokens)} aria-label={ctaData.ariaLabel}>
                        {ctaData.content}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="text-xs opacity-70">(لا يوجد خطط)</div>
            )}
          </div>
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "CONTACT") {
    const d = data as ContactData;
    const items = Array.isArray(d.items) ? d.items : [];
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    const form = d.form ?? {};
    const fields = Array.isArray(form.fields) ? form.fields : [];

    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
          {titleData ? (
            <div className={cls("mb-1 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
              {titleData.content}
            </div>
          ) : null}
          {subtitleData ? (
            <div className={cls("mb-3 text-xs opacity-70", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
              {subtitleData.content}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              {items.length ? (
                items.map((it, i) => {
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                  const valueTokens = resolveFieldTokens((it as any).valueTokens, baseItemTokens);
                  const iconTokens = resolveFieldTokens((it as any).iconTokens, baseItemTokens);
                  const labelData = textContent(String(it.label || "وسيلة"), labelTokens);
                  const valueData = it.value ? textContent(String(it.value), valueTokens) : null;
                  return (
                    <div key={i} className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs", tokensClass(itemTokens))} style={tokensStyle(itemTokens)}>
                      <div className="flex items-center gap-2">
                        {it.icon ? (
                          <span className={cls(tokensClass(iconTokens))} style={tokensStyle(iconTokens)}>
                            {it.icon}
                          </span>
                        ) : null}
                        <div className={cls("font-semibold", tokensClass(labelTokens), labelData.className)} style={tokensStyle(labelTokens)} aria-label={labelData.ariaLabel}>
                          {labelData.content}
                        </div>
                      </div>
                      {valueData ? (
                        it.href ? (
                          <a
                            href={it.href}
                            className={cls("opacity-80", tokensClass(valueTokens), valueData.className)}
                            style={tokensStyle(valueTokens)}
                            aria-label={valueData.ariaLabel}
                          >
                            {valueData.content}
                          </a>
                        ) : (
                          <div className={cls("opacity-80", tokensClass(valueTokens), valueData.className)} style={tokensStyle(valueTokens)} aria-label={valueData.ariaLabel}>
                            {valueData.content}
                          </div>
                        )
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs opacity-70">(لا توجد وسائل تواصل)</div>
              )}
            </div>
            <div className="space-y-2">
              {d.mapEmbedUrl ? (() => {
                const mapTokens = resolveFieldTokens((d as any).mapTokens, sectionTokens);
                return (
                  <div className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs opacity-70", tokensClass(mapTokens))} style={tokensStyle(mapTokens)}>
                    Map embed
                  </div>
                );
              })() : null}
              {fields.length ? (() => {
                const formTokens = resolveFieldTokens((form as any).twTokens, sectionTokens);
                const formTitleTokens = resolveFieldTokens((form as any).titleTokens, formTokens ?? sectionTokens);
                const formSubtitleTokens = resolveFieldTokens((form as any).subtitleTokens, formTokens ?? sectionTokens);
                const fieldTokens = resolveFieldTokens((form as any).fieldTokens, formTokens ?? sectionTokens);
                const labelTokens = resolveFieldTokens((form as any).labelTokens, fieldTokens ?? formTokens ?? sectionTokens);
                const inputTokens = resolveFieldTokens((form as any).inputTokens, fieldTokens ?? formTokens ?? sectionTokens);
                const submitTokens = resolveFieldTokens((form as any).submitTokens, formTokens ?? sectionTokens);
                const formTitleData = form.title ? textContent(String(form.title), formTitleTokens) : null;
                const formSubtitleData = form.subtitle ? textContent(String(form.subtitle), formSubtitleTokens) : null;
                return (
                  <div className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs", tokensClass(formTokens))} style={tokensStyle(formTokens)}>
                    {formTitleData ? (
                      <div className={cls("font-semibold", tokensClass(formTitleTokens), formTitleData.className)} style={tokensStyle(formTitleTokens)} aria-label={formTitleData.ariaLabel}>
                        {formTitleData.content}
                      </div>
                    ) : null}
                    {formSubtitleData ? (
                      <div className={cls("mt-1 text-[11px] opacity-70", tokensClass(formSubtitleTokens), formSubtitleData.className)} style={tokensStyle(formSubtitleTokens)} aria-label={formSubtitleData.ariaLabel}>
                        {formSubtitleData.content}
                      </div>
                    ) : null}
                    <div className={cls("mt-2 space-y-2", tokensClass(fieldTokens))} style={tokensStyle(fieldTokens)}>
                      {fields.slice(0, 2).map((f, idx) => {
                        const fieldLabel = f.label || f.name;
                        const labelData = textContent(String(fieldLabel), labelTokens);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className={cls("text-[11px] opacity-70", tokensClass(labelTokens), labelData.className)} style={tokensStyle(labelTokens)} aria-label={labelData.ariaLabel}>
                              {labelData.content}
                            </div>
                            <div className={cls("h-8 rounded-lg border border-white/[0.08] bg-white/[0.02]", tokensClass(inputTokens))} style={tokensStyle(inputTokens)} />
                          </div>
                        );
                      })}
                    </div>
                    {(() => {
                      const submitText = form.submitLabel || "إرسال";
                      const submitData = textContent(String(submitText), submitTokens);
                      return (
                        <div className={cls("mt-2 inline-flex rounded-lg border border-white/[0.08] px-3 py-1 text-[11px]", tokensClass(submitTokens), submitData.className)} style={tokensStyle(submitTokens)} aria-label={submitData.ariaLabel}>
                          {submitData.content}
                        </div>
                      );
                    })()}
                  </div>
                );
              })() : null}
            </div>
          </div>
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "FEATURED_CATEGORIES") {
    const d = data as FeaturedCategoriesData;
    const items = Array.isArray(d.items) ? d.items : [];
    const showArrows = !!d.showArrows;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    return (
      <SectionShell data={d} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className={cls("space-y-3", uiContainerClass(d))}>
          {(d.title || d.subtitle || showArrows) ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                {titleData ? (
                  <div className={cls("text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                    {titleData.content}
                  </div>
                ) : null}
                {subtitleData ? (
                  <div className={cls("mt-1 text-xs opacity-70", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
                    {subtitleData.content}
                  </div>
                ) : null}
              </div>
              {showArrows ? (
                <div className="flex items-center gap-2">
                  <button type="button" className="text-xs border rounded-full h-7 w-7 border-white/10 bg-white/5 text-white/70">‹</button>
                  <button type="button" className="text-xs border rounded-full h-7 w-7 border-white/10 bg-white/5 text-white/70">›</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.length ? (
              items.slice(0, 6).map((it, i) => {
                const itemTokens = resolveFieldTokens((it as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                const imageTokens = resolveFieldTokens((it as any).imageTokens);
                const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                const labelData = textContent(String(it.label || "Category"), labelTokens);
                const hrefData = it.href ? textContent(String(it.href), linkTokens) : null;
                return (
                  <div
                    key={i}
                    className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] p-3", tokensClass(itemTokens))}
                    style={tokensStyle(itemTokens)}
                  >
                    {it.imageUrl ? (
                      <img
                        src={it.imageUrl}
                        alt=""
                        className={cls("object-cover w-full h-16 mb-2 rounded-lg", tokensClass(imageTokens))}
                        style={tokensStyle(imageTokens)}
                      />
                    ) : null}
                    <div className={cls("text-sm font-medium", tokensClass(labelTokens), labelData.className)} style={tokensStyle(labelTokens)} aria-label={labelData.ariaLabel}>
                      {labelData.content}
                    </div>
                    {hrefData ? (
                      <div className={cls("mt-1 text-[11px] opacity-60", tokensClass(linkTokens), hrefData.className)} style={tokensStyle(linkTokens)} aria-label={hrefData.ariaLabel}>
                        {hrefData.content}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="text-xs opacity-70">No items yet.</div>
            )}
          </div>
          {componentsBlock}
        </div>
      </SectionShell>
    );
  }

  if (type === "COLLECTIONS_GRID") {
    const d = data as CollectionsGridData;
    const items = Array.isArray(d.items) ? d.items : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const gridCols =
      cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : cols === 4 ? "sm:grid-cols-4" : cols === 5 ? "sm:grid-cols-5" : "sm:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
        {titleData ? (
          <div className={cls("mb-2 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
            {titleData.content}
          </div>
        ) : null}
        {subtitleData ? (
          <div className={cls("mb-3 text-xs opacity-70", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
            {subtitleData.content}
          </div>
        ) : null}
        <div className={cls("grid gap-2", gridCols)}>
          {items.length ? (
            items.slice(0, 8).map((it, i) => {
              const itemTokens = resolveFieldTokens((it as any).twTokens);
              const baseItemTokens = itemTokens ?? sectionTokens;
              const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
              const imageTokens = resolveFieldTokens((it as any).imageTokens);
              const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
              const labelData = textContent(String(it.label || "Collection"), labelTokens);
              const hrefData = it.href ? textContent(String(it.href), linkTokens) : null;
              return (
                <div
                  key={i}
                  className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] p-3", tokensClass(itemTokens))}
                  style={tokensStyle(itemTokens)}
                >
                  {it.imageUrl ? (
                    <img
                      src={it.imageUrl}
                      alt=""
                      className={cls("object-cover w-full h-16 mb-2 rounded-lg", tokensClass(imageTokens))}
                      style={tokensStyle(imageTokens)}
                    />
                  ) : null}
                  <div className={cls("text-sm font-medium", tokensClass(labelTokens), labelData.className)} style={tokensStyle(labelTokens)} aria-label={labelData.ariaLabel}>
                    {labelData.content}
                  </div>
                  {hrefData ? (
                    <div className={cls("mt-1 text-[11px] opacity-60", tokensClass(linkTokens), hrefData.className)} style={tokensStyle(linkTokens)} aria-label={hrefData.ariaLabel}>
                      {hrefData.content}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="text-xs opacity-70">No items yet.</div>
          )}
        </div>
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "NEW_ARRIVALS_SLIDER" || type === "BEST_SELLERS_SLIDER") {
    const d = data as ProductsSliderData;
    const limit = Math.min(8, Math.max(1, safeNum(d.limit, 6)));
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleValue = d.title || (type === "NEW_ARRIVALS_SLIDER" ? "New arrivals" : "Best sellers");
    const titleData = textContent(String(titleValue), sectionTokens);
    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
        <div className={cls("mb-2 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
          {titleData.content}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs opacity-70">
              Product {i + 1}
            </div>
          ))}
        </div>
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "BRANDS_SLIDER") {
    const d = data as BrandsSliderData;
    const items = Array.isArray(d.items) ? d.items : [];
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
        {titleData ? (
          <div className={cls("mb-2 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
            {titleData.content}
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {items.length ? (
            items.slice(0, 8).map((it, i) => {
              const itemTokens = resolveFieldTokens((it as any).twTokens);
              const baseItemTokens = itemTokens ?? sectionTokens;
              const nameTokens = resolveFieldTokens((it as any).nameTokens, baseItemTokens);
              const logoTokens = resolveFieldTokens((it as any).logoTokens, baseItemTokens);
              const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
              const nameData = textContent(String(it.name || "Brand"), nameTokens);
              const hrefData = it.href ? textContent(String(it.href), linkTokens) : null;
              return (
                <div
                  key={i}
                  className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs", tokensClass(itemTokens))}
                  style={tokensStyle(itemTokens)}
                >
                  <div className={cls("font-semibold", tokensClass(nameTokens), nameData.className)} style={tokensStyle(nameTokens)} aria-label={nameData.ariaLabel}>
                    {nameData.content}
                  </div>
                  {it.logoUrl ? (
                    <div className={cls("mt-1 text-[11px] opacity-60", tokensClass(logoTokens))} style={tokensStyle(logoTokens)}>
                      logo: {it.logoUrl}
                    </div>
                  ) : null}
                  {hrefData ? (
                    <div className={cls("mt-1 text-[11px] opacity-60", tokensClass(linkTokens), hrefData.className)} style={tokensStyle(linkTokens)} aria-label={hrefData.ariaLabel}>
                      {hrefData.content}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="text-xs opacity-70">No brands yet.</div>
          )}
        </div>
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "IMAGE_GALLERY") {
    const d = data as ImageGalleryData;
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const images = Array.isArray(d.images) ? d.images : [];
    const gridCols =
      cols <= 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : cols === 4 ? "grid-cols-4" : cols === 5 ? "grid-cols-5" : "grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;

    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
        {titleData ? (
          <div className={cls("mb-3 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
            {titleData.content}
          </div>
        ) : null}
        {images.length ? (
          <div className={cls("grid gap-2", gridCols)}>
            {images.slice(0, 12).map((im, i) => {
              const itemTokens = resolveFieldTokens((im as any).twTokens);
              const imageTokens = resolveFieldTokens((im as any).imageTokens);
              return (
                <div
                  key={i}
                  className={cls("overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]", tokensClass(itemTokens))}
                  style={tokensStyle(itemTokens)}
                >
                  <img
                    src={im.url}
                    alt={im.alt ?? ""}
                    className={cls("object-cover w-full h-20", tokensClass(imageTokens))}
                    style={tokensStyle(imageTokens)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs opacity-70">(لا يوجد صور)</div>
        )}
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "BANNER") {
    const d = data as BannerData;
    const tone = d.variant ?? "info";
    const toneCls =
      tone === "success"
        ? "border-emerald-400/20 bg-emerald-500/10"
        : tone === "warning"
        ? "border-amber-400/20 bg-amber-500/10"
        : tone === "danger"
        ? "border-red-400/20 bg-red-500/10"
        : "border-sky-400/20 bg-sky-500/10";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const textValue = d.text || "(نص البانر)";
    const textData = textContent(String(textValue), sectionTokens);
    const linkValue = d.linkLabel || d.linkHref || "";
    const linkData = d.linkHref ? textContent(`رابط: ${linkValue}`, sectionTokens) : null;

    return wrapPreview(d, (
      <div className={cls("rounded-2xl border p-4", toneCls, uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
        <div className={cls("text-sm font-semibold", textData.className)} aria-label={textData.ariaLabel}>
          {textData.content}
        </div>
        {linkData ? (
          <div className={cls("mt-2 text-xs opacity-80", linkData.className)} aria-label={linkData.ariaLabel}>
            {linkData.content}
          </div>
        ) : null}
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }
  if (type === "CTA") {
    const d = data as CtaData;
    const align = d.align ?? "center";
    const justify = align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";
    const imageAlign = align === "left" ? "self-start" : align === "right" ? "self-end" : "self-center";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    const buttonData = d.buttonLabel ? textContent(String(d.buttonLabel), sectionTokens) : null;
    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("flex flex-col gap-3", justify, uiContainerClass(d))}>
          <SectionTextScope data={d}>
          {d.imageUrl ? (
            <img
              src={d.imageUrl}
              alt={d.title ?? "CTA image"}
              className={cls("h-24 w-full max-w-[240px] rounded-xl border border-white/10 object-cover", imageAlign)}
            />
          ) : null}
          {titleData ? (
            <div className={cls("text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
              {titleData.content}
            </div>
          ) : (
            <div className="text-sm font-semibold">(CTA title)</div>
          )}
          {subtitleData ? (
            <div className={cls("text-xs opacity-80", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
              {subtitleData.content}
            </div>
          ) : null}
          {d.buttonLabel ? (
            d.buttonHref ? (
              <a
                href={d.buttonHref}
                className={cls(
                  "inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95",
                  buttonData?.className
                )}
                style={{ backgroundColor: "var(--accent-2, #ffffff)" }}
                aria-label={buttonData?.ariaLabel}
              >
                {buttonData?.content ?? d.buttonLabel}
              </a>
            ) : (
              <span
                className={cls(
                  "inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold text-[color:var(--accent-contrast,#0B0B0B)] opacity-90",
                  buttonData?.className
                )}
                style={{ backgroundColor: "var(--accent-2, #ffffff)" }}
                aria-label={buttonData?.ariaLabel}
              >
                {buttonData?.content ?? d.buttonLabel}
              </span>
            )
          ) : null}
          </SectionTextScope>
          {componentsBlock}
        </div>
      </div>
    ));
  }
  if (type === "TESTIMONIALS") {
    const d = data as TestimonialsData;
    const items = Array.isArray(d.items) ? d.items : [];
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("space-y-3", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <div className={cls("text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {items.length ? (
                items.slice(0, 4).map((it, i) => {
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const nameTokens = resolveFieldTokens((it as any).nameTokens, baseItemTokens);
                  const roleTokens = resolveFieldTokens((it as any).roleTokens, baseItemTokens);
                  const quoteTokens = resolveFieldTokens((it as any).quoteTokens, baseItemTokens);
                  const avatarTokens = resolveFieldTokens((it as any).avatarTokens);
                  const nameData = textContent(String(it.name || "(Name)"), nameTokens);
                  const roleData = it.role ? textContent(String(it.role), roleTokens) : null;
                  const quoteData = it.quote ? textContent(String(it.quote), quoteTokens) : null;
                  return (
                    <div
                      key={i}
                      className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] p-3", tokensClass(itemTokens))}
                      style={tokensStyle(itemTokens)}
                    >
                      <div className="flex items-center gap-2">
                        {it.avatarUrl ? (
                          <img
                            src={it.avatarUrl}
                            alt={it.name ?? "Avatar"}
                            className={cls("object-cover w-8 h-8 border rounded-full border-white/10", tokensClass(avatarTokens))}
                            style={tokensStyle(avatarTokens)}
                          />
                        ) : (
                          <div className={cls("w-8 h-8 rounded-full bg-white/10", tokensClass(avatarTokens))} style={tokensStyle(avatarTokens)} />
                        )}
                        <div className="text-xs opacity-70">
                          <div className={cls(tokensClass(nameTokens), nameData.className)} style={tokensStyle(nameTokens)} aria-label={nameData.ariaLabel}>
                            {nameData.content}
                          </div>
                          {roleData ? (
                            <div className={cls("opacity-70", tokensClass(roleTokens), roleData.className)} style={tokensStyle(roleTokens)} aria-label={roleData.ariaLabel}>
                              {roleData.content}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {quoteData ? (
                        <div className={cls("mt-2 text-sm opacity-90", tokensClass(quoteTokens), quoteData.className)} style={tokensStyle(quoteTokens)} aria-label={quoteData.ariaLabel}>
                          {quoteData.content}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs opacity-70">(No items)</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </div>
    ));
  }
  if (type === "FEATURED_PRODUCTS") {
    const d = data as FeaturedProductsData;
    const cols = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const ids = Array.isArray(d.productSlugs) ? d.productSlugs : Array.isArray(d.productIds) ? d.productIds : [];
    const gridCols = cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("space-y-3", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <div className={cls("text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </div>
            ) : null}
            {ids.length ? (
              <div className={cls("grid gap-2", gridCols)}>
                {ids.slice(0, 8).map((id) => (
                  (() => {
                    const idData = textContent(String(id), sectionTokens);
                    return (
                      <span key={id} className={cls("rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs opacity-80", idData.className)} aria-label={idData.ariaLabel}>
                        {idData.content}
                      </span>
                    );
                  })()
                ))}
              </div>
            ) : (
              <div className="text-xs opacity-70">(No products)</div>
            )}
          </SectionTextScope>
          {componentsBlock}
        </div>
      </div>
    ));
  }

  if (type === "NEWSLETTER") {
    const d = data as NewsletterData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const textData = d.text ? textContent(String(d.text), sectionTokens) : null;
    const ctaData = d.ctaLabel ? textContent(String(d.ctaLabel), sectionTokens) : null;
    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
        {titleData ? (
          <div className={cls("mb-2 text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
            {titleData.content}
          </div>
        ) : null}
        {textData ? (
          <div className={cls("mb-2 text-sm opacity-80", textData.className)} aria-label={textData.ariaLabel}>
            {textData.content}
          </div>
        ) : (
          <div className="text-xs opacity-60">(لا يوجد نص)</div>
        )}
        {d.ctaLabel ? (
          <div className={cls("inline-flex items-center px-3 py-1 text-xs font-semibold text-black bg-white rounded-xl", ctaData?.className)} aria-label={ctaData?.ariaLabel}>
            {ctaData?.content ?? d.ctaLabel}
            {d.ctaHref ? <span className="ms-2 text-[11px] text-black/60">{d.ctaHref}</span> : null}
          </div>
        ) : null}
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }



  if (type === "CARDS") {
    // لاحظ: الـ SectionPreview يستقبل { type, data } وليس كائن section كامل.
    // خطأ سابق كان يستعمل متغير section غير معرّف ويسبّب صفحة فاضية.
    const d = (data ?? {}) as CardsData;
    const ui: any = d.ui ?? {};
    // مهم: أحياناً cards بتكون مش Array (object/string) أثناء تغيير نوع الـ section أو بسبب JSON غلط.
    // إذا عملنا .map على non-array رح تنهار صفحة الأدمن وتطلع شاشة سودا.
    const cards: any[] = Array.isArray((d as any).cards) ? ((d as any).cards as any[]) : [];
    const componentsBlock = renderComponentsBlock(d);
    const sectionClass = ui.sectionClass || "py-8";
    const sectionTokens = (d as any)?.twTokens;
    const tokenClass = tokensClass(sectionTokens);
    const titleData = d.title ? textContent(String(d.title ?? ""), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle ?? ""), sectionTokens) : null;

    return wrapPreview(d, (
      <section className={cls(sectionClass, tokenClass)} style={uiSectionStyle(d)}>
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
            {cards.map((c, idx) => (
              (() => {
                const cardTokens = resolveFieldTokens((c as any).twTokens);
                const cardEffects = cardEffectClass(cardTokens ?? sectionTokens);
                const baseCardTokens = cardTokens ?? sectionTokens;
                const titleTokens = resolveFieldTokens((c as any).titleTokens, baseCardTokens);
                const textTokens = resolveFieldTokens((c as any).textTokens, baseCardTokens);
                const badgeTokens = resolveFieldTokens((c as any).badgeTokens, baseCardTokens);
                const buttonTokens = resolveFieldTokens((c as any).buttonTokens, baseCardTokens);
                const imageTokens = resolveFieldTokens((c as any).imageTokens);
                const titleData = c.title ? textContent(String(c.title ?? ""), titleTokens) : null;
                const badgeData = c.badge ? textContent(String(c.badge ?? ""), badgeTokens) : null;
                const textData = c.text ? textContent(String(c.text ?? ""), textTokens) : null;
                const buttonData = c.buttonLabel ? textContent(String(c.buttonLabel ?? ""), buttonTokens) : null;
                return (
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
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt={c.title ?? ""}
                        className={cls(ui.imageClass || "w-full h-40 object-cover rounded-xl border border-white/10", tokensClass(imageTokens))}
                        style={tokensStyle(imageTokens)}
                      />
                    ) : null}

                    <div className="flex items-start justify-between gap-2 mt-3">
                      {titleData ? (
                        <div className={cls("font-semibold text-white", tokensClass(titleTokens), titleData.className)} style={tokensStyle(titleTokens)} aria-label={titleData.ariaLabel}>
                          {titleData.content}
                        </div>
                      ) : <div />}
                      {badgeData ? (
                        <div className={cls("shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80", tokensClass(badgeTokens), badgeData.className)} style={tokensStyle(badgeTokens)} aria-label={badgeData.ariaLabel}>
                          {badgeData.content}
                        </div>
                      ) : null}
                    </div>

                    {textData ? (
                      <div className={cls("mt-2 text-sm text-white/70", tokensClass(textTokens), textData.className)} style={tokensStyle(textTokens)} aria-label={textData.ariaLabel}>
                        {textData.content}
                      </div>
                    ) : null}

                    {c.buttonLabel && c.buttonHref && buttonData ? (
                      <a
                        href={c.buttonHref}
                        className={cls("inline-flex items-center justify-center px-3 py-2 mt-4 text-sm text-white rounded-xl bg-white/10 hover:bg-white/15", tokensClass(buttonTokens), buttonData.className)}
                        style={tokensStyle(buttonTokens)}
                        aria-label={buttonData.ariaLabel}
                      >
                        {buttonData.content}
                      </a>
                    ) : null}
                  </div>
                );
              })()
            ))}
          </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    ));
  }
  if (type === "VIDEO") {
    const d = data as VideoData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleValue = d.title ? String(d.title) : "Video";
    const titleData = textContent(titleValue, sectionTokens);
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    const urlData = d.url ? textContent(String(d.url), sectionTokens) : textContent("(ضع رابط الفيديو)", sectionTokens);
    return wrapPreview(d, (
      <div className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
        <div className={cls("text-sm font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
          {titleData.content}
        </div>
        {subtitleData ? (
          <div className={cls("mt-1 text-xs opacity-80", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
            {subtitleData.content}
          </div>
        ) : null}
        <div className={cls("mt-3 rounded-xl border border-white/[0.08] bg-black/20 p-3 text-xs opacity-80", urlData.className)} aria-label={urlData.ariaLabel}>
          {urlData.content}
        </div>
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  const fallbackComponents = sectionComponents(data);
  if (fallbackComponents.length) {
    const inheritTokens = (data as any)?.twTokens?.typography ? { typography: (data as any).twTokens.typography } : undefined;
    return wrapPreview(data, (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <CmsComponentsRenderer components={fallbackComponents} inheritTokens={inheritTokens} />
      </div>
    ));
  }
  return <div className="text-xs opacity-70">(?? ???? Preview ???? ?????)</div>;
}





