import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { ShopRefused, makeShop, ownAddressOf, shopView, startVercelConnect } from "../../lib/shopLink.js";
import { tidyName } from "../../lib/press.js";

/**
 * /v1/admin/settings/shop — the store's own shop (lib/shopLink.ts): where it is, and, when the store
 * has none of its own, made on Vercel from its setup's first step (إعداد المتجر → متجرك).
 *
 * GET  — the shop's address and where it comes from ("made" here | "server" variable | "none"), a
 *        making that stopped, and the repository a shop would be built from
 * POST /make { token, team?, site } — the shop made with the owner's Vercel token (used for these
 *        calls alone, never kept), told this server's address and this admin's (the page's own
 *        origin), and put in force; the store's owner alone
 * POST /connect { site } — «وصّل Vercel»: the link at Vercel the owner signs in at instead (the
 *        shop is made when Vercel sends them back: modules/vercel); the store's owner alone
 */
const r = Router();

const MakeBody = z
  .object({
    token: z.string().trim().min(16).max(200).regex(/^[A-Za-z0-9_-]+$/, "A Vercel token is letters and digits"),
    team: z.string().trim().max(80).regex(/^[A-Za-z0-9_-]*$/).optional(),
    site: z.string().max(80),
  })
  .strict();

const ownAddress = ownAddressOf;
/** The admin's address: the page that asked (a shop only lets its own admin read its designs). On https, or (outside production) this machine. */
function adminAddress(origin: string | undefined): string | null {
  try {
    const u = new URL(origin ?? "");
    if (u.username || u.password) return null;
    if (u.protocol === "https:") return u.origin;
    const local = u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname);
    return local && process.env.NODE_ENV !== "production" ? u.origin : null;
  } catch {
    return null;
  }
}

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(shopView());
  }),
);

r.post(
  "/make",
  asyncHandler(async (req, res) => {
    // A shop is a project in the owner's Vercel account, paid for monthly: the store's owner's alone.
    if (!req.access?.owner) throw new AppError(403, "OWNER_ONLY", "Only the store's owner makes the store's shop");
    const body = MakeBody.parse(req.body ?? {});
    const api = ownAddress(req);
    if (!api) throw new AppError(409, "NO_ADDRESS", "The server doesn't know its own address");
    const admin = adminAddress(req.get("origin"));
    if (!admin) throw new AppError(400, "NO_ADMIN_ADDRESS", "The shop is made from the store's admin, on its https address");
    try {
      const made = await makeShop({ token: body.token, team: body.team || undefined, site: tidyName(body.site), api, admin });
      res.setHeader("Cache-Control", "no-store");
      res.status(201).json(made);
    } catch (e) {
      if (e instanceof ShopRefused) throw new AppError(e.code === "NAME_INVALID" ? 400 : 409, e.code, e.message);
      throw e;
    }
  }),
);

const ConnectBody = z.object({ site: z.string().max(80) }).strict();

r.post(
  "/connect",
  asyncHandler(async (req, res) => {
    if (!req.access?.owner) throw new AppError(403, "OWNER_ONLY", "Only the store's owner makes the store's shop");
    const body = ConnectBody.parse(req.body ?? {});
    const api = ownAddress(req);
    if (!api) throw new AppError(409, "NO_ADDRESS", "The server doesn't know its own address");
    const admin = adminAddress(req.get("origin"));
    if (!admin) throw new AppError(400, "NO_ADMIN_ADDRESS", "The shop is made from the store's admin, on its https address");
    try {
      const url = await startVercelConnect({ site: tidyName(body.site), admin, api });
      res.setHeader("Cache-Control", "no-store");
      res.json({ url });
    } catch (e) {
      if (e instanceof ShopRefused) throw new AppError(e.code === "NAME_INVALID" ? 400 : 409, e.code, e.message);
      throw e;
    }
  }),
);

export default r;
