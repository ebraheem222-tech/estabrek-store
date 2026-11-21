/**
 * New kinds of selling sections in the section DNA (wave 1, third batch): shop the look, build a box, the size guide,
 * the product finder, drops and waitlists, gift cards, the members' club, delivery and returns, and comparing specs.
 * Each kind is a set of layouts worn in the looks that suit it (dna/looks.ts), built from the kit's own pieces and the
 * store's parts (products, countdown, forms, tables, a picture with points).
 */
import { COLS, GRID, ICON, MODEL, STACK, pic, pop, type Ctx, type N } from "../build";
import { countdown } from "../parts";
import { C, PERKS, w, type IconName, type W } from "../words";
import { button, buttons, card, el, head, isLight, over, picture, rule, say, section, storePanel, text } from "./kit";
import type { Look } from "./looks";
import type { Layout } from "./heroes";

type S = Record<string, unknown>;
const t3 = (s: string) => w(s, s, s);

/* ---------------------------------------------------------------- words */

const M = {
  look: w("تسوّقوا الإطلالة", "Shop the look", "קנו את הלוק"),
  lookSub: w("كبسوا على النقاط لتشوفوا كل قطعة.", "Tap the dots to see each piece.", "לחצו על הנקודות כדי לראות כל פריט."),
  lookTwo: w("إطلالتين من الموسم", "Two looks of the season", "שני לוקים של העונה"),
  lookItems: [w("القطعة الأساسية", "The main piece", "הפריט המרכזי"), w("الإضافة اللي بتكمّل", "The finishing touch", "הנגיעה המשלימה"), w("التفصيلة الصغيرة", "The small detail", "הפרט הקטן")],
  lookPrices: ["₪180", "₪95", "₪60"],
  lookAll: w("خدوا الإطلالة كلها", "Take the whole look", "לקחת את כל הלוק"),
  box: w("ركّبوا صندوقكم", "Build your own box", "הרכיבו קופסה משלכם"),
  boxSub: w("اختاروا القطع اللي بتحبوها، وإحنا منغلّفها كهدية.", "Pick the pieces you love, and we wrap them as a gift.", "בחרו את הפריטים שאתם אוהבים, ואנחנו נארוז אותם כמתנה."),
  boxSteps: [
    [w("اختاروا الحجم", "Choose the size", "בחרו גודל"), w("صغير، وسط أو كبير.", "Small, medium or large.", "קטן, בינוני או גדול.")],
    [w("عبّوه", "Fill it", "מלאו אותה"), w("ضيفوا القطع اللي بدكم إياها.", "Add the pieces you want.", "הוסיפו את הפריטים שאתם רוצים.")],
    [w("ضيفوا كلمة", "Add a note", "הוסיפו מילה"), w("كرت بكلماتكم، ببلاش.", "A card in your words, free.", "כרטיס במילים שלכם, בחינם.")],
  ] as Array<[W, W]>,
  boxSizes: [
    [w("صندوق صغير", "Small box", "קופסה קטנה"), "₪149", w("3 قطع", "3 pieces", "3 פריטים")],
    [w("صندوق وسط", "Medium box", "קופסה בינונית"), "₪249", w("5 قطع", "5 pieces", "5 פריטים")],
    [w("صندوق كبير", "Large box", "קופסה גדולה"), "₪399", w("8 قطع وتوصيل مجاني", "8 pieces and free delivery", "8 פריטים ומשלוח חינם")],
  ] as Array<[W, string, W]>,
  boxStart: w("بلّشوا الصندوق", "Start your box", "התחילו את הקופסה"),
  boxPick: w("اختاروا 3 قطع", "Pick three pieces", "בחרו שלושה פריטים"),
  boxSoFar: w("بالصندوق: 2 من 3", "In the box: 2 of 3", "בקופסה: 2 מתוך 3"),
  boxSee: w("شوفوا الصندوق", "See the box", "לראות את הקופסה"),
  sizes: w("دليل المقاسات", "Size guide", "מדריך מידות"),
  sizesSub: w("قيسوا مرة، واختاروا مقاسكم بثقة.", "Measure once, then choose your size with confidence.", "מודדים פעם אחת, ובוחרים מידה בביטחון."),
  sizeRows: [w("الصدر (سم)", "Chest (cm)", "חזה (ס״מ)"), w("الخصر (سم)", "Waist (cm)", "מותניים (ס״מ)"), w("الطول (سم)", "Length (cm)", "אורך (ס״מ)")],
  sizeCols: ["S", "M", "L", "XL"],
  sizeValues: [["86–90", "91–96", "97–102", "103–108"], ["68–72", "73–78", "79–84", "85–90"], ["135", "138", "141", "144"]],
  measure: [
    [w("الصدر", "Chest", "חזה"), w("قيسوا حول أعرض نقطة.", "Measure around the widest point.", "מודדים סביב הנקודה הרחבה ביותר.")],
    [w("الخصر", "Waist", "מותניים"), w("حول أضيق نقطة، بدون شد.", "Around the narrowest point, without pulling.", "סביב הנקודה הצרה ביותר, בלי למתוח.")],
    [w("الطول", "Length", "אורך"), w("من الكتف لتحت.", "From the shoulder down.", "מהכתף ולמטה.")],
  ] as Array<[W, W]>,
  between: w("بين مقاسين؟ اختاروا الأكبر.", "Between two sizes? Choose the larger.", "בין שתי מידות? בחרו את הגדולה."),
  askSize: w("اسألونا عن المقاس", "Ask us about your size", "שאלו אותנו על המידה"),
  finder: w("لاقوا القطعة إلكم", "Find the piece for you", "מצאו את הפריט בשבילכם"),
  finderSub: w("جاوبوا على سؤالين، ومنوصلكم للي بيناسبكم.", "Answer two questions, and we'll take you to what suits you.", "ענו על שתי שאלות, ונביא אתכם למה שמתאים לכם."),
  finderQ1: w("لمين؟", "Who is it for?", "בשביל מי?"),
  finderQ2: w("لأي مناسبة؟", "For what occasion?", "לאיזה אירוע?"),
  finderQ3: w("قدّيش الميزانية؟", "What's the budget?", "מה התקציב?"),
  who: [w("إلي", "For me", "בשבילי"), w("هدية", "A gift", "מתנה"), w("للبيت", "For the home", "לבית"), w("للصغار", "For the little ones", "לקטנים")],
  when: [w("كل يوم", "Every day", "כל יום"), w("سهرة", "An evening out", "ערב בחוץ"), w("عرس", "A wedding", "חתונה"), w("سفر", "Travel", "נסיעה")],
  budget: [t3("₪100"), t3("₪250"), t3("₪500+")],
  drop: w("الإطلاق الجاي", "The next drop", "ההשקה הבאה"),
  dropSub: w("كمية محدودة. سجّلوا لتعرفوا أول ما ينزل.", "A limited run. Sign up to know the moment it lands.", "כמות מוגבלת. הירשמו כדי לדעת ברגע שזה נוחת."),
  soon: w("قريباً", "Soon", "בקרוב"),
  notify: w("نبّهوني", "Notify me", "עדכנו אותי"),
  notified: w("رح نبعتلكم أول ما ينزل.", "We'll write the moment it lands.", "נכתוב לכם ברגע שזה נוחת."),
  dropDate: w("الخميس، الساعة 8 المسا", "Thursday, 8 in the evening", "יום חמישי, בשמונה בערב"),
  gift: w("بطاقة هدية", "Gift card", "כרטיס מתנה"),
  giftSub: w("خلّوا اللي بتحبوهم يختاروا بأنفسهم.", "Let the ones you love choose for themselves.", "תנו לאהובים שלכם לבחור בעצמם."),
  giftBuy: w("اشتروا بطاقة", "Buy a card", "קנו כרטיס"),
  giftAmounts: ["₪100", "₪250", "₪500"],
  giftSteps: [
    [w("اختاروا المبلغ", "Choose the amount", "בחרו סכום"), w("من ₪50 لـ ₪1,000.", "From ₪50 to ₪1,000.", "מ-₪50 עד ₪1,000.")],
    [w("اكتبوا كلمة", "Write a note", "כתבו מילה"), w("منبعتها معها.", "We send it along.", "נשלח אותה יחד.")],
    [w("بتوصل فوراً", "It arrives at once", "מגיע מיד"), w("بالإيميل أو بالواتساب.", "By email or WhatsApp.", "באימייל או בוואטסאפ.")],
  ] as Array<[W, W]>,
  giftGuide: w("هدايا لكل ميزانية", "Gifts for every budget", "מתנות לכל תקציב"),
  giftUnder: [w("أقل من ₪100", "Under ₪100", "עד ₪100"), w("أقل من ₪250", "Under ₪250", "עד ₪250"), w("هدايا فخمة", "Treats", "מתנות מפנקות")],
  club: w("نادي الزباين", "The members' club", "מועדון הלקוחות"),
  clubSub: w("نقاط على كل طلب، وهدايا بعيد ميلادكم.", "Points on every order, and gifts on your birthday.", "נקודות על כל הזמנה, ומתנות ביום ההולדת."),
  tiers: [
    [w("فضّي", "Silver", "כסף"), w("من أول طلب", "From the first order", "מההזמנה הראשונה"), [w("نقطة لكل ₪10", "A point for every ₪10", "נקודה על כל ₪10"), w("هدية بعيد الميلاد", "A birthday gift", "מתנת יום הולדת")]],
    [w("ذهبي", "Gold", "זהב"), w("فوق ₪1,000 بالسنة", "Over ₪1,000 a year", "מעל ₪1,000 בשנה"), [w("نقطة ونص لكل ₪10", "1.5 points for every ₪10", "1.5 נקודות על כל ₪10"), w("توصيل مجاني دايماً", "Free delivery, always", "משלוח חינם תמיד")]],
    [w("VIP", "VIP", "VIP"), w("فوق ₪3,000 بالسنة", "Over ₪3,000 a year", "מעל ₪3,000 בשנה"), [w("نقطتين لكل ₪10", "2 points for every ₪10", "2 נקודות על כל ₪10"), w("قطع قبل الكل", "Pieces before anyone", "פריטים לפני כולם")]],
  ] as Array<[W, W, W[]]>,
  join: w("انضمّوا ببلاش", "Join for free", "הצטרפו בחינם"),
  points: w("10 نقاط = ₪10", "10 points = ₪10", "10 נקודות = ₪10"),
  pointsSteps: [
    [w("اشتروا", "Shop", "קונים"), w("كل ₪10 بنقطة.", "Every ₪10 earns a point.", "כל ₪10 שווה נקודה.")],
    [w("اجمعوا", "Collect", "אוספים"), w("النقاط بتضل معكم.", "Your points stay with you.", "הנקודות נשארות אצלכם.")],
    [w("استعملوا", "Spend", "משתמשים"), w("بدلوها بخصم عالطلب الجاي.", "Trade them for money off your next order.", "מחליפים אותן בהנחה בהזמנה הבאה.")],
  ] as Array<[W, W]>,
  refer: w("ادعوا صاحبكم", "Invite a friend", "הזמינו חבר"),
  referSub: w("هو بياخد ₪30، وإنتو بتاخدوا ₪30.", "They get ₪30, and so do you.", "הוא מקבל ₪30, וגם אתם."),
  referCode: t3("FRIEND30"),
  share: w("شاركوا الرابط", "Share the link", "שתפו את הקישור"),
  delivery: w("التوصيل والإرجاع", "Delivery and returns", "משלוחים והחזרות"),
  deliverySub: w("كل اللي لازم تعرفوه، بمكان واحد.", "All you need to know, in one place.", "כל מה שצריך לדעת, במקום אחד."),
  deliverySteps: [
    [w("اليوم", "Today", "היום"), w("طلبكم بيوصلنا ومنحضّره.", "Your order reaches us and we prepare it.", "ההזמנה מגיעה ואנחנו מכינים אותה.")],
    [w("بكرة", "Tomorrow", "מחר"), w("بيطلع مع شركة التوصيل.", "It leaves with the courier.", "היא יוצאת עם השליח.")],
    [w("خلال 2–4 أيام", "In 2–4 days", "תוך 2–4 ימים"), w("بيوصل لباب البيت.", "It reaches your door.", "היא מגיעה עד הדלת.")],
  ] as Array<[W, W]>,
  deliveryQa: [
    [w("قدّيش التوصيل؟", "How much is delivery?", "כמה עולה המשלוח?"), w("₪20، ومجاني فوق ₪200.", "₪20, and free over ₪200.", "₪20, וחינם מעל ₪200.")],
    [w("كيف بترجّع؟", "How do I return?", "איך מחזירים?"), w("ابعتولنا عالواتساب خلال 14 يوم، ومنبعت مين يستلم.", "Message us on WhatsApp within 14 days, and we'll send someone to collect.", "כתבו לנו בוואטסאפ תוך 14 יום, ונשלח מישהו לאסוף.")],
    [w("بقدر أبدّل المقاس؟", "Can I swap the size?", "אפשר להחליף מידה?"), w("أكيد، أول تبديل علينا.", "Of course, the first swap is on us.", "בטח, ההחלפה הראשונה עלינו.")],
    [w("بتوصلوا لكل البلاد؟", "Do you deliver everywhere?", "אתם שולחים לכל מקום?"), w("آه، لكل المدن والقرى.", "Yes, to every town and village.", "כן, לכל עיר וכפר.")],
  ] as Array<[W, W]>,
  zones: [w("المنطقة", "Area", "אזור"), w("السعر", "Price", "מחיר"), w("المدة", "Time", "זמן")],
  zoneRows: [
    [w("الشمال", "The north", "הצפון"), "₪20", w("2–3 أيام", "2–3 days", "2–3 ימים")],
    [w("المركز", "The centre", "המרכז"), "₪25", w("2–4 أيام", "2–4 days", "2–4 ימים")],
    [w("الجنوب", "The south", "הדרום"), "₪30", w("3–5 أيام", "3–5 days", "3–5 ימים")],
  ] as Array<[W, string, W]>,
  specs: w("قارنوا قبل ما تختاروا", "Compare before you choose", "השוו לפני שבוחרים"),
  specsSub: w("الفرق بين الموديلات، بلمحة.", "How the models differ, at a glance.", "ההבדלים בין הדגמים, במבט אחד."),
  models: [w("أساسي", "Basic", "בסיסי"), w("برو", "Pro", "פרו"), w("ماكس", "Max", "מקס")],
  specRows: [w("الحجم", "Size", "גודל"), w("الوزن", "Weight", "משקל"), w("الضمان", "Warranty", "אחריות"), w("هدية بالعلبة", "A gift in the box", "מתנה בקופסה")],
  specValues: [["S", "M", "L"], ["320 g", "290 g", "270 g"], ["1", "2", "3"]],
  years: w("سنين", "years", "שנים"),
  best: w("الأكثر اختياراً", "Most chosen", "הנבחר ביותר"),
  highlights: [
    [t3("48h"), w("بطارية بتضل يومين", "A battery that lasts two days", "סוללה ליומיים")],
    [t3("2×"), w("أسرع من قبل", "Faster than before", "מהיר יותר")],
    [t3("270g"), w("أخف بالإيد", "Lighter in the hand", "קל יותר ביד")],
  ] as Array<[W, W]>,
  vsA: w("هالموديل", "This model", "הדגם הזה"),
  vsB: w("الموديل القديم", "The old model", "הדגם הישן"),
};

