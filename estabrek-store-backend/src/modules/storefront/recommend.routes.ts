import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { RecommendProductsBody } from "./recommend.schemas.js";
import { recommendProducts } from "./recommend.service.js";

const r = Router();

/**
 * POST /v1/storefront/recommend/products
 * Body: { locale?, message?, productId?, limit?, excludeIds? }
 */
r.post("/products", validate({ body: RecommendProductsBody }), asyncHandler(async (req, res) => {
  const body = req.body as any;

  const out = await recommendProducts({
    locale: body.locale,
    message: body.message,
    productId: body.productId,
    limit: body.limit,
    excludeIds: body.excludeIds,
  });

  res.json(out);
}));

export default r;

