import React from "react";
import { useEffect, useState } from "react";
import type { PageSection, PageSectionType } from "../../api/pages.api";
import { sanitizeHtml } from "../../lib/sanitizeHtml";
import type {
  BannerData,
  CtaData,
  CustomHtmlData,
  FaqData,
  FeaturedCategoriesData,
  FeaturedProductsData,
  CollectionsGridData,
  GridData,
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
import { CmsComponentsRenderer } from "./CmsComponentsRenderer";
import { TypewriterText } from "../../components/effects/TypewriterText";
import { SectionDecorations } from "../../cms/decorations/DecorationLayer";
import type { TwTokens } from "../../cms/style/tokens";
import { tokensToClassName, tokensToInlineStyle } from "../../cms/style/tokensToTw";

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

function sectionComponents(data: any) {
  const list = data?.components;
  return Array.isArray(list) ? list : [];
}

function renderComponentsBlock(data: any, className?: string) {
  const components = sectionComponents(data);
  if (!components.length) return null;
  const inheritTokens = data?.twTokens?.typography ? { typography: data.twTokens.typography } : undefined;
  return (
    <div className={cls("mt-6", className)}>
      <CmsComponentsRenderer components={components} inheritTokens={inheritTokens} />
    </div>
  );
}

function HeroSection({ data }: { data: HeroData }) {
  const slides = Array.isArray((data as any).slides) ? ((data as any).slides as any[]) : [];
  const hasSlides = slides.length > 0;
  const [activeSlide, setActiveSlide] = useState(0);
  const autoplayMs = safeNum((data as any).autoplayMs, 0);
  const showDots = (data as any).showDots ?? true;

  useEffect(() => {
    if (!hasSlides) return;
    setActiveSlide((idx) => Math.min(idx, slides.length - 1));
  }, [hasSlides, slides.length]);

  useEffect(() => {
    if (!hasSlides || !autoplayMs || autoplayMs <= 0) return;
    const id = setInterval(() => {
      setActiveSlide((idx) => (idx + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(id);
  }, [autoplayMs, hasSlides, slides.length]);

  const s = hasSlides ? slides[activeSlide] ?? slides[0] : data;
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
  const titleValue = (s as any).title || "";
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
  const slideKey = `${activeSlide}-${slideAnim}-${slideDuration}`;
  const contentKey = `${activeSlide}-${contentAnim}-${contentDuration}-${contentDelay}`;

  return (
    <section className={cls("overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03]", uiSectionClass(data))} style={uiSectionStyle(data)}>
      <div
        key={slideKey}
        className={cls("relative min-h-[260px]", uiContainerClass(data), slideAnimClass, tokensClass(slideTokens))}
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
          <div key={contentKey} className={cls("relative flex h-full min-h-[260px] flex-col justify-center gap-3 p-8", justify, contentAnimClass)}>
            <h2 className={cls("text-2xl font-bold", tokensClass(titleTokens), titleData.className)} style={tokensStyle(titleTokens)} aria-label={titleData.ariaLabel}>
              {titleData.content}
            </h2>
            {subtitleData ? (
              <p className={cls("max-w-[60ch] text-sm opacity-90", tokensClass(subtitleTokens), subtitleData.className)} style={tokensStyle(subtitleTokens)} aria-label={subtitleData.ariaLabel}>
                {subtitleData.content}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {primaryButton?.label ? (
                primaryButton?.href ? (
                  <a
                    href={primaryButton.href}
                    className={cls(
                      "rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95",
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
                      "rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] opacity-90",
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
                      "rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-semibold hover:bg-white/[0.08]",
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
                      "rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/90",
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
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {slides.map((_: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={cls(
                  "h-2 w-2 rounded-full transition",
                  idx === activeSlide ? "bg-white" : "bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
      {componentsBlock}
    </section>
  );
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

function Section({ type, data }: { type: PageSectionType; data: any }) {
  if (!data || typeof data !== "object") return null;

  if (type === "HERO") {
    return <HeroSection data={data as HeroData} />;
  }

  if (type === "RICH_TEXT") {
    const d = data as RichTextData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const htmlEffectClass = textEffectClass(sectionTokens);
    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
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
      </section>
    );
  }

  if (type === "CUSTOM_HTML") {
    const d = data as CustomHtmlData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const htmlEffectClass = textEffectClass(sectionTokens);
    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-4xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <div className={cls("prose prose-invert max-w-none", htmlEffectClass)} dangerouslySetInnerHTML={{ __html: sanitizeHtml(d.html ?? "") }} />
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "BANNER") {
    const d = data as BannerData;
    const variant = d.variant ?? "info";
    const color =
      variant === "success"
        ? "border-emerald-500/30 bg-emerald-500/10"
        : variant === "warning"
          ? "border-amber-500/30 bg-amber-500/10"
          : variant === "danger"
            ? "border-red-500/30 bg-red-500/10"
            : "border-sky-500/30 bg-sky-500/10";

    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const textData = textContent(String(d.text ?? ""), sectionTokens);
    const linkValue = d.linkLabel || d.linkHref || "";
    const linkData = d.linkHref ? textContent(String(linkValue), sectionTokens) : null;
    return (
      <section className={cls("rounded-3xl border p-5", color, uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
          <div className={cls("flex flex-col gap-2 md:flex-row md:items-center md:justify-between", uiContainerClass(d))}>
            <div className={cls("text-sm opacity-90", textData.className)} aria-label={textData.ariaLabel}>
              {textData.content}
            </div>
            {d.linkLabel && d.linkHref ? (
              <a
                className={cls(
                  "text-sm font-semibold underline decoration-white/30 underline-offset-4 hover:decoration-white/60",
                  linkData?.className
                )}
                href={d.linkHref}
                aria-label={linkData?.ariaLabel}
              >
                {linkData?.content ?? d.linkLabel}
              </a>
            ) : null}
          </div>
        </SectionTextScope>
        {componentsBlock}
      </section>
    );
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

    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <div className={cls("flex flex-col gap-3", justify)}>
              {d.imageUrl ? (
                <img
                  src={d.imageUrl}
                  alt={d.title ?? "CTA image"}
                  className={cls("h-40 w-full max-w-xl rounded-2xl border border-white/10 object-cover", imageAlign)}
                />
              ) : null}
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
              {d.buttonLabel ? (
                d.buttonHref ? (
                  <a
                    href={d.buttonHref}
                    className={cls(
                      "mt-2 inline-flex w-fit rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95",
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
                      "mt-2 inline-flex w-fit rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] opacity-90",
                      buttonData?.className
                    )}
                    style={{ backgroundColor: "var(--accent-2, #ffffff)" }}
                    aria-label={buttonData?.ariaLabel}
                  >
                    {buttonData?.content ?? d.buttonLabel}
                  </span>
                )
              ) : null}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "FAQ") {
    const d = data as FaqData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-3 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            <div className="space-y-3">
              {(d.items ?? []).map((it, idx) => {
                const itemTokens = resolveFieldTokens((it as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const questionTokens = resolveFieldTokens((it as any).questionTokens, baseItemTokens);
                const answerTokens = resolveFieldTokens((it as any).answerTokens, baseItemTokens);
                return (
                  <div
                    key={idx}
                    className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4", tokensClass(itemTokens))}
                    style={tokensStyle(itemTokens)}
                  >
                    {(() => {
                      const questionData = textContent(String(it.question ?? ""), questionTokens);
                      return (
                        <div
                          className={cls("text-sm font-semibold", tokensClass(questionTokens), questionData.className)}
                          style={tokensStyle(questionTokens)}
                          aria-label={questionData.ariaLabel}
                        >
                          {questionData.content}
                        </div>
                      );
                    })()}
                    {it.answer ? (() => {
                      const answerData = textContent(String(it.answer ?? ""), answerTokens);
                      return (
                        <div
                          className={cls("mt-1 text-sm opacity-80", tokensClass(answerTokens), answerData.className)}
                          style={tokensStyle(answerTokens)}
                          aria-label={answerData.ariaLabel}
                        >
                          {answerData.content}
                        </div>
                      );
                    })() : null}
                  </div>
                );
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "GRID") {
    const d = data as GridData;
    const columns = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;

    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
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
                const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                return (
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
                    {(() => {
                      const itemTitleData = textContent(String(it.title ?? ""), titleTokens);
                      return (
                        <div
                          className={cls("text-sm font-semibold", tokensClass(titleTokens), itemTitleData.className)}
                          style={tokensStyle(titleTokens)}
                          aria-label={itemTitleData.ariaLabel}
                        >
                          {itemTitleData.content}
                        </div>
                      );
                    })()}
                    {it.text ? (() => {
                      const itemTextData = textContent(String(it.text), textTokens);
                      return (
                        <div
                          className={cls("mt-1 text-sm opacity-80", tokensClass(textTokens), itemTextData.className)}
                          style={tokensStyle(textTokens)}
                          aria-label={itemTextData.ariaLabel}
                        >
                          {itemTextData.content}
                        </div>
                      );
                    })() : null}
                    {it.href ? (() => {
                      const linkData = textContent(String(it.href), linkTokens);
                      return (
                        <div
                          className={cls("mt-2 text-xs opacity-60", tokensClass(linkTokens), linkData.className)}
                          style={tokensStyle(linkTokens)}
                          aria-label={linkData.ariaLabel}
                        >
                          {linkData.content}
                        </div>
                      );
                    })() : null}
                  </div>
                );
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
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
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {(d.title || d.subtitle || showArrows) ? (
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
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
                </div>
                {showArrows ? (
                  <div className="flex items-center gap-2">
                    <button type="button" className="h-8 w-8 rounded-full border border-white/10 bg-white/5 text-sm text-white/70">‹</button>
                    <button type="button" className="h-8 w-8 rounded-full border border-white/10 bg-white/5 text-sm text-white/70">›</button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              {items.length ? (
                items.slice(0, 6).map((it, idx) => {
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                  const imageTokens = resolveFieldTokens((it as any).imageTokens);
                  const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                  return (
                    <div
                      key={idx}
                      className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4", tokensClass(itemTokens))}
                      style={tokensStyle(itemTokens)}
                    >
                      {it.imageUrl ? (
                        <img
                          src={it.imageUrl}
                          alt=""
                          className={cls("mb-3 h-32 w-full rounded-xl object-cover", tokensClass(imageTokens))}
                          style={tokensStyle(imageTokens)}
                        />
                      ) : null}
                      {(() => {
                        const labelData = textContent(String(it.label ?? "Category"), labelTokens);
                        return (
                          <div
                            className={cls("text-sm font-semibold", tokensClass(labelTokens), labelData.className)}
                            style={tokensStyle(labelTokens)}
                            aria-label={labelData.ariaLabel}
                          >
                            {labelData.content}
                          </div>
                        );
                      })()}
                      {it.href ? (() => {
                        const hrefData = textContent(String(it.href), linkTokens);
                        return (
                          <div
                            className={cls("mt-1 text-xs opacity-70", tokensClass(linkTokens), hrefData.className)}
                            style={tokensStyle(linkTokens)}
                            aria-label={hrefData.ariaLabel}
                          >
                            {hrefData.content}
                          </div>
                        );
                      })() : null}
                    </div>
                  );
                })
              ) : (
                <div className="text-sm opacity-70">No items yet.</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "COLLECTIONS_GRID") {
    const d = data as CollectionsGridData;
    const items = Array.isArray(d.items) ? d.items : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const clsCols =
      cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : cols === 4 ? "md:grid-cols-4" : cols === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
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
            <div className={cls("grid gap-4", clsCols)}>
              {items.length ? (
                items.slice(0, 8).map((it, idx) => {
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                  const imageTokens = resolveFieldTokens((it as any).imageTokens);
                  const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                  return (
                    <div
                      key={idx}
                      className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4", tokensClass(itemTokens))}
                      style={tokensStyle(itemTokens)}
                    >
                      {it.imageUrl ? (
                        <img
                          src={it.imageUrl}
                          alt=""
                          className={cls("mb-3 h-32 w-full rounded-xl object-cover", tokensClass(imageTokens))}
                          style={tokensStyle(imageTokens)}
                        />
                      ) : null}
                      {(() => {
                        const labelData = textContent(String(it.label ?? "Collection"), labelTokens);
                        return (
                          <div
                            className={cls("text-sm font-semibold", tokensClass(labelTokens), labelData.className)}
                            style={tokensStyle(labelTokens)}
                            aria-label={labelData.ariaLabel}
                          >
                            {labelData.content}
                          </div>
                        );
                      })()}
                      {it.href ? (() => {
                        const hrefData = textContent(String(it.href), linkTokens);
                        return (
                          <div
                            className={cls("mt-1 text-xs opacity-70", tokensClass(linkTokens), hrefData.className)}
                            style={tokensStyle(linkTokens)}
                            aria-label={hrefData.ariaLabel}
                          >
                            {hrefData.content}
                          </div>
                        );
                      })() : null}
                    </div>
                  );
                })
              ) : (
                <div className="text-sm opacity-70">No items yet.</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "NEW_ARRIVALS_SLIDER" || type === "BEST_SELLERS_SLIDER") {
    const d = data as ProductsSliderData;
    const limit = Math.min(8, Math.max(1, safeNum(d.limit, 6)));
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleValue = d.title || (type === "NEW_ARRIVALS_SLIDER" ? "New arrivals" : "Best sellers");
    const titleData = textContent(String(titleValue), sectionTokens);
    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <h3 className={cls("mb-4 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
              {titleData.content}
            </h3>
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: limit }).map((_, idx) => (
                <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs opacity-70">
                  Product {idx + 1}
                </div>
              ))}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "BRANDS_SLIDER") {
    const d = data as BrandsSliderData;
    const items = Array.isArray(d.items) ? d.items : [];
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-4 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            <div className="grid gap-4 md:grid-cols-4">
              {items.length ? (
                items.slice(0, 8).map((it, idx) => {
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const nameTokens = resolveFieldTokens((it as any).nameTokens, baseItemTokens);
                  const logoTokens = resolveFieldTokens((it as any).logoTokens, baseItemTokens);
                  const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                  return (
                    <div
                      key={idx}
                      className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm", tokensClass(itemTokens))}
                      style={tokensStyle(itemTokens)}
                    >
                      {(() => {
                        const nameData = textContent(String(it.name ?? "Brand"), nameTokens);
                        return (
                          <div
                            className={cls("font-semibold", tokensClass(nameTokens), nameData.className)}
                            style={tokensStyle(nameTokens)}
                            aria-label={nameData.ariaLabel}
                          >
                            {nameData.content}
                          </div>
                        );
                      })()}
                      {it.logoUrl ? (
                        <div
                          className={cls("mt-1 text-xs opacity-70", tokensClass(logoTokens))}
                          style={tokensStyle(logoTokens)}
                        >
                          logo: {it.logoUrl}
                        </div>
                      ) : null}
                      {it.href ? (() => {
                        const hrefData = textContent(String(it.href), linkTokens);
                        return (
                          <div
                            className={cls("mt-1 text-xs opacity-70", tokensClass(linkTokens), hrefData.className)}
                            style={tokensStyle(linkTokens)}
                            aria-label={hrefData.ariaLabel}
                          >
                            {hrefData.content}
                          </div>
                        );
                      })() : null}
                    </div>
                  );
                })
              ) : (
                <div className="text-sm opacity-70">No brands yet.</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "NEWSLETTER") {
    const d = data as NewsletterData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const textData = d.text ? textContent(String(d.text), sectionTokens) : null;
    const ctaData = d.ctaLabel ? textContent(String(d.ctaLabel), sectionTokens) : null;
    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-4xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-2 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            {textData ? (
              <p className={cls("mb-4 text-sm opacity-80", textData.className)} aria-label={textData.ariaLabel}>
                {textData.content}
              </p>
            ) : null}
            {d.ctaLabel ? (
              d.ctaHref ? (
                <a
                  href={d.ctaHref}
                  className={cls("inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90", ctaData?.className)}
                  aria-label={ctaData?.ariaLabel}
                >
                  {ctaData?.content ?? d.ctaLabel}
                </a>
              ) : (
                <span
                  className={cls("inline-flex items-center rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-black/80", ctaData?.className)}
                  aria-label={ctaData?.ariaLabel}
                >
                  {ctaData?.content ?? d.ctaLabel}
                </span>
              )
            ) : null}
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "IMAGE_GALLERY") {
    const d = data as ImageGalleryData;
    const columns = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const clsCols = columns <= 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : columns === 4 ? "md:grid-cols-4" : columns === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;

    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
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
                return (
                  <div
                    key={idx}
                    className={cls("overflow-hidden rounded-2xl", tokensClass(itemTokens))}
                    style={tokensStyle(itemTokens)}
                  >
                    <img
                      src={im.url}
                      alt={im.alt ?? ""}
                      className={cls("h-40 w-full object-cover", tokensClass(imageTokens))}
                      style={tokensStyle(imageTokens)}
                    />
                  </div>
                );
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "TESTIMONIALS") {
    const d = data as TestimonialsData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <h3 className={cls("mb-4 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </h3>
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              {(d.items ?? []).map((t, idx) => {
                const itemTokens = resolveFieldTokens((t as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const nameTokens = resolveFieldTokens((t as any).nameTokens, baseItemTokens);
                const roleTokens = resolveFieldTokens((t as any).roleTokens, baseItemTokens);
                const quoteTokens = resolveFieldTokens((t as any).quoteTokens, baseItemTokens);
                const avatarTokens = resolveFieldTokens((t as any).avatarTokens);
                return (
                  <div
                    key={idx}
                    className={cls("rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4", tokensClass(itemTokens))}
                    style={tokensStyle(itemTokens)}
                  >
                    <div className="flex items-center gap-3">
                      {t.avatarUrl ? (
                        <img
                          src={t.avatarUrl}
                          alt={t.name ?? "Avatar"}
                          className={cls("h-10 w-10 rounded-full object-cover border border-white/10", tokensClass(avatarTokens))}
                          style={tokensStyle(avatarTokens)}
                        />
                      ) : (
                        <div className={cls("h-10 w-10 rounded-full bg-white/10", tokensClass(avatarTokens))} style={tokensStyle(avatarTokens)} />
                      )}
                      <div>
                        {(() => {
                          const nameData = textContent(String(t.name ?? ""), nameTokens);
                          return (
                            <div
                              className={cls("text-sm font-semibold", tokensClass(nameTokens), nameData.className)}
                              style={tokensStyle(nameTokens)}
                              aria-label={nameData.ariaLabel}
                            >
                              {nameData.content}
                            </div>
                          );
                        })()}
                        {t.role ? (() => {
                          const roleData = textContent(String(t.role), roleTokens);
                          return (
                            <div
                              className={cls("text-xs opacity-70", tokensClass(roleTokens), roleData.className)}
                              style={tokensStyle(roleTokens)}
                              aria-label={roleData.ariaLabel}
                            >
                              {roleData.content}
                            </div>
                          );
                        })() : null}
                      </div>
                    </div>
                    {t.quote ? (() => {
                      const quoteData = textContent(String(t.quote), quoteTokens);
                      return (
                        <div
                          className={cls("mt-3 text-sm opacity-90", tokensClass(quoteTokens), quoteData.className)}
                          style={tokensStyle(quoteTokens)}
                          aria-label={quoteData.ariaLabel}
                        >
                          "{quoteData.content}"
                        </div>
                      );
                    })() : null}
                  </div>
                );
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "FEATURED_PRODUCTS") {
    const d = data as FeaturedProductsData;
    const cols = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const ids = Array.isArray(d.productSlugs) ? d.productSlugs.filter(Boolean) : Array.isArray(d.productIds) ? d.productIds.filter(Boolean) : [];
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;

    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
          {titleData ? (
            <h3 className={cls("mb-4 text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
              {titleData.content}
            </h3>
          ) : null}
          <div className={cls("grid gap-4", cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4")}>
            {ids.length ? (
              ids.slice(0, 8).map((id) => (
                (() => {
                  const idData = textContent(String(id), sectionTokens);
                  return (
                    <div key={id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <div className="text-xs opacity-70">Product</div>
                      <div className={cls("mt-1 font-mono text-xs", idData.className)} aria-label={idData.ariaLabel}>
                        {idData.content}
                      </div>
                    </div>
                  );
                })()
              ))
            ) : (
              <div className="text-sm opacity-70">(حدد productIds لعرض المنتجات)</div>
            )}
          </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }



  if (type === "CARDS") {
    // `data` is passed into this component; using an undefined `section` variable
    // crashes the Preview at runtime when rendering CARDS sections.
    const d = data as CardsData;
    const ui: any = d.ui ?? {};
    const cards = d.cards ?? [];
    const componentsBlock = renderComponentsBlock(d);

    const sectionClass = ui.sectionClass || "py-8";
    const sectionTokens = (d as any)?.twTokens;
    const tokenClass = tokensClass(sectionTokens);
    const titleData = d.title ? textContent(String(d.title ?? ""), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle ?? ""), sectionTokens) : null;
    return (
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
            {cards.map((c, idx) => {
              const cardTokens = resolveFieldTokens((c as any).twTokens);
              const cardEffects = cardEffectClass(cardTokens ?? sectionTokens);
              const baseCardTokens = cardTokens ?? sectionTokens;
              const titleTokens = resolveFieldTokens((c as any).titleTokens, baseCardTokens);
              const textTokens = resolveFieldTokens((c as any).textTokens, baseCardTokens);
              const badgeTokens = resolveFieldTokens((c as any).badgeTokens, baseCardTokens);
              const buttonTokens = resolveFieldTokens((c as any).buttonTokens, baseCardTokens);
              const imageTokens = resolveFieldTokens((c as any).imageTokens);
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

                  <div className="mt-3 flex items-start justify-between gap-2">
                    {c.title ? (() => {
                      const cardTitleData = textContent(String(c.title ?? ""), titleTokens);
                      return (
                        <div
                          className={cls("text-white font-semibold", tokensClass(titleTokens), cardTitleData.className)}
                          style={tokensStyle(titleTokens)}
                          aria-label={cardTitleData.ariaLabel}
                        >
                          {cardTitleData.content}
                        </div>
                      );
                    })() : <div />}
                    {c.badge ? (
                      (() => {
                        const badgeData = textContent(String(c.badge ?? ""), badgeTokens);
                        return (
                          <div
                            className={cls("shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80", tokensClass(badgeTokens), badgeData.className)}
                            style={tokensStyle(badgeTokens)}
                            aria-label={badgeData.ariaLabel}
                          >
                            {badgeData.content}
                          </div>
                        );
                      })()
                    ) : null}
                  </div>

                  {c.text ? (() => {
                    const cardTextData = textContent(String(c.text ?? ""), textTokens);
                    return (
                      <div
                        className={cls("mt-2 text-sm text-white/70", tokensClass(textTokens), cardTextData.className)}
                        style={tokensStyle(textTokens)}
                        aria-label={cardTextData.ariaLabel}
                      >
                        {cardTextData.content}
                      </div>
                    );
                  })() : null}

                  {c.buttonLabel && c.buttonHref ? (
                    (() => {
                      const buttonData = textContent(String(c.buttonLabel ?? ""), buttonTokens);
                      return (
                        <a
                          href={c.buttonHref}
                          className={cls(
                            "mt-4 inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15",
                            tokensClass(buttonTokens),
                            buttonData.className
                          )}
                          style={tokensStyle(buttonTokens)}
                          aria-label={buttonData.ariaLabel}
                        >
                          {buttonData.content}
                        </a>
                      );
                    })()
                  ) : null}
                </div>
              );
            })}
          </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }
  if (type === "VIDEO") {
    const d = data as VideoData;
    const aspect = d.aspect ?? "16/9";
    const aspectClass = aspect === "9/16" ? "aspect-[9/16]" : aspect === "1/1" ? "aspect-square" : aspect === "4/3" ? "aspect-[4/3]" : "aspect-video";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    const placeholderData = textContent("(ضع رابط الفيديو)", sectionTokens);

    const yt = d.url ? youtubeId(d.url) : null;
    const vm = d.url ? vimeoId(d.url) : null;

    return (
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
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
      </section>
    );
  }

  const fallbackComponents = sectionComponents(data);
  if (fallbackComponents.length) {
    const inheritTokens = (data as any)?.twTokens?.typography ? { typography: (data as any).twTokens.typography } : undefined;
    return (
      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="mx-auto max-w-6xl">
          <CmsComponentsRenderer components={fallbackComponents} inheritTokens={inheritTokens} />
        </div>
      </section>
    );
  }

  return null;
}

export function PageRenderer({ sections }: { sections: PageSection[] }) {
  const sorted = (sections ?? []).filter((s) => s.isVisible !== false).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="space-y-5">
      {sorted.map((sec) => {
        const decorations = sectionDecorations((sec as any)?.data?.twTokens);
        const hasDecorations = !!decorations;
        return (
          <div key={sec.id} className={hasDecorations ? "relative" : undefined}>
            {hasDecorations ? <SectionDecorations decorations={decorations ?? undefined} className="z-0" /> : null}
            <div className={hasDecorations ? "relative z-10" : undefined}>
              <Section type={sec.type} data={sec.data} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

