/**
 * More of the section library, what wins a customer over and helps them: reviews, numbers, steps, questions, calls
 * to action, newsletters, offers, bundles, the team, comparisons, details, contact, headers, footers, special pages
 * and popups, and two categories of their own: trust (brands, promises, press) and information (a programme, a
 * table, charts). The same parts and skins as sections.ts.
 */
import { B, CARD, COLS, DIVIDER, EL, GRID, H, ICON, IMG, P, STACK, eyebrow, mo, pic, pop, say, withSkin, type Ctx, type N, type Skin } from "./build";
import { BUNDLES, DETAIL_TABS, OFFER, OUT_OF, PEOPLE, QUESTIONS, RIGHTS, WHATSAPP, accordion, countdown, form, head, marquee, menu, perk, products, row, sec, stat, step, storeName } from "./parts";
import { badge, chart, col, deck, foot, hug, iconLine, narrow, onPop, overPic, people, picLink, plan, popup, rating, review, scene, ticks, versus } from "./partsMore";
import type { SectionCat, SectionRecipe } from "./sections";
import { C, LINKS_HELP, LINKS_MAIN, LINKS_SOCIAL, PERKS, RUNNING, SHIPPING_QA, STATS, STEPS, w, type W } from "./words";
import { BRANCHES, BUNDLE_ROWS, CLUB, CODE_STEPS, DEALS, EVENTS, FOURTH_PERSON, GROWTH, HOURS, LOVED, MORE_QUOTES, PAY_QA, REGIONS, SPECS, TRUST_BADGES, X } from "./wordsMore";

const r = (key: string, cat: SectionCat, name: W, skins: Skin[], build: (c: Ctx) => N): SectionRecipe => ({ key, cat, name, skins, build });
const num = (i: number) => w(String(i + 1), String(i + 1), String(i + 1));
const HEADER = w("الهيدر", "Header", "כותרת עליונה");
const FOOTER = w("الفوتر", "Footer", "כותרת תחתונה");
const STEPS4 = [...STEPS, { title: X.enjoy, text: X.enjoySub }];
/** Ready logos for a store without its brands' yet (the shop's public/templates/logos). */
const LOGOS = [1, 2, 3, 4, 5, 6].map((n) => `/templates/logos/logo-${n}.svg`);
const logos = (c: Ctx, props: Record<string, unknown> = {}) => EL(c, "logos", { items: LOGOS.map((src, i) => ({ src, alt: say(c, w(`ماركة ${i + 1}`, `Brand ${i + 1}`, `מותג ${i + 1}`)) })), gray: true, ...props }, { style: { self: "stretch" } });
/** A number in a filled circle. */
const dot = (c: Ctx, i: number) => H(c, num(i), 5, { motion: false, style: { width: "48px", height: "48px", radius: 999, bg: pop(c), color: onPop(c), textAlign: "center", size: 20, lineHeight: 2.4, weight: 800 } });
/** A week's hours or a programme, as the schedule block keeps it. */
const hours = (c: Ctx, layout: "cards" | "table" | "timeline" = "timeline") => EL(c, "schedule", { label: say(c, X.hoursTitle), layout, items: HOURS.map((h) => ({ day: say(c, h.day), time: h.time, title: say(c, h.title) })) }, { style: { self: "stretch" } });
const programme = (c: Ctx, layout: "cards" | "table" | "timeline", props: Record<string, unknown> = {}) =>
  EL(c, "schedule", { label: say(c, X.programme), layout, showLocation: true, items: EVENTS.map((e) => ({ day: say(c, e.day), time: e.time, title: say(c, e.title), text: say(c, e.text), speaker: say(c, e.speaker), location: say(c, e.location), href: "/contact" })), ...props }, { style: { self: "stretch" } });
/** A card to reach the store by: an icon, a line, a button. */
const reach = (c: Ctx, icon: "whatsapp" | "phone" | "mail", title: W, line: W, label: W, href: string) =>
  CARD(c, [ICON(c, icon, { size: 32, motion: false }), H(c, title, 4, { motion: false }), P(c, line, { motion: false, style: { size: 15 } }), B(c, label, href, "link", { motion: false })], { align: "center", textAlign: "center" });

