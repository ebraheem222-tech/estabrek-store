"use client";
/**
 * The openings. Each reads the store's HERO section (words, buttons, picture) and
 * falls back to the theme's own words and drawing; the words carry the editor's marks
 * (data-edit) so the new editor writes on them in place.
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/words";
import { Backdrop, HeroArt } from "../svg/kits";
import type { StoreTheme } from "../types";
import { say } from "../words";

export type HeroInput = {
  theme: StoreTheme;
  lang: Lang;
  d: Record<string, any>;
  /** A product picture for openings that stage one when the store has none of its own. */
  productImage?: string | null;
  counts: { products: number; categories: number };
  categories: Array<{ id: string; name: string; slug: string }>;
};

function words(input: HeroInput) {
  const { d, theme, lang } = input;
  const title: string = (typeof d.title === "string" && d.title.trim()) || say(theme.copy.title, lang);
  const image: { url: string | null; path: string } = d.backgroundImageUrl
    ? { url: d.backgroundImageUrl, path: "backgroundImageUrl" }
    : d.roseImageUrl
      ? { url: d.roseImageUrl, path: "roseImageUrl" }
      : { url: null, path: "backgroundImageUrl" };
  return {
    eyebrow: (typeof d.eyebrow === "string" && d.eyebrow) || (typeof d.badge === "string" && d.badge) || say(theme.copy.eyebrow, lang),
    lines: title.split("\n").filter(Boolean),
    subtitle: (typeof d.subtitle === "string" && d.subtitle) || say(theme.copy.subtitle, lang),
    primary: { label: d.primaryButton?.label || say(theme.copy.cta, lang), href: d.primaryButton?.href || "/shop" },
    secondary: d.secondaryButton?.label ? { label: d.secondaryButton.label, href: d.secondaryButton.href || "/shop" } : null,
    image,
  };
}

function Title({ lines, className = "th-hero-title" }: { lines: string[]; className?: string }) {
  return (
    <h1 className={className} data-th-reveal="headline" data-edit="title" data-edit-lines="">
      {lines.map((l, i) => (
        <span key={i} className="th-title-line">
          {l}
        </span>
      ))}
    </h1>
  );
}

function Buttons({ w, ghost = true }: { w: ReturnType<typeof words>; ghost?: boolean }) {
  return (
    <div className="th-hero-actions" data-th-reveal="block">
      <Link href={w.primary.href} className="th-button" data-th-magnetic="" data-edit="primaryButton.label" data-edit-link="primaryButton.href">
        {w.primary.label}
        <span className="th-arrow" aria-hidden>
          →
        </span>
      </Link>
      {w.secondary && ghost ? (
        <Link href={w.secondary.href} className="th-button th-button-ghost" data-edit="secondaryButton.label" data-edit-link="secondaryButton.href">
          {w.secondary.label}
        </Link>
      ) : null}
    </div>
  );
}

function Picture({ w, kit, sizes, className, fallback, priority = true }: { w: ReturnType<typeof words>; kit: StoreTheme["svg"]; sizes: string; className: string; fallback?: string | null; priority?: boolean }) {
  const url = w.image.url || fallback || null;
  return (
    <div className={className} data-th-reveal="image" data-edit-media={w.image.path}>
      {url ? <Image src={url} alt="" fill priority={priority} sizes={sizes} className="th-cover" data-th-parallax="" /> : <HeroArt kit={kit} />}
    </div>
  );
}

