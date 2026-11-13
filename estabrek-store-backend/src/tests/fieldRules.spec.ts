import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";

// A field's rules with the database (B2): "the only value" across a table, defaults for new rows,
// limits and shapes through every way a row is written. Requests without a token run as the test owner.

const SLUG = "rules-spec-codes";
const fields = [
  { id: "code", type: "text", required: true, unique: true, pattern: "^[A-Z]{2}-\\d{3}$", message: { ar: "الكود متل AB-123", en: "A code looks like AB-123" } },
  { id: "email", type: "text", unique: true, shape: "email" },
  { id: "price", type: "number", min: 0, max: 1000, default: 10 },
  { id: "serial", type: "number", unique: true },
  { id: "day", type: "date", min: "2026-01-01" },
  { id: "active", type: "boolean", default: true },
  { id: "note", type: "longText", max: 20 },
];
let id = "";
const base = () => `/v1/admin/collections/${id}`;
const add = (values: Record<string, unknown>, slug?: string) => request(app).post(`${base()}/rows`).send({ values, lang: "en", ...(slug ? { slug } : {}) });
const issuesOf = (body: any) => body.details?.issues ?? body.issues ?? [];
const row = (slug: string) => prisma.collectionItem.findFirstOrThrow({ where: { collectionId: id, slug } });

async function clean() {
  await prisma.collection.deleteMany({ where: { slug: SLUG } });
}
beforeAll(async () => {
  await clean();
  const made = await request(app).post("/v1/admin/collections").send({ slug: SLUG, name: { en: "Rules spec" }, fields }).expect(201);
  id = made.body.id;
});
afterAll(clean);

describe("Saving the table", () => {
  test("its rules come back as saved; the grid is told which rules fit which kind", async () => {
    const list = await request(app).get("/v1/admin/collections").expect(200);
    const mine = list.body.find((c: { id: string }) => c.id === id);
    expect(mine.fields[0]).toEqual(fields[0]);
    expect(mine.fields[2]).toEqual({ id: "price", type: "number", min: 0, max: 1000, default: 10 });
    const meta = await request(app).get("/v1/admin/collections/grid-meta").expect(200);
    expect(meta.body.rules.text).toEqual({ unique: true, limits: "length", shape: true, default: true });
    expect(meta.body.shapes).toContain("email");
  });

  test("rules that don't fit are refused, and nothing changes", async () => {
    const bad = (field: Record<string, unknown>) => request(app).put(base()).send({ slug: SLUG, name: { en: "Rules spec" }, fields: [...fields, field] });
    expect((await bad({ id: "x", type: "text", pattern: "(a+)+" }).expect(400)).body.issues[0].message).toContain("repeated group");
    await bad({ id: "x", type: "number", min: 9, max: 1 }).expect(400);
    await bad({ id: "x", type: "number", min: 0, default: -1 }).expect(400);
    await bad({ id: "x", type: "boolean", unique: true }).expect(400);
    expect((await prisma.collection.findUniqueOrThrow({ where: { id } })).fields).toHaveLength(fields.length);
  });
});

