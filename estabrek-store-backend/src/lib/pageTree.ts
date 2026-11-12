/**
 * Pages as a tree of elements (the new CMS, track B). A page is a root node whose
 * children are sections; sections hold grids, stacks, columns and content (headings,
 * text, images, buttons, products…), each with its own style for computer, tablet and
 * phone. Columns split a place into 1–4 cells side by side, and each cell is a small
 * container of its own; a slider turns through up to 12 pictures and clips; a drawing
 * (svg) is kept as checked data (lib/svgArt.ts), never as markup. Words are
 * kept in the three languages inside the node ({ ar, en, he }); a missing language
 * shows the store's main one. An old section lives on as a
 * `legacy` node pointing at its PageSection row, so a converted page looks exactly
 * as before and the old editor keeps working on it.
 *
 * Any element can also be turned (around X, Y or Z, with perspective), moved, scaled,
 * covered by a colour or gradient, given its own shadow or glow, or placed freely over
 * its container; and it can move (`motion`: how it comes in, what the scroll does to it,
 * a loop, what the pointer does, an animated layer), drawn by the shop with GSAP.
 *
 * Saved in Page.tree when Page.format is 2 (1 = the old list of sections). The shop
 * draws it on the server (estabrek-storefront src/pageTree) and checks every value
 * again before it becomes CSS.
 */
import { CODE_LIMITS, cssProblem } from "./cssCode.js";
import { TOKEN_REF } from "./designTokens.js";
import { BIND_REF } from "./collectionTree.js";
import { z } from "zod";
import { checkArt, isArtPath, type Art } from "./svgArt.js";
import { isEase } from "./motionEase.js";
import { Recipe as EditRecipe } from "./imageEdit.js";
import { InteractionPolicy, CardDesign } from "./visualControls.js";

export const TREE_VERSION = 1;
export const PAGE_FORMAT = { sections: 1, tree: 2 } as const;
export const TREE_LIMITS = { depth: 12, nodes: 2000, children: 300, bytes: 512 * 1024 } as const;

export const NODE_TYPES = [
  "page", "section", "grid", "stack", "columns", "cell", "deck", "scrollScene",
  "heading", "text", "image", "button", "video", "slider", "svg", "product360", "spacer", "divider", "icon",
  "lottie", "rive", "model3d", "instrument", "chart", "clock", "filterGallery",
  "accordion", "testimonials", "pricing", "schedule", "comparison", "team", "logos", "alert", "marquee",
  "tabs", "countdown", "beforeAfter", "hotspots", "map", "popup", "search", "menu", "showcase",
  "products", "categories", "form", "shop", "cartItems", "cartSummary", "cartCheckout", "roseBlock", "legacy", "block", "component", "collectionList", "productDetail",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

/** Nodes that hold other nodes. */
export const CONTAINER_TYPES: ReadonlySet<NodeType> = new Set(["page", "section", "grid", "stack", "columns", "cell", "popup", "deck", "scrollScene", "collectionList"]);
/** Columns hold this many cells, and columns sit inside a cell at most this deep (columns › cell › columns). */
export const COLUMNS_LIMITS = { cells: 4, nested: 2 } as const;
/** A slider holds at most this many slides, and turns by itself every 2–30 seconds (or not at all). */
export const SLIDER_LIMITS = { slides: 12, minSeconds: 2, maxSeconds: 30 } as const;
/** Nodes that sit straight under the page, and only there. */
// A popup sits on the page like a section and holds content like one; it shows over the page when its moment comes.
export const PAGE_LEVEL_TYPES: ReadonlySet<NodeType> = new Set(["section", "roseBlock", "legacy", "block", "popup"]);
/**
 * An old section or a rose scene can hold objects placed freely over it (words, a picture,
 * a drawing…): the shop draws them on a layer over the section, in sight through a tall scene.
 */
export const OVERLAY_HOSTS: ReadonlySet<NodeType> = new Set(["legacy", "roseBlock"]);
export const OVERLAY_TYPES: ReadonlySet<NodeType> = new Set(["heading", "text", "image", "button", "video", "slider", "svg", "product360", "spacer", "divider", "icon", "lottie", "rive", "model3d"]);
export const OVERLAY_LIMIT = 40;

export const ICON_NAMES = ["heart", "star", "truck", "shield", "gift", "phone", "whatsapp", "mail", "check", "sparkle", "bag", "return"] as const;
/** An icon from the editor's library ("lucide:heart", "ph-duotone:gift"): it carries its own drawing. */
export const ICON_REF = /^(lucide|tabler|tabler-filled|ph-(regular|thin|light|bold|fill|duotone)):[a-z0-9][a-z0-9-]{0,60}$/;
/** Theme colours (the shop maps them to its CSS variables); anything else must be a hex colour. */
export const COLOR_TOKENS = ["text", "muted", "accent", "accent-soft", "accent-contrast", "bg", "surface", "border", "white", "black", "transparent"] as const;

const LANGS = ["ar", "en", "he"] as const;
/** How a colour layer mixes with what's under it. */
export const BLENDS = ["normal", "multiply", "screen", "overlay", "soft-light", "color", "luminosity"] as const;
/** What happens to what sticks out of an element. */
export const OVERFLOWS = ["visible", "hidden", "clip", "scroll", "auto"] as const;
/** The point of a freely placed element that sits at its x/y. */
export const ANCHORS =["top-start", "top", "top-end", "start", "center", "end", "bottom-start", "bottom", "bottom-end"] as const;

/* ------------------------------------------------------------------ values */

/** Words in the three languages; empty ones drop out. */
const local = (max: number) =>
  z
    .object(Object.fromEntries(LANGS.map((l) => [l, z.string().max(max).optional()])) as Record<(typeof LANGS)[number], z.ZodOptional<z.ZodString>>)
    .transform((t) => {
      const out: Partial<Record<(typeof LANGS)[number], string>> = {};
      for (const l of LANGS) {
        const v = t[l]?.trim();
        if (v) out[l] = v;
      }
      return out;
    });

const NO_ODD_CHARS = /^[^\s<>"'`\\]+$/;
/** Links: a page of the shop, an anchor, https/http, mail or phone. Never javascript:/data:. */
const href = z
  .string()
  .trim()
  .max(500)
  .refine((v) => NO_ODD_CHARS.test(v) && /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(v), "Not a safe link");
/** Images and videos: a path on the shop or an https address. */
const src = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => NO_ODD_CHARS.test(v) && /^(\/(?!\/)|https:\/\/)/i.test(v), "Not a safe file address");
const id = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
// A theme colour, a #hex, or one of the store's colour variables by name ("$brand", lib/designTokens.ts).
const color = z
  .string()
  .trim()
  .refine((v) => (COLOR_TOKENS as readonly string[]).includes(v) || /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) || TOKEN_REF.test(v), "Not a theme colour, #hex or $variable");
/** A design variable by name ("$md"): the shop draws it as var(--tk-…-md). */
const tokenRef = z.string().trim().regex(TOKEN_REF, "A variable like $md");
const px = (min: number, max: number) => z.number().finite().min(min).max(max);
const box = (min: number) => z.tuple([px(min, 400), px(min, 400), px(min, 400), px(min, 400)]);
const length = z.string().trim().regex(/^(auto|\d{1,4}(\.\d{1,6})?(px|%|rem|vw|vh))$/, "A length like 320px, 50% or auto");
const place = z.string().trim().regex(/^(span \d{1,2}|-?\d{1,2} \/ (-?\d{1,2}|span \d{1,2}))$/, "Like “1 / 3” or “span 2”");

/** How a motion speeds up and slows down (also a state change's). */
// "fall" speeds up as it goes (a fall; a world baked into keyframes uses it), the rest slow down as they arrive or glide.
export const EASES = ["smooth", "soft", "strong", "back", "elastic", "bounce", "linear", "fall"] as const;
const seconds = (max: number) => z.number().finite().min(0).max(max);
const turnAngle = (max: number) => z.number().finite().min(-max).max(max);
const textShadow = z.object({ x: px(-100, 100), y: px(-100, 100), blur: px(0, 200), color });

/**
 * What an element's look can change to while the mouse is over it, it has the keyboard's
 * focus, or it's pressed: its colours, frame, shadows, turns and the paint of its words.
 * Never its size or place, so nothing around it jumps.
 */
const VISUAL = {
  bg: color.optional(),
  // A background of two or three colours (over `bg`); radial = from the middle out.
  gradient: z.object({ color, to: color, via: color.optional(), angle: z.number().int().min(0).max(360).optional(), radial: z.boolean().optional() }).optional(),
  // Frosted glass: what's behind it is blurred.
  backdrop: z.object({ blur: px(0, 40), saturate: z.number().min(0).max(3).optional() }).optional(),
  color: color.optional(),
  radius: z.union([px(0, 999), tokenRef]).optional(),
  border: z.object({ width: px(0, 20), color, style: z.enum(["solid", "dashed", "dotted"]).optional() }).optional(),
  shadow: z.union([z.enum(["none", "sm", "md", "lg"]), tokenRef]).optional(),
  opacity: z.number().min(0).max(1).optional(),
  weight: z.number().int().min(100).max(900).refine((w) => w % 100 === 0, "100, 200 … 900").optional(),
  letterSpacing: px(-5, 20).optional(),
  wordSpacing: px(-10, 40).optional(),
  // A line under, over or through the words.
  decoration: z.object({ line: z.enum(["none", "underline", "overline", "through"]), style: z.enum(["solid", "wavy", "dotted", "dashed", "double"]).optional(), color: color.optional(), width: px(1, 12).optional(), offset: px(-10, 30).optional() }).optional(),
  // The letters' outline, and letters painted with a gradient.
  stroke: z.object({ width: px(0, 10), color }).optional(),
  fill: z.object({ color, to: color, via: color.optional(), angle: z.number().int().min(0).max(360).optional() }).optional(),
  shadows: z.array(textShadow).max(4).optional(), // shadows of the words (a glow adds its own)
  filters: z
    .object({
      blur: px(0, 40).optional(),
      bright: z.number().min(0).max(3).optional(),
      contrast: z.number().min(0).max(3).optional(),
      saturate: z.number().min(0).max(3).optional(),
      gray: z.number().min(0).max(1).optional(),
      hue: z.number().int().min(-180).max(180).optional(),
    })
    .optional(),
  // Turned (degrees) and moved (px); with perspective a turn around X or Y looks 3D.
  rotateX: turnAngle(180).optional(),
  rotateY: turnAngle(180).optional(),
  rotateZ: turnAngle(360).optional(),
  scale: z.number().finite().min(0.1).max(4).optional(),
  moveX: px(-1000, 1000).optional(),
  moveY: px(-1000, 1000).optional(),
  // A colour, or a gradient of two, over it: over a picture or clip, under the words of anything else.
  overlay: z.object({ color, to: color.optional(), angle: z.number().int().min(0).max(360).optional(), opacity: z.number().min(0).max(1), blend: z.enum(BLENDS).optional() }).optional(),
  // Its own shadow; `follow` = around its shape (a cut-out picture, words), else around its box.
  shade: z.object({ x: px(-100, 100), y: px(-100, 100), blur: px(0, 200), color, follow: z.boolean().optional() }).optional(),
  glow: z.object({ color, size: px(0, 120) }).optional(),
};
export const StateStyle = z.object(VISUAL);
export const STATES = ["hover", "focused", "pressed"] as const;

