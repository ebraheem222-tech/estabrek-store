import crypto from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetHits } from "../lib/hitLimit.js";
import { GOOGLE_CERTS, GoogleTokenError, forgetGoogleKeys, googleOf, verifyGoogleToken } from "../lib/googleSignIn.js";

// Signing in with Google (stage 2, item 3): the shop hands the server the token Google's button gave it; the server
// believes it only when Google's own key signed it, for this shop's client ID, not run out, with an email Google
// vouches for. Then the shopper's account: the one linked to that Google account, else the one with its email
// (linked from now on), else a new one. Off until the owner sets it up. Google's keys are played here (fetch):
// nothing leaves this computer.

const CLIENT = "123456789012-abcdefgh12345678.apps.googleusercontent.com";
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const KID = "test-kid-1";
let certsAsked = 0;

/** A token as Google's button makes one (signed with Google's key, here the test's). */
function token(claims: Record<string, unknown> = {}, opts: { key?: crypto.KeyObject; kid?: string; alg?: string } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const head = Buffer.from(JSON.stringify({ alg: opts.alg ?? "RS256", kid: opts.kid ?? KID, typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ iss: "https://accounts.google.com", aud: CLIENT, sub: "1098765432109876543210", email: "Noor.Google@Example.com", email_verified: true, name: "Noor Haddad", iat: now, exp: now + 3600, ...claims })).toString("base64url");
  const sig = crypto.sign("RSA-SHA256", Buffer.from(`${head}.${body}`), opts.key ?? privateKey).toString("base64url");
  return `${head}.${body}.${sig}`;
}

function playGoogle() {
  const real = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    if (String(url) !== GOOGLE_CERTS) return real(url, init);
    certsAsked += 1;
    const jwk = publicKey.export({ format: "jwk" });
    return new Response(JSON.stringify({ keys: [{ ...jwk, kid: KID, alg: "RS256", use: "sig" }] }), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=19000" } });
  });
}

let siteId = "";
let originalHeader: unknown = null;
async function setGoogle(google: Record<string, unknown> | null) {
  const header = { ...((originalHeader as Record<string, unknown>) ?? {}), ...(google ? { signIn: { google } } : {}) };
  await prisma.siteSettings.update({ where: { id: siteId }, data: { header: header as Prisma.InputJsonValue } });
}
const signIn = (credential: string) => request(app).post("/v1/customer/auth/google").send({ credential });

beforeAll(async () => {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  siteId = s.id;
  originalHeader = s.header;
  await prisma.siteSettings.update({ where: { id: siteId }, data: { customerAccountsEnabled: true } });
  forgetFeatures();
  await prisma.user.deleteMany({ where: { email: { in: ["noor.google@example.com", "kept@example.com"] } } });
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: ["noor.google@example.com", "kept@example.com"] } } });
  await prisma.siteSettings.update({ where: { id: siteId }, data: { header: (originalHeader ?? Prisma.JsonNull) as Prisma.InputJsonValue, customerAccountsEnabled: false } });
  forgetFeatures();
});
beforeEach(() => {
  forgetGoogleKeys();
  forgetHits();
  certsAsked = 0;
  playGoogle();
});
afterEach(() => vi.unstubAllGlobals());

