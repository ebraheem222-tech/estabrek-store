import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { askFor, askStatus } from "../../lib/siteAsk.js";

/**
 * /v1/site-ask — a copy's admin put up by hand on the owner's Cloudflare Pages, with nothing linked to it yet,
 * asking this store's press for its database, server and shop (lib/siteAsk.ts). Called by that admin's /connect
 * page from its own address (the browser's Origin says which admin asks), with a key made in the browser.
 *
 * POST /        { key } — ask (again): { pair, state }. The owner says yes in نسخ الزباين after matching the pair.
 * POST /status  { key } — where it stands: waiting, refused, making (each step), made (the server's address and
 *                         the setup code, to this browser alone). A POST, so the key is never in an address.
 */
const r = Router();

r.post(
  "/",
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await askFor(req.headers.origin, (req.body as { key?: unknown } | undefined)?.key));
  }),
);

r.post(
  "/status",
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await askStatus(req.headers.origin, (req.body as { key?: unknown } | undefined)?.key));
  }),
);

export default r;
