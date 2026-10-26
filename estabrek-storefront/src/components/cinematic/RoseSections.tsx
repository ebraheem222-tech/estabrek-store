"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type FocusEvent } from "react";
import type { ProductMini } from "@/cms/types";
import type { CatalogCategory } from "@/lib/catalog";
import { QuickAddButton } from "@/components/QuickAddButton";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { ScrollOpening } from "./ScrollOpening";
import { DesignStudy } from "./DesignStudy";
import type { RosePresentationOptions } from "./roseDesign";
import { RoseVideoSection, defaultCampaignVideo } from "./RoseVideoSection";
import { HeroMascot } from "./mascot/HeroMascot";
import { RoseHeroFilm } from "./RoseHeroFilm";
import { useHeroFilm } from "@/lib/useAb";
import { completeFaq, polishButton, polishCopy } from "./roseCopy";
import { useRoseStore } from "./StorefrontChrome";
import type { ProductBadge } from "@/lib/productBadges";
import { RoseBadge } from "./RoseBadge";
import { collectionSeed } from "@/lib/collectionTheme";
import {
  discardThemePreview,
  endThemePreview,
  previewTheme,
} from "@/lib/themePreview";
import { useNames } from "@/store/storeIdentity";
import { tr } from "@/lib/words";
import { sceneField, sceneWord } from "./sceneWords";
import { isRtl } from "@/lib/i18n";

export type RoseHeroData = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  badge?: string;
  backgroundImageUrl?: string;
  roseTitle?: string;
  roseImageUrl?: string;
  roseImageAlt?: string;
  rose3dEnabled?: boolean;
  roseVideoEnabled?: boolean;
  roseStoryWords?: string[];
  /** The scarf film opening (default on); false brings back the photo opening. */
  roseHeroFilm?: boolean;
  /** Film headline lines, one per turn of the scarf (empty = the shop's own lines). */
  roseFilmLines?: string[];
  /** The line shown when the hijab is complete. */
  roseFilmClosing?: string;
  rosePresentation?: RosePresentationOptions;
  primaryButton?: { label?: string; href?: string };
  secondaryButton?: { label?: string; href?: string };
  /** The new editor's words in place of the shop's own lines (empty = the shop's). */
  roseKicker?: string;
  roseNote?: string;
  roseScrollCue?: string;
  roseBrandCaption?: string;
  roseImageCaption?: string;
  roseCategoryNavLabel?: string;
  /** The campaign clip under the opening (empty = the shop's own). */
  roseVideo?: { url?: string; posterUrl?: string };
};
export type RoseCollection = {
  label?: string;
  title?: string;
  href?: string;
  imageUrl?: string;
  /** Optional Admin colour for the hover theme (hex). */
  themeColor?: string;
  color?: string;
};

const DEFAULT_HERO_IMAGE = "/editorial/hijab-campaign.webp";

