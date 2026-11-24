import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { prisma } from "../../lib/prisma.js";
import { readyOfKind } from "../../lib/fnReady.js";
import { BRANCH_RULE, NEON_REGIONS, PRESS_KINDS, PRESS_LIMITS, REPO_RULE, START_SITE_RULE, copyPlan, nameProblem, tidyName, type CopyInput, type PressKind } from "../../lib/press.js";
import { checkCopy, type Via } from "../../lib/pressCheck.js";
import { aliveOf, copyView, isMaking, startCopy, tryCopyAgain } from "../../lib/pressMake.js";
import { askingAdmin, listAsks } from "../../lib/siteAsk.js";

/**
 * /v1/admin/system/copies — نسخ الزباين: a client's copy of this store, made in the owner's own
 * accounts (Neon, Railway, Vercel, Cloudflare) through their ready connections (lib/press.ts).
 * A copy is a whole new store with its own database, server and sites, paid for monthly: only the
 * store's owner may plan one.
 *
 * GET  /   — the connections of each kind to pick from (never a key), this store's own repository
 *            and branch (what a copy is built from), Neon's regions, the limits
 * POST /plan { label, server, site, repo?, branch?, region?, startSite?, via? } — what making it will do, each
 *            service asked whether what it needs is there (only read: nothing is made)
 * POST /make { …the same, owner: { name, email, password }, agree: true } — asked again, and when
 *            every service said yes, made (lib/pressMake.ts; 202: it goes on by itself, the page
 *            follows it), the new store's owner account with it
 * GET  /made            — the copies made or being made, newest first
 * GET  /made/:id        — one, with its owner's setup link once it is made
 * POST /made/:id/again  — a copy that stopped, made again from the step that said no
 * GET  /made/:id/alive  — whether its server, shop and admin answer yet, and whether its owner is in
 * GET  /asks            — admins the owner put up by hand on their Pages, asking for the rest (lib/siteAsk.ts)
 * POST /asks/:id/make { label, server, site, …, agree: true } — said yes to (after matching its pair with the
 *            client): checked, then made like any copy, adopting that Pages project; its owner's account is
 *            made by the client with the setup code their admin is told
 * POST /asks/:id/refuse — said no to (the client may ask again)
 */
const r = Router();

r.use((req, _res, next) => {
  if (!req.access?.owner) return next(new AppError(403, "OWNER_ONLY", "Only the store's owner makes a copy of the store"));
  next();
});

/** The repository this server was built from, as Railway says it (a copy is built from the same). */
function ownRepo(): { repo: string; branch: string } | null {
  const owner = process.env.RAILWAY_GIT_REPO_OWNER?.trim();
  const name = process.env.RAILWAY_GIT_REPO_NAME?.trim();
  const branch = process.env.RAILWAY_GIT_BRANCH?.trim() || "main";
  const repo = owner && name ? `${owner}/${name}` : "";
  return REPO_RULE.test(repo) && BRANCH_RULE.test(branch) ? { repo, branch } : null;
}

const Fields = {
  // Nothing a call fills in ({{…}}): the name goes to each service as it is.
  label: z.string().trim().min(1).max(PRESS_LIMITS.label).regex(/^[^{}]*$/, "A name has no { or }"),
  server: z.string().max(80),
  site: z.string().max(80),
  repo: z.string().trim().max(160).optional(),
  branch: z.string().trim().max(100).optional(),
  region: z.enum(NEON_REGIONS).optional(),
  // The whole site its first setup opens on (the admin's key for it); none: it asks, an online store picked.
  startSite: z.string().trim().max(60).regex(START_SITE_RULE, "A site's key, like site-restaurant").nullable().optional(),
  via: z.object(Object.fromEntries(PRESS_KINDS.map((k) => [k, z.string().max(40).optional()])) as Record<PressKind, z.ZodOptional<z.ZodString>>).strict().optional(),
};
const PlanBody = z.object(Fields).strict();
// Making one costs money every month: said yes to in so many words.
const MakeBody = z
  .object({
    ...Fields,
    // The new store's owner: made on its server once it answers (as its own first setup would: a password as long as an owner's must be).
    owner: z
      .object({
        name: z.string().trim().min(1).max(80),
        email: z.string().trim().toLowerCase().email().max(254),
        password: z.string().min(10).max(200),
      })
      .strict(),
    agree: z.literal(true),
  })
  .strict();

