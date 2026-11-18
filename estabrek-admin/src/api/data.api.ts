// The data grid (admin → الجداول; backend lib/dataQuery.ts, modules/admin/collectionRows.controller.ts):
// a table's rows a page at a time, filtered, sorted and searched by the server, cells, many rows at
// once, the trash, and CSV in and out. A table is a collection (collections.api.ts).
import { api } from "./http";
import { updateCategory, updateProduct } from "./catalog.api";
import type { Collection, CollectionField, CollectionItem, FieldType, ItemStatus, Linked, Local } from "./collections.api";

export type Lang = "ar" | "en" | "he";
export type Op = "contains" | "notContains" | "is" | "isNot" | "startsWith" | "endsWith" | "empty" | "notEmpty" | "gt" | "gte" | "lt" | "lte" | "between" | "anyOf" | "isTrue" | "isFalse";
export type View = "all" | "draft" | "published" | "archived" | "trash";
/** A row's own columns, beside its fields. */
export type SystemColumn = "$slug" | "$status" | "$createdAt" | "$updatedAt" | "$publishedAt";
/** "$from": the other side of a relation that links this table: who links the row (read only). */
export type ColumnKind = FieldType | "$slug" | "$status" | "$date" | "$from";
/** A relation of some table (this one's own too) that links this table's rows: a column of its grid, "$from.<table address>.<field id>". */
export type Incoming = { id: string; table: string; slug: string; name: Local | null; field: string; fieldName: Local | null; /** A row here is linked from one row there at most. */ single: boolean };
/** Who links a row through one such relation: how many rows, and the first few. */
export type LinkedFrom = { n: number; rows: Linked[] };
/** A table in the grid: one of the owner's (a collection), or one of the store's own, to look at. */
export type GridTable = Omit<Collection, "fields"> & {
  /** One of the store's own tables (products, orders…): nothing is written from the grid. */
  readOnly?: boolean;
  /** Its rows have an address (a slug); else the first column is their id. */
  hasAddress?: boolean;
  /** One of the store's tables: its rows say when they were made / when they last changed (yes when not said; sizes keep no dates, a stock movement never changes). */
  made?: boolean;
  changed?: boolean;
  /** `computed`: worked out per page (shown, never filtered or sorted by). */
  fields: Array<CollectionField & { computed?: boolean }>;
};
export type GridFilter = { field: string; op: Op; value?: unknown; value2?: unknown };
export type GridSort = { field: string; dir: "asc" | "desc" };
export type GridQuery = { page?: number; pageSize?: number; search?: string; lang?: Lang; view?: View; sort?: GridSort[]; filters?: GridFilter[]; match?: "all" | "any" };
export type GridRow = CollectionItem & {
  deletedAt: string | null;
  /** Who links it, by the linked-from column's id. */
  from?: Record<string, LinkedFrom>;
  /** The shopper whose row it is (added through the API); by name only for members who may see the customers. */
  ownerId?: string | null;
  owner?: { id: string; name?: string; email?: string };
  /** For each field of kind "customer": the shopper whose account has that email (only for a member who may see the customers). */
  customers?: Record<string, { id: string; name: string }>;
};
export type GridPage = { rows: GridRow[]; total: number; page: number; pageSize: number; counts: Record<View, number>; ms: number; /** The relations that link this table. */ incoming?: Incoming[] };
export type GridMeta = {
  ops: Record<ColumnKind, Op[]>;
  systemColumns: SystemColumn[];
  views: View[];
  limits: { pageSize: number; filters: number; sorts: number; search: number; value: number; anyOf: number; rows: number; importRows: number; bulkIds: number; trashDays: number; /** Rows one row links in one relation. */ links?: number };
  /** Which rules fit which kind of field, and the ready shapes for short words. */
  rules: Record<FieldType, { unique: boolean; limits: "number" | "length" | "date" | null; shape: boolean; default: boolean }>;
  shapes: Array<NonNullable<CollectionField["shape"]>>;
};
export type Issue = { field: string; message: string; /** The owner's own words for this field's rules. */ say?: Local; /** The value the message is about (a row that isn't there). */ value?: string };
/** Who holds rows that were asked to go: a table, its relation, how many of its rows, one of them (409 ROWS_LINKED). */
export type Blocker = { table: string; slug: string; name: Local | null; field: string; fieldName?: Local | null; rows: number; sample: string };
export type RowIn = { slug?: string; status?: string; values: Record<string, unknown> };
export type ImportReport = { dryRun: boolean; created: number; updated: number; rejected: Array<{ row: number; slug: string | null; issues: Issue[] }> };
export type BulkOp = "publish" | "draft" | "archive" | "trash" | "restore" | "purge" | "set";
export type BulkBody = ({ ids: string[] } | { query: GridQuery }) & { op: BulkOp; field?: string; value?: unknown; lang?: Lang };

