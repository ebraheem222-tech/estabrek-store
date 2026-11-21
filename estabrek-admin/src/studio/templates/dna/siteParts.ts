/**
 * Site parts in the section DNA (wave 1, fourth batch): the page's header and footer, a call to act, a newsletter
 * sign-up and the ways to reach the store. Each kind is a set of layouts worn in the looks that suit it
 * (dna/looks.ts). The store's own pieces (its menu, search, forms and questions) take the look's shape where they
 * have one (chips, a line under, filled buttons; a pill, boxed or glass search) and sit on a light panel where they
 * are drawn for a light page. A header or footer keeps the look's pattern and mesh, never an edge or particles.
 */
import { COLS, EL, GRID, ICON, P, STACK, pop, type Ctx, type N } from "../build";
import { RIGHTS, WHATSAPP } from "../parts";
import { C, LINKS_HELP, LINKS_MAIN, LINKS_SOCIAL, PERKS, SHIPPING_QA, w, type IconName, type W } from "../words";
import { button, buttons, card, el, hair, head, isLight, onPop, over, picture, rule, say, section, storePanel, text } from "./kit";
import type { Look } from "./looks";
import type { Layout } from "./heroes";

type S = Record<string, unknown>;
type Link = [W, string];
type Pad = [number, number, number, number];
const t3 = (s: string) => w(s, s, s);

/* ---------------------------------------------------------------- words */

const M = {
  header: w("الهيدر", "Header", "כותרת עליונה"),
  footer: w("الفوتر", "Footer", "כותרת תחתונה"),
  cta: w("دعوة للشراء", "Call to action", "קריאה לפעולה"),
  cart: w("السلة", "Bag", "סל"),
  account: w("حسابي", "My account", "החשבון שלי"),
  promo: w("توصيل مجاني فوق ₪200 · إرجاع خلال 14 يوم", "Free delivery over ₪200 · 14-day returns", "משלוח חינם מעל ₪200 · החזרה תוך 14 יום"),
  tagline: w("قطع مختارة بحب، لكل يوم ولكل مناسبة", "Pieces chosen with care, for every day and every occasion", "פריטים שנבחרו באהבה, לכל יום ולכל אירוע"),
  shopCol: w("تسوّقوا", "Shop", "קנייה"),
  helpCol: w("مساعدة", "Help", "עזרה"),
  pay: w("بنقبل الفيزا والماستركارد والكاش عند الاستلام", "We accept Visa, Mastercard and cash on delivery", "אנחנו מקבלים ויזה, מאסטרקארד ומזומן במסירה"),
  mega: [
    [w("تسوّقوا", "Shop", "קנייה"), "/shop", [
      [w("وصل جديد", "New in", "חדש"), "/shop?sort=new", w("قطع هالأسبوع", "This week's pieces", "הפריטים של השבוע")],
      [w("الأكثر مبيعاً", "Best sellers", "רבי מכר"), "/shop", w("اللي الكل بحبه", "What everyone loves", "מה שכולם אוהבים")],
      [w("كل القطع", "Everything", "הכול"), "/shop", w("من الأول للآخر", "From the first to the last", "מההתחלה ועד הסוף")],
    ]],
    [w("هدايا", "Gifts", "מתנות"), "/shop", [
      [w("أقل من ₪100", "Under ₪100", "עד ₪100"), "/shop?sort=price", w("هدايا صغيرة بتفرّح", "Small gifts that bring a smile", "מתנות קטנות שמשמחות")],
      [w("تغليف هدية", "Gift wrapping", "אריזת מתנה"), "/policies", w("مع كرت بكلمتكم", "With a card in your words", "עם כרטיס במילים שלכם")],
    ]],
    [w("من نحن", "About us", "עלינו"), "/about", []],
    [w("تواصل", "Contact", "צור קשר"), "/contact", []],
  ] as Array<[W, string, Array<[W, string, W]>]>,
  online: w("تسوّقوا أونلاين", "Shop online", "קנו אונליין"),
  onlineSub: w("لباب البيت خلال 2–4 أيام.", "To your door in 2–4 days.", "עד הדלת תוך 2–4 ימים."),
  ask: w("اسألونا قبل ما تختاروا", "Ask us before you choose", "שאלו אותנו לפני שבוחרים"),
  askSub: w("منساعدكم تلاقوا القطعة والمقاس.", "We'll help you find the piece and the size.", "נעזור לכם למצוא את הפריט ואת המידה."),
  reach: w("احكوا معنا", "Talk to us", "דברו איתנו"),
  reachSub: w("بالطريقة اللي بتريحكم، ومنرد بسرعة.", "Whichever way suits you, and we answer quickly.", "בדרך שנוחה לכם, ואנחנו עונים מהר."),
  ways: [
    ["whatsapp", w("واتساب", "WhatsApp", "וואטסאפ"), w("منرد خلال دقايق بساعات الدوام.", "We answer within minutes in opening hours.", "עונים תוך דקות בשעות הפתיחה."), w("ابعتولنا", "Message us", "שלחו הודעה"), WHATSAPP],
    ["phone", w("تلفون", "Phone", "טלפון"), t3("050-000-0000"), w("اتصلوا", "Call us", "התקשרו"), "tel:0500000000"],
    ["mail", w("إيميل", "Email", "אימייל"), C.mailLine, w("اكتبولنا", "Write to us", "כתבו לנו"), "mailto:hello@example.com"],
  ] as Array<[IconName, W, W, W, string]>,
  hoursTitle: w("ساعات الدوام", "Opening hours", "שעות פתיחה"),
  hoursRows: [
    [w("السبت – الخميس", "Saturday – Thursday", "שבת – חמישי"), t3("9:00 – 20:00")],
    [w("الجمعة", "Friday", "שישי"), t3("10:00 – 14:00")],
    [w("الأعياد", "Holidays", "חגים"), w("مسكّر", "Closed", "סגור")],
  ] as Array<[W, W]>,
  directions: w("كيف توصلوا", "Get directions", "איך מגיעים"),
  newsPerks: [w("عروض قبل الكل", "Offers before anyone", "מבצעים לפני כולם"), w("قطع جديدة كل أسبوع", "New pieces every week", "פריטים חדשים כל שבוע"), w("هدية بعيد ميلادكم", "A gift on your birthday", "מתנה ביום ההולדת")],
  privacy: w("منحترم خصوصيتكم، وبتقدروا تلغوا بأي وقت.", "We respect your privacy, and you can leave anytime.", "אנחנו מכבדים את הפרטיות שלכם, ואפשר לצאת בכל רגע."),
  tenOff: w("10٪", "10%", "10%"),
};

/* ---------------------------------------------------------------- pieces */