// An ask said yes to: the same names as a copy, and no owner (the client makes their own account).
const AskMakeBody = z.object({ ...Fields, agree: z.literal(true) }).strict();

async function connections() {
  const out = {} as Record<PressKind, Array<{ id: string; name: string }>>;
  for (const k of PRESS_KINDS) out[k] = (await readyOfKind(k)).map((c) => ({ id: c.id, name: c.name }));
  return out;
}

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ connections: await connections(), repo: ownRepo(), regions: NEON_REGIONS, limits: { label: PRESS_LIMITS.label, name: PRESS_LIMITS.name } });
  }),
);

/** A copy as asked for, read: its names made one and checked, its repository, the connection of each kind. */
async function readAsk(body: z.infer<typeof PlanBody>): Promise<{ input: CopyInput; via: Via }> {
  const server = tidyName(body.server);
  const site = tidyName(body.site);
  for (const [at, name] of [["server", server], ["site", site]] as const) {
    const problem = nameProblem(name);
    if (problem) throw new AppError(400, "NAME_INVALID", problem, { at, name });
  }
  const own = ownRepo();
  const repo = body.repo || own?.repo || "";
  const branch = body.branch || own?.branch || "main";
  if (!REPO_RULE.test(repo)) throw new AppError(400, "REPO_INVALID", "The repository is owner/name, as GitHub shows it", { at: "repo" });
  if (!BRANCH_RULE.test(branch)) throw new AppError(400, "BRANCH_INVALID", "The branch is a name like main", { at: "branch" });
  const input: CopyInput = { label: body.label, server, site, repo, branch, region: body.region ?? "aws-eu-central-1", startSite: body.startSite || null };
  // The picked connection of each kind, or the only one there is.
  const all = await connections();
  const via: Via = {};
  for (const k of PRESS_KINDS) {
    const picked = body.via?.[k];
    if (picked && !all[k].some((c) => c.id === picked)) throw new AppError(400, "CONNECTION_NOT_FOUND", "No such connection", { at: `via.${k}` });
    const only = all[k].length === 1 ? all[k][0].id : undefined;
    if (picked ?? only) via[k] = picked ?? only;
  }
  return { input, via };
}

r.post(
  "/plan",
  asyncHandler(async (req, res) => {
    const { input, via } = await readAsk(PlanBody.parse(req.body ?? {}));
    const plan = copyPlan(input);
    const checks = await checkCopy(input, via);
    res.setHeader("Cache-Control", "no-store");
    res.json({ input, via, urls: plan.urls, steps: plan.steps, checks, ready: checks.every((c) => c.ok) });
  }),
);

r.post(
  "/make",
  asyncHandler(async (req, res) => {
    const { agree: _agree, owner, ...ask } = MakeBody.parse(req.body ?? {});
    const { input, via } = await readAsk(ask);
    // A name is one copy's: the copy that has it is tried again, not begun twice.
    const had = await prisma.clientCopy.findFirst({ where: { OR: [{ server: input.server }, { site: input.site }] }, select: { id: true } });
    if (had) throw new AppError(409, "COPY_EXISTS", "A copy with this name is already made or being made", { id: had.id });
    // Asked again now: what was free when it was planned may not be.
    const checks = await checkCopy(input, via);
    if (!checks.every((c) => c.ok)) throw new AppError(409, "COPY_NOT_READY", "Not every service said yes", { checks });
    let row;
    try {
      row = await startCopy(input, via, req.user?.email ?? null, owner);
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") throw new AppError(409, "COPY_EXISTS", "A copy with this name is already made or being made");
      throw e;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(202).json(await copyView(row));
  }),
);

r.get(
  "/made",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.clientCopy.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    res.setHeader("Cache-Control", "no-store");
    res.json({ copies: await Promise.all(rows.map((row) => copyView(row))) });
  }),
);

