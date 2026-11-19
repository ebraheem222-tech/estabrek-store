/**
 * Payments a function asks for (stage 2, item 7: the «اطلب دفع» step; lib/fnDef.ts says its shape): a booking, a
 * membership, a deposit, on the gateway the shop already has (admin → الإعدادات → الدفع: Stripe, PayPal).
 *
 * - The step makes a request (`makePayRequest`): what it is, how much, and the owner's own reference (a booking's
 *   row). It keeps a link to the shop's own page, /<lang>/pay/<token>, that lasts as long as the request
 *   (7 days unless the step says): sent by email, WhatsApp, a notification.
 * - The page shows it (`payView`: never the email, phone or reference) and opens the gateway when the shopper
 *   picks one (`startPay`); the gateway's own session is made only then, so a link sent days ago still works.
 * - Back from the gateway the page asks again (`verifyPay`): the gateway itself is asked whether the whole amount was
 *   paid, in the request's currency. Paid once: the functions waiting for "payment.paid" start, once, with the
 *   request (its ref, amount, email…).
 *
 * The gateways are reached through `gateway` (Stripe's SDK, PayPal's API), which the tests stand in for.
 */
import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { Prisma, type PaymentRequest } from "@prisma/client";
import { prisma } from "./prisma.js";
import { env } from "../config/env.js";
import { couponPhone } from "./fnDef.js";
import { emitFnEvent } from "./fnTriggers.js";
import { capturePayPalOrder, createPayPalOrder, getPayPalAccessToken, getPaymentSettings, type PaymentSettings } from "../modules/storefront/checkout.service.js";

export const PAY_PROVIDERS = ["stripe", "paypal"] as const;
export type PayProvider = (typeof PAY_PROVIDERS)[number];
/** The event a paid request starts functions with (lib/fnTriggers.ts FN_EVENTS). */
export const PAY_EVENT = "payment.paid";
export const PAY_LIMITS = { title: 120, ref: 120, days: { default: 7, max: 90 } } as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A request couldn't be made, or paid: said as the run's failure, or as the page's answer. */
export class PayError extends Error {
  constructor(
    message: string,
    readonly code = "PAY_REFUSED",
    readonly status = 400,
  ) {
    super(message);
  }
}

/* ---------------- The gateways ---------------- */

export type GatewayStart = { provider: PayProvider; settings: PaymentSettings; title: string; amount: number; currency: string; ref: string; returnUrl: string; cancelUrl: string };
export type GatewayCheck = { provider: PayProvider; settings: PaymentSettings; providerRef: string };
/** What a gateway says about a payment: paid or not, and how much in which currency. */
export type GatewayPaid = { paid: boolean; status: string; amount: number | null; currency: string | null; paymentReference: string | null };
export type Gateway = { start(a: GatewayStart): Promise<{ redirectUrl: string; providerRef: string }>; check(a: GatewayCheck): Promise<GatewayPaid> };

