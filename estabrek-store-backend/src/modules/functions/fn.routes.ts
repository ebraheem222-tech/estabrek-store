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
 * <METHOD> /v1/api/<path>  an address of the owner's own (fnRoutes, below): the function's
 *                          answer as it is; its inputs checked by their rules before it runs.
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
import { CALL_PER_MINUTE, TRIGGER_LIMITS, emitWebhook, routeAt, triggerAt, type CallConfig, type CallWho, type RouteConfig } from "../../lib/fnTriggers.js";
import { defOf } from "../../lib/fnDef.js";
import { readInputs } from "../../lib/fnInputs.js";
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

/** Who is calling, as the trigger asks for it (`who`), and what their calls a minute are counted by. */
async function callerFor(req: Request, who: CallWho): Promise<{ caller: FnCaller; from: string }> {
  if (who === "customer") {
    if (!req.customer) throw new AppError(401, "SIGN_IN_NEEDED", "This needs a signed-in shopper");
    const user = await prisma.user.findUnique({ where: { id: req.customer.id }, select: { id: true, name: true, email: true } });
    if (!user) throw new AppError(401, "SIGN_IN_NEEDED", "This needs a signed-in shopper");
    return { caller: { kind: "customer", id: user.id, name: user.name ?? "", email: user.email ?? "" }, from: user.id };
  }
  if (who === "key") {
    if (!req.apiKey) throw new AppError(401, "KEY_NEEDED", "This needs an API key");
    return { caller: { kind: "key", id: req.apiKey.id, name: req.apiKey.name }, from: req.apiKey.id };
  }
  // Anyone: a signed-in shopper is still known as themselves.
  const user = req.customer ? await prisma.user.findUnique({ where: { id: req.customer.id }, select: { id: true, name: true, email: true } }) : null;
  return { caller: user ? { kind: "customer", id: user.id, name: user.name ?? "", email: user.email ?? "" } : { kind: "public" }, from: ipOf(req) };
}

type Answer = { status: number; body: unknown; runId?: string };
const send = (res: Response, status: number, body: unknown) => (status === 204 ? res.status(204).end() : res.status(status).json(body ?? null));

/**
 * The run behind a request, once: a request that names itself (Idempotency-Key) isn't run twice
 * (lib/fnCallKeys.ts), the same key again is answered with the first answer. The answer carries
 * the run's line in the owner's run log (X-Run-Id): what a caller quotes when asking what happened.
 */
async function once(req: Request, res: Response, triggerId: string, caller: FnCaller, asked: unknown, run: () => Promise<Answer>): Promise<void> {
  const key = requestKey(req);
  let held: string | null = null;
  if (key) {
    const who = caller.kind === "customer" ? `customer:${caller.id}` : caller.kind === "key" ? `key:${caller.id}` : `ip:${ipOf(req)}`;
    const first = await holdKey(triggerId, who, key, askedPrint(asked));
    if (first.state === "other") throw new AppError(409, "IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key named another request: a new request needs a new key");
    if (first.state === "running") {
      if (!first.stuck) res.setHeader("Retry-After", "2");
      throw new AppError(409, first.stuck ? "FIRST_CALL_UNFINISHED" : "IN_PROGRESS", first.stuck ? "The first call with this key never finished; look at the run log before asking again with a new key" : "The first call with this key is still running");
    }
    if (first.state === "done") {
      res.setHeader("Idempotent-Replayed", "true");
      if (first.runId) res.setHeader("X-Run-Id", first.runId);
      send(res, first.status, first.answer);
      return;
    }
    held = first.id;
  }
  let out: Answer;
  try {
    out = await run();
  } catch (e) {
    // It never ran: the key is free for the next try.
    if (held) await dropKey(held);
    // Unpublished or switched off in the last seconds: the address isn't one any more.
    if (e instanceof AppError && (e.statusCode === 404 || e.statusCode === 409)) throw gone();
    throw e;
  }
  void prisma.fnTrigger.update({ where: { id: triggerId }, data: { fired: { increment: 1 }, lastAt: new Date() } }).catch(() => undefined);
  if (out.runId) res.setHeader("X-Run-Id", out.runId);
  if (held) await keepAnswer(held, out.status, out.body, out.runId ?? null);
  send(res, out.status, out.body);
}