/* ---------------------------------------------------------------- pieces */

const centred = (c: Ctx, L: Look, t: W, sub?: W, top?: W) =>
  STACK(c, [...(top ? [over(c, L, top, { center: true })].filter((n): n is N => n !== null) : []), head(c, L, t, 2, { center: true }), ...(sub ? [text(c, L, sub, { center: true, max: "560px" })] : [])], { gap: 12, align: "center", textAlign: "center", margin: [0, 0, 40, 0] });
const along = (c: Ctx, L: Look, t: W, sub?: W, top?: W) =>
  STACK(c, [...(top ? [over(c, L, top)].filter((n): n is N => n !== null) : []), head(c, L, t, 2), ...rule(c, L), ...(sub ? [text(c, L, sub, { max: "460px" })] : [])], { gap: 12 });
const numbered = (c: Ctx, L: Look, i: number, t: W, s: W, o: { card?: boolean; center?: boolean } = {}) => {
  const kids = [head(c, L, t3(String(i + 1).padStart(2, "0")), 3, { size: 36, center: o.center }), head(c, L, t, 4, { size: 20, center: o.center }), text(c, L, s, { center: o.center })];
  const style: S = { gap: 8, ...(o.center ? { align: "center", textAlign: "center" } : {}) };
  return o.card ? card(c, L, kids, style) : STACK(c, kids, style);
};
const ticks = (c: Ctx, L: Look, list: W[]) => STACK(c, list.map((t) => STACK(c, [ICON(c, "check", { size: 18, motion: false }), text(c, L, t)], { direction: "row", gap: 10, align: "center" })), { gap: 10 });
/** A small rounded label (a size, a choice, an amount), linking where it goes. */
const chip = (c: Ctx, L: Look, t: W, href = "/shop", on = false) => {
  const b = button(c, L, t, href, on ? "solid" : "outline");
  return b;
};
const chips = (c: Ctx, L: Look, list: W[], center = false, hrefOf: (i: number) => string = () => "/shop") =>
  STACK(c, list.map((t, i) => chip(c, L, t, hrefOf(i), i === 0)), { direction: "row", wrap: true, gap: 10, ...(center ? { justify: "center" } : {}) });
