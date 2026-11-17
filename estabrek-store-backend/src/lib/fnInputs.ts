/**
 * What a function is handed, checked against its inputs (lib/fnDef.ts FnInput): its kind, whether
 * it is needed, and the input's own rules.
 *
 *   number  `min` / `max`: the least and the most it may be
 *   text    `min` / `max`: how many letters; `choices`: one of these; `format`: an email, a phone
 *           number, a web address, or a day (YYYY-MM-DD)
 *   list    `min` / `max`: how many things in it
 *
 * Every run reads its inputs here. A run stops at the first problem; an own address (lib/fnTriggers.ts
 * "route") says them all to its caller before the function runs.
 */
import type { FnInput } from "./fnDef.js";
import { numberOf, words } from "./fnValues.js";

export const INPUT_FORMATS = ["email", "phone", "url", "date"] as const;
export type InputFormat = (typeof INPUT_FORMATS)[number];
export const INPUT_RULE_LIMITS = { choices: 30, choice: 100 } as const;

/** One input that isn't right: which, and why (in words the admin turns into the page's language). */
export type InputProblem = { input: string; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function formatOk(format: InputFormat, s: string): boolean {
  if (format === "email") return s.length <= 254 && EMAIL.test(s);
  if (format === "phone") {
    if (!/^\+?[0-9(][0-9 ()-]*[0-9]$/.test(s)) return false;
    const digits = s.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15;
  }
  if (format === "url") {
    try {
      const u = new URL(s);
      return (u.protocol === "https:" || u.protocol === "http:") && !!u.hostname;
    } catch {
      return false;
    }
  }
  if (!DAY.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
const FORMAT_SAID: Record<InputFormat, string> = { email: "an email", phone: "a phone number", url: "a web address (https://…)", date: "a day (YYYY-MM-DD)" };

/** How long a text is, in letters (an emoji is one). */
const lettersOf = (s: string) => [...s].length;

/**
 * The inputs read from what was handed: each as its kind (a number from "12", yes/no from "true"),
 * nothing handed = null, and every problem found (an empty list: it can run).
 */
export function readInputs(inputs: FnInput[], raw: Record<string, unknown>): { values: Record<string, unknown>; problems: InputProblem[] } {
  const values: Record<string, unknown> = {};
  const problems: InputProblem[] = [];
  const bad = (i: FnInput, message: string) => problems.push({ input: i.name, message });
  for (const i of inputs) {
    let v = raw[i.name];
    if (v === undefined || v === null || v === "") {
      if (i.required) bad(i, `It needs "${i.name}"`);
      values[i.name] = null;
      continue;
    }
    if (i.type === "number") {
      const n = numberOf(v);
      if (n == null) {
        bad(i, `"${i.name}" has to be a number`);
        continue;
      }
      if (i.min !== undefined && n < i.min) bad(i, `"${i.name}" is at least ${i.min}`);
      else if (i.max !== undefined && n > i.max) bad(i, `"${i.name}" is at most ${i.max}`);
      v = n;
    } else if (i.type === "bool") v = v === true || v === "true" || v === 1 || v === "1";
    else if (i.type === "text") {
      const s = words(v).slice(0, 10_000);
      const n = lettersOf(s);
      if (i.min !== undefined && n < i.min) bad(i, `"${i.name}" has at least ${i.min} letters`);
      else if (i.max !== undefined && n > i.max) bad(i, `"${i.name}" has at most ${i.max} letters`);
      else if (i.choices?.length && !i.choices.includes(s)) bad(i, `"${i.name}" is one of: ${i.choices.join(", ")}`);
      else if (i.format && !formatOk(i.format, s.trim())) bad(i, `"${i.name}" has to be ${FORMAT_SAID[i.format]}`);
      v = i.format ? s.trim() : s;
    } else if (i.type === "list") {
      if (!Array.isArray(v)) {
        bad(i, `"${i.name}" has to be a list`);
        continue;
      }
      if (i.min !== undefined && v.length < i.min) bad(i, `"${i.name}" has at least ${i.min} things`);
      else if (i.max !== undefined && v.length > i.max) bad(i, `"${i.name}" has at most ${i.max} things`);
    }
    values[i.name] = v;
  }
  return { values, problems };
}

/** Rules that can't hold (the least more than the most, a rule for another kind): said before publishing. */
export function inputRuleProblems(inputs: FnInput[]): string[] {
  const out: string[] = [];
  for (const i of inputs) {
    const measured = i.type === "number" || i.type === "text" || i.type === "list";
    if ((i.min !== undefined || i.max !== undefined) && !measured) out.push(`"${i.name}": the least and the most are for a number, words or a list`);
    if (i.min !== undefined && i.max !== undefined && i.min > i.max) out.push(`"${i.name}": the least is more than the most`);
    if (i.type !== "number" && ((i.min !== undefined && (i.min < 0 || !Number.isInteger(i.min))) || (i.max !== undefined && (i.max < 0 || !Number.isInteger(i.max))))) out.push(`"${i.name}": how many is a whole number, 0 or more`);
    if ((i.choices !== undefined || i.format !== undefined) && i.type !== "text") out.push(`"${i.name}": choices and a format are for words`);
    if (i.choices !== undefined && (!i.choices.length || i.choices.some((c) => !c.trim()))) out.push(`"${i.name}": a choice can't be empty`);
    if (i.choices?.length && new Set(i.choices).size !== i.choices.length) out.push(`"${i.name}": a choice is there twice`);
    if (i.choices?.length && i.format) out.push(`"${i.name}": choices or a format, not both`);
  }
  return out;
}