/** A node with more of its own style on a computer. */
const withBase = (n: N, s: S): N => ({ ...n, style: { ...(n.style ?? {}), base: { ...((n.style as { base?: S } | undefined)?.base ?? {}), ...s } } }) as N;
/** Hidden on a phone (the header keeps its name, its menu and the bag there). */
const offPhone = (n: N): N => ({ ...n, style: { ...(n.style ?? {}), mobile: { ...((n.style as { mobile?: S } | undefined)?.mobile ?? {}), hidden: true } } }) as N;
/** More of its own style on a phone. */
const phoneStyle = (n: N, s: S): N => {
  const st = (n.style ?? {}) as { mobile?: S };
  return { ...n, style: { ...st, mobile: { ...(st.mobile ?? {}), ...s } } } as N;
};
/** Only on a phone. */
const onPhone = (n: N): N => {
  const st = (n.style ?? {}) as { base?: S; mobile?: S };
  return { ...n, style: { ...st, base: { ...(st.base ?? {}), hidden: true }, mobile: { ...(st.mobile ?? {}), hidden: false } } } as N;
};

const line = (c: Ctx): N => STACK(c, [], { height: "1px", width: "100%", bg: hair(c) });
const small = (c: Ctx, t: W, center = false): N => P(c, t, { motion: false, style: { size: 13, ...(center ? { textAlign: "center" } : {}) } });
const fine = (c: Ctx, t: W, o: { center?: boolean; max?: string } = {}): N => P(c, t, { motion: false, style: { size: 15, lineHeight: 1.6, ...(o.max ? { maxWidth: o.max } : {}), ...(o.center ? { textAlign: "center" } : {}) } });
const rowOf = (c: Ctx, kids: N[], style: S = {}): N => STACK(c, kids, { direction: "row", justify: "between", align: "center", gap: 20, ...style });
/** A row that stays one row on a phone too (a row wraps there unless the phone has its own direction). */
const phoneRow = (n: N, gap = 10): N => {
  const st = (n.style ?? {}) as { mobile?: S };
  return { ...n, style: { ...st, mobile: { ...(st.mobile ?? {}), direction: "row", wrap: false, gap } } } as N;
};
const headRow = (c: Ctx, kids: N[], style: S = {}): N => phoneRow(rowOf(c, kids, style));
const panelRadius = (L: Look) => (L.btn.radius >= 999 ? 32 : Math.max(L.btn.radius, Math.min(L.pic.radius, 28)));
/** Inside a panel of its own colour: the store's colour on a light section, the page's light ground on a dark or coloured one. */
const inPanel = (c: Ctx): Ctx => ({ ...c, skin: isLight(c) ? "bold" : "plain" });
const panelPaint = (c: Ctx): S => (isLight(c) ? { bg: "accent", color: "accent-contrast" } : { bg: "bg", color: "text" });

const centred = (c: Ctx, L: Look, t: W, sub?: W, top?: W) =>
  STACK(c, [...(top ? [over(c, L, top, { center: true })].filter((n): n is N => n !== null) : []), head(c, L, t, 2, { center: true }), ...(sub ? [text(c, L, sub, { center: true, max: "560px" })] : [])], { gap: 12, align: "center", textAlign: "center", margin: [0, 0, 40, 0] });
const along = (c: Ctx, L: Look, t: W, sub?: W, top?: W) =>
  STACK(c, [...(top ? [over(c, L, top)].filter((n): n is N => n !== null) : []), head(c, L, t, 2), ...rule(c, L), ...(sub ? [text(c, L, sub, { max: "460px" })] : [])], { gap: 12 });
const ticks = (c: Ctx, L: Look, list: W[]) => STACK(c, list.map((t) => STACK(c, [ICON(c, "check", { size: 18, motion: false }), text(c, L, t)], { direction: "row", gap: 10, align: "center" })), { gap: 10 });
const iconLine = (c: Ctx, icon: IconName, t: W) => STACK(c, [ICON(c, icon, { size: 18, motion: false }), fine(c, t)], { direction: "row", gap: 10, align: "center" });

/** The store's name as its mark, worn the look's way: in a filled label for the looks with solid labels. */
function brand(c: Ctx, L: Look, size = 24, o: { center?: boolean; inColumn?: boolean } = {}): N {
  if (L.eyebrow !== "solid") return head(c, L, C.storeName, 3, { size, center: o.center });
  // In a column the label hugs its words (it would stretch across the column).
  return phoneStyle(STACK(c, [head(c, L, C.storeName, 3, { size: Math.round(size * 0.85), center: o.center })], { pad: [6, 14, 6, 14], bg: pop(c), color: onPop(c), radius: Math.min(L.btn.radius, 12), ...(o.center ? { self: "center" } : o.inColumn ? { self: "start" } : {}) }), { pad: [4, 9, 4, 9] });
}

/** The menu in the look: chips for round buttons, filled buttons for hard-shadow looks, a line under for ruled ones. */
function menuLook(c: Ctx, L: Look): string {
  // Chips and buttons are light or coloured boxes drawn for a light page: on a dark or coloured ground, words only.
  if (!isLight(c)) return L.deco?.rule || L.head.paint === "underline" || L.btn.radius >= 999 ? "underline" : "plain";
  if (L.card === "pop" || L.btn.shade) return "buttons";
  if (L.btn.radius >= 999) return "pills";
  return L.deco?.rule || L.head.paint === "underline" ? "underline" : "plain";
}
const items = (c: Ctx, list: Link[]) => list.map(([t, href]) => ({ label: say(c, t), href }));
function nav(c: Ctx, L: Look, list: Link[], o: { column?: boolean; fold?: boolean; look?: string; center?: boolean } = {}): N {
  return el(c, "menu", { items: items(c, list), layout: o.column ? "column" : "row", look: o.look ?? (o.column ? "plain" : menuLook(c, L)), ...(o.fold ? { phone: "fold" } : {}) }, o.center ? { self: "center" } : {});
}
function searchLook(c: Ctx, L: Look): string {
  if (L.card === "glass" && isLight(c)) return "glass";
  if (L.btn.radius >= 999) return "pill";
  if (L.deco?.rule && isLight(c)) return "underline";
  return L.btn.radius <= 4 ? "boxed" : "rounded";
}
/** The store's search in the look; its box is light, so on a dark or coloured ground its words take the page's text colour. */
const find = (c: Ctx, L: Look, width = "260px", phone = false): N => {
  const box = EL(c, "search", { look: searchLook(c, L) }, { style: { width, maxWidth: phone ? "100%" : "560px", ...(isLight(c) ? {} : { color: "text" }) }, motion: false });
  return phone ? box : offPhone(box);
};

// A smaller bag button on a phone, where the name, the menu and the bag share one row.
const cartBtn = (c: Ctx, L: Look, variant: "solid" | "outline" = "solid") => phoneStyle(button(c, L, M.cart, "/cart", variant), { pad: [7, 13, 7, 13] });
const ends = (c: Ctx, L: Look, variant: "solid" | "outline" = "solid") => headRow(c, [offPhone(button(c, L, M.account, "/account", "link")), cartBtn(c, L, variant)], { gap: 14, justify: "end" });
const band = (c: Ctx, L: Look, t: W) =>
  STACK(c, [P(c, t, { quiet: false, motion: false, style: { size: 13, weight: 600, textAlign: "center" } })], { pad: [8, 16, 8, 16], bg: pop(c), color: onPop(c), radius: Math.min(L.btn.radius, 999), align: "center" });

