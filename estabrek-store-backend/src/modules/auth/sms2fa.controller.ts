import type { RequestHandler } from "express";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { TwoFASmsStartBody, TwoFASmsConfirmBody } from "./auth.schemas.js";
import { startEnableSms2fa, confirmEnableSms2fa } from "./sms2fa.service.js";

export const sms2faStart: RequestHandler[] = [
  validate({ body: TwoFASmsStartBody }),
  asyncHandler(async (req, res) => {
    const ip = req.ip;
    const ua = req.headers["user-agent"] as string | undefined;
    const out = await startEnableSms2fa({ adminId: req.user!.sub, ip, ua });
    res.json(out);
  }),
];

export const sms2faConfirm: RequestHandler[] = [
  validate({ body: TwoFASmsConfirmBody }),
  asyncHandler(async (req, res) => {
    const { challengeId, code, label } = req.body;
    const out = await confirmEnableSms2fa({ adminId: req.user!.sub, challengeId, code, label });
    res.json(out);
  }),
];
