/**
 * Selling in the section DNA (wave 1 of the template plan): the store's products, its categories, offers and banners,
 * each kind a set of layouts worn in the looks that suit it (dna/looks.ts). The store's own parts (products,
 * categories, a countdown) fill them, so each design shows the store's real pieces.
 */
import { COLS, GRID, STACK, mo, pop, type Ctx, type N } from "../build";
import { OFFER, countdown } from "../parts";
import { deck } from "../partsMore";
import { C, w, type W } from "../words";
import { button, buttons, card, el, head, isLight, over, picture, rule, say, section, storePanel, text } from "./kit";
import type { Look } from "./looks";
import type { Layout } from "./heroes";

type S = Record<string, unknown>;

/* ---------------------------------------------------------------- words */

const SW = {
  shopAll: w("تسوّقوا الكل", "Shop everything", "לכל המוצרים"),
  weekly: w("مختارات الأسبوع", "This week's picks", "הבחירות של השבוע"),
  weeklySub: w("قطع اخترناها إلكم بعناية، بتلبق لكل يوم.", "Pieces we picked with care, made for every day.", "פריטים שבחרנו בקפידה, לכל יום."),
  loved: w("الأكثر حباً", "Most loved", "הכי אהובים"),
  justDropped: w("نزل هلّق", "Just dropped", "הרגע נחת"),
  bundleTitle: w("اشتروا قطعتين والتالتة هدية", "Buy two, the third is a gift", "קנו שניים, השלישי במתנה"),
  bundleSub: w("على كل المجموعة الجديدة، لفترة محدودة.", "On the whole new collection, for a short time.", "על כל הקולקציה החדשה, לזמן מוגבל."),
  flash: w("تنزيلات سريعة", "Flash sale", "מבצע בזק"),
  flashBig: w("‎−30٪", "−30%", "‎−30%"),
  flashSub: w("على قطع مختارة، لحد ما يخلص العدّاد.", "On chosen pieces, until the countdown ends.", "על פריטים נבחרים, עד שהספירה נגמרת."),
  tiersTitle: w("كل ما زدتوا، وفّرتوا", "The more you get, the more you save", "ככל שתקנו יותר, תחסכו יותר"),
  tiers: [
    [w("فوق ₪200", "Over ₪200", "מעל ₪200"), w("توصيل مجاني", "Free delivery", "משלוח חינם")],
    [w("فوق ₪350", "Over ₪350", "מעל ₪350"), w("خصم 10٪", "10% off", "10% הנחה")],
    [w("فوق ₪500", "Over ₪500", "מעל ₪500"), w("خصم 15٪ وهدية", "15% off and a gift", "15% הנחה ומתנה")],
  ] as Array<[W, W]>,
  collectionSub: w("ألوان الموسم وقصّاته، بمكان واحد.", "The season's colours and cuts, in one place.", "הצבעים והגזרות של העונה, במקום אחד."),
  explore: w("اكتشفوا", "Explore", "גלו"),
  catsSub: w("لاقوا اللي بدكم إياه أسرع.", "Find what you're after, faster.", "מוצאים מה שמחפשים, מהר יותר."),
};

/* ---------------------------------------------------------------- pieces */

/** The store's product card dressed as the look's cards. */
const PRODUCT_CARD: Record<Look["card"], string> = { line: "bordered", shadow: "shadow", flat: "soft", glass: "shadow", pop: "lift", plain: "plain" };
/** The store's products in the look's cards; `inCard` = already in a card (no second frame on a light ground). */
const products = (c: Ctx, L: Look, props: S, inCard = false) => {
  const grid = el(c, "products", { source: "new", limit: 8, layout: "grid", card: PRODUCT_CARD[L.card], ...props }, { self: "stretch" });
  return inCard && isLight(c) ? grid : storePanel(c, L, [grid]);
};
const categories = (c: Ctx, L: Look, props: S) => storePanel(c, L, [el(c, "categories", { limit: 6, ...props }, { self: "stretch" })]);
/** How many tiles in a row, by the look's mood: airy looks give them room, busy ones pack them (so a layout reads
 * differently in each look even where the store's tiles don't change). */
