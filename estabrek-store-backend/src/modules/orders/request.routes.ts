import { Router } from "express";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { CreateOrderRequestBody } from "../catalog/catalog.schemas.js";
import { submitOrderRequest } from "../catalog/catalog.service.js";

const r = Router();

r.post(
  "/order-requests",
  validate({ body: CreateOrderRequestBody }),
  asyncHandler(async (req, res) => {
    const created = await submitOrderRequest(req.body);
    res.status(201).json({ ok: true, id: created.id });
  })
);

export default r;
