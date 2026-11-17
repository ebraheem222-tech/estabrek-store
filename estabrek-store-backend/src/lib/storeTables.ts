/**
 * The store's own tables in the data grid, to look at (admin → الجداول), beside the tables the
 * owner makes: the catalogue (products, categories, product types, sizes, colours and sizes),
 * the stock (movements, back-in-stock alerts), the orders (orders, their lines, customers'
 * requests), the customers (customers, addresses, wishlists, newsletter subscribers), the
 * discounts (coupons, their uses) and what shoppers wrote (reviews, comments). They answer the
 * grid's same question (lib/dataQuery.ts: pages, filters, sort, search), here turned into an
 * ordinary query over a fixed list of columns per table. Nothing is written from here: the
 * store's tables change through their own pages, which know their rules (stock, prices, an
 * order's steps).
 *
 * Each table asks for the permission its own page asks for. A column never shows more of a
 * shopper than that page does: who wrote a review, who waits for a size and whose phone used a
 * coupon belong to the customers' permission, so those tables leave them out.
 */
import { AppError } from "../utils/httpError.js";
import { prisma } from "./prisma.js";
import { OPS_BY_KIND, type GridFilter, type GridQuery, type GridRow, type Op } from "./dataQuery.js";
import { csvCell } from "./dataRows.js";

type Local = { ar: string; en: string; he: string };
type Kind = "text" | "number" | "date" | "boolean" | "select";
export type StoreColumn = {
  id: string;
  type: Kind;
  name: Local;
  options?: { id: string; name: Local }[];
  /** The database's field ("title"), or one of a linked row (["category", "name"], ["item", "product", "title"]). None: worked out per page (not filtered or sorted). */
  at?: string | string[];
  /** The field may hold nothing; through a linked row: that row may be missing (decides how "empty" is asked and where empty ones sort). */
  nullable?: boolean;
  /** The value the grid shows, from the database row. */
  value: (row: any) => unknown;
};
type StoreTable = {
  id: string;
  name: Local;
  /** Who may see it. */
  permission: string;
  /** The row's address column: "slug", or "id" where rows have no address. */
  slug: "slug" | "id";
  /** The field that says when a row was made ("createdAt" when not said); null: its rows keep no dates. */
  made?: string | null;
  /** Its rows say when they last changed (yes when not said). */
  changed?: boolean;
  /** The order of rows nothing else orders (the newest first when not said). */
  order?: object[];
  columns: StoreColumn[];
  /** What the page's rows need from the database. */
  select: object;
  delegate: () => { findMany: (args: any) => Promise<any[]>; count: (args: any) => Promise<number> };
};

const n = (ar: string, en: string, he: string): Local => ({ ar, en, he });
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : null);
const choices = (ids: readonly string[], names: Record<string, Local>) => ids.map((id) => ({ id, name: names[id] ?? n(id, id, id) }));

const ORDER_STATES = ["NEW", "CONTACTED", "ACCEPTED", "REJECTED", "SHIPPED", "CLOSED", "CANCELED", "REFUNDED"] as const;
const ORDER_STATE_NAMES: Record<string, Local> = {
  NEW: n("جديد", "New", "חדש"),
  CONTACTED: n("تم التواصل", "Contacted", "נוצר קשר"),
  ACCEPTED: n("مقبول", "Accepted", "אושר"),
  REJECTED: n("مرفوض", "Rejected", "נדחה"),
  SHIPPED: n("انشحن", "Shipped", "נשלח"),
  CLOSED: n("مسكّر", "Closed", "סגור"),
  CANCELED: n("ملغي", "Cancelled", "בוטל"),
  REFUNDED: n("مرتجع", "Refunded", "הוחזר"),
};

const SEEN_STATES = ["PENDING", "APPROVED", "REJECTED"] as const;
const SEEN_STATE_NAMES: Record<string, Local> = { PENDING: n("بالانتظار", "Waiting", "ממתין"), APPROVED: n("مقبول", "Approved", "אושר"), REJECTED: n("مرفوض", "Rejected", "נדחה") };
const made = { createdAt: true, updatedAt: true } as const;

