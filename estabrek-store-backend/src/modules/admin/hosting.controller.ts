import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { prisma } from "../../lib/prisma.js";
import { hostingView } from "../../lib/hostingView.js";
import { pendingMigrations } from "../../lib/pendingMigrations.js";
import { env } from "../../config/env.js";

/**
 * /v1/admin/system/hosting (system:read): where this store runs (lib/hostingView.ts). The database
 * is asked one plain question, timed, to say whether it answers.
 */
const r = Router();
const STARTED = new Date();

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const t = Date.now();
    const ok = await prisma.$queryRaw`SELECT 1 AS one`.then(() => true).catch(() => false);
    // The shop's address can change while the server runs (the setup's «متجرك» makes it): read it now.
    const ms = ok ? Date.now() - t : null;
    const pending = ok ? await pendingMigrations() : null;
    res.json(hostingView({ ...process.env, STOREFRONT_URL: env.STOREFRONT_URL ?? process.env.STOREFRONT_URL }, { ok, ms, pending }, STARTED));
  }),
);

export default r;
