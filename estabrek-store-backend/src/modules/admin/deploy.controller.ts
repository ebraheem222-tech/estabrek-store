import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { prisma } from "../../lib/prisma.js";
import { deploySnapshot } from "../../lib/deployWatch.js";
import { jobsSnapshot, runJobNow } from "../../lib/jobs.js";
import { emailConfigured } from "../outbox/sender/email.js";

/**
 * /v1/admin/system/deploy — حالة السيرفر: which commit runs here, the branch's
 * last one, and whether a deployment is waiting, late or failed (lib/deployWatch.ts).
 * Reading needs system:read; "look now" needs system:write (admin.routes.ts).
 */
const r = Router();

async function page() {
  const job = jobsSnapshot().jobs.find((j) => j.name === "deployWatch") ?? null;
  // The bell rings by itself; these are the owner's rules on top of it (email, WhatsApp, SMS).
  const rules = await prisma.automationRule.findMany({ where: { trigger: "deploy.failed" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, action: true, enabled: true } });
  return {
    ...deploySnapshot(),
    watch: job ? { status: job.status, everyMs: job.everyMs, nextAt: job.nextAt, off: job.off, failuresInRow: job.failuresInRow } : null,
    rules,
    channels: { email: emailConfigured(), outboxWorker: process.env.OUTBOX_WORKER === "true" },
  };
}

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await page());
  }),
);

/** Looks now (the same run as the job's), then the page. */
r.post(
  "/check",
  asyncHandler(async (_req, res) => {
    const answer = await runJobNow("deployWatch", 20_000);
    res.json({ ...(await page()), ran: !!answer?.started, busy: !!answer?.busy });
  }),
);

export default r;
