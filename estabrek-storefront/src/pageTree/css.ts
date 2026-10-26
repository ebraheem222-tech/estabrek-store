/**
 * A page tree's styles as one CSS block: each node gets `.pt-<id>`, with its
 * tablet and phone values in media queries. Every value is checked again here
 * (numbers in range, lengths, theme colours or hex) and anything else is dropped,
 * so a bad saved value can't become CSS. Sides follow the text direction
 * (padding-inline-start…), so the same tree is right in Arabic, Hebrew and English.
 */
import { TREE_TRANSFORM, TREE_TRANSFORM_REST, framed, motionOf, type PageTree, type ScreenStyle, type TreeNode } from "./tree";

export const TABLET_MAX = 1023.98;
export const PHONE_MAX = 639.98;

const TOKENS: Record<string, string> = {
  text: "var(--text)",
  muted: "var(--muted)",
  accent: "var(--accent)",
  "accent-soft": "var(--accent-soft)",
  "accent-contrast": "var(--accent-contrast,#fff)",
  bg: "var(--bg)",
  surface: "var(--surface)",
  border: "var(--border)",
  white: "#fff",
  black: "#000",
  transparent: "transparent",
};
const SHADOWS: Record<string, string> = {
  none: "none",
  sm: "0 1px 3px rgba(0,0,0,.08)",
  md: "0 8px 24px rgba(0,0,0,.10)",
  lg: "0 20px 48px rgba(0,0,0,.14)",
};
const JUSTIFY: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between", around: "space-around" };
const ALIGN: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
/** A shape clips what's inside it (a picture or clip takes it too). */
const SHAPES: Record<string, string[]> = {
  rect: ["border-radius:0"],
  rounded: ["border-radius:24px", "overflow:hidden"],
  pill: ["border-radius:999px", "overflow:hidden"],
  arch: ["border-radius:999px 999px 0 0", "overflow:hidden"],
  circle: ["border-radius:50%", "aspect-ratio:1/1", "overflow:hidden"],
};

const BLENDS = ["normal", "multiply", "screen", "overlay", "soft-light", "color", "luminosity"] as const;
const ANCHORS: Record<string, [number, number]> = {
  "top-start": [0, 0], top: [50, 0], "top-end": [100, 0],
  start: [0, 50], center: [50, 50], end: [100, 50],
  "bottom-start": [0, 100], bottom: [50, 100], "bottom-end": [100, 100],
};
const ORIGINS: Record<string, string> = { center: "50% 50%", top: "50% 0%", bottom: "50% 100%" };
/** Its glow is a light around the letters, not around the box. */
const TEXTISH = new Set(["heading", "text", "icon"]);
/** A colour layer goes over these (a picture, a clip, slides) and under the words of anything else. */
const MEDIA = new Set(["image", "video", "slider"]);

const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
/** A theme colour or a hex one, as CSS (anything else: undefined). */
export const color = (v: unknown) =>
  typeof v === "string" ? (TOKENS[v] ?? (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ? v : undefined)) : undefined;
const length = (v: unknown) => (typeof v === "string" && /^(auto|\d{1,4}(\.\d{1,2})?(px|%|rem|vw|vh))$/.test(v) ? v : undefined);
const place = (v: unknown) => (typeof v === "string" && /^(span \d{1,2}|-?\d{1,2} \/ (-?\d{1,2}|span \d{1,2}))$/.test(v) ? v : undefined);
const pick = <T extends string>(v: unknown, list: readonly T[]) => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined);
const four = (v: unknown, min: number) =>
  Array.isArray(v) && v.length === 4 && v.every((x) => num(x, min, 400) !== undefined) ? (v as [number, number, number, number]) : undefined;
/** Columns' shares as grid tracks ("minmax(0,1fr) minmax(0,2fr)"). */
export const widthsTemplate = (v: unknown) =>
  Array.isArray(v) && v.length >= 1 && v.length <= 4 && v.every((x) => Number.isInteger(x) && x >= 1 && x <= 12)
    ? (v as number[]).map((x) => `minmax(0,${x}fr)`).join(" ")
    : undefined;

