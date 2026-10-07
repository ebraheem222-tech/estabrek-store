import type { RequestHandler } from "express";
import { validate } from "../../utils/validate.js";
import { RecoveryGenerateBody, RecoveryVerifyBody } from "./auth.schemas.js";
import { asyncHandler } from "../../utils/async.js";
import { generateRecoveryCodes, consumeRecoveryCode } from "./mfa.service.js";

export const generateCodes: RequestHandler[] = [
  validate({ body: RecoveryGenerateBody }),
  asyncHandler(async (req, res) => {
    const { count } = req.body;
    const out = await generateRecoveryCodes(req.user!.sub, count);
    res.json(out); // only show once!
  }),
];

export const verifyCode: RequestHandler[] = [
  validate({ body: RecoveryVerifyBody }),
  asyncHandler(async (req, res) => {
    const out = await consumeRecoveryCode(req.user!.sub, req.body.code);
    res.json(out);
  }),
];