const DENSITY: Record<Look["mood"], number> = { calm: -1, luxe: -1, bold: 0, playful: 0, classic: 1, tech: 1 };
const cols = (L: Look, base: number, min = 2, max = 6) => Math.max(min, Math.min(max, base + DENSITY[L.mood]));
/** The countdown: its boxes on a dark or coloured ground (its plain figures read on a light one only). */
const timer = (c: Ctx, look: "boxes" | "plain" = "boxes") => countdown(c, isLight(c) ? look : "boxes");

/** A title at the line's start and its link at the end. */
const titleRow = (c: Ctx, L: Look, t: W, href = "/shop") =>
  STACK(c, [STACK(c, [...[over(c, L, SW.explore)].filter((n): n is N => n !== null), head(c, L, t, 2)], { gap: 10 }), button(c, L, C.all, href, "link")], { direction: "row", justify: "between", align: "end", wrap: true, gap: 12, margin: [0, 0, 32, 0] });
/** A centred heading group. */
const centred = (c: Ctx, L: Look, t: W, sub?: W, top: W = SW.explore) =>
  STACK(c, [...[over(c, L, top, { center: true })].filter((n): n is N => n !== null), head(c, L, t, 2, { center: true }), ...(sub ? [text(c, L, sub, { center: true, max: "560px" })] : [])], { gap: 12, align: "center", textAlign: "center", margin: [0, 0, 40, 0] });
/** A heading group along the line's start. */
const along = (c: Ctx, L: Look, t: W, sub?: W, top: W = SW.explore) =>
  STACK(c, [...[over(c, L, top)].filter((n): n is N => n !== null), head(c, L, t, 2), ...rule(c, L), ...(sub ? [text(c, L, sub, { max: "480px" })] : [])], { gap: 12 });
/** A picture with words over it (light words on a dimmed picture), the words where `at` says. */
function onPicture(c: Ctx, L: Look, alt: W, kids: (k: Ctx) => N[], o: { aspect?: string; at?: "center" | "bottom" | "start"; radius?: number; phone?: S } = {}): N {
  const k: Ctx = { ...c, skin: "dark" };
  const at = o.at ?? "bottom";
  const layer = at === "center" ? { x: 50, y: 50, anchor: "center" } : at === "start" ? { x: 6, y: 50, anchor: "start" } : { x: 6, y: 90, anchor: "bottom-start" };
  return STACK(c, [
    picture(c, L, alt, { bare: true, cut: true, aspect: o.aspect ?? "4 / 5", radius: o.radius ?? Math.min(L.pic.radius, 28), style: { overlay: { color: "#000000", opacity: 0.4 } }, ...(o.phone ? { phone: o.phone } : {}) }),
    STACK(c, kids(k), { gap: 10, width: "86%", layer, z: 2, color: "white", ...(at === "center" ? { align: "center", textAlign: "center" } : { align: "start" }) }),
  ], { gap: 0 });
}
const picWords = (k: Ctx, L: Look, t: W, sub?: W, cta: W = C.shop) => [
  head(k, L, t, 3, { size: 30, over: true }),
  ...(sub ? [text(k, L, sub, { over: true, max: "380px" })] : []),
  button(k, L, cta, "/shop", "solid", { over: true }),
];

/* -------------------------------------------------------------- products */

