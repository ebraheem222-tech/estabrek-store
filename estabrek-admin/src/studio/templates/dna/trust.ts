/**
 * What wins a customer over, in the section DNA (wave 1, second batch): reviews, trust badges and promises, numbers
 * and perks, each kind a set of layouts worn in the looks that suit it (dna/looks.ts). Reviews and promises are
 * drawn from the kit's own pieces (cards, headings, icons) so every look reaches them and they read on every skin.
 */
import { COLS, GRID, ICON, STACK, pop, type Ctx, type N } from "../build";
import { onPhone } from "../partsMore";
import { C, PERKS, STATS, VALUES, w, type IconName, type W } from "../words";
import { MORE_QUOTES, X } from "../wordsMore";
import { button, buttons, card, el, head, isLight, over, picture, rule, say, section, storePanel, text } from "./kit";
import type { Look } from "./looks";
import type { Layout } from "./heroes";

type S = Record<string, unknown>;

/* ---------------------------------------------------------------- words */

const TW = {
  said: w("شو حكوا عنّا", "What people say", "מה אומרים עלינו"),
  saidSub: w("كلام زباين حقيقيين، بدون تعديل.", "Real customers, in their own words.", "לקוחות אמיתיים, במילים שלהם."),
  stars: w("4.9 من 5", "4.9 out of 5", "4.9 מתוך 5"),
  from: w("من أكتر من 2,000 تقييم", "from over 2,000 reviews", "מיותר מ-2,000 ביקורות"),
  promise: w("وعدنا إلكم", "Our promise to you", "ההבטחה שלנו"),
  promiseSub: w("منشتغل على كل طلب كأنو إلنا.", "We work on every order as if it were ours.", "אנחנו עובדים על כל הזמנה כאילו היא שלנו."),
  pay: w("ادفعوا بالطريقة اللي بتريحكم", "Pay the way that suits you", "שלמו בדרך שנוחה לכם"),
  paySub: w("كل الدفعات مشفّرة وآمنة.", "Every payment is encrypted and safe.", "כל התשלומים מוצפנים ובטוחים."),
  cash: w("كاش عند الاستلام", "Cash on delivery", "מזומן במסירה"),
  numbers: w("أرقامنا بتحكي", "Our numbers speak", "המספרים שלנו מדברים"),
  numbersSub: w("سنين من الشغل، وآلاف الطلبات المبسوطة.", "Years of work, and thousands of happy orders.", "שנים של עבודה, ואלפי הזמנות מרוצות."),
  why: w("ليش تختارونا؟", "Why choose us?", "למה לבחור בנו?"),
  whySub: w("التفاصيل الصغيرة اللي بتفرق.", "The small things that make the difference.", "הפרטים הקטנים שעושים את ההבדל."),
  readAll: w("اقروا كل التقييمات", "Read every review", "לכל הביקורות"),
};
const PAYMENTS = ["Visa", "Mastercard", "PayPal", "Apple Pay", "Google Pay", "Bit"];
const QUOTE_MARK = w("“", "“", "“");

/* ---------------------------------------------------------------- pieces */

const centred = (c: Ctx, L: Look, t: W, sub?: W, top?: W) =>
  STACK(c, [...(top ? [over(c, L, top, { center: true })].filter((n): n is N => n !== null) : []), head(c, L, t, 2, { center: true }), ...(sub ? [text(c, L, sub, { center: true, max: "560px" })] : [])], { gap: 12, align: "center", textAlign: "center", margin: [0, 0, 44, 0] });
const along = (c: Ctx, L: Look, t: W, sub?: W, top?: W) =>
  STACK(c, [...(top ? [over(c, L, top)].filter((n): n is N => n !== null) : []), head(c, L, t, 2), ...rule(c, L), ...(sub ? [text(c, L, sub, { max: "460px" })] : [])], { gap: 12 });
