/**
 * A form the owner built (the page tree's form element of kind "custom"; the backend's lib/pageTree.ts FormField and
 * FormSend): its fields as the shop draws them, where it goes, and the check of what was typed before it is sent.
 * Nothing here touches the page: the server draws from it and FormView.tsx runs it.
 *
 * The check here is so the shopper is told at once. What decides is at the other end: the function's own steps, or
 * the table's rules (the same ones the admin's grid and the API use).
 */
import type { TreeLang } from "./tree";

export const FORM_FIELD_KINDS = ["text", "long", "email", "phone", "number", "select", "check", "date"] as const;
export type FormFieldKind = (typeof FORM_FIELD_KINDS)[number];
export type FormFieldSpec = { name: string; kind: FormFieldKind; label: string; hint: string; required: boolean; options: Array<{ value: string; label: string }>; min?: number; max?: number };
/** One of the owner's functions by its call address (its answer kept in the variable `as`, "" = not kept), or a new row of one of their tables. */
export type FormSendSpec = { to: "fn"; fn: string; as: string } | { to: "table"; table: string };
export type FormSpec = { title: string; fields: FormFieldSpec[]; /** null = not picked in the editor yet. */ send: FormSendSpec | null; button: string; done: string };
export type FormValue = string | boolean;

/** Sent on the form's element once it was sent and taken at the other end (a recipe with the "sent" event waits for it). */
export const FORM_SENT_EVENT = "pt:form-sent";
/** How many letters a line and a longer text take when the owner set no most. */
export const FORM_TEXT_MOST = { text: 300, long: 2000 } as const;

const NAME = /^[a-z][a-zA-Z0-9_]{0,30}$/;
const ADDRESS = /^[a-z0-9][a-z0-9-]{1,40}$/;
const TABLE = /^[a-z0-9][a-z0-9-]{0,40}$/;
const VAR = /^[A-Za-z][A-Za-z0-9_]{0,23}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9 ()-]{4,19}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** The form as the shop draws it: what isn't a field (no name, a kind we don't have, a name twice) drops out. */
export function formOf(p: Record<string, unknown>, say: (t: unknown) => string): FormSpec {
  const seen = new Set<string>();
  const fields: FormFieldSpec[] = [];
  for (const raw of Array.isArray(p.fields) ? p.fields.slice(0, 20) : []) {
    const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const kind = FORM_FIELD_KINDS.find((k) => k === f.kind);
    if (!kind || typeof f.name !== "string" || !NAME.test(f.name) || seen.has(f.name)) continue;
    seen.add(f.name);
    const options = kind === "select" && Array.isArray(f.options)
      ? f.options.slice(0, 30).flatMap((o) => {
          const x = o && typeof o === "object" ? (o as Record<string, unknown>) : {};
          const value = typeof x.value === "string" ? x.value.trim().slice(0, 60) : "";
          return value ? [{ value, label: say(x.label).slice(0, 80) || value }] : [];
        })
      : [];
    const min = num(f.min), max = num(f.max);
    fields.push({ name: f.name, kind, label: say(f.label).slice(0, 80) || f.name, hint: say(f.hint).slice(0, 120), required: f.required === true, options, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) });
  }
  const s = p.send && typeof p.send === "object" ? (p.send as Record<string, unknown>) : {};
  const send: FormSendSpec | null =
    s.to === "fn" && typeof s.fn === "string" && ADDRESS.test(s.fn) ? { to: "fn", fn: s.fn, as: typeof s.as === "string" && VAR.test(s.as) ? s.as : "" }
    : s.to === "table" && typeof s.table === "string" && TABLE.test(s.table) ? { to: "table", table: s.table }
    : null;
  return { title: say(p.title).slice(0, 160), fields, send, button: say(p.button).slice(0, 40), done: say(p.done).slice(0, 200) };
}

