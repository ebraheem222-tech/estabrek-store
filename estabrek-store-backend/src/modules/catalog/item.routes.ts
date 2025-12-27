import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { listProductItems, getProductById } from "./catalog.service.js";

const r = Router();

// items for a given product
r.get("/products/:productId/items", asyncHandler(async (req, res) => {
  const prod = await getProductById(req.params.productId);
  if (!prod) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(await listProductItems(req.params.productId));
}));

export default r;
