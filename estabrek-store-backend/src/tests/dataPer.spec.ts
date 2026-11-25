import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { invalidateAccess } from "../middleware/access.js";
import { forgetKeys } from "../lib/apiKeys.js";
import { forgetHits } from "../lib/hitLimit.js";

// A chart's live line (plan 3.7): GET /v1/data/<table>/per/<every> counts the rows added in each minute, hour or
// day, of the ones the caller could list (anyone: the published ones). Only how many, never which.

const PREFIX = "per-spec-";
const admin = "/v1/admin";
const HOUR = 3_600_000;
const mk = async (slug: string) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields: [{ id: "name", type: "text" }] }).expect(201)).body.id as string;
const add = async (id: string, rows: Array<{ slug: string; status?: string }>) => (await request(app).post(`${admin}/collections/${id}/rows/import`).send({ lang: "en", rows: rows.map((r) => ({ ...r, values: { name: r.slug } })) }).expect(200)).body as { created: number };
const open = (id: string, read: string) => request(app).put(`${admin}/api/tables/${id}`).send({ read, create: "off", update: "off", delete: "off" }).expect(200);
const per = (table: string, every: string, query = "") => request(app).get(`/v1/data/${table}/per/${every}${query}`);
/** A row as if added `hours` ago. */
const ago = (id: string, slug: string, hours: number) => prisma.collectionItem.updateMany({ where: { collectionId: id, slug }, data: { createdAt: new Date(Date.now() - hours * HOUR) } });

let visits = "";
let shut = "";

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  forgetKeys();
  forgetHits();
  invalidateAccess();
}

beforeAll(async () => {
  await clean();
  visits = await mk(`${PREFIX}visits`);
  shut = await mk(`${PREFIX}shut`);
  await open(visits, "public");
  // Three published now, one published two hours ago, one a draft (no visitor reads it), one five days ago.
  await add(visits, [{ slug: "a", status: "PUBLISHED" }, { slug: "b", status: "PUBLISHED" }, { slug: "c", status: "PUBLISHED" }, { slug: "d", status: "PUBLISHED" }, { slug: "e" }, { slug: "f", status: "PUBLISHED" }]);
  await ago(visits, "d", 2);
  await ago(visits, "f", 24 * 5);
  await add(shut, [{ slug: "x", status: "PUBLISHED" }]);
});
afterAll(clean);

describe("a table's rows counted per hour", () => {
  test("anyone gets the published rows of each hour of the window (a draft and an older row aren't in it)", async () => {
    const res = await per(`${PREFIX}visits`, "hour", "?last=12").expect(200);
    expect(res.body).toMatchObject({ every: "hour", last: 12, total: 4 });
    const now = Math.floor(Date.now() / HOUR) * HOUR;
    const byAgo = Object.fromEntries(res.body.counts.map((c: { at: string; n: number }) => [Math.round((now - Date.parse(c.at)) / HOUR), c.n]));
    expect(byAgo).toEqual({ 0: 3, 2: 1 });
    // Only how many: no row, no name.
    expect(JSON.stringify(res.body)).not.toMatch(/"name"|"slug"|"id"/);
  });

  test("per day the row of five days ago is in the window; per minute only this hour's", async () => {
    expect((await per(`${PREFIX}visits`, "day", "?last=7").expect(200)).body.total).toBe(5);
    expect((await per(`${PREFIX}visits`, "minute", "?last=30").expect(200)).body.total).toBe(3);
  });

  test("a table not open to visitors answers as one that isn't there; the question's limits", async () => {
    await per(`${PREFIX}shut`, "hour").expect(404);
    await per(`${PREFIX}nope`, "hour").expect(404);
    expect((await per(`${PREFIX}visits`, "week").expect(400)).body.error).toBe("BAD_QUERY");
    for (const q of ["?last=0", "?last=61", "?last=ten", "?last=5.5"]) await per(`${PREFIX}visits`, "hour", q).expect(400);
  });
});
