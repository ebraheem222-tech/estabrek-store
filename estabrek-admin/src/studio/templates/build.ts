/**
 * What templates are built with: elements in the store's words, a skin (the section's
 * colours, from the theme's own so any of the 78 themes suits), and two levels of motion
 * (calm: things fade up as they're seen; rich: letters, springs, hovers, loops). Pure:
 * no React and no admin words, so the backend's test builds every template.
 */
import type { PageTreeNode } from "../../api/pages.api";
import type { Lang } from "../../lib/lang";
import type { TemplateKit } from "../packs";
import { PACKS, type Family, type IconName, type Pack, type W } from "./words";

export type N = PageTreeNode;
type S = Record<string, unknown>;
export type Ids = (prefix: string) => string;

/** A section's colours: none, the accent's soft tint, the surface, the accent, dark (the theme's text colour), or a campaign's own. */
export const SKINS = ["plain", "soft", "surface", "bold", "dark", "campaign"] as const;
export type Skin = (typeof SKINS)[number];
export type MotionLevel = "calm" | "rich";
export type Paint = { bg: string; fg: string; pop: string };

export type Ctx = {
  lang: Lang;
  /** Words in all three languages (else only the one being edited; the store writes its own). */
  all: boolean;
  fam: Family;
  pack: Pack;
  skin: Skin;
  motion: MotionLevel;
  ids: Ids;
  /** The store's own pictures (its products'), used in turn; ready placeholders when there are none. */
  pics: string[];
  used: { pic: number };
  /** A campaign's colours (skin "campaign"). */
  paint?: Paint;
  /** The store's pack (studio/packs.ts): the edges, patterns, picture shapes, cards, 3D and hovers it builds with. */
  kit?: TemplateKit;
};

export type BuildOptions = { lang: Lang; fam: Family; motion?: MotionLevel; all?: boolean; ids: Ids; pics?: string[]; skin?: Skin; paint?: Paint; kit?: TemplateKit };
export const ctxOf = (o: BuildOptions): Ctx => ({
  lang: o.lang, all: Boolean(o.all), fam: o.fam, pack: PACKS[o.fam], skin: o.skin ?? "plain", motion: o.motion ?? "calm", ids: o.ids, pics: o.pics ?? [], used: { pic: 0 }, ...(o.paint ? { paint: o.paint } : {}), ...(o.kit ? { kit: o.kit } : {}),
});
/** The same build with another skin (a page's sections take turns). */
export const withSkin = (c: Ctx, skin: Skin): Ctx => ({ ...c, skin });

/** Ready pictures for a store without its own yet (the shop's public/templates). */
export const PLACEHOLDERS = ["/templates/photo-1.svg", "/templates/photo-2.svg", "/templates/photo-3.svg", "/templates/photo-4.svg", "/templates/photo-5.svg", "/templates/photo-6.svg"];
export function pic(c: Ctx): string {
  const list = c.pics.length ? c.pics : PLACEHOLDERS;
  return list[c.used.pic++ % list.length];
}

/** Words as an element keeps them. */
export const say = (c: Ctx, t: W): Record<string, string> => (c.all ? { ar: t.ar, en: t.en, he: t.he } : { [c.lang]: t[c.lang] });

/* ------------------------------------------------------------------- skins */

/** The section's own look for its skin. */
function skinStyle(c: Ctx): S {
  switch (c.skin) {
    case "soft":
      return { bg: "accent-soft" };
    case "surface":
      return { bg: "surface" };
    case "bold":
      return { bg: "accent", color: "accent-contrast" };
    case "dark":
      return { bg: "text", color: "bg" };
    case "campaign":
      return c.paint ? { bg: c.paint.bg, color: c.paint.fg } : { bg: "accent", color: "accent-contrast" };
    default:
      return {};
  }
}
/** What stands out on the skin (an eyebrow, a number, an icon). */
export const pop = (c: Ctx): string => (c.skin === "campaign" && c.paint ? c.paint.pop : c.skin === "bold" ? "accent-contrast" : c.skin === "dark" ? "accent-soft" : "accent");
/** A quieter line on the skin. */
const quiet = (c: Ctx): S => (c.skin === "plain" || c.skin === "soft" || c.skin === "surface" ? { color: "muted" } : { opacity: 0.85 });

