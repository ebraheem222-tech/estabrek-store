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
import { z } from "zod";
import { checkArt, type Art } from "./svgArt.js";

export const TREE_VERSION = 1;
export const PAGE_FORMAT = { sections: 1, tree: 2 } as const;
export const TREE_LIMITS = { depth: 12, nodes: 2000, children: 300, bytes: 512 * 1024 } as const;

export const NODE_TYPES = [
  "page", "section", "grid", "stack", "columns", "cell",
  "heading", "text", "image", "button", "video", "slider", "svg", "product360", "spacer", "divider", "icon",
  "products", "categories", "form", "roseBlock", "legacy",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

/** Nodes that hold other nodes. */
export const CONTAINER_TYPES: ReadonlySet<NodeType> = new Set(["page", "section", "grid", "stack", "columns", "cell"]);
/** Columns hold this many cells, and columns sit inside a cell at most this deep (columns › cell › columns). */
export const COLUMNS_LIMITS = { cells: 4, nested: 2 } as const;
/** A slider holds at most this many slides, and turns by itself every 2–30 seconds (or not at all). */
export const SLIDER_LIMITS = { slides: 12, minSeconds: 2, maxSeconds: 30 } as const;
/** Nodes that sit straight under the page, and only there. */
export const PAGE_LEVEL_TYPES: ReadonlySet<NodeType> = new Set(["section", "roseBlock", "legacy"]);
/**
 * An old section or a rose scene can hold objects placed freely over it (words, a picture,
 * a drawing…): the shop draws them on a layer over the section, in sight through a tall scene.
 */
export const OVERLAY_HOSTS: ReadonlySet<NodeType> = new Set(["legacy", "roseBlock"]);
export const OVERLAY_TYPES: ReadonlySet<NodeType> = new Set(["heading", "text", "image", "button", "video", "slider", "svg", "product360", "spacer", "divider", "icon"]);
export const OVERLAY_LIMIT = 40;

export const ICON_NAMES = ["heart", "star", "truck", "shield", "gift", "phone", "whatsapp", "mail", "check", "sparkle", "bag", "return"] as const;
/** Theme colours (the shop maps them to its CSS variables); anything else must be a hex colour. */
export const COLOR_TOKENS = ["text", "muted", "accent", "accent-soft", "accent-contrast", "bg", "surface", "border", "white", "black", "transparent"] as const;

const LANGS = ["ar", "en", "he"] as const;
/** How a colour layer mixes with what's under it. */
export const BLENDS = ["normal", "multiply", "screen", "overlay", "soft-light", "color", "luminosity"] as const;
/** The point of a freely placed element that sits at its x/y. */
export const ANCHORS = ["top-start", "top", "top-end", "start", "center", "end", "bottom-start", "bottom", "bottom-end"] as const;

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
const color = z
  .string()
  .trim()
  .refine((v) => (COLOR_TOKENS as readonly string[]).includes(v) || /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v), "Not a theme colour or #hex");
const px = (min: number, max: number) => z.number().finite().min(min).max(max);
const box = (min: number) => z.tuple([px(min, 400), px(min, 400), px(min, 400), px(min, 400)]);
const length = z.string().trim().regex(/^(auto|\d{1,4}(\.\d{1,2})?(px|%|rem|vw|vh))$/, "A length like 320px, 50% or auto");
const place = z.string().trim().regex(/^(span \d{1,2}|-?\d{1,2} \/ (-?\d{1,2}|span \d{1,2}))$/, "Like “1 / 3” or “span 2”");

