import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { readyOfKind } from "../../lib/fnReady.js";
import { BRANCH_RULE, NEON_REGIONS, PRESS_KINDS, PRESS_LIMITS, REPO_RULE, copyPlan, nameProblem, tidyName, type CopyInput, type PressKind } from "../../lib/press.js";
import { checkCopy, type Via } from "../../lib/pressCheck.js";

/**
 * /v1/admin/system/copies — نسخ الزباين: a client's copy of this store, made in the owner's own
 * accounts (Neon, Railway, Vercel, Cloudflare) through their ready connections (lib/press.ts).
 * A copy is a whole new store with its own database, server and sites, paid for monthly: only the
 * store's owner may plan one.
 *
 * GET  /   — the connections of each kind to pick from (never a key), this store's own repository
 *            and branch (what a copy is built from), Neon's regions, the limits
 * POST /plan { label, server, site, repo?, branch?, region?, via? } — what making it will do, each
 *            service asked whether what it needs is there (only read: nothing is made)
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

const PlanBody = z
  .object({
    label: z.string().trim().min(1).max(PRESS_LIMITS.label),
    server: z.string().max(80),
    site: z.string().max(80),
    repo: z.string().trim().max(160).optional(),
    branch: z.string().trim().max(100).optional(),
    region: z.enum(NEON_REGIONS).optional(),
    via: z.object(Object.fromEntries(PRESS_KINDS.map((k) => [k, z.string().max(40).optional()])) as Record<PressKind, z.ZodOptional<z.ZodString>>).strict().optional(),
  })
  .strict();

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

r.post(
  "/plan",
  asyncHandler(async (req, res) => {
    const body = PlanBody.parse(req.body ?? {});
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
    const input: CopyInput = { label: body.label, server, site, repo, branch, region: body.region ?? "aws-eu-central-1" };
    // The picked connection of each kind, or the only one there is.
    const all = await connections();
    const via: Via = {};
    for (const k of PRESS_KINDS) {
      const picked = body.via?.[k];
      if (picked && !all[k].some((c) => c.id === picked)) throw new AppError(400, "CONNECTION_NOT_FOUND", "No such connection", { at: `via.${k}` });
      const only = all[k].length === 1 ? all[k][0].id : undefined;
      if (picked ?? only) via[k] = picked ?? only;
    }
    const plan = copyPlan(input);
    const checks = await checkCopy(input, via);
    res.setHeader("Cache-Control", "no-store");
    res.json({ input, via, urls: plan.urls, steps: plan.steps, checks, ready: checks.every((c) => c.ok) });
  }),
);

export default r;
