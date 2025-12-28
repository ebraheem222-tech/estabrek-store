import React from "react";
import HeroSlider from "./HeroSlider";
import NewsletterForm from "@/components/NewsletterForm";
import { FormSection } from "./sections/FormSection";
import { ComponentsRenderer } from "./ComponentsRenderer";
import type { CmsSection, PageSectionType, ProductMini } from "../types";
import { sanitizeHtml } from "../sanitizeHtml";
import type {
  BannerData,
  CtaData,
  CustomHtmlData,
  FaqData,
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

    if (hasSlides) {
      return (
        <section {...attrs} className={cls("overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03]", uiSectionClass(d))} style={uiSectionStyle(d)}>
          <div className={cls("relative", uiContainerClass(d))}>
            <HeroSlider data={d} />
          </div>
        </section>
      );
    }

    const overlay = Math.min(1, Math.max(0, safeNum(d.overlay, 0.35)));
    const align = d.align ?? "center";
    const justify = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";

    return (
      <section {...attrs} className={cls("overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03]", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div
          className={cls("relative min-h-[260px]", uiContainerClass(d))}
          style={
            d.backgroundImageUrl
              ? {
                  backgroundImage: `url(${d.backgroundImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
          <div className={cls("relative flex h-full min-h-[260px] flex-col justify-center gap-3 p-8", justify)}>
            <h2 className="text-2xl font-bold">{d.title}</h2>
            {d.subtitle ? <p className="max-w-[60ch] text-sm opacity-90">{d.subtitle}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {d.primaryButton?.label && d.primaryButton?.href ? (
                <a
                  href={d.primaryButton.href}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95"
                  style={{ backgroundColor: "var(--accent-2, #ffffff)" }}
                >
                  {d.primaryButton.label}
                </a>
              ) : null}
              {d.secondaryButton?.label && d.secondaryButton?.href ? (
                <a
                  href={d.secondaryButton.href}
                  className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-semibold hover:bg-white/[0.08]"
                >
                  {d.secondaryButton.label}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }

  if (type === "RICH_TEXT") {
    const d = data as RichTextData;
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-3 text-lg font-semibold">{d.title}</h3> : null}
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(d.html ?? "") }}
          />
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }

  if (type === "CUSTOM_HTML") {
    const d = data as CustomHtmlData;
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-4xl", uiContainerClass(d))}>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(d.html ?? "") }} />
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
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
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }

  if (type === "CTA") {
    const d = data as CtaData;
    const align = d.align ?? "center";
    const justify = align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";
    const buttonLabel = d.buttonLabel ?? d.button?.label;
    const buttonHref = d.buttonHref ?? d.button?.href;

    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          <div className={cls("flex flex-col gap-3", justify)}>
            <div className="text-xl font-semibold">{d.title}</div>
            {d.subtitle ? <div className="text-sm opacity-80">{d.subtitle}</div> : null}
            {buttonLabel && buttonHref ? (
              <a
                href={buttonHref}
                className="mt-2 inline-flex w-fit rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95"
                style={{ backgroundColor: "var(--accent-2, #ffffff)" }}
              >
                {buttonLabel}
              </a>
            ) : null}
          </div>
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }

  if (type === "FAQ") {
    const d = data as FaqData;
    const items = Array.isArray(d.items) ? d.items : [];
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-3 text-lg font-semibold">{d.title}</h3> : null}
          <div className="space-y-3">
            {items.map((it, idx) => {
              const question = it.question ?? it.q ?? "";
              const answer = it.answer ?? it.a ?? "";
              if (!question && !answer) return null;
              return (
                <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="text-sm font-semibold">{question}</div>
                  <div className="mt-1 text-sm opacity-80">{answer}</div>
                </div>
              );
            })}
          </div>
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }

  if (type === "GRID") {
    const d = data as GridData;

    if (d?.mode === "container") {
      const blocks = Array.isArray((d as any).blocks) ? (d as any).blocks : [];
      return (
        <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
          <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
            {d.title ? <h3 className="mb-4 text-lg font-semibold">{d.title}</h3> : null}
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
        </section>
      );
    }

    
    const columns = Math.min(4, Math.max(2, safeNum(d.columns, 3)));

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
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }

  if (type === "FEATURED_CATEGORIES") {
    const d = data as FeaturedCategoriesData;
    const items = Array.isArray(d.items) ? d.items : [];
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <div className="mb-4 flex flex-col gap-1">
            {d.title ? <h3 className="text-lg font-semibold">{d.title}</h3> : null}
            {d.subtitle ? <p className="text-sm opacity-80">{d.subtitle}</p> : null}
          </div>

          <div className="relative">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {items.map((it, idx) => (
                <a
                  key={idx}
                  href={it.href}
                  className="snap-start shrink-0 w-[220px] rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 hover:bg-white/[0.04]"
                >
                  {it.imageUrl ? <img src={it.imageUrl} alt={it.label} className="h-32 w-full rounded-xl object-cover" /> : null}
                  <div className="mt-3 text-sm font-semibold">{it.label}</div>
                  <div className="mt-1 text-xs opacity-70">تسوّق الآن</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }

  if (type === "COLLECTIONS_GRID") {
    const d = data as CollectionsGridData;
    const items = Array.isArray(d.items) ? d.items : [];
    const columns = Math.min(6, Math.max(2, safeNum(d.columns, 4)));
    const clsCols = columns <= 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : columns === 4 ? "md:grid-cols-4" : columns === 5 ? "md:grid-cols-5" : "md:grid-cols-6";

    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <div className="mb-4 flex flex-col gap-1">
            {d.title ? <h3 className="text-lg font-semibold">{d.title}</h3> : null}
            {d.subtitle ? <p className="text-sm opacity-80">{d.subtitle}</p> : null}
          </div>

          <div className={cls("grid gap-4", clsCols)}>
            {items.map((it, idx) => (
              <a
                key={idx}
                href={it.href}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 hover:bg-white/[0.04]"
              >
                <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  {it.imageUrl ? (
                    <img src={it.imageUrl} alt={it.label} className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="h-40 w-full" />
                  )}
                </div>
                <div className="mt-3 text-sm font-semibold">{it.label}</div>
              </a>
            ))}
          </div>
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }

  if (type === "IMAGE_GALLERY") {
    const d = data as ImageGalleryData;
    const columns = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const clsCols = columns <= 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : columns === 4 ? "md:grid-cols-4" : columns === 5 ? "md:grid-cols-5" : "md:grid-cols-6";

    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-4 text-lg font-semibold">{d.title}</h3> : null}
          <div className={cls("grid gap-3", clsCols)}>
            {(d.images ?? []).map((im, idx) => (
              <img key={idx} src={im.url} alt={im.alt ?? ""} className="h-40 w-full rounded-2xl object-cover" />
            ))}
          </div>
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
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
    return (
      <section {...attrs} className={cls(uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto w-full max-w-6xl px-4", uiContainerClass(d))}>
          <div className={cls("flex", wrap)}>
            <a
              href={d.href ?? "#"}
              {...targetProps}
              className={cls(
                "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition",
                clsBtn,
                d.fullWidth ? "w-full" : ""
              )}
            >
              {d.label ?? "زر"}
            </a>
          </div>
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }

  if (type === "INPUT") {
    const d = data as InputData;
    return (
      <section {...attrs} className={cls(uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto w-full max-w-6xl px-4", uiContainerClass(d))}>
          <div className="space-y-2">
            {d.label ? <div className="text-sm font-medium opacity-90">{d.label}</div> : null}
            <input
              name={d.name}
              type={d.type ?? "text"}
              placeholder={d.placeholder ?? ""}
              required={!!d.required}
              disabled={!!d.disabled}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/25"
            />
          </div>
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }
if (type === "FORM") {
    return (
      <div {...attrs}>
        <FormSection data={data as any} />
      </div>
    );
  }

  if (type === "NEWSLETTER") {
    const d = (data ?? {}) as any;
        return (
      <div {...attrs} className={cls(uiSectionClass(d))} style={uiSectionStyle(d)}>
        <NewsletterForm
          title={d.title}
          text={d.text}
          placeholder={d.placeholder}
          buttonLabel={d.buttonLabel ?? d.ctaLabel}
          successMessage={d.success}
        />
      </div>
    );
  }

  if (type === "TESTIMONIALS") {
    const d = data as TestimonialsData;
    const items = Array.isArray(d.items) ? d.items : Array.isArray(d.testimonials) ? d.testimonials : [];
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-4 text-lg font-semibold">{d.title}</h3> : null}
          <div className="grid gap-4 md:grid-cols-3">
            {items.map((t, idx) => (
              <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="text-sm font-semibold">{t.name}</div>
                {t.role ? <div className="text-xs opacity-70">{t.role}</div> : null}
                <div className="mt-2 text-sm opacity-90">"{t.quote}"</div>
              </div>
            ))}
          </div>
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }

  if (type === "NEW_ARRIVALS_SLIDER" || type === "BEST_SELLERS_SLIDER") {
    const d = data as any;
    const title = d?.title ?? (type === "NEW_ARRIVALS_SLIDER" ? "وصل حديثاً" : "الأكثر مبيعاً");
    const ids = Array.isArray(d?.productIds) ? d.productIds.filter(Boolean) : [];

    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          {title ? <h3 className="mb-4 text-lg font-semibold">{title}</h3> : null}

          {ids.length ? (
            <div className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2">
              {ids.map((id: string) => (
                <div key={id} className="min-w-[220px] snap-start md:min-w-[260px]">
                  {renderProductCard ? (
                    renderProductCard(id)
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold">{id}</div>
                      <div className="mt-1 text-xs opacity-70">(عنصر تجريبي)</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm opacity-70">(لا يوجد منتجات - تأكد من الـlimit أو وجود طلبات/منتجات)</div>
          )}
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }

  if (type === "BRANDS_SLIDER") {
    const d = data as any;
    const title = d?.title ?? "علامات تجارية";
    const items = Array.isArray(d?.items) ? d.items : [];
    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          {title ? <h3 className="mb-4 text-lg font-semibold">{title}</h3> : null}

          {items.length ? (
            <div className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2">
              {items.map((b: any, idx: number) => {
                const name = String(b?.name ?? "");
                const href = typeof b?.href === "string" && b.href ? b.href : null;
                const logoUrl = typeof b?.logoUrl === "string" && b.logoUrl ? b.logoUrl : null;
                const Card = (
                  <div className="flex h-20 w-44 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt={name} className="max-h-10 max-w-[140px] object-contain" />
                    ) : (
                      <span className="text-sm font-semibold">{name || "Brand"}</span>
                    )}
                  </div>
                );
                return (
                  <div key={idx} className="snap-start">
                    {href ? (
                      <a href={href} className="block" aria-label={name || "brand"}>
                        {Card}
                      </a>
                    ) : (
                      Card
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm opacity-70">(أضف Brands داخل الـCMS)</div>
          )}
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
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

    return (
      <section {...attrs} className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          {d.title ? <h3 className="mb-4 text-lg font-semibold">{d.title}</h3> : null}

          {ids.length ? (
            <div className={cls("grid gap-4", gridClass)}>
              {ids.map((id) => (
                <div key={id}>
                  {renderProductCard ? (
                    renderProductCard(id)
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold">{id}</div>
                      <div className="mt-1 text-xs opacity-70">(عنصر تجريبي)</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm opacity-70">(??? productIds ?? productSlugs ???? ????????)</div>
          )}
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }



  if (type === "CARDS") {
    // `data` is passed into this component; using an undefined `section` variable
    // crashes the Preview at runtime when rendering CARDS sections.
    const d = data as CardsData;
    const ui: any = d.ui ?? {};
    const cards = d.cards ?? [];
    const sectionClass = ui.sectionClass || "py-8";
    const tokenClass = tokensToClassName((d as any)?.twTokens);

    return (
      <section {...attrs} className={cls(sectionClass, tokenClass)} style={uiSectionStyle(d)}>
        <div className={ui.containerClass || "mx-auto max-w-5xl px-4"}>
          {d.title ? <h2 className="text-2xl font-semibold text-white">{d.title}</h2> : null}
          {d.subtitle ? <p className="mt-1 text-white/70">{d.subtitle}</p> : null}

          <div className={ui.cardsClass || "mt-6 flex flex-wrap gap-4"}>
            {cards.map((c, idx) => {
              const ref = getCardProductRef(c);
              const prod = resolveProductMini(ref, productLookup);
              const title = c.title || prod?.title;
              const img = c.imageUrl || prod?.imageUrl;
              const priceText = prod?.priceText;

              return (
              <div
                key={idx}
                className={
                  ui.cardClass ||
                  "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] rounded-2xl border border-white/10 bg-white/5 p-4"
                }
              >
                {img ? (
                  <img
                    src={img}
                    alt={c.title ?? ""}
                    className={ui.imageClass || "w-full h-40 object-cover rounded-xl border border-white/10"}
                  />
                ) : null}

                <div className="mt-3 flex items-start justify-between gap-2">
                  {title ? <div className="text-white font-semibold">{title}</div> : <div />}
                  {c.badge ? (
                    <div className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
                      {c.badge}
                    </div>
                  ) : null}
                </div>
                {priceText ? <div className="mt-1 text-sm text-white/80">{priceText}</div> : null}

                {c.text ? <div className="mt-2 text-sm text-white/70">{c.text}</div> : null}

                {(() => {
                  const hasView = !!(c.buttonLabel && c.buttonHref);
                  const hasQuick = !!(ref && renderQuickAdd);
                  if (!hasView && !hasQuick) return null;

                  return (
                    <div className={cls("mt-4", hasView && hasQuick ? "flex gap-2" : "")}> 
                      {hasView ? (
                        <a
                          href={c.buttonHref}
                          className={cls(
                            "inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15",
                            hasQuick ? "flex-1" : ""
                          )}
                        >
                          {c.buttonLabel}
                        </a>
                      ) : null}

                      {hasQuick ? (
                        <div className={hasView ? "flex-1" : ""}>{renderQuickAdd!(ref!)}</div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
              );
            })}
          </div>
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
    );
  }
  if (type === "VIDEO") {
    const d = data as VideoData;
    const aspect = d.aspect ?? d.ratio ?? "16/9";
    const aspectClass = aspect === "9/16" ? "aspect-[9/16]" : aspect === "1/1" ? "aspect-square" : aspect === "4/3" ? "aspect-[4/3]" : "aspect-video";

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
        </div>
      {section.data?.components?.length ? (
        <ComponentsRenderer components={section.data.components as any} productLookup={productLookup as any} />
      ) : null}
      </section>
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

  return (
    <div className={cls("space-y-5", className)}>
      {sorted.map((sec) => {
        const decorations = sectionDecorations((sec as any)?.data?.twTokens);
        const hasDecorations = !!decorations;
        return (
          <div key={sec.id} className={hasDecorations ? "relative" : undefined}>
            {hasDecorations ? <SectionDecorations decorations={decorations ?? undefined} className="z-0" /> : null}
            <div className={hasDecorations ? "relative z-10" : undefined}>
              <Section
                section={sec as any}
                renderProductCard={renderProductCard}
                renderQuickAdd={renderQuickAdd}
                productLookup={productLookup}
                depth={0}
                seen={seen}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}


// Backwards-compatible name (used by older Admin preview code)
export const PageRenderer = CmsPageRenderer;