/** A slider's frame ("16 / 9" → "16/9"), whole numbers 1–99 only. */
export const sliderAspect = (v: unknown) => (typeof v === "string" && /^[1-9]\d?\s*\/\s*[1-9]\d?$/.test(v.trim()) ? v.replace(/\s+/g, "") : undefined);

/** One screen's declarations for a node ("padding-block:8px 8px;…"). */
export function declarations(s: ScreenStyle | undefined, type: string): string[] {
  if (!s || typeof s !== "object") return [];
  const d: string[] = [];
  const push = (prop: string, v: string | number | undefined, unit = "") => {
    if (v !== undefined) d.push(`${prop}:${v}${unit}`);
  };
  const pad = four(s.pad, 0);
  if (pad) d.push(`padding-block:${pad[0]}px ${pad[2]}px`, `padding-inline:${pad[3]}px ${pad[1]}px`);
  const margin = four(s.margin, -400);
  if (margin) d.push(`margin-block:${margin[0]}px ${margin[2]}px`, `margin-inline:${margin[3]}px ${margin[1]}px`);
  push("width", length(s.width));
  push("max-width", length(s.maxWidth));
  push("height", length(s.height));
  push("min-height", length(s.minHeight));
  const cols = num(s.columns, 1, 12);
  if (cols !== undefined && Number.isInteger(cols)) d.push(`grid-template-columns:repeat(${cols},minmax(0,1fr))`);
  const widths = widthsTemplate(s.widths);
  if (widths) d.push(`grid-template-columns:${widths}`);
  push("gap", num(s.gap, 0, 200), "px");
  push("row-gap", num(s.rowGap, 0, 200), "px");
  const dir = pick(s.direction, ["row", "column"] as const);
  if (dir) d.push(`flex-direction:${dir}`);
  if (typeof s.wrap === "boolean") d.push(`flex-wrap:${s.wrap ? "wrap" : "nowrap"}`);
  const j = pick(s.justify, ["start", "center", "end", "between", "around"] as const);
  if (j) d.push(`justify-content:${JUSTIFY[j]}`);
  const a = pick(s.align, ["start", "center", "end", "stretch"] as const);
  if (a) d.push(`align-items:${ALIGN[a]}`);
  push("grid-column", place(s.col));
  push("grid-row", place(s.row));
  const order = num(s.order, -50, 50);
  if (order !== undefined && Number.isInteger(order)) d.push(`order:${order}`);
  push("background", color(s.bg));
  push("color", color(s.color));
  push("border-radius", num(s.radius, 0, 999), "px");
  if (s.border && typeof s.border === "object") {
    const w = num(s.border.width, 0, 20);
    const c = color(s.border.color);
    const st = pick(s.border.style, ["solid", "dashed", "dotted"] as const) ?? "solid";
    if (w !== undefined && c) d.push(`border:${w}px ${st} ${c}`);
  }
  push("opacity", num(s.opacity, 0, 1));
  const font = pick(s.font, ["heading", "body"] as const);
  if (font) d.push(`font-family:${font === "heading" ? "var(--pt-font-heading)" : "inherit"}`);
  push("font-size", num(s.size, 8, 200), "px");
  const w = num(s.weight, 100, 900);
  if (w !== undefined && w % 100 === 0) d.push(`font-weight:${w}`);
  push("line-height", num(s.lineHeight, 0.8, 3));
  push("letter-spacing", num(s.letterSpacing, -5, 20), "px");
  const ta = pick(s.textAlign, ["start", "center", "end"] as const);
  if (ta) d.push(`text-align:${ta}`);
  const fit = pick(s.fit, ["cover", "contain"] as const);
  if (fit) d.push(...(type === "image" || type === "video" ? [`object-fit:${fit}`, `--pt-fit:${fit}`] : [`--pt-fit:${fit}`]));
  if (typeof s.aspect === "string" && /^\d{1,2}\s*\/\s*\d{1,2}$/.test(s.aspect)) d.push(`aspect-ratio:${s.aspect.replace(/\s+/g, "")}`);
  const shape = pick(s.shape, ["rect", "rounded", "pill", "arch", "circle"] as const);
  if (shape) d.push(...SHAPES[shape]);
  // Turned and moved: variables that the element's transform (TREE_TRANSFORM) reads.
  const turn = (k: string, v: unknown, lim: number) => push(`--pt-${k}`, num(v, -lim, lim), "deg");
  turn("rx", s.rotateX, 180);
  turn("ry", s.rotateY, 180);
  turn("rz", s.rotateZ, 360);
  push("--pt-p", num(s.perspective, 200, 4000), "px");
  push("--pt-s", num(s.scale, 0.1, 4));
  push("--pt-x", num(s.moveX, -1000, 1000), "px");
  push("--pt-y", num(s.moveY, -1000, 1000), "px");
  const origin = pick(s.origin, ["center", "top", "bottom"] as const);
  if (origin) d.push(`transform-origin:${ORIGINS[origin]}`);
  // A colour or gradient over it (drawn by the ::before/::after treeCss adds).
  const ov = s.overlay;
  if (ov && typeof ov === "object") {
    const c = color(ov.color);
    const op = num(ov.opacity, 0, 1);
    const c2 = color(ov.to);
    if (c && op !== undefined) d.push(`--pt-ov:${c2 ? `linear-gradient(${Math.round(num(ov.angle, 0, 360) ?? 180)}deg,${c},${c2})` : c}`, `--pt-ovo:${op}`, `--pt-ovb:${pick(ov.blend, BLENDS) ?? "normal"}`);
  }
  // Shadows: the ready ones and its own around the box; around the shape (`follow`) as a filter; a glow on words lights the letters.
  const boxes: string[] = [];
  const drops: string[] = [];
  const glows: string[] = [];
  const sh = pick(s.shadow, ["none", "sm", "md", "lg"] as const);
  if (sh && sh !== "none") boxes.push(SHADOWS[sh]);
  const sd = s.shade;
  if (sd && typeof sd === "object") {
    const [x, y, b, c] = [num(sd.x, -100, 100), num(sd.y, -100, 100), num(sd.blur, 0, 200), color(sd.color)];
    if (x !== undefined && y !== undefined && b !== undefined && c) (sd.follow ? drops : boxes).push(`${x}px ${y}px ${b}px ${c}`);
  }
  const gl = s.glow;
  if (gl && typeof gl === "object") {
    const [c, size] = [color(gl.color), num(gl.size, 0, 120)];
    if (c && size !== undefined) (TEXTISH.has(type) ? glows : boxes).push(`0 0 ${size}px ${c}`);
  }
  if (boxes.length) d.push(`box-shadow:${boxes.join(",")}`);
  else if (sh === "none") d.push("box-shadow:none");
  if (drops.length) d.push(`filter:${drops.map((x) => `drop-shadow(${x})`).join(" ")}`);
  if (glows.length) d.push(`text-shadow:${glows.join(",")}`);
  // Placed freely over its container, or back in the flow on this screen.
  if (s.layer === false) d.push("position:relative", "inset:auto", "--pt-ax:0%", "--pt-ay:0%");
  else if (s.layer && typeof s.layer === "object") {
    const [x, y] = [num(s.layer.x, 0, 100), num(s.layer.y, 0, 100)];
    const [ax, ay] = ANCHORS[pick(s.layer.anchor, Object.keys(ANCHORS)) ?? "center"];
    if (x !== undefined && y !== undefined) d.push("position:absolute", `inset-inline-start:${x}%`, `top:${y}%`, "margin:0", `--pt-ax:calc(var(--pt-flip,1) * ${-ax}%)`, `--pt-ay:${-ay}%`);
  }
  const zi = num(s.z, -10, 50);
  if (zi !== undefined && Number.isInteger(zi)) d.push(`z-index:${zi}`);
  if (s.hidden === true) d.push("display:none");
  return d;
}

