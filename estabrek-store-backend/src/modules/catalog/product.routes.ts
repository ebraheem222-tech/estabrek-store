import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import {
  ProductListQuery,
  CreateReviewBody,
  CreateCommentBody,
  CreateOrderRequestBody,
  QuoteBody,
  CartQuoteBody,
} from "./catalog.schemas.js";
import {
  listProducts,
  getProductById,
  getProductBySlug,
  createReview,
  createComment,
  submitOrderRequest,
  quoteOrderRequest,
  quoteCart,
} from "./catalog.service.js";

const r = Router();

// list/browse
r.get("/products", validate({ query: ProductListQuery }), asyncHandler(async (req, res) => {
  const q = ProductListQuery.parse(req.query);
  res.json(await listProducts(q));
}));

// detail by slug
r.get("/products/slug/:slug", asyncHandler(async (req, res) => {
  const p = await getProductBySlug(req.params.slug);
  if (!p) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(p);
}));

// detail by id
r.get("/products/:id", asyncHandler(async (req, res) => {
  const p = await getProductById(req.params.id);
  if (!p) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(p);
}));

// reviews
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

// comments
r.post("/products/:id/comments", validate({ body: CreateCommentBody }), asyncHandler(async (req, res) => {
  const prod = await getProductById(req.params.id);
  if (!prod) return res.status(404).json({ error: "NOT_FOUND" });
  res.status(201).json(await createComment(req.params.id, req.body));
}));


// quote (subtotal/discount/total) for checkout
r.post("/quote", validate({ body: QuoteBody }), asyncHandler(async (req, res) => {
  const out = await quoteOrderRequest(req.body);
  res.json(out);
}));

// cart quote (multi items)
r.post("/cart-quote", validate({ body: CartQuoteBody }), asyncHandler(async (req, res) => {
  const out = await quoteCart(req.body);
  res.json(out);
}));

// order request
r.post("/order-requests", validate({ body: CreateOrderRequestBody }), asyncHandler(async (req, res) => {
  const created = await submitOrderRequest(req.body);
  res.status(201).json({ ok: true, id: created.id, subtotal: created.subtotal, discountAmount: created.discountAmount, total: created.total, couponCode: created.couponCode });
}));

export default r;
