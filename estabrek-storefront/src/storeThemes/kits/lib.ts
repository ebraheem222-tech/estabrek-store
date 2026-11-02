/**
 * The templates' building blocks in a style (kits/styles.ts): a part's space and colours,
 * headings at the style's scale, words, buttons, pictures in its frame, and the store's own
 * products and categories (in the gallery, the category's samples drawn as cards).
 */
import type { Words } from "../types";
import type { Style } from "./styles";
import { el, grid, row, stack, t, type K, type Motion, type Node, type Style as Css } from "./tree";

export type TK = K & { s: Style };
export const withStyle = (k: K, s: Style): TK => ({ ...k, s });

const PAD: Record<Style["density"], [number, number, number, number]> = { airy: [150, 24, 150, 24], normal: [108, 24, 108, 24], dense: [76, 24, 76, 24] };
const PAD_PHONE: Record<Style["density"], [number, number, number, number]> = { airy: [84, 16, 84, 16], normal: [64, 16, 64, 16], dense: [48, 16, 48, 16] };

/* How things come in, by the style's motion. */
export const mv = {
  head: (k: TK): Motion =>
    k.s.motion === "calm" ? { enter: { kind: "lines", duration: 0.9 } }
    : k.s.motion === "snappy" ? { enter: { kind: "up", duration: 0.5, distance: 48, ease: "strong" } }
    : k.s.motion === "cinematic" ? { enter: { kind: "letters", duration: 1.2, stagger: 0.03 } }
    : { enter: { kind: "zoom-in", duration: 0.7, ease: "back" } },
  text: (k: TK, delay = 0.1): Motion =>
    k.s.motion === "snappy" ? { enter: { kind: "up", duration: 0.45, distance: 24, delay } }
    : k.s.motion === "bouncy" ? { enter: { kind: "up", duration: 0.6, distance: 30, ease: "back", delay } }
    : { enter: { kind: "fade", duration: k.s.motion === "cinematic" ? 1.2 : 0.8, delay } },
  pic: (k: TK): Motion =>
    k.s.motion === "cinematic" ? { enter: { kind: "zoom-out", duration: 1.6 } }
    : k.s.motion === "snappy" ? { enter: { kind: "wipe-start", duration: 0.7 }, hover: { kind: "zoom" } }
    : k.s.motion === "bouncy" ? { enter: { kind: "zoom-in", duration: 0.7, ease: "back" }, hover: { kind: "pop" } }
    : { enter: { kind: "fade", duration: 1 }, hover: { kind: "zoom" } },
  group: (k: TK): Motion => ({ enter: { kind: k.s.motion === "bouncy" ? "zoom-in" : "up", stagger: k.s.motion === "snappy" ? 0.06 : 0.12, distance: 28, ...(k.s.motion === "bouncy" ? { ease: "back" } : {}) } }),
};

export type Tone = "bg" | "surface" | "soft" | "ink" | "accent" | "pop";
const TONES = (k: TK): Record<Tone, Css> => ({
  bg: {},
  surface: { bg: "surface" },
  soft: { bg: "accent-soft" },
  ink: { bg: "text", color: "bg" },
  accent: { bg: "accent", color: "accent-contrast" },
  pop: { bg: k.s.pop, color: k.s.popInk },
});
/** Words that read on a part's ground (the theme's quieter colour only on its own ground). */
export const quietOn = (tone: Tone): Css => (tone === "bg" || tone === "surface" || tone === "soft" ? { color: "muted" } : { opacity: 0.8 });

/** A part of the page in the style: its space and its ground. */
/** `grain`: a fine moving film grain over it (photographs feel printed). */
export function part(k: TK, name: Words, children: Node[], o?: { tone?: Tone; full?: boolean; pad?: [number, number, number, number]; phonePad?: [number, number, number, number]; style?: Css; anchor?: string; grain?: boolean }): Node {
  const tone = TONES(k)[o?.tone ?? "bg"];
  return {
    id: k.ids("sec"),
    type: "section",
    name: name.en,
    props: { contained: !o?.full, ...(o?.anchor ? { anchor: o.anchor } : {}) },
    style: { base: { pad: o?.pad ?? PAD[k.s.density], ...tone, ...o?.style }, mobile: { pad: o?.phonePad ?? PAD_PHONE[k.s.density] } },
    ...(o?.grain ? { motion: { fx: { kind: "grain" } } } : {}),
    children,
  };
}

