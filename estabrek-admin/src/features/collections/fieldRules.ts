/**
 * A field's rules in the fields editor, the pure parts (tested): which rules a kind of field can
 * have comes from the server (grid-meta); here a rule is set or taken off, a default is written
 * and read back as the field holds values, and a field's rules are said in a few words.
 */
import type { CollectionField, FieldType, Local } from "../../api/collections.api";
import { draftFrom, valueFrom } from "../data/kinds";

export type Lang = "ar" | "en" | "he";
export type Shape = NonNullable<CollectionField["shape"]>;
export type RuleFit = { unique: boolean; limits: "number" | "length" | "date" | null; shape: boolean; default: boolean };

export const SHAPE_NAME: Record<Shape, string> = {
  email: "إيميل|Email|אימייל",
  phone: "رقم تلفون|Phone number|מספר טלפון",
  url: "رابط https|An https link|קישור https",
  letters: "حروف بس|Letters only|אותיות בלבד",
  digits: "أرقام بس|Digits only|ספרות בלבד",
  slug: "كلمة-للرابط (a-z و 0-9 و -)|url-word (a-z, 0-9, -)|מילת-כתובת (a-z, 0-9, -)",
};
export const LIMIT_NAME: Record<NonNullable<RuleFit["limits"]>, [string, string]> = {
  number: ["أصغر قيمة|Smallest|הקטן ביותר", "أكبر قيمة|Largest|הגדול ביותר"],
  length: ["أقل عدد حروف|Fewest letters|מינימום אותיות", "أكثر عدد حروف|Most letters|מקסימום אותיות"],
  date: ["من يوم|First day|מיום", "لحد يوم|Last day|עד יום"],
};

const WORDS: FieldType[] = ["text", "longText"];
const RULE_KEYS = ["unique", "default", "min", "max", "shape", "pattern", "message", "help"] as const;
type RuleKey = (typeof RULE_KEYS)[number];

const emptyWords = (v: unknown) => !v || typeof v !== "object" || !Object.values(v as Record<string, unknown>).some((x) => typeof x === "string" && x.trim());
/** Is this rule set to nothing? (A default of "no" is a real default; "no doubles" off is no rule.) */
function nothing(key: RuleKey, v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (key === "unique") return v !== true;
  if (key === "message" || key === "help") return emptyWords(v);
  return typeof v === "number" && !Number.isFinite(v);
}

