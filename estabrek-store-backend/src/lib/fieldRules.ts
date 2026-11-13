/**
 * A field's rules (B2, admin → المجموعات → الحقول): beyond its kind, a field can ask that a value
 * be the only one in its column, fall between limits, look a certain way, and that a new row start
 * from a default. A rule that fails can say the owner's own words. Pure: "the only one" is looked
 * up in the database by lib/uniqueValues.ts.
 */
import type { FieldType } from "./collectionTree.js";

type Local = Partial<Record<"ar" | "en" | "he", string>>;
/** The rule parts of a field (lib/collectionTree.ts carries them on Field). */
export type FieldRules = {
  unique?: boolean;
  default?: unknown;
  /** Numbers: smallest and largest. Words: fewest and most letters. Dates: first and last day. */
  min?: number | string;
  max?: number | string;
  /** Short words only: a ready shape… */
  shape?: Shape;
  /** …or the owner's own pattern (a regular expression that passes patternProblem). */
  pattern?: string;
  /** Said when a value breaks a rule. */
  message?: Local;
  /** A hint under the field in forms. */
  help?: Local;
};

export const SHAPES = ["email", "phone", "url", "letters", "digits", "slug"] as const;
export type Shape = (typeof SHAPES)[number];
const SHAPE_RE: Record<Shape, RegExp> = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  phone: /^\+?[0-9][0-9 ()-]{5,19}$/,
  url: /^https:\/\/[^\s<>"']+$/i,
  letters: /^[\p{L}\p{M} '-]+$/u,
  digits: /^[0-9]+$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};

/** Which rules fit which kind of field. */
export const RULES_BY_TYPE: Record<FieldType, { unique: boolean; limits: "number" | "length" | "date" | null; shape: boolean; default: boolean }> = {
  text: { unique: true, limits: "length", shape: true, default: true },
  longText: { unique: false, limits: "length", shape: false, default: true },
  number: { unique: true, limits: "number", shape: false, default: true },
  date: { unique: true, limits: "date", shape: false, default: true },
  link: { unique: true, limits: null, shape: false, default: true },
  boolean: { unique: false, limits: null, shape: false, default: true },
  select: { unique: false, limits: null, shape: false, default: true },
  color: { unique: false, limits: null, shape: false, default: true },
  image: { unique: false, limits: null, shape: false, default: false },
};

export const PATTERN_MAX = 200;
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/**
 * Why the owner's own pattern can't be used, or null. Patterns run on words anyone may send, so
 * the ones that can take forever on a crafted value are refused: a repeated group that itself
 * holds a repeat or a choice ("(a+)+", "(a|ab)*"), back-references and look-behinds.
 */
export function patternProblem(source: string): string | null {
  if (!source || source.length > PATTERN_MAX) return `A pattern is up to ${PATTERN_MAX} characters`;
  try {
    new RegExp(source, "u");
  } catch {
    return "The pattern isn't a valid regular expression";
  }
  if (/\\[1-9]|\\k</.test(source)) return "A pattern can't refer back to a group";
  if (/\(\?<[=!]/.test(source)) return "A pattern can't look behind";
  // Walk the groups: what does each hold, and is it repeated?
  const stack: Array<{ risky: boolean }> = [];
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "[") {
      // A set of characters is one thing: skip to its end.
      for (i += 1; i < source.length && source[i] !== "]"; i++) if (source[i] === "\\") i += 1;
      continue;
    }
    if (ch === "(") stack.push({ risky: false });
    else if (ch === ")") {
      const group = stack.pop();
      const next = source[i + 1];
      const repeated = next === "*" || next === "+" || (next === "{" && !/^\{[01](,1)?\}/.test(source.slice(i + 1)));
      if (group?.risky && repeated) return "A repeated group can't hold a repeat or a choice";
      // A group with a repeat inside makes the one around it risky too.
      if (stack.length && (group?.risky || repeated)) stack[stack.length - 1].risky = true;
    } else if (stack.length && (ch === "*" || ch === "+" || ch === "|" || (ch === "{" && /^\{\d+,(\d+)?\}/.test(source.slice(i))))) stack[stack.length - 1].risky = true;
  }
  return null;
}

