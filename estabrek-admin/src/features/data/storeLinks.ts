/**
 * The store's own tables as the other end of a relation (backend lib/storeLinks.ts): a relation's
 * `to` is "store:products", "store:categories", "store:orders" or "store:customers" instead of
 * one of the owner's tables. Pure: the names and a few small helpers; the boxes, the grid and the
 * fields editor use them. Words are "ar|en|he" (say() picks).
 */
export const STORE = "store:";
export const STORE_LINKS = ["products", "categories", "orders", "customers"] as const;
export type StoreLink = (typeof STORE_LINKS)[number];

/** The store's table a relation links ("store:products" → "products"); null for one of the owner's tables. */
export const storeTarget = (to: unknown): StoreLink | null => (typeof to === "string" && to.startsWith(STORE) && (STORE_LINKS as readonly string[]).includes(to.slice(STORE.length)) ? (to.slice(STORE.length) as StoreLink) : null);

export const STORE_LINK_NAME: Record<StoreLink, string> = {
  products: "منتجات المتجر|The store's products|מוצרי החנות",
  categories: "أقسام المتجر|The store's categories|קטגוריות החנות",
  orders: "طلبات المتجر|The store's orders|הזמנות החנות",
  customers: "زباين المتجر|The store's customers|לקוחות החנות",
};
/** What a new relation to each is called to begin with. */
export const STORE_FIELD_NAME: Record<StoreLink, string> = {
  products: "المنتج|Product|מוצר",
  categories: "القسم|Category|קטגוריה",
  orders: "الطلب|Order|הזמנה",
  customers: "الزبون|Customer|לקוח",
};

/** The store's tables as a relation can link them, each by its name in the three languages. */
export const storeLinkTables = (): Array<{ id: string; name: string; store: true }> => STORE_LINKS.map((s) => ({ id: `${STORE}${s}`, name: STORE_LINK_NAME[s], store: true }));

/** A linked row of a store table this member may not see: it is there, its name isn't told. */
export const HIDDEN_ROW = "سطر مربوط (إسمه بدّه صلاحية)|A linked row (its name needs a permission)|שורה מקושרת (שמה דורש הרשאה)";
