/**
 * New content blocks as the editor adds them: a few ready items in the language shown (the
 * store fills its own), and one more item each time "add" is pressed.
 */
import type { PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";

type Ids = (prefix: string) => string;
type Words = Record<Lang, string>;
const w = (ar: string, en: string, he: string): Words => ({ ar, en, he });
/** The words in one language (as an element keeps them). */
const one = (lang: Lang, words: Words) => ({ [lang]: words[lang] });

const QA: Array<[Words, Words]> = [
  [w("كم بياخد التوصيل؟", "How long is delivery?", "כמה זמן לוקח משלוח?"), w("من يومين لأربع أيام عمل.", "Two to four working days.", "שניים עד ארבעה ימי עסקים.")],
  [w("فيني أرجّع الطلب؟", "Can I return my order?", "אפשר להחזיר הזמנה?"), w("آه، خلال 14 يوم من الاستلام.", "Yes, within 14 days of delivery.", "כן, תוך 14 יום מהקבלה.")],
  [w("كيف بدفع؟", "How do I pay?", "איך משלמים?"), w("ببطاقة أو كاش عند الاستلام.", "By card or cash on delivery.", "בכרטיס או במזומן במסירה.")],
];
const QUOTES: Array<[Words, Words]> = [
  [w("الخامة بتجنن والتوصيل كان سريع.", "Lovely fabric, and delivery was quick.", "בד מדהים והמשלוח הגיע מהר."), w("سارة", "Sarah", "שרה")],
  [w("كل قطعة أحلى من التانية، رح أرجع أطلب.", "Each piece is lovelier than the last. I'll be back.", "כל פריט יפה מהקודם, אחזור להזמין."), w("ليلى", "Layla", "ליילה")],
  [w("خدمة الزباين ردّت بسرعة وحلّت كل إشي.", "Customer care answered fast and sorted everything.", "שירות הלקוחות ענה מהר ופתר הכול."), w("نور", "Noor", "נור")],
];
const PLANS: Array<{ name: Words; price: string; features: Words; featured?: boolean }> = [
  { name: w("أساسي", "Basic", "בסיסי"), price: "₪49", features: w("منتج واحد\nتوصيل عادي", "One item\nStandard delivery", "פריט אחד\nמשלוח רגיל") },
  { name: w("مميز", "Plus", "פלוס"), price: "₪99", features: w("3 منتجات\nتوصيل سريع\nتغليف هدية", "Three items\nFast delivery\nGift wrap", "שלושה פריטים\nמשלוח מהיר\nאריזת מתנה"), featured: true },
  { name: w("كامل", "Full", "מלא"), price: "₪179", features: w("6 منتجات\nتوصيل مجاني\nتغليف هدية\nإرجاع مجاني", "Six items\nFree delivery\nGift wrap\nFree returns", "שישה פריטים\nמשלוח חינם\nאריזת מתנה\nהחזרה חינם") },
];
const PEOPLE: Array<[Words, Words]> = [
  [w("ليلى", "Layla", "ליילה"), w("المؤسسة", "Founder", "מייסדת")],
  [w("ريم", "Reem", "רים"), w("مصممة", "Designer", "מעצבת")],
  [w("ديما", "Dima", "דימה"), w("خدمة الزباين", "Customer care", "שירות לקוחות")],
];
const TABS: Array<[Words, Words]> = [
  [w("المواد", "Materials", "חומרים"), w("قطن ناعم مع لمسة كتان.", "Soft cotton with a touch of linen.", "כותנה רכה עם נגיעת פשתן.")],
  [w("العناية", "Care", "טיפול"), w("غسيل بارد، وكوي على حرارة خفيفة.", "Wash cold, iron on low heat.", "כביסה קרה, גיהוץ בחום נמוך.")],
  [w("المقاسات", "Sizes", "מידות"), w("من S لـ XL، والقصّة واسعة شوي.", "From S to XL, cut a little loose.", "מ-S עד XL, גזרה מעט רחבה.")],
];
const LINKS: Array<[Words, string]> = [
  [w("كل القطع", "Everything", "הכול"), "/shop"],
  [w("وصل جديد", "New in", "חדש"), "/shop?sort=new"],
  [w("من نحن", "About us", "עלינו"), "/about"],
  [w("تواصل", "Contact", "צור קשר"), "/contact"],
];
const HELP: Array<[Words, string]> = [
  [w("الشحن والإرجاع", "Delivery and returns", "משלוחים והחזרות"), "/policies"],
  [w("الأسئلة الشائعة", "Questions", "שאלות נפוצות"), "/contact"],
  [w("حسابي", "My account", "החשבון שלי"), "/account"],
];
const RUNNING: Words[] = [w("شحن مجاني فوق ₪200", "Free delivery over ₪200", "משלוח חינם מעל ₪200"), w("خصم 20٪ على الجديد", "20% off what's new", "20% הנחה על החדש"), w("إرجاع خلال 14 يوم", "Returns within 14 days", "החזרה תוך 14 יום")];

export const BLOCK_KINDS = ["accordion", "testimonials", "pricing", "team", "logos", "alert", "marquee", "tabs", "countdown", "beforeAfter", "hotspots", "map", "search", "menu"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

/** One more item of a block's list, ready to edit. */
export function newItem(kind: BlockKind, lang: Lang, n = 0): Record<string, unknown> | Record<string, string> {
  switch (kind) {
    case "accordion": {
      const [q, a] = QA[n % QA.length];
      return { q: one(lang, q), a: one(lang, a) };
    }
    case "testimonials": {
      const [quote, name] = QUOTES[n % QUOTES.length];
      return { quote: one(lang, quote), name: one(lang, name), stars: 5 };
    }
    case "pricing": {
      const plan = PLANS[n % PLANS.length];
      return { name: one(lang, plan.name), price: { [lang]: plan.price }, period: one(lang, w("بالشهر", "a month", "לחודש")), features: one(lang, plan.features), cta: one(lang, w("اختاري", "Choose", "לבחירה")), href: "/shop", ...(plan.featured ? { featured: true, badge: one(lang, w("الأشهر", "Most loved", "הכי אהוב")) } : {}) };
    }
    case "team": {
      const [name, role] = PEOPLE[n % PEOPLE.length];
      return { name: one(lang, name), role: one(lang, role) };
    }
    case "logos":
      return { src: "" };
    case "marquee":
      return one(lang, RUNNING[n % RUNNING.length]);
    case "tabs": {
      const [label, text] = TABS[n % TABS.length];
      return { label: one(lang, label), text: one(lang, text) };
    }
    case "hotspots":
      return { x: 50, y: 50, title: one(lang, w("شوفي هاد", "Look at this", "תראו את זה")) };
    case "menu": {
      const [label, href] = LINKS[n % LINKS.length];
      return { label: one(lang, label), href };
    }
    default:
      return {};
  }
}

/** A moment a week from now, as the countdown keeps it (the shop's own time). */
export function inAWeek(now = new Date()): string {
  const d = new Date(now.getTime() + 7 * 86_400_000);
  const two = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** A ready header (the store's name, its menu, a search box) and footer (about, links, help). */
export function newHeader(lang: Lang, id: Ids): PageTreeNode {
  const cell = (children: PageTreeNode[], style?: Record<string, unknown>) => ({ id: id("cell"), type: "cell", props: {}, ...(style ? { style } : {}), children });
  return {
    id: id("sec"), type: "section", name: w("الهيدر", "Header", "כותרת")[lang], props: { tag: "header", contained: true }, style: { base: { pad: [16, 0, 16, 0] } },
    children: [{
      id: id("cols"), type: "columns", props: { phone: "stack" }, style: { base: { widths: [1, 2, 1], gap: 24 } },
      children: [
        cell([{ id: id("h"), type: "heading", props: { level: 3, text: one(lang, w("اسم المتجر", "Store name", "שם החנות")) } }], { base: { justify: "center" } }),
        cell([{ id: id("menu"), type: "menu", props: { items: LINKS.map(([label, href]) => ({ label: one(lang, label), href })), layout: "row", phone: "fold" } }], { base: { justify: "center", align: "center" } }),
        cell([{ id: id("srch"), type: "search", props: { look: "pill" } }], { base: { justify: "center" } }),
      ],
    }],
  };
}
export function newFooter(lang: Lang, id: Ids): PageTreeNode {
  const cell = (children: PageTreeNode[]) => ({ id: id("cell"), type: "cell", props: {}, children });
  const links = (list: Array<[Words, string]>) => ({ id: id("menu"), type: "menu", props: { items: list.map(([label, href]) => ({ label: one(lang, label), href })), layout: "column" } });
  return {
    id: id("sec"), type: "section", name: w("الفوتر", "Footer", "כותרת תחתונה")[lang], props: { tag: "footer", contained: true }, style: { base: { pad: [48, 0, 48, 0], bg: "surface" } },
    children: [{
      id: id("cols"), type: "columns", props: { phone: "stack" }, style: { base: { widths: [2, 1, 1], gap: 32 } },
      children: [
        cell([
          { id: id("h"), type: "heading", props: { level: 3, text: one(lang, w("اسم المتجر", "Store name", "שם החנות")) } },
          { id: id("t"), type: "text", props: { text: one(lang, w("قطع مختارة بحب، بتوصل لباب بيتك.", "Pieces chosen with care, brought to your door.", "פריטים שנבחרו באהבה, עד הבית.")) } },
        ]),
        cell([links(LINKS)]),
        cell([links(HELP)]),
      ],
    }],
  };
}

/** A popup on the page: a heading, words and a button, shown on arrival once a visit. */
export function newPopup(lang: Lang, id: Ids): PageTreeNode {
  return {
    id: id("pop"), type: "popup", props: { trigger: "load", delay: 3, often: "visit", size: "m", place: "center" },
    children: [
      { id: id("h"), type: "heading", props: { level: 2, text: one(lang, w("خصم 10٪ على أول طلب", "10% off your first order", "10% הנחה על ההזמנה הראשונה")) } },
      { id: id("t"), type: "text", props: { text: one(lang, w("استعملي الكود WELCOME10 عند الدفع.", "Use the code WELCOME10 at checkout.", "השתמשו בקוד WELCOME10 בתשלום.")) } },
      { id: id("b"), type: "button", props: { label: one(lang, w("تسوّقي", "Shop now", "לקנייה")), href: "/shop", variant: "solid" } },
    ],
  };
}

export function newBlock(kind: BlockKind, lang: Lang, id: Ids, src?: string): PageTreeNode {
  const items = (count: number) => Array.from({ length: count }, (_, n) => newItem(kind, lang, n));
  switch (kind) {
    case "accordion":
      return { id: id("acc"), type: "accordion", props: { items: items(3), look: "lines" } };
    case "testimonials":
      return { id: id("tst"), type: "testimonials", props: { items: items(3), layout: "grid" } };
    case "pricing":
      return { id: id("pr"), type: "pricing", props: { items: items(3) } };
    case "team":
      return { id: id("team"), type: "team", props: { items: items(3) } };
    case "logos":
      // Its logos are chosen from the media library.
      return { id: id("logo"), type: "logos", props: { items: [], gray: true } };
    case "alert":
      return { id: id("al"), type: "alert", props: { text: one(lang, RUNNING[0]), kind: "promo", close: true } };
    case "marquee":
      return { id: id("mq"), type: "marquee", props: { items: items(3), speed: 30, pause: true, separator: "✦" } };
    case "tabs":
      return { id: id("tabs"), type: "tabs", props: { items: items(3), look: "underline" } };
    case "countdown":
      return { id: id("cd"), type: "countdown", props: { until: inAWeek(), look: "boxes", done: one(lang, w("بلّش العرض!", "The offer is on!", "המבצע התחיל!")) } };
    case "beforeAfter":
      // The picture chosen on adding, on both sides until the other is changed.
      return { id: id("ba"), type: "beforeAfter", props: { before: src, after: src, start: 50 } };
    case "hotspots":
      return { id: id("hot"), type: "hotspots", props: { src, items: items(1) } };
    case "map":
      return { id: id("map"), type: "map", props: { query: w("الناصرة", "Nazareth", "נצרת")[lang], zoom: 13 } };
    case "search":
      return { id: id("srch"), type: "search", props: { look: "pill" } };
    case "menu":
      return { id: id("menu"), type: "menu", props: { items: items(4), layout: "row", phone: "fold" } };
  }
}
