/**
 * The data grid's pure parts (tested): its columns, what may be asked of each and in which words,
 * a cell's value as words, a filter ready to send, and a CSV file's columns matched to the table's.
 * Words are written in the three languages side by side ("عربي|English|עברית"); the page says them.
 */
import type { Collection, CollectionField, FieldType, ItemStatus, Local } from "../../api/collections.api";
import type { Blocker, ColumnKind, GridFilter, GridQuery, GridRow, GridTable, Lang, Op, RowIn, SystemColumn, View } from "../../api/data.api";
import { shownText, valueFrom } from "./kinds";

export const LANGS: Lang[] = ["ar", "en", "he"];
export const LANG_NAME: Record<Lang, string> = { ar: "عربي", en: "English", he: "עברית" };
export const WORDS: FieldType[] = ["text", "longText"];

export const VIEW_NAME: Record<View, string> = {
  all: "الكل|All|הכול",
  draft: "مسودات|Drafts|טיוטות",
  published: "منشور|Published|פורסם",
  archived: "مؤرشف|Archived|בארכיון",
  trash: "سلة المحذوفات|Trash|אשפה",
};
export const STATUS_NAME: Record<ItemStatus, string> = { DRAFT: "مسودة|Draft|טיוטה", PUBLISHED: "منشور|Published|פורסם", ARCHIVED: "مؤرشف|Archived|בארכיון" };
export const SYSTEM_NAME: Record<SystemColumn, string> = {
  $slug: "العنوان بالرابط|Address|כתובת",
  $status: "الحالة|Status|מצב",
  $createdAt: "انعمل|Created|נוצר",
  $updatedAt: "آخر تعديل|Changed|שונה",
  $publishedAt: "انتشر|Published on|פורסם ב",
};

export type Column = { id: string; kind: ColumnKind; field?: CollectionField; name: string; /** Worked out per page: shown, never filtered or sorted by. */ computed?: boolean };

const local = (v: Local | undefined, lang: Lang) => v?.[lang] || v?.ar || v?.en || v?.he || "";

export function kindOf(column: string, fields: CollectionField[]): ColumnKind | null {
  if (column === "$slug" || column === "$status") return column;
  if (column === "$createdAt" || column === "$updatedAt" || column === "$publishedAt") return "$date";
  return fields.find((f) => f.id === column)?.type ?? null;
}

/** The grid's columns: the address, the status, each field, then when it changed. One of the store's tables: its address (or id), its columns, when it was made. */
export function columnsOf(table: Pick<GridTable, "fields" | "readOnly" | "hasAddress">, lang: Lang): Column[] {
  const system = (id: SystemColumn): Column => ({ id, kind: kindOf(id, [])!, name: SYSTEM_NAME[id] });
  const fields = table.fields.map((f): Column => ({ id: f.id, kind: f.type as ColumnKind, field: f, name: local(f.name, lang) || f.id, ...(f.computed ? { computed: true } : {}) }));
  if (table.readOnly) return [{ ...system("$slug"), ...(table.hasAddress ? {} : { name: "الرقم|ID|מזהה" }) }, ...fields, system("$createdAt")];
  return [system("$slug"), system("$status"), ...fields, system("$updatedAt")];
}

/** The columns a filter can be asked of: the shown ones that aren't worked out, and the row's dates. */
export function filterColumns(columns: Column[], readOnly: boolean): Column[] {
  const date = (id: SystemColumn): Column => ({ id, kind: "$date", name: SYSTEM_NAME[id] });
  const have = new Set(columns.map((c) => c.id));
  const extra = (readOnly ? (["$createdAt", "$updatedAt"] as const) : (["$createdAt", "$publishedAt"] as const)).filter((id) => !have.has(id)).map(date);
  return [...columns.filter((c) => !c.computed), ...extra];
}

