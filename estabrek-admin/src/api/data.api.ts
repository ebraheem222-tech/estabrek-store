// The data grid (admin → الجداول; backend lib/dataQuery.ts, modules/admin/collectionRows.controller.ts):
// a table's rows a page at a time, filtered, sorted and searched by the server, cells, many rows at
// once, the trash, and CSV in and out. A table is a collection (collections.api.ts).
import { api } from "./http";
import type { Collection, CollectionField, CollectionItem, FieldType, ItemStatus, Local } from "./collections.api";

export type Lang = "ar" | "en" | "he";
export type Op = "contains" | "notContains" | "is" | "isNot" | "startsWith" | "endsWith" | "empty" | "notEmpty" | "gt" | "gte" | "lt" | "lte" | "between" | "anyOf" | "isTrue" | "isFalse";
export type View = "all" | "draft" | "published" | "archived" | "trash";
/** A row's own columns, beside its fields. */
export type SystemColumn = "$slug" | "$status" | "$createdAt" | "$updatedAt" | "$publishedAt";
export type ColumnKind = FieldType | "$slug" | "$status" | "$date";
/** A table in the grid: one of the owner's (a collection), or one of the store's own, to look at. */
export type GridTable = Omit<Collection, "fields"> & {
  /** One of the store's own tables (products, orders…): nothing is written from the grid. */
  readOnly?: boolean;
  /** Its rows have an address (a slug); else the first column is their id. */
  hasAddress?: boolean;
  /** `computed`: worked out per page (shown, never filtered or sorted by). */
  fields: Array<CollectionField & { computed?: boolean }>;
};
export type GridFilter = { field: string; op: Op; value?: unknown; value2?: unknown };
export type GridSort = { field: string; dir: "asc" | "desc" };
export type GridQuery = { page?: number; pageSize?: number; search?: string; lang?: Lang; view?: View; sort?: GridSort[]; filters?: GridFilter[]; match?: "all" | "any" };
export type GridRow = CollectionItem & { deletedAt: string | null };
export type GridPage = { rows: GridRow[]; total: number; page: number; pageSize: number; counts: Record<View, number>; ms: number };
export type GridMeta = {
  ops: Record<ColumnKind, Op[]>;
  systemColumns: SystemColumn[];
  views: View[];
  limits: { pageSize: number; filters: number; sorts: number; search: number; value: number; anyOf: number; rows: number; importRows: number; bulkIds: number; trashDays: number };
  /** Which rules fit which kind of field, and the ready shapes for short words. */
  rules: Record<FieldType, { unique: boolean; limits: "number" | "length" | "date" | null; shape: boolean; default: boolean }>;
  shapes: Array<NonNullable<CollectionField["shape"]>>;
};
export type Issue = { field: string; message: string; /** The owner's own words for this field's rules. */ say?: Local };
export type RowIn = { slug?: string; status?: string; values: Record<string, unknown> };
export type ImportReport = { dryRun: boolean; created: number; updated: number; rejected: Array<{ row: number; slug: string | null; issues: Issue[] }> };
export type BulkOp = "publish" | "draft" | "archive" | "trash" | "restore" | "purge" | "set";
export type BulkBody = ({ ids: string[] } | { query: GridQuery }) & { op: BulkOp; field?: string; value?: unknown; lang?: Lang };

const base = "/admin/collections";
const q = (query: GridQuery) => ({ params: { q: JSON.stringify(query) } });

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
  return (await api.post(`${base}/${id}/rows/bulk`, body)).data as { changed: number; counts: Record<View, number> };
}
export async function importRows(id: string, body: { rows: RowIn[]; mode: "create" | "upsert"; lang: Lang; dryRun: boolean }) {
  return (await api.post(`${base}/${id}/rows/import`, body)).data as ImportReport;
}
/** The store's own tables this member may see (products, categories, orders, customers), read only. */
export async function storeTables() {
  const data = (await api.get("/admin/data/store")).data;
  return (Array.isArray(data) ? data : []) as GridTable[];
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
