/**
 * What the section library's recipes share: the ready words (reviews, a journey, an offer, bundles, people,
 * questions) and the small parts they are put together from (a row of buttons, a heading group, the store's
 * products, categories, reviews, a countdown, a form, running words, a menu, a perk, a number, a step). Kept apart
 * from the recipes so more than one file of recipes can use them.
 */
import { inAWeek } from "../blockDefaults";
import { B, CARD, EL, H, ICON, P, SEC, STACK, mo, pop, say, type Ctx, type N, type SecOpts } from "./build";
import { C, PERKS, SHIPPING_QA, STATS, STEPS, w, type Family, type W } from "./words";

/* ------------------------------------------------------------- the words */

export const QUOTES: Array<{ quote: W; name: W }> = [
  { quote: w("وصل بسرعة وطلع متل الصور بالزبط.", "Arrived fast and exactly like the photos.", "הגיע מהר ובדיוק כמו בתמונות."), name: w("سارة م.", "Sarah M.", "שרה מ.") },
  { quote: w("ردّوا عليّ عالواتساب بدقايق وساعدوني أختار.", "They answered on WhatsApp in minutes and helped me choose.", "ענו לי בוואטסאפ תוך דקות ועזרו לי לבחור."), name: w("أحمد ك.", "Ahmad K.", "אחמד כ.") },
  { quote: w("تالت طلب إلي، وأكيد مش الأخير.", "My third order, and surely not the last.", "ההזמנה השלישית שלי, ובטוח לא האחרונה."), name: w("ليلى ن.", "Layla N.", "ליילה נ.") },
];
export const TIMELINE: Array<[W, W]> = [
  [w("2018", "2018", "2018"), w("بلّشنا من غرفة صغيرة وحلم كبير.", "We started in a small room with a big dream.", "התחלנו בחדר קטן עם חלום גדול.")],
  [w("2020", "2020", "2020"), w("فتحنا المتجر أونلاين ووصلنا لكل البلاد.", "We opened online and reached the whole country.", "פתחנו אונליין והגענו לכל הארץ.")],
  [w("2023", "2023", "2023"), w("صرنا فريق من 12 شخص.", "We became a team of twelve.", "הפכנו לצוות של שנים-עשר.")],
  [w("اليوم", "Today", "היום"), w("أكتر من 12,000 زبون مبسوط.", "More than 12,000 happy customers.", "יותר מ-12,000 לקוחות מרוצים.")],
];
export const OFFER = {
  title: w("خصم 20٪ على كل المتجر", "20% off the whole store", "20% הנחה על כל החנות"),
  code: w("SAVE20", "SAVE20", "SAVE20"),
  use: w("استعملوا الكود عند الدفع، لحد آخر الأسبوع.", "Use the code at checkout, until the end of the week.", "השתמשו בקוד בתשלום, עד סוף השבוע."),
};
export const DETAIL_TABS: Array<[W, W]> = [
  [w("شو فيه", "What's inside", "מה בפנים"), w("كل التفاصيل والمواد مكتوبة بصفحة كل منتج.", "Every detail and material is listed on each product's page.", "כל הפרטים והחומרים מופיעים בדף של כל מוצר.")],
  [w("التوصيل", "Delivery", "משלוח"), w("2–4 أيام عمل، ومجاني فوق ₪200.", "2–4 working days, free over ₪200.", "2–4 ימי עסקים, חינם מעל ₪200.")],
  [w("الإرجاع", "Returns", "החזרות"), w("14 يوم للإرجاع أو التبديل.", "14 days to return or exchange.", "14 יום להחזרה או להחלפה.")],
];
export const BUNDLES: Array<{ name: W; price: string; features: W; featured?: boolean }> = [
  { name: w("باقة صغيرة", "Small bundle", "חבילה קטנה"), price: "₪99", features: w("قطعتين\nتوصيل عادي", "Two pieces\nStandard delivery", "שני פריטים\nמשלוח רגיל") },
  { name: w("باقة العيلة", "Family bundle", "חבילה משפחתית"), price: "₪199", features: w("4 قطع\nتوصيل سريع\nتغليف هدية", "Four pieces\nFast delivery\nGift wrapping", "ארבעה פריטים\nמשלוח מהיר\nאריזת מתנה"), featured: true },
  { name: w("باقة كبيرة", "Big bundle", "חבילה גדולה"), price: "₪349", features: w("8 قطع\nتوصيل مجاني\nتغليف هدية\nإرجاع مجاني", "Eight pieces\nFree delivery\nGift wrapping\nFree returns", "שמונה פריטים\nמשלוח חינם\nאריזת מתנה\nהחזרה חינם") },
];
export const PEOPLE: Array<[W, W]> = [
  [w("ليلى", "Layla", "ליילה"), w("المؤسِّسة", "Founder", "מייסדת")],
  [w("عمر", "Omar", "עומר"), w("المشتريات", "Buying", "רכש")],
  [w("دانا", "Dana", "דנה"), w("خدمة الزباين", "Customer care", "שירות לקוחות")],
];
export const RIGHTS = w("© كل الحقوق محفوظة", "© All rights reserved", "© כל הזכויות שמורות");
export const WHATSAPP = "https://wa.me/972500000000";
export const SEE = w("شوفوا التفاصيل", "See the details", "לפרטים");
export const OUT_OF = w("4.9 من 5 من أكتر من 2,000 تقييم", "4.9 out of 5 from over 2,000 reviews", "4.9 מתוך 5 מיותר מ-2,000 ביקורות");
export const QUESTIONS: Array<[W, W]> = [
  ...SHIPPING_QA.slice(0, 3),
  [w("المنتجات أصلية؟", "Are the products genuine?", "המוצרים מקוריים?"), w("أكيد، كل إشي منجيبه من مصادر رسمية وموثوقة.", "Yes, everything comes from official, trusted sources.", "בוודאי, הכול מגיע ממקורות רשמיים ואמינים.")],
];
/** Three models of each kind of store (the shop's built-in ones). */
export const TRIOS: Record<Family, [string, string, string]> = {
  fashion: ["hanger", "handbag", "sneaker"], shoes: ["sneaker", "handbag", "hanger"], electronics: ["phone", "laptop", "headset"], gaming: ["controller", "headset", "console"],
  beauty: ["perfume", "lipstick", "jar"], jewelry: ["ring", "gem", "watch"], books: ["book", "mug", "lamp"], art: ["frame", "easel", "palette"],
  home: ["lamp", "vase", "mug"], food: ["cake", "mug", "jar"], kids: ["teddy", "blocks", "ball"], sports: ["dumbbell", "ball", "racket"],
  pets: ["bone", "ball", "teddy"], flowers: ["vase", "plant", "mug"], music: ["guitar", "vinyl", "speaker"], general: ["handbag", "mug", "gem"],
};

