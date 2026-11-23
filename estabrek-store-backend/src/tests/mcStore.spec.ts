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
import { setGatewayForTests, type Gateway, type GatewayPaid } from "../lib/payLinks.js";
import { runTasks } from "../lib/tasks.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// A Minecraft server's own store (wave G4 of docs/sites-300-plan.ar.md), with the database: the survival site installed
// from the admin's own files, its two functions published. A signed-in player buys a package through the store's
// «اشتري» (the function at its call address): one that gives an advantage in the game is refused in Mojang's words;
// another writes their purchase, unpaid, and asks for the payment (Stripe stood in for). Paid, the purchase waits to
// be given, the owner hears and the player is written to; another payment (a booking's) leaves the purchases alone.
// Requests to /v1/admin without a token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
let featureId = "";
let ids: Obj = {};
let sara = "";
let saraId = "";
const EMAIL = "sara@mc-store-spec.test";
const paidAs = new Map<string, GatewayPaid>();
let opened = 0;
const standIn: Gateway = {
  async start() {
    opened += 1;
    return { redirectUrl: `https://checkout.stripe.test/c/cs_mc_${opened}`, providerRef: `cs_mc_${opened}` };
  },
  async check(a) {
    return paidAs.get(a.providerRef) ?? { paid: false, status: "open", amount: null, currency: null, paymentReference: null };
  },
};
let before: { id: string; stripeEnabled: boolean; stripeSecretKey: string | null; paypalEnabled: boolean; customerAccountsEnabled: boolean } | null = null;

async function settled() {
  for (let quiet = 0; quiet < 3; ) {
    await new Promise((r) => setTimeout(r, 25));
    await runTasks();
    quiet = rowEventsInFlight() || (await prisma.task.count({ where: { kind: "function", status: { in: ["waiting", "running"] }, runAt: { lte: new Date() } } })) ? 0 : quiet + 1;
  }
}
const buy = (row: string) => request(app).post("/v1/fn/buy-package").set("Authorization", `Bearer ${sara}`).send({ input: { package: row } });
const packageId = async (slug: string) => (await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: ids.table.packages, slug } })).id;
/** A payment request's page paid, as the shopper coming back from the gateway would find it. */
async function pay(link: string, amount: number) {
  const token = link.split("/pay/")[1];
  await request(app).post(`/v1/pay/${token}/start`).set("Origin", "http://127.0.0.1:3900").send({ provider: "stripe" }).expect(200);
  paidAs.set(`cs_mc_${opened}`, { paid: true, status: "paid", amount, currency: (await prisma.paymentRequest.findUniqueOrThrow({ where: { token } })).currency.toLowerCase(), paymentReference: `pi_mc_${opened}` });
  expect((await request(app).post(`/v1/pay/${token}/verify`).expect(200)).body.status).toBe("PAID");
  await settled();
}

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  startFunctions();
  setGatewayForTests(standIn);
  await prisma.task.deleteMany({ where: { kind: "function" } });
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  before = { id: s.id, stripeEnabled: s.stripeEnabled, stripeSecretKey: s.stripeSecretKey, paypalEnabled: s.paypalEnabled, customerAccountsEnabled: s.customerAccountsEnabled };
  await prisma.siteSettings.update({ where: { id: s.id }, data: { stripeEnabled: true, stripeSecretKey: "sk_test_mc_store_spec", paypalEnabled: false, customerAccountsEnabled: true } });
  forgetFeatures();
  const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile("site-minecraft-survival", { lang: "ar" }), lang: "ar" });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
  featureId = res.body.id;
  ids = (await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } }))!.template!.ids;
  await request(app).put(`${at}/my-features/${featureId}`).send({ enabled: true }).expect(200);
  for (const id of Object.values(ids.function) as string[]) await request(app).post(`${at}/functions/${id}/publish`).expect(200);
  forgetTriggers();
  const player = await prisma.user.create({ data: { email: EMAIL, name: "Sara" } });
  saraId = player.id;
  sara = signCustomerToken(player.id);
});
afterAll(async () => {
  setGatewayForTests(null);
  if (featureId) await request(app).post(`${at}/my-features/${featureId}/remove`).send({ rows: "delete" });
  await prisma.paymentRequest.deleteMany({ where: { title: { in: ["رتبة نجمة", "mc-store-spec booking"] } } });
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  if (before) await prisma.siteSettings.update({ where: { id: before.id }, data: { stripeEnabled: before.stripeEnabled, stripeSecretKey: before.stripeSecretKey, paypalEnabled: before.paypalEnabled, customerAccountsEnabled: before.customerAccountsEnabled } });
  forgetFeatures();
  forgetFeatureGate();
  forgetTriggers();
  await prisma.task.deleteMany({ where: { kind: "function" } });
});

