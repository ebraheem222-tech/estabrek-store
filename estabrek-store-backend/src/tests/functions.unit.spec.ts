import { describe, expect, test } from "vitest";
import type { Field } from "../lib/collectionTree.js";
import { FN_LIMITS, FnDefSchema, problemsOf, sizeOf, type FnDef, type Known, type Step } from "../lib/fnDef.js";
import { allHold, fill, holds, holesOf, lookup, type Cond } from "../lib/fnValues.js";

// Functions (F1), the parts with no database: how a step's values name what the run knows, how
// conditions compare, what shape a function may have, and what stands in the way of publishing it.

const scope = {
  input: { email: "amal@shop.test", total: 240, tags: ["vip", "new"], empty: "" },
  order: { $id: "r1", $slug: "ord-7", total: "120.5", note: null, items: [{ id: "i1", title: "Scarf" }, { id: "i2", title: "Bag" }] },
  rows: [{ title: "A" }, { title: "B" }, { title: "C" }],
  count: 3,
  now: "2026-11-16T10:00:00.000Z",
};

describe("Names in a value", () => {
  test("a path into what the run knows; nothing when there is no such thing", () => {
    expect(lookup(scope, "input.email")).toBe("amal@shop.test");
    expect(lookup(scope, "order.$slug")).toBe("ord-7");
    expect(lookup(scope, "rows.length")).toBe(3);
    expect(lookup(scope, "rows.1.title")).toBe("B");
    expect(lookup(scope, "rows.first.title")).toBe("A");
    expect(lookup(scope, "rows.last.title")).toBe("C");
    expect(lookup(scope, "input.email.length")).toBe(14);
    expect(lookup(scope, "order.missing.deeper")).toBeUndefined();
    expect(lookup(scope, "nothing")).toBeUndefined();
    // Only its own things: not what every object has.
    for (const sneaky of ["order.constructor", "order.__proto__", "rows.constructor.name", "input.toString", "1+1", "order['total']", ""]) expect(lookup(scope, sneaky)).toBeUndefined();
  });

  test("a text that is one name is the thing itself; a name inside a text is words", () => {
    expect(fill("{{input.total}}", scope)).toBe(240);
    expect(fill("{{ rows }}", scope)).toBe(scope.rows);
    expect(fill("{{order}}", scope)).toBe(scope.order);
    expect(fill("{{nothing}}", scope)).toBeNull();
    expect(fill("Order {{order.$slug}} for {{input.email}}: {{input.total}} ₪", scope)).toBe("Order ord-7 for amal@shop.test: 240 ₪");
    expect(fill("[{{nothing}}] [{{order.note}}]", scope)).toBe("[] []");
    expect(fill("{{input.tags}} / {{rows.0}}", scope)).toBe('["vip","new"] / {"title":"A"}');
    // Through lists and things; what isn't text stays as it is.
    expect(fill({ title: "Hi {{input.email}}", n: 5, list: ["{{count}}", true, null] }, scope)).toEqual({ title: "Hi amal@shop.test", n: 5, list: [3, true, null] });
    expect(holesOf({ a: "x {{input.email}} y {{ order.total }}", b: ["{{rows}}"], c: 5 })).toEqual(["input.email", "order.total", "rows"]);
  });
});

