"use client";
/**
 * The home's sections under a store theme: one markup for every theme, dressed by the
 * theme's CSS (app/store-themes.css, by data-th-card and the theme's variables). They take
 * the same section data as the rose design and keep the editor's marks (data-edit).
 */
import Image from "next/image";
import Link from "next/link";
import type { ProductMini } from "@/cms/types";
import { QuickAddButton } from "@/components/QuickAddButton";
import { RoseBadge } from "@/components/cinematic/RoseBadge";
import type { Lang } from "@/lib/i18n";
import type { ProductBadge } from "@/lib/productBadges";
import { tr } from "@/lib/words";
import { Backdrop, Divider } from "../svg/kits";
import type { StoreTheme } from "../types";
import { say } from "../words";

export type ThProduct = ProductMini & { category?: string; colors?: string[]; secondaryImageUrl?: string | null; badge?: ProductBadge | null };

function Head({ title, subtitle, link }: { title: string; subtitle?: string; link?: { href: string; label: string } }) {
  return (
    <header className="th-section-head" data-th-reveal="block">
      <div>
        <h2 className="th-section-title" data-th-reveal="headline" data-edit="title">
          {title}
        </h2>
        {subtitle ? (
          <p className="th-section-sub" data-edit="subtitle">
            {subtitle}
          </p>
        ) : null}
      </div>
      {link ? (
        <Link href={link.href} className="th-text-link">
          {link.label}
          <span className="th-arrow" aria-hidden>
            →
          </span>
        </Link>
      ) : null}
    </header>
  );
}

