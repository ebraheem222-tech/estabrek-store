import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { loadAccess } from "../../middleware/access.js";
import { login, refresh, logoutController, me, csrfToken } from "./auth.controller.js";
import { setup2FA, enable2FAController, disable2FAController, finalizeMfaLoginController } from "./mfa.controller.js";
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
// (No "tokens from session" shortcut: it handed out tokens without the 2FA code.)

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

// who am i (any active admin: owner or team member)
r.get("/me", authenticate, loadAccess, me);

export default r;
