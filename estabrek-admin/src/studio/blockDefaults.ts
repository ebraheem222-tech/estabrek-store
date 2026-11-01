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
const RUNNING: Words[] = [w("شحن مجاني فوق ₪200", "Free delivery over ₪200", "משלוח חינם מעל ₪200"), w("خصم 20٪ على الجديد", "20% off what's new", "20% הנחה על החדש"), w("إرجاع خلال 14 يوم", "Returns within 14 days", "החזרה תוך 14 יום")];

export const BLOCK_KINDS = ["accordion", "testimonials", "pricing", "team", "logos", "alert", "marquee"] as const;
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
    case "alert":
      return {};
  }
}

export function newBlock(kind: BlockKind, lang: Lang, id: Ids): PageTreeNode {
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
  }
}