const H_PAD: Pad = [18, 24, 18, 24];
const headerOf = (c: Ctx, L: Look, kids: N[], pad: Pad = H_PAD) => section(c, L, kids, M.header, { tag: "header", calm: true, pad, phone: { pad: [12, 16, 12, 16] } });
const footerOf = (c: Ctx, L: Look, kids: N[], o: { pad?: Pad; center?: boolean } = {}) =>
  section(c, L, kids, M.footer, { tag: "footer", calm: true, pad: o.pad ?? [64, 24, 36, 24], center: o.center, phone: { pad: [44, 16, 28, 16] } });

const colTitle = (c: Ctx, L: Look, t: W) => head(c, L, t, 5, { size: 16 });
const linksCol = (c: Ctx, L: Look, t: W, list: Link[]) => STACK(c, [colTitle(c, L, t), nav(c, L, list, { column: true })], { gap: 8 });
const about = (c: Ctx, L: Look, o: { center?: boolean; socials?: boolean } = {}) =>
  STACK(c, [brand(c, L, 26, { center: o.center, inColumn: true }), fine(c, c.pack.story, { max: "380px", center: o.center }), ...(o.socials === false ? [] : [nav(c, L, LINKS_SOCIAL, { center: o.center })])], { gap: 14, ...(o.center ? { align: "center", textAlign: "center" } : {}) });
const bottom = (c: Ctx, center = false) =>
  STACK(c, [line(c), STACK(c, [small(c, RIGHTS), small(c, M.pay)], { direction: "row", wrap: true, justify: center ? "center" : "between", gap: 12 })], { gap: 18 });

const newsForm = (c: Ctx, L: Look, o: { center?: boolean; width?: string } = {}) =>
  storePanel(c, L, [el(c, "form", { kind: "newsletter" }, { self: "stretch", width: "100%", maxWidth: "520px" })], {
    ...(o.width ? { width: o.width, maxWidth: "100%" } : {}),
    ...(isLight(c) ? {} : { maxWidth: "560px" }),
    ...(o.center ? { self: "center", width: "100%", maxWidth: "560px" } : {}),
  });
const contactForm = (c: Ctx, L: Look, style: S = {}) => storePanel(c, L, [el(c, "form", { kind: "contact" }, { self: "stretch" })], style);
const mapsOf = (c: Ctx) => `https://maps.google.com/?q=${encodeURIComponent(C.address[c.lang])}`;

/* ---------------------------------------------------------------- headers */

/*
 * A layout's four picks wear four arrangements of it (its place in the picks says which), so the designs of a layout
 * differ in where their big blocks go, not only in their letters: a header or footer is a thin strip where a font
 * alone changes little.
 */
const vOf = (picks: Record<string, string[]>, key: string, L: Look) => Math.max(0, (picks[key] ?? []).indexOf(L.key));
/** A block of colour that sets something apart on any ground: a soft tint on a light section, the page's light ground on a dark one. */
const blockBg = (c: Ctx) => (c.skin === "soft" ? "bg" : isLight(c) ? "accent-soft" : "bg");
const light = (c: Ctx): Ctx => (isLight(c) ? c : { ...c, skin: "plain" });
/** The menu in a capsule of its own. */
const menuBlock = (c: Ctx, L: Look, list: Link[], o: { center?: boolean } = {}) =>
  phoneStyle(STACK(c, [nav(light(c), L, list, { fold: true })], { pad: [4, 14, 4, 14], radius: L.btn.radius >= 999 ? 999 : Math.max(8, Math.min(L.btn.radius + 4, 16)), bg: blockBg(c), color: "text", ...(o.center ? { self: "center" } : {}) }), { pad: [2, 10, 2, 10] });
/** The store's name in a block of the colour that stands out. */
const badge = (c: Ctx, L: Look, size = 26, center = false) =>
  phoneStyle(STACK(c, [head(c, L, C.storeName, 3, { size, center: true })], { pad: [10, 24, 10, 24], bg: pop(c), color: onPop(c), radius: Math.min(L.btn.radius, 16), ...(center ? { self: "center" } : {}) }), { pad: [5, 10, 5, 10] });
const doubleLine = (c: Ctx) => STACK(c, [line(c), line(c)], { gap: 3, width: "100%" });
const megaMenu = (c: Ctx, L: Look) => el(c, "menu", {
  items: M.mega.map(([t, href, kids]) => ({ label: say(c, t), href, ...(kids.length ? { children: kids.map(([k, h, note]) => ({ label: say(c, k), href: h, note: say(c, note) })) } : {}) })),
  layout: "row", look: menuLook(c, L), phone: "fold",
});

