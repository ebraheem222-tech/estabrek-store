import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { runScheduled } from "../modules/admin/schedule.service.js";
import { readPerformance } from "../lib/performanceSettings.js";

// The timeline (admin → الجدول الزمني) with the database. Requests without a
// token run as the test owner.

const H = 3600_000;
const iso = (h: number) => new Date(Date.now() + h * H).toISOString();
const settings = () => prisma.siteSettings.findFirstOrThrow();

async function clean() {
  await prisma.scheduledChange.deleteMany();
  await prisma.settingsRevision.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.performanceSettingsRevision.deleteMany();
  await prisma.performanceSettings.deleteMany();
  await prisma.pageRevision.deleteMany();
  await prisma.page.deleteMany({ where: { slug: "/schedule-test" } });
}

beforeEach(async () => {
  await clean();
  await prisma.siteSettings.create({ data: { header: { theme: { presetId: "estabrak_soft_gold" } } } });
});
afterAll(clean);

describe("Scheduled changes", () => {
  test("a preview, the change on time, and back by itself", async () => {
    const preview = await request(app).post("/v1/admin/schedule/preview").send({ kind: "theme", payload: { presetId: "luxury_gold" } }).expect(200);
    expect(preview.body.lines).toEqual([{ key: "theme", from: "estabrak_soft_gold", to: "luxury_gold" }]);

    const made = await request(app)
      .post("/v1/admin/schedule")
      .send({ kind: "theme", title: "ثيم الجمعة", payload: { presetId: "luxury_gold" }, runAt: iso(1), undoAt: iso(25) })
      .expect(201);
    expect(made.body.change.status).toBe("scheduled");
    // An hour later…
    await runScheduled(Date.now() + 1.01 * H);
    expect(((await settings()).header as any).theme.presetId).toBe("luxury_gold");
    expect((await prisma.scheduledChange.findFirstOrThrow()).status).toBe("applied");
    // …and the day after.
    await runScheduled(Date.now() + 25.01 * H);
    expect(((await settings()).header as any).theme.presetId).toBe("estabrak_soft_gold");
    expect((await prisma.scheduledChange.findFirstOrThrow()).status).toBe("undone");
    expect((await prisma.settingsRevision.findMany()).map((r) => r.note).sort()).toEqual(["رجوع «ثيم الجمعة»", "مجدول: «ثيم الجمعة»"]);
  });

  test("maintenance now, until the morning; what the owner changed meanwhile stays", async () => {
    const made = await request(app)
      .post("/v1/admin/schedule")
      .send({ kind: "maintenance", title: "تحديث", payload: { on: true, message: "راجعين الصبح" }, runAt: iso(0), undoAt: iso(8) })
      .expect(201);
    expect(made.body.change.status).toBe("applied");
    expect((await settings()).maintenanceMode).toBe(true);
    expect((await settings()).maintenanceKey).toBeTruthy();
    // The owner changed its message by hand meanwhile: maintenance stays as they left it.
    await prisma.siteSettings.updateMany({ data: { maintenanceMessage: "شي تاني" } });
    await runScheduled(Date.now() + 8.01 * H);
    const c = await prisma.scheduledChange.findFirstOrThrow();
    expect(c).toMatchObject({ status: "undone" });
    expect(c.note).toContain("بالإيد");
    expect((await settings()).maintenanceMode).toBe(true);
  });

  test("motion settings, a page section, and emptying the cache", async () => {
    await request(app).post("/v1/admin/schedule").send({ kind: "motion", title: "أخف", payload: { changes: { maxFps: 60 } }, runAt: iso(0), undoAt: iso(2) }).expect(201);
    expect((await readPerformance()).storefront.maxFps).toBe(60);
    await runScheduled(Date.now() + 2.01 * H);
    expect((await readPerformance()).storefront.maxFps).toBe(120);

    const page = await prisma.page.create({ data: { name: "تجربة", slug: "/schedule-test", status: "PUBLISHED", sections: { create: [{ type: "HERO", data: { title: "عرض" }, isVisible: true }] } }, include: { sections: true } });
    await request(app).post("/v1/admin/schedule").send({ kind: "section", title: "خبي العرض", payload: { sectionId: page.sections[0].id, visible: false }, runAt: iso(0), undoAt: null }).expect(201);
    expect((await prisma.pageSection.findUniqueOrThrow({ where: { id: page.sections[0].id } })).isVisible).toBe(false);
    expect((await prisma.scheduledChange.findFirstOrThrow({ where: { kind: "section" } })).status).toBe("done");

    const purge = await request(app).post("/v1/admin/schedule").send({ kind: "cachePurge", title: "كاش", payload: { namespace: "products" }, runAt: iso(0) }).expect(201);
    expect(purge.body.change).toMatchObject({ status: "done", before: { cleared: expect.any(Number) } });
    await request(app).post("/v1/admin/schedule").send({ kind: "cachePurge", title: "كاش", payload: { namespace: null }, runAt: iso(0), undoAt: iso(1) }).expect(400);
  });

  test("cancel before, now instead of later, back now; and the options", async () => {
    const a = await request(app).post("/v1/admin/schedule").send({ kind: "announcement", title: "إعلان", payload: { on: true, text: "شحن مجاني" }, runAt: iso(5), undoAt: iso(10) }).expect(201);
    await request(app).post(`/v1/admin/schedule/${a.body.change.id}/run`).expect(200);
    expect((await settings()).announcementIsActive).toBe(true);
    await request(app).post(`/v1/admin/schedule/${a.body.change.id}/undo`).expect(200);
    expect((await settings()).announcementIsActive).toBe(false);
    const b = await request(app).post("/v1/admin/schedule").send({ kind: "theme", title: "ثيم", payload: { presetId: "ocean_mist" }, runAt: iso(5) }).expect(201);
    await request(app).post(`/v1/admin/schedule/${b.body.change.id}/cancel`).expect(200);
    await runScheduled(Date.now() + 6 * H);
    expect(((await settings()).header as any).theme.presetId).toBe("estabrak_soft_gold");
    const opts = await request(app).get("/v1/admin/schedule/options").expect(200);
    expect(opts.body.now).toMatchObject({ theme: "estabrak_soft_gold", maintenance: { on: false } });
    await request(app).post("/v1/admin/schedule").send({ kind: "theme", title: "قديم", payload: { presetId: "ocean_mist" }, runAt: iso(-2) }).expect(400);
  });
});