/** The store's points-on-a-picture element. */
const lookPicture = (c: Ctx, L: Look, style: S = {}) =>
  el(c, "hotspots", { src: pic(c), alt: say(c, M.look), items: M.lookItems.map((t, i) => ({ x: [34, 62, 46][i], y: [36, 58, 82][i], title: say(c, t), text: say(c, t3(M.lookPrices[i])), href: "/shop" })) }, { self: "stretch", radius: Math.min(L.pic.radius || 0, 28), ...style });
/** A gift card in the store's colour on a light section; light on a dark or coloured one (it would vanish there). */
const giftCard = (c: Ctx, L: Look, amount: string, tilt = 0) => {
  const k: Ctx = { ...c, skin: isLight(c) ? "bold" : "plain" };
  return STACK(c, [
    STACK(c, [head(k, L, C.storeName, 4, { size: 18 }), ICON(k, "gift", { size: 28, motion: false })], { direction: "row", justify: "between", align: "center" }),
    head(k, L, t3(amount), 3, { size: 44 }),
    text(k, L, M.gift),
  ], { gap: 14, pad: [28, 28, 28, 28], bg: isLight(c) ? "accent" : "bg", color: isLight(c) ? "accent-contrast" : "text", radius: Math.max(14, Math.min(L.btn.radius === 999 ? 22 : L.btn.radius, 24)), aspect: "16 / 10", justify: "between", shadow: "lg", ...(tilt ? { rotateZ: tilt } : {}) });
};
const sizeTable = (c: Ctx, L: Look) =>
  storePanel(c, L, [el(c, "comparison", {
    label: say(c, M.sizes),
    columns: M.sizeCols.map((s) => ({ title: say(c, t3(s)) })),
    rows: M.sizeRows.map((r, i) => ({ label: say(c, r), values: M.sizeValues[i].map((v) => ({ text: say(c, t3(v)), state: "text" })) })),
    caption: say(c, M.between),
  }, { self: "stretch" })]);
