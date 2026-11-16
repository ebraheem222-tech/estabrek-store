/**
 * A function's own doors (F3; lib/fnTriggers.ts):
 *
 * POST /v1/fn/:address     { input } — a call. The function runs at once and its answer comes
 *                          back: { ok: true, value }, or 422 { ok: false, error } when it stopped.
 *                          Who may call is the trigger's choice: a signed-in shopper (their token
 *                          in `Authorization: Bearer …`), an API key (`X-Api-Key`), or anyone.
 *                          The function knows who called as {{caller}} (set here, never by the caller).
 *                          The answer says the run's line in the owner's run log (`X-Run-Id`).
 *                          A request sent with an `Idempotency-Key` header isn't run twice: the
 *                          same key again is answered with the first answer (`Idempotent-Replayed: true`).
 * POST /v1/hooks/:secret   any JSON — a webhook from another system. Taken in (202) and run
 *                          through the queue; the function is handed { body, query }. A delivery
 *                          sent again with the same `Idempotency-Key` is taken in and not run again.
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
import { CALL_KEY, askedPrint, dropKey, holdKey, keepAnswer } from "../../lib/fnCallKeys.js";
import { apiCaller, ipOf } from "../../middleware/apiCaller.js";
import { runFn, type FnCaller } from "./functions.service.js";

const MINUTE = 60_000;
const CallBody = z.object({ input: z.record(z.string().max(40), z.unknown()).default({}) }).strict();
const gone = () => new AppError(404, "NOT_FOUND", "No such address");
/** The request's own name for itself, when it gave one (a key that isn't one is said, not ignored: the caller counts on it). */
function requestKey(req: Request): string | null {
  const raw = req.get("idempotency-key");
  if (raw === undefined || raw === "") return null;
  if (!CALL_KEY.pattern.test(raw)) throw new AppError(400, "IDEMPOTENCY_KEY_INVALID", "An Idempotency-Key is up to 100 letters, digits and . _ : -");
  return raw;
}
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
    // A request that names itself isn't run twice (lib/fnCallKeys.ts).
    const key = requestKey(req);
    let held: string | null = null;
    if (key) {
      const who = caller.kind === "customer" ? `customer:${caller.id}` : caller.kind === "key" ? `key:${caller.id}` : `ip:${ipOf(req)}`;
      const first = await holdKey(t.id, who, key, askedPrint(body.input));
      if (first.state === "other") throw new AppError(409, "IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key named another request: a new request needs a new key");
      if (first.state === "running") {
        if (!first.stuck) res.setHeader("Retry-After", "2");
        throw new AppError(409, first.stuck ? "FIRST_CALL_UNFINISHED" : "IN_PROGRESS", first.stuck ? "The first call with this key never finished; look at the run log before asking again with a new key" : "The first call with this key is still running");
      }
      if (first.state === "done") {
        res.setHeader("Idempotent-Replayed", "true");
        if (first.runId) res.setHeader("X-Run-Id", first.runId);
        return res.status(first.status).json(first.answer);
      }
      held = first.id;
    }
    let out;
    try {
      out = await runFn(t.fnId, body.input, { trigger: "call", caller, needOn: true });
    } catch (e) {
      // It never ran: the key is free for the next try.
      if (held) await dropKey(held);
      // Unpublished or switched off in the last seconds: the address isn't one any more.
      if (e instanceof AppError && (e.statusCode === 404 || e.statusCode === 409)) throw gone();
      throw e;
    }
    void prisma.fnTrigger.update({ where: { id: t.id }, data: { fired: { increment: 1 }, lastAt: new Date() } }).catch(() => undefined);
    // The run's line in the owner's run log: what a caller quotes when asking what happened.
    if (out.runId) res.setHeader("X-Run-Id", out.runId);
    const status = out.ok ? 200 : 422;
    const answer = out.ok ? { ok: true, value: out.value ?? null } : { ok: false, error: out.error };
    if (held) await keepAnswer(held, status, answer, out.runId ?? null);
    res.status(status).json(answer);
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
    // A delivery the sender names (its retry carries the same name) is taken in once.
    await emitWebhook(t, body, req.query, requestKey(req) ?? undefined);
    res.status(202).json({ ok: true });
  }),
);
