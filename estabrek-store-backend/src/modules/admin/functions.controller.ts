import { Router, type Request } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import type { Field } from "../../lib/collectionTree.js";
import { OPS_BY_KIND } from "../../lib/dataQuery.js";
import { EMPTY_DEF, FN_LIMITS, FnDefSchema, defOf, problemsOf, sizeOf, type FnDef, type Known } from "../../lib/fnDef.js";
import { CODE_LIMITS, codeProblems } from "../../lib/fnCode.js";
import { TEST_LIMITS, TestsSchema, testsOf } from "../../lib/fnTests.js";
import { HTTP_LIMITS, connectionNames } from "../../lib/fnHttp.js";
import { readyNames } from "../../lib/fnReady.js";
import { kindsOut } from "../../lib/fnKinds.js";
import { VERSION_LIMITS, publishVersion, versionDef, versionsOf } from "../../lib/fnVersions.js";
import { CMPS } from "../../lib/fnValues.js";
import { CALL_PER_MINUTE, CALL_SLUG, FN_EVENTS, HANDS, ROUTE_BASE, ROUTE_LIMITS, ROUTE_METHODS, ROUTE_STATUS, TRIGGER_KINDS, TRIGGER_LIMITS, configOf, forgetTriggers, newToken, nextRun, routePath, routeSlug, type RouteConfig, type ScheduleConfig, type TriggerKind } from "../../lib/fnTriggers.js";
import { INPUT_FORMATS, INPUT_RULE_LIMITS } from "../../lib/fnInputs.js";
import { hasPermission } from "../../middleware/access.js";
import { runFn, runTests } from "../functions/functions.service.js";

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
 * POST   /admin/functions/:id/publish — the draft becomes what runs (refused while it has problems, or while one of its own tests doesn't pass)
 * POST   /admin/functions/:id/tests/run — its own tests (F4, lib/fnTests.ts) run against the draft, as try-outs: how each went
 * POST   /admin/functions/:id/run     { input?, dry?, which? } — run it now; dry: nothing is written or sent
 * DELETE /admin/functions/:id         — refused while another function calls it
 *
 * What starts it (F3, lib/fnTriggers.ts):
 * POST   /admin/functions/:id/triggers        { kind, config, slug? } — a row event, a schedule, a store event, a call, a webhook,
 *                                               an own address ({ method, path, who, perMinute?, status? }: 409 ROUTE_TAKEN when another has it)
 * PUT    /admin/functions/:id/triggers/:tid   { config?, slug?, enabled? }
 * DELETE /admin/functions/:id/triggers/:tid
 * GET    /admin/functions/:id/versions/:n         — a version's steps, as they were published
 * POST   /admin/functions/:id/versions/:n/restore { to: "live" | "draft" } — published again (a new version), or taken into the draft
 */
const r = Router();

const Name = z.string().trim().min(1).max(80);
const Note = z.string().trim().max(300);
const CreateBody = z.object({ name: Name, note: Note.optional() }).strict();
const SaveBody = z.object({ name: Name.optional(), note: Note.nullable().optional(), enabled: z.boolean().optional(), draft: z.unknown().optional(), tests: z.unknown().optional() }).strict();
const RunBody = z.object({ input: z.record(z.string().max(40), z.unknown()).default({}), dry: z.boolean().default(true), which: z.enum(["draft", "live"]).default("draft") }).strict();

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** What the steps may talk about: the tables with their fields, and the functions. */
async function known(self?: string): Promise<Known> {
  const [tables, fns, outside, ready] = await Promise.all([
    prisma.collection.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, slug: true, name: true, fields: true } }),
    prisma.fn.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, live: true } }),
    connectionNames(),
    readyNames(),
  ]);
  return {
    self,
    // What an "http" step may reach (admin → الاتصالات والأسرار): the sites, and the secrets by name.
    sites: outside.sites,
    secrets: outside.secrets.map((s) => s.name),
    secretSites: Object.fromEntries(outside.secrets.map((s) => [s.name, s.sites])),
    // The ready connections a "ready" step may pick.
    ready,
    tables: tables.map((t) => ({ id: t.id, slug: t.slug, name: t.name, fields: (Array.isArray(t.fields) ? t.fields : []) as Field[] })),
    fns: fns.map((f) => ({ id: f.id, name: f.name, live: !!f.live, inputs: defOf(f.live)?.inputs ?? [] })),
  };
}

