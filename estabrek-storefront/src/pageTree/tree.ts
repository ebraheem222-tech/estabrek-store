/**
 * The new CMS's page tree as the shop reads it (the backend checks it when it's
 * saved: estabrek-store-backend src/lib/pageTree.ts). A page is a root whose
 * children are sections, special blocks, or `legacy` nodes (an old section, drawn
 * as before). Words are kept in ar/en/he inside the node. No "@/" imports here, so
 * the tests can load this file directly.
 */
export type TreeLang = "ar" | "en" | "he";
export type TreeText = Partial<Record<TreeLang, string>>;
export type SizeConstraints = { minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number; aspectRatio?: number };

export type ScreenStyle = {
  /** Required local dimensions, inherited field-by-field from larger screens. */
  constraints?: SizeConstraints;
  movement?: "vertical" | "horizontal" | "both" | "free";
  pad?: [number, number, number, number];
  margin?: [number, number, number, number];
  width?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
  sticky?: false | { top: number };
  columns?: number;
  /** Columns: each cell's share of the width ([1, 2] = a third and two thirds). */
  widths?: number[];
  gap?: number;
  rowGap?: number;
  direction?: "row" | "column";
  wrap?: boolean;
  justify?: "start" | "center" | "end" | "between" | "around";
  align?: "start" | "center" | "end" | "stretch";
  /** Where it sits across its row or column, whatever its container says. */
  self?: "start" | "center" | "end" | "stretch";
  col?: string;
  row?: string;
  order?: number;
  bg?: string;
  color?: string;
  radius?: number;
  border?: { width: number; color: string; style?: "solid" | "dashed" | "dotted" };
  shadow?: "none" | "sm" | "md" | "lg";
  opacity?: number;
  font?: "heading" | "body" | "serif" | "sans" | "mono";
  size?: number;
  iconSize?: number; // an icon's drawing (its words keep `size`)
  weight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "start" | "center" | "end";
  fit?: "cover" | "contain";
  /** A picture's or clip's point that stays in sight when it's cut to its frame (% across, % down). */
  focus?: { x: number; y: number };
  aspect?: string;
  shape?: string; // rect, rounded, pill, arch, circle, or one of the masks (css.ts MASKS)
  pattern?: { kind: string; color: string; size: number; opacity?: number };
  /** A soft mesh of 2–4 colours from the corners (`soft` % of the way); `move` drifts it like an aurora. */
  mesh?: { colors: string[]; soft?: number; move?: boolean; speed?: number };
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  perspective?: number;
  scale?: number;
  moveX?: number;
  moveY?: number;
  origin?: "center" | "top" | "bottom";
  overlay?: { color: string; to?: string; angle?: number; opacity: number; blend?: string };
  shade?: { x: number; y: number; blur: number; color: string; follow?: boolean };
  glow?: { color: string; size: number };
  /** Placed freely over its container (its anchor at x% from the line's start, y% from the top); false = in the flow. */
  layer?: false | { x: number; y: number; anchor?: string };
  z?: number;
  hidden?: boolean;
  /** A family from the fonts library by name (pageTree/fonts.ts); it wins over `font`. */
  family?: string;
  italic?: boolean;
  /** Fluid: the words grow from this size on a phone to `size` on a computer. */
  sizeMin?: number;
  caps?: "none" | "upper" | "lower" | "title" | "small";
  /** At most this many lines, then "…". */
  lines?: number;
  balance?: "balance" | "pretty";
  textColumns?: number;
  wordSpacing?: number;
  decoration?: { line: "none" | "underline" | "overline" | "through"; style?: "solid" | "wavy" | "dotted" | "dashed" | "double"; color?: string; width?: number; offset?: number };
  stroke?: { width: number; color: string };
  /** Letters painted with a gradient. */
  fill?: { color: string; to: string; via?: string; angle?: number };
  shadows?: Array<{ x: number; y: number; blur: number; color: string }>;
  gradient?: { color: string; to: string; via?: string; angle?: number; radial?: boolean };
  /** Frosted glass: what's behind it is blurred. */
  backdrop?: { blur: number; saturate?: number };
  filters?: { blur?: number; bright?: number; contrast?: number; saturate?: number; gray?: number; hue?: number };
  /** Its look with the mouse over it, the keyboard's focus on it, or pressed (colours, frame, shadows, turns, paint). */
  hover?: StateStyle;
  focused?: StateStyle;
  pressed?: StateStyle;
  /** How fast it changes to and from those looks. */
  transition?: { duration: number; ease?: string; delay?: number };
};
/**
 * The store's shared styles (the backend's lib/siteStyles.ts): every heading of a level and
 * the body text take their text style (h1–h6, body), each button kind its button style
 * (solid, outline, link); any element can take a named one by its props.styleId.
 */
