/**
 * Draws one node of a page tree (and its children) on the server. Styles come
 * from the page's CSS block (pageTree/css.ts) through the `pt-<id>` class; this
 * file only builds the markup. Links to the shop's own pages get the language
 * prefix; links and file addresses are checked again before they're used.
 */
import { videoPlay } from "./videoPlay";
import type { CatalogProduct } from "@/lib/catalog";
import { cloneElement, isValidElement, type CSSProperties, type ReactNode } from "react";
import type { ProductMini } from "@/cms/types";
import type { CatalogCategory } from "@/lib/catalog";
import { withLang, type LangConfig } from "@/lib/i18n";
import type { SeasonEdit } from "@/lib/seasonalEdits";
import type { StoryChapter } from "@/lib/collectionStories";
import { RoseInstagram } from "@/components/cinematic/RoseSections";
import { framed, motionOf, pickText, safeHref, safeSrc, sliderSeconds, sliderSlides, styleClass, type TreeLang, type TreeNode } from "./tree";
import { richNodes } from "./rich";
import { varNodes } from "./recipeVars";
import { hiddenFrom } from "./pieces";
import { TreeIcon } from "./icons";
import { ArtView, safeArt, safeMorph } from "./svgArt";
import { SparkleLayer } from "./sparkles";
import { CurvedWords } from "./curvedWords";
import { RichWords } from "./RichWords";
import { endlessOf, perfMarks, perfOf } from "./perf";
import { WORLD_HOSTS, bodyOf, worldOf } from "./physics";
import { safeCurve } from "../../../shared/textCurve";
import { safeSparkle } from "../../../shared/sparkle";
import { pictureFxOf, pictureFxOnPointer } from "../../../shared/pictureFx";
import { color } from "./css";
import { particlesOf } from "./particles";
import { sceneOf } from "./scene";
import { shaderOf } from "./shader";
import { glHeightOf, glSceneOf, type GlSpec } from "./glScene";
import { STAGE_WORDS, gameOf } from "./gameSpec";
import { flashOf, trailOf } from "./pointerSpec";
import { spaceOf } from "./spaceSpec";
import { model3dOf } from "./model3d";
import { BlockView, WORDS as BLOCK_WORDS } from "./blocks";
import { spinFor } from "@/components/cinematic/spinData";
import type { SliderWords } from "./SliderControls";
import { sliderSettings, sliderLooksOf } from "./sliderEffects";
import { instrumentOf } from "./instrument";
import { formOf, formWords, storeFormOf, type FormWay } from "./formSpec";
import { whatsappLink } from "@/lib/whatsapp";
import { liveOf, rowBind } from "./rowsSpec";
import { ChartView, NEW_CHART_KINDS, chartItemsOf } from "./ChartView";
import { FilterGalleryBlock } from "./FilterGalleryBlock";
import { scheduleOf, comparisonOf } from "./referenceData";
import { showcaseOf } from "./showcase";
import { StableWidgetView } from "./StableWidgetView";
import { nodeEdges, withDecoration } from "./NodeDecorations";
import { CommerceCartPart } from "./CommerceCart";
import type { CommerceShopData } from "./CommerceShop";
import { CardDesignScope } from "@/components/VisualControlsProvider";
import { coverOf, layersOf, scrollSceneOf, triggersOf } from "./pieces";
import { SHOP_WORD_FIELDS } from "../../../shared/partWords";
// The parts of each kind of element, and the home's two scenes: scripts of their own, loaded only where a page has
// them (lazyParts.tsx says why).
import { ArtMorph, BookingView, ChartKindView, ClockView, ConfiguratorView, GiftCardView, MemoryGameView, ScratchCardView, CommerceShop, GameStatusView, ServerListView, LeaderboardView, StreamersView, TebexPackagesView, WipeCountdownView, ComparisonView, DeckView, FormView, HeadlineMotion, InstrumentView, Model3dSpot, PopupView, ProductDetail, ReadProgress, RowsView, ScheduleView, SceneView, ShaderView, GlSceneView, GameView, TrailView, Space3D, MarqueeSpeed, FlashReveal, ShareView, ShowcaseView, SliderControls, SpinView, StoryBar, TocView, WhenWatch } from "./lazyParts";
import { whenOf } from "./pieces";
import { PRO_WORDS } from "./proWords";
import { storyViews, type StoryProduct, type StoryReelRaw } from "./storyData";
import type { ShareNetwork } from "./ProWidgets";
import { RoseCollectionStory, RoseSeasons } from "@/components/cinematic/homeScenes";
import { LibBlock } from "@/library/LibBlock";
import { LIB_CSS_VERSION, libItem } from "@/library/meta";

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
  /** The store's story circles and the products they point at, for its story bars (fetched when the page has one). */
  storyReels?: { reels: StoryReelRaw[]; products: Record<string, StoryProduct> };
  /** The products 360° elements show, with their views (null = not found). */
  spinProducts?: Record<string, { title: string; spins?: unknown } | null>;
  /** Drawn inside a scroll scene (what waits for its moment stays unseen until the scene starts). */
  inScene?: boolean;
  /** The product a product page's design is drawn for (pageTree/storeBind.ts). */
  product?: CatalogProduct;
  /** The page's first picture, loaded first (tree.ts leadImageOf). */
  lead?: string;
  /** How shoppers reach the store (Admin → Settings), shown with a contact form. */
  contact?: { phone?: string | null; email?: string | null; whatsapp?: string | null };
  /**
   * Drawn as the card of a list read in the visitor's browser (rowsSpec.ts): its connected elements are marked for
   * the row's values, and nothing in it waits for the motion engine (the copies are drawn after the page).
   */
  inRows?: boolean;
};

