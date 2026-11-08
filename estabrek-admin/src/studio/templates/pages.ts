/**
 * Whole pages: a home for each kind of store in three styles, the inner pages every store
 * needs (about, contact, questions, delivery, sizes, gifts, brand story, 404), landing
 * pages, and a page for each campaign. A page is a list of sections from the library
 * (sections.ts), each in its skin, so the page's colours take turns.
 */
import { B, CARD, COLS, GRID, H, P, SEC, STACK, eyebrow, mo, say, withSkin, type Ctx, type N, type Skin } from "./build";
import { RECIPES, campaignHero, campaignOffer, campaignStrip } from "./sections";
import { BUDGETS, C, CAMPAIGNS, FAMILIES, LINKS_HELP, LINKS_MAIN, LINKS_SOCIAL, MEASURE, PACKS, SIZE_TABS, w, type Campaign, type Family, type W } from "./words";

export const PAGE_KINDS = ["home", "shop", "cart", "about", "contact", "faq", "policy", "gifts", "journal", "services", "thanks", "track", "landing", "soon", "notfound", "campaign"] as const;
export type PageKind = (typeof PAGE_KINDS)[number];
export const PAGE_KIND_NAMES: Record<PageKind, W> = {
  home: w("الرئيسية", "Home", "דף הבית"),
  shop: w("صفحة المتجر", "Shop page", "דף החנות"),
  cart: w("صفحة السلة", "Cart page", "דף הסל"),
  journal: w("مدوّنة ومقالات", "Journal and articles", "בלוג ומאמרים"),
  services: w("خدمات وباقات", "Services and plans", "שירותים וחבילות"),
  thanks: w("شكراً لطلبك", "Thank-you page", "דף תודה"),
  track: w("تتبّع الطلب", "Track an order", "מעקב הזמנה"),
  about: w("من نحن", "About", "אודות"),
  contact: w("تواصل", "Contact", "צור קשר"),
  faq: w("أسئلة", "Questions", "שאלות"),
  policy: w("شحن ومقاسات", "Delivery and sizes", "משלוחים ומידות"),
  gifts: w("هدايا", "Gifts", "מתנות"),
  landing: w("صفحات هبوط", "Landing pages", "דפי נחיתה"),
  soon: w("قريباً", "Coming soon", "בקרוב"),
  notfound: w("صفحة 404", "404 page", "דף 404"),
  campaign: w("مناسبات وحملات", "Occasions and campaigns", "אירועים וקמפיינים"),
};

export type PageRecipe = { key: string; kind: PageKind; name: W; build: (c: Ctx) => N[]; fam?: Family; campaign?: Campaign };

const BY_KEY = new Map(RECIPES.map((r) => [r.key, r]));
/** A library section in a skin. */
const S = (key: string, skin: Skin) => (c: Ctx): N => {
  const r = BY_KEY.get(key);
  if (!r) throw new Error(`No section “${key}”`);
  return r.build(withSkin(c, skin));
};
type Part = (c: Ctx) => N;
const page = (parts: Part[]) => (c: Ctx) => parts.map((p) => p(c));