/** Letters as people count them: a letter with its marks is one, an emoji is one. */
export function lettersIn(words: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    let n = 0;
    for (const _ of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(words)) n += 1;
    return n;
  }
  return [...words].length;
}

type RuledField = { id: string; type: FieldType; required?: boolean } & FieldRules;

/** Is the field's own set of rules sound? The first thing that's wrong, or null. */
export function rulesProblem(f: RuledField): string | null {
  const fit = RULES_BY_TYPE[f.type];
  if (f.unique && !fit.unique) return "This kind of field can't ask for the only value";
  if ((f.shape !== undefined || f.pattern !== undefined) && !fit.shape) return "Only short words can have a shape";
  if (f.shape !== undefined && f.pattern !== undefined) return "A ready shape or your own pattern, not both";
  if (f.pattern !== undefined) {
    const problem = patternProblem(f.pattern);
    if (problem) return problem;
  }
  if ((f.min !== undefined || f.max !== undefined) && !fit.limits) return "This kind of field has no limits";
  if (fit.limits === "date") {
    if ((f.min !== undefined && !isDay(f.min)) || (f.max !== undefined && !isDay(f.max))) return "A date's limits are days like 2026-11-13";
    if (f.min !== undefined && f.max !== undefined && f.min > f.max) return "The first day is after the last";
  } else if (fit.limits) {
    for (const v of [f.min, f.max]) if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v))) return "Limits are numbers";
    if (fit.limits === "length" && [f.min, f.max].some((v) => v !== undefined && (!Number.isInteger(v) || (v as number) < 0))) return "A length is a whole number from 0";
    if (f.min !== undefined && f.max !== undefined && (f.min as number) > (f.max as number)) return "The smallest is above the largest";
  }
  if (f.default !== undefined && !fit.default) return "This kind of field has no default";
  if (f.default !== undefined && f.default !== null && f.default !== "" && f.unique) return "A field with no doubles can't start every new row from the same value";
  return null;
}

/** The message's key (the admin says it in its languages) when a checked value breaks the field's rules, or null. */
export function ruleIssue(f: RuledField, value: unknown): string | null {
  const fit = RULES_BY_TYPE[f.type];
  if (fit.limits === "number" && typeof value === "number") {
    if (typeof f.min === "number" && value < f.min) return "Too small";
    if (typeof f.max === "number" && value > f.max) return "Too big";
  }
  if (fit.limits === "date" && typeof value === "string") {
    if (typeof f.min === "string" && value < f.min) return "Too early";
    if (typeof f.max === "string" && value > f.max) return "Too late";
  }
  if (f.type === "text" || f.type === "longText") {
    const all = value && typeof value === "object" ? Object.values(value as Record<string, unknown>).filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
    const re = f.shape ? SHAPE_RE[f.shape] : f.pattern && !patternProblem(f.pattern) ? new RegExp(f.pattern, "u") : null;
    for (const words of all) {
      const length = lettersIn(words.trim());
      if (typeof f.min === "number" && length < f.min) return "Too short";
      if (typeof f.max === "number" && length > f.max) return "Too long";
      if (re && !re.test(words.trim())) return "Not the asked shape";
    }
  }
  return null;
}

/** What is compared when a field asks for the only value: words without their case and edges, anything else as written. */
export function uniqueKeys(f: Pick<RuledField, "type">, value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  if (f.type === "text") {
    return value && typeof value === "object"
      ? Object.values(value as Record<string, unknown>)
          .filter((x): x is string => typeof x === "string" && x.trim() !== "")
          .map((x) => x.trim().toLowerCase())
      : [];
  }
  return [String(value)];
}
