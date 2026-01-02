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
  return cls(base, tokensToClassName(tokens));
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
  const previewMargins = previewDecorMargins(tokens);
  const baseStyle = uiSectionStyle(data);
  const shellStyle = previewMargins ? { ...previewMargins, ...(baseStyle ?? {}) } : baseStyle;
  return (
    <div
      className={cls(
        className,
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
  return (
    <div className="mt-4">
      <CmsComponentsRenderer components={components} inheritTokens={data?.twTokens} />
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
  const titleValue = (s as any).title || "(بدون عنوان)";
  const titleData = textContent(String(titleValue), sectionTokens);
  const subtitleValue = (s as any).subtitle;
  const subtitleData = subtitleValue ? textContent(String(subtitleValue), sectionTokens) : null;
  const primaryLabelData = primaryButton?.label ? textContent(String(primaryButton.label), sectionTokens) : null;
  const secondaryLabelData = secondaryButton?.label ? textContent(String(secondaryButton.label), sectionTokens) : null;
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
        className={cls("relative min-h-[180px]", uiContainerClass(data), slideAnimClass)}
        style={
          (s as any).backgroundImageUrl
            ? { backgroundImage: `url(${(s as any).backgroundImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
        <SectionTextScope data={data}>
        <div key={contentKey} className={cls("relative p-6 flex flex-col gap-3", justify, contentAnimClass)}>
          <div className={cls("text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
            {titleData.content}
          </div>
          {subtitleData ? (
            <div className={cls("text-sm opacity-80 max-w-[40ch]", subtitleData.className)} aria-label={subtitleData.ariaLabel}>
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
                    primaryLabelData?.className
                  )}
                  style={{ backgroundColor: "var(--accent-2, #ffffff)" }}
                  aria-label={primaryLabelData?.ariaLabel}
                >
                  {primaryLabelData?.content ?? primaryButton.label}
                </a>
              ) : (
                <span
                  className={cls(
                    "inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold text-[color:var(--accent-contrast,#0B0B0B)] opacity-90",
                    primaryLabelData?.className
                  )}
                  style={{ backgroundColor: "var(--accent-2, #ffffff)" }}
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
                    secondaryLabelData?.className
                  )}
                  aria-label={secondaryLabelData?.ariaLabel}
                >
                  {secondaryLabelData?.content ?? secondaryButton.label}
                </a>
              ) : (
                <span
                  className={cls(
                    "inline-flex items-center px-3 py-1 text-xs font-semibold border rounded-xl border-white/20",
                    secondaryLabelData?.className
                  )}
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
          dangerouslySetInnerHTML={{ __html: safe || "<p class='opacity-60'>(محتوى)</p>" }}
        />
        </SectionTextScope>
        {componentsBlock}
      </div>
    ));
  }

  if (type === "CUSTOM_HTML") {
    const d = data as CustomHtmlData;
    const safe = sanitizeHtml(d.html || "");
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
          dangerouslySetInnerHTML={{ __html: safe || "<p class='opacity-60'>(HTML)</p>" }}
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
            items.slice(0, 6).map((it, i) => (
              <details key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                {(() => {
                  const questionText = it.question || "(سؤال)";
                  const questionData = textContent(String(questionText), sectionTokens);
                  return (
                    <summary className={cls("text-sm font-medium cursor-pointer", questionData.className)} aria-label={questionData.ariaLabel}>
                      {questionData.content}
                    </summary>
                  );
                })()}
                {it.answer ? (() => {
                  const answerData = textContent(String(it.answer ?? ""), sectionTokens);
                  return (
                    <div className={cls("mt-2 text-sm whitespace-pre-wrap opacity-80", answerData.className)} aria-label={answerData.ariaLabel}>
                      {answerData.content}
                    </div>
                  );
                })() : null}
              </details>
            ))
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
            items.slice(0, 8).map((it, i) => (
              <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                {it.imageUrl ? <img src={it.imageUrl} alt="" className="object-cover w-full h-20 mb-2 rounded-lg" /> : null}
                {(() => {
                  const itemTitle = it.title || "(عنوان)";
                  const itemTitleData = textContent(String(itemTitle), sectionTokens);
                  return (
                    <div className={cls("text-sm font-medium", itemTitleData.className)} aria-label={itemTitleData.ariaLabel}>
                      {itemTitleData.content}
                    </div>
                  );
                })()}
                {it.text ? (() => {
                  const itemTextData = textContent(String(it.text), sectionTokens);
                  return (
                    <div className={cls("mt-1 text-xs whitespace-pre-wrap opacity-80", itemTextData.className)} aria-label={itemTextData.ariaLabel}>
                      {itemTextData.content}
                    </div>
                  );
                })() : null}
                {it.href ? (() => {
                  const hrefData = textContent(String(it.href), sectionTokens);
                  return (
                    <div className={cls("mt-2 text-[11px] opacity-60", hrefData.className)} aria-label={hrefData.ariaLabel}>
                      {hrefData.content}
                    </div>
                  );
                })() : null}
              </div>
            ))
          ) : (
            <div className="text-xs opacity-70">(لا يوجد عناصر)</div>
          )}
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
              items.slice(0, 6).map((it, i) => (
                <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                  {it.imageUrl ? <img src={it.imageUrl} alt="" className="object-cover w-full h-16 mb-2 rounded-lg" /> : null}
                  {(() => {
                    const labelData = textContent(String(it.label || "Category"), sectionTokens);
                    return (
                      <div className={cls("text-sm font-medium", labelData.className)} aria-label={labelData.ariaLabel}>
                        {labelData.content}
                      </div>
                    );
                  })()}
                  {it.href ? (() => {
                    const hrefData = textContent(String(it.href), sectionTokens);
                    return (
                      <div className={cls("mt-1 text-[11px] opacity-60", hrefData.className)} aria-label={hrefData.ariaLabel}>
                        {hrefData.content}
                      </div>
                    );
                  })() : null}
                </div>
              ))
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
            items.slice(0, 8).map((it, i) => (
              <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                {it.imageUrl ? <img src={it.imageUrl} alt="" className="object-cover w-full h-16 mb-2 rounded-lg" /> : null}
                {(() => {
                  const labelData = textContent(String(it.label || "Collection"), sectionTokens);
                  return (
                    <div className={cls("text-sm font-medium", labelData.className)} aria-label={labelData.ariaLabel}>
                      {labelData.content}
                    </div>
                  );
                })()}
                {it.href ? (() => {
                  const hrefData = textContent(String(it.href), sectionTokens);
                  return (
                    <div className={cls("mt-1 text-[11px] opacity-60", hrefData.className)} aria-label={hrefData.ariaLabel}>
                      {hrefData.content}
                    </div>
                  );
                })() : null}
              </div>
            ))
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
            items.slice(0, 8).map((it, i) => (
              <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs">
                {(() => {
                  const nameData = textContent(String(it.name || "Brand"), sectionTokens);
                  return (
                    <div className={cls("font-semibold", nameData.className)} aria-label={nameData.ariaLabel}>
                      {nameData.content}
                    </div>
                  );
                })()}
                {it.logoUrl ? <div className="mt-1 text-[11px] opacity-60">logo: {it.logoUrl}</div> : null}
                {it.href ? (() => {
                  const hrefData = textContent(String(it.href), sectionTokens);
                  return (
                    <div className={cls("mt-1 text-[11px] opacity-60", hrefData.className)} aria-label={hrefData.ariaLabel}>
                      {hrefData.content}
                    </div>
                  );
                })() : null}
              </div>
            ))
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
            {images.slice(0, 12).map((im, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
                {}
                <img src={im.url} alt={im.alt ?? ""} className="object-cover w-full h-20" />
              </div>
            ))}
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
                items.slice(0, 4).map((it, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2">
                      {it.avatarUrl ? (
                        <img src={it.avatarUrl} alt={it.name ?? "Avatar"} className="object-cover w-8 h-8 border rounded-full border-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10" />
                      )}
                      <div className="text-xs opacity-70">
                        {(() => {
                          const nameData = textContent(String(it.name || "(Name)"), sectionTokens);
                          return (
                            <div className={cls(nameData.className)} aria-label={nameData.ariaLabel}>
                              {nameData.content}
                            </div>
                          );
                        })()}
                        {it.role ? (() => {
                          const roleData = textContent(String(it.role), sectionTokens);
                          return (
                            <div className={cls("opacity-70", roleData.className)} aria-label={roleData.ariaLabel}>
                              {roleData.content}
                            </div>
                          );
                        })() : null}
                      </div>
                    </div>
                    {it.quote ? (() => {
                      const quoteData = textContent(String(it.quote), sectionTokens);
                      return (
                        <div className={cls("mt-2 text-sm opacity-90", quoteData.className)} aria-label={quoteData.ariaLabel}>
                          {quoteData.content}
                        </div>
                      );
                    })() : null}
                  </div>
                ))
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
    const tokenClass = tokensToClassName(sectionTokens);
    const cardEffects = cardEffectClass(sectionTokens);
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
              <div
                key={idx}
                className={
                  cls(
                    ui.cardClass ||
                      "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] rounded-2xl border border-white/10 bg-white/5 p-4",
                    cardEffects
                  )
                }
              >
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.title ?? ""}
                    className={ui.imageClass || "w-full h-40 object-cover rounded-xl border border-white/10"}
                  />
                ) : null}

                <div className="flex items-start justify-between gap-2 mt-3">
                  {c.title ? (() => {
                    const cardTitleData = textContent(String(c.title ?? ""), sectionTokens);
                    return (
                      <div className={cls("font-semibold text-white", cardTitleData.className)} aria-label={cardTitleData.ariaLabel}>
                        {cardTitleData.content}
                      </div>
                    );
                  })() : <div />}
                  {c.badge ? (
                    (() => {
                      const badgeData = textContent(String(c.badge ?? ""), sectionTokens);
                      return (
                        <div className={cls("shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80", badgeData.className)} aria-label={badgeData.ariaLabel}>
                          {badgeData.content}
                        </div>
                      );
                    })()
                  ) : null}
                </div>

                {c.text ? (() => {
                  const cardTextData = textContent(String(c.text ?? ""), sectionTokens);
                  return (
                    <div className={cls("mt-2 text-sm text-white/70", cardTextData.className)} aria-label={cardTextData.ariaLabel}>
                      {cardTextData.content}
                    </div>
                  );
                })() : null}

                {c.buttonLabel && c.buttonHref ? (
                  (() => {
                    const buttonData = textContent(String(c.buttonLabel ?? ""), sectionTokens);
                    return (
                      <a
                        href={c.buttonHref}
                        className={cls("inline-flex items-center justify-center px-3 py-2 mt-4 text-sm text-white rounded-xl bg-white/10 hover:bg-white/15", buttonData.className)}
                        aria-label={buttonData.ariaLabel}
                      >
                        {buttonData.content}
                      </a>
                    );
                  })()
                ) : null}
              </div>
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
    return wrapPreview(data, (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <CmsComponentsRenderer components={fallbackComponents} inheritTokens={(data as any)?.twTokens} />
      </div>
    ));
  }
  return <div className="text-xs opacity-70">(?? ???? Preview ???? ?????)</div>;
}





