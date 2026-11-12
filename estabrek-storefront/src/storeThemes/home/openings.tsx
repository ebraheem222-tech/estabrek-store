"use client";
/**
 * The designs' openings (phase 11.2): one for each page skeleton (dna/axes.ts ARCHETYPES), so
 * two designs never open the same way. Each reads the store's HERO section like the classic
 * openings (heroes.tsx: words, buttons, picture, the editor's marks) and some bring the store's
 * own products or categories up into the opening itself (a catalogue, a menu board, aisles…).
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type JSX } from "react";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/words";
import { Backdrop, HeroArt } from "../svg/kits";
import type { StoreTheme } from "../types";
import { marqueeWords } from "../words";
import { Buttons, Picture, Title, words, type HeroInput } from "./heroes";
import type { ThProduct } from "./sections";

export type OpeningInput = HeroInput & { products: ThProduct[] };
type W = ReturnType<typeof words>;
const href = (p: ThProduct) => (p.slug ? `/p/${encodeURIComponent(p.slug)}` : "/shop");
const catHref = (c: { slug: string }) => `/c/${encodeURIComponent(c.slug)}`;

function Eyebrow({ w }: { w: W }) {
  return (
    <p className="th-eyebrow" data-th-reveal="block">
      <span data-edit="eyebrow">{w.eyebrow}</span>
    </p>
  );
}
function Sub({ w }: { w: W }) {
  return (
    <p className="th-hero-sub" data-th-reveal="block" data-edit="subtitle">
      {w.subtitle}
    </p>
  );
}
/** A product's picture (or the theme's drawing when it has none). */
function Shot({ p, kit, sizes }: { p?: ThProduct; kit: StoreTheme["svg"]; sizes: string }) {
  return p?.imageUrl ? <Image src={p.imageUrl} alt={p.title} fill sizes={sizes} className="th-cover" /> : <HeroArt kit={kit} />;
}
function Copy({ w, buttons = true }: { w: W; buttons?: boolean }) {
  return (
    <>
      <Eyebrow w={w} />
      <Title lines={w.lines} />
      <Sub w={w} />
      {buttons ? <Buttons w={w} /> : null}
    </>
  );
}

/* A film: the picture across the whole screen, the words in the middle. */
function Cinema(i: OpeningInput) {
  const w = words(i);
  return (
    <section className="th-hero th-o th-o-cinema">
      <Picture w={w} kit={i.theme.svg} sizes="100vw" className="th-o-cinema-media" fallback={i.productImage} />
      <div className="th-o-cinema-copy">
        <Copy w={w} />
      </div>
      <span className="th-o-scroll" aria-hidden />
    </section>
  );
}