const specTable = (c: Ctx, L: Look) =>
  storePanel(c, L, [el(c, "comparison", {
    label: say(c, M.specs),
    columns: M.models.map((m, i) => ({ title: say(c, m), ...(i === 1 ? { highlight: true, subtitle: say(c, M.best) } : {}), href: "/shop", cta: say(c, C.shop) })),
    rows: [
      ...M.specRows.slice(0, 3).map((r, i) => ({ label: say(c, r), values: M.specValues[i].map((v) => ({ text: say(c, i === 2 ? w(`${v} ${M.years.ar}`, `${v} ${M.years.en}`, `${v} ${M.years.he}`) : t3(v)), state: "text" })) })),
      { label: say(c, M.specRows[3]), values: [{ state: "no" }, { state: "yes" }, { state: "yes" }] },
    ],
  }, { self: "stretch" })]);
const notifyForm = (c: Ctx, L: Look, center = false) =>
  storePanel(c, L, [el(c, "form", { kind: "newsletter", button: say(c, M.notify), done: say(c, M.notified) }, { self: center ? "center" : "stretch", width: "100%", maxWidth: "520px" })], isLight(c) ? {} : { maxWidth: "560px", self: center ? "center" : "stretch" });

/* -------------------------------------------------------- shop the look */

export const LOOK_LAYOUTS: Layout[] = [
  { key: "big", name: w("صورة كبيرة بنقاط", "A big picture with points", "תמונה גדולה עם נקודות"), build: (c, L) =>
    section(c, L, [centred(c, L, M.look, M.lookSub), lookPicture(c, L, { maxWidth: "1000px", self: "center" })], M.look, { center: true }) },
  { key: "side", name: w("صورة بنقاط ومنتجات", "Points on a picture and products", "נקודות על תמונה ומוצרים"), build: (c, L) =>
    section(c, L, [COLS(c, [3, 2], [[lookPicture(c, L)], [STACK(c, [along(c, L, M.look, M.lookSub), storePanel(c, L, [el(c, "products", { source: "best", limit: 2, columns: 2, card: "plain" }, { self: "stretch" })]), button(c, L, M.lookAll, "/shop")], { gap: 22 })]], { gap: 40, align: "center" })], M.look) },
  { key: "two", name: w("إطلالتين", "Two looks", "שני לוקים"), build: (c, L) =>
    section(c, L, [centred(c, L, M.lookTwo, M.lookSub), GRID(c, 2, [lookPicture(c, L), lookPicture(c, L)], { gap: 24, phone: 1 })], M.lookTwo, { center: true }) },
  { key: "list", name: w("صورة وقائمة القطع", "A picture and its pieces", "תמונה והפריטים שבה"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [
      [lookPicture(c, L)],
      [STACK(c, [along(c, L, M.look), ...M.lookItems.map((t, i) => STACK(c, [head(c, L, t3(String(i + 1)), 4, { size: 22 }), STACK(c, [head(c, L, t, 5, { size: 18 }), text(c, L, t3(M.lookPrices[i]))], { gap: 2 })], { direction: "row", gap: 16, align: "center", pad: [0, 0, 14, 0] })), buttons(c, L, { main: [M.lookAll, "/shop"] })], { gap: 18 })],
    ], { gap: 56, align: "center" })], M.look) },
];