const realGateway: Gateway = {
  async start(a) {
    if (a.provider === "stripe") {
      const stripe = new Stripe(a.settings.stripeSecretKey!, { apiVersion: "2023-10-16" });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ quantity: 1, price_data: { currency: a.currency.toLowerCase(), unit_amount: Math.round(a.amount * 100), product_data: { name: a.title } } }],
        success_url: `${a.returnUrl}${a.returnUrl.includes("?") ? "&" : "?"}provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: a.cancelUrl,
        client_reference_id: a.ref,
        metadata: { paymentRequestId: a.ref },
        locale: "auto",
      });
      if (!session?.url) throw new PayError("Stripe gave no address to pay at", "PAY_GATEWAY", 502);
      return { redirectUrl: session.url, providerRef: session.id };
    }
    const token = await getPayPalAccessToken(a.settings.paypalClientId!, a.settings.paypalClientSecret!);
    const order = await createPayPalOrder({ accessToken: token, siteName: a.settings.siteName, currencyCode: a.currency.toUpperCase(), total: a.amount, returnUrl: `${a.returnUrl}${a.returnUrl.includes("?") ? "&" : "?"}provider=paypal`, cancelUrl: a.cancelUrl, referenceId: a.ref });
    const approve = order.links?.find((l) => l.rel === "approve")?.href;
    if (!approve) throw new PayError("PayPal gave no address to pay at", "PAY_GATEWAY", 502);
    return { redirectUrl: approve, providerRef: order.id };
  },
  async check(a) {
    if (a.provider === "stripe") {
      const stripe = new Stripe(a.settings.stripeSecretKey!, { apiVersion: "2023-10-16" });
      const s = await stripe.checkout.sessions.retrieve(a.providerRef);
      const paid = s.payment_status === "paid";
      return { paid, status: String(s.payment_status ?? s.status ?? "open"), amount: s.amount_total == null ? null : s.amount_total / 100, currency: s.currency ?? null, paymentReference: typeof s.payment_intent === "string" ? s.payment_intent : s.id };
    }
    const token = await getPayPalAccessToken(a.settings.paypalClientId!, a.settings.paypalClientSecret!);
    const order = await capturePayPalOrder(token, a.providerRef);
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0] as { id: string; status?: string; amount?: { value?: string; currency_code?: string } } | undefined;
    return { paid: order.status === "COMPLETED", status: String(order.status ?? "PENDING"), amount: capture?.amount?.value == null ? null : Number(capture.amount.value), currency: capture?.amount?.currency_code ?? null, paymentReference: capture?.id ?? order.id };
  },
};
let gateway: Gateway = realGateway;
/** For the tests: a stand-in for Stripe and PayPal (null: the real ones again). */
export function setGatewayForTests(g: Gateway | null) {
  gateway = g ?? realGateway;
}

/** The ways to pay that are switched on and have their keys. */
export const providersOn = (s: PaymentSettings): PayProvider[] => [...(s.stripeEnabled && s.stripeSecretKey ? (["stripe"] as const) : []), ...(s.paypalEnabled && s.paypalClientId && s.paypalClientSecret ? (["paypal"] as const) : [])];

/* ---------------- A request ---------------- */

/** The shop's own page for it: a whole address when the server knows the shop's (STOREFRONT_URL), else its path. */
export function payLink(token: string, lang: string) {
  const path = `/${lang}/pay/${token}`;
  const base = env.STOREFRONT_URL?.replace(/\/+$/, "");
  return base && /^https?:\/\//.test(base) ? `${base}${path}` : path;
}

/** A place in the shop to go back to: "/my-bookings" (not another site). */
export function shopPlace(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!t.startsWith("/") || t.startsWith("//") || /\s/.test(t) || t.length > 300) throw new PayError("A place in the shop starts with / (/shop)");
  return t;
}

export type PayAsk = { title: string; amount: number; ref: string; email: string; phone: string; days?: number; back: string; lang: string; fnId?: string | null };
/** A request as the steps after it see it ({{payment.link}}). */
export type PayMade = { id: string | null; link: string; title: string; amount: number; currency: string; ref: string | null; endsAt: string; dry?: true };

export async function makePayRequest(ask: PayAsk, dry: boolean, now = new Date()): Promise<PayMade> {
  const title = ask.title.trim().slice(0, PAY_LIMITS.title);
  if (!title) throw new PayError("What is it for? (the title is empty)");
  const settings = await getPaymentSettings();
  if (!providersOn(settings).length) throw new PayError("No way to pay is switched on (Settings → payments: Stripe or PayPal)");
  const email = ask.email.trim().toLowerCase();
  if (email && !EMAIL.test(email)) throw new PayError(`"${email.slice(0, 60)}" isn't an email address`);
  const phone = ask.phone.trim();
  if (phone && !couponPhone(phone)) throw new PayError(`"${phone.slice(0, 40)}" isn't a phone number`);
  const back = shopPlace(ask.back);
  const days = ask.days ?? PAY_LIMITS.days.default;
  const expiresAt = new Date(now.getTime() + Math.round(days * 86_400_000));
  const ref = ask.ref.trim().slice(0, PAY_LIMITS.ref) || null;
  const currency = (settings.currencyCode || "ILS").toUpperCase();
  const token = randomBytes(18).toString("base64url");
  const made = (id: string | null): PayMade => ({ id, link: payLink(token, ask.lang), title, amount: ask.amount, currency, ref, endsAt: expiresAt.toISOString(), ...(dry ? { dry: true as const } : {}) });
  if (dry) return made(null);
  const row = await prisma.paymentRequest.create({ data: { token, title, amount: new Prisma.Decimal(ask.amount), currency, ref, email: email || null, phone: phone || null, back, lang: ask.lang, fnId: ask.fnId ?? null, expiresAt }, select: { id: true } });
  return made(row.id);
}

/* ---------------- The shop's page ---------------- */

