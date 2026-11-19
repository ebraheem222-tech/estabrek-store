/**
 * /v1/pay — the shop's page for a payment a function asked for (lib/payLinks.ts). Its token is the permission:
 * whoever has the link may see what it is and pay it, never who it is for.
 *
 * GET  /v1/pay/:token            { title, amount, currency, status, providers, back, paidAt }
 * POST /v1/pay/:token/start      { provider: "stripe" | "paypal" } → { redirectUrl } (the gateway's own page)
 * POST /v1/pay/:token/verify     back from the gateway: the gateway is asked; paid → the functions waiting start
 */
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { hit } from "../../lib/hitLimit.js";
import { normalizeIp } from "../../utils/ip.js";
import { PAY_PROVIDERS, PayError, payView, startPay, verifyPay } from "../../lib/payLinks.js";
import { resolveStorefrontBaseUrl } from "../storefront/storefront.routes.js";

const r = Router();
/** Opening a gateway and asking it: so many a minute from one place. */
export const PAY_PER_MINUTE = 20;

const said = (e: unknown): never => {
  if (e instanceof PayError) throw new AppError(e.status, e.code, e.message);
  throw e;
};
async function limited(req: Request, _res: Response, next: NextFunction) {
  const place = normalizeIp(req.ip ?? "") || "unknown";
  const { count } = await hit(`pay:${place}`, 60_000);
  if (count > PAY_PER_MINUTE) return next(new AppError(429, "TOO_MANY", "Too many tries: wait a minute"));
  next();
}

r.get(
  "/:token",
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await payView(String(req.params.token)).catch(said));
  }),
);

r.post(
  "/:token/start",
  asyncHandler(limited),
  asyncHandler(async (req, res) => {
    const body = z.object({ provider: z.enum(PAY_PROVIDERS) }).strict().safeParse(req.body ?? {});
    if (!body.success) throw new AppError(400, "BAD_PROVIDER", "Pay with stripe or paypal");
    res.setHeader("Cache-Control", "no-store");
    res.json(await startPay(String(req.params.token), body.data.provider, resolveStorefrontBaseUrl(req)).catch(said));
  }),
);

r.post(
  "/:token/verify",
  asyncHandler(limited),
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await verifyPay(String(req.params.token)).catch(said));
  }),
);

export default r;
