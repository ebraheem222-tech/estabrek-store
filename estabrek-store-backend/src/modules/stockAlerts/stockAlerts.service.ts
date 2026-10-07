import { randomBytes } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/httpError.js";
import { stockAlertsOn } from "../../lib/features.js";
import { emailConfigured, sendEmail } from "../outbox/sender/email.js";

/**
 * Back-in-stock alerts. A shopper (no account needed) leaves her email on a
 * sold-out size; when that size has stock again she gets one email with a link
 * to the piece and a stop link. Switched on from the admin (stockAlertsEnabled).
 *
 * Emails go out from a sweep (every couple of minutes, and a few seconds after
 * stock changes in the admin). Nothing is sent, and alerts keep waiting, until
 * email (Resend) and STOREFRONT_URL are set up, so no alert is lost.
 */

const fail = (status: number, code: string, message: string) => new AppError(status, code, message);

/** New alerts one IP may leave per hour, and alerts one email may wait on. */
export const PER_IP_PER_HOUR = 10;
export const PER_EMAIL_WAITING = 30;
const MAX_ATTEMPTS = 3;
const SWEEP_BATCH = 40;

const newToken = () => randomBytes(24).toString("base64url");

/** Emails can go out: Resend is set up and we know the storefront address for the links. */
export function stockAlertsReady() {
  return emailConfigured() && Boolean(env.STOREFRONT_URL);
}

export async function createStockAlert(input: { email: string; variantId: string }, ctx: { ip?: string }) {
  if (!(await stockAlertsOn())) throw fail(404, "FEATURE_OFF", "Back-in-stock alerts are turned off");
  const email = input.email.trim().toLowerCase();

  const variant = await prisma.productVariant.findUnique({
    where: { id: input.variantId },
    select: { id: true, stock: true, item: { select: { isActive: true, product: { select: { id: true, isActive: true } } } } },
  });
  if (!variant || !variant.item.isActive || !variant.item.product.isActive) throw fail(404, "NOT_FOUND", "This piece isn't available");
  if (variant.stock > 0) throw fail(409, "IN_STOCK", "This size is in stock now");

  const existing = await prisma.stockAlert.findUnique({ where: { email_variantId: { email, variantId: variant.id } } });
  // Already waiting: nothing to do (the answer is the same, so nobody learns who asked).
  if (existing?.status === "WAITING") return { ok: true as const };

  const since = new Date(Date.now() - 60 * 60_000);
  if (ctx.ip) {
    const recent = await prisma.stockAlert.count({ where: { ip: ctx.ip, createdAt: { gte: since } } });
    if (recent >= PER_IP_PER_HOUR) throw fail(429, "TOO_MANY_ALERTS", "Too many requests; try again later");
  }
  const waiting = await prisma.stockAlert.count({ where: { email, status: "WAITING" } });
  if (waiting >= PER_EMAIL_WAITING) throw fail(429, "TOO_MANY_ALERTS", "Too many alerts for this email");

  if (existing) {
    // Asked again after an earlier email (or after stopping it): wait again.
    await prisma.stockAlert.update({
      where: { id: existing.id },
      data: { status: "WAITING", attempts: 0, notifiedAt: null, token: newToken(), ip: ctx.ip ?? null, createdAt: new Date() },
    });
  } else {
    await prisma.stockAlert.create({
      data: { email, variantId: variant.id, productId: variant.item.product.id, token: newToken(), ip: ctx.ip ?? null },
    });
  }
  return { ok: true as const };
}

/** The stop link from the email. `all` stops every alert of that email. Works even while the feature is off. */
export async function stopStockAlert(token: string, all = false) {
  const alert = await prisma.stockAlert.findUnique({
    where: { token },
    select: { id: true, email: true, product: { select: { title: true } } },
  });
  if (!alert) throw fail(404, "NOT_FOUND", "This link no longer works");
  const where = all ? { email: alert.email, status: "WAITING" as const } : { id: alert.id, status: "WAITING" as const };
  const out = await prisma.stockAlert.updateMany({ where, data: { status: "CANCELLED" } });
  return { ok: true as const, stopped: out.count, productTitle: alert.product.title };
}