export type SiteStyle = { id: string; kind: "text" | "button" | "box"; name?: string; style: Partial<Record<Screen, ScreenStyle>> };
export const SITE_STYLE_KINDS = ["text", "button", "box"] as const;
const STYLE_ID = /^[a-z][a-z0-9-]{0,30}$/;
/** The class of the shared style an element names ("" for none or a bad name). */
export const styleClass = (id: unknown) => (typeof id === "string" && STYLE_ID.test(id) ? `ps-${id}` : "");
/** Shared styles as the shop may use them: known kinds, good ids, each once, at most 60. */
export function siteStylesOf(raw: unknown): SiteStyle[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: SiteStyle[] = [];
  for (const s of raw.slice(0, 60)) {
    if (!s || typeof s !== "object") continue;
    const { id, kind, name, style } = s as Record<string, unknown>;
    if (typeof id !== "string" || !STYLE_ID.test(id) || seen.has(id) || !(SITE_STYLE_KINDS as readonly unknown[]).includes(kind)) continue;
    seen.add(id);
    out.push({ id, kind: kind as SiteStyle["kind"], ...(typeof name === "string" ? { name } : {}), style: style && typeof style === "object" && !Array.isArray(style) ? (style as SiteStyle["style"]) : {} });
  }
  return out;
}

/** What a state may change: never the size or place (the shop's css.ts STATE_KEYS). */
export type StateStyle = Omit<ScreenStyle, "hover" | "focused" | "pressed" | "transition">;
export const STATES = ["hover", "focused", "pressed"] as const;
export type Screen = "base" | "tablet" | "mobile";
export type TreeNode = {
  id: string;
  type: string;
  name?: string;
  props: Record<string, any>;
  style?: Partial<Record<Screen, ScreenStyle>>;
  /** How it moves, as saved (motionOf cleans it). */
  motion?: unknown;
  children?: TreeNode[];
};
export type PageTree = { version: 1; root: TreeNode };

/* ------------------------------------------------------------------- looks */

/**
 * The look and motion of a part of an old section or a rose scene (the editor's
 * "looks", kept in the tree's root as props.looks): its target names the section
 * ("s:<id>") or scene ("b:<name>"), and inside it a field ("/<path>", its [data-edit])
 * or a marked piece ("/@<name>", its [data-part], all of them alike).
 */
export type LookKind = "text" | "button" | "image" | "video" | "box";
export type Look = { kind: LookKind; style?: Partial<Record<Screen, ScreenStyle>>; motion?: unknown };
const LOOK_TARGET = /^(s|b):([A-Za-z0-9_-]{1,80})(?:\/(@[a-z0-9-]{1,40}|[A-Za-z0-9_.]{1,120}))?$/;
export const LOOK_KINDS = ["text", "button", "image", "video", "box"] as const;
export const LOOKS_MAX = 300;

/**
 * The CSS selector of a look's target (null for a bad one). Attributes are named twice so
 * the look wins over the section's own styles; a field's button is its whole button.
 */
export function lookSelector(target: string): string | null {
  const m = LOOK_TARGET.exec(target);
  if (!m) return null;
  const owner = m[1] === "s" ? `[data-cms-section="${m[2]}"][data-cms-section]` : `[data-rose-block="${m[2]}"][data-rose-block]`;
  const at = m[3];
  if (!at) return owner;
  if (at.startsWith("@")) return `${owner} [data-part="${at.slice(1)}"][data-part]`;
  // A scene's words name their language at the end (…title.en): one look for all of them.
  return [at, `${at}.ar`, `${at}.en`, `${at}.he`]
    .flatMap((p) => [`${owner} [data-edit-box="${p}"][data-edit-box]`, `${owner} [data-edit="${p}"][data-edit]:not([data-edit-boxed])`])
    .concat(`${owner} [data-edit-media="${at}"][data-edit-media]`)
    .join(",");
}

/** The page's looks the shop may draw (known kinds, good targets), at most LOOKS_MAX. */
export function looksOf(tree: PageTree): Array<[string, Look]> {
  const raw = tree.root.props?.looks;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const out: Array<[string, Look]> = [];
  for (const [target, v] of Object.entries(raw as Record<string, any>)) {
    if (out.length >= LOOKS_MAX) break;
    if (!lookSelector(target) || !v || typeof v !== "object") continue;
    const kind = (LOOK_KINDS as readonly string[]).includes(v.kind) ? (v.kind as LookKind) : "box";
    out.push([target, { kind, style: v.style && typeof v.style === "object" ? v.style : undefined, motion: v.motion }]);
  }
  return out;
}

