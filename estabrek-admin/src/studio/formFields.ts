/**
 * A form the owner builds (the form element, kind "custom"; the backend's lib/pageTree.ts FormField and FormSend,
 * the shop's pageTree/formSpec.ts): its fields and where it goes, as the editor holds them. Here: the kinds with
 * their names, a fresh field, the form a new one starts as, fields made from what a function takes or from a
 * table's fields, a select's choices as lines of text, and what doesn't fit between the form and where it goes.
 */
import type { FnInput } from "../api/functions.api";
import type { ApiField } from "../api/dataApi.api";
import { say } from "./say";

export type Words = Record<string, string>;
export type FormKind = "text" | "long" | "email" | "phone" | "number" | "select" | "check" | "date" | "file";
export type FormOption = { value: string; label?: Words };
export type FormField = { name: string; kind: FormKind; label: Words; hint?: Words; required?: boolean; options?: FormOption[]; min?: number; max?: number };
export type FormSend = { to: "fn"; fn?: string; as?: string } | { to: "table"; table?: string };
export const FORM_MAX = { fields: 20, options: 30 } as const;
/** What a field is sent as: a function's input name, or a table field's id. */
export const FIELD_NAME = /^[a-z][a-zA-Z0-9_]{0,30}$/;

export const FORM_KINDS: Array<[FormKind, () => string]> = [
  ["text", () => say("سطر كلام|A line of text|שורת טקסט")],
  ["long", () => say("كلام طويل|A longer text|טקסט ארוך")],
  ["email", () => say("إيميل|Email|אימייל")],
  ["phone", () => say("رقم تلفون|Phone number|מספר טלפון")],
  ["number", () => say("رقم|Number|מספר")],
  ["select", () => say("اختيار من قائمة|A choice from a list|בחירה מרשימה")],
  ["check", () => say("مربّع صح|A tick box|תיבת סימון")],
  ["date", () => say("تاريخ|Date|תאריך")],
  // Into the table's picture or file field of the same name (a form to a table only; the field says its size and kinds).
  ["file", () => say("ملف أو صورة|A file or picture|קובץ או תמונה")],
];

export const fieldsOf = (v: unknown): FormField[] => (Array.isArray(v) ? (v as FormField[]) : []);
export const sendOf = (v: unknown): FormSend => (v && typeof v === "object" && ((v as FormSend).to === "fn" || (v as FormSend).to === "table") ? (v as FormSend) : { to: "fn" });

/** A name no other field has: the word itself, or with a number after it. */
export function freeName(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let k = 2; k < 100; k++) if (!used.has(`${base}${k}`)) return `${base}${k}`;
  return `${base}${Date.now() % 10000}`;
}

export function newField(kind: FormKind, lang: string, taken: Iterable<string>): FormField {
  const name = freeName(kind === "long" ? "message" : kind === "check" ? "agree" : kind === "select" ? "choice" : kind === "date" ? "day" : kind === "number" ? "amount" : kind === "file" ? "attachment" : kind, taken);
  const label = FORM_KINDS.find(([k]) => k === kind)![1]();
  return { name, kind, label: { [lang]: label }, ...(kind === "select" ? { options: [{ value: "one", label: { [lang]: say("الأول|First|ראשון") } }, { value: "two", label: { [lang]: say("التاني|Second|שני") } }] } : {}) };
}

/** What a form of the owner's own starts as: a name, an email and a few words; where it goes isn't picked yet. */
export function startForm(lang: string): { fields: FormField[]; send: FormSend; button: Words; done: Words } {
  return {
    fields: [
      { name: "name", kind: "text", label: { [lang]: say("الاسم|Name|שם") }, required: true },
      { name: "email", kind: "email", label: { [lang]: say("الإيميل|Email|אימייל") }, required: true },
      { name: "message", kind: "long", label: { [lang]: say("رسالتك|Your message|ההודעה שלך") } },
    ],
    send: { to: "fn" },
    button: { [lang]: say("إرسال|Send|שליחה") },
    done: { [lang]: say("وصلتنا، شكراً ✓|Got it, thank you ✓|התקבל, תודה ✓") },
  };
}

/**
 * A field for each thing a function takes (a list can't be typed into a box: left out). A text that is an email or
 * a phone number by its name or its note ("to": "her email") gets that kind of box, so the shop checks it as one.
 */
