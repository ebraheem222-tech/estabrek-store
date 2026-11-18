/**
 * How the gallery's features are written: from one short description, a whole feature.
 *
 *   ask      a form on a shop page: its fields go to a function (as the signed-in shopper, or anyone),
 *            which adds a row to the feature's table and tells the shop
 *   mine     under the form, the shopper's own rows (each with its state), read as them
 *   show     or a page listing the table's published rows for everyone (a menu, branches, a blog…)
 *   status   a state the shop changes in the table; each change is told to the shopper
 *
 * More functions and tables are added as each feature needs (`extra`).
 */
import type { Local } from "../featureTemplate.js";
import { L, access, cond, f, featureEntry, ff, i, n, on, page, s, table, type Category, type FnIn, type GalleryEntry, type TableIn } from "./kit.js";

type Kind = "text" | "long" | "email" | "phone" | "number" | "select" | "check" | "date";
export type Ask = { id: string; kind: Kind; label: Local; required?: boolean; options?: Array<[string, Local]>; min?: number; max?: number };
type Field = ReturnType<typeof f.text>;

/** A form's field as its table keeps it. */
export function fieldOf(a: Ask): Field {
  const more = { ...(a.required ? { required: true } : {}), ...(a.min !== undefined ? { min: a.min } : {}), ...(a.max !== undefined ? { max: a.max } : {}) };
  switch (a.kind) {
    case "long":
      return f.long(a.id, a.label, more);
    case "email":
      return f.email(a.id, a.label, more);
    case "phone":
      return f.phone(a.id, a.label, more);
    case "number":
      return f.number(a.id, a.label, more);
    case "check":
      return f.bool(a.id, a.label, { default: false });
    case "date":
      return f.date(a.id, a.label, more);
    case "select":
      return f.select(a.id, a.label, a.options ?? [], more);
    default:
      return f.text(a.id, a.label, more);
  }
}
const inputOf = (a: Ask) => {
  const req = a.required ? { required: true } : {};
  switch (a.kind) {
    case "number":
      return i.num(a.id, { ...req, ...(a.min !== undefined ? { min: a.min } : {}), ...(a.max !== undefined ? { max: a.max } : {}) });
    case "check":
      return i.bool(a.id, req);
    case "email":
      return i.email(a.id, req);
    case "phone":
      return i.phone(a.id, req);
    case "date":
      return i.text(a.id, { ...req, format: "date" });
    case "select":
      return i.text(a.id, { ...req, choices: (a.options ?? []).map(([id]) => id) });
    default:
      return i.text(a.id, { ...req, max: a.kind === "long" ? 3000 : 200 });
  }
};
const formField = (a: Ask) => ff(a.id, a.kind, a.label, { ...(a.required ? { required: true } : {}), ...(a.options ? { options: a.options.map(([value, label]) => ({ value, label })) } : {}), ...(a.min !== undefined ? { min: a.min } : {}), ...(a.max !== undefined ? { max: a.max } : {}) });

/** An element of a list's card showing one of the row's fields. */
export const shows = (field: string, name: Local, big = false) => ({ id: `c-${field}`, type: big ? "heading" : "text", props: { ...(big ? { level: 3 } : {}), text: name, bind: { text: field } }, ...(big ? {} : { style: { base: { color: "muted" } } }) });

const STATUS = L("الحالة", "Status", "סטטוס");

export type FeatureSpec = {
  key: string;
  category: Category;
  name: Local;
  note: Local;
  /** The feature's table: its address, name and the fields beside what the form asks. */
  table: { slug: string; name: Local; fields?: Field[] };
  /** The state the shop moves a row through (its first is where a new row starts), told to the shopper on each change. */
  status?: Array<[string, Local]>;
  /** The form on the page, and who may send it. */
  ask?: { fields: Ask[]; who?: "customer" | "public"; button: Local; done: string; perMinute?: number; /** What the shop is told. */ tell?: "bell" | "email" | "whatsapp"; title: string; /** Refused when this field's value is there already (one per shopper, one per email…). */ once?: string };
  /** A form on the page sent to one of the feature's own functions (by its call address, in `extra`), instead of `ask`. */
  form?: { fields: Ask[]; fn: string; button: Local; /** Its fields are the table's columns too. */ keep?: boolean };
  /** The page: its address and words; under the form, the shopper's own rows (`mine`) or the published rows (`show`). */
  page: { slug: string; title: Local; intro: Local; list?: { feed: "mine" | "show" | "live"; title: Local; card: Array<[string, Local]>; empty: Local; /** Another of the feature's tables (its key in `extra`). */ table?: string; /** A button on each card running one of the feature's functions with the row's id. */ action?: { label: Local; fn: string } } };
  /** How a change of state reaches the shopper: by WhatsApp to a phone field, or email to an email field. */
  statusTo?: { field: string; by: "whatsapp" | "email" };
  extra?: { tables?: TableIn[]; fns?: FnIn[] };
};

