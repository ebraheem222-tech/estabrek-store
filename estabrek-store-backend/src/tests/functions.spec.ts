import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { FN_LIMITS, type FnDef, type Step } from "../lib/fnDef.js";
import { flushRuns, resetRunsForTests } from "../lib/runs.js";

// Functions (F1), with the database: logic the owner builds from steps, tries dry, publishes, and
// runs. A run reads and writes the owner's own tables under their fields' rules, keeps what its
// steps make under names, and ends with what it gives back or why it stopped. Requests to
// /v1/admin without a token run as the test owner.

const PREFIX = "fn-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
type Out = { ok: boolean; dry: boolean; value: any; error: string | null; failedAt: string | null; trace: Array<{ at: string; act: string; ok: boolean; note?: string; error?: string }>; counts: Record<string, number> };

const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const addRows = async (id: string, rows: Array<{ slug: string; status?: string; values: Record<string, unknown> }>) => (await request(app).post(`${admin}/collections/${id}/rows/import`).send({ lang: "en", rows }).expect(200)).body as { created: number };
const rowsOf = (id: string) => prisma.collectionItem.findMany({ where: { collectionId: id, deletedAt: null }, orderBy: { slug: "asc" } });
const data = (row: { data: unknown }) => row.data as Record<string, any>;

/** A function saved with these steps; published unless `publish` is false. */
async function fn(name: string, def: Partial<FnDef>, publish = true) {
  const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { inputs: [], do: [], ...def } }).expect(200)).body;
  expect(saved.problems).toEqual([]);
  if (publish) await request(app).post(`${at}/${made.id}/publish`).expect(200);
  return made.id as string;
}
const run = async (id: string, input: Record<string, unknown> = {}, opts: { dry?: boolean; which?: "draft" | "live" } = {}) => (await request(app).post(`${at}/${id}/run`).send({ input, dry: false, which: "live", ...opts }).expect(200)).body as Out;
const notes = (out: Out) => out.trace.map((l) => `${l.at} ${l.act}: ${l.ok ? l.note : `✗ ${l.error}`}`);
const bells = () => prisma.adminNotification.findMany({ where: { title: { startsWith: PREFIX } }, orderBy: { createdAt: "asc" } });
const logged = async () => {
  await flushRuns();
  await flushRuns();
  return prisma.run.findMany({ where: { kind: "function", name: { startsWith: PREFIX } }, orderBy: [{ startedAt: "asc" }, { id: "asc" }] });
};

let customers = "";
let orders = "";

