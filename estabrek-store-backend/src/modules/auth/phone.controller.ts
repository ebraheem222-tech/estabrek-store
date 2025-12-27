import type { RequestHandler } from "express";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { PhoneStartBody, PhoneVerifyBody } from "./auth.schemas.js";
import { startPhoneLogin, verifyPhoneLogin } from "./phone.service.js";

export const phoneStart: RequestHandler[] = [
  validate({ body: PhoneStartBody }),
  asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const ip = req.ip;
    const ua = req.headers["user-agent"] as string | undefined;
    const out = await startPhoneLogin({ phone, ip, ua });
    res.json(out);
  }),
];

export const phoneVerify: RequestHandler[] = [
  validate({ body: PhoneVerifyBody }),
  asyncHandler(async (req, res) => {
    const { challengeId, code } = req.body;
    const ip = req.ip;
    const ua = req.headers["user-agent"] as string | undefined;
    const result = await verifyPhoneLogin({ challengeId, code, ip, ua });

    if ((result as any).mfaRequired) {
      return res.status(206).json({
        mfaRequired: true,
        method: (result as any).mfaMethod ?? "TOTP",
        sessionId: (result as any).sessionId,
        adminId: (result as any).adminId,
        challengeId: (result as any).challengeId ?? undefined,
      });
    }

    return res.json({
      accessToken: (result as any).accessToken,
      refreshToken: (result as any).refreshToken,
      admin: (result as any).admin,
    });
  }),
];
