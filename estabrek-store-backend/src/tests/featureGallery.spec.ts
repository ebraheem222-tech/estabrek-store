import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { forgetHits } from "../lib/hitLimit.js";
import { GALLERY } from "../lib/gallery/index.js";

// The gallery (admin → ميزاتي → المعرض), with the database: every ready example installs into a
// store (each one beside all the others, so many of their addresses are taken and move), an API from
// it answers for real once its function is published, and each leaves again with everything it made.
// Requests without a token run as the test owner.

const at = "/v1/admin/my-features";
type Obj = Record<string, any>;
const made: string[] = [];

async function clean() {
  const features = await prisma.feature.findMany({ where: { id: { in: made } }, select: { id: true } });
  for (const f of features) await request(app).post(`${at}/${f.id}/remove`).send({ rows: "delete" });
  made.length = 0;
  forgetFeatureGate();
  forgetTriggers();
  forgetHits();
}
beforeAll(clean);
afterAll(clean);

describe("The gallery", () => {
  test("lists more than 300 ready examples of the three kinds, and gives each one's file", async () => {
    const list = (await request(app).get(`${at}/templates/gallery`).expect(200)).body;
    expect(list.items.length).toBeGreaterThanOrEqual(300);
    const kinds = list.items.reduce((m: Obj, x: Obj) => ({ ...m, [x.kind]: (m[x.kind] ?? 0) + 1 }), {});
    expect(kinds.function).toBeGreaterThanOrEqual(100);
    expect(kinds.api).toBeGreaterThanOrEqual(70);
    expect(kinds.feature).toBeGreaterThanOrEqual(80);
    const vat = list.items.find((x: Obj) => x.key === "api-vat");
    expect(vat).toMatchObject({ kind: "api", category: "finance", counts: { tables: 0, functions: 1, pages: 0 }, routes: ["GET vat"], triggers: ["route"] });
    expect(list.categories.orders).toEqual({ ar: "الطلبات", en: "Orders", he: "הזמנות" });
    expect((await request(app).get(`${at}/templates/gallery/api-vat`).expect(200)).body.template).toMatchObject({ format: "estabrek.feature", key: "api-vat", version: "1.0.0" });
    expect((await request(app).get(`${at}/templates/gallery/nothing-here`).expect(404)).body.error).toBe("TEMPLATE_NOT_FOUND");
  });

  test("an API from it answers for real once its function is published", async () => {
    const { template } = (await request(app).get(`${at}/templates/gallery/api-vat`).expect(200)).body;
    const feature = (await request(app).post(`${at}/templates/install`).send({ template }).expect(201)).body;
    made.push(feature.id);
    // Installed as a draft: the address isn't there until the function is published and the feature on.
    await request(app).get("/v1/api/vat?amount=117").expect(404);
    await request(app).post(`/v1/admin/functions/${feature.functions[0].id}/publish`).expect(200);
    await request(app).put(`${at}/${feature.id}`).send({ enabled: true }).expect(200);
    forgetTriggers();
    expect((await request(app).get("/v1/api/vat?amount=117").expect(200)).body).toEqual({ net: 100, vat: 17, gross: 117 });
    expect((await request(app).get("/v1/api/vat?amount=-5").expect(400)).body.error).toBe("INPUT_INVALID");
  });

  test("every example installs, each beside the others, and leaves with what it made", async () => {
    await clean();
    const before = { tables: await prisma.collection.count(), fns: await prisma.fn.count(), pages: await prisma.page.count() };
    const failed: string[] = [];
    let tables = 0;
    let fns = 0;
    let pages = 0;
    let seenReturns = false;
    // A store holds up to 100 features: they go in by eighties, each batch removed before the next.
    for (const [k, e] of GALLERY.entries()) {
      if (k > 0 && k % 80 === 0) await clean();
      const res = await request(app).post(`${at}/templates/install`).send({ template: e.template });
      if (res.status !== 201) {
        failed.push(`${e.template.key}: ${res.status} ${JSON.stringify(res.body).slice(0, 300)}`);
        continue;
      }
      made.push(res.body.id);
      if (e.template.key === "feat-returns") seenReturns = res.body.pages.length === 1 && res.body.tables.length === 1;
      tables += res.body.tables.length;
      fns += res.body.functions.length;
      pages += res.body.pages.length;
      expect(res.body.enabled).toBe(false);
    }
    expect(failed).toEqual([]);
    expect(tables).toBe(GALLERY.reduce((n, e) => n + e.template.tables.length, 0));
    expect(fns).toBe(GALLERY.reduce((n, e) => n + e.template.functions.length, 0));
    expect(pages).toBe(GALLERY.reduce((n, e) => n + e.template.pages.length, 0));
    expect(seenReturns, "a feature comes with its table and its page").toBe(true);
    // And they leave as they came.
    await clean();
    expect({ tables: await prisma.collection.count(), fns: await prisma.fn.count(), pages: await prisma.page.count() }).toEqual(before);
  }, 300_000);
});