/** What can cut an element to a shape (the shop's pageTree/css.ts draws each). */
export const SHAPES = [
  "rect", "rounded", "pill", "arch", "circle",
  "hexagon", "octagon", "diamond", "triangle", "pentagon", "star", "heart", "blob", "blob2", "flower",
  "leaf", "drop", "shield", "squircle", "ticket", "bubble", "plus", "slant", "wave", "tilt",
] as const;
/**
 * A 3D model anywhere on the page (the shop's pageTree/model3d.ts): one of the shop's built-in
 * models by name (an unknown name draws nothing) or the store's own .glb file, kept apart
 * from everything else about it so swapping one for another keeps its look, light and motion.
 */
export const FINISHES_3D = ["neon", "metal", "toy", "voxel", "matte", "glass", "gold"] as const;
export const ANIMS_3D = ["none", "spin", "float", "bounce", "pulse", "swing", "orbit"] as const;
export const LIGHTS_3D = ["studio", "soft", "sunset", "neon", "night", "warm"] as const;
// "pedestal" = a round stand it sits on; "halo" = a ring of light on the floor.
export const FLOORS_3D = ["none", "shadow", "grid", "disc", "pedestal", "halo"] as const;
/** What is drawn behind a 3D model (plain CSS, no extra 3D): a glow, a spotlight from above, a rising glow, rings. */
export const BACKDROPS_3D = ["glow", "spot", "sunrise", "rings"] as const;
/** How a 3D model comes in the first time it is seen. */
export const INTROS_3D = ["rise", "pop", "spin", "drop"] as const;
const degrees = z.number().finite().min(-180).max(180);
/** A .glb's address: https or the shop's own path, and while developing a local server's (as the theme stage allows). */
const glbSrc = z
  .string()
  .trim()
  .max(500)
  .refine((v) => NO_ODD_CHARS.test(v) && (/^(\/(?!\/)|https:\/\/)/i.test(v) || (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(v))), "Not a safe file address")
  .refine((v) => /\.glb([?#]|$)/i.test(v), "A 3D file ends in .glb");
/** Particles behind a section (tsParticles, the shop's pageTree/TreeMedia.tsx). */
/** A section's moving particles (the shop's pageTree/particles.ts PARTICLE_DEFS, same order). */
export const PARTICLES = [
  "snow", "snow-heavy", "snowflakes", "blizzard", "raindrops", "drizzle", "clouds", "sunshine", "bolts", "stars",
  "twinkle-stars", "star-dust", "shooting", "moons", "night-mix", "constellation", "galaxy-dust", "orbs", "fireflies", "fireflies-warm",
  "leaves", "leaves-wind", "petals", "sakura", "feathers", "butterflies", "birds", "pollen", "dandelion", "nature-mix",
  "bubbles", "bubbles-big", "foam", "bubble-pop", "ocean-mix", "confetti", "confetti-fall", "ribbons", "balloons", "gifts",
  "hearts", "hearts-fall", "hearts-pulse", "sparkles", "glitter", "stars-gold", "diamonds", "rings", "party-mix", "wedding",
  "lanterns", "ramadan", "eid", "star8", "winter-mix", "spring-mix", "autumn-mix", "summer", "kids", "valentine",
  "coins", "percent", "tags", "sale-mix", "bags", "coffee", "notes", "notes-fall", "music-mix", "links",
  "network", "network-wide", "molecules", "bouncing", "triangles", "squares", "hexagons", "shapes-mix", "circles-outline", "squares-outline",
  "triangles-outline", "hexagons-outline", "stars-outline", "plus", "dots-drift", "pulse-dots", "lines", "pixels", "data-up", "sparks",
  "embers", "glow-dots", "neon-lines", "comets", "magic-dust", "bokeh", "fairy-lights", "aurora-dust", "snow-globe", "rose-rain",
] as const;
/** A pattern over the background, drawn in one colour (the shop's pageTree/css.ts). */
export const PATTERNS = ["dots", "polka", "grid", "lines", "columns", "diagonal", "stripes", "checks", "hatch", "zigzag", "rings", "triangles"] as const;
/** A band along a section's top or bottom: a drawing stretched the full width (a wave, an angle…). */
const SectionEdge = z.object({
  art: z.unknown().superRefine((v, ctx) => {
    const problem = checkArt(v);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
  }).transform((v) => v as Art),
  height: px(4, 400),
  phone: px(4, 400).optional(), // its height on a phone
  color,
  flip: z.boolean().optional(), // mirrored, end to start
  front: z.boolean().optional(), // over the section's content instead of under it
});
const NodeEdges = z.object({ top: SectionEdge.optional(), bottom: SectionEdge.optional() });

/** How a node looks on one screen size. Every key is optional; the shop turns it into CSS. */
export const SizeConstraints = z.object({
  minWidth: z.number().finite().min(8).max(9999).optional(),
  maxWidth: z.number().finite().min(8).max(9999).optional(),
  minHeight: z.number().finite().min(8).max(9999).optional(),
  maxHeight: z.number().finite().min(8).max(9999).optional(),
  aspectRatio: z.number().finite().min(.01).max(100).optional(),
});

/**
 * A shape by equations (docs/cms-big-engine-plan.ar.md G; the shop's shared/shapeForm.ts draws it): each corner
 * square, round, a squircle, bevelled, notched, scooped or a free Bézier, of a size in px; each edge straight, one
 * curve, an arc, a wave, a zigzag, scallops, a notch, or y = f(x) typed (x 0–1), cut in (depth > 0) or bulging out
 * (< 0), waves flowing (`flow` seconds a round); or a whole shape: a superellipse, a polygon or star, a blob (it can
 * breathe), or a polar curve r(a) typed. Typed equations: numbers, x (a, t), + - * / ^ %, brackets and a few
 * functions only (the shop reads them with its own small parser, never eval).
 */
const EQUATION = z.string().trim().min(1).max(120).regex(/^[\d\s.+\-*/^%(),a-zA-Z_]*$/, "Numbers, x, + - * / ^ and functions only")
  .refine((v) => (v.match(/[A-Za-z_]\w*/g) ?? []).every((w) => ["x", "a", "t", "pi", "PI", "e", "E", "sin", "cos", "tan", "abs", "sqrt", "exp", "log", "floor", "ceil", "round", "sign", "min", "max", "pow"].includes(w) || /^\d*e\d*$/.test(w)), "Unknown name in the equation");
const FormCorner = z.object({ kind: z.enum(["square", "round", "squircle", "bevel", "notch", "scoop", "bezier"]), size: px(0, 400).optional(), k: z.number().finite().min(1).max(12).optional(), c: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]).optional() });
const FormEdge = z.object({ kind: z.enum(["straight", "curve", "arc", "wave", "zigzag", "scallop", "notch", "fn"]), depth: z.number().finite().min(-200).max(200).optional(), count: z.number().finite().min(1).max(40).optional(), phase: z.number().min(0).max(1).optional(), flow: z.number().min(0.5).max(30).optional(), fn: EQUATION.optional() })
  .refine((e) => e.kind !== "fn" || Boolean(e.fn), "Type the equation");
export const NodeForm = z.object({
  corners: z.object({ tl: FormCorner.optional(), tr: FormCorner.optional(), br: FormCorner.optional(), bl: FormCorner.optional() }).optional(),
  edges: z.object({ top: FormEdge.optional(), right: FormEdge.optional(), bottom: FormEdge.optional(), left: FormEdge.optional() }).optional(),
  whole: z.object({ kind: z.enum(["superellipse", "polygon", "blob", "polar"]), n: z.number().finite().min(2).max(24).optional(), inner: z.number().min(0.2).max(1).optional(), seed: z.number().int().min(0).max(9999).optional(), amount: z.number().min(0).max(0.6).optional(), flow: z.number().min(0.5).max(30).optional(), fn: EQUATION.optional() })
    .refine((w) => w.kind !== "polar" || Boolean(w.fn), "Type the equation").optional(),
});

export const ScreenStyle = z.object({
  ...VISUAL,
  // Partial screen overrides inherit field-by-field; effective conflicts are solved by the editor.
  constraints: SizeConstraints.optional(),
  movement: z.enum(["vertical", "horizontal", "both", "free"]).optional(),
  pad: box(0).optional(), // top, end, bottom, start (follows the text direction)
  margin: box(-400).optional(),
  width: length.optional(),
  inlineBox: z.boolean().optional(),
  maxWidth: length.optional(),
  height: length.optional(),
  minHeight: length.optional(),
  sticky: z.union([z.literal(false), z.object({ top: z.number().finite().min(0).max(240) })]).optional(),
  columns: z.number().int().min(1).max(12).optional(), // grids
  widths: z.array(z.number().int().min(1).max(12)).min(1).max(COLUMNS_LIMITS.cells).optional(), // columns: each cell's share ([1, 2] = a third and two thirds)
  gap: z.union([px(0, 200), tokenRef]).optional(),
  rowGap: z.union([px(0, 200), tokenRef]).optional(),
  // Inner space on every side from a space variable ("$md"); its own `pad` still wins.
  space: tokenRef.optional(),
  direction: z.enum(["row", "column"]).optional(), // stacks
  wrap: z.boolean().optional(),
  justify: z.enum(["start", "center", "end", "between", "around"]).optional(),
  align: z.enum(["start", "center", "end", "stretch"]).optional(),
  self: z.enum(["start", "center", "end", "stretch"]).optional(), // where it sits across its row or column, whatever its container says
  col: place.optional(), // its cell in the parent grid
  row: place.optional(),
  order: z.number().int().min(-50).max(50).optional(),
  font: z.enum(["heading", "body", "serif", "sans", "mono"]).optional(),
  // A family from the shop's fonts library by its name ("cairo"); it wins over `font`. The shop skips one it doesn't have.
  family: z.union([z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,40}$/), tokenRef]).optional(),
  italic: z.boolean().optional(),
  size: px(8, 200).optional(),
  iconSize: px(8, 400).optional(), // an icon's drawing (its words keep `size`)
  // Fluid: the words grow from this size on a phone to `size` on a computer.
  sizeMin: px(8, 200).optional(),
  lineHeight: z.number().min(0.8).max(3).optional(),
  textAlign: z.enum(["start", "center", "end"]).optional(),
  caps: z.enum(["none", "upper", "lower", "title", "small"]).optional(),
  lines: z.number().int().min(1).max(12).optional(), // at most this many lines, then "…"
  balance: z.enum(["balance", "pretty"]).optional(), // even lines (headings) or no lonely last word (text)
  textColumns: z.number().int().min(1).max(4).optional(),
  fit: z.enum(["cover", "contain"]).optional(),
  // A picture's or clip's point that stays in sight when it's cut to its frame (% across, % down).
  focus: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional(),
  aspect: z.string().trim().regex(/^\d{1,2}\s*\/\s*\d{1,2}$/, "Like 16 / 9").optional(),
  shape: z.enum(SHAPES).optional(), // what clips it (a picture inside takes the shape)
  form: NodeForm.optional(), // a shape by equations (it wins over `shape`)
  pattern: z.object({ kind: z.enum(PATTERNS), color, size: px(4, 200), opacity: z.number().min(0).max(1).optional() }).optional(),
  // A soft mesh of two to four colours fading from the corners over the background; `move` drifts it (an aurora).
  mesh: z.object({ colors: z.array(color).min(2).max(4), soft: z.number().min(20).max(100).optional(), move: z.boolean().optional(), speed: z.number().min(0.2).max(3).optional() }).optional(),
  perspective: px(200, 4000).optional(),
  origin: z.enum(["center", "top", "bottom"]).optional(),
  // Placed freely over its container, its anchor at x% from the line's start and y% from the top; false = back in the flow on this screen.
  layer: z.union([z.literal(false), z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), anchor: z.enum(ANCHORS).optional() })]).optional(),
  z: z.number().int().min(-10).max(50).optional(), // which goes on top
  // What happens to what sticks out of it: shown, cut, cut without a scroll box (sticky still works), or scrolled.
  overflow: z.enum(OVERFLOWS).optional(),
  overflowX: z.enum(OVERFLOWS).optional(),
  overflowY: z.enum(OVERFLOWS).optional(),
  hidden: z.boolean().optional(),
  // Its look while the mouse is over it, it has the keyboard's focus, or it's pressed; and how fast it changes.
  hover: StateStyle.optional(),
  focused: StateStyle.optional(),
  pressed: StateStyle.optional(),
  transition: z.object({ duration: seconds(3), ease: z.enum(EASES).optional(), delay: seconds(3).optional() }).optional(),
});
export const NodeStyle = z.object({ base: ScreenStyle.optional(), tablet: ScreenStyle.optional(), mobile: ScreenStyle.optional() });

