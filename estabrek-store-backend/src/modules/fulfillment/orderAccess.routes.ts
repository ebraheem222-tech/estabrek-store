/**
 * The shopper's private order page (/order/<token> on the storefront):
 *   GET  /v1/orders/access/:token                  files, tickets and the order's state
 *   POST /v1/orders/access/:token/files/:fileId    counts one download and returns a short-lived link
 *   POST /v1/orders/access/:token/licences/:id     a protected product: her copy, a ZIP encrypted with her serial
 * The token is long and random; nothing here needs an account.
 */
import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { downloadLink, orderAccess } from "./fulfillment.service.js";
import { downloadLicence } from "../protected/protected.service.js";

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

r.post(
  "/access/:token/licences/:licenceId",
  asyncHandler(async (req, res) => {
    const pkg = await downloadLicence(String(req.params.token), String(req.params.licenceId), { ip: req.ip, userAgent: req.get("user-agent") });
    res.setHeader("Content-Type", "application/zip");
    // The shop is on another domain: let it read the file name.
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Content-Disposition", `attachment; filename="${pkg.filename}"`);
    res.setHeader("Content-Length", String(pkg.data.length));
    res.end(pkg.data);
  }),
);

export default r;