export const PRODUCT_LAYOUTS: Layout[] = [
  { key: "head-grid", name: w("عنوان ورابط وشبكة", "A title, a link and a grid", "כותרת, קישור ורשת"), build: (c, L) =>
    section(c, L, [titleRow(c, L, C.newIn), products(c, L, { columns: 4, limit: 8 })], C.newIn) },
  { key: "centre-grid", name: w("عنوان بالنص وشبكة وزر", "A centred title, a grid and a button", "כותרת במרכז, רשת וכפתור"), build: (c, L) =>
    section(c, L, [centred(c, L, SW.weekly, SW.weeklySub), products(c, L, { columns: 4, limit: 4, source: "best" }), STACK(c, [button(c, L, SW.shopAll, "/shop")], { align: "center", margin: [36, 0, 0, 0] })], SW.weekly, { center: true }) },
  { key: "row", name: w("شريط منتجات بيتمرّر", "A row of products that scrolls", "שורת מוצרים נגללת"), build: (c, L) =>
    section(c, L, [titleRow(c, L, C.best), products(c, L, { layout: "row", limit: 10, source: "best" })], C.best) },
  { key: "promo-grid", name: w("صورة ترويج و٤ منتجات", "A promo picture and four products", "תמונת קידום וארבעה מוצרים"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3], [
      [onPicture(c, L, c.pack.collection, (k) => picWords(k, L, c.pack.collection, SW.collectionSub), { aspect: "3 / 4" })],
      [products(c, L, { columns: 2, limit: 4 })],
    ], { gap: 32, align: "stretch" })], c.pack.collection) },
  { key: "words-grid", name: w("كلام على الجنب وشبكة", "Words at the side and a grid", "מילים בצד ורשת"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 2], [
      [STACK(c, [along(c, L, C.picked, SW.weeklySub), buttons(c, L, { main: [SW.shopAll, "/shop"] })], { gap: 22 })],
      [products(c, L, { columns: 3, limit: 6, source: "best" })],
    ], { gap: 48, align: "start" })], C.picked) },
  { key: "three", name: w("تلات منتجات كبار", "Three big products", "שלושה מוצרים גדולים"), build: (c, L) =>
    section(c, L, [centred(c, L, SW.loved, undefined, C.best), products(c, L, { columns: 3, limit: 3, source: "best" })], SW.loved, { center: true }) },
  { key: "tabs", name: w("تبويبات: جديد والأكثر مبيعاً", "Tabs: new and best sellers", "לשוניות: חדש ורבי מכר"), build: (c, L) =>
    section(c, L, [centred(c, L, SW.weekly), storePanel(c, L, [deck(c, [
      { label: C.newIn, kids: [products(c, L, { columns: 4, limit: 4 })] },
      { label: C.best, kids: [products(c, L, { columns: 4, limit: 4, source: "best" })] },
      { label: C.picked, kids: [products(c, L, { columns: 4, limit: 4, source: "best" })] },
    ], { arrows: false, dots: false })])], SW.weekly, { center: true }) },
  { key: "banner-row", name: w("بانر عريض وشريط منتجات", "A wide banner and a row of products", "באנר רחב ושורת מוצרים"), build: (c, L) =>
    section(c, L, [
      onPicture(c, L, c.pack.collection, (k) => picWords(k, L, SW.justDropped, c.pack.sub), { aspect: "21 / 7", at: "start", phone: { aspect: "4 / 5" } }),
      STACK(c, [], { height: "32px" }),
      products(c, L, { layout: "row", limit: 8 }),
    ], SW.justDropped) },
  { key: "two-lists", name: w("قائمتين جنب بعض", "Two lists side by side", "שתי רשימות זו לצד זו"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [
      [STACK(c, [head(c, L, C.newIn, 3), products(c, L, { columns: 2, limit: 2 })], { gap: 20 })],
      [STACK(c, [head(c, L, C.best, 3), products(c, L, { columns: 2, limit: 2, source: "best" })], { gap: 20 })],
    ], { gap: 40 })], C.best) },
  { key: "card-grid", name: w("شبكة ببطاقة", "A grid in a card", "רשת בכרטיס"), build: (c, L) =>
    section(c, L, [card(c, L, [titleRow(c, L, C.picked), products(c, L, { columns: 4, limit: 4, source: "best" }, true)], { pad: [36, 32, 36, 32] })], C.picked) },
];

/* ------------------------------------------------------------ categories */

