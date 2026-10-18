/**
 * Requests between the backend and the vault are signed with a secret both
 * know (VAULT_SHARED_SECRET), even inside the private network or Tailscale: if
 * one side is ever reached, the other still checks. HMAC-SHA256 over the
 * method, path, time, a one-time nonce and the body's hash. No settings read
 * here: both sides use it.
 */
import crypto from "node:crypto";

export const MAX_SKEW_MS = 5 * 60_000;

export function canonical(method: string, path: string, ts: string, nonce: string, body: Buffer) {
  const hash = crypto.createHash("sha256").update(body).digest("hex");
  return `${method.toUpperCase()}\n${path}\n${ts}\n${nonce}\n${hash}`;
}

export function signRequest(secret: string, method: string, path: string, body: Buffer = Buffer.alloc(0), now = Date.now()) {
  const ts = String(now);
  const nonce = crypto.randomBytes(16).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(canonical(method, path, ts, nonce, body)).digest("base64url");
  return { "x-vault-ts": ts, "x-vault-nonce": nonce, "x-vault-sig": sig };
}

/** Checks a request; remembers nonces so the same request can't be played twice. */
export function makeVerifier(secret: string, maxNonces = 50_000) {
  const seen = new Map<string, number>();
  return (method: string, path: string, headers: Record<string, string | undefined>, body: Buffer, now = Date.now()): { ok: true } | { ok: false; why: string } => {
    const ts = headers["x-vault-ts"];
    const nonce = headers["x-vault-nonce"];
    const sig = headers["x-vault-sig"];
    if (!ts || !nonce || !sig) return { ok: false, why: "UNSIGNED" };
    const t = Number(ts);
    if (!Number.isFinite(t) || Math.abs(now - t) > MAX_SKEW_MS) return { ok: false, why: "STALE" };
    const want = crypto.createHmac("sha256", secret).update(canonical(method, path, ts, nonce, body)).digest();
    const got = Buffer.from(sig, "base64url");
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return { ok: false, why: "BAD_SIGNATURE" };
    if (seen.has(nonce)) return { ok: false, why: "REPLAYED" };
    seen.set(nonce, t);
    if (seen.size > maxNonces) {
      for (const [n, at] of seen) if (now - at > MAX_SKEW_MS) seen.delete(n);
    }
    return { ok: true };
  };
}

/** "100.64.0.0/10, 10.0.0.5": the addresses allowed to reach the vault (empty = any). */
export function ipAllowed(ip: string, list: string[]) {
  if (!list.length) return true;
  const v4 = (s: string) => {
    const m = /^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s.trim());
    return m ? ((+m[1] << 24) | (+m[2] << 16) | (+m[3] << 8) | +m[4]) >>> 0 : null;
  };
  const addr = v4(ip);
  return list.some((entry) => {
    const [base, bits] = entry.trim().split("/");
    if (addr == null || v4(base) == null) return ip.trim() === base;
    const n = bits == null ? 32 : Math.max(0, Math.min(32, Number(bits)));
    const mask = n === 0 ? 0 : (0xffffffff << (32 - n)) >>> 0;
    return ((addr & mask) >>> 0) === ((v4(base)! & mask) >>> 0);
  });
}
