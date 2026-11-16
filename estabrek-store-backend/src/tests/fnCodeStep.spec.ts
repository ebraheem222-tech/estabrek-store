import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { resetCodeForTests } from "../lib/fnCode.js";
import type { FnDef } from "../lib/fnDef.js";
import { resetRunsForTests } from "../lib/runs.js";

// A function's "code" step (F2), with the database: JavaScript the owner writes for what the steps
// can't say, between steps that read and write. It is handed what the step names and gives one
// value back for the steps after it; it runs in its cage (lib/fnCode.ts), also in a try-out.
// Requests to /v1/admin without a token run as the test owner.

const PREFIX = "fncode-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
type Line = { at: string; act: string; ok: boolean; ms: number; note?: string; say?: unknown[]; error?: string; log?: string[] };
type Out = { ok: boolean; dry: boolean; value: any; error: string | null; failedAt: string | null; trace: Line[]; counts: Record<string, number>; ms: number };

const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const addRows = async (id: string, rows: Array<{ slug: string; values: Record<string, unknown> }>) => (await request(app).post(`${admin}/collections/${id}/rows/import`).send({ lang: "en", rows }).expect(200)).body as { created: number };
const rowsOf = (id: string) => prisma.collectionItem.findMany({ where: { collectionId: id, deletedAt: null }, orderBy: { slug: "asc" } });
const draft = async (name: string, def: Partial<FnDef>) => {
  const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200)).body;
  return { id: made.id as string, problems: saved.problems as Array<{ at: string; message: string }> };
};
const fn = async (name: string, def: Partial<FnDef>) => {
  const made = await draft(name, def);
  expect(made.problems).toEqual([]);
  await request(app).post(`${at}/${made.id}/publish`).expect(200);
  return made.id;
};
const run = async (id: string, input: Record<string, unknown> = {}, opts: { dry?: boolean; which?: "draft" | "live" } = {}) => (await request(app).post(`${at}/${id}/run`).send({ input, dry: false, which: "live", ...opts }).expect(200)).body as Out;

let orders = "";
let totals = "";

async function clean(tables = false) {
  await resetRunsForTests();
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.adminNotification.deleteMany({ where: { title: { startsWith: PREFIX } } });
  for (const id of [totals]) if (id) await prisma.collectionItem.deleteMany({ where: { collectionId: id } });
  if (!tables) return;
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
}

beforeAll(async () => {
  await clean(true);
  orders = await mk(`${PREFIX}orders`, [
    { id: "customer", type: "text", required: true },
    { id: "total", type: "number" },
    { id: "day", type: "date" },
  ]);
  totals = await mk(`${PREFIX}totals`, [
    { id: "customer", type: "text", required: true },
    { id: "sum", type: "number" },
    { id: "orders", type: "number" },
    { id: "best", type: "text" },
  ]);
  await addRows(orders, [
    { slug: "o1", values: { customer: "Sara", total: 120, day: "2026-11-01" } },
    { slug: "o2", values: { customer: "Lina", total: 80.5, day: "2026-11-03" } },
    { slug: "o3", values: { customer: "Sara", total: 200, day: "2026-11-09" } },
    { slug: "o4", values: { customer: "Sara", total: 15, day: "2026-11-12" } },
  ]);
});
beforeEach(() => clean());
afterAll(async () => {
  await clean(true);
  resetCodeForTests();
});

/** Each customer's orders summed up: what "find" and "each" alone can't say in one go. */
const SUMS = [
  "const by = {};",
  "for (const o of input.orders) {",
  "  const c = (by[o.customer] ??= { customer: o.customer, sum: 0, orders: 0, best: null });",
  "  c.sum += o.total;",
  "  c.orders += 1;",
  "  if (!c.best || o.total > c.best.total) c.best = { total: o.total, slug: o.$slug };",
  "}",
  "const list = Object.values(by).sort((a, b) => b.sum - a.sum).map((c) => ({ ...c, best: c.best.slug }));",
  "log('customers', list.length, 'over', input.over);",
  "return list.filter((c) => c.sum > input.over);",
].join("\n");

