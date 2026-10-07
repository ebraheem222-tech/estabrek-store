import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { PERMISSION_GROUPS } from "./permissions.js";
import { ActivityQuery, IdParams, InviteBody, MemberUpdateBody, RoleBody, RoleUpdateBody } from "./staff.schemas.js";
import {
  createRole,
  deleteRole,
  getMember,
  inviteMember,
  listActivity,
  listMembers,
  listRoles,
  memberLink,
  removeInvite,
  revokeMemberSessions,
  updateMember,
  updateRole,
} from "./staff.service.js";

/** /v1/admin/staff — reading needs staff:read, changes need staff:write (see admin.routes.ts). */
const r = Router();

const ctxOf = (req: any) => ({ ip: req.ip as string | undefined, ua: (req.get?.("user-agent") as string | undefined) ?? undefined });

// What can be given to a role, grouped for the role editor.
r.get("/permissions", (_req, res) => {
  res.json({ groups: PERMISSION_GROUPS });
});

r.get("/roles", asyncHandler(async (_req, res) => {
  res.json({ roles: await listRoles() });
}));

r.post("/roles", validate({ body: RoleBody }), asyncHandler(async (req, res) => {
  res.status(201).json(await createRole(req.access!, req.body));
}));

r.patch("/roles/:id", validate({ params: IdParams, body: RoleUpdateBody }), asyncHandler(async (req, res) => {
  res.json(await updateRole(req.access!, String(req.params.id), req.body));
}));

r.delete("/roles/:id", validate({ params: IdParams }), asyncHandler(async (req, res) => {
  res.json(await deleteRole(req.access!, String(req.params.id)));
}));

r.get("/members", asyncHandler(async (_req, res) => {
  res.json({ members: await listMembers() });
}));

r.get("/members/:id", validate({ params: IdParams }), asyncHandler(async (req, res) => {
  res.json(await getMember(String(req.params.id)));
}));

// Adds a member who sets their own password from the invite link (valid 7 days).
r.post("/members", validate({ body: InviteBody }), asyncHandler(async (req, res) => {
  res.status(201).json(await inviteMember(req.access!, req.body, ctxOf(req)));
}));

r.patch("/members/:id", validate({ params: IdParams, body: MemberUpdateBody }), asyncHandler(async (req, res) => {
  res.json(await updateMember(req.access!, String(req.params.id), req.body));
}));

// New invite link (not joined yet) or password-reset link (joined).
r.post("/members/:id/link", validate({ params: IdParams }), asyncHandler(async (req, res) => {
  res.json(await memberLink(req.access!, String(req.params.id), ctxOf(req)));
}));

r.post("/members/:id/sessions/revoke", validate({ params: IdParams }), asyncHandler(async (req, res) => {
  res.json(await revokeMemberSessions(req.access!, String(req.params.id)));
}));

r.delete("/members/:id", validate({ params: IdParams }), asyncHandler(async (req, res) => {
  res.json(await removeInvite(req.access!, String(req.params.id)));
}));

export default r;

/** /v1/admin/activity — everyone's changes, newest first (activity:read). */
export const activity = Router();

activity.get("/", validate({ query: ActivityQuery }), asyncHandler(async (req, res) => {
  res.json(await listActivity(req.query as any));
}));
