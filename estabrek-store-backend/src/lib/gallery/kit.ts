/**
 * The gallery's kit (stage 4, admin → ميزاتي → المعرض): what the ready examples are written with. Each
 * example is a template file (lib/featureTemplate.ts) like one a store exports, so it is shown and
 * installed as any file is: as a draft, the owner's to change. Three kinds:
 *
 *   function  one piece of logic and what starts it (an order, a row, a schedule, a shop button, a webhook),
 *             with the table it keeps its data in when it needs one
 *   api       an address of the store's own under /v1/api for an app or another system, with its table
 *   feature   a whole feature: tables, logic and the shop's pages
 *
 * Words are written once in the three languages (`L`); a step's own words (a message, a reason) are
 * Arabic, the store's main language, and the owner edits them. Everything here is plain data: the
 * gallery's own test (templateGallery.unit.spec.ts) reads every example as a store would and runs
 * the tests the examples carry.
 */
import type { Local, Template } from "../featureTemplate.js";
import { needsOf, TEMPLATE_FORMAT, TEMPLATE_FORMAT_VERSION } from "../featureTemplate.js";

export const L = (ar: string, en: string, he: string): Local => ({ ar, en, he });

export const GALLERY_KINDS = ["function", "api", "feature"] as const;
export type GalleryKind = (typeof GALLERY_KINDS)[number];

/** What an example is about, for the gallery's filters. */
export const CATEGORIES = {
  orders: L("الطلبات", "Orders", "הזמנות"),
  customers: L("الزباين", "Customers", "לקוחות"),
  forms: L("فورمات وطلبات", "Forms and requests", "טפסים ובקשות"),
  marketing: L("تسويق", "Marketing", "שיווק"),
  community: L("مجتمع وتفاعل", "Community", "קהילה"),
  bookings: L("حجوزات ومواعيد", "Bookings", "הזמנות מקום ותורים"),
  support: L("دعم وخدمة", "Support", "תמיכה"),
  content: L("محتوى", "Content", "תוכן"),
  operations: L("تشغيل وإدارة", "Operations", "תפעול"),
  finance: L("حسابات وفلوس", "Money", "כספים"),
  reports: L("تقارير وتنبيهات", "Reports and alerts", "דוחות והתראות"),
  integrations: L("ربط مع أنظمة", "Integrations", "חיבורים"),
  utilities: L("حسابات جاهزة (كود)", "Ready calculations (code)", "חישובים מוכנים (קוד)"),
} as const;
export type Category = keyof typeof CATEGORIES;

export type GalleryEntry = { kind: GalleryKind; category: Category; template: Template };

/* ---------------- Tables ---------------- */

type Field = Record<string, unknown> & { id: string; type: string };
const field = (type: string) => (id: string, name: Local, more: Record<string, unknown> = {}): Field => ({ id, type, name, ...more });
/** A table's fields by kind: `f.text("subject", L(...), { required: true })`. */
export const f = {
  text: field("text"),
  long: field("longText"),
  email: field("email"),
  phone: field("phone"),
  number: field("number"),
  money: (id: string, name: Local, more: Record<string, unknown> = {}): Field => ({ id, type: "money", name, currency: "ILS", ...more }),
  date: field("date"),
  datetime: field("datetime"),
  bool: field("boolean"),
  link: field("link"),
  image: field("image"),
  customer: field("customer"),
  json: field("json"),
  select: (id: string, name: Local, options: Array<[string, Local]>, more: Record<string, unknown> = {}): Field => ({ id, type: "select", name, options: options.map(([oid, oname]) => ({ id: oid, name: oname })), ...more }),
  /** A link to rows of another of the template's tables (its key), or of the store's ("store:products"). */
  rel: (id: string, name: Local, to: string, more: Record<string, unknown> = {}): Field => ({ id, type: "relation", name, to: to.startsWith("store:") ? to : `@table:${to}`, ...more }),
};

/** Who reaches a table through the store's API. */
type Who = "off" | "key" | "customer" | "public";
export const access = (read: Who, create: Who, update: Exclude<Who, "public"> = "off", del: Exclude<Who, "public"> = "off", priv: string[] = []) => ({ read, create, update, delete: del, private: priv });
export const CLOSED = access("off", "off");

export type TableIn = { key: string; slug: string; name: Local; fields: Field[]; api?: ReturnType<typeof access> };
export const table = (key: string, slug: string, name: Local, fields: Field[], api?: ReturnType<typeof access>): TableIn => ({ key, slug, name, fields, ...(api ? { api } : {}) });
/** A template table's reference, where a step or a list names it. */
export const t = (key: string) => `@table:${key}`;

