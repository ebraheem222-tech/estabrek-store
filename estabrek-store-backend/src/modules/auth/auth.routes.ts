import { Router } from "express";
import { authenticate, requireSuperAdmin } from "../../middleware/auth.js";
import { login, refresh, logoutController, me, csrfToken } from "./auth.controller.js";
import { setup2FA, enable2FAController, disable2FAController, finalizeMfaLoginController, tokensFromSession } from "./mfa.controller.js";
import { forgotPassword, performReset } from "./password.controller.js";
import { generateCodes, verifyCode } from "./recovery.controller.js";
import { phoneStart, phoneVerify } from "./phone.controller.js";
import { sms2faStart, sms2faConfirm } from "./sms2fa.controller.js";

const r = Router();

// core auth
r.post("/login", ...login);
r.post("/refresh", ...refresh);
r.post("/logout", ...logoutController);
r.get("/csrf", csrfToken);

// phone login (passwordless)
r.post("/phone/start", ...phoneStart);
r.post("/phone/verify", ...phoneVerify);

// MFA flow
r.post("/mfa/finalize", ...finalizeMfaLoginController);
r.post("/mfa/tokens-from-session", ...tokensFromSession);

// must be logged in for these:
r.post("/2fa/setup", authenticate, ...setup2FA);
r.post("/2fa/enable", authenticate, ...enable2FAController);
r.post("/2fa/disable", authenticate, ...disable2FAController);

// enable SMS 2FA
r.post("/2fa/sms/start", authenticate, ...sms2faStart);
r.post("/2fa/sms/confirm", authenticate, ...sms2faConfirm);

r.post("/2fa/recovery/generate", authenticate, ...generateCodes);
r.post("/2fa/recovery/verify", authenticate, ...verifyCode);

// password
r.post("/password/forgot", ...forgotPassword);
r.post("/password/reset", ...performReset);

// who am i (admin only)
r.get("/me", authenticate, requireSuperAdmin, me);

export default r;