describe("A function's code step", () => {
  test("works out what the steps can't: handed rows, it gives back a value the steps after it use", async () => {
    const id = await fn("sums", {
      inputs: [{ name: "over", type: "number" }],
      do: [
        { act: "find", table: orders, as: "found", sort: [{ field: "$slug" }] },
        { act: "code", code: SUMS, give: { orders: "{{found}}", over: "{{input.over}}" }, as: "sums" },
        { act: "each", list: "{{sums}}", as: "c", do: [{ act: "add", table: totals, values: { customer: "{{c.customer}}", sum: "{{c.sum}}", orders: "{{c.orders}}", best: "{{c.best}}" }, status: "PUBLISHED" }] },
        { act: "return", value: "{{sums}}" },
      ],
    });
    const out = await run(id, { over: 100 });
    expect(out).toMatchObject({ ok: true, value: [{ customer: "Sara", sum: 335, orders: 3, best: "o3" }], counts: { added: 1 } });
    // The code's own line: that it ran, and what it logged.
    const line = out.trace.find((l) => l.act === "code")!;
    expect(line).toMatchObject({ at: "do.1", ok: true, say: ["ran", expect.any(Number)], log: ["customers 2 over 100"] });
    expect(line.note).toMatch(/^Ran the code \(\d+ ms\)$/);
    // What it gave back was written by the step after it.
    expect((await rowsOf(totals)).map((r) => r.data)).toEqual([{ customer: { en: "Sara" }, sum: 335, orders: 3, best: { en: "o3" } }]);
    // Everyone, with nothing to be over.
    expect((await run(id, { over: 0 })).value.map((c: { customer: string; sum: number }) => [c.customer, c.sum])).toEqual([["Sara", 335], ["Lina", 80.5]]);
  });

  test("a try-out runs the code as it is (it can't write or send), and writes nothing", async () => {
    const id = await fn("dry", {
      do: [
        { act: "find", table: orders, as: "found" },
        { act: "code", code: SUMS, give: { orders: "{{found}}", over: 0 }, as: "sums" },
        { act: "add", table: totals, values: { customer: "{{sums.0.customer}}", sum: "{{sums.0.sum}}" } },
        { act: "return", value: "{{sums.length}}" },
      ],
    });
    const out = await run(id, {}, { dry: true });
    expect(out).toMatchObject({ ok: true, dry: true, value: 2 });
    expect(out.trace.map((l) => `${l.act}:${l.ok}`)).toEqual(["find:true", "code:true", "add:true", "return:true"]);
    expect(out.trace[2].note).toMatch(/^Would add a row/);
    expect(await rowsOf(totals)).toEqual([]);
  });

  test("code that fails ends the run where it is, with its line; what the function does about it still runs", async () => {
    const id = await fn("fails", {
      do: [
        { act: "notify", title: `${PREFIX}before` },
        { act: "code", code: "log('about to fail');\nconst first = input.rows[0];\nreturn first.total;", give: { rows: [] }, as: "x" },
        { act: "notify", title: `${PREFIX}after` },
      ],
      fail: [{ act: "notify", title: `${PREFIX}failed`, text: "{{error}}" }],
    });
    const out = await run(id);
    expect(out).toMatchObject({ ok: false, failedAt: "do.1", value: null });
    expect(out.error).toMatch(/^TypeError: .+ \(line 3\)$/);
    expect(out.trace.find((l) => l.act === "code")).toMatchObject({ ok: false, log: ["about to fail"] });
    // What was done before stays; what came after never ran; the failure was told.
    const bells = await prisma.adminNotification.findMany({ where: { title: { startsWith: PREFIX } }, orderBy: { createdAt: "asc" } });
    expect(bells.map((b) => b.title.slice(PREFIX.length))).toEqual(["before", "failed"]);
    expect(bells[1].body).toMatch(/\(line 3\)$/);
    // The code's own word for it is the reason.
    const said = await fn("says", { do: [{ act: "code", code: "if (input.stock < 1) throw new Error('No stock left');\nreturn true;", give: { stock: 0 } }] });
    expect(await run(said)).toMatchObject({ ok: false, error: "No stock left (line 1)" });
  });

  test("code that never ends is stopped at two seconds, and the server keeps answering meanwhile", async () => {
    const id = await fn("spins", { do: [{ act: "code", code: "while (true) {}" }, { act: "return", value: "never" }] });
    const t0 = Date.now();
    const spinning = run(id);
    // While it spins: other requests are answered at once.
    await new Promise((r) => setTimeout(r, 300));
    const t1 = Date.now();
    await request(app).get(at).expect(200);
    await request(app).get("/health").expect(200);
    const answered = Date.now() - t1;
    const out = await spinning;
    expect(out).toMatchObject({ ok: false, failedAt: "do.0", error: "The code ran longer than 2 seconds" });
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(answered).toBeLessThan(1200);
    // And the cage is fine for the next run.
    const next = await fn("next", { do: [{ act: "code", code: "return 6 * 7;", as: "n" }, { act: "return", value: "{{n}}" }] });
    expect((await run(next)).value).toBe(42);
  });

  test("code that can't be read is said where it is, and isn't published", async () => {
    const made = await draft("unreadable", {
      do: [
        { act: "code", code: "return 1;", as: "one" },
        { act: "if", if: [{ left: "{{one}}", cmp: "eq", right: 1 }], do: [{ act: "code", code: "const a = 1;\nreturn a +;" }] },
      ],
    });
    expect(made.problems).toEqual([{ at: "do.1.do.0", message: expect.stringMatching(/^The code can't be read: SyntaxError: .+ \(line 2\)$/) }]);
    const refused = await request(app).post(`${at}/${made.id}/publish`).expect(409);
    expect(refused.body).toMatchObject({ error: "FN_HAS_PROBLEMS", details: { problems: [{ at: "do.1.do.0" }] } });
    expect((await request(app).get(`${at}/${made.id}`).expect(200)).body.problems).toHaveLength(1);
    // Mended, it publishes.
    await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [{ act: "code", code: "return 1;", as: "one" }, { act: "return", value: "{{one}}" }] } }).expect(200);
    await request(app).post(`${at}/${made.id}/publish`).expect(200);
    expect((await run(made.id)).value).toBe(1);
  });

  test("the builder is told the cage's limits; code longer than its limit isn't saved", async () => {
    const list = (await request(app).get(at).expect(200)).body;
    expect(list.limits).toMatchObject({ code: 8000, cage: { ms: 2000, memoryMb: 32 } });
    const made = (await request(app).post(at).send({ name: `${PREFIX}long` }).expect(201)).body;
    await request(app).put(`${at}/${made.id}`).send({ draft: { inputs: [], do: [{ act: "code", code: `return 1; //${"x".repeat(8000)}` }] } }).expect(400);
  });
});
