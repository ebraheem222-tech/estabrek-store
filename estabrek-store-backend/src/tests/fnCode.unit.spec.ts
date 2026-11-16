import { afterAll, describe, expect, test } from "vitest";
import { CODE_LIMITS, checkCode, codeProblems, resetCodeForTests, runCode } from "../lib/fnCode.js";
import { FnDefSchema, problemsOf, type FnDef, type Step } from "../lib/fnDef.js";

// The cage a function's "code" step runs in (F2; lib/fnCode.ts), by itself: the owner's JavaScript
// in QuickJS compiled to WebAssembly, inside a worker thread. It is handed values and gives one
// back; it has nothing of the server's (no files, no network, no Node), and it is stopped when it
// takes too long or too much. No database here.

afterAll(resetCodeForTests);
const value = async (code: string, input: unknown = null) => {
  const out = await runCode(code, input);
  if (!out.ok) throw new Error(`${out.why}: ${out.error}`);
  return out.value;
};
const failure = async (code: string, input: unknown = null) => {
  const out = await runCode(code, input);
  if (out.ok) throw new Error(`gave back ${JSON.stringify(out.value)}`);
  return out;
};

describe("The cage", () => {
  test("is handed values and gives one back; what it logs is kept", async () => {
    expect(await value("return input.n * 2;", { n: 21 })).toBe(42);
    const out = await runCode("const total = input.rows.reduce((sum, r) => sum + r.price, 0);\nlog('total', total, { vip: total > 5 });\nreturn { total, names: input.rows.map((r) => r.name.toUpperCase()) };", { rows: [{ name: "shawl", price: 2.5 }, { name: "coat", price: 5 }] });
    expect(out).toMatchObject({ ok: true, value: { total: 7.5, names: ["SHAWL", "COAT"] }, logs: ['total 7.5 {"vip":true}'] });
    // Words in any language come back as they went in.
    expect(await value("return input.name + ' / ' + input.name.length;", { name: "شال حرير" })).toBe("شال حرير / 8");
    // Nothing given back is nothing.
    expect(await value("const x = 1;")).toBeNull();
    expect(await value("return undefined;")).toBeNull();
    // The language itself is all there: dates, maths, JSON, sorting.
    expect(await value("return [new Date(input).getUTCFullYear(), Math.max(1, 7, 3), JSON.parse('[1,2]').length, [3, 1, 2].sort().join('')];", "2026-11-16T10:00:00Z")).toEqual([2026, 7, 2, "123"]);
  });

  test("has nothing of the server's: no require, no process, no network, no timers, no files", async () => {
    expect(await value("return [typeof require, typeof process, typeof fetch, typeof XMLHttpRequest, typeof setTimeout, typeof setInterval, typeof module, typeof globalThis.Buffer, typeof console, typeof import_meta];")).toEqual(Array(10).fill("undefined"));
    // The ways out that work in a browser or in Node find the cage's own world, which holds none of it.
    expect(await value("const g = Function('return this')(); return [typeof g.process, typeof g.require, Object.keys(g).filter((k) => !k.startsWith('__')).sort()];")).toEqual(["undefined", "undefined", ["log"]]);
    expect(await value("return typeof (function () { return this; })();")).toBe("undefined");
    expect((await failure("return import('node:fs');")).ok).toBe(false);
    // What it was handed is a copy: changing it changes nothing outside.
    const given = { list: [1, 2] };
    await value("input.list.push(3); return input.list.length;", given);
    expect(given).toEqual({ list: [1, 2] });
  });

  test("a mistake says what it is and on which line of the owner's code", async () => {
    expect(await failure("const a = 1;\nconst b = 2;\nthrow new Error('no stock left');")).toMatchObject({ why: "error", error: "no stock left", line: 3 });
    expect(await failure("const row = null;\nreturn row.price;")).toMatchObject({ why: "error", line: 2 });
    expect((await failure("const row = null;\nreturn row.price;")).error).toMatch(/^TypeError: /);
    expect(await failure("const a = 1;\nconst b = ;\nreturn a;")).toMatchObject({ why: "syntax", line: 2 });
    // What it logged before failing is kept.
    expect(await failure("log('before');\nundefinedThing();")).toMatchObject({ why: "error", line: 2, logs: ["before"] });
    expect((await failure("function f() { return f(); }\nreturn f();")).error).toMatch(/stack overflow/);
    expect((await failure("const a = {}; a.self = a; return a;")).error).toMatch(/circular/);
    // It runs straight through: a promise isn't an answer.
    expect((await failure("return Promise.resolve(1);")).error).toBe("The code gave back a promise: it runs straight through, without await");
  });

  test("code that never ends is stopped at two seconds, and the next run is fine", async () => {
    const t0 = Date.now();
    const out = await failure("while (true) {}");
    expect(out).toMatchObject({ why: "time", error: "The code ran longer than 2 seconds" });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(CODE_LIMITS.ms - 50);
    expect(Date.now() - t0).toBeLessThan(CODE_LIMITS.ms + 2500);
    expect(await value("return 'fine';")).toBe("fine");
  });

  test("the server's own thread stays free while code spins", async () => {
    let ticks = 0;
    const timer = setInterval(() => ticks++, 25);
    await failure("while (true) {}");
    clearInterval(timer);
    // A thread held for those two seconds would have ticked not once.
    expect(ticks).toBeGreaterThan(20);
  });

  test("code that takes too much memory is stopped, and the next run is fine", async () => {
    expect(await failure("const a = new Uint8Array(64 * 1024 * 1024); return a.length;")).toMatchObject({ why: "memory", error: "The code used more than 32 MB" });
    expect(await failure("const a = []; for (let i = 0; i < 5000000; i++) a.push({ i }); return a.length;")).toMatchObject({ why: "memory" });
    // Well under the limit is fine.
    expect(await value("return new Uint8Array(8 * 1024 * 1024).length;")).toBe(8 * 1024 * 1024);
    expect(await value("return 'fine';")).toBe("fine");
  });

  test("what goes in, what comes out, the code itself and what is logged all have a size", async () => {
    expect(await failure("return 'x'.repeat(300000);")).toMatchObject({ why: "size", error: "The code gave back more than 256 KB" });
    expect(await failure("return 1;", "x".repeat(CODE_LIMITS.input + 1))).toMatchObject({ why: "size", error: "The code is handed more than 512 KB" });
    expect(await failure(`return 1; //${"x".repeat(CODE_LIMITS.code)}`)).toMatchObject({ why: "size" });
    const out = await runCode("for (let i = 0; i < 100; i++) log('line ' + i, 'y'.repeat(1000));\nreturn 1;", null);
    expect(out.logs.length).toBe(CODE_LIMITS.logs);
    expect(out.logs[0].length).toBe(CODE_LIMITS.logLine);
  });

  test("runs wait their turn and each gets its own answer; a line that is too long says busy", async () => {
    const many = await Promise.all(Array.from({ length: 30 }, (_, i) => runCode("return input * 2;", i)));
    expect(many.map((o) => (o.ok ? o.value : o.why))).toEqual(Array.from({ length: 30 }, (_, i) => i * 2));
    // Each run is its own world: what one leaves behind, the next doesn't find.
    await value("globalThis.left = 'behind'; return 1;");
    expect(await value("return typeof globalThis.left;")).toBe("undefined");
    // One running, forty waiting; the rest are told at once.
    const slow = "let s = 0; for (let i = 0; i < 400000; i++) s += i; return s;";
    const crowd = await Promise.all(Array.from({ length: CODE_LIMITS.waiting + 12 }, () => runCode(slow, null)));
    const busy = crowd.filter((o) => !o.ok && o.why === "busy");
    expect(busy.length).toBeGreaterThanOrEqual(10);
    expect(busy[0]).toMatchObject({ error: "Too much code is running right now: try again in a moment" });
    expect(crowd.filter((o) => o.ok).length).toBe(crowd.length - busy.length);
    expect(await value("return 'fine';")).toBe("fine");
  });

  test("checked before publishing: a mistake in the writing is found without running the code", async () => {
    expect(await checkCode("return input.total * 2;")).toBeNull();
    expect(await checkCode("const a = 1;\nconst b = ;\nreturn a;")).toMatchObject({ error: expect.stringMatching(/^SyntaxError: /), line: 2 });
    // Not run: code that would spin for ever is read in no time.
    const t0 = Date.now();
    expect(await checkCode("while (true) {}")).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1500);
    // A mistake that only shows when it runs isn't one of the writing.
    expect(await checkCode("return nothingCalledThis();")).toBeNull();
  });
});