/** The store's WhatsApp, phone and email as links for its contact form (none set: none shown). */
function waysOf(ctx: TreeCtx): FormWay[] {
  const w = formWords(ctx.lang);
  const c = ctx.contact ?? {};
  const out: FormWay[] = [];
  const chat = whatsappLink(c.whatsapp || c.phone);
  if (chat) out.push({ label: w.whatsapp, value: String(c.whatsapp || c.phone).trim(), href: chat });
  if (c.phone?.trim()) out.push({ label: w.call, value: c.phone.trim(), href: `tel:${c.phone.replace(/[^0-9+]/g, "")}` });
  if (c.email?.trim()) out.push({ label: w.write, value: c.email.trim(), href: `mailto:${c.email.trim()}` });
  return out;
}

/** One of a list, or the default. */
const pick = <T extends string>(v: unknown, list: readonly T[], def: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : def);

const HOVER_CLASS: Record<string, string> ={ glow: "pt-hv-glow", zoom: "pt-hv-zoom", spotlight: "pt-hv-spot", ripple: "pt-hv-ripple" };
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
  const shown = PROP_WIDGETS.has(node.type) ? <StableWidgetView version={JSON.stringify([{ ...node, props: configuration },ctx.lang,ctx.main,ctx.cfg,node.type === "product360" ? ctx.spinProducts : null])}>{keyed}</StableWidgetView> : keyed;
  // An element with a time to show brings the check that shows it then (TreeWhen.tsx), whichever way the page is drawn.
  return node.type !== "page" && whenOf(node.props?.when) && view !== null ? <>{shown}<WhenWatch /></> : shown;
}

/** A WebGL scene's colours as CSS (a theme colour's variable, a design variable or a #hex), read where it is drawn. */
const glCss = (s: GlSpec) => ({ bg: [s.bg.c1, s.bg.c2, s.bg.c3, s.bg.c4].map(color), layers: s.layers.map((l) => [l.c1, l.c2, l.c3].map(color)) });