export const CATEGORY_LAYOUTS: Layout[] = [
  { key: "circles", name: w("دوائر بالنص", "Circles in the middle", "עיגולים במרכז"), build: (c, L) =>
    section(c, L, [centred(c, L, C.byCategory, SW.catsSub), categories(c, L, { look: "circle", columns: cols(L, 5, 3, 6) })], C.byCategory, { center: true }) },
  { key: "tall", name: w("كروت طويلة وعنوان", "Tall cards and a title", "כרטיסים גבוהים וכותרת"), build: (c, L) =>
    section(c, L, [titleRow(c, L, C.byCategory), categories(c, L, { look: "tall", columns: cols(L, 4, 3, 5), limit: cols(L, 4, 3, 5) })], C.byCategory) },
  { key: "overlay", name: w("صور كبيرة بأسماء فوقها", "Big pictures with names over them", "תמונות גדולות עם שמות"), build: (c, L) =>
    section(c, L, [centred(c, L, c.pack.collection, undefined, C.byCategory), categories(c, L, { look: "overlay", columns: cols(L, 3, 2, 4), limit: cols(L, 3, 2, 4) })], c.pack.collection, { center: true }) },
  { key: "pills", name: w("كلام وأزرار أقسام", "Words and category pills", "מילים וכפתורי קטגוריות"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[along(c, L, C.byCategory, SW.catsSub)], [categories(c, L, { look: "pill", limit: 8 })]], { gap: 48, align: "center" })], C.byCategory) },
  { key: "banners", name: w("بانرات أقسام", "Category banners", "באנרים של קטגוריות"), build: (c, L) =>
    section(c, L, [titleRow(c, L, C.byCategory), categories(c, L, { look: "banner", columns: cols(L, 2, 2, 3), limit: cols(L, 2, 2, 3) * 2 })], C.byCategory) },
  { key: "squares", name: w("مربعات صغيرة كتير", "Many small squares", "הרבה ריבועים קטנים"), build: (c, L) =>
    section(c, L, [centred(c, L, C.byCategory), categories(c, L, { look: "square", columns: cols(L, 5, 4, 6), limit: cols(L, 5, 4, 6) * 2 })], C.byCategory, { center: true }) },
  { key: "picture-cats", name: w("صورة كبيرة وأقسام", "A big picture and categories", "תמונה גדולה וקטגוריות"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [
      [onPicture(c, L, c.pack.collection, (k) => picWords(k, L, c.pack.collection, SW.collectionSub, C.all), { aspect: "4 / 5" })],
      [STACK(c, [along(c, L, C.byCategory), categories(c, L, { look: "tall", columns: 2, limit: 4 })], { gap: 24 })],
    ], { gap: 40, align: "center" })], C.byCategory) },
  { key: "card-circles", name: w("دوائر ببطاقة", "Circles in a card", "עיגולים בכרטיס"), build: (c, L) =>
    section(c, L, [card(c, L, [titleRow(c, L, C.byCategory), isLight(c) ? el(c, "categories", { look: "circle", columns: 6, limit: 6 }, { self: "stretch" }) : categories(c, L, { look: "circle", columns: 6, limit: 6 })], { pad: [32, 28, 32, 28] })], C.byCategory) },
];

/* ---------------------------------------------------------------- offers */

const code = (c: Ctx, L: Look) =>
  STACK(c, [text(c, L, C.code), head(c, L, OFFER.code, 4)], { direction: "row", gap: 10, align: "center", self: "center", pad: [10, 18, 10, 18], radius: Math.min(L.btn.radius, 999), border: { width: 2, color: pop(c), style: "dashed" } });

