/**
 * Draws one node of a page tree (and its children) on the server. Styles come
 * from the page's CSS block (pageTree/css.ts) through the `pt-<id>` class; this
 * file only builds the markup. Links to the shop's own pages get the language
 * prefix; links and file addresses are checked again before they're used.
 */
import type { ReactNode } from "react";
import type { ProductMini } from "@/cms/types";
import type { CatalogCategory } from "@/lib/catalog";
import { withLang, type LangConfig } from "@/lib/i18n";
import type { SeasonEdit } from "@/lib/seasonalEdits";
import type { StoryChapter } from "@/lib/collectionStories";
import { RoseSeasons } from "@/components/cinematic/RoseSeasons";
import { RoseCollectionStory } from "@/components/cinematic/RoseCollectionStory";
import { RoseInstagram } from "@/components/cinematic/RoseSections";
import { framed, motionOf, pickText, safeHref, safeSrc, sliderSeconds, sliderSlides, type TreeLang, type TreeNode } from "./tree";
import { TreeIcon } from "./icons";
import { ArtView, safeArt } from "./svgArt";
import { SpinView } from "@/components/cinematic/ProductSpin";
import { spinFor } from "@/components/cinematic/spinData";
import { SliderControls, type SliderWords } from "./SliderControls";

export type TreeCtx = {
  lang: TreeLang;
  main: TreeLang;
  cfg: LangConfig;
  productLookup?: Record<string, ProductMini>;
  renderProductCard?: (productId: string) => ReactNode;
  /** Draws an old-style section (the form element uses the newsletter/contact ones). */
  renderSection?: (section: { id: string; type: string; data: Record<string, unknown>; order: number; isVisible: boolean }) => ReactNode;
  categories?: CatalogCategory[];
  seasons?: SeasonEdit[];
  stories?: StoryChapter[];
  instagram?: string[];
  /** The products 360° elements show, with their views (null = not found). */
  spinProducts?: Record<string, { title: string; spins?: unknown } | null>;
};

const HOVER_CLASS: Record<string, string> = { glow: "pt-hv-glow", zoom: "pt-hv-zoom" };
const cls = (n: TreeNode, ...more: string[]) =>
  ["pt", `pt-${n.type}`, /^[A-Za-z0-9_-]{1,40}$/.test(n.id) ? `pt-${n.id}` : "", HOVER_CLASS[motionOf(n)?.hover?.kind ?? ""] ?? "", ...more].filter(Boolean).join(" ");

/** The slider's own words, in the page's language (screen readers hear most of them). */
const SLIDER_WORDS: Record<TreeLang, SliderWords & { carousel: string }> = {
  ar: { carousel: "عرض صور", slide: "شريحة", prev: "الشريحة السابقة", next: "الشريحة التالية", pause: "إيقاف مؤقت", play: "تشغيل" },
  en: { carousel: "Slideshow", slide: "Slide", prev: "Previous slide", next: "Next slide", pause: "Pause", play: "Play" },
  he: { carousel: "מצגת", slide: "שקופית", prev: "השקופית הקודמת", next: "השקופית הבאה", pause: "השהיה", play: "הפעלה" },
};

