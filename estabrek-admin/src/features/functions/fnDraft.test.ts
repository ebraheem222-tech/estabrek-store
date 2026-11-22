import { describe, expect, test } from "vitest";
import type { FnDef, FnLite, FnTable, Step } from "../../api/functions.api";
import { FAIL_ACTS, GROUPS, addStep, atOf, countSteps, freeName, fromVal, listAt, moveStep, nameOk, namesBefore, namesUsed, newStep, offers, removeStep, setList, setStep, stepAt, stepOfLine, toVal } from "./fnDraft";
import { CODE_START, codeNote, condsLine, failText, firedText, fnTriggerName, handsMissing, lineText, outcomeLine, problemText, shapeText, stateOf, stepLine, testWhyText, triggerLine, whereText } from "./fnText";
import { fieldNameOk, tidyGives } from "./GivesForm";

// الـ Functions: the builder's sums and the pages' words. A function's steps are a tree; a step is
// named by its way in ("do.2.else.0"), the same way the server names it.

const tables: FnTable[] = [
  { id: "t1", slug: "orders", name: { en: "Orders", ar: "الطلبات" }, fields: [{ id: "title", type: "text", name: { en: "Title" }, required: true }, { id: "total", type: "number", name: null, required: false }] },
  { id: "t2", slug: "customers", name: null, fields: [{ id: "email", type: "email", name: null, required: false }] },
];
const fns: FnLite[] = [{ id: "f2", name: "Greet", note: null, enabled: true, published: true, publishedAt: null, changed: false, steps: 1, inputs: 1, takes: [{ name: "who", type: "text", required: true }], runs: 0, lastRunAt: null, updatedAt: "" }];
const def: FnDef = {
  inputs: [{ name: "email", type: "text", required: true }],
  do: [
    { act: "find", table: "t1", as: "orders" },
    {
      act: "if",
      if: [{ left: "{{orders}}", cmp: "empty" }],
      do: [{ act: "add", table: "t2", values: { email: "{{input.email}}" }, as: "made" }, { act: "stop", message: "none" }],
      else: [{ act: "set", name: "sum", value: 0 }],
    },
    { act: "each", list: "{{orders}}", as: "order", do: [{ act: "set", name: "sum", op: "add", value: "{{order.total}}" }, { act: "get", table: "t2", row: "x", as: "who" }] },
    { act: "return", value: "{{sum}}" },
  ],
  fail: [{ act: "notify", title: "{{error}}" }],
};

describe("Changing the tree", () => {
  test("a step by its way in; a new draft each time, the old one as it was", () => {
    expect(atOf(["do", 1, "else", 0])).toBe("do.1.else.0");
    expect(stepOfLine("do.2.do[3].1")).toBe("do.2.do.1");
    expect(stepAt(def, ["do", 1, "else", 0])).toEqual({ act: "set", name: "sum", value: 0 });
    expect(listAt(def, ["do", 2, "do"])).toHaveLength(2);
    expect(listAt(def, ["else"])).toEqual([]);
    // Counting the ones inside the question and the loop.
    expect(countSteps(def.do)).toBe(9);

    const changed = setStep(def, ["do", 1, "do", 1], { act: "stop", message: "nobody" });
    expect(stepAt(changed, ["do", 1, "do", 1])).toEqual({ act: "stop", message: "nobody" });
    expect(stepAt(def, ["do", 1, "do", 1])).toEqual({ act: "stop", message: "none" });
    // What wasn't touched is the same thing, not a copy.
    expect(changed.do[2]).toBe(def.do[2]);

    const added = addStep(def, ["do", 2, "do"], { act: "stop", message: "x" });
    expect(listAt(added, ["do", 2, "do"]).map((s) => s.act)).toEqual(["set", "get", "stop"]);
    expect(addStep({ inputs: [], do: [] }, ["else"], { act: "return" }).else).toEqual([{ act: "return" }]);
    expect(removeStep(def, ["do", 1, "do", 0]).do[1]).toMatchObject({ do: [{ act: "stop" }] });
    expect(moveStep(def, ["do", 0], 1).do.map((s) => s.act)).toEqual(["if", "find", "each", "return"]);
    expect(moveStep(def, ["do", 3], -1).do.map((s) => s.act)).toEqual(["find", "if", "return", "each"]);
    // At either end it stays.
    expect(moveStep(def, ["do", 0], -1)).toBe(def);
    expect(moveStep(def, ["do", 3], 1)).toBe(def);
    // A question's other way: made, and taken away again.
    const noElse = setList(def, ["do", 1, "else"], undefined);
    expect("else" in (noElse.do[1] as object)).toBe(false);
    expect((setList(noElse, ["do", 1, "else"], []).do[1] as { else: Step[] }).else).toEqual([]);
  });
});

