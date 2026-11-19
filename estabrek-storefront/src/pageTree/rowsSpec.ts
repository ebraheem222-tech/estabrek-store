/**
 * A list read in the visitor's browser (the backend's lib/collectionTree.ts LIST_FEEDS): a grid with `props.live`
 * and one card. The page is drawn the same for everyone and kept; the rows are each visitor's own question to the
 * table's API (GET /v1/data/<table>), asked as whoever is signed in: what the table lets them read ("live"), or
 * the signed-in shopper's own rows ("mine": the ones they added and the ones pointing at them; "added" and
 * "tome": one half of those). RowsView.tsx repeats the card for each row. Pure: no React, no page here.
 */
import type { VarValue } from "./pieces";
import type { TreeLang } from "./tree";

export const ROWS_FEEDS = ["live", "mine", "added", "tome"] as const;
export type RowsFeed = (typeof ROWS_FEEDS)[number];
export const ROWS_OPS = ["is", "isNot", "contains", "gt", "gte", "lt", "lte", "empty", "notEmpty", "isTrue", "isFalse"] as const;
const NO_VALUE = new Set<string>(["empty", "notEmpty", "isTrue", "isFalse"]);
export type RowsFilter = { field: string; op: (typeof ROWS_OPS)[number]; value: string };
/**
 * The list as the page draws it: its words already in the page's language. `stream`: read again by itself when one
 * of its table's rows is added, changed or deleted (liveHub.ts).
 */
export type RowsSpec = { table: string; feed: RowsFeed; limit: number; sort: string; where: RowsFilter[]; empty: string; signin: string; stream?: true };

/** Sent on window after something the shopper did may have changed a table's rows (a function ran, a form was taken): lists read again. */
export const ROWS_EVENT = "pt:rows";
export const rowsChanged = () => window.dispatchEvent(new Event(ROWS_EVENT));

const FIELD = /^[a-z][a-zA-Z0-9]{0,30}$/;
/** A field of the row, the row's own address ("$url", "$slug"), or who added it ("$by"). */
export const ROW_REF = /^(\$url|\$slug|\$by|[a-z][a-zA-Z0-9]{0,30})$/;

/** The list a grid's `props.live` asks for; null when it isn't one. */
export function liveOf(raw: unknown, say: (t: unknown) => string): RowsSpec | null {
  const p = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!p || typeof p.table !== "string" || !/^[a-z0-9][a-z0-9-]{0,40}$/.test(p.table) || !(ROWS_FEEDS as readonly unknown[]).includes(p.feed)) return null;
  const where: RowsFilter[] = [];
  for (const x of Array.isArray(p.where) ? p.where : []) {
    const f = x as { field?: unknown; op?: unknown; value?: unknown } | null;
    if (where.length >= 4 || !f || typeof f.field !== "string" || !FIELD.test(f.field) || !(ROWS_OPS as readonly unknown[]).includes(f.op)) continue;
    where.push({ field: f.field, op: f.op as RowsFilter["op"], value: typeof f.value === "string" ? f.value.slice(0, 80) : "" });
  }
  return {
    table: p.table,
    feed: p.feed as RowsFeed,
    limit: typeof p.limit === "number" && Number.isInteger(p.limit) && p.limit >= 1 && p.limit <= 48 ? p.limit : 6,
    sort: p.sort === "createdAt" ? "createdAt" : "-createdAt",
    where,
    empty: say(p.empty),
    signin: say(p.signin),
    ...(p.stream === true ? { stream: true as const } : {}),
  };
}

/** An element's connections to the row, as its card keeps them (`props.bind`): only the ones a row can fill. */
export function rowBind(raw: unknown): Partial<Record<"text" | "label" | "href" | "src" | "alt", string>> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const prop of ["text", "label", "href", "src", "alt"] as const) {
    const ref = (raw as Record<string, unknown>)[prop];
    if (typeof ref === "string" && ROW_REF.test(ref)) out[prop] = ref;
  }
  return out;
}

