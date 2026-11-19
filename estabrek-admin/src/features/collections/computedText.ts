/**
 * Computed fields in the fields editor (pure, tested): a formula (an equation over the row's other fields, backend
 * lib/formula.ts) and a rollup (worked out from the rows a relation links, backend lib/computed.ts). What each may
 * read, the functions an equation can call (with what each does, in the three languages), and the ways a rollup
 * can reach rows. Words are written "عربي|English|עברית".
 */
import type { Collection, CollectionField, ComputedResult, FieldType, Local, RollupCalc } from "../../api/collections.api";

type Lang = "ar" | "en" | "he";
const local = (v: Local | undefined, lang: Lang) => v?.[lang] || v?.ar || v?.en || v?.he || "";

/** Worked out each time a row is read; never written. */
export const isComputedField = (f: Pick<CollectionField, "type">) => f.type === "formula" || f.type === "rollup";
/** The kind of value a field holds as it's read (a computed field's: what it gives). */
export const valueKindOf = (f: Pick<CollectionField, "type" | "result">): FieldType => (isComputedField(f) ? (f.result ?? "number") : f.type);

/** The kinds an equation can read (the rest: a relation's rows, a customer, JSON, a place, a 3D model). */
const READABLE = new Set<FieldType>(["text", "longText", "richText", "email", "phone", "link", "color", "image", "file", "video", "number", "money", "date", "datetime", "boolean", "select", "multiSelect", "formula", "rollup"]);
/** The fields an equation may read, to put in with a click (not the formula's own). */
export const formulaReadable = (fields: CollectionField[], self?: string) => fields.filter((f) => f.id !== self && READABLE.has(f.type));
/** A field as written in an equation: its id, or in braces when the id is one of the language's own words. */
export const fieldRef = (id: string) => (/^(and|or|not|true|false)$/i.test(id) ? `{${id}}` : id);

export const RESULT_NAME: Record<ComputedResult, string> = {
  number: "رقم|A number|מספר",
  money: "مبلغ (عملة)|Money|סכום (מטבע)",
  text: "كلام|Words|מילים",
  boolean: "نعم/لا|Yes/no|כן/לא",
  date: "تاريخ|A date|תאריך",
  datetime: "تاريخ ووقت|A date and time|תאריך ושעה",
};
/** What an owner may ask a formula to give (anything shows as words; a number may be money). */
export const FORMULA_RESULTS: ComputedResult[] = ["number", "money", "text", "boolean", "date"];

export const CALC_NAME: Record<RollupCalc, string> = {
  count: "عدد السطور|How many rows|כמה שורות",
  sum: "المجموع|The sum|הסכום",
  avg: "المعدّل|The average|הממוצע",
  min: "الأصغر (أو الأقدم)|The smallest (or earliest)|הקטן ביותר (או המוקדם)",
  max: "الأكبر (أو الأحدث)|The biggest (or latest)|הגדול ביותר (או המאוחר)",
};
export const CALCS: RollupCalc[] = ["count", "sum", "avg", "min", "max"];
/** The linked rows' fields each calculation works on (kept values only: never another computed field). */
const CALC_OF: Record<Exclude<RollupCalc, "count">, FieldType[]> = { sum: ["number", "money"], avg: ["number", "money"], min: ["number", "money", "date", "datetime"], max: ["number", "money", "date", "datetime"] };
export const calcFits = (calc: RollupCalc, f: Pick<CollectionField, "type">) => calc === "count" || CALC_OF[calc].includes(f.type);