describe("Conditions", () => {
  const yes = (c: Cond) => holds(c, scope);
  test("numbers by their worth, words by their letters, nothing as nothing", () => {
    expect(yes({ left: "{{input.total}}", cmp: "eq", right: 240 })).toBe(true);
    expect(yes({ left: "{{input.total}}", cmp: "eq", right: "240" })).toBe(true);
    expect(yes({ left: "{{order.total}}", cmp: "gt", right: 100 })).toBe(true);
    expect(yes({ left: "{{order.total}}", cmp: "lte", right: "120.5" })).toBe(true);
    expect(yes({ left: "{{order.total}}", cmp: "lt", right: 100 })).toBe(false);
    expect(yes({ left: "{{input.email}}", cmp: "ne", right: "x@y.z" })).toBe(true);
    expect(yes({ left: "{{order.note}}", cmp: "eq", right: "" })).toBe(true);
    expect(yes({ left: "{{order.note}}", cmp: "eq", right: 0 })).toBe(false);
    expect(yes({ left: "{{order.note}}", cmp: "empty" })).toBe(true);
    expect(yes({ left: "{{input.empty}}", cmp: "empty" })).toBe(true);
    expect(yes({ left: "{{nothing}}", cmp: "empty" })).toBe(true);
    expect(yes({ left: "{{rows}}", cmp: "notEmpty" })).toBe(true);
    // What can't be put in order is neither more nor less.
    expect(yes({ left: "{{order.note}}", cmp: "gt", right: 1 })).toBe(false);
    expect(yes({ left: "{{order.note}}", cmp: "lte", right: 1 })).toBe(false);
    // Moments in time; words.
    expect(yes({ left: "{{now}}", cmp: "gt", right: "2026-11-15" })).toBe(true);
    expect(yes({ left: "{{now}}", cmp: "lt", right: "2026-11-16T09:00:00Z" })).toBe(false);
    expect(yes({ left: "banana", cmp: "gt", right: "apple" })).toBe(true);
  });

  test("holding something, being one of", () => {
    expect(yes({ left: "{{input.email}}", cmp: "contains", right: "@SHOP." })).toBe(true);
    expect(yes({ left: "{{input.tags}}", cmp: "contains", right: "vip" })).toBe(true);
    expect(yes({ left: "{{input.tags}}", cmp: "notContains", right: "old" })).toBe(true);
    expect(yes({ left: "vip", cmp: "in", right: "{{input.tags}}" })).toBe(true);
    expect(yes({ left: "old", cmp: "notIn", right: ["vip", "new"] })).toBe(true);
    // A relation's rows are found by their id.
    expect(yes({ left: "{{order.items}}", cmp: "contains", right: "i2" })).toBe(true);
    expect(yes({ left: "{{order.items}}", cmp: "contains", right: "i9" })).toBe(false);
  });

  test("all of them, or any", () => {
    const conds: Cond[] = [{ left: "{{count}}", cmp: "eq", right: 3 }, { left: "{{count}}", cmp: "gt", right: 5 }];
    expect(allHold(conds, "all", scope)).toBe(false);
    expect(allHold(conds, undefined, scope)).toBe(false);
    expect(allHold(conds, "any", scope)).toBe(true);
    expect(allHold([], "all", scope)).toBe(true);
    expect(allHold(undefined, "any", scope)).toBe(true);
  });
});

