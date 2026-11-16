/**
 * A function's values (F1; lib/fnDef.ts says what a function is). What a step is given may name
 * what the run knows: "{{input.email}}", "{{order.total}}", "{{rows.length}}"; and a condition
 * compares two of them. No code is run here: a name is a path into the run's own things, nothing
 * else, so a function can't reach anything it wasn't handed.
 */
export type Scope = Record<string, unknown>;

/** A name with its way in: "order", "order.total", "rows.0.title", "rows.length". */
export const PATH = /^[A-Za-z_$][A-Za-z0-9_$]{0,39}(\.[A-Za-z0-9_$]{1,40}){0,7}$/;
const HOLE = /\{\{\s*([^{}]*?)\s*\}\}/g;
const WHOLE = /^\{\{\s*([^{}]*?)\s*\}\}$/;
const FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);

/** What a path names in the run's things; undefined when there is no such thing. */
export function lookup(scope: Scope, path: string): unknown {
  if (!PATH.test(path)) return undefined;
  let at: unknown = scope;
  for (const key of path.split(".")) {
    if (at == null || FORBIDDEN.has(key)) return undefined;
    if (Array.isArray(at)) at = key === "length" ? at.length : key === "first" ? at[0] : key === "last" ? at[at.length - 1] : /^\d+$/.test(key) ? at[Number(key)] : undefined;
    else if (typeof at === "string") at = key === "length" ? at.length : undefined;
    else if (typeof at === "object") at = Object.prototype.hasOwnProperty.call(at, key) ? (at as Record<string, unknown>)[key] : undefined;
    else return undefined;
  }
  return at;
}

/** A value as words (inside a longer text). */
export function words(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** The names a value asks for, in the order it asks: "طلب {{order.$slug}} من {{input.name}}" → ["order.$slug", "input.name"]. */
export function holesOf(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") for (const m of value.matchAll(HOLE)) out.push(m[1]);
  else if (Array.isArray(value)) for (const v of value) holesOf(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) holesOf(v, out);
  return out;
}

/**
 * A value with its names filled in. A text that is one name and nothing else becomes the thing
 * itself (a number stays a number, a row a row, a list a list); a name inside a longer text
 * becomes words. A name the run doesn't know is nothing (null, or no words).
 */
export function fill(value: unknown, scope: Scope): unknown {
  if (typeof value === "string") {
    const whole = WHOLE.exec(value);
    if (whole) return lookup(scope, whole[1]) ?? null;
    return value.replace(HOLE, (_m, path: string) => words(lookup(scope, path)));
  }
  if (Array.isArray(value)) return value.map((v) => fill(v, scope));
  if (value && typeof value === "object" && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, scope)]));
  return value;
}

/* ---------------- Conditions ---------------- */

export const CMPS = ["eq", "ne", "gt", "gte", "lt", "lte", "contains", "notContains", "in", "notIn", "empty", "notEmpty"] as const;
export type Cmp = (typeof CMPS)[number];
/** The comparisons that take nothing on the right. */
export const ALONE: ReadonlyArray<Cmp> = ["empty", "notEmpty"];
export type Cond = { left: unknown; cmp: Cmp; right?: unknown };

/** A number, also when it came as words ("12.5"); null when it isn't one. */
export function numberOf(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export function isEmpty(v: unknown): boolean {
  if (v == null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object" && !(v instanceof Date)) return Object.keys(v).length === 0;
  return false;
}

/** The same thing: numbers by their worth ("5" is 5), nothing is nothing, the rest by their words. */
export function same(a: unknown, b: unknown): boolean {
  const x = numberOf(a);
  const y = numberOf(b);
  if (x != null && y != null) return x === y;
  if (a == null || b == null) return isEmpty(a) && isEmpty(b);
  return words(a) === words(b);
}

/** Which comes first: numbers, then moments in time, then words. Null when the two can't be put in order. */
function order(a: unknown, b: unknown): number | null {
  const x = numberOf(a);
  const y = numberOf(b);
  if (x != null && y != null) return x - y;
  const plain = (v: unknown) => v != null && (typeof v !== "object" || v instanceof Date);
  if (!plain(a) || !plain(b)) return null;
  const s = words(a);
  const t = words(b);
  const at = Date.parse(s);
  const bt = Date.parse(t);
  // (A date is said as 2026-11-16 or 2026-11-16T10:00:00Z: words that only look like one aren't.)
  if (!Number.isNaN(at) && !Number.isNaN(bt) && /^\d{4}-\d{2}-\d{2}/.test(s) && /^\d{4}-\d{2}-\d{2}/.test(t)) return at - bt;
  return s < t ? -1 : s > t ? 1 : 0;
}

const has = (box: unknown, thing: unknown): boolean => {
  if (Array.isArray(box)) return box.some((x) => same(x, thing) || (!!x && typeof x === "object" && same((x as Record<string, unknown>).id ?? (x as Record<string, unknown>).$id, thing)));
  if (typeof box === "string") return box.toLowerCase().includes(words(thing).toLowerCase());
  return false;
};

/** Does the condition hold, with the names filled in? */
export function holds(cond: Cond, scope: Scope): boolean {
  const left = fill(cond.left, scope);
  const right = fill(cond.right, scope);
  switch (cond.cmp) {
    case "empty":
      return isEmpty(left);
    case "notEmpty":
      return !isEmpty(left);
    case "eq":
      return same(left, right);
    case "ne":
      return !same(left, right);
    case "contains":
      return has(left, right);
    case "notContains":
      return !has(left, right);
    case "in":
      return has(right, left);
    case "notIn":
      return !has(right, left);
    default: {
      const d = order(left, right);
      if (d == null) return false;
      return cond.cmp === "gt" ? d > 0 : cond.cmp === "gte" ? d >= 0 : cond.cmp === "lt" ? d < 0 : d <= 0;
    }
  }
}

/** Every condition (or, with "any", one of them). No conditions: yes. */
export function allHold(conds: Cond[] | undefined, match: "all" | "any" | undefined, scope: Scope): boolean {
  if (!conds?.length) return true;
  return match === "any" ? conds.some((c) => holds(c, scope)) : conds.every((c) => holds(c, scope));
}