const base = "/admin/collections";
const q = (query: GridQuery) => ({ params: { q: JSON.stringify(query) } });

/** A private file a row holds ("file:<id>"): its name and kind, and a link to it that runs out (10 minutes). */
export async function privateFile(tableId: string, fileId: string) {
  return (await api.get(`${base}/${tableId}/files/${fileId}`)).data as { id: string; name: string; kind: string; bytes: number; url: string };
}

export async function gridMeta() {
  return (await api.get(`${base}/grid-meta`)).data as GridMeta;
}
export async function getRows(id: string, query: GridQuery) {
  return (await api.get(`${base}/${id}/rows`, q(query))).data as GridPage;
}
export async function addRow(id: string, body: RowIn & { lang?: Lang }) {
  return (await api.post(`${base}/${id}/rows`, body)).data as GridRow;
}
export async function patchRow(id: string, rowId: string, body: { slug?: string; status?: ItemStatus; sort?: number; values?: Record<string, unknown>; lang?: Lang }) {
  return (await api.patch(`${base}/${id}/rows/${rowId}`, body)).data as GridRow;
}
export async function bulkRows(id: string, body: BulkBody) {
  return (await api.post(`${base}/${id}/rows/bulk`, body)).data as { changed: number; /** Rows that went to the trash (or came back) with them, through a "deleted with it" relation. */ withThem?: number; counts: Record<View, number> };
}
/** A few of a table's rows to pick from when linking (a relation's picker), found by their words or address. */
export async function lookupRows(id: string, search: string) {
  // One of the store's tables ("store:products"): its own route, which asks for that table's permission.
  const store = /^store:([a-z]+)$/.exec(id)?.[1];
  const at = store ? `/admin/data/store/${store}/lookup` : `${base}/${id}/rows/lookup`;
  return (await api.get(at, { params: search.trim() ? { search: search.trim() } : {} })).data as { rows: Linked[]; total: number };
}
export async function importRows(id: string, body: { rows: RowIn[]; mode: "create" | "upsert"; lang: Lang; dryRun: boolean }) {
  return (await api.post(`${base}/${id}/rows/import`, body)).data as ImportReport;
}
/** The store's own tables this member may see (products, categories, orders, customers), read only. */
export async function storeTables() {
  const data = (await api.get("/admin/data/store")).data;
  return (Array.isArray(data) ? data : []) as GridTable[];
}
/**
 * One of a store row's safe cells (a product's name or whether it shows, a category's name), written with the
 * command its own page uses: the catalogue's own route, with its rules, its history and the activity log.
 */
export async function writeStoreCell(to: "product" | "category", id: string, body: Record<string, unknown>) {
  if (to === "product") await updateProduct(id, body);
  else await updateCategory(id, body);
}
export async function getStoreRows(table: string, query: GridQuery) {
  return (await api.get(`/admin/data/store/${table}/rows`, q(query))).data as GridPage;
}
export async function exportStoreRows(table: string, query: GridQuery) {
  return (await api.get(`/admin/data/store/${table}/rows/export`, { ...q(query), responseType: "blob" })).data as Blob;
}
/** The asked rows (every page of them) as a CSV file. */
export async function exportRows(id: string, query: GridQuery) {
  return (await api.get(`${base}/${id}/rows/export`, { ...q(query), responseType: "blob" })).data as Blob;
}