export function TreeNodeView({ node, ctx }: { node: TreeNode; ctx: TreeCtx }): ReactNode {
  const p = node.props ?? {};
  const say = (t: unknown) => pickText(t, ctx.lang, ctx.main);
  const link = (h: unknown) => {
    const v = safeHref(h);
    if (!v) return null;
    return v.startsWith("/") ? withLang(v, ctx.lang, ctx.cfg) : v;
  };
  // How it moves goes to the motion engine (TreeMotion) as data; an animated layer is drawn inside it.
  const motion = motionOf(node);
  const mark = { "data-tree-node": node.id, ...(motion ? { "data-pt-motion": JSON.stringify(motion) } : {}), ...(motion?.enter ? { "data-pt-enter": "" } : {}) };
  const fx = motion?.fx ? <span className={`pt-fx pt-fx-${motion.fx.kind}`} aria-hidden="true" /> : null;
  const kids = () => (
    <>
      {(node.children ?? []).map((c) => <TreeNodeView key={c.id} node={c} ctx={ctx} />)}
      {fx}
    </>
  );

  switch (node.type) {
    case "section": {
      const Tag = (["header", "footer", "aside"].includes(p.tag) ? p.tag : "section") as "section";
      const anchor = typeof p.anchor === "string" && /^[A-Za-z][\w-]{0,40}$/.test(p.anchor) ? p.anchor : undefined;
      return (
        <Tag className={cls(node)} id={anchor} {...mark}>
          {p.contained ? <div className="pt-inner">{kids()}</div> : kids()}
        </Tag>
      );
    }
    case "grid":
    case "stack":
    case "columns":
    case "cell":
      return <div className={cls(node)} {...mark}>{kids()}</div>;
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(p.level) || 2));
      const H = `h${level}` as "h2";
      return <H className={cls(node)} {...mark}>{say(p.text)}{fx}</H>;
    }
    case "text":
      return <p className={cls(node)} {...mark}>{say(p.text)}{fx}</p>;
    case "image": {
      const src = safeSrc(p.src);
      if (!src) return null;
      const img = framed(node, motion) ? (
        <span className={cls(node, "pt-frame")} {...mark}>
          <img className="pt-frame-media" src={src} alt={say(p.alt)} loading="lazy" decoding="async" />
          {fx}
        </span>
      ) : (
        <img className={cls(node)} {...mark} src={src} alt={say(p.alt)} loading="lazy" decoding="async" />
      );
      const to = link(p.href);
      return to ? <a className="pt-image-link" href={to}>{img}</a> : img;
    }
    case "button": {
      const to = link(p.href);
      const variant = ["solid", "outline", "link"].includes(p.variant) ? p.variant : "solid";
      return (
        <a className={cls(node, `pt-btn pt-btn-${variant}`)} {...mark} href={to ?? "#"} {...(p.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {say(p.label)}
          {fx}
        </a>
      );
    }
    case "video": {
      const src = safeSrc(p.src);
      if (!src) return null;
      const poster = safeSrc(p.poster) ?? undefined;
      const inFrame = framed(node, motion);
      const clip = (
        <video
          className={inFrame ? "pt-frame-media" : cls(node)}
          {...(inFrame ? {} : mark)}
          src={src}
          poster={poster}
          autoPlay={p.autoplay === true}
          muted={p.muted === true || p.autoplay === true}
          loop={p.loop === true}
          controls={p.controls !== false && p.autoplay !== true}
          playsInline
          preload="metadata"
        />
      );
      return inFrame ? (
        <div className={cls(node, "pt-frame")} {...mark}>
          {clip}
          {fx}
        </div>
      ) : (
        clip
      );
    }
    case "slider": {
      // A row that snaps: it swipes and scrolls without scripts; SliderControls adds the buttons.
      const slides = sliderSlides(p);
      if (!slides.length) return null;
      const w = SLIDER_WORDS[ctx.lang] ?? SLIDER_WORDS.ar;
      const { carousel, ...words } = w;
      return (
        <div className={cls(node)} {...mark} role="region" aria-roledescription={carousel} aria-label={carousel}>
          <div className="pt-slides" tabIndex={0}>
            {slides.map((s, i) => {
              const caption = say(s.caption);
              const to = link(s.href);
              const media =
                s.kind === "video" ? (
                  <video className="pt-slide-media" src={s.src} aria-label={say(s.alt) || caption || undefined} autoPlay muted loop playsInline preload="metadata" />
                ) : (
                  <img className="pt-slide-media" src={s.src} alt={say(s.alt)} loading="lazy" decoding="async" draggable={false} />
                );
              const inner = (
                <>
                  {media}
                  {caption ? <span className="pt-slide-caption">{caption}</span> : null}
                </>
              );
              return (
                <div key={i} className="pt-slide" role="group" aria-roledescription={w.slide} aria-label={`${i + 1} / ${slides.length}`}>
                  {to ? <a className="pt-slide-link" href={to}>{inner}</a> : inner}
                </div>
              );
            })}
          </div>
          {fx}
          <SliderControls count={slides.length} seconds={sliderSeconds(p.autoplay)} loop={p.loop !== false} arrows={p.arrows !== false} dots={p.dots !== false} words={words} />
        </div>
      );
    }
    case "product360": {
      // A product's 360° view: that colour's own, else the one for every colour. Nothing to show = an empty place.
      const product = typeof p.productId === "string" ? ctx.spinProducts?.[p.productId] : null;
      const spin = product ? spinFor(product.spins, typeof p.itemId === "string" ? p.itemId : null) : null;
      return (
        <div className={cls(node)} {...mark}>
          {spin ? <SpinView spin={spin} lang={ctx.lang} label={say(p.label) || product!.title} auto={p.auto !== false} testId={`spin-${node.id}`} /> : null}
          {spin ? fx : null}
        </div>
      );
    }
    case "svg": {
      // A drawing: with words it's a picture for screen readers, without them it's decoration.
      const art = safeArt(p.art);
      if (!art) return null;
      const label = say(p.label);
      return (
        <span className={cls(node)} {...mark} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
          <ArtView art={art} prefix={node.id} />
          {fx}
        </span>
      );
    }
    case "spacer":
      return <div className={cls(node)} {...mark} aria-hidden="true" />;
    case "divider":
      return <hr className={cls(node)} {...mark} />;
    case "icon": {
      const label = say(p.label);
      return (
        <span className={cls(node)} {...mark} role={label ? undefined : "img"} aria-label={label ? undefined : String(p.name ?? "")}>
          <TreeIcon name={String(p.name ?? "")} />
          {label ? <span>{label}</span> : null}
        </span>
      );
    }
    case "products": {
      const ids: string[] = Array.isArray(p.productIds) ? p.productIds.filter((x: unknown) => typeof x === "string") : [];
      const shown = ids.filter((id) => ctx.productLookup?.[id]).slice(0, Math.min(48, Number(p.limit) || 8));
      const title = say(p.title);
      if (!shown.length && !title) return null;
      return (
        <div className={cls(node)} {...mark}>
          {title ? <h2 className="pt-block-title">{title}</h2> : null}
          <div className={p.layout === "row" ? "pt-products-row" : "pt-products-grid"}>
            {shown.map((id) => <div key={id}>{ctx.renderProductCard?.(id)}</div>)}
          </div>
        </div>
      );
    }
    case "categories": {
      const all = ctx.categories ?? [];
      const wanted: string[] = Array.isArray(p.ids) ? p.ids : [];
      const list = (wanted.length ? wanted.map((id) => all.find((c) => c.id === id)).filter(Boolean) : all.filter((c) => !c.parentId)) as CatalogCategory[];
      const title = say(p.title);
      const shown = list.slice(0, Math.min(24, Number(p.limit) || 6));
      if (!shown.length) return null;
      return (
        <div className={cls(node)} {...mark}>
          {title ? <h2 className="pt-block-title">{title}</h2> : null}
          <div className="pt-tiles">
            {shown.map((c) => {
              const img = safeSrc(c.iconUrl);
              return (
                <a key={c.id} className="pt-tile" href={withLang(`/c/${encodeURIComponent(c.slug)}`, ctx.lang, ctx.cfg)}>
                  {img ? <img src={img} alt="" loading="lazy" decoding="async" /> : <span className="pt-tile-blank" aria-hidden="true" />}
                  <span>{c.name}</span>
                </a>
              );
            })}
          </div>
        </div>
      );
    }
    case "form": {
      const type = p.kind === "contact" ? "CONTACT" : "NEWSLETTER";
      const title = say(p.title);
      return (
        <div className={cls(node)} {...mark}>
          {ctx.renderSection?.({ id: `form-${node.id}`, type, data: title ? { title } : {}, order: 0, isVisible: true })}
        </div>
      );
    }
    case "roseBlock": {
      // data-rose-block: the editor picks the scene and what's inside it as on the home.
      if (p.block === "seasons" && ctx.seasons?.length) return <div {...mark} data-rose-block="seasons"><RoseSeasons seasons={ctx.seasons} /></div>;
      if (p.block === "stories" && ctx.stories?.length) return <div {...mark} data-rose-block="stories"><RoseCollectionStory chapters={ctx.stories} /></div>;
      if (p.block === "instagram" && ctx.instagram?.length) return <div {...mark} data-rose-block="instagram"><RoseInstagram images={ctx.instagram} /></div>;
      return null;
    }
    default:
      // "page" and "legacy" never reach here: the page draws its children and its old sections itself.
      return null;
  }
}
