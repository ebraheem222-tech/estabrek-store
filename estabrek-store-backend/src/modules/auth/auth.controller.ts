import type { RequestHandler } from "express";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { LoginBody, RefreshBody, LogoutBody } from "./auth.schemas.js";
import { authenticateAdmin, refreshTokens, logout } from "./auth.service.js";
import { Unauthorized } from "../../utils/httpError.js";
import { env } from "../../config/env.js";
import { issueCsrfToken } from "../../middleware/csrf.js";

export const login: RequestHandler[] = [
  validate({ body: LoginBody }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip;
    const ua = req.headers["user-agent"] as string | undefined;

    const result = await authenticateAdmin({ email, password, ip, ua });

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

export const refresh: RequestHandler[] = [
  validate({ body: RefreshBody }),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const ip = req.ip;
    const ua = req.headers["user-agent"] as string | undefined;

    const tokens = await refreshTokens(refreshToken, ip, ua);
    res.json(tokens);
  }),
];

export const logoutController: RequestHandler[] = [
  validate({ body: LogoutBody }),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw Unauthorized("Missing refresh token");
    await logout(refreshToken);
    res.json({ ok: true });
  }),
];

export const csrfToken: RequestHandler = (_req, res) => {
  if (!env.CSRF_TOKEN_ENABLED) {
    return res.status(404).json({ error: "NOT_FOUND" });
  }
  const token = issueCsrfToken(res);
  res.json({ csrfToken: token });
};

export const me: RequestHandler = (req, res) => {
  res.json({ user: req.user });
};