/* ------------------------------------------------------------------ motion */

// "draw" draws a drawing's lines, "morph" turns its shape into its second one and back, "dash" runs its lines.
// Words: "letters" one by one, "lines" from under a mask, "scramble", "typewriter", "count" (a number counting up).
export const ENTER_KINDS = [
  "fade", "up", "down", "start", "end", "zoom-in", "zoom-out", "blur", "flip-x", "flip-y", "turn",
  "wipe-start", "wipe-end", "wipe-up", "wipe-down", "wipe-center", "circle", "words", "draw",
  "letters", "lines", "scramble", "typewriter", "count",
] as const;
// "type" types its words, waits and takes them back, again and again.
export const LOOP_KINDS = ["float", "pulse", "spin", "wobble", "swing", "breathe", "bounce", "morph", "dash", "type"] as const;
// "words" lights its words up one by one with the scroll; "pin" holds it in place for `length` % of a screen;
// "sideways" holds it while what it holds slides along its row with the scroll (a horizontal gallery);
// "count" counts its number up as it crosses the screen; "orbit" sends what it holds around a circle, along
// an arc or a wave with the scroll; "draw" draws its lines with the scroll.
export const SCROLL_KINDS = ["parallax", "keys", "words", "pin", "sideways", "count", "orbit", "draw"] as const;
/** The way "orbit" sends what it holds: around a circle, along an arc (a rainbow), or along a wave. */
export const ORBIT_SHAPES = ["circle", "arc", "wave"] as const;
// Then plays once as the mouse comes over it, a light following the mouse, a ripple where it's pressed, springy ones.
export const HOVER_KINDS = [
  "lift", "grow", "tilt", "magnetic", "glow", "zoom",
  "bounce", "shake", "pulse", "wiggle", "jello", "rubber", "heartbeat", "swing", "flip", "spin", "pop",
  "spotlight", "ripple", "spring", "jelly",
] as const;
export const FX_KINDS = ["shine", "gradient", "grain"] as const;
/** A moment of a scroll animation, added to the element's own look (opacity as it is). */
const MotionKeys = z.object({
  rx: z.number().finite().min(-180).max(180).optional(),
  ry: z.number().finite().min(-180).max(180).optional(),
  rz: z.number().finite().min(-360).max(360).optional(),
  x: px(-1000, 1000).optional(),
  y: px(-1000, 1000).optional(),
  scale: z.number().finite().min(0.1).max(4).optional(),
  opacity: z.number().min(0).max(1).optional(),
});
const pct = z.number().finite().min(0).max(100);
/**
 * One moment of a keyframe animation, at `at` % of it (0 = its start, 100 = its end), like CSS
 * @keyframes: moved (px, or % of its own size), turned, sized, skewed, see-through, blurred,
 * recoloured, rounded or cut (inset % from top, end, bottom, start). What a moment leaves out
 * glides between the moments around it. `ease` = how it gets here from the moment before.
 */
export const KeyFrame = z.object({
  at: pct,
  x: px(-2000, 2000).optional(),
  y: px(-2000, 2000).optional(),
  xp: z.number().finite().min(-500).max(500).optional(),
  yp: z.number().finite().min(-500).max(500).optional(),
  rx: turnAngle(720).optional(),
  ry: turnAngle(720).optional(),
  rz: turnAngle(1440).optional(),
  scale: z.number().finite().min(0).max(6).optional(),
  sx: z.number().finite().min(-6).max(6).optional(),
  sy: z.number().finite().min(-6).max(6).optional(),
  skewX: turnAngle(80).optional(),
  skewY: turnAngle(80).optional(),
  opacity: z.number().min(0).max(1).optional(),
  blur: px(0, 60).optional(),
  bright: z.number().min(0).max(3).optional(),
  hue: z.number().finite().min(-180).max(180).optional(),
  color: color.optional(),
  bg: color.optional(),
  radius: px(0, 999).optional(),
  clip: z.tuple([pct, pct, pct, pct]).optional(),
  ease: z.enum(EASES).optional(),
});
/** When keyframes play: on arrival, once seen, with the scroll, with its scroll scene, while the mouse is over it, on a click (again = back), again and again, or only when a trigger asks. */
export const KEY_TRIGGERS = ["load", "view", "scroll", "scene", "hover", "click", "loop", "trigger"] as const;
/** The pieces of an element that move on their own: itself, its layer behind (before), its layer in front (after), and what's inside it (its words or picture). */
export const KEY_PARTS = ["self", "before", "after", "inner"] as const;
const Frames = z.array(KeyFrame).min(2).max(16);
export const KEY_ORIGINS = ["center", "top", "bottom", "start", "end", "top-start", "top-end", "bottom-start", "bottom-end"] as const;
export const NodeKeys = z.object({
  on: z.enum(KEY_TRIGGERS),
  duration: z.number().finite().min(0.05).max(60).optional(),
  delay: seconds(20).optional(),
  ease: z.enum(EASES).optional(),
  repeat: z.number().int().min(-1).max(50).optional(), // -1 = for ever
  yoyo: z.boolean().optional(),
  start: pct.optional(), // with the scroll: from when its top is this % down the screen…
  end: pct.optional(), // …to this %
  scrub: z.number().min(0).max(3).optional(), // with the scroll: seconds to catch up (0 = at once)
  origin: z.enum(KEY_ORIGINS).optional(),
  parts: z.object({ self: Frames.optional(), before: Frames.optional(), after: Frames.optional(), inner: Frames.optional() }).refine((p) => Object.values(p).some(Boolean), "Keyframes for at least one piece"),
});
/** How something comes into and leaves a scroll scene. */
export const CUE_KINDS = ["fade", "up", "down", "start", "end", "zoom", "shrink", "blur", "turn", "flip", "wipe", "none"] as const;
/** Inside a scroll scene: shown from `from` % of the scene to `to` %; `in`/`out` = how it comes and goes ("stay" = it stays to the end); `soft` = % of its time the coming and going take. */
export const NodeCue = z.object({
  from: pct,
  to: pct,
  in: z.enum(CUE_KINDS).optional(),
  out: z.enum([...CUE_KINDS, "stay"]).optional(),
  soft: z.number().min(0).max(50).optional(),
}).refine((c) => c.to > c.from, "It ends after it starts");

/**
 * An element's own physics (the editor's physics, docs/cms-big-engine-plan.ar.md I1): it leans after the pointer
 * (follow), is pulled to it when near (magnet), can be grabbed and thrown inside its box (throw), falls into its
 * place and bounces (drop), hangs and swings (pendulum), floats as if on water (float), or lags behind the scroll's
 * speed (scroll). A spring's pull and calm, its weight, how strong, how bouncy, and whether a throw goes back home.
 */
export const PHYSICS_KINDS = ["follow", "magnet", "throw", "drop", "pendulum", "float", "scroll"] as const;
export const NodePhysics = z.object({
  kind: z.enum(PHYSICS_KINDS),
  stiffness: z.number().finite().min(20).max(600).optional(),
  damping: z.number().finite().min(1).max(60).optional(),
  mass: z.number().finite().min(0.2).max(5).optional(),
  amount: z.number().finite().min(0.1).max(3).optional(),
  bounce: z.number().finite().min(0).max(0.95).optional(),
  home: z.enum(["back", "stay"]).optional(),
});

/**
 * How an element moves: comes in once when it's first seen (`enter`, `stagger` =
 * what it holds one after another), follows the scroll (`parallax`, or from → to
 * between two points of the screen, 0–100 % from the top), loops, answers the
 * pointer, or carries an animated layer. `phone` "lite" keeps only the coming in.
 * `keys` = its own keyframes (0–100 %), for itself and its pieces; `cue` = when it shows
 * inside a scroll scene.
 */
export const NodeMotion = z.object({
  keys: NodeKeys.optional(),
  cue: NodeCue.optional(),
  engine: z.enum(["gsap", "anime"]).optional(),
  enter: z.object({ kind: z.enum(ENTER_KINDS), duration: seconds(6).optional(), delay: seconds(6).optional(), ease: z.enum(EASES).optional(), distance: px(0, 400).optional(), stagger: seconds(1).optional() }).optional(),
  scroll: z.object({ kind: z.enum(SCROLL_KINDS), speed: z.number().min(-1).max(1).optional(), from: MotionKeys.optional(), to: MotionKeys.optional(), start: z.number().min(0).max(100).optional(), end: z.number().min(0).max(100).optional(), ease: z.enum(EASES).optional(), length: z.number().min(10).max(400).optional(),
    // "orbit": its shape, how big (% of its width) and how many turns the scroll gives it (minus = the other way).
    orbit: z.object({ shape: z.enum(ORBIT_SHAPES), radius: z.number().min(10).max(100).optional(), turn: z.number().min(-2).max(2).optional() }).optional() }).optional(),
  loop: z.object({ kind: z.enum(LOOP_KINDS), duration: z.number().min(0.2).max(20).optional(), amount: z.number().min(0.1).max(3).optional() }).optional(),
  hover: z.object({ kind: z.enum(HOVER_KINDS), amount: z.number().min(0.1).max(3).optional(), color: color.optional() }).optional(),
  fx: z.object({ kind: z.enum(FX_KINDS), speed: z.number().min(0.2).max(5).optional(), color: color.optional(), to: color.optional() }).optional(),
  physics: NodePhysics.optional(),
  phone: z.enum(["same", "lite", "off"]).optional(),
});