/** The field with some rules changed; a rule set to nothing is taken off (so an untouched field is saved as it was). */
export function setRules(field: CollectionField, patch: Partial<Pick<CollectionField, RuleKey>>): CollectionField {
  const out: CollectionField = { ...field };
  for (const [key, value] of Object.entries(patch) as Array<[RuleKey, unknown]>) {
    if (nothing(key, value) || (key === "default" && WORDS.includes(field.type) && emptyWords(value))) delete out[key];
    else (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

/** The rules a field can't have (its kind changed, or they came from elsewhere) taken off. */
export function fitRules(field: CollectionField, fit: RuleFit | undefined): CollectionField {
  if (!fit) return field;
  const out = { ...field };
  if (!fit.unique) delete out.unique;
  if (!fit.limits) {
    delete out.min;
    delete out.max;
  }
  if (!fit.shape) {
    delete out.shape;
    delete out.pattern;
  }
  if (!fit.default) delete out.default;
  return out;
}

/** The default as it's written in the editor's box (words: in one language). */
export function defaultDraft(field: CollectionField, lang: Lang): string {
  const v = field.default;
  if (v === undefined || v === null) return "";
  if (WORDS.includes(field.type)) return typeof v === "object" ? ((v as Local)[lang] ?? "") : "";
  return draftFrom(field, v);
}

/** The box's words as the default the field keeps (a number as a number, yes/no as yes/no, several choices as a list, words under their language). */
export function defaultFrom(field: CollectionField, lang: Lang, draft: string): unknown {
  if (WORDS.includes(field.type)) {
    const out: Local = { ...(field.default && typeof field.default === "object" ? (field.default as Local) : {}) };
    if (draft.trim()) out[lang] = draft;
    else delete out[lang];
    return Object.keys(out).length ? out : undefined;
  }
  const v = valueFrom(field, draft);
  // A number that isn't one is no default (a row's cell would send it on for the server to refuse; a field's default isn't sent half-written).
  if (v === null || ((field.type === "number" || field.type === "money") && typeof v !== "number")) return undefined;
  return v;
}

/** A limit's box as the limit the field keeps (a number, or a day). */
export function limitFrom(fit: RuleFit, draft: string): number | string | undefined {
  if (draft.trim() === "") return undefined;
  if (fit.limits === "date") return draft;
  return Number.isFinite(Number(draft)) ? Number(draft) : undefined;
}

/** How many rules a field has (the editor's button says it). */
export const ruleCount = (field: CollectionField) => RULE_KEYS.filter((k) => field[k] !== undefined).length;

/** A field's rules in a few words ("فريد · 0–1000 · بيبدأ بـ 10"), each part written in the three languages. */
export function ruleParts(field: CollectionField, lang: Lang): string[] {
  const out: string[] = [];
  if (field.unique) out.push("ما بتتكرر|no doubles|ללא כפילויות");
  if (field.min !== undefined || field.max !== undefined) {
    const range = `${field.min ?? "…"}–${field.max ?? "…"}`;
    out.push(WORDS.includes(field.type) ? `${range} حرف|${range} letters|${range} אותיות` : range);
  }
  if (field.shape) out.push(SHAPE_NAME[field.shape]);
  if (field.pattern) out.push(`نمط: ${field.pattern}|pattern: ${field.pattern}|תבנית: ${field.pattern}`);
  if (field.default !== undefined) {
    const d = defaultDraft(field, lang) || defaultDraft(field, "ar") || defaultDraft(field, "en") || defaultDraft(field, "he");
    const shown = field.type === "boolean" ? (field.default ? "نعم|yes|כן" : "لا|no|לא") : `${d}|${d}|${d}`;
    const [ar, en, he] = shown.split("|");
    out.push(`بيبدأ بـ ${ar}|starts as ${en}|מתחיל כ־${he}`);
  }
  return out;
}

/* ---------------- A choice field's choices ---------------- */

type Choice = NonNullable<CollectionField["options"]>[number];

/** A new choice: its id from its name when that gives letters, else "choice", "choice2"… (never one that's taken). */
export function addChoice(field: CollectionField, name: string, lang: Lang): CollectionField {
  const taken = new Set((field.options ?? []).map((o) => o.id));
  const words = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").trim().split(/\s+/).filter(Boolean);
  let base = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join("").replace(/^[^a-z]+/, "").slice(0, 24) || "choice";
  if (!/^[a-z]/.test(base)) base = "choice";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}${n}`;
  return { ...field, options: [...(field.options ?? []), { id, name: { [lang]: name.trim() || id } }] };
}

/** A choice's name in one language (its id never changes: rows keep it). */
export function renameChoice(field: CollectionField, id: string, lang: Lang, name: string): CollectionField {
  return { ...field, options: (field.options ?? []).map((o): Choice => (o.id === id ? { ...o, name: { ...o.name, [lang]: name } } : o)) };
}

/** Without one choice (the last one stays: a choice field needs its choices); a default that named it lets go of it. */
export function removeChoice(field: CollectionField, id: string): CollectionField {
  const options = (field.options ?? []).filter((o) => o.id !== id);
  if (!options.length) return field;
  const out: CollectionField = { ...field, options };
  if (out.default === id) delete out.default;
  if (Array.isArray(out.default)) {
    const kept = out.default.filter((x) => x !== id);
    if (kept.length) out.default = kept;
    else delete out.default;
  }
  return out;
}

/** A choice up or down in the list (the order they're offered in). */
export function moveChoice(field: CollectionField, id: string, by: -1 | 1): CollectionField {
  const options = [...(field.options ?? [])];
  const i = options.findIndex((o) => o.id === id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= options.length) return field;
  [options[i], options[j]] = [options[j], options[i]];
  return { ...field, options };
}

/** The currencies offered for money (any three letters can still be written). */
export const CURRENCIES = ["ILS", "USD", "EUR", "JOD", "GBP", "AED", "SAR", "EGP", "TRY"] as const;
