import { prisma } from "../../lib/prisma.js";
import { phoneKey } from "../../lib/phoneKey.js";

/**
 * «تابعي طلبكِ» for a shopper without an account: her order number (all of it, or its last 8 letters, as the
 * order page and the WhatsApp message show it) and the phone she gave. Both must match; the answer is the same
 * "not found" either way (nothing tells a wrong phone from a wrong number). It shows where the order is (each step
 * and when), its pieces and total, and the city: never her name, phone or address.
 */
export type OrderStep = { status: string; at: string };

/** Each status the order reached, oldest first: placed, then every change (a status reached twice: its first time). */
export function orderSteps(createdAt: Date, history: Array<{ toStatus: string; at: Date }>): OrderStep[] {
  const steps: OrderStep[] = [{ status: "NEW", at: createdAt.toISOString() }];
  for (const h of [...history].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    if (!steps.some((s) => s.status === h.toStatus)) steps.push({ status: h.toStatus, at: h.at.toISOString() });
  }
  return steps;
}

export async function trackOrder(orderRaw: string, phoneRaw: string) {
  const code = orderRaw.trim().replace(/^#/, "").toLowerCase();
  const phone = phoneKey(phoneRaw);
  if (code.length < 8 || !/^[a-z0-9]+$/.test(code) || phone.length < 6) return null;
  const rows = await prisma.orderRequest.findMany({
    where: code.length >= 20 ? { id: code } : { id: { endsWith: code } },
    take: 5,
    select: {
      id: true,
      status: true,
      createdAt: true,
      phone: true,
      whatsapp: true,
      city: true,
      total: true,
      currencyCode: true,
      items: { select: { productTitle: true, productSlug: true, colorName: true, sizeName: true, quantity: true, imageUrl: true } },
      history: { select: { toStatus: true, at: true } },
    },
  });
  const order = rows.find((o) => phoneKey(o.phone) === phone || (o.whatsapp && phoneKey(o.whatsapp) === phone));
  if (!order) return null;
  return {
    order: order.id.slice(-8),
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    steps: orderSteps(order.createdAt, order.history),
    city: order.city ?? null,
    total: order.total == null ? null : Number(order.total),
    currencyCode: order.currencyCode,
    items: order.items,
  };
}

/* A few tries per address, so order numbers can't be guessed. */
const tries = new Map<string, { n: number; since: number }>();
const WINDOW_MS = 10 * 60_000;
export const TRACK_TRIES = 10;

/** True while this address may try again (counts the try). */
export function mayTrack(ip: string, now = Date.now()) {
  const t = tries.get(ip);
  if (!t || now - t.since > WINDOW_MS) {
    tries.set(ip, { n: 1, since: now });
    if (tries.size > 20_000) for (const [k, v] of tries) if (now - v.since > WINDOW_MS) tries.delete(k);
    return true;
  }
  t.n += 1;
  return t.n <= TRACK_TRIES;
}

export function resetTrackTriesForTests() {
  tries.clear();
}