const LEVEL = { 1: 72, 2: 46, 3: 26, 4: 20 } as const;
/** A heading at the style's scale; `size` overrides the level's. */
export function H(k: TK, text: Words, level: 1 | 2 | 3 | 4, o?: { size?: number; style?: Css; phone?: Css; motion?: Motion | false }): Node {
  const base = o?.size ?? Math.round(LEVEL[level] * (level <= 2 ? k.s.head.scale : 1));
  const style: Css = { size: base, sizeMin: Math.max(18, Math.round(base * (level === 1 ? 0.46 : 0.6))), weight: k.s.head.weight, lineHeight: level <= 2 ? k.s.head.line : 1.2, balance: "balance", ...(k.s.head.caps ? { caps: "upper" } : {}), ...o?.style };
  return { id: k.ids("h"), type: "heading", props: { text, level }, style: { base: style, ...(o?.phone ? { mobile: o.phone } : {}) }, ...(o?.motion === false ? {} : { motion: o?.motion ?? mv.head(k) }) };
}
/** Words in the text face. */
export function T(k: TK, text: Words, o?: { size?: number; style?: Css; motion?: Motion | false; delay?: number }): Node {
  return { id: k.ids("t"), type: "text", props: { text }, style: { base: { size: o?.size ?? 17, lineHeight: 1.65, ...o?.style } }, ...(o?.motion === false ? {} : { motion: o?.motion ?? mv.text(k, o?.delay) }) };
}
/** A small label over a heading. */
export const EB = (k: TK, text: Words, o?: { style?: Css }): Node => T(k, text, { size: 13, style: { weight: 700, caps: "upper", color: "accent", lineHeight: 1.3, ...o?.style } });

/** A button: `main` in the style's own way, `alt` the quieter one. */
export function BTN(k: TK, label: Words, href: string, kind: "main" | "alt" = "main", o?: { style?: Css }): Node {
  const variant = kind === "alt" ? (k.s.button.variant === "outline" ? "link" : "outline") : k.s.button.variant;
  const style: Css = { radius: k.s.button.radius, pad: [15, 30, 15, 30], weight: 700, ...(k.s.button.caps ? { caps: "upper" } : {}), ...o?.style };
  return { id: k.ids("b"), type: "button", props: { label, href, variant }, style: { base: style }, motion: { ...mv.text(k, 0.2), hover: { kind: k.s.motion === "bouncy" ? "jelly" : k.s.motion === "snappy" ? "magnetic" : "lift" } } };
}
/** A hairline across, where the style draws lines between things. */
export const RULE = (k: TK): Node[] => (k.s.rules ? [{ id: k.ids("dv"), type: "divider", props: {}, style: { base: { margin: [0, 0, 28, 0] } } }] : []);
export const BTNS = (k: TK, buttons: Node[], o?: { center?: boolean }): Node => row(k, buttons, { style: { gap: 12, margin: [10, 0, 0, 0], ...(o?.center ? { justify: "center" } : {}) } });

/** A picture in the style's frame and look. */
export function PIC(k: TK, name: string, alt: Words, o?: { aspect?: string; height?: string; phoneHeight?: string; phone?: Css; radius?: number; href?: string; style?: Css; motion?: Motion | false; plain?: boolean }): Node {
  const f = k.s.img.frame;
  const frame: Css = o?.plain ? {} : f === "line" ? { border: { width: 1, color: "border" } } : f === "offset" ? { border: { width: 3, color: "text" }, shade: { x: 8, y: 8, blur: 0, color: "text" } } : f === "glow" ? { glow: { color: "accent", size: 28 } } : {};
  const style: Css = { width: "100%", fit: "cover", radius: o?.radius ?? k.s.img.radius, ...(o?.height ? { height: o.height } : { aspect: o?.aspect ?? "4 / 5" }), ...frame, ...(k.s.img.filters ? { filters: k.s.img.filters } : {}), ...o?.style };
  return { id: k.ids("img"), type: "image", props: { src: k.pic(name), alt, ...(o?.href ? { href: o.href } : {}) }, style: { base: style, ...(o?.phoneHeight || o?.phone ? { mobile: { ...(o.phoneHeight ? { height: o.phoneHeight } : {}), ...o.phone } } : {}) }, ...(o?.motion === false ? {} : { motion: o?.motion ?? mv.pic(k) }) };
}

/* ---------------------------------------------------- products and categories */