describe("Names", () => {
  const names = (path: Array<string | number>) => namesBefore(def, path).map((k) => `${k.name}:${k.kind}${k.table ? `:${k.table}` : ""}`);
  test("what is kept before a step, in the order the steps are written", () => {
    expect(names(["do", 0])).toEqual([]);
    expect(names(["do", 1])).toEqual(["orders:rows:t1"]);
    // Inside a question: what came before it, and what its own side kept so far.
    expect(names(["do", 1, "do", 1])).toEqual(["orders:rows:t1", "made:row:t2"]);
    expect(names(["do", 1, "else", 0])).toEqual(["orders:rows:t1"]);
    // After it: what either side kept.
    expect(names(["do", 2])).toEqual(["orders:rows:t1", "made:row:t2", "sum:value"]);
    // Inside a loop over rows: each one is a row of that table, with its turn.
    expect(names(["do", 2, "do", 1])).toEqual(["orders:rows:t1", "made:row:t2", "sum:value", "order:row:t1", "index:value"]);
    // After the loop its own names are gone; what its steps kept stays.
    expect(names(["do", 3])).toEqual(["orders:rows:t1", "made:row:t2", "sum:value", "who:row:t2"]);
    // One past the end: what a step added there would know.
    expect(names(["do", 4])).toEqual(names(["do", 3]));
    // After a failure: everything, and the failure.
    expect(names(["fail", 0])).toEqual(["orders:rows:t1", "made:row:t2", "sum:value", "who:row:t2", "error:value"]);
    // The function's own condition sees only what it is handed.
    expect(names(["if"])).toEqual([]);
  });

  test("what a value is offered: the inputs, the moment, a row's fields, how many rows", () => {
    // What it is handed, the moment, and who started the run.
    const always = ["input.email", "now", "caller", "caller.id", "caller.name", "caller.email", "caller.kind", "caller.roles", "caller.groups"];
    expect(offers(def, ["do", 0], tables)).toEqual(always);
    expect(offers(def, ["do", 1], tables)).toEqual([...always, "orders", "orders.length", "orders.first.title", "orders.first.total"]);
    expect(offers(def, ["do", 2, "do", 0], tables)).toEqual(expect.arrayContaining(["order", "order.$id", "order.$slug", "order.title", "order.total", "index", "sum", "made.email"]));
    expect(offers(def, ["fail", 0], tables)).toContain("error");
  });

  test("a whole site's function is offered its site's settings, and can't keep anything under «settings»", () => {
    const always = ["input.email", "now", "caller", "caller.id", "caller.name", "caller.email", "caller.kind", "caller.roles", "caller.groups"];
    expect(offers(def, ["do", 0], tables, [], ["notifyOn", "notifyEmail"])).toEqual([...always, "settings.notifyOn", "settings.notifyEmail"]);
    expect(nameOk("settings")).toBe(false);
  });

  test("names that can be taken; a new step takes one nobody uses", () => {
    expect(["rows", "row2", "a_b"].map(nameOk)).toEqual([true, true, true]);
    expect(["Rows", "2row", "", "my-row", "input", "error", "index", "now", "caller"].map(nameOk)).toEqual([false, false, false, false, false, false, false, false, false]);
    expect(namesUsed(def)).toEqual(["orders", "made", "sum", "order", "sum", "who"]);
    expect(freeName("rows", ["rows", "rows2"])).toBe("rows3");
    expect(newStep("find", { tables, fns, def })).toEqual({ act: "find", table: "t1", as: "rows" });
    expect(newStep("add", { tables, fns, def })).toEqual({ act: "add", table: "t1", values: {}, as: "made2" });
    expect(newStep("get", { tables: [], fns, def })).toEqual({ act: "get", table: "", row: "", as: "row" });
    expect(newStep("call", { tables, fns, def })).toEqual({ act: "call", fn: "f2", input: {} });
    expect(newStep("if", { tables, fns, def })).toEqual({ act: "if", if: [{ left: "", cmp: "eq", right: "" }], do: [] });
    expect(newStep("sms", { tables, fns, def })).toEqual({ act: "sms", text: "" });
    expect(newStep("email", { tables, fns, def })).toEqual({ act: "email", subject: "", text: "" });
  });

  test("a code step: where it is offered, what it starts with, and the name it keeps its answer under", () => {
    // A group of its own, last; never among what a function does after a failure.
    expect(GROUPS.map((g) => g.key)).toEqual(["data", "store", "control", "out", "outside", "code"]);
    expect(GROUPS.find((g) => g.key === "code")?.acts).toEqual(["code"]);
    expect(FAIL_ACTS).not.toContain("code");
    expect(newStep("code", { tables, fns, def })).toEqual({ act: "code", code: "return input;", give: {}, as: "result" });
    // The page starts it with a few lines saying how it works, in its own language.
    expect(newStep("code", { tables, fns, def, code: CODE_START.en })).toMatchObject({ code: expect.stringMatching(/^\/\/ What you hand the code is in input[\s\S]+return input;$/) });
    expect(CODE_START.ar.split("\n")).toHaveLength(3);
    // What it gives back is a name the steps after it can use.
    const withCode: FnDef = { inputs: [], do: [{ act: "find", table: "t1", as: "orders" }, { act: "code", code: "return 1;", give: { orders: "{{orders}}" }, as: "sums" }, { act: "return", value: "{{sums}}" }] };
    expect(namesBefore(withCode, ["do", 2]).map((k) => `${k.name}:${k.kind}`)).toEqual(["orders:rows", "sums:value"]);
    expect(namesBefore(withCode, ["do", 1]).map((k) => k.name)).toEqual(["orders"]);
    expect(namesUsed(withCode)).toContain("sums");
  });
});

