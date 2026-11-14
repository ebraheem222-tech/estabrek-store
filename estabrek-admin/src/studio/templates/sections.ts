/**
 * The section library: ready sections by category (openings, products, 3D, perks, story,
 * offers, headers, footers, popups, campaigns…), each in the skins that suit it. A
 * template is a recipe and a skin; it's built for the store's kind, language and motion
 * when it's used (build.ts), so every theme and every kind of store gets its own words.
 * More recipes live in sectionsStore.ts (the store's front) and sectionsTrust.ts (what wins a customer over).
 */
import { B, CARD, COLS, EL, GRID, H, ICON, IMG, MODEL, P, STACK, edge, eyebrow, mo, patternOf, pic, pop, say, type Ctx, type N, type Skin } from "./build";
import { C, CAMPAIGNS, LINKS_HELP, LINKS_MAIN, LINKS_SOCIAL, PERKS, RUNNING, SHIPPING_QA, STATS, STEPS, VALUES, w, type Campaign, type W } from "./words";
import { TIMELINE, OFFER, DETAIL_TABS, BUNDLES, PEOPLE, RIGHTS, WHATSAPP, OUT_OF, QUESTIONS, TRIOS, row, ctas, head, items, sec, strip, products, categories, accordion, quotes, countdown, form, marquee, menu, perk, stat, step, looks, storeName } from "./parts";
import { popup } from "./partsMore";
import { STORE_RECIPES } from "./sectionsStore";
import { TRUST_RECIPES } from "./sectionsTrust";

export const SECTION_CATS = [
  "hero", "announce", "categories", "products", "banner", "model", "showcase", "features", "story", "split", "gallery", "lookbook", "testimonials", "trust", "stats", "data",
  "steps", "faq", "cta", "newsletter", "offer", "pricing", "team", "compare", "details", "contact", "header", "footer", "notice", "popup", "campaign",
] as const;
export type SectionCat = (typeof SECTION_CATS)[number];

export const CAT_NAMES: Record<SectionCat, W> = {
  hero: w("افتتاحيات", "Openings", "פתיחים"),
  announce: w("شرائط إعلان", "Announcement bars", "פסי הודעות"),
  categories: w("الأقسام", "Categories", "קטגוריות"),
  products: w("منتجات", "Products", "מוצרים"),
  banner: w("بانرات", "Banners", "באנרים"),
  showcase: w("عروض تفاعلية", "Showcases", "תצוגות"),
  trust: w("ثقة وضمانات", "Trust and promises", "אמון והבטחות"),
  data: w("جداول ومعلومات", "Tables and information", "טבלאות ומידע"),
  model: w("عرض 3D", "3D showcase", "תצוגת תלת־ממד"),
  features: w("مميزات", "Perks", "יתרונות"),
  story: w("قصتنا", "Our story", "הסיפור שלנו"),
  split: w("صورة وكلام", "Picture and words", "תמונה ומילים"),
  gallery: w("معارض صور", "Galleries", "גלריות"),
  lookbook: w("لوك بوك", "Lookbook", "לוקבוק"),
  testimonials: w("آراء الزباين", "Reviews", "ביקורות"),
  stats: w("أرقام", "Numbers", "מספרים"),
  steps: w("خطوات", "Steps", "שלבים"),
  faq: w("أسئلة", "Questions", "שאלות"),
  cta: w("دعوة للشراء", "Calls to action", "קריאה לפעולה"),
  newsletter: w("النشرة البريدية", "Newsletter", "ניוזלטר"),
  offer: w("عروض وعدّادات", "Offers and countdowns", "מבצעים וספירה לאחור"),
  pricing: w("باقات وأسعار", "Bundles and prices", "חבילות ומחירים"),
  team: w("الفريق", "Team", "צוות"),
  compare: w("قبل وبعد", "Before and after", "לפני ואחרי"),
  details: w("تفاصيل بتبويبات", "Details in tabs", "פרטים בלשוניות"),
  contact: w("تواصل", "Contact", "יצירת קשר"),
  header: w("هيدر", "Headers", "כותרות עליונות"),
  footer: w("فوتر", "Footers", "כותרות תחתונות"),
  notice: w("صفحات خاصة", "Special pages", "עמודים מיוחדים"),
  popup: w("نوافذ منبثقة", "Popups", "חלונות קופצים"),
  campaign: w("مناسبات وحملات", "Occasions and campaigns", "אירועים וקמפיינים"),
};

export type SectionRecipe = { key: string; cat: SectionCat; name: W; skins: Skin[]; build: (c: Ctx) => N; campaign?: Campaign };

/* ---------------------------------------------------------------- recipes */

const r = (key: string, cat: SectionCat, name: W, skins: Skin[], build: (c: Ctx) => N): SectionRecipe => ({ key, cat, name, skins, build });

