/**
 * The section DNA's pieces, each dressed in a look (dna/looks.ts): headings, the small line over them, words,
 * buttons, pictures (cut, framed, toned), cards and the section's ground. Layouts (dna/heroes.ts…) are put
 * together from these, never from raw styles, so a new look reaches every layout and a new layout every look.
 * Pure (no React, no admin words): the backend's test builds every result against the page tree's rules.
 */
import { B, EL, H, IMG, P, SEC, STACK, edge, mo, patternOf, pop, say, type Ctx, type N } from "../build";
import { C, type W } from "../words";
import type { Look } from "./looks";

type S = Record<string, unknown>;

/** The words' own colour on the section's skin. */
export const ink = (c: Ctx): string => (c.skin === "dark" ? "bg" : c.skin === "bold" ? "accent-contrast" : "text");
/** A hairline that reads on the skin. */
const hair = (c: Ctx): string => (c.skin === "plain" || c.skin === "soft" || c.skin === "surface" ? "border" : c.skin === "dark" ? "muted" : "accent-contrast");
/** What reads on the colour that stands out (a filled label's words). */
const onPop = (c: Ctx): string => (c.skin === "bold" ? "accent" : c.skin === "dark" ? "text" : "accent-contrast");
const light = (c: Ctx) => c.skin === "plain" || c.skin === "soft" || c.skin === "surface";

const BASE: Record<number, number> = { 1: 56, 2: 40, 3: 28, 4: 22, 5: 18, 6: 16 };

/** A heading in the look: its face, weight, size, and on the big one its paint. `over` = it sits on a picture (white). */
export function head(c: Ctx, L: Look, t: W, level: number, o: { size?: number; center?: boolean; over?: boolean; at?: number } = {}): N {
  const size = Math.min(200, Math.round((o.size ?? BASE[level] ?? 32) * (level <= 2 ? L.head.scale : 1)));
  const s: S = {
    size, sizeMin: Math.max(18, Math.min(64, Math.round(size * (size > 90 ? 0.42 : 0.6)))), weight: L.head.weight,
    ...(L.head.font ? { font: L.head.font === "heading" ? "heading" : L.head.font } : {}),
    ...(L.head.lineHeight ? { lineHeight: L.head.lineHeight } : {}),
    ...(L.head.italic ? { italic: true } : {}),
    ...(L.head.caps ? { caps: "upper" } : {}),
    ...(o.over ? { color: "white" } : {}),
  };
  const big = level === 1;
  const paint = big ? L.head.paint : undefined;
  if (paint === "gradient" && !o.over) s.fill = { color: pop(c), to: ink(c), angle: 115 };
  // Letters in outline only when they are big enough to read that way.
  if (paint === "outline" && size >= 60) Object.assign(s, { color: "transparent", stroke: { width: 2, color: o.over ? "white" : ink(c) } });
  // Under the letters' tails (Arabic letters reach far below the line).
  if (paint === "underline") s.decoration = { line: "underline", color: o.over ? "white" : pop(c), width: 4, offset: 16 };
  if (paint === "glow") s.shadows = [{ x: 0, y: 0, blur: 28, color: pop(c) }];
  if (paint === "shade" && !o.over) s.shadows = [{ x: 4, y: 4, blur: 0, color: light(c) ? "accent-soft" : "accent" }];
  const motion = c.motion === "rich" ? { enter: { kind: L.enter.head, duration: 0.9, stagger: 0.04, ...(L.enter.head === "up" ? { distance: 32 } : {}) } } : mo.head(c, o.at);
  return H(c, t, level, { style: { ...s, ...(o.center ? { textAlign: "center" } : {}) }, motion });
}

/** The small line over a heading: words, framed or filled, after a short line, or none. */
export function over(c: Ctx, L: Look, t: W, o: { center?: boolean; onPic?: boolean } = {}): N | null {
  if (L.eyebrow === "none") return null;
  const colour = o.onPic ? "white" : pop(c);
  const base: S = { size: 14, weight: 700, lineHeight: 1.3, color: colour, ...(L.head.caps || L.btn.caps ? { caps: "upper" } : {}) };
  const self = o.center ? "center" : "start";
  const motion = mo.text(c, 0);
  if (L.eyebrow === "pill") return P(c, t, { quiet: false, motion, style: { ...base, pad: [6, 14, 6, 14], radius: 999, self, border: { width: 1, color: colour } } });
  if (L.eyebrow === "solid") return P(c, t, { quiet: false, motion, style: { ...base, pad: [6, 14, 6, 14], radius: Math.min(L.btn.radius, 999), self, bg: o.onPic ? "white" : pop(c), color: o.onPic ? "black" : onPop(c) } });
  if (L.eyebrow === "line") {
    return STACK(c, [STACK(c, [], { width: "36px", height: "2px", bg: colour }), P(c, t, { quiet: false, motion: false, style: base })], { direction: "row", gap: 12, align: "center", ...(o.center ? { justify: "center", self: "center" } : {}) }, motion);
  }
  return P(c, t, { quiet: false, motion, style: base });
}