type Row = { id: string; name: string; note: string | null; draft: unknown; live: unknown; version?: number | null; tests?: unknown; publishedAt: Date | null; enabled: boolean; runs: number; lastRunAt: Date | null; createdAt: Date; updatedAt: Date; triggers?: Array<{ kind: string; slug: string | null; config: unknown; enabled: boolean }> };
const lite = (f: Row) => {
  const draft = defOf(f.draft);
  return {
    id: f.id,
    name: f.name,
    note: f.note,
    enabled: f.enabled,
    published: !!f.live,
    /** Which version is published (every publish is kept as one: lib/fnVersions.ts). */
    version: f.live ? (f.version ?? null) : null,
    publishedAt: f.publishedAt,
    /** The draft isn't what runs. */
    changed: !same(f.draft, f.live),
    steps: draft ? sizeOf(draft.do).steps + sizeOf(draft.else).steps : 0,
    inputs: draft?.inputs.length ?? 0,
    /** What the published one is handed (for a function that calls it). */
    takes: defOf(f.live)?.inputs ?? [],
    /** What the published one promises to give back (lib/fnGives.ts), or null. */
    gives: defOf(f.live)?.gives ?? null,
    /** Its call addresses (a shop page's button runs it through one): who may call each. */
    calls: (f.triggers ?? []).filter((t) => t.kind === "call" && t.enabled && t.slug).map((t) => ({ address: t.slug as string, who: String((t.config as { who?: unknown } | null)?.who ?? "customer") })),
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
    address: kind === "call" ? `/v1/fn/${t.slug}` : kind === "webhook" ? (write ? `/v1/hooks/${t.slug}` : null) : kind === "route" ? `${ROUTE_BASE}/${String((t.config as { path?: unknown } | null)?.path ?? "")}` : null,
    enabled: t.enabled,
    fired: t.fired,
    lastAt: t.lastAt,
    nextAt: kind === "schedule" ? t.nextAt : null,
    /** What it hands the function (the function takes the ones it has an input for): an own address, its path's :names. */
    hands: kind === "route" ? routeParams(t.config) : (HANDS[kind] ?? []),
  };
};
/** An own address's :names (none when its path can't be read). */
function routeParams(config: unknown): string[] {
  try {
    return routePath((config as { path?: unknown } | null)?.path).params;
  } catch {
    return [];
  }
}