function renderNode({ node, ctx }: { node: TreeNode; ctx: TreeCtx }): ReactNode {
  const p = node.props ?? {};
  const say = (t: unknown) => pickText(t, ctx.lang, ctx.main);
  const link = (h: unknown) => {
    const v = safeHref(h);
    if (!v) return null;
    return v.startsWith("/") ? withLang(v, ctx.lang, ctx.cfg) : v;
  };
  // Words with formatting ([b]…[/b], links…) when the element says so; plain words otherwise.
  // {{name}} in them shows one of the recipes' variables (recipeVars.ts).
  const words = (t: unknown) => (p.rich === true ? richNodes(say(t), link, varNodes) : varNodes(say(t)));
  // How it moves goes to the motion engine (TreeMotion) as data; an animated layer is drawn inside it.
  const motion = motionOf(node);
  // Triggers go as data too, their links and words already in this page's language (TreeTriggers runs them).
  const triggers = triggersOf(p.triggers, link, say);
  // Its own speed settings (perf.ts): light, balanced, a frame cap, resting off screen and while the page rests.
  const perf = perfOf(p.perf);
  const endless = endlessOf(node, motion);
  // Physics (TreePhysics): its own, a world it holds (not when baked into keyframes), its settings as a body in one.
  const world = (WORLD_HOSTS as readonly string[]).includes(node.type) ? worldOf(p.world) : null;
  const body = bodyOf(p.body);
  const physicsMarks = { ...(motion?.physics ? { "data-pt-physics": "" } : {}), ...(world && !world.baked ? { "data-pt-world": JSON.stringify(world) } : {}), ...(body ? { "data-pt-body": JSON.stringify(body) } : {}) };
  // In a list's card (copied for each row after the page is drawn) the engines' marks are left out: a copy the
  // motion engine never met would wait for it for ever.
  const live = !ctx.inRows;
  // Its time to show (TreeWhen marks it when that's now; the stylesheet leaves it out until then).
  const when = node.type === "page" ? undefined : whenOf(p.when);
  const mark = { ...perfMarks(perf, endless), ...(live ? physicsMarks : {}), ...(when ? { "data-pt-when": JSON.stringify(when) } : {}), "data-tree-node": node.id, ...(node.style?.base?.bg === "deep" ? { "data-pt-deep": "" } : {}), ...(p.partLooks ? { "data-pt-part-targets": Object.keys(p.partLooks).join("|") } : {}), ...(p.interactions ? { "data-interactions": JSON.stringify(p.interactions) } : {}), ...(motion && live ? { "data-pt-motion": JSON.stringify(motion), "data-pt-look-version": JSON.stringify(node.style ?? {}) } : {}), ...(motion?.enter && !motion.cue && live ? { "data-pt-enter": "" } : {}), ...(triggers.length ? { "data-pt-triggers": JSON.stringify(triggers) } : {}), ...(hiddenFrom(triggers) ? { "data-pt-who": hiddenFrom(triggers) } : {}), ...(ctx.inScene && motion?.cue && motion.cue.from > 0 && live ? { "data-pt-cue-wait": "" } : {}), ...(p.cursorText && say(p.cursorText) ? { "data-pt-cursor-text": say(p.cursorText).slice(0, 24) } : {}) };
  // What the row fills in each copy of the card: the element's connections to the table's fields (rowsSpec.ts).
  const row = ctx.inRows ? rowBind(p.bind) : {};
  const rowWords = (ref: string | undefined, content: ReactNode) => (ref ? <span data-pt-row-text={ref}>{content}</span> : content);
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
      return <div className={cls(node)} {...mark}>{fx}<CardDesignScope value={p.cardDesign}><CommerceShop data={ctx.commerce?.shop} preview={ctx.commerce?.preview === true} options={p} lang={ctx.lang} words={Object.fromEntries(SHOP_WORD_FIELDS.map((f) => [f, typeof p[f]?.[ctx.lang] === "string" ? p[f][ctx.lang].trim() : ""]).filter(([, w]) => w))} /></CardDesignScope></div>;
    case "productDetail":
      // The product's pictures, colours, sizes and add-to-cart; the editor's preview of the design without a product shows where it goes.
      return <div className={cls(node)} {...mark}>{ctx.product ? <ProductDetail product={ctx.product} /> : <div className="pt-product-detail-empty">{({ ar: "صور المنتج وألوانه ومقاساته وزر الإضافة للسلة", en: "The product's pictures, colours, sizes and add-to-cart", he: "תמונות המוצר, הצבעים, המידות וכפתור ההוספה לסל" } as Record<string, string>)[ctx.lang] ?? ""}</div>}</div>;
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
      // A WebGL background from the theme library (ShaderView), behind the scene and the content.
      const shader = shaderOf(p.shader);
      // A WebGL scene the owner built (GlSceneView), behind the content.
      const glBg = glSceneOf(p.gl, say);
      // Pictures left along the pointer's way over it (PointerParts.tsx TrailView).
      const trail = trailOf(p.trail);
      const tint = dots?.color ? color(dots.color) : undefined;
      // Held on the screen, then covered by the next section (TreeCovers measures it): the room under it
      // is the scroll it's held for, and what the next one slides over.
      const cover = coverOf(p.cover);
      const coverClass = cover ? ` pt-cover pt-cover-${cover.under}${cover.phone ? "" : " pt-cover-desk"}` : "";
      // The page's colour while it's in the middle of the screen (TreePaint).
      const paint = p.paint ? color(p.paint) : undefined;
      const held = (
        <Tag className={`${cls(node)}${edges.length || dots || scene || shader || glBg || trail ? " pt-has-edges" : ""}${coverClass}`} id={anchor} {...mark} {...(cover ? { "data-pt-cover": JSON.stringify(cover) } : {})} {...(paint ? { "data-pt-paint": paint } : {})}>
          {shader ? <ShaderView spec={shader} colours={{ bg: shader.bg ? color(shader.bg) : undefined, c1: shader.c1 ? color(shader.c1) : undefined, c2: shader.c2 ? color(shader.c2) : undefined, c3: shader.c3 ? color(shader.c3) : undefined }} /> : null}
          {glBg ? <GlSceneView spec={glBg} css={glCss(glBg)} mode="bg" /> : null}
          {trail ? <TrailView images={trail.images} size={trail.size} /> : null}
          {scene ? <SceneView spec={scene} primary={color(scene.color ?? "accent")!} secondary={color(scene.secondary ?? "text")!} /> : null}
          {dots ? <div className="pt-particles" data-pt-particles={JSON.stringify({ kind: dots.kind, amount: dots.amount, speed: dots.speed })} style={tint ? { color: tint } : undefined} aria-hidden="true" /> : null}
          {edges}
          {p.contained ? <div className="pt-inner">{kids()}</div> : kids()}
          {cover && ["dim", "blur", "fade"].includes(cover.under) ? <span className="pt-cover-shade" aria-hidden="true" /> : null}
        </Tag>
      );
      return cover ? <>{held}<div className="pt-cover-room" aria-hidden="true" style={{ "--pt-cv-hold": String(cover.hold) } as CSSProperties} /></> : held;
    }
    case "popup": {
      // Over the page when its moment comes (PopupView); its content like a section's.
      const one = <T extends string>(v: unknown, list: readonly T[], def: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : def);
      const num = (v: unknown, max: number, def: number) => (typeof v === "number" && v >= 0 && v <= max ? v : def);
      const spec = {
        trigger: one(p.trigger, ["load", "scroll", "exit", "click", "idle"] as const, "load"),
        delay: num(p.delay, 120, 3),
        scroll: num(p.scroll, 100, 50),
        idle: Math.max(5, num(p.idle, 600, 30)),
        anchor: typeof p.anchor === "string" && /^[A-Za-z][\w-]{0,40}$/.test(p.anchor) ? p.anchor : undefined,
        often: one(p.often, ["always", "visit", "day", "once"] as const, "visit"),
        size: one(p.size, ["s", "m", "l"] as const, "m"),
        place: one(p.place, ["center", "bottom", "corner", "start", "end"] as const, "center"),
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
      const live = { mode: spec.mode, chapters: spec.chapters, smooth: spec.smooth, fps: spec.fps, kind: m.kind, ...(m.phone ? { phone: m.phone } : {}), ...(spec.blur ? { blur: spec.blur } : {}), ...(spec.dim ? { dim: spec.dim } : {}), ...(spec.zoom ? { zoom: spec.zoom } : {}), ...(spec.window ? { window: spec.window } : {}) };
      const styled = { "--pt-ss-len": String(spec.length), ...(spec.dim?.color ? { "--pt-ss-dimc": color(spec.dim.color) } : {}), ...(m.focus ? { "--pt-ss-focus": `${m.focus.x}% ${m.focus.y}%` } : {}) } as CSSProperties;
      const progress = spec.progress === "none" ? null : (
        <span className={`pt-ss-progress pt-ss-progress-${spec.progress}`} aria-hidden="true">
          {spec.progress === "dots" ? Array.from({ length: spec.chapters }, (_, i) => <i key={i} data-at={i} />) : <i />}
        </span>
      );
      const inside = { ...ctx, inScene: spec.mode === "pin" };
      return (
        <div className={cls(node, `pt-ss-${spec.mode}`, m.fit === "contain" ? "pt-ss-contain" : "", spec.window ? `pt-ss-win pt-ss-win-${spec.window.shape}` : "")} {...mark} data-pt-scroll-scene={JSON.stringify(live)} style={styled}>
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
    case "cell": {
      // A list read in the visitor's browser (rowsSpec.ts): its card is drawn once, unseen, and RowsView copies it
      // for each row the table's API answers this visitor.
      const list = node.type === "grid" ? liveOf(p.live, say) : null;
      const card = list ? node.children?.[0] : undefined;
      // What it holds laid out in 3D: a ring, a helix, a cube, a book, a phone (Space3D.tsx, inside it).
      const space = !list && node.type !== "columns" ? spaceOf(p.space) : null;
      if (space) return <div className={cls(node)} {...mark}>{kids()}<Space3D spec={space} /></div>;
      if (list) return <div className={cls(node)} {...mark}>{before}{card ? <RowsView spec={list} lang={ctx.lang} signin={link("/account") ?? "/account"} prefix={(link("/__row__") ?? "/__row__").replace(/\/__row__$/, "")}><TreeNodeView node={card} ctx={{ ...ctx, inRows: true }} /></RowsView> : null}{fx}{after}</div>;
      return <div className={cls(node)} {...mark}>{kids()}</div>;
    }
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(p.level) || 2));
      const H = `h${level}` as "h2";
      // Words along a curve (focus mode, shared/textCurve.ts) instead of a straight line.
      const curve = safeCurve(p.curve);
      return <H className={cls(node)} {...mark}>{before}{curve ? <CurvedWords id={node.id} text={say(p.text)} curve={curve} /> : inner(rowWords(row.text, words(p.text)))}{fx}{after}</H>;
    }
    case "text": {
      const curve = safeCurve(p.curve);
      // Formatted words (connected to a table's formatted field: the server marks it `formatted`; `rich` is the editor's own inline marks), drawn with their marks.
      if (p.formatted === true && !curve) {
        const body = <RichWords text={say(p.text)} />;
        return <div className={cls(node, "pt-rich")} {...mark}>{before}{inner(row.text ? <div data-pt-row-text={row.text} data-pt-row-rich="">{body}</div> : body)}{fx}{after}</div>;
      }
      return <p className={cls(node)} {...mark}>{before}{curve ? <CurvedWords id={node.id} text={say(p.text)} curve={curve} /> : inner(rowWords(row.text, words(p.text)))}{fx}{after}</p>;
    }
    case "image": {
      const src = safeSrc(p.src);
      if (!src) return null;
      // Sparkling stars over it (focus mode, shared/sparkle.ts), drawn here and twinkling in CSS.
      const sparkle = safeSparkle(p.sparkle);
      // A live effect on it (shared/pictureFx.ts): TreeMedia lays a WebGL canvas over the picture when it is needed.
      const glfx = pictureFxOf(p.glfx);
      // A second picture seen through a light that follows the pointer (PointerParts.tsx FlashReveal).
      const flash = flashOf(p.flash);
      // The page's first picture loads at once and first; the rest wait until they're near the screen.
      const load = ctx.lead === node.id || p.priority === true ? ({ loading: "eager", fetchPriority: "high" } as Record<string, string>) : ({ loading: "lazy" } as Record<string, string>);
      const img = framed(node, motion) ? (
        <span className={cls(node, "pt-frame")} {...mark} data-pt-glfx={glfx ? JSON.stringify(glfx) : undefined}>
          {before}
          <img className="pt-frame-media" src={src} alt={say(p.alt)} {...load} decoding="async" data-pt-row-src={row.src} data-pt-row-alt={row.alt} />
          {fx}
          {sparkle ? <SparkleLayer sparkle={sparkle} /> : null}
          {flash ? <FlashReveal src={flash.src} radius={flash.radius} /> : null}
          {after}
        </span>
      ) : (
        <img className={cls(node)} {...mark} src={src} alt={say(p.alt)} {...load} decoding="async" data-pt-row-src={row.src} data-pt-row-alt={row.alt} />
      );
      const to = link(p.href) ?? (row.href ? "#" : null);
      return to ? <a className="pt-image-link" href={to} data-pt-row-href={row.href} {...(p.newTab === true ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{img}</a> : img;
    }
    case "button": {
      const to = link(p.href);
      const variant = ["solid", "outline", "link"].includes(p.variant) ? p.variant : "solid";
      return (
        <a className={cls(node, `pt-btn pt-btn-${variant}`)} {...mark} href={to ?? "#"} data-pt-row-href={row.href} {...(p.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {before}
          {inner(rowWords(row.label, words(p.label)))}
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
      // How it plays (videoPlay.ts): at once, once it's seen or under the pointer (those without sound, and without
      // the player's buttons; a light element waits to be pressed), its speed, what loads before it's played.
      const play = videoPlay(p, perf?.tier === "light");
      const clip = (
        <video
          className={inFrame ? "pt-frame-media" : cls(node)}
          {...(inFrame ? {} : mark)}
          src={src}
          poster={poster}
          aria-label={say(p.label) || undefined}
          autoPlay={play.autoPlay}
          muted={play.muted}
          loop={p.loop === true}
          controls={play.controls}
          playsInline
          preload={play.preload}
          {...(play.noDownload ? { controlsList: "nodownload" } : {})}
          {...(play.live ? { "data-pt-video": JSON.stringify(play.live) } : {})}
          data-pt-row-src={row.src}
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
      // A live effect on its pictures under the pointer (shared/pictureFx.ts; TreeMedia lays the canvas over a slide).
      const slideFx = pictureFxOf(p.glfx);
      const slideFxData = slideFx && pictureFxOnPointer(slideFx.kind) ? JSON.stringify(slideFx) : undefined;
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
                <div key={i} className="pt-slide" role="group" aria-roledescription={w.slide} aria-label={`${i + 1} / ${slides.length}`} data-pt-glfx={s.kind === "video" ? undefined : slideFxData}>
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
    case "chart": {
      const label = say(p.label) || ({ ar: "الرسم البياني", en: "Chart", he: "תרשים" }[ctx.lang]);
      const kind = (NEW_CHART_KINDS as readonly string[]).includes(String(p.kind)) ? (p.kind as (typeof NEW_CHART_KINDS)[number]) : null;
      if (!kind) return <div className={cls(node)} {...mark}><ChartView props={p} say={say} label={label} /></div>;
      // The new kinds (plan 3.7, ChartKinds.tsx). One not set yet (no flows, no city to start from, no table) shows
      // the editor what's missing and isn't in the shop.
      const items = chartItemsOf(p, say);
      const hub = typeof p.hub === "string" && /^[a-z][a-z-]{1,30}$/.test(p.hub) ? p.hub : "";
      const table = typeof p.table === "string" && /^[a-z0-9][a-z0-9-]{0,40}$/.test(p.table) ? p.table : "";
      const every = p.every === "minute" || p.every === "day" ? p.every : "hour";
      const last = typeof p.last === "number" && p.last >= 6 && p.last <= 60 ? Math.round(p.last) : 24;
      const unset = kind === "live" ? !table : kind === "flights" ? !hub || !items.some((x) => x.city && x.city !== hub) : kind === "sankey" ? !items.some((x) => x.to.trim()) : !items.length;
      return (
        <div className={cls(node)} {...mark} data-pt-needs-product={unset ? "" : undefined}>
          <ChartKindView kind={kind} label={label} items={items} unit={say(p.unit).slice(0, 16)} showValues={p.showValues !== false} hub={hub} table={table} every={every} last={last} lang={ctx.lang} />
        </div>
      );
    }
    case "clock":
      return <div className={cls(node)} {...mark}><ClockView timezone={typeof p.timezone === "string" ? p.timezone.slice(0, 80) : "UTC"} format={p.format === "12" ? "12" : "24"} seconds={p.seconds !== false} date={p.date === true} lang={ctx.lang} label={say(p.label)} /></div>;
    case "tebexPackages":
      // A game server site's packages on its Tebex webstore (the server fills props.store as the page is served).
      return <div className={cls(node)} {...mark} data-game-part="tebexPackages"><TebexPackagesView store={p.store} lang={ctx.lang} buy={say(p.buy)} all={say(p.all)} empty={say(p.empty)} note={say(p.note)} columns={typeof p.columns === "number" && p.columns >= 1 && p.columns <= 4 ? p.columns : 3} /></div>;
    case "leaderboard":
      // A game server site's ranking on one of its boards (the server fills props.ranks as the page is served).
      return <div className={cls(node)} {...mark} data-game-part="leaderboard"><LeaderboardView ranks={p.ranks} lang={ctx.lang} empty={say(p.empty)} labels={{ day: say(p.day), week: say(p.week), month: say(p.month), all: say(p.all) }} /></div>;
    case "wipeCountdown":
      // A game server site's next wipe (the server fills props.wipe from the site's schedule as the page is served).
      return <div className={cls(node)} {...mark} data-game-part="wipeCountdown"><WipeCountdownView wipe={p.wipe} lang={ctx.lang} title={say(p.title)} done={say(p.done)} none={say(p.none)} size={p.size === "small" ? "small" : "big"} /></div>;
    case "streamers":
      // A game server site's streamers (the server fills props.crew as the page is served, the live first).
      return <div className={cls(node)} {...mark} data-game-part="streamers"><StreamersView crew={p.crew} lang={ctx.lang} liveLabel={say(p.live)} watch={say(p.watch)} channel={say(p.channel)} empty={say(p.empty)} columns={typeof p.columns === "number" && p.columns >= 1 && p.columns <= 4 ? p.columns : 3} onlyLive={p.onlyLive === true} /></div>;
    case "gameStatus":
      // A game server site's live status (the server fills props.live as the page is served).
      return <div className={cls(node)} {...mark} data-game-part="gameStatus"><GameStatusView live={p.live} lang={ctx.lang} joinLabel={say(p.join)} copyLabel={say(p.copy)} chart={p.chart === true} size={p.size === "small" ? "small" : "big"} /></div>;
    case "serverList":
      // A network's or a community's own servers (the server fills props.live with the site's status as the page is served).
      return <div className={cls(node)} {...mark} data-game-part="serverList"><ServerListView live={p.live} lang={ctx.lang} joinLabel={say(p.join)} copyLabel={say(p.copy)} empty={say(p.empty)} columns={typeof p.columns === "number" && p.columns >= 1 && p.columns <= 4 ? p.columns : 3} size={p.size === "small" ? "small" : "big"} /></div>;
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
      // Its shapes turning into others (focus mode's morph), played by a script of its own.
      const morph = safeMorph(p.morph);
      const [, , width, height] = art.viewBox.trim().split(/[\s,]+/).map(Number);
      const aspect = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? `${width}/${height}` : "1/1";
      return (
        <span className={cls(node)} style={{ "--pt-svg-aspect": aspect } as CSSProperties} {...mark} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
          <ArtView art={art} prefix={node.id} stretch />
          {morph ? <ArtMorph nodeId={node.id} morph={morph} /> : null}
          {fx}
        </span>
      );
    }
    case "lib": {
      // A piece of the owner's theme library (src/library, docs/themes-library-plan.ar.md): as the library made
      // it, in the owner's own words (in this page's language) and colours.
      const item = libItem(p.item);
      if (!item) return null;
      const words: Record<string, string> = {};
      if (p.words && typeof p.words === "object" && !Array.isArray(p.words)) {
        for (const [from, to] of Object.entries(p.words as Record<string, unknown>).slice(0, 600)) {
          const v = say(to as never);
          if (from.length <= 400 && typeof v === "string" && v.length <= 600) words[from] = v;
        }
      }
      const brand = say(p.brand);
      return <div className={cls(node)} {...mark}><LibBlock item={item.id} kind={item.kind} madeUp={item.brand || undefined} minH={item.minH} js={item.js} css={item.css} version={LIB_CSS_VERSION} dir={p.dir === "rtl" ? "rtl" : "ltr"} words={words} colours={p.colours} families={p.families} brand={brand || undefined} textSize={typeof p.textSize === "number" ? p.textSize : undefined} drawnSize={typeof p.drawnSize === "number" ? p.drawnSize : undefined} draws={Boolean(item.draws)} fresh={Boolean(item.draws || item.fresh)} />{fx}</div>;
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
      // Faster with the scroll's speed (PointerParts.tsx MarqueeSpeed, beside it).
      if (p.velocity === true) return <><BlockView node={node} className={cls(node)} mark={mark as Record<string, string>} say={say} link={link} lang={ctx.lang} /><MarqueeSpeed target={node.id} /></>;
    // falls through
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
      const spec = model3dOf(p, say);
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
    case "toc": {
      // The page's own headings, listed in the shopper's browser (ProWidgets.tsx TocView).
      const W = PRO_WORDS[ctx.lang] ?? PRO_WORDS.ar;
      return (
        <div className={cls(node)} {...mark}>
          <TocView title={say(p.title) || W.toc} levels={pick(p.levels, ["2", "2-3", "2-4"] as const, "2-3")} look={pick(p.look, ["list", "numbers", "line", "boxed"] as const, "list")} fold={p.fold === true} empty={W.tocEmpty} />
        </div>
      );
    }
    case "flipBox": {
      // Two faces; the back comes round as the mouse comes over it, a tap or the keyboard's focus (css.ts, no script).
      const title = say(p.title);
      if (!title) return null;
      const W = PRO_WORDS[ctx.lang] ?? PRO_WORDS.ar;
      const image = safeSrc(p.image);
      const to = link(p.href);
      const icon = typeof p.icon === "string" && /^[a-z]{2,20}$/.test(p.icon) ? p.icon : null;
      const height = typeof p.height === "number" && p.height >= 160 && p.height <= 720 ? Math.round(p.height) : 300;
      const [backTitle, backText, button] = [say(p.backTitle), say(p.backText), say(p.button)];
      return (
        <div
          className={cls(node, `pt-flip-${pick(p.effect, ["flip", "slide", "fade", "zoom"] as const, "flip")}`, `pt-flip-${pick(p.direction, ["start", "end", "up", "down"] as const, "start")}`)}
          {...mark} style={{ "--pt-flip-h": `${height}px` } as CSSProperties} role="group" aria-label={title} {...(to && button ? {} : { tabIndex: 0, title: W.flip })}
        >
          {before}
          <div className="pt-flip-inner">
            <div className={`pt-flip-face pt-flip-front${image ? " pt-flip-pic" : ""}`}>
              {image ? <img className="pt-flip-img" src={image} alt="" loading="lazy" /> : null}
              {icon && !image ? <span className="pt-flip-icon"><TreeIcon name={icon} /></span> : null}
              <div className="pt-flip-title" data-pt-field="title">{title}</div>
              {say(p.text) ? <p className="pt-flip-text" data-pt-field="text">{say(p.text)}</p> : null}
            </div>
            <div className="pt-flip-face pt-flip-back">
              {backTitle ? <div className="pt-flip-title" data-pt-field="backTitle">{backTitle}</div> : null}
              {backText ? <p className="pt-flip-text" data-pt-field="backText">{backText}</p> : null}
              {to && button ? <a className="pt-btn pt-btn-solid pt-flip-btn" href={to} data-pt-field="button">{button}</a> : null}
            </div>
          </div>
          {fx}
          {after}
        </div>
      );
    }
    case "glScene": {
      // A WebGL scene the owner built: particles in forms and flows over a background (GlSceneView, glEngine.ts).
      const spec = glSceneOf(p.gl, say);
      if (!spec) return null;
      return (
        <div className={cls(node)} {...mark}>
          {before}
          <GlSceneView spec={spec} css={glCss(spec)} mode="element" height={glHeightOf(p.height)} label={say(p.label) || undefined} />
          {after}
        </div>
      );
    }
    case "scratchCard": {
      // A cover scratched away to a prize and its coupon code (ShopGames.tsx); the code goes to the bag by itself.
      const W = (PRO_WORDS[ctx.lang] ?? PRO_WORDS.ar).games;
      const code = typeof p.coupon === "string" && /^[A-Za-z0-9_-]{2,32}$/.test(p.coupon) ? p.coupon : "";
      const prize = say(p.prize);
      if (!prize && !code) return null;
      const height = typeof p.height === "number" && p.height >= 140 && p.height <= 480 ? Math.round(p.height) : 220;
      return (
        <div className={cls(node)} {...mark}>
          {before}
          {say(p.title) ? <div className="pt-game-title" data-pt-field="title">{say(p.title)}</div> : null}
          {say(p.text) ? <p className="pt-game-text" data-pt-field="text">{say(p.text)}</p> : null}
          <ScratchCardView
            id={node.id} code={code} prize={prize} coverText={say(p.coverText) || W.scratch} height={height}
            look={pick(p.look, ["silver", "gold", "brand", "pink"] as const, "silver")} cover={color(p.cover)}
            once={p.once !== false} save={p.save !== false} words={W}
          />
          {after}
        </div>
      );
    }
    case "game": {
      // A game on the page, the owner's or a ready one (the games stage: gameSpec.ts, gameEngine.ts, GameView.tsx).
      const spec = gameOf(p.game, say);
      if (!spec) return null;
      // Every colour the game names: its ground, its things', its tiles' and its layers'.
      const named = ["text", spec.bg, ...spec.things.map((t) => t.look.color), ...Object.values(spec.tiles?.kinds ?? {}).map((k) => k.look.color), ...spec.layers.flatMap((l) => [l.color, l.color2])];
      const colours = Object.fromEntries(named.map((n) => [n, color(n) ?? n]));
      return (
        <div className={cls(node)} {...mark}>
          {before}
          <GameView id={node.id} spec={spec} colours={colours} words={STAGE_WORDS[ctx.lang as "ar"] ?? STAGE_WORDS.ar} prizeWords={(PRO_WORDS[ctx.lang] ?? PRO_WORDS.ar).games} rtl={ctx.lang !== "en"} />
          {after}
        </div>
      );
    }
    case "memoryGame": {
      // Cards turned two at a time; all the pairs found (within `moves`, if set) wins the prize (ShopGames.tsx).
      const W = (PRO_WORDS[ctx.lang] ?? PRO_WORDS.ar).games;
      const code = typeof p.coupon === "string" && /^[A-Za-z0-9_-]{2,32}$/.test(p.coupon) ? p.coupon : "";
      const faces = (Array.isArray(p.faces) ? p.faces : []).slice(0, 8).map((f: unknown) => {
        const x = f && typeof f === "object" ? (f as Record<string, unknown>) : {};
        const src = safeSrc(x.src);
        return src ? { src } : { icon: typeof x.icon === "string" && /^[a-z]{2,20}$/.test(x.icon) ? x.icon : "star" };
      });
      if (faces.length < 2) return null;
      const moves = typeof p.moves === "number" && p.moves >= faces.length && p.moves <= 60 ? Math.round(p.moves) : 0;
      return (
        <div className={cls(node)} {...mark}>
          {before}
          {say(p.title) ? <div className="pt-game-title" data-pt-field="title">{say(p.title)}</div> : null}
          {say(p.text) ? <p className="pt-game-text" data-pt-field="text">{say(p.text)}</p> : null}
          <MemoryGameView
            id={node.id} code={code} prize={say(p.prize)} faces={faces} moves={moves}
            look={pick(p.look, ["cards", "tiles", "round"] as const, "cards")} once={p.once !== false} save={p.save !== false} words={W}
          />
          {after}
        </div>
      );
    }
    case "giftCard": {
      // One of the store's products sold as a gift card: its sizes are the amounts, she writes to/from/a message and
      // sees the card as she writes (ShopBuild.tsx); her words go with the line to the bag and the order.
      const W = PRO_WORDS[ctx.lang] ?? PRO_WORDS.ar;
      const product = typeof p.product === "string" && /^[\w-]{1,120}$/.test(p.product) ? p.product : "";
      return (
        <div className={cls(node)} {...mark} data-pt-needs-product={product ? undefined : ""}>
          {before}
          {say(p.title) ? <div className="pt-game-title" data-pt-field="title">{say(p.title)}</div> : null}
          {say(p.text) ? <p className="pt-game-text" data-pt-field="text">{say(p.text)}</p> : null}
          <GiftCardView product={product} lang={ctx.lang} look={pick(p.look, ["rose", "night", "gold", "brand"] as const, "rose")} picture={safeSrc(p.picture) ?? undefined} button={say(p.button) || (({ ar: "أضيفي للحقيبة", en: "Add to bag", he: "הוספה לסל" } as Record<string, string>)[ctx.lang] ?? "")} words={W.build} />
          {after}
        </div>
      );
    }
    case "configurator": {
      // One of the store's products with its own colours and sizes, and the owner's extra parts laid over its picture
      // (ShopBuild.tsx); her choices of parts go with the line to the bag and the order.
      const W = PRO_WORDS[ctx.lang] ?? PRO_WORDS.ar;
      const product = typeof p.product === "string" && /^[\w-]{1,120}$/.test(p.product) ? p.product : "";
      const parts = (Array.isArray(p.parts) ? p.parts : []).slice(0, 4).map((part: unknown) => {
        const x = part && typeof part === "object" ? (part as Record<string, unknown>) : {};
        const options = (Array.isArray(x.options) ? x.options : []).slice(0, 8).map((o: unknown) => {
          const y = o && typeof o === "object" ? (o as Record<string, unknown>) : {};
          const hex = typeof y.color === "string" && /^#[0-9a-f]{6}$/i.test(y.color) ? y.color : undefined;
          return { name: say(y.name), ...(hex ? { color: hex } : {}), ...(safeSrc(y.src) ? { src: safeSrc(y.src)! } : {}) };
        }).filter((o: { name: string }) => o.name);
        return { name: say(x.name), options };
      }).filter((part: { name: string; options: unknown[] }) => part.name && part.options.length);
      return (
        <div className={cls(node)} {...mark} data-pt-needs-product={product ? undefined : ""}>
          {before}
          {say(p.title) ? <div className="pt-game-title" data-pt-field="title">{say(p.title)}</div> : null}
          {say(p.text) ? <p className="pt-game-text" data-pt-field="text">{say(p.text)}</p> : null}
          <ConfiguratorView product={product} lang={ctx.lang} parts={parts} button={say(p.button) || (({ ar: "أضيفي للحقيبة", en: "Add to bag", he: "הוספה לסל" } as Record<string, string>)[ctx.lang] ?? "")} words={W.build} />
          {after}
        </div>
      );
    }
    case "bookingCalendar": {
      // A service of the store's booked for a day and a time: open days, opening hours, every so many minutes, so many
      // days ahead (ShopBuild.tsx BookingView); the time goes with the line ("YYYY-MM-DD HH:MM"), one order each.
      const W = PRO_WORDS[ctx.lang] ?? PRO_WORDS.ar;
      const product = typeof p.product === "string" && /^[\w-]{1,120}$/.test(p.product) ? p.product : "";
      const hm = (v: unknown, d: string) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);
      const days = (Array.isArray(p.days) ? p.days : [0, 1, 2, 3, 4]).filter((d: unknown): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6);
      const every = typeof p.every === "number" && p.every >= 10 && p.every <= 240 ? Math.round(p.every) : 60;
      const ahead = typeof p.ahead === "number" && p.ahead >= 1 && p.ahead <= 120 ? Math.round(p.ahead) : 30;
      const closed = (Array.isArray(p.closed) ? p.closed : []).filter((d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 60);
      return (
        <div className={cls(node)} {...mark} data-pt-needs-product={product ? undefined : ""}>
          {before}
          {say(p.title) ? <div className="pt-game-title" data-pt-field="title">{say(p.title)}</div> : null}
          {say(p.text) ? <p className="pt-game-text" data-pt-field="text">{say(p.text)}</p> : null}
          <BookingView
            product={product} lang={ctx.lang} days={days} from={hm(p.from, "10:00")} to={hm(p.to, "18:00")} every={every} ahead={ahead} closed={closed}
            button={say(p.button) || (({ ar: "احجزي", en: "Book", he: "להזמנה" } as Record<string, string>)[ctx.lang] ?? "")} words={W.build}
          />
          {after}
        </div>
      );
    }
    case "share": {
      const W = PRO_WORDS[ctx.lang] ?? PRO_WORDS.ar;
      const known = Object.keys(W.networks);
      const networks = (Array.isArray(p.networks) ? p.networks : []).filter((n: unknown, i: number, all: unknown[]) => typeof n === "string" && known.includes(n) && all.indexOf(n) === i) as ShareNetwork[];
      if (!networks.length) return null;
      return (
        <div className={cls(node)} {...mark}>
          <ShareView networks={networks} look={pick(p.look, ["round", "square", "pill", "plain"] as const, "round")} labels={p.labels === true} tint={p.tint === "theme" ? "theme" : "brand"} text={say(p.text)} words={{ ...W.networks, copied: W.copied, label: W.share }} />
        </div>
      );
    }
    case "progress": {
      // Drawn along the window (on the body); here only its place in the page, empty in the shop.
      const W = PRO_WORDS[ctx.lang] ?? PRO_WORDS.ar;
      const kind = p.kind === "ring" ? "ring" : "bar";
      const thickness = typeof p.thickness === "number" && p.thickness >= 2 && p.thickness <= 12 ? Math.round(p.thickness) : 4;
      return (
        <div className={cls(node)} {...mark}>
          <ReadProgress kind={kind} place={p.place === "bottom" ? "bottom" : "top"} thickness={thickness} label={say(p.label) || (kind === "ring" ? W.up : W.reading)} note={W.readNote} />
        </div>
      );
    }
    case "headline": {
      // A heading whose words take turns, or with one word marked (ProWidgets.tsx HeadlineMotion moves them).
      const list = (Array.isArray(p.words) ? p.words : []).slice(0, 8).map((t: unknown) => say(t)).filter(Boolean) as string[];
      if (!list.length) return null;
      const level = Math.min(6, Math.max(1, Number(p.level) || 2));
      const H = `h${level}` as "h2";
      const mode = p.mode === "mark" ? "mark" : "rotate";
      const [lead, tail] = [say(p.before), say(p.after)];
      const seconds = typeof p.seconds === "number" && p.seconds >= 1 && p.seconds <= 10 ? p.seconds : 2.5;
      return (
        <H className={cls(node, `pt-hl-is-${mode}`)} {...mark} data-pt-toc={[lead, list[0], tail].filter(Boolean).join(" ")}>
          {before}
          {/* Read out whole: its words, every one of the turns. */}
          <span className="pt-sr">{[lead, mode === "mark" ? list[0] : list.join(" / "), tail].filter(Boolean).join(" ")}</span>
          <span className="pt-hl-shown" aria-hidden="true">
            {lead ? <><span className="pt-hl-lead" data-pt-field="before">{lead}</span>{" "}</> : null}
            <HeadlineMotion
              words={mode === "mark" ? [list[0]] : list} mode={mode} seconds={seconds} again={p.again === true}
              effect={pick(p.effect, ["type", "slide", "fade", "flip", "clip", "blur"] as const, "slide")}
              shape={pick(p.shape, ["circle", "underline", "curly", "double", "strike", "cross", "zigzag", "box", "swoosh"] as const, "circle")}
            >
              {mode === "mark" ? <span data-pt-field="words.0">{list[0]}</span> : null}
            </HeadlineMotion>
            {tail ? <>{" "}<span className="pt-hl-tail" data-pt-field="after">{tail}</span></> : null}
          </span>
          {fx}
          {after}
        </H>
      );
    }
    case "storyBar": {
      // The store's story circles (admin → القصص): drawn here when the page fetched them, else fetched in the browser.
      const W = (PRO_WORDS[ctx.lang] ?? PRO_WORDS.ar).stories;
      const only = Array.isArray(p.reels) ? p.reels.filter((x: unknown): x is string => typeof x === "string" && /^[\w-]{1,64}$/.test(x)).slice(0, 40) : undefined;
      const reels = ctx.storyReels ? storyViews(ctx.storyReels.reels, ctx.storyReels.products, { lang: ctx.lang, main: ctx.main, link: (path) => link(path), shopThis: W.shopThis, only }) : null;
      const prefix = withLang("/x", ctx.lang, ctx.cfg).slice(0, -2);
      return (
        <div className={cls(node)} {...mark}>
          <StoryBar
            reels={reels} only={only} lang={ctx.lang} main={ctx.main} prefix={prefix} names={p.names !== false}
            look={pick(p.look, ["circles", "rounded", "cards"] as const, "circles")} size={pick(p.size, ["s", "m", "l"] as const, "m")}
            words={{ ...W, label: say(p.label) || W.label }}
          />
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
      // The owner's own form: fields of their choosing, sent to one of their functions or added to one of their tables.
      if (p.kind === "custom") return <div className={cls(node)} {...mark}><FormView spec={formOf(p, say)} lang={ctx.lang} signin={link("/account") ?? "/account"} /></div>;
      // The shop's own two: a message to the store (with the ways to reach it), a newsletter sign-up.
      const kind = p.kind === "contact" ? "contact" : "newsletter";
      return <div className={cls(node)} {...mark}><FormView spec={storeFormOf(kind, say(p.title), ctx.lang, kind === "contact" ? waysOf(ctx) : [])} lang={ctx.lang} signin={link("/account") ?? "/account"} /></div>;
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