/** How a node looks on one screen size. Every key is optional; the shop turns it into CSS. */
export const ScreenStyle = z.object({
  pad: box(0).optional(), // top, end, bottom, start (follows the text direction)
  margin: box(-400).optional(),
  width: length.optional(),
  maxWidth: length.optional(),
  height: length.optional(),
  minHeight: length.optional(),
  columns: z.number().int().min(1).max(12).optional(), // grids
  widths: z.array(z.number().int().min(1).max(12)).min(1).max(COLUMNS_LIMITS.cells).optional(), // columns: each cell's share ([1, 2] = a third and two thirds)
  gap: px(0, 200).optional(),
  rowGap: px(0, 200).optional(),
  direction: z.enum(["row", "column"]).optional(), // stacks
  wrap: z.boolean().optional(),
  justify: z.enum(["start", "center", "end", "between", "around"]).optional(),
  align: z.enum(["start", "center", "end", "stretch"]).optional(),
  col: place.optional(), // its cell in the parent grid
  row: place.optional(),
  order: z.number().int().min(-50).max(50).optional(),
  bg: color.optional(),
  color: color.optional(),
  radius: px(0, 999).optional(),
  border: z.object({ width: px(0, 20), color, style: z.enum(["solid", "dashed", "dotted"]).optional() }).optional(),
  shadow: z.enum(["none", "sm", "md", "lg"]).optional(),
  opacity: z.number().min(0).max(1).optional(),
  font: z.enum(["heading", "body", "serif", "sans", "mono"]).optional(),
  size: px(8, 200).optional(),
  weight: z.number().int().min(100).max(900).refine((w) => w % 100 === 0, "100, 200 … 900").optional(),
  lineHeight: z.number().min(0.8).max(3).optional(),
  letterSpacing: px(-5, 20).optional(),
  textAlign: z.enum(["start", "center", "end"]).optional(),
  fit: z.enum(["cover", "contain"]).optional(),
  // A picture's or clip's point that stays in sight when it's cut to its frame (% across, % down).
  focus: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional(),
  aspect: z.string().trim().regex(/^\d{1,2}\s*\/\s*\d{1,2}$/, "Like 16 / 9").optional(),
  shape: z.enum(["rect", "rounded", "pill", "arch", "circle"]).optional(), // what clips it (a picture inside takes the shape)
  // Turned (degrees) and moved (px); with perspective a turn around X or Y looks 3D.
  rotateX: z.number().finite().min(-180).max(180).optional(),
  rotateY: z.number().finite().min(-180).max(180).optional(),
  rotateZ: z.number().finite().min(-360).max(360).optional(),
  perspective: px(200, 4000).optional(),
  scale: z.number().finite().min(0.1).max(4).optional(),
  moveX: px(-1000, 1000).optional(),
  moveY: px(-1000, 1000).optional(),
  origin: z.enum(["center", "top", "bottom"]).optional(),
  // A colour, or a gradient of two, over it: over a picture or clip, under the words of anything else.
  overlay: z.object({ color, to: color.optional(), angle: z.number().int().min(0).max(360).optional(), opacity: z.number().min(0).max(1), blend: z.enum(BLENDS).optional() }).optional(),
  // Its own shadow; `follow` = around its shape (a cut-out picture, words), else around its box.
  shade: z.object({ x: px(-100, 100), y: px(-100, 100), blur: px(0, 200), color, follow: z.boolean().optional() }).optional(),
  glow: z.object({ color, size: px(0, 120) }).optional(),
  // Placed freely over its container, its anchor at x% from the line's start and y% from the top; false = back in the flow on this screen.
  layer: z.union([z.literal(false), z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), anchor: z.enum(ANCHORS).optional() })]).optional(),
  z: z.number().int().min(-10).max(50).optional(), // which goes on top
  hidden: z.boolean().optional(),
});
export const NodeStyle = z.object({ base: ScreenStyle.optional(), tablet: ScreenStyle.optional(), mobile: ScreenStyle.optional() });

/* ------------------------------------------------------------------ motion */

// "draw" draws a drawing's lines, "morph" turns its shape into its second one and back, "dash" runs its lines.
export const ENTER_KINDS = ["fade", "up", "down", "start", "end", "zoom-in", "zoom-out", "blur", "flip-x", "flip-y", "turn", "wipe-start", "wipe-end", "wipe-up", "wipe-down", "wipe-center", "circle", "words", "draw"] as const;
export const LOOP_KINDS = ["float", "pulse", "spin", "wobble", "swing", "breathe", "bounce", "morph", "dash"] as const;
export const HOVER_KINDS = ["lift", "grow", "tilt", "magnetic", "glow", "zoom"] as const;
export const FX_KINDS = ["shine", "gradient", "grain"] as const;
export const EASES = ["smooth", "soft", "strong", "back", "elastic", "bounce", "linear"] as const;
const seconds = (max: number) => z.number().finite().min(0).max(max);
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
/**
 * How an element moves: comes in once when it's first seen (`enter`, `stagger` =
 * what it holds one after another), follows the scroll (`parallax`, or from → to
 * between two points of the screen, 0–100 % from the top), loops, answers the
 * pointer, or carries an animated layer. `phone` "lite" keeps only the coming in.
 */
