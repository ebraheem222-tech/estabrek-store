import { Router } from "express";
import { optionalCustomer } from "../../middleware/customerAuth.js";
import { activeCustomerId } from "../customer/customer.service.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { prisma } from "../../lib/prisma.js";
import { attrFiltersFrom, attributeFacets, publicType } from "../productTypes/productTypes.js";
import {
  ProductListQuery,
  ProductIdsBody,
  ProductSlugsBody,
  CreateReviewBody,
  CreateCommentBody,
  CreateOrderRequestBody,
  QuoteBody,
  CartQuoteBody,
} from "./catalog.schemas.js";
import {
  listProducts,
  listProductsByIds,
  listProductsBySlugs,
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
  res.json(await listProducts({ ...q, attrs: attrFiltersFrom(req.query as Record<string, unknown>) }));
}));

// Kinds of products and their fields (for the shop's filters and labels).
r.get("/product-types", asyncHandler(async (_req, res) => {
  const types = await prisma.productType.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  res.json({ types: types.map(publicType) });
}));

// Filter choices with counts from the types' filterable fields: ?category=slug&categoryId=&type=slug&q=
r.get("/attribute-facets", asyncHandler(async (req, res) => {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const and: any[] = [{ isActive: true }];
  const type = str(req.query.type);
  if (type) and.push({ type: { slug: type } });
  const categoryId = str(req.query.categoryId);
  const category = str(req.query.category);
  if (categoryId) and.push({ OR: [{ categoryId }, { category: { parentId: categoryId } }] });
  else if (category) and.push({ OR: [{ category: { slug: category } }, { category: { parent: { slug: category } } }] });
  res.json({ fields: await attributeFacets({ AND: and }, type) });
}));

// batch by ids (for CMS + landing sections)
r.post("/products/by-ids", validate({ body: ProductIdsBody }), asyncHandler(async (req, res) => {
  const { ids, lite } = ProductIdsBody.parse(req.body);
  res.json({ items: await listProductsByIds(ids, { lite }) });
}));

// batch by slugs (for CMS + landing sections)
r.post("/products/by-slugs", validate({ body: ProductSlugsBody }), asyncHandler(async (req, res) => {
  const { slugs, lite } = ProductSlugsBody.parse(req.body);
  res.json({ items: await listProductsBySlugs(slugs, { lite }) });
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
r.post("/order-requests", optionalCustomer, validate({ body: CreateOrderRequestBody }), asyncHandler(async (req, res) => {
  // Signed-in shopper: the order shows in her account.
  const created = await submitOrderRequest(req.body, { userId: await activeCustomerId(req.customer?.id) });
  res.status(201).json({ ok: true, id: created.id, subtotal: created.subtotal, discountAmount: created.discountAmount, total: created.total, couponCode: created.couponCode });
}));

export default r;