/** A request as its page shows it: never its email, phone or reference. */
export type PayView = { title: string; amount: number; currency: string; status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED"; providers: PayProvider[]; back: string | null; paidAt: string | null };

const isExpired = (r: Pick<PaymentRequest, "status" | "expiresAt">, now: Date) => r.status === "PENDING" && !!r.expiresAt && r.expiresAt < now;
function viewOf(r: PaymentRequest, settings: PaymentSettings, now: Date): PayView {
  const status = isExpired(r, now) ? "EXPIRED" : (r.status as PayView["status"]);
  return { title: r.title, amount: Number(r.amount), currency: r.currency, status, providers: status === "PENDING" ? providersOn(settings) : [], back: r.back, paidAt: r.paidAt?.toISOString() ?? null };
}
async function requestOf(token: string) {
  const r = typeof token === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(token) ? await prisma.paymentRequest.findUnique({ where: { token } }) : null;
  if (!r) throw new PayError("No such payment", "PAY_NOT_FOUND", 404);
  return r;
}

export async function payView(token: string, now = new Date()): Promise<PayView> {
  return viewOf(await requestOf(token), await getPaymentSettings(), now);
}

/** The gateway opened for it: where the shopper pays. `baseUrl` is the shop's own address (it comes back there). */
export async function startPay(token: string, provider: PayProvider, baseUrl: string, now = new Date()): Promise<{ redirectUrl: string }> {
  const r = await requestOf(token);
  const settings = await getPaymentSettings();
  const view = viewOf(r, settings, now);
  if (view.status === "PAID") throw new PayError("It is paid already", "PAY_PAID", 409);
  if (view.status !== "PENDING") throw new PayError("This payment can't be paid any more", "PAY_CLOSED", 409);
  if (!view.providers.includes(provider)) throw new PayError("This way to pay isn't switched on", "PAY_PROVIDER_OFF", 400);
  const page = `${baseUrl.replace(/\/+$/, "")}/${r.lang || "ar"}/pay/${r.token}`;
  const out = await gateway.start({ provider, settings, title: r.title, amount: Number(r.amount), currency: r.currency, ref: r.id, returnUrl: page, cancelUrl: `${page}?cancelled=1` });
  await prisma.paymentRequest.update({ where: { id: r.id }, data: { provider, providerRef: out.providerRef } });
  return { redirectUrl: out.redirectUrl };
}

/**
 * Back from the gateway: is it paid? The gateway's own word about the session this request opened (never what the
 * address says), for the whole amount in its currency. Paid: kept, and the functions that wait for it start, once.
 */
export async function verifyPay(token: string, now = new Date()): Promise<PayView> {
  const r = await requestOf(token);
  const settings = await getPaymentSettings();
  if (r.status !== "PENDING" || !r.provider || !r.providerRef) return viewOf(r, settings, now);
  const said = await gateway.check({ provider: r.provider as PayProvider, settings, providerRef: r.providerRef });
  if (!said.paid) return viewOf(r, settings, now);
  const want = Number(r.amount);
  if (said.amount === null || Math.abs(said.amount - want) > 0.005 || (said.currency && said.currency.toUpperCase() !== r.currency.toUpperCase())) {
    console.error(`[pay] ${r.id}: the gateway says ${said.amount} ${said.currency}, the request is for ${want} ${r.currency}`);
    throw new PayError("The amount paid isn't the amount asked", "PAY_AMOUNT", 409);
  }
  // Only the first to see it paid marks it (two tabs, a page opened again): the functions start once.
  const marked = await prisma.paymentRequest.updateMany({ where: { id: r.id, status: "PENDING" }, data: { status: "PAID", paidAt: now, paymentReference: said.paymentReference } });
  if (marked.count) {
    await emitFnEvent(PAY_EVENT, { paymentId: r.id, ref: r.ref, title: r.title, amount: want, currency: r.currency, email: r.email, phone: r.phone, provider: r.provider, paymentReference: said.paymentReference, paidAt: now.toISOString() }, `payment:${r.id}`).catch((e) => console.error("[pay] functions:", e instanceof Error ? e.message : e));
  }
  return viewOf(await prisma.paymentRequest.findUniqueOrThrow({ where: { id: r.id } }), settings, now);
}

/* ---------------- The admin's list ---------------- */

export type PayRow = { id: string; title: string; amount: number; currency: string; status: PayView["status"]; ref: string | null; email: string | null; phone: string | null; provider: string | null; paymentReference: string | null; link: string; fnId: string | null; paidAt: string | null; expiresAt: string | null; createdAt: string };
export function payRow(r: PaymentRequest, now = new Date()): PayRow {
  return { id: r.id, title: r.title, amount: Number(r.amount), currency: r.currency, status: isExpired(r, now) ? "EXPIRED" : (r.status as PayRow["status"]), ref: r.ref, email: r.email, phone: r.phone, provider: r.provider, paymentReference: r.paymentReference, link: payLink(r.token, r.lang || "ar"), fnId: r.fnId, paidAt: r.paidAt?.toISOString() ?? null, expiresAt: r.expiresAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() };
}
