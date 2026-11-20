import type { RequestHandler } from "express";
import { z } from "zod";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { Email } from "../../schemas/common.js";
import { claimFirstRun, codeFrom, firstRunNeeded } from "../../lib/firstRun.js";
import { beginSessionForAdmin } from "./auth.service.js";

/**
 * /v1/auth/first-run — a store with no one in it (lib/firstRun.ts). Under /v1/auth, so a guess at
 * the code meets the sign-in's own tight rate limit.
 *
 * GET  — { needed, codeFrom }: whether the admin opens on the first setup, and where its code is
 * POST { code, name, email, password } — the owner's account made and signed in: { accessToken, refreshToken, admin }
 */
export const FirstRunBody = z
  .object({
    code: z.string().trim().min(8).max(80),
    name: z.string().trim().min(1).max(80),
    email: Email,
    // The owner's account opens everything: longer than a member's.
    password: z.string().min(10).max(200),
  })
  .strict();

export const firstRunStatus: RequestHandler = asyncHandler(async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const needed = await firstRunNeeded();
  res.json({ needed, ...(needed ? { codeFrom: codeFrom() } : {}) });
});

export const firstRunClaim: RequestHandler[] = [
  validate({ body: FirstRunBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof FirstRunBody>;
    const admin = await claimFirstRun({ code: body.code, name: body.name, email: body.email.trim().toLowerCase(), password: body.password });
    const started = await beginSessionForAdmin({ adminId: admin.id, ip: req.ip, ua: req.headers["user-agent"] as string | undefined });
    // A new account has no second factor yet: it is signed in at once.
    if (started.mfaRequired) return res.status(206).json({ mfaRequired: true, sessionId: started.sessionId, adminId: started.adminId });
    res.status(201).json({ accessToken: started.accessToken, refreshToken: started.refreshToken, admin: started.admin });
  }),
];