/* ------------------------------------------------------------ small parts */

export const row = (c: Ctx, kids: N[], center = false) => STACK(c, kids, { direction: "row", gap: 12, wrap: true, align: "center", ...(center ? { justify: "center" } : {}) });
export const ctas = (c: Ctx, center = false, second: [W, string] = [C.more, "/about"]) => row(c, [B(c, c.pack.cta, "/shop"), B(c, second[0], second[1], "outline", { delay: 0.3 })], center);
/** A heading group: centred (a stack keeping its words in the middle) or along the line's start; space under it. */
export const head = (c: Ctx, kids: N[], center = true, space = 40) => STACK(c, kids, { gap: 14, margin: [0, 0, space, 0], ...(center ? { align: "center", textAlign: "center" } : {}) });
export const items = <T,>(list: T[], n: number) => Array.from({ length: n }, (_, i) => list[i % list.length]);
export const sec = (c: Ctx, kids: N[], name: W, o?: SecOpts) => SEC(c, kids, { name, ...o });
export const strip = (c: Ctx, kids: N[], name: W, o?: SecOpts) => SEC(c, kids, { name, pad: [12, 16, 12, 16], phone: { pad: [10, 12, 10, 12] }, ...o });

export const products = (c: Ctx, props: Record<string, unknown>) => EL(c, "products", { source: "new", limit: 8, layout: "grid", ...props }, { style: { self: "stretch" } });
export const categories = (c: Ctx, props: Record<string, unknown>) => EL(c, "categories", { limit: 6, ...props }, { style: { self: "stretch" } });
/** As wide as its place up to `max`: at the line's start, or (`center`) in the middle of a centred group. */
const capped = (max: string, center: boolean) => (center ? { self: "center", width: "100%", maxWidth: max } : { self: "stretch", maxWidth: max });
export const accordion = (c: Ctx, list: Array<[W, W]>, look: string, single = false, center = false) => EL(c, "accordion", { items: list.map(([q, a]) => ({ q: say(c, q), a: say(c, a) })), look, ...(single ? { single: true } : {}) }, { style: capped("820px", center) });
export const quotes = (c: Ctx, layout: string, n = 3) => EL(c, "testimonials", { items: items(QUOTES, n).map((q) => ({ quote: say(c, q.quote), name: say(c, q.name), stars: 5 })), layout }, { style: { self: "stretch" } });
export const countdown = (c: Ctx, look: "boxes" | "plain" = "boxes") => EL(c, "countdown", { until: inAWeek(), look, done: say(c, C.started) });
export const form = (c: Ctx, kind: "newsletter" | "contact", center = false) => EL(c, "form", { kind }, { style: capped("520px", center) });
export const marquee = (c: Ctx, list: W[], size?: number) => EL(c, "marquee", { items: list.map((t) => say(c, t)), speed: 30, pause: true, separator: "✦" }, size ? { style: { size, weight: 800 } } : undefined);
export const menu = (c: Ctx, links: Array<[W, string]>, o: Record<string, unknown> = {}) => EL(c, "menu", { items: links.map(([t, href]) => ({ label: say(c, t), href })), layout: "row", ...o });
export const perk = (c: Ctx, p: (typeof PERKS)[number], o: { center?: boolean; card?: boolean; small?: boolean } = {}) => {
  const kids = [ICON(c, p.icon, { size: o.small ? 28 : 40 }), H(c, p.title, o.small ? 5 : 4, { motion: false }), P(c, p.text, { motion: false, style: { size: o.small ? 14 : 16 } })];
  return o.card ? CARD(c, kids, o.center ? { align: "center", textAlign: "center" } : undefined) : STACK(c, kids, { gap: 10, ...(o.center ? { align: "center", textAlign: "center" } : {}) });
};
export const stat = (c: Ctx, s: (typeof STATS)[number], card = false) => {
  const kids = [H(c, s.n, 2, { motion: mo.num(c), style: { size: 48, color: pop(c) } }), P(c, s.label, { motion: false })];
  return card ? CARD(c, kids, { align: "center", textAlign: "center" }) : STACK(c, kids, { gap: 4, align: "center", textAlign: "center" });
};
export const step = (c: Ctx, s: (typeof STEPS)[number], i: number, card = false) => {
  const kids = [H(c, w(String(i + 1), String(i + 1), String(i + 1)), 2, { motion: false, style: { size: card ? 56 : 40, color: pop(c), weight: 800 } }), H(c, s.title, 4, { motion: false }), P(c, s.text, { motion: false })];
  return card ? CARD(c, kids) : STACK(c, kids, { gap: 8 });
};
export const looks = (c: Ctx) => [
  { x: 32, y: 38, title: say(c, c.pack.product), text: say(c, SEE), href: "/shop" },
  { x: 68, y: 60, title: say(c, c.pack.collection), href: "/shop" },
  { x: 48, y: 84, title: say(c, C.newIn), href: "/shop?sort=new" },
];
export const storeName = (c: Ctx, size = 24) => H(c, C.storeName, 3, { motion: false, style: { size, weight: 800 } });

