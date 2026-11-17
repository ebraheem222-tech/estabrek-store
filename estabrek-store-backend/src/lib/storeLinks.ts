/**
 * The store's own tables as the other end of a relation (B3; lib/links.ts has the relations).
 * A relation field of one of the owner's tables may link the store's rows: its `to` is
 * "store:<table>" (store:products, store:coupons, store:reviews… every table the grid shows,
 * lib/storeTables.ts) instead of a table's id. One row or several, a store row linked from one
 * row only: the relation's own rules hold as they do between two of the owner's tables.
 *
 * - The links live in a table of their own, StoreLink (the owner's row → the store's row by its
 *   id). The store's tables are never written from here.
 * - A store row that is deleted takes nothing with it and is never held back: its links simply
 *   stop showing (they are read through the row), so "what happens when the linked row is
 *   deleted" isn't asked for these.
 * - A linked store row is named by what its own page calls it: a product's title, a category's
 *   name, an order's customer, a customer's name (or email), a coupon's code, a colour and size
 *   by its product, colour and size… Who may not see that table is told only that a row is
 *   linked. A name never says more of a shopper than the table's own columns do.
 *
 * Pure SQL pieces and names here: no imports from the relations' or the grid's code (both use this).
 */
import { Prisma } from "@prisma/client";

export const STORE = "store:";

type StoreDef = {
  /** The database's table. */
  table: string;
  /** What the row is called. */
  label: Prisma.Sql;
  /** Its address as it is answered (its id where it has none). */
  slug: Prisma.Sql;
  /** Another thing a row may be named by when it is asked for, in small letters: a product's or a category's address, a customer's email. */
  also: Prisma.Sql | null;
  /** The permission its own page needs: who has it is told the row's name. */
  permission: string;
};
// In the grid's own order (lib/storeTables.ts): the list of tables a relation may link reads the same.
const STORES = {
  // The catalogue.
  products: { table: "Product", label: Prisma.sql`t."title"`, slug: Prisma.sql`t."slug"`, also: Prisma.sql`lower(t."slug")`, permission: "catalog:read" },
  categories: { table: "Category", label: Prisma.sql`t."name"`, slug: Prisma.sql`t."slug"`, also: Prisma.sql`lower(t."slug")`, permission: "catalog:read" },
  types: { table: "ProductType", label: Prisma.sql`t."name"`, slug: Prisma.sql`t."slug"`, also: Prisma.sql`lower(t."slug")`, permission: "catalog:read" },
  sizes: { table: "Size", label: Prisma.sql`t."name"`, slug: Prisma.sql`t."id"`, also: Prisma.sql`lower(t."name")`, permission: "catalog:read" },
  variants: {
    table: "ProductVariant",
    // "Silk shawl · Rose · M": the product, its colour, the size.
    label: Prisma.sql`(SELECT p."title" || ' · ' || i."colorName" || ' · ' || s."name" FROM "ProductItem" i JOIN "Product" p ON p."id" = i."productId" JOIN "Size" s ON s."id" = t."sizeId" WHERE i."id" = t."productItemId")`,
    slug: Prisma.sql`t."sku"`,
    also: Prisma.sql`lower(t."sku")`,
    permission: "catalog:read",
  },
  // The stock.
  movements: {
    table: "InventoryAdjustment",
    label: Prisma.sql`(SELECT v."sku" FROM "ProductVariant" v WHERE v."id" = t."variantId") || ' ' || CASE WHEN t."delta" > 0 THEN '+' ELSE '' END || t."delta"::text`,
    slug: Prisma.sql`t."id"`,
    also: null,
    permission: "inventory:read",
  },
  alerts: { table: "StockAlert", label: Prisma.sql`(SELECT p."title" FROM "Product" p WHERE p."id" = t."productId")`, slug: Prisma.sql`t."id"`, also: null, permission: "inventory:read" },
  // The orders.
  orders: { table: "OrderRequest", label: Prisma.sql`t."customerName"`, slug: Prisma.sql`t."id"`, also: null, permission: "orders:read" },
  lines: { table: "OrderRequestItem", label: Prisma.sql`t."productTitle" || ' × ' || t."quantity"::text`, slug: Prisma.sql`t."id"`, also: null, permission: "orders:read" },
  requests: { table: "CustomerRequest", label: Prisma.sql`t."name"`, slug: Prisma.sql`t."id"`, also: null, permission: "orders:read" },
  // The customers.
  customers: { table: "User", label: Prisma.sql`COALESCE(NULLIF(t."name", ''), t."email")`, slug: Prisma.sql`t."id"`, also: Prisma.sql`lower(t."email")`, permission: "customers:read" },
  addresses: { table: "Address", label: Prisma.sql`t."fullName" || ' · ' || t."city"`, slug: Prisma.sql`t."id"`, also: null, permission: "customers:read" },
  wishlist: {
    table: "WishlistItem",
    label: Prisma.sql`(SELECT p."title" FROM "Product" p WHERE p."id" = t."productId") || ' · ' || (SELECT u."email" FROM "User" u WHERE u."id" = t."userId")`,
    slug: Prisma.sql`t."id"`,
    also: null,
    permission: "customers:read",
  },
  subscribers: { table: "NewsletterSubscriber", label: Prisma.sql`t."email"`, slug: Prisma.sql`t."id"`, also: Prisma.sql`lower(t."email")`, permission: "customers:read" },
  // The discounts.
  coupons: { table: "Coupon", label: Prisma.sql`t."code"`, slug: Prisma.sql`t."code"`, also: Prisma.sql`lower(t."code")`, permission: "discounts:read" },
  redemptions: { table: "CouponRedemption", label: Prisma.sql`(SELECT c."code" FROM "Coupon" c WHERE c."id" = t."couponId") || ' · ' || t."orderRequestId"`, slug: Prisma.sql`t."id"`, also: null, permission: "discounts:read" },
  // What shoppers wrote.
  reviews: { table: "Review", label: Prisma.sql`COALESCE(NULLIF(t."title", ''), left(t."body", 60))`, slug: Prisma.sql`t."id"`, also: null, permission: "ugc:read" },
  comments: { table: "ProductComment", label: Prisma.sql`left(t."body", 60)`, slug: Prisma.sql`t."id"`, also: null, permission: "ugc:read" },
} satisfies Record<string, StoreDef>;
export type StoreId = keyof typeof STORES;
export const STORE_IDS = Object.keys(STORES) as StoreId[];