async function full(fn: Row, req: Request) {
  const draft = defOf(fn.draft) ?? EMPTY_DEF;
  const [triggers, part, versions] = await Promise.all([
    prisma.fnTrigger.findMany({ where: { fnId: fn.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.featureItem.findUnique({ where: { kind_refId: { kind: "function", refId: fn.id } }, select: { feature: { select: { id: true, name: true, enabled: true } } } }),
    versionsOf(fn.id),
  ]);
  const write = hasPermission(req, "functions:write");
  // The feature it is part of (admin → ميزاتي): one that is off keeps the function from being started.
  return { ...lite(fn), draft, live: defOf(fn.live), problems: [...problemsOf(draft, await known(fn.id)), ...(await codeProblems(draft))], triggers: triggers.map((t) => triggerView(t, write)), feature: part?.feature ?? null, tests: testsOf(fn.tests), versions, versionsKept: VERSION_LIMITS.kept };
}
/** The member trying, testing or running a function from the admin. */
const adminCaller = (req: Request) => ({ kind: "admin" as const, id: req.access?.adminId, email: req.access?.email ?? undefined });

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [fns, k] = await Promise.all([prisma.fn.findMany({ orderBy: { createdAt: "asc" }, include: { triggers: { select: { kind: true, slug: true, config: true, enabled: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] } } }), known()]);
    res.json({
      functions: fns.map(lite),
      // What a builder offers: each table's fields by their names, and what a field's kind can be asked.
      tables: k.tables.map((t) => ({ id: t.id, slug: t.slug, name: t.name ?? null, fields: t.fields.map((f) => ({ id: f.id, type: f.type, name: f.name ?? null, required: !!f.required, ...(f.options ? { options: f.options.map((o) => ({ id: o.id, name: o.name ?? null })) } : {}) })) })),
      ops: OPS_BY_KIND,
      cmps: CMPS,
      // The steps' limits, and the cage's that a code step runs in (lib/fnCode.ts).
      limits: { ...FN_LIMITS, cage: { ms: CODE_LIMITS.ms, memoryMb: CODE_LIMITS.memory / 1024 / 1024 }, tests: TEST_LIMITS.tests, http: { ms: HTTP_LIMITS.ms, calls: HTTP_LIMITS.calls } },
      // What an "http" step may reach: the allowed sites, and each secret's name with the sites it is for (never a value).
      // And the ready connections with what each kind can do (never a key, nor a setting's value).
      outside: { ...(await connectionNames()), ready: await readyNames(), kinds: kindsOut() },
      // What can start a function: the kinds, the store's events, and how many calls a minute when a trigger doesn't say.
      triggers: { kinds: TRIGGER_KINDS, events: FN_EVENTS, callPerMinute: CALL_PER_MINUTE, limits: TRIGGER_LIMITS, route: { base: ROUTE_BASE, methods: ROUTE_METHODS, status: ROUTE_STATUS, limits: ROUTE_LIMITS } },
      // What an input's rules may be (lib/fnInputs.ts).
      inputRules: { formats: INPUT_FORMATS, limits: INPUT_RULE_LIMITS },
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
    // Its own tests: kept beside it (a new test doesn't make a published function "changed").
    const tests = body.tests === undefined ? undefined : TestsSchema.safeParse(body.tests);
    if (tests && !tests.success) throw new AppError(400, "FN_TESTS_INVALID", "The tests can't be saved like this", { issues: tests.error.issues.slice(0, 10).map((i) => ({ at: i.path.map(String).join("."), message: i.message })) });
    const saved = await prisma.fn.update({
      where: { id: fn.id },
      data: { ...(body.name !== undefined ? { name: body.name } : {}), ...(body.note !== undefined ? { note: body.note || null } : {}), ...(body.enabled !== undefined ? { enabled: body.enabled } : {}), ...(draft ? { draft: draft as unknown as Prisma.InputJsonValue } : {}), ...(tests ? { tests: tests.data as unknown as Prisma.InputJsonValue } : {}) },
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
    // What the steps talk about is there, and every code step can be read.
    const problems = [...problemsOf(draft, await known(fn.id)), ...(await codeProblems(draft))];
    if (problems.length) throw new AppError(409, "FN_HAS_PROBLEMS", "Fix what the steps point at first", { problems });
    // Its own tests, run against what is about to go live: one that doesn't pass stops the publish.
    const tests = testsOf(fn.tests);
    if (tests.length) {
      const ran = await runTests(draft, tests, adminCaller(req));
      if (ran.failed) throw new AppError(409, "FN_TESTS_FAILED", "Its own tests don't pass", ran);
    }
    // Kept as a version of its own, which is what the function runs from now on.
    await publishVersion(fn.id, draft, req.access?.email ?? null);
    forgetTriggers();
    res.json(await full(await fnOf(req), req));
  }),
);

const versionOf = async (req: Request) => {
  const fn = await fnOf(req);
  const n = Number(req.params.n);
  const def = await versionDef(fn.id, n);
  if (!def) throw new AppError(404, "VERSION_NOT_FOUND", "No such version");
  return { fn, n, def };
};

r.get(
  "/:id/versions/:n",
  asyncHandler(async (req, res) => {
    const { n, def } = await versionOf(req);
    res.json({ n, def });
  }),
);

r.post(
  "/:id/versions/:n/restore",
  asyncHandler(async (req, res) => {
    const body = z.object({ to: z.enum(["live", "draft"]) }).strict().parse(req.body ?? {});
    const { fn, n, def } = await versionOf(req);
    if (body.to === "draft") {
      // Into the draft, to work on: what is published stays as it is.
      await prisma.fn.update({ where: { id: fn.id }, data: { draft: def as unknown as Prisma.InputJsonValue } });
      return res.json(await full(await fnOf(req), req));
    }
    // Published again as it was. What it talks about must still be there (a table, a connection or a function may have gone since).
    const problems = [...problemsOf(def, await known(fn.id)), ...(await codeProblems(def))];
    if (problems.length) throw new AppError(409, "FN_HAS_PROBLEMS", "This version points at things that aren't there any more", { problems });
    // Its steps ran as they are before: the function's tests of today aren't asked (they may be about newer steps).
    await publishVersion(fn.id, def, req.access?.email ?? null, n);
    forgetTriggers();
    res.json(await full(await fnOf(req), req));
  }),
);

r.post(
  "/:id/tests/run",
  asyncHandler(async (req, res) => {
    const fn = await fnOf(req);
    const draft = defOf(fn.draft);
    if (!draft) throw new AppError(409, "FN_INVALID", "The draft can't be read");
    res.json(await runTests(draft, testsOf(fn.tests), adminCaller(req)));
  }),
);

r.post(
  "/:id/run",
  asyncHandler(async (req, res) => {
    const fn = await fnOf(req);
    const body = RunBody.parse(req.body ?? {});
    // A real run of the draft would do things nobody published: the draft is tried dry only.
    if (!body.dry && body.which === "draft") throw new AppError(400, "FN_DRAFT_IS_DRY", "The draft runs dry only; publish it to run it for real");
    const out = await runFn(fn.id, body.input, { dry: body.dry, which: body.which, trigger: "admin", caller: adminCaller(req) });
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
/** An own address is one of a kind by its method and its path's shape (orders/:id and orders/:code are the same address). */
const ownSlug = (config: Record<string, unknown>) => routeSlug(String((config as RouteConfig).method), routePath((config as RouteConfig).path));
const ownTaken = () => new AppError(409, "ROUTE_TAKEN", "Another address has this method and path");

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
          // A call's address is the owner's word; a webhook's is made here, long and random; an own address's is its method and path.
          slug: body.kind === "call" ? callSlug(body.slug) : body.kind === "webhook" ? newToken() : body.kind === "route" ? ownSlug(config) : null,
          nextAt: body.kind === "schedule" ? nextRun(config as ScheduleConfig, new Date()) : null,
        },
      });
    } catch (e) {
      if (slugTaken(e)) throw body.kind === "route" ? ownTaken() : new AppError(409, "SLUG_TAKEN", "This address is already used");
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
          ...(kind === "route" && config !== undefined ? { slug: ownSlug(config) } : {}),
          ...(again ? { nextAt: nextRun((config ?? was.config) as ScheduleConfig, new Date()) } : {}),
        },
      });
    } catch (e) {
      if (slugTaken(e)) throw kind === "route" ? ownTaken() : new AppError(409, "SLUG_TAKEN", "This address is already used");
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
