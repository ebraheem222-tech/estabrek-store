import { describe, expect, test } from "vitest";
import type { Field } from "../lib/collectionTree.js";
import { convertValue, hiddenOf, needsAccept, planChange, rowEffect, wasKey, wordsOf, type Impact } from "../lib/schemaChange.js";

// Changing a table's fields (B2): what counts as a change for the rows, how a value of one kind
// becomes another, and what a change does to one row. Without a database.

const f = (id: string, type: Field["type"], over: Partial<Field> = {}): Field => ({ id, type, ...over });
const kind = f("kind", "select", { options: [{ id: "new", name: { ar: "جديد", en: "New" } }, { id: "sale", name: { ar: "تخفيض", en: "On sale" } }] });
const tags = f("kind", "multiSelect", { options: kind.options });
const turn = (from: Field, to: Field, v: unknown) => convertValue(from, to, v, "en");

describe("What counts as a change", () => {
  test("added, removed, another kind, other rules or choices; names and hints don't count", () => {
    const before = [f("title", "text", { name: { en: "Title" } }), f("price", "text"), kind, f("old", "number"), f("day", "date", { min: "2026-01-01" })];
    const after = [f("title", "text", { name: { en: "Name" }, help: { en: "Its name" }, message: { en: "x" } }), f("price", "number"), { ...kind, options: [kind.options![0]] }, f("fresh", "boolean"), f("day", "date", { min: "2026-06-01" })];
    expect(planChange(before, after).map((p) => `${p.id}: ${p.change}`)).toEqual(["old: removed", "price: retyped", "kind: ruled", "fresh: added", "day: ruled"]);
    expect(planChange(before, before)).toEqual([]);
    // A choice renamed is the same choice; a default or a currency doesn't touch the rows.
    expect(planChange([kind, f("p", "money")], [{ ...kind, options: kind.options!.map((o) => ({ ...o, name: { en: "x" } })) }, f("p", "money", { currency: "USD", default: 5 })])).toEqual([]);
    expect(planChange([f("a", "text")], [f("a", "text", { required: true })]).map((p) => p.change)).toEqual(["ruled"]);
    expect(planChange([f("a", "text")], [f("a", "text", { unique: true })]).map((p) => p.change)).toEqual(["ruled"]);
  });
});

describe("A value of one kind as another", () => {
  test("written as words, then read as the new kind", () => {
    expect(turn(f("p", "text"), f("p", "number"), { en: "1,250.5" })).toBe(1250.5);
    expect(turn(f("p", "text"), f("p", "number"), { ar: "١٢" })).toBe("١٢");
    expect(turn(f("p", "number"), f("p", "text"), 12.5)).toEqual({ en: "12.5" });
    expect(turn(f("p", "number"), f("p", "money"), 12.5)).toBe(12.5);
    expect(turn(f("d", "text"), f("d", "date"), { en: "13/11/2026" })).toBe("2026-11-13");
    expect(turn(f("d", "date"), f("d", "datetime"), "2026-11-13")).toBe("2026-11-12T22:00:00.000Z");
    // A moment late in the UTC day is already the next day in the store.
    expect(turn(f("d", "datetime"), f("d", "date"), "2026-11-13T22:30:00.000Z")).toBe("2026-11-14");
    expect(turn(f("m", "text"), f("m", "email"), { en: " Sara@Example.test " })).toBe("Sara@Example.test");
    expect(turn(f("m", "email"), f("m", "text"), "sara@example.test")).toEqual({ en: "sara@example.test" });
    expect(turn(f("on", "boolean"), f("on", "text"), false)).toEqual({ ar: "لا", en: "No", he: "לא" });
    expect(turn(f("on", "text"), f("on", "boolean"), { ar: "نعم" })).toBe(true);
    expect(turn(f("at", "text"), f("at", "location"), { en: "31.7, 35.2, Shop" })).toEqual({ lat: 31.7, lng: 35.2, label: "Shop" });
    expect(turn(f("at", "location"), f("at", "text"), { lat: 31.7, lng: 35.2, label: "Shop" })).toEqual({ en: "31.7, 35.2, Shop" });
    expect(turn(f("x", "number"), f("x", "json"), 5)).toBe(5);
    expect(turn(f("x", "json"), f("x", "text"), { a: 1 })).toEqual({ en: '{"a":1}' });
    expect(turn(f("x", "text"), f("x", "longText"), { ar: "نص" })).toEqual({ ar: "نص" });
    expect(turn(f("x", "text"), f("x", "number"), undefined)).toBeUndefined();
    expect(turn(f("x", "text"), f("x", "number"), { en: "  " })).toBeUndefined();
  });

  test("choices: one to several and back, by id or by name; as words they're their names", () => {
    expect(turn(kind, tags, "sale")).toEqual(["sale"]);
    expect(turn(tags, kind, ["sale", "new"])).toBe("sale");
    expect(turn(kind, f("kind", "text"), "new")).toEqual({ ar: "جديد", en: "New" });
    expect(turn(tags, f("kind", "text"), ["new", "sale"])).toEqual({ ar: "جديد، تخفيض", en: "New, On sale" });
    expect(turn(f("kind", "text"), kind, { en: "on sale" })).toBe("sale");
    expect(turn(f("kind", "text"), tags, { ar: "جديد, تخفيض" })).toEqual(["new", "sale"]);
    expect(wordsOf(tags, ["new", "sale"], "en")).toBe("new, sale");
    expect(wordsOf(f("t", "text"), { ar: "عربي" }, "en")).toBe("عربي");
  });
});

