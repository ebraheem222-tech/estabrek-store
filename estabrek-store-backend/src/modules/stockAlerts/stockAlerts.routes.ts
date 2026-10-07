import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { createStockAlert, stopStockAlert } from "./stockAlerts.service.js";

/** /v1/stock-alerts — "tell me when it's back" (public; shares the strict sign-in rate limit). */
const r = Router();

r.post(
  "/",
  validate({ body: z.object({ email: z.string().trim().toLowerCase().email().max(160), variantId: z.string().min(1).max(64) }) }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createStockAlert(req.body, { ip: req.ip }));
  }),
);

r.post(
  "/stop",
  validate({ body: z.object({ token: z.string().min(16).max(200), all: z.boolean().optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(await stopStockAlert(req.body.token, req.body.all === true));
  }),
);

export default r;