/** A look's motion as a node's (for motionOf and the motion engine). */
export const lookNode = (target: string, look: Look): TreeNode => ({ id: target, type: look.kind === "box" ? "section" : look.kind, props: {}, style: look.style, motion: look.motion });

/* ------------------------------------------------------------------ motion */

// A drawing's own: "draw" draws its lines, "morph" turns its shape into its second one and back, "dash" runs its lines.
// Words' own: "letters" one by one (Arabic word by word, so its letters stay joined), "lines" from under a mask,
// "scramble" from scrambled letters, "typewriter" typed, "count" a number counting up to itself.
export const ENTER_KINDS = [
  "fade", "up", "down", "start", "end", "zoom-in", "zoom-out", "blur", "flip-x", "flip-y", "turn",
  "wipe-start", "wipe-end", "wipe-up", "wipe-down", "wipe-center", "circle", "words", "draw",
  "letters", "lines", "scramble", "typewriter", "count",
] as const;
// "type" types its words, waits, and takes them back, again and again.
export const LOOP_KINDS = ["float", "pulse", "spin", "wobble", "swing", "breathe", "bounce", "morph", "dash", "type"] as const;
// "words" lights its words up one by one with the scroll; "pin" holds a section in place for `length` % of a screen.
export const SCROLL_KINDS = ["parallax", "keys", "words", "pin"] as const;
// Then one-time plays as the mouse comes over it, a light that follows the mouse, a ripple where it's
// pressed (a finger too), and springy ones (Motion's springs): it follows the mouse, or wobbles like jelly.
export const HOVER_KINDS = [
  "lift", "grow", "tilt", "magnetic", "glow", "zoom",
  "bounce", "shake", "pulse", "wiggle", "jello", "rubber", "heartbeat", "swing", "flip", "spin", "pop",
  "spotlight", "ripple", "spring", "jelly",
] as const;
export const FX_KINDS = ["shine", "gradient", "grain"] as const;
export const EASES = ["smooth", "soft", "strong", "back", "elastic", "bounce", "linear"] as const;
export type MotionKeys = { rx?: number; ry?: number; rz?: number; x?: number; y?: number; scale?: number; opacity?: number };
export type TreeMotionSpec = {
  engine?: "gsap" | "anime";
  enter?: { kind: (typeof ENTER_KINDS)[number]; duration?: number; delay?: number; ease?: string; distance?: number; stagger?: number };
  scroll?: { kind: (typeof SCROLL_KINDS)[number]; speed?: number; from?: MotionKeys; to?: MotionKeys; start?: number; end?: number; ease?: string; length?: number };
  loop?: { kind: (typeof LOOP_KINDS)[number]; duration?: number; amount?: number };
  hover?: { kind: (typeof HOVER_KINDS)[number]; amount?: number; color?: string };
  fx?: { kind: (typeof FX_KINDS)[number]; speed?: number; color?: string; to?: string };
  phone?: "same" | "lite" | "off";
};

const inList = <T extends string>(v: unknown, list: readonly T[]) => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined);
const within = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const plain = <T extends object>(o: T): T => JSON.parse(JSON.stringify(o));
function keysOf(raw: unknown): MotionKeys | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const k = plain({ rx: within(r.rx, -180, 180), ry: within(r.ry, -180, 180), rz: within(r.rz, -360, 360), x: within(r.x, -1000, 1000), y: within(r.y, -1000, 1000), scale: within(r.scale, 0.1, 4), opacity: within(r.opacity, 0, 1) });
  return Object.keys(k).length ? k : undefined;
}