/* ------------------------------------------------------------------ looks */

/**
 * The look and motion of a part of an old section or a rose scene, kept on the page
 * (root props.looks): "s:<section id>" or "b:<scene>", then "/<field path>" or
 * "/@<piece>" for something inside it. The shop turns them into CSS for that part.
 */
const DOM_PART_SOURCE = "~[a-z][a-z0-9-]{0,15}\\.[1-9][0-9]{0,2}(?:\\.[a-z][a-z0-9-]{0,15}\\.[1-9][0-9]{0,2}){0,15}";
const PART_TARGET_SOURCE = `(?:@[a-z0-9-]{1,40}|${DOM_PART_SOURCE})`;
export const PART_TARGET = new RegExp(`^${PART_TARGET_SOURCE}$`);
export const LOOK_TARGET = new RegExp(`^(?!n:[^/]+(?:$|/(?![@~])))(s|b|n):([A-Za-z0-9_-]{1,80})(?:/(${PART_TARGET_SOURCE}|[A-Za-z0-9_.]{1,120}))?$`);
export const LOOK_KINDS = ["text", "button", "image", "video", "box"] as const;
export const LOOKS_LIMIT = 300;
export const LookEntry = z.object({ kind: z.enum(LOOK_KINDS), style: NodeStyle.optional(), motion: NodeMotion.optional() });
const Looks = z
  .record(z.string().regex(LOOK_TARGET, "Not a part of a section or scene"), LookEntry)
  .refine((r) => Object.keys(r).length <= LOOKS_LIMIT, `At most ${LOOKS_LIMIT} looks on a page`);
const PartLooks = z.record(z.string().regex(PART_TARGET), LookEntry).refine(r => Object.keys(r).length <= LOOKS_LIMIT, `At most ${LOOKS_LIMIT} looks on a page`);

/* ------------------------------------------------- pieces and triggers */

/**
 * An element's two extra layers (like CSS ::before and ::after, but real pieces the motion can move):
 * a colour or gradient of their own, their own place over it (inset px from top, end, bottom, start;
 * minus = beyond its edges), corners, see-through, mixing, blur and frame. Behind its content unless `front`.
 */
const PieceLayer = z.object({
  bg: color.optional(),
  to: color.optional(),
  angle: z.number().int().min(0).max(360).optional(),
  radial: z.boolean().optional(),
  inset: box(-400).optional(),
  // Where it sits: over all of it, a band along one side (`h` tall or `w` wide), or a `w`×`h` box in its middle.
  at: z.enum(["fill", "top", "bottom", "start", "end", "center"]).optional(),
  w: px(0, 2000).optional(),
  h: px(0, 2000).optional(),
  radius: px(0, 999).optional(),
  opacity: z.number().min(0).max(1).optional(),
  blend: z.enum(BLENDS).optional(),
  blur: px(0, 60).optional(),
  border: z.object({ width: px(0, 20), color, style: z.enum(["solid", "dashed", "dotted"]).optional() }).optional(),
  front: z.boolean().optional(),
});
export const NodeLayers = z.object({ before: PieceLayer.optional(), after: PieceLayer.optional() });

/** What starts a trigger: a click, a double click, the mouse coming or going, coming into or out of sight, the page opening, the page scrolled past `at` %, `at` seconds on the page. */
export const TRIGGER_EVENTS = ["click", "dblclick", "hover", "leave", "view", "leaveView", "load", "scrolled", "timer"] as const;
/** Short moves a trigger can play on any element. */
export const PLAY_PRESETS = ["bounce", "shake", "pulse", "wiggle", "jello", "rubber", "heartbeat", "swing", "flip", "spin", "pop", "flash", "tada"] as const;
export const BURSTS = ["confetti", "hearts", "stars", "sparkles", "snow", "bubbles"] as const;
export const SOUNDS = ["click", "pop", "chime", "whoosh", "success"] as const;
/** An element of the page by its id, or "self" (the element the trigger is on). */
const triggerTarget = z.string().trim().regex(/^[A-Za-z0-9_-]{1,40}$/, "An element's id or self");
/** What a trigger does, one after another (`wait` pauses between them). */
export const TriggerAction = z.discriminatedUnion("act", [
  // Plays the target's own keyframes (forward, back, back-and-forth, from the start) or a short move.
  z.object({ act: z.literal("play"), target: triggerTarget, what: z.enum(["keys", ...PLAY_PRESETS]), mode: z.enum(["play", "reverse", "toggle", "restart"]).optional() }),
  z.object({ act: z.literal("visible"), target: triggerTarget, value: z.enum(["show", "hide", "toggle"]) }),
  z.object({ act: z.literal("scrollTo"), target: triggerTarget, offset: px(-400, 400).optional() }),
  z.object({ act: z.literal("scene"), target: triggerTarget, at: pct }), // a scroll scene, scrolled to its moment
  z.object({ act: z.literal("link"), href, newTab: z.boolean().optional() }),
  z.object({ act: z.literal("popup"), target: triggerTarget, value: z.enum(["open", "close"]) }),
  z.object({ act: z.literal("video"), target: triggerTarget, value: z.enum(["play", "pause", "toggle", "restart", "mute", "unmute"]) }),
  z.object({ act: z.literal("burst"), kind: z.enum(BURSTS), color: color.optional(), amount: z.number().int().min(5).max(200).optional() }),
  z.object({ act: z.literal("copy"), text: local(200), note: local(120).optional() }), // a coupon code to the clipboard, with a note
  z.object({ act: z.literal("toast"), text: local(200) }),
  z.object({ act: z.literal("sound"), kind: z.enum(SOUNDS), volume: z.number().min(0).max(1).optional() }),
  z.object({ act: z.literal("vibrate") }),
  z.object({ act: z.literal("wait"), seconds: seconds(30) }),
]);
export const NodeTrigger = z.object({
  on: z.enum(TRIGGER_EVENTS),
  at: z.number().finite().min(0).max(600).optional(),
  once: z.boolean().optional(),
  do: z.array(TriggerAction).min(1).max(8),
});
export const NodeTriggers = z.array(NodeTrigger).max(8);

/* ------------------------------------------------------------- each type */

/** A section's drawn background (the shop's pageTree/scene.ts SCENE_KINDS, same order). */
export const SCENE_KINDS = [
  "constellation", "orbs", "waves", "grid", "starfield", "ribbons", "snow", "fireworks", "matrix",
  "aurora", "bokeh", "fireflies", "petals", "bubbles", "rain", "confetti", "honeycomb", "dotwave", "topography",
  "circuit", "lava", "galaxy", "tunnel", "sunburst", "ripples", "flow", "silk", "mountains", "clouds",
  "sparkles", "hearts", "leaves", "lanterns", "crescent", "arabesque", "lowpoly", "synthwave", "equalizer", "heartbeat",
  "helix", "orbits", "radar", "smoke", "weave", "shapes", "memphis", "beams", "dunes", "gems",
  "lightning", "meteors", "nebula", "blossom", "balloons", "butterflies", "birds", "fish", "jellyfish", "seaweed",
  "sunrays", "droplets", "sea", "grass", "forest", "skyline", "mosque", "garland", "stringlights", "ornaments",
  "coins", "percent", "bags", "beans", "notes", "vinyl", "oscilloscope", "code", "globe", "spiral",
  "kaleidoscope", "mandala", "moire", "checker", "stripes", "zigzag", "halftone", "grain", "scanlines", "glitch",
  "pixels", "blocks", "planes", "dandelion", "feathers", "linewaves", "blobs", "embers", "gears", "wavefield", "terrain",
] as const;

const none = z.object({});
/** A slider's shapes, arrows and dots (the shop draws them: pageTree/sliderLookCss.ts). */
export const SLIDER_LOOKS = ["plain", "rounded", "card", "frame", "polaroid", "arch", "circle", "blob", "ticket", "film", "phone", "browser", "tilt", "stack", "peek", "trio"] as const;
export const SLIDER_ARROW_LOOKS = ["round", "square", "bare", "glass", "outline", "corner"] as const;
export const SLIDER_DOT_LOOKS = ["dots", "lines", "bars", "numbers"] as const;

/** The shop element's own words (the same list as shared/partWords.ts SHOP_WORD_FIELDS). */
export const SHOP_WORD_FIELDS = ["searchLabel", "categoriesLabel", "allLabel", "inStockLabel", "sortLabel", "priceLabel", "coloursLabel", "sizesLabel", "filtersLabel", "clearLabel", "countLabel", "moreLabel"] as const;
/** What a held section does while the next one covers it: darkens, shrinks back, blurs, moves up slowly, fades. */
export const COVER_UNDER = ["none", "dim", "shrink", "blur", "slow", "fade"] as const;

// Words along a curve (the editor's focus mode; shared/textCurve.ts in the shop draws it): an arc, a wave or a circle,
// how bent, the words' size and spacing in the curve's own box.
const Curve = z.object({ kind: z.enum(["arc", "wave", "circle"]), bend: z.number().min(-100).max(100).optional(), size: z.number().min(20).max(240).optional(), space: z.number().min(-10).max(60).optional() });