export const HEADER_LAYOUTS: Layout[] = [
  { key: "bar", name: w("اسم وقائمة وزر", "A name, a menu and a button", "שם, תפריט וכפתור"), build: (c, L) => {
    const v = vOf(HEADER_PICKS, "bar", L);
    // The menu beside the name; under the name in a band of its own; in a capsule in the middle; or between the two.
    if (v === 1) return headerOf(c, L, [headRow(c, [headRow(c, [brand(c, L), nav(c, L, LINKS_MAIN, { fold: true })], { gap: 36, justify: "start" }), ends(c, L)])]);
    if (v === 2) return headerOf(c, L, [STACK(c, [headRow(c, [brand(c, L, 28), ends(c, L)]), STACK(c, [nav(light(c), L, LINKS_MAIN, { fold: true })], { pad: [6, 16, 6, 16], bg: blockBg(c), color: "text", radius: Math.min(L.btn.radius, 14), align: "center" })], { gap: 12 })]);
    if (v === 3) return headerOf(c, L, [headRow(c, [brand(c, L), menuBlock(c, L, LINKS_MAIN), ends(c, L)])]);
    return headerOf(c, L, [headRow(c, [brand(c, L), nav(c, L, LINKS_MAIN, { fold: true }), ends(c, L)])]);
  } },
  { key: "centre", name: w("الاسم بالنص", "The name in the middle", "השם במרכז"), build: (c, L) => {
    const v = vOf(HEADER_PICKS, "centre", L);
    const menu = nav(c, L, LINKS_MAIN, { fold: true, center: true });
    const kids = v === 1 ? [menu, offPhone(line(c)), brand(c, L, 40, { center: true })]
      : v === 2 ? [brand(c, L, 34, { center: true }), menuBlock(c, L, LINKS_MAIN, { center: true })]
      : v === 3 ? [band(c, L, M.promo), brand(c, L, 34, { center: true }), menu]
      : [offPhone(small(c, M.tagline, true)), brand(c, L, 34, { center: true }), ...rule(c, L), menu];
    return headerOf(c, L, [STACK(c, kids, { gap: 10, align: "center", textAlign: "center" })], [22, 24, 16, 24]);
  } },
  { key: "split", name: w("قائمة من الجهتين", "A menu on each side", "תפריט משני הצדדים"), build: (c, L) => {
    const v = vOf(HEADER_PICKS, "split", L);
    // The name plain, in a block of colour, between two lines, or over a line of words.
    const middle = v === 1 ? badge(c, L, 24) : v === 3 ? STACK(c, [brand(c, L, 28, { center: true }), offPhone(small(c, M.tagline, true))], { gap: 2, align: "center", textAlign: "center" }) : brand(c, L, 28);
    const row = headRow(c, [
      STACK(c, [onPhone(nav(c, L, LINKS_MAIN, { fold: true })), offPhone(nav(c, L, LINKS_MAIN.slice(0, 2)))], { gap: 0 }),
      middle,
      headRow(c, [offPhone(nav(c, L, LINKS_MAIN.slice(2))), cartBtn(c, L, "outline")], { gap: 14, justify: "end" }),
    ]);
    return headerOf(c, L, [v === 2 ? STACK(c, [line(c), row, line(c)], { gap: 12 }) : row]);
  } },
  { key: "search", name: w("بحث عريض وأقسام", "A wide search and a row of departments", "חיפוש רחב ושורת מחלקות"), build: (c, L) => {
    const v = vOf(HEADER_PICKS, "search", L);
    const links: Link[] = [...LINKS_MAIN, ...LINKS_HELP.slice(0, 2)];
    // The search in the row with the departments under it; the departments on top; the search in a band of colour; or under the row.
    const kids = v === 1 ? [nav(c, L, links, { fold: true }), offPhone(line(c)), headRow(c, [brand(c, L), find(c, L, "100%"), ends(c, L)], { gap: 28 })]
      : v === 2 ? [headRow(c, [brand(c, L), nav(c, L, LINKS_MAIN, { fold: true }), ends(c, L)]), STACK(c, [find(c, L, "100%", true)], { pad: [12, 16, 12, 16], bg: pop(c), radius: Math.min(L.btn.radius, 18), align: "center" })]
      : v === 3 ? [headRow(c, [brand(c, L), nav(c, L, LINKS_MAIN, { fold: true }), ends(c, L)]), STACK(c, [find(c, L, "100%", true)], { align: "center", maxWidth: "720px", width: "100%", self: "center" })]
      : [headRow(c, [brand(c, L), find(c, L, "100%"), ends(c, L)], { gap: 28 }), offPhone(line(c)), nav(c, L, links, { fold: true })];
    return headerOf(c, L, [STACK(c, kids, { gap: 12 })], [16, 24, 12, 24]);
  } },
  { key: "promo", name: w("شريط عرض فوق الهيدر", "An offer line over the header", "שורת מבצע מעל הכותרת"), build: (c, L) =>
    headerOf(c, L, [STACK(c, [band(c, L, M.promo), headRow(c, [brand(c, L), nav(c, L, LINKS_MAIN, { fold: true }), ends(c, L)])], { gap: 14 })], [12, 24, 16, 24]) },
  { key: "capsule", name: w("كبسولة عايمة", "A floating capsule", "קפסולה צפה"), build: (c, L) => {
    // The capsule is the page's light ground on any section, so what's inside wears the light skin.
    const k: Ctx = { ...c, skin: "plain" };
    return headerOf(c, L, [phoneStyle(phoneRow(STACK(c, [brand(k, L, 22), nav(k, L, LINKS_MAIN, { fold: true }), ends(k, L)], {
      direction: "row", justify: "between", align: "center", gap: 14, pad: [10, 12, 10, 22], bg: "bg", color: "text",
      radius: L.btn.radius >= 999 ? 999 : Math.max(10, Math.min(L.btn.radius + 8, 24)), shadow: "lg", border: { width: 1, color: "border" },
    }), 8), { pad: [6, 6, 6, 12] })], [22, 24, 22, 24]);
  } },
  { key: "mast", name: w("ترويسة مجلة", "A magazine masthead", "כותרת מגזין"), build: (c, L) => {
    const v = vOf(HEADER_PICKS, "mast", L);
    const links: Link[] = [...LINKS_MAIN, ...LINKS_HELP.slice(0, 1)];
    // Between single lines with a top line of words; between double lines; set to one side over a thick line; or in a block of colour.
    const kids = v === 1 ? [doubleLine(c), brand(c, L, 60, { center: true }), offPhone(small(c, M.tagline, true)), doubleLine(c), nav(c, L, links, { fold: true, center: true, look: "plain" })]
      : v === 2 ? [headRow(c, [brand(c, L, 48), offPhone(STACK(c, [small(c, M.tagline), find(c, L, "240px")], { gap: 8, align: "end" }))]), STACK(c, [], { height: "3px", width: "100%", bg: pop(c) }), nav(c, L, links, { fold: true, look: "plain" })]
      : v === 3 ? [STACK(c, [head(c, L, C.storeName, 3, { size: 52, center: true })], { pad: [18, 24, 18, 24], bg: pop(c), color: onPop(c), radius: Math.min(L.btn.radius, 16), width: "100%", align: "center" }), nav(c, L, links, { fold: true, center: true, look: "plain" })]
      : [offPhone(rowOf(c, [small(c, M.tagline), find(c, L)])), line(c), brand(c, L, 56, { center: true }), line(c), nav(c, L, links, { fold: true, center: true, look: "plain" })];
    return headerOf(c, L, [STACK(c, kids, { gap: 12, align: v === 2 ? "stretch" : "center" })], [16, 24, 12, 24]);
  } },
  { key: "mega", name: w("قائمة بأقسام فرعية", "A menu that opens into departments", "תפריט שנפתח למחלקות"), build: (c, L) => {
    const v = vOf(HEADER_PICKS, "mega", L);
    // The menu in the row; under a row with a wide search; under an offer line; or the name in the middle.
    if (v === 1) return headerOf(c, L, [STACK(c, [headRow(c, [brand(c, L), find(c, L, "100%"), cartBtn(c, L)], { gap: 28 }), offPhone(line(c)), megaMenu(c, L)], { gap: 10 })], [16, 24, 12, 24]);
    if (v === 2) return headerOf(c, L, [STACK(c, [band(c, L, M.promo), headRow(c, [brand(c, L), megaMenu(c, L), cartBtn(c, L)])], { gap: 14 })], [12, 24, 16, 24]);
    if (v === 3) return headerOf(c, L, [headRow(c, [megaMenu(c, L), brand(c, L, 28), headRow(c, [find(c, L, "220px"), cartBtn(c, L)], { gap: 12, justify: "end" })])]);
    return headerOf(c, L, [headRow(c, [brand(c, L), megaMenu(c, L), headRow(c, [find(c, L, "250px"), cartBtn(c, L)], { gap: 12, justify: "end" })])]);
  } },
];

/* ---------------------------------------------------------------- footers */

