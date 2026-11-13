/**
 * The store's own tables in the data grid, to look at (admin → الجداول): products, categories,
 * orders and customers, beside the tables the owner makes. They answer the grid's same question
 * (lib/dataQuery.ts: pages, filters, sort, search), here turned into an ordinary query over a
 * fixed list of columns per table. Nothing is written from here: the store's tables change through
 * their own pages, which know their rules (stock, prices, an order's steps).
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
  /** The database's field ("title"), or one of a linked row (["category", "name"]). None: worked out per page (not filtered or sorted). */
  at?: string | [string, string];
  /** The field may hold nothing (decides how "empty" is asked and where empty ones sort). */
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
};

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
  };
}

const leaf = (at: string | [string, string], cond: unknown) => (typeof at === "string" ? { [at]: cond } : { [at[0]]: { [at[1]]: cond } });
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
function dayWhere(at: string | [string, string], f: GridFilter, what: string) {
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
    return dayWhere(f.field.slice(1), f, what);
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
  // A linked row that isn't there counts as empty.
  const none = typeof at === "string" ? (c.type === "text" ? { OR: [leaf(at, null), leaf(at, "")] } : leaf(at, null)) : { OR: [{ [at[0]]: { is: null } }, leaf(at, "")] };
  const emptyOf = c.nullable || typeof at !== "string" ? none : c.type === "text" ? leaf(at, "") : { id: { in: [] as string[] } };
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
    if (s.field === "$createdAt" || s.field === "$updatedAt") out.push({ [s.field.slice(1)]: s.dir });
    else if (s.field === "$slug") out.push({ [t.slug]: s.dir });
    else {
      const c = t.columns.find((x) => x.id === s.field);
      if (!c) throw bad(`No column "${s.field}" in this table`);
      if (!c.at) throw bad(`"${s.field}" is worked out per page: it can't be sorted by`);
      // Empty ones last, where the field may be empty (the database refuses the question on a field that never is).
      out.push(typeof c.at === "string" ? { [c.at]: c.nullable ? { sort: s.dir, nulls: "last" } : s.dir } : { [c.at[0]]: { [c.at[1]]: s.dir } });
    }
  }
  out.push({ createdAt: "desc" }, { id: "asc" });
  return out;
}

const toRow = (t: StoreTable, r: any): GridRow => ({
  id: r.id,
  collectionId: `$${t.id}`,
  slug: String(r[t.slug]),
  status: "PUBLISHED",
  data: Object.fromEntries(t.columns.map((c) => [c.id, c.value(r)]).filter(([, v]) => v !== null && v !== undefined && v !== "")),
  sort: 0,
  publishedAt: null,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  deletedAt: null,
});

/** One page of a store table's rows and how many match. Only the "all" view exists here. */
export async function queryStoreRows(t: StoreTable, q: GridQuery): Promise<{ rows: GridRow[]; total: number }> {
  if (q.view !== "all") return { rows: [], total: 0 };
  const where = storeWhere(t, q);
  const db = t.delegate();
  const [rows, total] = await Promise.all([db.findMany({ where, orderBy: storeOrder(t, q), skip: (q.page - 1) * q.pageSize, take: q.pageSize, select: t.select }), db.count({ where })]);
  return { rows: rows.map((r) => toRow(t, r)), total };
}

export async function storeRowsSlice(t: StoreTable, q: GridQuery, offset: number, limit: number): Promise<GridRow[]> {
  const rows = await t.delegate().findMany({ where: storeWhere(t, q), orderBy: storeOrder(t, q), skip: offset, take: limit, select: t.select });
  return rows.map((r) => toRow(t, r));
}

/** A store table's CSV: its address (or id), each column, when it was made. */
export const storeCsvHead = (t: StoreTable) => [t.slug, ...t.columns.map((c) => c.id), "createdAt"].join(",");
export function storeCsvLine(t: StoreTable, row: GridRow): string {
  return [csvCell(row.slug), ...t.columns.map((c) => csvCell(row.data[c.id], c.type === "text")), csvCell(row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt))].join(",");
}

export type { StoreTable };
