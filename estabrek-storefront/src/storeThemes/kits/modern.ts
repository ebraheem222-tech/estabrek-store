/**
 * The library's newer parts (phase 11.3): what makes a page feel made this year. A bento
 * board of tiles, a story whose words stay while its pictures go by, a frosted card over a
 * picture, a statement painted in a gradient that lights up word by word, a carousel, and
 * words as outlines running across. Drawn in any style (kits/lib.ts).
 */
import type { Words } from "../types";
import { BTN, EB, H, PIC, T, mv, part, quietOn, type Sample, type TK, type Tone } from "./lib";
import { el, grid, row, stack, t, type Node, type Style as Css } from "./tree";

const go = "/shop";
const name = (s: string) => t(s);

export type Tile =
  | { kind: "photo"; pic: string; title: Words; text?: Words; wide?: boolean; tall?: boolean }
  | { kind: "stat"; value: Words; label: Words }
  | { kind: "quote"; text: Words; by?: Words }
  | { kind: "product"; item: Sample }
  | { kind: "cta"; title: Words; cta: Words; wide?: boolean };

const span = (wide?: boolean, tall?: boolean): Css => ({ ...(wide ? { col: "span 2" } : {}), ...(tall ? { row: "span 2" } : {}) });

export const MODERN = {
  /** A bento board: tiles of different sizes, each its own kind (a picture, a number, a quote, a product, a call). */
  bento: (k: TK, title: Words, tiles: Tile[], tone: Tone = "bg"): Node => {
    const r = Math.max(14, k.s.img.radius + 8);
    const tile = (x: Tile): Node => {
      if (x.kind === "photo")
        return stack(k, [
          PIC(k, x.pic, x.title, { height: "100%", radius: r, plain: true, style: { overlay: { color: "#000000", to: "#00000000", angle: 0, opacity: 0.6 }, minHeight: x.tall ? "520px" : "250px" }, motion: { ...mv.pic(k), hover: { kind: "zoom" } } }),
          stack(k, [H(k, x.title, 3, { size: x.tall ? 36 : 24, style: { color: "#ffffff" }, motion: false }), ...(x.text ? [T(k, x.text, { size: 14, style: { color: "#ffffff", opacity: 0.85 }, motion: false })] : [])], { style: { layer: { x: 6, y: 92, anchor: "bottom-start" }, z: 2, gap: 6, width: "88%" } }),
        ], { style: { gap: 0, ...span(x.wide, x.tall), radius: r } });
      if (x.kind === "stat")
        return stack(k, [H(k, x.value, 2, { size: 72, style: { color: "accent-contrast", lineHeight: 1 }, motion: { enter: { kind: "count", duration: 1.6 } } }), T(k, x.label, { size: 15, style: { color: "accent-contrast", opacity: 0.85 }, motion: false })], { style: { bg: "accent", radius: r, pad: [28, 28, 28, 28], justify: "end", gap: 6, minHeight: "250px" }, motion: { hover: { kind: "tilt" } } });
      if (x.kind === "quote")
        return stack(k, [T(k, t("“"), { size: 64, style: { lineHeight: 0.8, color: "accent", weight: 700 }, motion: false }), H(k, x.text, 3, { size: 22, style: { lineHeight: 1.35, caps: "none" }, motion: false }), ...(x.by ? [T(k, x.by, { size: 13, style: { color: "muted", weight: 700 }, motion: false })] : [])], { style: { bg: "surface", radius: r, pad: [28, 28, 28, 28], gap: 10, justify: "between", minHeight: "250px", border: { width: 1, color: "border" } } });
      if (x.kind === "product")
        return stack(k, [PIC(k, x.item.pic, x.item.name, { aspect: "1 / 1", radius: r - 6, href: go, motion: { hover: { kind: "zoom" } } }), row(k, [T(k, x.item.name, { size: 15, style: { weight: 600 }, motion: false }), T(k, t(x.item.price), { size: 15, style: { weight: 700, color: "accent" }, motion: false })], { style: { justify: "between", wrap: false } })], { style: { bg: "surface", radius: r, pad: [12, 12, 16, 12], gap: 10 }, motion: { hover: { kind: "lift" } } });
      return stack(k, [H(k, x.title, 3, { size: 30, style: { color: "bg" }, motion: false }), BTN(k, x.cta, go, "main", { style: { bg: "bg", color: "text", self: "start" } })], { style: { bg: "text", radius: r, pad: [32, 32, 32, 32], gap: 18, justify: "between", minHeight: "250px", ...span(x.wide) }, motion: { hover: { kind: "spotlight" } } });
    };
    return part(k, name("بنتو|Bento|בנטו"), [
      H(k, title, 2, { style: { margin: [0, 0, 32, 0] } }),
      grid(k, 4, tiles.map(tile), { phoneColumns: 2, style: { gap: 14, align: "stretch" }, motion: mv.group(k) }),
    ], { tone });
  },

  /** A story whose words stay in place while its pictures go by beside them. */
  pinned: (k: TK, c: { eyebrow: Words; title: Words; text: Words; cta: Words; pics: Array<{ pic: string; caption: Words }> }, tone: Tone = "bg"): Node =>
    part(k, name("حكاية ثابتة|Pinned story|סיפור נעוץ"), [
      row(k, [
        stack(k, [EB(k, c.eyebrow), H(k, c.title, 2, { size: 60 }), T(k, c.text, { size: 18, style: quietOn(tone) }), BTN(k, c.cta, go, "main", { style: { self: "start" } })], { style: { gap: 18, width: "40%", pad: [24, 0, 24, 0] }, phone: { width: "100%" }, motion: { scroll: { kind: "pin", length: 120 } } }),
        stack(k, c.pics.map((x, i) => stack(k, [PIC(k, x.pic, x.caption, { aspect: i % 2 ? "4 / 3" : "4 / 5", motion: { ...mv.pic(k), scroll: { kind: "parallax", speed: i % 2 ? 0.12 : -0.08 } } }), T(k, x.caption, { size: 13, style: { color: "muted" }, motion: false })], { style: { gap: 8 } })), { style: { gap: 56, width: "52%" }, phone: { width: "100%" } }),
      ], { style: { justify: "between", align: "start", wrap: true, gap: 40 } }),
    ], { tone }),

  /** A picture the whole width with a frosted card over it. */
  glass: (k: TK, pic: string, title: Words, items: Array<{ title: Words; text: Words }>, cta: Words): Node =>
    part(k, name("بطاقة زجاج|Glass card|כרטיס זכוכית"), [
      PIC(k, pic, title, { height: "92vh", phoneHeight: "110vh", radius: 0, plain: true, style: { overlay: { color: "#000000", opacity: 0.25 } }, motion: { scroll: { kind: "parallax", speed: 0.2 } } }),
      stack(k, [
        H(k, title, 2, { size: 44, style: { color: "#ffffff" } }),
        ...items.map((x) => row(k, [
          { id: k.ids("ic"), type: "icon", props: { name: "check" }, style: { base: { iconSize: 20, color: "#ffffff" } } } as Node,
          stack(k, [H(k, x.title, 4, { style: { color: "#ffffff", caps: "none" }, motion: false }), T(k, x.text, { size: 14, style: { color: "#ffffff", opacity: 0.85 }, motion: false })], { style: { gap: 2 } }),
        ], { style: { gap: 14, align: "start", wrap: false } })),
        BTN(k, cta, go, "main", { style: { self: "start", bg: "#ffffff", color: "#111111" } }),
      ], { style: { layer: { x: 94, y: 50, anchor: "end" }, z: 2, gap: 18, width: "88%", maxWidth: "460px", pad: [36, 32, 36, 32], radius: 28, bg: "#ffffff1f", backdrop: { blur: 22, saturate: 1.4 }, border: { width: 1, color: "#ffffff55" } }, phone: { layer: { x: 50, y: 50, anchor: "center" } }, motion: { enter: { kind: "up", duration: 0.9, distance: 60 } } }),
    ], { full: true, pad: [0, 0, 0, 0], phonePad: [0, 0, 0, 0] }),

  /** One sentence as big as a poster, painted in a gradient, lighting up word by word. */
  statement: (k: TK, text: Words, o?: { from?: string; to?: string; tone?: Tone; eyebrow?: Words }): Node =>
    part(k, name("جملة كبيرة|Big statement|משפט גדול"), [
      ...(o?.eyebrow ? [EB(k, o.eyebrow, { style: { textAlign: "center" } })] : []),
      H(k, text, 2, { size: 92, style: { textAlign: "center", lineHeight: 1.08, maxWidth: "1100px", self: "center", fill: { color: o?.from ?? "accent", to: o?.to ?? k.s.pop, angle: 100 } }, motion: { enter: { kind: "words", duration: 1.2, stagger: 0.06 } } }),
    ], { tone: o?.tone, pad: [140, 24, 140, 24], phonePad: [80, 16, 80, 16] }),

  /** A carousel of products, each picture with its name and price. */
  carousel: (k: TK, title: Words, samples: Sample[], tone: Tone = "bg"): Node =>
    part(k, name("كاروسيل|Carousel|קרוסלה"), [
      H(k, title, 2, { style: { margin: [0, 0, 28, 0] } }),
      k.demo
        ? el(k, "slider", { slides: samples.map((x) => ({ src: k.pic(x.pic), kind: "image", alt: x.name, caption: { ar: `${x.name.ar} · ${x.price}`, en: `${x.name.en} · ${x.price}`, he: `${x.name.he} · ${x.price}` }, href: go })), autoplay: 4, loop: true, arrows: true, dots: true, aspect: "16 / 9" }, { style: { radius: Math.max(12, k.s.img.radius) }, motion: mv.pic(k) })
        : el(k, "products", { source: "new", limit: 8, layout: "row", card: "plain" }),
    ], { tone }),

  /** Words as outlines, as big as the page allows, running across. */
  outline: (k: TK, items: Words[], tone: Tone = "bg"): Node =>
    part(k, name("كلام محدّد|Outlined words|מילים במתאר"), [el(k, "marquee", { items, speed: 30, separator: "•" }, { style: { size: 120, weight: 800, color: "transparent", stroke: { width: 1.5, color: "text" }, lineHeight: 1.1, ...(k.s.head.caps ? { caps: "upper" } : {}) }, phone: { size: 64 } })], { full: true, tone, pad: [28, 0, 28, 0], phonePad: [16, 0, 16, 0] }),
};