describe("A call to a site", () => {
  test("where it is offered, what it starts with, and what its answer is called by", () => {
    expect(GROUPS.find((g) => g.key === "outside")).toEqual({ key: "outside", acts: ["ready", "http"] });
    // After a failure a function may tell someone outside too.
    expect(FAIL_ACTS).toContain("http");
    expect(newStep("http", { tables, fns, def })).toEqual({ act: "http", method: "POST", url: "https://", as: "answer" });
    // "secret" is never a name the run keeps something under.
    expect(nameOk("secret")).toBe(false);
    const withCall: FnDef = { inputs: [], do: [{ act: "http", method: "GET", url: "https://api.x.com/a", as: "got" }, { act: "return", value: "" }] };
    expect(namesBefore(withCall, ["do", 1]).map((k) => `${k.name}:${k.kind}`)).toEqual(["got:answer"]);
    // What it said, whether it said yes, and its status.
    expect(offers(withCall, ["do", 1], tables).slice(-3)).toEqual(["got.body", "got.ok", "got.status"]);
  });

  test("the step in a line, what stands in the way of publishing it, and how its run is said", () => {
    const ctx = { tables, fns };
    expect(stepLine({ act: "http", method: "POST", url: "https://api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage?parse=1", as: "sent" }, ctx, "en")).toBe("POST api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage ← sent");
    expect(stepLine({ act: "http", method: "GET", url: "https://" }, ctx, "en")).toBe("GET https://");
    expect(problemText('"evil.example.com" isn\'t among the allowed sites', "en")).toBe("“evil.example.com” isn't among the allowed sites (it is added in “Connections & secrets”)");
    expect(problemText('No secret called "OTHER_KEY"', "ar")).toBe("ما في سر اسمه «OTHER_KEY»");
    expect(problemText('The secret "HOOK_KEY" isn\'t for "api.telegram.org"', "en")).toBe("The secret “HOOK_KEY” isn't for “api.telegram.org” (its sites are changed in “Connections & secrets”)");
    expect(problemText("A secret is only named in a step that calls a site", "en")).toBe("A secret is only named in a “call a site” step");
    expect(problemText("The address starts with https://", "ar")).toBe("العنوان لازم يبلّش بـ https://");
    expect(problemText("The address is empty", "en")).toBe("The address is empty");
    expect(lineText({ ok: true, say: ["answered", "POST api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage", 200] }, "en")).toBe("POST api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage answered 200");
    expect(lineText({ ok: true, say: ["wouldCall", "GET api.x.com/a"] }, "ar")).toBe("كان رح يتصل: GET api.x.com/a");
    expect(failText("POST api.x.com/a answered 404", "ar")).toBe("POST api.x.com/a جاوب 404");
    expect(failText('The secret "A_KEY" isn\'t for "hooks.example.com"', "en")).toBe("The secret “A_KEY” isn't for “hooks.example.com”");
    expect(failText('"api.x.com" didn\'t answer in time', "ar")).toBe("«api.x.com» ما جاوب بالوقت");
    expect(failText('"api.x.com" points inside the network: it isn\'t called', "en")).toBe("“api.x.com” points inside the network: it isn't called");
    expect(failText("A run calls sites up to 10 times", "en")).toBe("A run calls sites up to 10 times");
  });
});

