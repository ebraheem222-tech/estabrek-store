/**
 * Fields no row writes (item 6), worked out each time rows are read, so they are never old:
 *
 *  - a formula (lib/formula.ts): an equation over the row's other fields, other computed ones included;
 *  - a rollup: worked out from the rows a relation links. Either through one of this table's relations
 *    (`via`: an order's lines), or from the other side (`from` + `via`: the posts whose author is this row).
 *    How many (`count`), or the sum, average, smallest or biggest of a field there (`of`); only the published
 *    ones when `published`. A store table's rows (products, orders…) can only be counted.
 *
 * A rollup is one piece of SQL on the row "i", so the database also sorts and filters by it (lib/dataQuery.ts).
 * A formula is worked out here, after the rollups; it is shown, never sorted or filtered by.
 *
 * `settleComputed` checks them when a table is saved (what each reads is there, no formula reads itself in a loop)
 * and writes down what each gives (`result`, and a currency for money), so every reader knows without looking.
 */
import { Prisma } from "@prisma/client";
import { isComputed, type ComputedResult, type Field } from "./collectionTree.js";
import { FORMULA_LANGS, FORMULA_RESULTS, FormulaError, fieldKind, formulaKind, formulaRefs, keptValue, parseFormula, readValue, resultFits, resultOf, runFormula, storeToday, type Ast, type FormulaResult, type Kind, type Value } from "./formula.js";
import { linkedRowsSql, storeTarget } from "./storeLinks.js";

export const ROLLUP_CALCS = ["count", "sum", "avg", "min", "max"] as const;
export type RollupCalc = (typeof ROLLUP_CALCS)[number];
/** Fields of the linked table a rollup may work on, per what it works out. */
const ROLLUP_OF: Record<Exclude<RollupCalc, "count">, readonly string[]> = { sum: ["number", "money"], avg: ["number", "money"], min: ["number", "money", "date", "datetime"], max: ["number", "money", "date", "datetime"] };

type Raw = { $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T> };
type Tables = { collection: { findMany: (args: { where: { id: { in: string[] } }; select: { id: true; fields: true } }) => Promise<Array<{ id: string; fields: unknown }>> } };
const fieldsOf = (c: { fields: unknown } | undefined | null) => (Array.isArray(c?.fields) ? c!.fields : []) as Field[];

export const computedOf = (fields: Field[]) => fields.filter(isComputed);
export const hasComputed = (fields: Field[]) => fields.some(isComputed);

/* ---------------- A rollup as SQL ---------------- */

/** Where a rollup reads: the linked table, and whether through this table's relation or from the other side. */
type Reach = { to: string; back: boolean };
function reachOf(fields: Field[], f: Field): Reach | null {
  if (f.type !== "rollup" || !f.via) return null;
  if (f.from) return { to: f.from, back: true };
  const rel = fields.find((x) => x.id === f.via && x.type === "relation");
  return rel?.to ? { to: rel.to, back: false } : null;
}

const numOf = (of: string) => Prisma.sql`(CASE WHEN jsonb_typeof(lt."data"->${of}::text) = 'number' THEN (lt."data"->>${of}::text)::numeric END)`;

/**
 * A rollup's value for the row "i", as SQL: a number (count, sum, average, the smallest or biggest number), or words
 * (the smallest or biggest day or moment, as kept). null: nothing to work out from, or it no longer fits.
 */
export function rollupSql(fields: Field[], f: Field): Prisma.Sql {
  const reach = reachOf(fields, f);
  const calc = f.calc ?? "count";
  if (!reach || (calc !== "count" && !f.of)) return Prisma.sql`NULL`;
  const store = storeTarget(reach.to);
  if (store && (calc !== "count" || reach.back)) return Prisma.sql`NULL`;
  const what =
    calc === "count"
      ? Prisma.sql`count(*)::float8`
      : f.result === "date" || f.result === "datetime"
        ? Prisma.sql`${Prisma.raw(calc === "min" ? "min" : "max")}(NULLIF(lt."data"->>${f.of!}::text, ''))`
        : calc === "sum"
          ? Prisma.sql`COALESCE(sum(${numOf(f.of!)}), 0)::float8`
          : Prisma.sql`${Prisma.raw(calc)}(${numOf(f.of!)})::float8`;
  const published = f.published && !store ? Prisma.sql` AND lt."status" = 'PUBLISHED'` : Prisma.empty;
  if (reach.back)
    return Prisma.sql`(SELECT ${what} FROM "CollectionLink" lk JOIN "CollectionItem" lt ON lt."id" = lk."fromId" AND lt."collectionId" = lk."collectionId" AND lt."deletedAt" IS NULL${published} WHERE lk."collectionId" = ${reach.to} AND lk."fieldId" = ${f.via!} AND lk."toTable" = i."collectionId" AND lk."toId" = i."id")`;
  return Prisma.sql`(SELECT ${what} ${linkedRowsSql(reach.to)} AND lk."collectionId" = i."collectionId" AND lk."fieldId" = ${f.via!} AND lk."fromId" = i."id"${published})`;
}

