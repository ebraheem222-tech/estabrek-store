import React, { useEffect, useState } from "react";
import type { CmsSection, PageSectionType } from "../types";
import { sanitizeHtml } from "../sanitizeHtml";
import type {
  BannerData,
  CtaData,
  CustomHtmlData,
  FaqData,
  FeaturedCategoriesData,
  FeaturedProductsData,
  CollectionsGridData,
  ProductsSliderData,
  BrandsSliderData,
  NewsletterData,
  GridData,
  HeroData,
  ImageGalleryData,
  RichTextData,
  TestimonialsData,
  CardsData,
  VideoData,
} from "../sectionTypes";
import { CmsComponentsRenderer } from "./CmsComponentsRenderer";
import { SectionDecorations } from "../decorations/DecorationLayer";
import type { TwTokens } from "../style/tokens";
import { tokensToClassName, tokensToInlineStyle } from "../style/tokensToTw";

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

function Section({ section, renderProductCard }: { section: CmsSection; renderProductCard?: (productId: string) => React.ReactNode }) {
  const { type, data } = section;
  const anchorId = (section.anchorId ?? "").trim();
  const ariaLabel = (section.ariaLabel ?? "").trim();
  const attrs: any = {};
  if (anchorId) attrs.id = anchorId;
  if (ariaLabel) attrs["aria-label"] = ariaLabel;

  if (!data || typeof data !== "object") return null;

  if (type === "HERO") {
    const d = data as HeroData;
    const slides = Array.isArray((d as any).slides) ? ((d as any).slides as any[]) : [];
    const hasSlides = slides.length > 0;
    const [activeSlide, setActiveSlide] = useState(0);
    const autoplayMs = safeNum((d as any).autoplayMs, 0);
    const showDots = (d as any).showDots ?? true;

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

    const s = hasSlides ? slides[activeSlide] ?? slides[0] : d;
    const overlay = Math.min(1, Math.max(0, safeNum((s as any).overlay ?? d.overlay, 0.35)));
    const align = (s as any).align ?? d.align ?? "center";
    const justify = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";
    const componentsBlock = renderComponentsBlock(d);
    const primaryButton = (s as any).primaryButton;
    const secondaryButton = (s as any).secondaryButton;
    const slideAnim = (d as any).slideAnim ?? "none";
    const slideDuration = safeNum((d as any).slideDuration, 600);
    const contentAnim = (d as any).contentAnim ?? "fade-up";
    const contentDuration = safeNum((d as any).contentDuration, 400);
    const contentDelay = safeNum((d as any).contentDelay, 0);
    const slideAnimClass = heroAnimClass(slideAnim, slideDuration, 0);
    const contentAnimClass = heroAnimClass(contentAnim, contentDuration, contentDelay);
    const slideKey = `${activeSlide}-${slideAnim}-${slideDuration}`;
    const contentKey = `${activeSlide}-${contentAnim}-${contentDuration}-${contentDelay}`;

    return (
      <section {...attrs} className={cls("overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03]", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div
          key={slideKey}
          className={cls("relative min-h-[260px]", uiContainerClass(d), slideAnimClass)}
          style={
            (s as any).backgroundImageUrl
              ? {
                  backgroundImage: `url(${(s as any).backgroundImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
          <div key={contentKey} className={cls("relative flex h-full min-h-[260px] flex-col justify-center gap-3 p-8", justify, contentAnimClass)}>
            <h2 className="text-2xl font-bold">{(s as any).title}</h2>
            {(s as any).subtitle ? <p className="max-w-[60ch] text-sm opacity-90">{(s as any).subtitle}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {primaryButton?.label ? (
                primaryButton?.href ? (
                  <a
                    href={primaryButton.href}
                    className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500"
                  >
                    {primaryButton.label}
                  </a>
                ) : (
                  <span className="rounded-xl bg-accent-600/80 px-4 py-2 text-sm font-semibold text-white/90">
                    {primaryButton.label}
                  </span>
                )
              ) : null}
              {secondaryButton?.label ? (
                secondaryButton?.href ? (
                  <a
                    href={secondaryButton.href}
                    className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-semibold hover:bg-white/[0.08]"
                  >
                    {secondaryButton.label}
                  </a>
                ) : (
                  <span className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/90">
                    {secondaryButton.label}
                  </span>
                )
              ) : null}
            </div>
          </div>
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

  if (type === "RICH_TEXT") {
    const d = data as RichTextData;
    const componentsBlock = renderComponentsBlock(d);
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-3 text-lg font-semibold">{d.title}</h3> : null}
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(d.html ?? "") }}
          />
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "CUSTOM_HTML") {
    const d = data as CustomHtmlData;
    const componentsBlock = renderComponentsBlock(d);
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-4xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-3 text-lg font-semibold">{d.title}</h3> : null}
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(d.html ?? "") }} />
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "BANNER") {
    const d = data as BannerData;
    const variant = d.variant ?? d.tone ?? "info";
    const linkLabel = d.linkLabel ?? d.buttonText;
    const linkHref = d.linkHref ?? d.href;
    const componentsBlock = renderComponentsBlock(d);
    const color =
      variant === "success"
        ? "border-emerald-500/30 bg-emerald-500/10"
        : variant === "warning"
          ? "border-amber-500/30 bg-amber-500/10"
          : variant === "danger"
            ? "border-red-500/30 bg-red-500/10"
            : "border-sky-500/30 bg-sky-500/10";

    return (
      <section {...attrs} className={cls("rounded-3xl border p-5", color, uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("flex flex-col gap-2 md:flex-row md:items-center md:justify-between", uiContainerClass(d))}>
          <div className="text-sm opacity-90">{d.text}</div>
          {linkLabel && linkHref ? (
            <a className="text-sm font-semibold underline decoration-white/30 underline-offset-4 hover:decoration-white/60" href={linkHref}>
              {linkLabel}
            </a>
          ) : null}
        </div>
        {componentsBlock}
      </section>
    );
  }

  if (type === "CTA") {
    const d = data as CtaData;
    const align = d.align ?? "center";
    const justify = align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";
    const componentsBlock = renderComponentsBlock(d);

    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          <div className={cls("flex flex-col gap-3", justify)}>
            <div className="text-xl font-semibold">{d.title}</div>
            {d.subtitle ? <div className="text-sm opacity-80">{d.subtitle}</div> : null}
            {d.imageUrl ? (
              <img src={d.imageUrl} alt={d.title ?? ""} className="mt-2 w-full max-w-md rounded-2xl border border-white/[0.08]" />
            ) : null}
            {d.buttonLabel ? (
              d.buttonHref ? (
                <a
                  href={d.buttonHref}
                  className="mt-2 inline-flex w-fit rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500"
                >
                  {d.buttonLabel}
                </a>
              ) : (
                <span className="mt-2 inline-flex w-fit rounded-xl bg-accent-600/80 px-4 py-2 text-sm font-semibold text-white/90">
                  {d.buttonLabel}
                </span>
              )
            ) : null}
          </div>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "FAQ") {
    const d = data as FaqData;
    const componentsBlock = renderComponentsBlock(d);
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-3 text-lg font-semibold">{d.title}</h3> : null}
          <div className="space-y-3">
            {(d.items ?? []).map((it, idx) => (
              <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="text-sm font-semibold">{it.question}</div>
                <div className="mt-1 text-sm opacity-80">{it.answer}</div>
              </div>
            ))}
          </div>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "GRID") {
    const d = data as GridData;
    const columns = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const componentsBlock = renderComponentsBlock(d);

    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-4 text-lg font-semibold">{d.title}</h3> : null}
          <div className={cls("grid gap-4", columns === 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-4")}>
            {(d.items ?? []).map((it, idx) => (
              <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                {it.imageUrl ? <img src={it.imageUrl} alt={it.title} className="mb-3 h-28 w-full rounded-xl object-cover" /> : null}
                <div className="text-sm font-semibold">{it.title}</div>
                {it.text ? <div className="mt-1 text-sm opacity-80">{it.text}</div> : null}
              </div>
            ))}
          </div>
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
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          {(d.title || d.subtitle || showArrows) ? (
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                {d.title ? <h3 className="text-lg font-semibold">{d.title}</h3> : null}
                {d.subtitle ? <div className="mt-1 text-sm opacity-80">{d.subtitle}</div> : null}
              </div>
              {showArrows ? (
                <div className="flex items-center gap-2">
                  <button type="button" className="h-8 w-8 rounded-full border border-white/10 bg-white/5 text-sm text-white/70">{"<"}</button>
                  <button type="button" className="h-8 w-8 rounded-full border border-white/10 bg-white/5 text-sm text-white/70">{">"}</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            {items.length ? (
              items.slice(0, 6).map((it, idx) => (
                <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  {it.imageUrl ? <img src={it.imageUrl} alt="" className="mb-3 h-32 w-full rounded-xl object-cover" /> : null}
                  <div className="text-sm font-semibold">{it.label ?? "Category"}</div>
                  {it.href ? <div className="mt-1 text-xs opacity-70">{it.href}</div> : null}
                </div>
              ))
            ) : (
              <div className="text-sm opacity-70">No items yet.</div>
            )}
          </div>
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
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-2 text-lg font-semibold">{d.title}</h3> : null}
          {d.subtitle ? <div className="mb-4 text-sm opacity-80">{d.subtitle}</div> : null}
          <div className={cls("grid gap-4", clsCols)}>
            {items.length ? (
              items.slice(0, 8).map((it, idx) => (
                <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  {it.imageUrl ? <img src={it.imageUrl} alt="" className="mb-3 h-32 w-full rounded-xl object-cover" /> : null}
                  <div className="text-sm font-semibold">{it.label ?? "Collection"}</div>
                  {it.href ? <div className="mt-1 text-xs opacity-70">{it.href}</div> : null}
                </div>
              ))
            ) : (
              <div className="text-sm opacity-70">No items yet.</div>
            )}
          </div>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "NEW_ARRIVALS_SLIDER" || type === "BEST_SELLERS_SLIDER") {
    const d = data as ProductsSliderData;
    const limit = Math.min(8, Math.max(1, safeNum(d.limit, 6)));
    const componentsBlock = renderComponentsBlock(d);
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <h3 className="mb-4 text-lg font-semibold">{d.title || (type === "NEW_ARRIVALS_SLIDER" ? "New arrivals" : "Best sellers")}</h3>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: limit }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs opacity-70">
                Product {idx + 1}
              </div>
            ))}
          </div>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "BRANDS_SLIDER") {
    const d = data as BrandsSliderData;
    const items = Array.isArray(d.items) ? d.items : [];
    const componentsBlock = renderComponentsBlock(d);
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-4 text-lg font-semibold">{d.title}</h3> : null}
          <div className="grid gap-4 md:grid-cols-4">
            {items.length ? (
              items.slice(0, 8).map((it, idx) => (
                <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm">
                  <div className="font-semibold">{it.name ?? "Brand"}</div>
                  {it.logoUrl ? <div className="mt-1 text-xs opacity-70">logo: {it.logoUrl}</div> : null}
                  {it.href ? <div className="mt-1 text-xs opacity-70">{it.href}</div> : null}
                </div>
              ))
            ) : (
              <div className="text-sm opacity-70">No brands yet.</div>
            )}
          </div>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "NEWSLETTER") {
    const d = data as NewsletterData;
    const componentsBlock = renderComponentsBlock(d);
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-4xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-2 text-lg font-semibold">{d.title}</h3> : null}
          {d.text ? <p className="mb-4 text-sm opacity-80">{d.text}</p> : null}
          {d.ctaLabel ? (
            d.ctaHref ? (
              <a href={d.ctaHref} className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
                {d.ctaLabel}
              </a>
            ) : (
              <span className="inline-flex items-center rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-black/80">
                {d.ctaLabel}
              </span>
            )
          ) : null}
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

    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-4 text-lg font-semibold">{d.title}</h3> : null}
          <div className={cls("grid gap-3", clsCols)}>
            {(d.images ?? []).map((im, idx) => (
              <img key={idx} src={im.url} alt={im.alt ?? ""} className="h-40 w-full rounded-2xl object-cover" />
            ))}
          </div>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "TESTIMONIALS") {
    const d = data as TestimonialsData;
    const componentsBlock = renderComponentsBlock(d);
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-4 text-lg font-semibold">{d.title}</h3> : null}
          <div className="grid gap-4 md:grid-cols-3">
            {(d.items ?? []).map((t, idx) => (
              <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  {t.avatarUrl ? (
                    <img src={t.avatarUrl} alt={t.name ?? "Avatar"} className="h-10 w-10 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-white/10" />
                  )}
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    {t.role ? <div className="text-xs opacity-70">{t.role}</div> : null}
                  </div>
                </div>
                <div className="mt-3 text-sm opacity-90">"{t.quote}"</div>
              </div>
            ))}
          </div>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "FEATURED_PRODUCTS") {
    const d = data as FeaturedProductsData;
    const cols = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const ids = Array.isArray(d.productSlugs)
      ? d.productSlugs.filter(Boolean)
      : Array.isArray(d.productIds)
        ? d.productIds.filter(Boolean)
        : [];
    const componentsBlock = renderComponentsBlock(d);
    const gridClass = cls("grid gap-4", cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4");

    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-4 text-lg font-semibold">{d.title}</h3> : null}
          {ids.length ? (
            renderProductCard ? (
              <div className={gridClass}>
                {ids.map((id) => (
                  <div key={id}>{renderProductCard(id)}</div>
                ))}
              </div>
            ) : (
              <div className={gridClass}>
                {ids.map((id) => (
                  <div key={id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold">{id}</div>
                    <div className="mt-1 text-xs opacity-70">(???? ?????? ?? ??????)</div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-sm opacity-70">(??? productIds ???? ????????)</div>
          )}
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
    const cards: any[] = Array.isArray((d as any).cards) ? ((d as any).cards as any[]) : [];
    const componentsBlock = renderComponentsBlock(d);
    const sectionClass = ui.sectionClass || "py-8";
    const tokenClass = tokensToClassName((d as any)?.twTokens);

    return (
      <section {...attrs} className={cls(sectionClass, tokenClass)} style={uiSectionStyle(d)}>
        <div className={ui.containerClass || "mx-auto max-w-5xl px-4"}>
          {d.title ? <h2 className="text-2xl font-semibold text-white">{d.title}</h2> : null}
          {d.subtitle ? <p className="mt-1 text-white/70">{d.subtitle}</p> : null}

          <div className={ui.cardsClass || "mt-6 flex flex-wrap gap-4"}>
            {cards.map((c, idx) => (
              <div
                key={idx}
                className={
                  ui.cardClass ||
                  "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] rounded-2xl border border-white/10 bg-white/5 p-4"
                }
              >
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.title ?? ""}
                    className={ui.imageClass || "w-full h-40 object-cover rounded-xl border border-white/10"}
                  />
                ) : null}

                <div className="mt-3 flex items-start justify-between gap-2">
                  {c.title ? <div className="text-white font-semibold">{c.title}</div> : <div />}
                  {c.badge ? (
                    <div className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
                      {c.badge}
                    </div>
                  ) : null}
                </div>

                {c.text ? <div className="mt-2 text-sm text-white/70">{c.text}</div> : null}

                {c.buttonLabel && c.buttonHref ? (
                  <a
                    href={c.buttonHref}
                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                  >
                    {c.buttonLabel}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
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

    const yt = d.url ? youtubeId(d.url) : null;
    const vm = d.url ? vimeoId(d.url) : null;

    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-2 text-lg font-semibold">{d.title}</h3> : null}
          {d.subtitle ? <div className="mb-4 text-sm opacity-80">{d.subtitle}</div> : null}

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
              <div className="flex h-full w-full items-center justify-center text-sm opacity-70">(ضع رابط الفيديو)</div>
            )}
          </div>
          {componentsBlock}
        </div>
      </section>
    );
  }

  return null;
}

export function CmsPageRenderer({
  sections,
  renderProductCard,
  className,
}: {
  sections: CmsSection[];
  renderProductCard?: (productId: string) => React.ReactNode;
  className?: string;
}) {
  const sorted = (sections ?? []).filter((s) => s.isVisible !== false).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className={cls("space-y-5", className)}>
      {sorted.map((sec) => {
        const decorations = sectionDecorations((sec as any)?.data?.twTokens);
        const hasDecorations = !!decorations;
        return (
          <div key={sec.id} className={hasDecorations ? "relative" : undefined}>
            {hasDecorations ? <SectionDecorations decorations={decorations ?? undefined} className="z-0" /> : null}
            <div className={hasDecorations ? "relative z-10" : undefined}>
              <Section section={sec as any} renderProductCard={renderProductCard} />
            </div>
          </div>
        );
      })}
    </div>
  );
}


// Backwards-compatible name (used by older Admin preview code)
export const PageRenderer = CmsPageRenderer;