/** A paragraph in the look's size. */
export const text = (c: Ctx, L: Look, t: W, o: { max?: string; over?: boolean; center?: boolean } = {}): N =>
  P(c, t, { style: { size: L.textSize, ...(o.max ? { maxWidth: o.max } : {}), ...(o.over ? { color: "white", opacity: 0.92 } : {}), ...(o.center ? { textAlign: "center" } : {}) } });

/** The look's button: its corners, capitals, hard shadow or glow. */
export function button(c: Ctx, L: Look, t: W, href: string, variant: "solid" | "outline" | "link" = "solid", o: { over?: boolean; delay?: number } = {}): N {
  const s: S = { radius: L.btn.radius, ...(L.btn.caps ? { caps: "upper" } : {}) };
  if (variant === "solid" && L.btn.shade && !o.over) s.shade = { x: 4, y: 4, blur: 0, color: light(c) ? "text" : "black" };
  // On a dark section the store's colour can be as dark as the ground: a solid button turns light there.
  if (variant === "solid" && c.skin === "dark" && !o.over) Object.assign(s, { bg: L.btn.glow ? pop(c) : "bg", color: "text" });
  if (variant === "solid" && L.btn.glow) s.shade = { x: 0, y: 0, blur: 24, color: pop(c) };
  if (o.over) Object.assign(s, variant === "solid" ? { bg: "white", color: "black" } : { color: "white", ...(variant === "outline" ? { border: { width: 1.5, color: "white" } } : {}) });
  return B(c, t, href, variant, { style: s, delay: o.delay });
}
/** The look's buttons in a row: the store's call and (if the look has one) a second, quieter one. */
export function buttons(c: Ctx, L: Look, o: { center?: boolean; over?: boolean; main?: [W, string]; second?: [W, string] } = {}): N {
  const [mt, mh] = o.main ?? [c.pack.cta, "/shop"];
  const [st, sh] = o.second ?? [C.more, "/about"];
  const kids = [button(c, L, mt, mh, "solid", { over: o.over })];
  if (L.btn.second !== "none") kids.push(button(c, L, st, sh, L.btn.second, { over: o.over, delay: 0.3 }));
  return STACK(c, kids, { direction: "row", gap: 12, wrap: true, align: "center", ...(o.center ? { justify: "center" } : {}) });
}

/** A picture cut, toned and framed the look's way. `bare` = no frame (a cover, a strip of many). */
export function picture(c: Ctx, L: Look, alt: W, o: { aspect?: string; bare?: boolean; cut?: boolean; radius?: number; style?: S; phone?: S } = {}): N {
  const tone: S = L.pic.tone === "gray" ? { filters: { gray: 1, contrast: 1.05 } }
    : L.pic.tone === "duo" ? { overlay: { color: "accent", opacity: 0.5, blend: "color" } }
    : L.pic.tone === "warm" ? { filters: { saturate: 1.15, contrast: 1.04 } }
    : L.pic.tone === "night" ? { filters: { bright: 0.85, contrast: 1.12, saturate: 0.75 } } : {};
  // `bare` drops the frame; `cut` keeps the look's shape even then (a banner cut as an arch, a blob…).
  const cut: S = L.pic.shape && (!o.bare || o.cut) ? { shape: L.pic.shape, radius: 0 } : {};
  const frame = o.bare ? undefined : L.pic.frame;
  const own: S = frame === "shade" ? { shade: { x: 14, y: 14, blur: 0, color: pop(c) } }
    : frame === "tilt" ? { rotateZ: -3, shadow: "lg" }
    : frame === "lifted" ? { shadow: "lg" } : {};
  const motion = c.motion === "rich" ? { enter: { kind: L.enter.pic, duration: 1.05 }, ...(L.hover && !c.kit?.imageHover ? { hover: { kind: L.hover === "spotlight" || L.hover === "glow" ? "zoom" : L.hover } } : {}) } : mo.pic(c);
  const img = IMG(c, alt, { aspect: o.aspect, radius: o.radius ?? L.pic.radius, motion, style: { ...tone, ...cut, ...own, ...o.style }, phone: { ...(frame === "tilt" ? { rotateZ: -2 } : {}), ...o.phone } });
  if (frame === "mat") return STACK(c, [img], { pad: [14, 14, 14, 14], bg: light(c) ? "bg" : "surface", radius: (o.radius ?? L.pic.radius) + 4, shadow: "md" });
  if (frame === "border") return STACK(c, [img], { pad: [10, 10, 10, 10], border: { width: 1, color: hair(c) }, radius: (o.radius ?? L.pic.radius) + 10 });
  return img;
}

