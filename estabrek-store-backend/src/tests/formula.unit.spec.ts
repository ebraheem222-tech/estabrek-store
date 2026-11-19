import { describe, expect, test } from "vitest";
import { FormulaError, formulaKind, keptValue, parseFormula, plainWords, readValue, runFormula, type Kind, type Value } from "../lib/formula.js";
import { formulaOrder, tryFormula } from "../lib/computed.js";
import { expandLists, type Field } from "../lib/collectionTree.js";

// A computed field's equation (item 6): read, checked against the table's fields, and worked out for a row.

const fields: Field[] = [
  { id: "title", type: "text" },
  { id: "price", type: "number" },
  { id: "qty", type: "number" },
  { id: "off", type: "number" },
  { id: "paid", type: "boolean" },
  { id: "due", type: "date" },
  { id: "at", type: "datetime" },
  { id: "status", type: "select", options: [{ id: "new", name: { ar: "جديد", en: "New" } }, { id: "done", name: { ar: "مدفوع", en: "Paid" } }] },
  { id: "tags", type: "multiSelect", options: [{ id: "sale", name: { ar: "تخفيض", en: "Sale" } }, { id: "gift", name: { en: "Gift" } }] },
  { id: "body", type: "richText" },
  { id: "author", type: "relation", to: "x" },
  { id: "who", type: "customer" },
];
const row: Record<string, unknown> = { title: { ar: "وشاح", en: "Scarf" }, price: 120, qty: 3, off: 10, paid: true, due: "2026-12-01", at: "2026-11-30T23:30:00.000Z", status: "done", tags: ["sale", "gift"], body: { en: "**Soft** silk, [see](https://x.test)" } };
const today = { day: Math.round(Date.UTC(2026, 10, 19) / 86_400_000) };
const kinds = new Map<string, Kind>([["title", "text"], ["price", "number"], ["qty", "number"], ["off", "number"], ["paid", "boolean"], ["due", "date"], ["at", "date"], ["status", "choice"], ["tags", "choices"], ["body", "text"]]);
const refused = new Map<string, Field["type"]>([["author", "relation"], ["who", "customer"]]);

function run(src: string, lang: "ar" | "en" | "he" = "en", data = row): Value {
  const ast = parseFormula(src);
  const byId = new Map(fields.map((f) => [f.id, f]));
  return runFormula(ast, (id) => (byId.has(id) ? readValue(byId.get(id)!, data[id], lang) : null), { lang, today: () => today });
}
const kind = (src: string) => formulaKind(parseFormula(src), kinds, refused);
const why = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    if (e instanceof FormulaError) return e.message;
    throw e;
  }
  return null;
};

describe("Reading an equation", () => {
  test("numbers, words, fields, operators in their order", () => {
    expect(run("price * qty")).toBe(360);
    expect(run("price * (1 - off / 100)")).toBe(108);
    expect(run("1 + 2 * 3")).toBe(7);
    expect(run("-price + 20")).toBe(-100);
    expect(run("10 % 4")).toBe(2);
    expect(run("0.1 + 0.2")).toBe(0.3);
    expect(run("{price} + 1")).toBe(121);
    // Arabic digits and the Arabic comma.
    expect(run("max(٣، 7)")).toBe(7);
    expect(run("price × 2 ÷ 4")).toBe(60);
  });
  test("what's wrong is said, with where", () => {
    expect(why(() => parseFormula("price *"))).toBe("The equation stops too soon");
    expect(why(() => parseFormula("(price + 1"))).toBe('")" was expected here');
    expect(why(() => parseFormula("price qty"))).toBe("Something is left after the equation's end (a missing operator?)");
    expect(why(() => parseFormula("nope(1)"))).toBe('No function "nope"');
    expect(why(() => parseFormula("round()"))).toBe("round() takes 1–2 values");
    expect(why(() => parseFormula('"open'))).toBe("Words opened with a quote aren't closed");
    expect(why(() => parseFormula("1 < 2 < 3"))).toBe("Two comparisons in a row: join them with and");
    expect(why(() => parseFormula(""))).toBe("The equation is empty");
    expect(why(() => parseFormula("x".repeat(1001)))).toBe("An equation is 1000 letters at most");
    try {
      parseFormula("price + * 2");
    } catch (e) {
      expect((e as FormulaError).at).toBe(8);
      expect((e as FormulaError).say.ar).toContain("مش مكانه");
    }
  });
});