export const NodeMotion = z.object({
  enter: z.object({ kind: z.enum(ENTER_KINDS), duration: seconds(6).optional(), delay: seconds(6).optional(), ease: z.enum(EASES).optional(), distance: px(0, 400).optional(), stagger: seconds(1).optional() }).optional(),
  scroll: z.object({ kind: z.enum(["parallax", "keys"]), speed: z.number().min(-1).max(1).optional(), from: MotionKeys.optional(), to: MotionKeys.optional(), start: z.number().min(0).max(100).optional(), end: z.number().min(0).max(100).optional(), ease: z.enum(EASES).optional() }).optional(),
  loop: z.object({ kind: z.enum(LOOP_KINDS), duration: z.number().min(0.2).max(20).optional(), amount: z.number().min(0.1).max(3).optional() }).optional(),
  hover: z.object({ kind: z.enum(HOVER_KINDS), amount: z.number().min(0.1).max(3).optional() }).optional(),
  fx: z.object({ kind: z.enum(FX_KINDS), speed: z.number().min(0.2).max(5).optional(), color: color.optional(), to: color.optional() }).optional(),
  phone: z.enum(["same", "lite", "off"]).optional(),
});

/* ------------------------------------------------------------------ looks */

/**
 * The look and motion of a part of an old section or a rose scene, kept on the page
 * (root props.looks): "s:<section id>" or "b:<scene>", then "/<field path>" or
 * "/@<piece>" for something inside it. The shop turns them into CSS for that part.
 */
export const LOOK_TARGET = /^(s|b):([A-Za-z0-9_-]{1,80})(?:\/(@[a-z0-9-]{1,40}|[A-Za-z0-9_.]{1,120}))?$/;
export const LOOK_KINDS = ["text", "button", "image", "video", "box"] as const;
export const LOOKS_LIMIT = 300;
export const LookEntry = z.object({ kind: z.enum(LOOK_KINDS), style: NodeStyle.optional(), motion: NodeMotion.optional() });
const Looks = z
  .record(z.string().regex(LOOK_TARGET, "Not a part of a section or scene"), LookEntry)
  .refine((r) => Object.keys(r).length <= LOOKS_LIMIT, `At most ${LOOKS_LIMIT} looks on a page`);

/* ------------------------------------------------------------- each type */