/* ----------------------------------------------------------- build a box */

export const BOX_LAYOUTS: Layout[] = [
  { key: "steps", name: w("تلات خطوات للصندوق", "Three steps to a box", "שלושה צעדים לקופסה"), build: (c, L) =>
    section(c, L, [centred(c, L, M.box, M.boxSub), GRID(c, 3, M.boxSteps.map(([t, s], i) => numbered(c, L, i, t, s, { card: true, center: true })), { gap: 18, phone: 1 }), STACK(c, [button(c, L, M.boxStart, "/shop")], { align: "center", margin: [32, 0, 0, 0] })], M.box, { center: true }) },
  { key: "sizes", name: w("أحجام الصندوق", "Box sizes", "גדלי קופסה"), build: (c, L) =>
    section(c, L, [centred(c, L, M.box, M.boxSub), GRID(c, 3, M.boxSizes.map(([n, price, holds], i) => card(c, L, [ICON(c, "gift", { size: 36 }), head(c, L, n, 4, { size: 22, center: true }), head(c, L, t3(price), 3, { size: 40, center: true }), text(c, L, holds, { center: true }), button(c, L, M.boxStart, "/shop", i === 1 ? "solid" : "outline")], { align: "center", textAlign: "center", gap: 12 })), { gap: 18, phone: 1 })], M.box, { center: true }) },
  { key: "picture", name: w("صورة الصندوق وخطواته", "The box and its steps", "הקופסה והצעדים"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[picture(c, L, M.box, { aspect: "1 / 1" })], [STACK(c, [along(c, L, M.box, M.boxSub), ...M.boxSteps.map(([t, s], i) => numbered(c, L, i, t, s)), button(c, L, M.boxStart, "/shop")], { gap: 20 })]], { gap: 56, align: "center" })], M.box) },
  { key: "fill", name: w("عبّوا الصندوق", "Fill the box", "מלאו את הקופסה"), build: (c, L) =>
    section(c, L, [
      STACK(c, [along(c, L, M.box, M.boxPick), card(c, L, [head(c, L, M.boxSoFar, 4, { size: 20 }), STACK(c, [STACK(c, [], { width: "66%", height: "8px", radius: 8, bg: pop(c) })], { height: "8px", radius: 8, bg: isLight(c) ? "border" : "muted", width: "220px" }), button(c, L, M.boxSee, "/cart", "link")], { gap: 10 })], { direction: "row", wrap: true, gap: 24, justify: "between", align: "end", margin: [0, 0, 32, 0] }),
      storePanel(c, L, [el(c, "products", { source: "new", limit: 4, columns: 4, card: "bordered" }, { self: "stretch" })]),
    ], M.box) },
];

/* ------------------------------------------------------------ size guide */

export const SIZE_LAYOUTS: Layout[] = [
  { key: "table", name: w("جدول المقاسات", "The size table", "טבלת המידות"), build: (c, L) =>
    section(c, L, [centred(c, L, M.sizes, M.sizesSub), sizeTable(c, L)], M.sizes, { center: true }) },
  { key: "measure", name: w("كيف تقيسوا", "How to measure", "איך מודדים"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[picture(c, L, M.sizes, { aspect: "3 / 4" })], [STACK(c, [along(c, L, M.sizes, M.sizesSub), ...M.measure.map(([t, s], i) => numbered(c, L, i, t, s)), button(c, L, M.askSize, "/contact", "outline")], { gap: 20 })]], { gap: 56, align: "center" })], M.sizes) },
  { key: "table-tips", name: w("جدول ونصايح", "A table and tips", "טבלה וטיפים"), build: (c, L) =>
    section(c, L, [COLS(c, [3, 2], [[sizeTable(c, L)], [STACK(c, [along(c, L, M.sizes), ...M.measure.map(([t, s]) => card(c, L, [head(c, L, t, 4, { size: 20 }), text(c, L, s)], { gap: 6 }))], { gap: 14 })]], { gap: 40, align: "start" })], M.sizes) },
  { key: "cards", name: w("بطاقة لكل مقاس", "A card for each size", "כרטיס לכל מידה"), build: (c, L) =>
    section(c, L, [centred(c, L, M.sizes, M.between), GRID(c, 4, M.sizeCols.map((s, i) => card(c, L, [head(c, L, t3(s), 2, { size: 56, center: true }), ...M.sizeRows.map((r, k) => text(c, L, w(`${r.ar}: ${M.sizeValues[k][i]}`, `${r.en}: ${M.sizeValues[k][i]}`, `${r.he}: ${M.sizeValues[k][i]}`), { center: true }))], { align: "center", textAlign: "center", gap: 8 })), { gap: 16, phone: 2 })], M.sizes, { center: true }) },
];

/* ---------------------------------------------------------- product finder */

/** A choice leads to the store's search for its words, in the page's language. */
const searchOf = (c: Ctx, list: W[]) => (i: number) => `/search?q=${encodeURIComponent(list[i][c.lang])}`;

