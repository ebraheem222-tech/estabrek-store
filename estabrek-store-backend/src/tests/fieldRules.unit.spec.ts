import { describe, expect, test } from "vitest";
import { FIELD_TYPES, type Field } from "../lib/collectionTree.js";
import { CollectionBody, FieldSchema, checkItemData, withDefaults } from "../lib/collections.js";
import { RULES_BY_TYPE, lettersIn, patternProblem, ruleIssue, rulesProblem, uniqueKeys } from "../lib/fieldRules.js";
import { patchData, same } from "../lib/dataRows.js";

// A field's rules (B2): the only value, limits, a shape, a default, the owner's words when one
// fails. Without a database ("the only value" against the table is in fieldRules.spec.ts).

const field = (over: Partial<Field> & { id: string; type: Field["type"] }): Field => ({ ...over });
const save = (f: unknown) => {
  const r = FieldSchema.safeParse(f);
  return r.success ? r.data : r.error.issues[0].message;
};

describe("The owner's own pattern", () => {
  test("ordinary patterns pass", () => {
    for (const ok of ["^[A-Z]{2}-\\d{4}$", "^(ab|cd)$", "^\\d+$", "^(?:a|b)c+$", "(ab)?c+", "^(a+)?$", "[(+)*]+x", "\\(a+\\)+", "^(\\p{L}+) (\\p{L}+)$", "^(a{1})$"]) expect(patternProblem(ok), ok).toBeNull();
  });

  test("patterns that can take forever on a crafted value are refused, with why", () => {
    for (const bad of ["(a+)+", "(a|ab)*", "(\\d+)*x", "((a+))+", "(a{2,})+", "^(\\w+\\s?)*$", "(a|b|c)+"]) expect(patternProblem(bad), bad).toBe("A repeated group can't hold a repeat or a choice");
    expect(patternProblem("(a)\\1")).toBe("A pattern can't refer back to a group");
    expect(patternProblem("(?<=a)b")).toBe("A pattern can't look behind");
    expect(patternProblem("[a-")).toBe("The pattern isn't a valid regular expression");
    expect(patternProblem("a".repeat(201))).toContain("200");
    expect(patternProblem("")).toContain("200");
  });
});

