import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import {
  UpdateProfileBody,
  EmailChangeRequestBody,
  EmailChangeConfirmBody,
  SessionsQuery,
  RevokeSessionParams,
  RevokeOthersBody,
  SecurityEventsQuery,
} from "./admin.schemas.js";
import {
  getDashboard,
  getMe,
  updateProfile,
  requestEmailChange,
  confirmEmailChange,
  listMySessions,
  revokeMySession,
  revokeOtherSessions,
  listMySecurityEvents,
} from "./admin.service.js";

const r = Router();

// GET /v1/admin/overview
r.get("/overview", asyncHandler(async (_req, res) => {
  res.json(await getDashboard());
}));

// GET /v1/admin/account/me
r.get("/account/me", asyncHandler(async (req, res) => {
  res.json(await getMe(req.user!.sub));
}));

// PATCH /v1/admin/account/profile
r.patch(
  "/account/profile",
  validate({ body: UpdateProfileBody }),
  asyncHandler(async (req, res) => {
    res.json(await updateProfile(req.user!.sub, req.body));
  })
);

// POST /v1/admin/account/email-change/request
r.post(
  "/account/email-change/request",
  validate({ body: EmailChangeRequestBody }),
  asyncHandler(async (req, res) => {
    res.json(await requestEmailChange(req.user!.sub, req.body.newEmail));
  })
);

// POST /v1/admin/account/email-change/confirm
r.post(
  "/account/email-change/confirm",
  validate({ body: EmailChangeConfirmBody }),
  asyncHandler(async (req, res) => {
    res.json(await confirmEmailChange(req.user!.sub, req.body.token));
  })
);

// ================= Security / Sessions / Audit =================

// GET /v1/admin/account/sessions
r.get(
  "/account/sessions",
  validate({ query: SessionsQuery }),
  asyncHandler(async (req, res) => {
    res.json(await listMySessions(req.user!.sub, req.query as any));
  })
);

// POST /v1/admin/account/sessions/:id/revoke
r.post(
  "/account/sessions/:id/revoke",
  validate({ params: RevokeSessionParams }),
  asyncHandler(async (req, res) => {
    res.json(await revokeMySession(req.user!.sub, req.params.id, { ip: req.ip, ua: req.get("user-agent") ?? undefined }));
  })
);

// POST /v1/admin/account/sessions/revoke-others
r.post(
  "/account/sessions/revoke-others",
  validate({ body: RevokeOthersBody }),
  asyncHandler(async (req, res) => {
    res.json(
      await revokeOtherSessions(req.user!.sub, req.body.currentSessionId, {
        ip: req.ip,
        ua: req.get("user-agent") ?? undefined,
      })
    );
  })
);

// GET /v1/admin/account/security-events
r.get(
  "/account/security-events",
  validate({ query: SecurityEventsQuery }),
  asyncHandler(async (req, res) => {
    res.json(await listMySecurityEvents(req.user!.sub, req.query as any));
  })
);

export default r;