export const FINDER_LAYOUTS: Layout[] = [
  { key: "choices", name: w("أربع خيارات", "Four choices", "ארבע אפשרויות"), build: (c, L) =>
    section(c, L, [centred(c, L, M.finder, M.finderSub, M.finderQ1), GRID(c, 4, M.who.map((t, i) => card(c, L, [ICON(c, (["heart", "gift", "sparkle", "star"] as IconName[])[i], { size: 40 }), head(c, L, t, 4, { size: 20, center: true }), button(c, L, C.all, searchOf(c, M.who)(i), "link")], { align: "center", textAlign: "center", gap: 12 })), { gap: 16, phone: 2 })], M.finder, { center: true }) },
  { key: "questions", name: w("سؤال ورا سؤال", "One question after another", "שאלה אחרי שאלה"), build: (c, L) =>
    section(c, L, [centred(c, L, M.finder, M.finderSub), STACK(c, ([[M.finderQ1, M.who], [M.finderQ2, M.when], [M.finderQ3, M.budget]] as Array<[W, W[]]>).map(([q, list], i) => STACK(c, [
      // The question's number in its own round label (a "1." beside Arabic words turns round in a right-to-left line).
      STACK(c, [STACK(c, [text(c, L, t3(String(i + 1)), { center: true })], { width: "34px", height: "34px", radius: 999, align: "center", justify: "center", border: { width: 1.5, color: isLight(c) ? "border" : pop(c) } }), head(c, L, q, 4, { size: 22, center: true })], { direction: "row", gap: 10, align: "center", justify: "center" }),
      chips(c, L, list, true, searchOf(c, list)),
    ], { gap: 14, align: "center" })), { gap: 32, align: "center" })], M.finder, { center: true }) },
  { key: "split", name: w("كلام وخيارات", "Words and choices", "מילים ואפשרויות"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3], [[along(c, L, M.finder, M.finderSub)], [card(c, L, [head(c, L, M.finderQ1, 4, { size: 20 }), chips(c, L, M.who, false, searchOf(c, M.who)), head(c, L, M.finderQ2, 4, { size: 20 }), chips(c, L, M.when, false, searchOf(c, M.when))], { gap: 14, pad: [32, 30, 32, 30] })]], { gap: 48, align: "center" })], M.finder) },
  { key: "pictures", name: w("خيارات بصور", "Choices with pictures", "אפשרויות עם תמונות"), build: (c, L) =>
    section(c, L, [centred(c, L, M.finder, undefined, M.finderQ2), GRID(c, 4, M.when.map((t, i) => STACK(c, [picture(c, L, t, { aspect: "3 / 4" }), head(c, L, t, 4, { size: 20, center: true }), button(c, L, C.all, searchOf(c, M.when)(i), "link")], { gap: 10, align: "center" })), { gap: 18, phone: 2 })], M.finder, { center: true }) },
];

/* ------------------------------------------------------- drops, waitlists */

export const DROP_LAYOUTS: Layout[] = [
  { key: "countdown", name: w("عدّاد وقائمة انتظار", "A countdown and a waitlist", "ספירה לאחור ורשימת המתנה"), build: (c, L) =>
    section(c, L, [STACK(c, [centred(c, L, M.drop, M.dropSub, M.soon), countdown(c), notifyForm(c, L, true)], { gap: 24, align: "center" })], M.drop, { center: true }) },
  { key: "picture", name: w("صورة الإطلاق ووعد", "The drop's picture and a promise", "תמונת ההשקה"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[picture(c, L, M.drop, { aspect: "4 / 5" })], [STACK(c, [along(c, L, M.drop, M.dropSub, M.soon), countdown(c), notifyForm(c, L)], { gap: 22 })]], { gap: 56, align: "center", phone: "reverse" })], M.drop) },
  { key: "teaser", name: w("قريباً بخط ضخم", "Soon, in huge letters", "בקרוב, באותיות ענק"), build: (c, L) =>
    section(c, L, [STACK(c, [head(c, L, M.soon, 2, { size: 160, center: true }), text(c, L, M.dropDate, { center: true }), text(c, L, M.dropSub, { center: true, max: "520px" }), notifyForm(c, L, true)], { gap: 18, align: "center" })], M.drop, { center: true }) },
  { key: "model", name: w("موديل 3D وعدّاد", "A 3D model and a countdown", "מודל תלת־ממד וספירה"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[STACK(c, [along(c, L, M.drop, M.dropSub, M.soon), countdown(c), notifyForm(c, L)], { gap: 22 })], [MODEL(c, { props: { anim: { type: "spin", speed: 0.6 } } })]], { gap: 40, align: "center" })], M.drop) },
];

/* ------------------------------------------------------------ gift cards */

export const GIFT_LAYOUTS: Layout[] = [
  { key: "three", name: w("تلات بطاقات هدايا", "Three gift cards", "שלושה כרטיסי מתנה"), build: (c, L) =>
    section(c, L, [centred(c, L, M.gift, M.giftSub), GRID(c, 3, M.giftAmounts.map((a, i) => giftCard(c, L, a, [-2, 0, 2][i])), { gap: 24, phone: 1 }), STACK(c, [button(c, L, M.giftBuy, "/shop")], { align: "center", margin: [36, 0, 0, 0] })], M.gift, { center: true }) },
  { key: "split", name: w("بطاقة كبيرة ومبالغ", "A big card and amounts", "כרטיס גדול וסכומים"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[giftCard(c, L, M.giftAmounts[1])], [STACK(c, [along(c, L, M.gift, M.giftSub), chips(c, L, M.giftAmounts.map(t3)), button(c, L, M.giftBuy, "/shop")], { gap: 22 })]], { gap: 56, align: "center" })], M.gift) },
  { key: "steps", name: w("كيف بتشتغل البطاقة", "How the card works", "איך הכרטיס עובד"), build: (c, L) =>
    section(c, L, [COLS(c, [3, 2], [[STACK(c, [along(c, L, M.gift, M.giftSub), GRID(c, 3, M.giftSteps.map(([t, s], i) => numbered(c, L, i, t, s)), { gap: 20, phone: 1 })], { gap: 24 })], [giftCard(c, L, M.giftAmounts[2], 2)]], { gap: 48, align: "center" })], M.gift) },
  { key: "guide", name: w("هدايا حسب الميزانية", "Gifts by budget", "מתנות לפי תקציב"), build: (c, L) =>
    section(c, L, [centred(c, L, M.giftGuide, M.giftSub), GRID(c, 3, M.giftUnder.map((t) => STACK(c, [picture(c, L, t, { aspect: "4 / 5" }), head(c, L, t, 4, { size: 22, center: true }), button(c, L, C.shop, "/shop", "link")], { gap: 10, align: "center" })), { gap: 22, phone: 1 })], M.giftGuide, { center: true }) },
];