describe("A field's rules", () => {
  test("every kind of field says which rules fit it", () => {
    for (const t of FIELD_TYPES) expect(RULES_BY_TYPE[t], t).toBeTruthy();
    expect(RULES_BY_TYPE.text).toEqual({ unique: true, limits: "length", shape: true, default: true });
    expect(RULES_BY_TYPE.image.default).toBe(false);
  });

  test("rules that don't fit the field, or each other, are refused when the table is saved", () => {
    expect(rulesProblem(field({ id: "a", type: "boolean", unique: true }))).toContain("only value");
    expect(rulesProblem(field({ id: "a", type: "number", shape: "email" }))).toContain("short words");
    expect(rulesProblem(field({ id: "a", type: "text", shape: "email", pattern: "^a$" }))).toContain("not both");
    expect(rulesProblem(field({ id: "a", type: "text", pattern: "(a+)+" }))).toContain("repeated group");
    expect(rulesProblem(field({ id: "a", type: "select", min: 1 }))).toContain("no limits");
    expect(rulesProblem(field({ id: "a", type: "number", min: 10, max: 5 }))).toContain("above the largest");
    expect(rulesProblem(field({ id: "a", type: "number", min: "2026-01-01" }))).toBe("Limits are numbers");
    expect(rulesProblem(field({ id: "a", type: "text", min: -1 }))).toContain("whole number");
    expect(rulesProblem(field({ id: "a", type: "text", max: 2.5 }))).toContain("whole number");
    expect(rulesProblem(field({ id: "a", type: "date", min: "13/11/2026" }))).toContain("2026-11-13");
    expect(rulesProblem(field({ id: "a", type: "date", min: "2026-12-01", max: "2026-11-01" }))).toContain("after the last");
    expect(rulesProblem(field({ id: "a", type: "image", default: "/a.jpg" }))).toContain("no default");
    expect(rulesProblem(field({ id: "a", type: "text", unique: true, min: 2, max: 40, shape: "slug" }))).toBeNull();
    expect(rulesProblem(field({ id: "a", type: "date", min: "2026-01-01", max: "2026-12-31", unique: true }))).toBeNull();
  });

  test("a value against its field's limits and shape", () => {
    const price = field({ id: "price", type: "number", min: 0, max: 1000 });
    expect([ruleIssue(price, -1), ruleIssue(price, 0), ruleIssue(price, 1000), ruleIssue(price, 1000.5)]).toEqual(["Too small", null, null, "Too big"]);
    const day = field({ id: "day", type: "date", min: "2026-01-01", max: "2026-12-31" });
    expect([ruleIssue(day, "2025-12-31"), ruleIssue(day, "2026-06-01"), ruleIssue(day, "2027-01-01")]).toEqual(["Too early", null, "Too late"]);
    const name = field({ id: "name", type: "text", min: 3, max: 6 });
    expect(ruleIssue(name, { en: "ab" })).toBe("Too short");
    expect(ruleIssue(name, { en: "abc", ar: "مَرْحَبًا" })).toBeNull();
    expect(ruleIssue(name, { en: "abcdefg" })).toBe("Too long");
    // Every language written has to pass; empty ones don't count.
    expect(ruleIssue(name, { en: "abcd", ar: "اب", he: "  " })).toBe("Too short");
    expect(lettersIn("مَرْحَبًا")).toBe(5);
    expect(lettersIn("👩‍👩‍👧 ok")).toBe(4);
    const shapes: Array<[NonNullable<Field["shape"]>, string, string]> = [["email", "sara@example.test", "sara@"], ["phone", "+970 599 000 001", "phone"], ["url", "https://shop.test/a", "http://shop.test"], ["letters", "سارة Al-Ali", "sara2"], ["digits", "00123", "12a"], ["slug", "spring-sale-2", "Spring Sale"]];
    for (const [shape, good, bad] of shapes) {
      const f = field({ id: "x", type: "text", shape });
      expect(ruleIssue(f, { en: good }), `${shape}: ${good}`).toBeNull();
      expect(ruleIssue(f, { en: bad }), `${shape}: ${bad}`).toBe("Not the asked shape");
    }
    const code = field({ id: "code", type: "text", pattern: "^[A-Z]{2}-\\d{3}$" });
    expect([ruleIssue(code, { en: "AB-123" }), ruleIssue(code, { en: "ab-123" }), ruleIssue(code, { en: " AB-123 " })]).toEqual([null, "Not the asked shape", null]);
  });

  test("what counts as the same value for \"the only one\"", () => {
    expect(uniqueKeys(field({ id: "a", type: "text" }), { en: " Spring ", ar: "الربيع", he: "" })).toEqual(["spring", "الربيع"]);
    expect(uniqueKeys(field({ id: "a", type: "number" }), 12.5)).toEqual(["12.5"]);
    expect(uniqueKeys(field({ id: "a", type: "date" }), "2026-11-13")).toEqual(["2026-11-13"]);
    expect(uniqueKeys(field({ id: "a", type: "number" }), undefined)).toEqual([]);
    expect(uniqueKeys(field({ id: "a", type: "text" }), "plain")).toEqual([]);
  });
});