const TURNS = ["rotateX", "rotateY", "rotateZ", "perspective", "scale", "moveX", "moveY"] as const;

const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;

/**
 * Grids get fewer columns on smaller screens by themselves (at most 2 on a
 * tablet, 1 on a phone) and their children drop their cells there, unless the
 * node says what it wants on that screen. Columns do the same (3 or 4 cells become
 * 2 on a tablet, the odd last one across), and on a phone their cells go one under
 * the other, the last first ("reverse"), or stay side by side ("keep").
 */
function screenFallbacks(n: TreeNode, parent: TreeNode | null) {
  const base = n.style?.base ?? {};
  const tablet: string[] = [];
  const phone: string[] = [];
  const rules: { tablet: string[]; phone: string[] } = { tablet: [], phone: [] };
  if (n.type === "columns") {
    const count = n.children?.length ?? 0;
    const own = widthsTemplate(base.widths) ?? `repeat(${Math.max(1, Math.min(4, count))},minmax(0,1fr))`;
    const tabletSet = widthsTemplate(n.style?.tablet?.widths);
    const across = !tabletSet && count > 2 && count % 2 === 1 && SAFE_ID.test(n.id);
    if (!tabletSet && count > 2) tablet.push("grid-template-columns:repeat(2,minmax(0,1fr))");
    if (across) rules.tablet.push(`.pt-${n.id}>.pt-cell:last-child{grid-column:1 / -1}`);
    if (!widthsTemplate(n.style?.mobile?.widths)) {
      const how = n.props?.phone;
      if (how === "keep") phone.push(`grid-template-columns:${tabletSet ?? own}`);
      else if (how === "reverse") phone.push("display:flex", "flex-direction:column-reverse");
      else phone.push("grid-template-columns:minmax(0,1fr)");
    }
    if (across) rules.phone.push(`.pt-${n.id}>.pt-cell:last-child{grid-column:auto}`);
  }
  const cols = num(base.columns, 1, 12);
  if (n.type === "grid" && cols && cols > 1) {
    if (n.style?.tablet?.columns === undefined && cols > 2) tablet.push("grid-template-columns:repeat(2,minmax(0,1fr))");
    if (n.style?.mobile?.columns === undefined) phone.push("grid-template-columns:minmax(0,1fr)");
  }
  if (parent?.type === "grid") {
    if (base.col && n.style?.mobile?.col === undefined) phone.push("grid-column:auto");
    if (base.row && n.style?.mobile?.row === undefined) phone.push("grid-row:auto");
  }
  if (n.type === "stack" && base.direction === "row" && n.style?.mobile?.direction === undefined && base.wrap !== true) phone.push("flex-wrap:wrap");
  return { tablet, phone, rules };
}

