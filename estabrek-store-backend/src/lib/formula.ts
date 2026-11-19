/**
 * A computed field's equation (field kind "formula"): its own small language, read here and never run as code.
 *
 *   price * qty                      total of a line
 *   round(price * (1 - off / 100), 2)
 *   if(stock = 0, "نفد", "متوفر")
 *   first & " " & last               words joined
 *   days(today(), due)               days left
 *   status = "مدفوع"                 a choice, by its name in any language or its id
 *
 * - Values: numbers, words, yes/no, days, a choice (one or several). A field is named by its id (`price`), or in
 *   braces when its id is one of the language's own words (`{and}`).
 * - Operators, loosest first: or ||, and &&, not !, = == != <> < <= > >=, & (words joined), + -, * / %, - (sign).
 * - Nothing breaks a row: an empty value is 0 in a sum, "" in words and "no" in a question; a division by zero,
 *   a number that isn't one or a day that isn't a day leaves the field empty.
 * - What it may read is decided when the table is saved (`checkFormula`): fields of the table that hold values
 *   (never a relation, a customer, JSON, a place or a 3D model), and other computed fields without a loop.
 *
 * Pure: no imports beyond types and the store's clock (the editor's checks and every reader use the same code).
 */
import type { Field, FieldType } from "./collectionTree.js";
import { dayOf, storeZone } from "./storeTime.js";

export const FORMULA_MAX = 1000;
/** What a computed field may give: as words, a number, money (in its currency), yes/no, a day. */
export const FORMULA_RESULTS = ["number", "money", "text", "boolean", "date"] as const;
export type FormulaResult = (typeof FORMULA_RESULTS)[number];
const LIMITS = { nodes: 400, depth: 40, args: 30, text: 10_000 } as const;
type Lang = "ar" | "en" | "he";
export const FORMULA_LANGS: readonly Lang[] = ["ar", "en", "he"];

/* ---------------- Reading ---------------- */

type Bin = "+" | "-" | "*" | "/" | "%" | "&" | "=" | "!=" | "<" | "<=" | ">" | ">=" | "and" | "or";
export type Ast =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "field"; id: string }
  | { t: "neg"; a: Ast }
  | { t: "not"; a: Ast }
  | { t: "bin"; op: Bin; a: Ast; b: Ast }
  | { t: "call"; fn: string; args: Ast[] };

type Tok = { k: "num"; v: number; at: number } | { k: "str"; v: string; at: number } | { k: "id"; v: string; at: number; braced?: boolean } | { k: "op"; v: string; at: number } | { k: "end"; at: number };

/** Why an equation can't be read or used: said in the three languages, with where it went wrong. */
export class FormulaError extends Error {
  constructor(
    message: string,
    readonly at: number | null = null,
    readonly say: { ar: string; he: string } = { ar: message, he: message },
  ) {
    super(message);
  }
}
const fail = (en: string, ar: string, he: string, at: number | null = null): never => {
  throw new FormulaError(en, at, { ar, he });
};

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const westernDigit = (d: string) => String((d.charCodeAt(0) - (d >= "۰" ? 0x6f0 : 0x660)) % 10);
const OPS2 = ["==", "!=", "<>", "<=", ">=", "&&", "||"];
const OPS1 = "+-*/%&=<>()!,";
const QUOTES: Record<string, string> = { '"': '"', "'": "'", "«": "»", "“": "”" };