/* ---------------- Reading rows ---------------- */

/** A formula read once per table (and kept while its words stay the same). */
const READ = new Map<string, Ast | null>();
function astOf(src: string | undefined): Ast | null {
  if (!src) return null;
  if (READ.has(src)) return READ.get(src)!;
  let ast: Ast | null = null;
  try { ast = parseFormula(src); } catch { ast = null; }
  if (READ.size > 2000) READ.clear();
  READ.set(src, ast);
  return ast;
}

/** The formulas in the order they can be worked out (one reading another comes after it); one caught in a loop is left out. */
export function formulaOrder(fields: Field[]): Field[] {
  const formulas = fields.filter((f) => f.type === "formula");
  const byId = new Map(formulas.map((f) => [f.id, f]));
  const out: Field[] = [];
  const state = new Map<string, 1 | 2>();
  const visit = (f: Field): boolean => {
    const s = state.get(f.id);
    if (s === 2) return true;
    if (s === 1) return false;
    state.set(f.id, 1);
    const ast = astOf(f.formula);
    const ok = !!ast && formulaRefs(ast).every((id) => { const dep = byId.get(id); return !dep || visit(dep); });
    state.set(f.id, 2);
    if (ok) out.push(f);
    return ok;
  };
  formulas.forEach(visit);
  return out;
}

export type ComputeView = { /** A linked table the reader may not see: its rollups are left empty. */ table?: (id: string) => boolean };

/**
 * Rows with their computed fields worked out (into `data`, over anything kept there under the same id). Rollups
 * first, in one question for all the rows; then each formula, in order. `table`: the rows' table and its fields.
 */
export async function withComputed<T extends { id: string; data: unknown }>(db: Raw, table: { id: string; fields: Field[] }, rows: T[], view: ComputeView = {}): Promise<T[]> {
  const computed = computedOf(table.fields);
  if (!computed.length || !rows.length) return rows;
  const rollups = computed.filter((f) => f.type === "rollup");
  const sums = new Map<string, Record<string, unknown>>();
  if (rollups.length) {
    const cols = rollups.map((f, k) => {
      const reach = reachOf(table.fields, f);
      const closed = !!reach && !storeTarget(reach.to) && !!view.table && !view.table(reach.to);
      return Prisma.sql`${closed ? Prisma.sql`NULL` : rollupSql(table.fields, f)} AS ${Prisma.raw(`"r${k}"`)}`;
    });
    const got = await db.$queryRaw<Array<Record<string, unknown> & { id: string }>>(Prisma.sql`SELECT i."id", ${Prisma.join(cols)} FROM "CollectionItem" i WHERE i."id" = ANY(${rows.map((r) => r.id)}::text[])`);
    for (const r of got) sums.set(r.id, Object.fromEntries(rollups.map((f, k) => [f.id, r[`r${k}`]])));
  }
  const order = formulaOrder(table.fields);
  const byId = new Map(table.fields.map((f) => [f.id, f]));
  const today = storeToday();
  return rows.map((row) => {
    const data: Record<string, unknown> = { ...(row.data && typeof row.data === "object" && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : {}) };
    for (const f of rollups) {
      const v = sums.get(row.id)?.[f.id];
      if (typeof v === "number" && Number.isFinite(v)) data[f.id] = Number(v.toPrecision(12));
      else if (typeof v === "string" && v) data[f.id] = v;
      else delete data[f.id];
    }
    for (const f of computed) if (f.type === "formula") delete data[f.id];
    for (const f of order) {
      const ast = astOf(f.formula)!;
      const result = (FORMULA_RESULTS as readonly string[]).includes(f.result ?? "") ? (f.result as FormulaResult) : "number";
      const get = (lang: (typeof FORMULA_LANGS)[number]) => (id: string): Value => { const src = byId.get(id); return src ? readValue(src, data[id], lang) : null; };
      if (result === "text") {
        // Words: worked out in each language (a choice's name, a text's words in that language).
        const words: Record<string, string> = {};
        for (const lang of FORMULA_LANGS) {
          const cx = { lang, today: () => today };
          const v = keptValue(runFormula(ast, get(lang), cx), "text", cx);
          if (typeof v === "string") words[lang] = v;
        }
        if (Object.keys(words).length) data[f.id] = words;
      } else {
        const cx = { lang: "ar" as const, today: () => today };
        const v = keptValue(runFormula(ast, get("ar"), cx), result, cx);
        if (v !== null) data[f.id] = v;
      }
    }
    return { ...row, data };
  });
}

