// Team & permissions: members (owners and team members), roles, activity log.
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type PermissionGroup = {
  key: string;
  label: string;
  permissions: Array<{ key: string; label: string }>;
};

export type StaffRole = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  members: number;
  updatedAt?: string;
};

export type MemberStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  owner: boolean;
  status: MemberStatus;
  staffRole: { id: string; name: string } | null;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  lastIp: string | null;
  createdAt: string;
  activeSessions: number;
};

export type MemberSession = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type MemberEvent = { id: string; type: string; ip: string | null; userAgent: string | null; at: string };

export type ActivityRow = {
  id: string;
  area: string;
  verb: "create" | "update" | "delete" | "action" | string;
  method: string;
  path: string;
  targetId: string | null;
  fields?: string[];
  ip: string | null;
  userAgent?: string | null;
  createdAt: string;
  actorEmail?: string | null;
  adminUser?: { id: string; name: string; email: string } | null;
};

export type MemberDetails = {
  member: TeamMember;
  sessions: MemberSession[];
  events: MemberEvent[];
  activity: ActivityRow[];
};

/** A one-time link: "invite" (set a password and join) or "reset" (new password). */
export type MemberLink = { token: string; expiresAt: string; kind: "invite" | "reset"; /** Also sent to the member by email. */ emailed?: boolean };

export async function getPermissionGroups() {
  const res = await api.get(ENDPOINTS.admin.staff.permissions);
  return (res.data?.groups ?? []) as PermissionGroup[];
}

export async function listRoles() {
  const res = await api.get(ENDPOINTS.admin.staff.roles);
  return (res.data?.roles ?? []) as StaffRole[];
}

export async function createRole(body: { name: string; description?: string | null; permissions: string[] }) {
  const res = await api.post(ENDPOINTS.admin.staff.roles, body);
  return res.data as StaffRole;
}

export async function updateRole(id: string, body: { name?: string; description?: string | null; permissions?: string[] }) {
  const res = await api.patch(ENDPOINTS.admin.staff.role(id), body);
  return res.data as StaffRole;
}

export async function deleteRole(id: string) {
  await api.delete(ENDPOINTS.admin.staff.role(id));
}

export async function listMembers() {
  const res = await api.get(ENDPOINTS.admin.staff.members);
  return (res.data?.members ?? []) as TeamMember[];
}

export async function getMember(id: string) {
  const res = await api.get(ENDPOINTS.admin.staff.member(id));
  return res.data as MemberDetails;
}

export async function inviteMember(body: { name: string; email: string; phone?: string | null; staffRoleId?: string | null; owner?: boolean }) {
  const res = await api.post(ENDPOINTS.admin.staff.members, body);
  return res.data as { member: TeamMember; invite: MemberLink };
}

export async function updateMember(
  id: string,
  body: { name?: string; phone?: string | null; staffRoleId?: string | null; status?: "ACTIVE" | "SUSPENDED"; owner?: boolean },
) {
  const res = await api.patch(ENDPOINTS.admin.staff.member(id), body);
  return res.data as TeamMember;
}

export async function memberLink(id: string) {
  const res = await api.post(ENDPOINTS.admin.staff.memberLink(id), {});
  return res.data as MemberLink;
}

export async function revokeMemberSessions(id: string) {
  const res = await api.post(ENDPOINTS.admin.staff.memberRevokeSessions(id), {});
  return res.data as { ok: true; revoked: number };
}

export async function removeInvite(id: string) {
  await api.delete(ENDPOINTS.admin.staff.member(id));
}

export async function listActivity(params: { take?: number; cursor?: string | null; adminUserId?: string; area?: string }) {
  const res = await api.get(ENDPOINTS.admin.activity, {
    params: {
      take: params.take ?? 50,
      cursor: params.cursor || undefined,
      adminUserId: params.adminUserId || undefined,
      area: params.area || undefined,
    },
  });
  return res.data as { rows: ActivityRow[]; nextCursor: string | null };
}