/** The store's table a relation links ("store:products" → "products"); null for one of the owner's tables (or anything else). */
export const storeTarget = (to: unknown): StoreId | null => (typeof to === "string" && to.startsWith(STORE) && Object.hasOwn(STORES, to.slice(STORE.length)) ? (to.slice(STORE.length) as StoreId) : null);
export const storePermission = (s: StoreId) => STORES[s].permission;
/** The database's own table, as SQL (a fixed name from the list above, never anything asked for). */
const rowsOf = (s: StoreId) => Prisma.raw(`"${STORES[s].table}"`);

type Raw = { $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T> };

/** The store's rows that were asked for: by id, or by the other thing a row of that table is named by. `slug` is what matched besides the id. */
export async function storeRowsNamed(db: Raw, s: StoreId, names: string[]): Promise<Array<{ id: string; slug: string }>> {
  if (!names.length) return [];
  const def: StoreDef = STORES[s];
  const lower = names.map((n) => n.toLowerCase());
  return db.$queryRaw<Array<{ id: string; slug: string }>>(
    Prisma.sql`SELECT t."id", ${def.also ?? Prisma.sql`t."id"`} AS "slug" FROM ${rowsOf(s)} t WHERE t."id" = ANY(${names}::text[])${def.also ? Prisma.sql` OR ${def.also} = ANY(${lower}::text[])` : Prisma.empty}`,
  );
}

/** A store row as a relation shows it. */
export type StoreRow = { id: string; slug: string; label: string | null };

/** For each of the owner's rows: the store rows one relation links, in the row's order. A store row that is gone doesn't show. */
export async function storeLinksOf(db: Raw, s: StoreId, tableId: string, fieldId: string, rowIds: string[]): Promise<Array<StoreRow & { fromId: string }>> {
  const def: StoreDef = STORES[s];
  return db.$queryRaw<Array<StoreRow & { fromId: string }>>(
    Prisma.sql`SELECT l."fromId", t."id", ${def.slug} AS "slug", ${def.label} AS "label"
      FROM "StoreLink" l JOIN ${rowsOf(s)} t ON t."id" = l."toId"
      WHERE l."collectionId" = ${tableId} AND l."fieldId" = ${fieldId} AND l."toTable" = ${s} AND l."fromId" = ANY(${rowIds}::text[])
      ORDER BY l."position" ASC, l."createdAt" ASC, l."toId" ASC`,
  );
}

/** Store rows by their ids, named (for a box that picks them), in the ids' order. */
export async function storeRowsByIds(db: Raw, s: StoreId, ids: string[]): Promise<StoreRow[]> {
  if (!ids.length) return [];
  const def: StoreDef = STORES[s];
  const rows = await db.$queryRaw<StoreRow[]>(Prisma.sql`SELECT t."id", ${def.slug} AS "slug", ${def.label} AS "label" FROM ${rowsOf(s)} t WHERE t."id" = ANY(${ids}::text[])`);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

/**
 * A relation's links with the rows they lead to that are still there, as a piece of SQL to finish
 * with more conditions: `FROM <links> lk JOIN <rows> lt ON … WHERE lk."toTable" = …`. One of the
 * owner's tables: its rows that aren't in the trash. One of the store's: its rows.
 */
export function linkedRowsSql(to: string): Prisma.Sql {
  const s = storeTarget(to);
  return s
    ? Prisma.sql`FROM "StoreLink" lk JOIN ${rowsOf(s)} lt ON lt."id" = lk."toId" WHERE lk."toTable" = ${s}`
    : Prisma.sql`FROM "CollectionLink" lk JOIN "CollectionItem" lt ON lt."id" = lk."toId" AND lt."deletedAt" IS NULL WHERE lk."toTable" = ${to}`;
}
/** The table a relation's links are kept in, and the name its other end goes by there. */
export function linkTable(to: string): { table: Prisma.Sql; toTable: string } {
  const s = storeTarget(to);
  return s ? { table: Prisma.raw('"StoreLink"'), toTable: s } : { table: Prisma.raw('"CollectionLink"'), toTable: to };
}