export const NODE_PROPS: Record<NodeType, z.ZodType> = {
  // `smooth`: the page scrolls smoothly (Lenis), for whoever hasn't asked their device for less motion.
  // `cursor`: a mark that follows the mouse (a dot, a ring, or one that turns what's under it around), with
  // an element's `cursorText` in it while the mouse is over that element.
  // perfAuto: false = the shop's automatic lightening off for this page (pageTree/perf.ts autoOf).
  page: z.object({ looks: Looks.optional(), smooth: z.boolean().optional(), perfAuto: z.boolean().optional(), commerceVersion: z.literal(1).optional(), cursor: z.object({ kind: z.enum(["dot", "ring", "blend"]), color: color.optional(), size: px(8, 120).optional() }).optional() }),
  section: z.object({
    tag: z.enum(["section", "header", "footer", "aside"]).optional(),
    anchor: z.string().trim().regex(/^[A-Za-z][\w-]{0,40}$/).optional(),
    contained: z.boolean().optional(), // the content keeps to the page width
    edges: NodeEdges.optional(),
    particles: z.object({ kind: z.enum(PARTICLES), color: color.optional(), amount: z.number().min(0.2).max(3).optional(), speed: z.number().min(0.2).max(3).optional() }).optional(),
    scene: z.object({
      kind: z.enum(SCENE_KINDS),
      color: color.optional(), secondary: color.optional(),
      amount: z.number().int().min(8).max(100).default(32),
      speed: z.number().finite().min(0).max(3).default(1),
      intensity: z.number().finite().min(0).max(2).default(1),
      interactive: z.boolean().default(false),
    }).optional(),
    // Held on the screen while the page scrolls, then the section after it slides up over it from below
    // (a curtain): `hold` = screens it stays first; `under` = what it does while it's covered; `phone`
    // false = not on phones.
    cover: z.object({
      hold: z.number().finite().min(0).max(6).default(0),
      under: z.enum(COVER_UNDER).default("none"),
      phone: z.boolean().default(true),
      // How the next one's top edge comes over it: straight, an arch that flattens, or a slant that levels.
      enter: z.enum(["rise", "arch", "tilt"]).default("rise"),
    }).optional(),
    // The page takes this colour while this section is in the middle of the screen (and back after).
    paint: color.optional(),
  }),
  grid: none,
  stack: none,
  // A scroll scene: a clip that plays as the page scrolls (or a picture held still), and what it holds
  // comes and goes at its own moments (each one's motion.cue, 0–100 % of the scene). "pin": held on the
  // screen for `length` screens of scrolling; "flow": what it holds scrolls over the held picture, which
  // moves on once they've passed. `chapters` splits it for the editor (10 = every 10 %); `smooth` = how
  // softly the picture follows the scroll (0 = at once); `fps` = the clip's frames a second; the picture
  // can blur, darken and zoom between two moments.
  scrollScene: z.object({
    media: z.object({
      kind: z.enum(["video", "image", "none"]),
      src: src.optional(),
      phone: src.optional(),
      poster: src.optional(),
      fit: z.enum(["cover", "contain"]).optional(),
      focus: z.object({ x: pct, y: pct }).optional(),
      label: local(120).optional(),
    }).optional(),
    mode: z.enum(["pin", "flow"]).default("pin"),
    length: z.number().finite().min(1).max(12).default(4),
    chapters: z.number().int().min(1).max(20).default(10),
    smooth: z.number().finite().min(0).max(1).default(0.35),
    fps: z.number().int().min(12).max(120).default(30),
    blur: z.object({ from: pct, to: pct, amount: px(0, 40) }).optional(),
    dim: z.object({ from: pct, to: pct, opacity: z.number().min(0).max(0.95), color: color.optional() }).optional(),
    zoom: z.object({ from: pct, to: pct, scale: z.number().finite().min(0.5).max(3) }).optional(),
    progress: z.enum(["none", "bar", "dots", "line"]).optional(),
    // The picture seen through a window that opens from small to the whole screen between two moments.
    window: z.object({ shape: z.enum(["circle", "arch", "rounded", "diamond"]), from: pct, to: pct }).optional(),
  }),
  deck:z.object({ presentation: z.enum(["deck", "tabs", "vertical-tabs"]).optional(), transition: z.enum(["slide", "fade", "wipe"]).optional(), duration: z.number().finite().min(0).max(2).optional(), initial: z.number().int().min(0).max(11).optional(), arrows: z.boolean().optional(), dots: z.boolean().optional(), menu: z.boolean().optional(), labels: z.record(z.string().regex(/^[A-Za-z0-9_-]{1,40}$/), local(80)).refine(labels => Object.keys(labels).length <= 12, "At most 12 panel labels").optional() }),
  // On a phone the cells go one under the other (stack), the last first (reverse), or stay side by side (keep).
  columns: z.object({ phone: z.enum(["stack", "reverse", "keep"]).optional() }),
  cell: none,
  // `rich`: the words carry a little formatting ([b]…[/b], [link=/shop]…[/link]: the shop's pageTree/rich.ts).
  heading: z.object({ text: local(300), level: z.number().int().min(1).max(6).default(2), rich: z.boolean().optional(), curve: Curve.optional() }),
  text: z.object({ text: local(5000), rich: z.boolean().optional(), curve: Curve.optional() }),
  image: z.object({
    src, alt: local(200).optional(), href: href.optional(),
    // Sparkling stars on it (the editor's focus mode finds the picture's corners, edges and highlights, or they're
    // placed by hand): where (fractions of the picture), their drawing, colour, size, speed and when they twinkle.
    sparkle: z.object({
      points: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), s: z.number().min(0.2).max(3).optional() })).min(1).max(80),
      shape: z.enum(["glint", "star", "flare", "cross"]).optional(),
      color: z.union([z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i), z.enum(["accent", "accent-soft", "text", "white"])]).optional(),
      size: z.number().min(4).max(64).optional(),
      speed: z.number().min(0.3).max(6).optional(),
      when: z.enum(["always", "hover", "few"]).optional(),
      glow: z.boolean().optional(),
    }).optional(),
    // The picture's edit (focus mode): the original it was made from and what was done to it, so the editor can
    // change or undo it (`src` is the edited copy the shop shows).
    edit: z.object({ from: src, recipe: EditRecipe }).optional(),
  }),
  button: z.object({ label: local(120), href, variant: z.enum(["solid", "outline", "link"]).default("solid"), newTab: z.boolean().optional(), rich: z.boolean().optional() }),
  video: z.object({
    src,
    label: local(120).optional(),
    poster: src.optional(),
    autoplay: z.boolean().optional(),
    loop: z.boolean().optional(),
    muted: z.boolean().optional(),
    controls: z.boolean().optional(),
  }),
  // A picture or an MP4 clip on each slide, with its words and an optional link. No autoplay = it waits to be turned.
  // A product's 360° view (a scan linked to it, lib/productSpins.ts): that colour's, else the one for every colour.
  // Without a product yet it draws nothing in the shop (the editor shows its place).
  product360: z.object({ productId: id.optional(), itemId: id.optional(), auto: z.boolean().optional(), label: local(120).optional() }),
  // A Lottie animation (.json or .lottie) or a Rive one (.riv, with its state machine): it plays by itself,
  // once it's seen, with the mouse over it, or (Lottie) with the scroll. No file yet = nothing in the shop.
  lottie: z.object({
    src: src.refine((v) => /\.(json|lottie)([?#]|$)/i.test(v), "A Lottie file ends in .json or .lottie").optional(),
    play: z.enum(["auto", "view", "hover", "scroll"]).optional(),
    loop: z.boolean().optional(),
    speed: z.number().min(0.1).max(4).optional(),
    label: local(120).optional(),
  }),
  rive: z.object({
    src: src.refine((v) => /\.riv([?#]|$)/i.test(v), "A Rive file ends in .riv").optional(),
    stateMachine: z.string().trim().min(1).max(60).optional(),
    artboard: z.string().trim().min(1).max(60).optional(),
    play: z.enum(["auto", "view", "hover"]).optional(),
    label: local(120).optional(),
  }),
  model3d: z.object({
    poster: src.optional(),
    model: z.string().trim().regex(/^[a-z][a-z0-9-]{1,30}$/).optional(),
    file: z.object({ url: glbSrc, name: z.string().trim().max(200).optional(), clip: z.string().trim().max(100).optional() }).optional(),
    finish: z.enum(FINISHES_3D).optional(),
    colours: z.object({ body: color.optional(), trim: color.optional(), accent: color.optional(), glow: color.optional(), screen: color.optional(), metal: color.optional() }).optional(),
    knobs: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{0,20}$/), z.number().finite().min(-100).max(100)).refine((k) => Object.keys(k).length <= 16, "At most 16 knobs").optional(),
    turn: z.object({ x: degrees, y: degrees, z: degrees }).optional(),
    size: z.number().min(0.2).max(3).optional(),
    lift: z.number().min(-2).max(2).optional(),
    anim: z.object({ type: z.enum(ANIMS_3D), speed: z.number().min(0).max(5).optional(), amount: z.number().min(0).max(2).optional(), trigger: z.enum(["always", "hover", "scroll"]).optional() }).optional(),
    camera: z.object({ fov: z.number().min(15).max(80).optional(), distance: z.number().min(2).max(20).optional(), height: z.number().min(-5).max(5).optional() }).optional(),
    lights: z.object({
      preset: z.enum(LIGHTS_3D).optional(),
      ambient: z.number().min(0).max(3).optional(),
      key: z.number().min(0).max(8).optional(),
      env: z.number().min(0).max(4).optional(),
      rim: z.number().min(0).max(120).optional(),
      colours: z.tuple([color, color]).optional(),
    }).optional(),
    floor: z.enum(FLOORS_3D).optional(),
    bg: color.optional(), // none = the page shows through
    drag: z.boolean().optional(), // the shopper turns it with the mouse or a finger
    zoom: z.boolean().optional(),
    auto: z.number().min(-2).max(2).optional(), // turns by itself (minus = the other way)
    tilt: z.boolean().optional(), // leans toward the mouse
    // Its stage: what's behind it, how it comes in, sparkles floating around it, and going back to its pose after
    // a shopper turns it.
    backdrop: z.object({ kind: z.enum(BACKDROPS_3D), color: color.optional() }).optional(),
    intro: z.enum(INTROS_3D).optional(),
    sparkles: z.object({ count: z.number().int().min(1).max(120), color: color.optional(), size: z.number().min(0.5).max(6).optional() }).optional(),
    back: z.boolean().optional(),
    href: href.optional(), // the whole model is a link (then it isn't turned by hand)
    label: local(120).optional(),
    // Focus mode (A5): its parts' own looks by name (a mesh's own name, else "part-<n>"), its saved views (an angle
    // around it, a height, a distance; the camera goes to the next on a click, by itself or with the scroll), and
    // its labelled points (in the model's own numbers, turning with it).
    parts: z.record(
      z.string().min(1).max(80).regex(/^[^\u0000-\u001f<>"'`\\]+$/),
      z.object({ color: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(), rough: z.number().min(0).max(1).optional(), metal: z.number().min(0).max(1).optional(), glow: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(), hide: z.boolean().optional() }),
    ).refine((p) => Object.keys(p).length <= 60, "At most 60 parts").optional(),
    views: z.array(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/), az: z.number().min(-180).max(180), el: z.number().min(-89).max(89), dist: z.number().min(2).max(20) })).max(8).optional(),
    viewOn: z.enum(["click", "scroll", "auto"]).optional(),
    spots: z.array(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/), at: z.tuple([z.number().min(-50).max(50), z.number().min(-50).max(50), z.number().min(-50).max(50)]), label: local(80).optional(), href: href.optional() })).max(12).optional(),
  }),
  // A drawing: a shape from the editor's library (`shape` + `knobs` let it be changed again) or one's own SVG, as data.
  svg: z.object({
    art: z.unknown().superRefine((v, ctx) => {
      const problem = checkArt(v);
      if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
    }).transform((v) => v as Art),
    shape: z.string().trim().regex(/^[a-z][a-z0-9-]{0,30}$/).optional(),
    knobs: z.record(z.string().regex(/^[a-z][a-zA-Z0-9]{0,20}$/), z.number().finite().min(-10000).max(10000)).refine((k) => Object.keys(k).length <= 12, "At most 12 knobs").optional(),
    label: local(120).optional(),
    // Its shapes turning into others (the editor's focus mode): which shape (its place, "0.2.1") becomes which path,
    // when (pointer over it, a click back and forth, a loop, with the scroll, once in view), how long and on what curve.
    morph: z.object({
      on: z.enum(["hover", "click", "loop", "scroll", "view"]),
      duration: z.number().min(0.1).max(10).optional(),
      ease: z.string().max(60).refine(isEase, "Not a motion curve").optional(),
      stagger: z.number().min(0).max(2).optional(),
      pairs: z.array(z.object({ part: z.string().regex(/^\d{1,3}(\.\d{1,3}){0,9}$/), to: z.string().refine(isArtPath, "The target isn't a path") })).min(1).max(20),
    }).optional(),
  }),
  slider: z.object({
    slides: z
      .array(
        z.object({
          src,
          kind: z.enum(["image", "video"]).default("image"),
          alt: local(200).optional(),
          caption: local(200).optional(),
          title: local(160).optional(),
          text: local(1200).optional(),
          cta: local(60).optional(),
          href: href.optional(),
        }),
      )
      .max(SLIDER_LIMITS.slides)
      .default([]),
    autoplay: z.number().int().min(SLIDER_LIMITS.minSeconds).max(SLIDER_LIMITS.maxSeconds).optional(), // seconds per slide
    loop: z.boolean().default(true),
    arrows: z.boolean().default(true),
    dots: z.boolean().default(true),
    effect: z.enum(["slide", "fade", "zoom", "wipe", "flip", "coverflow", "slices"]).optional(),
    axis: z.enum(["x", "y"]).optional(),
    duration: z.number().finite().min(0).max(2).optional(),
    zoom: z.number().finite().min(0.7).max(1.5).optional(),
    thumbnails: z.boolean().optional(),
    progress: z.boolean().optional(),
    captionPosition: z.enum(["bottom", "center", "split"]).optional(),
    aspect: z.string().trim().regex(/^[1-9]\d?\s*\/\s*[1-9]\d?$/, "Like 16 / 9").optional(),
    // Its shape (a frame, a phone, cards that peek…), its arrows and its dots.
    look: z.enum(SLIDER_LOOKS).optional(),
    arrowLook: z.enum(SLIDER_ARROW_LOOKS).optional(),
    dotLook: z.enum(SLIDER_DOT_LOOKS).optional(),
  }),
  instrument: z.object({ kind: z.enum(["piano", "guitar"]).default("piano"), label: local(160).optional(), sound: z.boolean().optional(), volume: z.number().finite().min(0).max(1).optional(), octave: z.number().int().min(2).max(6).optional(), octaves: z.number().int().min(1).max(2).optional(), frets: z.number().int().min(4).max(12).optional(), sustain: z.number().finite().min(.1).max(3).optional(), waveform: z.enum(["sine", "triangle", "sawtooth"]).optional(), theme: z.enum(["dark", "light"]).optional(), showNotes: z.boolean().optional(), melody: z.enum(["scale", "arpeggio", "chords", "jingle", "wish", "silent"]).optional(), playlist: z.array(z.enum(["scale", "arpeggio", "chords", "jingle", "wish", "silent"])).min(1).max(6).optional(), showPlayer: z.boolean().optional(), tempo: z.number().int().min(40).max(200).optional(), repeat: z.boolean().optional() }),
  chart: z.object({ kind: z.enum(["bar", "line", "donut"]).default("bar"), label: local(160).optional(), items: z.array(z.object({ label: local(80), value: z.number().finite().min(0).max(1000000), color: color.optional() })).min(1).max(24), showValues: z.boolean().optional() }),
  clock: z.object({ label: local(160).optional(), timezone: z.string().trim().max(80).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }).default("UTC"), format: z.enum(["12", "24"]).optional(), seconds: z.boolean().optional(), date: z.boolean().optional() }),
  spacer: z.object({ size: px(0, 400).default(32) }),
  divider: none,
  // One of the few built in by name, or one from the library with its drawing (checked like any drawing).
  icon: z
    .object({
      name: z.union([z.enum(ICON_NAMES), z.string().regex(ICON_REF)]),
      art: z.unknown().superRefine((v, ctx) => {
        const problem = checkArt(v);
        if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
      }).transform((v) => v as Art).optional(),
      label: local(80).optional(),
    })
    .refine((p) => (ICON_NAMES as readonly string[]).includes(p.name) || p.art, "An icon from the library carries its drawing"),
  shop: z.object({
    columns: z.number().int().min(2).max(6).optional(),
    mobileColumns: z.number().int().min(1).max(2).optional(),
    showFilters: z.boolean().optional(),
    showSearch: z.boolean().optional(),
    // The page around the cards: the space between them, which side the filters sit on, and whether they stay in view.
    gap: z.number().int().min(0).max(64).optional(),
    filtersSide: z.enum(["start", "end"]).optional(),
    stickyFilters: z.boolean().optional(),
    // Its own words for the search, filters, sorting, count and more (the shop's built-in ones otherwise).
    ...Object.fromEntries(SHOP_WORD_FIELDS.map((f) => [f, local(40).optional()])),
  }).strict(),
  cartItems: z.object({}).strict(),
  cartSummary: z.object({}).strict(),
  cartCheckout: z.object({}).strict(),
  products: z.object({
    source: z.enum(["new", "best", "category", "picked"]),
    categoryId: id.optional(),
    productIds: z.array(id).max(48).optional(),
    limit: z.number().int().min(1).max(48).default(8),
    layout: z.enum(["grid", "row"]).default("grid"),
    title: local(160).optional(),
    // How each card sits (around the shop's own product card) and how many in a row on a computer.
    card: z.enum(["plain", "bordered", "shadow", "soft", "lift"]).optional(),
    columns: z.number().int().min(1).max(6).optional(),
  }),
  categories: z.object({
    ids: z.array(id).max(24).optional(),
    limit: z.number().int().min(1).max(24).default(6),
    title: local(160).optional(),
    look: z.enum(["tall", "square", "circle", "overlay", "pill", "banner"]).optional(),
    columns: z.number().int().min(1).max(6).optional(),
  }),
  form: z.object({ kind: z.enum(["newsletter", "contact"]), title: local(160).optional() }),
  // Content blocks, each a list of items the editor adds, removes and orders.
  // Questions and answers (also the page's FAQ for search engines); `single` = one open at a time.
  accordion: z.object({
    items: z.array(z.object({ q: local(200), a: local(3000), open: z.boolean().optional() })).max(30),
    single: z.boolean().optional(),
    controls: z.boolean().optional(),
    look: z.enum(["lines", "cards", "plus"]).optional(),
  }),
  testimonials: z.object({
    items: z.array(z.object({ quote: local(800), name: local(80), role: local(80).optional(), photo: src.optional(), stars: z.number().int().min(1).max(5).optional() })).max(24),
    layout: z.enum(["grid", "row", "single"]).optional(),
    columns: z.number().int().min(1).max(4).optional(),
  }),
  // Plans side by side: their features one per line; one can stand out.
  pricing: z.object({
    items: z.array(z.object({ name: local(60), price: local(40), period: local(40).optional(), yearlyPrice: local(40).optional(), yearlyPeriod: local(40).optional(), features: local(1500).optional(), badge: local(40).optional(), featured: z.boolean().optional(), cta: local(40).optional(), href: href.optional() })).max(6),
    billing: z.boolean().optional(),
    initialBilling: z.enum(["monthly", "yearly"]).optional(),
  }),
  schedule: z.object({
    label: local(160).optional(),
    items: z.array(z.object({ day: local(80), time: z.string().trim().max(80), title: local(160), text: local(1200).optional(), speaker: local(160).optional(), location: local(160).optional(), href: href.optional() }).strict()).max(40),
    layout: z.enum(["cards", "table", "timeline"]).default("cards"),
    filterDays: z.boolean().optional(),
    showLocation: z.boolean().optional(),
  }).strict(),
  comparison: z.object({
    label: local(160).optional(),
    columns: z.array(z.object({ title: local(160), subtitle: local(300).optional(), highlight: z.boolean().optional(), href: href.optional(), cta: local(60).optional() }).strict()).max(6),
    rows: z.array(z.object({ label: local(160), values: z.array(z.object({ text: local(600).optional(), state: z.enum(["yes", "no", "text"]).optional() }).strict()).max(6) }).strict()).max(20),
    caption: local(1200).optional(),
    stickyHeader: z.boolean().optional(),
  }).strict().superRefine((value, ctx) => {
    value.rows.forEach((row, index) => {
      if (row.values.length !== value.columns.length) ctx.addIssue({ code: "custom", path: ["rows", index, "values"], message: "One value per comparison column" });
    });
  }),
  team: z.object({
    items: z.array(z.object({ name: local(80), role: local(80).optional(), photo: src.optional(), href: href.optional() })).max(24),
    columns: z.number().int().min(1).max(6).optional(),
  }),
  // Brands or partners: a grid, or a line that moves; grey until the mouse comes over.
  logos: z.object({
    items: z.array(z.object({ src, alt: local(80).optional(), href: href.optional() })).max(40),
    gray: z.boolean().optional(),
    moving: z.boolean().optional(),
  }),
  alert: z.object({ text: local(600), title: local(120).optional(), kind: z.enum(["info", "success", "warning", "danger", "promo"]).optional(), close: z.boolean().optional() }),
  // Tabs: each a label and its words (and a picture); the keyboard moves between them.
  filterGallery: z.object({
    items: z.array(z.object({ title: local(160), image: src, text: local(1200).optional(), category: local(80).optional(), href: href.optional(), cta: local(60).optional() })).min(1).max(40),
    label: local(160).optional(),
    layout: z.enum(["grid", "masonry", "split", "bento"]).default("grid"),
    presentation: z.enum(["cards", "index"]).optional(),
    initial: z.number().int().min(-1).max(39).optional(),
    filters: z.boolean().optional(),
    showCount: z.boolean().optional(),
    columns: z.number().int().min(1).max(6).default(3),
    gap: z.number().finite().min(0).max(48).default(20),
    hoverEffect: z.enum(["none", "zoom", "tilt", "reveal"]).default("none"),
    lightbox: z.boolean().default(false),
    searchable: z.boolean().default(false),
    activation: z.enum(["click", "hover"]).default("click"),
  }),
  showcase: z.object({
    look: z.enum(["default", "clay"]).optional(),
    items: z.array(z.object({ title: local(160), text: local(1200).optional(), image: src.optional(), href: href.optional(), cta: local(60).optional() })).min(1).max(8),
    label: local(160).optional(),
    layout: z.enum(["horizontal", "vertical"]).default("horizontal"),
    activation: z.enum(["click", "hover"]).default("click"),
    initial: z.number().int().min(0).max(7).default(0),
    ratio: z.number().finite().min(2).max(6).default(4),
    height: z.number().int().min(240).max(800).default(480),
    duration: z.number().finite().min(0).max(1.5).default(0.55),
    overlay: z.number().finite().min(0).max(0.9).default(0.5),
  }),
  tabs: z.object({
    items: z.array(z.object({ label: local(60), text: local(3000), image: src.optional() })).min(1).max(12),
    look: z.enum(["pills", "underline", "boxed"]).optional(),
  }),
  // Down to a moment (an ISO date and time); then its words for after, or nothing.
  countdown: z.object({
    until: z.string().trim().max(40).refine((v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) && !Number.isNaN(Date.parse(v)), "A date and time like 2026-12-31T23:59"),
    done: local(200).optional(),
    dayLabel: local(40).optional(), hourLabel: local(40).optional(), minuteLabel: local(40).optional(), secondLabel: local(40).optional(),
    look: z.enum(["boxes", "plain"]).optional(),
  }),
  // Two pictures, one over the other, a handle between them (`start` % across).
  beforeAfter: z.object({ before: src, after: src, beforeLabel: local(40).optional(), afterLabel: local(40).optional(), start: z.number().min(0).max(100).optional() }),
  // A picture with points on it (x, y = % across and down), each opening a little card.
  hotspots: z.object({
    src, alt: local(200).optional(),
    items: z.array(z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), title: local(80), text: local(400).optional(), href: href.optional() })).max(20),
  }),
  // A map of a place by its address (or "lat,lng"), zoomed 1 (the world) to 20 (a street).
  map: z.object({ query: z.string().trim().min(2).max(200), zoom: z.number().int().min(1).max(20).optional(), label: local(120).optional() }),
  // Over the page when its moment comes: on arrival (after `delay` s), at `scroll` % down, as the mouse leaves the
  // page (`exit`), or from a link to "#<anchor>"; shown always, once a visit, once a day or once ever.
  popup: z.object({
    trigger: z.enum(["load", "scroll", "exit", "click"]).optional(),
    delay: z.number().min(0).max(120).optional(),
    scroll: z.number().min(0).max(100).optional(),
    anchor: z.string().trim().regex(/^[A-Za-z][\w-]{0,40}$/).optional(),
    often: z.enum(["always", "visit", "day", "once"]).optional(),
    size: z.enum(["s", "m", "l"]).optional(),
    place: z.enum(["center", "bottom", "corner"]).optional(),
    label: local(120).optional(),
  }),
  // A search box sending to the shop's search page.
  search: z.object({ placeholder: local(80).optional(), button: local(30).optional(), look: z.enum(["rounded", "pill", "underline", "boxed", "glass"]).optional() }),
  // Links in a row or a column (a header's or a footer's); on a phone it can fold under a button.
  menu: z.object({
    items: z.array(z.object({ label: local(60), href })).min(1).max(20),
    layout: z.enum(["row", "column"]).optional(),
    look: z.enum(["plain", "pills", "underline", "buttons"]).optional(),
    phone: z.enum(["same", "fold"]).optional(),
    label: local(80).optional(),
  }),
  // Words running along a line, again and again (a full loop takes `speed` seconds).
  marquee: z.object({
    items: z.array(local(200)).min(1).max(20),
    speed: z.number().min(4).max(120).optional(),
    reverse: z.boolean().optional(),
    pause: z.boolean().optional(),
    separator: z.string().trim().max(4).optional(),
  }),
  roseBlock: z.object({ block: z.enum(["seasons", "stories", "instagram", "particles", "world", "rooms"]) }),
  legacy: z.object({ sectionId: id }),
  // A saved block linked here (lib/pageBlocks.ts): the shop draws the block's sections in its place.
  block: z.object({ blockId: id }),
  // An instance of a main component (lib/componentTree.ts): its variant, and its own changes to the
  // component's inner elements (props by inner element id), each kept only if the element stays valid.
  // The product's own pictures, colours, sizes and add-to-cart, on the product page's design (lib/collections.ts STORE_TEMPLATES).
  productDetail: z.object({}),
  // A list of a collection's items (lib/collectionTree.ts): its one child is the card shown for each item.
  collectionList: z.object({
    collectionId: id,
    limit: z.number().int().min(1).max(48).optional(),
    sort: z.enum(["newest", "oldest", "order", "title"]).optional(),
    columns: z.number().int().min(1).max(6).optional(),
    empty: local(300).optional(),
  }),
  component: z.object({
    componentId: id,
    variant: id.optional(),
    overrides: z.record(id, z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,30}$/), z.unknown())).refine((o) => Object.keys(o).length <= 60, "60 inner elements at most").optional(),
  }),
};
/** A shared style an element takes by name (lib/siteStyles.ts); its own look still wins. Not for the page or old sections. */
export const STYLE_REF = z.string().trim().regex(/^[a-z][a-z0-9-]{0,30}$/);
/** An element's props filled from a collection item's fields on its page and in lists (lib/collectionTree.ts). */
export const NodeBind = z.partialRecord(z.enum(["text", "label", "href", "src", "alt"]), z.string().regex(BIND_REF, "A field id, $url or $slug"));
NODE_PROPS.page = (NODE_PROPS.page as z.ZodObject).safeExtend({ interactions: InteractionPolicy.optional(), cardDesign: CardDesign.nullable().optional() });
for (const t of NODE_TYPES) {
  if (t !== "page") NODE_PROPS[t] = (NODE_PROPS[t] as z.ZodObject).safeExtend({ partLooks: PartLooks.optional() });
  if (t === "page" || t === "legacy" || t === "roseBlock" || t === "block") continue;
  NODE_PROPS[t] = (NODE_PROPS[t] as z.ZodObject).safeExtend({ cursorText: local(24).optional(), bind: NodeBind.optional(), styleId: STYLE_REF.optional(), edges: NodeEdges.optional(), interactions: InteractionPolicy.optional(), triggers: NodeTriggers.optional(), layers: NodeLayers.optional(), ...(["page", "shop", "products"].includes(t) ? { cardDesign: CardDesign.nullable().optional() } : {}) });
}

