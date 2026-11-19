import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { problemsOf, type FnDef } from "../lib/fnDef.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { forgetHits } from "../lib/hitLimit.js";
import { setGatewayForTests, type Gateway, type GatewayPaid, type GatewayStart } from "../lib/payLinks.js";
import { flushRuns, resetRunsForTests } from "../lib/runs.js";
import { resetTasksForTests, runTasks } from "../lib/tasks.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// «اطلب دفع» (stage 2, item 7; lib/payLinks.ts), with the database: a function asks for a payment and keeps a
// link to the shop's own page; the page shows what it is (never who it is for), opens the gateway, and back from it
// asks the gateway; paid once, the functions waiting for "payment.paid" start once. Stripe is stood in for here.
// Requests to /v1/admin without a token run as the test owner.

const PREFIX = "pay-spec-";
const at = "/v1/admin/functions";
const SHOP = "http://127.0.0.1:3900";
type Out = { ok: boolean; dry: boolean; value: any; error: string | null; failedAt: string | null; trace: Array<{ at: string; act: string; ok: boolean; say?: unknown[] }> };

let started: GatewayStart[] = [];
const paidAs = new Map<string, GatewayPaid>();
const standIn: Gateway = {
  async start(a) {
    started.push(a);
    const ref = `cs_test_${started.length}`;
    return { redirectUrl: `https://checkout.stripe.test/c/${ref}`, providerRef: ref };
  },
  async check(a) {
    return paidAs.get(a.providerRef) ?? { paid: false, status: "open", amount: null, currency: null, paymentReference: null };
  },
};

const make = async (name: string, def: Partial<FnDef>, publish = true) => {
  const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200)).body;
  if (publish) {
    expect(saved.problems).toEqual([]);
    await request(app).post(`${at}/${made.id}/publish`).expect(200);
  }
  return made.id as string;
};
const run = async (id: string, input: Record<string, unknown> = {}, dry = false) => (await request(app).post(`${at}/${id}/run`).send({ input, dry, which: dry ? "draft" : "live" }).expect(200)).body as Out;
const tokenOf = (link: string) => link.split("/pay/")[1];
const asker = () =>
  make("ask", {
    inputs: [{ name: "ref", type: "text" }, { name: "email", type: "text" }],
    do: [
      { act: "pay", title: `${PREFIX}Booking {{input.ref}}`, amount: 120, ref: "{{input.ref}}", email: "{{input.email}}", back: "/my-bookings", days: 3, as: "payment" },
      { act: "return", value: "{{payment}}" },
    ],
  });
/** Everything started has run (the queue is empty). */
async function settled() {
  for (let quiet = 0; quiet < 3; ) {
    await new Promise((r) => setTimeout(r, 25));
    await runTasks();
    quiet = (await prisma.task.count({ where: { kind: "function", status: { in: ["waiting", "running"] }, runAt: { lte: new Date() } } })) ? 0 : quiet + 1;
  }
}

let before: { id: string; stripeEnabled: boolean; stripeSecretKey: string | null; paypalEnabled: boolean; currencyCode: string | null } | null = null;
let currency = "ILS";
const payments = (on: boolean) => prisma.siteSettings.update({ where: { id: before!.id }, data: { stripeEnabled: on, stripeSecretKey: on ? "sk_test_pay_spec" : before!.stripeSecretKey, paypalEnabled: false } });

