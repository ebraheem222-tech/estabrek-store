import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { SiteError, siteUrl } from "../../lib/fnHttp.js";
import { seal } from "../../lib/secretBox.js";
import { PING, WEBHOOK_EVENTS, WEBHOOK_LIMITS, WEBHOOK_ROW_EVENTS, WEBHOOK_STORE_EVENTS, forgetEndpoints, newSecret, pingEndpoint, resendDelivery, retryWaits } from "../../lib/webhooksOut.js";

/**
 * /v1/admin/webhooks — Webhooks طالعة (F6; lib/webhooksOut.ts): the addresses the store's events
 * are sent to, and how each delivery went.
 *
 * Looking needs connections:read, changing connections:write (admin.routes.ts): an endpoint is a
 * way out of the store, like an allowed site or a secret.
 *
 * The signing secret is made here and answered once: when the endpoint is made, and when the
 * secret is renewed. No other route answers it.
 *
 * GET    /admin/webhooks                          — the endpoints, the events there are, the owner's tables, the limits
 * POST   /admin/webhooks                          { name, url, events, tables? } → the endpoint and its `secret`, once
 * PATCH  /admin/webhooks/:id                      { name?, url?, events?, tables?, enabled? } (switched on again: its failures start over)
 * POST   /admin/webhooks/:id/secret               — a new secret (the old one stops signing at once) → `secret`, once
 * DELETE /admin/webhooks/:id                      — with its deliveries
 * POST   /admin/webhooks/:id/test                 — one "ping" sent now: { ok, code, ms, error, delivery }
 * GET    /admin/webhooks/:id/deliveries?status=&before= — the log, the newest first
 * GET    /admin/webhooks/:id/deliveries/:delivery — one delivery with what was sent
 * POST   /admin/webhooks/:id/deliveries/:delivery/resend — sent again (a new round of tries)
 */
const r = Router();

const Name = z.string().trim().min(1).max(WEBHOOK_LIMITS.name);
const Url = z.string().trim().min(1).max(WEBHOOK_LIMITS.url);
const Events = z.array(z.string()).min(1).max(WEBHOOK_EVENTS.length);
const Tables = z.array(z.string().min(1).max(60)).max(WEBHOOK_LIMITS.tables);
const Make = z.object({ name: Name, url: Url, events: Events, tables: Tables.optional() }).strict();
const Change = z.object({ name: Name.optional(), url: Url.optional(), events: Events.optional(), tables: Tables.optional(), enabled: z.boolean().optional() }).strict();

const invalid = (issues: Array<{ path: string; message: string }>) => new AppError(400, "VALIDATION_ERROR", "Some values are wrong", { issues });
function parsed<T>(schema: z.ZodType<T>, body: unknown): T {
  const out = schema.safeParse(body ?? {});
  if (!out.success) throw invalid(out.error.issues.slice(0, 10).map((i) => ({ path: i.path.map(String).join("."), message: i.message })));
  return out.data;
}