/** A page's own title at its top. */
const pageHead = (title: W, sub: W, skin: Skin = "soft"): Part => (c) => {
  const k = withSkin(c, skin);
  return SEC(k, [STACK(k, [H(k, title, 1), P(k, sub, { style: { size: 19, maxWidth: "620px" } })], { align: "center", textAlign: "center", gap: 14 })], { name: title, pad: [96, 24, 72, 24] });
};
const sizeTabs: Part = (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [H(k, C.sizes, 2, { style: { margin: [0, 0, 24, 0] } }), { id: k.ids("tabs"), type: "tabs", props: { look: "boxed", items: SIZE_TABS.map(([label, text]) => ({ label: say(k, label), text: say(k, text) })) }, style: { base: { self: "stretch" } } }], { name: C.sizes });
};
const measure: Part = (c) => {
  const k = withSkin(c, "surface");
  return SEC(k, [H(k, w("كيف بتقيسوا", "How to measure", "איך מודדים"), 2, { style: { margin: [0, 0, 24, 0] } }), { id: k.ids("acc"), type: "accordion", props: { look: "cards", items: MEASURE.map(([q, a]) => ({ q: say(k, q), a: say(k, a) })) } }], { name: C.sizes });
};
const budgets: Part = (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [GRID(k, 3, BUDGETS.map((b) => CARD(k, [H(k, b.title, 3, { motion: false }), P(k, b.text, { motion: false }), B(k, C.shop, b.href, "link", { motion: false })], { align: "center", textAlign: "center" })))], { name: C.gifts });
};
/** One column of buttons, as on a "link in bio" page. */
const linksBio: Part = (c) => {
  const k = withSkin(c, "soft");
  const all = [...LINKS_MAIN, ...LINKS_HELP.slice(0, 1), ...LINKS_SOCIAL];
  return SEC(k, [STACK(k, [
    H(k, C.storeName, 1, { style: { size: 36 } }),
    P(k, k.pack.sub, { style: { maxWidth: "460px" } }),
    STACK(k, all.map(([t, href], i) => B(k, t, href, i === 0 ? "solid" : "outline", { motion: false, style: { width: "100%" } })), { gap: 12, self: "stretch", maxWidth: "460px", width: "100%" }, mo.group(k)),
  ], { align: "center", textAlign: "center", gap: 16 })], { name: C.links, pad: [72, 16, 72, 16] });
};

/* ------------------------------------------------------------------ homes */

const STYLES: Array<[string, W]> = [
  ["classic", w("كلاسيكي", "Classic", "קלאסי")],
  ["editorial", w("مجلّة", "Editorial", "מגזיני")],
  ["bold", w("جريء", "Bold", "נועז")],
];
/** Each kind of store's special section, for each style. */
const SPECIAL: Record<string, [Part, Part, Part]> = {
  model: [S("m3d-split", "plain"), S("m3d-trio", "plain"), S("m3d-neon", "dark")],
  lookbook: [S("look-points", "plain"), S("look-tabs", "soft"), S("look-split", "surface")],
  steps: [S("steps-row", "soft"), S("steps-split", "plain"), S("steps-cards", "dark")],
  quotes: [S("tst-single", "soft"), S("tst-photo", "plain"), S("tst-row", "surface")],
};
function homeOf(fam: Family, style: number): Part[] {
  const pack = PACKS[fam];
  const special = SPECIAL[pack.special][style];
  const reviews = pack.special === "quotes" ? S("feat-icons", "soft") : S("tst-grid", "soft");
  if (style === 0) return [S("hero-split", "plain"), S("bar-perks", "surface"), S("cats-circles", "plain"), S("prod-grid", "plain"), special, reviews, S("news-center", "plain")];
  if (style === 1) return [S("hero-cover", "plain"), S("bar-big", "plain"), S("split-arch", "plain"), S("prod-row", "soft"), special, S("story-center", "plain"), S("gal-social", "plain")];
  const hero = pack.special === "model" ? S("hero-model", "dark") : pack.particles ? S("hero-particles", "dark") : S("hero-type", "dark");
  return [hero, S("bar-marquee", "bold"), S("cats-overlay", "plain"), S("prod-lift", "surface"), special, S("stats-row", "bold"), S("faq-lines", "plain"), S("news-center", "dark")];
}

/* ------------------------------------------------------------------- pages */

export const PAGES: PageRecipe[] = [];
for (const fam of FAMILIES) {
  STYLES.forEach(([style, name], i) => {
    const label = PACKS[fam].label;
    PAGES.push({ key: `home-${fam}-${style}`, kind: "home", fam, name: w(`${label.ar}: ${name.ar}`, `${label.en}: ${name.en}`, `${label.he}: ${name.he}`), build: page(homeOf(fam, i)) });
  });
}