/** How each question reads, by the kind of column it's asked of. */
const OP_WORDS: Record<Op, string> = {
  contains: "فيه|contains|מכיל",
  notContains: "ما فيه|doesn't contain|לא מכיל",
  is: "هو|is|הוא",
  isNot: "مش|is not|אינו",
  startsWith: "بيبدأ بـ|starts with|מתחיל ב",
  endsWith: "بيخلص بـ|ends with|מסתיים ב",
  empty: "فاضي|is empty|ריק",
  notEmpty: "مش فاضي|is not empty|לא ריק",
  gt: "أكبر من|more than|גדול מ",
  gte: "أكبر أو يساوي|at least|לפחות",
  lt: "أصغر من|less than|קטן מ",
  lte: "أصغر أو يساوي|at most|לכל היותר",
  between: "بين|between|בין",
  anyOf: "واحد من|any of|אחד מ",
  isTrue: "نعم|yes|כן",
  isFalse: "لا|no|לא",
};
const DATE_WORDS: Partial<Record<Op, string>> = { is: "يوم|on|ב", gt: "بعد|after|אחרי", gte: "من|from|מ", lt: "قبل|before|לפני", lte: "لحد|up to|עד" };
/** A relation is asked about its links. */
const LINK_WORDS: Partial<Record<Op, string>> = { anyOf: "مربوط بواحد من|linked to any of|מקושר לאחד מ", empty: "مش مربوط بشي|linked to nothing|לא מקושר", notEmpty: "مربوط بشي|linked to something|מקושר" };
export function opName(op: Op, kind: ColumnKind): string {
  return ((kind === "date" || kind === "$date") && DATE_WORDS[op]) || (kind === "relation" && LINK_WORDS[op]) || OP_WORDS[op];
}

/** What a question needs beside the column: nothing, one value, two (between) or a list. */
export function opNeeds(op: Op): "none" | "one" | "two" | "list" {
  if (op === "empty" || op === "notEmpty" || op === "isTrue" || op === "isFalse") return "none";
  return op === "between" ? "two" : op === "anyOf" ? "list" : "one";
}

const filled = (v: unknown) => (typeof v === "number" ? Number.isFinite(v) : typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : false);
/** Is the filter whole (its values written)? Half-written ones aren't sent. */
export function filterReady(f: GridFilter): boolean {
  const needs = opNeeds(f.op);
  return needs === "none" || (needs === "two" ? filled(f.value) && filled(f.value2) : filled(f.value));
}

/** A column's first filter: the first thing that may be asked of it. */
export function newFilter(column: string, kind: ColumnKind, ops: Record<ColumnKind, Op[]>): GridFilter {
  return { field: column, op: ops[kind]?.[0] ?? "notEmpty" };
}

/** The value as the server wants it for this kind of column (numbers as numbers). */
export function filterValue(kind: ColumnKind, raw: string): unknown {
  if (kind === "number" || kind === "money") return raw.trim() === "" ? "" : Number(raw);
  return raw;
}

/** The question as it's sent: whole filters only, no empty search, the page it's on. */
export function queryOut(q: GridQuery): GridQuery {
  const out: GridQuery = { page: q.page ?? 1, pageSize: q.pageSize ?? 50, view: q.view ?? "all", lang: q.lang ?? "ar" };
  if (q.search?.trim()) out.search = q.search.trim();
  const filters = (q.filters ?? []).filter(filterReady);
  if (filters.length) {
    out.filters = filters;
    if (q.match === "any") out.match = "any";
  }
  if (q.sort?.length) out.sort = q.sort;
  return out;
}

/** A click on a column's head: up, then down, then the table's own order. */
export function nextSort(sort: GridQuery["sort"], column: string): NonNullable<GridQuery["sort"]> {
  const cur = sort?.find((s) => s.field === column);
  if (!cur) return [{ field: column, dir: "asc" }];
  return cur.dir === "asc" ? [{ field: column, dir: "desc" }] : [];
}

export function dateText(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang === "ar" ? "ar" : lang === "he" ? "he-IL" : "en-GB", { year: "numeric", month: "short", day: "numeric" });
}

