import { afterAll, beforeAll, describe, expect, test } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetTriggers, rowEventsInFlight, runFnSchedule } from "../lib/fnTriggers.js";
import { setGatewayForTests, type Gateway, type GatewayPaid } from "../lib/payLinks.js";
import { runTasks } from "../lib/tasks.js";
import { gameView, readSite } from "../lib/gameSites.js";
import { joinOf, readStatus, whereOf } from "../lib/gameStatus.js";
import { readListings } from "../lib/gameListings.js";
import { forgetSiteSettings } from "../lib/siteSettings.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// The last two game sites (wave G7d2 of docs/sites-300-plan.ar.md), installed from the admin's own files. The status
// reader reads a website (up while it answers 2xx or 3xx, and how fast), so a hosting company's site opens with its
// control panel's and its machines' status. A customer orders a plan: the order is theirs and unpaid, the payment asked
// through the store (Stripe stood in for); paid, it waits to be set up; the team's «ready» emails the access details.
// A server list: an owner's server waits for the staff's yes, our server reads each listed one (a local FiveM stand-in
// here), and a signed-in player votes once a day for each; the votes start over on the first of the month.
// Requests to /v1/admin without a token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
const made: string[] = [];
const EMAIL = "omar@hosting-spec.test";
let server: http.Server;
let port = 0;
let health = 200;
const paidAs = new Map<string, GatewayPaid>();
let opened = 0;
const standIn: Gateway = {
  async start() {
    opened += 1;
    return { redirectUrl: `https://checkout.stripe.test/c/cs_host_${opened}`, providerRef: `cs_host_${opened}` };
  },
  async check(a) {
    return paidAs.get(a.providerRef) ?? { paid: false, status: "open", amount: null, currency: null, paymentReference: null };
  },
};
let before: { id: string; stripeEnabled: boolean; stripeSecretKey: string | null; paypalEnabled: boolean; customerAccountsEnabled: boolean } | null = null;

