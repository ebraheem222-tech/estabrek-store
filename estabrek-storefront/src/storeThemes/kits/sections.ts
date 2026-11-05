/**
 * The templates' section library (phase 11.3): openings and parts, each a distinct layout,
 * drawn in whatever style the template wears (kits/lib.ts) and with whatever words and
 * pictures its category gives. A template is a handful of these; two templates of one
 * category share at most two (tests/templates.spec.ts).
 */
import type { Words } from "../types";
import { BTN, BTNS, CATS, EB, H, PIC, RULE, SHELF, T, mv, part, quietOn, sampleCard, type CardLook, type Sample, type SampleCat, type TK, type Tone } from "./lib";
import { cols, el, grid, row, stack, t, type Node, type Style as Css } from "./tree";

type Hero = { eyebrow?: Words; title: Words; sub?: Words; cta: Words; cta2?: Words; pic: string };
const go = "/shop";
const name = (s: string) => t(s);
const overDark: Css = { overlay: { color: "#000000", to: "#00000000", angle: 0, opacity: 0.72 } };

/* ------------------------------------------------------------------ openings */

export const OPENINGS = {
  /** A word as big as the screen allows, the product over it at an angle, the rest along the bottom. */
  giantWord: (k: TK, c: Hero & { word: Words }): Node =>
    part(k, name("الافتتاحية|Opening|פתיחה"), [
      // The picture as a sticker on the poster's corner, over the end of the word.
      PIC(k, c.pic, c.title, { aspect: "4 / 5", plain: true, radius: k.s.img.radius, style: { layer: { x: 84, y: 30, anchor: "center" }, z: 2, width: "24%", rotateZ: 7, border: { width: 6, color: "bg" }, shadow: "lg" }, phone: { width: "30%", layer: { x: 84, y: 8, anchor: "center" } }, motion: { enter: { kind: "zoom-in", duration: 0.9, ease: "back", delay: 0.3 }, loop: { kind: "float", duration: 5 } } }),
      // As big as the page allows: the largest size, drawn half again larger on a computer.
      H(k, c.word, 1, { size: 200, style: { sizeMin: 84, lineHeight: 0.82, textAlign: "center", color: "text", self: "stretch", z: 1, scale: 1.45, margin: [70, 0, 90, 0] }, phone: { scale: 1, margin: [24, 0, 24, 0] }, motion: { enter: { kind: "up", duration: 0.8, distance: 120, ease: "strong" } } }),
      cols(k, [6, 5], [[H(k, c.title, 3, { size: 28 }), ...(c.sub ? [T(k, c.sub, { style: quietOn("bg") })] : [])], [BTNS(k, [BTN(k, c.cta, go), ...(c.cta2 ? [BTN(k, c.cta2, go, "alt")] : [])])]], { style: { gap: 24, align: "end", margin: [48, 0, 0, 0], z: 2 }, cellStyle: { gap: 8 } }),
    ], { pad: [64, 24, 56, 24], style: { minHeight: "88vh", justify: "center" } }),

  /** Words on one side; the product on a tilted block of colour on the other, a round sticker on it. */
  splitTilt: (k: TK, c: Hero & { badge: Words }): Node =>
    part(k, name("الافتتاحية|Opening|פתיחה"), [
      cols(k, [6, 5], [
        [...(c.eyebrow ? [EB(k, c.eyebrow)] : []), H(k, c.title, 1), ...(c.sub ? [T(k, c.sub, { size: 19, style: { ...quietOn("bg"), maxWidth: "520px" } })] : []), BTNS(k, [BTN(k, c.cta, go), ...(c.cta2 ? [BTN(k, c.cta2, go, "alt")] : [])])],
        [stack(k, [
          PIC(k, c.pic, c.title, { aspect: "1 / 1", plain: true, style: { rotateZ: 8, fit: "contain" }, motion: { enter: { kind: "zoom-in", duration: 0.8, ease: "back" }, loop: { kind: "float", duration: 6 } } }),
          T(k, c.badge, { size: 15, style: { weight: 800, caps: "upper", textAlign: "center", bg: k.s.pop, color: k.s.popInk, radius: 999, width: "120px", height: "120px", pad: [40, 10, 40, 10], lineHeight: 1.2, layer: { x: 12, y: 12, anchor: "center" }, z: 3 }, motion: { loop: { kind: "spin", duration: 14 } } }),
        ], { style: { bg: "accent", radius: 32, pad: [40, 40, 40, 40], rotateZ: -6 }, motion: mv.pic(k) })],
      ], { style: { gap: 64, align: "center" }, cellStyle: { gap: 18 } }),
    ], { pad: [96, 24, 96, 24] }),

  /** A picture the whole screen high; small words low in a corner. */
  cinematic: (k: TK, c: Hero): Node =>
    part(k, name("الافتتاحية|Opening|פתיחה"), [
      PIC(k, c.pic, c.title, { height: "100vh", phoneHeight: "88vh", radius: 0, plain: true, style: overDark, motion: { enter: { kind: "zoom-out", duration: 2 } } }),
      stack(k, [
        ...(c.eyebrow ? [EB(k, c.eyebrow, { style: { color: "#ffffff", opacity: 0.85 } })] : []),
        H(k, c.title, 1, { style: { color: "#ffffff" } }),
        ...(c.sub ? [T(k, c.sub, { style: { color: "#ffffff", opacity: 0.85, maxWidth: "460px" } })] : []),
        BTN(k, c.cta, go, "main", { style: { color: "#ffffff", border: { width: 1, color: "#ffffff" }, self: "start" } }),
      ], { style: { layer: { x: 6, y: 90, anchor: "bottom-start" }, z: 2, gap: 14, width: "88%", maxWidth: "620px" } }),
    ], { full: true, pad: [0, 0, 0, 0], phonePad: [0, 0, 0, 0], grain: true }),

  /** Round blobs of colour floating, the product in a soft shape, a big round title in the middle. */
  bubbles: (k: TK, c: Hero): Node => {
    const blob = (x: number, y: number, size: string, color: string, d: number, phone = true): Node => stack(k, [], { style: { layer: { x, y, anchor: "center" }, z: 0, width: size, height: size, radius: 999, bg: color, opacity: 0.85 }, ...(phone ? {} : { phone: { hidden: true } }), motion: { loop: { kind: "float", duration: d } } });
    return part(k, name("الافتتاحية|Opening|פתיחה"), [
      blob(6, 52, "110px", k.s.pop, 5, false), blob(94, 58, "80px", "accent", 6, false), blob(12, 90, "64px", "accent-soft", 4), blob(88, 88, "130px", k.s.pop, 7),
      stack(k, [
        ...(c.eyebrow ? [EB(k, c.eyebrow, { style: { textAlign: "center" } })] : []),
        H(k, c.title, 1, { style: { textAlign: "center" } }),
        ...(c.sub ? [T(k, c.sub, { size: 19, style: { textAlign: "center", maxWidth: "560px", ...quietOn("bg") } })] : []),
        BTNS(k, [BTN(k, c.cta, go), ...(c.cta2 ? [BTN(k, c.cta2, go, "alt")] : [])], { center: true }),
        PIC(k, c.pic, c.title, { aspect: "16 / 10", radius: 0, plain: true, style: { shape: "blob", maxWidth: "720px", margin: [24, 0, 0, 0] } }),
      ], { style: { align: "center", gap: 16, z: 1 } }),
    ], { pad: [88, 24, 96, 24] });
  },

  /** Small, centred words, then a wide picture with room around it. */
  quiet: (k: TK, c: Hero): Node =>
    part(k, name("الافتتاحية|Opening|פתיחה"), [
      stack(k, [
        ...(c.eyebrow ? [EB(k, c.eyebrow, { style: { color: "muted" } })] : []),
        H(k, c.title, 1, { style: { textAlign: "center", maxWidth: "760px" } }),
        ...(c.sub ? [T(k, c.sub, { style: { textAlign: "center", maxWidth: "520px", ...quietOn("bg") } })] : []),
        BTNS(k, [BTN(k, c.cta, go)], { center: true }),
      ], { style: { align: "center", gap: 16, margin: [0, 0, 64, 0] } }),
      PIC(k, c.pic, c.title, { aspect: "21 / 9", style: { margin: [0, 0, 0, 0] } }),
    ], { pad: [120, 24, 72, 24] }),

  /** A poster in a thick frame with a hard shadow: a shouting title, a star-shaped sticker. */
  poster: (k: TK, c: Hero & { badge: Words }): Node =>
    part(k, name("الافتتاحية|Opening|פתיחה"), [
      stack(k, [
        cols(k, [6, 5], [
          [...(c.eyebrow ? [EB(k, c.eyebrow, { style: { color: k.s.pop } })] : []), H(k, c.title, 1, { size: 96 }), ...(c.sub ? [T(k, c.sub, { size: 18 })] : []), BTNS(k, [BTN(k, c.cta, go), ...(c.cta2 ? [BTN(k, c.cta2, go, "alt")] : [])])],
          [PIC(k, c.pic, c.title, { aspect: "1 / 1" })],
        ], { style: { gap: 40, align: "center" }, cellStyle: { gap: 16 } }),
        T(k, c.badge, { size: 16, style: { weight: 800, caps: "upper", textAlign: "center", bg: "accent", color: "accent-contrast", shape: "star", width: "150px", height: "150px", pad: [56, 16, 56, 16], lineHeight: 1.1, layer: { x: 92, y: 6, anchor: "center" }, z: 3 }, motion: { loop: { kind: "spin", duration: 18 } } }),
      ], { style: { bg: "surface", border: { width: 3, color: "text" }, shade: { x: 12, y: 12, blur: 0, color: "text" }, radius: k.s.img.radius, pad: [48, 48, 48, 48] }, motion: mv.pic(k) }),
    ], { pad: [80, 24, 96, 24] }),

  /** A dark drop: a countdown to the release, the shoe glowing and floating. */
  drop: (k: TK, c: Hero & { until?: string; label: Words }): Node =>
    part(k, name("الافتتاحية|Opening|פתיחה"), [
      cols(k, [5, 6], [
        [EB(k, c.label, { style: { color: k.s.pop } }), H(k, c.title, 1), ...(c.sub ? [T(k, c.sub, { style: quietOn("bg") })] : []),
          ...(c.until ? [el(k, "countdown", { until: c.until, look: "boxes", done: t("نزل الإصدار!|It's out!|זה בחוץ!") }, { style: { margin: [8, 0, 8, 0] } })] : []),
          BTNS(k, [BTN(k, c.cta, go), ...(c.cta2 ? [BTN(k, c.cta2, go, "alt")] : [])])],
        [PIC(k, c.pic, c.title, { aspect: "1 / 1", motion: { enter: { kind: "blur", duration: 1.4 }, loop: { kind: "float", duration: 6 } } })],
      ], { style: { gap: 56, align: "center" }, cellStyle: { gap: 18 } }),
    ], { pad: [96, 24, 96, 24], style: { mesh: { colors: ["bg", "accent", "bg"], soft: 90, move: true, speed: 0.4 } }, grain: true }),

  /** A magazine cover: the issue line, a huge serif title, two columns of words, a tall picture. */
  cover: (k: TK, c: Hero & { issue: Words; body: Words }): Node =>
    part(k, name("الافتتاحية|Opening|פתיחה"), [
      row(k, [T(k, c.issue, { size: 13, style: { weight: 700, caps: "upper" } }), T(k, t("العدد الجديد|The new issue|הגיליון החדש"), { size: 13, style: { color: "muted" } })], { style: { justify: "between", margin: [0, 0, 12, 0] } }),
      { id: k.ids("dv"), type: "divider", props: {}, style: { base: { margin: [0, 0, 40, 0] } } },
      cols(k, [7, 5], [
        [H(k, c.title, 1, { size: 116 }), T(k, c.body, { size: 16, style: { textColumns: 2, ...quietOn("bg") } }), BTNS(k, [BTN(k, c.cta, go)])],
        [PIC(k, c.pic, c.title, { aspect: "3 / 4" }), ...(c.sub ? [T(k, c.sub, { size: 13, style: { color: "muted", italic: true } })] : [])],
      ], { style: { gap: 56, align: "start" }, cellStyle: { gap: 20 } }),
    ], { pad: [64, 24, 104, 24] }),

  /** A landscape the whole width, the title on it and the trail's numbers along the bottom. */
  landscape: (k: TK, c: Hero & { stats: Array<[Words, Words]> }): Node =>
    part(k, name("الافتتاحية|Opening|פתיחה"), [
      PIC(k, c.pic, c.title, { height: "92vh", phoneHeight: "96vh", radius: 0, plain: true, style: overDark, motion: { enter: { kind: "zoom-out", duration: 1.8 }, scroll: { kind: "parallax", speed: 0.2 } } }),
      stack(k, [
        ...(c.eyebrow ? [EB(k, c.eyebrow, { style: { color: "#ffffff", opacity: 0.85 } })] : []),
        H(k, c.title, 1, { style: { color: "#ffffff" } }),
        BTNS(k, [BTN(k, c.cta, go), ...(c.cta2 ? [BTN(k, c.cta2, go, "alt", { style: { color: "#ffffff", border: { width: 1, color: "#ffffff" } } })] : [])]),
        row(k, c.stats.map(([n, label]) => stack(k, [H(k, n, 3, { size: 34, style: { color: "#ffffff" }, motion: false }), T(k, label, { size: 13, style: { color: "#ffffff", opacity: 0.8 }, motion: false })], { style: { gap: 2, pad: [0, 24, 0, 0] } })), { style: { gap: 28, margin: [28, 0, 0, 0] } }),
      ], { style: { layer: { x: 6, y: 88, anchor: "bottom-start" }, z: 2, gap: 14, width: "88%", maxWidth: "760px" } }),
    ], { full: true, pad: [0, 0, 0, 0], phonePad: [0, 0, 0, 0], grain: true }),

  /** The product in the middle with its parts pointed out, its numbers in a row under it. */
  specs: (k: TK, c: Hero & { points: Array<{ x: number; y: number; title: Words; text: Words }>; numbers: Array<[string, Words]> }): Node =>
    part(k, name("الافتتاحية|Opening|פתיחה"), [
      stack(k, [...(c.eyebrow ? [EB(k, c.eyebrow, { style: { textAlign: "center" } })] : []), H(k, c.title, 1, { style: { textAlign: "center" } }), ...(c.sub ? [T(k, c.sub, { style: { textAlign: "center", maxWidth: "560px", ...quietOn("bg") } })] : [])], { style: { align: "center", gap: 12, margin: [0, 0, 24, 0] } }),
      el(k, "hotspots", { src: k.pic(c.pic), alt: c.title, items: c.points }, { style: { maxWidth: "980px", self: "center", width: "100%" }, motion: mv.pic(k) }),
      grid(k, c.numbers.length, c.numbers.map(([n, label]) => stack(k, [T(k, t(n), { size: 30, style: { weight: 700, family: "space-mono", lineHeight: 1.1 }, motion: false }), T(k, label, { size: 13, style: { color: "muted", caps: "upper" }, motion: false })], { style: { gap: 4, pad: [16, 0, 0, 0] } })), { phoneColumns: 2, style: { gap: 16, margin: [32, 0, 28, 0] } }),
      BTNS(k, [BTN(k, c.cta, go), ...(c.cta2 ? [BTN(k, c.cta2, go, "alt")] : [])], { center: true }),
    ], { pad: [88, 24, 88, 24] }),
};