function tokens(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const at = i;
    if (/[0-9٠-٩۰-۹.]/.test(c) && /[0-9٠-٩۰-۹]/.test(src[c === "." ? i + 1 : i] ?? "")) {
      let j = i;
      while (j < src.length && /[0-9٠-٩۰-۹.٫]/.test(src[j])) j++;
      const raw = src.slice(i, j).replace(ARABIC_DIGITS, westernDigit).replace(/٫/g, ".");
      const v = Number(raw);
      if (!Number.isFinite(v) || (raw.match(/\./g)?.length ?? 0) > 1) fail(`"${raw}" isn't a number`, `«${raw}» مش رقم`, `"${raw}" אינו מספר`, at);
      out.push({ k: "num", v, at });
      i = j;
      continue;
    }
    if (c in QUOTES) {
      const close = QUOTES[c];
      let j = i + 1;
      let v = "";
      while (j < src.length && src[j] !== close) {
        if (src[j] === "\\" && j + 1 < src.length) { v += src[j + 1]; j += 2; continue; }
        v += src[j++];
      }
      if (j >= src.length) fail("Words opened with a quote aren't closed", "في كلام بين علامتي تنصيص ما انسكّر", "מילים שנפתחו במירכאות לא נסגרו", at);
      out.push({ k: "str", v, at });
      i = j + 1;
      continue;
    }
    if (c === "{") {
      const j = src.indexOf("}", i);
      if (j < 0) fail("A { isn't closed", "في { ما انسكّر", "סוגר { לא נסגר", at);
      out.push({ k: "id", v: src.slice(i + 1, j).trim(), at, braced: true });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      out.push({ k: "id", v: src.slice(i, j), at });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (OPS2.includes(two)) { out.push({ k: "op", v: two, at }); i += 2; continue; }
    // The Arabic comma parts arguments too.
    if (c === "،" || c === "؛" || c === ";") { out.push({ k: "op", v: ",", at }); i++; continue; }
    if (c === "×") { out.push({ k: "op", v: "*", at }); i++; continue; }
    if (c === "÷") { out.push({ k: "op", v: "/", at }); i++; continue; }
    if (OPS1.includes(c)) { out.push({ k: "op", v: c, at }); i++; continue; }
    fail(`"${c}" can't be read here`, `«${c}» ما بينقرأ هون`, `"${c}" לא ניתן לקריאה כאן`, at);
  }
  out.push({ k: "end", at: src.length });
  return out;
}

const WORD_OPS: Record<string, string> = { and: "and", or: "or", not: "not" };