async function clean() {
  await resetRunsForTests();
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.task.deleteMany({ where: { kind: "function" } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.paymentRequest.deleteMany({ where: { title: { startsWith: PREFIX } } });
  await prisma.adminNotification.deleteMany({ where: { title: { startsWith: PREFIX } } });
  forgetTriggers();
  forgetHits();
  started = [];
  paidAs.clear();
}
beforeAll(async () => {
  setGatewayForTests(standIn);
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  before = { id: s.id, stripeEnabled: s.stripeEnabled, stripeSecretKey: s.stripeSecretKey, paypalEnabled: s.paypalEnabled, currencyCode: s.currencyCode };
  currency = (s.currencyCode || "ILS").toUpperCase();
});
beforeEach(async () => {
  await clean();
  // (A reset queue forgets its handlers: the functions' own is given again.)
  await resetTasksForTests();
  startFunctions();
  await payments(true);
});
afterAll(async () => {
  await clean();
  if (before) await prisma.siteSettings.update({ where: { id: before.id }, data: { stripeEnabled: before.stripeEnabled, stripeSecretKey: before.stripeSecretKey, paypalEnabled: before.paypalEnabled } });
  setGatewayForTests(null);
});

describe("A function asks for a payment", () => {
  test("a request kept with who it is for and the function that asked; a link to the shop's own page", async () => {
    const fn = await asker();
    const t0 = Date.now();
    const out = await run(fn, { ref: "B-7", email: "Sara@Example.com" });
    expect(out.ok).toBe(true);
    expect(out.value.link).toMatch(/\/en\/pay\/[A-Za-z0-9_-]{24}$/);
    expect(out.value).toMatchObject({ title: `${PREFIX}Booking B-7`, amount: 120, currency, ref: "B-7" });
    expect(Math.abs(new Date(out.value.endsAt).getTime() - (t0 + 3 * 86_400_000))).toBeLessThan(60_000);
    expect(out.trace[0].say).toEqual(["asked", `${PREFIX}Booking B-7`, `120 ${currency}`]);
    const row = await prisma.paymentRequest.findUniqueOrThrow({ where: { token: tokenOf(out.value.link) } });
    expect({ id: row.id, amount: Number(row.amount), status: row.status, email: row.email, ref: row.ref, back: row.back, lang: row.lang, fnId: row.fnId }).toEqual({ id: out.value.id, amount: 120, status: "PENDING", email: "sara@example.com", ref: "B-7", back: "/my-bookings", lang: "en", fnId: fn });
    // A try-out asks for nothing.
    const dry = await run(fn, { ref: "B-8" }, true);
    expect(dry).toMatchObject({ ok: true, value: { dry: true, id: null, ref: "B-8" } });
    expect(dry.trace[0].say?.[0]).toBe("wouldAsk");
    expect(await prisma.paymentRequest.count({ where: { title: { startsWith: PREFIX } } })).toBe(1);
  });

  test("not without a way to pay, nor for nothing", async () => {
    const fn = await asker();
    await payments(false);
    expect(await run(fn, { ref: "B-1" })).toMatchObject({ ok: false, failedAt: "do.0", error: "No way to pay is switched on (Settings → payments: Stripe or PayPal)" });
    await payments(true);
    const filled = await make("filled", { inputs: [{ name: "sum", type: "any" }], do: [{ act: "pay", title: `${PREFIX}x`, amount: "{{input.sum}}" }] });
    expect(await run(filled, { sum: "free" })).toMatchObject({ ok: false, error: "The sum has to be a number" });
    expect(await run(filled, { sum: null })).toMatchObject({ ok: false, error: "The sum is empty" });
    expect(problemsOf({ inputs: [], do: [{ act: "pay", title: "", amount: 0, days: 200, back: "shop", email: "nobody", phone: "12" }] }, { tables: [], fns: [] })).toEqual([
      { at: "do.0", message: "The title is empty" },
      { at: "do.0", message: "The sum is more than 0" },
      { at: "do.0", message: "The days is at most 90" },
      { at: "do.0", message: "A place in the shop starts with / (/shop)" },
      { at: "do.0", message: '"nobody" isn\'t an email address' },
      { at: "do.0", message: '"12" isn\'t a phone number' },
    ]);
    expect(await prisma.paymentRequest.count({ where: { title: { startsWith: PREFIX } } })).toBe(0);
  });
});

describe("Its page in the shop", () => {
  test("what it is and how to pay, never who it is for; paid once, and the functions waiting start once", async () => {
    const onPaid = await make("on-paid", {
      inputs: [{ name: "ref", type: "text" }, { name: "amount", type: "number" }, { name: "email", type: "text" }, { name: "paymentId", type: "text" }],
      do: [{ act: "notify", title: `${PREFIX}paid {{input.ref}} {{input.amount}} {{input.email}}` }],
    });
    await request(app).post(`${at}/${onPaid}/triggers`).send({ kind: "event", config: { event: "payment.paid" } }).expect(201);
    const out = await run(await asker(), { ref: "B-7", email: "sara@example.com" });
    const token = tokenOf(out.value.link);
    const page = `/v1/pay/${token}`;

    const seen = (await request(app).get(page).expect(200)).body;
    expect(seen).toEqual({ title: `${PREFIX}Booking B-7`, amount: 120, currency, status: "PENDING", providers: ["stripe"], back: "/my-bookings", paidAt: null });
    expect(JSON.stringify(seen)).not.toMatch(/sara|"ref"|email|phone/);

    // A way that isn't on; then the gateway opened, coming back to this page.
    expect((await request(app).post(`${page}/start`).set("Origin", SHOP).send({ provider: "paypal" }).expect(400)).body.error).toBe("PAY_PROVIDER_OFF");
    const opened = (await request(app).post(`${page}/start`).set("Origin", SHOP).send({ provider: "stripe" }).expect(200)).body;
    expect(opened).toEqual({ redirectUrl: "https://checkout.stripe.test/c/cs_test_1" });
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ provider: "stripe", title: `${PREFIX}Booking B-7`, amount: 120, currency, ref: out.value.id, returnUrl: `${SHOP}/en/pay/${token}`, cancelUrl: `${SHOP}/en/pay/${token}?cancelled=1` });

    // Back before paying: still waiting, nothing started.
    expect((await request(app).post(`${page}/verify`).expect(200)).body.status).toBe("PENDING");
    paidAs.set("cs_test_1", { paid: true, status: "paid", amount: 120, currency: currency.toLowerCase(), paymentReference: "pi_spec_1" });
    // The page asks twice (two tabs): paid once, the waiting function runs once.
    const [a, b] = await Promise.all([request(app).post(`${page}/verify`).expect(200), request(app).post(`${page}/verify`).expect(200)]);
    expect([a.body.status, b.body.status]).toEqual(["PAID", "PAID"]);
    await settled();
    expect((await prisma.adminNotification.findMany({ where: { title: { startsWith: PREFIX } } })).map((n) => n.title)).toEqual([`${PREFIX}paid B-7 120 sara@example.com`]);
    await flushRuns();
    expect((await prisma.run.findMany({ where: { kind: "function", ref: onPaid } })).map((r) => r.trigger)).toEqual(["event.payment.paid"]);
    const row = await prisma.paymentRequest.findUniqueOrThrow({ where: { token } });
    expect({ status: row.status, ref: row.paymentReference, provider: row.provider, paid: !!row.paidAt }).toEqual({ status: "PAID", ref: "pi_spec_1", provider: "stripe", paid: true });
    expect((await request(app).post(`${page}/start`).set("Origin", SHOP).send({ provider: "stripe" }).expect(409)).body.error).toBe("PAY_PAID");
    // The admin's list: who paid, and how much came in.
    const list = (await request(app).get("/v1/admin/payment-requests").query({ status: "PAID", q: "B-7" }).expect(200)).body;
    expect(list.rows).toHaveLength(1);
    expect(list.rows[0]).toMatchObject({ title: `${PREFIX}Booking B-7`, amount: 120, status: "PAID", ref: "B-7", email: "sara@example.com", provider: "stripe", paymentReference: "pi_spec_1", fnId: expect.any(String) });
    expect(list.paid.find((p: { currency: string }) => p.currency === currency).amount).toBeGreaterThanOrEqual(120);
  });

  test("not paid: another amount, a link past its end or closed, a link nobody has", async () => {
    const fn = await asker();
    const token = tokenOf((await run(fn, { ref: "B-9" })).value.link);
    const page = `/v1/pay/${token}`;
    await request(app).post(`${page}/start`).set("Origin", SHOP).send({ provider: "stripe" }).expect(200);
    // The gateway says less was paid: not taken as paid.
    paidAs.set("cs_test_1", { paid: true, status: "paid", amount: 1.2, currency: currency.toLowerCase(), paymentReference: "pi_spec_2" });
    expect((await request(app).post(`${page}/verify`).expect(409)).body.error).toBe("PAY_AMOUNT");
    expect((await prisma.paymentRequest.findUniqueOrThrow({ where: { token } })).status).toBe("PENDING");
    // Closed by the owner.
    const id = (await prisma.paymentRequest.findUniqueOrThrow({ where: { token } })).id;
    expect((await request(app).post(`/v1/admin/payment-requests/${id}/cancel`).expect(200)).body.status).toBe("CANCELLED");
    expect((await request(app).post(`/v1/admin/payment-requests/${id}/cancel`).expect(409)).body.error).toBe("NOT_WAITING");
    expect((await request(app).get(page).expect(200)).body).toMatchObject({ status: "CANCELLED", providers: [] });
    expect((await request(app).post(`${page}/start`).set("Origin", SHOP).send({ provider: "stripe" }).expect(409)).body.error).toBe("PAY_CLOSED");
    // Past its end.
    const late = tokenOf((await run(fn, { ref: "B-10" })).value.link);
    await prisma.paymentRequest.update({ where: { token: late }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).get(`/v1/pay/${late}`).expect(200)).body).toMatchObject({ status: "EXPIRED", providers: [] });
    expect((await request(app).get("/v1/admin/payment-requests").query({ status: "EXPIRED", q: "B-10" }).expect(200)).body.rows.map((r: { ref: string }) => r.ref)).toEqual(["B-10"]);
    await request(app).get("/v1/pay/no-such-link-at-all-here").expect(404);
    await request(app).get("/v1/pay/x").expect(404);
  });
});