/** A cell as words (what the grid shows, and what sorting by eye expects). */
export function cellText(column: Column, row: Pick<GridRow, "slug" | "status" | "data" | "createdAt" | "updatedAt" | "publishedAt">, lang: Lang): string {
  if (column.id === "$slug") return row.slug;
  if (column.id === "$status") return STATUS_NAME[row.status];
  if (column.id === "$createdAt") return dateText(row.createdAt, lang);
  if (column.id === "$updatedAt") return dateText(row.updatedAt, lang);
  if (column.id === "$publishedAt") return dateText(row.publishedAt, lang);
  const v = row.data?.[column.id];
  if (v === undefined || v === null || v === "") return "";
  // The owner's tables hold words per language; the store's own hold them plain.
  if (column.kind === "text" || column.kind === "longText") return typeof v === "object" ? local(v as Local, lang) : typeof v === "string" ? v : "";
  return column.field ? shownText(column.field, v, lang) : String(v);
}

/** A text cell after its words in one language changed (an emptied language is left out; nothing left = null). */
export function withWords(was: unknown, lang: Lang, words: string): Local | null {
  const out: Local = { ...(was && typeof was === "object" ? (was as Local) : {}) };
  if (words.trim()) out[lang] = words;
  else delete out[lang];
  return Object.keys(out).length ? out : null;
}

/** How many pages, and which rows this one shows ("51–100 من 2,340"). */
export function pageInfo(total: number, page: number, pageSize: number) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  return { pages, from, to: Math.min(total, page * pageSize) };
}

/** The server's words for a refused value, in the admin's languages. */
const ISSUE_WORDS: Record<string, string> = {
  Required: "لازم ينكتب|Required|חובה",
  "A number": "لازم رقم|A number is needed|נדרש מספר",
  "A date": "لازم تاريخ|A date is needed|נדרש תאריך",
  "Yes or no": "نعم أو لا|Yes or no|כן או לא",
  "One of its choices": "لازم واحد من الاختيارات|One of its choices|אחת מהאפשרויות",
  "A picture address": "لازم رابط صورة|A picture's address|כתובת תמונה",
  "A link like /shop or https://…": "لازم رابط متل /shop أو https://…|A link like /shop or https://…|קישור כמו /shop או https://…",
  "A colour like #c86b98": "لازم لون متل #c86b98|A colour like #c86b98|צבע כמו #c86b98",
  "Words in ar/en/he": "لازم كلام|Words are needed|נדרש טקסט",
  "No such column": "ما في عمود بهالإسم|No such column|אין עמודה כזו",
  "Small letters, digits and -": "حروف إنجليزية صغيرة وأرقام و - بس|Small letters, digits and - only|אותיות קטנות, ספרות ו־- בלבד",
  "Twice in this file": "مكرّر بالملف|Twice in this file|פעמיים בקובץ",
  "This address is already used": "العنوان مستعمل|This address is already used|הכתובת כבר בשימוש",
  "This address is in the trash": "العنوان موجود بسلة المحذوفات|This address is in the trash|הכתובת נמצאת באשפה",
  "DRAFT, PUBLISHED or ARCHIVED": "الحالة: DRAFT أو PUBLISHED أو ARCHIVED|DRAFT, PUBLISHED or ARCHIVED|DRAFT, PUBLISHED או ARCHIVED",
  "Too small": "أصغر من المسموح|Too small|קטן מדי",
  "Too big": "أكبر من المسموح|Too big|גדול מדי",
  "Too short": "أقصر من المسموح|Too short|קצר מדי",
  "Too long": "أطول من المسموح|Too long|ארוך מדי",
  "Too early": "قبل أول يوم مسموح|Before the first day allowed|לפני היום הראשון המותר",
  "Too late": "بعد آخر يوم مسموح|After the last day allowed|אחרי היום האחרון המותר",
  "Not the asked shape": "مش بالشكل المطلوب|Not the asked shape|לא בצורה הנדרשת",
  "Already used": "القيمة مستعملة بسطر تاني|Another row already has this value|שורה אחרת כבר מחזיקה בערך הזה",
  "Only one row can hold this value": "هالعمود ما بيتكرر: سطر واحد بس بياخد القيمة|This column takes no doubles: only one row can hold the value|עמודה ללא כפילויות: רק שורה אחת יכולה להחזיק בערך",
  // A relation's rows (backend lib/links.ts).
  "No such row": "ما في سطر بهالعنوان بالجدول المربوط|No such row in the linked table|אין שורה כזו בטבלה המקושרת",
  "One row only": "هالحقل بيرتبط بسطر واحد بس|This field links one row only|השדה מקשר שורה אחת בלבד",
  "A row can't link itself": "السطر ما بيرتبط بحاله|A row can't link itself|שורה לא יכולה לקשר את עצמה",
  "Already linked from another row": "هالسطر مربوط من سطر تاني، وما بينربط إلا من واحد|Another row already links it, and it takes one only|שורה אחרת כבר מקשרת אותה, והיא מקבלת אחת בלבד",
  "Rows by their id or address": "لازم سطور (بعناوينها)|Rows are needed (by their addresses)|נדרשות שורות (לפי הכתובות שלהן)",
  "Too many linked rows": "سطور مربوطة أكتر من المسموح|More linked rows than a row can hold|יותר מדי שורות מקושרות",
  "Only one row can link this row": "هالسطر بينربط من سطر واحد بس: حدّد سطر واحد|It takes one linking row only: choose one row|היא מקבלת שורה מקשרת אחת בלבד: בחר שורה אחת",
};
export const issueWords = (message: string) => ISSUE_WORDS[message] ?? message;
/** A refused value's reason: the owner's own words for that field (in this language, else another), else the general ones (to be said). */
export function issueSay(issue: { message: string; say?: Local }, lang: Lang): { own: string } | { general: string } {
  const own = issue.say?.[lang] || issue.say?.ar || issue.say?.en || issue.say?.he;
  return own ? { own } : { general: issueWords(issue.message) };
}
/** The value a reason is about, to say after it (" «zz»"), when the server named one. */
export const issueAbout = (issue: { value?: string }) => (issue.value ? ` «${issue.value}»` : "");