/* ------------------------------------------------------------------ motion */

const rich = (c: Ctx) => c.motion === "rich";
/** A hover: the pack's (none = none), else the template's own. */
const hoverOf = (kit: string | undefined, own: string): S => (kit === "none" ? {} : { hover: { kind: kit ?? own } });
export const mo = {
  head: (c: Ctx, at = 0): S => (rich(c) ? { enter: { kind: at === 0 ? "letters" : "lines", duration: 0.9, stagger: 0.04 } } : { enter: { kind: "up", duration: 0.7, distance: 24 } }),
  text: (c: Ctx, delay = 0.1): S => (rich(c) ? { enter: { kind: "up", delay: delay + 0.1, duration: 0.8, distance: 32 } } : { enter: { kind: "fade", delay, duration: 0.7 } }),
  btn: (c: Ctx, delay = 0.2): S => (rich(c) ? { enter: { kind: "zoom-in", delay: delay + 0.15, ease: "back" }, ...hoverOf(c.kit?.buttonHover, "magnetic") } : { enter: { kind: "fade", delay } }),
  pic: (c: Ctx): S => (rich(c) ? { enter: { kind: "wipe-up", duration: 1.1 }, ...hoverOf(c.kit?.imageHover, "zoom") } : { enter: { kind: "fade", duration: 0.9 } }),
  /** What a container holds comes one after another. */
  group: (c: Ctx): S => (rich(c) ? { enter: { kind: "up", stagger: 0.12, ease: "back", distance: 40 } } : { enter: { kind: "up", stagger: 0.08, distance: 20 } }),
  card: (c: Ctx): S => (rich(c) ? { hover: { kind: "lift" } } : {}),
  icon: (c: Ctx): S => (rich(c) ? { loop: { kind: "float", duration: 4 } } : {}),
  num: (c: Ctx): S => (rich(c) ? { enter: { kind: "count", duration: 1.6 } } : { enter: { kind: "fade" } }),
  model: (c: Ctx): S => (rich(c) ? { enter: { kind: "zoom-in", duration: 1.2, ease: "back" } } : { enter: { kind: "fade", duration: 1 } }),
};
/** A node with its motion (none when empty). */
const moved = (n: N, m: S | undefined): N => (m && Object.keys(m).length ? { ...n, motion: { ...(n.motion ?? {}), ...m } } : n);

/* ---------------------------------------------------------------- elements */

const styled = (base?: S, phone?: S): S | undefined => (base || phone ? { ...(base ? { base } : {}), ...(phone ? { mobile: phone } : {}) } : undefined);
const node = (c: Ctx, prefix: string, type: string, props: S, style?: S, motion?: S, children?: N[]): N =>
  moved({ id: c.ids(prefix), type, props, ...(style ? { style } : {}), ...(children ? { children } : {}) }, motion);

export type Opts = { style?: S; phone?: S; motion?: S | false };
const motionOr = (o: Opts | undefined, fallback: S): S | undefined => (o?.motion === false ? undefined : o?.motion ?? fallback);