/** Five stars in the colour that stands out. */
const stars = (c: Ctx, size = 18, center = false) => STACK(c, [0, 1, 2, 3, 4].map(() => ICON(c, "star", { size, motion: false })), { direction: "row", gap: 2, ...(center ? { justify: "center" } : {}) });
/** A review drawn with the look's own pieces. */
function review(c: Ctx, L: Look, i: number, o: { center?: boolean; big?: boolean; framed?: boolean; photo?: boolean } = {}): N {
  const q = MORE_QUOTES[i % MORE_QUOTES.length];
  const kids: N[] = [
    stars(c, o.big ? 22 : 16, o.center),
    o.big ? head(c, L, q.quote, 3, { size: 30, center: o.center }) : text(c, L, q.quote, { center: o.center }),
    STACK(c, [
      ...(o.photo ? [picture(c, L, q.name, { aspect: "1 / 1", bare: true, radius: 999, style: { width: "48px", shape: "circle" } })] : []),
      STACK(c, [head(c, L, q.name, 5, { size: 16 }), text(c, L, q.role)], { gap: 0 }),
    ], { direction: "row", gap: 12, align: "center", ...(o.center ? { justify: "center" } : {}) }),
  ];
  return o.framed === false ? STACK(c, kids, { gap: 14, ...(o.center ? { align: "center", textAlign: "center" } : {}) }) : card(c, L, kids, { gap: 14, ...(o.center ? { align: "center", textAlign: "center" } : {}) });
}
/** A perk or a promise: its icon, title and line. */
function perk(c: Ctx, L: Look, p: { icon: IconName; title: W; text: W }, o: { center?: boolean; side?: boolean; card?: boolean; n?: number } = {}): N {
  const mark = o.n !== undefined
    ? head(c, L, w(String(o.n + 1).padStart(2, "0"), String(o.n + 1).padStart(2, "0"), String(o.n + 1).padStart(2, "0")), 3, { size: 40 })
    : ICON(c, p.icon, { size: o.side ? 30 : 40 });
  const words = STACK(c, [head(c, L, p.title, 4, { size: 20, center: o.center && !o.side }), text(c, L, p.text, { center: o.center && !o.side })], { gap: 6 });
  const kids = o.side ? [STACK(c, [mark, words], { direction: "row", gap: 16, align: "start" })] : [mark, words];
  const style: S = { gap: 12, ...(o.center && !o.side ? { align: "center", textAlign: "center" } : {}) };
  return o.card ? card(c, L, kids, style) : STACK(c, kids, style);
}
/** A big number and what it counts. */
function stat(c: Ctx, L: Look, s: { n: W; label: W }, o: { center?: boolean; size?: number; card?: boolean } = {}): N {
  const kids = [head(c, L, s.n, 3, { size: o.size ?? 52, center: o.center }), text(c, L, s.label, { center: o.center })];
  const n = kids[0];
  const counted: N = { ...n, motion: { ...(n.motion ?? {}), ...(c.motion === "rich" ? { enter: { kind: "count", duration: 1.6 } } : {}) } };
  const style: S = { gap: 4, ...(o.center ? { align: "center", textAlign: "center" } : {}) };
  return o.card ? card(c, L, [counted, kids[1]], style) : STACK(c, [counted, kids[1]], style);
}
const ticks = (c: Ctx, L: Look, list: W[]) => STACK(c, list.map((t) => STACK(c, [ICON(c, "check", { size: 20, motion: false }), text(c, L, t)], { direction: "row", gap: 10, align: "center" })), { gap: 12 });

/* --------------------------------------------------------------- reviews */