export const FOOTER_LAYOUTS: Layout[] = [
  { key: "columns", name: w("أعمدة روابط", "Columns of links", "עמודות קישורים"), build: (c, L) => {
    const v = vOf(FOOTER_PICKS, "columns", L);
    const shop = linksCol(c, L, M.shopCol, LINKS_MAIN), help = linksCol(c, L, M.helpCol, LINKS_HELP), follow = linksCol(c, L, C.follow, LINKS_SOCIAL);
    // The name first; the name in a row of its own over the columns; the name last; or every column in a box.
    const top = v === 1 ? COLS(c, [2, 1, 1], [[STACK(c, [brand(c, L, 30, { inColumn: true }), fine(c, c.pack.story, { max: "360px" })], { gap: 12 })], [shop], [help]], { gap: 32 })
      : v === 2 ? COLS(c, [1, 1, 1, 2], [[shop], [help], [follow], [about(c, L, { socials: false })]], { gap: 32 })
      : v === 3 ? GRID(c, 4, [about(c, L, { socials: false }), shop, help, follow].map((k) => card(c, L, [k], { gap: 10, pad: [24, 22, 24, 22], border: { width: 1, color: hair(c) } })), { gap: 16, phone: 1, motion: false })
      : COLS(c, [2, 1, 1, 1], [[about(c, L, { socials: false })], [shop], [help], [follow]], { gap: 32 });
    return footerOf(c, L, [STACK(c, [...(v === 1 ? [rowOf(c, [brand(c, L, 22), nav(c, L, LINKS_SOCIAL)], { wrap: true, gap: 16 }), line(c)] : []), top, bottom(c)], { gap: 36 })]);
  } },
  { key: "news", name: w("نشرة فوق وروابط تحت", "A sign-up above, links below", "הרשמה למעלה, קישורים למטה"), build: (c, L) =>
    footerOf(c, L, [STACK(c, [
      card(c, L, [COLS(c, [1, 1], [[head(c, L, C.join, 3, { size: 28 }), fine(c, C.joinSub)], [newsForm(c, L)]], { gap: 32, align: "center" })], { pad: [30, 30, 30, 30] }),
      COLS(c, [2, 1, 1], [[about(c, L)], [linksCol(c, L, M.shopCol, LINKS_MAIN)], [linksCol(c, L, M.helpCol, LINKS_HELP)]], { gap: 32 }),
      bottom(c),
    ], { gap: 44 })]) },
  { key: "giant", name: w("اسم ضخم تحت", "A giant name at the foot", "שם ענק בתחתית"), build: (c, L) =>
    footerOf(c, L, [STACK(c, [
      COLS(c, [2, 1, 1, 1], [[fine(c, c.pack.story, { max: "360px" })], [nav(c, L, LINKS_MAIN, { column: true })], [nav(c, L, LINKS_HELP, { column: true })], [nav(c, L, LINKS_SOCIAL, { column: true })]], { gap: 28 }),
      // As big as the screen lets it be, and small enough for a long name on a phone.
      withBase(head(c, L, C.storeName, 2, { size: 112, center: true, paint: true }), { sizeMin: 40, lineHeight: 1 }),
      bottom(c, true),
    ], { gap: 36 })], { pad: [72, 24, 32, 24] }) },
  { key: "centre", name: w("كل شي بالنص", "All in the middle", "הכול במרכז"), build: (c, L) => {
    const v = vOf(FOOTER_PICKS, "centre", L);
    const socials = nav(c, L, LINKS_SOCIAL, { center: true, look: "underline" });
    // A name, words and links; a big name between lines; the name and socials in a row over the links; or the name in a block and the links in a capsule.
    const kids = v === 1 ? [line(c), brand(c, L, 44, { center: true }), line(c), nav(c, L, LINKS_MAIN, { center: true, look: "plain" }), socials, bottom(c, true)]
      : v === 2 ? [rowOf(c, [brand(c, L, 26), nav(c, L, LINKS_SOCIAL)], { wrap: true, gap: 16, width: "100%" }), line(c), nav(c, L, LINKS_MAIN, { center: true }), fine(c, c.pack.story, { center: true, max: "520px" }), bottom(c, true)]
      : v === 3 ? [badge(c, L, 26, true), fine(c, c.pack.story, { center: true, max: "520px" }), menuBlock(c, L, LINKS_MAIN, { center: true }), socials, bottom(c, true)]
      : [brand(c, L, 30, { center: true }), fine(c, c.pack.story, { center: true, max: "520px" }), nav(c, L, LINKS_MAIN, { center: true }), socials, bottom(c, true)];
    return footerOf(c, L, [STACK(c, kids, { gap: 18, align: "center", textAlign: "center" })], { center: true });
  } },
  { key: "contact", name: w("روابط وطرق التواصل", "Links and ways to reach us", "קישורים ודרכי קשר"), build: (c, L) => {
    const v = vOf(FOOTER_PICKS, "contact", L);
    const visit = STACK(c, [colTitle(c, L, C.visit), iconLine(c, "bag", C.address), iconLine(c, "phone", C.phoneLine), iconLine(c, "mail", C.mailLine), fine(c, C.hours)], { gap: 10 });
    const links = linksCol(c, L, M.shopCol, [...LINKS_MAIN, ...LINKS_HELP.slice(0, 1)]);
    // The ways to reach last; first and in a box; as a band over the links; or beside the name with the links in a row under.
    const body = v === 1 ? COLS(c, [2, 1, 2], [[card(c, L, [visit], { border: { width: 1, color: hair(c) }, pad: [26, 24, 26, 24] })], [links], [about(c, L)]], { gap: 36 })
      : v === 2 ? STACK(c, [
        GRID(c, 3, M.ways.map(([icon, t, s]) => STACK(c, [ICON(c, icon, { size: 26, motion: false }), STACK(c, [head(c, L, t, 5, { size: 16 }), fine(c, s)], { gap: 2 })], { direction: "row", gap: 12, align: "center" })), { gap: 16, phone: 1, motion: false }),
        line(c),
        COLS(c, [2, 1, 1], [[about(c, L)], [links], [linksCol(c, L, M.helpCol, LINKS_HELP)]], { gap: 32 }),
      ], { gap: 28 })
      : v === 3 ? STACK(c, [COLS(c, [1, 1], [[about(c, L)], [visit]], { gap: 48 }), line(c), nav(c, L, [...LINKS_MAIN, ...LINKS_HELP])], { gap: 24 })
      : COLS(c, [2, 1, 2], [[about(c, L)], [links], [visit]], { gap: 36 });
    return footerOf(c, L, [STACK(c, [body, bottom(c)], { gap: 40 })]);
  } },
  { key: "perks", name: w("مميزات فوق وروابط تحت", "Promises above, links below", "הבטחות למעלה, קישורים למטה"), build: (c, L) =>
    footerOf(c, L, [STACK(c, [
      GRID(c, 4, PERKS.slice(0, 4).map((p) => STACK(c, [ICON(c, p.icon, { size: 28, motion: false }), head(c, L, p.title, 5, { size: 17 }), fine(c, p.text)], { gap: 6 })), { gap: 24, phone: 2, motion: false }),
      line(c),
      COLS(c, [2, 1, 1], [[about(c, L)], [linksCol(c, L, M.shopCol, LINKS_MAIN)], [linksCol(c, L, M.helpCol, LINKS_HELP)]], { gap: 32 }),
      bottom(c),
    ], { gap: 36 })]) },
  { key: "card", name: w("فوتر ببطاقة ملوّنة", "A footer on a coloured card", "כותרת תחתונה על כרטיס צבעוני"), build: (c, L) => {
    const v = vOf(FOOTER_PICKS, "card", L);
    const k = inPanel(c);
    const panel = (kids: N[], style: S = {}) => STACK(c, kids, { gap: 28, pad: [44, 40, 30, 40], radius: panelRadius(L), ...panelPaint(c), ...style });
    // Everything on the card; the card beside plain links; a big name on the card; or a sign-up on the card over the links.
    const body = v === 1 ? COLS(c, [3, 2], [[panel([about(k, L), button(k, L, C.shop, "/shop")], { pad: [40, 36, 40, 36] })], [STACK(c, [linksCol(c, L, M.shopCol, LINKS_MAIN), linksCol(c, L, M.helpCol, LINKS_HELP)], { gap: 24 })]], { gap: 40, align: "center" })
      : v === 2 ? panel([head(k, L, C.storeName, 2, { size: 52, center: true }), fine(k, c.pack.story, { center: true, max: "520px" }), nav(k, L, LINKS_MAIN, { center: true }), nav(k, L, LINKS_SOCIAL, { center: true }), bottom(k, true)], { align: "center", textAlign: "center" })
      : v === 3 ? panel([COLS(k, [1, 1], [[head(k, L, C.join, 3, { size: 26 }), fine(k, C.joinSub)], [newsForm(k, L)]], { gap: 28, align: "center" }), line(k), COLS(k, [2, 1, 1], [[about(k, L)], [linksCol(k, L, M.shopCol, LINKS_MAIN)], [linksCol(k, L, M.helpCol, LINKS_HELP)]], { gap: 32 }), bottom(k)])
      : panel([COLS(k, [2, 1, 1], [[about(k, L)], [linksCol(k, L, M.shopCol, LINKS_MAIN)], [linksCol(k, L, M.helpCol, LINKS_HELP)]], { gap: 32 }), bottom(k)]);
    return footerOf(c, L, [v === 1 ? STACK(c, [body, bottom(c)], { gap: 28 }) : body], { pad: [40, 24, 40, 24] });
  } },
];