/** An equation read into its parts; a FormulaError says what's wrong and where. */
export function parseFormula(src: string): Ast {
  if (typeof src !== "string" || !src.trim()) fail("The equation is empty", "المعادلة فاضية", "המשוואה ריקה");
  if (src.length > FORMULA_MAX) fail(`An equation is ${FORMULA_MAX} letters at most`, `المعادلة ${FORMULA_MAX} حرف بالكتير`, `משוואה עד ${FORMULA_MAX} תווים`);
  const toks = tokens(src);
  let p = 0;
  let nodes = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => { const t = toks[p]; return (t.k === "op" && t.v === v) || (t.k === "id" && !t.braced && WORD_OPS[t.v.toLowerCase()] === v); };
  const node = <T extends Ast>(n: T): T => {
    if (++nodes > LIMITS.nodes) fail("The equation is too long", "المعادلة طويلة كتير", "המשוואה ארוכה מדי");
    return n;
  };
  const expect = (v: string) => {
    if (!isOp(v)) fail(`"${v}" was expected here`, `كان لازم «${v}» هون`, `ציפינו ל-"${v}" כאן`, peek().at);
    p++;
  };
  let depth = 0;
  const deeper = <T>(f: () => T): T => {
    if (++depth > LIMITS.depth) fail("Too many brackets inside each other", "أقواس كتير جوّا بعض", "יותר מדי סוגריים מקוננים");
    try { return f(); } finally { depth--; }
  };

  const or = (): Ast => {
    let a = and();
    while (isOp("or") || isOp("||")) { p++; a = node({ t: "bin", op: "or", a, b: and() }); }
    return a;
  };
  const and = (): Ast => {
    let a = not();
    while (isOp("and") || isOp("&&")) { p++; a = node({ t: "bin", op: "and", a, b: not() }); }
    return a;
  };
  const not = (): Ast => {
    if (isOp("not") || isOp("!")) { p++; return node({ t: "not", a: deeper(not) }); }
    return compare();
  };
  const COMPARE: Record<string, Bin> = { "=": "=", "==": "=", "!=": "!=", "<>": "!=", "<": "<", "<=": "<=", ">": ">", ">=": ">=" };
  const compare = (): Ast => {
    const a = join();
    const t = peek();
    if (t.k === "op" && t.v in COMPARE) {
      p++;
      const b = join();
      const n = node({ t: "bin", op: COMPARE[t.v], a, b } as Ast);
      const after = peek();
      if (after.k === "op" && after.v in COMPARE) fail("Two comparisons in a row: join them with and", "مقارنتين ورا بعض: اربطهم بـ and", "שתי השוואות ברצף: חברו אותן ב-and", after.at);
      return n;
    }
    return a;
  };
  const join = (): Ast => {
    let a = sum();
    while (isOp("&")) { p++; a = node({ t: "bin", op: "&", a, b: sum() }); }
    return a;
  };
  const sum = (): Ast => {
    let a = product();
    for (;;) {
      if (isOp("+")) { p++; a = node({ t: "bin", op: "+", a, b: product() }); }
      else if (isOp("-")) { p++; a = node({ t: "bin", op: "-", a, b: product() }); }
      else return a;
    }
  };
  const product = (): Ast => {
    let a = sign();
    for (;;) {
      const t = peek();
      if (t.k === "op" && (t.v === "*" || t.v === "/" || t.v === "%")) { p++; a = node({ t: "bin", op: t.v as Bin, a, b: sign() }); }
      else return a;
    }
  };
  const sign = (): Ast => {
    if (isOp("-")) { p++; return node({ t: "neg", a: deeper(sign) }); }
    if (isOp("+")) { p++; return deeper(sign); }
    return atom();
  };
  const atom = (): Ast => {
    const t = peek();
    if (t.k === "num") { p++; return node({ t: "num", v: t.v }); }
    if (t.k === "str") { p++; if (t.v.length > LIMITS.text) fail("Words too long", "كلام طويل كتير", "מילים ארוכות מדי", t.at); return node({ t: "str", v: t.v }); }
    if (isOp("(")) { p++; const e = deeper(or); expect(")"); return e; }
    if (t.k === "id") {
      p++;
      const name = t.v;
      if (!t.braced) {
        const low = name.toLowerCase();
        if (low === "true" || low === "false") return node({ t: "bool", v: low === "true" });
        if (isOp("(")) {
          p++;
          const fn = FUNCTIONS[low];
          if (!fn) fail(`No function "${name}"`, `ما في دالة اسمها «${name}»`, `אין פונקציה בשם "${name}"`, t.at);
          const args: Ast[] = [];
          if (!isOp(")")) {
            for (;;) {
              args.push(deeper(or));
              if (args.length > LIMITS.args) fail("Too many values in one function", "قيم كتير بدالة وحدة", "יותר מדי ערכים בפונקציה אחת", t.at);
              if (isOp(",")) { p++; continue; }
              break;
            }
          }
          expect(")");
          if (args.length < fn.min || args.length > fn.max) {
            const n = fn.min === fn.max ? `${fn.min}` : fn.max === Infinity ? `${fn.min}+` : `${fn.min}–${fn.max}`;
            fail(`${low}() takes ${n} values`, `${low}() بتاخد ${n} قيم`, `${low}() מקבלת ${n} ערכים`, t.at);
          }
          return node({ t: "call", fn: low, args });
        }
      }
      if (!/^[a-z][a-zA-Z0-9]{0,30}$/.test(name)) fail(`"${name}" isn't a field's id`, `«${name}» مش اسم حقل`, `"${name}" אינו מזהה שדה`, t.at);
      return node({ t: "field", id: name });
    }
    if (t.k === "end") fail("The equation stops too soon", "المعادلة بتخلص قبل وقتها", "המשוואה נגמרת מוקדם מדי", t.at);
    return fail(`"${(t as { v?: string }).v ?? ""}" doesn't belong here`, `«${(t as { v?: string }).v ?? ""}» مش مكانه هون`, `"${(t as { v?: string }).v ?? ""}" לא שייך לכאן`, t.at);
  };

  const ast = or();
  if (peek().k !== "end") fail("Something is left after the equation's end (a missing operator?)", "في شي زايد بآخر المعادلة (ناقص عملية؟)", "נשאר משהו אחרי סוף המשוואה (חסר אופרטור?)", peek().at);
  return ast;
}

/** The fields an equation reads. */
export function formulaRefs(ast: Ast): string[] {
  const out = new Set<string>();
  const walk = (n: Ast) => {
    if (n.t === "field") out.add(n.id);
    else if (n.t === "neg" || n.t === "not") walk(n.a);
    else if (n.t === "bin") { walk(n.a); walk(n.b); }
    else if (n.t === "call") n.args.forEach(walk);
  };
  walk(ast);
  return [...out];
}

/* ---------------- Kinds ---------------- */

/** What a value is, as the checker sees it. "any": can't be told before it runs (it is shown as words). */
export type Kind = "number" | "text" | "boolean" | "date" | "choice" | "choices" | "any";

/** The kinds of field an equation can read (the rest are refused by name). */
const FIELD_KIND: Partial<Record<FieldType, Kind>> = {
  text: "text", longText: "text", richText: "text", email: "text", phone: "text", link: "text", color: "text", image: "text", file: "text", video: "text",
  number: "number", money: "number", date: "date", datetime: "date", boolean: "boolean", select: "choice", multiSelect: "choices",
};
/** The kind a computed field's own value has for another equation. */
const RESULT_KIND: Record<string, Kind> = { number: "number", money: "number", text: "text", boolean: "boolean", date: "date", datetime: "date" };