/**
 * An element's own speed settings (the editor's speed per element, docs/cms-big-engine-plan.ar.md J), on any kind
 * (props.perf): full, balanced (no frosted glass, canvases at 30 a second) or light (no blur, shadows, filters or
 * endless motion; 3D drawn once; clips don't play by themselves); a cap on its canvases' frames; whether it keeps
 * moving off screen or while the page rests; lighter on phones; only in full on strong devices.
 */
export const NodePerf = z.object({
  tier: z.enum(["full", "balanced", "light"]).optional(),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).optional(),
  offscreen: z.enum(["pause", "keep"]).optional(),
  rest: z.enum(["pause", "keep"]).optional(),
  phone: z.enum(["same", "light"]).optional(),
  strong: z.boolean().optional(),
});

/**
 * A world (props.world on a section, grid, stack, columns, cell or popup, I2): what it holds become bodies of a
 * physics engine. When it starts (seen, at once, a click, the pointer over it), how (from where they are, dropped
 * in, burst apart), gravity (sideways, down; the phone's tilt), its walls, bounce, friction, air, dragging and
 * throwing, the pointer pushing or pulling, a wind, a click bursting or turning gravity over, starting again every
 * so many seconds; `baked` = played as its bodies' keyframes, with no physics on the page.
 */