describe("What a change does to one row", () => {
  const toNumber = { id: "price", change: "retyped" as const, from: f("price", "text"), to: f("price", "number", { max: 5000 }) };
  const toText = { id: "price", change: "retyped" as const, from: f("price", "number"), to: f("price", "text") };

  test("a kind changes: the value turns and the old one is kept beside it; one that can't turn is put aside", () => {
    expect(rowEffect(toNumber, { price: { en: "1,250" } }, "en")).toEqual({ has: true, outcome: "converted", patch: { price: 1250, price$was: { en: "1,250" } } });
    expect(rowEffect(toNumber, { price: { en: "cheap" } }, "en")).toEqual({ has: true, outcome: "lost", patch: { price$was: { en: "cheap" } }, remove: ["price"], why: "A number", shown: { en: "cheap" } });
    // The new field's own rules count too.
    expect(rowEffect(toNumber, { price: { en: "9000" } }, "en")).toMatchObject({ outcome: "lost", why: "Too big" });
    expect(rowEffect(toNumber, { title: { en: "x" } }, "en")).toEqual({ has: false, outcome: "none" });
    expect(wasKey("price")).toBe("price$was");
  });

  test("changing back: every value comes back as it was, the ones that couldn't turn too", () => {
    expect(rowEffect(toText, { price: 1250, price$was: { en: "1,250" } }, "en")).toEqual({ has: true, outcome: "converted", patch: { price: { en: "1,250" } }, remove: ["price$was"] });
    expect(rowEffect(toText, { price$was: { en: "cheap" } }, "en")).toEqual({ has: true, outcome: "converted", patch: { price: { en: "cheap" } }, remove: ["price$was"] });
    // No kept value: turned the ordinary way.
    expect(rowEffect(toText, { price: 80 }, "en")).toEqual({ has: true, outcome: "converted", patch: { price: { en: "80" }, price$was: 80 } });
    // A kept value that doesn't fit the new kind is replaced by the newer one.
    expect(rowEffect(toNumber, { price: { en: "70" }, price$was: true }, "en")).toEqual({ has: true, outcome: "converted", patch: { price: 70, price$was: { en: "70" } } });
  });

  test("removed: hidden where it is; rules: counted, never rewritten; added over old values: shown when they fit", () => {
    expect(rowEffect({ id: "note", change: "removed", from: f("note", "text") }, { note: { en: "x" } }, "en")).toEqual({ has: true, outcome: "hidden" });
    expect(rowEffect({ id: "note", change: "removed", from: f("note", "text") }, {}, "en")).toEqual({ has: false, outcome: "none" });
    const ruled = { id: "kind", change: "ruled" as const, from: kind, to: { ...kind, options: [kind.options![0]] } };
    expect(rowEffect(ruled, { kind: "new" }, "en")).toEqual({ has: true, outcome: "kept" });
    expect(rowEffect(ruled, { kind: "sale" }, "en")).toEqual({ has: true, outcome: "failing", why: "One of its choices", shown: "sale" });
    const added = { id: "note", change: "added" as const, to: f("note", "number") };
    expect(rowEffect(added, { note: 5 }, "en")).toEqual({ has: true, outcome: "converted" });
    expect(rowEffect(added, { note: { en: "words" } }, "en")).toMatchObject({ outcome: "lost", remove: ["note"], patch: { note$was: { en: "words" } } });
    expect(rowEffect(added, {}, "en")).toEqual({ has: false, outcome: "none" });
  });

  test("values put aside travel with the row; a change that puts values aside needs a yes", () => {
    expect(hiddenOf({ title: { en: "x" }, price$was: "old", gone: 5 }, [f("title", "text")])).toEqual({ price$was: "old", gone: 5 });
    expect(hiddenOf(null, [])).toEqual({});
    const impact = (over: Partial<Impact>): Impact => ({ field: "x", change: "ruled", rows: 3, converted: 0, lost: 0, hidden: 0, failing: 0, missing: 0, doubles: 0, samples: [], ...over });
    expect(needsAccept([impact({ failing: 3, missing: 2, doubles: 2 })])).toBe(false);
    expect(needsAccept([impact({ lost: 1 })])).toBe(true);
    expect(needsAccept([impact({ hidden: 1 })])).toBe(true);
    expect(needsAccept([])).toBe(false);
  });
});
