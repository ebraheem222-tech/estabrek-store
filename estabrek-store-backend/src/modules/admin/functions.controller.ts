import { Router, type Request } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import type { Field } from "../../lib/collectionTree.js";
import { OPS_BY_KIND } from "../../lib/dataQuery.js";
import { EMPTY_DEF, FN_LIMITS, FnDefSchema, defOf, problemsOf, sizeOf, type FnDef, type Known } from "../../lib/fnDef.js";
import { CMPS } from "../../lib/fnValues.js";
import { CALL_PER_MINUTE, CALL_SLUG, FN_EVENTS, HANDS, TRIGGER_KINDS, TRIGGER_LIMITS, configOf, forgetTriggers, newToken, nextRun, type ScheduleConfig, type TriggerKind } from "../../lib/fnTriggers.js";
import { hasPermission } from "../../middleware/access.js";
import { runFn } from "../functions/functions.service.js";

/**
 * /v1/admin/functions — الـ Functions (F1): logic the owner builds from steps (lib/fnDef.ts), tries,
 * and publishes. Looking needs functions:read; building, publishing and running functions:write
 * (admin.routes.ts). A function reads and writes the owner's tables and sends messages, so who
 * may write one may do all of that through it.
 *
 * GET    /admin/functions             — the list, and what a builder needs (tables, their fields, limits)
 * POST   /admin/functions             { name, note? } — a new, empty one
 * GET    /admin/functions/:id         — one, with its draft, what is published, and the draft's problems
 * PUT    /admin/functions/:id         { name?, note?, enabled?, draft? } — the draft is checked for its shape only
 * POST   /admin/functions/:id/publish — the draft becomes what runs (refused while it has problems)
 * POST   /admin/functions/:id/run     { input?, dry?, which? } — run it now; dry: nothing is written or sent
 * DELETE /admin/functions/:id         — refused while another function calls it
 *
 * What starts it (F3, lib/fnTriggers.ts):
 * POST   /admin/functions/:id/triggers        { kind, config, slug? } — a row event, a schedule, a store event, a call, a webhook
 * PUT    /admin/functions/:id/triggers/:tid   { config?, slug?, enabled? }
 * DELETE /admin/functions/:id/triggers/:tid
 */
const r = Router();

const Name = z.string().trim().min(1).max(80);
const Note = z.string().trim().max(300);
const CreateBody = z.object({ name: Name, note: Note.optional() }).strict();
const SaveBody = z.object({ name: Name.optional(), note: Note.nullable().optional(), enabled: z.boolean().optional(), draft: z.unknown().optional() }).strict();
const RunBody = z.object({ input: z.record(z.string().max(40), z.unknown()).default({}), dry: z.boolean().default(true), which: z.enum(["draft", "live"]).default("draft") }).strict();

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** What the steps may talk about: the tables with their fields, and the functions. */
async function known(self?: string): Promise<Known> {
  const [tables, fns] = await Promise.all([
    prisma.collection.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, slug: true, name: true, fields: true } }),
    prisma.fn.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, live: true } }),
  ]);
  return {
    self,
    tables: tables.map((t) => ({ id: t.id, slug: t.slug, name: t.name, fields: (Array.isArray(t.fields) ? t.fields : []) as Field[] })),
    fns: fns.map((f) => ({ id: f.id, name: f.name, live: !!f.live, inputs: defOf(f.live)?.inputs ?? [] })),
  };
}

type Row = { id: string; name: string; note: string | null; draft: unknown; live: unknown; publishedAt: Date | null; enabled: boolean; runs: number; lastRunAt: Date | null; createdAt: Date; updatedAt: Date };
const lite = (f: Row) => {
  const draft = defOf(f.draft);
  return {
    id: f.id,
    name: f.name,
    note: f.note,
    enabled: f.enabled,
    published: !!f.live,
    publishedAt: f.publishedAt,
    /** The draft isn't what runs. */
    changed: !same(f.draft, f.live),
    steps: draft ? sizeOf(draft.do).steps + sizeOf(draft.else).steps : 0,
    inputs: draft?.inputs.length ?? 0,
    /** What the published one is handed (for a function that calls it). */
    takes: defOf(f.live)?.inputs ?? [],
    runs: f.runs,
    lastRunAt: f.lastRunAt,
    updatedAt: f.updatedAt,
  };
};

async function fnOf(req: Request) {
  const fn = await prisma.fn.findUnique({ where: { id: String(req.params.id) } });
  if (!fn) throw new AppError(404, "FN_NOT_FOUND", "No such function");
  return fn;
}