export const RECIPES: SectionRecipe[] = [
  /* openings */
  r("hero-center", "hero", w("في النص", "Centred", "במרכז"), ["plain", "soft", "bold", "dark"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19, maxWidth: "620px" } }), ctas(c, true)], true, 0)], C.welcome, { pad: [120, 24, 120, 24] })),
  r("hero-split", "hero", w("كلام وصورة", "Words and a picture", "מילים ותמונה"), ["plain", "soft", "surface", "dark"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19 } }), ctas(c)], [IMG(c, c.pack.product, { shaped: true })]], { gap: 56, align: "center" })], C.welcome)),
  r("hero-split-pic", "hero", w("صورة وكلام", "A picture and words", "תמונה ומילים"), ["plain", "soft", "bold"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, c.pack.product, { aspect: "1 / 1", radius: 999 })], [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19 } }), ctas(c)]], { gap: 56, align: "center" })], C.welcome)),
  r("hero-model", "hero", w("كلام وموديل 3D", "Words and a 3D model", "מילים ומודל תלת־ממד"), ["plain", "soft", "dark", "bold"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19 } }), ctas(c)], [MODEL(c)]], { gap: 40, align: "center" })], C.welcome)),
  r("hero-cover", "hero", w("صورة كاملة وكلام فوقها", "A full picture with words over it", "תמונה מלאה עם מילים עליה"), ["plain"], (c) =>
    sec(c, [
      IMG(c, c.pack.product, { aspect: "16 / 9", radius: 0, style: { height: "82vh", aspect: undefined, overlay: { color: "#000000", opacity: 0.38 } }, phone: { height: "72vh" } }),
      STACK(c, [eyebrow(c, c.pack.eyebrow, { style: { color: "white" } }), H(c, c.pack.title, 1, { style: { color: "white" } }), P(c, c.pack.sub, { style: { color: "white", size: 19, opacity: 0.9 } }), row(c, [B(c, c.pack.cta, "/shop")], true)], { align: "center", textAlign: "center", width: "90%", maxWidth: "760px", layer: { x: 50, y: 50, anchor: "center" }, z: 2 }),
    ], C.welcome, { full: true, pad: [0, 0, 0, 0], phone: { pad: [0, 0, 0, 0] } })),
  r("hero-type", "hero", w("كلام كبير", "Big type", "טקסט גדול"), ["plain", "dark", "soft"], (c) =>
    sec(c, [
      head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1, { style: { size: 104, sizeMin: 46, lineHeight: 1.05, fill: { color: "accent", to: c.skin === "dark" ? "bg" : "text", angle: 120 } } }), P(c, c.pack.sub, { style: { size: 19, maxWidth: "620px" } }), ctas(c, true)], true, 48),
      marquee(c, RUNNING),
    ], C.welcome, { pad: [110, 24, 64, 24] })),
  r("hero-particles", "hero", w("نجوم وفقاعات", "Stars and bubbles", "כוכבים ובועות"), ["dark", "bold", "soft"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19, maxWidth: "620px" } }), ctas(c, true)], true, 0)], C.welcome, {
      pad: [140, 24, 140, 24], props: { particles: { kind: c.pack.particles ?? "sparkles", color: pop(c), amount: 1 } },
    })),
  r("hero-pattern", "hero", w("نقشة وموجة", "A pattern and a wave", "דוגמה וגל"), ["soft", "plain", "bold"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19, maxWidth: "620px" } }), ctas(c, true)], true, 0)], C.welcome, {
      pad: [120, 24, 150, 24], style: patternOf(c, "dots", c.skin === "bold" ? "accent-contrast" : "accent", 22, 0.18), props: { edges: edge(c, "wave") },
    })),
  r("hero-pictures", "hero", w("كلام وصورتين", "Words and two pictures", "מילים ושתי תמונות"), ["plain", "surface", "soft"], (c) =>
    sec(c, [COLS(c, [3, 2], [
      [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19 } }), ctas(c)],
      [GRID(c, 2, [IMG(c, c.pack.product, { aspect: "3 / 4" }), IMG(c, c.pack.collection, { aspect: "3 / 4", style: { moveY: 40 } })], { gap: 16, phone: 2 })],
    ], { gap: 48, align: "center" })], C.welcome)),
  r("hero-search", "hero", w("بحث وأقسام", "Search and categories", "חיפוש וקטגוריות"), ["soft", "plain", "dark"], (c) =>
    sec(c, [head(c, [H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19, maxWidth: "620px" } }), EL(c, "search", { look: "pill", button: say(c, w("ابحثوا", "Search", "חיפוש")) }, { style: { self: "stretch", maxWidth: "620px", margin: [8, 0, 8, 0] } }), categories(c, { look: "pill", limit: 6 })], true, 0)], C.welcome, { pad: [110, 24, 110, 24] })),
  r("hero-countdown", "hero", w("إطلاق بعدّاد", "A launch with a countdown", "השקה עם ספירה לאחור"), ["dark", "bold", "plain"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, C.launch), H(c, c.pack.product, 1), P(c, c.pack.sub), countdown(c), row(c, [B(c, C.preorder, "/shop")])], [MODEL(c, { props: { anim: { type: "spin", speed: 0.6 } } })]], { gap: 40, align: "center" })], C.launch)),
  r("hero-stats", "hero", w("كلام وأرقام", "Words and numbers", "מילים ומספרים"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [
      [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), P(c, c.pack.sub, { style: { size: 19 } }), ctas(c), GRID(c, 3, STATS.slice(0, 3).map((s) => stat(c, s)), { gap: 16, phone: 3 })],
      [IMG(c, c.pack.product)],
    ], { gap: 56, align: "center" })], C.welcome)),
  r("hero-slider", "hero", w("عنوان وصور بتتقلّب", "A title and turning pictures", "כותרת ותמונות מתחלפות"), ["plain", "surface"], (c) =>
    sec(c, [
      head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 1), ctas(c, true)]),
      EL(c, "slider", { slides: [0, 1, 2].map(() => ({ src: pic(c), kind: "image" })), autoplay: 5, loop: true, arrows: true, dots: true, aspect: "21 / 9" }, { style: { radius: 24 }, phone: undefined, motion: mo.pic(c) }),
    ], C.welcome)),

  /* announcement bars */
  r("bar-alert", "announce", w("شريط عرض", "An offer bar", "פס מבצע"), ["plain"], (c) => strip(c, [EL(c, "alert", { text: say(c, RUNNING[0]), kind: "promo", close: true })], w("شريط", "Bar", "פס"))),
  r("bar-marquee", "announce", w("كلام ماشي", "Running words", "מילים רצות"), ["bold", "dark", "soft"], (c) => strip(c, [marquee(c, RUNNING)], w("شريط", "Bar", "פס"))),
  r("bar-countdown", "announce", w("شريط بعدّاد", "A bar with a countdown", "פס עם ספירה לאחור"), ["bold", "dark"], (c) =>
    strip(c, [row(c, [P(c, OFFER.title, { quiet: false, motion: false, style: { weight: 700 } }), countdown(c, "plain"), B(c, C.shop, "/shop", "link")], true)], w("شريط", "Bar", "פס"), { center: true })),
  r("bar-perks", "announce", w("شريط مميزات", "A perks bar", "פס יתרונות"), ["surface", "soft", "plain"], (c) =>
    strip(c, [STACK(c, PERKS.slice(0, 3).map((p) => STACK(c, [ICON(c, p.icon, { size: 22, motion: false }), P(c, p.title, { quiet: false, motion: false, style: { weight: 600, size: 15 } })], { direction: "row", gap: 8, align: "center" })), { direction: "row", wrap: true, gap: 28, justify: "center", align: "center" })], w("شريط", "Bar", "פס"), { pad: [18, 16, 18, 16] })),
  r("bar-big", "announce", w("كلام كبير ماشي", "Big running words", "מילים גדולות רצות"), ["plain", "bold", "dark"], (c) => strip(c, [marquee(c, [c.pack.title, c.pack.collection, C.newIn], 44)], w("شريط", "Bar", "פס"), { pad: [28, 0, 28, 0], full: true })),

  /* categories */
  r("cats-circles", "categories", w("دوائر", "Circles", "עיגולים"), ["plain", "soft"], (c) => sec(c, [head(c, [H(c, C.byCategory, 2)]), categories(c, { look: "circle", columns: 6 })], C.byCategory)),
  r("cats-tall", "categories", w("كروت طولية", "Tall cards", "כרטיסים גבוהים"), ["plain", "surface"], (c) => sec(c, [head(c, [eyebrow(c, c.pack.collection), H(c, C.byCategory, 2)], false), categories(c, { look: "tall", columns: 4, limit: 4 })], C.byCategory)),
  r("cats-overlay", "categories", w("الاسم فوق الصورة", "Names over pictures", "שמות על התמונות"), ["plain", "dark"], (c) => sec(c, [head(c, [H(c, C.byCategory, 2)]), categories(c, { look: "overlay", columns: 3 })], C.byCategory)),
  r("cats-pills", "categories", w("كبسولات", "Pills", "כפתורים"), ["plain", "soft"], (c) => sec(c, [head(c, [H(c, C.byCategory, 3)], true, 24), categories(c, { look: "pill", limit: 10 })], C.byCategory, { center: true, pad: [48, 24, 48, 24] })),
  r("cats-banner", "categories", w("عريضة", "Wide", "רחבים"), ["plain", "surface"], (c) => sec(c, [head(c, [H(c, C.byCategory, 2)]), categories(c, { look: "banner", columns: 2, limit: 4 })], C.byCategory)),
  r("cats-split", "categories", w("كلام وأقسام", "Words and categories", "מילים וקטגוריות"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 2], [[eyebrow(c, c.pack.label), H(c, C.byCategory, 2), P(c, c.pack.sub), B(c, C.all, "/shop", "outline")], [categories(c, { look: "square", columns: 3 })]], { gap: 40, align: "center" })], C.byCategory)),

  /* products */
  r("prod-grid", "products", w("وصل جديد", "New in", "חדש בחנות"), ["plain", "surface"], (c) => sec(c, [head(c, [H(c, C.newIn, 2)]), products(c, { source: "new", columns: 4, card: "plain" })], C.newIn)),
  r("prod-row", "products", w("صف الأكثر مبيعاً", "A row of best sellers", "שורת רבי מכר"), ["plain", "soft"], (c) => sec(c, [head(c, [eyebrow(c, c.pack.label), H(c, C.best, 2)], false), products(c, { source: "best", layout: "row", card: "shadow" })], C.best)),
  r("prod-lift", "products", w("كروت بتطلع", "Lifting cards", "כרטיסים מתרוממים"), ["plain", "surface", "soft"], (c) =>
    sec(c, [head(c, [H(c, C.picked, 2), P(c, c.pack.sub)]), products(c, { source: "new", columns: 3, limit: 6, card: "lift" }), head(c, [B(c, C.all, "/shop")], true, 0)], C.picked)),
  r("prod-bordered", "products", w("كروت بإطار", "Framed cards", "כרטיסים במסגרת"), ["plain", "dark"], (c) => sec(c, [head(c, [H(c, C.best, 2)]), products(c, { source: "best", columns: 4, card: "bordered" })], C.best)),
  r("prod-split", "products", w("كلام ومنتجات", "Words and products", "מילים ומוצרים"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 2], [[eyebrow(c, c.pack.collection), H(c, C.newIn, 2), P(c, c.pack.sub), B(c, C.all, "/shop")], [products(c, { source: "new", columns: 2, limit: 4, card: "soft" })]], { gap: 40, align: "center" })], C.newIn)),
  r("prod-feature", "products", w("صورة كبيرة ومنتجات", "A big picture and products", "תמונה גדולה ומוצרים"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, c.pack.collection, { aspect: "3 / 4" })], [H(c, c.pack.collection, 2), products(c, { source: "best", columns: 2, limit: 4, card: "plain" })]], { gap: 40 })], c.pack.collection)),
  r("prod-six", "products", w("ستة مختارة", "Six picked", "שישה נבחרים"), ["soft", "plain"], (c) => sec(c, [head(c, [eyebrow(c, c.pack.eyebrow), H(c, C.picked, 2)]), products(c, { source: "new", columns: 3, limit: 6, card: "soft" })], C.picked)),

  /* 3D */
  r("m3d-center", "model", w("موديل بالنص", "A model in the middle", "מודל במרכז"), ["plain", "dark", "soft"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.eyebrow), H(c, c.pack.product, 2)], true, 16), MODEL(c, { style: { maxWidth: "640px", aspect: "4 / 3", margin: [0, 0, 16, 0] }, props: { zoom: true } }), head(c, [P(c, c.pack.sub, { style: { maxWidth: "560px" } }), B(c, c.pack.cta, "/shop")], true, 0)], c.pack.product, { center: true })),
  r("m3d-split", "model", w("موديل وكلام", "A model and words", "מודל ומילים"), ["plain", "dark", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[MODEL(c)], [eyebrow(c, c.pack.label), H(c, c.pack.product, 2), P(c, c.pack.sub), STACK(c, PERKS.slice(0, 3).map((p) => STACK(c, [ICON(c, "check", { size: 20, motion: false }), P(c, p.title, { quiet: false, motion: false })], { direction: "row", gap: 10, align: "center" })), { gap: 8 }), B(c, c.pack.cta, "/shop")]], { gap: 48, align: "center" })], c.pack.product)),
  r("m3d-trio", "model", w("تلات موديلات", "Three models", "שלושה מודלים"), ["plain", "dark"], (c) =>
    sec(c, [head(c, [H(c, c.pack.collection, 2)]), GRID(c, 3, TRIOS[c.fam].map((m) => CARD(c, [MODEL(c, { model: m, props: { anim: { type: "float", speed: 1 }, floor: "none" } })], { pad: [12, 12, 12, 12] })))], c.pack.collection)),
  r("m3d-neon", "model", w("نيون", "Neon", "ניאון"), ["dark", "bold"], (c) =>
    sec(c, [COLS(c, [1, 1], [
      [H(c, c.pack.title, 1, { style: { glow: { color: "accent", size: 24 } } }), P(c, c.pack.sub), B(c, c.pack.cta, "/shop")],
      [MODEL(c, { props: { finish: "neon", lights: { preset: "neon" }, floor: "grid", anim: { type: "orbit", speed: 1 } } })],
    ], { gap: 40, align: "center" })], c.pack.product)),
  r("m3d-spin", "model", w("موديل بيلف وأرقام", "A turning model and numbers", "מודל מסתובב ומספרים"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[MODEL(c, { props: { anim: { type: "spin", speed: 0.8 }, auto: 0 } })], [H(c, c.pack.product, 2), P(c, c.pack.story), GRID(c, 2, STATS.slice(0, 4).map((s) => stat(c, s)), { gap: 16, phone: 2 })]], { gap: 48, align: "center" })], c.pack.product)),

  /* perks */
  r("feat-icons", "features", w("أيقونات بالنص", "Centred icons", "אייקונים במרכז"), ["plain", "soft", "surface", "dark"], (c) => sec(c, [head(c, [H(c, C.why, 2)]), GRID(c, 3, PERKS.slice(0, 3).map((p) => perk(c, p, { center: true })), { gap: 32 })], C.why)),
  r("feat-cards", "features", w("ستة كروت", "Six cards", "שישה כרטיסים"), ["plain", "soft", "bold"], (c) => sec(c, [head(c, [eyebrow(c, c.pack.label), H(c, C.why, 2)]), GRID(c, 3, PERKS.map((p) => perk(c, p, { card: true })))], C.why)),
  r("feat-four", "features", w("أربعة بصف", "Four in a row", "ארבעה בשורה"), ["surface", "plain"], (c) => sec(c, [GRID(c, 4, PERKS.slice(0, 4).map((p) => perk(c, p, { small: true })), { gap: 24 })], C.why, { pad: [56, 24, 56, 24] })),
  r("feat-split", "features", w("صورة ومميزات", "A picture and perks", "תמונה ויתרונות"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, c.pack.product, { aspect: "1 / 1" })], [H(c, C.why, 2), ...PERKS.slice(0, 3).map((p) => STACK(c, [ICON(c, p.icon, { size: 32, motion: false }), STACK(c, [H(c, p.title, 4, { motion: false }), P(c, p.text, { motion: false })], { gap: 4 })], { direction: "row", gap: 16, align: "start" }))]], { gap: 56, align: "center" })], C.why)),
  r("feat-numbered", "features", w("مرقّمة", "Numbered", "ממוספרים"), ["dark", "plain"], (c) =>
    sec(c, [head(c, [H(c, C.values, 2)], false), GRID(c, 2, PERKS.slice(0, 4).map((p, i) => CARD(c, [eyebrow(c, w(`0${i + 1}`, `0${i + 1}`, `0${i + 1}`), { motion: false }), H(c, p.title, 4, { motion: false }), P(c, p.text, { motion: false })])))], C.values)),
  r("feat-strip", "features", w("شريط مميزات", "A strip of perks", "פס יתרונות"), ["surface", "soft", "bold"], (c) =>
    sec(c, [STACK(c, PERKS.slice(0, 4).map((p) => STACK(c, [ICON(c, p.icon, { size: 28 }), H(c, p.title, 5, { motion: false })], { direction: "row", gap: 10, align: "center" })), { direction: "row", wrap: true, justify: "around", gap: 24 }, mo.group(c))], C.why, { pad: [36, 24, 36, 24] })),

  /* our story */
  r("story-split", "story", w("صورة وقصة", "A picture and a story", "תמונה וסיפור"), ["plain", "soft", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, C.ourStory, { aspect: "4 / 5", shaped: true })], [eyebrow(c, C.ourStory), H(c, c.pack.title, 2), P(c, c.pack.story, { style: { size: 18 } }), B(c, C.more, "/about", "outline")]], { gap: 56, align: "center" })], C.ourStory)),
  r("story-center", "story", w("قصة بالنص", "A centred story", "סיפור במרכז"), ["plain", "soft", "dark"], (c) =>
    sec(c, [head(c, [eyebrow(c, C.ourStory), H(c, c.pack.story, 2, { style: { size: 34, maxWidth: "860px", lineHeight: 1.4, weight: 500 } }), P(c, C.storeName, { style: { weight: 700 } })], true, 0)], C.ourStory, { pad: [110, 24, 110, 24] })),
  r("story-values", "story", w("قيمنا", "Our values", "הערכים שלנו"), ["plain", "surface"], (c) => sec(c, [head(c, [eyebrow(c, C.ourStory), H(c, C.values, 2)]), GRID(c, 3, VALUES.map((v) => perk(c, { icon: v.icon, title: v.title, text: v.text }, { center: true })), { gap: 32 })], C.values)),
  r("story-quote", "story", w("جملة كبيرة", "A big line", "משפט גדול"), ["soft", "dark", "bold"], (c) =>
    sec(c, [head(c, [ICON(c, "sparkle", { size: 36 }), H(c, c.pack.story, 2, { style: { size: 40, italic: true, maxWidth: "900px", lineHeight: 1.35 } })], true, 0)], C.ourStory, { pad: [100, 24, 100, 24] })),
  r("story-timeline", "story", w("مشوارنا", "Our journey", "המסע שלנו"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [1, 2], [[eyebrow(c, C.ourStory), H(c, w("مشوارنا", "Our journey", "המסע שלנו"), 2), P(c, c.pack.story)], [STACK(c, TIMELINE.map(([year, text]) => STACK(c, [H(c, year, 3, { motion: false, style: { color: pop(c), size: 26, width: "96px" } }), P(c, text, { quiet: false, motion: false })], { direction: "row", gap: 20, align: "center" })), { gap: 20 }, mo.group(c))]], { gap: 48 })], C.ourStory)),
  r("story-photos", "story", w("تلات صور وقصة", "Three pictures and a story", "שלוש תמונות וסיפור"), ["plain"], (c) =>
    sec(c, [head(c, [eyebrow(c, C.ourStory), H(c, c.pack.title, 2), P(c, c.pack.story, { style: { maxWidth: "640px" } })]), GRID(c, 3, [0, 1, 2].map(() => IMG(c, C.ourStory, { aspect: "4 / 5", motion: false })))], C.ourStory)),

  /* picture and words */
  r("split-start", "split", w("الصورة بالبداية", "Picture first", "התמונה קודם"), ["plain", "soft", "surface", "dark"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, c.pack.collection, { shaped: true })], [eyebrow(c, c.pack.label), H(c, c.pack.collection, 2), P(c, c.pack.sub), B(c, c.pack.cta, "/shop")]], { gap: 56, align: "center" })], c.pack.collection)),
  r("split-end", "split", w("الصورة بالآخر", "Picture last", "התמונה אחרי"), ["plain", "soft", "bold"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, c.pack.label), H(c, c.pack.collection, 2), P(c, c.pack.sub), B(c, c.pack.cta, "/shop")], [IMG(c, c.pack.collection, { shaped: true })]], { gap: 56, align: "center", phone: "reverse" })], c.pack.collection)),
  r("split-wide", "split", w("صورة عريضة", "A wide picture", "תמונה רחבה"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [2, 1], [[IMG(c, c.pack.collection, { aspect: "16 / 10" })], [H(c, c.pack.collection, 2), P(c, c.pack.sub), B(c, C.more, "/shop", "link")]], { gap: 40, align: "center" })], c.pack.collection)),
  r("split-arch", "split", w("صورة بقوس", "An arched picture", "תמונה בקשת"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, c.pack.collection, { aspect: "3 / 4", radius: 0, style: { shape: "arch" } })], [eyebrow(c, c.pack.eyebrow), H(c, c.pack.collection, 2), P(c, c.pack.story), B(c, c.pack.cta, "/shop")]], { gap: 56, align: "center" })], c.pack.collection)),
  r("split-blob", "split", w("صورة ناعمة الشكل", "A soft-shaped picture", "תמונה בצורה רכה"), ["soft", "plain"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, c.pack.eyebrow), H(c, c.pack.collection, 2), P(c, c.pack.sub), ctas(c)], [IMG(c, c.pack.collection, { aspect: "1 / 1", radius: 0, style: { shape: "blob" } })]], { gap: 56, align: "center" })], c.pack.collection, { style: patternOf(c, "rings", "accent", 60, 0.08) })),

  /* galleries */
  r("gal-grid", "gallery", w("تلات مربعات", "Three squares", "שלושה ריבועים"), ["plain", "surface"], (c) => sec(c, [head(c, [H(c, c.pack.collection, 2)]), GRID(c, 3, [0, 1, 2].map(() => IMG(c, c.pack.collection, { aspect: "1 / 1", motion: mo.pic(c) })), { phone: 1 })], c.pack.collection)),
  r("gal-slider", "gallery", w("صور بتتقلّب", "Turning pictures", "תמונות מתחלפות"), ["plain", "dark"], (c) =>
    sec(c, [head(c, [H(c, c.pack.collection, 2)]), EL(c, "slider", { slides: [0, 1, 2, 3].map(() => ({ src: pic(c), kind: "image" })), autoplay: 4, loop: true, arrows: true, dots: true, aspect: "16 / 9" }, { style: { radius: 20 } })], c.pack.collection)),
  r("gal-mosaic", "gallery", w("موزاييك", "Mosaic", "פסיפס"), ["plain"], (c) =>
    sec(c, [GRID(c, 4, [IMG(c, c.pack.collection, { aspect: "1 / 1", style: { col: "span 2", row: "span 2" }, motion: false }), ...[0, 1, 2, 3].map(() => IMG(c, c.pack.collection, { aspect: "1 / 1", motion: false }))], { gap: 12, phone: 2 })], c.pack.collection)),
  r("gal-social", "gallery", w("من إنستغرام", "From Instagram", "מאינסטגרם"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [H(c, C.follow, 2), P(c, w("@store", "@store", "@store"))]), GRID(c, 6, [0, 1, 2, 3, 4, 5].map(() => IMG(c, C.follow, { aspect: "1 / 1", radius: 12, motion: false })), { gap: 8, phone: 3 }), head(c, [B(c, C.follow, "https://instagram.com/", "outline")], true, 0)], C.follow)),

  /* lookbook */
  r("look-points", "lookbook", w("صورة بنقاط", "A picture with points", "תמונה עם נקודות"), ["plain", "soft", "dark"], (c) =>
    sec(c, [head(c, [eyebrow(c, c.pack.collection), H(c, C.look, 2)]), EL(c, "hotspots", { src: pic(c), alt: say(c, c.pack.collection), items: looks(c) }, { style: { self: "stretch", maxWidth: "900px", radius: 20 } })], C.look, { center: true })),
  r("look-split", "lookbook", w("نقاط ومنتجات", "Points and products", "נקודות ומוצרים"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [3, 2], [[EL(c, "hotspots", { src: pic(c), items: looks(c) }, { style: { radius: 20 } })], [H(c, C.look, 2), P(c, c.pack.sub), products(c, { source: "best", limit: 2, columns: 2, card: "plain" })]], { gap: 40, align: "center" })], C.look)),
  r("look-tabs", "lookbook", w("إطلالات بتبويبات", "Looks in tabs", "לוקים בלשוניות"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [H(c, C.look, 2)]), EL(c, "tabs", { look: "pills", items: [c.pack.collection, c.pack.product, C.newIn].map((t) => ({ label: say(c, t), text: say(c, c.pack.sub), image: pic(c) })) }, { style: { self: "stretch" } })], C.look)),

  /* reviews */
  r("tst-grid", "testimonials", w("تلات آراء", "Three reviews", "שלוש ביקורות"), ["plain", "soft", "surface"], (c) => sec(c, [head(c, [H(c, C.said, 2), P(c, OUT_OF)]), quotes(c, "grid")], C.said)),
  r("tst-single", "testimonials", w("رأي واحد كبير", "One big review", "ביקורת אחת גדולה"), ["soft", "dark", "bold"], (c) => sec(c, [head(c, [ICON(c, "star", { size: 32 }), H(c, C.said, 3)], true, 24), quotes(c, "single", 1)], C.said)),
  r("tst-row", "testimonials", w("صف آراء", "A row of reviews", "שורת ביקורות"), ["plain", "surface"], (c) => sec(c, [head(c, [H(c, C.said, 2), P(c, OUT_OF)], false), quotes(c, "row", 6)], C.said)),
  r("tst-photo", "testimonials", w("صورة ورأي", "A picture and a review", "תמונה וביקורת"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, C.said, { aspect: "1 / 1" })], [H(c, C.said, 2), quotes(c, "single", 1)]], { gap: 48, align: "center" })], C.said)),

  /* numbers */
  r("stats-row", "stats", w("أربع أرقام", "Four numbers", "ארבעה מספרים"), ["plain", "bold", "dark", "soft"], (c) => sec(c, [GRID(c, 4, STATS.map((s) => stat(c, s)), { phone: 2 })], C.numbers, { pad: [64, 24, 64, 24] })),
  r("stats-split", "stats", w("كلام وأرقام", "Words and numbers", "מילים ומספרים"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, C.numbers), H(c, c.pack.title, 2), P(c, c.pack.story)], [GRID(c, 2, STATS.map((s) => stat(c, s, true)), { gap: 16, phone: 2 })]], { gap: 48, align: "center" })], C.numbers)),
  r("stats-cards", "stats", w("كروت أرقام", "Number cards", "כרטיסי מספרים"), ["soft", "plain"], (c) => sec(c, [head(c, [H(c, C.numbers, 2)]), GRID(c, 4, STATS.map((s) => stat(c, s, true)), { phone: 2 })], C.numbers)),

  /* steps */
  r("steps-row", "steps", w("تلات خطوات", "Three steps", "שלושה שלבים"), ["plain", "soft", "surface"], (c) => sec(c, [head(c, [H(c, C.howItWorks, 2)]), GRID(c, 3, STEPS.map((s, i) => step(c, s, i)), { gap: 32 })], C.howItWorks)),
  r("steps-cards", "steps", w("خطوات بكروت", "Steps in cards", "שלבים בכרטיסים"), ["plain", "dark"], (c) => sec(c, [head(c, [H(c, C.howItWorks, 2)]), GRID(c, 3, STEPS.map((s, i) => step(c, s, i, true)))], C.howItWorks)),
  r("steps-split", "steps", w("صورة وخطوات", "A picture and steps", "תמונה ושלבים"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, C.howItWorks, { aspect: "4 / 5" })], [H(c, C.howItWorks, 2), STACK(c, STEPS.map((s, i) => step(c, s, i)), { gap: 24 }, mo.group(c)), B(c, C.shop, "/shop")]], { gap: 56, align: "center" })], C.howItWorks)),

  /* questions */
  r("faq-lines", "faq", w("أسئلة بخطوط", "Questions in lines", "שאלות בשורות"), ["plain", "surface", "soft"], (c) => sec(c, [head(c, [H(c, C.questions, 2)]), head(c, [accordion(c, QUESTIONS, "lines", false, true)], true, 0)], C.questions)),
  r("faq-split", "faq", w("كلام وأسئلة", "Words and questions", "מילים ושאלות"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 2], [[H(c, C.questions, 2), P(c, C.writeSub), B(c, C.contactUs, "/contact", "outline")], [accordion(c, QUESTIONS, "cards")]], { gap: 48 })], C.questions)),
  r("faq-plus", "faq", w("أسئلة بإشارة +", "Questions with a +", "שאלות עם +"), ["plain", "dark"], (c) => sec(c, [head(c, [eyebrow(c, C.shipping), H(c, C.questions, 2)]), head(c, [accordion(c, SHIPPING_QA, "plus", true, true)], true, 0)], C.questions)),

  /* calls to action */
  r("cta-center", "cta", w("بالنص", "Centred", "במרכז"), ["bold", "dark", "soft"], (c) => sec(c, [head(c, [H(c, c.pack.title, 2), P(c, c.pack.sub, { style: { maxWidth: "560px" } }), row(c, [B(c, c.pack.cta, "/shop")], true)], true, 0)], C.shop)),
  r("cta-split", "cta", w("كلام وزر", "Words and a button", "מילים וכפתור"), ["bold", "dark", "surface"], (c) =>
    sec(c, [COLS(c, [2, 1], [[H(c, c.pack.title, 2), P(c, c.pack.sub)], [row(c, [B(c, c.pack.cta, "/shop"), B(c, C.contactUs, "/contact", "outline")])]], { gap: 32, align: "center" })], C.shop, { pad: [64, 24, 64, 24] })),
  r("cta-picture", "cta", w("صورة ودعوة", "A picture and a call", "תמונה וקריאה"), ["soft", "plain"], (c) =>
    sec(c, [COLS(c, [1, 1], [[eyebrow(c, c.pack.eyebrow), H(c, c.pack.title, 2), B(c, c.pack.cta, "/shop")], [IMG(c, c.pack.product, { aspect: "16 / 10" })]], { gap: 48, align: "center" })], C.shop)),
  r("cta-pattern", "cta", w("نقشة وزاوية", "A pattern and an angle", "דוגמה וזווית"), ["bold", "soft"], (c) =>
    sec(c, [head(c, [H(c, c.pack.title, 2), P(c, c.pack.sub), B(c, c.pack.cta, "/shop")], true, 0)], C.shop, { pad: [96, 24, 140, 24], style: patternOf(c, "diagonal", c.skin === "bold" ? "accent-contrast" : "accent", 18, 0.12), props: { edges: edge(c, "slant") } })),
  r("cta-particles", "cta", w("بنجوم", "With stars", "עם כוכבים"), ["dark", "bold"], (c) =>
    sec(c, [head(c, [H(c, c.pack.title, 2), B(c, c.pack.cta, "/shop")], true, 0)], C.shop, { pad: [110, 24, 110, 24], props: { particles: { kind: "stars", color: pop(c) } } })),
  r("cta-big", "cta", w("كلمة كبيرة", "One big line", "שורה אחת גדולה"), ["plain", "dark"], (c) =>
    sec(c, [head(c, [H(c, c.pack.cta, 1, { style: { size: 96, sizeMin: 44, weight: 800 } }), B(c, C.shop, "/shop")], true, 0)], C.shop, { pad: [100, 24, 100, 24] })),

  /* newsletter */
  r("news-center", "newsletter", w("بالنص", "Centred", "במרכז"), ["soft", "plain", "dark", "bold"], (c) => sec(c, [head(c, [ICON(c, "mail", { size: 36 }), H(c, C.join, 2), P(c, C.joinSub, { style: { maxWidth: "520px" } }), form(c, "newsletter", true)], true, 0)], C.join)),
  r("news-split", "newsletter", w("كلام ونموذج", "Words and a form", "מילים וטופס"), ["surface", "plain"], (c) => sec(c, [COLS(c, [1, 1], [[H(c, C.join, 2), P(c, C.joinSub)], [form(c, "newsletter")]], { gap: 40, align: "center" })], C.join, { pad: [64, 24, 64, 24] })),
  r("news-picture", "newsletter", w("صورة ونموذج", "A picture and a form", "תמונה וטופס"), ["plain", "soft"], (c) => sec(c, [COLS(c, [1, 1], [[IMG(c, C.join, { aspect: "4 / 3" })], [H(c, C.join, 2), P(c, C.joinSub), form(c, "newsletter")]], { gap: 48, align: "center" })], C.join)),
  r("news-card", "newsletter", w("كرت بالنص", "A centred card", "כרטיס במרכז"), ["surface", "soft"], (c) => sec(c, [head(c, [CARD(c, [H(c, C.join, 3, { motion: false }), P(c, C.joinSub, { motion: false }), form(c, "newsletter", true)], { align: "center", textAlign: "center", maxWidth: "640px", self: "center", width: "100%", pad: [40, 32, 40, 32] })], true, 0)], C.join)),

  /* offers */
  r("offer-countdown", "offer", w("عرض بعدّاد", "An offer with a countdown", "מבצע עם ספירה לאחור"), ["bold", "dark", "soft"], (c) => sec(c, [head(c, [eyebrow(c, C.ends), H(c, OFFER.title, 2), countdown(c), B(c, C.shop, "/shop")], true, 0)], OFFER.title)),
  r("offer-split", "offer", w("صورة وعرض", "A picture and an offer", "תמונה ומבצע"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, OFFER.title, { aspect: "1 / 1" })], [eyebrow(c, C.ends), H(c, OFFER.title, 2), P(c, OFFER.use), countdown(c, "plain"), B(c, C.shop, "/shop")]], { gap: 48, align: "center" })], OFFER.title)),
  r("offer-code", "offer", w("كود خصم", "A discount code", "קוד הנחה"), ["soft", "plain", "bold"], (c) =>
    sec(c, [head(c, [H(c, OFFER.title, 2), H(c, OFFER.code, 3, { style: { size: 36, weight: 800, letterSpacing: 6, pad: [12, 28, 12, 28], border: { width: 2, color: pop(c), style: "dashed" }, radius: 14, color: pop(c) } }), P(c, OFFER.use), B(c, C.shop, "/shop")], true, 0)], OFFER.title)),
  r("offer-bar", "offer", w("شريط عرض بعدّاد", "A slim offer with a countdown", "פס מבצע עם ספירה"), ["dark", "bold"], (c) =>
    sec(c, [row(c, [H(c, OFFER.title, 3, { motion: false }), countdown(c, "plain"), B(c, C.shop, "/shop")], true)], OFFER.title, { pad: [28, 16, 28, 16], center: true })),
  r("offer-running", "offer", w("عرض ماشي وعدّاد", "Running words and a countdown", "מילים רצות וספירה"), ["bold", "dark"], (c) => sec(c, [marquee(c, [OFFER.title, C.ends], 32), head(c, [countdown(c)], true, 0)], OFFER.title, { pad: [40, 0, 48, 0], full: true })),

  /* bundles */
  r("price-three", "pricing", w("تلات باقات", "Three bundles", "שלוש חבילות"), ["plain", "soft", "surface"], (c) =>
    sec(c, [head(c, [H(c, C.plans, 2)]), EL(c, "pricing", { items: BUNDLES.map((b) => ({ name: say(c, b.name), price: { [c.lang]: b.price, ...(c.all ? { ar: b.price, en: b.price, he: b.price } : {}) }, period: say(c, w("للباقة", "per bundle", "לחבילה")), features: say(c, b.features), cta: say(c, w("اختاروا", "Choose", "לבחירה")), href: "/shop", ...(b.featured ? { featured: true, badge: say(c, w("الأشهر", "Most loved", "הכי אהוב")) } : {}) })) }, { style: { self: "stretch" }, motion: mo.group(c) })], C.plans)),
  r("price-split", "pricing", w("كلام وباقتين", "Words and two bundles", "מילים ושתי חבילות"), ["plain", "dark"], (c) =>
    sec(c, [COLS(c, [1, 2], [[H(c, C.plans, 2), P(c, c.pack.sub)], [EL(c, "pricing", { items: BUNDLES.slice(1).map((b) => ({ name: say(c, b.name), price: { [c.lang]: b.price, ...(c.all ? { ar: b.price, en: b.price, he: b.price } : {}) }, features: say(c, b.features), href: "/shop", ...(b.featured ? { featured: true } : {}) })) }, { style: { self: "stretch" } })]], { gap: 40, align: "center" })], C.plans)),

  /* team */
  r("team-grid", "team", w("الفريق", "The team", "הצוות"), ["plain", "soft"], (c) => sec(c, [head(c, [H(c, C.team, 2)]), EL(c, "team", { items: PEOPLE.map(([name, role]) => ({ name: say(c, name), role: say(c, role) })), columns: 3 }, { style: { self: "stretch" }, motion: mo.group(c) })], C.team)),
  r("team-split", "team", w("قصة وفريق", "A story and the team", "סיפור וצוות"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [1, 2], [[eyebrow(c, C.about), H(c, C.team, 2), P(c, c.pack.story)], [EL(c, "team", { items: PEOPLE.map(([name, role]) => ({ name: say(c, name), role: say(c, role) })), columns: 3 }, { style: { self: "stretch" } })]], { gap: 40, align: "center" })], C.team)),

  /* before and after */
  r("ba-center", "compare", w("بالنص", "Centred", "במרכז"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [H(c, C.compare, 2)]), head(c, [EL(c, "beforeAfter", { before: pic(c), after: pic(c), start: 50, beforeLabel: say(c, w("قبل", "Before", "לפני")), afterLabel: say(c, w("بعد", "After", "אחרי")) }, { style: { self: "stretch", maxWidth: "820px", radius: 20 } })], true, 0)], C.compare)),
  r("ba-split", "compare", w("مقارنة وكلام", "A comparison and words", "השוואה ומילים"), ["plain", "dark"], (c) =>
    sec(c, [COLS(c, [1, 1], [[EL(c, "beforeAfter", { before: pic(c), after: pic(c), start: 40 }, { style: { radius: 20 } })], [H(c, C.compare, 2), P(c, c.pack.sub), B(c, c.pack.cta, "/shop")]], { gap: 48, align: "center" })], C.compare)),

  /* details */
  r("tabs-details", "details", w("تبويبات", "Tabs", "לשוניות"), ["plain", "surface"], (c) => sec(c, [head(c, [H(c, C.details, 2)]), EL(c, "tabs", { look: "underline", items: DETAIL_TABS.map(([label, text]) => ({ label: say(c, label), text: say(c, text) })) }, { style: { self: "stretch" } })], C.details)),
  r("tabs-split", "details", w("صورة وتبويبات", "A picture and tabs", "תמונה ולשוניות"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[IMG(c, c.pack.product, { aspect: "1 / 1" })], [H(c, c.pack.product, 2), EL(c, "tabs", { look: "pills", items: DETAIL_TABS.map(([label, text]) => ({ label: say(c, label), text: say(c, text) })) }, { style: { self: "stretch" } })]], { gap: 48, align: "center" })], C.details)),

  /* contact */
  r("contact-map", "contact", w("عنوان وخريطة", "Address and map", "כתובת ומפה"), ["plain", "surface"], (c) =>
    sec(c, [COLS(c, [1, 1], [[H(c, C.visit, 2), P(c, C.address, { quiet: false }), P(c, C.hours), P(c, C.phoneLine), B(c, w("واتساب", "WhatsApp", "וואטסאפ"), WHATSAPP)], [EL(c, "map", { query: "Nazareth", zoom: 14, label: say(c, C.visit) }, { style: { self: "stretch", radius: 20 } })]], { gap: 40, align: "center" })], C.visit)),
  r("contact-form", "contact", w("كلام ونموذج", "Words and a form", "מילים וטופס"), ["plain", "soft"], (c) =>
    sec(c, [COLS(c, [1, 1], [[H(c, C.writeUs, 2), P(c, C.writeSub), P(c, C.phoneLine), P(c, C.mailLine)], [form(c, "contact")]], { gap: 48 })], C.contactUs)),
  r("contact-cards", "contact", w("تلات كروت", "Three cards", "שלושה כרטיסים"), ["plain", "soft", "dark"], (c) =>
    sec(c, [head(c, [H(c, C.contactUs, 2)]), GRID(c, 3, ([["phone", C.phoneLine], ["mail", C.mailLine], ["heart", C.address]] as const).map(([icon, text]) => CARD(c, [ICON(c, icon, { size: 32, motion: false }), P(c, text, { quiet: false, motion: false })], { align: "center", textAlign: "center" })))], C.contactUs)),
  r("contact-wide", "contact", w("خريطة عريضة", "A wide map", "מפה רחבה"), ["plain"], (c) =>
    sec(c, [head(c, [H(c, C.visit, 2), P(c, C.hours)]), EL(c, "map", { query: "Nazareth", zoom: 13, label: say(c, C.visit) }, { style: { self: "stretch", radius: 20, height: "420px" } })], C.visit)),

  /* headers */
  r("header-classic", "header", w("اسم وقائمة وبحث", "Name, menu and search", "שם, תפריט וחיפוש"), ["plain", "surface", "dark"], (c) =>
    sec(c, [COLS(c, [1, 2, 1], [[storeName(c)], [menu(c, LINKS_MAIN, { phone: "fold" })], [EL(c, "search", { look: "pill" })]], { gap: 24, align: "center" })], w("الهيدر", "Header", "כותרת עליונה"), { pad: [16, 24, 16, 24], phone: { pad: [12, 16, 12, 16] }, props: { tag: "header" } })),
  r("header-center", "header", w("الاسم بالنص", "The name in the middle", "השם במרכז"), ["plain", "soft"], (c) =>
    sec(c, [head(c, [storeName(c, 30), menu(c, LINKS_MAIN, { look: "underline", phone: "fold" })], true, 0)], w("الهيدر", "Header", "כותרת עליונה"), { pad: [20, 24, 16, 24], props: { tag: "header" } })),
  r("header-buttons", "header", w("اسم وأزرار", "A name and buttons", "שם וכפתורים"), ["plain", "dark", "bold"], (c) =>
    sec(c, [COLS(c, [1, 2], [[storeName(c)], [menu(c, LINKS_MAIN, { look: "pills", phone: "fold" })]], { gap: 24, align: "center", cellStyle: { justify: "center" } })], w("الهيدر", "Header", "כותרת עליונה"), { pad: [14, 24, 14, 24], props: { tag: "header" } })),
  r("header-strip", "header", w("شريط وهيدر", "A bar and a header", "פס וכותרת"), ["plain", "surface"], (c) =>
    sec(c, [marquee(c, RUNNING), COLS(c, [1, 2, 1], [[storeName(c)], [menu(c, LINKS_MAIN, { phone: "fold" })], [EL(c, "search", { look: "underline" })]], { gap: 24, align: "center" })], w("الهيدر", "Header", "כותרת עליונה"), { pad: [8, 24, 16, 24], props: { tag: "header" } })),

  /* footers */
  r("footer-columns", "footer", w("أعمدة روابط", "Columns of links", "עמודות קישורים"), ["surface", "dark", "plain"], (c) =>
    sec(c, [COLS(c, [2, 1, 1], [[storeName(c), P(c, c.pack.story)], [menu(c, LINKS_MAIN, { layout: "column" })], [menu(c, LINKS_HELP, { layout: "column" })]], { gap: 32 }), P(c, RIGHTS, { style: { size: 13, margin: [32, 0, 0, 0] } })], w("الفوتر", "Footer", "כותרת תחתונה"), { pad: [56, 24, 32, 24], props: { tag: "footer" } })),
  r("footer-news", "footer", w("روابط ونشرة", "Links and newsletter", "קישורים וניוזלטר"), ["surface", "dark"], (c) =>
    sec(c, [COLS(c, [2, 1, 1], [[storeName(c), P(c, C.joinSub), form(c, "newsletter")], [menu(c, LINKS_MAIN, { layout: "column" })], [menu(c, LINKS_HELP, { layout: "column" }), menu(c, LINKS_SOCIAL, { layout: "column" })]], { gap: 32 })], w("الفوتر", "Footer", "כותרת תחתונה"), { pad: [56, 24, 40, 24], props: { tag: "footer" } })),
  r("footer-center", "footer", w("بالنص", "Centred", "במרכז"), ["plain", "soft", "dark"], (c) =>
    sec(c, [head(c, [storeName(c), menu(c, LINKS_MAIN), menu(c, LINKS_SOCIAL, { look: "pills" }), P(c, RIGHTS, { style: { size: 13 } })], true, 0)], w("الفوتر", "Footer", "כותרת תחתונה"), { pad: [48, 24, 40, 24], props: { tag: "footer" } })),
  r("footer-big", "footer", w("اسم كبير", "A big name", "שם גדול"), ["dark", "bold"], (c) =>
    sec(c, [H(c, C.storeName, 2, { style: { size: 110, sizeMin: 48, weight: 900, lineHeight: 1 } }), COLS(c, [1, 1, 1], [[menu(c, LINKS_MAIN, { layout: "column" })], [menu(c, LINKS_HELP, { layout: "column" })], [menu(c, LINKS_SOCIAL, { layout: "column" })]], { gap: 24 }), P(c, RIGHTS, { style: { size: 13, margin: [24, 0, 0, 0] } })], w("الفوتر", "Footer", "כותרת תחתונה"), { pad: [64, 24, 40, 24], props: { tag: "footer" } })),

  /* special pages */
  r("notfound", "notice", w("صفحة 404", "A 404 page", "דף 404"), ["plain", "soft", "dark"], (c) =>
    sec(c, [head(c, [H(c, w("404", "404", "404"), 1, { style: { size: 140, sizeMin: 80, weight: 900, color: pop(c) } }), H(c, C.notFound, 2), P(c, C.notFoundSub, { style: { maxWidth: "520px" } }), row(c, [B(c, C.home, "/"), B(c, C.shop, "/shop", "outline")], true)], true, 0)], C.notFound, { pad: [120, 24, 120, 24] })),
  r("notfound-model", "notice", w("404 بموديل 3D", "A 404 with a 3D model", "404 עם מודל תלת־ממד"), ["plain", "dark"], (c) =>
    sec(c, [COLS(c, [1, 1], [[MODEL(c, { props: { anim: { type: "bounce", speed: 1 } } })], [H(c, w("404", "404", "404"), 1, { style: { size: 96, color: pop(c) } }), H(c, C.notFound, 2), P(c, C.notFoundSub), B(c, C.home, "/")]], { gap: 40, align: "center" })], C.notFound)),
  r("soon", "notice", w("قريباً بعدّاد", "Coming soon with a countdown", "בקרוב עם ספירה לאחור"), ["dark", "bold", "soft"], (c) =>
    sec(c, [head(c, [eyebrow(c, C.storeName), H(c, C.soon, 1), P(c, C.soonSub, { style: { maxWidth: "560px" } }), countdown(c), form(c, "newsletter", true)], true, 0)], C.soon, { pad: [120, 24, 120, 24] })),
  r("soon-stars", "notice", w("قريباً بنجوم", "Coming soon with stars", "בקרוב עם כוכבים"), ["dark", "bold"], (c) =>
    sec(c, [head(c, [H(c, C.soon, 1, { style: { size: 80, sizeMin: 40 } }), P(c, C.soonSub, { style: { maxWidth: "560px" } }), countdown(c)], true, 0)], C.soon, { pad: [150, 24, 150, 24], props: { particles: { kind: "stars", color: pop(c), amount: 1.4 } } })),

  /* popups (over the page, not sections) */
  r("pop-welcome", "popup", w("ترحيب بخصم", "A welcome with a discount", "ברוכים הבאים עם הנחה"), ["plain"], (c) => popup(c, { trigger: "load", delay: 3, often: "visit", size: "m" }, [H(c, C.firstOrder, 2, { motion: false }), P(c, C.firstOrderSub, { motion: false }), B(c, C.shop, "/shop", "solid", { motion: false })])),
  r("pop-exit", "popup", w("قبل ما يطلعوا", "Before they leave", "לפני שעוזבים"), ["plain"], (c) => popup(c, { trigger: "exit", often: "day", size: "m" }, [H(c, C.waitStay, 2, { motion: false }), P(c, C.waitSub, { motion: false }), B(c, C.shop, "/shop", "solid", { motion: false })])),
  r("pop-news", "popup", w("نشرة بعد التمرير", "A newsletter after scrolling", "ניוזלטר אחרי גלילה"), ["plain"], (c) => popup(c, { trigger: "scroll", scroll: 50, often: "once", size: "s", place: "corner" }, [H(c, C.join, 3, { motion: false }), P(c, C.joinSub, { motion: false }), form(c, "newsletter")])),
  r("pop-picture", "popup", w("صورة وكود", "A picture and a code", "תמונה וקוד"), ["plain"], (c) =>
    popup(c, { trigger: "load", delay: 5, often: "visit", size: "l" }, [COLS(c, [1, 1], [[IMG(c, OFFER.title, { aspect: "1 / 1", motion: false })], [H(c, OFFER.title, 2, { motion: false }), H(c, OFFER.code, 3, { motion: false, style: { color: pop(c), letterSpacing: 4 } }), P(c, OFFER.use, { motion: false }), B(c, C.shop, "/shop", "solid", { motion: false })]], { gap: 24, align: "center" })])),
];

