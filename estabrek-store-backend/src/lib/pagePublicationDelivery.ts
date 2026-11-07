import { randomUUID } from "node:crypto";
import { prisma } from "./prisma.js";
import { triggerCmsRevalidate } from "./cmsRevalidate.js";
import type { RevalidationTarget } from "./storefrontRevalidate.js";
import { nextPublicationBoundary } from "./pagePublication.js";

export type PublicationDelivery = { version: 1; id: string; state: "pending" | "delivered" | "failed" | "not_configured"; attempts: number; createdAt: string; checkedAt: string | null; retryAt: string | null; nextBoundaryAt?: string | null; paths?: string[]; targets: RevalidationTarget[] };

export function newPublicationDelivery(now = new Date()): PublicationDelivery {
  return { version: 1, id: randomUUID(), state: "pending", attempts: 0, createdAt: now.toISOString(), checkedAt: null, retryAt: now.toISOString(), targets: [] };
}

export function storedPublicationDelivery(value: unknown): PublicationDelivery | null {
  const d = value as PublicationDelivery | null;
  return d?.version === 1 && typeof d.id === "string" && ["pending", "delivered", "failed", "not_configured"].includes(d.state) && Number.isInteger(d.attempts) && d.attempts >= 0 && Array.isArray(d.targets) ? d : null;
}

/** Cache invalidation is idempotent. A stale worker may never acknowledge a newer publication. */
export async function attemptPublicationDelivery(pageId: string, delivery: PublicationDelivery, now = new Date()): Promise<PublicationDelivery | null> {
  const page = await prisma.page.findUnique({ where: { id: pageId }, select: { slug: true, status: true, kind: true, publishAt: true, unpublishAt: true, publicationDelivery: true } });
  const current = storedPublicationDelivery(page?.publicationDelivery);
  if (!page || !current || current.id !== delivery.id || current.attempts !== delivery.attempts) return current;
  const result = await triggerCmsRevalidate(delivery.paths?.length ? delivery.paths : [page.slug]);
  const attempts = delivery.attempts + 1;
  const state: PublicationDelivery["state"] = result.state === "success" ? "delivered" : result.state === "not_configured" ? "not_configured" : attempts >= 6 ? "failed" : "pending";
  const next: PublicationDelivery = { ...delivery, state, attempts, checkedAt: now.toISOString(), retryAt: state === "pending" ? new Date(now.getTime() + Math.min(30 * 60_000, 30_000 * 2 ** (attempts - 1))).toISOString() : null, nextBoundaryAt: nextPublicationBoundary(page, now), targets: result.targets };
  const saved = await prisma.page.updateMany({ where: { id: pageId, AND: [{ publicationDelivery: { path: ["id"], equals: delivery.id } }, { publicationDelivery: { path: ["attempts"], equals: delivery.attempts } }] }, data: { publicationDelivery: next } });
  if (saved.count) return next;
  return storedPublicationDelivery((await prisma.page.findUnique({ where: { id: pageId }, select: { publicationDelivery: true } }))?.publicationDelivery);
}

export async function retryPublicationDeliveries(now = new Date()) {
  const pages = await prisma.page.findMany({ where: { OR: [{ AND: [{ publicationDelivery: { path: ["state"], equals: "pending" } }, { publicationDelivery: { path: ["retryAt"], lte: now.toISOString() } }] }, { publicationDelivery: { path: ["nextBoundaryAt"], lte: now.toISOString() } }] }, select: { id: true, publicationDelivery: true }, orderBy: { updatedAt: "asc" }, take: 50 });
  const counts = { checked: 0, delivered: 0, pending: 0, failed: 0 };
  for (const page of pages) {
    let delivery = storedPublicationDelivery(page.publicationDelivery);
    if (!delivery) continue;
    if (delivery.nextBoundaryAt && new Date(delivery.nextBoundaryAt) <= now) {
      const queued = newPublicationDelivery(now);
      const saved = await prisma.page.updateMany({ where: { id: page.id, AND: [{ publicationDelivery: { path: ["id"], equals: delivery.id } }, { publicationDelivery: { path: ["attempts"], equals: delivery.attempts } }] }, data: { publicationDelivery: queued } });
      if (!saved.count) continue;
      delivery = queued;
    }
    if (delivery.state !== "pending" || !delivery.retryAt || new Date(delivery.retryAt) > now) continue;
    counts.checked++;
    try {
      const result = await attemptPublicationDelivery(page.id, delivery, now);
      if (result?.state === "delivered") counts.delivered++;
      else if (result?.state === "pending") counts.pending++;
      else counts.failed++;
    } catch { counts.failed++; }
  }
  return counts;
}