export function RoseHero({
  data,
  categories = [],
  logoUrl,
  siteName,
  showStudy = true,
  openingStudy = false,
  showVideo = true,
}: {
  data: RoseHeroData;
  categories?: CatalogCategory[];
  logoUrl?: string | null;
  siteName?: string | null;
  showStudy?: boolean;
  openingStudy?: boolean;
  showVideo?: boolean;
}) {
  const { language } = useLanguage();
  const lang = language;
  const ar = lang === "ar";
  const n = useNames();
  const primaryButton = polishButton(data.primaryButton);
  const secondaryButton = polishButton(data.secondaryButton);
  const subtitle = polishCopy(data.subtitle);
  const title =
    data.roseTitle ||
    (data.title !== siteName ? polishCopy(data.title) : "") ||
    (tr(lang, "أناقة تشبهكِ.\nبكل تفاصيلكِ.", "Modesty,\nbeautifully yours."));
  const lines = title.split("\n");
  const image =
    data.roseImageUrl ||
    (data.backgroundImageUrl && data.backgroundImageUrl !== logoUrl
      ? data.backgroundImageUrl
      : DEFAULT_HERO_IMAGE);
  // The shop action leads; the softer "discover" action follows as a text link.
  const shopFirst = [primaryButton, secondaryButton].find((b) => b?.href === "/shop");
  const primary =
    shopFirst ??
    (primaryButton?.href && primaryButton.href !== "/"
      ? primaryButton
      : secondaryButton?.href
        ? secondaryButton
        : primaryButton);
  const secondary = primary === primaryButton ? secondaryButton : primaryButton;
  // The CMS's choice, or this visit's side of an A/B test (admin → تجارب A/B).
  const film = useHeroFilm(data.roseHeroFilm !== false);
  return (
    <>
      {film ? (
        <RoseHeroFilm
          ar={ar}
          eyebrow={data.eyebrow}
          lines={data.roseFilmLines}
          closing={data.roseFilmClosing}
          description={subtitle}
          primary={primary}
          secondary={secondary}
          lineColors={(data as { roseFilmColors?: string[] }).roseFilmColors}
        />
      ) : (
      <ScrollOpening subtle={data.rosePresentation?.motionIntensity === "subtle"} model={showStudy && openingStudy ? <DesignStudy language={language} embedded words={data.roseStoryWords} /> : undefined}>
        <section
          className="atelier-hero rose-hero"
          aria-labelledby="hero-title"
        >
          <div className="hero-copy">
            <div className="atelier-eyebrow hero-eyebrow">
              <span className="rose-line" />
              <span data-edit="eyebrow">
                {data.eyebrow ||
                  (tr(lang, `${n.store} · أناقة محتشمة`, "{0} · MODERN MODESTY", [n.store.toUpperCase()]))}
              </span>
            </div>
            <div className="rose-hero-kicker">
              <span data-edit="roseKicker">{data.roseKicker || tr(lang, "لأن كل تفاصيلكِ، جميلة", "Made for every side of you")}</span>
              <Icon name="spark" />
            </div>
            <h1 id="hero-title" className="hero-headline" data-edit="roseTitle" data-edit-lines="">
              {lines.map((line, i) => (
                <span
                  key={i}
                  className={
                    i === lines.length - 1 && i > 0
                      ? "headline-rose"
                      : undefined
                  }
                >
                  {line}
                </span>
              ))}
            </h1>
            <p className="hero-description" data-edit="subtitle">
              {subtitle ||
                (tr(lang, "حجاب، فساتين، وقطع تختارينها بحب. إطلالات تجمع الاحتشام والراحة، بلمسة تشبهكِ.", "Hijabs, dresses, and pieces to love. A little softness, a little confidence. Completely you."))}
            </p>
            <div className="hero-actions">
              <Link
                href={primary?.href || "/shop"}
                className="atelier-button button-dark"
                data-edit-box={primary === secondaryButton ? "secondaryButton.label" : "primaryButton.label"}
                data-edit-link={primary === secondaryButton ? "secondaryButton.href" : "primaryButton.href"}
              >
                <span data-edit={primary === secondaryButton ? "secondaryButton.label" : "primaryButton.label"} data-edit-boxed="">
                  {primary?.label ||
                    (tr(lang, "تسوّقي الآن", "Shop now"))}
                </span>
                <Icon name="arrow" />
              </Link>
              {secondary?.href && secondary.label ? (
                <Link href={secondary.href} className="atelier-text-link" data-edit-box={secondary === primaryButton ? "primaryButton.label" : "secondaryButton.label"} data-edit-link={secondary === primaryButton ? "primaryButton.href" : "secondaryButton.href"}>
                  <span data-edit={secondary === primaryButton ? "primaryButton.label" : "secondaryButton.label"} data-edit-boxed="">{secondary.label}</span>
                  <Icon name="arrow" />
                </Link>
              ) : showStudy ? (
                <a href="#craft" className="atelier-text-link">
                  {tr(lang, "اكتشفي عالم الأقمشة", "Explore the fabric story")}
                  <Icon name="rotate" />
                </a>
              ) : null}
            </div>
            <div className="hero-bottom">
              <span className="hero-note" data-edit="roseNote">
                {data.roseNote || tr(lang, "احتشامٌ بثقة. وأناقةٌ بطريقتكِ.", "Soft by nature. Confident by choice.")}
              </span>
              <a href="#arrivals" className="scroll-cue">
                <Icon name="down" />
                <span data-edit="roseScrollCue">{data.roseScrollCue || tr(lang, "مرّري للاكتشاف", "SCROLL TO DISCOVER")}</span>
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-orbit" aria-hidden="true" />
            <div className="hero-image-wrap" data-edit-media="roseImageUrl">
              <Image
                src={image}
                alt={
                  data.roseImageAlt ||
                  (tr(lang, "إطلالة محتشمة بحجاب وفستان وردي", "A modest look with a rose hijab and flowing dress"))
                }
                fill
                priority
                sizes="100vw"
                className="hero-campaign-image"
              />
              {image === DEFAULT_HERO_IMAGE ? (
                // The campaign photo takes the shopper's colour; face and hands stay natural.
                <span className="hero-campaign-tint" aria-hidden="true" />
              ) : null}
            </div>
            <HeroMascot ar={ar} />
            <div className="hero-brand-card">
              <span className="hero-brand-label" data-edit="badge">
                {data.badge || (tr(lang, `مختارات ${n.store}`, "THE ROSE EDIT"))}
              </span>
              <div className="hero-brand-image">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={siteName || n.storeName}
                    fill
                    sizes="180px"
                  />
                ) : (
                  <span className="rose-image-placeholder">{n.store}</span>
                )}
              </div>
              <span data-edit="roseBrandCaption">{data.roseBrandCaption || tr(lang, "أناقة تليق بكِ", "BEAUTIFULLY YOU")}</span>
            </div>
            <div className="hero-image-caption">
              <span data-edit="roseImageCaption">
                {data.roseImageCaption || tr(lang, "حكايتكِ تبدأ بتفصيلة", "Every detail tells your story")}
              </span>
            </div>
            <span className="image-edge-label" aria-hidden="true">
              {tr(lang, "النعومة حضور", "SOFTNESS IS A STATEMENT")}
            </span>
          </div>
        </section>
      </ScrollOpening>
      )}
      <RoseTrustBar />
      {categories.length > 0 && (
        <div
          className="rose-category-nav"
          aria-label={tr(lang, "أقسام المتجر", "Shop categories")}
        >
          <span data-edit="roseCategoryNavLabel">{data.roseCategoryNavLabel || tr(lang, "اكتشفي أسلوبكِ", "Find your style")}</span>
          {categories
            .filter((c) => !c.parentId)
            .slice(0, 6)
            .map((c) => (
              <Link key={c.id} href={`/c/${encodeURIComponent(c.slug)}`}>
                {c.name}
                <Icon name="arrow" />
              </Link>
            ))}
        </div>
      )}
      {showVideo && data.roseVideoEnabled !== false && (
        <div data-edit-media="roseVideo.url" data-edit-media-kind="video">
          <RoseVideoSection data={data.roseVideo?.url ? { ...defaultCampaignVideo, ...data.roseVideo } : undefined} />
        </div>
      )}
    </>
  );
}