export const STORE_TABLES: Record<string, StoreTable> = {
  products: {
    id: "products",
    name: n("المنتجات", "Products", "מוצרים"),
    permission: "catalog:read",
    slug: "slug",
    delegate: () => prisma.product,
    select: { id: true, slug: true, title: true, isActive: true, createdAt: true, updatedAt: true, category: { select: { name: true } }, type: { select: { name: true } }, items: { select: { variants: { select: { price: true, stock: true } } } } },
    columns: [
      { id: "title", type: "text", name: n("الإسم", "Name", "שם"), at: "title", value: (r) => r.title },
      { id: "category", type: "text", name: n("القسم", "Category", "קטגוריה"), at: ["category", "name"], value: (r) => r.category?.name ?? null },
      { id: "kind", type: "text", name: n("النوع", "Type", "סוג"), at: ["type", "name"], nullable: true, value: (r) => r.type?.name ?? null },
      { id: "active", type: "boolean", name: n("ظاهر بالمتجر", "Shown in the shop", "מוצג בחנות"), at: "isActive", value: (r) => r.isActive },
      {
        id: "price",
        type: "number",
        name: n("السعر من", "Price from", "מחיר מ"),
        value: (r) => {
          const prices = (r.items ?? []).flatMap((i: any) => i.variants ?? []).map((v: any) => Number(v.price)).filter((p: number) => Number.isFinite(p));
          return prices.length ? Math.min(...prices) : null;
        },
      },
      { id: "stock", type: "number", name: n("المخزون", "Stock", "מלאי"), value: (r) => (r.items ?? []).flatMap((i: any) => i.variants ?? []).reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0) },
      { id: "colours", type: "number", name: n("ألوان", "Colours", "צבעים"), value: (r) => r.items?.length ?? 0 },
    ],
  },
  categories: {
    id: "categories",
    name: n("الأقسام", "Categories", "קטגוריות"),
    permission: "catalog:read",
    slug: "slug",
    delegate: () => prisma.category,
    select: { id: true, slug: true, name: true, createdAt: true, updatedAt: true, parent: { select: { name: true } }, _count: { select: { products: true, children: true } } },
    columns: [
      { id: "name", type: "text", name: n("الإسم", "Name", "שם"), at: "name", value: (r) => r.name },
      { id: "parent", type: "text", name: n("جوّا قسم", "Inside", "בתוך"), at: ["parent", "name"], nullable: true, value: (r) => r.parent?.name ?? null },
      { id: "products", type: "number", name: n("منتجات", "Products", "מוצרים"), value: (r) => r._count?.products ?? 0 },
      { id: "children", type: "number", name: n("أقسام جوّاه", "Categories inside", "קטגוריות בפנים"), value: (r) => r._count?.children ?? 0 },
    ],
  },
  types: {
    id: "types",
    name: n("أنواع المنتجات", "Product types", "סוגי מוצרים"),
    permission: "catalog:read",
    slug: "slug",
    delegate: () => prisma.productType,
    select: { id: true, slug: true, name: true, description: true, fulfillment: true, showColor: true, showSize: true, ...made, _count: { select: { products: true } } },
    columns: [
      { id: "name", type: "text", name: n("الإسم", "Name", "שם"), at: "name", value: (r) => r.name },
      { id: "about", type: "text", name: n("الوصف", "About", "תיאור"), at: "description", nullable: true, value: (r) => r.description },
      {
        id: "delivery",
        type: "select",
        name: n("كيف بيوصل", "How it's delivered", "אופן המסירה"),
        at: "fulfillment",
        options: choices(["SHIPPING", "DIGITAL", "BOOKING"], { SHIPPING: n("شحن", "Shipped", "משלוח"), DIGITAL: n("رقمي", "Digital", "דיגיטלי"), BOOKING: n("حجز", "A booking", "הזמנת תור") }),
        value: (r) => r.fulfillment,
      },
      { id: "colour", type: "boolean", name: n("إله لون", "Has a colour", "יש צבע"), at: "showColor", value: (r) => r.showColor },
      { id: "size", type: "boolean", name: n("إله مقاس", "Has a size", "יש מידה"), at: "showSize", value: (r) => r.showSize },
      { id: "products", type: "number", name: n("منتجات", "Products", "מוצרים"), value: (r) => r._count?.products ?? 0 },
    ],
  },
  sizes: {
    id: "sizes",
    name: n("المقاسات", "Sizes", "מידות"),
    permission: "catalog:read",
    slug: "id",
    made: null,
    changed: false,
    order: [{ order: "asc" }],
    delegate: () => prisma.size,
    select: { id: true, name: true, order: true, active: true, _count: { select: { variants: true } } },
    columns: [
      { id: "name", type: "text", name: n("المقاس", "Size", "מידה"), at: "name", value: (r) => r.name },
      { id: "order", type: "number", name: n("الترتيب", "Order", "סדר"), at: "order", value: (r) => r.order },
      { id: "active", type: "boolean", name: n("شغّال", "In use", "פעיל"), at: "active", value: (r) => r.active },
      { id: "variants", type: "number", name: n("قطع عليه", "Pieces in it", "פריטים במידה"), value: (r) => r._count?.variants ?? 0 },
    ],
  },
  variants: {
    id: "variants",
    name: n("الألوان والمقاسات", "Colours and sizes", "צבעים ומידות"),
    permission: "catalog:read",
    slug: "id",
    delegate: () => prisma.productVariant,
    select: { id: true, sku: true, price: true, salePrice: true, compareAt: true, stock: true, lowStockThreshold: true, ...made, size: { select: { name: true } }, item: { select: { colorName: true, product: { select: { title: true } } } } },
    columns: [
      { id: "sku", type: "text", name: n("SKU", "SKU", "מק״ט"), at: "sku", value: (r) => r.sku },
      { id: "product", type: "text", name: n("المنتج", "Product", "מוצר"), at: ["item", "product", "title"], value: (r) => r.item?.product?.title ?? null },
      { id: "colour", type: "text", name: n("اللون", "Colour", "צבע"), at: ["item", "colorName"], value: (r) => r.item?.colorName ?? null },
      { id: "size", type: "text", name: n("المقاس", "Size", "מידה"), at: ["size", "name"], value: (r) => r.size?.name ?? null },
      { id: "price", type: "number", name: n("السعر", "Price", "מחיר"), at: "price", value: (r) => num(r.price) },
      { id: "salePrice", type: "number", name: n("سعر العرض", "Sale price", "מחיר מבצע"), at: "salePrice", nullable: true, value: (r) => num(r.salePrice) },
      { id: "compareAt", type: "number", name: n("السعر قبل", "Price before", "מחיר קודם"), at: "compareAt", nullable: true, value: (r) => num(r.compareAt) },
      { id: "stock", type: "number", name: n("المخزون", "Stock", "מלאי"), at: "stock", value: (r) => r.stock },
      { id: "lowAt", type: "number", name: n("حد التنبيه", "Low-stock line", "סף מלאי נמוך"), at: "lowStockThreshold", value: (r) => r.lowStockThreshold },
    ],
  },
  movements: {
    id: "movements",
    name: n("حركات المخزون", "Stock movements", "תנועות מלאי"),
    permission: "inventory:read",
    slug: "id",
    changed: false,
    delegate: () => prisma.inventoryAdjustment,
    select: { id: true, delta: true, beforeStock: true, afterStock: true, reason: true, createdAt: true, variant: { select: { sku: true, item: { select: { product: { select: { title: true } } } } } }, adminUser: { select: { name: true } } },
    columns: [
      { id: "product", type: "text", name: n("المنتج", "Product", "מוצר"), at: ["variant", "item", "product", "title"], value: (r) => r.variant?.item?.product?.title ?? null },
      { id: "sku", type: "text", name: n("SKU", "SKU", "מק״ט"), at: ["variant", "sku"], value: (r) => r.variant?.sku ?? null },
      { id: "change", type: "number", name: n("التغيير", "Change", "שינוי"), at: "delta", value: (r) => r.delta },
      { id: "before", type: "number", name: n("قبل", "Before", "לפני"), at: "beforeStock", value: (r) => r.beforeStock },
      { id: "after", type: "number", name: n("بعد", "After", "אחרי"), at: "afterStock", value: (r) => r.afterStock },
      { id: "reason", type: "text", name: n("السبب", "Why", "סיבה"), at: "reason", nullable: true, value: (r) => r.reason },
      { id: "by", type: "text", name: n("مين", "By", "על ידי"), at: ["adminUser", "name"], nullable: true, value: (r) => r.adminUser?.name ?? null },
    ],
  },
  alerts: {
    id: "alerts",
    name: n("تنبيهات رجوع المخزون", "Back-in-stock alerts", "התראות חזרה למלאי"),
    permission: "inventory:read",
    slug: "id",
    delegate: () => prisma.stockAlert,
    // Who waits (the email) isn't here: it belongs to the customers' permission, as on the alerts' own page.
    select: { id: true, status: true, notifiedAt: true, ...made, product: { select: { title: true } }, variant: { select: { sku: true } } },
    columns: [
      { id: "product", type: "text", name: n("المنتج", "Product", "מוצר"), at: ["product", "title"], value: (r) => r.product?.title ?? null },
      { id: "sku", type: "text", name: n("SKU", "SKU", "מק״ט"), at: ["variant", "sku"], value: (r) => r.variant?.sku ?? null },
      {
        id: "state",
        type: "select",
        name: n("الحالة", "State", "מצב"),
        at: "status",
        options: choices(["WAITING", "SENT", "CANCELLED", "FAILED"], { WAITING: n("مستنّي", "Waiting", "ממתין"), SENT: n("انبعت", "Sent", "נשלח"), CANCELLED: n("ملغي", "Cancelled", "בוטל"), FAILED: n("ما زبط", "Failed", "נכשל") }),
        value: (r) => r.status,
      },
      { id: "told", type: "date", name: n("انبعتله", "Told on", "נשלח ב"), at: "notifiedAt", nullable: true, value: (r) => day(r.notifiedAt) },
    ],
  },
  orders: {
    id: "orders",
    name: n("الطلبات", "Orders", "הזמנות"),
    permission: "orders:read",
    slug: "id",
    delegate: () => prisma.orderRequest,
    select: { id: true, customerName: true, phone: true, city: true, total: true, quantity: true, status: true, source: true, couponCode: true, createdAt: true, updatedAt: true },
    columns: [
      { id: "customer", type: "text", name: n("الزبون", "Customer", "לקוח"), at: "customerName", value: (r) => r.customerName },
      { id: "phone", type: "text", name: n("الرقم", "Phone", "טלפון"), at: "phone", value: (r) => r.phone },
      { id: "city", type: "text", name: n("المدينة", "City", "עיר"), at: "city", nullable: true, value: (r) => r.city },
      { id: "total", type: "number", name: n("المجموع", "Total", "סה״כ"), at: "total", nullable: true, value: (r) => num(r.total) },
      { id: "quantity", type: "number", name: n("القطع", "Pieces", "פריטים"), at: "quantity", value: (r) => r.quantity },
      { id: "state", type: "select", name: n("الحالة", "State", "מצב"), at: "status", options: choices(ORDER_STATES, ORDER_STATE_NAMES), value: (r) => r.status },
      { id: "source", type: "text", name: n("من وين", "From", "מקור"), at: "source", nullable: true, value: (r) => r.source },
      { id: "coupon", type: "text", name: n("الكوبون", "Coupon", "קופון"), at: "couponCode", nullable: true, value: (r) => r.couponCode },
    ],
  },
  lines: {
    id: "lines",
    name: n("قطع الطلبات", "Order lines", "שורות הזמנה"),
    permission: "orders:read",
    slug: "id",
    changed: false,
    delegate: () => prisma.orderRequestItem,
    select: { id: true, orderRequestId: true, productTitle: true, colorName: true, sizeName: true, sku: true, quantity: true, unitPrice: true, lineSubtotal: true, createdAt: true },
    columns: [
      { id: "order", type: "text", name: n("رقم الطلب", "Order", "הזמנה"), at: "orderRequestId", value: (r) => r.orderRequestId },
      { id: "product", type: "text", name: n("المنتج", "Product", "מוצר"), at: "productTitle", value: (r) => r.productTitle },
      { id: "colour", type: "text", name: n("اللون", "Colour", "צבע"), at: "colorName", nullable: true, value: (r) => r.colorName },
      { id: "size", type: "text", name: n("المقاس", "Size", "מידה"), at: "sizeName", nullable: true, value: (r) => r.sizeName },
      { id: "sku", type: "text", name: n("SKU", "SKU", "מק״ט"), at: "sku", nullable: true, value: (r) => r.sku },
      { id: "quantity", type: "number", name: n("العدد", "Pieces", "כמות"), at: "quantity", value: (r) => r.quantity },
      { id: "unitPrice", type: "number", name: n("سعر القطعة", "Price each", "מחיר ליחידה"), at: "unitPrice", value: (r) => num(r.unitPrice) },
      { id: "subtotal", type: "number", name: n("المجموع", "Line total", "סה״כ שורה"), at: "lineSubtotal", value: (r) => num(r.lineSubtotal) },
    ],
  },
  requests: {
    id: "requests",
    name: n("طلبات الزباين الخاصة", "Customers' requests", "בקשות לקוחות"),
    permission: "orders:read",
    slug: "id",
    delegate: () => prisma.customerRequest,
    select: { id: true, kind: true, status: true, name: true, phone: true, email: true, wantedSize: true, wantedColor: true, details: true, ...made, product: { select: { title: true } } },
    columns: [
      {
        id: "kind",
        type: "select",
        name: n("شو طالب", "Asks for", "מבקש"),
        at: "kind",
        options: choices(["SIZE", "COLOR", "NEW_PIECE", "CALLBACK"], { SIZE: n("مقاس", "A size", "מידה"), COLOR: n("لون", "A colour", "צבע"), NEW_PIECE: n("قطعة جديدة", "A new piece", "פריט חדש"), CALLBACK: n("اتصلوا فيي", "A call back", "חזרו אליי") }),
        value: (r) => r.kind,
      },
      {
        id: "state",
        type: "select",
        name: n("الحالة", "State", "מצב"),
        at: "status",
        options: choices(["NEW", "SEARCHING", "FOUND", "UNAVAILABLE", "DONE"], { NEW: n("جديد", "New", "חדש"), SEARCHING: n("عم ندوّر", "Looking", "מחפשים"), FOUND: n("لقيناه", "Found", "נמצא"), UNAVAILABLE: n("مش متوفر", "Not available", "לא זמין"), DONE: n("خلص", "Done", "הסתיים") }),
        value: (r) => r.status,
      },
      { id: "name", type: "text", name: n("الإسم", "Name", "שם"), at: "name", value: (r) => r.name },
      { id: "phone", type: "text", name: n("الرقم", "Phone", "טלפון"), at: "phone", value: (r) => r.phone },
      { id: "email", type: "text", name: n("الإيميل", "Email", "אימייל"), at: "email", nullable: true, value: (r) => r.email },
      { id: "product", type: "text", name: n("المنتج", "Product", "מוצר"), at: ["product", "title"], nullable: true, value: (r) => r.product?.title ?? null },
      { id: "size", type: "text", name: n("المقاس المطلوب", "Wanted size", "מידה מבוקשת"), at: "wantedSize", nullable: true, value: (r) => r.wantedSize },
      { id: "colour", type: "text", name: n("اللون المطلوب", "Wanted colour", "צבע מבוקש"), at: "wantedColor", nullable: true, value: (r) => r.wantedColor },
      { id: "details", type: "text", name: n("التفاصيل", "Details", "פרטים"), at: "details", nullable: true, value: (r) => r.details },
    ],
  },
  customers: {
    id: "customers",
    name: n("الزبائن", "Customers", "לקוחות"),
    permission: "customers:read",
    slug: "id",
    delegate: () => prisma.user,
    select: { id: true, name: true, email: true, phone: true, status: true, marketingOptIn: true, lastLoginAt: true, createdAt: true, updatedAt: true, _count: { select: { orders: true } } },
    columns: [
      { id: "name", type: "text", name: n("الإسم", "Name", "שם"), at: "name", value: (r) => r.name },
      { id: "email", type: "text", name: n("الإيميل", "Email", "אימייל"), at: "email", value: (r) => r.email },
      { id: "phone", type: "text", name: n("الرقم", "Phone", "טלפון"), at: "phone", nullable: true, value: (r) => r.phone },
      { id: "state", type: "select", name: n("الحساب", "Account", "חשבון"), at: "status", options: choices(["ACTIVE", "SUSPENDED"], { ACTIVE: n("شغّال", "Active", "פעיל"), SUSPENDED: n("موقوف", "Suspended", "מושעה") }), value: (r) => r.status },
      { id: "marketing", type: "boolean", name: n("بيقبل عروض", "Takes offers", "מקבל הצעות"), at: "marketingOptIn", value: (r) => r.marketingOptIn },
      { id: "lastLogin", type: "date", name: n("آخر دخول", "Last sign-in", "כניסה אחרונה"), at: "lastLoginAt", nullable: true, value: (r) => day(r.lastLoginAt) },
      { id: "orders", type: "number", name: n("طلبات", "Orders", "הזמנות"), value: (r) => r._count?.orders ?? 0 },
    ],
  },
  addresses: {
    id: "addresses",
    name: n("عناوين الزباين", "Customers' addresses", "כתובות לקוחות"),
    permission: "customers:read",
    slug: "id",
    delegate: () => prisma.address,
    select: { id: true, label: true, fullName: true, phone: true, city: true, address: true, notes: true, isDefault: true, ...made, user: { select: { email: true } } },
    columns: [
      { id: "customer", type: "text", name: n("الزبون (إيميله)", "Customer (email)", "לקוח (אימייל)"), at: ["user", "email"], value: (r) => r.user?.email ?? null },
      { id: "fullName", type: "text", name: n("الإسم عالطرد", "Name on the parcel", "שם על החבילה"), at: "fullName", value: (r) => r.fullName },
      { id: "phone", type: "text", name: n("الرقم", "Phone", "טלפון"), at: "phone", value: (r) => r.phone },
      { id: "city", type: "text", name: n("المدينة", "City", "עיר"), at: "city", value: (r) => r.city },
      { id: "address", type: "text", name: n("العنوان", "Address", "כתובת"), at: "address", value: (r) => r.address },
      { id: "label", type: "text", name: n("إسمه عنده", "Their name for it", "הכינוי שלו"), at: "label", nullable: true, value: (r) => r.label },
      { id: "notes", type: "text", name: n("ملاحظات", "Notes", "הערות"), at: "notes", nullable: true, value: (r) => r.notes },
      { id: "main", type: "boolean", name: n("الأساسي", "Their main one", "ברירת מחדל"), at: "isDefault", value: (r) => r.isDefault },
    ],
  },
  wishlist: {
    id: "wishlist",
    name: n("المفضلة", "Wishlists", "רשימות משאלות"),
    permission: "customers:read",
    slug: "id",
    changed: false,
    delegate: () => prisma.wishlistItem,
    select: { id: true, createdAt: true, user: { select: { name: true, email: true } }, product: { select: { title: true } } },
    columns: [
      { id: "customer", type: "text", name: n("الزبون (إيميله)", "Customer (email)", "לקוח (אימייל)"), at: ["user", "email"], value: (r) => r.user?.email ?? null },
      { id: "name", type: "text", name: n("إسم الزبون", "Customer's name", "שם הלקוח"), at: ["user", "name"], value: (r) => r.user?.name ?? null },
      { id: "product", type: "text", name: n("المنتج", "Product", "מוצר"), at: ["product", "title"], value: (r) => r.product?.title ?? null },
    ],
  },
  subscribers: {
    id: "subscribers",
    name: n("مشتركين النشرة", "Newsletter subscribers", "מנויי ניוזלטר"),
    permission: "customers:read",
    slug: "id",
    changed: false,
    delegate: () => prisma.newsletterSubscriber,
    select: { id: true, email: true, source: true, createdAt: true },
    columns: [
      { id: "email", type: "text", name: n("الإيميل", "Email", "אימייל"), at: "email", value: (r) => r.email },
      { id: "source", type: "text", name: n("من وين", "From", "מקור"), at: "source", nullable: true, value: (r) => r.source },
    ],
  },
  coupons: {
    id: "coupons",
    name: n("الكوبونات", "Coupons", "קופונים"),
    permission: "discounts:read",
    slug: "id",
    delegate: () => prisma.coupon,
    select: { id: true, code: true, discountType: true, discountValue: true, maxDiscount: true, minCart: true, usageLimit: true, usedCount: true, phone: true, isActive: true, startsAt: true, endsAt: true, note: true, ...made },
    columns: [
      { id: "code", type: "text", name: n("الكود", "Code", "קוד"), at: "code", value: (r) => r.code },
      { id: "kind", type: "select", name: n("نوع الخصم", "Kind of discount", "סוג הנחה"), at: "discountType", options: choices(["PERCENT", "FIXED"], { PERCENT: n("نسبة %", "Percent", "אחוז"), FIXED: n("مبلغ ثابت", "A fixed amount", "סכום קבוע") }), value: (r) => r.discountType },
      { id: "value", type: "number", name: n("قيمة الخصم", "Discount", "הנחה"), at: "discountValue", value: (r) => num(r.discountValue) },
      { id: "most", type: "number", name: n("أقصى خصم", "Most off", "הנחה מרבית"), at: "maxDiscount", nullable: true, value: (r) => num(r.maxDiscount) },
      { id: "minCart", type: "number", name: n("أقل سلة", "Smallest bag", "סל מינימלי"), at: "minCart", nullable: true, value: (r) => num(r.minCart) },
      { id: "used", type: "number", name: n("انستعمل", "Used", "נוצל"), at: "usedCount", value: (r) => r.usedCount },
      { id: "limit", type: "number", name: n("حد الاستعمال", "Use limit", "מגבלת שימוש"), at: "usageLimit", nullable: true, value: (r) => r.usageLimit },
      { id: "active", type: "boolean", name: n("شغّال", "Active", "פעיל"), at: "isActive", value: (r) => r.isActive },
      { id: "starts", type: "date", name: n("بيبدا", "Starts", "מתחיל"), at: "startsAt", nullable: true, value: (r) => day(r.startsAt) },
      { id: "ends", type: "date", name: n("بيخلص", "Ends", "מסתיים"), at: "endsAt", nullable: true, value: (r) => day(r.endsAt) },
      { id: "phone", type: "text", name: n("لرقم واحد", "For one phone", "לטלפון אחד"), at: "phone", nullable: true, value: (r) => r.phone },
      { id: "note", type: "text", name: n("ملاحظة", "Note", "הערה"), at: "note", nullable: true, value: (r) => r.note },
    ],
  },
  redemptions: {
    id: "redemptions",
    name: n("استعمالات الكوبونات", "Coupon uses", "שימושי קופונים"),
    permission: "discounts:read",
    slug: "id",
    made: "redeemedAt",
    changed: false,
    delegate: () => prisma.couponRedemption,
    // Whose phone used it isn't here (the customers' permission): the coupon and the order it went on.
    select: { id: true, orderRequestId: true, redeemedAt: true, coupon: { select: { code: true } } },
    columns: [
      { id: "coupon", type: "text", name: n("الكوبون", "Coupon", "קופון"), at: ["coupon", "code"], value: (r) => r.coupon?.code ?? null },
      { id: "order", type: "text", name: n("رقم الطلب", "Order", "הזמנה"), at: "orderRequestId", value: (r) => r.orderRequestId },
    ],
  },
  reviews: {
    id: "reviews",
    name: n("التقييمات", "Reviews", "ביקורות"),
    permission: "ugc:read",
    slug: "id",
    delegate: () => prisma.review,
    // Who wrote it isn't here (the customers' permission).
    select: { id: true, rating: true, title: true, body: true, status: true, ...made, product: { select: { title: true } } },
    columns: [
      { id: "product", type: "text", name: n("المنتج", "Product", "מוצר"), at: ["product", "title"], value: (r) => r.product?.title ?? null },
      { id: "rating", type: "number", name: n("النجوم", "Stars", "כוכבים"), at: "rating", value: (r) => r.rating },
      { id: "title", type: "text", name: n("العنوان", "Title", "כותרת"), at: "title", nullable: true, value: (r) => r.title },
      { id: "body", type: "text", name: n("التقييم", "Review", "ביקורת"), at: "body", value: (r) => r.body },
      { id: "state", type: "select", name: n("الحالة", "State", "מצב"), at: "status", options: choices(SEEN_STATES, SEEN_STATE_NAMES), value: (r) => r.status },
    ],
  },
  comments: {
    id: "comments",
    name: n("تعليقات المنتجات", "Product comments", "תגובות למוצרים"),
    permission: "ugc:read",
    slug: "id",
    changed: false,
    delegate: () => prisma.productComment,
    select: { id: true, body: true, status: true, createdAt: true, product: { select: { title: true } } },
    columns: [
      { id: "product", type: "text", name: n("المنتج", "Product", "מוצר"), at: ["product", "title"], value: (r) => r.product?.title ?? null },
      { id: "body", type: "text", name: n("التعليق", "Comment", "תגובה"), at: "body", value: (r) => r.body },
      { id: "state", type: "select", name: n("الحالة", "State", "מצב"), at: "status", options: choices(SEEN_STATES, SEEN_STATE_NAMES), value: (r) => r.status },
    ],
  },
};

