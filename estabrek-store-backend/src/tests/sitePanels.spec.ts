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
    expect(file.panel.map((p: Obj) => p.key)).toEqual(["today", "board", "people", "reports", "lists", "settings"]);
    expect(readTemplate(file).ok).toBe(true);
    const tables = file.tables.map((t: Obj) => ({ key: t.key, fields: t.fields }));
    const keys = file.settings.map((d: Obj) => d.key);
    expect(panelProblems(file.panel, tables, keys)).toEqual([]);
    const bad = structuredClone(file.panel);
    const pageOf = (key: string) => bad.find((p: Obj) => p.key === key);
    pageOf("today").parts[1].table = "@table:gone";
    pageOf("today").parts[1].show = ["name", "nope"];
    pageOf("lists").parts[0].columns = ["title", "colour"];
    pageOf("settings").parts[0].keys = ["hours", "commission"];
    // A board by a field that isn't a choice, a calendar by one that isn't a date.
    pageOf("board").parts[0].date = "name";
    pageOf("board").parts[1].field = "phone";
    expect(panelProblems(bad, tables, keys).map((p) => p.message)).toEqual([
      '"messages" reads "gone", which isn\'t one of the site\'s tables',
      '"calendar": "name" isn\'t a date',
      '"board": "phone" isn\'t a choice',
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
    expect(res.body.panel.map((p: Obj) => p.key)).toEqual(["today", "board", "people", "reports", "lists", "settings"]);
    const ids: Obj = (await prisma.feature.findUnique({ where: { id }, select: { template: true } }))!.template!.ids;
    await request(app).put(`${at}/my-features/${id}`).send({ enabled: true }).expect(200);

    // In the menu, under its name.
    const listed = (await request(app).get(`${at}/site-panels`).expect(200)).body.sites.find((s: Obj) => s.featureId === id);
    expect(listed).toMatchObject({ name: res.body.name, enabled: true });
    expect(listed.pages.map((p: Obj) => [p.key, p.icon])).toEqual([["today", "today"], ["board", "calendar"], ["people", "people"], ["reports", "chart"], ["lists", "lists"], ["settings", "settings"]]);

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
    expect(lists.parts.map((p: Obj) => [p.kind, p.key])).toEqual([["view", "offers"], ["map", "branches"], ["view", "messages"], ["view", "bookings"]]);
    expect(part(lists, "bookings").rows.map((r: Obj) => r.cells.name)).toEqual([{ en: "Sami" }, { en: "Rana" }]);
    expect(part(lists, "offers").total).toBeGreaterThan(0);
    const settings = (await request(app).get(`${at}/site-panels/${id}/settings`).expect(200)).body;
    expect(part(settings, "settings")).toMatchObject({ canWrite: true, values: { bookingOpen: false } });

    // A member given the bookings table only, to read: today's booking numbers and queue (no buttons), no settings, no actions.
    const reader = await member("reader", [tablePermission(ids.table.bookings, "read")]);
    const theirs = (await request(app).get(`${at}/site-panels`).set("Authorization", reader).expect(200)).body.sites.find((s: Obj) => s.featureId === id);
    expect(theirs.pages.map((p: Obj) => p.key)).toEqual(["today", "board", "people", "reports", "lists"]);
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

describe("A site's panel, its other parts", () => {
  test("a board and a calendar move a booking; a customer's page finds them; charts, reports and their file; the branches' map; a scanner", async () => {
    const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile("site-restaurant", { lang: "en" }), lang: "en" });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
    const id = res.body.id as string;
    made.push(id);
    const ids: Obj = (await prisma.feature.findUnique({ where: { id }, select: { template: true } }))!.template!.ids;
    await request(app).put(`${at}/my-features/${id}`).send({ enabled: true }).expect(200);
    const slugOf = async (key: string) => (await prisma.collection.findUniqueOrThrow({ where: { id: ids.table[key] }, select: { slug: true } })).slug;
    const [bookings, messages] = [await slugOf("bookings"), await slugOf("messages")];
    const month = new Date().toISOString().slice(0, 7);
    const day = `${month}-15`;
    await request(app).post(`/v1/data/${bookings}`).send({ values: { name: "Rana", phone: "050-123-4567", service: "dinner", day }, lang: "en" }).expect(201);
    await request(app).post(`/v1/data/${bookings}`).send({ values: { name: "Sami", phone: "052-987-6543", service: "lunch" }, lang: "en" }).expect(201);
    await request(app).post(`/v1/data/${messages}`).send({ values: { name: "Rana", phone: "0501234567", message: "Vegetarian?" }, lang: "en" }).expect(201);
    const page = async (key: string, q = "") => (await request(app).get(`${at}/site-panels/${id}/${key}?lang=en${q}`).expect(200)).body;

    // The bookings' own page: the month by day, the board by state.
    const board = await page("board", `&month=${month}`);
    const cal = part(board, "calendar");
    expect(cal).toMatchObject({ month, date: "day", color: "status", canMove: true, total: 1 });
    expect(cal.rows.map((r: Obj) => r.cells.name)).toEqual([{ en: "Rana" }]);
    const kanban = part(board, "board");
    expect(kanban.columns.map((c: Obj) => [c.id, c.total])).toEqual([["fresh", 2], ["confirmed", 0], ["done", 0]]);
    const rana = cal.rows[0].id as string;
    // Moved along the board, then to another day.
    const moved = (await request(app).post(`${at}/site-panels/${id}/board/board/move`).send({ row: rana, to: "confirmed" }).expect(200)).body;
    expect(part(moved, "board").columns.map((c: Obj) => c.total)).toEqual([1, 1, 0]);
    await request(app).post(`${at}/site-panels/${id}/board/board/move`).send({ row: rana, to: "lost" }).expect(400);
    await request(app).post(`${at}/site-panels/${id}/board/calendar/move?month=${month}`).send({ row: rana, to: `${month}-20` }).expect(200);
    const row = (await prisma.collectionItem.findUniqueOrThrow({ where: { id: rana } })).data as Obj;
    expect([row.status, row.day]).toEqual(["confirmed", `${month}-20`]);
    await request(app).post(`${at}/site-panels/${id}/board/calendar/move`).send({ row: rana, to: "soon" }).expect(400);

    // A customer's page: their booking and their message, found by some of the phone's digits (written two ways).
    expect(part(await page("people"), "person")).toMatchObject({ kind: "people", by: "phone" });
    const found = (await request(app).get(`${at}/site-panels/${id}/people/person/people?q=1234567&lang=en`).expect(200)).body.people;
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ key: "0501234567", name: "Rana" });
    expect(found[0].tables.map((t: Obj) => [t.table.id, t.rows.length])).toEqual([[ids.table.messages, 1], [ids.table.bookings, 1]]);
    expect((await request(app).get(`${at}/site-panels/${id}/people/person/people?q=x`).expect(200)).body.people).toEqual([]);

    // Reports: today's bar holds what came in; the month counted by kind; the month as a file.
    const reports = await page("reports");
    const today = new Date().toISOString().slice(0, 10);
    const daily = part(reports, "bookingsDaily");
    expect(daily.days).toHaveLength(30);
    expect(daily.days[daily.days.length - 1]).toMatchObject({ day: today, total: 2, parts: { fresh: 1, confirmed: 1 } });
    expect(daily.options.map((o: Obj) => o.id)).toEqual(["fresh", "confirmed", "done"]);
    const by = part(reports, "bookingsBy");
    expect(by).toMatchObject({ period: "month", total: 2 });
    expect(by.groups.map((g: Obj) => [g.id, g.n])).toEqual([["lunch", 1], ["dinner", 1], ["event", 0]]);
    expect(part(await page("reports", "&period=lastMonth"), "bookingsBy").total).toBe(0);
    const file = await request(app).get(`${at}/site-panels/${id}/reports/bookingsBy/export?period=month&lang=en`).expect(200);
    expect(file.headers["content-type"]).toContain("text/csv");
    const lines = file.text.replace(String.fromCodePoint(0xfeff), "").trim().split(/\r\n/);
    expect(lines[0]).toBe("Name,Phone number,What for?,The day that suits you,Notes,Status,Came in");
    expect(lines.slice(1).map((l: string) => l.split(",")[0]).sort()).toEqual(["Rana", "Sami"]);
    expect(lines.find((l: string) => l.startsWith("Rana"))).toContain(",Dinner,");

    // The branches on a map: every branch with its address.
    const map = part(await page("lists"), "branches");
    expect(map).toMatchObject({ kind: "map", label: "name", address: "address" });
    expect(map.rows.length).toBeGreaterThan(0);
    expect(map.rows.every((r: Obj) => r.cells.address)).toBe(true);
    await clean();
  });

  test("a scanner finds a row by its code and its buttons decide it", async () => {
    const file = {
      format: "estabrek.feature", formatVersion: 1, key: "panel-scan", version: "1.0.0", name: { en: "Door" },
      tables: [{ key: "tickets", slug: "panel-scan-tickets", name: { en: "Tickets" }, fields: [{ id: "code", type: "text", name: { en: "Code" }, required: true }, { id: "holder", type: "text", name: { en: "Holder" } }, { id: "state", type: "select", name: { en: "State" }, options: [{ id: "valid", name: { en: "Valid" } }, { id: "used", name: { en: "Used" } }] }], rows: [{ slug: "t1", data: { code: { en: "ABCD-2345" }, holder: { en: "Rana" }, state: "valid" } }] }],
      panel: [{ key: "door", name: { en: "Door" }, icon: "today", parts: [{ kind: "scanner", key: "scan", title: { en: "Scan a ticket" }, table: "@table:tickets", match: "code", show: ["holder", "code", "state"], decisions: [{ key: "in", label: { en: "Let in" }, set: { state: "used" }, tone: "good" }] }] }],
    };
    const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: file, lang: "en" });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
    const id = res.body.id as string;
    made.push(id);
    const door = (await request(app).get(`${at}/site-panels/${id}/door`).expect(200)).body;
    expect(part(door, "scan")).toMatchObject({ kind: "scanner", canDecide: true });
    const got = (await request(app).get(`${at}/site-panels/${id}/door/scan/find?code=ABCD-2345`).expect(200)).body.row;
    expect(got.cells).toEqual({ holder: { en: "Rana" }, code: { en: "ABCD-2345" }, state: "valid" });
    await request(app).get(`${at}/site-panels/${id}/door/scan/find?code=NOPE`).expect(404);
    await request(app).post(`${at}/site-panels/${id}/door/scan/decide`).send({ row: got.id, decision: "in" }).expect(200);
    expect((await request(app).get(`${at}/site-panels/${id}/door/scan/find?code=ABCD-2345`).expect(200)).body.row.cells.state).toBe("used");
    await clean();
  });
});

