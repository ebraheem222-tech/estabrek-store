/**
 * The store's own tables as the other end of a relation (backend lib/storeLinks.ts): a relation's
 * `to` is "store:<table>" (store:products, store:coupons, store:reviews…) instead of one of the
 * owner's tables. Every table the grid shows as the store's can be linked. Pure: the names and a
 * few small helpers; the boxes, the grid and the fields editor use them. Words are "ar|en|he"
 * (say() picks).
 */
export const STORE = "store:";
/** In the grid's own order (backend lib/storeTables.ts): the catalogue, the stock, the orders, the customers, the discounts, what shoppers wrote. */
export const STORE_LINKS = ["products", "categories", "types", "sizes", "variants", "movements", "alerts", "orders", "lines", "requests", "customers", "addresses", "wishlist", "subscribers", "coupons", "redemptions", "reviews", "comments"] as const;
export type StoreLink = (typeof STORE_LINKS)[number];

/** The store's table a relation links ("store:products" → "products"); null for one of the owner's tables. */
export const storeTarget = (to: unknown): StoreLink | null => (typeof to === "string" && to.startsWith(STORE) && (STORE_LINKS as readonly string[]).includes(to.slice(STORE.length)) ? (to.slice(STORE.length) as StoreLink) : null);

export const STORE_LINK_NAME: Record<StoreLink, string> = {
  products: "منتجات المتجر|The store's products|מוצרי החנות",
  categories: "أقسام المتجر|The store's categories|קטגוריות החנות",
  types: "أنواع المنتجات|Product types|סוגי מוצרים",
  sizes: "المقاسات|Sizes|מידות",
  variants: "الألوان والمقاسات|Colours and sizes|צבעים ומידות",
  movements: "حركات المخزون|Stock movements|תנועות מלאי",
  alerts: "تنبيهات رجوع المخزون|Back-in-stock alerts|התראות חזרה למלאי",
  orders: "طلبات المتجر|The store's orders|הזמנות החנות",
  lines: "قطع الطلبات|Order lines|שורות הזמנה",
  requests: "طلبات الزباين الخاصة|Customers' requests|בקשות לקוחות",
  customers: "زباين المتجر|The store's customers|לקוחות החנות",
  addresses: "عناوين الزباين|Customers' addresses|כתובות לקוחות",
  wishlist: "المفضلة|Wishlists|רשימות משאלות",
  subscribers: "مشتركين النشرة|Newsletter subscribers|מנויי ניוזלטר",
  coupons: "الكوبونات|Coupons|קופונים",
  redemptions: "استعمالات الكوبونات|Coupon uses|שימושי קופונים",
  reviews: "التقييمات|Reviews|ביקורות",
  comments: "تعليقات المنتجات|Product comments|תגובות למוצרים",
};
/** What a new relation to each is called to begin with (one row of it). */
export const STORE_FIELD_NAME: Record<StoreLink, string> = {
  products: "المنتج|Product|מוצר",
  categories: "القسم|Category|קטגוריה",
  types: "نوع المنتج|Product type|סוג מוצר",
  sizes: "المقاس|Size|מידה",
  variants: "اللون والمقاس|Colour and size|צבע ומידה",
  movements: "حركة المخزون|Stock movement|תנועת מלאי",
  alerts: "تنبيه المخزون|Stock alert|התראת מלאי",
  orders: "الطلب|Order|הזמנה",
  lines: "قطعة الطلب|Order line|שורת הזמנה",
  requests: "طلب الزبون|Request|בקשה",
  customers: "الزبون|Customer|לקוח",
  addresses: "العنوان|Address|כתובת",
  wishlist: "من المفضلة|Wishlist item|פריט משאלות",
  subscribers: "المشترك|Subscriber|מנוי",
  coupons: "الكوبون|Coupon|קופון",
  redemptions: "استعمال الكوبون|Coupon use|שימוש בקופון",
  reviews: "التقييم|Review|ביקורת",
  comments: "التعليق|Comment|תגובה",
};

/** The store's tables by what they are about, as the Tables page lists them. */
export const STORE_AREAS: Array<{ id: string; name: string; tables: readonly StoreLink[] }> = [
  { id: "catalogue", name: "المتجر: الكتالوج|Store: catalogue|חנות: קטלוג", tables: ["products", "categories", "types", "sizes", "variants"] },
  { id: "stock", name: "المتجر: المخزون|Store: stock|חנות: מלאי", tables: ["movements", "alerts"] },
  { id: "orders", name: "المتجر: الطلبات|Store: orders|חנות: הזמנות", tables: ["orders", "lines", "requests"] },
  { id: "customers", name: "المتجر: الزباين|Store: customers|חנות: לקוחות", tables: ["customers", "addresses", "wishlist", "subscribers"] },
  { id: "discounts", name: "المتجر: الخصومات|Store: discounts|חנות: הנחות", tables: ["coupons", "redemptions"] },
  { id: "words", name: "المتجر: كلام الزباين|Store: what shoppers wrote|חנות: מה שלקוחות כתבו", tables: ["reviews", "comments"] },
];
/** The store's tables a member sees, area by area (an area with none of them is left out; a table of no area comes last, under the store's name). */
export function storeAreas<T extends { slug: string }>(tables: T[]): Array<{ id: string; name: string; list: T[] }> {
  const out = STORE_AREAS.map((a) => ({ id: a.id, name: a.name, list: tables.filter((t) => (a.tables as readonly string[]).includes(t.slug)) }));
  const known = new Set(STORE_AREAS.flatMap((a) => a.tables as readonly string[]));
  const rest = tables.filter((t) => !known.has(t.slug));
  return [...out, { id: "other", name: "جداول المتجر|The store's tables|טבלאות החנות", list: rest }].filter((a) => a.list.length);
}

/** The store's tables as a relation can link them, each by its name in the three languages. */
export const storeLinkTables = (): Array<{ id: string; name: string; store: true }> => STORE_LINKS.map((s) => ({ id: `${STORE}${s}`, name: STORE_LINK_NAME[s], store: true }));

/** A linked row of a store table this member may not see: it is there, its name isn't told. */
export const HIDDEN_ROW = "سطر مربوط (إسمه بدّه صلاحية)|A linked row (its name needs a permission)|שורה מקושרת (שמה דורש הרשאה)";
