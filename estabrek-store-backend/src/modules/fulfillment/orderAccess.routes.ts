/**
 * The shopper's private order page (/order/<token> on the storefront):
 *   GET  /v1/orders/access/:token                  files, tickets and the order's state
 *   POST /v1/orders/access/:token/files/:fileId    counts one download and returns a short-lived link
 * The token is long and random; nothing here needs an account.
 */
import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { downloadLink, orderAccess } from "./fulfillment.service.js";

const r = Router();

r.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  next();
});

r.get(
  "/access/:token",
  asyncHandler(async (req, res) => {
    res.json(await orderAccess(String(req.params.token)));
  }),
);

r.post(
  "/access/:token/files/:fileId",
  asyncHandler(async (req, res) => {
    res.json({ url: await downloadLink(String(req.params.token), String(req.params.fileId)) });
  }),
);

export default r;