const p = (key: string, kind: PageKind, name: W, parts: Part[]): PageRecipe => ({ key, kind, name, build: page(parts) });
PAGES.push(
  p("about-story", "about", w("من نحن: قصة وقيم", "About: story and values", "אודות: סיפור וערכים"), [S("story-split", "plain"), S("story-values", "surface"), S("stats-row", "bold"), S("team-grid", "plain"), S("cta-center", "soft")]),
  p("about-journey", "about", w("من نحن: مشوارنا", "About: our journey", "אודות: המסע שלנו"), [S("story-center", "soft"), S("story-timeline", "plain"), S("story-photos", "plain"), S("tst-single", "dark"), S("news-center", "plain")]),
  p("brand-story", "about", w("قصة الماركة", "Brand story", "סיפור המותג"), [S("hero-type", "plain"), S("story-quote", "dark"), S("split-start", "plain"), S("story-values", "soft"), S("gal-mosaic", "plain"), S("cta-big", "plain")]),
  p("contact-map", "contact", w("تواصل: خريطة وكروت", "Contact: map and cards", "צור קשר: מפה וכרטיסים"), [pageHead(C.contactUs, C.writeSub), S("contact-map", "plain"), S("contact-cards", "soft"), S("faq-split", "plain")]),
  p("contact-form", "contact", w("تواصل: نموذج", "Contact: a form", "צור קשר: טופס"), [S("contact-form", "plain"), S("contact-wide", "plain"), S("news-split", "surface")]),
  p("faq-simple", "faq", w("أسئلة شائعة", "Common questions", "שאלות נפוצות"), [pageHead(C.questions, C.writeSub), S("faq-lines", "plain"), S("contact-cards", "plain")]),
  p("faq-help", "faq", w("مركز المساعدة", "Help centre", "מרכז עזרה"), [pageHead(C.questions, C.shippingSub, "bold"), S("faq-split", "plain"), S("faq-plus", "surface"), S("cta-split", "dark")]),
  p("shipping", "policy", w("الشحن والإرجاع", "Delivery and returns", "משלוחים והחזרות"), [pageHead(C.shipping, C.shippingSub), S("feat-four", "surface"), S("faq-plus", "plain"), S("steps-row", "plain"), S("cta-split", "dark")]),
  p("sizes", "policy", w("دليل المقاسات", "Size guide", "מדריך מידות"), [pageHead(C.sizes, C.sizesSub), sizeTabs, measure, S("cta-center", "soft")]),
  p("gift-guide", "gifts", w("دليل الهدايا", "Gift guide", "מדריך מתנות"), [pageHead(C.gifts, C.giftsSub, "bold"), budgets, S("prod-lift", "plain"), S("offer-code", "soft"), S("news-center", "plain")]),
  p("notfound-simple", "notfound", w("404 مع منتجات", "404 with products", "404 עם מוצרים"), [S("notfound", "plain"), S("prod-grid", "surface")]),
  p("notfound-model", "notfound", w("404 بموديل 3D", "404 with a 3D model", "404 עם מודל"), [S("notfound-model", "dark"), S("cats-pills", "plain")]),
  p("launch", "landing", w("إطلاق منتج", "Product launch", "השקת מוצר"), [S("hero-countdown", "dark"), S("m3d-center", "plain"), S("tabs-split", "plain"), S("tst-grid", "soft"), S("faq-lines", "plain"), S("cta-particles", "dark")]),
  p("collection", "landing", w("صفحة مجموعة", "Collection page", "דף קולקציה"), [S("hero-cover", "plain"), S("split-start", "plain"), S("prod-six", "soft"), S("look-points", "plain"), S("news-center", "surface")]),
  p("sale", "landing", w("صفحة تخفيضات", "Sale page", "דף מבצעים"), [S("offer-countdown", "bold"), S("prod-bordered", "plain"), S("offer-code", "soft"), S("feat-four", "surface"), S("faq-plus", "plain")]),
  p("link-in-bio", "landing", w("روابط البايو", "Link in bio", "קישורים בביו"), [linksBio]),
  p("wholesale", "landing", w("الجملة والتجّار", "Wholesale", "סיטונאות"), [pageHead(C.wholesale, C.wholesaleSub), S("feat-cards", "plain"), S("price-three", "surface"), S("contact-form", "plain")]),
  p("members", "landing", w("نادي الزباين", "Members' club", "מועדון לקוחות"), [pageHead(C.loyalty, C.loyaltySub, "bold"), S("steps-cards", "plain"), S("price-three", "soft"), S("faq-lines", "plain"), S("news-center", "dark")]),
  p("soon-simple", "soon", w("قريباً", "Coming soon", "בקרוב"), [S("soon", "dark")]),
  p("soon-stars", "soon", w("قريباً بنجوم ومميزات", "Coming soon with stars and perks", "בקרוב עם כוכבים ויתרונות"), [S("soon-stars", "dark"), S("feat-icons", "plain"), S("news-split", "surface")]),
);