/** The field that says when a row of this table was made; null where rows keep no dates. */
export const madeAt = (t: StoreTable): string | null => (t.made === undefined ? "createdAt" : t.made);
/** The field that says when a row last changed; null where rows don't say. */
export const changedAt = (t: StoreTable): string | null => (t.changed === false ? null : "updatedAt");

const bad = (message: string, details?: unknown) => new AppError(400, "BAD_GRID_QUERY", message, details);

/** What may be asked of a store column: its kind's questions (none for a worked-out one). */
export function storeOps(c: StoreColumn): readonly Op[] {
  if (!c.at) return [];
  // A day held as a real date and time has no "is exactly" beyond the day itself.
  return OPS_BY_KIND[c.type];
}

/** The table as the grid knows tables: its columns as fields, read only. */
export function describeStoreTable(t: StoreTable, rows: number) {
  return {
    id: `$${t.id}`,
    slug: t.id,
    name: t.name,
    fields: t.columns.map((c) => ({ id: c.id, type: c.type, name: c.name, ...(c.options ? { options: c.options } : {}), ...(c.at ? {} : { computed: true }) })),
    templateId: null,
    items: rows,
    published: rows,
    readOnly: true,
    hasAddress: t.slug === "slug",
    // The dates its rows keep: the grid shows and asks about those only.
    made: madeAt(t) !== null,
    changed: changedAt(t) !== null,
  };
}