export const REVIEW_LAYOUTS: Layout[] = [
  { key: "cards", name: w("تلات بطاقات آراء", "Three review cards", "שלושה כרטיסי ביקורות"), build: (c, L) =>
    section(c, L, [centred(c, L, TW.said, TW.saidSub, TW.stars), GRID(c, 3, [0, 1, 2].map((i) => review(c, L, i)), { gap: 20, phone: 1 })], TW.said, { center: true }) },
  { key: "big-quote", name: w("رأي واحد كبير", "One big review", "ביקורת גדולה אחת"), build: (c, L) =>
    // In a card where the look frames its cards, bare where it doesn't.
    section(c, L, [STACK(c, [head(c, L, QUOTE_MARK, 2, { size: 120, center: true }), review(c, L, 2, { center: true, big: true, framed: L.card === "pop" || L.card === "shadow" || L.card === "glass" })], { gap: 0, align: "center", maxWidth: "820px", width: "100%" })], TW.said, { center: true }) },
  { key: "quote-picture", name: w("رأي وصورة", "A review and a picture", "ביקורת ותמונה"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[picture(c, L, MORE_QUOTES[1].name, { aspect: "4 / 5" })], [STACK(c, [over(c, L, TW.said), review(c, L, 1, { big: true, framed: false })].filter((n): n is N => n !== null), { gap: 18 })]], { gap: 56, align: "center" })], TW.said) },
  { key: "rating", name: w("التقييم الكلي وآراء", "The overall rating and reviews", "הדירוג הכולל וביקורות"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3], [
      [STACK(c, [head(c, L, X.ratingBig, 2, { size: 96 }), stars(c, 26), text(c, L, TW.from), button(c, L, TW.readAll, "/about", "outline")], { gap: 14 })],
      [STACK(c, [review(c, L, 0), review(c, L, 3)], { gap: 16 })],
    ], { gap: 48, align: "center" })], TW.said) },
  { key: "wall", name: w("حيطة آراء", "A wall of reviews", "קיר ביקורות"), build: (c, L) =>
    section(c, L, [centred(c, L, TW.said, undefined, TW.stars), GRID(c, 3, [0, 1, 2, 3, 4, 5].map((i) => review(c, L, i, { photo: i % 2 === 0 })), { gap: 18, phone: 1 })], TW.said, { center: true }) },
  { key: "running", name: w("آراء ماشية", "Reviews on the move", "ביקורות בתנועה"), build: (c, L) =>
    section(c, L, [
      centred(c, L, TW.said, TW.from),
      el(c, "marquee", { items: MORE_QUOTES.map((q) => say(c, w(`${q.quote.ar} — ${q.name.ar}`, `${q.quote.en} — ${q.name.en}`, `${q.quote.he} — ${q.name.he}`))), speed: 24, pause: true, separator: "★" }, { size: 22, weight: 600, ...(L.head.font ? { font: L.head.font } : {}) }),
    ], TW.said, { center: true }) },
  { key: "faces", name: w("آراء بصور أصحابها", "Reviews with their writers' photos", "ביקורות עם תמונות"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 2], [[along(c, L, TW.said, TW.saidSub, TW.stars)], [GRID(c, 2, [0, 1, 2, 3].map((i) => review(c, L, i, { photo: true })), { gap: 16, phone: 1 })]], { gap: 48, align: "start" })], TW.said) },
  { key: "store-row", name: w("آراء المتجر بشريط", "The store's reviews in a row", "ביקורות החנות בשורה"), build: (c, L) =>
    section(c, L, [centred(c, L, TW.said, TW.saidSub), storePanel(c, L, [el(c, "testimonials", { items: MORE_QUOTES.map((q) => ({ quote: say(c, q.quote), name: say(c, q.name), role: say(c, q.role), stars: 5 })), layout: "row" }, { self: "stretch" })])], TW.said, { center: true }) },
];

/* ----------------------------------------------------------------- trust */