export function fieldKind(f: Field): Kind | null {
  if (f.type === "formula" || f.type === "rollup") return RESULT_KIND[f.result ?? "number"] ?? "number";
  return FIELD_KIND[f.type] ?? null;
}

const NUM: Kind[] = ["number"];
const anyKind = () => true;
type Fn = { min: number; max: number; kind: (args: Kind[]) => Kind; fits?: (args: Kind[]) => string | null; run: (args: Lazy[], cx: Cx) => Value };

/* ---------------- Values ---------------- */

/** A day: days since 1970-01-01 (UTC). */
export type Day = { day: number };
export type Choice = { choice: string; names: string[]; shown: string };
export type Value = number | string | boolean | Day | Choice | Choice[] | null;
type Lazy = () => Value;
type Cx = { lang: Lang; today: () => Day };

const isDay = (v: Value): v is Day => !!v && typeof v === "object" && !Array.isArray(v) && "day" in v;
const isChoice = (v: Value): v is Choice => !!v && typeof v === "object" && !Array.isArray(v) && "choice" in v;
const MS = 86_400_000;
export const dayFrom = (iso: string): Day | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? null : { day: Math.round(t / MS) };
};
export const dayText = (d: Day) => new Date(d.day * MS).toISOString().slice(0, 10);
const dayParts = (d: Day) => { const x = new Date(d.day * MS); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), w: x.getUTCDay() }; };

/** Ten significant digits: 0.1 + 0.2 is 0.3. */
const clean = (n: number) => (Number.isFinite(n) ? Number(n.toPrecision(12)) : NaN);
const YES_NO: Record<Lang, [string, string]> = { ar: ["نعم", "لا"], en: ["Yes", "No"], he: ["כן", "לא"] };