/** A condition on a field: the table's own, or one reached through linked rows ({ item: { product: { title: … } } }). */
const leaf = (at: string | string[], cond: unknown): object => (typeof at === "string" ? { [at]: cond } : at.reduceRight<unknown>((inner, key) => ({ [key]: inner }), cond)) as object;
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const dayStart = (v: string) => new Date(`${v}T00:00:00.000Z`);
const nextDay = (v: string) => new Date(dayStart(v).getTime() + 86_400_000);

function words(v: unknown, what: string): string {
  if (typeof v !== "string" || !v.trim() || v.length > 200) throw bad(`${what}: words are needed`);
  return v.trim();
}
function number(v: unknown, what: string): number {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(x)) throw bad(`${what}: a number is needed`);
  return x;
}
function date(v: unknown, what: string): string {
  if (!isDay(v)) throw bad(`${what}: a date like 2026-11-13 is needed`);
  return v;
}

/** A day's questions over a real date and time (the whole day counts). */
function dayWhere(at: string | string[], f: GridFilter, what: string) {
  if (f.op === "empty") return leaf(at, null);
  if (f.op === "notEmpty") return { NOT: leaf(at, null) };
  const a = date(f.value, what);
  if (f.op === "is") return leaf(at, { gte: dayStart(a), lt: nextDay(a) });
  if (f.op === "gt") return leaf(at, { gte: nextDay(a) });
  if (f.op === "gte") return leaf(at, { gte: dayStart(a) });
  if (f.op === "lt") return leaf(at, { lt: dayStart(a) });
  if (f.op === "lte") return leaf(at, { lt: nextDay(a) });
  return leaf(at, { gte: dayStart(a), lt: nextDay(date(f.value2, what)) });
}