type TriggerRow = { id: string; kind: string; config: unknown; slug: string | null; enabled: boolean; fired: number; lastAt: Date | null; nextAt: Date | null };
/** A trigger as the page shows it. A webhook's address is its permission: said only to who may change the function. */
const triggerView = (t: TriggerRow, write: boolean) => {
  const kind = t.kind as TriggerKind;
  return {
    id: t.id,
    kind,
    config: t.config,
    slug: kind === "call" ? t.slug : null,
    address: kind === "call" ? `/v1/fn/${t.slug}` : kind === "webhook" ? (write ? `/v1/hooks/${t.slug}` : null) : null,
    enabled: t.enabled,
    fired: t.fired,
    lastAt: t.lastAt,
    nextAt: kind === "schedule" ? t.nextAt : null,
    /** What it hands the function (the function takes the ones it has an input for). */
    hands: HANDS[kind] ?? [],
  };
};

async function full(fn: Row, req: Request) {
  const draft = defOf(fn.draft) ?? EMPTY_DEF;
  const triggers = await prisma.fnTrigger.findMany({ where: { fnId: fn.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const write = hasPermission(req, "functions:write");
  return { ...lite(fn), draft, live: defOf(fn.live), problems: problemsOf(draft, await known(fn.id)), triggers: triggers.map((t) => triggerView(t, write)) };
}

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [fns, k] = await Promise.all([prisma.fn.findMany({ orderBy: { createdAt: "asc" } }), known()]);
    res.json({
      functions: fns.map(lite),
      // What a builder offers: each table's fields by their names, and what a field's kind can be asked.
      tables: k.tables.map((t) => ({ id: t.id, slug: t.slug, name: t.name ?? null, fields: t.fields.map((f) => ({ id: f.id, type: f.type, name: f.name ?? null, required: !!f.required, ...(f.options ? { options: f.options.map((o) => ({ id: o.id, name: o.name ?? null })) } : {}) })) })),
      ops: OPS_BY_KIND,
      cmps: CMPS,
      limits: FN_LIMITS,
      // What can start a function: the kinds, the store's events, and how many calls a minute when a trigger doesn't say.
      triggers: { kinds: TRIGGER_KINDS, events: FN_EVENTS, callPerMinute: CALL_PER_MINUTE, limits: TRIGGER_LIMITS },
    });
  }),
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = CreateBody.parse(req.body ?? {});
    const fn = await prisma.fn.create({ data: { name: body.name, note: body.note || null, draft: EMPTY_DEF as unknown as Prisma.InputJsonValue, createdById: req.access?.email ?? null } });
    res.status(201).json(await full(fn, req));
  }),
);

r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await full(await fnOf(req), req));
  }),
);

r.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const fn = await fnOf(req);
    const body = SaveBody.parse(req.body ?? {});
    let draft: FnDef | undefined;
    if (body.draft !== undefined) {
      const parsed = FnDefSchema.safeParse(body.draft);
      // Where it is wrong, as the builder names its steps ("do.2.values").
      if (!parsed.success) throw new AppError(400, "FN_INVALID", "The steps can't be saved like this", { issues: parsed.error.issues.slice(0, 10).map((i) => ({ at: i.path.map(String).join("."), message: i.message })) });
      draft = parsed.data;
    }
    const saved = await prisma.fn.update({
      where: { id: fn.id },
      data: { ...(body.name !== undefined ? { name: body.name } : {}), ...(body.note !== undefined ? { note: body.note || null } : {}), ...(body.enabled !== undefined ? { enabled: body.enabled } : {}), ...(draft ? { draft: draft as unknown as Prisma.InputJsonValue } : {}) },
    });
    // Switched on or off: its triggers follow at once.
    if (body.enabled !== undefined) forgetTriggers();
    res.json(await full(saved, req));
  }),
);

r.post(
  "/:id/publish",
  asyncHandler(async (req, res) => {
    const fn = await fnOf(req);
    const draft = defOf(fn.draft);
    if (!draft) throw new AppError(409, "FN_INVALID", "The draft can't be read");
    if (!draft.do.length && !draft.else?.length) throw new AppError(409, "FN_EMPTY", "A function with no steps has nothing to publish");
    const problems = problemsOf(draft, await known(fn.id));
    if (problems.length) throw new AppError(409, "FN_HAS_PROBLEMS", "Fix what the steps point at first", { problems });
    const saved = await prisma.fn.update({ where: { id: fn.id }, data: { live: draft as unknown as Prisma.InputJsonValue, publishedAt: new Date() } });
    forgetTriggers();
    res.json(await full(saved, req));
  }),
);

