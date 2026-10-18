// The vault (الخزنة): its state, the owner's 20-minute session, moving older
// masters in, its own log, and the Windows launcher buyers download.
import { api } from "./http";

const BASE = "/admin/vault";

export type LicenceKey = { kid: string; x: string; y: string };
export type LauncherRelease = { id: string; version: string; bytes: number; sha256: string; notes: string | null; isActive: boolean; createdAt: string };

export type VaultState = {
  /** A vault is set up (VAULT_URL on the server). */
  on: boolean;
  reachable?: boolean;
  version?: string;
  uptimeSeconds?: number;
  kid?: string | null;
  error?: string;
  session: { expiresAt: string } | null;
  files: { inDatabase: number; inVault: number };
  keys: LicenceKey[];
  launchers: LauncherRelease[];
  checkEveryDays: number;
  offlineGraceDays: number;
  launcherMaxMb: number;
};

export type VaultEvent = { at: string; event: string; [k: string]: unknown };

export async function getVault() {
  return (await api.get(BASE)).data as VaultState;
}
export async function openVaultSession(password: string, code: string) {
  return (await api.post(`${BASE}/session`, { password, code })).data as { expiresAt: string };
}
export async function closeVaultSession() {
  return (await api.delete(`${BASE}/session`)).data as { ok: true };
}
export async function moveFilesIn() {
  return (await api.post(`${BASE}/move-in`)).data as { moved: number };
}
export async function vaultEvents() {
  return ((await api.get(`${BASE}/events`)).data as { events: VaultEvent[] }).events;
}
export async function uploadLauncher(file: File, version: string, notes: string, onProgress?: (pct: number) => void) {
  const form = new FormData();
  form.append("version", version);
  form.append("notes", notes);
  form.append("file", file);
  const res = await api.post(`${BASE}/launchers`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
  return res.data as LauncherRelease;
}
export async function deleteLauncher(id: string) {
  return (await api.delete(`${BASE}/launchers/${id}`)).data as { ok: true };
}