export const TRUST_LAYOUTS: Layout[] = [
  { key: "badges", name: w("أربع ضمانات بسطر", "Four promises in a row", "ארבע הבטחות בשורה"), build: (c, L) =>
    section(c, L, [GRID(c, 4, PERKS.slice(0, 4).map((p) => perk(c, L, p, { center: true })), { gap: 24, phone: 2 })], TW.promise, { center: true }) },
  { key: "badge-cards", name: w("ضمانات ببطاقات", "Promises in cards", "הבטחות בכרטיסים"), build: (c, L) =>
    section(c, L, [centred(c, L, TW.promise, TW.promiseSub), GRID(c, 4, PERKS.slice(0, 4).map((p) => perk(c, L, p, { card: true, center: true })), { gap: 18, phone: 1 })], TW.promise, { center: true }) },
  { key: "guarantee", name: w("ضمان الرضا", "The happiness promise", "הבטחת שביעות רצון"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [
      [STACK(c, [ICON(c, "shield", { size: 72 }), head(c, L, X.guarantee, 2), text(c, L, X.guaranteeSub), buttons(c, L, { main: [C.shop, "/shop"], second: [C.contactUs, "/contact"] })], { gap: 18 })],
      [card(c, L, [ticks(c, L, PERKS.map((p) => p.title))], { pad: [32, 30, 32, 30] })],
    ], { gap: 48, align: "center" })], X.guarantee) },
  { key: "payments", name: w("طرق الدفع", "Ways to pay", "דרכי תשלום"), build: (c, L) =>
    section(c, L, [
      centred(c, L, TW.pay, TW.paySub),
      STACK(c, [...PAYMENTS, null].map((name) => text(c, L, name ? w(name, name, name) : TW.cash, { center: true })).map((n) => ({ ...n, style: { base: { ...(((n.style ?? {}) as { base?: S }).base ?? {}), pad: [12, 22, 12, 22], radius: Math.min(L.btn.radius, 14), border: { width: 1, color: isLight(c) ? "border" : pop(c) }, weight: 700 } } })), { direction: "row", wrap: true, gap: 12, justify: "center" }),
      STACK(c, [ICON(c, "shield", { size: 20, motion: false }), text(c, L, PERKS[2].text)], { direction: "row", gap: 8, align: "center", justify: "center", margin: [24, 0, 0, 0] }),
    ], TW.pay, { center: true }) },
  { key: "list", name: w("كلام وقائمة ضمانات", "Words and a list of promises", "מילים ורשימת הבטחות"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[along(c, L, TW.promise, TW.promiseSub)], [STACK(c, PERKS.slice(0, 4).map((p) => perk(c, L, p, { side: true })), { gap: 22 })]], { gap: 56, align: "center" })], TW.promise) },
  { key: "values", name: w("قيمنا الثلاث", "Our three values", "שלושת הערכים שלנו"), build: (c, L) =>
    section(c, L, [centred(c, L, C.values), GRID(c, 3, VALUES.map((v, i) => perk(c, L, v, { center: true, n: i })), { gap: 32, phone: 1 })], C.values, { center: true }) },
  { key: "press", name: w("حكوا عنّا", "As seen in", "כתבו עלינו"), build: (c, L) =>
    section(c, L, [
      centred(c, L, X.press),
      storePanel(c, L, [el(c, "logos", { items: [1, 2, 3, 4, 5, 6].map((n, i) => ({ src: `/templates/logos/logo-${n}.svg`, alt: say(c, w(`ماركة ${i + 1}`, `Brand ${i + 1}`, `מותג ${i + 1}`)) })), gray: true }, { self: "stretch" })]),
      STACK(c, [head(c, L, X.pressQuote, 4, { size: 22, center: true })], { margin: [32, 0, 0, 0], align: "center" }),
    ], X.press, { center: true }) },
];

/* --------------------------------------------------------------- numbers */