export const OFFER_LAYOUTS: Layout[] = [
  { key: "code-card", name: w("بطاقة كود وعدّاد", "A card with a code and a countdown", "כרטיס עם קוד וספירה"), build: (c, L) =>
    section(c, L, [STACK(c, [STACK(c, [card(c, L, [
      ...[over(c, L, C.ends, { center: true })].filter((n): n is N => n !== null),
      head(c, L, OFFER.title, 2, { center: true }),
      text(c, L, OFFER.use, { center: true, max: "460px" }),
      timer(c), code(c, L), STACK(c, [button(c, L, C.shop, "/shop")], { align: "center" }),
    ], { align: "center", textAlign: "center", gap: 18, pad: [44, 32, 44, 32] })], { maxWidth: "720px", width: "100%" })], { align: "center" })], OFFER.title, { center: true }) },
  { key: "split", name: w("عرض وصورة", "An offer and a picture", "מבצע ותמונה"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [
      [STACK(c, [...[over(c, L, C.ends)].filter((n): n is N => n !== null), head(c, L, OFFER.title, 2), text(c, L, OFFER.use), timer(c), buttons(c, L, { main: [C.shop, "/shop"] })], { gap: 18 })],
      [picture(c, L, c.pack.product, { aspect: "1 / 1" })],
    ], { gap: 56, align: "center" })], OFFER.title) },
  { key: "band", name: w("شريط عرض بعدّاد", "An offer band with a countdown", "פס מבצע עם ספירה"), build: (c, L) =>
    section(c, L, [STACK(c, [head(c, L, OFFER.title, 3), timer(c, "plain"), button(c, L, C.shop, "/shop")], { direction: "row", wrap: true, gap: 28, align: "center", justify: "center" })], OFFER.title, { center: true, pad: [36, 24, 36, 24] }) },
  { key: "tiers", name: w("كل ما زدتوا وفّرتوا", "The more you get, the more you save", "ככל שתקנו יותר"), build: (c, L) =>
    section(c, L, [centred(c, L, SW.tiersTitle, undefined, C.ends), GRID(c, 3, SW.tiers.map(([a, b]) => card(c, L, [head(c, L, a, 4, { center: true }), head(c, L, b, 3, { size: 30, center: true })], { align: "center", textAlign: "center" })), { gap: 20, phone: 1 })], SW.tiersTitle, { center: true }) },
  { key: "bundle", name: w("اشتروا تنتين والتالتة هدية", "Buy two, the third is a gift", "קנו שניים, השלישי במתנה"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [
      [GRID(c, 2, [picture(c, L, c.pack.product, { aspect: "3 / 4", bare: true }), picture(c, L, c.pack.collection, { aspect: "3 / 4", bare: true, style: { moveY: 36 }, phone: { moveY: 0 } })], { gap: 16, phone: 2 })],
      [STACK(c, [...[over(c, L, C.ends)].filter((n): n is N => n !== null), head(c, L, SW.bundleTitle, 2), text(c, L, SW.bundleSub), buttons(c, L, { main: [C.shop, "/shop"] })], { gap: 18 })],
    ], { gap: 56, align: "center", phone: "reverse" })], SW.bundleTitle) },
  { key: "flash", name: w("رقم الخصم الكبير ومنتجات", "The big discount and products", "ההנחה הגדולה ומוצרים"), build: (c, L) =>
    section(c, L, [
      STACK(c, [
        STACK(c, [...[over(c, L, SW.flash)].filter((n): n is N => n !== null), head(c, L, SW.flashBig, 2, { size: 150 })], { gap: 6 }),
        STACK(c, [text(c, L, SW.flashSub, { max: "360px" }), timer(c)], { gap: 16 }),
      ], { direction: "row", wrap: true, gap: 40, align: "end", justify: "between", margin: [0, 0, 36, 0] }),
      products(c, L, { columns: 4, limit: 4, source: "best" }),
    ], SW.flash) },
  { key: "ticket", name: w("كوبون على شكل تذكرة", "A coupon shaped like a ticket", "קופון בצורת כרטיס"), build: (c, L) =>
    section(c, L, [STACK(c, [STACK(c, [
      head(c, L, OFFER.title, 2, { center: true }), text(c, L, OFFER.use, { center: true, max: "420px" }), code(c, L),
    ], { gap: 16, align: "center", textAlign: "center", pad: [44, 48, 44, 48], bg: "bg", color: "text", shape: "ticket", shadow: "lg", maxWidth: "640px", width: "100%" })], { align: "center" }, mo.text(c, 0.1))], OFFER.title, { center: true }) },
];