/** One filter as a query condition. Throws when the column isn't the table's or can't be asked that. */
export function storeFilter(t: StoreTable, f: GridFilter): object {
  const what = f.field;
  if (f.field === "$createdAt" || f.field === "$updatedAt") {
    if (!OPS_BY_KIND.$date.includes(f.op)) throw bad(`"${f.op}" can't be asked of "${f.field}"`);
    const kept = f.field === "$createdAt" ? madeAt(t) : changedAt(t);
    if (!kept) throw bad(`No column "${f.field}" in this table`);
    return dayWhere(kept, f, what);
  }
  if (f.field === "$slug") {
    if (!OPS_BY_KIND.$slug.includes(f.op)) throw bad(`"${f.op}" can't be asked of "${f.field}"`);
    const v = words(f.value, what);
    return { [t.slug]: f.op === "is" ? v : f.op === "contains" ? { contains: v, mode: "insensitive" } : { startsWith: v, mode: "insensitive" } };
  }
  const c = t.columns.find((x) => x.id === f.field);
  if (!c) throw bad(`No column "${f.field}" in this table`);
  if (!c.at || !storeOps(c).includes(f.op)) throw bad(`"${f.op}" can't be asked of "${f.field}"`);
  const at = c.at;
  const never = { id: { in: [] as string[] } };
  // Through linked rows: one that isn't there counts as empty (where it may be missing; a row that must be there is never asked "is it null").
  const through = typeof at === "string" ? [] : [...(c.nullable ? [{ [at[0]]: { is: null } }] : []), ...(c.type === "text" ? [leaf(at, "")] : [])];
  const none = typeof at === "string" ? (c.type === "text" ? { OR: [leaf(at, null), leaf(at, "")] } : leaf(at, null)) : through.length ? { OR: through } : never;
  const emptyOf = c.nullable || typeof at !== "string" ? none : c.type === "text" ? leaf(at, "") : never;
  if (f.op === "empty") return emptyOf;
  if (f.op === "notEmpty") return { NOT: emptyOf };
  if (c.type === "text") {
    const v = words(f.value, what);
    const i = { mode: "insensitive" as const };
    if (f.op === "contains") return leaf(at, { contains: v, ...i });
    if (f.op === "notContains") return { NOT: leaf(at, { contains: v, ...i }) };
    if (f.op === "startsWith") return leaf(at, { startsWith: v, ...i });
    if (f.op === "endsWith") return leaf(at, { endsWith: v, ...i });
    return f.op === "is" ? leaf(at, { equals: v, ...i }) : { NOT: leaf(at, { equals: v, ...i }) };
  }
  if (c.type === "number") {
    const a = number(f.value, what);
    if (f.op === "is") return leaf(at, a);
    if (f.op === "isNot") return { NOT: leaf(at, a) };
    if (f.op === "between") return leaf(at, { gte: a, lte: number(f.value2, what) });
    return leaf(at, { [f.op]: a });
  }
  if (c.type === "boolean") return leaf(at, f.op === "isTrue");
  if (c.type === "date") return dayWhere(at, f, what);
  // A choice: only the column's own.
  const known = new Set((c.options ?? []).map((o) => o.id));
  const one = (v: unknown) => {
    const s = String(v ?? "").toUpperCase();
    if (!known.has(s)) throw bad(`${what}: one of its choices`);
    return s;
  };
  if (f.op === "anyOf") {
    if (!Array.isArray(f.value) || !f.value.length || f.value.length > 30) throw bad(`${what}: a list of choices is needed`);
    return leaf(at, { in: f.value.map(one) });
  }
  return f.op === "is" ? leaf(at, one(f.value)) : { NOT: leaf(at, one(f.value)) };
}

