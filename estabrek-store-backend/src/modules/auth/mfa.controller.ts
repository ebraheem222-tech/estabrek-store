import type { RequestHandler } from "express";
import { validate } from "../../utils/validate.js";
import { TwoFASetupBody, TwoFAEnableBody, TwoFADisableBody, MfaFinalizeBody } from "./auth.schemas.js";
import { asyncHandler } from "../../utils/async.js";
import { disable2FA, enable2FA, finalizeMfaLogin, generate2FASetup } from "./mfa.service.js";
import { issueTokensFromSession } from "./auth.service.js";

export const setup2FA: RequestHandler[] = [
  validate({ body: TwoFASetupBody }),
  asyncHandler(async (req, res) => {
    const { secret, uri } = generate2FASetup(req.user!.email ?? "admin@local");
    res.json({ secret, uri });
  }),
];

export const enable2FAController: RequestHandler[] = [
  validate({ body: TwoFAEnableBody }),
  asyncHandler(async (req, res) => {
    const { secret, code, label } = req.body;
    const out = await enable2FA(req.user!.sub, secret, code, label);
    res.json(out);
  }),
];

export const disable2FAController: RequestHandler[] = [
  validate({ body: TwoFADisableBody }),
  asyncHandler(async (req, res) => {
    const out = await disable2FA(req.user!.sub, req.body.deviceId);
    res.json(out);
  }),
];

// When login required MFA, client will call this with sessionId + either totp OR sms code,
// then we return final access/refresh tokens.
export const finalizeMfaLoginController: RequestHandler[] = [
  validate({ body: MfaFinalizeBody }),
  asyncHandler(async (req, res) => {
    const { sessionId, adminId, totp, code, challengeId } = req.body as any;
    const tokens = await finalizeMfaLogin({ sessionId, adminId, totp, code, challengeId });
    res.json(tokens);
  }),
];

// Convenience endpoint if you only have sessionId after MFA
export const tokensFromSession: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    const { sessionId } = req.body as { sessionId: string };
    const tokens = await issueTokensFromSession(sessionId);
    res.json(tokens);
  }),
];