describe("A function's shape", () => {
  const ok = (def: unknown) => FnDefSchema.safeParse(def).success;
  const base = { inputs: [], do: [] };
  test("the steps it may hold, and nothing else", () => {
    expect(ok(base)).toBe(true);
    expect(
      ok({
        lang: "en",
        inputs: [{ name: "email", type: "text", required: true }, { name: "total", type: "number" }],
        if: [{ left: "{{input.total}}", cmp: "gt", right: 0 }],
        do: [
          { act: "find", table: "t1", filters: [{ field: "email", op: "is", value: "{{input.email}}" }], limit: 5, as: "found" },
          { act: "if", if: [{ left: "{{found}}", cmp: "empty" }], do: [{ act: "add", table: "t1", values: { email: "{{input.email}}" }, as: "row" }], else: [{ act: "stop", message: "Already there" }] },
          { act: "each", list: "{{found}}", do: [{ act: "set", name: "sum", op: "add", value: "{{item.total}}" }] },
          { act: "return", value: { id: "{{row.$id}}" } },
        ],
        else: [{ act: "notify", title: "Nothing to do" }],
        fail: [{ act: "email", subject: "It failed", text: "{{error}}" }],
      }),
    ).toBe(true);
    for (const bad of [
      { inputs: [] },
      { ...base, extra: 1 },
      { ...base, do: [{ act: "shell", cmd: "rm" }] },
      { ...base, do: [{ act: "set", name: "Total", value: 1 }] },
      // The run's own names can't be taken.
      { ...base, do: [{ act: "set", name: "input", value: 1 }] },
      { ...base, do: [{ act: "find", table: "t1", as: "error" }] },
      { ...base, do: [{ act: "find", table: "t1", as: "rows", limit: FN_LIMITS.found + 1 }] },
      { ...base, do: [{ act: "find", table: "t1", as: "rows", view: "trash" }] },
      { ...base, inputs: [{ name: "a", type: "text" }, { name: "a", type: "number" }] },
      { ...base, inputs: [{ name: "a", type: "date" }] },
      // After a failure: telling someone or writing it down, nothing else.
      { ...base, fail: [{ act: "delete", table: "t1", row: "x" }] },
      { ...base, fail: [{ act: "call", fn: "f2" }] },
    ])
      expect(ok(bad)).toBe(false);
  });

  test("so many steps, so deep", () => {
    const nest = (depth: number): Step[] => (depth ? [{ act: "if", if: [{ left: 1, cmp: "eq", right: 1 }], do: nest(depth - 1) }] : [{ act: "stop", message: "x" }]);
    expect(sizeOf(nest(3))).toEqual({ steps: 4, depth: 4 });
    expect(ok({ ...base, do: nest(FN_LIMITS.depth - 1) })).toBe(true);
    expect(ok({ ...base, do: nest(FN_LIMITS.depth) })).toBe(false);
    const many = (n: number): Step[] => Array.from({ length: n }, () => ({ act: "set", name: "a", value: 1 }) as Step);
    expect(ok({ ...base, do: many(FN_LIMITS.steps) })).toBe(true);
    expect(ok({ ...base, do: many(FN_LIMITS.steps - 1), else: many(2) })).toBe(false);
  });
});