describe("A site's panel as its owner arranges it", () => {
  test("parts reordered, hidden, and one of their own; what can't be arranged is said; an upgrade keeps it and its new parts come after", async () => {
    const file = sites.siteFile("site-restaurant", { lang: "en" });
    const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: file, lang: "en" });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
    const id = res.body.id as string;
    made.push(id);
    const ids: Obj = (await prisma.feature.findUnique({ where: { id }, select: { template: true } }))!.template!.ids;
    await request(app).put(`${at}/my-features/${id}`).send({ enabled: true }).expect(200);

    // What arranging needs, for whoever may change the site's settings: every part, and the site's tables.
    const today = (await request(app).get(`${at}/site-panels/${id}/today?lang=en`).expect(200)).body;
    expect(today.arrange.parts.map((x: Obj) => [x.key, x.kind, x.hidden, x.own])).toEqual([["numbers", "numbers", false, false], ["messages", "queue", false, false], ["bookings", "queue", false, false], ["actions", "actions", false, false]]);
    expect(today.arrange.tables.map((t: Obj) => t.key)).toContain("offers");
    expect(today.arrange.tables.find((t: Obj) => t.key === "bookings").fields.map((f: Obj) => f.id)).toContain("status");

    const own = { kind: "view", key: "myoffers", title: { en: "The menu at a glance" }, table: "@table:offers", columns: ["title", "price"], sort: { field: "$createdAt", dir: "desc" }, limit: 20 };
    const put = (body: Obj, auth?: string) => {
      const r = request(app).put(`${at}/site-panels/${id}/today/layout?lang=en`);
      return (auth ? r.set("Authorization", auth) : r).send(body);
    };
    // Out of shape: a part that isn't the page's, an own key not "my…", a field the table hasn't, the settings as an own part.
    for (const [body, said] of [
      [{ order: ["numbers", "nope"] }, 'This page has no part "nope"'],
      [{ own: [{ ...own, key: "offers2" }] }, 'An own part\'s key is "my" and small letters or digits'],
      [{ own: [{ ...own, columns: ["title", "colour"] }] }, '"myoffers": the table "offers" has no field "colour"'],
      [{ own: [{ kind: "settings", key: "mysettings", keys: ["hours"] }] }, 'A "settings" part is the site\'s own'],
    ] as Array<[Obj, string]>) {
      const bad = await put(body).expect(400);
      expect(bad.body.details.problems.map((p: Obj) => p.message), JSON.stringify(body)).toContain(said);
    }
    // Arranged: the quick actions first, the messages hidden, the owner's table after the numbers.
    const order = ["actions", "bookings", "numbers", "myoffers", "messages"];
    const after = (await put({ order, hidden: ["messages"], own: [own] }).expect(200)).body;
    expect(after.parts.map((p: Obj) => p.key)).toEqual(["actions", "bookings", "numbers", "myoffers"]);
    const mine = after.parts.find((p: Obj) => p.key === "myoffers");
    expect(mine).toMatchObject({ kind: "view", total: 8 });
    expect(mine.columns.map((c: Obj) => c.id)).toEqual(["title", "price"]);
    expect(after.arrange.parts.find((x: Obj) => x.key === "messages")).toMatchObject({ hidden: true, own: false });
    expect(after.arrange.parts.find((x: Obj) => x.key === "myoffers")).toMatchObject({ own: true, part: own });

    // A member who may only read the bookings: the arranged page, no arranging.
    const reader = await member("arranger-reader", [tablePermission(ids.table.bookings, "read")]);
    const seen = (await request(app).get(`${at}/site-panels/${id}/today`).set("Authorization", reader).expect(200)).body;
    expect(seen.parts.map((p: Obj) => p.key)).toEqual(["bookings", "numbers"]);
    expect(seen.arrange).toBeUndefined();
    await put({ order }, reader).expect(403);

    // Every part of a page hidden: whoever arranges still finds it (to bring them back), the others don't.
    const lists = (await request(app).get(`${at}/site-panels/${id}/lists`).expect(200)).body;
    const every = lists.arrange.parts.map((x: Obj) => x.key);
    const empty = (await request(app).put(`${at}/site-panels/${id}/lists/layout`).send({ hidden: every }).expect(200)).body;
    expect(empty.parts).toEqual([]);
    expect((await request(app).get(`${at}/site-panels`).expect(200)).body.sites.find((x: Obj) => x.featureId === id).pages.map((p: Obj) => p.key)).toContain("lists");
    expect((await request(app).get(`${at}/site-panels`).set("Authorization", reader).expect(200)).body.sites.find((x: Obj) => x.featureId === id).pages.map((p: Obj) => p.key)).not.toContain("lists");

    // Upgraded to a newer file with a new part on «today»: the owner's arrangement stays, the new part comes after it.
    const newer = structuredClone(file);
    newer.version = "9.0.0";
    newer.panel[0].parts.push({ kind: "view", key: "extra", title: { en: "Extra" }, table: "@table:offers", columns: ["title"] });
    const up = await request(app).post(`${at}/my-features/${id}/upgrade`).send({ template: newer, lang: "en" });
    expect(up.status, JSON.stringify(up.body).slice(0, 300)).toBe(200);
    const upgraded = (await request(app).get(`${at}/site-panels/${id}/today?lang=en`).expect(200)).body;
    expect(upgraded.parts.map((p: Obj) => p.key)).toEqual(["actions", "bookings", "numbers", "myoffers", "extra"]);
    expect((await request(app).get(`${at}/site-panels/${id}/lists`).expect(200)).body.parts).toEqual([]);
    await clean();
  });
});