/** The functions an equation can call, grouped, each with what it does and an example to put in. */
export type FormulaFn = { name: string; insert: string; say: string; example: string };
export const FORMULA_GROUPS: Array<{ say: string; fns: FormulaFn[] }> = [
  {
    say: "أسئلة|Questions|שאלות",
    fns: [
      { name: "if", insert: "if(, , )", say: "إذا صح الشرط بتعطي الأولى، وإلا التانية|The first when it holds, else the second|הראשון אם התנאי מתקיים, אחרת השני", example: 'if(stock = 0, "نفد", "متوفر")' },
      { name: "and", insert: "and(, )", say: "صح إذا كلهم صح (أو اكتب and بين شرطين)|Yes when all hold (or write and between two)|כן אם כולם מתקיימים", example: "paid and qty > 1" },
      { name: "or", insert: "or(, )", say: "صح إذا واحد منهم صح|Yes when any holds|כן אם אחד מתקיים", example: "or(vip, total > 500)" },
      { name: "not", insert: "not()", say: "عكس الشرط|The opposite|ההפך", example: "not(paid)" },
      { name: "empty", insert: "empty()", say: "صح إذا الحقل فاضي|Yes when the field is empty|כן אם השדה ריק", example: "empty(phone)" },
      { name: "first", insert: "first(, )", say: "أول قيمة مش فاضية|The first value that isn't empty|הערך הראשון שאינו ריק", example: "first(nickname, name)" },
    ],
  },
  {
    say: "أرقام|Numbers|מספרים",
    fns: [
      { name: "round", insert: "round(, 2)", say: "تقريب لعدد خانات|Rounded to some digits|עיגול למספר ספרות", example: "round(price * 1.17, 2)" },
      { name: "floor", insert: "floor()", say: "لتحت|Down|כלפי מטה", example: "floor(rating)" },
      { name: "ceil", insert: "ceil()", say: "لفوق|Up|כלפי מעלה", example: "ceil(weight)" },
      { name: "abs", insert: "abs()", say: "بلا إشارة ناقص|Without its minus|ללא מינוס", example: "abs(diff)" },
      { name: "min", insert: "min(, )", say: "الأصغر (أو الأقدم)|The smallest (or earliest)|הקטן ביותר", example: "min(price, 100)" },
      { name: "max", insert: "max(, )", say: "الأكبر (أو الأحدث)|The biggest (or latest)|הגדול ביותר", example: "max(0, stock - held)" },
      { name: "sum", insert: "sum(, )", say: "المجموع|Added up|סכום", example: "sum(a, b, c)" },
      { name: "avg", insert: "avg(, )", say: "المعدّل|The average|ממוצע", example: "avg(q1, q2, q3)" },
      { name: "power", insert: "power(, 2)", say: "أُس|To a power|חזקה", example: "power(side, 2)" },
      { name: "sqrt", insert: "sqrt()", say: "الجذر|Square root|שורש", example: "sqrt(area)" },
      { name: "number", insert: "number()", say: "كلام لرقم|Words as a number|מילים כמספר", example: 'number("12.5")' },
    ],
  },
  {
    say: "كلام|Words|מילים",
    fns: [
      { name: "&", insert: ' & " " & ', say: "بيربط كلام ببعض|Joins words|מחבר מילים", example: 'first & " " & last' },
      { name: "len", insert: "len()", say: "عدد الحروف (أو الاختيارات)|How many letters (or choices)|כמה אותיות", example: "len(code)" },
      { name: "upper", insert: "upper()", say: "حروف كبيرة|Capital letters|אותיות גדולות", example: "upper(code)" },
      { name: "lower", insert: "lower()", say: "حروف صغيرة|Small letters|אותיות קטנות", example: "lower(email)" },
      { name: "trim", insert: "trim()", say: "بلا فراغات زايدة|Without extra spaces|ללא רווחים מיותרים", example: "trim(name)" },
      { name: "left", insert: "left(, 3)", say: "أول كم حرف|The first letters|האותיות הראשונות", example: "left(name, 1)" },
      { name: "right", insert: "right(, 4)", say: "آخر كم حرف|The last letters|האותיות האחרונות", example: "right(phone, 4)" },
      { name: "contains", insert: 'contains(, "")', say: "صح إذا فيه هالكلام (أو هالاختيار)|Yes when it holds these words (or this choice)|כן אם מופיעות בו המילים", example: 'contains(tags, "تخفيض")' },
      { name: "replace", insert: 'replace(, "", "")', say: "بدّل كلام بكلام|Words swapped for others|החלפת מילים", example: 'replace(code, "-", "")' },
      { name: "text", insert: "text()", say: "أي قيمة ككلام|Any value as words|כל ערך כמילים", example: '"#" & text(number)' },
    ],
  },
  {
    say: "تواريخ|Dates|תאריכים",
    fns: [
      { name: "today", insert: "today()", say: "اليوم (بتوقيت المتجر)|Today (the store's day)|היום (לפי החנות)", example: "today()" },
      { name: "days", insert: "days(, )", say: "كم يوم من الأول للتاني|Days from the first to the second|ימים מהראשון לשני", example: "days(today(), due)" },
      { name: "adddays", insert: "addDays(, 7)", say: "تاريخ بعد كم يوم|A date some days on|תאריך כעבור ימים", example: "addDays(ordered, 14)" },
      { name: "year", insert: "year()", say: "السنة|The year|השנה", example: "year(born)" },
      { name: "month", insert: "month()", say: "الشهر (1–12)|The month (1–12)|החודש (1–12)", example: "month(date)" },
      { name: "day", insert: "day()", say: "اليوم من الشهر|The day of the month|היום בחודש", example: "day(date)" },
      { name: "weekday", insert: "weekday()", say: "يوم الأسبوع (0 الأحد … 6 السبت)|The weekday (0 Sunday … 6 Saturday)|יום בשבוע (0 ראשון … 6 שבת)", example: "weekday(date) = 5" },
    ],
  },
];

