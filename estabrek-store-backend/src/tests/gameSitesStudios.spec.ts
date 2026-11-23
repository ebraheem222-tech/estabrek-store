import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetTriggers, rowEventsInFlight } from "../lib/fnTriggers.js";
import { runTasks } from "../lib/tasks.js";
import { forgetSiteSettings } from "../lib/siteSettings.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// Game studios' sites (wave G7d1 of docs/sites-300-plan.ar.md), installed from the admin's own files. A FiveM script
// studio sells on its Tebex webstore (its packages under its own heading), a Minecraft plugin studio through the store
// itself (the store's own products on its page, and Mojang's line). Both have docs for each product (a page each), a
// changelog newest first that anyone may read, and support tickets: a signed-in customer's own, one open for each
// product, never their state or the answer; the team's answer reaches them by email.
// Requests to /v1/admin without a token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
const made: string[] = [];
const EMAIL = "reem@studio-spec.test";

const all = (n: Obj): Obj[] => [n, ...(n.children ?? []).flatMap(all)];
const served = async (slug: string) => (await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(slug)}&locale=en`).expect(200)).body;
async function install(key: string) {
  const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile(key, { lang: "en" }), lang: "en" });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
  const id: string = res.body.id;
  made.push(id);
  await request(app).put(`${at}/my-features/${id}`).send({ enabled: true }).expect(200);
  const ids = (await prisma.feature.findUnique({ where: { id }, select: { template: true } }))!.template!.ids as Obj;
  await prisma.page.updateMany({ where: { id: { in: Object.values(ids.page) as string[] } }, data: { status: "PUBLISHED" } });
  forgetSiteSettings();
  return { id, ids };
}
async function remove(id: string) {
  await request(app).post(`${at}/my-features/${id}/remove`).send({ rows: "delete" });
  made.splice(made.indexOf(id), 1);
}
async function setAccounts(on: boolean) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: on } });
  forgetFeatures();
}
async function settled() {
  for (let quiet = 0; quiet < 3; ) {
    await new Promise((r) => setTimeout(r, 25));
    await runTasks();
    quiet = rowEventsInFlight() || (await prisma.task.count({ where: { kind: "function", status: { in: ["waiting", "running"] }, runAt: { lte: new Date() } } })) ? 0 : quiet + 1;
  }
}

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  startFunctions();
  forgetFeatures();
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});
afterAll(async () => {
  for (const id of [...made]) await remove(id);
  await prisma.outboxMessage.deleteMany({ where: { to: EMAIL } });
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.task.deleteMany({ where: { kind: "function" } });
  await setAccounts(false);
  forgetFeatures();
  forgetFeatureGate();
  forgetSiteSettings();
  forgetTriggers();
});

describe("A FiveM script studio", () => {
  test("its scripts on Tebex under its own heading, docs by product, the changelog newest first, and support tickets answered by email", async () => {
    const { id, ids } = await install("site-fivem-studio");
    // Its Tebex packages under the studio's words, not a server's support.
    const packages = JSON.stringify(await served("/packages"));
    expect(packages).toContain("Our scripts");
    expect(packages).not.toContain("Support the server");
    // Docs: a section a product, each page with its version and its own address.
    const docs = JSON.stringify(await served("/docs"));
    for (const t of ["Advanced garage", "City phone", "Police station MLO", "Installing the garage", "/docs/garage-install"]) expect(docs).toContain(t);
    expect(docs.indexOf("Installing the garage")).toBeLessThan(docs.indexOf("City phone"));
    // The changelog: newest first; anyone may read it (a product may ask for a newer version).
    const log = JSON.stringify(await served("/changelog"));
    expect(log.indexOf("2.1.0")).toBeLessThan(log.indexOf("1.4.2"));
    expect(log.indexOf("1.4.2")).toBeLessThan(log.indexOf("2.0.0"));
    const releases = (await prisma.collection.findUnique({ where: { id: ids.table.releases }, select: { slug: true } }))!.slug;
    const open = (await request(app).get(`/v1/data/${releases}?product[is]=garage&sort=-date&shown=1&lang=en`).expect(200)).body as { data: Obj[] };
    expect(open.data.map((r) => r.shown.version)).toEqual(["2.1.0", "2.0.0"]);

    // A signed-in customer's ticket: never its state or answer, one open a product, theirs to read with the answer.
    await setAccounts(true);
    const buyer = await prisma.user.create({ data: { email: EMAIL, name: "Reem" } });
    const as = `Bearer ${signCustomerToken(buyer.id)}`;
    const tickets = (await prisma.collection.findUnique({ where: { id: ids.table.tickets }, select: { slug: true } }))!.slug;
    const ticket = { product: "garage", subject: "Cars vanish after a restart", body: "Version 2.1.0 on QBCore: parked cars are gone after the nightly restart." };
    expect((await request(app).post(`/v1/data/${tickets}`).set("Authorization", as).send({ values: { ...ticket, reply: "Fixed!" }, lang: "en" })).status).toBeGreaterThanOrEqual(400);
    const row = (await request(app).post(`/v1/data/${tickets}`).set("Authorization", as).send({ values: ticket, lang: "en" }).expect(201)).body;
    expect((await request(app).post(`/v1/data/${tickets}`).set("Authorization", as).send({ values: { ...ticket, subject: "Again" }, lang: "en" })).status).toBeGreaterThanOrEqual(400);
    // Another product's ticket may come.
    expect((await request(app).post(`/v1/data/${tickets}`).set("Authorization", as).send({ values: { ...ticket, product: "phone", subject: "No sound" }, lang: "en" })).status).toBe(201);
    await settled();
    // The team writes the answer and presses «answered» on the panel: an email to the customer with it.
    const fn = await prisma.fn.findFirst({ where: { id: { in: Object.values(ids.function) as string[] }, name: { startsWith: "تذكرة انردّ عليها" } } });
    await request(app).post(`${at}/functions/${fn!.id}/publish`).expect(200);
    forgetTriggers();
    const stored = await prisma.collectionItem.findUnique({ where: { id: row.id } });
    await prisma.collectionItem.update({ where: { id: row.id }, data: { data: { ...(stored!.data as Obj), reply: { en: "Update to 2.1.1: it keeps them in the database." } } } });
    await request(app).post(`${at}/site-panels/${id}/today/ticketsQueue/decide`).send({ row: row.id, decision: "answer" }).expect(200);
    await settled();
    const mail = await prisma.outboxMessage.findFirst({ where: { to: EMAIL }, orderBy: { createdAt: "desc" } });
    expect(mail).not.toBeNull();
    expect(JSON.stringify(mail!.payloadJson)).toContain("Update to 2.1.1");
    // Their own tickets, read by them: the state and the answer.
    const mine = (await request(app).get(`/v1/data/${tickets}?mine=added&shown=1&lang=en&sort=createdAt`).set("Authorization", as).expect(200)).body as { data: Obj[] };
    expect(mine.data.map((r) => [r.shown.subject, r.values.status])).toEqual([["Cars vanish after a restart", "answered"], ["No sound", "open"]]);
    // Answered, a new ticket for the garage may come.
    expect((await request(app).post(`/v1/data/${tickets}`).set("Authorization", as).send({ values: { ...ticket, subject: "Another question" }, lang: "en" })).status).toBe(201);
    await remove(id);
  }, 30_000);
});

describe("A Minecraft plugin studio", () => {
  test("the store's own products on its pages, how they arrive, and Mojang's line", async () => {
    await install("site-minecraft-studio");
    const page = await served("/plugins");
    const grids = all(page.tree.root).filter((n) => n.type === "products");
    expect(grids.length).toBe(1);
    expect(grids[0].props).toMatchObject({ source: "new", limit: 24 });
    const text = JSON.stringify(page);
    expect(text).toContain("its password is your licence serial");
    expect(text).toContain("NOT AN OFFICIAL MINECRAFT PRODUCT");
    const home = JSON.stringify(await served("/studio"));
    expect(home).toContain("NOT AN OFFICIAL MINECRAFT PRODUCT");
    expect(home).toContain("Land claims");
  }, 20_000);
});