describe("A step through a ready connection", () => {
  const outside = {
    sites: [],
    secrets: [],
    ready: [{ id: "c1", name: "Store alerts", kind: "telegram", set: ["chat"] }, { id: "c2", name: "Team", kind: "slack", set: [] }],
    kinds: [
      { kind: "telegram", label: "Telegram", actions: [{ id: "message", fields: [{ id: "chat", required: true, long: false, or: "chat" }, { id: "text", required: true, long: true }] }] },
      { kind: "slack", label: "Slack", actions: [{ id: "message", fields: [{ id: "text", required: true, long: true }] }] },
    ],
  };

  test("where it is offered, what it starts with, and what its answer is called by", () => {
    // Before a call to a site: it is the easier way out of the store.
    expect(GROUPS.find((g) => g.key === "outside")?.acts[0]).toBe("ready");
    expect(FAIL_ACTS).toContain("ready");
    // It starts on the first connection, doing the first thing its kind does.
    expect(newStep("ready", { tables, fns, def, outside })).toEqual({ act: "ready", via: "c1", what: "message", give: {} });
    // None connected yet (or a server that says nothing of them): the step still opens, to say where one is made.
    expect(newStep("ready", { tables, fns, def })).toEqual({ act: "ready", via: "", what: "message", give: {} });
    const withSend: FnDef = { inputs: [], do: [{ act: "ready", via: "c1", what: "message", give: { text: "hi" }, as: "sent" }, { act: "return", value: "" }] };
    expect(namesBefore(withSend, ["do", 1]).map((k) => `${k.name}:${k.kind}`)).toEqual(["sent:answer"]);
    expect(offers(withSend, ["do", 1], tables).slice(-3)).toEqual(["sent.body", "sent.ok", "sent.status"]);
  });

  test("the step in a line, what stands in the way of publishing it, and how its run is said", () => {
    const ctx = { tables, fns, outside };
    expect(stepLine({ act: "ready", via: "c1", what: "message", give: { text: "New order from {{input.name}}" }, as: "sent" }, ctx, "en")).toBe("Store alerts · New order from {{input.name}} ← sent");
    expect(stepLine({ act: "ready", via: "c2", what: "message", give: {} }, ctx, "en")).toBe("Team");
    expect(stepLine({ act: "ready", via: "gone", what: "message", give: { text: "hi" } }, ctx, "ar")).toBe("اتصال؟ · hi");
    expect(stepLine({ act: "ready", via: "", what: "message" }, { tables, fns }, "en")).toBe("connection?");
    expect(problemText("Pick a connection", "ar")).toBe("اختار اتصال");
    expect(problemText("This connection isn't there any more", "en")).toBe("This connection isn't there any more");
    expect(problemText('"Store alerts" can\'t do this', "en")).toBe("“Store alerts” can't do this");
    expect(problemText("The chat is empty", "en")).toBe("To which chat? (the connection has no usual one)");
    expect(problemText("The text is empty", "ar")).toBe("النص فاضي");
    expect(lineText({ ok: true, say: ["used", 'Telegram "Store alerts"'] }, "en")).toBe('Sent through Telegram "Store alerts"');
    expect(lineText({ ok: true, say: ["wouldUse", 'Telegram "Store alerts"'] }, "ar")).toBe('كان رح ينبعت عبر Telegram "Store alerts"');
    // The service's own words for its "no" stay as it said them.
    expect(failText('Telegram "Store alerts" answered 400: Bad Request: chat not found', "ar")).toBe("«Store alerts» (Telegram) جاوب 400: Bad Request: chat not found");
    expect(failText('Slack "Team" answered 502', "en")).toBe("Slack “Team” answered 502");
    expect(failText('Slack "Team" answered 502', "ar")).toBe("«Team» (Slack) جاوب 502");
    // A call to a site says it its own way.
    expect(failText("POST api.x.com/a answered 404", "en")).toBe("POST api.x.com/a answered 404");
    expect(failText("This connection isn't there any more", "ar")).toBe("هالاتصال ما عاد موجود");
    expect(failText("The chat is empty", "en")).toBe("There is no chat to send it to");
  });
});