const served = async (slug: string) => (await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(slug)}&locale=en`).expect(200)).body;
async function install(key: string) {
  const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile(key, { lang: "en" }), lang: "en" });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
  const id: string = res.body.id;
  made.push(id);
  await request(app).put(`${at}/my-features/${id}`).send({ enabled: true }).expect(200);
  const ids = (await prisma.feature.findUnique({ where: { id }, select: { template: true } }))!.template!.ids as Obj;
  await prisma.page.updateMany({ where: { id: { in: Object.values(ids.page) as string[] } }, data: { status: "PUBLISHED" } });
  for (const fn of Object.values(ids.function) as string[]) await request(app).post(`${at}/functions/${fn}/publish`).expect(200);
  forgetTriggers();
  forgetSiteSettings();
  return { id, ids };
}
async function settled() {
  for (let quiet = 0; quiet < 3; ) {
    await new Promise((r) => setTimeout(r, 25));
    await runTasks();
    quiet = rowEventsInFlight() || (await prisma.task.count({ where: { kind: "function", status: { in: ["waiting", "running"] }, runAt: { lte: new Date() } } })) ? 0 : quiet + 1;
  }
}
/** A payment request's page paid, as the shopper coming back from the gateway would find it. */
async function pay(link: string, amount: number) {
  const token = link.split("/pay/")[1];
  await request(app).post(`/v1/pay/${token}/start`).set("Origin", "http://127.0.0.1:3900").send({ provider: "stripe" }).expect(200);
  paidAs.set(`cs_host_${opened}`, { paid: true, status: "paid", amount, currency: (await prisma.paymentRequest.findUniqueOrThrow({ where: { token } })).currency.toLowerCase(), paymentReference: `pi_host_${opened}` });
  expect((await request(app).post(`/v1/pay/${token}/verify`).expect(200)).body.status).toBe("PAID");
  await settled();
}

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  startFunctions();
  setGatewayForTests(standIn);
  // A machine's health address, and a FiveM server's own answers (for the server list), on this computer.
  server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.statusCode = health;
      return res.end("ok");
    }
    if (req.url === "/dynamic.json") return res.end(JSON.stringify({ clients: 37, sv_maxclients: 64, hostname: "Dew City", mapname: "Los Santos" }));
    if (req.url === "/info.json") return res.end(JSON.stringify({ server: "FXServer", vars: { sv_projectName: "Dew City RP" } }));
    res.statusCode = 404;
    res.end("{}");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  before = { id: s.id, stripeEnabled: s.stripeEnabled, stripeSecretKey: s.stripeSecretKey, paypalEnabled: s.paypalEnabled, customerAccountsEnabled: s.customerAccountsEnabled };
  await prisma.siteSettings.update({ where: { id: s.id }, data: { stripeEnabled: true, stripeSecretKey: ["sk", "test", "hosting", "spec"].join("_"), paypalEnabled: false, customerAccountsEnabled: true } });
  forgetFeatures();
});
afterAll(async () => {
  setGatewayForTests(null);
  server.close();
  for (const id of made) {
    await request(app).post(`${at}/my-features/${id}/remove`).send({ rows: "delete" });
    await prisma.gameSample.deleteMany({ where: { featureId: id } });
  }
  await prisma.paymentRequest.deleteMany({ where: { email: EMAIL } });
  await prisma.outboxMessage.deleteMany({ where: { to: EMAIL } });
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  if (before) await prisma.siteSettings.update({ where: { id: before.id }, data: { stripeEnabled: before.stripeEnabled, stripeSecretKey: before.stripeSecretKey, paypalEnabled: before.paypalEnabled, customerAccountsEnabled: before.customerAccountsEnabled } });
  await prisma.task.deleteMany({ where: { kind: "function" } });
  forgetFeatures();
  forgetFeatureGate();
  forgetSiteSettings();
  forgetTriggers();
});

describe("A website as a status", () => {
  test("up while it answers 2xx or 3xx, with how fast; a private one only where allowed; joined by its link", async () => {
    expect(whereOf("web", "https://panel.playcloud.example/health")).toEqual({ url: "https://panel.playcloud.example/health", host: "panel.playcloud.example" });
    expect(whereOf("web", "ftp://x.example")).toBeNull();
    expect(whereOf("web", "https://user:pass@x.example/")).toBeNull();
    expect(whereOf("web", "panel.example")).toBeNull();
    expect(joinOf("web", "https://panel.playcloud.example")).toEqual({ href: "https://panel.playcloud.example/", address: "panel.playcloud.example" });
    const url = `http://127.0.0.1:${port}/health`;
    expect(await readStatus("web", url)).toMatchObject({ online: false, error: "Only a public address is asked" });
    const up = await readStatus("web", url, { allowPrivate: true });
    expect(up).toMatchObject({ online: true, players: null });
    expect(typeof up.ms).toBe("number");
    health = 503;
    expect(await readStatus("web", url, { allowPrivate: true })).toMatchObject({ online: false, error: "It answered 503" });
    health = 200;
  });
});