/* ---------------- Steps ---------------- */

type Val = unknown;
type Step = Record<string, unknown> & { act: string };
type Filter = { field: string; op: string; value?: Val; value2?: Val };
export const where = (field: string, op: string, value?: Val, value2?: Val): Filter => ({ field, op, ...(value !== undefined ? { value } : {}), ...(value2 !== undefined ? { value2 } : {}) });
export const cond = (left: Val, cmp: string, right?: Val) => ({ left, cmp, ...(right !== undefined ? { right } : {}) });

export const s = {
  find: (table: string, as: string, filters: Filter[] = [], more: { sort?: Array<{ field: string; dir?: "asc" | "desc" }>; limit?: number; match?: "all" | "any"; view?: string } = {}): Step => ({ act: "find", table: t(table), ...(filters.length ? { filters } : {}), ...more, as }),
  get: (table: string, row: Val, as: string): Step => ({ act: "get", table: t(table), row, as }),
  add: (table: string, values: Record<string, Val>, more: { as?: string; owner?: Val; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" } = {}): Step => ({ act: "add", table: t(table), values, ...more }),
  change: (table: string, row: Val, values: Record<string, Val>, more: { as?: string; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" } = {}): Step => ({ act: "change", table: t(table), row, values, ...more }),
  del: (table: string, row: Val): Step => ({ act: "delete", table: t(table), row }),
  set: (name: string, value: Val, op?: "set" | "add" | "multiply" | "append"): Step => ({ act: "set", name, value, ...(op ? { op } : {}) }),
  email: (subject: string, text: string, to?: string): Step => ({ act: "email", ...(to ? { to } : {}), subject, text }),
  whatsapp: (text: string, to?: string): Step => ({ act: "whatsapp", ...(to ? { to } : {}), text }),
  sms: (text: string, to?: string): Step => ({ act: "sms", ...(to ? { to } : {}), text }),
  bell: (title: string, text?: string, link?: string): Step => ({ act: "notify", title, ...(text ? { text } : {}), ...(link ? { link } : {}) }),
  code: (code: string, give: Record<string, Val> = {}, as?: string): Step => ({ act: "code", code, ...(Object.keys(give).length ? { give } : {}), ...(as ? { as } : {}) }),
  http: (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, more: { headers?: Record<string, string>; body?: Val; anyStatus?: boolean; as?: string } = {}): Step => ({ act: "http", method, url, ...more }),
  /** A ready connection's step: the store picks its own connection after installing. */
  ready: (what: string, give: Record<string, string>, as?: string): Step => ({ act: "ready", via: "", what, give, ...(as ? { as } : {}) }),
  call: (fn: string, input: Record<string, Val> = {}, as?: string): Step => ({ act: "call", fn: `@fn:${fn}`, ...(Object.keys(input).length ? { input } : {}), ...(as ? { as } : {}) }),
  /** The store itself (lib/fnStore.ts): a coupon, a piece's quantity, a customer's role or group. */
  coupon: (off: "percent" | "amount", value: Val, more: { code?: string; max?: Val; minCart?: Val; uses?: Val; days?: Val; phone?: string; note?: string; as?: string } = {}): Step => ({ act: "coupon", off, value, ...more }),
  stock: (sku: string, how: "add" | "take" | "set", amount: Val, more: { reason?: string; as?: string } = {}): Step => ({ act: "stock", sku, how, amount, ...more }),
  customer: (who: string, mark: "read" | "giveRole" | "takeRole" | "join" | "leave", what?: string, as?: string): Step => ({ act: "customer", who, mark, ...(what !== undefined ? { what } : {}), ...(as ? { as } : {}) }),
  /** A payment asked for (lib/payLinks.ts): its link is kept under `as` ({{payment.link}}); paid, "payment.paid" starts functions with its ref. */
  pay: (title: string, amount: Val, more: { ref?: string; email?: string; phone?: string; days?: Val; back?: string; as?: string } = {}): Step => ({ act: "pay", title, amount, ...more }),
  when: (conds: ReturnType<typeof cond>[], then: Step[], otherwise?: Step[], match?: "all" | "any"): Step => ({ act: "if", if: conds, ...(match ? { match } : {}), do: then, ...(otherwise ? { else: otherwise } : {}) }),
  each: (list: string, as: string, steps: Step[]): Step => ({ act: "each", list, as, do: steps }),
  stop: (message: string): Step => ({ act: "stop", message }),
  ret: (value?: Val): Step => ({ act: "return", ...(value !== undefined ? { value } : {}) }),
};

/* ---------------- Inputs and triggers ---------------- */

type InputIn = { name: string; type: "text" | "number" | "bool" | "list" | "any"; required?: boolean; note?: string; min?: number; max?: number; choices?: string[]; format?: "email" | "phone" | "url" | "date" };
export const i = {
  text: (name: string, more: Omit<InputIn, "name" | "type"> = {}): InputIn => ({ name, type: "text", ...more }),
  num: (name: string, more: Omit<InputIn, "name" | "type"> = {}): InputIn => ({ name, type: "number", ...more }),
  bool: (name: string, more: Omit<InputIn, "name" | "type"> = {}): InputIn => ({ name, type: "bool", ...more }),
  list: (name: string, more: Omit<InputIn, "name" | "type"> = {}): InputIn => ({ name, type: "list", ...more }),
  any: (name: string, more: Omit<InputIn, "name" | "type"> = {}): InputIn => ({ name, type: "any", ...more }),
  email: (name = "email", more: Omit<InputIn, "name" | "type"> = {}): InputIn => ({ name, type: "text", format: "email", max: 200, ...more }),
  phone: (name = "phone", more: Omit<InputIn, "name" | "type"> = {}): InputIn => ({ name, type: "text", format: "phone", ...more }),
};
/** What a new order hands a function (the store's event "order.created"). */
export const ORDER_INPUTS: InputIn[] = [i.text("orderId"), i.text("customerName"), i.text("phone"), i.num("total"), i.text("currency"), i.num("items"), i.text("city")];
/** What a row event hands a function: the row now, and before a change. */
export const ROW_INPUTS: InputIn[] = [i.any("row"), i.any("before")];
/** What a webhook hands a function. */
export const HOOK_INPUTS: InputIn[] = [i.any("body"), i.any("query")];
/** What a schedule hands a function: its moment. */
export const SCHEDULE_INPUTS: InputIn[] = [i.text("at")];

type TriggerIn = { kind: string; config: Record<string, unknown>; slug?: string };
export const on = {
  order: (): TriggerIn => ({ kind: "event", config: { event: "order.created" } }),
  event: (event: "order.created" | "payment.paid" | "video.ready" | "job.failing" | "deploy.failed"): TriggerIn => ({ kind: "event", config: { event } }),
  row: (table: string, events: Array<"added" | "changed" | "deleted"> = ["added"]): TriggerIn => ({ kind: "row", config: { table: t(table), on: events } }),
  daily: (at: string): TriggerIn => ({ kind: "schedule", config: { at } }),
  every: (minutes: number): TriggerIn => ({ kind: "schedule", config: { everyMinutes: minutes } }),
  /** A shop's button or form (a call address), for a signed-in shopper, anyone, or a key. */
  call: (slug: string, who: "customer" | "public" | "key" = "customer", perMinute?: number): TriggerIn => ({ kind: "call", slug, config: { who, ...(perMinute ? { perMinute } : {}) } }),
  webhook: (): TriggerIn => ({ kind: "webhook", config: {} }),
  /** An address of the store's own: /v1/api/<path>. */
  route: (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, who: "customer" | "public" | "key" = "public", more: { perMinute?: number; status?: 200 | 201 | 202 | 204 } = {}): TriggerIn => ({ kind: "route", config: { method, path, who, ...more } }),
};

/* ---------------- Functions, and the files ---------------- */

type TestIn = { id: string; name: string; input: Record<string, unknown>; expect: { ok: boolean; value?: unknown; error?: string } };
export type FnIn = { key: string; name: string; note?: string; inputs?: InputIn[]; do: Step[]; else?: Step[]; fail?: Step[]; on?: TriggerIn | TriggerIn[]; tests?: TestIn[] };
const fnOut = (fn: FnIn) => ({
  key: fn.key,
  name: fn.name,
  ...(fn.note ? { note: fn.note } : {}),
  def: { lang: "ar", inputs: fn.inputs ?? [], do: fn.do, ...(fn.else ? { else: fn.else } : {}), ...(fn.fail ? { fail: fn.fail } : {}) },
  ...(fn.tests?.length ? { tests: fn.tests } : {}),
  ...(fn.on ? { triggers: (Array.isArray(fn.on) ? fn.on : [fn.on]).map((tr) => ({ kind: tr.kind, config: tr.config, ...(tr.slug ? { slug: tr.slug } : {}) })) } : {}),
});

export type PageIn = { key: string; name: string; slug: string; tree: unknown };
type EntryIn = { key: string; category: Category; name: Local; note: Local; tables?: TableIn[]; fns: FnIn[]; pages?: PageIn[] };
const file = (e: EntryIn): Template => {
  const functions = e.fns.map(fnOut);
  const needs = needsOf(functions.map((x) => x.def));
  return {
    format: TEMPLATE_FORMAT,
    formatVersion: TEMPLATE_FORMAT_VERSION,
    key: e.key,
    version: "1.0.0",
    name: e.name,
    note: e.note,
    tables: (e.tables ?? []) as Template["tables"],
    functions: functions as Template["functions"],
    pages: (e.pages ?? []) as Template["pages"],
    needs: { secrets: [...needs.secrets], sites: [...needs.sites] },
  };
};
/** One piece of logic (with the tables it keeps its data in). */
export const fnEntry = (e: EntryIn): GalleryEntry => ({ kind: "function", category: e.category, template: file(e) });
/** An address of the store's own (one or a few, with their table). */
export const apiEntry = (e: EntryIn): GalleryEntry => ({ kind: "api", category: e.category, template: file(e) });
/** A whole feature: tables, logic and pages. */
export const featureEntry = (e: EntryIn): GalleryEntry => ({ kind: "feature", category: e.category, template: file(e) });

/* ---------------- Pages ---------------- */

type Node = Record<string, unknown> & { id: string; type: string };
let nodes = 0;
const nid = (p: string) => `${p}-${(nodes++).toString(36)}`;
export const n = {
  heading: (text: Local, level = 1): Node => ({ id: nid("h"), type: "heading", props: { text, level } }),
  text: (text: Local, muted = false): Node => ({ id: nid("t"), type: "text", props: { text }, ...(muted ? { style: { base: { color: "muted" } } } : {}) }),
  /** A form: its fields, sent to a function's call address or added as a row of a table (by its address). */
  form: (fields: Array<Record<string, unknown>>, send: { fn: string } | { table: string }, button: Local, done?: Local, title?: Local): Node => ({
    id: nid("form"),
    type: "form",
    props: { kind: "custom", ...(title ? { title } : {}), fields, send: "fn" in send ? { to: "fn", fn: send.fn } : { to: "table", table: send.table }, button, ...(done ? { done } : {}) },
  }),
  /** A list of a table's rows read as the visitor (`feed`), its card repeated for each row. */
  list: (tableKey: string, feed: "mine" | "added" | "tome" | "live" | null, card: Node[], more: { empty?: Local; signin?: Local; limit?: number; columns?: number } = {}): Node => ({
    id: nid("list"),
    type: "collectionList",
    props: { collectionId: t(tableKey), ...(feed ? { feed } : {}), limit: more.limit ?? 24, columns: more.columns ?? 1, ...(more.empty ? { empty: more.empty } : {}), ...(more.signin ? { signin: more.signin } : {}) },
    children: [{ id: nid("card"), type: "stack", props: {}, style: { base: { gap: 6, pad: [16, 16, 16, 16], radius: 14, border: { width: 1, color: "border" } } }, children: card }],
  }),
  /** A button that runs a function by its call address, handed values (`{{row_id}}` in a list's card). */
  run: (label: Local, fn: string, input: Record<string, string> = {}): Node => ({ id: nid("btn"), type: "button", props: { label, href: "#", variant: "outline", triggers: [{ on: "click", who: "customer", deny: "signin", do: [{ act: "fn", fn, ...(Object.keys(input).length ? { input } : {}) }] }] } }),
  link: (label: Local, href: string): Node => ({ id: nid("btn"), type: "button", props: { label, href, variant: "link" } }),
};
/** A form's field. */
export const ff = (name: string, kind: "text" | "long" | "email" | "phone" | "number" | "select" | "check" | "date", label: Local, more: Record<string, unknown> = {}) => ({ name, kind, label, ...more });
/** A page of one section: a heading, a line under it, and what it holds. */
export function page(key: string, name: string, slug: string, title: Local, intro: Local, children: Node[]): PageIn {
  return {
    key,
    name,
    slug,
    tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: nid("sec"), type: "section", props: { contained: true }, style: { base: { pad: [48, 24, 64, 24], gap: 20, maxWidth: "860px" } }, children: [n.heading(title), n.text(intro, true), ...children] }] } },
  };
}
