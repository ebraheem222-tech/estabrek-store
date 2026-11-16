/**
 * A collection list read in the visitor's browser (the backend's lib/collectionTree.ts LIST_FEEDS; the shop's
 * pageTree/rowsSpec.ts): whose rows it shows, the few questions it may ask of the table's fields, and what in the
 * table's API settings would leave it empty. Pure (tested): the panel is CollectionsStudio.tsx.
 */
import type { CollectionField, FieldType } from "../api/collections.api";
import type { ApiTable } from "../api/dataApi.api";

export const LIST_FEEDS = ["live", "mine", "added", "tome"] as const;
export type ListFeed = (typeof LIST_FEEDS)[number];
export const LIST_OPS = ["is", "isNot", "contains", "gt", "gte", "lt", "lte", "empty", "notEmpty", "isTrue", "isFalse"] as const;
export type ListOp = (typeof LIST_OPS)[number];
export const LIST_LIMITS = { filters: 4, value: 80 } as const;
export type ListFilter = { field: string; op: ListOp; value?: string };

/** "" = the list as it always was: the published items, drawn with the page. */
export const FEED_NAME: Record<"" | ListFeed, string> = {
  "": "العناصر المنشورة، لكل الزوار|The published items, for every visitor|הפריטים שפורסמו, לכל המבקרים",
  live: "اللي الجدول بيسمح للزائر يقرأه|What the table lets the visitor read|מה שהטבלה מרשה למבקר לקרוא",
  mine: "سطور الزبون: اللي ضافها واللي انبعتتله|The shopper's rows: added by them or sent to them|השורות של הלקוח: שהוסיף או שנשלחו אליו",
  added: "السطور اللي الزبون ضافها|The rows the shopper added|השורות שהלקוח הוסיף",
  tome: "السطور اللي انبعتت للزبون|The rows sent to the shopper|השורות שנשלחו ללקוח",
};

/** What such a list may ask of each kind of field (each a question the table's API takes for that kind); the other kinds can't be asked about. */
const WORDS: ListOp[] = ["is", "isNot", "contains", "empty", "notEmpty"];
const NUMBERS: ListOp[] = ["is", "isNot", "gt", "gte", "lt", "lte", "empty", "notEmpty"];
const DATES: ListOp[] = ["is", "gt", "gte", "lt", "lte", "empty", "notEmpty"];
const THERE: ListOp[] = ["empty", "notEmpty"];
export const OPS_FOR: Partial<Record<FieldType, ListOp[]>> = {
  text: WORDS, longText: ["contains", "empty", "notEmpty"], email: WORDS, phone: ["is", "contains", "empty", "notEmpty"], link: ["contains", "empty", "notEmpty"],
  number: NUMBERS, money: NUMBERS, date: DATES, datetime: DATES, boolean: ["isTrue", "isFalse"], select: ["is", "isNot", "empty", "notEmpty"],
  image: THERE, file: ["contains", "empty", "notEmpty"], video: THERE,
};
const NO_VALUE = new Set<ListOp>(["empty", "notEmpty", "isTrue", "isFalse"]);
export const needsValue = (op: ListOp) => !NO_VALUE.has(op);

/** Whose rows the list shows ("" = the published items, with the page). */
export const feedOf = (props: Record<string, unknown>): "" | ListFeed => ((LIST_FEEDS as readonly unknown[]).includes(props.feed) ? (props.feed as ListFeed) : "");

/** The list's filters as kept (anything that isn't one is left out). */
export function filtersOf(props: Record<string, unknown>): ListFilter[] {
  const out: ListFilter[] = [];
  for (const x of Array.isArray(props.where) ? props.where : []) {
    const f = x as { field?: unknown; op?: unknown; value?: unknown } | null;
    if (out.length >= LIST_LIMITS.filters || !f || typeof f.field !== "string" || !(LIST_OPS as readonly unknown[]).includes(f.op)) continue;
    out.push({ field: f.field, op: f.op as ListOp, ...(typeof f.value === "string" && f.value ? { value: f.value.slice(0, LIST_LIMITS.value) } : {}) });
  }
  return out;
}