export function storeWhere(t: StoreTable, q: Pick<GridQuery, "search" | "filters" | "match">): object {
  const and: object[] = [];
  if (q.search) {
    const text = t.columns.filter((c) => c.at && c.type === "text");
    and.push({ OR: [{ [t.slug]: { contains: q.search, mode: "insensitive" } }, ...text.map((c) => leaf(c.at!, { contains: q.search, mode: "insensitive" }))] });
  }
  if (q.filters.length) {
    const each = q.filters.map((f, index) => {
      try {
        return storeFilter(t, f);
      } catch (e) {
        if (e instanceof AppError) e.details = { ...(e.details as object | undefined), filter: index };
        throw e;
      }
    });
    and.push(q.match === "any" ? { OR: each } : { AND: each });
  }
  return and.length ? { AND: and } : {};
}

export function storeOrder(t: StoreTable, q: Pick<GridQuery, "sort">): object[] {
  const out: object[] = [];
  for (const s of q.sort) {
    if (s.field === "$createdAt" || s.field === "$updatedAt") {
      const kept = s.field === "$createdAt" ? madeAt(t) : changedAt(t);
      if (!kept) throw bad(`No column "${s.field}" in this table`);
      out.push({ [kept]: s.dir });
    } else if (s.field === "$slug") out.push({ [t.slug]: s.dir });
    else {
      const c = t.columns.find((x) => x.id === s.field);
      if (!c) throw bad(`No column "${s.field}" in this table`);
      if (!c.at) throw bad(`"${s.field}" is worked out per page: it can't be sorted by`);
      // Empty ones last, where the field may be empty (the database refuses the question on a field that never is).
      out.push(typeof c.at === "string" ? { [c.at]: c.nullable ? { sort: s.dir, nulls: "last" } : s.dir } : leaf(c.at, s.dir));
    }
  }
  // Then the table's own order: the newest first, or what it says where rows keep no dates.
  const kept = madeAt(t);
  out.push(...(t.order ?? (kept ? [{ [kept]: "desc" }] : [])), { id: "asc" });
  return out;
}

