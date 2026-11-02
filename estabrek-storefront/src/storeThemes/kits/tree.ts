/**
 * The design kits' pages (phase 11.3): each design's whole site made of the editor's own
 * elements, so a store that picks a design gets pages it changes in the editor element by
 * element. These write the page tree the backend checks (lib/pageTree.ts there); words are
 * always in all three languages, pictures come from the kit's own set (kits/photos.ts).
 */
import type { Words } from "../types";

export type Style = Record<string, unknown>;
export type Motion = Record<string, unknown>;
export type Node = { id: string; type: string; name?: string; props: Record<string, unknown>; style?: { base?: Style; tablet?: Style; mobile?: Style }; motion?: Motion; children?: Node[] };

/**
 * What a kit's page is built with: ids, the kit's pictures by name (a placeholder until the
 * set is in), and `demo`: drawn for the design gallery, where the store's own blocks (its
 * products) show the kit's sample ones instead.
 */
export type K = { ids: (prefix: string) => string; pic: (name: string) => string; demo: boolean };
export const kitCtx = (photos: Record<string, string>, demo = false): K => {
  let n = 0;
  const fallback = ["/templates/photo-1.svg", "/templates/photo-2.svg", "/templates/photo-3.svg", "/templates/photo-4.svg", "/templates/photo-5.svg", "/templates/photo-6.svg"];
  let f = 0;
  return { ids: (p) => `${p}-${(n++).toString(36)}`, pic: (name) => photos[name] ?? fallback[f++ % fallback.length], demo };
};

/** Words written "Arabic|English|Hebrew". */
export const t = (s: string): Words => {
  const [ar, en = ar, he = en] = s.split("|");
  return { ar, en, he };
};

type O = { style?: Style; phone?: Style; motion?: Motion | false };
const styled = (o?: O): Node["style"] | undefined => (o?.style || o?.phone ? { ...(o.style ? { base: o.style } : {}), ...(o.phone ? { mobile: o.phone } : {}) } : undefined);
const make = (k: K, prefix: string, type: string, props: Node["props"], o?: O, fallback?: Motion, children?: Node[]): Node => {
  const motion = o?.motion === false ? undefined : o?.motion ?? fallback;
  return { id: k.ids(prefix), type, props, ...(styled(o) ? { style: styled(o) } : {}), ...(motion ? { motion } : {}), ...(children ? { children } : {}) };
};

/* Motion the kits share (each element may bring its own). */
export const M = {
  letters: { enter: { kind: "letters", duration: 1, stagger: 0.035 } },
  lines: { enter: { kind: "lines", duration: 0.9 } },
  up: (delay = 0): Motion => ({ enter: { kind: "up", duration: 0.8, distance: 28, delay } }),
  fade: (delay = 0): Motion => ({ enter: { kind: "fade", duration: 0.9, delay } }),
  wipe: { enter: { kind: "wipe-up", duration: 1.1 } },
  group: { enter: { kind: "up", stagger: 0.1, distance: 32 } },
  zoom: { hover: { kind: "zoom" } },
  lift: { hover: { kind: "lift" } },
  parallax: (speed = 0.25): Motion => ({ scroll: { kind: "parallax", speed } }),
  count: { enter: { kind: "count", duration: 1.6 } },
};

export const h = (k: K, text: Words, level: number, o?: O): Node => make(k, "h", "heading", { text, level }, { ...o, style: { balance: "balance", ...o?.style } }, M.lines);
export const p = (k: K, text: Words, o?: O): Node => make(k, "t", "text", { text }, { ...o, style: { lineHeight: 1.7, ...o?.style } }, M.up(0.1));
export const btn = (k: K, label: Words, href: string, variant: "solid" | "outline" | "link" = "solid", o?: O): Node => make(k, "b", "button", { label, href, variant }, o, M.up(0.2));
export const img = (k: K, name: string, alt: Words, o?: O & { href?: string }): Node =>
  make(k, "img", "image", { src: k.pic(name), alt, ...(o?.href ? { href: o.href } : {}) }, { ...o, style: { width: "100%", fit: "cover", ...o?.style } }, M.wipe);