describe("What a function promises to give back", () => {
  test("the promise as the draft keeps it; a field's name", () => {
    expect(tidyGives(undefined)).toBeUndefined();
    // "Anything" is no promise at all.
    expect(tidyGives({ type: "any" })).toBeUndefined();
    expect(tidyGives({ type: "text", fields: [{ name: "left", type: "text" }] })).toEqual({ type: "text" });
    expect(tidyGives({ type: "thing", fields: [] })).toEqual({ type: "thing" });
    expect(tidyGives({ type: "list", fields: [{ name: "id", type: "text", required: true }] })).toEqual({ type: "list", fields: [{ name: "id", type: "text", required: true }] });
    expect(["total", "_id", "$slug", "a1"].map(fieldNameOk)).toEqual([true, true, true, true]);
    expect(["", "1a", "has space", "a.b", "x".repeat(41)].map(fieldNameOk)).toEqual([false, false, false, false, false]);
  });

  test("a function that calls one is offered the fields of its promised answer", () => {
    const order = { ...fns[0], id: "f3", name: "Order", gives: { type: "thing" as const, fields: [{ name: "id", type: "text" as const, required: true }, { name: "total", type: "number" as const }] } };
    const rows = { ...fns[0], id: "f4", name: "Orders", gives: { type: "list" as const, fields: [{ name: "id", type: "text" as const }] } };
    const text = { ...fns[0], id: "f5", name: "Greeting", gives: { type: "text" as const } };
    const calls: FnDef = { inputs: [], do: [{ act: "call", fn: "f3", as: "order" }, { act: "call", fn: "f4", as: "orders" }, { act: "call", fn: "f5", as: "hi" }, { act: "call", fn: "f2", as: "plain" }, { act: "return", value: "" }] };
    const all = [...fns, order, rows, text];
    expect(offers(calls, ["do", 4], tables, all).slice(-8)).toEqual(["order", "order.id", "order.total", "orders", "orders.length", "orders.first.id", "hi", "plain"]);
    // The other functions unknown (or one that promises nothing): the name alone, as before.
    expect(offers(calls, ["do", 4], tables).slice(-4)).toEqual(["order", "orders", "hi", "plain"]);
  });

  test("how an answer differs from the promise, in the page's words", () => {
    expect(shapeText("It promises a number and gave back text", "en")).toBe("It promises a number and gave back text");
    expect(shapeText("It promises a number and gave back text", "ar")).toBe("وعدت بـ رقم ورجّعت نص");
    expect(shapeText("It promises a thing and gave back nothing", "ar")).toBe("وعدت بـ شي بحقول ورجّعت ولا شي");
    expect(shapeText('"total" is promised and isn\'t there', "en")).toBe("“total” is promised and isn't there");
    expect(shapeText('"total" is promised to be a number and is text', "ar")).toBe("الحقل «total» موعود رقم وطلع نص");
    expect(shapeText('Item 2 of the list: "name" is promised to be text and is a number', "en")).toBe("Item 2 of the list: “name” is promised to be text and is a number");
    expect(shapeText('Item 3 of the list: "name" is promised and isn\'t there', "ar")).toBe("العنصر 3 بالقائمة: الحقل «name» موعود ومش موجود");
    expect(shapeText("Item 2 of the list is promised to be a thing and is text", "en")).toBe("Item 2 of the list is promised to be a thing and is text");
    // One the page has no words for stays as the server said it.
    expect(shapeText("Something new", "ar")).toBe("Something new");
    expect(testWhyText("shape", "en")).toBe("It went through, but its answer isn't what it promises:");
  });
});