export function ThProducts({ theme, lang, products, title, subtitle, slider }: { theme: StoreTheme; lang: Lang; products: ThProduct[]; title?: string; subtitle?: string; slider?: boolean }) {
  return (
    <section className="th-section th-products">
      <Head title={title || say(theme.copy.productsTitle, lang)} subtitle={subtitle} link={{ href: "/shop", label: tr(lang, "كل المنتجات", "All products") }} />
      {products.length ? (
        <div className={`th-grid ${slider ? "th-reel" : ""}`} data-th-stagger="">
          {products.map((p, i) => (
            <article key={p.id || p.slug || i} className="th-card" data-th-tilt="">
              <Link href={p.slug ? `/p/${encodeURIComponent(p.slug)}` : "/shop"} className="th-card-link">
                <div className={`th-card-media${p.secondaryImageUrl ? " has-alt" : ""}`}>
                  <RoseBadge badge={p.badge} />
                  {p.imageUrl ? (
                    <>
                      <Image src={p.imageUrl} alt={p.title} fill sizes="(max-width:640px) 46vw, (max-width:1024px) 30vw, 23vw" className="th-cover th-card-main" />
                      {p.secondaryImageUrl ? <Image src={p.secondaryImageUrl} alt="" aria-hidden fill sizes="(max-width:640px) 46vw, 23vw" className="th-cover th-card-alt" /> : null}
                    </>
                  ) : (
                    <span className="th-card-empty" aria-hidden />
                  )}
                </div>
                <div className="th-card-info">
                  {p.category ? <span className="th-card-cat">{p.category}</span> : null}
                  <h3 className="th-card-title">{p.title}</h3>
                  {p.priceText ? <span className="th-card-price">{p.priceText}</span> : null}
                </div>
              </Link>
              {p.colors?.length ? (
                <div className="th-card-colours" aria-label={tr(lang, "ألوان متاحة", "Available colors")}>
                  {p.colors.slice(0, 5).map((c, j) => (
                    <span key={j} style={{ backgroundColor: c }} />
                  ))}
                </div>
              ) : null}
              {p.id || p.slug ? (
                <div className="th-card-add">
                  <QuickAddButton productId={p.id} slug={p.slug} buttonLabel={tr(lang, "إضافة سريعة", "Quick add")} />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="th-empty">{tr(lang, "المنتجات بتظهر هون أول ما تنضاف.", "Products show here as soon as they are added.")}</p>
      )}
    </section>
  );
}

type Tile = { label?: string; title?: string; imageUrl?: string; href?: string; slug?: string };
export function ThCollections({ theme, lang, title, subtitle, items }: { theme: StoreTheme; lang: Lang; title?: string; subtitle?: string; items: Tile[] }) {
  return (
    <section className="th-section th-collections">
      <Head title={title || say(theme.copy.collectionsTitle, lang)} subtitle={subtitle} />
      <div className="th-tiles" data-th-stagger="">
        {items.slice(0, 8).map((it, i) => {
          const name = it.label || it.title || "";
          const href = it.href || (it.slug ? `/c/${encodeURIComponent(it.slug)}` : "/shop");
          return (
            <Link key={i} href={href} className="th-tile" data-edit-media={`items.${i}.imageUrl`}>
              {it.imageUrl ? <Image src={it.imageUrl} alt="" fill sizes="(max-width:640px) 46vw, 25vw" className="th-cover" /> : <span className="th-tile-empty" aria-hidden />}
              <span className="th-tile-label" data-edit={it.label !== undefined ? `items.${i}.label` : `items.${i}.title`}>
                {name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** The running strip: the theme's promises, or the store's categories. */
export function ThMarquee({ items }: { items: string[] }) {
  if (!items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="th-marquee" data-th-marquee="" aria-hidden>
      <div className="th-marquee-track">
        {[...row, ...row].map((t, i) => (
          <span key={i} className="th-marquee-item">
            {t}
            <span className="th-marquee-dot" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function ThFaq({ title, items, lang }: { title?: string; items: Array<{ question?: string; answer?: string }>; lang: Lang }) {
  return (
    <section className="th-section th-faq">
      <Head title={title || tr(lang, "أسئلة متكررة", "Questions, answered")} />
      <div className="th-faq-list" data-th-stagger="">
        {items.map((q, i) => (
          <details key={i} className="th-faq-item">
            <summary data-edit={`items.${i}.question`}>{q.question}</summary>
            <p data-edit={`items.${i}.answer`}>{q.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function ThCta({ theme, d, lang }: { theme: StoreTheme; d: Record<string, any>; lang: Lang }) {
  const label = d.buttonLabel || d.button?.label || say(theme.copy.cta, lang);
  const href = d.buttonHref || d.button?.href || "/shop";
  return (
    <section className="th-section th-cta">
      <div className="th-cta-box" data-th-reveal="block">
        <Backdrop kit={theme.svg} />
        <h2 className="th-cta-title" data-th-reveal="headline" data-edit="title" data-edit-lines="">
          {String(d.title || say(theme.copy.title, lang))
            .split("\n")
            .map((l, i) => (
              <span key={i} className="th-title-line">
                {l}
              </span>
            ))}
        </h2>
        {d.subtitle || d.text ? (
          <p className="th-cta-sub" data-edit={d.subtitle ? "subtitle" : "text"}>
            {d.subtitle || d.text}
          </p>
        ) : null}
        <Link href={href} className="th-button" data-th-magnetic="" data-edit={d.buttonLabel ? "buttonLabel" : "button.label"}>
          {label}
          <span className="th-arrow" aria-hidden>
            →
          </span>
        </Link>
      </div>
    </section>
  );
}

export function ThTestimonials({ title, items, lang }: { title?: string; items: Array<{ quote?: string; text?: string; name?: string; author?: string }>; lang: Lang }) {
  return (
    <section className="th-section th-reviews">
      <Head title={title || tr(lang, "شو بيحكوا زباينّا", "What customers say")} />
      <div className="th-review-list" data-th-stagger="">
        {items.slice(0, 6).map((r, i) => (
          <figure key={i} className="th-review">
            <blockquote data-edit={r.quote !== undefined ? `items.${i}.quote` : `items.${i}.text`}>{r.quote || r.text}</blockquote>
            <figcaption data-edit={`items.${i}.name`}>{r.name || r.author}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/** A second HERO further down: a panel with its words and picture. */
export function ThPanel({ d, theme, lang }: { d: Record<string, any>; theme: StoreTheme; lang: Lang }) {
  const img = d.backgroundImageUrl || d.roseImageUrl;
  return (
    <section className="th-section th-panel">
      <div className="th-panel-media" data-th-reveal="image" data-edit-media={d.backgroundImageUrl ? "backgroundImageUrl" : "roseImageUrl"}>
        {img ? <Image src={img} alt="" fill sizes="(max-width:900px) 92vw, 46vw" className="th-cover" data-th-parallax="" /> : <Backdrop kit={theme.svg} />}
      </div>
      <div className="th-panel-copy">
        <h2 className="th-section-title" data-th-reveal="headline" data-edit="title">
          {d.title || say(theme.copy.eyebrow, lang)}
        </h2>
        {d.subtitle ? (
          <p className="th-section-sub" data-th-reveal="block" data-edit="subtitle">
            {d.subtitle}
          </p>
        ) : null}
        {d.primaryButton?.label ? (
          <Link href={d.primaryButton.href || "/shop"} className="th-button" data-edit="primaryButton.label">
            {d.primaryButton.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function ThVideo({ d }: { d: Record<string, any> }) {
  return (
    <section className="th-section th-video" data-th-reveal="image">
      <video src={d.url} poster={d.posterUrl || undefined} autoPlay muted loop playsInline preload="metadata" data-edit-media="url" data-edit-media-kind="video" />
    </section>
  );
}

export function ThDivider({ theme }: { theme: StoreTheme }) {
  return <Divider kit={theme.svg} />;
}