/**
 * Why rows couldn't be deleted: other rows link them through a relation that forbids it. One
 * sentence per holder ("عربي|English|עברית").
 */
export function blockersText(blockers: Blocker[], lang: Lang): string {
  const each = blockers.map((b) => {
    const table = local(b.name ?? undefined, lang) || b.slug;
    const n = b.rows.toLocaleString("en");
    const field = local(b.fieldName ?? undefined, lang) || b.field;
    return `${n} سطر بجدول «${table}» مربوطين فيهم (حقل ${field}، متل ${b.sample}) ومانعين حذفهم.|${n} rows of “${table}” link them (field ${field}, like ${b.sample}) and don't let them be deleted.|${n} שורות בטבלה ״${table}״ מקשרות אותן (שדה ${field}, למשל ${b.sample}) ואינן מאפשרות למחוק.`;
  });
  const tail = "فك الربط من هالسطور أول، أو غيّر «عند الحذف» بقواعد الحقل.|Unlink them from those rows first, or change “when deleted” in the field's rules.|בטל קודם את הקישור מהשורות האלה, או שנה את ״בעת מחיקה״ בכללי השדה.";
  return [0, 1, 2].map((i) => [...each, tail].map((p) => p.split("|")[i]).join(" ")).join("|");
}

/* ---------------- A CSV file's columns and the table's ---------------- */

/** Where a file's column goes: nowhere, the row's address or status, or a field (a text field: in one language). */
export type Target = "" | "slug" | "status" | string;

