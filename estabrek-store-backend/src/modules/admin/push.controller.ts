import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { PUSH_AUDIENCES, PUSH_LIMITS, pushAudienceCount, pushOverview, queuePush } from "../../lib/push.js";

/**
 * /v1/admin/push — الإشعارات (lib/push.ts): notifications to the shoppers' phones that said yes.
 * Looking needs outbox:read, sending outbox:write (admin.routes.ts): they are the store's outgoing
 * messages, like its emails.
 *
 * GET  /admin/push                         — switched on?, how many phones (signed in, by device), the latest notifications
 * GET  /admin/push/count?audience=&email=  — how many phones a notification would reach now
 * POST /admin/push                         { title, body?, url?, image?, words?, audience, email? } → queued; sent in the background
 */
const r = Router();

const Words = z.object({ title: z.string().max(PUSH_LIMITS.title).optional(), body: z.string().max(PUSH_LIMITS.body).optional() }).strict();
const Send = z
  .object({
    title: z.string().trim().min(1).max(PUSH_LIMITS.title),
    body: z.string().max(PUSH_LIMITS.body).optional(),
    url: z.string().trim().max(PUSH_LIMITS.url).optional(),
    image: z.string().trim().max(PUSH_LIMITS.image).optional(),
    words: z.object({ ar: Words.optional(), en: Words.optional(), he: Words.optional() }).strict().optional(),
    audience: z.enum(PUSH_AUDIENCES),
    email: z.string().trim().toLowerCase().max(160).optional(),
  })
  .strict();

const WRONG: Record<string, [number, string]> = {
  PUSH_OFF: [409, "Notifications are switched off (Settings → the app)"],
  PUSH_TITLE: [400, "The title is empty"],
  PUSH_URL: [400, "A place in the shop starts with / (/ar/shop)"],
  PUSH_IMAGE: [400, "A picture is an https address"],
  PUSH_WHO: [400, "Which customer?"],
};

async function customerOf(email: string | undefined) {
  if (!email) throw new AppError(400, "PUSH_WHO", WRONG.PUSH_WHO[1]);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!user) throw new AppError(404, "PUSH_NO_CUSTOMER", "No customer with this email");
  return user;
}

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ ...(await pushOverview()), limits: { title: PUSH_LIMITS.title, body: PUSH_LIMITS.body, url: PUSH_LIMITS.url } });
  }),
);

r.get(
  "/count",
  asyncHandler(async (req, res) => {
    const audience = (PUSH_AUDIENCES as readonly string[]).includes(String(req.query.audience)) ? (String(req.query.audience) as (typeof PUSH_AUDIENCES)[number]) : "all";
    if (audience !== "customer") return res.json({ audience, phones: await pushAudienceCount(audience) });
    const user = await customerOf(typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : undefined);
    res.json({ audience, phones: await pushAudienceCount("customer", user.id), customer: user });
  }),
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = Send.safeParse(req.body ?? {});
    if (!parsed.success) throw new AppError(400, "VALIDATION_ERROR", "Some values are wrong", { issues: parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path.map(String).join("."), message: i.message })) });
    const body = parsed.data;
    const userId = body.audience === "customer" ? (await customerOf(body.email)).id : null;
    try {
      const msg = await queuePush({ ...body, userId, from: "admin", createdById: req.access?.email ?? null });
      res.status(201).json({ message: { id: msg.id, status: msg.status, total: msg.total } });
    } catch (e) {
      const known = WRONG[(e as Error).message];
      if (known) throw new AppError(known[0], (e as Error).message, known[1]);
      throw e;
    }
  }),
);

export default r;