export const WORLD_HOSTS: ReadonlySet<string> = new Set(["section", "grid", "stack", "columns", "cell", "popup"]);
export const NodeWorld = z.object({
  on: z.enum(["view", "load", "click", "hover"]).optional(),
  start: z.enum(["place", "drop", "burst"]).optional(),
  gx: z.number().finite().min(-2).max(2).optional(),
  gy: z.number().finite().min(-2).max(2).optional(),
  tilt: z.boolean().optional(),
  walls: z.enum(["box", "open", "floor", "none"]).optional(),
  bounce: z.number().finite().min(0).max(0.95).optional(),
  friction: z.number().finite().min(0).max(1).optional(),
  air: z.number().finite().min(0).max(0.2).optional(),
  drag: z.boolean().optional(),
  pointer: z.enum(["none", "push", "pull"]).optional(),
  wind: z.number().finite().min(-1).max(1).optional(),
  click: z.enum(["none", "burst", "flip"]).optional(),
  again: z.number().finite().min(0).max(60).optional(),
  baked: z.boolean().optional(),
});
/** An element as a body in its world (props.body): round or a box, fixed in place, bouncier, heavier, hung from a rope or a spring, or left out. */
export const NodeBody = z.object({
  shape: z.enum(["auto", "box", "circle"]).optional(),
  fixed: z.boolean().optional(),
  bounce: z.number().finite().min(0).max(0.95).optional(),
  mass: z.number().finite().min(0.2).max(5).optional(),
  hang: z.enum(["none", "rope", "spring"]).optional(),
  out: z.boolean().optional(),
});

/**
 * An element's own CSS (C): Tailwind classes (`tw`) and written CSS (`css`) as typed, and `out` = the rules made from
 * them for this element only (the editor builds them); `out` is checked (lib/cssCode.ts) before it's kept.
 */
export const NodeCode = z.object({
  tw: z.string().max(CODE_LIMITS.tw).regex(/^[^<>{};]*$/, "Classes only").optional(),
  css: z.string().max(CODE_LIMITS.css).optional(),
  out: z.string().max(CODE_LIMITS.out).optional(),
});

/* ------------------------------------------------------------------ tree */

export type TreeText = Partial<Record<(typeof LANGS)[number], string>>;
export type ScreenStyleT = z.output<typeof ScreenStyle>;
export type TreeNode = {
  id: string;
  type: NodeType;
  name?: string;
  props: Record<string, unknown>;
  style?: z.output<typeof NodeStyle>;
  motion?: z.output<typeof NodeMotion>;
  children?: TreeNode[];
};
export type PageTree = { version: typeof TREE_VERSION; root: TreeNode };
export type TreeIssue = { path: string; message: string };
export type TreeCheck = { ok: true; tree: PageTree } | { ok: false; issues: TreeIssue[] };

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const NODE_ID = /^[A-Za-z0-9_-]{1,40}$/;

/**
 * Checks a page tree from the editor and gives it back clean (trimmed words, empty
 * languages and unknown keys dropped, defaults filled), or the list of problems
 * with where they are ("root.children[2].props.href").
 */
