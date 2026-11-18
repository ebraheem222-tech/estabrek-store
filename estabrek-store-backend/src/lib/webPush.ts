/**
 * Web push by the standards alone, with Node's own crypto and no package:
 *  - RFC 8291: the message is encrypted for the one browser that asked for it (aes128gcm, RFC 8188),
 *    so the push service (Google's, Apple's, Mozilla's, Microsoft's) carries it without reading it;
 *  - RFC 8292 (VAPID): the shop signs each send with its own key, the key the browser was given
 *    when it said yes, so nobody else can send to that browser.
 * lib/push.ts keeps the keys and the subscriptions and does the sending; nothing here touches the
 * database. Only the push services' own sites are ever called (an endpoint is a shopper's word).
 */
import crypto from "node:crypto";

export type PushKeyPair = { publicKey: string; privateKey: string };
export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushResult = "sent" | "gone" | "retry" | "failed";

const b64 = (b: Buffer | Uint8Array) => Buffer.from(b).toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url");
const hkdf = (salt: Buffer, ikm: Buffer, info: Buffer, length: number) => Buffer.from(crypto.hkdfSync("sha256", ikm, salt, info, length));
const pad32 = (b: Buffer) => (b.length >= 32 ? b : Buffer.concat([Buffer.alloc(32 - b.length), b]));

/** The record size said in every message's header; the whole message is one record. */
const RECORD = 4096;
/** What a message may carry: a record, less its header (86), the delimiter (1) and the tag (16). */
export const PUSH_PAYLOAD_MAX = RECORD - 86 - 17;

/**
 * The push services a browser's endpoint may be on. A subscription names its endpoint, and the
 * server posts to it: anything else would let anyone have the server call any address.
 */
export const PUSH_HOSTS = ["fcm.googleapis.com", "android.googleapis.com", "updates.push.services.mozilla.com", "*.push.services.mozilla.com", "*.push.apple.com", "*.notify.windows.com"];

export function pushEndpointOk(endpoint: string, hosts: readonly string[] = PUSH_HOSTS): boolean {
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
  const host = u.hostname.toLowerCase();
  return hosts.some((h) => (h.startsWith("*.") ? host.endsWith(h.slice(1)) && host.length > h.length - 1 : host === h));
}

/** A browser's keys as it hands them: its public key (a P-256 point, 65 bytes) and its auth secret (16 bytes). */
export function pushKeysOk(p256dh: string, auth: string): boolean {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(p256dh) || !/^[A-Za-z0-9_-]+={0,2}$/.test(auth)) return false;
  const point = unb64(p256dh);
  if (point.length !== 65 || point[0] !== 4 || unb64(auth).length !== 16) return false;
  try {
    // On the curve, or the first send would fail.
    const e = crypto.createECDH("prime256v1");
    e.generateKeys();
    e.computeSecret(point);
    return true;
  } catch {
    return false;
  }
}

/** A new key pair for the shop (P-256): the public half as browsers take it, the private half as 32 bytes. */
export function makePushKeys(): PushKeyPair {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  return { publicKey: b64(ecdh.getPublicKey()), privateKey: b64(pad32(ecdh.getPrivateKey())) };
}

function signingKey(keys: PushKeyPair) {
  const point = unb64(keys.publicKey);
  return crypto.createPrivateKey({ key: { kty: "EC", crv: "P-256", d: keys.privateKey, x: b64(point.subarray(1, 33)), y: b64(point.subarray(33, 65)) }, format: "jwk" });
}

/**
 * The Authorization header of one send (RFC 8292): a token for the push service's own origin, good
 * for 12 hours, signed with the shop's key, and the shop's public key with it. `subject` is how the
 * push service can reach the shop: a "mailto:" or an https address.
 */
export function vapidAuth(endpoint: string, keys: PushKeyPair, subject: string, now = Date.now()): string {
  const head = b64(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64(Buffer.from(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const data = `${head}.${claims}`;
  const sig = crypto.sign("sha256", Buffer.from(data), { key: signingKey(keys), dsaEncoding: "ieee-p1363" });
  return `vapid t=${data}.${b64(sig)}, k=${keys.publicKey}`;
}

/**
 * The message, encrypted for one browser (RFC 8291, one aes128gcm record). A fresh key pair and salt
 * each time; `fixed` gives them (the standard's own example is checked with it).
 */
export function encryptPush(payload: Buffer, target: Pick<PushTarget, "p256dh" | "auth">, fixed?: { salt: Buffer; serverPrivate: Buffer }): Buffer {
  if (payload.length > PUSH_PAYLOAD_MAX) throw new Error("PUSH_TOO_LONG");
  const uaPublic = unb64(target.p256dh);
  const ecdh = crypto.createECDH("prime256v1");
  if (fixed) ecdh.setPrivateKey(fixed.serverPrivate);
  else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const salt = fixed?.salt ?? crypto.randomBytes(16);
  const ikm = hkdf(unb64(target.auth), ecdh.computeSecret(uaPublic), Buffer.concat([Buffer.from("WebPush: info\0", "latin1"), uaPublic, asPublic]), 32);
  const cek = hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0", "latin1"), 16);
  const nonce = hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0", "latin1"), 12);
  const c = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  // The last (and only) record ends with 0x02, and no padding.
  const sealed = Buffer.concat([c.update(Buffer.concat([payload, Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(RECORD, 16);
  header[20] = asPublic.length;
  return Buffer.concat([header, asPublic, sealed]);
}

export type SendOptions = {
  /** How long the push service keeps it while the phone is off (seconds). */
  ttl?: number;
  urgency?: "very-low" | "low" | "normal" | "high";
  /** A newer message with the same topic takes the place of one still waiting. */
  topic?: string;
  timeoutMs?: number;
  now?: number;
};

/**
 * One send. "gone": the browser said no or the phone forgot it (drop the subscription); "retry": the
 * push service is busy or down; "failed": it refused this one (a wrong key, too long).
 */
export async function sendPush(target: PushTarget, payload: unknown, keys: PushKeyPair, subject: string, opts: SendOptions = {}): Promise<{ result: PushResult; status: number; error?: string }> {
  if (!pushEndpointOk(target.endpoint)) return { result: "gone", status: 0, error: "Not a push service's address" };
  let body: Buffer;
  try {
    body = encryptPush(Buffer.from(JSON.stringify(payload), "utf8"), target);
  } catch (e) {
    return { result: (e as Error).message === "PUSH_TOO_LONG" ? "failed" : "gone", status: 0, error: (e as Error).message.slice(0, 200) };
  }
  const headers: Record<string, string> = {
    Authorization: vapidAuth(target.endpoint, keys, subject, opts.now),
    TTL: String(Math.max(0, Math.round(opts.ttl ?? 4 * 24 * 3600))),
    Urgency: opts.urgency ?? "normal",
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
  };
  if (opts.topic) headers.Topic = opts.topic.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  try {
    const res = await fetch(target.endpoint, { method: "POST", headers, body: new Uint8Array(body), redirect: "manual", signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000) });
    const status = res.status;
    if (status >= 200 && status < 300) return { result: "sent", status };
    const said = (await res.text().catch(() => "")).slice(0, 200);
    if (status === 404 || status === 410) return { result: "gone", status, error: said || undefined };
    if (status === 429 || status >= 500) return { result: "retry", status, error: said || undefined };
    return { result: "failed", status, error: said || `The push service answered ${status}` };
  } catch (e) {
    return { result: "retry", status: 0, error: String((e as Error)?.message ?? e).slice(0, 200) };
  }
}
