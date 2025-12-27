import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { listProductImages, getProductById } from "./catalog.service.js";

const r = Router();

// aggregate all images for a product across its items
r.get("/products/:productId/images", asyncHandler(async (req, res) => {
  const prod = await getProductById(req.params.productId);
  if (!prod) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(await listProductImages(req.params.productId));
}));

export default r;