export function checkTree(input: unknown): TreeCheck {
  const issues: TreeIssue[] = [];
  const add = (path: string, message: string) => {
    if (issues.length < 50) issues.push({ path, message });
  };
  let bytes = 0;
  try {
    bytes = Buffer.byteLength(JSON.stringify(input) ?? "", "utf8");
  } catch {
    return { ok: false, issues: [{ path: "tree", message: "Not JSON" }] };
  }
  if (bytes > TREE_LIMITS.bytes) return { ok: false, issues: [{ path: "tree", message: `Too big (${Math.round(bytes / 1024)} KB, at most ${TREE_LIMITS.bytes / 1024} KB)` }] };
  if (!isObject(input)) return { ok: false, issues: [{ path: "tree", message: "Expected an object" }] };
  if (input.version !== TREE_VERSION) add("tree.version", `Expected version ${TREE_VERSION}`);

  const ids = new Set<string>();
  let count = 0;
  const walk = (raw: unknown, path: string, depth: number, parent: NodeType | null, columnsAbove = 0): TreeNode | null => {
    if (++count > TREE_LIMITS.nodes) {
      if (count === TREE_LIMITS.nodes + 1) add(path, `More than ${TREE_LIMITS.nodes} elements`);
      return null;
    }
    if (depth > TREE_LIMITS.depth) {
      add(path, `Nested more than ${TREE_LIMITS.depth} deep`);
      return null;
    }
    if (!isObject(raw)) {
      add(path, "Expected an element");
      return null;
    }
    const type = raw.type as NodeType;
    if (!(NODE_TYPES as readonly string[]).includes(String(type))) {
      add(`${path}.type`, `Unknown element “${String(raw.type)}”`);
      return null;
    }
    const nodeId = String(raw.id ?? "");
    if (!NODE_ID.test(nodeId)) add(`${path}.id`, "An id is 1–40 letters, digits, - or _");
    else if (ids.has(nodeId)) add(`${path}.id`, `The id “${nodeId}” is used twice`);
    ids.add(nodeId);

    if (parent === null && type !== "page") add(`${path}.type`, "The tree starts with a page");
    if (parent !== null && type === "page") add(`${path}.type`, "A page can't be inside another element");
    if (parent === "page" && !PAGE_LEVEL_TYPES.has(type)) add(`${path}.type`, `“${type}” goes inside a section, not straight on the page`);
    if (parent !== null && parent !== "page" && PAGE_LEVEL_TYPES.has(type)) add(`${path}.type`, `“${type}” goes straight on the page`);
    if (parent === "columns" && type !== "cell") add(`${path}.type`, `“${type}” goes inside a cell of the columns`);
    if (parent === "deck" && type !== "stack") add(`${path}.type`, "A presentation holds stack panels");
    if (type === "cell" && parent !== "columns") add(`${path}.type`, "A cell goes inside columns");
    if (type === "columns" && columnsAbove >= COLUMNS_LIMITS.nested) add(`${path}.type`, `Columns go at most ${COLUMNS_LIMITS.nested} deep`);
    if (parent !== null && OVERLAY_HOSTS.has(parent) && !OVERLAY_TYPES.has(type)) add(`${path}.type`, `“${type}” can't be placed over a section`);

    const props = NODE_PROPS[type].safeParse(raw.props ?? {});
    if (!props.success) for (const i of props.error.issues) add(`${path}.props${i.path.map((p) => (typeof p === "number" ? `[${p}]` : `.${String(p)}`)).join("")}`, i.message);
    const style = raw.style === undefined ? undefined : NodeStyle.safeParse(raw.style);
    if(style?.success){
      let limits:{minWidth?:number;maxWidth?:number;minHeight?:number;maxHeight?:number;aspectRatio?:number}={};
      for(const screen of ["base","tablet","mobile"] as const){
        limits={...limits,...style.data[screen]?.constraints};
        const minW=limits.minWidth??8,maxW=limits.maxWidth??9999,minH=limits.minHeight??8,maxH=limits.maxHeight??9999,r=limits.aspectRatio;
        if(minW>maxW||minH>maxH||r!==undefined&&Math.max(minH,minW/r)>Math.min(maxH,maxW/r))add(`${path}.style.${screen}.constraints`,"The effective size constraints conflict");
      }
    }
    if (style && !style.success) for (const i of style.error.issues) add(`${path}.style.${i.path.map(String).join(".")}`, i.message);
    if (raw.name !== undefined && (typeof raw.name !== "string" || raw.name.length > 60)) add(`${path}.name`, "A name is up to 60 characters");
    const motion = raw.motion === undefined || raw.motion === null ? undefined : NodeMotion.safeParse(raw.motion);
    if (motion && !motion.success) for (const i of motion.error.issues) add(`${path}.motion.${i.path.map(String).join(".")}`, i.message);
    if (motion?.success && ["page", "legacy", "roseBlock", "block"].includes(type)) add(`${path}.motion`, `“${type}” moves with its own settings`);
    if (style?.success && type === "block") add(`${path}.style`, "A saved block takes its look from the block");

    let children: TreeNode[] | undefined;
    if (raw.children !== undefined) {
      if (!Array.isArray(raw.children)) add(`${path}.children`, "Expected a list");
      else if (OVERLAY_HOSTS.has(type)) {
        if (raw.children.length > OVERLAY_LIMIT) add(`${path}.children`, `More than ${OVERLAY_LIMIT} objects over one section`);
        else children = raw.children.map((c, i) => walk(c, `${path}.children[${i}]`, depth + 1, type, columnsAbove)).filter((c): c is TreeNode => Boolean(c));
      } else if (!CONTAINER_TYPES.has(type)) {
        if (raw.children.length) add(`${path}.children`, `“${type}” can't hold other elements`);
      } else if (raw.children.length > TREE_LIMITS.children) add(`${path}.children`, `More than ${TREE_LIMITS.children} elements in one place`);
      else if (type === "columns" && raw.children.length > COLUMNS_LIMITS.cells) add(`${path}.children`, `Columns hold 1–${COLUMNS_LIMITS.cells} cells`);
      else if (type === "deck" && raw.children.length > 12) add(`${path}.children`, "At most 12 presentation panels");
      else children = raw.children.map((c, i) => walk(c, `${path}.children[${i}]`, depth + 1, type, columnsAbove + (type === "columns" ? 1 : 0))).filter((c): c is TreeNode => Boolean(c));
    }
    const node: TreeNode = { id: nodeId, type, props: props.success ? (props.data as Record<string, unknown>) : {} };
    // Its speed settings, the same on every kind (each kind's own props leave them out).
    const perfRaw = isObject(raw.props) ? (raw.props as Record<string, unknown>).perf : undefined;
    if (perfRaw !== undefined && perfRaw !== null) {
      const perf = NodePerf.safeParse(perfRaw);
      if (!perf.success) for (const i of perf.error.issues) add(`${path}.props.perf${i.path.map((p) => `.${String(p)}`).join("")}`, i.message);
      else if (Object.keys(perf.data).length) node.props.perf = perf.data;
    }
    // Its own CSS: what the editor made from it must stay on this element (lib/cssCode.ts).
    const codeRaw = isObject(raw.props) ? (raw.props as Record<string, unknown>).code : undefined;
    if (codeRaw !== undefined && codeRaw !== null) {
      const code = NodeCode.safeParse(codeRaw);
      if (!code.success) for (const i of code.error.issues) add(`${path}.props.code${i.path.map((p) => `.${String(p)}`).join("")}`, i.message);
      else {
        const problem = code.data.out ? cssProblem(code.data.out, nodeId) : null;
        if (problem) add(`${path}.props.code.out`, `The CSS can't be used (${problem})`);
        else if (code.data.tw || code.data.css || code.data.out) node.props.code = code.data;
      }
    }
    // Physics: a world on the kinds that hold others, and any element's settings as a body in one.
    const own = isObject(raw.props) ? (raw.props as Record<string, unknown>) : {};
    for (const [key, schema, allowed] of [["world", NodeWorld, WORLD_HOSTS.has(type)], ["body", NodeBody, true]] as const) {
      const v = own[key];
      if (v === undefined || v === null) continue;
      if (!allowed) { add(`${path}.props.${key}`, `“${type}” can't hold a physics world`); continue; }
      const r = schema.safeParse(v);
      if (!r.success) for (const i of r.error.issues) add(`${path}.props.${key}${i.path.map((p) => `.${String(p)}`).join("")}`, i.message);
      else node.props[key] = r.data;
    }
    if (type === "showcase" && props.success) node.props.initial = Math.min(Number(node.props.initial), (node.props.items as unknown[]).length - 1);
    if (type === "deck" && props.success) node.props.initial = Math.min(Number(node.props.initial) || 0, Math.max(0, (children?.length ?? 0) - 1));
    if (typeof raw.name === "string" && raw.name.trim()) node.name = raw.name.trim().slice(0, 60);
    if (style?.success && Object.keys(style.data).length) node.style = style.data;
    if (motion?.success && Object.keys(motion.data).length) node.motion = motion.data;
    if (CONTAINER_TYPES.has(type)) node.children = children ?? [];
    else if (OVERLAY_HOSTS.has(type) && children?.length) node.children = children;
    if (type === "columns" && !(Array.isArray(raw.children) && raw.children.length)) add(`${path}.children`, `Columns hold 1–${COLUMNS_LIMITS.cells} cells`);
    return node;
  };

  const root = walk(input.root, "root", 0, null);
  let lookCount = root ? Object.keys((root.props.looks ?? {}) as object).length : 0;
  const countLooks = (node: TreeNode) => { lookCount += Object.keys((node.props.partLooks ?? {}) as object).length; node.children?.forEach(countLooks); };
  if (root) countLooks(root);
  if (lookCount > LOOKS_LIMIT) add("root", `At most ${LOOKS_LIMIT} looks on a page`);
  if (issues.length || !root) return { ok: false, issues: issues.length ? issues : [{ path: "root", message: "No page" }] };
  return { ok: true, tree: { version: TREE_VERSION, root } };
}

/* ------------------------------------------------ the old sections, as nodes */

type SectionRef = { id: string; order?: number | null };
const byOrder = (a: SectionRef, b: SectionRef) => (a.order ?? 0) - (b.order ?? 0);
const legacyNode = (s: SectionRef): TreeNode => ({ id: `s-${s.id}`.slice(0, 40), type: "legacy", props: { sectionId: s.id } });

/** A page's old sections as a tree: each one a `legacy` node, in their order. */
export function treeFromSections(sections: SectionRef[]): PageTree {
  return { version: TREE_VERSION, root: { id: "page", type: "page", props: {}, children: sections.slice().sort(byOrder).map(legacyNode) } };
}

/** The sections a tree points at. */
export function legacySectionIds(tree: PageTree): string[] {
  const out: string[] = [];
  const walk = (n: TreeNode) => {
    if (n.type === "legacy" && typeof n.props.sectionId === "string") out.push(n.props.sectionId);
    n.children?.forEach(walk);
  };
  walk(tree.root);
  return out;
}

/**
 * Keeps a converted page in step with the old editor: a section added there joins
 * the end of the page, a deleted one leaves it, and while the page is still only old
 * sections their order follows the old editor's.
 */
export function syncWithSections(tree: PageTree, sections: SectionRef[]): { tree: PageTree; changed: boolean } {
  const exists = new Set(sections.map((s) => s.id));
  const kids = tree.root.children ?? [];
  const kept = kids.filter((n) => n.type !== "legacy" || exists.has(String(n.props.sectionId)));
  const known = new Set(kept.filter((n) => n.type === "legacy").map((n) => String(n.props.sectionId)));
  const added = sections.filter((s) => !known.has(s.id)).sort(byOrder).map(legacyNode);
  let next = [...kept, ...added];
  if (next.length && next.every((n) => n.type === "legacy")) {
    const order = new Map(sections.map((s) => [s.id, s.order ?? 0]));
    next = next.slice().sort((a, b) => (order.get(String(a.props.sectionId)) ?? 0) - (order.get(String(b.props.sectionId)) ?? 0));
  }
  const changed = next.length !== kids.length || next.some((n, i) => n !== kids[i]);
  return { tree: changed ? { ...tree, root: { ...tree.root, children: next } } : tree, changed };
}

/** A saved tree, or null when it's missing or broken (the page then shows its sections). */
export function storedTree(value: unknown): PageTree | null {
  const r = checkTree(value);
  return r.ok ? r.tree : null;
}
