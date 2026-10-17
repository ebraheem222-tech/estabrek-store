import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { cacheResponse } from "../../middleware/responseCache.js";
import { listProductImages, getProductById } from "./catalog.service.js";

const r = Router();

// aggregate all images for a product across its items
r.get("/products/:productId/images", cacheResponse("sku", { subject: (req) => String(req.params.productId) }), asyncHandler(async (req, res) => {
  const prod = await getProductById(req.params.productId);
  if (!prod) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(await listProductImages(req.params.productId));
}));

export default r;
