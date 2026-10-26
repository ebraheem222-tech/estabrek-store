// Server & sign-in rules (admin → حماية السيرفر).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type SecurityPolicy = {
  login: { maxFailed: number; lockMinutes: number };
  session: { lifetimeDays: number; idleHours: number; accessMinutes: number };
  twoFactor: { required: "off" | "owners" | "everyone" };
  otp: { ttlMinutes: number; maxAttempts: number };
  alerts: { newDevice: boolean };
  rateLimit: { windowSeconds: number; perPath: number; perIp: number; authWindowSeconds: number; auth: number };
  ip: { adminAllow: string[]; adminBlock: string[]; siteBlock: string[] };
  /** Traffic protection with decay (admin → حماية الضغط). */
  pressure: PressureSettings;
};

export type PressureSettings = {
  mode: "off" | "watch" | "on";
  halfLifeSeconds: number;
  capacity: number;
  slowAt: number;
  blockAt: number;
  blockMinutes: number;
  maxBlockHours: number;
  weightRead: number;
  weightWrite: number;
  weightAuth: number;
  weightFail: number;
  allow: string[];
};

export type TrafficClient = {
  ip: string;
  pressure: number;
  peak: number;
  hits: number;
  firstAt: number;
  lastAt: number;
  lastPath: string;
  lastMethod: string;
  userAgent: string;
  status: "ok" | "slowed" | "blocked" | "would-block";
  blockedUntil: number | null;
  strikes: number;
};

export type IpBlock = { id: string; ip: string; reason: string | null; until: string | null; createdAt: string; adminUserId: string | null };

export type TrafficView = {
  settings: PressureSettings;
  now: number;
  yourIp: string;
  tracked: number;
  counts: { blocked: number; wouldBlock: number; slowed: number };
  clients: TrafficClient[];
  blocks: IpBlock[];
};

export type BackupRun = {
  id: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  trigger: "auto" | "manual" | string;
  startedAt: string;
  finishedAt: string | null;
  sizeBytes: number | null;
  tables: number | null;
  rows: number | null;
  storage: string | null;
  /** Still stored (older ones are removed). */
  location: string | null;
  fileName: string | null;
  error: string | null;
};

export type BackupsView = {
  enabled: boolean;
  storage: { kind: string; ready: boolean };
  /** BACKUP_ENCRYPTION_KEY is set (otherwise a key made from JWT_SECRET). */
  customKey: boolean;
  keep: number;
  hour: number;
  maxUploadMb: number;
  last: BackupRun | null;
  runs: BackupRun[];
};

export async function getBackups() {
  const res = await api.get(ENDPOINTS.admin.systemBackups.base);
  return res.data as BackupsView;
}

export async function runBackupNow() {
  const res = await api.post(ENDPOINTS.admin.systemBackups.run, {}, { validateStatus: (s) => s < 600 });
  return res.data as BackupRun;
}

/** A fresh backup file downloaded to this computer. */
export async function downloadBackup() {
  const res = await api.get(ENDPOINTS.admin.systemBackups.download, { responseType: "blob", timeout: 120_000 });
  const disposition = String(res.headers["content-disposition"] ?? "");
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "estabrek-backup.estbk";
  return { blob: res.data as Blob, name };
}

export async function backupLink(id: string) {
  const res = await api.get(ENDPOINTS.admin.systemBackups.link(id));
  return res.data as { url: string; fileName: string | null };
}

export async function getTraffic() {
  const res = await api.get(ENDPOINTS.admin.systemTraffic.base);
  return res.data as TrafficView;
}

export async function blockIp(body: { ip: string; minutes: number | null; reason?: string }) {
  const res = await api.post(ENDPOINTS.admin.systemTraffic.blocks, body);
  return res.data as IpBlock;
}

export async function unblockIp(id: string) {
  await api.delete(ENDPOINTS.admin.systemTraffic.block(id));
}

export async function forgiveIp(ip: string) {
  const res = await api.post(ENDPOINTS.admin.systemTraffic.forgive, { ip });
  return res.data as { ok: true; cleared: boolean };
}

export type PolicyLimits = Record<string, { min: number; max: number }>;

export type SecurityAlert = {
  id: string;
  type: "NEW_DEVICE_LOGIN" | "ACCOUNT_LOCKED" | "LOGIN_FAILURE" | string;
  ip: string | null;
  userAgent: string | null;
  at: string;
  adminUser: { id: string; name: string; email: string } | null;
};

export type PolicyRevision = { id: string; changed: string[]; adminUserId: string | null; adminName: string | null; createdAt: string };

export type SecurityPage = {
  policy: SecurityPolicy;
  defaults: SecurityPolicy;
  limits: PolicyLimits;
  fromDb: boolean;
  updatedAt: string | null;
  yourIp: string;
  ipLooksLikeProxy: boolean;
  revisions: PolicyRevision[];
  alerts: SecurityAlert[];
};

export async function getSecurityPolicy() {
  const res = await api.get(ENDPOINTS.admin.systemSecurity);
  return res.data as SecurityPage;
}

export async function saveSecurityPolicy(patch: Partial<SecurityPolicy>) {
  const res = await api.patch(ENDPOINTS.admin.systemSecurity, patch);
  return res.data as { policy: SecurityPolicy; changed: string[] };
}

export async function resetSecurityPolicy() {
  const res = await api.post(ENDPOINTS.admin.systemSecurityReset, {});
  return res.data as { policy: SecurityPolicy; changed: string[] };
}

export async function restoreSecurityPolicy(id: string) {
  const res = await api.post(ENDPOINTS.admin.systemSecurityRestore(id), {});
  return res.data as { policy: SecurityPolicy; changed: string[] };
}