/** The address as it is kept: https, a site by its name; nothing in it is ever read for names. */
function address(raw: string): string {
  if (/[{}\s]/.test(raw)) throw invalid([{ path: "url", message: "An address has no spaces or braces" }]);
  try {
    return siteUrl(raw).toString();
  } catch (e) {
    throw invalid([{ path: "url", message: e instanceof SiteError ? e.message : "The address isn't one" }]);
  }
}
function events(list: string[]): string[] {
  const unknown = list.find((e) => !WEBHOOK_EVENTS.includes(e));
  if (unknown !== undefined) throw invalid([{ path: "events", message: `No event called "${String(unknown).slice(0, 40)}"` }]);
  // Kept in the list's own order, each once.
  return WEBHOOK_EVENTS.filter((e) => list.includes(e));
}
async function tables(list: string[] | undefined): Promise<string[]> {
  const ids = [...new Set(list ?? [])];
  if (!ids.length) return [];
  const found = new Set((await prisma.collection.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((c) => c.id));
  const gone = ids.find((id) => !found.has(id));
  if (gone) throw invalid([{ path: "tables", message: "No such table" }]);
  return ids;
}

const SHOWN = { id: true, name: true, url: true, events: true, tables: true, hint: true, enabled: true, failures: true, pausedAt: true, lastOkAt: true, lastErrorAt: true, lastError: true, createdBy: true, createdAt: true, updatedAt: true } as const;
const ROW = { id: true, event: true, eventId: true, status: true, attempts: true, code: true, error: true, ms: true, nextAt: true, createdAt: true, finishedAt: true } as const;

const idOf = (req: Request) => String(req.params.id);
async function endpoint(req: Request) {
  const e = await prisma.webhookEndpoint.findUnique({ where: { id: idOf(req) }, select: SHOWN });
  if (!e) throw new AppError(404, "NOT_FOUND", "No such endpoint");
  return e;
}

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [endpoints, waiting, own] = await Promise.all([
      prisma.webhookEndpoint.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: SHOWN }),
      prisma.webhookDelivery.groupBy({ by: ["endpointId"], where: { status: "waiting" }, _count: { _all: true } }),
      prisma.collection.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, slug: true, name: true } }),
    ]);
    const behind = new Map(waiting.map((w) => [w.endpointId, w._count._all]));
    res.json({
      endpoints: endpoints.map((e) => ({ ...e, waiting: behind.get(e.id) ?? 0 })),
      events: { rows: WEBHOOK_ROW_EVENTS, store: WEBHOOK_STORE_EVENTS, ping: PING },
      tables: own,
      limits: { ...WEBHOOK_LIMITS, waits: retryWaits() },
    });
  }),
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = parsed(Make, req.body);
    if ((await prisma.webhookEndpoint.count()) >= WEBHOOK_LIMITS.endpoints) throw new AppError(409, "TOO_MANY", `At most ${WEBHOOK_LIMITS.endpoints} endpoints`);
    const secret = newSecret();
    const made = await prisma.webhookEndpoint.create({
      data: { name: body.name, url: address(body.url), events: events(body.events), tables: await tables(body.tables), sealed: seal(secret), hint: secret.slice(-4), createdBy: req.access?.email ?? null },
      select: SHOWN,
    });
    forgetEndpoints();
    // The one time the secret is answered.
    res.status(201).json({ endpoint: { ...made, waiting: 0 }, secret });
  }),
);

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const was = await endpoint(req);
    const body = parsed(Change, req.body);
    const saved = await prisma.webhookEndpoint.update({
      where: { id: was.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.url !== undefined ? { url: address(body.url) } : {}),
        ...(body.events !== undefined ? { events: events(body.events) } : {}),
        ...(body.tables !== undefined ? { tables: await tables(body.tables) } : {}),
        // Switched on again (by hand, after the server paused it too): it starts with a clean count.
        ...(body.enabled !== undefined ? { enabled: body.enabled, ...(body.enabled ? { failures: 0, pausedAt: null } : {}) } : {}),
      },
      select: SHOWN,
    });
    forgetEndpoints();
    res.json({ endpoint: { ...saved, waiting: await prisma.webhookDelivery.count({ where: { endpointId: saved.id, status: "waiting" } }) } });
  }),
);

r.post(
  "/:id/secret",
  asyncHandler(async (req, res) => {
    const was = await endpoint(req);
    const secret = newSecret();
    const saved = await prisma.webhookEndpoint.update({ where: { id: was.id }, data: { sealed: seal(secret), hint: secret.slice(-4) }, select: SHOWN });
    res.json({ endpoint: { ...saved, waiting: await prisma.webhookDelivery.count({ where: { endpointId: saved.id, status: "waiting" } }) }, secret });
  }),
);

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const was = await endpoint(req);
    await prisma.webhookEndpoint.delete({ where: { id: was.id } });
    forgetEndpoints();
    res.json({ ok: true });
  }),
);

r.post(
  "/:id/test",
  asyncHandler(async (req, res) => {
    const was = await endpoint(req);
    const out = await pingEndpoint(was.id);
    if (!out) throw new AppError(404, "NOT_FOUND", "No such endpoint");
    res.json(out);
  }),
);

r.get(
  "/:id/deliveries",
  asyncHandler(async (req, res) => {
    const was = await endpoint(req);
    const status = ["waiting", "sent", "failed"].includes(String(req.query.status)) ? String(req.query.status) : undefined;
    const before = typeof req.query.before === "string" && !Number.isNaN(Date.parse(req.query.before)) ? new Date(req.query.before) : undefined;
    const LIMIT = 50;
    const list = await prisma.webhookDelivery.findMany({ where: { endpointId: was.id, ...(status ? { status } : {}), ...(before ? { createdAt: { lt: before } } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: LIMIT + 1, select: ROW });
    const more = list.length > LIMIT;
    const deliveries = more ? list.slice(0, LIMIT) : list;
    res.json({ deliveries, next: more ? deliveries[deliveries.length - 1].createdAt : null });
  }),
);

r.get(
  "/:id/deliveries/:delivery",
  asyncHandler(async (req, res) => {
    const was = await endpoint(req);
    const d = await prisma.webhookDelivery.findFirst({ where: { id: String(req.params.delivery), endpointId: was.id }, select: { ...ROW, body: true } });
    if (!d) throw new AppError(404, "NOT_FOUND", "No such delivery");
    res.json(d);
  }),
);

r.post(
  "/:id/deliveries/:delivery/resend",
  asyncHandler(async (req, res) => {
    const was = await endpoint(req);
    if (!was.enabled) throw new AppError(409, "ENDPOINT_OFF", "The endpoint is switched off: switch it on first");
    const d = await prisma.webhookDelivery.findFirst({ where: { id: String(req.params.delivery), endpointId: was.id }, select: { id: true, status: true } });
    if (!d) throw new AppError(404, "NOT_FOUND", "No such delivery");
    if (!(await resendDelivery(d.id))) throw new AppError(409, "STILL_WAITING", "It is still waiting to be sent");
    res.json({ ok: true });
  }),
);

export default r;
