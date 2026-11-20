import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { API_KEY, API_SECRET, CLOUD_NAME, cloudinarySource, pingCloudinary, saveCloudinaryAccount } from "../../lib/cloudinaryAccount.js";

/**
 * /v1/admin/settings/cloudinary — the store's own Cloudinary account (lib/cloudinaryAccount.ts),
 * given in the admin (إعداد المتجر, الإعدادات → الوسائط). Where pictures go is the owner's to change.
 *
 * GET    — where the account comes from ("env" | "saved" | "none"), its cloud's name and its key's end; never the secret
 * PUT    { cloudName, apiKey, apiSecret } — tried with Cloudinary first, then kept (the secret sealed)
 * DELETE — the account given here taken away (pictures go to the server's disk again)
 */
const r = Router();

const Body = z
  .object({
    cloudName: z.string().trim().regex(CLOUD_NAME, "A cloud's name is letters, digits, - and _ (from Cloudinary's dashboard)"),
    apiKey: z.string().trim().regex(API_KEY, "An API key is digits (from Cloudinary → Settings → API Keys)"),
    apiSecret: z.string().trim().regex(API_SECRET, "An API secret is letters, digits, - and _ (from Cloudinary → Settings → API Keys)"),
  })
  .strict();

const ownerOnly = (owner: boolean | undefined) => {
  if (!owner) throw new AppError(403, "OWNER_ONLY", "Only the store's owner changes where its pictures go");
};

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(cloudinarySource());
  }),
);

r.put(
  "/",
  asyncHandler(async (req, res) => {
    ownerOnly(req.access?.owner);
    const body = Body.parse(req.body ?? {});
    if (cloudinarySource().source === "env") throw new AppError(409, "CLOUDINARY_FROM_SERVER", "The server's own Cloudinary variables are in force: change them on the server");
    const tried = await pingCloudinary(body);
    if (!tried.ok) throw new AppError(400, "CLOUDINARY_REFUSED", tried.why ? `Cloudinary refused it: ${tried.why}` : `Cloudinary refused it (${tried.status})`, { status: tried.status });
    await saveCloudinaryAccount(body);
    res.json(cloudinarySource());
  }),
);

r.delete(
  "/",
  asyncHandler(async (req, res) => {
    ownerOnly(req.access?.owner);
    await saveCloudinaryAccount(null);
    res.json(cloudinarySource());
  }),
);

export default r;