/** A store row as the grid knows rows; its dates are null where the table keeps none. */
export type StoreGridRow = Omit<GridRow, "createdAt" | "updatedAt"> & { createdAt: Date | null; updatedAt: Date | null };

const toRow = (t: StoreTable, r: any): StoreGridRow => ({
  id: r.id,
  collectionId: `$${t.id}`,
  slug: String(r[t.slug]),
  status: "PUBLISHED",
  data: Object.fromEntries(t.columns.map((c) => [c.id, c.value(r)]).filter(([, v]) => v !== null && v !== undefined && v !== "")),
  sort: 0,
  publishedAt: null,
  createdAt: madeAt(t) ? r[madeAt(t)!] : null,
  // One that never says when it changed: when it was made.
  updatedAt: changedAt(t) ? r.updatedAt : madeAt(t) ? r[madeAt(t)!] : null,
  deletedAt: null,
  ownerId: null,
});

/** One page of a store table's rows and how many match. Only the "all" view exists here. */
export async function queryStoreRows(t: StoreTable, q: GridQuery): Promise<{ rows: StoreGridRow[]; total: number }> {
  if (q.view !== "all") return { rows: [], total: 0 };
  const where = storeWhere(t, q);
  const db = t.delegate();
  const [rows, total] = await Promise.all([db.findMany({ where, orderBy: storeOrder(t, q), skip: (q.page - 1) * q.pageSize, take: q.pageSize, select: t.select }), db.count({ where })]);
  return { rows: rows.map((r) => toRow(t, r)), total };
}

export async function storeRowsSlice(t: StoreTable, q: GridQuery, offset: number, limit: number): Promise<StoreGridRow[]> {
  const rows = await t.delegate().findMany({ where: storeWhere(t, q), orderBy: storeOrder(t, q), skip: offset, take: limit, select: t.select });
  return rows.map((r) => toRow(t, r));
}

/** A store table's CSV: its address (or id), each column, when it was made (where rows say). */
export const storeCsvHead = (t: StoreTable) => [t.slug, ...t.columns.map((c) => c.id), ...(madeAt(t) ? ["createdAt"] : [])].join(",");
export function storeCsvLine(t: StoreTable, row: StoreGridRow): string {
  return [csvCell(row.slug), ...t.columns.map((c) => csvCell(row.data[c.id], c.type === "text")), ...(madeAt(t) ? [csvCell(row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt))] : [])].join(",");
}

export type { StoreTable };