/** A whole feature from its description. */
export function feature(o: FeatureSpec): GalleryEntry {
  const who = o.ask?.who ?? "customer";
  const fields = [...(o.ask?.fields.map(fieldOf) ?? []), ...(o.form?.keep ? o.form.fields.map(fieldOf) : []), ...(o.table.fields ?? []), ...(o.status ? [f.select("status", STATUS, o.status, { default: o.status[0][0] })] : [])];
  const mine = o.page.list?.feed === "mine" && !o.page.list.table;
  const live = o.page.list?.feed === "live" && !o.page.list.table;
  const main = table("main", o.table.slug, o.table.name, fields, mine ? access("customer", "off") : live ? access("public", "off") : undefined);
  const fns: FnIn[] = [];
  const slug = o.key.replace(/^feat-/, "").slice(0, 36);
  if (o.ask) {
    const a = o.ask;
    const values = Object.fromEntries(a.fields.map((x) => [x.id, `{{input.${x.id}}}`]));
    const tellLine = `${a.title}: {{input.${a.fields[0].id}}}`;
    const tell = a.tell === "email" ? s.email(tellLine, a.fields.map((x) => `{{input.${x.id}}}`).join("\n")) : a.tell === "whatsapp" ? s.whatsapp(tellLine) : s.bell(tellLine, who === "customer" ? "{{caller.name}}" : undefined, "/admin/data");
    fns.push({
      key: "send",
      name: a.title,
      inputs: a.fields.map(inputOf),
      on: on.call(slug, who, a.perMinute ?? 5),
      do: [
        ...(a.once ? [s.find("main", "before", [{ field: a.once, op: "is", value: `{{input.${a.once}}}` }], { limit: 1 }), s.when([cond("{{before}}", "notEmpty")], [s.stop("في طلب من قبل بنفس المعلومات")])] : []),
        s.add("main", values, who === "customer" ? { owner: "{{caller}}" } : {}),
        tell,
        s.ret(a.done),
      ],
    });
  }
  if (o.status && o.statusTo) {
    const said = Object.fromEntries(o.status.map(([id, name]) => [id, name.ar]));
    const message = `return ${JSON.stringify(said)}[input.status] || input.status;`;
    const line = "تحديث على «{{input.row." + (o.ask?.fields[0].id ?? "status") + "}}»: {{word}}";
    fns.push({
      key: "status",
      name: "خبّر بتغيير الحالة",
      inputs: [i.any("row"), i.any("before")],
      on: on.row("main", ["changed"]),
      do: [
        s.when([cond("{{input.row.status}}", "eq", "{{input.before.status}}")], [s.stop("الحالة ما تغيّرت")]),
        s.when([cond(`{{input.row.${o.statusTo.field}}}`, "empty")], [s.stop("ما في وين نبعت")]),
        s.code(message, { status: "{{input.row.status}}" }, "word"),
        o.statusTo.by === "email" ? s.email(line, line, `{{input.row.${o.statusTo.field}}}`) : s.whatsapp(line, `{{input.row.${o.statusTo.field}}}`),
      ],
    });
  }
  const list = o.page.list;
  const children = [
    ...(o.ask ? [n.form(o.ask.fields.map(formField), { fn: slug }, o.ask.button, L(o.ask.done, o.ask.done, o.ask.done))] : []),
    ...(o.form ? [n.form(o.form.fields.map(formField), { fn: o.form.fn }, o.form.button)] : []),
    ...(list
      ? [
          n.heading(list.title, 2),
          n.list(list.table ?? "main", list.feed === "mine" ? "mine" : list.feed === "live" ? "live" : null, [...list.card.map(([field, name], k) => shows(field, name, k === 0)), ...(o.status && list.feed === "mine" ? [shows("status", STATUS)] : []), ...(list.action ? [n.run(list.action.label, list.action.fn, { id: "{{row_id}}" })] : [])], {
            empty: list.empty,
            ...(list.feed === "mine" ? { signin: L("سجّل دخولك لتشوف طلباتك.", "Sign in to see yours.", "התחברו כדי לראות את שלכם.") } : {}),
          }),
        ]
      : []),
  ];
  return featureEntry({
    key: o.key,
    category: o.category,
    name: o.name,
    note: o.note,
    tables: [main, ...(o.extra?.tables ?? [])],
    fns: [...fns, ...(o.extra?.fns ?? [])],
    pages: [page("page", nameOfPage(o.page.title), o.page.slug, o.page.title, o.page.intro, children as never)],
  });
}
const nameOfPage = (t: Local) => (t.ar || t.en || t.he || "").slice(0, 120);