/* ---------------------------------------------------------- calls to act */

export const CTA_LAYOUTS: Layout[] = [
  { key: "centre", name: w("دعوة بالنص", "A call in the middle", "קריאה במרכז"), build: (c, L) =>
    section(c, L, [STACK(c, [...[over(c, L, c.pack.eyebrow, { center: true })].filter((n): n is N => n !== null), head(c, L, c.pack.title, 2, { size: 52, center: true }), text(c, L, c.pack.sub, { center: true, max: "560px" }), buttons(c, L, { center: true })], { gap: 18, align: "center" })], M.cta, { center: true }) },
  { key: "split", name: w("كلام وأزرار", "Words and buttons", "מילים וכפתורים"), build: (c, L) =>
    section(c, L, [COLS(c, [3, 2], [[along(c, L, c.pack.title, c.pack.sub, c.pack.eyebrow)], [STACK(c, [buttons(c, L, { second: [C.contactUs, "/contact"] })], { align: "end" })]], { gap: 40, align: "center" })], M.cta) },
  { key: "picture", name: w("صورة ودعوة", "A picture and a call", "תמונה וקריאה"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[picture(c, L, c.pack.product, { aspect: "4 / 3" })], [STACK(c, [along(c, L, c.pack.title, c.pack.sub, c.pack.eyebrow), buttons(c, L)], { gap: 24 })]], { gap: 56, align: "center" })], M.cta) },
  { key: "card", name: w("بطاقة ملوّنة", "A coloured card", "כרטיס צבעוני"), build: (c, L) => {
    const v = vOf(CTA_PICKS, "card", L);
    const k = inPanel(c);
    const words = (center: boolean) => [
      ...[over(k, L, c.pack.eyebrow, { center })].filter((n): n is N => n !== null),
      head(k, L, c.pack.title, 2, { center }),
      text(k, L, c.pack.sub, { center, max: "520px" }),
    ];
    const paint: S = { radius: panelRadius(L), width: "100%", ...panelPaint(c), shadow: "lg" };
    // Centred on the card; words and buttons across it (either way round); or a picture on the card beside the words.
    const body = v === 1 || v === 3
      ? STACK(c, [COLS(k, [3, 2], v === 1 ? [[STACK(c, words(false), { gap: 14 })], [STACK(c, [buttons(k, L)], { align: "end" })]] : [[STACK(c, [buttons(k, L)], { align: "start" })], [STACK(c, words(false), { gap: 14 })]], { gap: 32, align: "center" })], { pad: [48, 44, 48, 44], ...paint })
      : v === 2
        ? STACK(c, [COLS(k, [1, 1], [[picture(k, L, c.pack.product, { aspect: "4 / 3" })], [STACK(c, [...words(false), buttons(k, L)], { gap: 16 })]], { gap: 36, align: "center" })], { pad: [28, 28, 28, 28], ...paint })
        : STACK(c, [...words(true), buttons(k, L, { center: true })], { gap: 18, align: "center", textAlign: "center", pad: [56, 32, 56, 32], maxWidth: "960px", ...paint });
    return section(c, L, [STACK(c, [body], { align: "center" })], M.cta, { center: true });
  } },
  { key: "choices", name: w("طريقين للشراء", "Two ways to buy", "שתי דרכים לקנות"), build: (c, L) =>
    section(c, L, [centred(c, L, c.pack.title, c.pack.sub), GRID(c, 2, ([["bag", M.online, M.onlineSub, C.shop, "/shop"], ["whatsapp", M.ask, M.askSub, M.reach, WHATSAPP]] as Array<[IconName, W, W, W, string]>).map(([icon, t, s, cta, href], i) =>
      card(c, L, [ICON(c, icon, { size: 40 }), head(c, L, t, 3, { size: 26 }), text(c, L, s), button(c, L, cta, href, i === 0 ? "solid" : "outline")], { gap: 14 })), { gap: 20, phone: 1 })], M.cta, { center: true }) },
  { key: "running", name: w("كلام ماشي وزر", "Running words and a button", "מילים רצות וכפתור"), build: (c, L) =>
    section(c, L, [STACK(c, [
      el(c, "marquee", { items: [c.pack.eyebrow, C.storeName, C.newIn].map((t) => say(c, t)), speed: 30, pause: true, separator: "✦" }, { size: 64, weight: L.head.weight, ...(L.head.font ? { font: L.head.font } : {}), ...(L.head.italic ? { italic: true } : {}), self: "stretch" }),
      STACK(c, [head(c, L, c.pack.title, 2, { size: 36, center: true }), text(c, L, c.pack.sub, { center: true, max: "560px" })], { gap: 10, align: "center", pad: [0, 24, 0, 24] }),
      buttons(c, L, { center: true }),
    ], { gap: 28, align: "center" })], M.cta, { center: true, full: true, pad: [L.pad, 0, L.pad, 0] }) },
];

