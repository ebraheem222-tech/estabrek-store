/**
 * Openings in the section DNA: sixteen layouts (where the words, pictures and the store's parts go), each worn in
 * the looks that suit it (dna/looks.ts). The picks at the end are the curated pairs that become templates.
 */
import { COLS, GRID, MODEL, STACK, mo, pop, type Ctx, type N } from "../build";
import { OFFER, categories, countdown } from "../parts";
import { C, RUNNING, STATS, w, type W } from "../words";
import { button, buttons, card, el, head, over, picture, rule, say, section, text } from "./kit";
import type { Look } from "./looks";

export type Layout = { key: string; name: W; build: (c: Ctx, L: Look) => N };

/** The opening's words: the small line, the big heading, a line of words and the buttons. */
function words(c: Ctx, L: Look, o: { center?: boolean; size?: number; overPic?: boolean; max?: string; eyebrow?: W; title?: W; sub?: W } = {}): N[] {
  const top = over(c, L, o.eyebrow ?? c.pack.eyebrow, { center: o.center, onPic: o.overPic });
  return [
    ...(top ? [top] : []),
    head(c, L, o.title ?? c.pack.title, 1, { size: o.size, center: o.center, over: o.overPic }),
    ...rule(c, L),
    text(c, L, o.sub ?? c.pack.sub, { max: o.max ?? "600px", over: o.overPic, center: o.center }),
    buttons(c, L, { center: o.center, over: o.overPic }),
  ];
}
/** Where a card sits on a full picture, by the look's mood (so the same layout reads differently in each). */
const CARD_SPOT: Record<Look["mood"], { x: number; y: number; anchor: string }> = {
  calm: { x: 5, y: 90, anchor: "bottom-start" }, tech: { x: 5, y: 90, anchor: "bottom-start" }, playful: { x: 95, y: 90, anchor: "bottom-end" },
  bold: { x: 50, y: 50, anchor: "center" }, classic: { x: 5, y: 10, anchor: "top-start" }, luxe: { x: 95, y: 10, anchor: "top-end" },
};
/** Words in a card on a picture: glass keeps the section's build (white words); a solid card is the page's own ground. */
const inCard = (c: Ctx, L: Look): Ctx => (L.card === "glass" ? c : { ...c, skin: "plain" });
const group = (c: Ctx, kids: N[], center = false, gap = 18) => STACK(c, kids, { gap, ...(center ? { align: "center", textAlign: "center" } : {}) });
const NAME = C.welcome;