/* ---------------- Saving a table ---------------- */

export type ComputedProblem = { path: string; message: string; say?: { ar: string; he: string } };
const problem = (index: number, part: string, message: string, ar: string, he: string): { problem: ComputedProblem } => ({ problem: { path: `fields.${index}.${part}`, message, say: { ar, he } } });

/**
 * A table's fields about to be saved, its computed ones checked and settled: each rollup reaches a relation that
 * is there and a field it can work on, each formula reads fields that are there without a loop. Each is given what
 * it gives (`result`; money's currency). `self`: the table's id (none for a new one: nothing links it yet).
 */
export async function settleComputed(db: Tables, fields: Field[], self?: string): Promise<{ fields: Field[] } | { problem: ComputedProblem }> {
  if (!hasComputed(fields)) return { fields };
  const out = fields.map((f) => ({ ...f }));
  // The tables rollups reach.
  const wanted = new Set<string>();
  for (const f of out) {
    if (f.type !== "rollup") continue;
    const reach = reachOf(out, f);
    if (reach && !storeTarget(reach.to) && reach.to !== self) wanted.add(reach.to);
  }
  const there = new Map((wanted.size ? await db.collection.findMany({ where: { id: { in: [...wanted] } }, select: { id: true, fields: true } }) : []).map((c) => [c.id, fieldsOf(c)]));
  if (self) there.set(self, out);

  for (const [index, f] of out.entries()) {
    if (f.type !== "rollup") continue;
    const calc = f.calc ?? "count";
    if (!(ROLLUP_CALCS as readonly string[]).includes(calc)) return problem(index, "calc", "count, sum, avg, min or max", "عدد، مجموع، معدّل، أصغر أو أكبر", "ספירה, סכום, ממוצע, מינימום או מקסימום");
    let target: Field[] | undefined;
    if (f.from) {
      if (!self) return problem(index, "from", "Nothing links a new table yet: save it first", "ما في شي بيربط جدول جديد لسا: احفظه أول", "שום דבר עדיין לא מקשר לטבלה חדשה: שמרו אותה קודם");
      target = there.get(f.from);
      const rel = target?.find((x) => x.id === f.via);
      if (!target || rel?.type !== "relation" || rel.to !== self) return problem(index, "via", "That relation doesn't link this table", "هالربط ما بيربط هالجدول", "הקשר הזה לא מקשר לטבלה הזו");
    } else {
      const rel = out.find((x) => x.id === f.via);
      if (rel?.type !== "relation" || !rel.to) return problem(index, "via", "A rollup reads through one of the table's relations", "المجموع بيقرأ من خلال ربط من روابط الجدول", "סיכום קורא דרך אחד הקשרים של הטבלה");
      if (storeTarget(rel.to)) {
        if (calc !== "count") return problem(index, "calc", "The store's rows can only be counted", "سطور المتجر بتنعدّ بس", "את שורות החנות אפשר רק לספור");
        if (f.published) return problem(index, "published", "The store's rows have no published or draft here", "سطور المتجر ما إلها منشور ومسودة هون", "לשורות החנות אין כאן פורסם וטיוטה");
        out[index] = { ...f, calc, result: "number", of: undefined, currency: undefined };
        continue;
      }
      target = there.get(rel.to);
      if (!target) return problem(index, "via", "The table it links isn't there", "الجدول المربوط مش موجود", "הטבלה המקושרת לא קיימת");
    }
    if (calc === "count") {
      out[index] = { ...f, calc, result: "number", of: undefined, currency: undefined };
      continue;
    }
    const of = target.find((x) => x.id === f.of);
    if (!of) return problem(index, "of", "Choose the field to work out", "اختار الحقل اللي بينحسب", "בחרו את השדה לחישוב");
    if (isComputed(of)) return problem(index, "of", "A rollup works on kept values, not on another computed field", "المجموع بيشتغل على قيم محفوظة، مش على حقل محسوب تاني", "סיכום עובד על ערכים שמורים, לא על שדה מחושב אחר");
    if (!ROLLUP_OF[calc].includes(of.type)) return problem(index, "of", calc === "sum" || calc === "avg" ? "A sum or an average is of numbers or money" : "The smallest or biggest is of numbers, money or dates", calc === "sum" || calc === "avg" ? "المجموع والمعدّل لأرقام أو مبالغ" : "الأصغر والأكبر لأرقام أو مبالغ أو تواريخ", calc === "sum" || calc === "avg" ? "סכום וממוצע הם של מספרים או סכומי כסף" : "מינימום ומקסימום הם של מספרים, כסף או תאריכים");
    const result: ComputedResult = of.type === "money" ? "money" : of.type === "date" ? "date" : of.type === "datetime" ? "datetime" : "number";
    out[index] = { ...f, calc, result, ...(result === "money" ? { currency: of.currency ?? "ILS" } : { currency: undefined }) };
  }

  // Formulas: what each reads, and what it gives (the rollups' answers are known now).
  const kinds = new Map<string, Kind>();
  const refused = new Map<string, Field["type"]>();
  for (const f of out) {
    if (f.type === "formula") continue;
    const k = fieldKind(f);
    if (k) kinds.set(f.id, k);
    else refused.set(f.id, f.type);
  }
  const formulas = out.map((f, index) => ({ f, index })).filter((x) => x.f.type === "formula");
  const asts = new Map<string, Ast>();
  for (const { f, index } of formulas) {
    try {
      asts.set(f.id, parseFormula(f.formula ?? ""));
    } catch (e) {
      if (e instanceof FormulaError) return { problem: { path: `fields.${index}.formula`, message: e.message, say: e.say } };
      throw e;
    }
  }
  // In an order that reads each formula's own answer before it is read (a loop is said, by the field caught in it).
  const done = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string): ComputedProblem | null => {
    if (done.has(id)) return null;
    const at = formulas.find((x) => x.f.id === id)!;
    if (visiting.has(id)) return { path: `fields.${at.index}.formula`, message: `"${id}" reads itself (through other formulas)`, say: { ar: `«${id}» بيقرأ حاله (عن طريق معادلات تانية)`, he: `"${id}" קורא את עצמו (דרך משוואות אחרות)` } };
    visiting.add(id);
    for (const ref of formulaRefs(asts.get(id)!)) if (asts.has(ref)) { const p = visit(ref); if (p) return p; }
    visiting.delete(id);
    try {
      const k = formulaKind(asts.get(id)!, kinds, refused);
      const asked = at.f.result as FormulaResult | undefined;
      if (asked && !(FORMULA_RESULTS as readonly string[]).includes(asked)) return { path: `fields.${at.index}.result`, message: "number, money, text, boolean or date" };
      if (asked && !resultFits(k, asked)) return { path: `fields.${at.index}.result`, message: `The equation gives ${k === "date" ? "a date" : k === "boolean" ? "yes or no" : k === "number" ? "a number" : "words"}`, say: { ar: `المعادلة بتعطي ${k === "date" ? "تاريخ" : k === "boolean" ? "نعم أو لا" : k === "number" ? "رقم" : "كلام"}`, he: `המשוואה נותנת ${k === "date" ? "תאריך" : k === "boolean" ? "כן או לא" : k === "number" ? "מספר" : "מילים"}` } };
      const result = asked ?? resultOf(k);
      out[at.index] = { ...at.f, result, ...(result === "money" ? { currency: at.f.currency ?? "ILS" } : { currency: undefined }) };
      kinds.set(id, k === "any" ? "any" : (fieldKind(out[at.index]) ?? "any"));
    } catch (e) {
      if (e instanceof FormulaError) return { path: `fields.${at.index}.formula`, message: e.message, say: e.say };
      throw e;
    }
    done.add(id);
    return null;
  };
  for (const { f } of formulas) {
    const p = visit(f.id);
    if (p) return { problem: p };
  }
  return { fields: out.map(strip) };
}