describe("A hosting company", () => {
  test("its control panel's and machines' status; a plan ordered and paid through the store, set up, and its access emailed", async () => {
    const { id, ids } = await install("site-game-hosting");
    // Its status: the control panel and the machines, read as websites (here, one on this computer).
    await request(app).put(`${at}/my-features/${id}/settings`).send({ values: { serverAddress: `http://127.0.0.1:${port}/health` } }).expect(200);
    forgetSiteSettings();
    const fra = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: ids.table.servers, slug: "fra1" } });
    await prisma.collectionItem.update({ where: { id: fra.id }, data: { data: { ...(fra.data as Obj), address: { en: `http://127.0.0.1:${port}/health` } } } });
    await readSite(id, { allowPrivate: true });
    const view = (await gameView(id, Date.now() + 21_000))!;
    expect(view).toMatchObject({ game: "web", online: true, players: null });
    expect(typeof view.ms).toBe("number");
    expect(view.servers!.map((x) => [x.key, x.game, x.online])).toEqual([["fra1", "web", true], ["ams1", "web", false], ["dxb1", "web", false]]);
    // Its plans, a section a game; a plan's page orders it.
    const plans = JSON.stringify(await served("/plans"));
    for (const t of ["Minecraft small", "FiveM 128", "Valheim 10", "/order-server"]) expect(plans).toContain(t);

    // A signed-in customer orders: theirs and unpaid, its payment page asked and kept; paid, it waits to be set up.
    const omar = await prisma.user.create({ data: { email: EMAIL, name: "Omar" } });
    const as = `Bearer ${signCustomerToken(omar.id)}`;
    await request(app).post("/v1/fn/order-server").send({ input: { plan: "mc-6gb", location: "fra", name: "Cedar SMP", notes: "" } }).expect(401);
    expect((await request(app).post("/v1/fn/order-server").set("Authorization", as).send({ input: { plan: "nope", location: "fra", name: "X", notes: "" } })).body.ok).toBe(false);
    const out = (await request(app).post("/v1/fn/order-server").set("Authorization", as).send({ input: { plan: "mc-6gb", location: "fra", name: "Cedar SMP", notes: "Paper 1.21" } }).expect(200)).body;
    expect(out.value.link).toMatch(/\/pay\/[A-Za-z0-9_-]+$/);
    const order = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: ids.table.orders } });
    expect(order.ownerId).toBe(omar.id);
    expect(order.data).toMatchObject({ status: "unpaid", price: 60, planKey: { ar: "mc-6gb" }, location: "fra", payLink: out.value.link });
    const asked = await prisma.paymentRequest.findFirstOrThrow({ where: { ref: order.id } });
    expect({ amount: Number(asked.amount), email: asked.email, back: asked.back }).toEqual({ amount: 60, email: EMAIL, back: "/my-servers" });
    await pay(out.value.link, 60);
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: order.id } })).data).toMatchObject({ status: "setup" });
    expect(await prisma.adminNotification.count({ where: { title: { startsWith: "سيرفر اندفع" } } })).toBeGreaterThan(0);
    // The team writes the access details and presses «ready»: the customer gets them by email, and reads them as theirs.
    const now = await prisma.collectionItem.findUniqueOrThrow({ where: { id: order.id } });
    await prisma.collectionItem.update({ where: { id: order.id }, data: { data: { ...(now.data as Obj), access: { en: "mc.cedarsmp.example · panel.playcloud.example/server/42" }, staffNotes: { en: "Node fra1" } } } });
    await request(app).post(`${at}/site-panels/${id}/today/ordersQueue/decide`).send({ row: order.id, decision: "ready" }).expect(200);
    await settled();
    const mails = await prisma.outboxMessage.findMany({ where: { to: EMAIL, template: "FN_MESSAGE" }, orderBy: { createdAt: "asc" } });
    expect(mails.length).toBe(2);
    expect(JSON.stringify(mails[1].payloadJson)).toContain("panel.playcloud.example/server/42");
    const orders = (await prisma.collection.findUnique({ where: { id: ids.table.orders }, select: { slug: true } }))!.slug;
    const mine = (await request(app).get(`/v1/data/${orders}?mine=added&shown=1&lang=en`).set("Authorization", as).expect(200)).body.data as Obj[];
    expect(mine.map((r) => [r.values.status, r.shown.access])).toEqual([["ready", "mc.cedarsmp.example · panel.playcloud.example/server/42"]]);
    expect("staffNotes" in mine[0].values).toBe(false);
    // Nobody writes an order from outside.
    expect((await request(app).post(`/v1/data/${orders}`).set("Authorization", as).send({ values: { plan: "Free", name: "X" }, lang: "en" })).status).toBeGreaterThanOrEqual(400);
    await request(app).post(`${at}/my-features/${id}/remove`).send({ rows: "delete" });
    made.splice(made.indexOf(id), 1);
  }, 40_000);
});