describe("Google's token", () => {
  test("believed when Google's key signed it for this client, not run out, with an email Google vouches for", async () => {
    expect(await verifyGoogleToken(token(), CLIENT)).toEqual({ sub: "1098765432109876543210", email: "noor.google@example.com", name: "Noor Haddad" });
    // Google's keys are kept for as long as Google says.
    await verifyGoogleToken(token(), CLIENT);
    expect(certsAsked).toBe(1);
  });

  test("anything else is refused, each with its reason", async () => {
    const no = async (credential: string, why: string) => {
      const e = await verifyGoogleToken(credential, CLIENT).catch((x) => x);
      expect(e, why).toBeInstanceOf(GoogleTokenError);
      expect(e.message, why).toBe(why);
    };
    await no(token({}, { key: other.privateKey }), "GOOGLE_TOKEN");
    await no(token({ aud: "999999999999-zzzzzzzz12345678.apps.googleusercontent.com" }), "GOOGLE_AUDIENCE");
    await no(token({ exp: Math.floor(Date.now() / 1000) - 600 }), "GOOGLE_EXPIRED");
    await no(token({ iss: "https://evil.example.com" }), "GOOGLE_TOKEN");
    await no(token({ email_verified: false }), "GOOGLE_EMAIL");
    await no(token({}, { alg: "HS256" }), "GOOGLE_TOKEN");
    await no(token({}, { kid: "unknown" }), "GOOGLE_TOKEN");
    await no("not.a.token", "GOOGLE_TOKEN");
    // A token with its claims changed after signing.
    const [h, , s] = token().split(".");
    await no(`${h}.${Buffer.from(JSON.stringify({ iss: "https://accounts.google.com", aud: CLIENT, sub: "1", email: "x@example.com", email_verified: true, exp: 9999999999 })).toString("base64url")}.${s}`, "GOOGLE_TOKEN");
  });

  test("the owner's settings: on only with a client ID that is one", () => {
    expect(googleOf(null)).toEqual({ on: false, clientId: null });
    expect(googleOf({ signIn: { google: { enabled: true, clientId: CLIENT } } })).toEqual({ on: true, clientId: CLIENT });
    expect(googleOf({ signIn: { google: { enabled: true, clientId: "my-client" } } })).toEqual({ on: false, clientId: null });
    expect(googleOf({ signIn: { google: { enabled: false, clientId: CLIENT } } })).toEqual({ on: false, clientId: CLIENT });
  });
});

describe("Signing in with Google", () => {
  test("off until the owner sets it up", async () => {
    await setGoogle(null);
    expect((await signIn(token()).expect(404)).body.error).toBe("GOOGLE_OFF");
    await setGoogle({ enabled: true, clientId: "not-a-client-id" });
    expect((await signIn(token()).expect(404)).body.error).toBe("GOOGLE_OFF");
  });

  test("a new shopper gets an account with Google's name; the same Google account opens it again; a bad token is refused", async () => {
    await setGoogle({ enabled: true, clientId: CLIENT });
    const first = (await signIn(token()).expect(200)).body;
    expect(first).toMatchObject({ isNew: true, user: { email: "noor.google@example.com", name: "Noor Haddad" } });
    expect(first.accessToken).toBeTruthy();
    expect(first.refreshToken).toBeTruthy();
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "noor.google@example.com" } });
    expect(stored).toMatchObject({ googleSub: "1098765432109876543210" });
    expect(stored.emailVerifiedAt).not.toBeNull();
    // Its access works like any shopper's.
    expect((await request(app).get("/v1/customer/me").set("Authorization", `Bearer ${first.accessToken}`).expect(200)).body.email).toBe("noor.google@example.com");
    // The same Google account, its email changed since: still that account.
    const again = (await signIn(token({ email: "noor.new@example.com" })).expect(200)).body;
    expect(again).toMatchObject({ isNew: false, user: { id: stored.id, email: "noor.google@example.com" } });
    expect((await signIn(token({}, { key: other.privateKey })).expect(401)).body.error).toBe("GOOGLE_TOKEN");
    expect((await signIn(token({ email_verified: false })).expect(401)).body.error).toBe("GOOGLE_EMAIL");
  });

  test("an account made with an email code is the same account through Google; one linked to another Google account isn't opened; a stopped one isn't either", async () => {
    await setGoogle({ enabled: true, clientId: CLIENT });
    const kept = await prisma.user.create({ data: { email: "kept@example.com", name: "Kept Name" } });
    const out = (await signIn(token({ sub: "2000000000000000000001", email: "KEPT@example.com", name: "Google Name" })).expect(200)).body;
    expect(out).toMatchObject({ isNew: false, user: { id: kept.id, name: "Kept Name" } });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: kept.id } })).googleSub).toBe("2000000000000000000001");
    // Another Google account with the same email (an address given out again): refused.
    expect((await signIn(token({ sub: "3000000000000000000001", email: "kept@example.com" })).expect(409)).body.error).toBe("GOOGLE_OTHER_ACCOUNT");
    await prisma.user.update({ where: { id: kept.id }, data: { status: "SUSPENDED" } });
    expect((await signIn(token({ sub: "2000000000000000000001", email: "kept@example.com" })).expect(403)).body.error).toBe("ACCOUNT_SUSPENDED");
  });
});