function num(v: Value): number {
  if (v === null || v === "") return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") { const n = Number(v.trim().replace(ARABIC_DIGITS, westernDigit).replace(/[,٬]/g, "")); return v.trim() && Number.isFinite(n) ? n : NaN; }
  if (isDay(v)) return v.day;
  return NaN;
}
function text(v: Value, cx: Cx): string {
  if (v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(clean(v)) : "";
  if (typeof v === "boolean") return YES_NO[cx.lang][v ? 0 : 1];
  if (isDay(v)) return dayText(v);
  if (isChoice(v)) return v.shown;
  if (Array.isArray(v)) return v.map((c) => c.shown).join(cx.lang === "ar" ? "، " : ", ");
  return "";
}
function truthy(v: Value): boolean {
  if (v === null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}
const empty = (v: Value) => v === null || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "number" && Number.isNaN(v));
/** A choice is the words it's called in any language, or its id (letter case aside). */
const choiceIs = (c: Choice, words: string) => { const w = words.trim().toLowerCase(); return c.choice.toLowerCase() === w || c.names.some((n) => n.trim().toLowerCase() === w); };
const asDay = (v: Value): Day | null => (isDay(v) ? v : typeof v === "string" ? dayFrom(v.trim()) : null);

function same(a: Value, b: Value, cx: Cx): boolean {
  if (empty(a) || empty(b)) return empty(a) && empty(b);
  if (isChoice(a) && !isChoice(b)) return choiceIs(a, text(b, cx));
  if (isChoice(b) && !isChoice(a)) return choiceIs(b, text(a, cx));
  if (isChoice(a) && isChoice(b)) return a.choice === b.choice;
  if (Array.isArray(a) || Array.isArray(b)) return text(a, cx) === text(b, cx);
  if (typeof a === "number" || typeof b === "number") { const [x, y] = [num(a), num(b)]; return !Number.isNaN(x) && !Number.isNaN(y) ? clean(x) === clean(y) : text(a, cx) === text(b, cx); }
  if (isDay(a) || isDay(b)) { const [x, y] = [asDay(a), asDay(b)]; return !!x && !!y && x.day === y.day; }
  if (typeof a === "boolean" || typeof b === "boolean") return truthy(a) === truthy(b);
  return text(a, cx).trim().toLowerCase() === text(b, cx).trim().toLowerCase();
}
/** -1, 0, 1; null when the two can't be put in order. */
function order(a: Value, b: Value, cx: Cx): number | null {
  if (empty(a) || empty(b)) return null;
  if (isDay(a) || isDay(b)) { const [x, y] = [asDay(a), asDay(b)]; return x && y ? Math.sign(x.day - y.day) : null; }
  if (typeof a === "number" || typeof b === "number" || typeof a === "boolean") { const [x, y] = [num(a), num(b)]; return Number.isNaN(x) || Number.isNaN(y) ? null : Math.sign(x - y); }
  return text(a, cx).localeCompare(text(b, cx), cx.lang);
}

const number = (n: number): Value => (Number.isFinite(n) ? clean(n) : null);
const nums = (args: Lazy[]) => args.map((f) => f()).filter((v) => !empty(v)).map(num);
const NUMS = (args: Kind[]) => (args.every((k) => k === "number" || k === "any") ? null : "numbers");

const FUNCTIONS: Record<string, Fn> = {
  if: {
    min: 2, max: 3,
    kind: (a) => (a.length === 2 || a[1] === a[2] ? a[1] : a[1] === "any" ? a[2] : a[2] === "any" ? a[1] : "text"),
    run: ([c, a, b]) => (truthy(c()) ? a() : b ? b() : null),
  },
  and: { min: 1, max: Infinity, kind: () => "boolean", run: (args) => args.every((f) => truthy(f())) },
  or: { min: 1, max: Infinity, kind: () => "boolean", run: (args) => args.some((f) => truthy(f())) },
  not: { min: 1, max: 1, kind: () => "boolean", run: ([a]) => !truthy(a()) },
  empty: { min: 1, max: 1, kind: () => "boolean", run: ([a]) => empty(a()) },
  first: {
    min: 1, max: Infinity,
    kind: (a) => (a.every((k) => k === a[0]) ? a[0] : "text"),
    run: (args) => { for (const f of args) { const v = f(); if (!empty(v)) return v; } return null; },
  },
  round: {
    min: 1, max: 2, kind: () => "number", fits: NUMS,
    run: ([a, d]) => { const v = a(); if (empty(v)) return null; const n = num(v); const k = d ? Math.max(0, Math.min(10, Math.trunc(num(d())))) : 0; const f = 10 ** k; return number((Math.sign(n) * Math.round(Math.abs(n) * f * (1 + Number.EPSILON))) / f); },
  },
  floor: { min: 1, max: 1, kind: () => "number", fits: NUMS, run: ([a]) => (empty(a()) ? null : number(Math.floor(num(a())))) },
  ceil: { min: 1, max: 1, kind: () => "number", fits: NUMS, run: ([a]) => (empty(a()) ? null : number(Math.ceil(num(a())))) },
  abs: { min: 1, max: 1, kind: () => "number", fits: NUMS, run: ([a]) => (empty(a()) ? null : number(Math.abs(num(a())))) },
  sqrt: { min: 1, max: 1, kind: () => "number", fits: NUMS, run: ([a]) => { const n = num(a()); return n < 0 ? null : number(Math.sqrt(n)); } },
  power: { min: 2, max: 2, kind: () => "number", fits: NUMS, run: ([a, b]) => number(num(a()) ** num(b())) },
  sum: { min: 1, max: Infinity, kind: () => "number", fits: NUMS, run: (args) => number(nums(args).reduce((s, n) => s + n, 0)) },
  avg: { min: 1, max: Infinity, kind: () => "number", fits: NUMS, run: (args) => { const n = nums(args); return n.length ? number(n.reduce((s, x) => s + x, 0) / n.length) : null; } },
  min: {
    min: 1, max: Infinity,
    kind: (a) => (a.every((k) => k === "date") ? "date" : "number"),
    fits: (a) => (a.every((k) => k === "date") || a.every((k) => k === "number" || k === "any") ? null : "numbers or days"),
    run: (args) => { const vs = args.map((f) => f()).filter((v) => !empty(v)); if (!vs.length) return null; if (vs.every(isDay)) return { day: Math.min(...vs.map((d) => (d as Day).day)) }; return number(Math.min(...vs.map(num))); },
  },
  max: {
    min: 1, max: Infinity,
    kind: (a) => (a.every((k) => k === "date") ? "date" : "number"),
    fits: (a) => (a.every((k) => k === "date") || a.every((k) => k === "number" || k === "any") ? null : "numbers or days"),
    run: (args) => { const vs = args.map((f) => f()).filter((v) => !empty(v)); if (!vs.length) return null; if (vs.every(isDay)) return { day: Math.max(...vs.map((d) => (d as Day).day)) }; return number(Math.max(...vs.map(num))); },
  },
  len: { min: 1, max: 1, kind: () => "number", run: ([a], cx) => { const v = a(); return Array.isArray(v) ? v.length : [...text(v, cx)].length; } },
  upper: { min: 1, max: 1, kind: () => "text", run: ([a], cx) => text(a(), cx).toUpperCase() },
  lower: { min: 1, max: 1, kind: () => "text", run: ([a], cx) => text(a(), cx).toLowerCase() },
  trim: { min: 1, max: 1, kind: () => "text", run: ([a], cx) => text(a(), cx).trim().replace(/\s+/g, " ") },
  left: { min: 2, max: 2, kind: () => "text", run: ([a, n], cx) => [...text(a(), cx)].slice(0, Math.max(0, Math.trunc(num(n())) || 0)).join("") },
  right: { min: 2, max: 2, kind: () => "text", run: ([a, n], cx) => { const k = Math.max(0, Math.trunc(num(n())) || 0); return k ? [...text(a(), cx)].slice(-k).join("") : ""; } },
  contains: {
    min: 2, max: 2, kind: () => "boolean",
    run: ([a, b], cx) => {
      const v = a();
      const w = text(b(), cx);
      if (!w.trim()) return false;
      if (Array.isArray(v)) return v.some((c) => choiceIs(c, w));
      if (isChoice(v)) return choiceIs(v, w);
      return text(v, cx).toLowerCase().includes(w.toLowerCase());
    },
  },
  replace: { min: 3, max: 3, kind: () => "text", run: ([a, b, c], cx) => { const from = text(b(), cx); return from ? text(a(), cx).split(from).join(text(c(), cx)).slice(0, LIMITS.text) : text(a(), cx); } },
  concat: { min: 1, max: Infinity, kind: () => "text", run: (args, cx) => args.map((f) => text(f(), cx)).join("").slice(0, LIMITS.text) },
  text: { min: 1, max: 1, kind: () => "text", run: ([a], cx) => text(a(), cx) },
  number: { min: 1, max: 1, kind: () => "number", run: ([a]) => { const v = a(); return empty(v) ? null : number(num(v)); } },
  today: { min: 0, max: 0, kind: () => "date", run: (_a, cx) => cx.today() },
  days: {
    min: 2, max: 2, kind: () => "number",
    fits: (a) => (a.every((k) => k === "date" || k === "text" || k === "any") ? null : "two days"),
    run: ([a, b]) => { const [x, y] = [asDay(a()), asDay(b())]; return x && y ? y.day - x.day : null; },
  },
  adddays: {
    min: 2, max: 2, kind: () => "date",
    fits: (a) => ((a[0] === "date" || a[0] === "text" || a[0] === "any") && (a[1] === "number" || a[1] === "any") ? null : "a day and a number"),
    run: ([a, n]) => { const d = asDay(a()); const k = num(n()); return d && Number.isFinite(k) ? { day: d.day + Math.trunc(k) } : null; },
  },
  year: { min: 1, max: 1, kind: () => "number", run: ([a]) => { const d = asDay(a()); return d ? dayParts(d).y : null; } },
  month: { min: 1, max: 1, kind: () => "number", run: ([a]) => { const d = asDay(a()); return d ? dayParts(d).m : null; } },
  day: { min: 1, max: 1, kind: () => "number", run: ([a]) => { const d = asDay(a()); return d ? dayParts(d).d : null; } },
  /** 0 Sunday … 6 Saturday. */
  weekday: { min: 1, max: 1, kind: () => "number", run: ([a]) => { const d = asDay(a()); return d ? dayParts(d).w : null; } },
};
/** The functions an equation may call (the editor lists them). */
export const FORMULA_FUNCTIONS = Object.keys(FUNCTIONS);

/* ---------------- Checking ---------------- */

/**
 * What an equation gives, checked against the table's fields: the kind of its answer, or a FormulaError. `kinds`:
 * the kind each field it may read holds (a computed field's own answer included); one not there isn't the table's.
 */
export function formulaKind(ast: Ast, kinds: ReadonlyMap<string, Kind>, refused: ReadonlyMap<string, FieldType> = new Map()): Kind {
  const of = (n: Ast): Kind => {
    switch (n.t) {
      case "num": return "number";
      case "str": return "text";
      case "bool": return "boolean";
      case "field": {
        const k = kinds.get(n.id);
        if (k) return k;
        const no = refused.get(n.id);
        if (no === "relation") fail(`"${n.id}" links rows: add a rollup field for it and use that`, `«${n.id}» بيربط سطور: ضيف حقل «مجموع من جدول مربوط» واستعمله`, `"${n.id}" מקשר שורות: הוסיפו שדה סיכום והשתמשו בו`);
        if (no) fail(`A formula can't read "${n.id}" (its kind)`, `المعادلة ما بتقدر تقرأ «${n.id}» (نوعه)`, `משוואה לא יכולה לקרוא את "${n.id}" (סוגו)`);
        return fail(`No field "${n.id}" in this table`, `ما في حقل «${n.id}» بهالجدول`, `אין שדה "${n.id}" בטבלה הזו`);
      }
      case "neg": {
        const k = of(n.a);
        if (k !== "number" && k !== "any") fail("Only a number takes a minus sign", "بس الرقم بياخد إشارة ناقص", "רק מספר מקבל סימן מינוס");
        return "number";
      }
      case "not": of(n.a); return "boolean";
      case "bin": {
        const [a, b] = [of(n.a), of(n.b)];
        if (n.op === "&") return "text";
        if (n.op === "and" || n.op === "or") return "boolean";
        if (n.op === "=" || n.op === "!=" || n.op === "<" || n.op === "<=" || n.op === ">" || n.op === ">=") return "boolean";
        const numeric = (k: Kind) => k === "number" || k === "any";
        // A day and a number of days, or two days apart.
        if (n.op === "+" && ((a === "date" && numeric(b)) || (numeric(a) && b === "date"))) return "date";
        if (n.op === "-" && a === "date" && numeric(b)) return "date";
        if (n.op === "-" && a === "date" && b === "date") return "number";
        if (!numeric(a) || !numeric(b)) {
          if (n.op === "+" && (a === "text" || b === "text")) fail('Words are joined with &, not +: first & " " & last', 'الكلام بينربط بـ & مش +: first & " " & last', 'מילים מחוברות ב-& ולא ב-+: first & " " & last');
          fail(`"${n.op}" works on numbers (and days)`, `«${n.op}» بيشتغل على أرقام (وتواريخ)`, `"${n.op}" פועל על מספרים (ותאריכים)`);
        }
        return "number";
      }
      case "call": {
        const fn = FUNCTIONS[n.fn];
        const args = n.args.map(of);
        const wrong = fn.fits?.(args);
        if (wrong) fail(`${n.fn}() takes ${wrong}`, `${n.fn}() بتاخد ${wrong === "numbers" ? "أرقام" : wrong === "two days" ? "تاريخين" : wrong === "a day and a number" ? "تاريخ ورقم" : "أرقام أو تواريخ"}`, `${n.fn}() מקבלת ${wrong === "numbers" ? "מספרים" : wrong === "two days" ? "שני תאריכים" : wrong === "a day and a number" ? "תאריך ומספר" : "מספרים או תאריכים"}`);
        return fn.kind(args);
      }
    }
  };
  return of(ast);
}

/** The answer's kind as a field keeps it (a day, a number, yes/no; anything else as words). */
export const resultOf = (k: Kind): FormulaResult => (k === "number" ? "number" : k === "boolean" ? "boolean" : k === "date" ? "date" : "text");
/** May an answer of kind `k` be kept as `result`? (Anything can be words; a number can be money.) */
export const resultFits = (k: Kind, result: FormulaResult) => result === "text" || k === "any" || (result === "money" ? k === "number" : resultOf(k) === result);

/* ---------------- Working out ---------------- */

const ZONE_TODAY = new Map<string, { at: number; day: Day }>();
/** Today in the store's zone (read once a minute). */
export function storeToday(now = Date.now()): Day {
  const zone = storeZone();
  const kept = ZONE_TODAY.get(zone);
  if (kept && now - kept.at < 60_000) return kept.day;
  const day = dayFrom(dayOf(new Date(now), zone)) ?? { day: Math.floor(now / MS) };
  ZONE_TODAY.set(zone, { at: now, day });
  return day;
}

/** A row's value as an equation reads it, in one language. */
export function readValue(f: Field, raw: unknown, lang: Lang): Value {
  if (raw === undefined || raw === null || raw === "") return null;
  const kind = fieldKind(f);
  switch (kind) {
    case "number": return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    case "boolean": return raw === true;
    case "date": {
      if (typeof raw !== "string") return null;
      // A moment is the store's day it falls on.
      return f.type === "datetime" || f.result === "datetime" ? dayFrom(dayOf(raw)) : dayFrom(raw);
    }
    case "choice": {
      if (typeof raw !== "string") return null;
      const o = f.options?.find((x) => x.id === raw);
      const names = Object.values(o?.name ?? {}).filter((x): x is string => typeof x === "string" && !!x.trim());
      return { choice: raw, names, shown: o?.name?.[lang] || o?.name?.ar || o?.name?.en || o?.name?.he || raw };
    }
    case "choices":
      return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").map((id) => readValue({ ...f, type: "select" }, id, lang) as Choice) : null;
    case "text": {
      let words: string | null = null;
      if (typeof raw === "string") words = raw;
      else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const o = raw as Record<string, unknown>;
        for (const l of [lang, ...FORMULA_LANGS]) if (typeof o[l] === "string" && (o[l] as string).trim()) { words = o[l] as string; break; }
      }
      if (words === null) return null;
      return f.type === "richText" ? plainWords(words) : words;
    }
    default: return null;
  }
}