/** A field without the parts it doesn't use (an undefined left by a change isn't kept). */
const strip = (f: Field): Field => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as Field;

/** The fields a formula reads, through other formulas too (one reading a private field is as private). */
export function formulaReads(fields: Field[], f: Field): Set<string> {
  const out = new Set<string>();
  const byId = new Map(fields.map((x) => [x.id, x]));
  const walk = (x: Field) => {
    const ast = astOf(x.formula);
    if (!ast) return;
    for (const id of formulaRefs(ast)) {
      if (out.has(id)) continue;
      out.add(id);
      const dep = byId.get(id);
      if (dep?.type === "formula") walk(dep);
    }
  };
  walk(f);
  return out;
}

/** Try an equation on a table's fields (the editor's check): what it gives, or what's wrong. */
export function tryFormula(fields: Field[], src: string): { ok: true; result: FormulaResult; reads: string[] } | { ok: false; message: string; say?: { ar: string; he: string }; at: number | null } {
  try {
    const ast = parseFormula(src);
    const kinds = new Map<string, Kind>();
    const refused = new Map<string, Field["type"]>();
    for (const f of fields) {
      const k = fieldKind(f);
      if (k) kinds.set(f.id, k);
      else refused.set(f.id, f.type);
    }
    return { ok: true, result: resultOf(formulaKind(ast, kinds, refused)), reads: formulaRefs(ast) };
  } catch (e) {
    if (e instanceof FormulaError) return { ok: false, message: e.message, say: e.say, at: e.at };
    throw e;
  }
}
