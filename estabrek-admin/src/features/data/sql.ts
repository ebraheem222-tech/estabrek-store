/**
 * A table's export as an SQL file (the data grid; made in the browser from the same lines the CSV has, the way
 * the Excel file is): CREATE TABLE with one column for each column of the export, typed by its field, then the
 * rows as INSERTs, all inside one transaction (a file that fails half way leaves nothing behind).
 *
 * Written for PostgreSQL (the store's own kind of database). Its first line says the file is UTF-8, the way
 * pg_dump's files do: without it, psql in a Windows console reads Arabic and Hebrew as the console's own
 * encoding and keeps them garbled, or refuses the file (tried). Without that line SQLite reads the file too.
 * Names are in small letters with underscores ("title.ar" → title_ar, "createdAt" → created_at, a table
 * "look-requests" → look_requests) and always quoted, so a name that is also a word of SQL ("order", "group")
 * still works. Pure (tested).
 */
import type { CollectionField } from "../../api/collections.api";

type Cell = string | number | boolean | null;
type SqlField = Pick<CollectionField, "id" | "type"> & { name?: Partial<Record<"ar" | "en" | "he", string>> | null };
type SqlType = "TEXT" | "NUMERIC" | "BOOLEAN" | "DATE" | "TIMESTAMPTZ" | "JSON";

/** Rows in one INSERT. */
export const SQL_BATCH = 100;
export const SQL_TYPE = "application/sql;charset=utf-8";

/** A name as SQL takes it without trouble: small letters, digits and underscores, never starting with a digit. */
export function sqlName(raw: string): string {
  const s = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const named = s || "column";
  return (/^[0-9]/.test(named) ? `_${named}` : named).slice(0, 60);
}

const quoted = (name: string) => `"${name.replace(/"/g, '""')}"`;
/** Words as an SQL string: a quote doubled (a backslash is only a backslash), and no NUL (PostgreSQL has none). */
export const sqlText = (v: string) => `'${v.replace(/\u0000/g, "").replace(/'/g, "''")}'`;
/** A comment's words on one line. */
const oneLine = (v: string) => v.replace(/[\r\n]+/g, " ").trim().slice(0, 120);

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MOMENT = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

/** The type a kind of field asks for (a row's own "createdAt" and the like are moments). */
function wanted(column: string, kind: string | undefined): SqlType {
  if (kind === "number" || kind === "money") return "NUMERIC";
  if (kind === "boolean") return "BOOLEAN";
  if (kind === "date") return "DATE";
  if (kind === "datetime") return "TIMESTAMPTZ";
  if (kind === "json") return "JSON";
  if (!kind && /^(createdAt|updatedAt|publishedAt)$/.test(column)) return "TIMESTAMPTZ";
  return "TEXT";
}