/* ----------------------------------------------------------- newsletters */

export const NEWS_LAYOUTS: Layout[] = [
  { key: "centre", name: w("نشرة بالنص", "A sign-up in the middle", "הרשמה במרכז"), build: (c, L) => {
    const v = vOf(NEWS_PICKS, "centre", L);
    const kids = [ICON(c, "mail", { size: 44 }), head(c, L, C.join, 2, { center: true }), text(c, L, C.joinSub, { center: true, max: "520px" }), newsForm(c, L, { center: true }), small(c, M.privacy, true)];
    // Open on the ground, or (the fourth) framed in the look's card between two lines.
    const body = v === 3
      ? card(c, L, [doubleLine(c), ...kids, doubleLine(c)], { gap: 16, align: "center", textAlign: "center", maxWidth: "760px", width: "100%", self: "center", pad: [36, 40, 36, 40], border: { width: 1, color: hair(c) } })
      : STACK(c, kids, { gap: 16, align: "center" });
    return section(c, L, [body], C.join, { center: true });
  } },
  { key: "split", name: w("كلام ونموذج", "Words and a form", "מילים וטופס"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[along(c, L, C.join, C.joinSub, C.firstOrder)], [STACK(c, [newsForm(c, L), small(c, M.privacy)], { gap: 12 })]], { gap: 48, align: "center" })], C.join) },
  { key: "picture", name: w("صورة ونموذج", "A picture and a form", "תמונה וטופס"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[picture(c, L, C.join, { aspect: "1 / 1" })], [STACK(c, [along(c, L, C.join, C.joinSub), newsForm(c, L), small(c, M.privacy)], { gap: 18 })]], { gap: 56, align: "center" })], C.join) },
  { key: "perks", name: w("شو بتاخدوا ونموذج", "What you get, and a form", "מה מקבלים, וטופס"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[STACK(c, [along(c, L, C.join, C.joinSub), ticks(c, L, M.newsPerks)], { gap: 20 })], [card(c, L, [head(c, L, C.firstOrder, 4, { size: 22 }), newsForm(c, L), small(c, M.privacy)], { gap: 14 })]], { gap: 48, align: "center" })], C.join) },
  { key: "coupon", name: w("كوبون أول طلب", "A first-order coupon", "קופון להזמנה ראשונה"), build: (c, L) => {
    const v = vOf(NEWS_PICKS, "coupon", L);
    const dashed: S = { border: { width: 2, color: pop(c), style: "dashed" }, radius: panelRadius(L) };
    // A dashed coupon; a coupon in the store's colour; a ticket with its number on the side; or the number alone between lines.
    if (v === 2) {
      return section(c, L, [COLS(c, [1, 2], [
        [STACK(c, [head(c, L, M.tenOff, 2, { size: 88, center: true, paint: true })], { align: "center", justify: "center", pad: [24, 16, 24, 16], bg: blockBg(c), color: "text", radius: panelRadius(L) })],
        [STACK(c, [head(c, L, C.firstOrder, 3, { size: 28 }), text(c, L, C.joinSub, { max: "460px" }), newsForm(c, L)], { gap: 14 })],
      ], { gap: 36, align: "center" })], C.firstOrder);
    }
    const k = v === 1 ? inPanel(c) : c;
    const kids = [head(k, L, M.tenOff, 2, { size: 96, center: true, paint: true }), head(k, L, C.firstOrder, 3, { size: 26, center: true }), text(k, L, C.joinSub, { center: true, max: "480px" }), newsForm(k, L, { center: true })];
    const frame: S = v === 1 ? { ...panelPaint(c), radius: panelRadius(L), shadow: "lg" } : v === 3 ? {} : dashed;
    return section(c, L, [STACK(c, [STACK(c, v === 3 ? [line(c), ...kids, line(c)] : kids, { gap: 14, align: "center", textAlign: "center", pad: v === 3 ? [0, 0, 0, 0] : [44, 32, 44, 32], maxWidth: "720px", width: "100%", ...frame })], { align: "center" })], C.firstOrder, { center: true });
  } },
  { key: "bar", name: w("شريط نشرة رفيع", "A slim sign-up bar", "פס הרשמה דק"), build: (c, L) => {
    const v = vOf(NEWS_PICKS, "bar", L);
    const k = v === 3 ? inPanel(c) : c;
    const words = (kk: Ctx, center = false) => STACK(c, [ICON(kk, "mail", { size: 34, motion: false }), STACK(c, [head(kk, L, C.join, 4, { size: 22, center }), small(kk, C.joinSub, center)], { gap: 4 })], { direction: "row", gap: 14, align: "center", maxWidth: "560px", ...(center ? { justify: "center" } : {}) });
    // Words then the form; the form then the words; the two one over the other; or both on a band of the store's colour.
    if (v === 2) return section(c, L, [STACK(c, [words(c, true), newsForm(c, L, { center: true })], { gap: 18, align: "center" })], C.join, { pad: [44, 24, 44, 24], center: true });
    const row = STACK(c, v === 1 ? [newsForm(k, L, { width: "460px" }), words(k)] : [words(k), newsForm(k, L, { width: "460px" })], { direction: "row", wrap: true, justify: "between", align: "center", gap: 24 });
    return section(c, L, [v === 3 ? STACK(c, [row], { pad: [26, 32, 26, 32], radius: panelRadius(L), ...panelPaint(c) }) : row], C.join, { pad: [44, 24, 44, 24] });
  } },
];

/* ---------------------------------------------------------------- contact */

