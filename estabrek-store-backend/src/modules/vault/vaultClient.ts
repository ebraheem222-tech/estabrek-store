/**
 * The backend's side of the vault (src/vault): signed requests to VAULT_URL.
 * No VAULT_URL = no vault: masters stay encrypted in the database and the
 * backend makes copies and signs licences itself (phase 2 behaviour).
 */
import { env } from "../../config/env.js";
import { AppError } from "../../utils/httpError.js";
import { signRequest } from "./requestSigning.js";
import type { FileTypeRule, Probe } from "../protected/marks.js";
import type { PublicKeyInfo } from "../protected/licenceToken.js";

export const vaultOn = () => Boolean(env.VAULT_URL && env.VAULT_SHARED_SECRET);

type Opts = { body?: Buffer | Record<string, unknown>; session?: string | null; headers?: Record<string, string>; timeoutMs?: number; raw?: boolean };

async function call(method: string, path: string, opts: Opts = {}) {
  if (!vaultOn()) throw new AppError(503, "VAULT_NOT_SET", "The vault isn't set up (VAULT_URL)");
  const body = opts.body === undefined ? Buffer.alloc(0) : Buffer.isBuffer(opts.body) ? opts.body : Buffer.from(JSON.stringify(opts.body), "utf8");
  const headers: Record<string, string> = {
    ...signRequest(env.VAULT_SHARED_SECRET!, method, path, body),
    "content-type": Buffer.isBuffer(opts.body) ? "application/octet-stream" : "application/json",
    ...(opts.session ? { "x-vault-session": opts.session } : {}),
    ...(opts.headers ?? {}),
  };
  let res: globalThis.Response;
  try {
    res = await fetch(`${env.VAULT_URL!.replace(/\/+$/, "")}${path}`, {
      method,
      headers,
      body: body.length ? new Uint8Array(body) : undefined,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
  } catch {
    throw new AppError(503, "VAULT_UNREACHABLE", "The vault didn't answer (asleep, or the address is wrong)");
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    const code = err.error ?? `VAULT_${res.status}`;
    if (code === "VAULT_LOCKED") throw new AppError(423, "VAULT_LOCKED", "Open a vault session first");
    if (code === "NOT_READY") throw new AppError(409, "NOT_READY", "This product's files aren't uploaded yet");
    if (res.status === 401 || res.status === 403) throw new AppError(502, "VAULT_REFUSED", `The vault refused the backend (${code}): check VAULT_SHARED_SECRET and VAULT_ALLOW_IPS`);
    throw new AppError(502, code, "The vault couldn't do it");
  }
  return res;
}

export async function vaultHealth() {
  if (!vaultOn()) return { on: false as const };
  try {
    const res = await fetch(`${env.VAULT_URL!.replace(/\/+$/, "")}/health`, { signal: AbortSignal.timeout(8000) });
    const h = (await res.json()) as { ok: boolean; version: string; uptimeSeconds: number };
    // A signed call too: the address answers, but does it accept us?
    const keys = await vaultPublicKeys();
    return { on: true as const, reachable: true, version: h.version, uptimeSeconds: h.uptimeSeconds, kid: keys[0]?.kid ?? null };
  } catch (e) {
    return { on: true as const, reachable: false, error: e instanceof AppError ? e.code : "VAULT_UNREACHABLE" };
  }
}

export async function vaultPublicKeys() {
  return ((await (await call("GET", "/v1/public-key")).json()) as { keys: PublicKeyInfo[] }).keys;
}

export async function vaultOpenSession(admin: { id: string; email: string }, ip: string | null) {
  return (await (await call("POST", "/v1/sessions", { body: { adminId: admin.id, email: admin.email, ip } })).json()) as { id: string; expiresAt: string };
}
export async function vaultSessionOpen(id: string) {
  return (await (await call("GET", `/v1/sessions/${encodeURIComponent(id)}`)).json()) as { open: boolean; expiresAt?: string };
}
export async function vaultCloseSession(id: string) {
  await call("DELETE", `/v1/sessions/${encodeURIComponent(id)}`);
}

export type VaultFile = { id: string; productId: string; name: string; ext: string; bytes: number; sha256: string; probe: Probe; position: number; createdAt: string };

export async function vaultAddFile(session: string, productId: string, name: string, data: Buffer) {
  const res = await call("POST", "/v1/files", { body: data, session, timeoutMs: 120_000, headers: { "x-product-id": productId, "x-file-name": Buffer.from(name, "utf8").toString("base64url") } });
  return (await res.json()) as VaultFile;
}
export async function vaultRemoveFile(session: string, id: string) {
  await call("DELETE", `/v1/files/${encodeURIComponent(id)}`, { session });
}
export async function vaultAudit(session: string) {
  return ((await (await call("GET", "/v1/audit", { session })).json()) as { events: Array<Record<string, unknown>> }).events;
}

export async function vaultPackage(input: { productId: string; licenceId: string; serial: string; markId: string; orderShortId: string; title: string; slug?: string | null; issuedAt: Date; customTypes: FileTypeRule[] }) {
  const res = await call("POST", "/v1/package", { body: { ...input, issuedAt: input.issuedAt.toISOString() }, timeoutMs: 120_000 });
  const name = Buffer.from(res.headers.get("x-file-name") ?? "", "base64url").toString("utf8") || `protected-${input.orderShortId}.zip`;
  return { filename: name, data: Buffer.from(await res.arrayBuffer()) };
}

export async function vaultSign(payload: Record<string, unknown>) {
  return ((await (await call("POST", "/v1/sign", { body: { payload } })).json()) as { token: string; kid: string }).token;
}