async function cleanRows() {
  await resetRunsForTests();
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.adminNotification.deleteMany({ where: { title: { startsWith: PREFIX } } });
  await prisma.outboxMessage.deleteMany({ where: { to: { endsWith: "@fn-spec.test" } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@fn-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  invalidateAccess();
  for (const id of [customers, orders]) if (id) await prisma.collectionItem.deleteMany({ where: { collectionId: id } });
}
async function clean() {
  await cleanRows();
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
}

beforeAll(async () => {
  await clean();
  customers = await mk(`${PREFIX}customers`, [
    { id: "name", type: "text", required: true },
    { id: "email", type: "email", unique: true },
    { id: "points", type: "number", min: 0 },
    { id: "vip", type: "boolean" },
  ]);
  orders = await mk(`${PREFIX}orders`, [
    { id: "title", type: "text", required: true },
    { id: "total", type: "number", min: 0 },
    { id: "state", type: "select", options: [{ id: "new" }, { id: "paid" }] },
    { id: "customer", type: "relation", to: customers },
  ]);
});
beforeEach(cleanRows);
afterAll(clean);

/** Points for a customer found by email, made when there is none; a VIP from 100 points. */
const pointsDef = (): Partial<FnDef> => ({
  lang: "en",
  inputs: [{ name: "email", type: "text", required: true }, { name: "amount", type: "number", required: true }],
  do: [
    { act: "find", table: customers, filters: [{ field: "email", op: "is", value: "{{input.email}}" }], limit: 1, as: "found" },
    {
      act: "if",
      if: [{ left: "{{found}}", cmp: "empty" }],
      do: [{ act: "add", table: customers, status: "PUBLISHED", values: { name: "{{input.email}}", email: "{{input.email}}", points: "{{input.amount}}" }, as: "customer" }],
      else: [
        { act: "set", name: "points", value: "{{found.first.points}}" },
        { act: "set", name: "points", op: "add", value: "{{input.amount}}" },
        { act: "change", table: customers, row: "{{found.first}}", values: { points: "{{points}}" }, as: "customer" },
      ],
    },
    {
      act: "if",
      if: [{ left: "{{customer.points}}", cmp: "gte", right: 100 }, { left: "{{customer.vip}}", cmp: "ne", right: true }],
      do: [
        { act: "change", table: customers, row: "{{customer.$id}}", values: { vip: true }, as: "customer" },
        { act: "notify", title: `${PREFIX}VIP: {{customer.name}}`, text: "{{customer.points}} points", link: "/admin/data" },
      ],
    },
    { act: "return", value: { id: "{{customer.$id}}", points: "{{customer.points}}", vip: "{{customer.vip}}" } },
  ],
});

describe("Building one", () => {
  test("the list says what a builder needs; a new function is an empty draft", async () => {
    const list = (await request(app).get(at).expect(200)).body;
    expect(list.limits).toMatchObject({ steps: FN_LIMITS.steps, loop: FN_LIMITS.loop });
    expect(list.cmps).toContain("notEmpty");
    expect(list.ops.number).toContain("gt");
    const table = list.tables.find((t: { id: string }) => t.id === customers);
    expect(table).toMatchObject({ slug: `${PREFIX}customers` });
    expect(table.fields.map((f: { id: string; type: string }) => `${f.id}:${f.type}`)).toEqual(["name:text", "email:email", "points:number", "vip:boolean"]);

    const made = (await request(app).post(at).send({ name: `${PREFIX}first`, note: "A note" }).expect(201)).body;
    expect(made).toMatchObject({ name: `${PREFIX}first`, note: "A note", enabled: true, published: false, steps: 0, runs: 0, draft: { inputs: [], do: [] }, live: null, problems: [] });
    expect((await request(app).get(at).expect(200)).body.functions.map((f: { id: string }) => f.id)).toContain(made.id);
    expect((await request(app).post(at).send({ name: "" }).expect(400)).body.error).toBe("VALIDATION_ERROR");
    expect((await request(app).get(`${at}/nope`).expect(404)).body.error).toBe("FN_NOT_FOUND");
  });

  test("a draft is checked for its shape when saved, and for what it talks about before it is published", async () => {
    const id = (await request(app).post(at).send({ name: `${PREFIX}draft` }).expect(201)).body.id;
    // Not a function at all: refused, saying where.
    const bad = (await request(app).put(`${at}/${id}`).send({ draft: { inputs: [], do: [{ act: "set", name: "Total", value: 1 }, { act: "launch" }] } }).expect(400)).body;
    expect(bad.error).toBe("FN_INVALID");
    expect(bad.details.issues.map((i: { at: string }) => i.at)).toEqual(expect.arrayContaining(["do.0.name"]));
    // A draft may talk about what isn't there (it is being worked on); the page is told.
    const draft = { inputs: [], do: [{ act: "find", table: "gone", as: "rows" }, { act: "notify", title: "{{nothing.title}}" }] };
    const saved = (await request(app).put(`${at}/${id}`).send({ draft, name: `${PREFIX}renamed`, note: "" }).expect(200)).body;
    expect(saved).toMatchObject({ name: `${PREFIX}renamed`, note: null, steps: 2, published: false });
    expect(saved.problems).toEqual([
      { at: "do.0", message: "This table isn't there any more" },
      { at: "do.1", message: 'Nothing is kept under "nothing" before this step' },
    ]);
    // Publishing waits for them.
    const refused = (await request(app).post(`${at}/${id}/publish`).expect(409)).body;
    expect(refused.error).toBe("FN_HAS_PROBLEMS");
    expect(refused.details.problems).toHaveLength(2);
    // Nothing to publish in an empty one.
    await request(app).put(`${at}/${id}`).send({ draft: { inputs: [], do: [] } }).expect(200);
    expect((await request(app).post(`${at}/${id}/publish`).expect(409)).body.error).toBe("FN_EMPTY");
  });

  test("what runs is what was published: the draft is tried dry, and changes nothing live until published again", async () => {
    const id = await fn("live", { do: [{ act: "return", value: "one" }] }, false);
    // Not published: nothing to run for real, and the draft never runs for real.
    expect((await request(app).post(`${at}/${id}/run`).send({ dry: false, which: "live" }).expect(409)).body.error).toBe("FN_NOT_PUBLISHED");
    expect((await request(app).post(`${at}/${id}/run`).send({ dry: false, which: "draft" }).expect(400)).body.error).toBe("FN_DRAFT_IS_DRY");
    expect((await run(id, {}, { dry: true, which: "draft" })).value).toBe("one");
    const live = (await request(app).post(`${at}/${id}/publish`).expect(200)).body;
    expect(live).toMatchObject({ published: true, changed: false, live: { do: [{ act: "return", value: "one" }] } });
    expect((await run(id)).value).toBe("one");
    // The draft moves on; what runs doesn't.
    const edited = (await request(app).put(`${at}/${id}`).send({ draft: { inputs: [], do: [{ act: "return", value: "two" }] } }).expect(200)).body;
    expect(edited.changed).toBe(true);
    expect((await run(id)).value).toBe("one");
    expect((await run(id, {}, { dry: true, which: "draft" })).value).toBe("two");
    await request(app).post(`${at}/${id}/publish`).expect(200);
    expect((await run(id)).value).toBe("two");
    // Each real run is counted and written in the run log; dry ones aren't.
    expect((await request(app).get(`${at}/${id}`).expect(200)).body.runs).toBe(3);
    expect((await logged()).map((r) => [r.name, r.ref, r.trigger, r.ok])).toEqual([[`${PREFIX}live`, id, "admin", true], [`${PREFIX}live`, id, "admin", true], [`${PREFIX}live`, id, "admin", true]]);
  });
});

describe("A run", () => {
  test("finds, adds, changes: a customer's points, made the first time and added to after", async () => {
    const id = await fn("points", pointsDef());
    const first = await run(id, { email: "amal@fn-spec.test", amount: "60" });
    expect(first).toMatchObject({ ok: true, dry: false, error: null, counts: { added: 1, changed: 0 } });
    expect(first.value).toMatchObject({ points: 60, vip: null });
    let rows = await rowsOf(customers);
    expect(rows).toHaveLength(1);
    // Words are written in the function's language; the number came as words and is a number.
    expect(data(rows[0])).toMatchObject({ name: { en: "amal@fn-spec.test" }, email: "amal@fn-spec.test", points: 60 });
    expect(rows[0].status).toBe("PUBLISHED");
    expect(first.value.id).toBe(rows[0].id);
    expect(notes(first)).toEqual([
      "do.0 find: 0 rows",
      "do.1 if: Yes",
      `do.1.do.0 add: Added ${rows[0].slug} to ${PREFIX}customers`,
      "do.2 if: No",
      "do.3 return: Gave back its answer",
    ]);

    const second = await run(id, { email: "amal@fn-spec.test", amount: 60 });
    expect(second.value).toEqual({ id: rows[0].id, points: 120, vip: true });
    expect(second.counts).toMatchObject({ found: 1, added: 0, changed: 2 });
    rows = await rowsOf(customers);
    expect(rows).toHaveLength(1);
    expect(data(rows[0])).toMatchObject({ points: 120, vip: true });
    expect((await bells()).map((b) => [b.title, b.body, b.link])).toEqual([[`${PREFIX}VIP: amal@fn-spec.test`, "120 points", "/admin/data"]]);
    // A VIP already: the third run adds points and says nothing.
    expect((await run(id, { email: "amal@fn-spec.test", amount: 5 })).value).toMatchObject({ points: 125, vip: true });
    expect(await bells()).toHaveLength(1);
    expect((await logged()).map((r) => [r.ok, r.result])).toEqual([[true, { added: 1 }], [true, { found: 1, changed: 2 }], [true, { found: 1, changed: 1 }]]);
  });

  test("dry: every step says what it would do, and nothing is written or sent", async () => {
    await addRows(customers, [{ slug: "basel", status: "PUBLISHED", values: { name: "Basel", email: "basel@fn-spec.test", points: 90 } }]);
    const id = await fn("points", pointsDef());
    const out = await run(id, { email: "basel@fn-spec.test", amount: 20 }, { dry: true });
    expect(out).toMatchObject({ ok: true, dry: true });
    // The answer is what it would have been.
    expect(out.value).toMatchObject({ points: 110, vip: true });
    expect(notes(out)).toEqual([
      "do.0 find: 1 rows",
      "do.1 if: No: the other way",
      "do.1.else.0 set: points = 90",
      "do.1.else.1 set: points = 110",
      `do.1.else.2 change: Would change basel in ${PREFIX}customers`,
      "do.2 if: Yes",
      `do.2.do.0 change: Would change basel in ${PREFIX}customers`,
      `do.2.do.1 notify: Would ring the bell: ${PREFIX}VIP: Basel`,
      "do.3 return: Gave back its answer",
    ]);
    expect(data((await rowsOf(customers))[0])).toMatchObject({ points: 90 });
    expect(data((await rowsOf(customers))[0]).vip).toBeUndefined();
    expect(await bells()).toHaveLength(0);
    expect(await logged()).toHaveLength(0);
    // Each line also says what it did as a code and its things, for the admin to say in its own language.
    expect(out.trace.map((l) => (l as { say?: unknown[] }).say)).toEqual([["found", 1, 1], ["other"], ["set", "points", "90"], ["set", "points", "110"], ["wouldChange", "basel", `${PREFIX}customers`], ["yes"], ["wouldChange", "basel", `${PREFIX}customers`], ["wouldRing", `${PREFIX}VIP: Basel`], ["returned"]]);
    // A new customer, dry: the row is checked as a real one would be, and isn't made.
    const fresh = await run(id, { email: "new@fn-spec.test", amount: 5 }, { dry: true });
    expect(fresh.value).toMatchObject({ id: "(new 1)", points: 5, vip: null });
    expect(await rowsOf(customers)).toHaveLength(1);
    const wrong = await run(id, { email: "not an email", amount: 5 }, { dry: true });
    expect(wrong).toMatchObject({ ok: false, failedAt: "do.1.do.0" });
    expect(wrong.error).toMatch(/^email: /);
  });

  test("dry: later steps see a row as the earlier ones would have left it (made, changed, deleted)", async () => {
    const id = await fn("chain", {
      lang: "en",
      do: [
        { act: "add", table: customers, values: { name: "Temp", email: "temp@fn-spec.test" }, as: "made" },
        { act: "change", table: customers, row: "{{made.$id}}", values: { points: 7 } },
        { act: "get", table: customers, row: "{{made.$id}}", as: "again" },
        { act: "delete", table: customers, row: "{{made}}" },
        { act: "get", table: customers, row: "{{made.$id}}", as: "gone" },
        { act: "return", value: { name: "{{again.name}}", points: "{{again.points}}", gone: "{{gone}}" } },
      ],
    });
    const dry = await run(id, {}, { dry: true });
    expect(dry).toMatchObject({ ok: true, value: { name: "Temp", points: 7, gone: null }, counts: { added: 1, changed: 1, deleted: 1 } });
    expect(await rowsOf(customers)).toHaveLength(0);
    // For real it gives the same answer; the row was made, and is in the trash.
    expect((await run(id)).value).toEqual({ name: "Temp", points: 7, gone: null });
    expect(await rowsOf(customers)).toHaveLength(0);
    expect(await prisma.collectionItem.count({ where: { collectionId: customers, deletedAt: { not: null } } })).toBe(1);
  });

  test("goes over a list, keeps a sum, links rows, and deletes", async () => {
    await addRows(customers, [{ slug: "amal", status: "PUBLISHED", values: { name: "Amal", email: "amal@fn-spec.test" } }]);
    await addRows(orders, [
      { slug: "o1", values: { title: "Scarf", total: 100, state: "new", customer: "amal" } },
      { slug: "o2", values: { title: "Bag", total: 50.5, state: "new", customer: "amal" } },
      { slug: "o3", values: { title: "Old", total: 10, state: "paid" } },
    ]);
    const id = await fn("pay", {
      lang: "en",
      inputs: [{ name: "customer", type: "text", required: true }],
      do: [
        { act: "get", table: customers, row: "{{input.customer}}", as: "who" },
        { act: "if", if: [{ left: "{{who}}", cmp: "empty" }], do: [{ act: "stop", message: "No customer {{input.customer}}" }] },
        { act: "find", table: orders, filters: [{ field: "state", op: "is", value: "new" }], sort: [{ field: "total", dir: "desc" }], as: "open" },
        { act: "set", name: "sum", value: 0 },
        { act: "set", name: "titles", value: [] },
        {
          act: "each",
          list: "{{open}}",
          as: "order",
          do: [
            { act: "change", table: orders, row: "{{order}}", values: { state: "paid" } },
            { act: "set", name: "sum", op: "add", value: "{{order.total}}" },
            { act: "set", name: "titles", op: "append", value: "{{index}}:{{order.title}} for {{order.customer.0.title}}" },
          ],
        },
        { act: "add", table: orders, values: { title: "Receipt for {{who.name}}", total: "{{sum}}", state: "paid", customer: ["{{who.$id}}"] }, as: "receipt" },
        { act: "delete", table: orders, row: "o3" },
        { act: "delete", table: orders, row: "never-was" },
        { act: "return", value: { sum: "{{sum}}", titles: "{{titles}}", receipt: "{{receipt.customer.0.slug}}", count: "{{open.length}}" } },
      ],
    });
    const out = await run(id, { customer: "amal" });
    expect(out.error).toBeNull();
    expect(out.value).toEqual({ sum: 150.5, titles: ["0:Scarf for Amal", "1:Bag for Amal"], receipt: "amal", count: 2 });
    expect(out.counts).toMatchObject({ found: 3, changed: 2, added: 1, deleted: 1 });
    const left = await rowsOf(orders);
    expect(left.map((r) => [r.slug.startsWith("receipt") ? "receipt" : r.slug, data(r).state, data(r).total])).toEqual([["o1", "paid", 100], ["o2", "paid", 50.5], ["receipt", "paid", 150.5]]);
    // Deleted means the trash, where the owner can bring it back.
    expect(await prisma.collectionItem.count({ where: { collectionId: orders, slug: "o3", deletedAt: { not: null } } })).toBe(1);
    expect(notes(out).filter((n) => n.includes("delete"))).toEqual([`do.7 delete: Moved o3 to the trash of ${PREFIX}orders`, "do.8 delete: No such row (nothing to delete)"]);
    // Someone who isn't there: it stops, saying so.
    expect(await run(id, { customer: "nobody" })).toMatchObject({ ok: false, error: "No customer nobody", failedAt: "do.1.do.0", value: null });
  });

  test("a step that fails ends the run: what was done before stays, and the function says what to do about it", async () => {
    const id = await fn("fails", {
      lang: "en",
      do: [
        { act: "add", table: customers, values: { name: "Kept", email: "kept@fn-spec.test" }, as: "made" },
        // No name: the table's own rule refuses it.
        { act: "add", table: customers, values: { email: "nameless@fn-spec.test" } },
        { act: "add", table: customers, values: { name: "Never reached" } },
      ],
      fail: [
        { act: "notify", title: `${PREFIX}failed`, text: "{{error}} (after {{made.name}})" },
        { act: "change", table: customers, row: "nobody", values: { points: 1 } },
        { act: "notify", title: `${PREFIX}never` },
      ],
    });
    const out = await run(id);
    expect(out).toMatchObject({ ok: false, failedAt: "do.1", value: null, counts: { added: 1 } });
    expect(out.error).toMatch(/^name: /);
    expect((await rowsOf(customers)).map((r) => data(r).email)).toEqual(["kept@fn-spec.test"]);
    // The failure steps ran up to their own failure, which changes nothing.
    expect((await bells()).map((b) => [b.title, b.body])).toEqual([[`${PREFIX}failed`, `${out.error} (after Kept)`]]);
    expect((await logged()).map((r) => [r.ok, r.error, r.result])).toEqual([[false, out.error, null]]);
    // Changing a row that isn't there is a failure; one that is unique and taken, too.
    const more = await fn("fails-more", { lang: "en", inputs: [{ name: "how", type: "text" }], do: [{ act: "if", if: [{ left: "{{input.how}}", cmp: "eq", right: "missing" }], do: [{ act: "change", table: customers, row: "nope", values: { points: 1 } }], else: [{ act: "add", table: customers, values: { name: "Twin", email: "kept@fn-spec.test" } }] }] });
    expect(await run(more, { how: "missing" })).toMatchObject({ ok: false, error: "No such row to change", failedAt: "do.0.do.0" });
    expect((await run(more, { how: "twin" })).error).toMatch(/^email: /);
  });

  test("what it is handed: needed, of its kind, and nothing it didn't ask for", async () => {
    const id = await fn("inputs", {
      inputs: [{ name: "email", type: "text", required: true }, { name: "amount", type: "number" }, { name: "sure", type: "bool" }, { name: "tags", type: "list" }, { name: "extra", type: "any" }],
      do: [{ act: "return", value: "{{input}}" }],
    });
    expect((await run(id, { email: "a@b.c", amount: "12.5", sure: "true", tags: ["x"], extra: { k: 1 }, unasked: "dropped" })).value).toEqual({ email: "a@b.c", amount: 12.5, sure: true, tags: ["x"], extra: { k: 1 } });
    expect((await run(id, { email: "a@b.c" })).value).toEqual({ email: "a@b.c", amount: null, sure: null, tags: null, extra: null });
    expect(await run(id, {})).toMatchObject({ ok: false, error: 'It needs "email"', failedAt: "inputs" });
    expect((await run(id, { email: "a@b.c", amount: "lots" })).error).toBe('"amount" has to be a number');
    expect((await run(id, { email: "a@b.c", tags: "x" })).error).toBe('"tags" has to be a list');
  });

  test("the function's own question: yes runs its steps, no runs the other way (or nothing), and the run says which", async () => {
    const def = (other: boolean): Partial<FnDef> => ({
      inputs: [{ name: "total", type: "number" }],
      if: [{ left: "{{input.total}}", cmp: "gte", right: 100 }, { left: "{{input.total}}", cmp: "lt", right: 0 }],
      match: "any",
      do: [{ act: "return", value: "big" }],
      ...(other ? { else: [{ act: "return", value: "small" }] } : {}),
    });
    const both = await fn("question", def(true));
    expect(await run(both, { total: 150 }, { dry: true })).toMatchObject({ ok: true, value: "big" });
    expect(await run(both, { total: -5 }, { dry: true })).toMatchObject({ ok: true, value: "big" });
    const small = await run(both, { total: 20 }, { dry: true });
    expect(small.value).toBe("small");
    expect(notes(small)).toEqual(["if if: No: the other way", "else.0 return: Gave back its answer"]);
    const one = await fn("question-alone", def(false));
    const nothing = await run(one, { total: 20 }, { dry: true });
    expect(nothing).toMatchObject({ ok: true, value: null });
    expect(notes(nothing)).toEqual(["if if: No"]);
    expect(notes(await run(one, { total: 100 }, { dry: true }))).toEqual(["if if: Yes", "do.0 return: Gave back its answer"]);
  });

  test("messages go through the outbox, to who the step names", async () => {
    const id = await fn("tell", {
      inputs: [{ name: "to", type: "text" }, { name: "phone", type: "text" }],
      do: [
        { act: "email", to: "{{input.to}}", subject: "Order {{input.phone}}", text: "Hello,\nyour order is ready." },
        { act: "sms", to: "{{input.phone}}", text: "Ready" },
      ],
    });
    const dry = await run(id, { to: "amal@fn-spec.test", phone: "+972 59-000 0000" }, { dry: true });
    expect(notes(dry)).toEqual(["do.0 email: Would send an email to amal@fn-spec.test", "do.1 sms: Would send an SMS to +972 59-000 0000"]);
    expect(await prisma.outboxMessage.count({ where: { to: "amal@fn-spec.test" } })).toBe(0);
    const out = await run(id, { to: "amal@fn-spec.test", phone: "+972 59-000 0000" });
    expect(out).toMatchObject({ ok: true, counts: { sent: 2 } });
    const mail = await prisma.outboxMessage.findMany({ where: { to: "amal@fn-spec.test" } });
    expect(mail.map((m) => [m.channel, m.template, m.status, m.payloadJson])).toEqual([["EMAIL", "FN_MESSAGE", "QUEUED", { subject: "Order +972 59-000 0000", text: "Hello,\nyour order is ready." }]]);
    await prisma.outboxMessage.deleteMany({ where: { to: "+972 59-000 0000", template: "FN_MESSAGE" } });
    // An address that isn't one is said before anything is queued.
    expect(await run(id, { to: "amal at home", phone: "1" })).toMatchObject({ ok: false, error: '"amal at home" isn\'t an email address', failedAt: "do.0" });
  });
});

describe("Limits", () => {
  test("so many messages, so many steps, so long a list: the run stops by itself", async () => {
    const list = (n: number) => Array.from({ length: n }, (_, k) => k);
    const many = await fn("many", { inputs: [{ name: "list", type: "list" }], do: [{ act: "each", list: "{{input.list}}", do: [{ act: "sms", to: "+972590000000", text: "{{item}}" }] }] });
    const out = await run(many, { list: list(FN_LIMITS.messages + 5) }, { dry: true });
    expect(out).toMatchObject({ ok: false, error: `A run sends up to ${FN_LIMITS.messages} messages`, failedAt: `do.0.do[${FN_LIMITS.messages}].0`, counts: { sent: FN_LIMITS.messages } });
    expect(await run(many, { list: list(FN_LIMITS.loop + 1) }, { dry: true })).toMatchObject({ ok: false, error: `The list has ${FN_LIMITS.loop + 1} things; a loop goes over ${FN_LIMITS.loop} at most` });
    expect((await run(many, { list: "not one" }, { dry: true })).error).toBe('"list" has to be a list');
    // A loop inside a loop: 40 × 30 steps is more than a run does.
    const deep = await fn("deep", {
      inputs: [{ name: "a", type: "list" }, { name: "b", type: "list" }],
      do: [{ act: "set", name: "n", value: 0 }, { act: "each", list: "{{input.a}}", as: "x", do: [{ act: "each", list: "{{input.b}}", as: "y", do: [{ act: "set", name: "n", op: "add", value: 1 }] }] }, { act: "return", value: "{{n}}" }],
    });
    expect((await run(deep, { a: list(4), b: list(5) })).value).toBe(20);
    const tooMany = await run(deep, { a: list(40), b: list(30) });
    expect(tooMany).toMatchObject({ ok: false, error: `A run does up to ${FN_LIMITS.executed} steps` });
    expect(tooMany.counts.steps).toBe(FN_LIMITS.executed);
    // The page gets the beginning of what happened, not a thousand lines.
    expect(tooMany.trace.length).toBeLessThanOrEqual(300);
  });

  test("functions call functions, so deep and no deeper; two that call each other stop by themselves", async () => {
    const hello = await fn("hello", { inputs: [{ name: "who", type: "text", required: true }], do: [{ act: "return", value: "Hello {{input.who}}" }] });
    const caller = await fn("caller", { do: [{ act: "call", fn: hello, input: { who: "Amal" }, as: "said" }, { act: "return", value: "{{said}}!" }] });
    expect((await run(caller)).value).toBe("Hello Amal!");
    // The one it calls fails: so does it, saying whose failure it was.
    const picky = await fn("picky", { do: [{ act: "stop", message: "Not today" }] });
    const asks = await fn("asks", { do: [{ act: "call", fn: picky }] });
    expect(await run(asks)).toMatchObject({ ok: false, error: `${PREFIX}picky: Not today`, failedAt: "do.0" });
    // Switched off: nothing calls it.
    await request(app).put(`${at}/${hello}`).send({ enabled: false }).expect(200);
    expect((await run(caller)).error).toBe(`"${PREFIX}hello" is switched off`);
    await request(app).put(`${at}/${hello}`).send({ enabled: true }).expect(200);
    // A calls B, and B is then changed to call A: neither is a function that never ends.
    const b = await fn("b", { do: [{ act: "return", value: "b" }] });
    const a = await fn("a", { do: [{ act: "set", name: "n", value: 1 }, { act: "call", fn: b }, { act: "return", value: "a" }] });
    await request(app).put(`${at}/${b}`).send({ draft: { inputs: [], do: [{ act: "call", fn: a }] } }).expect(200);
    await request(app).post(`${at}/${b}/publish`).expect(200);
    const loop = await run(a);
    expect(loop.ok).toBe(false);
    expect(loop.error).toContain(`Functions call each other ${FN_LIMITS.calls} deep at most`);
    // A function another one calls can't be deleted; the caller can.
    expect((await request(app).delete(`${at}/${hello}`).expect(409)).body).toMatchObject({ error: "FN_USED", details: { callers: [`${PREFIX}caller`] } });
    await request(app).delete(`${at}/${caller}`).expect(200);
    await request(app).delete(`${at}/${hello}`).expect(200);
    expect((await request(app).get(`${at}/${hello}`).expect(404)).body.error).toBe("FN_NOT_FOUND");
  });
});

describe("Who may", () => {
  test("looking needs functions:read; building, publishing and running need functions:write", async () => {
    const id = await fn("guarded", { do: [{ act: "return", value: 1 }] });
    const member = async (name: string, permissions: string[]) => {
      const role = await prisma.staffRole.create({ data: { name: `${PREFIX}${name}`, permissions } });
      const m = await prisma.adminUser.create({ data: { email: `${name}@fn-spec.test`, name, passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
      return `Bearer ${signAccessToken({ sub: m.id, role: "STAFF", email: m.email })}`;
    };
    const editor = await member("editor", ["pages:read", "pages:write"]);
    const reader = await member("reader", ["functions:read"]);
    expect((await request(app).get(at).set("Authorization", editor).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED", required: ["functions:read"] });
    await request(app).get(at).set("Authorization", reader).expect(200);
    await request(app).get(`${at}/${id}`).set("Authorization", reader).expect(200);
    for (const call of [request(app).post(at).send({ name: "x" }), request(app).put(`${at}/${id}`).send({ enabled: false }), request(app).post(`${at}/${id}/publish`), request(app).post(`${at}/${id}/run`).send({ dry: true }), request(app).delete(`${at}/${id}`)])
      expect((await call.set("Authorization", reader).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED", required: ["functions:write"] });
    // The permission is one a role can be given.
    const all = (await request(app).get(`${admin}/staff/permissions`).expect(200)).body;
    expect(all.groups.find((g: { key: string }) => g.key === "functions").permissions.map((p: { key: string }) => p.key)).toEqual(["functions:read", "functions:write"]);
  });
});

// (Kept honest: the steps the spec builds are the shape the schema takes.)
const _shape: Step = { act: "return" };
void _shape;
