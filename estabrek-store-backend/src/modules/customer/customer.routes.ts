import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { authenticateCustomer, requireCustomerAccounts } from "../../middleware/customerAuth.js";
import {
  addToWishlist,
  createAddress,
  deleteAddress,
  getMe,
  getWishlist,
  listAddresses,
  logoutEverywhere,
  logoutLogin,
  mergeWishlist,
  myOrders,
  refreshLogin,
  removeFromWishlist,
  startLogin,
  updateAddress,
  updateMe,
  verifyLogin,
} from "./customer.service.js";

/** /v1/customer — shopper accounts (sign in by email code). Only while the admin switch is on. */
const r = Router();
r.use(requireCustomerAccounts);

const ctxOf = (req: any) => ({ ip: req.ip as string | undefined, ua: (req.get?.("user-agent") as string | undefined) ?? undefined });

const Email = z.string().trim().toLowerCase().email().max(160);
const Phone = z.string().trim().max(32).regex(/^\+?[0-9\s\-()]{6,}$/, "Phone looks wrong");
const Hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/);
const Token = z.string().min(20).max(200);

/* ---------- sign in ---------- */

r.post("/auth/start", validate({ body: z.object({ email: Email }) }), asyncHandler(async (req, res) => {
  res.json(await startLogin(req.body.email, ctxOf(req)));
}));

r.post(
  "/auth/verify",
  validate({ body: z.object({ email: Email, code: z.string().trim().regex(/^\d{6}$/, "6 digits") }) }),
  asyncHandler(async (req, res) => {
    res.json(await verifyLogin(req.body.email, req.body.code, ctxOf(req)));
  }),
);

r.post("/auth/refresh", validate({ body: z.object({ refreshToken: Token }) }), asyncHandler(async (req, res) => {
  res.json(await refreshLogin(req.body.refreshToken, ctxOf(req)));
}));

r.post("/auth/logout", validate({ body: z.object({ refreshToken: Token }) }), asyncHandler(async (req, res) => {
  res.json(await logoutLogin(req.body.refreshToken));
}));

/* ---------- account (signed in) ---------- */

const me = Router();
me.use(authenticateCustomer);

me.get("/", asyncHandler(async (req, res) => {
  res.json(await getMe(req.customer!.id));
}));

me.patch(
  "/",
  validate({
    body: z
      .object({
        name: z.string().trim().max(80).optional(),
        phone: Phone.nullable().optional().or(z.literal("").transform(() => null)),
        preferredSize: z.string().trim().max(20).nullable().optional(),
        favoriteColor: Hex.nullable().optional(),
        marketingOptIn: z.boolean().optional(),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    res.json(await updateMe(req.customer!.id, req.body));
  }),
);

me.post("/logout-everywhere", asyncHandler(async (req, res) => {
  res.json(await logoutEverywhere(req.customer!.id));
}));

me.get("/orders", asyncHandler(async (req, res) => {
  res.json({ orders: await myOrders(req.customer!.id) });
}));

me.get("/wishlist", asyncHandler(async (req, res) => {
  res.json({ items: await getWishlist(req.customer!.id) });
}));

const ProductId = z.object({ productId: z.string().min(1).max(64) });

me.put("/wishlist/:productId", validate({ params: ProductId }), asyncHandler(async (req, res) => {
  res.json(await addToWishlist(req.customer!.id, String(req.params.productId)));
}));

me.delete("/wishlist/:productId", validate({ params: ProductId }), asyncHandler(async (req, res) => {
  res.json(await removeFromWishlist(req.customer!.id, String(req.params.productId)));
}));

me.post(
  "/wishlist/merge",
  validate({ body: z.object({ productIds: z.array(z.string().min(1).max(64)).max(200) }) }),
  asyncHandler(async (req, res) => {
    res.json({ items: await mergeWishlist(req.customer!.id, req.body.productIds) });
  }),
);

const AddressBody = z.object({
  label: z.string().trim().max(40).nullable().optional(),
  fullName: z.string().trim().min(2).max(80),
  phone: Phone,
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(3).max(200),
  notes: z.string().trim().max(300).nullable().optional(),
  isDefault: z.boolean().optional(),
});
const IdParams = z.object({ id: z.string().min(1).max(64) });

me.get("/addresses", asyncHandler(async (req, res) => {
  res.json({ addresses: await listAddresses(req.customer!.id) });
}));

me.post("/addresses", validate({ body: AddressBody }), asyncHandler(async (req, res) => {
  res.status(201).json(await createAddress(req.customer!.id, req.body));
}));

me.patch("/addresses/:id", validate({ params: IdParams, body: AddressBody.partial() }), asyncHandler(async (req, res) => {
  res.json(await updateAddress(req.customer!.id, String(req.params.id), req.body));
}));

me.delete("/addresses/:id", validate({ params: IdParams }), asyncHandler(async (req, res) => {
  res.json(await deleteAddress(req.customer!.id, String(req.params.id)));
}));

r.use("/me", me);

export default r;