describe("Saving a table's fields", () => {
  test("rules are kept; a default is kept the way the field holds values; an empty one is no default", () => {
    expect(save({ id: "price", type: "number", min: 0, max: 1000, default: 10, unique: true, message: { ar: "السعر بين 0 و 1000" }, help: { en: "In shekels" } })).toEqual({ id: "price", type: "number", min: 0, max: 1000, default: 10, unique: true, message: { ar: "السعر بين 0 و 1000" }, help: { en: "In shekels" } });
    expect(save({ id: "day", type: "date", default: "2026-11-13T10:00:00Z" })).toEqual({ id: "day", type: "date", default: "2026-11-13" });
    expect(save({ id: "title", type: "text", default: { en: "Untitled" }, max: 40 })).toEqual({ id: "title", type: "text", default: { en: "Untitled" }, max: 40 });
    expect(save({ id: "active", type: "boolean", default: false })).toEqual({ id: "active", type: "boolean", default: false });
    expect(save({ id: "note", type: "longText", default: "" })).toEqual({ id: "note", type: "longText" });
    expect(save({ id: "kind", type: "select", options: [{ id: "new" }], default: "new" })).toEqual({ id: "kind", type: "select", options: [{ id: "new" }], default: "new" });
  });

  test("a default that breaks the field's own rules, and rules that don't fit, are refused", () => {
    expect(save({ id: "price", type: "number", min: 0, default: -5 })).toBe("The default doesn't pass the field's own rules: Too small");
    expect(save({ id: "price", type: "number", default: "ten" })).toBe("The default doesn't pass the field's own rules: A number");
    expect(save({ id: "kind", type: "select", options: [{ id: "new" }], default: "old" })).toContain("One of its choices");
    expect(save({ id: "code", type: "text", pattern: "(a+)+" })).toContain("repeated group");
    expect(save({ id: "ok", type: "boolean", unique: true })).toContain("only value");
    expect(save({ id: "x", type: "text", rules: {} })).toContain("Unrecognized");
    const table = CollectionBody.safeParse({ slug: "codes", name: { en: "Codes" }, fields: [{ id: "code", type: "text", unique: true, shape: "slug" }, { id: "price", type: "number", min: 5, max: 1 }] });
    expect(table.success).toBe(false);
  });
});

describe("Values against the rules", () => {
  const fields: Field[] = [
    field({ id: "code", type: "text", required: true, pattern: "^[A-Z]{2}-\\d{3}$", message: { ar: "الكود متل AB-123", en: "A code looks like AB-123" } }),
    field({ id: "price", type: "number", min: 0, max: 1000, default: 10 }),
    field({ id: "active", type: "boolean", default: true }),
    field({ id: "note", type: "longText", max: 10 }),
  ];

  test("a broken rule is named, in the owner's words when the field has them; the kind's check comes first", () => {
    expect(checkItemData(fields, { code: { en: "ab-1" }, price: 2000, note: { ar: "ملاحظة طويلة جداً" } })).toEqual({
      ok: false,
      issues: [
        { field: "code", message: "Not the asked shape", say: { ar: "الكود متل AB-123", en: "A code looks like AB-123" } },
        { field: "price", message: "Too big" },
        { field: "note", message: "Too long" },
      ],
    });
    expect(checkItemData(fields, { code: { en: "AB-123" }, price: "cheap" })).toEqual({ ok: false, issues: [{ field: "price", message: "A number" }] });
    expect(checkItemData(fields, { code: { en: "AB-123" }, price: 1000, note: { en: "ten chars!" } })).toEqual({ ok: true, data: { code: { en: "AB-123" }, price: 1000, note: { en: "ten chars!" } } });
  });

  test("a new row starts from the defaults; what was given stays", () => {
    expect(withDefaults(fields, { code: { en: "AB-123" } })).toEqual({ code: { en: "AB-123" }, price: 10, active: true });
    expect(withDefaults(fields, { price: 0, active: false })).toEqual({ price: 0, active: false });
  });

  test("a whole row sent back: only what changed is checked, so an older value a newer rule wouldn't take doesn't hold up the rest", () => {
    const was = { code: { en: "old code" }, price: 5000, note: { en: "fine" } };
    expect(patchData(fields, was, { code: { en: "old code" }, price: 5000, note: { en: "better" }, active: true }, "en")).toEqual({ ok: true, data: { code: { en: "old code" }, price: 5000, note: { en: "better" }, active: true } });
    expect(patchData(fields, was, { price: 6000 }, "en")).toEqual({ ok: false, issues: [{ field: "price", message: "Too big" }] });
    expect(same({ en: "a", ar: "ب" }, { ar: "ب", en: "a" })).toBe(true);
    expect(same({ en: "a" }, { en: "a", ar: "" })).toBe(true);
    expect(same(null, "")).toBe(true);
    expect(same(0, "")).toBe(false);
    expect(same(5, "5")).toBe(false);
  });
});