export function H(c: Ctx, t: W, level: number, o?: Opts & { at?: number }): N {
  const size = ({ 1: 56, 2: 40, 3: 28, 4: 22, 5: 18, 6: 16 } as Record<number, number>)[level] ?? 32;
  return node(c, "h", "heading", { text: say(c, t), level }, styled({ size, sizeMin: Math.max(16, Math.round(size * 0.62)), balance: "balance", weight: level <= 2 ? 700 : 600, ...o?.style }, o?.phone), motionOr(o, mo.head(c, o?.at)));
}
export function eyebrow(c: Ctx, t: W, o?: Opts): N {
  // No letter spacing: it would pull Arabic letters apart.
  return node(c, "eb", "text", { text: say(c, t) }, styled({ size: 14, caps: "upper", weight: 700, color: pop(c), ...o?.style }, o?.phone), motionOr(o, mo.text(c, 0)));
}
export function P(c: Ctx, t: W, o?: Opts & { delay?: number; quiet?: boolean }): N {
  return node(c, "t", "text", { text: say(c, t) }, styled({ size: 17, lineHeight: 1.7, ...(o?.quiet === false ? {} : quiet(c)), ...o?.style }, o?.phone), motionOr(o, mo.text(c, o?.delay)));
}
/** A button that reads on its skin: on the accent its colours turn round. */
export function B(c: Ctx, t: W, href: string, variant: "solid" | "outline" | "link" = "solid", o?: Opts & { delay?: number }): N {
  const onAccent = c.skin === "bold" || (c.skin === "campaign" && Boolean(c.paint));
  const look: S = onAccent
    ? variant === "solid"
      ? { bg: c.skin === "campaign" && c.paint ? c.paint.pop : "bg", color: c.skin === "campaign" && c.paint ? c.paint.bg : "text" }
      : { color: c.skin === "campaign" && c.paint ? c.paint.fg : "accent-contrast" }
    : c.skin === "dark" && variant !== "solid"
      ? { color: "bg" }
      : {};
  return node(c, "b", "button", { label: say(c, t), href, variant }, styled({ ...look, ...o?.style }, o?.phone), motionOr(o, mo.btn(c, o?.delay)));
}
/** A picture; `shaped` = cut to the pack's shape when it has one. */
export function IMG(c: Ctx, alt?: W, o?: Opts & { aspect?: string; radius?: number; shaped?: boolean }): N {
  const cut = o?.shaped && c.kit && c.kit.shape !== "rounded" && c.kit.shape !== "rect" ? { shape: c.kit.shape, radius: 0 } : {};
  return node(c, "img", "image", { src: pic(c), ...(alt ? { alt: say(c, alt) } : {}) }, styled({ width: "100%", fit: "cover", aspect: o?.aspect ?? "4 / 5", radius: o?.radius ?? 20, ...cut, ...o?.style }, o?.phone), motionOr(o, mo.pic(c)));
}
export function ICON(c: Ctx, name: IconName, o?: Opts & { size?: number }): N {
  return node(c, "ic", "icon", { name }, styled({ iconSize: o?.size ?? 40, color: pop(c), ...o?.style }, o?.phone), motionOr(o, mo.icon(c)));
}
export const SPACER = (c: Ctx, size = 24): N => node(c, "sp", "spacer", { size });
export const DIVIDER = (c: Ctx, o?: Opts): N => node(c, "dv", "divider", {}, styled(o?.style, o?.phone));
/** A built-in 3D model of the store's kind, in the theme's colours. */
export function MODEL(c: Ctx, o?: Opts & { model?: string; props?: S }): N {
  const lights = c.kit?.lights ?? (c.skin === "dark" || c.skin === "campaign" ? "night" : "studio");
  const props: S = { model: o?.model ?? c.pack.model, finish: c.kit?.finish ?? "matte", lights: { preset: lights }, floor: c.kit?.floor ?? "shadow", anim: { type: "float", speed: 1 }, drag: true, auto: 0.4, label: say(c, c.pack.product), ...o?.props };
  return node(c, "m3d", "model3d", props, styled({ width: "100%", aspect: "1 / 1", ...o?.style }, o?.phone), motionOr(o, mo.model(c)));
}
/** An element of any type, with its own props (blocks, forms, products…). */
export const EL = (c: Ctx, type: string, props: S, o?: Opts): N => node(c, type.slice(0, 4), type, props, styled(o?.style, o?.phone), o?.motion === false ? undefined : o?.motion);

/* -------------------------------------------------------------- containers */