describe("The code step in a function", () => {
  const def = (steps: Step[], more: Partial<FnDef> = {}): FnDef => ({ inputs: [], do: steps, ...more });
  const known = { tables: [], fns: [] };

  test("its shape: code, what it is handed by name, and a name to keep the answer under", () => {
    const ok = FnDefSchema.safeParse(def([{ act: "code", code: "return input.rows.length;", give: { rows: "{{rows}}", limit: 5 }, as: "count" }]));
    expect(ok.success).toBe(true);
    expect(FnDefSchema.safeParse(def([{ act: "code", code: "x".repeat(8001) }])).success).toBe(false);
    expect(FnDefSchema.safeParse(def([{ act: "code", code: "return 1;", give: { "not a name": 1 } }])).success).toBe(false);
    expect(FnDefSchema.safeParse(def([{ act: "code", code: "return 1;", as: "input" }])).success).toBe(false);
    // After a failure a function tells someone or writes it down: it doesn't run code.
    expect(FnDefSchema.safeParse(def([], { fail: [{ act: "code", code: "return 1;" }] })).success).toBe(false);
  });

  test("before publishing: the code isn't empty, the names it is handed are known, and what it keeps is known after it", () => {
    expect(problemsOf(def([{ act: "code", code: "  " }]), known)).toEqual([{ at: "do.0", message: "The code is empty" }]);
    expect(problemsOf(def([{ act: "code", code: "return 1;", give: { rows: "{{rows}}" } }]), known)).toEqual([{ at: "do.0", message: 'Nothing is kept under "rows" before this step' }]);
    expect(
      problemsOf(
        def([
          { act: "set", name: "base", value: 10 },
          { act: "code", code: "return input.base * 2;", give: { base: "{{base}}" }, as: "double" },
          { act: "return", value: "{{double}}" },
        ]),
        known,
      ),
    ).toEqual([]);
  });

  test("before publishing: every code step that can't be read is named where it is, however deep", async () => {
    const steps: Step[] = [
      { act: "code", code: "return 1;" },
      { act: "code", code: "return ;;) 2" },
      { act: "if", if: [{ left: 1, cmp: "eq", right: 1 }], do: [{ act: "set", name: "a", value: 1 }, { act: "code", code: "const x = 1;\nlet = 5;" }], else: [{ act: "code", code: "return {" }] },
      { act: "each", list: "{{rows}}", do: [{ act: "code", code: "return [;" }] },
      // An empty one is said by the other check, not twice.
      { act: "code", code: "" },
    ];
    const found = await codeProblems(def(steps, { else: [{ act: "code", code: "return )" }] }));
    expect(found.map((p) => p.at)).toEqual(["do.1", "do.2.do.1", "do.2.else.0", "do.3.do.0", "else.0"]);
    expect(found[0].message).toMatch(/^The code can't be read: SyntaxError: .+ \(line 1\)$/);
    expect(found[1].message).toMatch(/\(line 2\)$/);
  });
});