export const CONTACT_LAYOUTS: Layout[] = [
  { key: "form", name: w("تفاصيل ونموذج", "Details and a form", "פרטים וטופס"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3], [
      [STACK(c, [along(c, L, C.writeUs, C.writeSub, C.contactUs), iconLine(c, "phone", C.phoneLine), iconLine(c, "mail", C.mailLine), iconLine(c, "bag", C.address), iconLine(c, "star", C.hours)], { gap: 14 })],
      [contactForm(c, L)],
    ], { gap: 48, align: "start" })], C.contactUs) },
  { key: "cards", name: w("تلات طرق للتواصل", "Three ways to reach us", "שלוש דרכים ליצור קשר"), build: (c, L) =>
    section(c, L, [centred(c, L, M.reach, M.reachSub), GRID(c, 3, M.ways.map(([icon, t, s, cta, href], i) =>
      card(c, L, [ICON(c, icon, { size: 36 }), head(c, L, t, 4, { size: 22, center: true }), text(c, L, s, { center: true }), button(c, L, cta, href, i === 0 ? "solid" : "outline")], { align: "center", textAlign: "center", gap: 12 })), { gap: 18, phone: 1 })], M.reach, { center: true }) },
  { key: "panel", name: w("نموذج ولوحة ملوّنة", "A form and a coloured panel", "טופס ולוח צבעוני"), build: (c, L) => {
    const k = inPanel(c);
    return section(c, L, [COLS(c, [3, 2], [
      [STACK(c, [along(c, L, C.writeUs, C.writeSub), contactForm(c, L)], { gap: 22 })],
      [STACK(c, [head(k, L, C.visit, 3, { size: 28 }), iconLine(k, "bag", C.address), iconLine(k, "phone", C.phoneLine), ...M.hoursRows.map(([d, h]) => rowOf(k, [fine(k, d), head(k, L, h, 5, { size: 16 })], { gap: 12 })), button(k, L, M.directions, mapsOf(c))], { gap: 14, pad: [36, 32, 36, 32], radius: panelRadius(L), ...panelPaint(c) })],
    ], { gap: 40, align: "center" })], C.contactUs);
  } },
  { key: "centre", name: w("نموذج بالنص", "A form in the middle", "טופס במרכז"), build: (c, L) => {
    const v = vOf(CONTACT_PICKS, "centre", L);
    const form = contactForm(c, L, { maxWidth: "680px", width: "100%", self: "center" });
    // The ways to reach under the form as links, or (the second) over it as three small cards.
    const ways = v === 1
      ? GRID(c, 3, M.ways.map(([icon, t, , cta, href]) => card(c, L, [ICON(c, icon, { size: 30, motion: false }), head(c, L, t, 5, { size: 17, center: true }), button(c, L, cta, href, "link")], { align: "center", textAlign: "center", gap: 8, pad: [20, 16, 20, 16] })), { gap: 14, phone: 1, motion: false })
      : STACK(c, M.ways.map(([, t, , , href]) => button(c, L, t, href, "link")), { direction: "row", wrap: true, gap: 22, justify: "center", margin: [28, 0, 0, 0] });
    return section(c, L, v === 1 ? [centred(c, L, C.writeUs, C.writeSub), STACK(c, [ways, form], { gap: 28, maxWidth: "860px", width: "100%", self: "center" })] : [centred(c, L, C.writeUs, C.writeSub), form, ways], C.writeUs, { center: true });
  } },
  { key: "hours", name: w("ساعات الدوام والعنوان", "Opening hours and the address", "שעות פתיחה וכתובת"), build: (c, L) => {
    const v = vOf(CONTACT_PICKS, "hours", L);
    const hours = STACK(c, [along(c, L, M.hoursTitle, C.writeSub), ...M.hoursRows.flatMap(([d, h], i) => [...(i ? [line(c)] : []), rowOf(c, [text(c, L, d), head(c, L, h, 4, { size: 20 })], { gap: 16 })])], { gap: 14 });
    const visit = card(c, L, [ICON(c, "bag", { size: 36 }), head(c, L, C.visit, 3, { size: 28 }), fine(c, C.address), fine(c, C.phoneLine), buttons(c, L, { main: [M.directions, mapsOf(c)], second: [M.ways[0][3], WHATSAPP] })], { gap: 14 });
    // The hours first, or (the second) the address first.
    return section(c, L, [COLS(c, [1, 1], v === 1 ? [[visit], [hours]] : [[hours], [visit]], { gap: 56, align: "center" })], M.hoursTitle);
  } },
  { key: "questions", name: w("أسئلة ورسالة", "Questions and a message", "שאלות והודעה"), build: (c, L) =>
    section(c, L, [COLS(c, [3, 2], [
      [STACK(c, [along(c, L, C.questions), storePanel(c, L, [el(c, "accordion", { items: SHIPPING_QA.slice(0, 3).map(([q, a], i) => ({ q: say(c, q), a: say(c, a), ...(i === 0 ? { open: true } : {}) })), look: L.card === "plain" || L.card === "line" ? "lines" : "cards", single: true }, { self: "stretch" })])], { gap: 22 })],
      [card(c, L, [ICON(c, "whatsapp", { size: 40 }), head(c, L, C.writeUs, 3, { size: 26 }), text(c, L, C.writeSub), buttons(c, L, { main: [M.ways[0][3], WHATSAPP], second: [M.ways[2][3], "mailto:hello@example.com"] })], { gap: 14 })],
    ], { gap: 44, align: "start" })], C.questions) },
];

/* ----------------------------------------------------------------- picks */

export const HEADER_PICKS: Record<string, string[]> = {
  bar: ["airy", "brutal", "noir", "duotone"],
  centre: ["luxe", "marker", "organic", "neon"],
  split: ["arches", "gallery", "heavy", "candy"],
  search: ["minimal", "pillow", "mono", "sport"],
  promo: ["retro", "ink", "blobs", "editorial"],
  capsule: ["glass", "tilted", "carved", "paper"],
  mast: ["editorial", "noir", "gallery", "mono"],
  mega: ["heavy", "sport", "organic", "marker"],
};
export const FOOTER_PICKS: Record<string, string[]> = {
  columns: ["minimal", "editorial", "mono", "glass"],
  news: ["pillow", "candy", "neon", "luxe"],
  giant: ["heavy", "carved", "sport", "noir"],
  centre: ["airy", "arches", "organic", "tilted"],
  contact: ["paper", "gallery", "ink", "retro"],
  perks: ["duotone", "brutal", "blobs", "marker"],
  card: ["organic", "brutal", "noir", "candy"],
};
export const CTA_PICKS: Record<string, string[]> = {
  centre: ["heavy", "ink", "airy", "noir"],
  split: ["brutal", "minimal", "glass", "duotone"],
  picture: ["arches", "organic", "tilted", "luxe"],
  card: ["candy", "retro", "pillow", "mono"],
  choices: ["gallery", "marker", "blobs", "sport"],
  running: ["neon", "carved", "editorial", "paper"],
};
export const NEWS_PICKS: Record<string, string[]> = {
  centre: ["airy", "neon", "candy", "luxe"],
  split: ["editorial", "pillow", "mono", "heavy"],
  picture: ["organic", "arches", "tilted", "noir"],
  perks: ["glass", "retro", "minimal", "ink"],
  coupon: ["brutal", "blobs", "sport", "marker"],
  bar: ["gallery", "duotone", "carved", "paper"],
};
export const CONTACT_PICKS: Record<string, string[]> = {
  form: ["minimal", "editorial", "glass", "pillow"],
  cards: ["candy", "airy", "neon", "brutal"],
  panel: ["luxe", "organic", "retro", "mono"],
  centre: ["arches", "blobs", "noir", "heavy"],
  hours: ["paper", "gallery", "ink", "tilted"],
  questions: ["marker", "sport", "duotone", "carved"],
};
