import type { RequestHandler } from "express";
import { validate } from "../../utils/validate.js";
import { ForgotBody, ResetBody } from "./auth.schemas.js";
import { asyncHandler } from "../../utils/async.js";
import { requestPasswordReset, resetPassword } from "./password.service.js";

export const forgotPassword: RequestHandler[] = [
  validate({ body: ForgotBody }),
  asyncHandler(async (req, res) => {
    const out = await requestPasswordReset(req.body.email, req.ip, req.headers["user-agent"] as string | undefined);
    res.json(out); // in dev returns token; in prod you'd email it
  }),
];

export const performReset: RequestHandler[] = [
  validate({ body: ResetBody }),
  asyncHandler(async (req, res) => {
    const out = await resetPassword(req.body.token, req.body.newPassword);
    res.json(out);
  }),
];