/** A node's motion the shop may play: known kinds and numbers in range only, else null. */
export function motionOf(n: TreeNode): TreeMotionSpec | null {
  const m = n.motion as Record<string, any> | null | undefined;
  if (!m || typeof m !== "object") return null;
  const out: TreeMotionSpec = {};
  const engine = inList(m.engine, ["gsap", "anime"] as const);
  if (engine) out.engine = engine;
  const enter = inList(m.enter?.kind, ENTER_KINDS);
  if (enter) out.enter = { kind: enter, duration: within(m.enter.duration, 0, 6), delay: within(m.enter.delay, 0, 6), ease: inList(m.enter.ease, EASES), distance: within(m.enter.distance, 0, 400), stagger: within(m.enter.stagger, 0, 1) };
  const scroll = inList(m.scroll?.kind, SCROLL_KINDS);
  if (scroll) out.scroll = { kind: scroll, speed: within(m.scroll.speed, -1, 1), from: keysOf(m.scroll.from), to: keysOf(m.scroll.to), start: within(m.scroll.start, 0, 100), end: within(m.scroll.end, 0, 100), ease: inList(m.scroll.ease, EASES), length: within(m.scroll.length, 10, 400) };
  const loop = inList(m.loop?.kind, LOOP_KINDS);
  if (loop) out.loop = { kind: loop, duration: within(m.loop.duration, 0.2, 20), amount: within(m.loop.amount, 0.1, 3) };
  const hover = inList(m.hover?.kind, HOVER_KINDS);
  if (hover) out.hover = { kind: hover, amount: within(m.hover.amount, 0.1, 3), color: typeof m.hover.color === "string" ? m.hover.color : undefined };
  const fx = inList(m.fx?.kind, FX_KINDS);
  if (fx) out.fx = { kind: fx, speed: within(m.fx.speed, 0.2, 5), color: typeof m.fx.color === "string" ? m.fx.color : undefined, to: typeof m.fx.to === "string" ? m.fx.to : undefined };
  const phone = inList(m.phone, ["same", "lite", "off"] as const);
  if (phone) out.phone = phone;
  return Object.keys(out).length ? plain(out) : null;
}

/**
 * An element's transform, built from CSS variables: its own look (--pt-rx…, set per
 * screen by css.ts) plus what the motion engine moves (TreeMotion.tsx). The anchor
 * shift places a freely placed element by the point the editor chose.
 */
export const TREE_TRANSFORM =
  "translate(var(--pt-ax,0%),var(--pt-ay,0%)) perspective(var(--pt-p,1200px)) " +
  "translate3d(calc(var(--pt-x,0px) + var(--pt-ex,0px) + var(--pt-mx,0px) + var(--pt-hx,0px)),calc(var(--pt-y,0px) + var(--pt-ey,0px) + var(--pt-my,0px) + var(--pt-ly,0px) + var(--pt-hy,0px)),0) " +
  "rotateX(calc(var(--pt-rx,0deg) + var(--pt-erx,0deg) + var(--pt-mrx,0deg) + var(--pt-hrx,0deg))) " +
  "rotateY(calc(var(--pt-ry,0deg) + var(--pt-ery,0deg) + var(--pt-mry,0deg) + var(--pt-hry,0deg))) " +
  "rotate(calc(var(--pt-rz,0deg) + var(--pt-erz,0deg) + var(--pt-mrz,0deg) + var(--pt-lrz,0deg) + var(--pt-hrz,0deg))) " +
  "scale(calc(var(--pt-s,1) * var(--pt-es,1) * var(--pt-ms,1) * var(--pt-ls,1) * var(--pt-hs,1)))";
/** The variables at rest, written on each moving element so it never takes its parent's (custom properties inherit). */
export const TREE_TRANSFORM_REST =
  "--pt-ax:0%;--pt-ay:0%;--pt-p:1200px;--pt-x:0px;--pt-y:0px;--pt-rx:0deg;--pt-ry:0deg;--pt-rz:0deg;--pt-s:1;" +
  "--pt-ex:0px;--pt-ey:0px;--pt-erx:0deg;--pt-ery:0deg;--pt-erz:0deg;--pt-es:1;" +
  "--pt-mx:0px;--pt-my:0px;--pt-mrx:0deg;--pt-mry:0deg;--pt-mrz:0deg;--pt-ms:1;" +
  "--pt-ly:0px;--pt-lrz:0deg;--pt-ls:1;--pt-hx:0px;--pt-hy:0px;--pt-hrx:0deg;--pt-hry:0deg;--pt-hrz:0deg;--pt-hs:1";
/** The look's own variables the editor may preview live in its frame (before saving). */
export const PREVIEW_VARS = ["--pt-rx", "--pt-ry", "--pt-rz", "--pt-p", "--pt-s", "--pt-x", "--pt-y", "--pt-ovo"] as const;

/** Whether a picture or clip is drawn inside a frame (for a colour layer, an animated layer or a zoom on hover). */
export function framed(n: TreeNode, motion = motionOf(n)): boolean {
  if (n.type !== "image" && n.type !== "video") return false;
  const s = n.style ?? {};
  return Boolean(n.props?.edges?.top || n.props?.edges?.bottom || s.base?.overlay || s.tablet?.overlay || s.mobile?.overlay || motion?.fx || motion?.hover?.kind === "zoom");
}

