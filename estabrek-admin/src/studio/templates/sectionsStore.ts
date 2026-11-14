/**
 * More of the section library, the store's front: openings, bars, categories, products, 3D, perks, stories,
 * pictures with words, galleries and lookbooks, and two categories of their own: banners (words over pictures)
 * and showcases (panels that open, a presentation, an index). The same parts and skins as sections.ts.
 */
import { B, CARD, COLS, DIVIDER, EL, GRID, H, ICON, IMG, MODEL, P, SPACER, STACK, eyebrow, mo, patternOf, pic, pop, say, withSkin, type Ctx, type N, type Skin } from "./build";
import { OFFER, PEOPLE, QUOTES, SEE, TIMELINE, WHATSAPP, categories, countdown, ctas, form, head, looks, marquee, menu, perk, products, quotes, row, sec, stat, step, strip } from "./parts";
import { badge, col, deck, foot, gallery, headRow, hug, iconLine, narrow, onPhone, overPic, panels, picLink, rating, scene, slides, ticks } from "./partsMore";
import type { SectionCat, SectionRecipe } from "./sections";
import { C, LINKS_HELP, PERKS, RUNNING, STATS, STEPS, w, type W } from "./words";
import { FINISHES, X } from "./wordsMore";

const r = (key: string, cat: SectionCat, name: W, skins: Skin[], build: (c: Ctx) => N): SectionRecipe => ({ key, cat, name, skins, build });
const BAR = w("شريط", "Bar", "פס");
const num = (i: number) => w(String(i + 1), String(i + 1), String(i + 1));
/** A card of words that floats on a picture's corner: it reads on any skin. */
const floating = (c: Ctx, kids: N[], style: Record<string, unknown> = {}) => STACK(c, kids, { gap: 6, bg: "surface", color: "text", pad: [16, 18, 16, 18], radius: 16, shadow: "lg", z: 2, ...style });