/** The fields a list may ask about: of a kind with questions, and not one only a key sees (`hidden`). */
export const askFields = (fields: CollectionField[], hidden: string[] = []): CollectionField[] => fields.filter((f) => !!OPS_FOR[f.type]?.length && !hidden.includes(f.id));

/** A first filter on a field: its first question, and its first choice where it is a choice. */
export function newFilter(field: CollectionField): ListFilter {
  const op = OPS_FOR[field.type]?.[0] ?? "notEmpty";
  const first = field.type === "select" ? field.options?.[0]?.id : undefined;
  return { field: field.id, op, ...(needsValue(op) && first ? { value: first } : {}) };
}

/** A filter moved to another field or question: what no longer fits is put right (the question, a choice's value). */
export function fitFilter(f: ListFilter, field: CollectionField | undefined): ListFilter {
  const ops = (field && OPS_FOR[field.type]) || [];
  const op = ops.includes(f.op) ? f.op : ops[0] ?? "notEmpty";
  if (!needsValue(op)) return { field: f.field, op };
  const choices = field?.type === "select" ? (field.options ?? []).map((o) => o.id) : null;
  const value = choices ? (f.value && choices.includes(f.value) ? f.value : choices[0]) : f.value;
  return { field: f.field, op, ...(value ? { value } : {}) };
}

/**
 * What would keep the list from showing rows in the shop, from the table's API settings (admin → الـ API
 * والمفاتيح): a warning, or something worth knowing; null when nothing stands in its way.
 */
export function listTrouble(feed: ListFeed, fields: CollectionField[], table: ApiTable | undefined, accounts: boolean): { level: "warn" | "note"; text: string } | null {
  const read = table?.access.read ?? "off";
  if (read === "off" || read === "key")
    return { level: "warn", text: "القراءة من هالجدول مش مفتوحة للمتجر، فالقائمة بتطلع فاضية. افتحها «للزبون» أو «للكل» من «الـ API والمفاتيح».|Reading this table isn't open to the shop, so the list will be empty. Open it “to the shopper” or “to everyone” in “API & keys”.|הקריאה מהטבלה הזו לא פתוחה לחנות, ולכן הרשימה תהיה ריקה. פתחו אותה ״ללקוח״ או ״לכולם״ ב״API ומפתחות״." };
  if ((feed !== "live" || read === "customer") && !accounts)
    return { level: "warn", text: "حسابات الزباين مطفية، فما حدا بيقدر يسجّل دخول ليشوف سطوره. شغّلها من الإعدادات.|Shopper accounts are switched off, so nobody can sign in to see their rows. Switch them on in the settings.|חשבונות הלקוחות כבויים, ולכן אף אחד לא יכול להתחבר ולראות את השורות שלו. הפעילו אותם בהגדרות." };
  if (feed === "tome" && !fields.some((f) => f.type === "customer"))
    return { level: "warn", text: "هالجدول ما فيه حقل «زبون»، فما في سطر بيأشّر على حدا. ضيف حقل من نوع «زبون (بإيميله)».|This table has no “customer” field, so no row points at anyone. Add a field of kind “A customer (by email)”.|בטבלה הזו אין שדה ״לקוח״, ולכן אף שורה לא מצביעה על מישהו. הוסיפו שדה מסוג ״לקוח (לפי אימייל)״." };
  if (feed === "live" && read === "customer")
    return { level: "note", text: "هالجدول مفتوح للزبون بس: الزبون بيشوف سطوره، واللي مش مسجّل دخول بينطلب منه يسجّل.|This table is open to the shopper only: a shopper sees their own rows, and a visitor who isn't signed in is asked to sign in.|הטבלה הזו פתוחה ללקוח בלבד: לקוח רואה את השורות שלו, ומבקר שלא התחבר מתבקש להתחבר." };
  return null;
}
