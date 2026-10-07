import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { RAZAN_DEFAULTS, razanOf } from "../modules/razan/razan.settings.js";

beforeEach(async () => {
  await prisma.razanStat.deleteMany();
  const s = await prisma.siteSettings.findFirst();
  if (s) {
    const header = (s.header && typeof s.header === "object" ? s.header : {}) as Record<string, unknown>;
    delete header.razan;
    await prisma.siteSettings.update({ where: { id: s.id }, data: { header: header as any } });
  }
});

describe("Razan's settings", () => {
  test("defaults, save, keep in history, public, and a bad value only loses itself", async () => {
    const first = await request(app).get("/v1/admin/razan").expect(200);
    expect(first.body.razan).toEqual(RAZAN_DEFAULTS);

    const next = {
      ...RAZAN_DEFAULTS,
      maxBubbles: 3,
      phone: "quiet",
      texts: { ...RAZAN_DEFAULTS.texts, welcome: { ar: "هلا فيكِ 🌸", en: "" } },
      outfits: { default: "khimar", rules: [{ match: "شتوي", outfit: "coat", pearls: false }] },
    };
    const saved = await request(app).put("/v1/admin/razan").send(next).expect(200);
    expect(saved.body.razan).toMatchObject({ maxBubbles: 3, phone: "quiet", outfits: { default: "khimar" } });
    const rev = await prisma.settingsRevision.findFirst({ orderBy: { createdAt: "desc" } });
    expect(rev?.note).toBe("تعديل إعدادات رزان");

    const pub = await request(app).get("/v1/settings").expect(200);
    const header = pub.body.site?.header ?? pub.body.header;
    expect(razanOf(header).texts.welcome.ar).toBe("هلا فيكِ 🌸");

    await request(app).put("/v1/admin/razan").send({ ...next, phone: "sometimes" }).expect(400);
    await request(app).put("/v1/admin/razan").send({ ...next, quietPaths: ["not a path"] }).expect(400);
    expect(razanOf({ razan: { maxBubbles: 5, phone: "sometimes", outfits: { rules: [{ match: "x", outfit: "cape" }] } } })).toMatchObject({
      maxBubbles: 5,
      phone: "full",
      outfits: { rules: [] },
    });
  });

  test("the features page switches her on and off without losing her settings", async () => {
    await request(app).put("/v1/admin/razan").send({ ...RAZAN_DEFAULTS, maxBubbles: 4 }).expect(200);
    const list = await request(app).get("/v1/admin/features").expect(200);
    const f = list.body.groups.flatMap((g: any) => g.features).find((x: any) => x.key === "razan");
    expect(f).toMatchObject({ enabled: true, link: "/admin/razan" });
    await request(app).patch("/v1/admin/features/razan").send({ enabled: false }).expect(200);
    const after = await request(app).get("/v1/admin/razan").expect(200);
    expect(after.body.razan).toMatchObject({ enabled: false, maxBubbles: 4 });
  });
});

describe("Report and preview", () => {
  test("counts known moments only, per day; the report sums them", async () => {
    await request(app).post("/v1/razan/events").send({ key: "open" }).expect(204);
    await request(app).post("/v1/razan/events").send({ key: "open" }).expect(204);
    await request(app).post("/v1/razan/events").send({ key: "accept:help" }).expect(204);
    await request(app).post("/v1/razan/events").send({ key: "hack" }).expect(400);
    const rep = await request(app).get("/v1/admin/razan/report").expect(200);
    expect(rep.body.totals.open).toEqual({ d7: 2, d30: 2 });
    expect(rep.body.totals["accept:help"]).toEqual({ d7: 1, d30: 1 });
    expect(rep.body.helpOrders).toEqual({ d7: 0, d30: 0 });
  });

  test("the owner tries settings on the shop before saving", async () => {
    const p = await request(app).post("/v1/admin/razan/preview").send({ ...RAZAN_DEFAULTS, maxBubbles: 1 }).expect(200);
    expect(p.body.id).toMatch(/^[\w-]{16}$/);
    const got = await request(app).get(`/v1/razan/preview/${p.body.id}`).expect(200);
    expect(got.body.razan.maxBubbles).toBe(1);
    await request(app).get("/v1/razan/preview/nope").expect(404);
    // Nothing was saved.
    expect((await request(app).get("/v1/admin/razan").expect(200)).body.razan.maxBubbles).toBe(8);
  });
});