export const TRUST_RECIPES: SectionRecipe[] = [
  /* reviews */
  r("tst-wall", "testimonials", w("حيط آراء", "A wall of reviews", "קיר ביקורות"), ["plain", "soft", "surface"], (c) =>
    sec(c, [head(c, [H(c, C.said, 2), rating(c, true)]), GRID(c, 3, MORE_QUOTES.map((q) => review(c, q)), { gap: 16 })], C.said)),
  r("tst-big", "testimonials", w("جملة كبيرة بين علامتين", "One big line in quote marks", "משפט גדול במירכאות"), ["plain", "soft", "dark", "bold"], (c) =>
    sec(c, [narrow(c, [
      H(c, w("”", "“", "״"), 2, { motion: false, style: { size: 120, lineHeight: 0.8, color: pop(c), weight: 800 } }),
      H(c, MORE_QUOTES[3].quote, 2, { style: { size: 36, sizeMin: 24, lineHeight: 1.4, weight: 500 } }),
      STACK(c, [IMG(c, MORE_QUOTES[3].name, { aspect: "1 / 1", radius: 999, motion: false, style: { width: "56px" } }), STACK(c, [P(c, MORE_QUOTES[3].name, { quiet: false, motion: false, style: { weight: 700 } }), P(c, MORE_QUOTES[3].role, { motion: false, style: { size: 14 } })], { gap: 0 })], { direction: "row", gap: 14, align: "center" }),
    ], "820px")], C.said, { pad: [96, 24, 96, 24] })),
  r("tst-score", "testimonials", w("رقم التقييم وآراء جنبه", "The score with reviews beside it", "הציון וביקורות לצידו"), ["plain", "surface", "soft"], (c) =>
    sec(c, [COLS(c, [1, 2], [
      [H(c, X.ratingBig, 2, { motion: mo.num(c), style: { size: 120, sizeMin: 72, lineHeight: 1, weight: 800, color: pop(c) } }), rating(c), B(c, X.seeAllReviews, "/shop", "link")],
      [GRID(c, 2, MORE_QUOTES.slice(0, 4).map((q) => review(c, q)), { gap: 16 })],
    ], { gap: 48, align: "center" })], C.said)),
  r("tst-photos", "testimonials", w("آراء بصور أصحابها", "Reviews with their people's pictures", "ביקורות עם תמונות הכותבים"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [eyebrow(c, C.said), H(c, OUT_OF, 2, { style: { size: 30 } })]), GRID(c, 3, MORE_QUOTES.slice(0, 3).map((q) => review(c, q, { photo: true })), { gap: 20 })], C.said)),
  r("tst-running", "testimonials", w("آراء ماشية بسطرين", "Reviews running in two lines", "ביקורות רצות בשתי שורות"), ["plain", "dark", "bold"], (c) =>
    sec(c, [head(c, [H(c, C.said, 2)], true, 32), col(c, [
      EL(c, "marquee", { items: MORE_QUOTES.slice(0, 3).map((q) => say(c, q.quote)), speed: 40, pause: true, separator: "★" }, { style: { size: 22, weight: 600 } }),
      EL(c, "marquee", { items: MORE_QUOTES.slice(3).map((q) => say(c, q.quote)), speed: 46, pause: true, reverse: true, separator: "★" }, { style: { size: 22, weight: 600, opacity: 0.7 } }),
    ], 18)], C.said, { pad: [72, 0, 72, 0], full: true })),
  r("tst-picture-side", "testimonials", w("صورة كبيرة وتلات آراء", "A big picture and three reviews", "תמונה גדולה ושלוש ביקורות"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [2, 3], [[IMG(c, C.said, { aspect: "3 / 4", shaped: true })], [H(c, C.said, 2), rating(c), STACK(c, MORE_QUOTES.slice(0, 3).flatMap((q, i) => [...(i ? [DIVIDER(c)] : []), STACK(c, [P(c, q.quote, { quiet: false, motion: false, style: { size: 18 } }), P(c, q.name, { motion: false, style: { size: 14, weight: 700 } })], { gap: 4 })]), { gap: 16 })]], { gap: 56, align: "center" })], C.said)),

  /* numbers */
  r("stats-bars", "stats", w("كلام وأعمدة", "Words and bars", "מילים ועמודות"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, C.numbers), H(c, X.loved, 2), P(c, c.pack.story)], [chart(c, "bar", LOVED, X.loved)]], { gap: 56, align: "center" })], C.numbers)),
  r("stats-ring", "stats", w("حلقة وكلام", "A ring and words", "טבעת ומילים"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[chart(c, "donut", REGIONS, X.whereFrom, ["accent", "muted", "accent-soft", "border"])], [eyebrow(c, C.numbers), H(c, X.whereFrom, 2), P(c, c.pack.sub), ticks(c, RUNNING.slice(0, 3))]], { gap: 56, align: "center" })], C.numbers)),
  r("stats-line", "stats", w("خط بيطلع", "A rising line", "קו עולה"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [eyebrow(c, C.numbers), H(c, X.growth, 2)]), narrow(c, [chart(c, "line", GROWTH, X.ordersYear)], "860px")], C.numbers)),
  r("stats-giant", "stats", w("رقم واحد كبير", "One giant number", "מספר אחד ענק"), ["bold", "dark", "soft", "plain"], (c) =>
    sec(c, [head(c, [H(c, STATS[0].n, 2, { motion: mo.num(c), style: { size: 180, sizeMin: 60, lineHeight: 1, weight: 900, color: pop(c) } }), P(c, X.happy, { quiet: false, style: { size: 22 } })], true, 48), GRID(c, 3, STATS.slice(1).map((s) => stat(c, s)), { phone: 3, gap: 16 })], C.numbers)),
  r("stats-strip", "stats", w("شريط أرقام بخطوط", "A strip of numbers with lines", "פס מספרים עם קווים"), ["surface", "plain", "dark"], (c) =>
    sec(c, [STACK(c, STATS.map((s) => STACK(c, [H(c, s.n, 3, { motion: mo.num(c), style: { size: 30, color: pop(c) } }), P(c, s.label, { motion: false, style: { size: 15 } })], { direction: "row", gap: 10, align: "center" })), { direction: "row", wrap: true, justify: "between", align: "center", gap: 20 })], C.numbers, { pad: [28, 24, 28, 24] })),

  /* steps */
  r("steps-four", "steps", w("أربع خطوات بدوائر", "Four steps in circles", "ארבעה שלבים בעיגולים"), ["plain", "soft", "surface"], (c) =>
    sec(c, [head(c, [H(c, C.howItWorks, 2)]), GRID(c, 4, STEPS4.map((s, i) => STACK(c, [dot(c, i), H(c, s.title, 4, { motion: false }), P(c, s.text, { motion: false, style: { size: 15 } })], { gap: 10, align: "center", textAlign: "center" })), { gap: 24, phone: 2 })], C.howItWorks)),
  r("steps-zigzag", "steps", w("خطوات بصور، وحدة يمين ووحدة شمال", "Steps with pictures, one each side in turn", "שלבים עם תמונות, לסירוגין"), ["plain", "surface"], (c) =>
    sec(c, [head(c, [H(c, C.howItWorks, 2)], true, 56), col(c, STEPS.map((s, i) => {
      const words = [dot(c, i), H(c, s.title, 3, { motion: false }), P(c, s.text, { motion: false, style: { size: 18 } })];
      const picture = [IMG(c, s.title, { aspect: "16 / 10" })];
      return COLS(c, [1, 1], i % 2 ? [words, picture] : [picture, words], { gap: 56, align: "center", ...(i % 2 ? { phone: "reverse" as const } : {}) });
    }), 56)], C.howItWorks)),
  r("steps-accordion", "steps", w("صورة وخطوات بتنفتح", "A picture and steps that open", "תמונה ושלבים שנפתחים"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, C.howItWorks, { aspect: "1 / 1", shaped: true })], [eyebrow(c, C.howItWorks), H(c, C.howItWorks, 2), accordion(c, STEPS4.map((s, i): [W, W] => [w(`${i + 1}. ${s.title.ar}`, `${i + 1}. ${s.title.en}`, `${i + 1}. ${s.title.he}`), s.text]), "lines", true), B(c, C.shop, "/shop")]], { gap: 56, align: "center" })], C.howItWorks)),
  r("steps-outline", "steps", w("أرقام كبار مفرّغة", "Big outlined numbers", "מספרים גדולים בקו מתאר"), ["dark", "bold", "plain"], (c) =>
    sec(c, [head(c, [H(c, C.howItWorks, 2)]), GRID(c, 3, STEPS.map((s, i) => STACK(c, [H(c, w(`0${i + 1}`, `0${i + 1}`, `0${i + 1}`), 2, { motion: false, style: { size: 110, lineHeight: 1, weight: 900, color: "transparent", stroke: { width: 2, color: pop(c) } } }), H(c, s.title, 3, { motion: false }), P(c, s.text, { motion: false })], { gap: 10 })), { gap: 32 })], C.howItWorks)),

  /* questions */
  r("faq-two", "faq", w("عمودين أسئلة", "Two columns of questions", "שתי עמודות שאלות"), ["plain", "surface", "soft"], (c) =>
    sec(c, [head(c, [H(c, C.questions, 2), P(c, C.writeSub)]), COLS(c, [1, 1], [[H(c, C.shipping, 4, { motion: false }), accordion(c, SHIPPING_QA.slice(0, 3), "lines")], [H(c, X.payTitle, 4, { motion: false }), accordion(c, PAY_QA, "lines")]], { gap: 48, align: "start", cellStyle: { justify: "start" } })], C.questions)),
  r("faq-picture", "faq", w("صورة وأسئلة", "A picture and questions", "תמונה ושאלות"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [2, 3], [[IMG(c, C.questions, { aspect: "3 / 4", shaped: true })], [eyebrow(c, C.shipping), H(c, C.questions, 2), accordion(c, QUESTIONS, "plus", true)]], { gap: 56, align: "center" })], C.questions)),
  r("faq-tabs", "faq", w("أسئلة حسب الموضوع", "Questions by subject", "שאלות לפי נושא"), ["plain", "surface"], (c) =>
    sec(c, [head(c, [H(c, C.questions, 2)], true, 24), narrow(c, [deck(c, [
      { label: C.shipping, kids: [accordion(c, SHIPPING_QA, "cards")] },
      { label: X.payTitle, kids: [accordion(c, PAY_QA, "cards")] },
    ], { arrows: false, dots: false })], "820px")], C.questions)),
  r("faq-help", "faq", w("أسئلة وكرت مساعدة", "Questions and a help card", "שאלות וכרטיס עזרה"), ["plain", "soft", "dark"], (c) =>
    sec(c, [COLS(c, [2, 1], [
      [H(c, C.questions, 2), accordion(c, QUESTIONS, "lines")],
      [CARD(c, [ICON(c, "whatsapp", { size: 36, motion: false }), H(c, X.needHelp, 3, { motion: false }), P(c, X.needHelpSub, { motion: false }), B(c, X.whatsapp, WHATSAPP, "solid", { motion: false }), B(c, C.contactUs, "/contact", "link", { motion: false })], { pad: [32, 28, 32, 28] })],
    ], { gap: 48, align: "start", cellStyle: { justify: "start" } })], C.questions)),

  /* calls to action */
  r("cta-scene", "cta", w("خلفية حيّة", "A live background", "רקע חי"), ["dark", "bold"], (c) =>
    sec(c, [head(c, [H(c, c.pack.title, 2, { style: { size: 52, sizeMin: 30 } }), P(c, c.pack.sub, { style: { maxWidth: "560px" } }), row(c, [B(c, c.pack.cta, "/shop")], true)], true, 0)], C.shop, { pad: [120, 24, 120, 24], props: scene(c, c.skin === "bold" ? "ribbons" : "starfield") })),
  r("cta-box", "cta", w("صندوق بلون المتجر", "A box in the store's colour", "קופסה בצבע החנות"), ["plain", "surface", "soft"], (c) => {
    const k = withSkin(c, "bold");
    return sec(c, [STACK(c, [eyebrow(k, c.pack.eyebrow), H(k, c.pack.title, 2), P(k, c.pack.sub, { style: { maxWidth: "560px" } }), row(k, [B(k, c.pack.cta, "/shop"), B(k, C.contactUs, "/contact", "outline", { delay: 0.3 })], true)], { gap: 16, align: "center", textAlign: "center", pad: [64, 32, 64, 32], radius: 32, bg: "accent", color: "accent-contrast" })], C.shop);
  }),
  r("cta-two", "cta", w("كرتين: تسوّق أو احكي معنا", "Two cards: shop, or talk to us", "שני כרטיסים: לקנות או לדבר איתנו"), ["plain", "soft", "surface"], (c) =>
    sec(c, [GRID(c, 2, [
      CARD(c, [ICON(c, "bag", { size: 40 }), H(c, X.shopCard, 3, { motion: false }), P(c, c.pack.sub, { motion: false }), B(c, c.pack.cta, "/shop", "solid", { motion: false })], { pad: [40, 32, 40, 32] }),
      CARD(c, [ICON(c, "whatsapp", { size: 40 }), H(c, X.talkCard, 3, { motion: false }), P(c, X.needHelpSub, { motion: false }), B(c, X.whatsapp, WHATSAPP, "outline", { motion: false })], { pad: [40, 32, 40, 32] }),
    ], { gap: 24 })], C.shop)),
  r("cta-rating", "cta", w("نجوم ودعوة", "Stars and a call", "כוכבים וקריאה"), ["soft", "plain", "dark"], (c) =>
    sec(c, [head(c, [rating(c, true), H(c, c.pack.title, 2), P(c, MORE_QUOTES[5].quote, { style: { italic: true, maxWidth: "520px" } }), row(c, [B(c, c.pack.cta, "/shop")], true)], true, 0)], C.shop)),
  r("cta-mesh", "cta", w("ألوان بتتمازج", "Colours that blend", "צבעים מתמזגים"), ["plain"], (c) =>
    sec(c, [head(c, [H(c, c.pack.title, 2, { style: { size: 52, sizeMin: 30 } }), P(c, c.pack.sub, { quiet: false, style: { maxWidth: "560px" } }), row(c, [B(c, c.pack.cta, "/shop")], true)], true, 0)], C.shop, { pad: [120, 24, 120, 24], style: { mesh: { colors: ["accent-soft", "surface", "accent"], soft: 70, move: true, speed: 0.6 } } })),
  r("cta-picture-over", "cta", w("دعوة فوق صورة", "A call over a picture", "קריאה על תמונה"), ["plain", "surface"], (c) =>
    sec(c, [overPic(c, c.pack.collection, (k) => [H(k, c.pack.title, 2, { style: { size: 44 } }), P(k, c.pack.sub, { style: { maxWidth: "520px" } }), row(k, [B(k, c.pack.cta, "/shop"), picLink(k, C.more, "/about", "outline")], true)], { aspect: "21 / 9", at: "center", dim: 0.48, radius: 28, phone: { aspect: "3 / 4" } })], C.shop, { pad: [48, 24, 48, 24] })),

  /* newsletter */
  r("news-strip", "newsletter", w("شريط بسطر واحد", "A strip on one line", "פס בשורה אחת"), ["bold", "dark", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[H(c, C.join, 3, { motion: false }), P(c, C.joinSub, { motion: false, style: { size: 15 } })], [form(c, "newsletter")]], { gap: 32, align: "center" })], C.join, { pad: [36, 24, 36, 24] })),
  r("news-perks", "newsletter", w("نموذج وشو بتاخدوا", "A form and what you get", "טופס ומה מקבלים"), ["plain", "soft", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, C.join, { aspect: "1 / 1", radius: 999 })], [eyebrow(c, X.whatYouGet), H(c, C.join, 2), ticks(c, X.gets), form(c, "newsletter")]], { gap: 56, align: "center" })], C.join)),
  r("news-scene", "newsletter", w("بالنص على خلفية حيّة", "Centred on a live background", "במרכז על רקע חי"), ["dark", "soft"], (c) =>
    sec(c, [head(c, [ICON(c, "mail", { size: 40 }), H(c, C.join, 2), P(c, C.joinSub, { style: { maxWidth: "520px" } }), form(c, "newsletter")], true, 0)], C.join, { pad: [110, 24, 110, 24], props: scene(c, c.skin === "dark" ? "bokeh" : "bubbles") })),

  /* offers */
  r("offer-ticket", "offer", w("كوبون", "A coupon", "קופון"), ["plain", "soft", "surface"], (c) => {
    const k = withSkin(c, "bold");
    return sec(c, [narrow(c, [STACK(c, [
      STACK(k, [H(k, X.percent, 2, { motion: false, style: { size: 72, lineHeight: 1, weight: 900 } })], { justify: "center", align: "center", pad: [32, 36, 32, 36], bg: "accent", color: "accent-contrast" }),
      STACK(c, [H(c, OFFER.title, 3, { motion: false }), P(c, OFFER.use, { motion: false }), row(c, [badge(c, OFFER.code, { center: true }), B(c, C.shop, "/shop", "link", { motion: false })])], { gap: 10, justify: "center", pad: [28, 32, 28, 32] }),
    ], { direction: "row", gap: 0, wrap: true, radius: 24, overflow: "hidden", border: { width: 2, color: "accent", style: "dashed" } })], "760px", { gap: 0 })], OFFER.title);
  }),
  r("offer-three", "offer", w("تلات عروض", "Three offers", "שלושה מבצעים"), ["plain", "soft", "dark"], (c) =>
    sec(c, [head(c, [H(c, X.dealToday, 2)]), GRID(c, 3, DEALS.map((d) => CARD(c, [ICON(c, d.icon, { size: 40 }), H(c, d.title, 4, { motion: false }), P(c, d.text, { motion: false }), hug(B(c, C.shop, "/shop", "link", { motion: false }))])))], X.dealToday)),
  r("offer-products", "offer", w("عدّاد ومنتجات العرض", "A countdown and the offer's products", "ספירה לאחור ומוצרי המבצע"), ["plain", "soft", "surface"], (c) =>
    sec(c, [head(c, [badge(c, C.ends, { center: true, solid: true }), H(c, OFFER.title, 2), countdown(c)]), products(c, { source: "best", columns: 4, limit: 4, card: "shadow" }), foot(c, [B(c, C.all, "/shop", "outline")])], OFFER.title)),
  r("offer-steps", "offer", w("كود وكيف بتستعملوه", "A code and how to use it", "קוד ואיך משתמשים בו"), ["soft", "plain"], (c) =>
    sec(c, [head(c, [H(c, X.howCode, 2), H(c, OFFER.code, 3, { style: { size: 32, weight: 800, letterSpacing: 6, pad: [10, 24, 10, 24], border: { width: 2, color: pop(c), style: "dashed" }, radius: 14, color: pop(c) } })]), GRID(c, 3, CODE_STEPS.map((s, i) => step(c, s, i, true)))], OFFER.title)),
  r("offer-scene", "offer", w("عرض بقصاصات ملوّنة", "An offer with confetti", "מבצע עם קונפטי"), ["bold", "dark"], (c) =>
    sec(c, [head(c, [eyebrow(c, X.lastChance), H(c, OFFER.title, 2, { style: { size: 56, sizeMin: 32 } }), countdown(c), row(c, [B(c, C.shop, "/shop")], true)], true, 0)], OFFER.title, { pad: [110, 24, 110, 24], props: scene(c, "confetti") })),

  /* bundles */
  r("price-club", "pricing", w("عضويات بالشهر أو بالسنة", "Memberships by the month or the year", "מנויים לחודש או לשנה"), ["plain", "soft", "surface"], (c) =>
    sec(c, [head(c, [eyebrow(c, C.loyalty), H(c, C.plans, 2), P(c, C.loyaltySub)]), EL(c, "pricing", {
      billing: true, initialBilling: "monthly",
      items: CLUB.map((b) => ({ name: say(c, b.name), price: say(c, w(b.month, b.month, b.month)), period: say(c, X.monthly), yearlyPrice: say(c, w(b.year, b.year, b.year)), yearlyPeriod: say(c, X.yearly), features: say(c, b.features), cta: say(c, X.choose), href: "/account", ...(b.featured ? { featured: true, badge: say(c, X.loved2) } : {}) })),
    }, { style: { self: "stretch" }, motion: mo.group(c) })], C.plans)),
  r("price-table", "pricing", w("جدول الباقات", "A table of the bundles", "טבלת החבילות"), ["plain", "surface"], (c) =>
    sec(c, [head(c, [H(c, C.plans, 2)]), EL(c, "comparison", {
      label: say(c, C.plans),
      columns: BUNDLES.map((b) => ({ title: say(c, b.name), subtitle: say(c, w(b.price, b.price, b.price)), href: "/shop", cta: say(c, X.choose), ...(b.featured ? { highlight: true } : {}) })),
      rows: BUNDLE_ROWS.map(([label, values]) => ({ label: say(c, label), values: values.map((v) => (typeof v === "string" ? { state: "text", text: say(c, w(v, v, v)) } : { state: v ? "yes" : "no" })) })),
    }, { style: { self: "stretch" } })], C.plans)),
  r("price-one", "pricing", w("باقة وحدة وشو فيها", "One bundle and what's in it", "חבילה אחת ומה יש בה"), ["soft", "plain", "dark"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, C.plans), H(c, X.onePlan, 2), P(c, c.pack.sub), ticks(c, PERKS.slice(0, 4).map((p) => p.title))], [EL(c, "pricing", { items: [plan(c, BUNDLES[1])] }, { style: { self: "stretch", maxWidth: "420px" } })]], { gap: 56, align: "center" })], C.plans)),

  /* team */
  r("team-photos", "team", w("فريق بصور", "The team with pictures", "הצוות עם תמונות"), ["plain", "soft", "surface"], (c) =>
    sec(c, [head(c, [eyebrow(c, C.about), H(c, C.team, 2)]), EL(c, "team", { items: people(c, [...PEOPLE, FOURTH_PERSON], true), columns: 4 }, { style: { self: "stretch" }, motion: mo.group(c) })], C.team)),
  r("team-founder", "team", w("المؤسِّسة وكلمتها", "The founder and her word", "המייסדת ומילתה"), ["plain", "soft", "dark"], (c) =>
    sec(c, [COLS(c, [2, 3], [[IMG(c, PEOPLE[0][0], { aspect: "3 / 4", shaped: true })], [eyebrow(c, X.founder), H(c, PEOPLE[0][0], 2), P(c, c.pack.story, { style: { size: 19 } }), P(c, X.letterMore), B(c, C.more, "/about", "outline")]], { gap: 56, align: "center" })], C.team)),
  r("team-cards", "team", w("كروت الفريق", "Team cards", "כרטיסי צוות"), ["plain", "dark"], (c) =>
    sec(c, [head(c, [H(c, C.team, 2)]), GRID(c, 3, PEOPLE.map(([name, role]) => CARD(c, [IMG(c, name, { aspect: "1 / 1", motion: false }), H(c, name, 4, { motion: false }), P(c, role, { motion: false, style: { size: 15 } })], { pad: [12, 12, 20, 12], gap: 8 })))], C.team)),

  /* comparisons */
  r("ba-two", "compare", w("مقارنتين جنب بعض", "Two comparisons side by side", "שתי השוואות זו לצד זו"), ["plain", "surface"], (c) =>
    sec(c, [head(c, [H(c, C.compare, 2)]), GRID(c, 2, [40, 60].map((start) => EL(c, "beforeAfter", { before: pic(c), after: pic(c), start, beforeLabel: say(c, X.before), afterLabel: say(c, X.after) }, { style: { radius: 20 } })), { gap: 24 })], C.compare)),
  r("ba-table", "compare", w("نحنا وغيرنا", "Us and elsewhere", "אנחנו ואחרים"), ["plain", "surface", "soft"], (c) =>
    sec(c, [head(c, [eyebrow(c, C.why), H(c, X.usVsOthers, 2)]), narrow(c, [versus(c)], "820px")], X.usVsOthers)),
  r("ba-lists", "compare", w("قبل وبعد بقائمتين", "Before and after in two lists", "לפני ואחרי בשתי רשימות"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [H(c, C.compare, 2)]), GRID(c, 2, [
      CARD(c, [badge(c, X.others), IMG(c, X.before, { aspect: "16 / 10", motion: false }), ticks(c, [w("توصيل بياخد أسابيع", "Delivery takes weeks", "משלוח לוקח שבועות"), w("إرجاع معقّد", "Returns are a struggle", "החזרה מסובכת"), w("ما حدا بيرد", "Nobody answers", "אף אחד לא עונה")], "return")]),
      CARD(c, [badge(c, X.us, { solid: true }), IMG(c, X.after, { aspect: "16 / 10", motion: false }), ticks(c, PERKS.slice(0, 3).map((p) => p.title))]),
    ], { gap: 24 })], C.compare)),

  /* details */
  r("tabs-boxed", "details", w("تبويبات بصور", "Tabs with pictures", "לשוניות עם תמונות"), ["plain", "surface"], (c) =>
    sec(c, [head(c, [H(c, C.details, 2)]), EL(c, "tabs", { look: "boxed", items: DETAIL_TABS.map(([label, text]) => ({ label: say(c, label), text: say(c, text), image: pic(c) })) }, { style: { self: "stretch" } })], C.details)),
  r("details-open", "details", w("صورة وتفاصيل بتنفتح", "A picture and details that open", "תמונה ופרטים שנפתחים"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, c.pack.product, { aspect: "4 / 5" })], [eyebrow(c, C.details), H(c, c.pack.product, 2), P(c, c.pack.sub), accordion(c, DETAIL_TABS, "lines", true)]], { gap: 56, align: "center" })], C.details)),
  r("details-specs", "details", w("جدول مواصفات", "A table of specifications", "טבלת מפרט"), ["plain", "surface", "dark"], (c) =>
    sec(c, [COLS(c, [1, 2], [[eyebrow(c, C.details), H(c, X.specs, 2), P(c, c.pack.sub)], [STACK(c, SPECS.flatMap(([label, value], i) => [...(i ? [DIVIDER(c)] : []), STACK(c, [P(c, label, { motion: false, style: { size: 15, width: "34%" } }), P(c, value, { quiet: false, motion: false, style: { weight: 600 } })], { direction: "row", gap: 16, align: "center" })]), { gap: 14 })]], { gap: 56 })], X.specs)),

  /* contact */
  r("contact-hours", "contact", w("ساعات الدوام وخريطة", "Opening hours and a map", "שעות פתיחה ומפה"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[H(c, X.hoursTitle, 2), P(c, C.address, { quiet: false }), hours(c)], [EL(c, "map", { query: "Nazareth", zoom: 14, label: say(c, C.visit) }, { style: { self: "stretch", radius: 20, height: "420px" } })]], { gap: 40, align: "center" })], C.visit)),
  r("contact-clock", "contact", w("ساعة المتجر وطرق التواصل", "The store's clock and ways to reach it", "שעון החנות ודרכי קשר"), ["plain", "soft", "dark"], (c) =>
    sec(c, [COLS(c, [1, 2], [
      [EL(c, "clock", { label: say(c, X.ourTime), timezone: "Asia/Jerusalem", format: "24", seconds: false, date: true }), P(c, C.hours)],
      [GRID(c, 3, [reach(c, "whatsapp", X.whatsapp, X.needHelpSub, X.whatsapp, WHATSAPP), reach(c, "phone", X.callUs, C.phoneLine, X.callUs, "tel:0500000000"), reach(c, "mail", C.writeUs, C.mailLine, C.writeUs, "mailto:hello@example.com")], { gap: 16 })],
    ], { gap: 48, align: "center" })], C.contactUs)),
  r("contact-whatsapp", "contact", w("احكوا معنا عالواتساب", "Talk to us on WhatsApp", "דברו איתנו בוואטסאפ"), ["soft", "bold", "dark"], (c) =>
    sec(c, [head(c, [ICON(c, "whatsapp", { size: 56 }), H(c, X.needHelp, 2), P(c, X.needHelpSub, { style: { maxWidth: "520px" } }), row(c, [B(c, X.whatsapp, WHATSAPP), B(c, X.callUs, "tel:0500000000", "outline", { delay: 0.3 })], true)], true, 0)], C.contactUs)),
  r("contact-branches", "contact", w("فروعنا", "Our branches", "הסניפים שלנו"), ["plain", "surface", "soft"], (c) =>
    sec(c, [head(c, [H(c, X.branches, 2)]), GRID(c, 3, BRANCHES.map((b) => CARD(c, [H(c, b.name, 4, { motion: false }), P(c, b.address, { quiet: false, motion: false }), iconLine(c, "check", b.hours, 14), hug(B(c, X.directions, `https://www.google.com/maps/search/?api=1&query=${b.query}`, "link", { motion: false }))])))], X.branches)),
  r("contact-panel", "contact", w("نموذج ولوحة معلومات ملوّنة", "A form and a coloured panel of details", "טופס ולוח פרטים צבעוני"), ["plain", "surface"], (c) => {
    const k = withSkin(c, "bold");
    return sec(c, [COLS(c, [3, 2], [[H(c, C.writeUs, 2), P(c, C.writeSub), form(c, "contact")], [STACK(k, [H(k, C.visit, 3, { motion: false }), iconLine(k, "heart", C.address), iconLine(k, "phone", C.phoneLine), iconLine(k, "mail", C.mailLine), P(k, C.hours, { motion: false })], { gap: 16, pad: [36, 32, 36, 32], radius: 24, bg: "accent", color: "accent-contrast" })]], { gap: 48, align: "center" })], C.contactUs);
  }),

  /* headers */
  r("header-promo", "header", w("سطر عرض وهيدر بزر", "An offer line and a header with a button", "שורת מבצע וכותרת עם כפתור"), ["plain", "surface", "dark"], (c) =>
    sec(c, [col(c, [
      P(c, X.topLine, { motion: false, style: { size: 13, textAlign: "center" } }),
      COLS(c, [1, 2, 1], [[storeName(c)], [menu(c, LINKS_MAIN, { phone: "fold" })], [B(c, c.pack.cta, "/shop", "solid", { motion: false })]], { gap: 24, align: "center" }),
    ], 10)], HEADER, { pad: [8, 24, 14, 24], phone: { pad: [8, 16, 12, 16] }, props: { tag: "header" } })),
  r("header-split", "header", w("الاسم بالنص وقائمة من الجهتين", "The name in the middle, a menu each side", "השם במרכז ותפריט מכל צד"), ["plain", "soft", "dark"], (c) =>
    sec(c, [COLS(c, [2, 1, 2], [[menu(c, LINKS_MAIN.slice(0, 2), { phone: "fold" })], [storeName(c, 28)], [menu(c, LINKS_MAIN.slice(2), { phone: "fold" })]], { gap: 24, align: "center", phone: "keep", cellStyle: { align: "center", textAlign: "center" } })], HEADER, { pad: [18, 24, 18, 24], phone: { pad: [12, 16, 12, 16] }, props: { tag: "header" } })),
  r("header-search", "header", w("اسم وبحث عريض وروابط", "A name, a wide search and links", "שם, חיפוש רחב וקישורים"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [1, 3, 2], [[storeName(c)], [EL(c, "search", { look: "rounded" }, { style: { self: "stretch" } })], [menu(c, LINKS_HELP.slice(0, 2), { look: "plain", phone: "fold" })]], { gap: 24, align: "center" })], HEADER, { pad: [16, 24, 16, 24], phone: { pad: [12, 16, 12, 16] }, props: { tag: "header" } })),

  /* footers */
  r("footer-perks", "footer", w("مميزات فوق وروابط تحت", "Perks above, links below", "יתרונות למעלה וקישורים למטה"), ["surface", "dark", "plain"], (c) =>
    sec(c, [col(c, [
      GRID(c, 4, PERKS.slice(0, 4).map((p) => perk(c, p, { small: true })), { gap: 24, phone: 2, motion: false }),
      DIVIDER(c),
      COLS(c, [2, 1, 1], [[storeName(c), P(c, c.pack.story)], [menu(c, LINKS_MAIN, { layout: "column" })], [menu(c, LINKS_HELP, { layout: "column" })]], { gap: 32 }),
      P(c, RIGHTS, { style: { size: 13 } }),
    ], 32)], FOOTER, { pad: [56, 24, 32, 24], props: { tag: "footer" } })),
  r("footer-contact", "footer", w("روابط وطرق التواصل", "Links and ways to reach us", "קישורים ודרכי קשר"), ["surface", "dark", "soft"], (c) =>
    sec(c, [COLS(c, [2, 1, 2], [
      [storeName(c), P(c, c.pack.story), menu(c, LINKS_SOCIAL, { look: "pills" })],
      [menu(c, [...LINKS_MAIN, ...LINKS_HELP.slice(0, 1)], { layout: "column" })],
      [H(c, C.visit, 5, { motion: false }), iconLine(c, "heart", C.address), iconLine(c, "phone", C.phoneLine), iconLine(c, "mail", C.mailLine), P(c, C.hours, { motion: false, style: { size: 14 } })],
    ], { gap: 40 }), P(c, RIGHTS, { style: { size: 13, margin: [32, 0, 0, 0] } })], FOOTER, { pad: [56, 24, 32, 24], props: { tag: "footer" } })),
  r("footer-line", "footer", w("سطر واحد", "One line", "שורה אחת"), ["plain", "surface", "dark"], (c) =>
    sec(c, [STACK(c, [storeName(c, 20), menu(c, LINKS_MAIN), P(c, RIGHTS, { motion: false, style: { size: 13 } })], { direction: "row", wrap: true, justify: "between", align: "center", gap: 16 })], FOOTER, { pad: [24, 24, 24, 24], props: { tag: "footer" } })),
  r("footer-running", "footer", w("كلام ماشي وروابط", "Running words and links", "מילים רצות וקישורים"), ["dark", "bold"], (c) =>
    sec(c, [col(c, [
      marquee(c, [c.pack.title, C.storeName], 64),
      STACK(c, [COLS(c, [1, 1, 1, 1], [[storeName(c)], [menu(c, LINKS_MAIN, { layout: "column" })], [menu(c, LINKS_HELP, { layout: "column" })], [menu(c, LINKS_SOCIAL, { layout: "column" })]], { gap: 24 }), P(c, RIGHTS, { style: { size: 13 } })], { gap: 24, pad: [0, 24, 0, 24] }),
    ], 40)], FOOTER, { pad: [48, 0, 32, 0], full: true, props: { tag: "footer" } })),

  /* special pages */
  r("maintenance", "notice", w("راجعين بعد شوي", "Back in a little while", "חוזרים עוד מעט"), ["plain", "soft", "dark"], (c) =>
    sec(c, [head(c, [ICON(c, "sparkle", { size: 56 }), H(c, X.maintenance, 1), P(c, X.maintenanceSub, { style: { maxWidth: "520px" } }), row(c, [B(c, X.whatsapp, WHATSAPP), B(c, C.home, "/", "outline", { delay: 0.3 })], true)], true, 0)], X.maintenance, { pad: [130, 24, 130, 24] })),
  r("thanks-steps", "notice", w("شكراً وشو بيصير بعدين", "Thanks, and what happens next", "תודה, ומה קורה עכשיו"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [ICON(c, "check", { size: 56 }), H(c, X.orderIn, 1), P(c, X.orderInSub, { style: { maxWidth: "520px" } })]), GRID(c, 3, STEPS.map((s, i) => step(c, s, i, true))), foot(c, [row(c, [B(c, C.shop, "/shop"), B(c, C.contactUs, "/contact", "outline", { delay: 0.3 })], true)], 40)], X.orderIn, { pad: [96, 24, 96, 24] })),
  r("empty-bag", "notice", w("السلة فاضية", "An empty bag", "סל ריק"), ["plain", "surface"], (c) =>
    sec(c, [head(c, [ICON(c, "bag", { size: 56 }), H(c, X.emptyCart, 2), P(c, X.emptyCartSub), row(c, [B(c, C.shop, "/shop")], true)]), products(c, { source: "best", columns: 4, limit: 4, card: "plain" })], X.emptyCart)),
  r("notfound-search", "notice", w("404 ببحث وأقسام", "A 404 with a search and categories", "404 עם חיפוש וקטגוריות"), ["plain", "soft", "dark"], (c) =>
    sec(c, [head(c, [H(c, w("404", "404", "404"), 1, { style: { size: 120, sizeMin: 72, weight: 900, color: pop(c), lineHeight: 1 } }), H(c, C.notFound, 2), P(c, X.searchHere), EL(c, "search", { look: "pill" }, { style: { self: "center", width: "100%", maxWidth: "560px" } }), EL(c, "categories", { look: "pill", limit: 6 }, { style: { self: "center" } })], true, 0)], C.notFound, { pad: [110, 24, 110, 24] })),

  /* popups (over the page, not sections) */
  r("pop-flash", "popup", w("عرض خاطف بعدّاد", "A flash sale with a countdown", "מבצע בזק עם ספירה לאחור"), ["plain"], (c) => popup(c, { trigger: "load", delay: 4, often: "day", size: "m" }, [badge(c, X.lastChance, { solid: true }), H(c, X.flash, 2, { motion: false }), countdown(c), B(c, C.shop, "/shop", "solid", { motion: false })])),
  r("pop-help", "popup", w("مساعدة بالزاوية", "Help in the corner", "עזרה בפינה"), ["plain"], (c) => popup(c, { trigger: "scroll", scroll: 30, often: "visit", size: "s", place: "corner" }, [ICON(c, "whatsapp", { size: 32, motion: false }), H(c, X.needHelp, 3, { motion: false }), P(c, X.needHelpSub, { motion: false }), B(c, X.whatsapp, WHATSAPP, "solid", { motion: false })])),
  r("pop-bottom", "popup", w("شريط توصيل مجاني تحت", "A free-delivery bar at the bottom", "פס משלוח חינם למטה"), ["plain"], (c) => popup(c, { trigger: "load", delay: 2, often: "visit", size: "l", place: "bottom" }, [STACK(c, [iconLine(c, "truck", X.freeShip, 17), badge(c, OFFER.code, { center: true }), B(c, C.shop, "/shop", "solid", { motion: false })], { direction: "row", wrap: true, gap: 16, align: "center", justify: "center" })])),

  /* trust */
  r("trust-logos", "trust", w("ماركات بصف", "Brands in a row", "מותגים בשורה"), ["plain", "surface", "soft"], (c) => sec(c, [head(c, [H(c, C.brands, 3), P(c, X.brandsSub)], true, 32), logos(c)], C.brands, { pad: [64, 24, 64, 24] })),
  r("trust-logos-moving", "trust", w("ماركات ماشية", "Brands running by", "מותגים רצים"), ["plain", "surface", "dark"], (c) => sec(c, [head(c, [eyebrow(c, C.brands)], true, 24), logos(c, { moving: true, gray: c.skin !== "dark" })], C.brands, { pad: [40, 0, 40, 0], full: true })),
  r("trust-badges", "trust", w("أربع ضمانات", "Four promises", "ארבע הבטחות"), ["surface", "plain", "soft", "dark"], (c) =>
    sec(c, [GRID(c, 4, TRUST_BADGES.map((b) => STACK(c, [ICON(c, b.icon, { size: 36 }), H(c, b.title, 5, { motion: false })], { gap: 10, align: "center", textAlign: "center" })), { gap: 24, phone: 2 })], X.guarantee, { pad: [48, 24, 48, 24] })),
  r("trust-press", "trust", w("حكوا عنّا", "As seen in", "כתבו עלינו"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [eyebrow(c, X.press), H(c, X.pressQuote, 2, { style: { size: 32, lineHeight: 1.4, weight: 500, maxWidth: "820px" } })], true, 40), logos(c)], X.press)),
  r("trust-guarantee", "trust", w("كرت الضمان", "A promise card", "כרטיס הבטחה"), ["soft", "plain", "bold"], (c) =>
    sec(c, [narrow(c, [CARD(c, [ICON(c, "shield", { size: 56 }), H(c, X.guarantee, 2, { motion: false }), P(c, X.guaranteeSub, { motion: false, style: { size: 18 } }), row(c, [B(c, C.shop, "/shop", "solid", { motion: false }), B(c, C.shipping, "/policies", "link", { motion: false })], true)], { align: "center", textAlign: "center", pad: [48, 36, 48, 36], gap: 16 })], "760px", { gap: 0 })], X.guarantee)),
  r("trust-both", "trust", w("ضمانات وماركات", "Promises and brands", "הבטחות ומותגים"), ["plain", "surface"], (c) =>
    sec(c, [col(c, [
      COLS(c, [1, 2], [[H(c, C.why, 3), P(c, X.brandsSub)], [GRID(c, 2, TRUST_BADGES.map((b) => iconLine(c, b.icon, b.title, 16)), { gap: 16, phone: 1, motion: false })]], { gap: 40, align: "center" }),
      DIVIDER(c),
      logos(c),
    ], 36)], C.why, { pad: [64, 24, 64, 24] })),

  /* information */
  r("data-programme", "data", w("برنامج الأسبوع بكروت", "The week's programme in cards", "התכנית השבועית בכרטיסים"), ["plain", "surface", "soft"], (c) => sec(c, [head(c, [eyebrow(c, C.storeName), H(c, X.programme, 2), P(c, X.programmeSub)]), programme(c, "cards", { filterDays: true })], X.programme)),
  r("data-programme-table", "data", w("برنامج الأسبوع بجدول", "The week's programme in a table", "התכנית השבועית בטבלה"), ["plain", "surface"], (c) => sec(c, [head(c, [H(c, X.programme, 2)], false), programme(c, "table")], X.programme)),
  r("data-programme-line", "data", w("برنامج على خط زمني وصورة", "A programme on a timeline, with a picture", "תכנית על ציר זמן עם תמונה"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [2, 3], [[IMG(c, X.programme, { aspect: "3 / 4", shaped: true })], [eyebrow(c, C.storeName), H(c, X.programme, 2), programme(c, "timeline")]], { gap: 56, align: "start", cellStyle: { justify: "start" } })], X.programme)),
  r("data-versus", "data", w("جدول مقارنة وكلام", "A comparison table and words", "טבלת השוואה ומילים"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [1, 2], [[eyebrow(c, C.why), H(c, X.usVsOthers, 2), P(c, c.pack.sub), B(c, c.pack.cta, "/shop")], [versus(c)]], { gap: 48, align: "center" })], X.usVsOthers)),
  r("data-charts", "data", w("رسمتين جنب بعض", "Two charts side by side", "שני תרשימים זה לצד זה"), ["plain", "surface"], (c) =>
    sec(c, [head(c, [H(c, C.numbers, 2)]), GRID(c, 2, [CARD(c, [chart(c, "bar", LOVED, X.loved)]), CARD(c, [chart(c, "line", GROWTH, X.ordersYear)])], { gap: 24 })], C.numbers)),
  r("data-hours", "data", w("ساعات الدوام بكروت", "Opening hours in cards", "שעות פתיחה בכרטיסים"), ["plain", "soft", "surface"], (c) => sec(c, [head(c, [H(c, X.hoursTitle, 2), P(c, C.address)]), hours(c, "cards")], X.hoursTitle)),
];
