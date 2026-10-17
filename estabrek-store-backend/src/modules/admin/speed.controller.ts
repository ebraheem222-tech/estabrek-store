import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { readPerformance, savePerformance } from "../../lib/performanceSettings.js";
import { monitorSnapshot, queriesForAdvice, resetMonitor } from "../../lib/observability.js";
import { indexAdvice } from "../../lib/indexAdvice.js";
import { RUM_DEVICES, RUM_OSES, rumReport } from "../../lib/rum.js";
import {
  BUILT_IN_ROUTES,
  LANE_NAMES,
  LaneConfigSchema,
  RouteRuleSchema,
  TRAFFIC_LIMITS,
  TrafficConfigSchema,
  lanes,
  trafficDefaults,
  type LaneName,
} from "../../lib/traffic.js";

/**
 * /v1/admin/system/speed — مراقبة السرعة والأولوية: what is slow (routes, queries,
 * the main thread, errors) and the request lanes (limits, turns, waiting).
 * Reading needs system:read, changes system:write (admin.routes.ts). Settings
 * changes go in the same history as السرعة والكاش.
 */
const r = Router();

const live = () => ({ lanes: lanes.snapshot(), monitor: monitorSnapshot() });

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const { traffic, row } = await readPerformance();
    res.json({
      config: traffic,
      defaults: trafficDefaults(),
      limits: TRAFFIC_LIMITS,
      builtInRoutes: BUILT_IN_ROUTES.map(([method, path, lane]) => ({ match: method === "*" ? path : `${method} ${path}`, lane })),
      updatedAt: row?.updatedAt ?? null,
      ...live(),
    });
  }),
);

r.get(
  "/live",
  asyncHandler(async (_req, res) => {
    res.json(live());
  }),
);

const PatchBody = z
  .object({
    mode: TrafficConfigSchema.shape.mode.optional(),
    globalLimit: TrafficConfigSchema.shape.globalLimit.optional(),
    slowMs: TrafficConfigSchema.shape.slowMs.optional(),
    lanes: z
      .object(Object.fromEntries(LANE_NAMES.map((l) => [l, LaneConfigSchema.partial().strict().optional()])) as Record<string, z.ZodTypeAny>)
      .strict()
      .optional(),
    routes: z.array(RouteRuleSchema).max(50).optional(),
  })
  .strict();

r.patch(
  "/",
  asyncHandler(async (req, res) => {
    const body = PatchBody.parse(req.body ?? {}) as z.infer<typeof PatchBody> & { lanes?: Partial<Record<LaneName, object>> };
    const { traffic } = await readPerformance();
    const next = TrafficConfigSchema.parse({
      ...traffic,
      ...(body.mode ? { mode: body.mode } : {}),
      ...(body.globalLimit !== undefined ? { globalLimit: body.globalLimit } : {}),
      ...(body.slowMs !== undefined ? { slowMs: body.slowMs } : {}),
      ...(body.routes ? { routes: body.routes } : {}),
      lanes: Object.fromEntries(LANE_NAMES.map((l) => [l, { ...traffic.lanes[l], ...(body.lanes?.[l] ?? {}) }])),
    });
    const out = await savePerformance(req, { traffic: next });
    res.json({ config: out.traffic, changed: out.changed });
  }),
);

r.post(
  "/reset",
  asyncHandler(async (req, res) => {
    const out = await savePerformance(req, { traffic: trafficDefaults() });
    res.json({ config: out.traffic, changed: out.changed });
  }),
);

/** Starts the numbers over (what is running or waiting stays). */
r.post(
  "/reset-stats",
  asyncHandler(async (_req, res) => {
    resetMonitor();
    lanes.resetStats();
    res.json({ ok: true, ...live() });
  }),
);

/** Missing indexes for the slowest queries (looks at the database's own index list; creates nothing). */
r.get(
  "/indexes",
  asyncHandler(async (_req, res) => {
    res.json(await indexAdvice(queriesForAdvice()));
  }),
);

const RumQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
  device: z.enum(RUM_DEVICES).optional(),
  os: z.enum(RUM_OSES).optional(),
  /** "os": a row per system too (Android, iOS…). */
  split: z.enum(["device", "os"]).default("os"),
});

/** Real shoppers' speed per page, device and system (تجربة الزباين). */
r.get(
  "/rum",
  asyncHandler(async (req, res) => {
    const q = RumQuery.parse(req.query ?? {});
    res.json(await rumReport(q));
  }),
);

export default r;