/* --------------------------------------------------------------- banners */

export const BANNER_LAYOUTS: Layout[] = [
  { key: "duo", name: w("بانرين جنب بعض", "Two banners side by side", "שני באנרים זה לצד זה"), build: (c, L) =>
    section(c, L, [GRID(c, 2, [
      onPicture(c, L, c.pack.collection, (k) => picWords(k, L, c.pack.collection, SW.collectionSub), { aspect: "4 / 3" }),
      onPicture(c, L, C.newIn, (k) => picWords(k, L, C.newIn, c.pack.sub), { aspect: "4 / 3" }),
    ], { gap: 24, phone: 1 })], c.pack.collection) },
  { key: "trio", name: w("تلات بانرات", "Three banners", "שלושה באנרים"), build: (c, L) =>
    section(c, L, [GRID(c, 3, [c.pack.collection, C.newIn, C.best].map((t) => onPicture(c, L, t, (k) => picWords(k, L, t), { aspect: "3 / 4" })), { gap: 20, phone: 1 })], c.pack.collection) },
  { key: "wide", name: w("بانر عريض والكلام بالبداية", "A wide banner, words at the start", "באנר רחב, מילים בהתחלה"), build: (c, L) =>
    section(c, L, [onPicture(c, L, c.pack.collection, (k) => picWords(k, L, c.pack.collection, SW.collectionSub), { aspect: "21 / 8", at: "start", phone: { aspect: "4 / 5" } })], c.pack.collection) },
  { key: "colour-pic", name: w("بطاقة ملوّنة وصورة", "A coloured card and a picture", "כרטיס צבעוני ותמונה"), build: (c, L) => {
    // The card's own line in the card's colour (white read nowhere on a light accent); a tech look shows the picture
    // first (its card alone was too like the bold looks' on a dark theme), and on a phone the card still leads.
    const card = STACK(c, [...[over({ ...c, skin: "bold" }, L, SW.justDropped)].filter((n): n is N => n !== null), head({ ...c, skin: "bold" }, L, c.pack.collection, 2), text({ ...c, skin: "bold" }, L, SW.collectionSub), button({ ...c, skin: "bold" }, L, C.shop, "/shop")], { gap: 18, pad: [56, 44, 56, 44], bg: "accent", color: "accent-contrast", radius: Math.min(L.pic.radius || L.btn.radius, 32), justify: "center", height: "100%" });
    const pic = picture(c, L, c.pack.collection, { aspect: "1 / 1", bare: true });
    const flip = L.mood === "tech";
    return section(c, L, [COLS(c, [1, 1], flip ? [[pic], [card]] : [[card], [pic]], { gap: 0, align: "stretch", ...(flip ? { phone: "reverse" } : {}) })], c.pack.collection);
  } },
  { key: "big-two", name: w("بانر كبير وتنين صغار", "A big banner and two small ones", "באנר גדול ושניים קטנים"), build: (c, L) =>
    section(c, L, [COLS(c, [3, 2], [
      [onPicture(c, L, c.pack.collection, (k) => picWords(k, L, c.pack.collection, SW.collectionSub), { aspect: "4 / 5" })],
      [STACK(c, [onPicture(c, L, C.newIn, (k) => picWords(k, L, C.newIn), { aspect: "4 / 3" }), onPicture(c, L, C.best, (k) => picWords(k, L, C.best), { aspect: "4 / 3" })], { gap: 20 })],
    ], { gap: 20, align: "stretch" })], c.pack.collection) },
  { key: "type-band", name: w("كلام ضخم وصورة صغيرة", "Huge words and a small picture", "מילים ענקיות ותמונה קטנה"), build: (c, L) =>
    section(c, L, [STACK(c, [
      head(c, L, c.pack.collection, 2, { size: 96 }),
      STACK(c, [picture(c, L, c.pack.product, { aspect: "1 / 1", style: { width: "160px" } }), STACK(c, [text(c, L, SW.collectionSub, { max: "380px" }), button(c, L, C.shop, "/shop")], { gap: 14 })], { direction: "row", wrap: true, gap: 28, align: "center" }),
    ], { gap: 28 })], c.pack.collection) },
  { key: "framed", name: w("صورة مبروزة وتعليق", "A framed picture and a caption", "תמונה ממוסגרת וכיתוב"), build: (c, L) =>
    section(c, L, [STACK(c, [
      picture(c, L, c.pack.collection, { aspect: "16 / 9", style: { maxWidth: "880px" } }),
      STACK(c, [head(c, L, c.pack.collection, 3, { center: true }), text(c, L, SW.collectionSub, { center: true }), button(c, L, C.shop, "/shop", "link")], { gap: 8, align: "center", textAlign: "center" }),
    ], { gap: 24, align: "center" })], c.pack.collection, { center: true }) },
];