describe("Checking it against the table", () => {
  test("what it gives", () => {
    expect(kind("price * qty")).toBe("number");
    expect(kind('title & " #" & qty')).toBe("text");
    expect(kind("paid and qty > 1")).toBe("boolean");
    expect(kind("adddays(due, 7)")).toBe("date");
    expect(kind("due - 3")).toBe("date");
    expect(kind("days(today(), due)")).toBe("number");
    expect(kind('if(paid, "yes", "no")')).toBe("text");
    expect(kind("if(paid, price, 0)")).toBe("number");
    expect(kind("max(due, at)")).toBe("date");
  });
  test("what it may not read, or do", () => {
    expect(why(() => kind("nothing + 1"))).toBe('No field "nothing" in this table');
    expect(why(() => kind("author"))).toBe('"author" links rows: add a rollup field for it and use that');
    expect(why(() => kind("who"))).toBe('A formula can\'t read "who" (its kind)');
    expect(why(() => kind("title + 1"))).toBe('Words are joined with &, not +: first & " " & last');
    expect(why(() => kind("paid * 2"))).toBe('"*" works on numbers (and days)');
    expect(why(() => kind("round(title)"))).toBe("round() takes numbers");
    expect(why(() => kind("-title"))).toBe("Only a number takes a minus sign");
  });
  test("the editor's try: the answer's kind and what it reads", () => {
    expect(tryFormula(fields, "price * qty")).toEqual({ ok: true, result: "number", reads: ["price", "qty"] });
    const no = tryFormula(fields, "price +");
    expect(no.ok).toBe(false);
  });
});

describe("Working it out for a row", () => {
  test("empty values never break it", () => {
    const bare = { price: 50 };
    expect(run("price * qty", "en", bare)).toBe(0);
    expect(run('title & "!"', "en", bare)).toBe("!");
    expect(run("price / qty", "en", bare)).toBe(null);
    expect(run("empty(qty)", "en", bare)).toBe(true);
    expect(run("first(qty, price)", "en", bare)).toBe(50);
    expect(run("sqrt(-1)")).toBe(null);
  });
  test("words, in the language read", () => {
    expect(run('title & " ×" & qty', "en")).toBe("Scarf ×3");
    expect(run('title & " ×" & qty', "ar")).toBe("وشاح ×3");
    // A language without words takes another's.
    expect(run("title", "he")).toBe("وشاح");
    expect(run("upper(left(title, 3))", "en")).toBe("SCA");
    expect(run("len(title)", "en")).toBe(5);
    expect(run('replace(title, "S", "s")', "en")).toBe("scarf");
    expect(run('contains(title, "arf")', "en")).toBe(true);
    // Formatted words are read plain.
    expect(run("body", "en")).toBe("Soft silk, see");
  });
  test("a choice is its name in any language, or its id", () => {
    expect(run('status = "مدفوع"')).toBe(true);
    expect(run('status = "paid"')).toBe(true);
    expect(run('status = "done"')).toBe(true);
    expect(run('status != "New"')).toBe(true);
    expect(run("status", "ar")).toEqual({ choice: "done", names: ["مدفوع", "Paid"], shown: "مدفوع" });
    expect(run('"#" & status', "en")).toBe("#Paid");
    expect(run('contains(tags, "تخفيض")')).toBe(true);
    expect(run('contains(tags, "nope")')).toBe(false);
    expect(run("len(tags)")).toBe(2);
  });
  test("days", () => {
    expect(run("days(today(), due)")).toBe(12);
    expect(keptValue(run("adddays(due, 31)"), "date", { lang: "en", today: () => today })).toBe("2027-01-01");
    expect(run("due - today()")).toBe(12);
    expect(run("year(due) & \"-\" & month(due)")).toBe("2026-12");
    // A moment is the store's day it falls on (Jerusalem: 01:30 on the 1st).
    expect(keptValue(run("at"), "date", { lang: "en", today: () => today })).toBe("2026-12-01");
    expect(run("weekday(due)")).toBe(2);
    expect(run('due > "2026-11-30"')).toBe(true);
  });
  test("questions and their answers", () => {
    expect(run('if(paid and qty >= 3, "big", "small")')).toBe("big");
    expect(run("if(not paid, 1)")).toBe(null);
    expect(run("round(2.675, 2)")).toBe(2.68);
    expect(run("round(-2.5)")).toBe(-3);
    expect(run("round(1.005, 2)")).toBe(1.01);
    expect(run("sum(price, qty, off)")).toBe(133);
    expect(run("avg(price, qty)")).toBe(61.5);
    expect(run("power(2, 10)")).toBe(1024);
    expect(run('number("12.5") * 2')).toBe(25);
    expect(run("text(price) & \"\"")).toBe("120");
    expect(run("paid & \"\"", "ar")).toBe("نعم");
  });
  test("as the field keeps it", () => {
    const cx = { lang: "en" as const, today: () => today };
    expect(keptValue(12.5, "money", cx)).toBe(12.5);
    expect(keptValue("12", "number", cx)).toBe(12);
    expect(keptValue("x", "number", cx)).toBe(null);
    expect(keptValue(null, "boolean", cx)).toBe(false);
    expect(keptValue(0, "boolean", cx)).toBe(false);
    expect(keptValue("", "text", cx)).toBe(null);
    expect(keptValue("2026-01-02", "date", cx)).toBe("2026-01-02");
  });
});