describe("Before publishing", () => {
  const fields: Field[] = [
    { id: "title", type: "text", required: true },
    { id: "total", type: "number" },
    { id: "paid", type: "boolean" },
  ];
  const known: Known = { self: "me", tables: [{ id: "t1", slug: "orders", fields }], fns: [{ id: "f2", name: "Greet", live: true, inputs: [{ name: "who", type: "text", required: true }] }, { id: "f3", name: "Draft only", live: false, inputs: [] }] };
  const check = (def: Partial<FnDef>) => problemsOf({ inputs: [], do: [], ...def }, known).map((p) => `${p.at}: ${p.message}`);

  test("a function that talks about what exists has no problems", () => {
    expect(
      check({
        inputs: [{ name: "email", type: "text" }],
        if: [{ left: "{{input.email}}", cmp: "notEmpty" }],
        do: [
          { act: "find", table: "t1", filters: [{ field: "total", op: "gt", value: 10 }, { field: "$status", op: "is", value: "PUBLISHED" }], sort: [{ field: "$createdAt", dir: "desc" }], as: "orders" },
          { act: "each", list: "{{orders}}", as: "order", do: [{ act: "change", table: "t1", row: "{{order.$id}}", values: { paid: true, "title.en": "Paid {{index}}" } }] },
          { act: "set", name: "count", value: "{{orders.length}}" },
          { act: "set", name: "count", op: "add", value: 1 },
          { act: "call", fn: "f2", input: { who: "{{input.email}}" }, as: "greeting" },
          { act: "return", value: "{{greeting}} at {{now}}" },
        ],
        fail: [{ act: "notify", title: "Failed: {{error}}", text: "{{count}}" }],
      }),
    ).toEqual([]);
  });

  test("what isn't there, what was never kept, what can't be asked", () => {
    expect(check({ do: [{ act: "find", table: "gone", as: "rows" }] })).toEqual(["do.0: This table isn't there any more"]);
    expect(check({ do: [{ act: "find", table: "t1", filters: [{ field: "colour", op: "is", value: "red" }], as: "rows" }] })).toEqual(['do.0: No column "colour" in this table']);
    expect(check({ do: [{ act: "find", table: "t1", filters: [{ field: "paid", op: "contains", value: "x" }], as: "rows" }] })).toEqual(['do.0: "paid" can\'t be asked "contains"']);
    expect(check({ do: [{ act: "add", table: "t1", values: { title: "x", colour: "red" } }] })).toEqual(['do.0: No field "colour" in this table']);
    expect(check({ do: [{ act: "notify", title: "{{order.title}}" }] })).toEqual(['do.0: Nothing is kept under "order" before this step']);
    expect(check({ do: [{ act: "notify", title: "{{input.email}}" }] })).toEqual(['do.0: No input called "email"']);
    expect(check({ do: [{ act: "notify", title: "{{1 + 1}}" }] })).toEqual(['do.0: "{{1 + 1}}" isn\'t a name']);
    expect(check({ do: [{ act: "set", name: "n", op: "add", value: 1 }] })).toEqual(['do.0: Nothing is kept under "n" before this step']);
    expect(check({ if: [{ left: "{{input.x}}", cmp: "eq" }] })).toEqual(['if.0: No input called "x"', "if.0: Compared with what?"]);
    expect(check({ do: [{ act: "each", list: "rows", do: [] }] })).toEqual(["do.0: A loop goes over one named list: {{rows}}"]);
    // The loop's own names end with the loop.
    expect(check({ do: [{ act: "find", table: "t1", as: "rows" }, { act: "each", list: "{{rows}}", do: [{ act: "set", name: "last", value: "{{item.title}}" }] }, { act: "notify", title: "{{last}} {{item.title}}" }] })).toEqual(['do.2: Nothing is kept under "item" before this step']);
  });

  test("each side of a question knows only what came before it", () => {
    const problems = check({
      do: [
        { act: "if", if: [{ left: 1, cmp: "eq", right: 1 }], do: [{ act: "set", name: "a", value: 1 }], else: [{ act: "notify", title: "{{a}}" }] },
        // After the question, what either side kept is known.
        { act: "notify", title: "{{a}}" },
      ],
      else: [{ act: "notify", title: "{{a}}" }],
    });
    expect(problems).toEqual(['do.0.else.0: Nothing is kept under "a" before this step', 'else.0: Nothing is kept under "a" before this step']);
  });

  test("a step left unfinished can be saved, and is a problem until it is finished", () => {
    const half: FnDef = {
      inputs: [],
      do: [
        { act: "find", table: "", as: "rows" },
        { act: "get", table: "t1", row: "", as: "row" },
        { act: "change", table: "t1", row: "x", values: {} },
        { act: "delete", table: "t1", row: " " },
        { act: "if", if: [], do: [] },
        { act: "if", if: [{ left: "", cmp: "eq", right: 1 }], do: [] },
        { act: "each", list: "", do: [] },
        { act: "email", subject: "", text: "" },
        { act: "sms", text: "" },
        { act: "notify", title: "" },
        { act: "stop", message: "" },
        { act: "call", fn: "" },
      ],
    };
    expect(FnDefSchema.safeParse(half).success).toBe(true);
    expect(check(half)).toEqual([
      "do.0: Pick a table",
      "do.1: Which row is empty",
      "do.2: Nothing to change",
      "do.3: Which row is empty",
      "do.4: A question that asks nothing",
      "do.5.if.0: What is compared?",
      "do.6: A loop goes over one named list: {{rows}}",
      "do.7: The subject is empty",
      "do.7: The text is empty",
      "do.8: The text is empty",
      "do.9: The title is empty",
      "do.10: The reason is empty",
      "do.11: Pick a function",
    ]);
  });

  test("calling another function: it exists, it is published, it gets what it needs; never itself", () => {
    expect(check({ do: [{ act: "call", fn: "nope" }] })).toEqual(["do.0: This function isn't there any more"]);
    expect(check({ do: [{ act: "call", fn: "f3" }] })).toEqual(['do.0: "Draft only" isn\'t published yet']);
    expect(check({ do: [{ act: "call", fn: "f2" }] })).toEqual(['do.0: "Greet" needs "who"']);
    expect(check({ do: [{ act: "call", fn: "f2", input: { who: "x", more: 1 } }] })).toEqual(['do.0: "Greet" takes no "more"']);
    expect(check({ do: [{ act: "call", fn: "me" }] })).toEqual(["do.0: A function can't call itself"]);
  });
});