describe("A value as it is typed", () => {
  test("a number, yes/no, a list or a thing; else words (a name stays words)", () => {
    expect(toVal("12")).toBe(12);
    expect(toVal("-3.5")).toBe(-3.5);
    expect(toVal("true")).toBe(true);
    expect(toVal("false")).toBe(false);
    expect(toVal('["a", 2]')).toEqual(["a", 2]);
    expect(toVal('{"id": "{{row.$id}}"}')).toEqual({ id: "{{row.$id}}" });
    expect(toVal("{{order.total}}")).toBe("{{order.total}}");
    expect(toVal("{not json")).toBe("{not json");
    expect(toVal("12.")).toBe("12.");
    expect(toVal("0599123456789012345")).toBe("0599123456789012345");
    expect(toVal("Hello {{input.name}}")).toBe("Hello {{input.name}}");
    expect([12, true, null, undefined, "x", ["a"], { k: 1 }].map((v) => fromVal(v as never))).toEqual(["12", "true", "", "", "x", '["a"]', '{"k":1}']);
  });
});

describe("The pages' words", () => {
  test("a step in a line", () => {
    const ctx = { tables, fns };
    expect(def.do.map((s) => stepLine(s, ctx, "en"))).toEqual(["Orders ← orders", "{{orders}} is empty", "{{orders}} ← order", "{{sum}}"]);
    expect(stepLine(def.do[0], ctx, "ar")).toBe("الطلبات ← orders");
    expect(stepLine({ act: "find", table: "t1", filters: [{ field: "total", op: "gt", value: 5 }], as: "rows" }, ctx, "en")).toBe("Orders · 1 conditions ← rows");
    expect(stepLine({ act: "find", table: "gone", as: "rows" }, ctx, "en")).toBe("table? ← rows");
    expect(stepLine({ act: "change", table: "t2", row: "{{who.$id}}", values: {}, as: "who" }, ctx, "en")).toBe("customers: {{who.$id}} ← who");
    expect(stepLine({ act: "set", name: "sum", op: "add", value: 5 }, ctx, "en")).toBe("sum add to it 5");
    expect(stepLine({ act: "call", fn: "f2", as: "said" }, ctx, "en")).toBe("Greet ← said");
    expect(stepLine({ act: "call", fn: "", input: {} }, ctx, "en")).toBe("function?");
    expect(stepLine({ act: "email", subject: "Hi", text: "x" }, ctx, "en")).toBe("the shop's email · Hi");
    expect(stepLine({ act: "sms", to: "+972590000000", text: "Ready" }, ctx, "en")).toBe("+972590000000 · Ready");
    expect(stepLine({ act: "stop", message: "" }, ctx, "en")).toBe("—");
    // A code step: its first line that says something, and the name it keeps.
    expect(stepLine({ act: "code", code: "// a remark\n\n  const total = input.rows.length;\nreturn total;", as: "count" }, ctx, "en")).toBe("const total = input.rows.length; ← count");
    expect(stepLine({ act: "code", code: "// only a remark" }, ctx, "en")).toBe("—");
    expect(condsLine([{ left: "{{a}}", cmp: "gt", right: 5 }, { left: "{{b}}", cmp: "notEmpty" }], "any", "en")).toBe("{{a}} is more than 5 or {{b}} is not empty");
    expect(condsLine([], undefined, "en")).toBe("Nothing asked yet");
  });

  test("where a step is, and what stands in the way of publishing", () => {
    expect(whereText("do.2", "en")).toBe("Step 3");
    expect(whereText("do.2.else.0", "en")).toBe("Step 3 ← Else ← Step 1");
    expect(whereText("do.0.do.1", "ar")).toBe("الخطوة 1 ← الخطوة 2");
    expect(whereText("do.5.if.0", "en")).toBe("Step 6 ← Condition 1");
    expect(whereText("if.1", "en")).toBe("Condition 2");
    // The function's own question, as a run's line names it.
    expect(whereText("if", "en")).toBe("The condition");
    expect(whereText("else.0", "en")).toBe("Else ← Step 1");
    expect(whereText("fail.1", "en")).toBe("On failure ← Step 2");
    expect(whereText("do.0.do[3].1", "en")).toBe("Step 1 ← Step 2");
    expect(whereText("inputs", "en")).toBe("The inputs");
    expect(problemText("Pick a table", "ar")).toBe("اختار جدول");
    expect(problemText('No field "colour" in this table', "en")).toBe("No field “colour” in this table");
    expect(problemText('Nothing is kept under "order" before this step', "ar")).toBe("ما في شي محفوظ باسم «order» قبل هالخطوة");
    expect(problemText('"Greet" needs "who"', "en")).toBe("“Greet” needs “who”");
    expect(problemText('"{{1 + 1}}" isn\'t a name', "en")).toBe("“{{1 + 1}}” isn't a name");
    expect(problemText("A loop goes over one named list: {{rows}}", "en")).toBe("A loop goes over one named list, like {{rows}}");
    expect(problemText("The code is empty", "ar")).toBe("الكود فاضي");
    expect(problemText("The code can't be read: SyntaxError: unexpected token in expression: ';' (line 2)", "en")).toBe("The code has a mistake in its writing: SyntaxError: unexpected token in expression: ';' (line 2)");
    expect(problemText("The code can't be read: SyntaxError: unexpected token (line 12)", "ar")).toBe("الكود فيه غلطة كتابة: SyntaxError: unexpected token (السطر 12)");
    expect(problemText("The code can't be read: SyntaxError: unexpected token", "en")).toBe("The code has a mistake in its writing: SyntaxError: unexpected token");
    // One the page doesn't know stays as the server said it.
    expect(problemText("Something new", "ar")).toBe("Something new");
  });

  test("a run, line by line, and how it ended", () => {
    expect(lineText({ ok: true, say: ["found", 3, 3] }, "en")).toBe("3 rows");
    expect(lineText({ ok: true, say: ["found", 3, 20] }, "en")).toBe("3 of 20 rows");
    expect(lineText({ ok: true, say: ["wouldChange", "basel", "customers"] }, "ar")).toBe("كان رح يتعدّل basel بـ customers");
    expect(lineText({ ok: true, say: ["wouldSend", "email", "a@b.c"] }, "en")).toBe("Would send an email to a@b.c");
    expect(lineText({ ok: true, say: ["queued", "sms", "+97259"] }, "ar")).toBe("SMS صار بالدور لـ +97259");
    expect(lineText({ ok: true, say: ["set", "sum", "150.5"] }, "he")).toBe("sum = 150.5");
    expect(lineText({ ok: true, say: ["other"] }, "en")).toBe("No: the other way");
    expect(lineText({ ok: false, error: "No such row to change" }, "ar")).toBe("No such row to change");
    // A code step: that it ran; and why its cage stopped it, in the page's words (what the code itself said stays as said).
    expect(lineText({ ok: true, say: ["ran", 3] }, "en")).toBe("Ran the code (3 ms)");
    expect(lineText({ ok: true, say: ["ran", 3] }, "ar")).toBe("الكود اشتغل (3 ميلي ثانية)");
    expect(lineText({ ok: false, error: "The code ran longer than 2 seconds" }, "ar")).toBe("الكود أخد أكتر من 2 ثواني، فتوقّف");
    expect(failText("The code used more than 32 MB", "en")).toBe("The code used more than 32 MB and was stopped");
    expect(failText("Too much code is running right now: try again in a moment", "ar")).toBe("في كود كتير عم يشتغل هلأ: جرّب بعد شوي");
    expect(failText("The code gave back a promise: it runs straight through, without await", "en")).toBe("The code gave back a promise: it runs straight through, without await");
    expect(failText("The code gave back more than 256 KB", "ar")).toBe("الكود رجّع أكتر من 256 كيلوبايت");
    expect(failText("TypeError: cannot read property 'total' of undefined (line 3)", "ar")).toBe("TypeError: cannot read property 'total' of undefined (line 3)");
    expect(failText("No stock left (line 1)", "ar")).toBe("No stock left (line 1)");
    // What a code step may do, with the cage's limits as the server says them (or the usual ones).
    expect(codeNote(undefined, "en")).toContain("At most 2 seconds and 32 MB, and no await.");
    expect(codeNote({ ms: 3000, memoryMb: 64 }, "en")).toContain("At most 3 seconds and 64 MB");
    expect(codeNote(undefined, "ar")).toContain("بالكتير 2 ثواني و32 ميغا");
    // A code a newer server says: its own English.
    expect(lineText({ ok: true, say: ["teleported", 1], note: "Teleported 1" }, "ar")).toBe("Teleported 1");
    const counts = { added: 1, changed: 2, deleted: 0, sent: 0 };
    expect(outcomeLine({ ok: true, dry: true, counts, ms: 12 }, "en")).toBe("It would have gone through · would have: 1 added، 2 changed · 12 ms");
    expect(outcomeLine({ ok: true, dry: false, counts: { added: 0, changed: 0, deleted: 0, sent: 0 }, ms: 3 }, "en")).toBe("It went through · and changed nothing · 3 ms");
    expect(outcomeLine({ ok: false, dry: false, counts, ms: 8 }, "ar")).toBe("وقفت · 1 انضاف، 2 تعدّل · 8 ms");
    expect([{ published: false, changed: true, enabled: true }, { published: true, changed: true, enabled: true }, { published: true, changed: false, enabled: true }, { published: true, changed: false, enabled: false }].map(stateOf)).toEqual(["draft", "changed", "live", "off"]);
  });
});