/** The question for one page of rows, as the address says it (after the "?"). */
export function rowsQuery(spec: RowsSpec, lang: TreeLang, page: number): string {
  const q = new URLSearchParams({ lang, shown: "1", pageSize: String(spec.limit), page: String(page), sort: spec.sort });
  if (spec.feed === "mine") q.set("mine", "1");
  else if (spec.feed !== "live") q.set("mine", spec.feed);
  for (const f of spec.where) {
    // A question with nothing to compare with isn't asked (the list would answer nothing at all, or be refused).
    if (!NO_VALUE.has(f.op) && !f.value) continue;
    q.set(`${f.field}[${f.op}]`, NO_VALUE.has(f.op) ? "1" : f.value);
  }
  return q.toString();
}

/** A row as the API answers it with `shown=1`. */
export type RowOut = { id: string; slug: string; status: string; values: Record<string, unknown>; shown: Record<string, string>; links: Record<string, string> };

const strings = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (v && typeof v === "object" && !Array.isArray(v)) for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (typeof x === "string") out[k] = x;
  return out;
};
/** The rows of an answer, each checked (anything that isn't a row is left out). */
export function rowsOf(raw: unknown): RowOut[] {
  const out: RowOut[] = [];
  for (const x of Array.isArray(raw) ? raw : []) {
    const r = x as Record<string, unknown> | null;
    if (!r || typeof r.id !== "string" || !/^[A-Za-z0-9_-]{1,60}$/.test(r.id)) continue;
    out.push({ id: r.id, slug: typeof r.slug === "string" ? r.slug : "", status: typeof r.status === "string" ? r.status : "", values: r.values && typeof r.values === "object" && !Array.isArray(r.values) ? (r.values as Record<string, unknown>) : {}, shown: strings(r.shown), links: strings(r.links) });
  }
  return out;
}

/** What an element connected to `ref` says for this row ("" when the row has nothing there). */
export function rowWords(row: RowOut, ref: string): string {
  if (ref === "$slug") return row.slug;
  if (ref === "$url") return "";
  return row.shown[ref] ?? "";
}

/**
 * The row's values as a recipe and a text see them: {{row_id}}, {{row_slug}}, {{row_by}} (who added it), and
 * {{row_<field>}}: the field's words as the page shows them, or its plain value where it has no words (a picture's
 * address). A field whose name is too long for a variable isn't there.
 */
export function rowScope(row: RowOut): Record<string, VarValue> {
  const scope: Record<string, VarValue> = { row_id: row.id, row_slug: row.slug };
  if (row.shown.$by) scope.row_by = row.shown.$by;
  const keep = (field: string, v: VarValue) => {
    const name = `row_${field}`;
    if (FIELD.test(field) && name.length <= 24) scope[name] = v;
  };
  for (const [field, v] of Object.entries(row.values)) if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") keep(field, v);
  for (const [field, words] of Object.entries(row.shown)) keep(field, words);
  return scope;
}

export type RowsWords = { loading: string; empty: string; signin: string; signinLink: string; failed: string; retry: string; more: string };
const WORDS: Record<TreeLang, RowsWords> = {
  ar: { loading: "لحظة…", empty: "ما في شي لسا", signin: "سجّل دخولك لتشوف هالقائمة.", signinLink: "تسجيل الدخول", failed: "ما قدرنا نجيب القائمة.", retry: "جرّب كمان مرة", more: "عرض المزيد" },
  en: { loading: "One moment…", empty: "Nothing here yet", signin: "Sign in to see this list.", signinLink: "Sign in", failed: "The list couldn't be loaded.", retry: "Try again", more: "Show more" },
  he: { loading: "רגע…", empty: "אין כאן כלום עדיין", signin: "התחברו כדי לראות את הרשימה.", signinLink: "התחברות", failed: "לא הצלחנו לטעון את הרשימה.", retry: "נסו שוב", more: "הצג עוד" },
};
export const rowsWords = (lang: TreeLang): RowsWords => WORDS[lang] ?? WORDS.ar;