export const HERO_LAYOUTS: Layout[] = [
  { key: "center", name: w("في النص", "Centred", "במרכז"), build: (c, L) =>
    section(c, L, [group(c, words(c, L, { center: true, max: "640px" }), true)], NAME, { center: true }) },
  { key: "split", name: w("كلام وصورة", "Words and a picture", "מילים ותמונה"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[group(c, words(c, L))], [picture(c, L, c.pack.product)]], { gap: 64, align: "center" })], NAME) },
  { key: "split-flip", name: w("صورة وكلام", "A picture and words", "תמונה ומילים"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[picture(c, L, c.pack.product, { aspect: "1 / 1" })], [group(c, words(c, L))]], { gap: 64, align: "center", phone: "reverse" })], NAME) },
  { key: "wide", name: w("كلام عريض وصورة طويلة", "Wide words, a tall picture", "מילים רחבות ותמונה גבוהה"), build: (c, L) =>
    section(c, L, [COLS(c, [3, 2], [[group(c, words(c, L, { size: 72, max: "560px" }), false, 22)], [picture(c, L, c.pack.collection, { aspect: "3 / 4" })]], { gap: 56, align: "end" })], NAME) },
  { key: "cover", name: w("صورة كاملة وكلام بنصها", "A full picture, words in the middle", "תמונה מלאה, מילים במרכז"), build: (c, L) =>
    section(c, L, [
      picture(c, L, c.pack.product, { bare: true, radius: 0, aspect: "16 / 9", style: { height: "84vh", aspect: undefined, overlay: { color: "#000000", opacity: 0.42 } }, phone: { height: "74vh" } }),
      STACK(c, words(c, L, { center: true, overPic: true }), { gap: 18, align: "center", textAlign: "center", width: "90%", maxWidth: "780px", layer: { x: 50, y: 50, anchor: "center" }, z: 2 }),
    ], NAME, { full: true, pad: [0, 0, 0, 0], phone: { pad: [0, 0, 0, 0] }, plainGround: true }) },
  { key: "cover-card", name: w("صورة كاملة وبطاقة", "A full picture and a card", "תמונה מלאה וכרטיס"), build: (c, L) =>
    section(c, L, [
      picture(c, L, c.pack.collection, { bare: true, radius: 0, aspect: "16 / 9", style: { height: "86vh", aspect: undefined, overlay: { color: "#000000", opacity: L.card === "glass" ? 0.42 : 0.18 } }, phone: { height: "60vh" } }),
      STACK(c, [card(c, L, words(inCard(c, L), L, { overPic: L.card === "glass", max: "440px" }), {}, { onPic: true })], { width: "92%", maxWidth: "520px", layer: CARD_SPOT[L.mood], z: 2 }, mo.text(c, 0.2)),
    ], NAME, { full: true, pad: [0, 0, 0, 0], phone: { pad: [0, 0, 0, 0] }, plainGround: true }) },
  { key: "giant", name: w("كلام ضخم وصور", "Giant words and pictures", "מילים ענקיות ותמונות"), build: (c, L) =>
    section(c, L, [
      group(c, words(c, L, { size: 112, max: "640px" }), false, 22),
      STACK(c, [], { height: "40px" }),
      GRID(c, 3, [picture(c, L, c.pack.product, { aspect: "4 / 5", bare: true }), picture(c, L, c.pack.collection, { aspect: "4 / 5", bare: true, style: { moveY: 40 } }), picture(c, L, C.newIn, { aspect: "4 / 5", bare: true })], { gap: 20, phone: 3 }),
    ], NAME) },
  { key: "collage", name: w("كلام ولوحة صور", "Words and a collage", "מילים וקולאז׳"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [
      [group(c, words(c, L))],
      [GRID(c, 2, [picture(c, L, c.pack.product, { aspect: "3 / 5", bare: true }), STACK(c, [picture(c, L, c.pack.collection, { aspect: "1 / 1", bare: true }), picture(c, L, C.newIn, { aspect: "1 / 1", bare: true })], { gap: 16 })], { gap: 16, phone: 2 })],
    ], { gap: 56, align: "center" })], NAME) },
  { key: "framed", name: w("صورتين فوق بعض وشارة", "Two pictures, one over the other, and a badge", "שתי תמונות זו על זו ותג"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [
      [group(c, words(c, L))],
      [STACK(c, [
        // The one behind, at the top's start; the one in front, lower and at the end, holds the place's height.
        STACK(c, [picture(c, L, c.pack.collection, { aspect: "1 / 1", bare: true })], { width: "52%", layer: { x: 0, y: 0, anchor: "top-start" }, z: 0 }),
        STACK(c, [picture(c, L, c.pack.product, { aspect: "4 / 5" })], { width: "68%", self: "end", margin: [56, 0, 0, 0], z: 1 }),
        STACK(c, [head(c, L, STATS[1].n, 3, { size: 34 }), text(c, L, STATS[1].label)], { gap: 2, pad: [18, 22, 18, 22], bg: "bg", color: "text", radius: Math.min(24, L.btn.radius === 999 ? 24 : L.btn.radius), shadow: "lg", layer: { x: 4, y: 92, anchor: "bottom-start" }, z: 2 }),
      ], { gap: 0 })],
    ], { gap: 64, align: "center" })], NAME) },
  { key: "card-over", name: w("بطاقة بنص صورة", "A card in a picture", "כרטיס בתוך תמונה"), build: (c, L) =>
    section(c, L, [STACK(c, [
      picture(c, L, c.pack.product, { bare: true, aspect: "21 / 9", radius: Math.min(L.pic.radius, 32), phone: { aspect: "3 / 4" }, ...(L.card === "glass" ? { style: { overlay: { color: "#000000", opacity: 0.42 } } } : {}) }),
      STACK(c, [card(c, L, words(inCard(c, L), L, { center: true, overPic: L.card === "glass", max: "460px" }), { align: "center", textAlign: "center" }, { onPic: true })], { width: "88%", maxWidth: "560px", layer: { x: 50, y: 50, anchor: "center" }, z: 2 }, mo.text(c, 0.2)),
    ], { gap: 0 })], NAME) },
  { key: "tall", name: w("صورة طويلة وكلام وصورة", "Tall picture, words, picture", "תמונה גבוהה, מילים, תמונה"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3, 2], [
      [picture(c, L, c.pack.product, { aspect: "2 / 3" })],
      [group(c, words(c, L, { center: true, max: "460px" }), true)],
      [picture(c, L, c.pack.collection, { aspect: "1 / 1", bare: true })],
    ], { gap: 40, align: "center" })], NAME) },
  { key: "strip", name: w("كلام وشريط صور", "Words and a row of pictures", "מילים ושורת תמונות"), build: (c, L) =>
    section(c, L, [
      group(c, words(c, L, { center: true, max: "620px" }), true),
      STACK(c, [], { height: "48px" }),
      GRID(c, 4, [0, 1, 2, 3].map((i) => picture(c, L, [c.pack.product, c.pack.collection, C.newIn, C.best][i], { aspect: "3 / 4", bare: true, style: i % 2 ? { moveY: 36 } : {}, phone: { moveY: 0 } })), { gap: 18, phone: 2 }),
    ], NAME, { center: true }) },
  { key: "numbers", name: w("كلام وأرقام", "Words and numbers", "מילים ומספרים"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [
      [group(c, [...words(c, L), GRID(c, 3, STATS.slice(0, 3).map((s) => STACK(c, [head(c, L, s.n, 3, { size: 36 }), text(c, L, s.label)], { gap: 2 })), { gap: 16, phone: 3 })])],
      [picture(c, L, c.pack.product)],
    ], { gap: 64, align: "center" })], NAME) },
  { key: "offer", name: w("عرض بكود وعدّاد", "An offer with a code and a countdown", "מבצע עם קוד וספירה"), build: (c, L) =>
    section(c, L, [group(c, [
      ...[over(c, L, C.ends, { center: true })].filter((n): n is N => n !== null),
      head(c, L, OFFER.title, 1, { center: true }),
      text(c, L, OFFER.use, { center: true, max: "560px" }),
      countdown(c),
      STACK(c, [
        STACK(c, [text(c, L, C.code), head(c, L, OFFER.code, 4)], { direction: "row", gap: 10, align: "center", pad: [10, 18, 10, 18], radius: Math.min(L.btn.radius, 999), border: { width: 2, color: pop(c), style: "dashed" } }),
        button(c, L, C.shop, "/shop"),
      ], { direction: "row", gap: 14, wrap: true, align: "center", justify: "center" }),
    ], true, 22)], C.launch, { center: true }) },
  { key: "model", name: w("كلام وموديل 3D", "Words and a 3D model", "מילים ומודל תלת־ממד"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[group(c, words(c, L))], [MODEL(c)]], { gap: 40, align: "center" })], NAME) },
  { key: "search", name: w("بحث وأقسام", "Search and categories", "חיפוש וקטגוריות"), build: (c, L) =>
    section(c, L, [group(c, [
      head(c, L, c.pack.title, 1, { center: true }),
      text(c, L, c.pack.sub, { center: true, max: "600px" }),
      el(c, "search", { look: "pill", button: say(c, w("ابحثوا", "Search", "חיפוש")) }, { self: "stretch", maxWidth: "640px", margin: [8, 0, 8, 0] }),
      categories(c, { look: "pill", limit: 6 }),
    ], true, 18)], NAME, { center: true }) },
  { key: "running", name: w("كلام كبير وسطر ماشي", "Big words and a running line", "מילים גדולות ושורה רצה"), build: (c, L) =>
    section(c, L, [
      group(c, words(c, L, { size: 96, max: "620px" }), false, 22),
      STACK(c, [], { height: "40px" }),
      el(c, "marquee", { items: RUNNING.map((t) => say(c, t)), speed: 30, pause: true, separator: "✦" }, { size: 28, weight: L.head.weight, ...(L.head.font ? { font: L.head.font } : {}), color: pop(c) }),
    ], NAME) },
];