export function RoseProductGrid({
  products,
  title,
  subtitle,
  categories = [],
  anchor = "arrivals",
  layout = "grid",
}: {
  products: (ProductMini & {
    category?: string;
    colors?: string[];
    secondaryImageUrl?: string | null;
    badge?: ProductBadge | null;
  })[];
  title?: string;
  subtitle?: string;
  categories?: CatalogCategory[];
  anchor?: string;
  layout?: "grid" | "slider";
}) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const n = useNames();
  const reel = useRef<HTMLDivElement>(null);
  return (
    <section id={anchor} className="atelier-arrivals atelier-section">
      <div className="atelier-section-heading" data-reveal>
        <div>
          <span className="atelier-eyebrow">
            {tr(lang, "اختيارات تستحق أن تكون لكِ", "YOUR NEXT LITTLE OBSESSION")}
          </span>
          <h2 data-edit="title">{title || (tr(lang, "جديد، ويشبهكِ.", "New. And so you."))}</h2>
          {subtitle && <p className="section-description" data-edit="subtitle">{subtitle}</p>}
        </div>
        <Link href="/shop" className="atelier-text-link">
          {tr(lang, "كل المنتجات", "Shop all pieces")}
          <Icon name="arrow" />
        </Link>
      </div>
      {categories.length > 0 && (
        <div className="collection-tabs" data-reveal>
          <Link href="/shop" className="collection-tab active">
            {tr(lang, "كل الاختيارات", "All pieces")}
            <span className="tab-dot" />
          </Link>
          {categories.slice(0, 5).map((c) => (
            <Link
              key={c.id}
              href={`/c/${encodeURIComponent(c.slug)}`}
              className="collection-tab"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
      {layout === "slider" && products.length > 4 && (
        <div className="rose-reel-controls">
          <span>
            {tr(lang, "اختيارات أكثر، مرّري لاستكشافها", "More to love. Scroll to explore.")}
          </span>
          <button
            type="button"
            className="atelier-icon-button"
            aria-label={tr(lang, "المنتجات السابقة", "Previous products")}
            onClick={() =>
              reel.current?.scrollBy({
                left: (isRtl(lang) ? 1 : -1) * reel.current.clientWidth * 0.85,
                behavior: "smooth",
              })
            }
          >
            <Icon name="arrow" className="rotate-left" />
          </button>
          <button
            type="button"
            className="atelier-icon-button"
            aria-label={tr(lang, "المنتجات التالية", "Next products")}
            onClick={() =>
              reel.current?.scrollBy({
                left: (isRtl(lang) ? -1 : 1) * reel.current.clientWidth * 0.85,
                behavior: "smooth",
              })
            }
          >
            <Icon name="arrow" />
          </button>
        </div>
      )}
      {products.length > 0 ? (
        <div
          ref={reel}
          className={`editorial-product-grid ${layout === "slider" ? "rose-product-reel" : ""}`}
        >
          {products.map((p, index) => (
            <article
              className="editorial-product"
              key={p.id || p.slug || index}
              data-reveal
              data-part="card"
            >
              <Link
                href={p.slug ? `/p/${encodeURIComponent(p.slug)}` : "/shop"}
                className="editorial-product-link"
              >
                <div className={`editorial-product-image${p.secondaryImageUrl ? " has-alt" : ""}`} data-part="card-image">
                  <RoseBadge badge={p.badge} ar={ar} />
                  {p.imageUrl ? (
                    <>
                      <Image
                        src={p.imageUrl}
                        alt={p.title}
                        fill
                        className="product-image-main"
                        sizes="(max-width:600px) 46vw, (max-width:1000px) 45vw, 24vw"
                      />
                      {p.secondaryImageUrl ? (
                        <Image
                          src={p.secondaryImageUrl}
                          alt=""
                          aria-hidden
                          fill
                          className="product-image-alt"
                          sizes="(max-width:600px) 46vw, (max-width:1000px) 45vw, 24vw"
                        />
                      ) : null}
                    </>
                  ) : (
                    <div className="product-image-placeholder">
                      <Icon name="spark" width="48" height="48" />
                    </div>
                  )}
                  <span className="product-view">
                    <Icon name="arrow" />
                  </span>
                </div>
                <div className="product-info">
                  <span className="product-category" data-part="card-category">
                    {p.category ||
                      (tr(lang, `مجموعة ${n.store}`, "THE {0} COLLECTION", [n.store.toUpperCase()]))}
                  </span>
                  <div className="product-title-row">
                    <h3 data-part="card-name">{p.title}</h3>
                    <span className="product-price" data-part="card-price">{p.priceText}</span>
                  </div>
                </div>
              </Link>
              {p.colors?.length ? (
                <div
                  className="product-colors"
                  aria-label={tr(lang, "ألوان متاحة", "Available colors")}
                >
                  {p.colors.slice(0, 5).map((c, i) => (
                    <span key={i} style={{ backgroundColor: c }} />
                  ))}
                </div>
              ) : null}
              {(p.id || p.slug) && (
                <div className="rose-quick-add" data-part="card-add">
                  <QuickAddButton
                    productId={p.id}
                    slug={p.slug}
                    buttonLabel={tr(lang, "إضافة سريعة", "Quick add")}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="rose-empty-edit">
          <Image
            src="/editorial/scarves.webp"
            alt={tr(lang, "إلهام لألوان الحجاب", "Hijab color inspiration")}
            width={1500}
            height={1000}
          />
          <div>
            <span className="atelier-eyebrow">
              {tr(lang, "إلهام لإطلالتكِ", "EDITORIAL INSPIRATION")}
            </span>
            <h3>{tr(lang, "اختاري ما يشبهكِ.", "Find your own softness.")}</h3>
            <Link href="/shop" className="atelier-button button-dark">
              {tr(lang, "زيارة المتجر", "Explore the store")}
              <Icon name="arrow" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

export function RoseCollections({
  items,
  title,
  subtitle,
  anchor = "collections",
}: {
  items: RoseCollection[];
  title?: string;
  subtitle?: string;
  anchor?: string;
}) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const grid = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);
  const intent = useRef(0);
  // Hovering a collection dresses the whole storefront in that collection's colour —
  // once the pointer settles on a card, not while it just passes over the grid.
  const preview = (index: number, card: HTMLElement) => {
    if (active.current === index) return;
    window.clearTimeout(intent.current);
    intent.current = window.setTimeout(() => {
      active.current = index;
      previewTheme(
  card,
  collectionSeed(
    items[index],
    index,
    card.querySelector("img"),
  ),
);
    }, active.current === null ? 90 : 45);
  };
  const restore = () => {
    window.clearTimeout(intent.current);
    if (active.current === null) return; // nothing was previewed
    active.current = null;
    endThemePreview(
  grid.current,
);
  };
  useEffect(() => () => window.clearTimeout(intent.current), []);
  const leaveFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) restore();
  };
  return (
    <section id={anchor} className="atelier-collections atelier-section">
      <div className="atelier-section-heading" data-reveal>
        <div>
          <span className="atelier-eyebrow">
            {tr(lang, "لكل يوم، ولكل حكاية", "A LITTLE SOMETHING FOR EVERY DAY")}
          </span>
          <h2 data-edit="title">
            {title ||
              (tr(lang, "عالم من الاختيارات.", "A world of possibilities."))}
          </h2>
        </div>
        <p className="heading-aside" data-edit="subtitle">
          {subtitle ||
            (tr(lang, "قطع تقترب منكِ.\nوتفاصيل تجعل إطلالتكِ أجمل.", "Pieces that feel like you.\nDetails that make your day."))}
        </p>
      </div>
      <div ref={grid} className="editorial-collection-grid" onMouseLeave={restore} onBlur={leaveFocus}>
        {items.map((item, i) => (
          <Link
            href={item.href || "/shop"}
            key={`${item.href}-${i}`}
            className={`editorial-collection-card ${i % 2 ? "collection-landscape" : "collection-portrait"}`}
            data-reveal
            data-edit-media={`items.${i}.imageUrl`}
            onMouseEnter={(event) => preview(i, event.currentTarget)}
            onFocus={(event) => preview(i, event.currentTarget)}
            onClick={() => { discardThemePreview(); active.current = null; }}
          >
            <Image
              src={
                item.imageUrl ||
                (i % 2
                  ? "/editorial/scarves.webp"
                  : "/editorial/hijab-campaign.webp")
              }
              alt={
                item.label ||
                item.title ||
                (tr(lang, "اكتشفي المجموعة", "Explore the collection"))
              }
              fill
              sizes="(max-width:760px) 100vw, 48vw"
            />
            <div className="collection-overlay">
              <span className="atelier-eyebrow">
                {tr(lang, "مختارة لكِ بحب", "CURATED WITH LOVE")}
              </span>
              <h3 data-edit={item.label || !item.title ? `items.${i}.label` : `items.${i}.title`}>{item.label || item.title}</h3>
              <span className="collection-card-link">
                {tr(lang, "اكتشفي المجموعة", "Explore the collection")}
                <Icon name="arrow" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function RoseEditorialPanel({ data }: { data: RoseHeroData }) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const configuredActions = [polishButton(data.primaryButton), polishButton(data.secondaryButton)].filter(button => button?.href);
  const actions = configuredActions.length ? configuredActions : [{ href: "/shop", label: tr(lang, "اكتشفي المزيد", "Discover more") }];
  return (
    <section className="rose-editorial-panel atelier-section" data-reveal>
      <div className="rose-editorial-photo">
        <Image
          src={
            data.roseImageUrl ||
            data.backgroundImageUrl ||
            "/editorial/scarves.webp"
          }
          alt={data.roseImageAlt || data.title || ""}
          fill
          sizes="(max-width:760px) 100vw, 30vw"
        />
      </div>
      <div className="rose-editorial-copy">
        <span className="atelier-eyebrow">
          {data.eyebrow ||
            data.badge ||
            (tr(lang, "لمسات تكمل إطلالتكِ", "THE LITTLE DETAILS"))}
        </span>
        <h2 data-edit={data.roseTitle ? "roseTitle" : "title"}>{data.roseTitle || polishCopy(data.title)}</h2>
        <p data-edit="subtitle">{polishCopy(data.subtitle)}</p>
        <div className="rose-editorial-actions">{actions.map((button, i) => <Link key={i} className="atelier-text-link" href={button!.href!}>{button!.label || (tr(lang, "اكتشفي المزيد", "Discover more"))}<Icon name="arrow" /></Link>)}</div>
      </div>
      <Icon name="spark" className="editorial-flower" />
    </section>
  );
}

export function RoseFaq({
  title,
  items,
}: {
  title?: string;
  items: { question: string; answer: string }[];
}) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const entries = ar ? completeFaq(items) : items;
  return (
    <section className="rose-faq atelier-section" data-reveal>
      <div>
        <span className="atelier-eyebrow">
          {tr(lang, "يسعدنا مساعدتكِ", "LET’S MAKE IT EASY")}
        </span>
        <h2 data-edit="title">
          {(title && polishCopy(title)) || (tr(lang, "أسئلتكِ، بكل حب.", "A little help, with love."))}
        </h2>
      </div>
      <div className="rose-faq-items">
        {entries.map((item, i) => (
          <details key={i} data-part="faq-item">
            <summary>
              <span data-edit={i < items.length ? `items.${i}.question` : undefined}>{item.question}</span>
              <span aria-hidden="true">+</span>
            </summary>
            <p data-edit={i < items.length ? `items.${i}.answer` : undefined}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function RoseCta({
  data,
}: {
  data: {
    title?: string;
    subtitle?: string;
    text?: string;
    buttonLabel?: string;
    buttonHref?: string;
    button?: { label?: string; href?: string };
  };
}) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const n = useNames();
  return (
    <section className="atelier-manifesto rose-cta">
      <span className="atelier-eyebrow" data-reveal>
        {tr(lang, `من ${n.store}، بكل حب`, "FROM {0}, WITH LOVE", [n.store.toUpperCase()])}
      </span>
      <Icon name="spark" className="manifesto-star" width="42" height="42" />
      <h2 data-reveal data-edit="title" data-edit-lines="">
        {polishCopy(data.title) ||
          (tr(lang, "كوني أنتِ.\nالجمال في تفاصيلكِ.", "Be yourself.\nBeautifully, always."))}
      </h2>
      <p data-reveal data-edit={data.text && !data.subtitle ? "text" : "subtitle"}>
        {polishCopy(data.subtitle || data.text) ||
          (tr(lang, "أناقة محتشمة، وخيارات تليق بيومكِ. نحن هنا لنساعدكِ في العثور على ما تحبين.", "Modern modesty, made for your everyday. We’re here to help you find the pieces you love."))}
      </p>
      <Link
        href={data.buttonHref || data.button?.href || "/contact"}
        className="atelier-button button-dark"
        data-reveal
        data-edit-box={data.buttonLabel || !data.button?.label ? "buttonLabel" : "button.label"}
        data-edit-link={data.buttonLabel || !data.button?.label ? "buttonHref" : "button.href"}
      >
        <span data-edit={data.buttonLabel || !data.button?.label ? "buttonLabel" : "button.label"} data-edit-boxed="">
          {polishCopy(data.buttonLabel || data.button?.label) ||
            (tr(lang, "تواصلي معنا", "Let’s stay in touch"))}
        </span>
        <Icon name="arrow" />
      </Link>
    </section>
  );
}

/** Three promises shoppers look for before their first order. */
export function RoseTrustBar() {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const n = useNames();
  const items: { icon: "truck" | "cash" | "swap"; title: string; text: string }[] = [
    { icon: "truck", title: tr(lang, "توصيل لكل البلاد", "Delivery nationwide"), text: tr(lang, "لباب بيتكِ أينما كنتِ", "To your door, wherever you are") },
    { icon: "cash", title: tr(lang, "الدفع عند الاستلام", "Cash on delivery"), text: tr(lang, "ادفعي عندما تصلكِ القطعة", "Pay when your piece arrives") },
    { icon: "swap", title: tr(lang, "استبدال سهل", "Easy exchange"), text: tr(lang, "المقاس لم يناسبكِ؟ نستبدله لكِ", "Wrong size? We’ll swap it") },
  ];
  return (
    <ul className="rose-trust-bar" aria-label={tr(lang, `لماذا ${n.store}`, "Why {0}", [n.store])}>
      {items.map((item) => (
        <li key={item.icon}>
          <span className="trust-icon"><Icon name={item.icon} /></span>
          <span>
            <strong>{item.title}</strong>
            <small>{item.text}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Real customer words, entered in Admin as a Testimonials section. */
export function RoseTestimonials({
  title,
  items,
}: {
  title?: string;
  items: { name?: string; role?: string; quote?: string; imageUrl?: string; avatarUrl?: string }[];
}) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const quotes = items.filter((t) => t?.quote);
  if (!quotes.length) return null;
  return (
    <section className="rose-testimonials atelier-section">
      <div className="atelier-section-heading" data-reveal>
        <div>
          <span className="atelier-eyebrow">{tr(lang, "من زبوناتنا", "FROM OUR CUSTOMERS")}</span>
          <h2 data-edit="title">{(title && polishCopy(title)) || (tr(lang, "بكلماتهنّ.", "In their words."))}</h2>
        </div>
      </div>
      <div className="testimonial-grid">
        {quotes.map((t, i) => (
          <figure key={i} className="testimonial-card" data-reveal>
            <span className="testimonial-mark" aria-hidden="true">”</span>
            <blockquote data-edit={`items.${items.indexOf(t)}.quote`}>{polishCopy(t.quote)}</blockquote>
            <figcaption>
              {t.avatarUrl || t.imageUrl ? (
                <Image src={(t.avatarUrl || t.imageUrl)!} alt="" width={40} height={40} />
              ) : (
                <span className="testimonial-initial" aria-hidden="true">{String(t.name || "؟").trim().charAt(0)}</span>
              )}
              <span>
                <strong data-edit={`items.${items.indexOf(t)}.name`}>{t.name}</strong>
                {t.role ? <small>{t.role}</small> : null}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/** Invitation to the store’s real Instagram, shown when no testimonials are published yet. */
/** `words`: the admin's words for this scene (the opening's roseScenes.instagram, see sceneWords.ts). */
export function RoseInstagram({ images = [], words }: { images?: string[]; words?: unknown }) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const n = useNames();
  const store = useRoseStore();
  if (!store.instagram) return null;
  const handle = (() => {
    try {
      return "@" + new URL(store.instagram).pathname.split("/").filter(Boolean)[0];
    } catch {
      return "Instagram";
    }
  })();
  const tiles = Array.from(new Set([...images, "/editorial/hijab-campaign.webp", "/editorial/scarves.webp", "/editorial/rose-campaign-poster.webp"])).slice(0, 4);
  return (
    <section className="rose-instagram atelier-section" data-reveal>
      <div className="instagram-copy">
        <span className="atelier-eyebrow">
          <Icon name="camera" />
          <span data-edit={sceneField("instagram", ["eyebrow"], lang)}>{sceneWord(words, ["eyebrow"], lang, tr(lang, "على إنستغرام", "ON INSTAGRAM"))}</span>
        </span>
        <h2 data-edit={sceneField("instagram", ["title"], lang)}>{sceneWord(words, ["title"], lang, tr(lang, "تابعينا على إنستغرام.", "Follow us on Instagram."))}</h2>
        <p data-edit={sceneField("instagram", ["text"], lang)}>
          {sceneWord(words, ["text"], lang, tr(lang, `نشارك هناك القطع الجديدة أولاً بأول. شاركينا إطلالتكِ بقطع ${n.store} مع الإشارة إلى حسابنا.`, "Follow our new arrivals and share your {0} look by tagging us.", [n.store]))}
        </p>
        <a href={store.instagram} target="_blank" rel="noreferrer" className="atelier-button button-dark" dir="ltr" data-part="handle">
          {handle}
          <Icon name="arrow" />
        </a>
      </div>
      <a href={store.instagram} target="_blank" rel="noreferrer" className="instagram-tiles" aria-label={tr(lang, "افتحي حسابنا على إنستغرام", "Open our Instagram")} data-part="tiles">
        {tiles.map((src, i) => (
          <span key={src + i} className="instagram-tile" data-part="tile">
            <Image src={src} alt="" fill sizes="(max-width:760px) 45vw, 18vw" />
          </span>
        ))}
      </a>
    </section>
  );
}
