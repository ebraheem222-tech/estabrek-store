import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { tablePermission } from "../modules/admin/permissions.js";
import { readTemplate } from "../lib/featureTemplate.js";
import { PanelSchema, panelProblems } from "../lib/sitePanel.js";

// A whole site's panel (wave 1.2 of docs/sites-300-plan.ar.md), with the database: a site installed from the admin's
// own files has its own pages in the admin's menu (today's numbers, queues and quick actions; its lists; its
// settings). A queue's button sets the row's fields, a quick action sets a setting, and a member sees only the
// parts they may read. Requests without a token run as the test owner; a Bearer token runs as that member.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
const made: string[] = [];
const PREFIX = "panel-spec-";

async function clean() {
  for (const id of made) await request(app).post(`${at}/my-features/${id}/remove`).send({ rows: "delete" });
  made.length = 0;
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@panel-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  invalidateAccess();
  forgetFeatureGate();
  forgetTriggers();
}
beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  await clean();
});
afterAll(clean);

const member = async (name: string, permissions: string[]) => {
  const role = await prisma.staffRole.create({ data: { name: `${PREFIX}${name}`, permissions } });
  const user = await prisma.adminUser.create({ data: { email: `${name}@panel-spec.test`, name, passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
  invalidateAccess();
  return `Bearer ${signAccessToken({ sub: user.id, role: "STAFF", email: `${name}@panel-spec.test` })}`;
};
const part = (page: Obj, key: string) => page.parts.find((p: Obj) => p.key === key);
const num = (page: Obj, key: string) => part(page, "numbers").items.find((i: Obj) => i.key === key);

describe("A site's file declares its panel", () => {
  test("every site's panel reads only its own tables, their fields and its settings; out of shape is said", () => {
    const file = sites.siteFile("site-restaurant", { lang: "en" });
    expect(file.panel.map((p: Obj) => p.key)).toEqual(["today", "lists", "settings"]);
    expect(readTemplate(file).ok).toBe(true);
    const tables = file.tables.map((t: Obj) => ({ key: t.key, fields: t.fields }));
    const keys = file.settings.map((d: Obj) => d.key);
    expect(panelProblems(file.panel, tables, keys)).toEqual([]);
    const bad = structuredClone(file.panel);
    bad[0].parts[1].table = "@table:gone";
    bad[0].parts[1].show = ["name", "nope"];
    bad[1].parts[0].columns = ["title", "colour"];
    bad[2].parts[0].keys = ["hours", "commission"];
    expect(panelProblems(bad, tables, keys).map((p) => p.message)).toEqual([
      '"messages" reads "gone", which isn\'t one of the site\'s tables',
      '"offers": the table "offers" has no field "colour"',
      '"settings" names "commission", which isn\'t one of the site\'s settings',
    ]);
    expect(readTemplate({ ...file, panel: bad }).ok).toBe(false);
    // Two pages of one key, a part of no kind, an icon of none.
    expect(PanelSchema.safeParse([file.panel[0], file.panel[0]]).success).toBe(false);
    expect(PanelSchema.safeParse([{ ...file.panel[0], icon: "rocket" }]).success).toBe(false);
    expect(PanelSchema.safeParse([{ ...file.panel[0], parts: [{ kind: "chart", key: "x" }] }]).success).toBe(false);
  });
});

describe("A site's panel", () => {
  test("its pages in the menu; numbers, a queue whose buttons set the row, quick actions that set a setting; each member sees what they may", async () => {
    const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile("site-restaurant", { lang: "en" }), lang: "en" });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
    const id = res.body.id as string;
    made.push(id);
    expect(res.body.panel.map((p: Obj) => p.key)).toEqual(["today", "lists", "settings"]);
    const ids: Obj = (await prisma.feature.findUnique({ where: { id }, select: { template: true } }))!.template!.ids;
    await request(app).put(`${at}/my-features/${id}`).send({ enabled: true }).expect(200);

    // In the menu, under its name.
    const listed = (await request(app).get(`${at}/site-panels`).expect(200)).body.sites.find((s: Obj) => s.featureId === id);
    expect(listed).toMatchObject({ name: res.body.name, enabled: true });
    expect(listed.pages.map((p: Obj) => [p.key, p.icon])).toEqual([["today", "today"], ["lists", "lists"], ["settings", "settings"]]);

    // Two booking requests come in from the shop.
    const bookings = await prisma.collection.findUniqueOrThrow({ where: { id: ids.table.bookings }, select: { slug: true } });
    for (const name of ["Rana", "Sami"]) await request(app).post(`/v1/data/${bookings.slug}`).send({ values: { name, phone: "050-123-4567", service: "dinner" }, lang: "en" }).expect(201);
    const today = (await request(app).get(`${at}/site-panels/${id}/today?lang=en`).expect(200)).body;
    expect(today.page).toMatchObject({ key: "today", icon: "today" });
    expect(today.parts.map((p: Obj) => p.kind)).toEqual(["numbers", "queue", "queue", "actions"]);
    expect(num(today, "bookingsNew").value).toBe(2);
    expect(num(today, "bookingsWeek")).toMatchObject({ value: 2, before: 0, window: "week" });
    expect(num(today, "messagesNew").value).toBe(0);
    const queue = part(today, "bookings");
    expect(queue).toMatchObject({ total: 2, canDecide: true });
    expect(queue.columns.map((c: Obj) => c.id)).toEqual(["name", "phone", "service", "day", "notes"]);
    // The oldest first.
    expect(queue.rows.map((r: Obj) => r.cells.name)).toEqual([{ en: "Rana" }, { en: "Sami" }]);
    expect(queue.decisions.map((d: Obj) => d.key)).toEqual(["confirm", "done"]);

    // Confirmed in one tap: the row says so, it leaves the queue, the number goes down.
    const rana = queue.rows[0].id as string;
    const after = (await request(app).post(`${at}/site-panels/${id}/today/bookings/decide`).send({ row: rana, decision: "confirm", lang: "en" }).expect(200)).body;
    expect(((await prisma.collectionItem.findUniqueOrThrow({ where: { id: rana } })).data as Obj).status).toBe("confirmed");
    expect(part(after, "bookings").rows.map((r: Obj) => r.id)).not.toContain(rana);
    expect(num(after, "bookingsNew").value).toBe(1);
    await request(app).post(`${at}/site-panels/${id}/today/bookings/decide`).send({ row: rana, decision: "cancel" }).expect(404);
    await request(app).post(`${at}/site-panels/${id}/today/messages/decide`).send({ row: rana, decision: "replied" }).expect(404);

    // Booking closed in one tap: the setting changes, and «close» is done while «open» isn't.
    const acts = part(after, "actions").items;
    expect(acts.map((a: Obj) => [a.key, a.done])).toEqual([["noticeShow", false], ["noticeHide", true], ["bookingClose", false], ["bookingOpen", true]]);
    const closed = (await request(app).post(`${at}/site-panels/${id}/today/actions/act`).send({ action: "bookingClose" }).expect(200)).body;
    expect(part(closed, "actions").items.find((a: Obj) => a.key === "bookingClose").done).toBe(true);
    expect(((await prisma.feature.findUniqueOrThrow({ where: { id } })).settings as Obj).bookingOpen).toBe(false);

    // Its lists: the menu, newest bookings first; its settings, as declared.
    const lists = (await request(app).get(`${at}/site-panels/${id}/lists?lang=en`).expect(200)).body;
    expect(lists.parts.map((p: Obj) => [p.kind, p.key])).toEqual([["view", "offers"], ["view", "messages"], ["view", "bookings"]]);
    expect(part(lists, "bookings").rows.map((r: Obj) => r.cells.name)).toEqual([{ en: "Sami" }, { en: "Rana" }]);
    expect(part(lists, "offers").total).toBeGreaterThan(0);
    const settings = (await request(app).get(`${at}/site-panels/${id}/settings`).expect(200)).body;
    expect(part(settings, "settings")).toMatchObject({ canWrite: true, values: { bookingOpen: false } });

    // A member given the bookings table only, to read: today's booking numbers and queue (no buttons), no settings, no actions.
    const reader = await member("reader", [tablePermission(ids.table.bookings, "read")]);
    const theirs = (await request(app).get(`${at}/site-panels`).set("Authorization", reader).expect(200)).body.sites.find((s: Obj) => s.featureId === id);
    expect(theirs.pages.map((p: Obj) => p.key)).toEqual(["today", "lists"]);
    const seen = (await request(app).get(`${at}/site-panels/${id}/today`).set("Authorization", reader).expect(200)).body;
    expect(seen.parts.map((p: Obj) => p.key)).toEqual(["numbers", "bookings"]);
    expect(part(seen, "numbers").items.map((i: Obj) => i.key)).toEqual(["bookingsNew", "bookingsWeek"]);
    expect(part(seen, "bookings").canDecide).toBe(false);
    await request(app).post(`${at}/site-panels/${id}/today/bookings/decide`).set("Authorization", reader).send({ row: rana, decision: "done" }).expect(403);
    await request(app).get(`${at}/site-panels/${id}/settings`).set("Authorization", reader).expect(404);
    await request(app).post(`${at}/site-panels/${id}/today/actions/act`).set("Authorization", reader).send({ action: "bookingOpen" }).expect(404);
    // One who may change it decides.
    const writer = await member("writer", [tablePermission(ids.table.bookings, "write")]);
    await request(app).post(`${at}/site-panels/${id}/today/bookings/decide`).set("Authorization", writer).send({ row: rana, decision: "done" }).expect(200);
    // A member with none of its tables: no group in the menu at all.
    const other = await member("other", ["dashboard:read"]);
    expect((await request(app).get(`${at}/site-panels`).set("Authorization", other).expect(200)).body.sites.some((s: Obj) => s.featureId === id)).toBe(false);
    await request(app).get(`${at}/site-panels/${id}/today`).set("Authorization", other).expect(404);
    await clean();
  });
});
