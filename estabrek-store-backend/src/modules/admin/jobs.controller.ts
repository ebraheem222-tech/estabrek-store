import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { readPerformance, savePerformance } from "../../lib/performanceSettings.js";
import { jobDef, jobNames, jobsSnapshot, runJobNow, type JobsConfig } from "../../lib/jobs.js";

/**
 * /v1/admin/system/jobs — المهام بالخلفية: every job the server runs on its own,
 * how its runs went, pause / resume, its timer, and "run now". Reading needs
 * system:read, changes system:write (admin.routes.ts). Pauses and timers go in
 * the same history as السرعة والكاش.
 */
const r = Router();

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const { row } = await readPerformance().catch(() => ({ row: null }));
    res.json({ ...jobsSnapshot(), updatedAt: row?.updatedAt ?? null });
  }),
);

const PatchBody = z
  .object({
    /** { stockAlerts: { paused: true }, backup: { everyMs: 300000 } }; everyMs null = the server's default. */
    jobs: z.record(z.string(), z.object({ paused: z.boolean().optional(), everyMs: z.number().int().nullable().optional() }).strict()),
  })
  .strict();

r.patch(
  "/",
  asyncHandler(async (req, res) => {
    const body = PatchBody.parse(req.body ?? {});
    // Unknown jobs and timers out of range are refused before anything is read or saved.
    const bad: string[] = [];
    for (const [name, change] of Object.entries(body.jobs)) {
      const def = jobDef(name);
      if (!def) {
        bad.push(name);
        continue;
      }
      if (change.paused && def.canPause === false) bad.push(`${name}.paused`);
      const every = change.everyMs;
      if (every != null && every !== def.everyMs && (def.everyMs == null || !def.limits || every < def.limits.min || every > def.limits.max)) bad.push(`${name}.everyMs`);
    }
    if (bad.length) throw new AppError(400, "BAD_JOB_SETTINGS", "Unknown job or value out of range", { fields: bad });
    const { jobs: saved } = await readPerformance();
    const next: JobsConfig = { ...saved };
    for (const [name, change] of Object.entries(body.jobs)) {
      const def = jobDef(name)!;
      const cur = { ...(next[name] ?? {}) };
      if (change.paused !== undefined) cur.paused = change.paused;
      if (change.everyMs !== undefined) {
        if (change.everyMs === null || change.everyMs === def.everyMs) delete cur.everyMs;
        else cur.everyMs = change.everyMs;
      }
      // Only what differs from the server's defaults is kept.
      if (!cur.paused) delete cur.paused;
      if (Object.keys(cur).length) next[name] = cur;
      else delete next[name];
    }
    const out = await savePerformance(req, { jobs: next });
    res.json({ ...jobsSnapshot(), changed: out.changed });
  }),
);

r.post(
  "/:name/run",
  asyncHandler(async (req, res) => {
    const name = String(req.params.name);
    if (!jobNames().includes(name)) throw new AppError(404, "JOB_NOT_FOUND");
    if (jobDef(name)?.canRunNow === false) throw new AppError(400, "JOB_CANNOT_RUN_NOW");
    const answer = await runJobNow(name);
    res.json({ ...jobsSnapshot(), ...answer });
  }),
);

export default r;