export const STORE_RECIPES: SectionRecipe[] = [
  /* openings */
  r("hero-bento", "hero", w("مربعات بينتو", "Bento boxes", "קוביות בנטו"), ["plain", "soft", "surface"], (c) =>
    sec(c, [GRID(c, 4, [
      // On a phone (two columns) the words keep the whole row.
      onPhone(CARD(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1, { style: { size: 48 } }), P(c, c.pack.sub), ctas(c)], { col: "span 2", row: "span 2", justify: "center", pad: [40, 32, 40, 32], gap: 16 }), { col: "span 2", pad: [28, 22, 28, 22] }),
      IMG(c, c.pack.product, { aspect: "1 / 1", motion: false }),
      IMG(c, c.pack.collection, { aspect: "1 / 1", motion: false }),
      CARD(c, [H(c, STATS[0].n, 2, { motion: mo.num(c), style: { size: 44, color: pop(c) } }), P(c, STATS[0].label, { motion: false })], { justify: "center" }),
      CARD(c, [ICON(c, PERKS[0].icon, { size: 32, motion: false }), H(c, PERKS[0].title, 4, { motion: false }), P(c, PERKS[0].text, { motion: false, style: { size: 15 } })], { justify: "center" }),
    ], { gap: 16, phone: 2 })], C.welcome, { pad: [56, 24, 72, 24] })),
  r("hero-wide-pic", "hero", w("كلام فوق وصورة عريضة تحت", "Words above a wide picture", "מילים מעל תמונה רחבה"), ["plain", "soft", "surface"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19, maxWidth: "620px" } }), ctas(c, true), rating(c, true)], true, 40), IMG(c, c.pack.product, { aspect: "21 / 9", radius: 28, phone: { aspect: "4 / 3" } })], C.welcome, { pad: [96, 24, 64, 24] })),
  r("hero-arch", "hero", w("قوس بالنص", "An arch in the middle", "קשת במרכז"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1, 1], [[eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1, { style: { size: 48 } })], [IMG(c, c.pack.product, { aspect: "3 / 4", radius: 0, style: { shape: "arch" } })], [P(c, c.pack.sub, { style: { size: 18 } }), ctas(c)]], { gap: 40, align: "center" })], C.welcome)),
  r("hero-fan", "hero", w("صور متل المروحة", "Pictures fanned out", "תמונות פרושות כמניפה"), ["plain", "soft", "dark"], (c) =>
    sec(c, [
      head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19, maxWidth: "620px" } }), ctas(c, true)], true, 48),
      STACK(c, [-7, 0, 7].map((turn, i) => IMG(c, c.pack.product, { aspect: "3 / 4", motion: false, style: { width: "30%", maxWidth: "280px", rotateZ: turn, margin: [i === 1 ? 0 : 28, -14, 0, -14], z: i === 1 ? 2 : 1, shadow: "lg" } })), { direction: "row", gap: 0, justify: "center", align: "start" }, mo.group(c)),
    ], C.welcome, { pad: [96, 24, 96, 24] })),
  r("hero-products", "hero", w("كلام ومنتجات تحته", "Words with products under", "מילים ומוצרים מתחת"), ["plain", "soft", "surface"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19, maxWidth: "620px" } }), ctas(c, true)], true, 48), products(c, { source: "new", limit: 4, columns: 4, card: "lift" })], C.welcome, { pad: [96, 24, 72, 24] })),
  r("hero-review", "hero", w("صورة وعليها رأي زبون", "A picture with a review on it", "תמונה עם ביקורת עליה"), ["plain", "soft", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [
      [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19 } }), ctas(c), rating(c)],
      [STACK(c, [
        IMG(c, c.pack.product, { shaped: true }),
        floating(c, [STACK(c, [0, 1, 2, 3, 4].map(() => ICON(c, "star", { size: 14, motion: false, style: { color: "accent" } })), { direction: "row", gap: 2 }), P(c, QUOTES[0].quote, { quiet: false, motion: false, style: { size: 15, lineHeight: 1.5 } }), P(c, QUOTES[0].name, { quiet: false, motion: false, style: { size: 13, weight: 700 } })], { width: "70%", maxWidth: "300px", layer: { x: 4, y: 96, anchor: "bottom-start" } }),
      ], { gap: 0 })],
    ], { gap: 56, align: "center" })], C.welcome)),
  r("hero-card-on-pic", "hero", w("كرت كلام فوق صورة كاملة", "A card of words over a full picture", "כרטיס מילים על תמונה מלאה"), ["plain"], (c) =>
    sec(c, [
      IMG(c, c.pack.product, { aspect: "16 / 9", radius: 0, style: { height: "78vh", aspect: undefined }, phone: { height: "74vh" } }),
      STACK(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1, { style: { size: 44 } }), P(c, c.pack.sub), row(c, [B(c, c.pack.cta, "/shop")])], { gap: 14, width: "88%", maxWidth: "460px", layer: { x: 6, y: 50, anchor: "start" }, z: 2, bg: "bg", color: "text", pad: [36, 32, 36, 32], radius: 24, shadow: "lg" }),
    ], C.welcome, { full: true, pad: [0, 0, 0, 0], phone: { pad: [0, 0, 0, 0] } })),
  r("hero-collage", "hero", w("كلام وكولاج صور", "Words and a collage", "מילים וקולאז׳"), ["plain", "soft", "surface"], (c) =>
    sec(c, [COLS(c, [5, 6], [
      [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19 } }), ctas(c)],
      [GRID(c, 2, [IMG(c, c.pack.product, { aspect: "1 / 2", style: { row: "span 2" }, phone: { row: "span 2" } }), IMG(c, c.pack.collection, { aspect: "1 / 1" }), IMG(c, c.pack.product, { aspect: "1 / 1", radius: 999 })], { gap: 16, phone: 2 })],
    ], { gap: 48, align: "center" })], C.welcome)),
  r("hero-sale", "hero", w("افتتاحية تخفيضات", "A sale opening", "פתיח מבצע"), ["bold", "dark", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [
      [badge(c, C.ends), H(c, OFFER.title, 1), P(c, OFFER.use, { quiet: false }), countdown(c, "plain"), row(c, [B(c, C.shop, "/shop")])],
      [H(c, X.percent, 1, { motion: mo.num(c), style: { size: 200, sizeMin: 110, weight: 900, lineHeight: 1, textAlign: "center", color: pop(c) } })],
    ], { gap: 40, align: "center" })], OFFER.title, { style: patternOf(c, "diagonal", c.skin === "bold" ? "accent-contrast" : "accent", 20, 0.1) })),
  r("hero-quiet", "hero", w("هادي وبسيط", "Quiet and simple", "שקט ופשוט"), ["plain", "surface", "dark"], (c) =>
    sec(c, [col(c, [
      eyebrow(c, c.pack.eyebrow),
      H(c, c.pack.title, 1, { style: { size: 72, sizeMin: 38, weight: 500, lineHeight: 1.1, maxWidth: "900px" } }),
      DIVIDER(c, { style: { margin: [24, 0, 8, 0] } }),
      COLS(c, [2, 1], [[P(c, c.pack.sub, { style: { size: 19, maxWidth: "560px" } })], [row(c, [B(c, c.pack.cta, "/shop", "link"), B(c, C.more, "/about", "link", { delay: 0.3 })])]], { gap: 32, align: "center" }),
    ], 18)], C.welcome, { pad: [140, 24, 110, 24] })),
  r("hero-signup", "hero", w("افتتاحية بتسجيل", "An opening with a sign-up", "פתיח עם הרשמה"), ["soft", "plain", "dark"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, C.joinSub, { style: { size: 19 } }), form(c, "newsletter"), ticks(c, X.gets.slice(0, 2))], [IMG(c, c.pack.product, { aspect: "1 / 1", shaped: true })]], { gap: 56, align: "center" })], C.welcome)),
  r("hero-panels", "hero", w("لوحات بتفتح", "Panels that open", "לוחות שנפתחים"), ["plain", "dark"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1)], true, 32), panels(c, { height: 520 })], C.welcome, { pad: [80, 24, 72, 24] })),
  r("hero-cats", "hero", w("كلام وأقسام بصور", "Words and picture categories", "מילים וקטגוריות בתמונות"), ["plain", "surface", "soft"], (c) =>
    sec(c, [col(c, [
      COLS(c, [2, 1], [[eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1)], [P(c, c.pack.sub), row(c, [B(c, c.pack.cta, "/shop")])]], { gap: 40, align: "end" }),
      categories(c, { look: "overlay", columns: 4, limit: 4 }),
    ], 40)], C.welcome, { pad: [80, 24, 72, 24] })),
  r("hero-stage", "hero", w("منصّة 3D بالنص", "A 3D stage in the middle", "במת תלת־ממד במרכז"), ["dark", "plain", "soft"], (c) =>
    sec(c, [
      head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1)], true, 8),
      STACK(c, [MODEL(c, { style: { maxWidth: "560px", aspect: "4 / 3" }, props: { floor: "pedestal", anim: { type: "spin", speed: 0.5 }, backdrop: { kind: "spot", color: pop(c) } } })], { align: "center", gap: 0 }),
      foot(c, [P(c, c.pack.sub, { style: { size: 19, maxWidth: "560px" } }), ctas(c, true)], 28),
    ], C.welcome, { pad: [88, 24, 88, 24] })),
  r("hero-scene", "hero", w("خلفية حيّة", "A live background", "רקע חי"), ["dark", "bold", "soft"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1, { style: { size: 72, sizeMin: 38 } }), P(c, c.pack.sub, { style: { size: 19, maxWidth: "620px" } }), ctas(c, true)], true, 0)], C.welcome, {
      pad: [150, 24, 150, 24], props: scene(c, c.skin === "soft" ? "blobs" : c.skin === "bold" ? "waves" : "aurora"),
    })),
  r("hero-frame", "hero", w("كلام وصور بتتقلّب بإطار", "Words and turning pictures in a frame", "מילים ותמונות מתחלפות במסגרת"), ["plain", "soft", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19 } }), ctas(c)], [slides(c, 3, { look: "polaroid", effect: "fade", aspect: "4 / 5", autoplay: 4, arrows: false }, undefined, {})]], { gap: 56, align: "center" })], C.welcome)),

  /* announcement bars */
  r("bar-code", "announce", w("شريط بكود خصم", "A bar with a code", "פס עם קוד הנחה"), ["bold", "dark", "soft"], (c) =>
    strip(c, [row(c, [P(c, OFFER.title, { quiet: false, motion: false, style: { weight: 700 } }), badge(c, OFFER.code, { center: true }), B(c, C.shop, "/shop", "link", { motion: false })], true)], BAR, { center: true })),
  r("bar-two", "announce", w("رسالتين، وحدة بكل طرف", "Two messages, one each side", "שתי הודעות, אחת בכל צד"), ["surface", "dark", "plain"], (c) =>
    strip(c, [STACK(c, [iconLine(c, "truck", RUNNING[0]), iconLine(c, "return", RUNNING[1])], { direction: "row", wrap: true, justify: "between", align: "center", gap: 16 })], BAR)),
  r("bar-links", "announce", w("شريط روابط سريعة", "A bar of quick links", "פס קישורים מהירים"), ["plain", "surface", "dark"], (c) =>
    strip(c, [STACK(c, [P(c, RUNNING[0], { quiet: false, motion: false, style: { size: 14, weight: 600 } }), menu(c, LINKS_HELP, { look: "plain" })], { direction: "row", wrap: true, justify: "between", align: "center", gap: 16 })], BAR)),
  r("bar-whatsapp", "announce", w("شريط واتساب", "A WhatsApp bar", "פס וואטסאפ"), ["soft", "bold", "dark"], (c) =>
    strip(c, [row(c, [ICON(c, "whatsapp", { size: 22, motion: false }), P(c, X.askUs, { quiet: false, motion: false, style: { weight: 600 } }), B(c, X.whatsapp, WHATSAPP, "link", { motion: false })], true)], BAR, { center: true })),
  r("bar-steps", "announce", w("شريط خطوات الطلب", "A bar of the order's steps", "פס שלבי ההזמנה"), ["surface", "soft", "plain"], (c) =>
    strip(c, [STACK(c, STEPS.map((s, i) => STACK(c, [H(c, num(i), 5, { motion: false, style: { color: pop(c), weight: 800 } }), P(c, s.title, { quiet: false, motion: false, style: { weight: 600, size: 15 } })], { direction: "row", gap: 8, align: "center" })), { direction: "row", wrap: true, gap: 36, justify: "center", align: "center" })], BAR, { pad: [16, 16, 16, 16] })),

  /* categories */
  r("cats-squares", "categories", w("مربعات وزر الكل", "Squares with a see-all", "ריבועים עם כפתור הכול"), ["plain", "surface", "soft"], (c) =>
    sec(c, [headRow(c, C.byCategory), categories(c, { look: "square", columns: 4, limit: 8 })], C.byCategory)),
  r("cats-two-big", "categories", w("قسمين كبار", "Two big ones", "שתיים גדולות"), ["plain", "dark"], (c) => sec(c, [categories(c, { look: "overlay", columns: 2, limit: 2 })], C.byCategory, { pad: [48, 24, 48, 24] })),
  r("cats-picture", "categories", w("صورة كبيرة وأقسام", "A big picture and categories", "תמונה גדולה וקטגוריות"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[overPic(c, c.pack.collection, (k) => [eyebrow(k, c.pack.label), H(k, C.byCategory, 2), picLink(k, C.all, "/shop")], { aspect: "1 / 1" })], [categories(c, { look: "square", columns: 2, limit: 4 })]], { gap: 24, align: "center" })], C.byCategory)),
  r("cats-banner-three", "categories", w("تلات عريضة وزر", "Three wide and a button", "שלוש רחבות וכפתור"), ["plain", "surface"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.label), H(c, C.byCategory, 2)]), categories(c, { look: "banner", columns: 3, limit: 3 }), foot(c, [B(c, C.all, "/shop", "outline")])], C.byCategory)),
  r("cats-bar", "categories", w("شريط كبسولات", "A bar of pills", "פס כפתורים"), ["surface", "plain", "dark"], (c) =>
    sec(c, [COLS(c, [1, 4], [[H(c, C.byCategory, 4, { motion: false })], [categories(c, { look: "pill", limit: 8 })]], { gap: 24, align: "center" })], C.byCategory, { pad: [24, 24, 24, 24] })),

  /* products */
  r("prod-two-rows", "products", w("جديد والأكثر مبيعاً", "New in, then best sellers", "חדש, ואז רבי מכר"), ["plain", "surface"], (c) =>
    sec(c, [headRow(c, C.newIn, "/shop?sort=new"), products(c, { source: "new", layout: "row", card: "plain" }), SPACER(c, 56), headRow(c, C.best), products(c, { source: "best", layout: "row", card: "plain" })], C.newIn)),
  r("prod-banner", "products", w("بانر ومنتجات", "A banner and products", "באנר ומוצרים"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 2], [[overPic(c, c.pack.collection, (k) => [eyebrow(k, C.newIn), H(k, c.pack.collection, 3), picLink(k, C.shop, "/shop")], { aspect: "3 / 5", phone: { aspect: "16 / 9" } })], [products(c, { source: "new", columns: 3, limit: 6, card: "plain" })]], { gap: 24 })], c.pack.collection)),
  r("prod-sticky", "products", w("عنوان ثابت ومنتجات بتمرّ", "A title that stays while products pass", "כותרת שנשארת ומוצרים שעוברים"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [1, 2], [[STACK(c, [eyebrow(c, c.pack.label), H(c, C.best, 2), P(c, c.pack.sub), hug(B(c, C.all, "/shop", "outline"))], { gap: 14, sticky: { top: 96 } })], [products(c, { source: "best", columns: 2, limit: 6, card: "lift" })]], { gap: 48, align: "start", cellStyle: { justify: "start" } })], C.best)),
  r("prod-deal", "products", w("عرض اليوم بعدّاد", "Today's deal with a countdown", "מבצע היום עם ספירה לאחור"), ["soft", "dark", "plain"], (c) =>
    sec(c, [COLS(c, [1, 2], [[badge(c, X.dealToday, { solid: true }), H(c, OFFER.title, 2), P(c, OFFER.use), countdown(c), B(c, C.shop, "/shop")], [products(c, { source: "best", columns: 3, limit: 3, card: c.skin === "dark" ? "bordered" : "shadow" })]], { gap: 40, align: "center" })], X.dealToday)),
  r("prod-reviews", "products", w("منتجات وتحتها آراء", "Products with reviews under", "מוצרים וביקורות מתחת"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [H(c, C.best, 2), rating(c, true)]), products(c, { source: "best", columns: 4, limit: 4, card: "plain" }), STACK(c, [quotes(c, "row", 3)], { margin: [40, 0, 0, 0] })], C.best)),
  r("prod-running", "products", w("عنوان ماشي ومنتجات", "A running title and products", "כותרת רצה ומוצרים"), ["plain", "dark"], (c) =>
    sec(c, [STACK(c, [marquee(c, [C.newIn, c.pack.collection, C.best], 56)], { margin: [0, 0, 32, 0] }), products(c, { source: "new", columns: 4, limit: 4, card: c.skin === "dark" ? "bordered" : "plain" })], C.newIn, { pad: [56, 24, 72, 24] })),
  r("prod-five", "products", w("خمسة بصف", "Five in a row", "חמישה בשורה"), ["plain", "surface"], (c) => sec(c, [headRow(c, C.picked), products(c, { source: "new", columns: 5, limit: 5, card: "plain" })], C.picked, { pad: [64, 24, 64, 24] })),
  r("prod-tabs", "products", w("منتجات بتبويبات", "Products in tabs", "מוצרים בלשוניות"), ["plain", "surface", "soft"], (c) =>
    sec(c, [head(c, [H(c, C.picked, 2)], true, 24), deck(c, [
      { label: C.newIn, kids: [products(c, { source: "new", columns: 4, limit: 4, card: "plain" })] },
      { label: C.best, kids: [products(c, { source: "best", columns: 4, limit: 4, card: "plain" })] },
    ], { arrows: false, dots: false })], C.picked)),
  r("prod-spotlight", "products", w("قطعة وحدة تحت الضو", "One piece in the spotlight", "פריט אחד באור הזרקורים"), ["soft", "plain", "dark"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, c.pack.product, { aspect: "1 / 1", shaped: true })], [badge(c, C.best), H(c, c.pack.product, 2), rating(c), P(c, c.pack.sub), ticks(c, PERKS.slice(0, 3).map((p) => p.title)), row(c, [B(c, c.pack.cta, "/shop"), B(c, SEE, "/shop", "link", { delay: 0.3 })])]], { gap: 56, align: "center" })], c.pack.product)),

  /* 3D */
  r("m3d-stage", "model", w("موديل على منصّة بضو وراه", "A model on a stand, lit from behind", "מודל על במה עם אור מאחור"), ["dark", "plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [
      [eyebrow(c, c.pack.label), H(c, c.pack.product, 2), P(c, c.pack.sub), ticks(c, PERKS.slice(0, 3).map((p) => p.title)), B(c, c.pack.cta, "/shop")],
      [MODEL(c, { props: { floor: "pedestal", backdrop: { kind: "glow", color: pop(c) }, intro: "rise", sparkles: { count: 24, color: pop(c) }, anim: { type: "float", speed: 0.8 } } })],
    ], { gap: 48, align: "center" })], c.pack.product)),
  r("m3d-finishes", "model", w("نفس الموديل بتلات خامات", "One model, three finishes", "מודל אחד, שלושה גימורים"), ["plain", "dark", "surface"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.label), H(c, c.pack.product, 2)]), GRID(c, 3, (["matte", "metal", "glass"] as const).map((finish, i) => CARD(c, [MODEL(c, { props: { finish, floor: "disc", anim: { type: "spin", speed: 0.5 }, auto: 0 } }), H(c, FINISHES[i], 5, { motion: false, style: { textAlign: "center" } })], { pad: [12, 12, 20, 12] })))], c.pack.product)),
  r("m3d-banner", "model", w("موديل وكلام كبير حواليه", "A model with big words around it", "מודל עם מילים גדולות סביבו"), ["bold", "dark", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1, 1], [[H(c, c.pack.collection, 2, { style: { size: 52, sizeMin: 30, weight: 800 } })], [MODEL(c, { props: { anim: { type: "orbit", speed: 0.8 }, floor: "halo" } })], [P(c, c.pack.sub, { quiet: false, style: { size: 18 } }), B(c, c.pack.cta, "/shop")]], { gap: 32, align: "center" })], c.pack.product)),
  r("m3d-steps", "model", w("موديل وخطوات", "A model and steps", "מודל ושלבים"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[MODEL(c, { props: { floor: "grid", backdrop: { kind: "rings", color: pop(c) }, tilt: true } })], [H(c, C.howItWorks, 2), STACK(c, STEPS.map((s, i) => step(c, s, i)), { gap: 20 }, mo.group(c))]], { gap: 48, align: "center" })], C.howItWorks)),

  /* perks */
  r("feat-bento", "features", w("بينتو مميزات", "A bento of perks", "בנטו יתרונות"), ["plain", "soft", "surface"], (c) => {
    const wide = (p: (typeof PERKS)[number]) => CARD(c, [ICON(c, p.icon, { size: 48 }), H(c, p.title, 3, { motion: false }), P(c, p.text, { motion: false })], { col: "span 2", pad: [36, 32, 36, 32] });
    return sec(c, [head(c, [eyebrow(c, c.pack.label), H(c, C.why, 2)]), GRID(c, 3, [wide(PERKS[0]), perk(c, PERKS[1], { card: true }), perk(c, PERKS[2], { card: true }), wide(PERKS[3])])], C.why);
  }),
  r("feat-list", "features", w("قائمة بخطوط", "A list with lines", "רשימה עם קווים"), ["plain", "surface", "dark"], (c) =>
    sec(c, [COLS(c, [1, 2], [
      [eyebrow(c, c.pack.label), H(c, C.why, 2), P(c, c.pack.sub)],
      [STACK(c, PERKS.slice(0, 4).flatMap((p, i) => [
        ...(i ? [DIVIDER(c)] : []),
        STACK(c, [STACK(c, [ICON(c, p.icon, { size: 24, motion: false }), H(c, p.title, 4, { motion: false })], { direction: "row", gap: 12, align: "center" }), P(c, p.text, { motion: false })], { direction: "row", justify: "between", align: "center", wrap: true, gap: 12 }),
      ]), { gap: 18 })],
    ], { gap: 56 })], C.why)),
  r("feat-around", "features", w("صورة بالنص ومميزات حواليها", "A picture with perks around it", "תמונה במרכז ויתרונות סביבה"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [H(c, C.why, 2)]), COLS(c, [1, 1, 1], [PERKS.slice(0, 2).map((p) => perk(c, p)), [IMG(c, c.pack.product, { aspect: "3 / 4", radius: 0, style: { shape: "arch" } })], PERKS.slice(2, 4).map((p) => perk(c, p))], { gap: 40, align: "center", cellStyle: { gap: 40 } })], C.why)),
  r("feat-big-icons", "features", w("تلات كروت بأيقونات كبار", "Three cards with big icons", "שלושה כרטיסים עם אייקונים גדולים"), ["soft", "plain", "bold"], (c) =>
    sec(c, [GRID(c, 3, PERKS.slice(0, 3).map((p) => CARD(c, [ICON(c, p.icon, { size: 64 }), H(c, p.title, 3, { motion: false }), P(c, p.text, { motion: false })], { align: "center", textAlign: "center", pad: [44, 28, 44, 28], gap: 16 })))], C.why)),
  r("feat-ticks", "features", w("قائمة صح وصورة", "A tick list and a picture", "רשימת וי ותמונה"), ["plain", "surface", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, c.pack.label), H(c, C.why, 2), P(c, c.pack.sub), ticks(c, PERKS.map((p) => p.title)), B(c, c.pack.cta, "/shop")], [IMG(c, c.pack.product, { aspect: "4 / 5", shaped: true })]], { gap: 56, align: "center", phone: "reverse" })], C.why)),
  r("feat-two-rows", "features", w("ستة بأيقونة عالجنب", "Six with the icon at the side", "שישה עם אייקון בצד"), ["plain", "surface"], (c) =>
    sec(c, [head(c, [H(c, C.why, 2)]), GRID(c, 2, PERKS.map((p) => STACK(c, [ICON(c, p.icon, { size: 32, motion: false }), STACK(c, [H(c, p.title, 4, { motion: false }), P(c, p.text, { motion: false })], { gap: 4 })], { direction: "row", gap: 16, align: "start" })), { gap: 32 })], C.why)),
  r("feat-numbers", "features", w("مميزات وأرقام", "Perks and numbers", "יתרונות ומספרים"), ["plain", "dark"], (c) =>
    sec(c, [COLS(c, [1, 1], [[H(c, C.why, 2), P(c, c.pack.sub), ticks(c, PERKS.slice(0, 4).map((p) => p.title))], [GRID(c, 2, STATS.map((s) => stat(c, s, true)), { gap: 16, phone: 2 })]], { gap: 56, align: "center" })], C.why)),
  r("feat-running", "features", w("مميزات وتحتها كلام ماشي", "Perks with running words under", "יתרונות ומתחתם מילים רצות"), ["bold", "dark", "soft"], (c) =>
    sec(c, [GRID(c, 4, PERKS.slice(0, 4).map((p) => perk(c, p, { center: true, small: true })), { gap: 24, phone: 2 }), STACK(c, [marquee(c, RUNNING, 22)], { margin: [40, 0, 0, 0] })], C.why, { pad: [56, 24, 40, 24] })),

  /* our story */
  r("story-letter", "story", w("رسالة من المؤسِّسة", "A letter from the founder", "מכתב מהמייסדת"), ["soft", "plain", "surface"], (c) =>
    sec(c, [narrow(c, [
      eyebrow(c, C.ourStory), H(c, X.letterTitle, 2), P(c, c.pack.story, { style: { size: 19, lineHeight: 1.9 } }), P(c, X.letterMore, { style: { size: 19, lineHeight: 1.9 } }),
      STACK(c, [IMG(c, PEOPLE[0][0], { aspect: "1 / 1", radius: 999, motion: false, style: { width: "64px" } }), STACK(c, [H(c, PEOPLE[0][0], 5, { motion: false }), P(c, PEOPLE[0][1], { motion: false, style: { size: 14 } })], { gap: 0 })], { direction: "row", gap: 14, align: "center" }),
    ])], C.ourStory, { pad: [96, 24, 96, 24] })),
  r("story-numbers", "story", w("قصة وتحتها أرقام", "A story with numbers under", "סיפור ומספרים מתחת"), ["plain", "surface", "dark"], (c) =>
    sec(c, [col(c, [
      COLS(c, [1, 1], [[IMG(c, C.ourStory, { aspect: "4 / 3" })], [eyebrow(c, C.ourStory), H(c, c.pack.title, 2), P(c, c.pack.story)]], { gap: 56, align: "center" }),
      DIVIDER(c),
      GRID(c, 4, STATS.map((s) => stat(c, s)), { phone: 2 }),
    ], 48)], C.ourStory)),
  r("story-two-pics", "story", w("صورتين فوق بعض وقصة", "Two overlapping pictures and a story", "שתי תמונות חופפות וסיפור"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [
      [STACK(c, [IMG(c, C.ourStory, { aspect: "4 / 5", style: { width: "78%" } }), IMG(c, C.ourStory, { aspect: "1 / 1", motion: false, style: { width: "46%", layer: { x: 100, y: 100, anchor: "bottom-end" }, z: 2, border: { width: 6, color: "bg" }, shadow: "lg" } })], { gap: 0, pad: [0, 0, 40, 0] })],
      [eyebrow(c, C.ourStory), H(c, c.pack.title, 2), P(c, c.pack.story, { style: { size: 18 } }), B(c, C.more, "/about", "outline")],
    ], { gap: 56, align: "center" })], C.ourStory)),
  r("story-cards", "story", w("مشوارنا بكروت", "Our journey in cards", "המסע שלנו בכרטיסים"), ["plain", "soft", "dark"], (c) =>
    sec(c, [head(c, [eyebrow(c, C.ourStory), H(c, X.journey, 2)]), GRID(c, 4, TIMELINE.map(([year, text]) => CARD(c, [H(c, year, 3, { motion: false, style: { color: pop(c), size: 32, weight: 800 } }), P(c, text, { quiet: false, motion: false })])), { gap: 16 })], C.ourStory)),
  r("story-line", "story", w("مشوارنا على خط زمني", "Our journey on a timeline", "המסע שלנו על ציר זמן"), ["plain", "surface"], (c) =>
    sec(c, [head(c, [eyebrow(c, C.ourStory), H(c, X.journey, 2), P(c, c.pack.story, { style: { maxWidth: "640px" } })]), narrow(c, [EL(c, "schedule", { label: say(c, X.journey), layout: "timeline", items: TIMELINE.map(([year, text]) => ({ day: say(c, year), time: "", title: say(c, text) })) }, { style: { self: "stretch" } })], "760px")], C.ourStory)),
  r("story-wide", "story", w("صورة عريضة وجملة فوقها", "A wide picture with a line over it", "תמונה רחבה ומשפט עליה"), ["plain"], (c) =>
    sec(c, [overPic(c, C.ourStory, (k) => [eyebrow(k, C.ourStory), H(k, c.pack.story, 2, { style: { size: 32, lineHeight: 1.4, weight: 500 } }), picLink(k, C.more, "/about", "outline")], { aspect: "21 / 9", at: "center", dim: 0.5, radius: 28, phone: { aspect: "3 / 4" } })], C.ourStory, { pad: [48, 24, 48, 24] })),

  /* picture and words */
  r("split-card-over", "split", w("كرت كلام راكب عالصورة", "A card of words riding the picture", "כרטיס מילים שיושב על התמונה"), ["plain", "soft", "surface"], (c) =>
    sec(c, [STACK(c, [
      IMG(c, c.pack.collection, { aspect: "16 / 9", style: { width: "72%" }, phone: { width: "100%", aspect: "4 / 3" } }),
      onPhone(CARD(c, [eyebrow(c, c.pack.label), H(c, c.pack.collection, 2), P(c, c.pack.sub), hug(B(c, c.pack.cta, "/shop"))], { width: "44%", layer: { x: 100, y: 50, anchor: "end" }, z: 2, shadow: "lg", bg: "bg", pad: [36, 32, 36, 32] }), { layer: false, width: "92%", self: "center", margin: [-40, 0, 0, 0] }),
    ], { gap: 0 })], c.pack.collection)),
  r("split-two", "split", w("صورتين وكلام بالنص", "Two pictures, words between", "שתי תמונות ומילים באמצע"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1, 1], [[IMG(c, c.pack.collection, { aspect: "3 / 4" })], [eyebrow(c, c.pack.label), H(c, c.pack.collection, 2), P(c, c.pack.sub), B(c, c.pack.cta, "/shop")], [IMG(c, c.pack.product, { aspect: "3 / 4", style: { moveY: 32 } })]], { gap: 40, align: "center", cellStyle: { align: "center", textAlign: "center" } })], c.pack.collection)),
  r("split-zigzag", "split", w("صفّين متعاكسين", "Two rows, turned about", "שתי שורות הפוכות"), ["plain", "surface"], (c) =>
    sec(c, [col(c, [
      COLS(c, [1, 1], [[IMG(c, c.pack.collection, { aspect: "4 / 3" })], [eyebrow(c, c.pack.label), H(c, c.pack.collection, 2), P(c, c.pack.sub), B(c, c.pack.cta, "/shop", "link")]], { gap: 56, align: "center" }),
      COLS(c, [1, 1], [[eyebrow(c, C.ourStory), H(c, c.pack.product, 2), P(c, c.pack.story), B(c, C.more, "/about", "link")], [IMG(c, c.pack.product, { aspect: "4 / 3" })]], { gap: 56, align: "center", phone: "reverse" }),
    ], 72)], c.pack.collection)),
  r("split-quote", "split", w("صورة وكلام ورأي زبون", "A picture, words and a review", "תמונה, מילים וביקורת"), ["plain", "soft", "dark"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, c.pack.collection, { aspect: "4 / 5", shaped: true })], [
      eyebrow(c, c.pack.label), H(c, c.pack.collection, 2), P(c, c.pack.sub),
      CARD(c, [P(c, QUOTES[0].quote, { quiet: false, motion: false, style: { italic: true } }), P(c, QUOTES[0].name, { motion: false, style: { size: 14, weight: 700 } })], { pad: [20, 20, 20, 20] }),
      B(c, c.pack.cta, "/shop"),
    ]], { gap: 56, align: "center" })], c.pack.collection)),
  r("split-full", "split", w("نص صورة ونص كلام، من الطرف للطرف", "Half picture, half words, edge to edge", "חצי תמונה וחצי מילים, מקצה לקצה"), ["soft", "bold", "dark", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, c.pack.collection, { aspect: "1 / 1", radius: 0 })], [STACK(c, [eyebrow(c, c.pack.label), H(c, c.pack.collection, 2), P(c, c.pack.sub), row(c, [B(c, c.pack.cta, "/shop")])], { gap: 16, pad: [48, 48, 48, 48], maxWidth: "560px" })]], { gap: 0, align: "center" })], c.pack.collection, { full: true, pad: [0, 0, 0, 0], phone: { pad: [0, 0, 0, 0] } })),

  /* galleries */
  r("gal-filter", "gallery", w("معرض بفلاتر", "A gallery with filters", "גלריה עם סינון"), ["plain", "surface"], (c) => sec(c, [head(c, [H(c, X.gallery, 2), P(c, X.gallerySub)]), gallery(c, 6)], X.gallery)),
  r("gal-masonry", "gallery", w("حيط صور", "A wall of pictures", "קיר תמונות"), ["plain", "dark"], (c) => sec(c, [head(c, [H(c, X.gallery, 2)]), gallery(c, 8, { layout: "masonry", columns: 4, gap: 12, filters: false, hoverEffect: "reveal" })], X.gallery)),
  r("gal-bento", "gallery", w("بينتو صور", "A bento of pictures", "בנטו תמונות"), ["plain", "soft"], (c) => sec(c, [head(c, [eyebrow(c, c.pack.collection), H(c, X.gallery, 2)], false), gallery(c, 4, { layout: "bento", filters: false, hoverEffect: "zoom" })], X.gallery)),
  r("gal-split", "gallery", w("صورة كبيرة وقائمة جنبها", "A big picture with a list beside it", "תמונה גדולה ורשימה לצידה"), ["plain", "surface"], (c) => sec(c, [head(c, [H(c, X.gallery, 2)], false), gallery(c, 4, { layout: "split", filters: false, lightbox: false, activation: "hover", hoverEffect: "none" })], X.gallery)),
  r("gal-four", "gallery", w("أربع صور طالعة نازلة", "Four pictures, up and down", "ארבע תמונות, למעלה ולמטה"), ["plain", "soft", "dark"], (c) =>
    sec(c, [head(c, [H(c, c.pack.collection, 2)], true, 56), GRID(c, 4, [0, 1, 2, 3].map((i) => IMG(c, c.pack.collection, { aspect: "3 / 5", style: { moveY: i % 2 ? 36 : 0 } })), { gap: 16, phone: 2 })], c.pack.collection, { pad: [88, 24, 120, 24] })),
  r("gal-captions", "gallery", w("صورتين كبار بكلام تحتهم", "Two big pictures with words under", "שתי תמונות גדולות עם מילים מתחת"), ["plain", "surface"], (c) =>
    sec(c, [GRID(c, 2, [c.pack.collection, c.pack.product].map((t) => STACK(c, [IMG(c, t, { aspect: "4 / 3" }), H(c, t, 4, { motion: false }), P(c, c.pack.sub, { motion: false, style: { size: 15 } }), hug(B(c, C.shop, "/shop", "link", { motion: false }))], { gap: 10 })), { gap: 32 })], c.pack.collection)),
  r("gal-peek", "gallery", w("صور بتتقلّب وبتطل من الجنب", "Turning pictures that peek from the side", "תמונות מתחלפות שמציצות מהצד"), ["plain", "dark", "soft"], (c) =>
    sec(c, [head(c, [H(c, c.pack.collection, 2)]), slides(c, 5, { look: "peek", aspect: "16 / 9", autoplay: 4 }, undefined, {})], c.pack.collection, { pad: [72, 0, 72, 0], full: true })),

  /* lookbook */
  r("look-two", "lookbook", w("إطلالتين جنب بعض", "Two looks side by side", "שני לוקים זה לצד זה"), ["plain", "surface"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.collection), H(c, C.look, 2)]), GRID(c, 2, [0, 1].map(() => EL(c, "hotspots", { src: pic(c), alt: say(c, c.pack.collection), items: looks(c) }, { style: { radius: 20 } })), { gap: 24 })], C.look)),
  r("look-list", "lookbook", w("إطلالة وقائمة قطعها", "A look and the list of its pieces", "לוק ורשימת הפריטים שלו"), ["plain", "soft", "dark"], (c) =>
    sec(c, [COLS(c, [1, 1], [
      [eyebrow(c, c.pack.collection), H(c, C.look, 2), P(c, c.pack.sub), STACK(c, [c.pack.product, c.pack.collection, C.newIn].flatMap((t, i) => [...(i ? [DIVIDER(c)] : []), STACK(c, [STACK(c, [H(c, num(i), 5, { motion: false, style: { color: pop(c) } }), H(c, t, 5, { motion: false })], { direction: "row", gap: 14, align: "center" }), B(c, SEE, "/shop", "link", { motion: false })], { direction: "row", gap: 14, align: "center", justify: "between" })]), { gap: 14 })],
      [EL(c, "hotspots", { src: pic(c), alt: say(c, c.pack.collection), items: looks(c) }, { style: { self: "stretch", radius: 20 } })],
    ], { gap: 56, align: "center" })], C.look)),
  r("look-slides", "lookbook", w("إطلالات بتتقلّب مع كلام", "Looks that turn, with words", "לוקים מתחלפים עם מילים"), ["plain", "dark"], (c) =>
    sec(c, [slides(c, 3, { captionPosition: "split", effect: "fade", aspect: "16 / 9", look: "rounded" }, (i) => ({ title: say(c, [c.pack.collection, c.pack.product, C.newIn][i % 3]), text: say(c, c.pack.sub), cta: say(c, C.look), href: "/shop" }), {})], C.look)),

  /* banners */
  r("banner-wide", "banner", w("بانر عريض", "A wide banner", "באנר רחב"), ["plain", "surface", "soft"], (c) =>
    sec(c, [overPic(c, c.pack.collection, (k) => [eyebrow(k, c.pack.eyebrow), H(k, c.pack.collection, 2, { style: { size: 44 } }), P(k, c.pack.sub, { style: { maxWidth: "460px" } }), row(k, [B(k, c.pack.cta, "/shop")])], { aspect: "21 / 9", at: "start", radius: 28, phone: { aspect: "4 / 5" } })], c.pack.collection, { pad: [40, 24, 40, 24] })),
  r("banner-two", "banner", w("بانرين جنب بعض", "Two banners side by side", "שני באנרים זה לצד זה"), ["plain", "surface"], (c) =>
    sec(c, [GRID(c, 2, [c.pack.collection, C.newIn].map((t) => overPic(c, t, (k) => [H(k, t, 3), picLink(k, C.shop, "/shop")], { aspect: "4 / 3" })), { gap: 24 })], c.pack.collection, { pad: [40, 24, 40, 24] })),
  r("banner-three", "banner", w("تلات بانرات طولية", "Three tall banners", "שלושה באנרים גבוהים"), ["plain", "soft", "dark"], (c) =>
    sec(c, [head(c, [H(c, c.pack.collection, 2)]), GRID(c, 3, [C.newIn, C.best, c.pack.collection].map((t) => overPic(c, t, (k) => [H(k, t, 4), picLink(k, C.shop, "/shop")], { aspect: "3 / 4" })), { gap: 16 })], c.pack.collection)),
  r("banner-mosaic", "banner", w("بانر كبير وتنين صغار", "One big banner and two small", "באנר גדול ושניים קטנים"), ["plain", "surface"], (c) =>
    sec(c, [GRID(c, 3, [
      onPhone(STACK(c, [overPic(c, c.pack.collection, (k) => [eyebrow(k, c.pack.eyebrow), H(k, c.pack.collection, 2), row(k, [B(k, c.pack.cta, "/shop")])], { aspect: "1 / 1" })], { col: "span 2", row: "span 2", gap: 0 }), { col: "span 2" }),
      overPic(c, C.newIn, (k) => [H(k, C.newIn, 4), picLink(k, C.shop, "/shop?sort=new")], { aspect: "1 / 1" }),
      overPic(c, C.best, (k) => [H(k, C.best, 4), picLink(k, C.shop, "/shop")], { aspect: "1 / 1" }),
    ], { gap: 16, phone: 2 })], c.pack.collection, { pad: [40, 24, 40, 24] })),
  r("banner-offer", "banner", w("بانر عرض بكود", "An offer banner with a code", "באנר מבצע עם קוד"), ["plain"], (c) =>
    sec(c, [overPic(c, OFFER.title, (k) => [badge(k, C.ends, { center: true, solid: true }), H(k, OFFER.title, 2, { style: { size: 48 } }), H(k, OFFER.code, 3, { motion: false, style: { letterSpacing: 6, size: 30 } }), row(k, [B(k, C.shop, "/shop")], true)], { aspect: "21 / 9", at: "center", dim: 0.5, radius: 0, pic: { height: "56vh", aspect: undefined }, phone: { height: "64vh" } })], OFFER.title, { full: true, pad: [0, 0, 0, 0], phone: { pad: [0, 0, 0, 0] } })),
  r("banner-strip", "banner", w("شريط صورة بجملة", "A slim picture with one line", "פס תמונה עם שורה אחת"), ["plain"], (c) =>
    sec(c, [overPic(c, c.pack.collection, (k) => [H(k, c.pack.title, 3), picLink(k, c.pack.cta, "/shop")], { aspect: "21 / 9", at: "center", radius: 0, pic: { height: "240px", aspect: undefined } })], c.pack.collection, { full: true, pad: [0, 0, 0, 0], phone: { pad: [0, 0, 0, 0] } })),
  r("banner-box", "banner", w("صندوق بلون المتجر وصورة", "A box in the store's colour with a picture", "קופסה בצבע החנות עם תמונה"), ["plain", "surface"], (c) => {
    const k = withSkin(c, "bold");
    return sec(c, [STACK(c, [COLS(c, [1, 1], [[STACK(k, [eyebrow(k, c.pack.eyebrow), H(k, c.pack.collection, 2), P(k, c.pack.sub), row(k, [B(k, c.pack.cta, "/shop")])], { gap: 14, pad: [48, 40, 48, 40] })], [IMG(c, c.pack.collection, { aspect: "4 / 3", radius: 0 })]], { gap: 0, align: "center", phone: "reverse" })], { gap: 0, radius: 28, overflow: "hidden", bg: "accent", color: "accent-contrast" })], c.pack.collection, { pad: [40, 24, 40, 24] });
  }),

  /* showcases */
  r("show-panels", "showcase", w("لوحات بتفتح عالجنب", "Panels that open sideways", "לוחות שנפתחים לצדדים"), ["plain", "surface", "dark"], (c) => sec(c, [head(c, [eyebrow(c, c.pack.label), H(c, c.pack.collection, 2)]), panels(c)], c.pack.collection)),
  r("show-vertical", "showcase", w("كلام ولوحات فوق بعض", "Words and panels one over another", "מילים ולוחות זה מעל זה"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 2], [[eyebrow(c, c.pack.label), H(c, c.pack.collection, 2), P(c, c.pack.sub), B(c, C.all, "/shop", "outline")], [panels(c, { layout: "vertical", height: 560, activation: "click" })]], { gap: 48, align: "center" })], c.pack.collection)),
  r("show-clay", "showcase", w("لوحات ناعمة", "Soft panels", "לוחות רכים"), ["soft", "plain"], (c) => sec(c, [head(c, [H(c, c.pack.collection, 2), P(c, c.pack.sub, { style: { maxWidth: "560px" } })]), panels(c, { look: "clay", activation: "click", height: 440, ratio: 3 })], c.pack.collection)),
  r("show-deck", "showcase", w("عرض شرائح", "A presentation of slides", "מצגת שקפים"), ["plain", "surface", "dark"], (c) =>
    sec(c, [deck(c, [c.pack.collection, c.pack.product, C.ourStory].map((t, i) => ({
      label: t,
      kids: [COLS(c, [1, 1], [[IMG(c, t, { aspect: "4 / 3", motion: false })], [eyebrow(c, num(i), { motion: false }), H(c, t, 2, { motion: false }), P(c, i === 2 ? c.pack.story : c.pack.sub, { motion: false }), B(c, i === 2 ? C.more : C.shop, i === 2 ? "/about" : "/shop", "solid", { motion: false })]], { gap: 48, align: "center" })],
    })), { presentation: "deck", transition: "slide" })], c.pack.collection)),
  r("show-side-tabs", "showcase", w("تبويبات عالجنب", "Tabs down the side", "לשוניות בצד"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [H(c, C.why, 2)], false, 32), deck(c, PERKS.slice(0, 4).map((p) => ({
      label: p.title,
      kids: [COLS(c, [1, 1], [[ICON(c, p.icon, { size: 44, motion: false }), H(c, p.title, 3, { motion: false }), P(c, p.text, { motion: false }), B(c, C.more, "/about", "link", { motion: false })], [IMG(c, p.title, { aspect: "4 / 3", motion: false })]], { gap: 32, align: "center" })],
    })), { presentation: "vertical-tabs", arrows: false, dots: false })], C.why)),
  r("show-index", "showcase", w("فهرس أسماء بصور", "An index of names with pictures", "אינדקס שמות עם תמונות"), ["plain", "dark"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.label), H(c, c.pack.collection, 2)], false), gallery(c, 6, { presentation: "index", layout: "split", filters: false, lightbox: false, activation: "hover", hoverEffect: "none" })], c.pack.collection)),
];