export type Sample = { pic: string; name: Words; price: string; note?: Words; tag?: Words };
export type CardLook = "plain" | "boxed" | "overlay" | "spec" | "round";
/** A sample product as the gallery shows it. */
export function sampleCard(k: TK, x: Sample, look: CardLook, aspect = "4 / 5"): Node {
  const pic = PIC(k, x.pic, x.name, { aspect, href: "/shop", motion: { hover: { kind: "zoom" } }, ...(look === "round" ? { radius: 999, style: { aspect: "1 / 1" } } : {}) });
  const name = T(k, x.name, { size: 16, style: { weight: 600, lineHeight: 1.35 }, motion: false });
  const price = T(k, t(x.price), { size: 16, style: { weight: 700, color: "accent", lineHeight: 1.35 }, motion: false });
  const note = x.note ? [T(k, x.note, { size: 14, style: { color: "muted", lineHeight: 1.4 }, motion: false })] : [];
  const tag = x.tag ? [T(k, x.tag, { size: 12, style: { weight: 700, caps: "upper", bg: "accent", color: "accent-contrast", pad: [4, 10, 4, 10], radius: k.s.button.radius, self: "start", lineHeight: 1.3 }, motion: false })] : [];
  if (look === "overlay")
    return stack(k, [pic, stack(k, [...tag, name, price], { style: { layer: { x: 5, y: 95, anchor: "bottom-start" }, z: 2, gap: 4, pad: [12, 14, 12, 14], bg: "surface", radius: k.s.img.radius ? 8 : 0 } })], { style: { gap: 0 } });
  if (look === "spec")
    return stack(k, [pic, row(k, [name, price], { style: { justify: "between", gap: 8, wrap: false } }), ...note, { id: k.ids("dv"), type: "divider", props: {} }], { style: { gap: 8 } });
  if (look === "boxed")
    return stack(k, [...tag, pic, name, ...note, price], { style: { gap: 8, pad: [14, 14, 18, 14], bg: "surface", radius: Math.min(24, k.s.img.radius + 6) } });
  if (look === "round") return stack(k, [pic, name, price], { style: { gap: 6, align: "center", textAlign: "center" } });
  return stack(k, [pic, ...tag, row(k, [name, price], { style: { justify: "between", gap: 8, wrap: false } }), ...note], { style: { gap: 8 } });
}
/** The store's products in a grid or a row; in the gallery, the samples. */
export function SHELF(k: TK, samples: Sample[], o: { columns: number; look: CardLook; row?: boolean; limit?: number; aspect?: string; phoneColumns?: number; title?: Words }): Node {
  if (!k.demo) return el(k, "products", { source: "new", limit: o.limit ?? samples.length, layout: o.row ? "row" : "grid", columns: o.columns, card: o.look === "boxed" ? "soft" : o.look === "spec" ? "bordered" : "plain", ...(o.title ? { title: o.title } : {}) });
  return grid(k, o.columns, samples.slice(0, o.limit ?? samples.length).map((x) => sampleCard(k, x, o.look, o.aspect)), { phoneColumns: o.phoneColumns ?? 2, style: { gap: 20 }, motion: mv.group(k) });
}
export type SampleCat = { pic: string; name: Words };
/** The store's categories; in the gallery, the samples in the same look. */
export function CATS(k: TK, samples: SampleCat[], o: { look: "tall" | "square" | "circle" | "overlay" | "pill" | "banner"; columns: number; phoneColumns?: number }): Node {
  if (!k.demo) return el(k, "categories", { limit: samples.length, look: o.look, columns: o.columns });
  if (o.look === "pill")
    return row(k, samples.map((c) => ({ id: k.ids("b"), type: "button", props: { label: c.name, href: "/shop", variant: "outline" }, style: { base: { radius: 999, pad: [12, 24, 12, 24] } } })), { style: { gap: 10 } });
  const aspect = o.look === "tall" ? "3 / 4" : o.look === "banner" ? "16 / 7" : "1 / 1";
  return grid(k, o.columns, samples.map((c) =>
    o.look === "overlay" || o.look === "banner"
      ? stack(k, [PIC(k, c.pic, c.name, { aspect, href: "/shop", style: { overlay: { color: "#000000", to: "#00000000", angle: 0, opacity: 0.55 } }, motion: { hover: { kind: "zoom" } } }), H(k, c.name, 3, { style: { color: "#ffffff", layer: { x: 6, y: 92, anchor: "bottom-start" }, z: 2 }, motion: false })], { style: { gap: 0 } })
      : stack(k, [PIC(k, c.pic, c.name, { aspect, href: "/shop", radius: o.look === "circle" ? 999 : undefined, motion: { hover: { kind: "zoom" } } }), H(k, c.name, 4, { style: { textAlign: o.look === "circle" ? "center" : "start" }, motion: false })], { style: { gap: 10, ...(o.look === "circle" ? { align: "center" } : {}) } }),
  ), { phoneColumns: o.phoneColumns ?? 2, style: { gap: 16 }, motion: mv.group(k) });
}

/** A heading row: the title, and a link at the far end. */
export const HEAD = (k: TK, title: Words, link?: { label: Words; href: string }, o?: { size?: number; center?: boolean }): Node =>
  row(k, [H(k, title, 2, { size: o?.size }), ...(link ? [{ id: k.ids("b"), type: "button", props: { label: link.label, href: link.href, variant: "link" }, style: { base: { weight: 700 } } } as Node] : [])], { style: { justify: o?.center ? "center" : "between", align: "end", margin: [0, 0, 36, 0], wrap: true } });

export { t };