export function targetsOf(fields: CollectionField[]): Target[] {
  return ["slug", "status", ...fields.flatMap((f) => (WORDS.includes(f.type) ? LANGS.map((l) => `${f.id}.${l}`) : [f.id]))];
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, "");
/** The table's column a file's heading means: its own export's names, a field's id, or its name in any language. */
export function guessTarget(heading: string, fields: CollectionField[], lang: Lang): Target {
  const h = heading.trim();
  const key = norm(h);
  if (!key) return "";
  if (key === "slug" || key === "address" || key === norm("العنوان بالرابط")) return "slug";
  if (key === "status" || key === norm("الحالة")) return "status";
  const targets = targetsOf(fields);
  const exact = targets.find((t) => norm(t) === key);
  if (exact) return exact;
  // A field's name in some language first (its words are then in that language), then its bare id.
  for (const f of fields) for (const l of LANGS) if (f.name?.[l] && norm(f.name[l]!) === key) return WORDS.includes(f.type) ? `${f.id}.${l}` : f.id;
  for (const f of fields) if (norm(f.id) === key) return WORDS.includes(f.type) ? `${f.id}.${lang}` : f.id;
  return "";
}

/** The file's lines as rows to send: each cell under its target; empty cells and unmatched columns left out. */
export function rowsFromCsv(lines: string[][], targets: Target[]): RowIn[] {
  return lines.map((cells) => {
    const row: RowIn = { values: {} };
    targets.forEach((t, i) => {
      const v = (cells[i] ?? "").trim();
      if (!t || !v) return;
      if (t === "slug") row.slug = v;
      else if (t === "status") row.status = v;
      else row.values[t] = cells[i];
    });
    return row;
  });
}

/** A target can only be used once (two columns can't fill one cell). */
export function doubledTargets(targets: Target[]): Target[] {
  const seen = new Set<Target>();
  const twice = new Set<Target>();
  for (const t of targets) {
    if (!t) continue;
    if (seen.has(t)) twice.add(t);
    seen.add(t);
  }
  return [...twice];
}

export function targetName(t: Target, fields: CollectionField[], lang: Lang): string {
  if (t === "slug") return SYSTEM_NAME.$slug;
  if (t === "status") return SYSTEM_NAME.$status;
  const [id, l] = t.split(".");
  const f = fields.find((x) => x.id === id);
  const name = local(f?.name, lang) || id;
  return l ? `${name} (${LANG_NAME[l as Lang] ?? l})` : name;
}

/** What a written cell sends: the row's address or status, or its field's value (words keep their other languages). */
export function cellPatch(column: Column, row: Pick<GridRow, "data">, lang: Lang, draft: string): { slug?: string; status?: ItemStatus; values?: Record<string, unknown> } {
  if (column.id === "$slug") return { slug: draft.trim() };
  if (column.id === "$status") return { status: draft as ItemStatus };
  if (column.kind === "text" || column.kind === "longText") return { values: { [column.id]: withWords(row.data?.[column.id], lang, draft) } };
  // Each kind turns its box's words its own way (./kinds.ts); what it can't turn goes as written, for the server to say.
  return { values: { [column.id]: column.field ? valueFrom(column.field, draft) : draft.trim() === "" ? null : draft.trim() } };
}

/** Which columns a cell can be written in: not the server's own dates, and not JSON (it needs room: the row's window). */
export const editable = (column: Column) => column.kind !== "$date" && column.kind !== "json";

/**
 * The export's lines (as the server's CSV gives them) as a sheet's cells: numbers as numbers and
 * yes/no as yes/no, by each column's field; the quote that guards a formula in CSV comes off
 * (a sheet's words are never worked out).
 */
export function sheetCells(lines: string[][], fields: Array<Pick<CollectionField, "id" | "type">>): Array<Array<string | number | boolean | null>> {
  if (!lines.length) return [];
  const [head, ...rest] = lines;
  const kinds = head.map((h) => fields.find((f) => f.id === h.split(".")[0])?.type);
  return [
    head,
    ...rest.map((cells) =>
      head.map((_, i) => {
        const v = cells[i] ?? "";
        if (v === "") return null;
        if (kinds[i] === "number" || kinds[i] === "money") return Number.isFinite(Number(v)) ? Number(v) : v;
        if (kinds[i] === "boolean") return v === "true" ? true : v === "false" ? false : v;
        return /^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v;
      }),
    ),
  ];
}
