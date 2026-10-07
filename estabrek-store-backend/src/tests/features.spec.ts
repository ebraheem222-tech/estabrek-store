import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatures, customerAccountsOn } from "../lib/features.js";
import { FEATURES } from "../modules/features/features.registry.js";

async function fresh(data: Record<string, unknown> = {}) {
  await prisma.settingsRevision.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.siteSettings.create({ data: data as any });
  forgetFeatures();
}
const all = async () => (await request(app).get("/v1/admin/features").expect(200)).body.groups.flatMap((g: any) => g.features);
const one = async (key: string) => (await all()).find((f: any) => f.key === key);

beforeEach(() => fresh());
afterAll(() => fresh());

describe("The features page", () => {
  test("lists every switch by group with its state (new store: accounts and alerts off)", async () => {
    const res = await request(app).get("/v1/admin/features").expect(200);
    expect(res.body.groups.map((g: any) => g.key)).toEqual(["customers", "contact", "experience", "ai", "system"]);
    const list = res.body.groups.flatMap((g: any) => g.features);
    expect(list).toHaveLength(FEATURES.length);
    expect(list.find((f: any) => f.key === "customerAccounts")).toMatchObject({ enabled: false, link: "/admin/customers" });
    expect(list.find((f: any) => f.key === "stockAlerts").enabled).toBe(false);
    // Storefront switches follow the storefront's own defaults until set.
    expect(list.find((f: any) => f.key === "chatbot").enabled).toBe(true);
    expect(list.find((f: any) => f.key === "whatsapp").enabled).toBe(false);
    expect(list.find((f: any) => f.key === "maintenance")).toMatchObject({ enabled: false, link: "/admin/system/traffic" });
  });

  test("a switch turns the feature on for real (and goes into the settings history)", async () => {
    const out = await request(app).patch("/v1/admin/features/customerAccounts").send({ enabled: true }).expect(200);
    expect(out.body).toMatchObject({ key: "customerAccounts", enabled: true });
    expect(await customerAccountsOn()).toBe(true);
    const rev = await prisma.settingsRevision.findFirst({ orderBy: { createdAt: "desc" } });
    expect(rev).toMatchObject({ changed: ["customerAccountsEnabled"], note: "تشغيل: حسابات الزبائن" });
    // Same state again: nothing new in the history.
    await request(app).patch("/v1/admin/features/customerAccounts").send({ enabled: true }).expect(200);
    expect(await prisma.settingsRevision.count()).toBe(1);
  });

  test("storefront switches keep the rest of the storefront settings", async () => {
    await fresh({ header: { theme: { id: "rose" }, storefront: { darkModeEnabled: true, whatsappNumber: "+972501234567" } } });
    await request(app).patch("/v1/admin/features/whatsapp").send({ enabled: true }).expect(200);
    await request(app).patch("/v1/admin/features/darkMode").send({ enabled: false }).expect(200);
    const s = await prisma.siteSettings.findFirst();
    expect(s!.header).toEqual({ theme: { id: "rose" }, storefront: { darkModeEnabled: false, whatsappNumber: "+972501234567", whatsappEnabled: true } });
    const rev = await prisma.settingsRevision.findFirst({ orderBy: { createdAt: "desc" } });
    expect(rev!.changed).toEqual(["header.storefront"]);
  });

  test("a feature that isn't set up can't be turned on (and says what's missing)", async () => {
    const out = await request(app).patch("/v1/admin/features/announcement").send({ enabled: true }).expect(400);
    expect(out.body.error).toBe("NEEDS_SETUP");
    expect(out.body.details.needs[0].label).toContain("نص الإعلان");
    await request(app).patch("/v1/admin/features/whatsapp").send({ enabled: true }).expect(400);
    // Turning off always works.
    await request(app).patch("/v1/admin/features/announcement").send({ enabled: false }).expect(200);
    // Once the text is there it works.
    await prisma.siteSettings.updateMany({ data: { announcementText: "توصيل مجاني فوق 300 ₪" } });
    expect((await request(app).patch("/v1/admin/features/announcement").send({ enabled: true }).expect(200)).body.enabled).toBe(true);
    expect((await one("announcement")).ready).toBe(true);
  });

  test("unknown feature → 404; bad body → 400", async () => {
    await request(app).patch("/v1/admin/features/nope").send({ enabled: true }).expect(404);
    await request(app).patch("/v1/admin/features/darkMode").send({ enabled: "yes" }).expect(400);
  });
});