/** Formatted words as plain ones (marks and link addresses off): what an equation, a search or a preview reads. */
export function plainWords(md: string): string {
  return md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,3}|>|[-*]|\d{1,3}[.)])\s+/gm, "")
    .replace(/(\*\*|__|~~|`)/g, "")
    .replace(/(^|[^\w*])\*(?!\s)([^*]+?)\*(?!\w)/g, "$1$2")
    .replace(/(^|[^\w_])_(?!\s)([^_]+?)_(?!\w)/g, "$1$2");
}

/** Works an equation out for one row: `get` gives a field's value as read in `lang`. */
export function runFormula(ast: Ast, get: (id: string) => Value, cx: Cx): Value {
  const run = (n: Ast): Value => {
    switch (n.t) {
      case "num": return n.v;
      case "str": return n.v;
      case "bool": return n.v;
      case "field": return get(n.id);
      case "neg": { const v = run(n.a); return empty(v) ? null : number(-num(v)); }
      case "not": return !truthy(run(n.a));
      case "bin": {
        if (n.op === "and") return truthy(run(n.a)) && truthy(run(n.b));
        if (n.op === "or") return truthy(run(n.a)) || truthy(run(n.b));
        const [a, b] = [run(n.a), run(n.b)];
        switch (n.op) {
          case "&": return (text(a, cx) + text(b, cx)).slice(0, LIMITS.text);
          case "=": return same(a, b, cx);
          case "!=": return !same(a, b, cx);
          case "<": { const o = order(a, b, cx); return o !== null && o < 0; }
          case "<=": { const o = order(a, b, cx); return o !== null && o <= 0; }
          case ">": { const o = order(a, b, cx); return o !== null && o > 0; }
          case ">=": { const o = order(a, b, cx); return o !== null && o >= 0; }
          default: break;
        }
        // A day and days.
        const [da, db] = [isDay(a) ? a : null, isDay(b) ? b : null];
        if (n.op === "+" && (da || db)) { if (da && db) return null; const d = (da ?? db)!; const k = num(da ? b : a); return Number.isFinite(k) ? { day: d.day + Math.trunc(k) } : null; }
        if (n.op === "-" && da) { if (db) return da.day - db.day; const k = num(b); return Number.isFinite(k) ? { day: da.day - Math.trunc(k) } : null; }
        const [x, y] = [num(a), num(b)];
        if (Number.isNaN(x) || Number.isNaN(y)) return null;
        if (n.op === "+") return number(x + y);
        if (n.op === "-") return number(x - y);
        if (n.op === "*") return number(x * y);
        if (n.op === "/") return y === 0 ? null : number(x / y);
        return y === 0 ? null : number(x % y);
      }
      case "call": return FUNCTIONS[n.fn].run(n.args.map((a) => () => run(a)), cx);
    }
  };
  return run(ast);
}

/** An answer as the field keeps it: a number, words per language, yes/no or a day ("2026-11-19"); null: empty. */
export function keptValue(v: Value, result: FormulaResult, cx: Cx): number | string | boolean | null {
  if (empty(v)) return result === "boolean" ? false : null;
  switch (result) {
    case "number":
    case "money": { const n = num(v); return Number.isFinite(n) ? clean(n) : null; }
    case "boolean": return truthy(v);
    case "date": { const d = asDay(v); return d ? dayText(d) : null; }
    case "text": { const t = text(v, cx); return t.trim() ? t : null; }
  }
}