RECIPES.push(...STORE_RECIPES, ...TRUST_RECIPES);

/* -------------------------------------------------------------- campaigns */

/** A campaign's opening: its colours, its particles, its countdown. */
export function campaignHero(c: Ctx, cp: Campaign): N {
  return sec(c, [head(c, [eyebrow(c, cp.name), H(c, cp.title, 1, { style: { size: 72, sizeMin: 38 } }), P(c, cp.sub, { quiet: false, style: { size: 19, maxWidth: "620px", opacity: 0.9 } }), countdown(c), row(c, [B(c, C.shop, "/shop")], true)], true, 0)], cp.name, {
    pad: [130, 24, 130, 24], ...(cp.particles ? { props: { particles: { kind: cp.particles, color: cp.colors.pop } } } : {}),
  });
}
/** Its running strip, its colours turned round (what stands out becomes the ground). */
export function campaignStrip(c: Ctx, cp: Campaign): N {
  const k: Ctx = { ...c, skin: "campaign", paint: { bg: cp.colors.pop, fg: cp.colors.bg, pop: cp.colors.fg } };
  return strip(k, [marquee(k, [cp.strip, cp.name, RUNNING[0]])], cp.name);
}
/** Its offer: the code, the words, the button. */
export function campaignOffer(c: Ctx, cp: Campaign): N {
  return sec(c, [COLS(c, [1, 1], [[IMG(c, cp.name, { aspect: "1 / 1" })], [eyebrow(c, cp.name), H(c, cp.strip, 2), P(c, OFFER.use, { quiet: false }), H(c, OFFER.code, 3, { style: { size: 32, letterSpacing: 6, color: cp.colors.pop } }), B(c, C.shop, "/shop")]], { gap: 48, align: "center" })], cp.strip);
}

for (const cp of CAMPAIGNS) {
  RECIPES.push({ key: `cp-${cp.key}`, cat: "campaign", name: cp.name, skins: ["campaign"], build: (c) => campaignHero(c, cp), campaign: cp });
  RECIPES.push({ key: `cp-${cp.key}-strip`, cat: "campaign", name: w(`${cp.name.ar}: شريط`, `${cp.name.en}: bar`, `${cp.name.he}: פס`), skins: ["campaign"], build: (c) => campaignStrip(c, cp), campaign: cp });
}