/** A way a rollup reaches rows: through one of this table's relations, or from another table's relation that links this one. */
export type RollupWay = { key: string; via: string; from?: string; /** The table whose rows it works out. */ table: string; name: string };
/** The ways a rollup of this table can reach rows (by name, in the admin's language). */
export function rollupWays(self: string, fields: CollectionField[], tables: Array<Pick<Collection, "id" | "name" | "slug" | "fields">>, lang: Lang, storeName: (to: string) => string | null = () => null): RollupWay[] {
  const nameOf = (id: string) => { const t = tables.find((x) => x.id === id); return t ? local(t.name, lang) || t.slug : storeName(id) ?? id; };
  const own = fields.filter((f) => f.type === "relation" && f.to).map((f): RollupWay => ({ key: f.id, via: f.id, table: f.to!, name: `${local(f.name, lang) || f.id} → ${nameOf(f.to!)}` }));
  const back = tables.flatMap((t) => (t.id === self ? fields : t.fields).filter((f) => f.type === "relation" && f.to === self).map((f): RollupWay => ({ key: `${t.id}.${f.id}`, via: f.id, from: t.id, table: t.id, name: `${nameOf(t.id)} · ${local(f.name, lang) || f.id} ←` })));
  return [...own, ...back];
}
export const wayOf = (f: Pick<CollectionField, "via" | "from">) => (f.from ? `${f.from}.${f.via ?? ""}` : f.via ?? "");

/** The linked table's fields a rollup may work out for a calculation (kept values, not computed ones). */
export function rollupOf(way: RollupWay | undefined, tables: Array<Pick<Collection, "id" | "fields">>, calc: RollupCalc): CollectionField[] {
  if (!way || calc === "count") return [];
  return (tables.find((t) => t.id === way.table)?.fields ?? []).filter((f) => !isComputedField(f) && calcFits(calc, f));
}

/** Where in the equation the problem is, as a pointer under it ("price + * 2" at 8 → eight spaces and ^). */
export const pointAt = (at: number | null | undefined) => (typeof at === "number" && at >= 0 && at < 1000 ? `${" ".repeat(at)}^` : "");

/** Formatted words (a rich text field): the marks written around the selection, or at the caret. */
export type RichMark = "bold" | "italic" | "strike" | "code" | "link" | "h" | "list" | "numbered" | "quote";
export const RICH_MARKS: Array<{ mark: RichMark; label: string; say: string }> = [
  { mark: "bold", label: "B", say: "عريض|Bold|מודגש" },
  { mark: "italic", label: "I", say: "مايل|Italic|נטוי" },
  { mark: "strike", label: "S", say: "مشطوب|Struck through|קו חוצה" },
  { mark: "h", label: "H", say: "عنوان|Heading|כותרת" },
  { mark: "list", label: "•", say: "قائمة|List|רשימה" },
  { mark: "numbered", label: "1.", say: "قائمة مرقّمة|Numbered list|רשימה ממוספרת" },
  { mark: "quote", label: "❝", say: "اقتباس|Quote|ציטוט" },
  { mark: "code", label: "</>", say: "كود|Code|קוד" },
  { mark: "link", label: "🔗", say: "رابط|Link|קישור" },
];
const WRAP: Partial<Record<RichMark, [string, string]>> = { bold: ["**", "**"], italic: ["*", "*"], strike: ["~~", "~~"], code: ["`", "`"] };
const LINE: Partial<Record<RichMark, string>> = { h: "## ", list: "- ", quote: "> " };

/** The words with a mark put on the selection [from, to); and where the selection is after. */
export function markWords(words: string, from: number, to: number, mark: RichMark): { words: string; from: number; to: number } {
  const [a, b] = [Math.max(0, Math.min(from, to)), Math.min(words.length, Math.max(from, to))];
  const picked = words.slice(a, b);
  const wrap = WRAP[mark];
  if (wrap) {
    const inner = picked || (mark === "code" ? "code" : "…");
    return { words: `${words.slice(0, a)}${wrap[0]}${inner}${wrap[1]}${words.slice(b)}`, from: a + wrap[0].length, to: a + wrap[0].length + inner.length };
  }
  if (mark === "link") {
    const inner = picked || "…";
    const out = `${words.slice(0, a)}[${inner}](https://)${words.slice(b)}`;
    const at = a + inner.length + 3;
    return { words: out, from: at, to: at + 8 };
  }
  // A mark for whole lines: at the start of each line the selection touches (numbered lines count up).
  const start = words.lastIndexOf("\n", a - 1) + 1;
  const endAt = words.indexOf("\n", b);
  const end = endAt < 0 ? words.length : endAt;
  const lines = words.slice(start, end).split("\n");
  const marked = lines.map((line, k) => `${mark === "numbered" ? `${k + 1}. ` : LINE[mark]}${line.replace(/^(#{1,3}|>|[-*•]|\d{1,3}[.)])\s+/, "")}`).join("\n");
  return { words: `${words.slice(0, start)}${marked}${words.slice(end)}`, from: start, to: start + marked.length };
}
