/**
 * Draws one node of a page tree (and its children) on the server. Styles come
 * from the page's CSS block (pageTree/css.ts) through the `pt-<id>` class; this
 * file only builds the markup. Links to the shop's own pages get the language
 * prefix; links and file addresses are checked again before they're used.
 */
import { cloneElement, isValidElement, type CSSProperties, type ReactNode } from "react";
import type { ProductMini } from "@/cms/types";
import type { CatalogCategory } from "@/lib/catalog";
import { withLang, type LangConfig } from "@/lib/i18n";
import type { SeasonEdit } from "@/lib/seasonalEdits";
import type { StoryChapter } from "@/lib/collectionStories";
import { RoseSeasons } from "@/components/cinematic/RoseSeasons";
import { RoseCollectionStory } from "@/components/cinematic/RoseCollectionStory";
import { RoseInstagram } from "@/components/cinematic/RoseSections";
import { framed, motionOf, pickText, safeHref, safeSrc, sliderSeconds, sliderSlides, styleClass, type TreeLang, type TreeNode } from "./tree";
import { richNodes } from "./rich";
import { TreeIcon } from "./icons";
import { ArtView, safeArt } from "./svgArt";
import { color } from "./css";
import { particlesOf } from "./particles";
import { sceneOf } from "./scene";
import { SceneView } from "./SceneView";
import { model3dOf } from "./model3d";
import { Model3dSpot } from "./Model3dSpot";
import { BlockView, WORDS as BLOCK_WORDS } from "./blocks";
import { PopupView } from "./Interactive";
import { SpinView } from "@/components/cinematic/ProductSpin";
import { spinFor } from "@/components/cinematic/spinData";
import { SliderControls, type SliderWords } from "./SliderControls";
import { sliderSettings, sliderLooksOf } from "./sliderEffects";
import { InstrumentView } from "./InstrumentView";
import { instrumentOf } from "./instrument";
import { ChartView } from "./ChartView";
import { ClockView } from "./ClockView";
import { FilterGalleryBlock } from "./FilterGalleryBlock";
import { ScheduleView, ComparisonView } from "./ReferenceDataViews";
import { scheduleOf, comparisonOf } from "./referenceData";
import { DeckView } from "./DeckView";
import { showcaseOf } from "./showcase";
import { ShowcaseView } from "./ShowcaseView";
import { StableWidgetView } from "./StableWidgetView";
import { nodeEdges, withDecoration } from "./NodeDecorations";
import { CommerceCartPart } from "./CommerceCart";
import { CommerceShop, type CommerceShopData } from "./CommerceShop";
import { CardDesignScope } from "@/components/VisualControlsProvider";
import { layersOf, scrollSceneOf, triggersOf } from "./pieces";

export type TreeCtx = {
  lang: TreeLang;
  main: TreeLang;
  cfg: LangConfig;
  commerce?: { preview: boolean; shop?: CommerceShopData };
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
  /** Drawn inside a scroll scene (what waits for its moment stays unseen until the scene starts). */
  inScene?: boolean;
};

const HOVER_CLASS: Record<string, string> = { glow: "pt-hv-glow", zoom: "pt-hv-zoom", spotlight: "pt-hv-spot", ripple: "pt-hv-ripple" };
const cls = (n: TreeNode, ...more: string[]) =>
  ["pt", `pt-${n.type}`, /^[A-Za-z0-9_-]{1,40}$/.test(n.id) ? `pt-${n.id}` : "", styleClass(n.props?.styleId), HOVER_CLASS[motionOf(n)?.hover?.kind ?? ""] ?? "", n.type !== "popup" && (n.props?.edges?.top || n.props?.edges?.bottom) ? "pt-has-edges" : "", ...more].filter(Boolean).join(" ");