/** The whole page's CSS ("" for a page that is only old sections). */
export function treeCss(tree: PageTree): string {
  const base: string[] = [];
  const tablet: string[] = [];
  const phone: string[] = [];
  // Elements that turn or move, that carry a colour layer, that hold a layer at all, and the fx colours.
  const turned: string[] = [];
  const over: string[] = [];
  const under: string[] = [];
  const holders: string[] = [];
  const fx: string[] = [];
  const staggered = new Set<string>();
  let drawn = 0;
  const walk = (n: TreeNode, parent: TreeNode | null) => {
    if (n.type !== "page" && n.type !== "legacy") drawn++;
    if (SAFE_ID.test(n.id ?? "")) {
      const sel = `.pt-${n.id}`;
      const screens = [n.style?.base, n.style?.tablet, n.style?.mobile];
      const motion = motionOf(n);
      if (motion?.enter?.stagger) staggered.add(n.id);
      const turns = screens.some((s) => s && (TURNS.some((k) => s[k] !== undefined) || (s.layer && typeof s.layer === "object")));
      if (motion || turns || (parent && staggered.has(parent.id))) turned.push(sel);
      const layered = screens.some((s) => s?.overlay);
      if (layered) ((MEDIA.has(n.type) && (n.type === "slider" || framed(n, motion))) ? over : under).push(sel);
      if (layered || motion?.fx) holders.push(sel);
      if (motion?.fx) {
        const [c, c2, sp] = [color(motion.fx.color), color(motion.fx.to), num(motion.fx.speed, 0.2, 5)];
        fx.push(`${sel}>.pt-fx{${[c && `--pt-fxc:${c}`, c2 && `--pt-fxc2:${c2}`, `--pt-fxs:${(3 / (sp ?? 1)).toFixed(2)}s`].filter(Boolean).join(";")}}`);
      }
      const b = declarations(n.style?.base, n.type);
      // Columns always say how many tracks they have (their cells' count when no shares are set).
      if (n.type === "columns" && !widthsTemplate(n.style?.base?.widths)) b.unshift(`grid-template-columns:repeat(${Math.max(1, Math.min(4, n.children?.length ?? 1))},minmax(0,1fr))`);
      // A slider's frame from its settings; a screen's own `aspect` still wins.
      const frame = n.type === "slider" ? sliderAspect(n.props?.aspect) : undefined;
      if (frame) b.unshift(`aspect-ratio:${frame}`);
      if (n.type === "spacer") {
        const size = num(n.props?.size, 0, 400);
        if (size !== undefined) b.push(`height:${size}px`);
      }
      const extra = screenFallbacks(n, parent);
      const t = [...extra.tablet, ...declarations(n.style?.tablet, n.type)];
      const p = [...extra.phone, ...declarations(n.style?.mobile, n.type)];
      if (b.length) base.push(`${sel}{${b.join(";")}}`);
      if (t.length) tablet.push(`${sel}{${t.join(";")}}`);
      if (p.length) phone.push(`${sel}{${p.join(";")}}`);
      tablet.push(...extra.rules.tablet);
      phone.push(...extra.rules.phone);
    }
    n.children?.forEach((c) => walk(c, n));
  };
  walk(tree.root, null);
  if (!drawn) return "";
  const layer = "content:\"\";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:var(--pt-ov);opacity:var(--pt-ovo);mix-blend-mode:var(--pt-ovb)";
  return [
    BASE_CSS,
    // Before each element's own rule, so its own values win.
    turned.length ? `${turned.join(",")}{${TREE_TRANSFORM_REST};transform:${TREE_TRANSFORM}}` : "",
    holders.length ? `${holders.join(",")}{position:relative;isolation:isolate}` : "",
    over.length || under.length ? `${[...over, ...under].join(",")}{--pt-ov:none;--pt-ovo:1;--pt-ovb:normal}` : "",
    over.length ? `${over.map((s) => `${s}::after`).join(",")}{${layer};z-index:1}` : "",
    under.length ? `${under.map((s) => `${s}::before`).join(",")}{${layer};z-index:-1}` : "",
    base.join(""),
    fx.join(""),
    tablet.length ? `@media (max-width:${TABLET_MAX}px){${tablet.join("")}}` : "",
    phone.length ? `@media (max-width:${PHONE_MAX}px){${phone.join("")}}` : "",
  ].join("");
}