export const fnCalls = Router();
fnCalls.use(apiCaller);
fnCalls.post(
  "/:address",
  asyncHandler(async (req: Request, res: Response) => {
    const t = await triggerAt("call", String(req.params.address ?? "").toLowerCase());
    if (!t) throw gone();
    const config = t.config as CallConfig;
    const { caller, from } = await callerFor(req, config.who);
    const { count, resetAt } = await hit(`fn:${t.id}:${from}`, MINUTE);
    if (count > (config.perMinute ?? CALL_PER_MINUTE[config.who])) return tooMany(res, resetAt);
    const body = CallBody.parse(req.body ?? {});
    await once(req, res, t.id, caller, body.input, async () => {
      const out = await runFn(t.fnId, body.input, { trigger: "call", caller, needOn: true });
      return { status: out.ok ? 200 : 422, body: out.ok ? { ok: true, value: out.value ?? null } : { ok: false, error: out.error }, runId: out.runId };
    });
  }),
);

/**
 * GET|POST|PUT|PATCH|DELETE /v1/api/<the owner's path> — an address of the owner's own (lib/fnTriggers.ts
 * "route"). What the function is handed, by its inputs' names: the query's fields, then the body's
 * (a JSON object), then the path's :names (each wins over the ones before it). They are checked by
 * the inputs' rules before it runs: 400 INPUT_INVALID with every problem. Its answer is what it gives
 * back, as it is (with the address's own status: 200, 201, 202, or 204 and nothing); a run that
 * stopped answers 422 { error: "FAILED", message }. A path the address has with another method: 405.
 */
export const fnRoutes = Router();
fnRoutes.use(apiCaller);
fnRoutes.use(
  asyncHandler(async (req: Request, res: Response) => {
    const { match, allowed } = await routeAt(req.method, req.path);
    if (!match) {
      if (allowed.length) {
        res.setHeader("Allow", allowed.join(", "));
        throw new AppError(405, "METHOD_NOT_ALLOWED", `This address takes ${allowed.join(", ")}`);
      }
      throw gone();
    }
    const t = match.trigger;
    const config = t.config as RouteConfig;
    const { caller, from } = await callerFor(req, config.who);
    const { count, resetAt } = await hit(`fn:${t.id}:${from}`, MINUTE);
    if (count > (config.perMinute ?? CALL_PER_MINUTE[config.who])) return tooMany(res, resetAt);
    const raw = req.body;
    const hasBody = raw !== undefined && raw !== null && !(typeof raw === "object" && !Array.isArray(raw) && !Object.keys(raw).length);
    if (hasBody && (typeof raw !== "object" || Array.isArray(raw))) throw new AppError(400, "BODY_INVALID", "The body is a JSON object: { \"name\": value, … }");
    const input: Record<string, unknown> = { ...queryOf(req), ...(hasBody ? (raw as Record<string, unknown>) : {}), ...match.params };
    // Checked before it runs: the caller is told every input that isn't right, and nothing is run.
    const fn = await prisma.fn.findUnique({ where: { id: t.fnId }, select: { live: true } });
    const def = defOf(fn?.live);
    if (!def) throw gone();
    const { problems } = readInputs(def.inputs, input);
    if (problems.length) throw new AppError(400, "INPUT_INVALID", problems[0].message, { problems });
    await once(req, res, t.id, caller, { method: req.method, path: req.path, input }, async () => {
      const out = await runFn(t.fnId, input, { trigger: `route.${config.method}`, caller, needOn: true });
      return out.ok ? { status: config.status ?? 200, body: out.value ?? null, runId: out.runId } : { status: 422, body: { error: "FAILED", message: out.error }, runId: out.runId };
    });
  }),
);

/** The query's fields: one value as itself, a name given more than once as a list. */
function queryOf(req: Request): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, v] of Object.entries(req.query ?? {})) {
    if (typeof v === "string") out[name] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === "string")) out[name] = v;
  }
  return out;
}

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