/* ---------------- Sending ---------------- */

function storefrontLink(path: string) {
  const base = (env.STOREFRONT_URL ?? "").replace(/\/+$/, "");
  return `${base}${path}`;
}

/**
 * Sends the emails for alerts whose size has stock again. Each alert is claimed
 * first (WAITING → SENT), so two sweeps never email twice; a failed send goes
 * back to WAITING and stops after 3 tries (FAILED).
 */
export async function sweepStockAlerts(limit = SWEEP_BATCH) {
  if (!(await stockAlertsOn()) || !stockAlertsReady()) return { checked: 0, sent: 0, failed: 0 };
  const due = await prisma.stockAlert.findMany({
    where: { status: "WAITING", variant: { stock: { gt: 0 }, item: { isActive: true, product: { isActive: true } } } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      email: true,
      token: true,
      attempts: true,
      createdAt: true,
      variant: {
        select: {
          size: { select: { name: true } },
          item: {
            select: {
              colorName: true,
              images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1, select: { url: true } },
              product: { select: { title: true, slug: true } },
            },
          },
        },
      },
    },
  });

  let sent = 0;
  let failed = 0;
  for (const a of due) {
    const claim = await prisma.stockAlert.updateMany({ where: { id: a.id, status: "WAITING" }, data: { status: "SENT", notifiedAt: new Date() } });
    if (claim.count !== 1) continue;
    const item = a.variant.item;
    const res = await sendEmail({
      to: a.email,
      template: "STOCK_BACK_IN",
      payload: {
        productTitle: item.product.title,
        colorName: item.colorName,
        sizeName: a.variant.size?.name ?? "",
        imageUrl: item.images[0]?.url ?? null,
        url: storefrontLink(`/p/${encodeURIComponent(item.product.slug)}`),
        stopUrl: storefrontLink(`/stock-alert/stop?t=${encodeURIComponent(a.token)}`),
      },
      idempotencyKey: `stock-alert-${a.id}-${a.createdAt.getTime()}`,
    });
    if (res.ok) {
      sent++;
    } else {
      failed++;
      const attempts = a.attempts + 1;
      await prisma.stockAlert.update({
        where: { id: a.id },
        data: { attempts, status: attempts >= MAX_ATTEMPTS ? "FAILED" : "WAITING", notifiedAt: null },
      });
    }
  }
  return { checked: due.length, sent, failed };
}

/* ---------------- Scheduling ---------------- */

let timer: NodeJS.Timeout | undefined;
let kickTimer: NodeJS.Timeout | undefined;
let running: Promise<unknown> | null = null;

function runSweep() {
  if (running) return running;
  running = sweepStockAlerts()
    .catch((e) => console.error("[stock-alerts] sweep failed:", (e as Error)?.message))
    .finally(() => {
      running = null;
    });
  return running;
}

/** A sweep a few seconds after stock may have changed (admin saves; several saves → one sweep). */
export function kickStockAlerts(delayMs = 3_000) {
  if (process.env.NODE_ENV === "test") return;
  if (kickTimer) clearTimeout(kickTimer);
  kickTimer = setTimeout(() => {
    kickTimer = undefined;
    void runSweep();
  }, delayMs);
  kickTimer.unref?.();
}

/** Regular sweep (STOCK_ALERT_INTERVAL_MS, default 2 minutes; 0 turns it off). */
export function startStockAlertSweeper() {
  const every = Number(process.env.STOCK_ALERT_INTERVAL_MS ?? 120_000);
  if (!Number.isFinite(every) || every <= 0) return;
  timer = setInterval(() => void runSweep(), Math.max(15_000, every));
  timer.unref?.();
}

export function stopStockAlertSweeper() {
  if (timer) clearInterval(timer);
  if (kickTimer) clearTimeout(kickTimer);
  timer = kickTimer = undefined;
}