/** The slider's own words, in the page's language (screen readers hear most of them). */
const SLIDER_WORDS: Record<TreeLang, SliderWords & { carousel: string }> = {
  ar: { carousel: "عرض صور", slide: "شريحة", prev: "الشريحة السابقة", next: "الشريحة التالية", pause: "إيقاف مؤقت", play: "تشغيل" },
  en: { carousel: "Slideshow", slide: "Slide", prev: "Previous slide", next: "Next slide", pause: "Pause", play: "Play" },
  he: { carousel: "מצגת", slide: "שקופית", prev: "השקופית הקודמת", next: "השקופית הבאה", pause: "השהיה", play: "הפעלה" },
};

const STRUCTURAL_VIEWS = new Set(["page", "section", "grid", "stack", "columns", "cell"]);
const PROP_WIDGETS = new Set(["instrument","product360","model3d","lottie","rive","svg"]);
export function TreeNodeView({ node, ctx }: { node: TreeNode; ctx: TreeCtx }): ReactNode {
  // A changed widget configuration owns a new view; styles and unrelated edits
  // retain its client state. Containers keep stable identity for their children.
  const rendered = renderNode({ node, ctx });
  const view = node.type === "section" || node.type === "popup" ? rendered : withDecoration(rendered, nodeEdges(node.id, node.props?.edges));
  const { partLooks: _partLooks, ...configuration } = node.props ?? {};
  const keyed = STRUCTURAL_VIEWS.has(node.type) || !isValidElement(view) ? view : cloneElement(view, { key: `${node.id}:${JSON.stringify(configuration)}` });
  return PROP_WIDGETS.has(node.type) ? <StableWidgetView version={JSON.stringify([{ ...node, props: configuration },ctx.lang,ctx.main,ctx.cfg,node.type === "product360" ? ctx.spinProducts : null])}>{keyed}</StableWidgetView> : keyed;
}