describe("Writing rows", () => {
  test("a new row starts from the defaults; broken rules are named, in the owner's words when given", async () => {
    const made = await add({ code: "AB-100", email: "sara@example.test", serial: 1 }).expect(201);
    expect(made.body.data).toEqual({ code: { en: "AB-100" }, email: { en: "sara@example.test" }, price: 10, serial: 1, active: true });
    const bad = await add({ code: "ab-1", email: "not an email", price: 5000, day: "2025-06-01", note: "a note that is far too long for it" }).expect(400);
    expect(issuesOf(bad.body)).toEqual([
      { field: "code", message: "Not the asked shape", say: { ar: "الكود متل AB-123", en: "A code looks like AB-123" } },
      { field: "email", message: "Not the asked shape" },
      { field: "price", message: "Too big" },
      { field: "day", message: "Too early" },
      { field: "note", message: "Too long" },
    ]);
    // A default never hides a given value, even an empty-looking one.
    expect((await add({ code: "AB-101", price: 0, active: "no" }).expect(201)).body.data).toMatchObject({ price: 0, active: false });
  });

  test("the only value: refused when another row holds it, whatever its letters' case or its language", async () => {
    const twice = await add({ code: "AB-100" }).expect(400);
    expect(issuesOf(twice.body)).toEqual([{ field: "code", message: "Already used", say: { ar: "الكود متل AB-123", en: "A code looks like AB-123" } }]);
    expect(issuesOf((await add({ code: "AB-102", email: "SARA@example.test" }).expect(400)).body)).toEqual([{ field: "email", message: "Already used" }]);
    expect(issuesOf((await request(app).post(`${base()}/rows`).send({ values: { code: "AB-102", email: "sara@example.test" }, lang: "ar" }).expect(400)).body)).toEqual([{ field: "email", message: "Already used" }]);
    expect(issuesOf((await add({ code: "AB-102", serial: 1 }).expect(400)).body)).toEqual([{ field: "serial", message: "Already used" }]);
    // Nothing given is never "taken": many rows may leave a unique column empty.
    await add({ code: "AB-102" }).expect(201);
    await add({ code: "AB-103" }).expect(201);
    expect(await prisma.collectionItem.count({ where: { collectionId: id } })).toBe(4);
  });

  test("a cell: the row's own value isn't a clash; another row's is", async () => {
    const first = await row("ab-100");
    // The same value again, another field changed, the whole row sent back: all fine.
    await request(app).patch(`${base()}/rows/${first.id}`).send({ values: { code: "AB-100" }, lang: "en" }).expect(200);
    await request(app).patch(`${base()}/rows/${first.id}`).send({ values: { code: { en: "AB-100" }, email: { en: "sara@example.test" }, price: 20, serial: 1, active: true }, lang: "en" }).expect(200);
    const clash = await request(app).patch(`${base()}/rows/${first.id}`).send({ values: { code: "AB-101" }, lang: "en" }).expect(400);
    expect(issuesOf(clash.body)[0]).toMatchObject({ field: "code", message: "Already used" });
    expect((await request(app).patch(`${base()}/rows/${first.id}`).send({ values: { code: "AB-109", serial: 9 }, lang: "en" }).expect(200)).body.data).toMatchObject({ code: { en: "AB-109" }, serial: 9 });
    // Its old value is free again.
    await add({ code: "AB-100", serial: 1 }).expect(201);
    await request(app).patch(`${base()}/rows/${first.id}`).send({ values: { price: -1 } }).expect(400);
  });

  test("a row in the trash still holds its values", async () => {
    const victim = await row("ab-103");
    await request(app).post(`${base()}/rows/bulk`).send({ ids: [victim.id], op: "trash" }).expect(200);
    expect(issuesOf((await add({ code: "AB-103" }).expect(400)).body)[0].message).toBe("Already used");
    await request(app).post(`${base()}/rows/bulk`).send({ ids: [victim.id], op: "restore" }).expect(200);
  });

  test("a file: doubles inside it and against the table are refused row by row; the rest goes in", async () => {
    const out = await request(app)
      .post(`${base()}/rows/import`)
      .send({
        lang: "en",
        rows: [
          { values: { code: "CD-200", email: "a@example.test", serial: 20 } },
          { values: { code: "cd-200" } },
          { values: { code: "CD-200", serial: 21 } },
          { values: { code: "CD-201", email: "A@example.test" } },
          { values: { code: "AB-101" } },
          { values: { code: "CD-202", price: "" } },
        ],
      })
      .expect(200);
    expect(out.body).toMatchObject({ created: 2, updated: 0 });
    expect(out.body.rejected.map((r: { row: number; issues: Array<{ field: string; message: string }> }) => [r.row, r.issues.map((i) => `${i.field}: ${i.message}`).join("; ")])).toEqual([
      [1, "code: Not the asked shape"],
      [2, "code: Already used"],
      [3, "email: Already used"],
      [4, "code: Already used"],
    ]);
    expect((await row("cd-202")).data).toMatchObject({ price: 10, active: true });
    // "Change the ones that exist": the row's own values aren't clashes; another row's are.
    const again = await request(app)
      .post(`${base()}/rows/import`)
      .send({ mode: "upsert", lang: "en", rows: [{ slug: "cd-200", values: { code: "CD-200", email: "a@example.test", price: 30 } }, { slug: "cd-202", values: { email: "a@example.test" } }, { slug: "cd-202", values: { serial: 22 } }] })
      .expect(200);
    expect(again.body.updated).toBe(1);
    expect(again.body.rejected.map((r: { row: number; issues: Array<{ message: string }> }) => [r.row, r.issues[0].message])).toEqual([[1, "Already used"], [2, "Twice in this file"]]);
    expect((await row("cd-200")).data).toMatchObject({ price: 30 });
    // A dry run sees the same clashes and writes nothing.
    const dry = await request(app).post(`${base()}/rows/import`).send({ dryRun: true, lang: "en", rows: [{ values: { code: "CD-200" } }, { values: { code: "EF-300" } }] }).expect(200);
    expect(dry.body).toMatchObject({ created: 1, rejected: [{ row: 0, issues: [{ field: "code", message: "Already used" }] }] });
    expect(await prisma.collectionItem.count({ where: { collectionId: id, slug: "ef-300" } })).toBe(0);
  });

  test("one value for many rows is refused on a column that asks for the only one", async () => {
    const [a, b] = [await row("cd-200"), await row("cd-202")];
    const many = await request(app).post(`${base()}/rows/bulk`).send({ ids: [a.id, b.id], op: "set", field: "serial", value: 77 }).expect(400);
    expect(issuesOf(many.body)).toEqual([{ field: "serial", message: "Only one row can hold this value" }]);
    await request(app).post(`${base()}/rows/bulk`).send({ query: {}, op: "set", field: "serial", value: 77 }).expect(400);
    // One row, a free value: fine. A taken one: refused. Emptying many: fine.
    await request(app).post(`${base()}/rows/bulk`).send({ ids: [b.id], op: "set", field: "serial", value: 77 }).expect(200);
    await request(app).post(`${base()}/rows/bulk`).send({ ids: [a.id], op: "set", field: "serial", value: 77 }).expect(400);
    expect((await request(app).post(`${base()}/rows/bulk`).send({ ids: [a.id, b.id], op: "set", field: "serial", value: "" }).expect(200)).body.changed).toBe(2);
    // Limits hold for many rows too.
    await request(app).post(`${base()}/rows/bulk`).send({ ids: [a.id, b.id], op: "set", field: "price", value: 2000 }).expect(400);
    expect((await request(app).post(`${base()}/rows/bulk`).send({ ids: [a.id, b.id], op: "set", field: "price", value: 500 }).expect(200)).body.changed).toBe(2);
  });

  test("the older item routes keep the same rules", async () => {
    const made = await request(app).post(`${base()}/items`).send({ slug: "old-way", data: { code: { en: "GH-400" } } }).expect(201);
    expect(made.body.data).toEqual({ code: { en: "GH-400" }, price: 10, active: true });
    const clash = await request(app).post(`${base()}/items`).send({ slug: "old-way-2", data: { code: { en: "gh-400" } } }).expect(400);
    expect(clash.body.issues[0].message).toBe("Not the asked shape");
    expect((await request(app).post(`${base()}/items`).send({ slug: "old-way-2", data: { code: { en: "GH-400" } } }).expect(400)).body.issues).toEqual([{ field: "code", message: "Already used", say: { ar: "الكود متل AB-123", en: "A code looks like AB-123" } }]);
    await request(app).put(`${base()}/items/${made.body.id}`).send({ data: { code: { en: "GH-400" }, price: 15 } }).expect(200);
    expect((await request(app).put(`${base()}/items/${made.body.id}`).send({ data: { code: { en: "AB-101" } } }).expect(400)).body.issues[0].message).toBe("Already used");
    await request(app).put(`${base()}/items/${made.body.id}`).send({ data: { code: { en: "GH-400" }, price: -3 } }).expect(400);
  });
});