/* ------------------------------------------------------------ the store's own pages */

/** The shop's catalogue (search, filters, sorting, products), the one a shop page must hold. */
const shopPart = (o: { columns?: number; filters?: boolean; search?: boolean; skin?: Skin; title?: W } = {}): Part => (c) => {
  const k = withSkin(c, o.skin ?? "plain");
  const shop: N = { id: k.ids("shop"), type: "shop", props: { columns: o.columns ?? 3, mobileColumns: 2, showFilters: o.filters ?? true, showSearch: o.search ?? true } };
  return SEC(k, [...(o.title ? [H(k, o.title, 2, { style: { margin: [0, 0, 24, 0] } })] : []), shop], { name: w("المنتجات", "Products", "מוצרים"), pad: [48, 24, 80, 24] });
};
/** The cart's three parts, each once: its lines, the order's sums and the checkout. */
const cartPart = (layout: "split" | "stacked" | "summary-first", skin: Skin = "plain"): Part => (c) => {
  const k = withSkin(c, skin);
  const part = (type: "cartItems" | "cartSummary" | "cartCheckout"): N => ({ id: k.ids(type.slice(0, 6)), type, props: {} });
  const order = STACK(k, [part("cartSummary"), part("cartCheckout")], { gap: 24 });
  const body = layout === "stacked"
    ? STACK(k, [part("cartItems"), part("cartSummary"), part("cartCheckout")], { gap: 28, maxWidth: "760px", width: "100%" })
    : layout === "summary-first" ? COLS(k, [1, 2], [[order], [part("cartItems")]], { gap: 32, phone: "reverse" })
    : COLS(k, [2, 1], [[part("cartItems")], [order]], { gap: 32 });
  return SEC(k, [body], { name: w("السلة", "The cart", "הסל"), pad: [40, 24, 80, 24], ...(layout === "stacked" ? { center: true } : {}) });
};
/** Thanks for an order: the words, and the way back to the shop or to the order. */
const thanksHead = (skin: Skin): Part => (c) => {
  const k = withSkin(c, skin);
  return SEC(k, [STACK(k, [
    eyebrow(k, w("تم استلام طلبك", "Your order is in", "ההזמנה התקבלה")),
    H(k, w("شكراً إلك! 💛", "Thank you!", "תודה רבה!"), 1),
    P(k, w("بعتنالك تفاصيل الطلب على الإيميل، ورح نخبرك أول ما يطلع للتوصيل.", "We've emailed your order details and will let you know as soon as it ships.", "שלחנו את פרטי ההזמנה במייל ונעדכן ברגע שתצא למשלוח."), { style: { size: 19, maxWidth: "620px" } }),
    STACK(k, [B(k, w("كمّل التسوّق", "Keep shopping", "להמשיך לקנות"), "/shop"), B(k, w("سؤال عن طلبك؟", "A question about your order?", "שאלה על ההזמנה?"), "/contact", "outline")], { direction: "row", wrap: true, gap: 12, justify: "center" }),
  ], { align: "center", textAlign: "center", gap: 16 })], { name: w("شكراً", "Thanks", "תודה"), pad: [120, 24, 96, 24] });
};