export const video = (k: K, src: string, poster: string, o?: O): Node => make(k, "vid", "video", { src, poster, autoplay: true, loop: true, muted: true }, { ...o, style: { width: "100%", fit: "cover", ...o?.style } });
export const stack = (k: K, children: Node[], o?: O): Node => make(k, "stk", "stack", {}, { ...o, style: { direction: "column", gap: 16, ...o?.style } }, undefined, children);
export const row = (k: K, children: Node[], o?: O): Node => make(k, "row", "stack", {}, { ...o, style: { direction: "row", wrap: true, gap: 12, align: "center", ...o?.style } }, undefined, children);
export const cell = (k: K, children: Node[], style?: Style): Node => make(k, "cell", "cell", {}, style ? { style } : undefined, undefined, children);
/** Columns (shares in `widths`); one under the other on a phone unless said. */
export const cols = (k: K, widths: number[], cells: Node[][], o?: O & { phoneOrder?: "stack" | "reverse" | "keep"; cellStyle?: Style }): Node =>
  make(k, "cols", "columns", { phone: o?.phoneOrder ?? "stack" }, { ...o, style: { widths, gap: 48, ...o?.style } }, undefined, cells.map((kids) => cell(k, kids, { justify: "center", ...o?.cellStyle })));
export const grid = (k: K, columns: number, children: Node[], o?: O & { phoneColumns?: number }): Node =>
  make(k, "grid", "grid", {}, { ...o, style: { columns, gap: 24, ...o?.style }, phone: { columns: o?.phoneColumns ?? 1, ...o?.phone } }, M.group, children);
/** Any element with its own props (products, a form, tabs, a marquee…). */
export const el = (k: K, type: string, props: Node["props"], o?: O): Node => make(k, type.slice(0, 4), type, props, o);

/** A section: its name in the editor's layers, the page's width unless `full`. */
export function sec(k: K, name: Words, children: Node[], o?: O & { full?: boolean; tag?: "section" | "header" | "footer"; anchor?: string; props?: Node["props"] }): Node {
  const base: Style = { pad: [104, 24, 104, 24], ...o?.style };
  return {
    id: k.ids("sec"),
    type: "section",
    name: name.en,
    props: { contained: !o?.full, ...(o?.tag ? { tag: o.tag } : {}), ...(o?.anchor ? { anchor: o.anchor } : {}), ...o?.props },
    style: { base, mobile: { pad: [64, 16, 64, 16], ...o?.phone } },
    ...(o?.motion ? { motion: o.motion } : {}),
    children,
  };
}

/** Words placed over a picture: free on the section, anchored where said. */
export const over = (x: number, y: number, anchor = "center"): Style => ({ layer: { x, y, anchor }, z: 2 });

/**
 * The store's products in a row; in the gallery, the kit's sample ones as cards (a picture,
 * a name, a price) so the design shows as it's meant to before a store's own are in it.
 */
export function shelf(k: K, title: Words, samples: Array<{ pic: string; name: Words; price: string; note?: Words }>, o?: { columns?: number }): Node {
  if (!k.demo) return el(k, "products", { source: "new", limit: 8, layout: "row", title, card: "plain", ...(o?.columns ? { columns: o.columns } : {}) });
  return stack(k, [
    h(k, title, 2, { style: { size: 32, sizeMin: 24 }, motion: false }),
    grid(k, o?.columns ?? 4, samples.map((x) =>
      stack(k, [
        img(k, x.pic, x.name, { href: "/shop", style: { aspect: "4 / 5", radius: 6 }, motion: M.zoom }),
        row(k, [p(k, x.name, { style: { size: 16, weight: 600 }, motion: false }), p(k, t(x.price), { style: { size: 16, color: "accent", weight: 700 }, motion: false })], { style: { justify: "between", gap: 8, wrap: false } }),
        ...(x.note ? [p(k, x.note, { style: { size: 14, color: "muted" }, motion: false })] : []),
      ], { style: { gap: 8 } }),
    ), { phoneColumns: 2, style: { gap: 20 } }),
  ], { style: { gap: 24 } });
}
