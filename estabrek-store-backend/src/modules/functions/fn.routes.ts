/**
 * A function's own doors (F3; lib/fnTriggers.ts):
 *
 * POST /v1/fn/:address     { input } — a call. The function runs at once and its answer comes
 *                          back: { ok: true, value }, or 422 { ok: false, error } when it stopped.
 *                          Who may call is the trigger's choice: a signed-in shopper (their token
 *                          in `Authorization: Bearer …`), an API key (`X-Api-Key`), or anyone.
 *                          The function knows who called as {{caller}} (set here, never by the caller).
 * POST /v1/hooks/:secret   any JSON — a webhook from another system. Taken in (202) and run
 *                          through the queue; the function is handed { body, query }.
 *
 * An address that isn't one, or whose function is unpublished or switched off, answers 404.
 */
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { CALL_PER_MINUTE, TRIGGER_LIMITS, emitWebhook, triggerAt, type CallConfig } from "../../lib/fnTriggers.js";
import { hit } from "../../lib/hitLimit.js";
import { apiCaller, ipOf } from "../../middleware/apiCaller.js";
import { runFn, type FnCaller } from "./functions.service.js";

const MINUTE = 60_000;
const CallBody = z.object({ input: z.record(z.string().max(40), z.unknown()).default({}) }).strict();
const gone = () => new AppError(404, "NOT_FOUND", "No such address");
const tooMany = (res: Response, resetAt: number) => {
  res.setHeader("Retry-After", String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))));
  res.status(429).json({ error: "RATE_LIMIT", message: "Too many requests this minute", retryAt: resetAt });
};

export const fnCalls = Router();
fnCalls.use(apiCaller);
fnCalls.post(
  "/:address",
  asyncHandler(async (req: Request, res: Response) => {
    const t = await triggerAt("call", String(req.params.address ?? "").toLowerCase());
    if (!t) throw gone();
    const config = t.config as CallConfig;
    // Who is calling, as the trigger asks for it.
    let caller: FnCaller;
    let from: string;
    if (config.who === "customer") {
      if (!req.customer) throw new AppError(401, "SIGN_IN_NEEDED", "This needs a signed-in shopper");
      const user = await prisma.user.findUnique({ where: { id: req.customer.id }, select: { id: true, name: true, email: true } });
      if (!user) throw new AppError(401, "SIGN_IN_NEEDED", "This needs a signed-in shopper");
      caller = { kind: "customer", id: user.id, name: user.name ?? "", email: user.email ?? "" };
      from = user.id;
    } else if (config.who === "key") {
      if (!req.apiKey) throw new AppError(401, "KEY_NEEDED", "This needs an API key");
      caller = { kind: "key", id: req.apiKey.id, name: req.apiKey.name };
      from = req.apiKey.id;
    } else {
      // Anyone: a signed-in shopper is still known as themselves.
      const user = req.customer ? await prisma.user.findUnique({ where: { id: req.customer.id }, select: { id: true, name: true, email: true } }) : null;
      caller = user ? { kind: "customer", id: user.id, name: user.name ?? "", email: user.email ?? "" } : { kind: "public" };
      from = ipOf(req);
    }
    const { count, resetAt } = await hit(`fn:${t.id}:${from}`, MINUTE);
    if (count > (config.perMinute ?? CALL_PER_MINUTE[config.who])) return tooMany(res, resetAt);
    const body = CallBody.parse(req.body ?? {});
    let out;
    try {
      out = await runFn(t.fnId, body.input, { trigger: "call", caller, needOn: true });
    } catch (e) {
      // Unpublished or switched off in the last seconds: the address isn't one any more.
      if (e instanceof AppError && (e.statusCode === 404 || e.statusCode === 409)) throw gone();
      throw e;
    }
    void prisma.fnTrigger.update({ where: { id: t.id }, data: { fired: { increment: 1 }, lastAt: new Date() } }).catch(() => undefined);
    if (!out.ok) return res.status(422).json({ ok: false, error: out.error });
    res.json({ ok: true, value: out.value ?? null });
  }),
);

export const fnHooks = Router();
fnHooks.post(
  "/:secret",
  asyncHandler(async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const t = await triggerAt("webhook", String(req.params.secret ?? ""));
    if (!t) throw gone();
    const { count, resetAt } = await hit(`hook:${t.id}`, MINUTE);
    if (count > TRIGGER_LIMITS.webhookPerMinute) return tooMany(res, resetAt);
    const body = req.body ?? {};
    if (JSON.stringify(body).length > TRIGGER_LIMITS.webhookBytes) throw new AppError(413, "TOO_LARGE", "The body is too large");
    await emitWebhook(t, body, req.query);
    res.status(202).json({ ok: true });
  }),
);