/** What every tree element starts from (theme colours, the direction-aware sides). */
export const BASE_CSS = [
  ":root{--pt-font-heading:\"Rose Arabic\",\"Rose Hebrew\",Georgia,serif;--pt-flip:1}",
  "[dir=rtl]{--pt-flip:-1}",
  // Until the motion engine is ready (at most 2.5 s), what comes in waits unseen.
  "html.pt-pending [data-pt-enter]{opacity:0}",
  ".pt{box-sizing:border-box;min-width:0}",
  ".pt-section{position:relative;width:100%;padding-block:56px}",
  // Objects placed over an old section or a scene: a layer over it, in sight through a tall scene.
  "[data-cms-section]:has(>.pt-over),[data-rose-block]:has(>.pt-over){position:relative}",
  ".pt-over{position:absolute;inset:0;z-index:6;pointer-events:none}",
  ".pt-over-in{position:sticky;top:0;height:min(100%,100vh);pointer-events:none}",
  ".pt-over-in>*{pointer-events:auto}",
  ".pt-inner{max-width:1200px;margin-inline:auto;padding-inline:16px}",
  ".pt-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:24px}",
  ".pt-stack{display:flex;flex-direction:column;gap:16px}",
  ".pt-columns{display:grid;grid-template-columns:minmax(0,1fr);gap:24px}",
  // Places that hold things (an element placed freely over one sits by it).
  ".pt-inner,.pt-grid,.pt-stack,.pt-columns,.pt-cell{position:relative}",
  // A cell is a small container: its things one under the other, at the start; text and wide things take the whole width.
  ".pt-cell{display:flex;flex-direction:column;align-items:flex-start;gap:16px;min-width:0}",
  ".pt-cell>:is(.pt-heading,.pt-text,.pt-video,.pt-slider,.pt-product360,.pt-products,.pt-categories,.pt-form,.pt-columns,.pt-grid,.pt-stack,.pt-divider,.pt-spacer){align-self:stretch}",
  ".pt-cell>.pt-image,.pt-cell>.pt-image-link{max-width:100%}",
  ".pt-heading{margin:0;font-family:var(--pt-font-heading);line-height:1.2;white-space:pre-line}",
  ".pt-text{margin:0;line-height:1.75;white-space:pre-line}",
  ".pt-image{display:block;max-width:100%;height:auto}",
  ".pt-image-link{display:block}",
  ".pt-video{display:block;width:100%;height:auto}",
  // A picture or clip in a frame: the frame carries the look, the layers and the zoom.
  ".pt-frame{position:relative;display:block;max-width:100%;overflow:hidden}",
  ".pt-frame.pt-image{width:fit-content}",
  ".pt-frame-media{display:block;width:100%;height:100%;max-width:100%;object-fit:var(--pt-fit,cover)}",
  ".pt-hv-glow{transition:filter .35s ease}",
  ".pt-hv-glow:hover{filter:drop-shadow(0 0 18px var(--accent))}",
  ".pt-hv-zoom>.pt-frame-media{transition:transform .7s cubic-bezier(.2,.7,.2,1)}",
  ".pt-hv-zoom:hover>.pt-frame-media{transform:scale(1.08)}",
  // Animated layers.
  ".pt-fx{position:absolute;inset:0;z-index:1;overflow:hidden;border-radius:inherit;pointer-events:none}",
  ".pt-fx-shine::before{content:\"\";position:absolute;top:-25%;bottom:-25%;left:0;width:40%;background:linear-gradient(90deg,transparent,var(--pt-fxc,rgba(255,255,255,.55)),transparent);transform:translateX(-150%) skewX(-18deg);animation:pt-shine var(--pt-fxs,3s) ease-in-out infinite}",
  "@keyframes pt-shine{0%{transform:translateX(-150%) skewX(-18deg)}55%,100%{transform:translateX(300%) skewX(-18deg)}}",
  ".pt-fx-gradient{background:linear-gradient(115deg,var(--pt-fxc,#ff9ec7),var(--pt-fxc2,#9ee7ff),var(--pt-fxc,#ff9ec7));background-size:300% 100%;mix-blend-mode:soft-light;opacity:.75;animation:pt-flow calc(var(--pt-fxs,3s) * 2) linear infinite}",
  "@keyframes pt-flow{to{background-position:300% 0}}",
  `.pt-fx-grain{opacity:.22;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");animation:pt-grain .9s steps(3) infinite}`,
  "@keyframes pt-grain{0%{background-position:0 0}33%{background-position:-40px 25px}66%{background-position:30px -35px}100%{background-position:0 0}}",
  // A slider: one slide across, a row that snaps (it swipes without scripts); the buttons sit on top.
  ".pt-slider{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:var(--accent-soft)}",
  ".pt-slides{display:flex;width:100%;height:100%;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}",
  ".pt-slider[data-ready] .pt-slides{scrollbar-width:none}",
  ".pt-slider[data-ready] .pt-slides::-webkit-scrollbar{display:none}",
  ".pt-slides:focus-visible{outline:2px solid var(--accent);outline-offset:-4px}",
  ".pt-slide{position:relative;flex:0 0 100%;width:100%;height:100%;scroll-snap-align:start;scroll-snap-stop:always}",
  ".pt-slide-link{display:block;width:100%;height:100%;color:inherit;text-decoration:none}",
  ".pt-slide-media{display:block;width:100%;height:100%;object-fit:var(--pt-fit,cover);-webkit-user-drag:none}",
  ".pt-slide-caption{position:absolute;inset-inline:0;bottom:0;display:block;padding:40px 20px 40px;color:#fff;font-weight:600;line-height:1.5;text-align:start;background:linear-gradient(to top,rgba(0,0,0,.55),transparent)}",
  ".pt-slider-ui{display:contents}",
  ".pt-slider-arrow,.pt-slider-pause{position:absolute;z-index:2;display:grid;place-items:center;border:0;border-radius:999px;background:rgba(255,255,255,.9);color:#111;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.18)}",
  ".pt-slider-arrow{top:50%;width:44px;height:44px;transform:translateY(-50%);transition:opacity .2s ease}",
  ".pt-slider-arrow svg{width:20px;height:20px}",
  ".pt-slider-prev{inset-inline-start:12px}",
  ".pt-slider-prev svg{transform:scaleX(-1)}",
  ".pt-slider-next{inset-inline-end:12px}",
  "[dir=rtl] .pt-slider-arrow svg{transform:scaleX(-1)}",
  "[dir=rtl] .pt-slider-prev svg{transform:none}",
  ".pt-slider-arrow:disabled{opacity:0;pointer-events:none}",
  ".pt-slider-pause{bottom:8px;inset-inline-end:12px;width:32px;height:32px}",
  ".pt-slider-pause svg{width:14px;height:14px}",
  ".pt-slider-dots{position:absolute;z-index:2;bottom:8px;inset-inline:56px;display:flex;flex-wrap:wrap;justify-content:center;gap:2px}",
  ".pt-slider-dot{display:grid;place-items:center;width:20px;height:24px;padding:0;border:0;background:none;cursor:pointer}",
  ".pt-slider-dot::before{content:\"\";width:8px;height:8px;border-radius:999px;background:rgba(255,255,255,.6);box-shadow:0 0 0 1px rgba(0,0,0,.12);transition:width .25s ease,background-color .25s ease}",
  ".pt-slider-dot[aria-current=true]{width:30px}",
  ".pt-slider-dot[aria-current=true]::before{width:22px;background:#fff}",
  ".pt-slider-arrow:focus-visible,.pt-slider-pause:focus-visible,.pt-slider-dot:focus-visible{outline:2px solid var(--accent);outline-offset:2px}",
  // A drawing: as wide as its place (a width of its own makes it smaller); its own colour is the theme's.
  ".pt-svg{display:block;width:100%;max-width:100%;color:var(--accent)}",
  ".pt-product360{display:block;width:100%;max-width:100%}",
  ".pt-svg>svg{display:block;width:100%;height:auto;overflow:visible}",
  ".pt-divider{border:0;border-top:1px solid var(--border);margin:0;width:100%}",
  ".pt-icon{display:inline-flex;align-items:center;gap:8px;color:var(--accent)}",
  ".pt-icon svg{width:24px;height:24px;flex:none}",
  ".pt-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 22px;border-radius:999px;font-weight:600;text-decoration:none;cursor:pointer;transition:filter .2s ease,background-color .2s ease}",
  ".pt-btn-solid{background:var(--accent);color:var(--accent-contrast,#fff)}",
  ".pt-btn-outline{border:1px solid currentColor;color:var(--accent)}",
  ".pt-btn-link{min-height:0;padding:0;color:var(--accent);text-decoration:underline;text-underline-offset:4px}",
  ".pt-btn:hover{filter:brightness(1.06)}",
  ".pt-btn:focus-visible,.pt-tile:focus-visible{outline:2px solid var(--accent);outline-offset:3px}",
  ".pt-block-title{margin:0 0 20px;font-family:var(--pt-font-heading);font-size:28px;line-height:1.2}",
  ".pt-products-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}",
  ".pt-products-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(220px,1fr);gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px}",
  ".pt-products-row>*{scroll-snap-align:start}",
  ".pt-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}",
  ".pt-tile{display:flex;flex-direction:column;gap:10px;text-decoration:none;color:inherit}",
  ".pt-tile img,.pt-tile-blank{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:18px;background:var(--accent-soft)}",
  ".pt-tile span{font-weight:600}",
  `@media (max-width:${TABLET_MAX}px){.pt-products-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.pt-section{padding-block:44px}}`,
  `@media (max-width:${PHONE_MAX}px){.pt-products-grid,.pt-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.pt-section{padding-block:32px}.pt-block-title{font-size:22px}}`,
  "@media (prefers-reduced-motion:reduce){.pt-btn,.pt-slider-arrow,.pt-slider-dot::before,.pt-hv-glow,.pt-hv-zoom>.pt-frame-media{transition:none}.pt-slides{scroll-behavior:auto}.pt-fx,.pt-fx::before{animation:none}.pt-fx-shine{display:none}}",
].join("");