describe("What starts a function, in words", () => {
  test("a trigger in a line; how often it fired; what it hands that the function doesn't take", () => {
    expect(triggerLine({ kind: "row", config: { table: "t1", on: ["added", "deleted"] }, slug: null }, tables, "en")).toBe("Orders: added, deleted");
    expect(triggerLine({ kind: "row", config: { table: "t1", on: ["changed"] }, slug: null }, tables, "ar")).toBe("الطلبات: تعدّل");
    expect(triggerLine({ kind: "row", config: { table: "gone", on: ["added"] }, slug: null }, tables, "en")).toBe("table?: added");
    expect(triggerLine({ kind: "schedule", config: { everyMinutes: 15 }, slug: null }, tables, "en")).toBe("Every 15 minutes");
    expect(triggerLine({ kind: "schedule", config: { at: "07:30" }, slug: null }, tables, "ar")).toBe("كل يوم الساعة 07:30");
    expect(triggerLine({ kind: "event", config: { event: "order.created" }, slug: null }, tables, "en")).toBe("A new order");
    expect(triggerLine({ kind: "call", config: { who: "customer" }, slug: "join" }, tables, "en")).toBe("A signed-in shopper");
    expect(triggerLine({ kind: "webhook", config: {}, slug: null }, tables, "en")).toBe("");
    expect(firedText({ fired: 0, lastAt: null, nextAt: null, enabled: true }, "en")).toBe("");
    expect(firedText({ fired: 1200, lastAt: "2026-11-16T09:00:00Z", nextAt: null, enabled: true }, "en")).toMatch(/^It fired 1,200 times, last on 16 Nov/);
    // A switched-off schedule has no next moment to say.
    expect(firedText({ fired: 0, lastAt: null, nextAt: "2026-11-16T09:30:00Z", enabled: false }, "en")).toBe("");
    expect(handsMissing({ hands: ["row", "before", "event"] }, [{ name: "row", type: "any" }])).toEqual(["before", "event"]);
    expect(handsMissing({ hands: [] }, [])).toEqual([]);
  });

  test("what started a run, as the run log names it", () => {
    expect(["admin", "call", "schedule", "webhook", "row.added", "row.deleted", "event.order.created", "event.something.new", "other"].map((t) => fnTriggerName(t, "en"))).toEqual(["From the admin", "A call", "On schedule", "Webhook", "A row added", "A row deleted", "A new order", "something.new", "other"]);
    expect(fnTriggerName("row.changed", "ar")).toBe("سطر تعدّل");
    expect(problemText('The caller has no "password"', "en")).toBe("The caller has no “password” (it has: kind, id, name, email, roles, groups)");
  });
});
