// src/api/adminSecurity.api.ts
import { api, getRefreshToken } from "./http";
import { ENDPOINTS } from "./endpoints";

export type SessionStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export type AdminSession = {
  id: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type SecurityEvent = {
  id: string;
  type: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: any;
  createdAt: string;
};

export async function listSessions(params?: { take?: number; skip?: number; status?: SessionStatus }) {
  const res = await api.get(ENDPOINTS.admin.account.sessions, { params });
  return res.data as { items: AdminSession[]; total: number; take: number; skip: number };
}

export async function revokeSession(id: string) {
  const res = await api.post(ENDPOINTS.admin.account.revokeSession(id), {});
  return res.data as { ok: true };
}

export function getCurrentSessionIdFromRefresh(): string | null {
  const rt = getRefreshToken();
  if (!rt) return null;
  const [sid] = rt.split(".");
  return sid || null;
}

export async function revokeOtherSessions(currentSessionId: string) {
  const res = await api.post(ENDPOINTS.admin.account.revokeOthers, { currentSessionId });
  return res.data as { ok: true; count: number };
}

export async function listSecurityEvents(params?: { take?: number; skip?: number; type?: string }) {
  const res = await api.get(ENDPOINTS.admin.account.securityEvents, { params });
  return res.data as { items: SecurityEvent[]; total: number; take: number; skip: number };
}