describe("A server list", () => {
  test("an owner's server waits for the staff's yes; listed, our server reads it; a vote a day each; the month's votes start over", async () => {
    const { id, ids } = await install("site-server-list");
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    const as = `Bearer ${signCustomerToken(owner.id)}`;
    const table = (await prisma.collection.findUnique({ where: { id: ids.table.listings }, select: { slug: true } }))!.slug;
    const listing = { name: "Dew City RP", game: "fivem", address: `127.0.0.1:${port}`, about: "Serious roleplay." };
    // Never its state, status or votes; then theirs, a draft waiting; the same address again is held back.
    expect((await request(app).post(`/v1/data/${table}`).set("Authorization", as).send({ values: { ...listing, votes: 9999 }, lang: "en" })).status).toBeGreaterThanOrEqual(400);
    const row = (await request(app).post(`/v1/data/${table}`).set("Authorization", as).send({ values: listing, lang: "en" }).expect(201)).body;
    expect((await request(app).post(`/v1/data/${table}`).set("Authorization", as).send({ values: { ...listing, name: "Again" }, lang: "en" })).status).toBeGreaterThanOrEqual(400);
    await settled();
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("DRAFT");
    // The staff list it: published.
    await request(app).post(`${at}/site-panels/${id}/today/listingsQueue/decide`).send({ row: row.id, decision: "list" }).expect(200);
    await settled();
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("PUBLISHED");
    // Our server reads it (and the ready ones, whose example addresses don't answer): its status beside the owner's words.
    const read = await readListings(Date.now(), { allowPrivate: true });
    expect(read.read).toBe(5);
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: row.id } })).data).toMatchObject({ name: { en: "Dew City RP" }, live: "on", players: 37, max: 64 });
    // Read again only after a few minutes.
    expect((await readListings(Date.now(), { allowPrivate: true })).read).toBe(0);
    // Everyone reads the listed FiveM servers, most votes first, as the list asks in the browser.
    const open = (await request(app).get(`/v1/data/${table}?state[is]=listed&game[is]=fivem&sort=-votes,-players&shown=1&lang=en`).expect(200)).body.data as Obj[];
    expect(open.map((r) => r.shown.name)).toEqual(["Dew City RP", "Dew City RP"]);
    expect(open.map((r) => r.values.votes ?? 0)).toEqual([412, 0]);

    // A vote a day for each server, signed in.
    await request(app).post("/v1/fn/vote-server").send({ input: { listing: row.id } }).expect(401);
    expect((await request(app).post("/v1/fn/vote-server").set("Authorization", as).send({ input: { listing: row.id } }).expect(200)).body.value).toEqual({ votes: 1 });
    const again = (await request(app).post("/v1/fn/vote-server").set("Authorization", as).send({ input: { listing: row.id } })).body;
    expect(again.ok).toBe(false);
    expect(JSON.stringify(again)).toContain("صوّتت لهالسيرفر اليوم");
    const ready = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: ids.table.listings, slug: "cedar-smp" } });
    expect((await request(app).post("/v1/fn/vote-server").set("Authorization", as).send({ input: { listing: ready.id } }).expect(200)).body.value).toEqual({ votes: 288 });
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: row.id } })).data).toMatchObject({ votes: 1 });
    expect(await prisma.collectionItem.count({ where: { collectionId: ids.table.votes, deletedAt: null } })).toBe(2);
    // The month's first night: every server's votes start over; any other night, nothing moves.
    const reset = await prisma.fn.findFirstOrThrow({ where: { id: { in: Object.values(ids.function) as string[] }, name: { startsWith: "أول الشهر" } } });
    const night = async (day: string) => {
      await prisma.fnTrigger.updateMany({ where: { fnId: reset.id, kind: "schedule" }, data: { nextAt: new Date(`${day}T22:05:00.000Z`) } });
      await runFnSchedule(new Date());
      await settled();
    };
    await night("2026-11-14");
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: ready.id } })).data).toMatchObject({ votes: 288 });
    await night("2026-10-31");
    const after = await prisma.collectionItem.findMany({ where: { collectionId: ids.table.listings, deletedAt: null } });
    expect(after.map((r) => (r.data as Obj).votes ?? 0)).toEqual(after.map(() => 0));
    // Its pages: a section a game, read in the browser, ranked by votes.
    const page = await served("/list");
    const lists = JSON.stringify(page);
    expect(lists).toContain(`"sort":"-votes,-players"`);
    expect(lists).toContain("{{row_address}}");
  }, 40_000);
});
