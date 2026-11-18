/**
 * Signing in with Google (stage 2, item 3; admin → الزبائن → الدخول بحساب Google, header.signIn.google). The shop shows
 * Google's own button (Google Identity Services); Google hands the shop a signed ID token, which comes here and is
 * believed only when:
 *  - it is signed (RS256) with one of Google's published keys (https://www.googleapis.com/oauth2/v3/certs, kept for
 *    as long as Google says, fetched again for a key it doesn't know);
 *  - it was made by Google (`iss`) for this shop's own client ID (`aud`), and hasn't run out (`exp`);
 *  - Google vouches for the email (`email_verified`).
 * Only Google's own address is ever called. The client ID is public (it is in the shop's page); there is no secret.
 */
import crypto from "node:crypto";

export const GOOGLE_CERTS = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
/** A Google OAuth web client's ID: "1234567890-abc123.apps.googleusercontent.com". */
export const CLIENT_ID = /^[0-9]{6,30}-[a-z0-9]{8,64}\.apps\.googleusercontent\.com$/;
const SKEW_S = 60;

export type GoogleSettings = { on: boolean; clientId: string | null };

/** The owner's settings (header.signIn.google), as the shop reads them too: on only with a client ID that is one. */
export function googleOf(header: unknown): GoogleSettings {
  const g = (header as { signIn?: { google?: { enabled?: unknown; clientId?: unknown } } } | null)?.signIn?.google;
  const clientId = typeof g?.clientId === "string" && CLIENT_ID.test(g.clientId.trim()) ? g.clientId.trim() : null;
  return { on: g?.enabled === true && !!clientId, clientId };
}

export type GoogleProfile = { sub: string; email: string; name: string };
/** Why a token isn't believed: GOOGLE_TOKEN (not one, or not Google's), GOOGLE_EXPIRED, GOOGLE_AUDIENCE (another site's), GOOGLE_EMAIL. */
export class GoogleTokenError extends Error {}

type Keys = { at: number; maxAgeMs: number; byKid: Map<string, crypto.KeyObject> };
let keys: Keys | null = null;
/** For the tests: the keys are fetched again. */
export const forgetGoogleKeys = () => {
  keys = null;
};

async function fetchKeys(): Promise<Keys> {
  const res = await fetch(GOOGLE_CERTS, { signal: AbortSignal.timeout(5000), redirect: "error" });
  if (!res.ok) throw new Error(`Google's keys answered ${res.status}`);
  const body = (await res.json()) as { keys?: Array<Record<string, unknown>> };
  const byKid = new Map<string, crypto.KeyObject>();
  for (const k of body.keys ?? []) {
    if (k.kty !== "RSA" || typeof k.kid !== "string" || typeof k.n !== "string" || typeof k.e !== "string") continue;
    byKid.set(k.kid, crypto.createPublicKey({ key: { kty: "RSA", n: k.n, e: k.e }, format: "jwk" }));
  }
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600);
  return { at: Date.now(), maxAgeMs: Math.min(Math.max(maxAge, 300), 24 * 3600) * 1000, byKid };
}

async function keyFor(kid: string): Promise<crypto.KeyObject | null> {
  const fresh = keys && Date.now() - keys.at < keys.maxAgeMs;
  if (!fresh) keys = await fetchKeys();
  const found = keys!.byKid.get(kid);
  // A key it doesn't know (Google turned its keys): asked again, at most once a minute.
  if (!found && Date.now() - keys!.at > 60_000) {
    keys = await fetchKeys();
    return keys.byKid.get(kid) ?? null;
  }
  return found ?? null;
}

const part = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as Record<string, unknown>;

/** The shopper Google vouches for, from the token Google's button gave the shop; throws GoogleTokenError otherwise. */
export async function verifyGoogleToken(credential: string, clientId: string, now = Date.now()): Promise<GoogleProfile> {
  const bits = credential.split(".");
  if (bits.length !== 3 || credential.length > 4096) throw new GoogleTokenError("GOOGLE_TOKEN");
  let head: Record<string, unknown>;
  let claims: Record<string, unknown>;
  try {
    head = part(bits[0]);
    claims = part(bits[1]);
  } catch {
    throw new GoogleTokenError("GOOGLE_TOKEN");
  }
  if (head.alg !== "RS256" || typeof head.kid !== "string") throw new GoogleTokenError("GOOGLE_TOKEN");
  const key = await keyFor(head.kid);
  if (!key) throw new GoogleTokenError("GOOGLE_TOKEN");
  const signed = crypto.verify("RSA-SHA256", Buffer.from(`${bits[0]}.${bits[1]}`), key, Buffer.from(bits[2], "base64url"));
  if (!signed) throw new GoogleTokenError("GOOGLE_TOKEN");
  if (!ISSUERS.has(String(claims.iss))) throw new GoogleTokenError("GOOGLE_TOKEN");
  if (claims.aud !== clientId) throw new GoogleTokenError("GOOGLE_AUDIENCE");
  const exp = Number(claims.exp);
  if (!Number.isFinite(exp) || exp * 1000 < now - SKEW_S * 1000) throw new GoogleTokenError("GOOGLE_EXPIRED");
  const iat = Number(claims.iat);
  if (Number.isFinite(iat) && iat * 1000 > now + 5 * 60_000) throw new GoogleTokenError("GOOGLE_TOKEN");
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  const verified = claims.email_verified === true || claims.email_verified === "true";
  if (!email || !verified) throw new GoogleTokenError("GOOGLE_EMAIL");
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  if (!/^[0-9]{1,64}$/.test(sub)) throw new GoogleTokenError("GOOGLE_TOKEN");
  const name = typeof claims.name === "string" ? claims.name.trim().slice(0, 120) : "";
  return { sub, email, name };
}