export const STAT_LAYOUTS: Layout[] = [
  { key: "row", name: w("أربع أرقام بسطر", "Four numbers in a row", "ארבעה מספרים בשורה"), build: (c, L) =>
    section(c, L, [centred(c, L, TW.numbers), GRID(c, 4, STATS.map((s) => stat(c, L, s, { center: true })), { gap: 24, phone: 2 })], TW.numbers, { center: true }) },
  { key: "cards", name: w("أرقام ببطاقات", "Numbers in cards", "מספרים בכרטיסים"), build: (c, L) =>
    section(c, L, [GRID(c, 4, STATS.map((s) => stat(c, L, s, { center: true, card: true })), { gap: 18, phone: 2 })], TW.numbers, { center: true }) },
  { key: "split", name: w("كلام وأرقام", "Words and numbers", "מילים ומספרים"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[STACK(c, [along(c, L, TW.numbers, TW.numbersSub, C.ourStory), button(c, L, C.ourStory, "/about", "outline")], { gap: 22 })], [GRID(c, 2, STATS.map((s) => stat(c, L, s, { size: 56 })), { gap: 28, phone: 2 })]], { gap: 56, align: "center" })], TW.numbers) },
  { key: "giant", name: w("رقم واحد ضخم", "One giant number", "מספר ענק אחד"), build: (c, L) =>
    section(c, L, [STACK(c, [stat(c, L, { n: STATS[0].n, label: X.happy }, { center: true, size: 150 }), button(c, L, C.ourStory, "/about")], { gap: 26, align: "center" })], TW.numbers, { center: true }) },
  { key: "picture", name: w("صورة وأرقام", "A picture and numbers", "תמונה ומספרים"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[picture(c, L, C.ourStory, { aspect: "4 / 5" })], [STACK(c, [along(c, L, TW.numbers), ...STATS.slice(0, 3).map((s) => stat(c, L, s, { size: 48 }))], { gap: 26 })]], { gap: 56, align: "center" })], TW.numbers) },
  { key: "divided", name: w("أرقام بخطوط بينها", "Numbers with lines between", "מספרים עם קווים ביניהם"), build: (c, L) =>
    section(c, L, [STACK(c, STATS.flatMap((s, i) => [
      // A thin line between two numbers (not on a phone, where they wrap).
      ...(i ? [onPhone(STACK(c, [], { width: "1px", height: "72px", bg: isLight(c) ? "border" : pop(c), opacity: 0.6 }), { hidden: true })] : []),
      stat(c, L, s, { center: true, size: 46 }),
    ]), { direction: "row", wrap: true, justify: "around", align: "center", gap: 24 })], TW.numbers, { center: true, pad: [64, 24, 64, 24] }) },
  { key: "story", name: w("رقم كبير وقصة", "A big number and a story", "מספר גדול וסיפור"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3], [[stat(c, L, STATS[1], { size: 120 })], [STACK(c, [head(c, L, TW.numbersSub, 3, { size: 32 }), text(c, L, c.pack.story), GRID(c, 3, [STATS[0], STATS[2], STATS[3]].map((s) => stat(c, L, s, { size: 32 })), { gap: 16, phone: 3 })], { gap: 20 })]], { gap: 48, align: "center" })], TW.numbers) },
];

/* ----------------------------------------------------------------- perks */