/* ------------------------------------------------------ the members' club */

export const CLUB_LAYOUTS: Layout[] = [
  { key: "tiers", name: w("تلات درجات", "Three tiers", "שלוש דרגות"), build: (c, L) =>
    section(c, L, [centred(c, L, M.club, M.clubSub), GRID(c, 3, M.tiers.map(([n, from, perks], i) => card(c, L, [head(c, L, n, 3, { size: 30 }), text(c, L, from), ticks(c, L, perks), button(c, L, M.join, "/account", i === 1 ? "solid" : "outline")], { gap: 14, ...(i === 1 ? { border: { width: 2, color: pop(c) } } : {}) })), { gap: 18, phone: 1 })], M.club, { center: true }) },
  { key: "points", name: w("كيف بتجمعوا النقاط", "How points add up", "איך צוברים נקודות"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3], [[STACK(c, [over(c, L, M.club), head(c, L, M.points, 2, { size: 64 }), text(c, L, M.clubSub), button(c, L, M.join, "/account")].filter((n): n is N => n !== null), { gap: 18 })], [GRID(c, 3, M.pointsSteps.map(([t, s], i) => numbered(c, L, i, t, s, { card: true })), { gap: 16, phone: 1 })]], { gap: 48, align: "center" })], M.club) },
  { key: "refer", name: w("ادعوا صاحبكم", "Invite a friend", "הזמינו חבר"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[picture(c, L, M.refer, { aspect: "1 / 1" })], [STACK(c, [along(c, L, M.refer, M.referSub, M.club), STACK(c, [text(c, L, C.code), head(c, L, M.referCode, 4)], { direction: "row", gap: 10, align: "center", self: "start", pad: [10, 18, 10, 18], radius: Math.min(L.btn.radius, 999), border: { width: 2, color: pop(c), style: "dashed" } }), buttons(c, L, { main: [M.share, "/account"], second: [M.join, "/account"] })], { gap: 20 })]], { gap: 56, align: "center" })], M.refer) },
  { key: "join", name: w("بطاقة انضمام", "A card to join", "כרטיס הצטרפות"), build: (c, L) =>
    section(c, L, [STACK(c, [card(c, L, [ICON(c, "star", { size: 48 }), head(c, L, M.club, 2, { center: true }), text(c, L, M.clubSub, { center: true }), ticks(c, L, M.tiers[0][2].concat(M.tiers[1][2].slice(1))), button(c, L, M.join, "/account")], { align: "center", textAlign: "center", gap: 16, pad: [44, 36, 44, 36], maxWidth: "620px", width: "100%" })], { align: "center" })], M.club, { center: true }) },
];

/* ---------------------------------------------------- delivery and returns */

export const DELIVERY_LAYOUTS: Layout[] = [
  { key: "timeline", name: w("من الطلب للباب", "From the order to your door", "מההזמנה עד הדלת"), build: (c, L) =>
    section(c, L, [centred(c, L, M.delivery, M.deliverySub), GRID(c, 3, M.deliverySteps.map(([t, s], i) => STACK(c, [ICON(c, (["bag", "truck", "heart"] as IconName[])[i], { size: 40 }), head(c, L, t, 4, { size: 22, center: true }), text(c, L, s, { center: true })], { gap: 10, align: "center", textAlign: "center" })), { gap: 28, phone: 1 })], M.delivery, { center: true }) },
  { key: "questions", name: w("أسئلة التوصيل", "Delivery questions", "שאלות על משלוח"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3], [[STACK(c, [along(c, L, M.delivery, M.deliverySub), button(c, L, C.contactUs, "/contact", "outline")], { gap: 22 })], [storePanel(c, L, [el(c, "accordion", { items: M.deliveryQa.map(([q, a], i) => ({ q: say(c, q), a: say(c, a), ...(i === 0 ? { open: true } : {}) })), look: L.card === "plain" || L.card === "line" ? "lines" : "cards", single: true }, { self: "stretch" })])]], { gap: 48, align: "start" })], M.delivery) },
  { key: "zones", name: w("المناطق والأسعار", "Areas and prices", "אזורים ומחירים"), build: (c, L) =>
    section(c, L, [centred(c, L, M.delivery, M.deliverySub), storePanel(c, L, [el(c, "comparison", {
      label: say(c, M.delivery),
      columns: M.zones.slice(1).map((z) => ({ title: say(c, z) })),
      rows: M.zoneRows.map(([zone, price, time]) => ({ label: say(c, zone), values: [{ text: say(c, t3(price)), state: "text" }, { text: say(c, time), state: "text" }] })),
      caption: say(c, PERKS[0].text),
    }, { self: "stretch", maxWidth: "820px" })], { maxWidth: "860px", self: "center" })], M.delivery, { center: true }) },
  { key: "promises", name: w("توصيل وإرجاع وتبديل", "Delivery, returns, swaps", "משלוח, החזרה, החלפה"), build: (c, L) =>
    section(c, L, [GRID(c, 3, PERKS.slice(0, 2).concat([{ icon: "check", title: M.deliveryQa[2][0], text: M.deliveryQa[2][1] }]).map((p) => card(c, L, [ICON(c, p.icon, { size: 40 }), head(c, L, p.title, 4, { size: 22 }), text(c, L, p.text)], { gap: 12 })), { gap: 18, phone: 1 })], M.delivery) },
];

