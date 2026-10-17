import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { prisma } from "../../lib/prisma.js";
import { FORECAST_DEFAULTS, FORECAST_LIMITS } from "../../lib/stockForecast.js";
import { readSellingSettings, stockInsights } from "./insights.service.js";

/**
 * /v1/admin/insights — smart selling: the stock forecast (when each size runs
 * out, what to reorder, what nobody looks at). Reading needs inventory:read,
 * changing its numbers inventory:write (admin.routes.ts).
 */
const r = Router();

r.get(
  "/stock",
  asyncHandler(async (_req, res) => {
    const { forecast, row } = await readSellingSettings();
    res.json({ ...(await stockInsights(forecast)), defaults: FORECAST_DEFAULTS, limits: FORECAST_LIMITS, updatedAt: row?.updatedAt ?? null });
  }),
);

const ForecastPatch = z
  .object(
    Object.fromEntries(
      (Object.keys(FORECAST_LIMITS) as Array<keyof typeof FORECAST_LIMITS>).map((k) => [k, z.number().int().min(FORECAST_LIMITS[k].min).max(FORECAST_LIMITS[k].max).optional()]),
    ) as Record<keyof typeof FORECAST_LIMITS, z.ZodOptional<z.ZodNumber>>,
  )
  .strict();

r.patch(
  "/stock/settings",
  asyncHandler(async (req: any, res) => {
    const patch = ForecastPatch.parse(req.body ?? {});
    const { data, forecast } = await readSellingSettings();
    const next = { ...forecast, ...patch };
    const adminUserId = req.user?.bypass ? null : req.access?.adminId ?? null;
    await prisma.sellingSettings.upsert({
      where: { id: "default" },
      create: { id: "default", data: { ...data, forecast: next }, updatedById: adminUserId },
      update: { data: { ...data, forecast: next }, updatedById: adminUserId },
    });
    res.json({ settings: next });
  }),
);

export default r;
