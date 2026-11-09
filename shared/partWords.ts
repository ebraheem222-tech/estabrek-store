/** Optional word fields whose existing documents render a built-in localized label. */
export const COUNTDOWN_WORD_FIELDS = ["dayLabel", "hourLabel", "minuteLabel", "secondLabel"] as const;
/** The shop element's own words (its search, filters, sorting, count and more), each replacing the shop's built-in one. */
export const SHOP_WORD_FIELDS = ["searchLabel", "categoriesLabel", "allLabel", "inStockLabel", "sortLabel", "priceLabel", "coloursLabel", "sizesLabel", "filtersLabel", "clearLabel", "countLabel", "moreLabel"] as const;
export type ShopWordField = (typeof SHOP_WORD_FIELDS)[number];
type Words = Readonly<Record<"ar" | "en" | "he", string>>;
const DEFAULTS: Record<string, Record<string, Words>> = {
  countdown: {
    dayLabel: { ar: "يوم", en: "Days", he: "ימים" },
    hourLabel: { ar: "ساعة", en: "Hours", he: "שעות" },
    minuteLabel: { ar: "دقيقة", en: "Minutes", he: "דקות" },
    secondLabel: { ar: "ثانية", en: "Seconds", he: "שניות" },
  },
  beforeAfter: {
    beforeLabel: { ar: "قبل", en: "Before", he: "לפני" },
    afterLabel: { ar: "بعد", en: "After", he: "אחרי" },
  },
  shop: {
    searchLabel: { ar: "البحث عن منتجات", en: "Search products", he: "חיפוש מוצרים" },
    categoriesLabel: { ar: "التصنيفات", en: "Categories", he: "קטגוריות" },
    allLabel: { ar: "الكل", en: "All", he: "הכול" },
    inStockLabel: { ar: "المتوفر فقط", en: "In stock only", he: "רק מה שבמלאי" },
    sortLabel: { ar: "الترتيب", en: "Sort by", he: "מיון לפי" },
    priceLabel: { ar: "نطاق السعر", en: "Price range", he: "טווח מחירים" },
    coloursLabel: { ar: "الألوان", en: "Colours", he: "צבעים" },
    sizesLabel: { ar: "المقاسات", en: "Sizes", he: "מידות" },
    filtersLabel: { ar: "الفلاتر", en: "Filters", he: "סינון" },
    clearLabel: { ar: "مسح الكل", en: "Clear all", he: "ניקוי הכול" },
    countLabel: { ar: "منتج", en: "pieces", he: "פריטים" },
    moreLabel: { ar: "تحميل المزيد", en: "Load more", he: "לטעון עוד" },
  },
};
/**
 * Elements whose words fall back to their built-in word in the same language (never to another
 * language's own word): a shop's "Sort by" in English stays English until it has its own English.
 */
const EXACT_LANGUAGE = new Set(["shop"]);
export const exactLanguageWords = (type: string | undefined) => Boolean(type && EXACT_LANGUAGE.has(type));
export function defaultPartWords(type: string | undefined, path: string): Words | undefined {
  return type && Object.hasOwn(DEFAULTS, type) && Object.hasOwn(DEFAULTS[type], path) ? DEFAULTS[type][path] : undefined;
}