describe("A Minecraft server's store", () => {
  test("the store's list: what gives no advantage, never the command; a package that does can't be bought", async () => {
    // As the store's list asks: the ones that give no advantage, without the command that gives them.
    const listed = (await request(app).get("/v1/data/packages").query({ "advantage[isFalse]": "" }).expect(200)).body.data as Obj[];
    expect(listed.map((r) => r.slug).sort()).toEqual(["builder-title", "fox-pet", "particles", "star-rank"]);
    expect(listed.every((r) => !("command" in r.values))).toBe(true);
    const all = (await request(app).get("/v1/data/packages").expect(200)).body.data as Obj[];
    expect(all.map((r) => r.slug).sort()).toEqual(["builder-title", "diamond-kit", "fox-pet", "particles", "star-rank"]);
    // The gate: in Mojang's words, and nothing written or asked.
    const refused = await buy(await packageId("diamond-kit")).expect(422);
    expect(refused.body.error).toBe("هالباقة بتعطي أفضلية باللعب، وقواعد Mojang لسيرفرات ماينكرافت بتمنع بيعها.");
    expect(await prisma.collectionItem.count({ where: { collectionId: ids.table.purchases } })).toBe(0);
    // Not signed in: asked to.
    await request(app).post("/v1/fn/buy-package").send({ input: { package: await packageId("star-rank") } }).expect(401);
  });

  test("bought: the purchase theirs and unpaid, the payment asked; paid, it waits to be given and they hear", async () => {
    const out = (await buy(await packageId("star-rank")).expect(200)).body;
    expect(out.ok).toBe(true);
    expect(out.value.link).toMatch(/\/pay\/[A-Za-z0-9_-]+$/);
    const purchase = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: ids.table.purchases } });
    expect(purchase.ownerId).toBe(saraId);
    expect(purchase.data).toMatchObject({ status: "unpaid", price: 20 });
    const asked = await prisma.paymentRequest.findFirstOrThrow({ where: { ref: purchase.id } });
    expect({ amount: Number(asked.amount), email: asked.email, back: asked.back }).toEqual({ amount: 20, email: EMAIL, back: "/store" });

    await pay(out.value.link, 20);
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: purchase.id } })).data).toMatchObject({ status: "waiting" });
    expect(await prisma.adminNotification.count({ where: { title: { startsWith: "انباعت باقة" } } })).toBeGreaterThan(0);
    expect(await prisma.outboxMessage.findFirst({ where: { to: EMAIL, template: "FN_MESSAGE" } })).toBeTruthy();
    // The player reads theirs, without the staff's note.
    const mine = (await request(app).get("/v1/data/purchases?mine=added").set("Authorization", `Bearer ${sara}`).expect(200)).body.data as Obj[];
    expect(mine.map((r) => r.values.status)).toEqual(["waiting"]);
    expect("note" in mine[0].values).toBe(false);

    // The staff give it from the panel.
    const today = (await request(app).get(`${at}/site-panels/${featureId}/today?lang=en`).expect(200)).body;
    const queue = today.parts.find((p: Obj) => p.key === "purchases");
    expect(queue.rows.map((r: Obj) => r.cells.$by?.email)).toEqual([EMAIL]);
    await request(app).post(`${at}/site-panels/${featureId}/today/purchases/decide`).send({ row: purchase.id, decision: "given" }).expect(200);
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: purchase.id } })).data).toMatchObject({ status: "given" });
  }, 30_000);

  test("another payment (a booking's) leaves the purchases alone, and the run doesn't fail", async () => {
    const asker = (await request(app).post(`${at}/functions`).send({ name: "mc-store-spec asker" }).expect(201)).body.id as string;
    await request(app).put(`${at}/functions/${asker}`).send({ draft: { lang: "en", inputs: [], do: [{ act: "pay", title: "mc-store-spec booking", amount: 50, ref: "B-9", as: "p" }, { act: "return", value: "{{p}}" }] } }).expect(200);
    await request(app).post(`${at}/functions/${asker}/publish`).expect(200);
    const link = (await request(app).post(`${at}/functions/${asker}/run`).send({ input: {}, dry: false, which: "live" }).expect(200)).body.value.link as string;
    const runsBefore = await prisma.run.count({ where: { kind: "function", ok: false } });
    await pay(link, 50);
    expect(await prisma.collectionItem.count({ where: { collectionId: ids.table.purchases } })).toBe(1);
    expect(await prisma.run.count({ where: { kind: "function", ok: false } })).toBe(runsBefore);
    await prisma.fn.delete({ where: { id: asker } });
  }, 30_000);
});