/** Which looks each layout is made in (the curated picks). */
export const HERO_PICKS: Record<string, string[]> = {
  center: ["airy", "ink", "neon", "candy", "noir", "carved", "organic"],
  split: ["editorial", "pillow", "marker", "mono", "duotone", "sport", "luxe"],
  "split-flip": ["arches", "blobs", "tilted", "paper", "glass", "retro"],
  wide: ["heavy", "editorial", "minimal", "carved", "luxe", "ink"],
  cover: ["luxe", "sport", "minimal", "editorial", "noir", "carved"],
  "cover-card": ["glass", "pillow", "noir", "brutal", "editorial", "retro"],
  giant: ["heavy", "carved", "ink", "sport", "neon", "retro"],
  collage: ["pillow", "candy", "editorial", "mono", "organic", "duotone"],
  framed: ["gallery", "paper", "tilted", "brutal", "arches", "marker"],
  "card-over": ["glass", "luxe", "airy", "candy", "noir"],
  tall: ["luxe", "arches", "gallery", "minimal", "noir", "organic"],
  strip: ["airy", "tilted", "duotone", "mono", "paper", "blobs"],
  numbers: ["brutal", "mono", "heavy", "pillow", "glass", "minimal"],
  offer: ["brutal", "candy", "neon", "retro", "ink", "sport"],
  model: ["glass", "neon", "pillow", "minimal", "candy"],
  search: ["airy", "mono", "pillow", "editorial", "glass"],
  running: ["heavy", "sport", "retro", "carved", "ink", "brutal"],
};