PAGES.push(
  p("shop-classic", "shop", w("المتجر: كلاسيكي", "Shop: classic", "חנות: קלאסי"), [pageHead(w("المتجر", "Shop", "חנות"), w("كل منتجاتنا بمكان واحد، مع بحث وفلاتر.", "All our products in one place, with search and filters.", "כל המוצרים במקום אחד, עם חיפוש וסינון.")), shopPart()]),
  p("shop-banner", "shop", w("المتجر: بغلاف كبير", "Shop: with a big cover", "חנות: עם כריכה גדולה"), [S("hero-cover", "plain"), shopPart({ columns: 4 })]),
  p("shop-categories", "shop", w("المتجر: مع التصنيفات", "Shop: with categories", "חנות: עם קטגוריות"), [pageHead(w("تسوّق", "Shop", "קנייה"), w("اختار تصنيف أو تصفّح كل شي.", "Pick a category or browse everything.", "בחרו קטגוריה או עיינו בהכול."), "plain"), S("cats-circles", "plain"), shopPart()]),
  p("shop-sale", "shop", w("المتجر: تخفيضات", "Shop: sale", "חנות: מבצע"), [S("offer-countdown", "bold"), shopPart({ columns: 4 }), S("faq-plus", "surface")]),
  p("shop-minimal", "shop", w("المتجر: بسيط", "Shop: minimal", "חנות: מינימלי"), [shopPart({ columns: 4, filters: false, title: w("كل المنتجات", "All products", "כל המוצרים") })]),
  p("shop-perks", "shop", w("المتجر: مع المزايا", "Shop: with perks", "חנות: עם יתרונות"), [S("bar-perks", "soft"), pageHead(w("المتجر", "Shop", "חנות"), w("شحن سريع، إرجاع سهل ودفع آمن.", "Fast shipping, easy returns and secure payment.", "משלוח מהיר, החזרה קלה ותשלום מאובטח."), "plain"), shopPart(), S("feat-four", "surface")]),
  p("shop-editorial", "shop", w("المتجر: مجلّة", "Shop: editorial", "חנות: מגזין"), [S("hero-type", "plain"), S("bar-marquee", "dark"), shopPart(), S("news-center", "soft")]),
  p("shop-lookbook", "shop", w("المتجر: إطلالات", "Shop: lookbook", "חנות: לוקבוק"), [S("look-points", "plain"), shopPart({ columns: 3, skin: "surface" }), S("tst-row", "soft")]),
  p("cart-classic", "cart", w("السلة: كلاسيكية", "Cart: classic", "סל: קלאסי"), [pageHead(w("سلة المشتريات", "Shopping cart", "סל הקניות"), w("راجع طلبك قبل الدفع.", "Check your order before paying.", "בדקו את ההזמנה לפני התשלום.")), cartPart("split")]),
  p("cart-stacked", "cart", w("السلة: عمود واحد", "Cart: one column", "סל: עמודה אחת"), [pageHead(w("سلتك", "Your cart", "הסל שלכם"), w("كل شي بعمود واحد واضح.", "Everything in one clear column.", "הכול בעמודה אחת ברורה."), "plain"), cartPart("stacked")]),
  p("cart-trust", "cart", w("السلة: مع الضمانات", "Cart: with guarantees", "סל: עם התחייבויות"), [pageHead(w("سلة المشتريات", "Shopping cart", "סל הקניות"), w("دفع آمن وإرجاع سهل.", "Secure payment and easy returns.", "תשלום מאובטח והחזרה קלה.")), cartPart("split"), S("feat-four", "surface")]),
  p("cart-upsell", "cart", w("السلة: مع اقتراحات", "Cart: with suggestions", "סל: עם הצעות"), [pageHead(w("سلة المشتريات", "Shopping cart", "סל הקניות"), w("وفي كمان إشي ممكن يعجبك.", "There's more you might like too.", "יש עוד דברים שעשויים לאהוב."), "plain"), cartPart("split"), S("prod-row", "soft")]),
  p("cart-steps", "cart", w("السلة: بخطوات", "Cart: with steps", "סל: עם שלבים"), [S("steps-row", "soft"), cartPart("split")]),
  p("cart-help", "cart", w("السلة: مع المساعدة", "Cart: with help", "סל: עם עזרה"), [pageHead(w("طلبك", "Your order", "ההזמנה שלכם"), w("محتاج مساعدة؟ إحنا هون.", "Need a hand? We're here.", "צריכים עזרה? אנחנו כאן."), "plain"), cartPart("summary-first"), S("faq-plus", "surface"), S("contact-cards", "plain")]),
  p("journal-grid", "journal", w("المدوّنة: شبكة", "Journal: grid", "בלוג: רשת"), [pageHead(w("المدوّنة", "Journal", "בלוג"), w("أفكار، نصائح وقصص من عنّا.", "Ideas, tips and stories from us.", "רעיונות, טיפים וסיפורים מאיתנו.")), S("gal-grid", "plain"), S("news-center", "soft")]),
  p("journal-story", "journal", w("المدوّنة: قصّة", "Journal: story", "בלוג: סיפור"), [S("hero-type", "plain"), S("story-photos", "plain"), S("tabs-details", "surface"), S("news-split", "plain")]),
  p("services-cards", "services", w("خدمات: بطاقات وباقات", "Services: cards and plans", "שירותים: כרטיסים וחבילות"), [S("hero-split", "plain"), S("feat-cards", "plain"), S("price-three", "surface"), S("faq-plus", "plain")]),
  p("services-steps", "services", w("خدمات: خطوات", "Services: steps", "שירותים: שלבים"), [pageHead(w("خدماتنا", "Our services", "השירותים שלנו"), w("كيف منشتغل، خطوة بخطوة.", "How we work, step by step.", "איך אנחנו עובדים, צעד אחר צעד.")), S("steps-split", "plain"), S("price-split", "surface"), S("tst-grid", "soft"), S("cta-center", "plain")]),
  p("thanks-simple", "thanks", w("شكراً: بسيطة", "Thanks: simple", "תודה: פשוט"), [thanksHead("soft"), S("prod-row", "plain")]),
  p("thanks-dark", "thanks", w("شكراً: غامقة", "Thanks: dark", "תודה: כהה"), [thanksHead("dark"), S("steps-row", "plain"), S("contact-cards", "surface")]),
  p("track-order", "track", w("تتبّع الطلب", "Track an order", "מעקב הזמנה"), [pageHead(w("وين طلبي؟", "Where's my order?", "איפה ההזמנה שלי?"), w("ابعتلنا رقم الطلب ومنرد عليك بسرعة.", "Send us your order number and we'll reply quickly.", "שלחו לנו את מספר ההזמנה ונחזור מהר.")), S("steps-cards", "plain"), S("contact-form", "surface"), S("faq-lines", "plain")]),
  p("lookbook", "landing", w("صفحة إطلالات", "Lookbook page", "דף לוקבוק"), [S("hero-slider", "plain"), S("look-points", "plain"), S("gal-mosaic", "plain"), S("look-tabs", "soft"), S("cta-big", "dark")]),
);

for (const cp of CAMPAIGNS) {
  PAGES.push({
    key: `campaign-${cp.key}`, kind: "campaign", name: cp.name, campaign: cp,
    build: (c) => {
      const k = { ...withSkin(c, "campaign"), paint: cp.colors };
      return [campaignHero(k, cp), campaignStrip(k, cp), S("prod-lift", "plain")(c), campaignOffer(k, cp), S("feat-four", "surface")(c), S("news-center", "soft")(c)];
    },
  });
}