export function fromInputs(takes: FnInput[], lang: string): FormField[] {
  return takes.flatMap((i): FormField[] => {
    if (i.type === "list" || !FIELD_NAME.test(i.name)) return [];
    const about = `${i.name} ${i.note ?? ""}`;
    const kind: FormKind = i.type === "number" ? "number" : i.type === "bool" ? "check"
      : /mail|[إا]يميل|אימייל|דוא/i.test(about) ? "email"
      : /phone|mobile|tel|تلفون|هاتف|جوال|טלפון|נייד/i.test(about) ? "phone"
      : /note|message|text|comment/i.test(i.name) ? "long" : "text";
    return [{ name: i.name, kind, label: { [lang]: (i.note || i.name).slice(0, 80) }, ...(i.required ? { required: true } : {}) }];
  });
}

// (A field pointing at a shopper is written as that shopper's email.)
const TABLE_KINDS: Partial<Record<ApiField["type"], FormKind>> = { text: "text", link: "text", longText: "long", number: "number", date: "date", boolean: "check", select: "select", email: "email", phone: "phone", customer: "email" };
/** A field for each of a table's fields a shopper can type (pictures, files, links to other rows and the like are left out, by name). */
export function fromTable(fields: ApiField[], lang: string, hidden: string[] = []): { fields: FormField[]; skipped: string[] } {
  const out: FormField[] = [];
  const skipped: string[] = [];
  const nameOf = (words: Record<string, string | undefined> | null | undefined, fallback: string) => (words?.[lang] || words?.ar || words?.en || words?.he || fallback).slice(0, 80);
  for (const f of fields) {
    // A field only a key sees is never a shopper's to write.
    if (hidden.includes(f.id)) continue;
    // A picture or file field the owner opened for uploads becomes a file box.
    const kind = (f.type === "image" || f.type === "file") && f.upload ? "file" : TABLE_KINDS[f.type];
    if (!kind || !FIELD_NAME.test(f.id)) {
      skipped.push(nameOf(f.name, f.id));
      continue;
    }
    out.push({
      name: f.id, kind, label: { [lang]: nameOf(f.name, f.id) }, ...(f.required ? { required: true } : {}),
      ...(kind === "select" ? { options: (f.options ?? []).slice(0, FORM_MAX.options).map((o) => ({ value: o.id, label: { [lang]: nameOf(o.name, o.id) } })) } : {}),
    });
  }
  return { fields: out, skipped };
}

/** A select's choices as text, one a line: what is sent, then "=" and the words shown (none = the same). */
export const optionsText = (options: FormOption[] | undefined, lang: string): string =>
  (options ?? []).map((o) => (o.label?.[lang] && o.label[lang] !== o.value ? `${o.value} = ${o.label[lang]}` : o.value)).join("\n");
/** The lines back as choices; a choice that was there keeps its words in the other languages. */
export function optionsFrom(text: string, lang: string, was: FormOption[] | undefined): FormOption[] {
  const seen = new Set<string>();
  const out: FormOption[] = [];
  for (const line of text.split("\n")) {
    const at = line.indexOf("=");
    const value = (at < 0 ? line : line.slice(0, at)).trim().slice(0, 60);
    const words = at < 0 ? "" : line.slice(at + 1).trim().slice(0, 80);
    if (!value || seen.has(value) || out.length >= FORM_MAX.options) continue;
    seen.add(value);
    const old = was?.find((o) => o.value === value)?.label ?? {};
    const label = { ...old, ...(words ? { [lang]: words } : {}) };
    if (!words) delete label[lang];
    out.push(Object.keys(label).length ? { value, label } : { value });
  }
  return out;
}

/** What doesn't fit between the form's fields and where it goes: what it needs with no field, and fields it doesn't take. */
export function misfit(fields: FormField[], takes: Array<{ name: string; required: boolean }>): { missing: string[]; extra: string[] } {
  const has = new Set(fields.map((f) => f.name));
  const known = new Set(takes.map((t) => t.name));
  return { missing: takes.filter((t) => t.required && !has.has(t.name)).map((t) => t.name), extra: fields.filter((f) => !known.has(f.name)).map((f) => f.name) };
}
