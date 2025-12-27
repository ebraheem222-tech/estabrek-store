import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import {
  ProductListQuery,
  CreateReviewBody,
  CreateCommentBody,
  CreateOrderRequestBody,
} from "./catalog.schemas.js";
import {
  listProducts,
  getProductById,
  getProductBySlug,
  getCategoriesTree,
  listSizes,
  createReview,
  createComment,
  submitOrderRequest,
} from "./catalog.service.js";

const r = Router();

/** categories tree */
r.get("/categories/tree", asyncHandler(async (_req, res) => {
  res.json(await getCategoriesTree());
}));

/** sizes (active) */
r.get("/sizes", asyncHandler(async (_req, res) => {
  res.json(await listSizes());
}));

/** product listing with filters */
r.get("/products", validate({ query: ProductListQuery }), asyncHandler(async (req, res) => {
  const q = ProductListQuery.parse(req.query); // typesafe
  res.json(await listProducts(q));
}));

/** product detail (by slug or id) */
r.get("/products/slug/:slug", asyncHandler(async (req, res) => {
  const p = await getProductBySlug(req.params.slug);
  if (!p) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(p);
}));

r.get("/products/:id", asyncHandler(async (req, res) => {
  const p = await getProductById(req.params.id);
  if (!p) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(p);
}));

/** UGC: reviews/comments create (moderated -> PENDING) */
r.post(
  "/products/:id/reviews",
  (req, _res, next) => {
    if (req.body?.comment && req.body?.body == null) req.body.body = req.body.comment;
    next();
  },
  validate({ body: CreateReviewBody }),
  asyncHandler(async (req, res) => {
    const prod = await getProductById(req.params.id);
    if (!prod) return res.status(404).json({ error: "NOT_FOUND" });
    res.status(201).json(await createReview(req.params.id, req.body));
  })
);

r.post("/products/:id/comments", validate({ body: CreateCommentBody }), asyncHandler(async (req, res) => {
  const prod = await getProductById(req.params.id);
  if (!prod) return res.status(404).json({ error: "NOT_FOUND" });
  const out = await createComment(req.params.id, req.body);
  res.status(201).json(out);
}));

/** Order-request (no payment; admin will contact) */
r.post("/order-requests", validate({ body: CreateOrderRequestBody }), asyncHandler(async (req, res) => {
  const created = await submitOrderRequest(req.body);
  res.status(201).json({ ok: true, id: created.id });
}));

export default r;