describe("Formatted words read plain", () => {
  test("marks and addresses off", () => {
    expect(plainWords("## Title\n- **one**\n- _two_\n1. three\n> said `code` ~~gone~~ [here](https://x.test)")).toBe("Title\none\ntwo\nthree\nsaid code gone here");
    expect(plainWords("2 * 3 * 4")).toBe("2 * 3 * 4");
    expect(plainWords("snake_case_word")).toBe("snake_case_word");
  });
});

describe("Formatted words on a page", () => {
  const notes = { id: "t1", slug: "notes", fields: [{ id: "title", type: "text" }, { id: "body", type: "richText" }, { id: "n", type: "formula", formula: "1", result: "number" }] as Field[] };
  const card = { id: "card", type: "stack", props: {}, children: [
    { id: "b", type: "text", props: { text: { en: "x" }, bind: { text: "body" } } },
    { id: "h", type: "heading", props: { text: { en: "x" }, bind: { text: "body" } } },
    { id: "n", type: "text", props: { text: { en: "x" }, bind: { text: "n" } } },
  ] };
  const tree = (props: Record<string, unknown>) => ({ version: 1, root: { id: "root", type: "page", props: {}, children: [{ id: "list", type: "collectionList", props: { collectionId: "t1", ...props }, children: [card] }] } });
  const item = { id: "i1", slug: "one", data: { title: { en: "One" }, body: { en: "**Bold**" }, n: 3 } };
  test("drawn with the page: a text takes them, marked; a heading doesn't", () => {
    const out = expandLists(tree({}), new Map([["t1", { collection: notes, items: [item] }]])) as { root: { children: Array<{ children: Array<{ children: Array<{ props: Record<string, unknown> }> }> }> } };
    const [b, h, n] = out.root.children[0].children[0].children;
    expect(b.props).toMatchObject({ text: { en: "**Bold**" }, formatted: true });
    expect(h.props.formatted).toBeUndefined();
    expect(h.props.text).toEqual({ en: "x" });
    expect(n.props.text).toEqual({ ar: "3", en: "3", he: "3" });
  });
  test("read in the browser: the card's text is marked for the shop to fill", () => {
    const out = expandLists(tree({ feed: "live" }), new Map([["t1", { collection: notes, items: [] }]])) as { root: { children: Array<{ children: Array<{ children: Array<{ props: Record<string, unknown> }> }> }> } };
    const [b, h] = out.root.children[0].children[0].children;
    expect(b.props.formatted).toBe(true);
    expect(h.props.formatted).toBeUndefined();
  });
});

describe("Formulas in order", () => {
  test("one reading another comes after it; a loop is left out", () => {
    const list: Field[] = [
      { id: "total", type: "formula", formula: "sub + tax" },
      { id: "tax", type: "formula", formula: "sub * 0.17" },
      { id: "sub", type: "formula", formula: "price * qty" },
      { id: "a", type: "formula", formula: "b + 1" },
      { id: "b", type: "formula", formula: "a + 1" },
      { id: "price", type: "number" },
    ];
    expect(formulaOrder(list).map((f) => f.id)).toEqual(["sub", "tax", "total"]);
  });
});