/* ------------------------------------------------------------- Atelier */
function Editorial(input: HeroInput) {
  const w = words(input);
  const { lang, categories } = input;
  return (
    <section className="th-hero th-hero-editorial">
      <Backdrop kit={input.theme.svg} />
      <div className="th-hero-copy">
        <p className="th-eyebrow" data-th-reveal="block">
          <span className="th-rule" aria-hidden />
          <span data-edit="eyebrow">{w.eyebrow}</span>
        </p>
        <Title lines={w.lines} />
        <p className="th-hero-sub" data-th-reveal="block" data-edit="subtitle">
          {w.subtitle}
        </p>
        <Buttons w={w} />
        {categories.length ? (
          <ol className="th-index" data-th-stagger="">
            {categories.slice(0, 4).map((c, i) => (
              <li key={c.id}>
                <Link href={`/c/${encodeURIComponent(c.slug)}`}>
                  <span className="th-index-n">{String(i + 1).padStart(2, "0")}</span>
                  {c.name}
                </Link>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
      <div className="th-hero-frame">
        <span className="th-frame-line" aria-hidden />
        <Picture w={w} kit={input.theme.svg} sizes="(max-width: 900px) 92vw, 44vw" className="th-hero-media" />
        <span className="th-hero-caption">{tr(lang, "الموسم الجديد", "New season")}</span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Circuit */
function Spotlight(input: HeroInput) {
  const w = words(input);
  const { lang, theme, counts } = input;
  const chips = theme.copy.marquee.slice(0, 3).map((m) => say(m, lang));
  return (
    <section className="th-hero th-hero-spotlight">
      <Backdrop kit={theme.svg} />
      <div className="th-hero-copy">
        <p className="th-eyebrow th-chip" data-th-reveal="block">
          <span className="th-dot" aria-hidden />
          <span data-edit="eyebrow">{w.eyebrow}</span>
        </p>
        <Title lines={w.lines} />
        <p className="th-hero-sub" data-th-reveal="block" data-edit="subtitle">
          {w.subtitle}
        </p>
        <Buttons w={w} />
        <dl className="th-stats" data-th-stagger="">
          <div>
            <dt>{tr(lang, "منتج", "Products")}</dt>
            <dd data-th-count={String(Math.max(counts.products, 1))}>{Math.max(counts.products, 1)}</dd>
          </div>
          <div>
            <dt>{tr(lang, "فئة", "Categories")}</dt>
            <dd data-th-count={String(Math.max(counts.categories, 1))}>{Math.max(counts.categories, 1)}</dd>
          </div>
          <div>
            <dt>{tr(lang, "دعم", "Support")}</dt>
            <dd>24/7</dd>
          </div>
        </dl>
      </div>
      <div className="th-stage">
        <span className="th-stage-glow" aria-hidden />
        <Picture w={w} kit={theme.svg} fallback={input.productImage} sizes="(max-width: 900px) 80vw, 40vw" className="th-hero-media" />
        <ul className="th-floating" aria-hidden>
          {chips.map((c, i) => (
            <li key={i} data-th-tilt="" style={{ ["--i" as string]: i }}>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Arcade */
function Glitch(input: HeroInput) {
  const w = words(input);
  const { theme } = input;
  return (
    <section className="th-hero th-hero-glitch">
      <Backdrop kit={theme.svg} />
      <span className="th-scanlines" aria-hidden />
      <div className="th-hero-copy">
        <p className="th-eyebrow th-hud" data-th-reveal="block">
          <span data-edit="eyebrow">{w.eyebrow}</span>
        </p>
        <Title lines={w.lines} className="th-hero-title th-neon-title" />
        <p className="th-hero-sub" data-th-reveal="block" data-edit="subtitle">
          {w.subtitle}
        </p>
        <Buttons w={w} />
      </div>
      <div className="th-hero-frame th-angled">
        <Picture w={w} kit={theme.svg} fallback={input.productImage} sizes="(max-width: 900px) 90vw, 40vw" className="th-hero-media" />
        <span className="th-hud-corner th-hud-tl" aria-hidden />
        <span className="th-hud-corner th-hud-br" aria-hidden />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Petal */
function Bloom(input: HeroInput) {
  const w = words(input);
  const { theme, lang } = input;
  return (
    <section className="th-hero th-hero-bloom">
      <Backdrop kit={theme.svg} />
      <div className="th-hero-copy">
        <p className="th-eyebrow" data-th-reveal="block" data-edit="eyebrow">
          {w.eyebrow}
        </p>
        <Title lines={w.lines} />
        <p className="th-hero-sub" data-th-reveal="block" data-edit="subtitle">
          {w.subtitle}
        </p>
        <Buttons w={w} />
        <ul className="th-pills" data-th-stagger="">
          {theme.copy.marquee.slice(0, 3).map((m, i) => (
            <li key={i}>{say(m, lang)}</li>
          ))}
        </ul>
      </div>
      <div className="th-arch-wrap">
        <Picture w={w} kit={theme.svg} fallback={input.productImage} sizes="(max-width: 900px) 80vw, 38vw" className="th-hero-media th-arch" />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Sugar */
function Playful(input: HeroInput) {
  const w = words(input);
  const { theme, lang } = input;
  const ring = `${say(theme.copy.marquee[0], lang)} • ${say(theme.copy.marquee[1] ?? theme.copy.marquee[0], lang)} • `;
  return (
    <section className="th-hero th-hero-playful">
      <Backdrop kit={theme.svg} />
      <div className="th-hero-copy">
        <p className="th-eyebrow th-sticker" data-th-reveal="block" data-edit="eyebrow">
          {w.eyebrow}
        </p>
        <Title lines={w.lines} />
        <p className="th-hero-sub" data-th-reveal="block" data-edit="subtitle">
          {w.subtitle}
        </p>
        <Buttons w={w} />
      </div>
      <div className="th-hero-frame th-squircle-wrap">
        <Picture w={w} kit={theme.svg} fallback={input.productImage} sizes="(max-width: 900px) 80vw, 38vw" className="th-hero-media th-squircle" />
        <svg className="th-ring" viewBox="0 0 200 200" data-th-spin="" aria-hidden focusable="false">
          <defs>
            <path id="th-ring-path" d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0" />
          </defs>
          <circle cx="100" cy="100" r="96" fill="var(--th-strong)" />
          {/* Right-to-left words run back from the end of the circle, else they fall off its start. */}
          <text fontSize="17" fontWeight="700" fill="var(--th-on-strong)" letterSpacing="1" direction={lang === "en" ? "ltr" : "rtl"}>
            <textPath href="#th-ring-path" startOffset={lang === "en" ? "0%" : "100%"}>
              {ring + ring}
            </textPath>
          </text>
        </svg>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Gallery */
// A museum wall: the picture in a deep mount, a wall label beside it, the rooms below.
function Gallery(input: HeroInput) {
  const w = words(input);
  const { lang, theme, categories } = input;
  return (
    <section className="th-hero th-hero-gallery">
      <Backdrop kit={theme.svg} />
      <div className="th-hero-copy">
        <p className="th-eyebrow" data-th-reveal="block">
          <span className="th-rule" aria-hidden />
          <span data-edit="eyebrow">{w.eyebrow}</span>
        </p>
        <Title lines={w.lines} />
        <p className="th-hero-sub" data-th-reveal="block" data-edit="subtitle">
          {w.subtitle}
        </p>
        <Buttons w={w} />
        {categories.length ? (
          <ol className="th-rooms" data-th-stagger="">
            {categories.slice(0, 3).map((c, i) => (
              <li key={c.id}>
                <Link href={`/c/${encodeURIComponent(c.slug)}`}>
                  <span className="th-index-n">{tr(lang, `القاعة ${i + 1}`, "Room {0}", [String(i + 1)])}</span>
                  <span>{c.name}</span>
                </Link>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
      <figure className="th-gallery-wall">
        <div className="th-gallery-frame">
          <Picture w={w} kit={theme.svg} fallback={input.productImage} sizes="(max-width: 900px) 80vw, 40vw" className="th-hero-media" />
        </div>
        <figcaption className="th-wall-label" data-th-reveal="block">
          <strong>{w.lines[0]}</strong>
          <span>{say(theme.copy.marquee[0], lang)}</span>
        </figcaption>
      </figure>
    </section>
  );
}

/* ---------------------------------------------------------------- Split */
// Half a page of colour with the words, half a picture: sport, street, bold fashion.
function Split(input: HeroInput) {
  const w = words(input);
  const { theme, lang } = input;
  return (
    <section className="th-hero th-hero-split">
      <div className="th-split-panel">
        <Backdrop kit={theme.svg} />
        <div className="th-hero-copy">
          <p className="th-eyebrow th-tag" data-th-reveal="block" data-edit="eyebrow">
            {w.eyebrow}
          </p>
          <Title lines={w.lines} />
          <p className="th-hero-sub" data-th-reveal="block" data-edit="subtitle">
            {w.subtitle}
          </p>
          <Buttons w={w} />
          <ul className="th-split-facts" data-th-stagger="">
            {theme.copy.marquee.slice(0, 3).map((m, i) => (
              <li key={i}>{say(m, lang)}</li>
            ))}
          </ul>
        </div>
        <span className="th-split-number" aria-hidden>
          01
        </span>
      </div>
      <div className="th-split-media">
        <Picture w={w} kit={theme.svg} fallback={input.productImage} sizes="(max-width: 900px) 100vw, 50vw" className="th-hero-media" />
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Mono */
// The words do the work: a very large title, a small picture, thin lines.
function Mono(input: HeroInput) {
  const w = words(input);
  const { theme, lang, counts } = input;
  return (
    <section className="th-hero th-hero-mono">
      <Backdrop kit={theme.svg} />
      <p className="th-eyebrow" data-th-reveal="block" data-edit="eyebrow">
        {w.eyebrow}
      </p>
      <Title lines={w.lines} />
      <div className="th-mono-row">
        <div className="th-hero-copy">
          <p className="th-hero-sub" data-th-reveal="block" data-edit="subtitle">
            {w.subtitle}
          </p>
          <Buttons w={w} />
        </div>
        <dl className="th-mono-facts" data-th-stagger="">
          <div>
            <dt>{tr(lang, "منتج", "Products")}</dt>
            <dd data-th-count={String(Math.max(counts.products, 1))}>{Math.max(counts.products, 1)}</dd>
          </div>
          <div>
            <dt>{say(theme.copy.marquee[0], lang)}</dt>
            <dd>✓</dd>
          </div>
        </dl>
        <Picture w={w} kit={theme.svg} fallback={input.productImage} sizes="(max-width: 900px) 70vw, 24vw" className="th-hero-media th-mono-media" />
      </div>
    </section>
  );
}

const HEROES: Record<StoreTheme["hero"], (i: HeroInput) => ReactNode> = {
  editorial: Editorial,
  spotlight: Spotlight,
  glitch: Glitch,
  bloom: Bloom,
  playful: Playful,
  gallery: Gallery,
  split: Split,
  mono: Mono,
  // A gaming theme's stage (StageHero) without its 3D settings: the neon opening.
  stage: Glitch,
};

export function ThemeHero(input: HeroInput) {
  const Hero = HEROES[input.theme.hero];
  return <Hero {...input} />;
}