/** A card in the look. `onPic` = it sits on a picture (glass reads there; elsewhere glass is a soft card). */
export function card(c: Ctx, L: Look, kids: N[], style: S = {}, o: { onPic?: boolean } = {}): N {
  const r = Math.min(32, Math.max(L.btn.radius === 999 ? 24 : L.btn.radius, L.pic.radius ? 12 : 0));
  const frame: S = o.onPic
    ? L.card === "glass" ? { bg: "#ffffff24", backdrop: { blur: 18, saturate: 1.4 }, border: { width: 1, color: "#ffffff59" }, color: "white" }
      : { bg: "bg", color: "text", shadow: "lg" }
    : L.card === "line" ? { border: { width: 1, color: hair(c) } }
    : L.card === "shadow" || L.card === "glass" ? { bg: light(c) ? "surface" : "transparent", shadow: light(c) ? "lg" : "none", ...(light(c) ? {} : { border: { width: 1, color: hair(c) } }) }
    : L.card === "flat" ? (light(c) ? { bg: c.skin === "soft" ? "bg" : "accent-soft" } : { border: { width: 1, color: hair(c) } })
    : L.card === "pop" ? (light(c) ? { bg: "surface", border: { width: 2, color: "text" }, shade: { x: 6, y: 6, blur: 0, color: "text" } } : { border: { width: 2, color: hair(c) } })
    : {};
  const hover = c.motion === "rich" && L.hover && !c.kit ? { hover: { kind: L.hover === "zoom" ? "lift" : L.hover } } : undefined;
  return STACK(c, kids, { gap: 12, pad: L.card === "plain" && !o.onPic ? [0, 0, 0, 0] : [28, 26, 28, 26], radius: L.card === "plain" ? 0 : r, ...frame, ...style }, hover);
}

/** The section's ground in the look: its space, a pattern, a soft mesh of the theme's colours, an edge, particles. */
export function section(c: Ctx, L: Look, kids: N[], name: W, o: { center?: boolean; full?: boolean; pad?: [number, number, number, number]; phone?: S; plainGround?: boolean } = {}): N {
  const d = o.plainGround ? undefined : L.deco;
  const ground: S = {
    ...(d?.pattern ? patternOf(c, d.pattern[0], light(c) ? "accent" : ink(c), d.pattern[1], d.pattern[2]) : {}),
    ...(d?.mesh && light(c) ? { mesh: { colors: d.mesh === "glow" ? ["accent-soft", "bg", "accent-soft", "surface"] : ["accent-soft", "surface"], soft: d.mesh === "glow" ? 100 : 70 } } : {}),
    ...(d?.mesh === "glow" && c.skin === "dark" ? { mesh: { colors: ["text", "accent"], soft: 95 } } : {}),
  };
  const props: S = {
    ...(d?.edge ? { edges: edge(c, d.edge) } : {}),
    ...(d?.particles ? { particles: { kind: d.particles, color: pop(c), amount: 0.6 } } : {}),
  };
  return SEC(c, kids, {
    name, ...(o.center ? { center: true } : {}), ...(o.full ? { full: true } : {}),
    pad: o.pad ?? [L.pad, 24, d?.edge ? L.pad + 40 : L.pad, 24], style: ground, props, ...(o.phone ? { phone: o.phone } : {}),
  });
}

/**
 * The store's own parts (product cards, category tiles, tabs, a countdown) are drawn for the page's light ground:
 * on a dark or coloured section they sit on a light panel, so their words read; on a light one they stand bare,
 * or (looks with framed cards) in the look's card.
 */
export function storePanel(c: Ctx, L: Look, kids: N[], style: S = {}): N {
  if (!light(c)) return STACK(c, kids, { gap: 16, pad: [24, 22, 24, 22], bg: "bg", color: "text", radius: Math.min(28, L.pic.radius || L.btn.radius || 0), self: "stretch", ...style });
  if (L.card === "pop" || L.card === "shadow") return card(c, L, kids, { self: "stretch", ...style });
  return kids.length === 1 && !Object.keys(style).length ? kids[0] : STACK(c, kids, { gap: 16, self: "stretch", ...style });
}
export const isLight = light;

/** A thin rule, for the looks that draw one. */
export const rule = (c: Ctx, L: Look): N[] => (L.deco?.rule ? [STACK(c, [], { height: "1px", width: "100%", bg: hair(c), margin: [8, 0, 8, 0] })] : []);

/** An element of the store (search, categories, a countdown…) with no look of its own. */
export const el = (c: Ctx, type: string, props: S, style: S = {}): N => EL(c, type, props, { style });
export { say };