/* ----------------------------------------------------------------- picks */

export const PRODUCT_PICKS: Record<string, string[]> = {
  "head-grid": ["airy", "editorial", "mono", "brutal", "candy", "organic"],
  "centre-grid": ["luxe", "pillow", "neon", "organic", "heavy"],
  row: ["minimal", "sport", "glass", "retro", "arches"],
  "promo-grid": ["duotone", "luxe", "tilted", "neon", "gallery"],
  "words-grid": ["paper", "marker", "carved", "blobs", "editorial"],
  three: ["arches", "noir", "pillow", "mono", "candy"],
  tabs: ["glass", "airy", "brutal", "organic", "sport"],
  "banner-row": ["heavy", "neon", "gallery", "minimal", "tilted"],
  "two-lists": ["editorial", "retro", "marker", "duotone", "paper"],
  "card-grid": ["pillow", "brutal", "glass", "ink", "carved"],
};
export const CATEGORY_PICKS: Record<string, string[]> = {
  // Category tiles don't change with the look: only looks that change the section's build (framed or bare, its
  // ground, its edge) are picked, so no two category designs look alike.
  circles: ["airy", "candy", "noir"],
  tall: ["editorial", "brutal", "neon"],
  overlay: ["luxe", "candy", "duotone"],
  pills: ["pillow", "glass", "marker", "retro", "paper"],
  banners: ["brutal", "gallery", "neon"],
  squares: ["candy", "editorial", "pillow"],
  "picture-cats": ["arches", "noir", "pillow", "duotone", "sport"],
  "card-circles": ["glass", "retro", "paper"],
};
export const OFFER_PICKS: Record<string, string[]> = {
  "code-card": ["candy", "neon", "brutal", "pillow", "luxe"],
  split: ["duotone", "editorial", "sport", "glass", "organic"],
  band: ["heavy", "retro", "candy", "ink", "mono"],
  tiers: ["pillow", "brutal", "noir", "candy", "marker"],
  bundle: ["tilted", "blobs", "arches", "airy", "gallery"],
  flash: ["heavy", "sport", "neon", "carved", "ink"],
  ticket: ["retro", "paper", "candy", "glass", "neon"],
};
export const BANNER_PICKS: Record<string, string[]> = {
  // Banners are mostly picture: their looks are picked for the shapes they cut it to (arch, slant, blob, squircle,
  // leaf, square or soft corners) and their ground, so each banner design has its own silhouette.
  duo: ["luxe", "sport", "pillow", "blobs", "minimal"],
  trio: ["arches", "candy", "mono", "organic", "noir"],
  wide: ["heavy", "sport", "neon", "blobs"],
  "colour-pic": ["pillow", "brutal", "retro", "glass", "ink"],
  "big-two": ["luxe", "blobs", "sport", "pillow"],
  "type-band": ["heavy", "carved", "ink", "sport", "editorial"],
  framed: ["gallery", "paper", "arches", "minimal", "noir"],
};