type Words = {
  needed: string; email: string; phone: string; number: string; day: string; choice: string;
  least: (n: number) => string; most: (n: number) => string; shortest: (n: number) => string; longest: (n: number) => string;
  choose: string; send: string; sending: string; sent: string; signin: string; signinLink: string; busy: string; other: string; notReady: string; inShop: string;
};
const WORDS: Record<TreeLang, Words> = {
  ar: {
    needed: "هالخانة مطلوبة", email: "الإيميل مش صحيح", phone: "رقم التلفون مش صحيح", number: "لازم يكون رقم", day: "التاريخ مش صحيح", choice: "اختيار مش موجود",
    least: (n) => `أقل شي ${n}`, most: (n) => `أكتر شي ${n}`, shortest: (n) => `أقل شي ${n} حروف`, longest: (n) => `أكتر شي ${n} حرف`,
    choose: "اختيار…", send: "إرسال", sending: "عم ينبعت…", sent: "انبعت ✓", signin: "لازم تسجيل دخول أول.", signinLink: "تسجيل الدخول", busy: "كتير طلبات. استنّى شوي وجرّب كمان مرة", other: "ما زبط. جرّب كمان مرة", notReady: "هالفورم لسا مش جاهز", inShop: "بالمتجر: الفورم بينبعت",
  },
  he: {
    needed: "שדה חובה", email: "כתובת האימייל אינה תקינה", phone: "מספר הטלפון אינו תקין", number: "יש להזין מספר", day: "התאריך אינו תקין", choice: "אפשרות שאינה קיימת",
    least: (n) => `לפחות ${n}`, most: (n) => `לכל היותר ${n}`, shortest: (n) => `לפחות ${n} תווים`, longest: (n) => `לכל היותר ${n} תווים`,
    choose: "בחירה…", send: "שליחה", sending: "נשלח…", sent: "נשלח ✓", signin: "יש להתחבר קודם.", signinLink: "התחברות", busy: "יותר מדי בקשות. נסו שוב בעוד רגע", other: "זה לא הצליח. נסו שוב", notReady: "הטופס הזה עדיין לא מוכן", inShop: "בחנות: הטופס נשלח",
  },
  en: {
    needed: "This is needed", email: "This isn't an email address", phone: "This isn't a phone number", number: "This has to be a number", day: "This isn't a date", choice: "This isn't one of the choices",
    least: (n) => `At least ${n}`, most: (n) => `At most ${n}`, shortest: (n) => `At least ${n} letters`, longest: (n) => `At most ${n} letters`,
    choose: "Choose…", send: "Send", sending: "Sending…", sent: "Sent ✓", signin: "Sign in first.", signinLink: "Sign in", busy: "Too many tries. Wait a moment and try again", other: "That didn't work. Try again", notReady: "This form isn't ready yet", inShop: "In the shop: the form is sent",
  },
};
export const formWords = (lang: TreeLang): Words => WORDS[lang] ?? WORDS.en;

/** What is wrong with what was typed in a field, in the page's language; null = fine. */
export function problemOf(f: FormFieldSpec, value: FormValue | undefined, lang: TreeLang): string | null {
  const w = formWords(lang);
  if (f.kind === "check") return f.required && value !== true ? w.needed : null;
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return f.required ? w.needed : null;
  switch (f.kind) {
    case "email":
      return EMAIL.test(text) && text.length <= 254 ? null : w.email;
    case "phone":
      return PHONE.test(text) ? null : w.phone;
    case "number": {
      const n = Number(text);
      if (!Number.isFinite(n)) return w.number;
      if (f.min !== undefined && n < f.min) return w.least(f.min);
      if (f.max !== undefined && n > f.max) return w.most(f.max);
      return null;
    }
    case "date":
      return DAY.test(text) && !Number.isNaN(Date.parse(text)) ? null : w.day;
    case "select":
      return f.options.some((o) => o.value === text) ? null : w.choice;
    default: {
      const most = Math.min(f.max ?? FORM_TEXT_MOST[f.kind], FORM_TEXT_MOST[f.kind]);
      if (f.min !== undefined && text.length < f.min) return w.shortest(f.min);
      if (text.length > most) return w.longest(most);
      return null;
    }
  }
}

/**
 * What is sent: each field by its name, empty ones left out. A function is handed words (it reads each as its
 * input's own kind); a table's row gets a number as a number and a tick as yes or no.
 */
export function valuesFor(fields: FormFieldSpec[], values: Record<string, FormValue | undefined>, to: "fn"): Record<string, string>;
export function valuesFor(fields: FormFieldSpec[], values: Record<string, FormValue | undefined>, to: "table"): Record<string, string | number | boolean>;
export function valuesFor(fields: FormFieldSpec[], values: Record<string, FormValue | undefined>, to: "fn" | "table") {
  const out: Record<string, string | number | boolean> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.kind === "check") {
      if (to === "fn") out[f.name] = v === true ? "true" : "false";
      else out[f.name] = v === true;
      continue;
    }
    const text = typeof v === "string" ? v.trim() : "";
    if (!text) continue;
    out[f.name] = to === "table" && f.kind === "number" ? Number(text) : text;
  }
  return out;
}