function renderNode({ node, ctx }: { node: TreeNode; ctx: TreeCtx }): ReactNode {
  const p = node.props ?? {};
  const say = (t: unknown) => pickText(t, ctx.lang, ctx.main);
  const link = (h: unknown) => {
    const v = safeHref(h);
    if (!v) return null;
    return v.startsWith("/") ? withLang(v, ctx.lang, ctx.cfg) : v;
  };
  // Words with formatting ([b]…[/b], links…) when the element says so; plain words otherwise.
  const words = (t: unknown) => (p.rich === true ? richNodes(say(t), link) : say(t));
  // How it moves goes to the motion engine (TreeMotion) as data; an animated layer is drawn inside it.
  const motion = motionOf(node);
  // Triggers go as data too, their links and words already in this page's language (TreeTriggers runs them).
  const triggers = triggersOf(p.triggers, link, say);
  const mark = { "data-tree-node": node.id, ...(p.partLooks ? { "data-pt-part-targets": Object.keys(p.partLooks).join("|") } : {}), ...(p.interactions ? { "data-interactions": JSON.stringify(p.interactions) } : {}), ...(motion ? { "data-pt-motion": JSON.stringify(motion), "data-pt-look-version": JSON.stringify(node.style ?? {}) } : {}), ...(motion?.enter && !motion.cue ? { "data-pt-enter": "" } : {}), ...(triggers.length ? { "data-pt-triggers": JSON.stringify(triggers) } : {}), ...(ctx.inScene && motion?.cue && motion.cue.from > 0 ? { "data-pt-cue-wait": "" } : {}) };
  // Its two extra layers (behind its content, or in front), drawn when it has a look or keyframes for them.
  const layers = layersOf(p.layers);
  const piece = (part: "before" | "after") => (layers?.[part] || motion?.keys?.parts[part] ? <span className={`pt-pc pt-pc-${part}${layers?.[part]?.front ? " pt-pc-front" : ""}`} aria-hidden="true" /> : null);
  const before = piece("before");
  const after = piece("after");
  // Its words in a piece of their own when its keyframes move them apart from it.
  const inner = (content: ReactNode) => (motion?.keys?.parts.inner ? <span className="pt-pc-in">{content}</span> : content);
  // An animated layer, or the light that follows the mouse (TreeMotion moves it).
  const fx = motion?.fx ? <span className={`pt-fx pt-fx-${motion.fx.kind}`} aria-hidden="true" /> : motion?.hover?.kind === "spotlight" ? <span className="pt-spot" aria-hidden="true" /> : null;
  const kids = (inside: TreeCtx = ctx) => (
    <>
      {before}
      {(node.children ?? []).map((c) => <TreeNodeView key={c.id} node={c} ctx={inside} />)}
      {fx}
      {after}
    </>
  );

  switch (node.type) {
    case "shop":
      return <div className={cls(node)} {...mark}>{fx}<CardDesignScope value={p.cardDesign}><CommerceShop data={ctx.commerce?.shop} preview={ctx.commerce?.preview === true} options={p} lang={ctx.lang} /></CardDesignScope></div>;
    case "cartItems":
    case "cartSummary":
    case "cartCheckout":
      return <div className={cls(node)} {...mark}>{fx}<CommerceCartPart part={node.type === "cartItems" ? "items" : node.type === "cartSummary" ? "summary" : "checkout"} /></div>;
    case "section": {
      const Tag = (["header", "footer", "aside"].includes(p.tag) ? p.tag : "section") as "section";
      const anchor = typeof p.anchor === "string" && /^[A-Za-z][\w-]{0,40}$/.test(p.anchor) ? p.anchor : undefined;
      const edges = nodeEdges(node.id, p.edges);
      // Particles behind its content (TreeMedia draws them), in its colour.
      const dots = particlesOf(p.particles);
      const scene = sceneOf(p.scene);
      const tint = dots?.color ? color(dots.color) : undefined;
      return (
        <Tag className={`${cls(node)}${edges.length || dots || scene ? " pt-has-edges" : ""}`} id={anchor} {...mark}>
          {scene ? <SceneView spec={scene} primary={color(scene.color ?? "accent")!} secondary={color(scene.secondary ?? "text")!} /> : null}
          {dots ? <div className="pt-particles" data-pt-particles={JSON.stringify({ kind: dots.kind, amount: dots.amount, speed: dots.speed })} style={tint ? { color: tint } : undefined} aria-hidden="true" /> : null}
          {edges}
          {p.contained ? <div className="pt-inner">{kids()}</div> : kids()}
        </Tag>
      );
    }
    case "popup": {
      // Over the page when its moment comes (PopupView); its content like a section's.
      const one = <T extends string>(v: unknown, list: readonly T[], def: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : def);
      const num = (v: unknown, max: number, def: number) => (typeof v === "number" && v >= 0 && v <= max ? v : def);
      const spec = {
        trigger: one(p.trigger, ["load", "scroll", "exit", "click"] as const, "load"),
        delay: num(p.delay, 120, 3),
        scroll: num(p.scroll, 100, 50),
        anchor: typeof p.anchor === "string" && /^[A-Za-z][\w-]{0,40}$/.test(p.anchor) ? p.anchor : undefined,
        often: one(p.often, ["always", "visit", "day", "once"] as const, "visit"),
        size: one(p.size, ["s", "m", "l"] as const, "m"),
        place: one(p.place, ["center", "bottom", "corner"] as const, "center"),
      };
      return (
        <div className={cls(node)} {...mark}>
          <PopupView id={node.id} spec={spec} label={say(p.label)} close={(BLOCK_WORDS[ctx.lang] ?? BLOCK_WORDS.ar).close} decoration={nodeEdges(node.id, p.edges)}>
            {kids()}
          </PopupView>
        </div>
      );
    }
    case "deck": {
      const panels = (node.children ?? []).filter(child => child.type === "stack").slice(0, 12).map((child, index) => ({ id: child.id, label: say(p.labels?.[child.id]) || child.name || `${index + 1}`, content: <TreeNodeView node={child} ctx={ctx} /> }));
      const duration = typeof p.duration === "number" && Number.isFinite(p.duration) && p.duration >= 0 && p.duration <= 2 ? p.duration : .5;
      const initial = typeof p.initial === "number" && Number.isInteger(p.initial) ? Math.max(0, Math.min(panels.length - 1, p.initial)) : 0;
      return <div className={cls(node)} {...mark}><DeckView panels={panels} lang={ctx.lang} settings={{ presentation: p.presentation === "tabs" || p.presentation === "vertical-tabs" ? p.presentation : "deck", transition: p.transition === "fade" || p.transition === "wipe" ? p.transition : "slide", duration, initial, arrows: p.arrows !== false, dots: p.dots !== false, menu: p.menu !== false }} /></div>;
    }
    case "scrollScene": {
      // A clip that plays with the scroll (or a picture held still) and what comes and goes over it
      // at its moments: TreeScenes plays it; without scripts the picture and what starts at 0 show.
      const spec = scrollSceneOf(p);
      const m = spec.media;
      const media = m.kind === "video" && m.src ? (
        <video className="pt-ss-media" src={m.src} poster={m.poster} muted playsInline preload="metadata" aria-label={say(m.label) || undefined} />
      ) : m.kind === "image" && m.src ? (
        <img className="pt-ss-media" src={m.src} alt={say(m.label)} decoding="async" />
      ) : null;
      const live = { mode: spec.mode, chapters: spec.chapters, smooth: spec.smooth, fps: spec.fps, kind: m.kind, ...(m.phone ? { phone: m.phone } : {}), ...(spec.blur ? { blur: spec.blur } : {}), ...(spec.dim ? { dim: spec.dim } : {}), ...(spec.zoom ? { zoom: spec.zoom } : {}) };
      const styled = { "--pt-ss-len": String(spec.length), ...(spec.dim?.color ? { "--pt-ss-dimc": color(spec.dim.color) } : {}), ...(m.focus ? { "--pt-ss-focus": `${m.focus.x}% ${m.focus.y}%` } : {}) } as CSSProperties;
      const progress = spec.progress === "none" ? null : (
        <span className={`pt-ss-progress pt-ss-progress-${spec.progress}`} aria-hidden="true">
          {spec.progress === "dots" ? Array.from({ length: spec.chapters }, (_, i) => <i key={i} data-at={i} />) : <i />}
        </span>
      );
      const inside = { ...ctx, inScene: spec.mode === "pin" };
      return (
        <div className={cls(node, `pt-ss-${spec.mode}`, m.fit === "contain" ? "pt-ss-contain" : "")} {...mark} data-pt-scroll-scene={JSON.stringify(live)} style={styled}>
          <div className="pt-ss-stage">
            {media ? <div className="pt-ss-frame">{media}</div> : null}
            <span className="pt-ss-dim" aria-hidden="true" />
            {spec.mode === "pin" ? <div className="pt-ss-layer">{kids(inside)}</div> : null}
            {progress}
          </div>
          {spec.mode === "flow" ? <div className="pt-ss-flow">{kids(inside)}</div> : null}
        </div>
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
      return <H className={cls(node)} {...mark}>{before}{inner(words(p.text))}{fx}{after}</H>;
    }
    case "text":
      return <p className={cls(node)} {...mark}>{before}{inner(words(p.text))}{fx}{after}</p>;
    case "image": {
      const src = safeSrc(p.src);
      if (!src) return null;
      const img = framed(node, motion) ? (
        <span className={cls(node, "pt-frame")} {...mark}>
          {before}
          <img className="pt-frame-media" src={src} alt={say(p.alt)} loading="lazy" decoding="async" />
          {fx}
          {after}
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
          {before}
          {inner(words(p.label))}
          {fx}
          {after}
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
          aria-label={say(p.label) || undefined}
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
          {before}
          {clip}
          {fx}
          {after}
        </div>
      ) : (
        clip
      );
    }
    case "slider": {
      // A row that snaps: it swipes and scrolls without scripts; SliderControls adds the buttons.
      const slides = sliderSlides(p);
      if (!slides.length) return null;
      const settings = sliderSettings(p);
      const looks = sliderLooksOf(p);
      const w = SLIDER_WORDS[ctx.lang] ?? SLIDER_WORDS.ar;
      const { carousel, ...words } = w;
      return (
        <div className={cls(node)} {...mark} data-effect={settings.effect} data-axis={settings.axis} data-caption={settings.captionPosition} data-thumbnails={settings.thumbnails ? "true" : undefined} data-look={looks.look} data-arrows={looks.arrows} data-dots={looks.dots} style={{ "--pt-slider-zoom": settings.zoom } as CSSProperties} role="region" aria-roledescription={carousel} aria-label={carousel}>
          <div className="pt-slides" tabIndex={0}>
            {slides.map((s, i) => {
              const caption = say(s.caption);
              const title = say(s.title), text = say(s.text), cta = say(s.cta);
              const to = link(s.href);
              const media =
                s.kind === "video" ? (
                  <video className="pt-slide-media" src={s.src} aria-label={say(s.alt) || title || caption || undefined} controls={!to} muted loop playsInline preload="metadata" />
                ) : (
                  <img className="pt-slide-media" src={s.src} alt={say(s.alt)} loading="lazy" decoding="async" draggable={false} />
                );
              const inner = (
                <>
                  {media}
                  {title || text || (cta && to) ? <span className="pt-slide-caption pt-slide-rich">{caption ? <span>{caption}</span> : null}{title ? <strong className="pt-slide-title">{title}</strong> : null}{text ? <span className="pt-slide-text">{text}</span> : null}{cta && to ? <span className="pt-slide-cta">{cta}</span> : null}</span> : caption ? <span className="pt-slide-caption">{caption}</span> : null}
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
          <SliderControls count={slides.length} seconds={sliderSeconds(p.autoplay)} loop={p.loop !== false} arrows={p.arrows !== false} dots={p.dots !== false} words={words} settings={settings} slides={slides.map((s) => ({ src: s.src, kind: s.kind, label: say(s.title) || say(s.alt) || say(s.caption) }))} />
        </div>
      );
    }
    case "instrument":
      return <div className={cls(node)} {...mark}><InstrumentView spec={instrumentOf(p)} lang={ctx.lang} label={say(p.label)} /></div>;
    case "chart":
      return <div className={cls(node)} {...mark}><ChartView props={p} say={say} label={say(p.label) || ({ ar: "الرسم البياني", en: "Chart", he: "תרשים" }[ctx.lang])} /></div>;
    case "clock":
      return <div className={cls(node)} {...mark}><ClockView timezone={typeof p.timezone === "string" ? p.timezone.slice(0, 80) : "UTC"} format={p.format === "12" ? "12" : "24"} seconds={p.seconds !== false} date={p.date === true} lang={ctx.lang} label={say(p.label)} /></div>;
    case "filterGallery":
      return <FilterGalleryBlock props={p} className={cls(node)} mark={mark} say={say} link={link} lang={ctx.lang} />;
    case "schedule": {
      const spec = scheduleOf(p);
      spec.items = spec.items.map(item => ({...item, href: link(item.href) ?? undefined}));
      return <div className={cls(node)} {...mark}><ScheduleView spec={spec} lang={ctx.lang} main={ctx.main} /></div>;
    }
    case "comparison": {
      const spec = comparisonOf(p);
      spec.columns = spec.columns.map(column => ({...column, href: link(column.href) ?? undefined}));
      return <div className={cls(node)} {...mark}><ComparisonView spec={spec} lang={ctx.lang} main={ctx.main} /></div>;
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
      const [, , width, height] = art.viewBox.trim().split(/[\s,]+/).map(Number);
      const aspect = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? `${width}/${height}` : "1/1";
      return (
        <span className={cls(node)} style={{ "--pt-svg-aspect": aspect } as CSSProperties} {...mark} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
          <ArtView art={art} prefix={node.id} stretch />
          {fx}
        </span>
      );
    }
    case "showcase": {
      const spec = showcaseOf(p);
      if (!spec) return null;
      const fallback = ctx.lang === "en" ? { label: "Image showcase", panel: "Panel", cta: "Explore" } : ctx.lang === "he" ? { label: "גלריית תמונות", panel: "לוח", cta: "לגילוי" } : { label: "معرض صور", panel: "لوحة", cta: "اكتشفي" };
      const items = spec.items.map((item, index) => ({ title: say(item.title) || `${fallback.panel} ${index + 1}`, text: say(item.text), image: item.image, href: link(item.href) ?? undefined, cta: say(item.cta) || fallback.cta }));
      return <div className={cls(node)} {...mark}><ShowcaseView {...spec} label={say(spec.label) || fallback.label} items={items} />{fx}</div>;
    }
    case "accordion":
    case "testimonials":
    case "pricing":
    case "team":
    case "logos":
    case "alert":
    case "marquee":
    case "tabs":
    case "countdown":
    case "beforeAfter":
    case "hotspots":
    case "map":
    case "search":
    case "menu":
      return <BlockView node={node} className={cls(node)} mark={mark as Record<string, string>} say={say} link={link} lang={ctx.lang} />;
    case "model3d": {
      // A 3D model: its place is drawn here, its canvas only near the screen (Model3dSpot).
      const spec = model3dOf(p);
      if (!spec) return null;
      const to = link(p.href);
      return (
        <div className={cls(node)} {...mark}>
          <Model3dSpot spec={spec} label={say(p.label) || undefined} href={to ?? undefined} poster={safeSrc(p.poster) ?? undefined} />
          {fx}
        </div>
      );
    }
    case "lottie":
    case "rive": {
      // An animation file: TreeMedia plays it on the canvas (nothing until it has a file).
      const lottie = node.type === "lottie";
      const src = safeSrc(p.src);
      if (!src || !(lottie ? /\.(json|lottie)([?#]|$)/i : /\.riv([?#]|$)/i).test(src)) return null;
      const play = typeof p.play === "string" && (lottie ? ["auto", "view", "hover", "scroll"] : ["auto", "view", "hover"]).includes(p.play) ? p.play : "auto";
      const name = (v: unknown) => (typeof v === "string" && v.trim() && v.length <= 60 ? v.trim() : undefined);
      const spec = lottie
        ? { src, play, loop: p.loop === false ? false : undefined, speed: typeof p.speed === "number" && p.speed >= 0.1 && p.speed <= 4 ? p.speed : undefined }
        : { src, play, stateMachine: name(p.stateMachine), artboard: name(p.artboard) };
      const label = say(p.label);
      return (
        <div className={cls(node)} {...mark} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
          <canvas className="pt-anim-canvas" {...{ [lottie ? "data-pt-lottie" : "data-pt-rive"]: JSON.stringify(spec) }} />
        </div>
      );
    }
    case "spacer":
      return <div className={cls(node)} {...mark} aria-hidden="true" />;
    case "divider":
      return <hr className={cls(node)} {...mark} />;
    case "icon": {
      const label = say(p.label);
      // One from the library carries its drawing; the few built in go by name.
      const art = safeArt(p.art);
      const name = String(p.name ?? "");
      return (
        <span className={cls(node)} {...mark} role={label ? undefined : "img"} aria-label={label ? undefined : name.replace(/^[a-z-]+:/, "").replace(/-/g, " ")}>
          {before}
          {art ? <ArtView art={art} prefix={node.id} /> : <TreeIcon name={name} />}
          {label ? <span>{label}</span> : null}
          {after}
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
          {title ? <h2 data-pt-field="title" className="pt-block-title">{title}</h2> : null}
          <div className={p.layout === "row" ? "pt-products-row" : "pt-products-grid"} style={typeof p.columns === "number" && p.columns >= 1 && p.columns <= 6 ? ({ "--pt-cols": String(p.columns) } as Record<string, string>) : undefined}>
            <CardDesignScope value={p.cardDesign}>{shown.map((id) => <div key={id} className={`pt-card pt-card-${["bordered", "shadow", "soft", "lift"].includes(p.card) ? p.card : "plain"}`}>{ctx.renderProductCard?.(id)}</div>)}</CardDesignScope>
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
          {title ? <h2 data-pt-field="title" className="pt-block-title">{title}</h2> : null}
          <div className={`pt-tiles pt-tiles-${["square", "circle", "overlay", "pill", "banner"].includes(p.look) ? p.look : "tall"}`} style={typeof p.columns === "number" && p.columns >= 1 && p.columns <= 6 ? ({ "--pt-cols": String(p.columns) } as Record<string, string>) : undefined}>
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