const none = z.object({});
export const NODE_PROPS: Record<NodeType, z.ZodType> = {
  page: z.object({ looks: Looks.optional() }),
  section: z.object({
    tag: z.enum(["section", "header", "footer", "aside"]).optional(),
    anchor: z.string().trim().regex(/^[A-Za-z][\w-]{0,40}$/).optional(),
    contained: z.boolean().optional(), // the content keeps to the page width
  }),
  grid: none,
  stack: none,
  // On a phone the cells go one under the other (stack), the last first (reverse), or stay side by side (keep).
  columns: z.object({ phone: z.enum(["stack", "reverse", "keep"]).optional() }),
  cell: none,
  heading: z.object({ text: local(300), level: z.number().int().min(1).max(6).default(2) }),
  text: z.object({ text: local(5000) }),
  image: z.object({ src, alt: local(200).optional(), href: href.optional() }),
  button: z.object({ label: local(80), href, variant: z.enum(["solid", "outline", "link"]).default("solid"), newTab: z.boolean().optional() }),
  video: z.object({
    src,
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
  // A drawing: a shape from the editor's library (`shape` + `knobs` let it be changed again) or one's own SVG, as data.
  svg: z.object({
    art: z.unknown().superRefine((v, ctx) => {
      const problem = checkArt(v);
      if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
    }).transform((v) => v as Art),
    shape: z.string().trim().regex(/^[a-z][a-z0-9-]{0,30}$/).optional(),
    knobs: z.record(z.string().regex(/^[a-z][a-zA-Z0-9]{0,20}$/), z.number().finite().min(-10000).max(10000)).refine((k) => Object.keys(k).length <= 12, "At most 12 knobs").optional(),
    label: local(120).optional(),
  }),
  slider: z.object({
    slides: z
      .array(
        z.object({
          src,
          kind: z.enum(["image", "video"]).default("image"),
          alt: local(200).optional(),
          caption: local(200).optional(),
          href: href.optional(),
        }),
      )
      .max(SLIDER_LIMITS.slides)
      .default([]),
    autoplay: z.number().int().min(SLIDER_LIMITS.minSeconds).max(SLIDER_LIMITS.maxSeconds).optional(), // seconds per slide
    loop: z.boolean().default(true),
    arrows: z.boolean().default(true),
    dots: z.boolean().default(true),
    aspect: z.string().trim().regex(/^[1-9]\d?\s*\/\s*[1-9]\d?$/, "Like 16 / 9").optional(),
  }),
  spacer: z.object({ size: px(0, 400).default(32) }),
  divider: none,
  icon: z.object({ name: z.enum(ICON_NAMES), label: local(80).optional() }),
  products: z.object({
    source: z.enum(["new", "best", "category", "picked"]),
    categoryId: id.optional(),
    productIds: z.array(id).max(48).optional(),
    limit: z.number().int().min(1).max(48).default(8),
    layout: z.enum(["grid", "row"]).default("grid"),
    title: local(160).optional(),
  }),
  categories: z.object({ ids: z.array(id).max(24).optional(), limit: z.number().int().min(1).max(24).default(6), title: local(160).optional() }),
  form: z.object({ kind: z.enum(["newsletter", "contact"]), title: local(160).optional() }),
  roseBlock: z.object({ block: z.enum(["seasons", "stories", "instagram"]) }),
  legacy: z.object({ sectionId: id }),
};

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
    if (type === "cell" && parent !== "columns") add(`${path}.type`, "A cell goes inside columns");
    if (type === "columns" && columnsAbove >= COLUMNS_LIMITS.nested) add(`${path}.type`, `Columns go at most ${COLUMNS_LIMITS.nested} deep`);
    if (parent !== null && OVERLAY_HOSTS.has(parent) && !OVERLAY_TYPES.has(type)) add(`${path}.type`, `“${type}” can't be placed over a section`);

    const props = NODE_PROPS[type].safeParse(raw.props ?? {});
    if (!props.success) for (const i of props.error.issues) add(`${path}.props${i.path.map((p) => (typeof p === "number" ? `[${p}]` : `.${String(p)}`)).join("")}`, i.message);
    const style = raw.style === undefined ? undefined : NodeStyle.safeParse(raw.style);
    if (style && !style.success) for (const i of style.error.issues) add(`${path}.style.${i.path.map(String).join(".")}`, i.message);
    if (raw.name !== undefined && (typeof raw.name !== "string" || raw.name.length > 60)) add(`${path}.name`, "A name is up to 60 characters");
    const motion = raw.motion === undefined || raw.motion === null ? undefined : NodeMotion.safeParse(raw.motion);
    if (motion && !motion.success) for (const i of motion.error.issues) add(`${path}.motion.${i.path.map(String).join(".")}`, i.message);
    if (motion?.success && ["page", "legacy", "roseBlock"].includes(type)) add(`${path}.motion`, `“${type}” moves with its own settings`);

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
      else children = raw.children.map((c, i) => walk(c, `${path}.children[${i}]`, depth + 1, type, columnsAbove + (type === "columns" ? 1 : 0))).filter((c): c is TreeNode => Boolean(c));
    }
    const node: TreeNode = { id: nodeId, type, props: props.success ? (props.data as Record<string, unknown>) : {} };
    if (typeof raw.name === "string" && raw.name.trim()) node.name = raw.name.trim().slice(0, 60);
    if (style?.success && Object.keys(style.data).length) node.style = style.data;
    if (motion?.success && Object.keys(motion.data).length) node.motion = motion.data;
    if (CONTAINER_TYPES.has(type)) node.children = children ?? [];
    else if (OVERLAY_HOSTS.has(type) && children?.length) node.children = children;
    if (type === "columns" && !(Array.isArray(raw.children) && raw.children.length)) add(`${path}.children`, `Columns hold 1–${COLUMNS_LIMITS.cells} cells`);
    return node;
  };

  const root = walk(input.root, "root", 0, null);
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
