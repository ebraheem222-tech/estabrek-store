import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/**
 * The store's settings are one row. A new store's first requests came in together and made two
 * (a client's copy, 2026-11-20), and `findFirst()` with no order gives back whichever row Postgres
 * meets first, and that changes after an update. So the setup saved the name, logo, theme and
 * assistant into one row, and every read after it got the other, empty one.
 *
 * Every read of the settings asks in this order: the row written last first. Every write goes to
 * the row a read gave back, so that row stays the newest and is the one read from then on.
 */
export const SITE_ROW_ORDER: Prisma.SiteSettingsOrderByWithRelationInput[] = [{ updatedAt: "desc" }, { createdAt: "asc" }, { id: "asc" }];

/** The header a new store starts with: its pages are made in the page editor. */
const FIRST_HEADER = { storeDesign: { version: 1, mode: "cms" } };

/**
 * The store's settings row, made if there is none. Two requests at once make only one: the second
 * waits behind a lock and finds the first one's row.
 */
export async function getOrCreateSiteRow() {
  const found = await prisma.siteSettings.findFirst({ orderBy: SITE_ROW_ORDER });
  if (found) return found;
  return prisma.$transaction(async (tx) => {
    // A lock of its own (firstRun.ts has 724119013); its answer is nothing: said as text, which Prisma reads.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(724119014)::text AS locked`;
    return (await tx.siteSettings.findFirst({ orderBy: SITE_ROW_ORDER })) ?? (await tx.siteSettings.create({ data: { header: FIRST_HEADER } }));
  });
}