r.post(
  "/:id/run",
  asyncHandler(async (req, res) => {
    const fn = await fnOf(req);
    const body = RunBody.parse(req.body ?? {});
    // A real run of the draft would do things nobody published: the draft is tried dry only.
    if (!body.dry && body.which === "draft") throw new AppError(400, "FN_DRAFT_IS_DRY", "The draft runs dry only; publish it to run it for real");
    const out = await runFn(fn.id, body.input, { dry: body.dry, which: body.which, trigger: "admin", caller: { kind: "admin", id: req.access?.adminId, email: req.access?.email ?? undefined } });
    // What it gave back may be a table's worth of rows: the page shows the beginning.
    const value = JSON.stringify(out.value ?? null);
    res.json({ ...out, value: value.length > 100_000 ? null : out.value, ...(value.length > 100_000 ? { valueCut: true } : {}) });
  }),
);

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const fn = await fnOf(req);
    // Another function that calls it would break (in its draft or in what is published).
    const others = await prisma.fn.findMany({ where: { id: { not: fn.id } }, select: { name: true, draft: true, live: true } });
    const callers = others.filter((o) => [o.draft, o.live].some((d) => JSON.stringify(d ?? null).includes(`"fn":"${fn.id}"`))).map((o) => o.name);
    if (callers.length) throw new AppError(409, "FN_USED", "Another function calls this one", { callers });
    await prisma.fn.delete({ where: { id: fn.id } });
    forgetTriggers();
    res.json({ ok: true });
  }),
);

/* ---------------- What starts it ---------------- */

const TriggerBody = z.object({ kind: z.enum(TRIGGER_KINDS), config: z.unknown().optional(), slug: z.string().trim().toLowerCase().max(60).optional() }).strict();
const TriggerPatch = z.object({ config: z.unknown().optional(), slug: z.string().trim().toLowerCase().max(60).optional(), enabled: z.boolean().optional() }).strict();
const slugTaken = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** A trigger's settings checked for its kind, and against what is there (a row trigger's table). */
async function checked(kind: TriggerKind, raw: unknown) {
  const config = configOf(kind, raw);
  if (kind === "row" && !(await prisma.collection.findUnique({ where: { id: String(config.table) }, select: { id: true } }))) throw new AppError(400, "TRIGGER_INVALID", "This table isn't there", { at: "table" });
  return config;
}
function callSlug(slug: string | undefined) {
  if (!slug || !CALL_SLUG.test(slug)) throw new AppError(400, "TRIGGER_INVALID", "An address is small letters, digits and -", { at: "slug" });
  return slug;
}

r.post(
  "/:id/triggers",
  asyncHandler(async (req, res) => {
    const fn = await fnOf(req);
    const body = TriggerBody.parse(req.body ?? {});
    if ((await prisma.fnTrigger.count({ where: { fnId: fn.id } })) >= TRIGGER_LIMITS.perFunction) throw new AppError(400, "TOO_MANY_TRIGGERS", `A function has up to ${TRIGGER_LIMITS.perFunction} triggers`);
    const config = await checked(body.kind, body.config);
    try {
      await prisma.fnTrigger.create({
        data: {
          fnId: fn.id,
          kind: body.kind,
          config: config as Prisma.InputJsonValue,
          // A call's address is the owner's word; a webhook's is made here, long and random.
          slug: body.kind === "call" ? callSlug(body.slug) : body.kind === "webhook" ? newToken() : null,
          nextAt: body.kind === "schedule" ? nextRun(config as ScheduleConfig, new Date()) : null,
        },
      });
    } catch (e) {
      if (slugTaken(e)) throw new AppError(409, "SLUG_TAKEN", "This address is already used");
      throw e;
    }
    forgetTriggers();
    res.status(201).json(await full(fn, req));
  }),
);

r.put(
  "/:id/triggers/:tid",
  asyncHandler(async (req, res) => {
    const fn = await fnOf(req);
    const was = await prisma.fnTrigger.findFirst({ where: { id: String(req.params.tid), fnId: fn.id } });
    if (!was) throw new AppError(404, "TRIGGER_NOT_FOUND", "No such trigger");
    const body = TriggerPatch.parse(req.body ?? {});
    const kind = was.kind as TriggerKind;
    const config = body.config !== undefined ? await checked(kind, body.config) : undefined;
    // A schedule counts again from now when its time changes, or when it is switched back on.
    const again = kind === "schedule" && (config !== undefined || (body.enabled === true && !was.enabled));
    try {
      await prisma.fnTrigger.update({
        where: { id: was.id },
        data: {
          ...(config !== undefined ? { config: config as Prisma.InputJsonValue } : {}),
          ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
          ...(kind === "call" && body.slug !== undefined ? { slug: callSlug(body.slug) } : {}),
          ...(again ? { nextAt: nextRun((config ?? was.config) as ScheduleConfig, new Date()) } : {}),
        },
      });
    } catch (e) {
      if (slugTaken(e)) throw new AppError(409, "SLUG_TAKEN", "This address is already used");
      throw e;
    }
    forgetTriggers();
    res.json(await full(fn, req));
  }),
);

r.delete(
  "/:id/triggers/:tid",
  asyncHandler(async (req, res) => {
    const fn = await fnOf(req);
    const gone = await prisma.fnTrigger.deleteMany({ where: { id: String(req.params.tid), fnId: fn.id } });
    if (!gone.count) throw new AppError(404, "TRIGGER_NOT_FOUND", "No such trigger");
    forgetTriggers();
    res.json(await full(fn, req));
  }),
);

export default r;