export const PERK_LAYOUTS: Layout[] = [
  { key: "three", name: w("تلات مميزات بأيقونات", "Three perks with icons", "שלושה יתרונות עם אייקונים"), build: (c, L) =>
    section(c, L, [centred(c, L, TW.why, TW.whySub), GRID(c, 3, PERKS.slice(0, 3).map((p) => perk(c, L, p, { center: true })), { gap: 32, phone: 1 })], TW.why, { center: true }) },
  { key: "cards", name: w("ست مميزات ببطاقات", "Six perks in cards", "שישה יתרונות בכרטיסים"), build: (c, L) =>
    section(c, L, [centred(c, L, TW.why), GRID(c, 3, PERKS.map((p) => perk(c, L, p, { card: true })), { gap: 18, phone: 1 })], TW.why, { center: true }) },
  { key: "side-list", name: w("كلام وزر وقائمة مميزات", "Words, a button and a list of perks", "מילים, כפתור ורשימת יתרונות"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3], [[STACK(c, [along(c, L, TW.why, TW.whySub), button(c, L, C.shop, "/shop")], { gap: 22 })], [GRID(c, 2, PERKS.slice(0, 4).map((p) => perk(c, L, p, { side: true })), { gap: 28, phone: 1 })]], { gap: 56, align: "center" })], TW.why) },
  { key: "picture", name: w("صورة ومميزات", "A picture and perks", "תמונה ויתרונות"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[picture(c, L, c.pack.product, { aspect: "1 / 1" })], [STACK(c, [along(c, L, TW.why), ...PERKS.slice(0, 3).map((p) => perk(c, L, p, { side: true }))], { gap: 24 })]], { gap: 56, align: "center", phone: "reverse" })], TW.why) },
  { key: "numbered", name: w("مميزات بأرقام", "Numbered perks", "יתרונות ממוספרים"), build: (c, L) =>
    section(c, L, [centred(c, L, TW.why, TW.whySub), GRID(c, 4, PERKS.slice(0, 4).map((p, i) => perk(c, L, p, { n: i })), { gap: 28, phone: 1 })], TW.why, { center: true }) },
  { key: "around", name: w("مميزات حول صورة", "Perks around a picture", "יתרונות סביב תמונה"), build: (c, L) =>
    section(c, L, [centred(c, L, TW.why), COLS(c, [1, 1, 1], [
      [STACK(c, PERKS.slice(0, 2).map((p) => perk(c, L, p, { center: true })), { gap: 40 })],
      [picture(c, L, c.pack.product, { aspect: "3 / 4" })],
      [STACK(c, PERKS.slice(2, 4).map((p) => perk(c, L, p, { center: true })), { gap: 40 })],
    ], { gap: 32, align: "center" })], TW.why, { center: true }) },
  { key: "bento", name: w("بطاقة كبيرة وتلات صغار", "One big card and three small", "כרטיס גדול ושלושה קטנים"), build: (c, L) =>
    section(c, L, [GRID(c, 3, [
      onPhone(card(c, L, [ICON(c, PERKS[5].icon, { size: 56 }), head(c, L, TW.why, 2, { size: 40 }), text(c, L, TW.whySub), button(c, L, C.shop, "/shop")], { gap: 16, col: "span 2", row: "span 2", justify: "center", pad: [44, 40, 44, 40] }), { col: "span 1", row: "span 1" }),
      ...PERKS.slice(0, 3).map((p) => perk(c, L, p, { card: true })),
    ], { gap: 18, phone: 1 })], TW.why) },
];

/* ----------------------------------------------------------------- picks */

export const REVIEW_PICKS: Record<string, string[]> = {
  cards: ["airy", "brutal", "candy", "noir", "glass"],
  "big-quote": ["luxe", "neon", "organic", "candy", "glass"],
  "quote-picture": ["arches", "duotone", "paper", "sport"],
  rating: ["pillow", "mono", "ink", "retro"],
  wall: ["minimal", "tilted", "gallery", "blobs"],
  running: ["heavy", "carved", "candy", "neon"],
  faces: ["pillow", "editorial", "glass", "marker"],
  "store-row": ["airy", "noir", "sport", "paper"],
};
export const TRUST_PICKS: Record<string, string[]> = {
  badges: ["minimal", "candy", "neon", "organic"],
  "badge-cards": ["pillow", "brutal", "neon", "luxe"],
  guarantee: ["arches", "marker", "retro", "noir"],
  payments: ["mono", "airy", "ink", "sport"],
  list: ["editorial", "paper", "tilted", "noir"],
  values: ["luxe", "carved", "blobs", "heavy"],
  press: ["gallery", "minimal", "noir", "candy"],
};
export const STAT_PICKS: Record<string, string[]> = {
  row: ["airy", "neon", "candy", "mono"],
  cards: ["pillow", "brutal", "glass", "retro"],
  split: ["editorial", "ink", "organic", "sport"],
  giant: ["heavy", "carved", "luxe", "candy"],
  picture: ["arches", "paper", "tilted", "noir"],
  divided: ["minimal", "neon", "candy", "retro"],
  story: ["luxe", "mono", "pillow", "heavy"],
};
export const PERK_PICKS: Record<string, string[]> = {
  three: ["airy", "organic", "neon", "candy"],
  cards: ["pillow", "brutal", "glass", "noir"],
  "side-list": ["editorial", "mono", "marker", "sport"],
  picture: ["arches", "blobs", "duotone", "paper"],
  numbered: ["heavy", "carved", "minimal", "luxe"],
  around: ["luxe", "tilted", "pillow", "gallery"],
  bento: ["retro", "glass", "ink", "candy"],
};