export const CELL = (c: Ctx, children: N[], style?: S, motion?: S): N => node(c, "cell", "cell", {}, style ? { base: style } : undefined, motion, children);
/** Columns: cells side by side (shares in `widths`); on a phone one under the other. */
export function COLS(c: Ctx, widths: number[], cells: N[][], o?: { gap?: number; align?: string; phone?: "stack" | "reverse" | "keep"; cellStyle?: S; motion?: S }): N {
  return node(c, "cols", "columns", { phone: o?.phone ?? "stack" }, { base: { widths, gap: o?.gap ?? 40, ...(o?.align ? { align: o.align } : {}) } }, o?.motion, cells.map((kids) => CELL(c, kids, { justify: "center", ...o?.cellStyle })));
}
/** A grid of `columns` (two on a tablet, one on a phone unless said). */
export function GRID(c: Ctx, columns: number, children: N[], o?: { gap?: number; phone?: number; motion?: S | false }): N {
  return node(c, "grid", "grid", {}, { base: { columns, gap: o?.gap ?? 24 }, ...(o?.phone ? { mobile: { columns: o.phone } } : {}) }, o?.motion === false ? undefined : o?.motion ?? mo.group(c), children);
}
export function STACK(c: Ctx, children: N[], style?: S, motion?: S): N {
  return node(c, "stk", "stack", {}, { base: { direction: "column", gap: 16, ...style } }, motion, children);
}
/** A card: a stack with its frame, lifting under the mouse with rich motion. */
/** A card's frame on a plain section, as the pack's boxes look. */
const BOXES: Record<string, S> = {
  flat: { bg: "surface" },
  line: { border: { width: 1, color: "border" } },
  shadow: { bg: "surface", shadow: "md" },
  soft: { bg: "accent-soft" },
  glass: { bg: "surface", backdrop: { blur: 12 }, border: { width: 1, color: "border" } },
  pop: { bg: "surface", border: { width: 2, color: "text" }, shade: { x: 6, y: 6, blur: 0, color: "text" } },
};
export function CARD(c: Ctx, children: N[], style?: S): N {
  const plain = (c.kit && BOXES[c.kit.box]) ?? { bg: "surface", border: { width: 1, color: "border" } };
  const frame: S = c.skin === "plain" ? plain : c.skin === "surface" ? { bg: "bg" } : c.skin === "soft" ? { bg: "bg" } : { bg: "transparent", border: { width: 1, color: c.skin === "campaign" && c.paint ? c.paint.pop : c.skin === "dark" ? "muted" : "accent-contrast" } };
  return STACK(c, children, { gap: 12, pad: [28, 24, 28, 24], radius: 20, ...frame, ...style }, mo.card(c));
}

export type SecOpts = { name?: W; center?: boolean; pad?: [number, number, number, number]; style?: S; phone?: S; props?: S; motion?: S; full?: boolean };
/** A section in its skin: the page's width, its padding, its colours. */
export function SEC(c: Ctx, children: N[], o?: SecOpts): N {
  const base: S = { pad: o?.pad ?? [88, 24, 88, 24], ...skinStyle(c), ...(o?.center ? { textAlign: "center", align: "center" } : {}), ...o?.style };
  return moved(
    { id: c.ids("sec"), type: "section", ...(o?.name ? { name: o.name[c.lang] } : {}), props: { contained: !o?.full, ...o?.props }, style: { base, mobile: { pad: [56, 16, 56, 16], ...o?.phone } }, children },
    o?.motion,
  );
}

/* ------------------------------------------------------------------- edges */

const band = (d: string) => ({ viewBox: "0 0 1200 120", nodes: [{ t: "path", a: { d, fill: "currentColor" } }] });
const zigzag = () => {
  let d = "M0 120 L0 70";
  for (let x = 0; x < 1200; x += 100) d += ` L${x + 50} 120 L${x + 100} 70`;
  return `${d} L1200 120 Z`;
};
/** Bands along a section's bottom, painted in the next section's colour. */
export const EDGES = {
  wave: band("M0 60 C200 120 400 0 600 60 C800 120 1000 0 1200 60 L1200 120 L0 120 Z"),
  slant: band("M0 120 L1200 10 L1200 120 Z"),
  arc: band("M0 120 Q600 -20 1200 120 Z"),
  zigzag: band(zigzag()),
};
/** A section's bottom edge: the pack's when it has one ("none": none), else the template's own. */
export function edge(c: Ctx, own: keyof typeof EDGES, color = "bg", height = 80) {
  const kind = c.kit?.edge === "none" ? null : ((c.kit?.edge as keyof typeof EDGES | undefined) ?? own);
  return kind && EDGES[kind] ? { bottom: { art: EDGES[kind], height, phone: Math.round(height / 2), color } } : undefined;
}
/** A pattern over a section: the pack's ("none": none), else the template's own. */
export function patternOf(c: Ctx, own: string, color: string, size: number, opacity: number) {
  const kind = c.kit?.pattern === "none" ? null : c.kit?.pattern ?? own;
  return kind ? { pattern: { kind, color, size, opacity } } : {};
}
