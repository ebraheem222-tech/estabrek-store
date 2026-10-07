import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { compileIpRule, normalizeIp } from "../../utils/ip.js";
import { policy } from "../../lib/securityPolicy.js";
import { forgive, snapshot } from "../../lib/pressure.js";
import { refreshIpBlocks } from "../../middleware/pressure.js";

/**
 * /v1/admin/system/traffic — who is pressing on the server right now, blocks set
 * by hand, and forgiving an IP (system:read / system:write). The model's numbers
 * are part of the security policy (PATCH /system/security { pressure: … }).
 */
const r = Router();

const ipOf = (req: any) => normalizeIp(String(req.ip ?? ""));

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const now = Date.now();
    const snap = snapshot(100);
    const blocks = await prisma.ipBlock.findMany({
      where: { OR: [{ until: null }, { until: { gt: new Date(now) } }] },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({
      settings: policy().pressure,
      now,
      yourIp: ipOf(req),
      tracked: snap.tracked,
      counts: {
        blocked: snap.clients.filter((c) => c.status === "blocked").length,
        wouldBlock: snap.clients.filter((c) => c.status === "would-block").length,
        slowed: snap.clients.filter((c) => c.status === "slowed").length,
      },
      clients: snap.clients,
      blocks,
    });
  }),
);

const BlockBody = z.object({
  ip: z.string().trim().min(2).max(64),
  /** null = until unblocked by hand. */
  minutes: z.number().int().min(5).max(60 * 24 * 365).nullable(),
  reason: z.string().trim().max(200).optional(),
});

r.post(
  "/blocks",
  validate({ body: BlockBody }),
  asyncHandler(async (req, res) => {
    const ip = normalizeIp(req.body.ip);
    const rule = compileIpRule(ip);
    if (!rule || ip.includes("/")) throw new AppError(400, "BAD_IP", "Write one IP address (ranges go in the security page)");
    if (ip === ipOf(req)) throw new AppError(409, "BLOCKS_YOUR_IP", "This is your own IP; blocking it would lock you out");
    const until = req.body.minutes ? new Date(Date.now() + req.body.minutes * 60_000) : null;
    const adminUserId = (req as any).user?.bypass ? null : (req as any).access?.adminId ?? null;
    const block = await prisma.ipBlock.upsert({
      where: { ip },
      create: { ip, until, reason: req.body.reason || null, adminUserId },
      update: { until, reason: req.body.reason || null, adminUserId, createdAt: new Date() },
    });
    await refreshIpBlocks();
    res.status(201).json(block);
  }),
);

r.delete(
  "/blocks/:id",
  asyncHandler(async (req, res) => {
    const row = await prisma.ipBlock.findUnique({ where: { id: String(req.params.id) } });
    if (!row) throw NotFound("This block no longer exists");
    await prisma.ipBlock.delete({ where: { id: row.id } });
    forgive(row.ip);
    await refreshIpBlocks();
    res.json({ ok: true });
  }),
);

/** Clears an IP's score, strikes and automatic block. */
r.post(
  "/forgive",
  validate({ body: z.object({ ip: z.string().trim().min(2).max(64) }) }),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, cleared: forgive(normalizeIp(req.body.ip)) });
  }),
);

export default r;