function fits(type: SqlType, v: Cell): boolean {
  if (v === null) return true;
  if (type === "NUMERIC") return typeof v === "number" && Number.isFinite(v);
  if (type === "BOOLEAN") return typeof v === "boolean";
  if (type === "DATE") return typeof v === "string" && DAY.test(v) && !Number.isNaN(Date.parse(v));
  if (type === "TIMESTAMPTZ") return typeof v === "string" && MOMENT.test(v) && !Number.isNaN(Date.parse(v));
  if (type === "JSON") {
    if (typeof v !== "string") return true;
    try {
      JSON.parse(v);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

function literal(type: SqlType, v: Cell): string {
  if (v === null) return "NULL";
  if (type === "NUMERIC") return String(v);
  if (type === "BOOLEAN") return v ? "TRUE" : "FALSE";
  return sqlText(typeof v === "string" ? v : JSON.stringify(v));
}

export type SqlColumn = { name: string; type: SqlType; /** What it is, for whoever reads the file. */ note: string; key: boolean };

/** The row's own columns in an export, said in the reader's language. */
const OWN_NOTE: Record<string, string> = {
  slug: "عنوان السطر|The row's address|כתובת השורה",
  id: "رقم السطر|The row's id|מזהה השורה",
  status: "حالة السطر|The row's status|מצב השורה",
  createdAt: "وقت الإضافة|When it was added|מתי נוסף",
};
const LANG_AT = { ar: 0, en: 1, he: 2 } as const;
/**
 * Whether a column of the export is the row's own (its address or id first, its status second) and not one of
 * the table's fields, even where a field has the same id.
 */
function ownColumn(head: Cell[], i: number): boolean {
  const name = String(head[i] ?? "");
  if (i === 0) return name === "slug" || name === "id";
  return i === 1 && name === "status" && head[0] === "slug";
}

/**
 * The file's columns from the export's first line: each one's name (said once: a second "status" becomes status_2),
 * and its type: the field's own when every value fits it, else words (so the file always loads). The first column
 * is the table's key when it is the row's address or id and every row has its own.
 */
export function sqlColumns(lines: Cell[][], fields: SqlField[], lang: "ar" | "en" | "he" = "ar"): SqlColumn[] {
  const [head = [], ...rows] = lines;
  const taken = new Set<string>();
  return head.map((h, i) => {
    const column = String(h ?? "");
    const [id, part] = column.split(".");
    const own = ownColumn(head, i);
    const field = own ? undefined : fields.find((f) => f.id === id);
    let name = sqlName(column);
    for (let n = 2; taken.has(name); n++) name = `${sqlName(column)}_${n}`;
    taken.add(name);
    const want = wanted(column, field?.type);
    const type = rows.every((r) => fits(want, r[i] ?? null)) ? want : "TEXT";
    const said = field?.name?.[lang] || field?.name?.ar || field?.name?.en || field?.name?.he || "";
    const note = oneLine(said ? (part ? `${said} (${part})` : said) : field ? "" : (OWN_NOTE[column]?.split("|")[LANG_AT[lang]] ?? ""));
    const values = rows.map((r) => r[i] ?? null);
    const key = i === 0 && own && rows.length > 0 && values.every((v) => typeof v === "string" && v !== "") && new Set(values).size === values.length;
    return { name, type, note, key };
  });
}

/**
 * The whole file. `lines`: the export's lines as a sheet's cells (dataText.ts sheetCells: numbers as numbers,
 * yes/no as yes/no, nothing as null), the first being the columns' names.
 */
export function sqlFile(opts: { table: string; title?: string; lines: Cell[][]; fields: SqlField[]; lang?: "ar" | "en" | "he"; /** When it was made (said at the top). */ at?: Date }): string {
  const rows = opts.lines.slice(1);
  const columns = sqlColumns(opts.lines, opts.fields, opts.lang);
  const table = quoted(sqlName(opts.table) || "rows");
  const out: string[] = [];
  const title = oneLine(opts.title ?? "");
  // Before any words that aren't plain English letters: from here on the file is read as UTF-8.
  out.push("SET client_encoding = 'UTF8';");
  out.push(`-- ${sqlName(opts.table)}${title ? `: ${title}` : ""}`);
  out.push(`-- ${rows.length} rows${opts.at ? `, exported ${opts.at.toISOString()}` : ""}`);
  out.push(`-- For PostgreSQL: load it into a database with  psql -f ${sqlName(opts.table)}.sql  or run it in a query window.`);
  out.push("-- The first line says the file is UTF-8 (Arabic and Hebrew stay right). For SQLite or another database, delete that line.");
  out.push(`-- To load it again over an older copy, first run:  DROP TABLE IF EXISTS ${table};`);
  out.push("");
  if (!columns.length) return `${out.join("\n")}\n`;
  out.push("BEGIN;");
  out.push("");
  out.push(`CREATE TABLE ${table} (`);
  columns.forEach((c, i) => {
    const last = i === columns.length - 1;
    out.push(`  ${quoted(c.name)} ${c.type}${c.key ? " PRIMARY KEY" : ""}${last ? "" : ","}${c.note ? ` -- ${c.note}` : ""}`);
  });
  out.push(");");
  const names = columns.map((c) => quoted(c.name)).join(", ");
  for (let from = 0; from < rows.length; from += SQL_BATCH) {
    out.push("");
    out.push(`INSERT INTO ${table} (${names}) VALUES`);
    const batch = rows.slice(from, from + SQL_BATCH);
    batch.forEach((r, k) => out.push(`  (${columns.map((c, i) => literal(c.type, r[i] ?? null)).join(", ")})${k === batch.length - 1 ? ";" : ","}`));
  }
  out.push("");
  out.push("COMMIT;");
  return `${out.join("\n")}\n`;
}