/* A bento grid: the words, the picture, products, categories and promises, each in a tile. */
function Bento(i: OpeningInput) {
  const w = words(i);
  const [a, b] = i.products.filter((p) => p.imageUrl);
  const promises = marqueeWords(i.theme, i.lang).slice(0, 3);
  return (
    <section className="th-hero th-o th-o-bento">
      <div className="th-o-tile th-o-bento-words">
        <Copy w={w} />
      </div>
      <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 92vw, 40vw" className="th-o-tile th-o-bento-pic" fallback={i.productImage} />
      {[a, b].map((p, n) => (
        <Link key={n} href={p ? href(p) : "/shop"} className={`th-o-tile th-o-bento-product th-o-bento-p${n}`} data-th-reveal="block">
          <Shot p={p} kit={i.theme.svg} sizes="(max-width: 900px) 46vw, 20vw" />
          {p ? <span className="th-o-bento-label">{p.title}</span> : null}
        </Link>
      ))}
      <div className="th-o-tile th-o-bento-cats" data-th-reveal="block">
        {(i.categories.length ? i.categories.slice(0, 5) : []).map((c) => (
          <Link key={c.id} href={catHref(c)} className="th-chip">
            {c.name}
          </Link>
        ))}
        {!i.categories.length ? <span className="th-o-bento-count">{i.counts.products}+</span> : null}
      </div>
      <ul className="th-o-tile th-o-bento-promises" data-th-reveal="block">
        {promises.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </section>
  );
}

/* A magazine: a masthead, a title across, a lead picture and the contents beside it. */
function Magazine(i: OpeningInput) {
  const w = words(i);
  return (
    <section className="th-hero th-o th-o-magazine">
      <header className="th-o-masthead" data-th-reveal="block">
        <span>{tr(i.lang, "العدد", "Issue")} 01</span>
        <span className="th-o-masthead-name">{w.eyebrow}</span>
        <span>{tr(i.lang, "هالموسم", "This season")}</span>
      </header>
      <Title lines={w.lines} className="th-hero-title th-o-magazine-title" />
      <div className="th-o-magazine-body">
        <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 92vw, 60vw" className="th-o-magazine-pic" fallback={i.productImage} />
        <aside className="th-o-magazine-side" data-th-reveal="block">
          <Sub w={w} />
          {i.categories.length ? (
            <ol className="th-o-contents">
              {i.categories.slice(0, 5).map((c, n) => (
                <li key={c.id}>
                  <Link href={catHref(c)}>
                    <span>{String(n + 1).padStart(2, "0")}</span>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ol>
          ) : null}
          <Buttons w={w} />
        </aside>
      </div>
    </section>
  );
}

/* A catalogue: a short banner with a search and the categories, then the products straight away. */
function Catalog(i: OpeningInput) {
  const w = words(i);
  return (
    <section className="th-hero th-o th-o-catalog">
      <div className="th-o-catalog-bar">
        <div>
          <Eyebrow w={w} />
          <Title lines={[w.lines.join(" ")]} className="th-hero-title th-o-catalog-title" />
        </div>
        <form action="/search" className="th-o-search" data-th-reveal="block" role="search">
          <input name="q" type="search" placeholder={tr(i.lang, "دوّر على منتج…", "Search a product…")} aria-label={tr(i.lang, "بحث", "Search")} />
          <button type="submit" className="th-button">{tr(i.lang, "دوّر", "Search")}</button>
        </form>
      </div>
      {i.categories.length ? (
        <nav className="th-o-chips" data-th-reveal="block" aria-label={tr(i.lang, "الأقسام", "Categories")}>
          {i.categories.slice(0, 10).map((c) => (
            <Link key={c.id} href={catHref(c)} className="th-chip">
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}
      <div className="th-o-catalog-grid" data-th-stagger="">
        {(i.products.length ? i.products.slice(0, 8) : Array.from({ length: 4 }, () => undefined)).map((p, n) => (
          <Link key={p?.id ?? n} href={p ? href(p) : "/shop"} className="th-o-catalog-item">
            <span className="th-o-catalog-pic">
              <Shot p={p} kit={i.theme.svg} sizes="(max-width: 640px) 46vw, 22vw" />
            </span>
            <span className="th-o-catalog-name">{p?.title ?? w.subtitle}</span>
            {p?.priceText ? <span className="th-card-price">{p.priceText}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* A story: the picture stays while chapters scroll past it. */
function Story(i: OpeningInput) {
  const w = words(i);
  const chapters = marqueeWords(i.theme, i.lang).slice(0, 3);
  return (
    <section className="th-hero th-o th-o-story">
      <div className="th-o-story-pic">
        <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 92vw, 46vw" className="th-o-story-media" fallback={i.productImage} />
      </div>
      <div className="th-o-story-chapters">
        <div className="th-o-chapter">
          <Copy w={w} />
        </div>
        {chapters.map((c, n) => (
          <div key={c} className="th-o-chapter" data-th-reveal="block">
            <span className="th-o-chapter-n">{String(n + 2).padStart(2, "0")}</span>
            <h2 className="th-section-title">{c}</h2>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Rails: the words in a line, the products sliding under them. */
function Rail(i: OpeningInput) {
  const w = words(i);
  return (
    <section className="th-hero th-o th-o-rail">
      <div className="th-o-rail-head">
        <div>
          <Eyebrow w={w} />
          <Title lines={w.lines} />
        </div>
        <div>
          <Sub w={w} />
          <Buttons w={w} ghost={false} />
        </div>
      </div>
      <div className="th-o-rail-track" data-th-stagger="">
        {(i.products.length ? i.products.slice(0, 10) : Array.from({ length: 4 }, () => undefined)).map((p, n) => (
          <Link key={p?.id ?? n} href={p ? href(p) : "/shop"} className="th-o-rail-item">
            <span className="th-o-rail-pic">
              <Shot p={p} kit={i.theme.svg} sizes="(max-width: 640px) 70vw, 26vw" />
            </span>
            <span className="th-o-rail-name">{p?.title ?? "—"}</span>
            {p?.priceText ? <span className="th-card-price">{p.priceText}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* Specs: the product in the middle, its promises around it like callouts. */
function Spec(i: OpeningInput) {
  const w = words(i);
  const callouts = marqueeWords(i.theme, i.lang).slice(0, 4);
  return (
    <section className="th-hero th-o th-o-spec">
      <Backdrop kit={i.theme.svg} />
      <div className="th-o-spec-copy">
        <Copy w={w} />
      </div>
      <div className="th-o-spec-stage">
        <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 80vw, 36vw" className="th-o-spec-pic" fallback={i.productImage} />
        {callouts.map((c, n) => (
          <span key={c} className={`th-o-callout th-o-callout-${n}`} data-th-reveal="block">
            <i aria-hidden />
            {c}
          </span>
        ))}
      </div>
    </section>
  );
}

/* A menu board: categories as headings, products as lines with their prices. */
function Menu(i: OpeningInput) {
  const w = words(i);
  const heads = i.categories.length ? i.categories.slice(0, 3) : [{ id: "all", name: tr(i.lang, "المنيو", "The menu"), slug: "" }];
  const items = i.products.slice(0, 12);
  const under = (n: number) => {
    const own = items.filter((p) => p.category && p.category === heads[n].name);
    return own.length ? own : items.filter((_, k) => k % heads.length === n);
  };
  return (
    <section className="th-hero th-o th-o-menu">
      <div className="th-o-menu-copy">
        <Copy w={w} />
      </div>
      <div className="th-o-menu-board" data-th-reveal="block">
        {heads.map((h, n) => (
          <div key={h.id} className="th-o-menu-col">
            <h2 className="th-o-menu-head">{h.slug ? <Link href={catHref(h)}>{h.name}</Link> : h.name}</h2>
            <ul>
              {under(n).slice(0, 5).map((p) => (
                <li key={p.id || p.slug}>
                  <Link href={href(p)}>
                    <span>{p.title}</span>
                    <span className="th-o-menu-dots" aria-hidden />
                    <span className="th-o-menu-price">{p.priceText ?? ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Booking first: the words beside a card that picks a service, a day and a time. */
function Booking(i: OpeningInput) {
  const w = words(i);
  const services = i.categories.length ? i.categories.slice(0, 4).map((c) => c.name) : marqueeWords(i.theme, i.lang).slice(0, 3);
  const days = [tr(i.lang, "اليوم", "Today"), tr(i.lang, "بكرا", "Tomorrow"), tr(i.lang, "بعد بكرا", "In two days")];
  const times = ["10:00", "12:30", "15:00", "17:30"];
  const [pick, setPick] = useState({ service: 0, day: 0, time: 1 });
  return (
    <section className="th-hero th-o th-o-booking">
      <Picture w={w} kit={i.theme.svg} sizes="100vw" className="th-o-booking-bg" fallback={i.productImage} />
      <div className="th-o-booking-copy">
        <Eyebrow w={w} />
        <Title lines={w.lines} />
        <Sub w={w} />
      </div>
      <div className="th-o-booking-card" data-th-reveal="block">
        <p className="th-o-booking-label">{tr(i.lang, "شو بدك؟", "What would you like?")}</p>
        <div className="th-o-booking-row">
          {services.map((s, n) => (
            <button key={s} type="button" className="th-chip" aria-pressed={pick.service === n} onClick={() => setPick({ ...pick, service: n })}>
              {s}
            </button>
          ))}
        </div>
        <p className="th-o-booking-label">{tr(i.lang, "إيمتى؟", "When?")}</p>
        <div className="th-o-booking-row">
          {days.map((d, n) => (
            <button key={d} type="button" className="th-chip" aria-pressed={pick.day === n} onClick={() => setPick({ ...pick, day: n })}>
              {d}
            </button>
          ))}
        </div>
        <div className="th-o-booking-row">
          {times.map((t, n) => (
            <button key={t} type="button" className="th-chip" aria-pressed={pick.time === n} onClick={() => setPick({ ...pick, time: n })} dir="ltr">
              {t}
            </button>
          ))}
        </div>
        <Link href={w.primary.href} className="th-button" data-edit="primaryButton.label" data-edit-link="primaryButton.href">
          {w.primary.label}
        </Link>
      </div>
    </section>
  );
}

/* A lookbook: pictures in a wall of uneven heights, the words on the first. */
function Lookbook(i: OpeningInput) {
  const w = words(i);
  const pics = i.products.filter((p) => p.imageUrl).slice(0, 5);
  return (
    <section className="th-hero th-o th-o-lookbook">
      <div className="th-o-look th-o-look-lead">
        <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 92vw, 40vw" className="th-o-look-media" fallback={i.productImage} />
        <div className="th-o-look-words">
          <Copy w={w} />
        </div>
      </div>
      {pics.map((p, n) => (
        <Link key={p.id || p.slug || n} href={href(p)} className={`th-o-look th-o-look-${n}`} data-th-reveal="image">
          <Shot p={p} kit={i.theme.svg} sizes="(max-width: 900px) 46vw, 22vw" />
          <span className="th-o-look-name">{p.title}</span>
        </Link>
      ))}
    </section>
  );
}

/** Hours, minutes and seconds left of today (drawn after the page is shown, so the server and the browser agree). */
function useLeft() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      setLeft(Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)));
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);
  return left;
}
/* A countdown: the clock of today's offer, big, with the deals under it. */
function Countdown(i: OpeningInput) {
  const w = words(i);
  const left = useLeft();
  const parts = left === null ? ["--", "--", "--"] : [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, "0"));
  return (
    <section className="th-hero th-o th-o-countdown">
      <Backdrop kit={i.theme.svg} />
      <Eyebrow w={w} />
      <Title lines={w.lines} />
      <div className="th-o-clock" dir="ltr" role="timer" aria-label={tr(i.lang, "الوقت الباقي", "Time left")} data-th-reveal="block">
        {parts.map((v, n) => (
          <span key={n} className="th-o-clock-part">
            <b>{v}</b>
            <small>{[tr(i.lang, "ساعة", "hours"), tr(i.lang, "دقيقة", "minutes"), tr(i.lang, "ثانية", "seconds")][n]}</small>
          </span>
        ))}
      </div>
      <Sub w={w} />
      <Buttons w={w} ghost={false} />
      {i.products.length ? (
        <div className="th-o-deals" data-th-stagger="">
          {i.products.slice(0, 4).map((p, n) => (
            <Link key={p.id || p.slug || n} href={href(p)} className="th-o-deal">
              <span className="th-o-deal-pic">
                <Shot p={p} kit={i.theme.svg} sizes="(max-width: 640px) 46vw, 18vw" />
              </span>
              <span>{p.title}</span>
              {p.priceText ? <b>{p.priceText}</b> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* A collage: pictures scattered and tilted round the words, with stickers. */
function Collage(i: OpeningInput) {
  const w = words(i);
  const pics = i.products.filter((p) => p.imageUrl).slice(0, 4);
  const stickers = marqueeWords(i.theme, i.lang).slice(0, 2);
  return (
    <section className="th-hero th-o th-o-collage">
      <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 60vw, 30vw" className="th-o-scrap th-o-scrap-lead" fallback={i.productImage} />
      {pics.map((p, n) => (
        <Link key={p.id || p.slug || n} href={href(p)} className={`th-o-scrap th-o-scrap-${n}`} data-th-reveal="image">
          <Shot p={p} kit={i.theme.svg} sizes="(max-width: 900px) 40vw, 18vw" />
        </Link>
      ))}
      {stickers.map((s, n) => (
        <span key={s} className={`th-o-sticker th-o-sticker-${n}`} data-th-reveal="block">
          {s}
        </span>
      ))}
      <div className="th-o-collage-words">
        <Copy w={w} />
      </div>
    </section>
  );
}

/* A gallery wall: framed pictures, the words as the museum's label. */
function Gallery(i: OpeningInput) {
  const w = words(i);
  const pics = i.products.filter((p) => p.imageUrl).slice(0, 5);
  return (
    <section className="th-hero th-o th-o-gallery">
      <div className="th-o-wall">
        <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 92vw, 38vw" className="th-o-frame th-o-frame-lead" fallback={i.productImage} />
        {pics.map((p, n) => (
          <Link key={p.id || p.slug || n} href={href(p)} className={`th-o-frame th-o-frame-${n}`} data-th-reveal="image">
            <Shot p={p} kit={i.theme.svg} sizes="(max-width: 900px) 40vw, 16vw" />
          </Link>
        ))}
      </div>
      <div className="th-o-label" data-th-reveal="block">
        <Copy w={w} />
      </div>
    </section>
  );
}

/* Half and half: a picture the height of the screen, the words and promises beside it. */
function Split(i: OpeningInput) {
  const w = words(i);
  return (
    <section className="th-hero th-o th-o-split">
      <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 100vw, 50vw" className="th-o-split-pic" fallback={i.productImage} />
      <div className="th-o-split-words">
        <Copy w={w} />
        <ul className="th-o-split-list" data-th-stagger="">
          {marqueeWords(i.theme, i.lang).slice(0, 4).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* A map: the store's places (or its categories) as pins, a card to find it. */
function MapOpening(i: OpeningInput) {
  const w = words(i);
  const pins = (i.categories.length ? i.categories.map((c) => c.name) : marqueeWords(i.theme, i.lang)).slice(0, 5);
  const spots = [[22, 34], [58, 22], [74, 58], [36, 70], [84, 30]];
  return (
    <section className="th-hero th-o th-o-map">
      <div className="th-o-map-land" aria-hidden>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M8 40C20 18 46 12 62 20S92 26 94 46S80 88 56 90S12 84 8 62Z" className="th-o-map-shape" />
          <path d="M14 52C34 46 52 58 70 48S90 44 92 50" className="th-o-map-road" />
          <path d="M30 20C34 40 44 56 40 88" className="th-o-map-road" />
        </svg>
      </div>
      {pins.map((p, n) => (
        <span key={p} className="th-o-pin" style={{ insetInlineStart: `${spots[n][0]}%`, top: `${spots[n][1]}%` }} data-th-reveal="block">
          <i aria-hidden />
          {p}
        </span>
      ))}
      <div className="th-o-map-card">
        <Copy w={w} />
      </div>
    </section>
  );
}

/* A showroom without models: the product on a lit podium. */
function Showroom(i: OpeningInput) {
  const w = words(i);
  return (
    <section className="th-hero th-o th-o-showroom">
      <span className="th-o-beam" aria-hidden />
      <div className="th-o-podium">
        <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 70vw, 30vw" className="th-o-podium-pic" fallback={i.productImage} />
        <span className="th-o-podium-base" aria-hidden />
      </div>
      <div className="th-o-showroom-words">
        <Copy w={w} />
      </div>
    </section>
  );
}

/* Minimal: room to breathe, one picture, a thin line. */
function Minimal(i: OpeningInput) {
  const w = words(i);
  return (
    <section className="th-hero th-o th-o-minimal">
      <div className="th-o-minimal-words">
        <Eyebrow w={w} />
        <Title lines={w.lines} />
        <span className="th-o-hairline" aria-hidden />
        <Sub w={w} />
        <Link href={w.primary.href} className="th-text-link" data-edit="primaryButton.label" data-edit-link="primaryButton.href">
          {w.primary.label}
          <span className="th-arrow" aria-hidden>
            →
          </span>
        </Link>
      </div>
      <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 70vw, 26vw" className="th-o-minimal-pic" fallback={i.productImage} />
    </section>
  );
}

/* A playground: big round tiles, bubbles and the categories as balloons. */
function Playground(i: OpeningInput) {
  const w = words(i);
  return (
    <section className="th-hero th-o th-o-playground">
      <span className="th-o-bubble th-o-bubble-0" aria-hidden />
      <span className="th-o-bubble th-o-bubble-1" aria-hidden />
      <span className="th-o-bubble th-o-bubble-2" aria-hidden />
      <div className="th-o-play-words">
        <Copy w={w} />
      </div>
      <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 80vw, 34vw" className="th-o-play-pic" fallback={i.productImage} />
      {i.categories.length ? (
        <div className="th-o-balloons" data-th-stagger="">
          {i.categories.slice(0, 6).map((c) => (
            <Link key={c.id} href={catHref(c)} className="th-o-balloon">
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* A market: the aisles first, each category a tile with its number, a search over them. */
function Market(i: OpeningInput) {
  const w = words(i);
  const aisles = i.categories.length ? i.categories.slice(0, 8) : [];
  return (
    <section className="th-hero th-o th-o-market">
      <div className="th-o-market-head">
        <div>
          <Eyebrow w={w} />
          <Title lines={w.lines} />
          <Sub w={w} />
        </div>
        <form action="/search" className="th-o-search" role="search" data-th-reveal="block">
          <input name="q" type="search" placeholder={tr(i.lang, "شو بدك اليوم؟", "What do you need today?")} aria-label={tr(i.lang, "بحث", "Search")} />
          <button type="submit" className="th-button">{tr(i.lang, "دوّر", "Search")}</button>
        </form>
      </div>
      <div className="th-o-aisles" data-th-stagger="">
        {aisles.length
          ? aisles.map((c, n) => (
              <Link key={c.id} href={catHref(c)} className="th-o-aisle">
                <span className="th-o-aisle-n">{tr(i.lang, "ممر", "Aisle")} {n + 1}</span>
                <span className="th-o-aisle-name">{c.name}</span>
              </Link>
            ))
          : marqueeWords(i.theme, i.lang).slice(0, 4).map((x, n) => (
              <span key={x} className="th-o-aisle">
                <span className="th-o-aisle-n">{n + 1}</span>
                <span className="th-o-aisle-name">{x}</span>
              </span>
            ))}
      </div>
    </section>
  );
}

/* Steps: one, two, three, with the picture. */
function Recipe(i: OpeningInput) {
  const w = words(i);
  const steps = marqueeWords(i.theme, i.lang).slice(0, 3);
  return (
    <section className="th-hero th-o th-o-recipe">
      <div className="th-o-recipe-words">
        <Copy w={w} />
      </div>
      <Picture w={w} kit={i.theme.svg} sizes="(max-width: 900px) 80vw, 34vw" className="th-o-recipe-pic" fallback={i.productImage} />
      <ol className="th-o-steps" data-th-stagger="">
        {steps.map((s, n) => (
          <li key={s}>
            <b>{n + 1}</b>
            {s}
          </li>
        ))}
      </ol>
    </section>
  );
}

const OPENINGS: Record<string, (i: OpeningInput) => JSX.Element> = {
  cinema: Cinema, bento: Bento, magazine: Magazine, catalog: Catalog, story: Story, rail: Rail, spec: Spec, menu: Menu, booking: Booking, lookbook: Lookbook,
  countdown: Countdown, collage: Collage, gallery: Gallery, split: Split, map: MapOpening, showroom: Showroom, minimal: Minimal, playground: Playground, market: Market, recipe: Recipe,
};
/** The opening of a design's page skeleton (null for a classic theme). */
export function DesignOpening(input: OpeningInput & { archetype: string; lang: Lang }) {
  const O = OPENINGS[input.archetype];
  return O ? <O {...input} /> : null;
}
/** Skeletons that bring one of the store's sections up right after the opening (the others show the products or categories in the opening itself). */
export { LEADS_WITH } from "./openingLeads";
