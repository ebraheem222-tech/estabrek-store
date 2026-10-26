import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { cacheResponse } from "../../middleware/responseCache.js";
import { getVariant } from "./catalog.service.js";

const r = Router();

r.get("/variants/:id", cacheResponse("sku"), asyncHandler(async (req, res) => {
  const v = await getVariant(req.params.id);
  if (!v) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(v);
}));

export default r;