async function oneCopy(id: string) {
  const row = await prisma.clientCopy.findUnique({ where: { id } });
  if (!row) throw new AppError(404, "COPY_NOT_FOUND", "No such copy");
  return row;
}

r.get(
  "/made/:id",
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await copyView(await oneCopy(String(req.params.id)), true));
  }),
);

r.post(
  "/made/:id/again",
  asyncHandler(async (req, res) => {
    const row = await oneCopy(String(req.params.id));
    if (row.state === "made") throw new AppError(409, "COPY_MADE", "This copy is made");
    if (isMaking(row.id) || !(await tryCopyAgain(row.id))) throw new AppError(409, "COPY_MAKING", "This copy is being made now");
    res.setHeader("Cache-Control", "no-store");
    res.status(202).json(await copyView(await oneCopy(row.id), true));
  }),
);

r.get(
  "/asks",
  asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ asks: await listAsks() });
  }),
);

async function oneAsk(id: string) {
  const ask = await prisma.siteAsk.findUnique({ where: { id } });
  if (!ask) throw new AppError(404, "ASK_NOT_FOUND", "No such site asked");
  if (ask.state !== "waiting") throw new AppError(409, "ASK_NOT_WAITING", "This site isn't waiting any more");
  return ask;
}

r.post(
  "/asks/:id/make",
  asyncHandler(async (req, res) => {
    const ask = await oneAsk(String(req.params.id));
    const { agree: _agree, ...body } = AskMakeBody.parse(req.body ?? {});
    const { input, via } = await readAsk(body);
    const adopt = askingAdmin(ask.admin);
    if (!adopt) throw new AppError(409, "ASK_ADMIN", "This site's address can't be adopted");
    const had = await prisma.clientCopy.findFirst({ where: { OR: [{ server: input.server }, { site: input.site }] }, select: { id: true } });
    if (had) throw new AppError(409, "COPY_EXISTS", "A copy with this name is already made or being made", { id: had.id });
    const checks = await checkCopy(input, via, adopt);
    if (!checks.every((c) => c.ok)) throw new AppError(409, "COPY_NOT_READY", "Not every service said yes", { checks });
    // Taken only while it waits: a second press, or the client asking again from another browser meanwhile, finds it taken.
    const took = await prisma.siteAsk.updateMany({ where: { id: ask.id, state: "waiting", keyHash: ask.keyHash }, data: { state: "making" } });
    if (!took.count) throw new AppError(409, "ASK_NOT_WAITING", "This site isn't waiting any more");
    let row;
    try {
      row = await startCopy(input, via, req.user?.email ?? null, null, adopt);
    } catch (e) {
      await prisma.siteAsk.update({ where: { id: ask.id }, data: { state: "waiting" } });
      if ((e as { code?: string })?.code === "P2002") throw new AppError(409, "COPY_EXISTS", "A copy with this name is already made or being made");
      throw e;
    }
    await prisma.siteAsk.update({ where: { id: ask.id }, data: { copyId: row.id } });
    res.setHeader("Cache-Control", "no-store");
    res.status(202).json(await copyView(row));
  }),
);

r.post(
  "/asks/:id/refuse",
  asyncHandler(async (req, res) => {
    const ask = await oneAsk(String(req.params.id));
    await prisma.siteAsk.update({ where: { id: ask.id }, data: { state: "refused" } });
    res.setHeader("Cache-Control", "no-store");
    res.json({ asks: await listAsks() });
  }),
);

r.get(
  "/made/:id/alive",
  asyncHandler(async (req, res) => {
    const view = await copyView(await oneCopy(String(req.params.id)));
    if (view.state !== "made") throw new AppError(409, "COPY_NOT_MADE", "This copy isn't made yet");
    res.setHeader("Cache-Control", "no-store");
    res.json(await aliveOf(view.addresses));
  }),
);

export default r;
