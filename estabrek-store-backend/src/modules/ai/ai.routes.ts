/**
 * AI for shoppers (each behind its admin switch, and only with OPENAI_API_KEY):
 *   POST /v1/ai/search            {q}        her words → search filters
 *   GET  /v1/ai/look/:productId              pieces that complete the look
 *   POST /v1/ai/size              {...}      a size for her (nothing about her is kept)
 *   GET  /v1/ai/reviews/:productId           what shoppers say (Arabic + English)
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { needPublicFeature } from "./ai.guard.js";
import { parseSearch, reviewSummary, shopTheLook, sizeAdvice } from "./ai.service.js";

const r = Router();

r.post(
  "/search",
  validate({ body: z.object({ q: z.string().trim().min(2).max(200) }) }),
  asyncHandler(async (req, res) => {
    await needPublicFeature("smartSearch", req.ip);
    res.json(await parseSearch(req.body.q));
  }),
);

r.get(
  "/look/:productId",
  asyncHandler(async (req, res) => {
    await needPublicFeature("shopTheLook", req.ip);
    res.setHeader("Cache-Control", "public, max-age=600");
    res.json(await shopTheLook(String(req.params.productId)));
  }),
);

r.post(
  "/size",
  validate({
    body: z.object({
      productId: z.string().min(1).max(64),
      height: z.number().min(120).max(210),
      weight: z.number().min(30).max(200),
      usual: z.string().trim().max(10).nullish(),
      fit: z.enum(["tight", "regular", "loose"]).nullish(),
    }),
  }),
  asyncHandler(async (req, res) => {
    await needPublicFeature("sizeAdvice", req.ip);
    res.setHeader("Cache-Control", "no-store");
    res.json(await sizeAdvice(req.body.productId, req.body));
  }),
);

r.get(
  "/reviews/:productId",
  asyncHandler(async (req, res) => {
    await needPublicFeature("reviewSummary", req.ip);
    res.setHeader("Cache-Control", "public, max-age=900");
    res.json(await reviewSummary(String(req.params.productId)));
  }),
);

export default r;