/* --------------------------------------------------------------- the parts */

export const PARTS = {
  /** Words running across, big. */
  marquee: (k: TK, items: Words[], tone: Tone = "pop"): Node =>
    part(k, name("شريط متحرك|Running words|מילים רצות"), [el(k, "marquee", { items, speed: 46, separator: "✦" }, { style: { size: 34, weight: 700, ...(k.s.head.caps ? { caps: "upper" } : {}) }, phone: { size: 24 } })], { full: true, tone, pad: [22, 0, 22, 0], phonePad: [16, 0, 16, 0] }),

  /** Two big pictures side by side, a name and a button on each. */
  splitPair: (k: TK, a: SampleCat & { cta: Words }, b: SampleCat & { cta: Words }): Node =>
    part(k, name("قسمين|Two ways in|שתי כניסות"), [
      cols(k, [1, 1], [a, b].map((x) => [stack(k, [
        PIC(k, x.pic, x.name, { aspect: "4 / 5", style: overDark, motion: { ...mv.pic(k), hover: { kind: "zoom" } } }),
        stack(k, [H(k, x.name, 2, { style: { color: "#ffffff" }, motion: false }), BTN(k, x.cta, go, "main", { style: { self: "start" } })], { style: { layer: { x: 6, y: 92, anchor: "bottom-start" }, z: 2, gap: 12 } }),
      ], { style: { gap: 0 } })]), { style: { gap: 12 } }),
    ], { full: true, pad: [12, 12, 12, 12], phonePad: [8, 8, 8, 8] }),

  /** The store's categories, in a look. */
  categories: (k: TK, title: Words, list: SampleCat[], look: "tall" | "square" | "circle" | "overlay" | "pill" | "banner", columns: number, tone: Tone = "bg"): Node =>
    part(k, name("التصنيفات|Categories|קטגוריות"), [...RULE(k), H(k, title, 2, { style: { margin: [0, 0, 32, 0], ...(look === "circle" || look === "pill" ? { textAlign: "center" } : {}) } }), CATS(k, list, { look, columns, phoneColumns: look === "circle" ? 2 : 2 })], { tone }),

  /** Categories as a big typographic list, numbered, each a link. */
  categoryList: (k: TK, title: Words, list: SampleCat[]): Node =>
    part(k, name("التصنيفات|Categories|קטגוריות"), [
      ...(!k.demo ? [H(k, title, 2), el(k, "categories", { limit: list.length, look: "pill", columns: 1 })] : [
      cols(k, [4, 8], [
        [EB(k, t("تسوّق حسب|Shop by|קנו לפי")), H(k, title, 2)],
        [stack(k, list.map((c, i) => row(k, [
          T(k, t(String(i + 1).padStart(2, "0")), { size: 14, style: { color: "muted", family: "dm-mono" }, motion: false }),
          { id: k.ids("b"), type: "button", props: { label: c.name, href: go, variant: "link" }, style: { base: { size: 44, weight: 500, color: "text", decoration: { line: "none" } }, mobile: { size: 30 } }, motion: { hover: { kind: "magnetic" } } } as Node,
        ], { style: { gap: 24, align: "center", wrap: false, pad: [14, 0, 14, 0] } })), { style: { gap: 0 }, motion: mv.group(k) })],
      ], { style: { gap: 48, align: "start" }, cellStyle: { gap: 12, justify: "start" } }),
      ]),
    ]),

  /** The store's products: a heading and a shelf in a card look. */
  shelf: (k: TK, title: Words, samples: Sample[], look: CardLook, columns: number, o?: { tone?: Tone; link?: Words; aspect?: string; eyebrow?: Words }): Node =>
    part(k, name("المنتجات|Products|מוצרים"), [
      ...RULE(k),
      row(k, [stack(k, [...(o?.eyebrow ? [EB(k, o.eyebrow)] : []), H(k, title, 2)], { style: { gap: 8 } }), ...(o?.link ? [BTN(k, o.link, go, "alt")] : [])], { style: { justify: "between", align: "end", margin: [0, 0, 32, 0] } }),
      SHELF(k, samples, { columns, look, aspect: o?.aspect }),
    ], { tone: o?.tone }),

  /** One product big, four small beside it. */
  shelfFeatured: (k: TK, title: Words, samples: Sample[], cta: Words): Node =>
    part(k, name("المنتجات|Products|מוצרים"), [
      H(k, title, 2, { style: { margin: [0, 0, 32, 0] } }),
      k.demo
        ? cols(k, [5, 7], [
            [PIC(k, samples[0].pic, samples[0].name, { aspect: "3 / 4" }), row(k, [H(k, samples[0].name, 3, { motion: false }), T(k, t(samples[0].price), { size: 20, style: { weight: 700, color: "accent" }, motion: false })], { style: { justify: "between" } }), BTN(k, cta, go, "main", { style: { self: "start" } })],
            [grid(k, 2, samples.slice(1, 5).map((x) => sampleCard(k, x, "plain", "1 / 1")), { phoneColumns: 2, style: { gap: 20 } })],
          ], { style: { gap: 32, align: "start" }, cellStyle: { gap: 14, justify: "start" } })
        : SHELF(k, samples, { columns: 3, look: "plain" }),
    ]),

  /** The top three, numbered big. */
  shelfRanked: (k: TK, title: Words, samples: Sample[]): Node =>
    part(k, name("الأكثر مبيعاً|Best sellers|רבי מכר"), [
      H(k, title, 2, { style: { margin: [0, 0, 36, 0] } }),
      k.demo
        ? grid(k, 3, samples.slice(0, 3).map((x, i) => stack(k, [
            T(k, t(String(i + 1)), { size: 120, style: { weight: 400, lineHeight: 0.8, color: "accent", family: k.s.fonts.display[0] }, motion: false }),
            sampleCard(k, x, "plain", "1 / 1"),
          ], { style: { gap: 0 } })), { phoneColumns: 1, style: { gap: 28 }, motion: mv.group(k) })
        : el(k, "products", { source: "best", limit: 3, layout: "grid", columns: 3, card: "plain" }),
    ]),

  /** Pictures of all shapes in a loose grid. */
  lookbook: (k: TK, title: Words, pics: string[], text?: Words): Node =>
    part(k, name("لوك بوك|Lookbook|לוקבוק"), [
      row(k, [H(k, title, 2), ...(text ? [T(k, text, { style: { maxWidth: "420px", ...quietOn("bg") } })] : [])], { style: { justify: "between", align: "end", margin: [0, 0, 32, 0] } }),
      grid(k, 3, pics.slice(0, 5).map((p, i) => PIC(k, p, t("لوك|Look|לוק"), { ...(i === 0 ? { height: "100%", style: { row: "span 2" } } : { aspect: ["3 / 4", "1 / 1", "4 / 5", "1 / 1", "3 / 4"][i] }), motion: { ...mv.pic(k), hover: { kind: "zoom" } } })), { phoneColumns: 2, style: { gap: 12, align: "stretch" } }),
    ]),

  /** One picture the whole width, words in its middle. */
  wide: (k: TK, pic: string, title: Words, text: Words, cta: Words): Node =>
    part(k, name("لقطة|A moment|רגע"), [
      PIC(k, pic, title, { height: "80vh", phoneHeight: "70vh", radius: 0, plain: true, style: { overlay: { color: "#000000", opacity: 0.45 } }, motion: { scroll: { kind: "parallax", speed: 0.25 } } }),
      stack(k, [H(k, title, 2, { size: 84, style: { color: "#ffffff", textAlign: "center" } }), T(k, text, { size: 18, style: { color: "#ffffff", textAlign: "center", opacity: 0.85, maxWidth: "520px" } }), BTN(k, cta, go, "main", { style: { self: "center" } })], { style: { layer: { x: 50, y: 50, anchor: "center" }, z: 2, gap: 14, align: "center", width: "90%" } }),
    ], { full: true, pad: [0, 0, 0, 0], phonePad: [0, 0, 0, 0] }),

  /** An offer with its clock. */
  countdown: (k: TK, title: Words, text: Words, until: string, cta: Words, tone: Tone = "ink"): Node =>
    part(k, name("العرض|The offer|המבצע"), [
      cols(k, [6, 5], [
        [H(k, title, 2), T(k, text, { style: quietOn(tone) }), BTN(k, cta, go, "main", { style: { self: "start" } })],
        [el(k, "countdown", { until, look: "boxes" })],
      ], { style: { gap: 40, align: "center" }, cellStyle: { gap: 14 } }),
    ], { tone }),

  /** A coupon in a dashed frame. */
  coupon: (k: TK, title: Words, text: Words, code: string, cta: Words): Node =>
    part(k, name("الكوبون|The coupon|הקופון"), [
      stack(k, [
        H(k, title, 2, { style: { textAlign: "center" } }),
        T(k, text, { style: { textAlign: "center" } }),
        T(k, t(code), { size: 30, style: { weight: 800, family: "space-mono", textAlign: "center", border: { width: 3, color: k.s.popInk, style: "dashed" }, pad: [12, 28, 12, 28], radius: 8, self: "center", lineHeight: 1.2 }, motion: { enter: { kind: "zoom-in", ease: "back" }, loop: { kind: "pulse", duration: 2.4 } } }),
        BTN(k, cta, go, "main", { style: { self: "center" } }),
      ], { style: { align: "center", gap: 16 } }),
    ], { tone: "pop" }),

  /** Customers' own pictures in a grid, with the tag to use. */
  ugc: (k: TK, tag: string, title: Words, pics: string[], tilt = false): Node =>
    part(k, name("صوركم|Your photos|התמונות שלכם"), [
      stack(k, [T(k, t(tag), { size: 18, style: { weight: 700, color: "accent", textAlign: "center" } }), H(k, title, 2, { style: { textAlign: "center" } })], { style: { align: "center", gap: 8, margin: [0, 0, 32, 0] } }),
      grid(k, 6, pics.slice(0, 6).map((p, i) => PIC(k, p, t("صورة زبون|A customer's photo|תמונה של לקוח"), { aspect: "1 / 1", ...(tilt ? { style: { rotateZ: i % 2 ? 3 : -3, border: { width: 8, color: "#ffffff" }, shadow: "md" } } : {}), motion: { ...mv.pic(k), hover: { kind: tilt ? "tilt" : "zoom" } } })), { phoneColumns: 3, style: { gap: tilt ? 18 : 6 } }),
    ]),

  /** What the store promises, with icons. */
  promises: (k: TK, items: Array<{ icon: string; title: Words; text: Words }>, tone: Tone = "surface"): Node =>
    part(k, name("الوعود|Promises|הבטחות"), [
      grid(k, items.length, items.map((x) => stack(k, [
        { id: k.ids("ic"), type: "icon", props: { name: x.icon }, style: { base: { iconSize: 30, color: tone === "accent" || tone === "ink" ? "accent-contrast" : "accent" } }, motion: k.s.motion === "bouncy" ? { loop: { kind: "bounce", duration: 2.4 } } : undefined } as Node,
        H(k, x.title, 4, { motion: false, style: { caps: "none" } }),
        T(k, x.text, { size: 14, style: quietOn(tone), motion: false }),
      ], { style: { gap: 8 } })), { phoneColumns: 2, style: { gap: 28 } }),
    ], { tone, pad: [56, 24, 56, 24], phonePad: [40, 16, 40, 16] }),

  /** The same promises as one quiet line. */
  promiseLine: (k: TK, items: Array<{ title: Words }>): Node =>
    part(k, name("الوعود|Promises|הבטחות"), [
      row(k, items.map((x) => T(k, x.title, { size: 14, style: { color: "muted" }, motion: false })), { style: { justify: "center", gap: 40 } }),
    ], { pad: [28, 24, 28, 24], phonePad: [20, 16, 20, 16], style: { border: { width: 1, color: "border" } } }),

  /** A product with its parts pointed out. */
  pointed: (k: TK, title: Words, text: Words, pic: string, points: Array<{ x: number; y: number; title: Words; text: Words }>, tone: Tone = "bg"): Node =>
    part(k, name("التفاصيل|The details|הפרטים"), [
      cols(k, [4, 7], [
        [EB(k, t("من جوّا|Inside|מבפנים")), H(k, title, 2), T(k, text, { style: quietOn(tone) })],
        [el(k, "hotspots", { src: k.pic(pic), alt: title, items: points }, { motion: mv.pic(k) })],
      ], { style: { gap: 48, align: "center" }, cellStyle: { gap: 14 } }),
    ], { tone }),

  /** Tabs of choices (a size guide, a terrain), each with its words and picture. */
  tabs: (k: TK, title: Words, text: Words, items: Array<{ label: Words; text: Words; pic?: string }>, look: "pills" | "underline" | "boxed", tone: Tone = "bg"): Node =>
    part(k, name("دليل|Guide|מדריך"), [
      stack(k, [H(k, title, 2, { style: { textAlign: "center" } }), T(k, text, { style: { textAlign: "center", maxWidth: "560px", ...quietOn(tone) } })], { style: { align: "center", gap: 12, margin: [0, 0, 36, 0] } }),
      el(k, "tabs", { look, items: items.map((x) => ({ label: x.label, text: x.text, ...(x.pic ? { image: k.pic(x.pic) } : {}) })) }, { style: { maxWidth: "980px", width: "100%", self: "center" }, motion: mv.text(k) }),
    ], { tone }),

  /** What customers said. */
  reviews: (k: TK, title: Words, items: Array<{ quote: Words; name: Words; role?: Words; stars?: number }>, layout: "grid" | "row" | "single", tone: Tone = "bg"): Node =>
    part(k, name("الآراء|Reviews|ביקורות"), [
      H(k, title, 2, { style: { textAlign: layout === "single" ? "center" : "start", margin: [0, 0, 32, 0] } }),
      el(k, "testimonials", { items, layout, columns: layout === "grid" ? Math.min(3, items.length) : undefined }, { motion: mv.group(k) }),
    ], { tone }),

  /** One sentence big, and who said it. */
  quote: (k: TK, quote: Words, by: Words, tone: Tone = "bg"): Node =>
    part(k, name("اقتباس|A quote|ציטוט"), [
      stack(k, [
        H(k, quote, 2, { size: 52, style: { textAlign: "center", italic: true, caps: "none", maxWidth: "980px", lineHeight: 1.2 } }),
        T(k, by, { size: 14, style: { textAlign: "center", caps: "upper", weight: 700, color: tone === "bg" ? "accent" : undefined } }),
      ], { style: { align: "center", gap: 24 } }),
    ], { tone }),

  /** Chapters: a picture and words, taking turns from side to side. */
  chapters: (k: TK, title: Words, items: Array<{ pic: string; title: Words; text: Words }>): Node =>
    part(k, name("الحكاية|The story|הסיפור"), [
      H(k, title, 2, { style: { textAlign: "center", margin: [0, 0, 56, 0] } }),
      stack(k, items.map((x, i) => cols(k, [1, 1], i % 2 ? [[EB(k, t(`0${i + 1}`)), H(k, x.title, 3, { size: 34 }), T(k, x.text, { style: quietOn("bg") })], [PIC(k, x.pic, x.title, { aspect: "4 / 3" })]] : [[PIC(k, x.pic, x.title, { aspect: "4 / 3" })], [EB(k, t(`0${i + 1}`)), H(k, x.title, 3, { size: 34 }), T(k, x.text, { style: quietOn("bg") })]], { style: { gap: 64, align: "center" }, cellStyle: { gap: 12 }, phoneOrder: i % 2 ? "reverse" : "stack" })), { style: { gap: 96 } }),
    ]),

  /** Cards of what things are made of. */
  materials: (k: TK, title: Words, items: Array<{ pic: string; title: Words; text: Words }>, tone: Tone = "surface"): Node =>
    part(k, name("المواد|Materials|חומרים"), [
      H(k, title, 2, { style: { margin: [0, 0, 32, 0] } }),
      grid(k, items.length, items.map((x) => stack(k, [PIC(k, x.pic, x.title, { aspect: "1 / 1" }), H(k, x.title, 4, { motion: false }), T(k, x.text, { size: 15, style: quietOn(tone), motion: false })], { style: { gap: 10 } })), { phoneColumns: 1, style: { gap: 24 } }),
    ], { tone }),

  /** Questions and answers. */
  faq: (k: TK, title: Words, items: Array<{ q: Words; a: Words }>, look: "lines" | "cards" | "plus", tone: Tone = "bg"): Node =>
    part(k, name("أسئلة|Questions|שאלות"), [
      cols(k, [4, 7], [[H(k, title, 2)], [el(k, "accordion", { items, look, single: true })]], { style: { gap: 48, align: "start" }, cellStyle: { justify: "start" } }),
    ], { tone }),

  /** A paragraph set big, as a statement. */
  statement: (k: TK, text: Words, tone: Tone = "bg"): Node =>
    part(k, name("كلمتنا|Our word|המילה שלנו"), [T(k, text, { size: 32, style: { textAlign: "center", lineHeight: 1.45, maxWidth: "900px", self: "center" }, motion: { scroll: { kind: "words" } } })], { tone }),

  /** Two pictures side by side with a line under each. */
  pair: (k: TK, a: { pic: string; caption: Words }, b: { pic: string; caption: Words }): Node =>
    part(k, name("صورتين|Two pictures|שתי תמונות"), [
      cols(k, [7, 5], [a, b].map((x, i) => [PIC(k, x.pic, x.caption, { aspect: i ? "3 / 4" : "4 / 3" }), T(k, x.caption, { size: 14, style: { color: "muted" } })]), { style: { gap: 24, align: "end" }, cellStyle: { gap: 10, justify: "start" } }),
    ]),

  /** Numbered steps. */
  steps: (k: TK, title: Words, items: Array<{ title: Words; text: Words }>, tone: Tone = "bg"): Node =>
    part(k, name("الخطوات|Steps|שלבים"), [
      H(k, title, 2, { style: { margin: [0, 0, 36, 0] } }),
      grid(k, items.length, items.map((x, i) => stack(k, [
        T(k, t(String(i + 1).padStart(2, "0")), { size: 48, style: { weight: 700, color: tone === "bg" ? "accent" : undefined, lineHeight: 1, family: k.s.fonts.display[0] }, motion: false }),
        H(k, x.title, 4, { motion: false }),
        T(k, x.text, { size: 15, style: quietOn(tone), motion: false }),
      ], { style: { gap: 8, pad: [20, 0, 0, 0] } })), { phoneColumns: 1, style: { gap: 28 } }),
    ], { tone }),

  /** Big numbers counting up. */
  numbers: (k: TK, items: Array<[string, Words]>, tone: Tone = "bg"): Node =>
    part(k, name("بالأرقام|In numbers|במספרים"), [
      grid(k, items.length, items.map(([n, label]) => stack(k, [H(k, t(n), 2, { size: 80, style: { color: tone === "bg" ? "accent" : undefined, lineHeight: 1 }, motion: { enter: { kind: "count", duration: 1.6 } } }), T(k, label, { size: 15, style: quietOn(tone), motion: false })], { style: { gap: 6, align: "center", textAlign: "center" } })), { phoneColumns: 2, style: { gap: 32 } }),
    ], { tone }),

  /** A long read: words in two columns beside a pull quote. */
  essay: (k: TK, title: Words, text: Words, pull: Words): Node =>
    part(k, name("مقال|An essay|מאמר"), [
      ...RULE(k),
      cols(k, [7, 4], [
        [H(k, title, 2), T(k, text, { style: { textColumns: 2, ...quietOn("bg") } })],
        [H(k, pull, 3, { size: 30, style: { italic: true, color: "accent", caps: "none", lineHeight: 1.3 } })],
      ], { style: { gap: 56, align: "start" }, cellStyle: { gap: 20, justify: "start" } }),
    ]),

  /** Stories as cards. */
  journal: (k: TK, title: Words, items: Array<{ pic: string; kind: Words; title: Words }>): Node =>
    part(k, name("المدونة|Journal|יומן"), [
      H(k, title, 2, { style: { margin: [0, 0, 32, 0] } }),
      grid(k, items.length, items.map((x) => stack(k, [PIC(k, x.pic, x.title, { aspect: "4 / 3", href: "/about" }), EB(k, x.kind), H(k, x.title, 3, { motion: false })], { style: { gap: 10 } })), { phoneColumns: 1, style: { gap: 24 } }),
    ]),

  /** Models side by side with their numbers. */
  compare: (k: TK, title: Words, models: Array<{ pic: string; name: Words; specs: Array<[Words, string]> }>, tone: Tone = "bg"): Node =>
    part(k, name("مقارنة|Compare|השוואה"), [
      H(k, title, 2, { style: { margin: [0, 0, 32, 0] } }),
      ...(!k.demo ? [el(k, "products", { source: "new", limit: models.length, layout: "grid", columns: Math.min(4, models.length), card: "bordered" })] : [
      grid(k, models.length, models.map((m) => stack(k, [
        PIC(k, m.pic, m.name, { aspect: "4 / 3" }),
        H(k, m.name, 3, { motion: false }),
        ...m.specs.map(([label, v]) => row(k, [T(k, label, { size: 14, style: { color: "muted" }, motion: false }), T(k, t(v), { size: 14, style: { weight: 700, family: "space-mono" }, motion: false })], { style: { justify: "between", wrap: false, pad: [8, 0, 8, 0] } })),
        BTN(k, t("التفاصيل|Details|פרטים"), go, "alt", { style: { self: "start" } }),
      ], { style: { gap: 6, pad: [18, 18, 22, 18], bg: "surface", radius: k.s.img.radius } })), { phoneColumns: 1, style: { gap: 20 } }),
      ]),
    ], { tone }),

  /** The layers of a thing, numbered, beside its picture. */
  layers: (k: TK, title: Words, pic: string, items: Array<{ title: Words; text: Words }>): Node =>
    part(k, name("الطبقات|The layers|השכבות"), [
      cols(k, [5, 6], [
        [PIC(k, pic, title, { aspect: "1 / 1" })],
        [H(k, title, 2), stack(k, items.map((x, i) => row(k, [T(k, t(`L${i + 1}`), { size: 14, style: { family: "space-mono", weight: 700, color: "accent" }, motion: false }), stack(k, [H(k, x.title, 4, { motion: false }), T(k, x.text, { size: 15, style: { color: "muted" }, motion: false })], { style: { gap: 4 } })], { style: { gap: 20, align: "start", wrap: false, pad: [16, 0, 16, 0] } })), { style: { gap: 0 }, motion: mv.group(k) })],
      ], { style: { gap: 56, align: "center" }, cellStyle: { gap: 16 } }),
    ]),

  /* Letters for the next drop: four ways. */
  letterBand: (k: TK, title: Words, text: Words, tone: Tone = "pop"): Node =>
    part(k, name("النشرة|Newsletter|ניוזלטר"), [cols(k, [6, 5], [[H(k, title, 2), T(k, text, { style: quietOn(tone) })], [el(k, "form", { kind: "newsletter" })]], { style: { gap: 48, align: "center" }, cellStyle: { gap: 12 } })], { tone }),
  letterCentered: (k: TK, title: Words, text: Words, tone: Tone = "soft"): Node =>
    part(k, name("النشرة|Newsletter|ניוזלטר"), [stack(k, [H(k, title, 2, { style: { textAlign: "center" } }), T(k, text, { style: { textAlign: "center", maxWidth: "520px", ...quietOn(tone) } }), el(k, "form", { kind: "newsletter" }, { style: { width: "100%", maxWidth: "560px" } })], { style: { align: "center", gap: 14 } })], { tone }),
  letterLine: (k: TK, title: Words): Node =>
    part(k, name("النشرة|Newsletter|ניוזלטר"), [...RULE(k), cols(k, [5, 6], [[H(k, title, 3, { size: 26 })], [el(k, "form", { kind: "newsletter" })]], { style: { gap: 32, align: "center" } })], { pad: [56, 24, 72, 24] }),
};