/* ---------------------------------------------------------- compare specs */

export const SPEC_LAYOUTS: Layout[] = [
  { key: "table", name: w("جدول مقارنة", "A comparison table", "טבלת השוואה"), build: (c, L) =>
    section(c, L, [centred(c, L, M.specs, M.specsSub), specTable(c, L)], M.specs, { center: true }) },
  { key: "versus", name: w("هاد ضد هداك", "This against that", "זה מול זה"), build: (c, L) =>
    section(c, L, [centred(c, L, M.specs), GRID(c, 2, [[M.vsA, true], [M.vsB, false]].map(([t, good]) => card(c, L, [head(c, L, t as W, 3, { size: 28 }), ...M.highlights.map(([n, s]) => STACK(c, [ICON(c, good ? "check" : "return", { size: 20, motion: false }), text(c, L, good ? w(`${n.ar} · ${s.ar}`, `${n.en} · ${s.en}`, `${n.he} · ${s.he}`) : s)], { direction: "row", gap: 10, align: "center" }))], { gap: 14, ...(good ? { border: { width: 2, color: pop(c) } } : {}) })), { gap: 20, phone: 1 })], M.specs, { center: true }) },
  { key: "picture", name: w("صورة ومواصفات", "A picture and its specs", "תמונה ומפרט"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [[picture(c, L, M.models[1], { aspect: "1 / 1" })], [STACK(c, [along(c, L, M.models[1], M.specsSub), ...M.specRows.slice(0, 3).map((r, i) => STACK(c, [text(c, L, r), head(c, L, t3(M.specValues[i][1]), 4, { size: 20 })], { direction: "row", justify: "between", align: "center", pad: [0, 0, 10, 0] })), buttons(c, L, { main: [C.shop, "/shop"] })], { gap: 16 })]], { gap: 56, align: "center" })], M.specs) },
  { key: "highlights", name: w("تلات أرقام بتفرق", "Three numbers that matter", "שלושה מספרים שקובעים"), build: (c, L) =>
    section(c, L, [centred(c, L, M.specs, M.specsSub), GRID(c, 3, M.highlights.map(([n, s]) => card(c, L, [head(c, L, n, 2, { size: 64, center: true }), text(c, L, s, { center: true })], { align: "center", textAlign: "center", gap: 8 })), { gap: 18, phone: 1 })], M.specs, { center: true }) },
];

/* ----------------------------------------------------------------- picks */

export const LOOK_PICKS: Record<string, string[]> = {
  big: ["luxe", "candy", "noir", "brutal"],
  side: ["editorial", "pillow", "neon", "duotone"],
  two: ["minimal", "organic", "glass", "sport"],
  list: ["arches", "tilted", "noir", "mono"],
};
export const BOX_PICKS: Record<string, string[]> = {
  steps: ["candy", "airy", "neon", "brutal"],
  sizes: ["pillow", "luxe", "glass", "retro"],
  picture: ["organic", "editorial", "candy", "tilted"],
  fill: ["minimal", "blobs", "ink", "sport"],
};
export const SIZE_PICKS: Record<string, string[]> = {
  table: ["airy", "candy", "noir", "glass"],
  measure: ["editorial", "pillow", "neon", "arches"],
  "table-tips": ["retro", "brutal", "glass", "organic"],
  cards: ["minimal", "retro", "ink", "luxe"],
};
export const FINDER_PICKS: Record<string, string[]> = {
  choices: ["candy", "airy", "neon", "brutal"],
  questions: ["pillow", "editorial", "glass", "sport"],
  split: ["organic", "mono", "noir", "tilted"],
  pictures: ["luxe", "blobs", "ink", "minimal"],
};
export const DROP_PICKS: Record<string, string[]> = {
  countdown: ["neon", "candy", "airy", "brutal"],
  picture: ["luxe", "sport", "glass", "organic"],
  teaser: ["heavy", "carved", "noir", "pillow"],
  model: ["glass", "minimal", "retro", "ink"],
};
export const GIFT_PICKS: Record<string, string[]> = {
  three: ["pillow", "luxe", "neon", "candy"],
  split: ["airy", "noir", "tilted", "brutal"],
  steps: ["editorial", "glass", "organic", "retro"],
  guide: ["arches", "blobs", "mono", "ink"],
};
export const CLUB_PICKS: Record<string, string[]> = {
  tiers: ["luxe", "pillow", "neon", "brutal"],
  points: ["heavy", "candy", "glass", "editorial"],
  refer: ["tilted", "organic", "noir", "sport"],
  join: ["airy", "retro", "ink", "neon"],
};
export const DELIVERY_PICKS: Record<string, string[]> = {
  timeline: ["airy", "candy", "neon", "sport"],
  questions: ["editorial", "pillow", "noir", "mono"],
  zones: ["minimal", "neon", "candy", "pillow"],
  promises: ["luxe", "retro", "ink", "tilted"],
};
export const SPEC_PICKS: Record<string, string[]> = {
  table: ["mono", "neon", "candy", "pillow"],
  versus: ["heavy", "pillow", "glass", "editorial"],
  picture: ["minimal", "sport", "noir", "organic"],
  highlights: ["carved", "candy", "ink", "luxe"],
};
