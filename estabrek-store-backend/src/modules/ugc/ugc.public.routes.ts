import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { NewsletterSubscribeBody } from "./ugc.schemas.js";
import { subscribeNewsletter } from "./ugc.service.js";
import { listApprovedReviewsByProduct, listApprovedCommentsByProduct } from "./ugc.service.js";

const r = Router();


// Newsletter subscribe
r.post("/newsletter/subscribe", validate({ body: NewsletterSubscribeBody }), asyncHandler(async (req, res) => {
  const out = await subscribeNewsletter(req.body.email, req.body.source);
  res.status(out.created ? 201 : 200).json(out);
}));


r.get("/products/:productId/reviews", asyncHandler(async (req, res) => {
  res.json(await listApprovedReviewsByProduct(req.params.productId));
}));

r.get("/products/:productId/comments", asyncHandler(async (req, res) => {
  res.json(await listApprovedCommentsByProduct(req.params.productId));
}));

export default r;