const NO_ODD = /^[^\s<>"'`\\]+$/;
/** A link the shop may draw: a page of the shop, an anchor, https/http, mail or phone. */
export const safeHref = (v: unknown) => (typeof v === "string" && NO_ODD.test(v) && /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(v) ? v : null);
/** A picture's or clip's address the shop may draw: a path on the shop or https. */
export const safeSrc = (v: unknown) => (typeof v === "string" && NO_ODD.test(v) && /^(\/(?!\/)|https:\/\/)/i.test(v) ? v : null);

export const SLIDER_MAX = 12;
export type TreeSlide = { src: string; kind: "image" | "video"; alt?: TreeText; caption?: TreeText; title?: TreeText; text?: TreeText; cta?: TreeText; href?: string };
/** A slider's slides the shop may draw: safe addresses only (a bad one drops out), at most 12. */
export function sliderSlides(props: Record<string, any> | undefined): TreeSlide[] {
  const list: unknown[] = Array.isArray(props?.slides) ? props!.slides : [];
  const out: TreeSlide[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object" || out.length >= SLIDER_MAX) continue;
    const r = raw as Record<string, unknown>;
    const src = safeSrc(r.src);
    if (!src) continue;
    out.push({ src, kind: r.kind === "video" ? "video" : "image", alt: r.alt as TreeText, caption: r.caption as TreeText, title: r.title as TreeText, text: r.text as TreeText, cta: r.cta as TreeText, href: safeHref(r.href) ?? undefined });
  }
  return out;
}
/** How often a slider turns by itself, in seconds (0 = it waits to be turned). */
export const sliderSeconds = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 2 && v <= 30 ? v : 0);

/** A saved tree the shop can draw, or null (the page then shows its sections). */
export function asTree(value: unknown): PageTree | null {
  const v = value as PageTree | null;
  if (!v || typeof v !== "object" || v.version !== 1 || !v.root || v.root.type !== "page") return null;
  return Array.isArray(v.root.children) ? v : null;
}

/** The words in this language, else the store's main one, else any. */
export function pickText(t: unknown, lang: TreeLang, main: TreeLang): string {
  if (typeof t === "string") return t;
  if (!t || typeof t !== "object") return "";
  const m = t as TreeText;
  return m[lang] || m[main] || m.ar || m.en || m.he || "";
}

/** Every node of the tree, parents before their children. */
export function eachNode(tree: PageTree, visit: (n: TreeNode) => void) {
  const walk = (n: TreeNode) => {
    visit(n);
    n.children?.forEach(walk);
  };
  walk(tree.root);
}

/** What the page needs fetched before it's drawn. */
export function treeNeeds(tree: PageTree) {
  const products: TreeNode[] = [];
  let categories = false;
  const blocks = new Set<string>();
  eachNode(tree, (n) => {
    if (n.type === "products") products.push(n);
    if (n.type === "categories") categories = true;
    if (n.type === "roseBlock" && typeof n.props?.block === "string") blocks.add(n.props.block);
  });
  let motion = false;
  // The products whose 360° view an element shows (fetched with their views).
  const spinProducts = new Set<string>();
  eachNode(tree, (n) => {
    if (!motion && motionOf(n)) motion = true;
    if (!motion && n === tree.root) motion = looksOf(tree).some(([t, l]) => Boolean(motionOf(lookNode(t, l))));
    if (n.type === "product360" && typeof n.props?.productId === "string" && /^[\w-]{1,64}$/.test(n.props.productId)) spinProducts.add(n.props.productId);
  });
  // Animated media (Lottie, Rive, particles) and smooth scrolling, each player loaded only then (TreeMedia).
  let media = false;
  eachNode(tree, (n) => {
    if (((n.type === "lottie" || n.type === "rive") && typeof n.props?.src === "string") || (n.type === "section" && n.props?.particles)) media = true;
  });
  const smooth = tree.root.props?.smooth === true;
  return { products, categories, seasons: blocks.has("seasons"), stories: blocks.has("stories"), instagram: blocks.has("instagram"), motion, spinProducts: [...spinProducts].slice(0, 12), media, smooth };
}

/** True when the page is only old sections (a freshly converted page draws exactly as before). */
export function onlyLegacy(tree: PageTree) {
  return (tree.root.children ?? []).every((n) => n.type === "legacy");
}
