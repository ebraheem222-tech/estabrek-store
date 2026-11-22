import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetHits } from "../lib/hitLimit.js";
import { seal } from "../lib/secretBox.js";
import { DISCORD_SECRET, discordCounts, forgetDiscordCounts, inviteCode, isCallback, readState, signState, socialOf } from "../lib/socialSignIn.js";

// Signing in with Discord and linking Steam (wave G2 of docs/sites-300-plan.ar.md): a game server's players come in
// with the accounts they play with. Discord: the shop sends them to Discord with a state the server signed, and the
// code Discord gives back is traded (with the owner's client secret, kept as a secret) for who they are; only an email
// Discord vouches for opens or makes an account. Steam: linked to an account already signed in, and Steam's answer is
// asked back of Steam before it is believed. Discord and Steam are played here (fetch): nothing leaves this computer.

const CLIENT = "1234567890123456789";
const SHOP = "https://shop.test";
const DISCORD_BACK = `${SHOP}/api/account/discord/callback`;
const STEAM_BACK = `${SHOP}/api/account/steam/callback`;
const EMAILS = ["noor.discord@example.com", "kept.discord@example.com", "other.discord@example.com"];
const STEAM_OPENID = "https://steamcommunity.com/openid/login";

/** What Discord and Steam say, per test. */
const said = {
  discordUser: { id: "80351110224678912", email: "Noor.Discord@Example.com", verified: true, global_name: "Noor", username: "noor" } as Record<string, unknown>,
  token: true,
  steamValid: true,
  asked: [] as Array<{ url: string; body: string }>,
};
function playServices() {
  const real = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    const body = init?.body ? String(init.body) : "";
    if (u === "https://discord.com/api/v10/oauth2/token") {
      said.asked.push({ url: u, body });
      return said.token ? Response.json({ access_token: "discord-access", token_type: "Bearer" }) : Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    if (u === "https://discord.com/api/v10/users/@me") {
      said.asked.push({ url: u, body: String((init?.headers as Record<string, string>)?.authorization ?? "") });
      return Response.json(said.discordUser);
    }
    if (u === STEAM_OPENID) {
      said.asked.push({ url: u, body });
      return new Response(`ns:http://specs.openid.net/auth/2.0\nis_valid:${said.steamValid}\n`);
    }
    if (u.startsWith("https://discord.com/api/v10/invites/")) {
      said.asked.push({ url: u, body });
      return u.includes("/invites/dewcity?") ? Response.json({ code: "dewcity", approximate_presence_count: 340, approximate_member_count: 2100 }) : Response.json({ message: "Unknown Invite" }, { status: 404 });
    }
    return real(url, init);
  });
}

let siteId = "";
let originalHeader: unknown = null;
async function setSignIn(signIn: Record<string, unknown> | null) {
  const header = { ...((originalHeader as Record<string, unknown>) ?? {}), ...(signIn ? { signIn } : {}) };
  await prisma.siteSettings.update({ where: { id: siteId }, data: { header: header as Prisma.InputJsonValue } });
}
const keepSecret = () => prisma.fnSecret.upsert({ where: { name: DISCORD_SECRET }, create: { name: DISCORD_SECRET, sealed: seal("the-discord-secret") }, update: { sealed: seal("the-discord-secret") } });
const stateOf = (url: string) => new URL(url).searchParams.get("state")!;
async function discordState(back = "/city") {
  const res = await request(app).post("/v1/customer/auth/discord/start").send({ redirectUri: DISCORD_BACK, back }).expect(200);
  return stateOf(res.body.url);
}
/** Steam's answer, as it sends the shopper back (its own fields, then ours). */
function steamAnswer(startUrl: string, steamId = "76561198000000001") {
  const ret = new URL(startUrl).searchParams.get("openid.return_to")!;
  const claimed = `https://steamcommunity.com/openid/id/${steamId}`;
  return {
    state: new URL(ret).searchParams.get("state")!,
    params: {
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "id_res",
      "openid.op_endpoint": STEAM_OPENID,
      "openid.claimed_id": claimed,
      "openid.identity": claimed,
      "openid.return_to": ret,
      "openid.response_nonce": "2026-11-22T12:00:00Zabc",
      "openid.assoc_handle": "1234567890",
      "openid.signed": "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
      "openid.sig": "c2lnbmF0dXJl",
    } as Record<string, string>,
  };
}

beforeAll(async () => {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  siteId = s.id;
  originalHeader = s.header;
  await prisma.siteSettings.update({ where: { id: siteId }, data: { customerAccountsEnabled: true } });
  forgetFeatures();
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  await prisma.fnSecret.deleteMany({ where: { name: DISCORD_SECRET } });
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  await prisma.fnSecret.deleteMany({ where: { name: DISCORD_SECRET } });
  await prisma.siteSettings.update({ where: { id: siteId }, data: { header: (originalHeader ?? Prisma.JsonNull) as Prisma.InputJsonValue, customerAccountsEnabled: false } });
  forgetFeatures();
});
beforeEach(() => {
  forgetHits();
  forgetDiscordCounts();
  said.discordUser = { id: "80351110224678912", email: "Noor.Discord@Example.com", verified: true, global_name: "Noor", username: "noor" };
  said.token = true;
  said.steamValid = true;
  said.asked = [];
  playServices();
});
afterEach(() => vi.unstubAllGlobals());

describe("The owner's settings, the state and the addresses", () => {
  test("off until switched on; Discord only with a client ID that is one", () => {
    expect(socialOf(undefined)).toEqual({ discord: { on: false, clientId: null }, steam: { on: false } });
    expect(socialOf({ signIn: { discord: { enabled: true, clientId: "abc" } } }).discord).toEqual({ on: false, clientId: null });
    expect(socialOf({ signIn: { discord: { enabled: true, clientId: ` ${CLIENT} ` }, steam: { enabled: true } } })).toEqual({ discord: { on: true, clientId: CLIENT }, steam: { on: true } });
  });

  test("only the shop's own callbacks are come back to", () => {
    expect(isCallback("discord", DISCORD_BACK)).toBe(true);
    expect(isCallback("discord", "http://localhost:3920/api/account/discord/callback")).toBe(true);
    expect(isCallback("discord", STEAM_BACK)).toBe(false);
    expect(isCallback("discord", `${DISCORD_BACK}?x=1`)).toBe(false);
    expect(isCallback("discord", "javascript:alert(1)//api/account/discord/callback")).toBe(false);
    expect(isCallback("steam", "https://user:pw@shop.test/api/account/steam/callback")).toBe(false);
  });

  test("a state is ours, of its kind, ten minutes long and used once; where it goes back is a path on the shop", () => {
    const now = Date.now();
    const s = signState({ k: "discord", r: DISCORD_BACK, b: "https://evil.test/x" }, now);
    expect(readState(s, "discord", now + 60_000)).toMatchObject({ k: "discord", r: DISCORD_BACK, b: "/" });
    expect(() => readState(s, "discord", now + 60_000)).toThrow("SOCIAL_STATE");
    const t = signState({ k: "discord", r: DISCORD_BACK, b: "//evil.test" }, now);
    expect(() => readState(t, "steam", now)).toThrow("SOCIAL_STATE");
    expect(() => readState(t, "discord", now + 11 * 60_000)).toThrow("SOCIAL_STATE");
    const [body, sig] = signState({ k: "discord", r: DISCORD_BACK, b: "/city" }, now).split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), b: "/account" })).toString("base64url");
    expect(() => readState(`${forged}.${sig}`, "discord", now)).toThrow("SOCIAL_STATE");
    expect(() => readState("nonsense", "discord", now)).toThrow("SOCIAL_STATE");
  });

  test("a Discord server's online count, from its invite, asked at most every five minutes", async () => {
    expect(inviteCode("https://discord.gg/dewcity")).toBe("dewcity");
    expect(inviteCode("https://discord.com/invite/dewcity/")).toBe("dewcity");
    expect(inviteCode("https://evil.test/dewcity")).toBeNull();
    const now = Date.now();
    expect(await discordCounts("https://discord.gg/dewcity", now)).toEqual({ online: 340, members: 2100 });
    expect(await discordCounts("https://discord.gg/dewcity", now + 60_000)).toEqual({ online: 340, members: 2100 });
    expect(said.asked.filter((a) => a.url.includes("/invites/"))).toHaveLength(1);
    expect(await discordCounts("https://discord.gg/nothere", now)).toBeNull();
    expect(await discordCounts("not a link", now)).toBeNull();
  });
});

describe("Signing in with Discord", () => {
  test("off: no way in", async () => {
    await setSignIn(null);
    const res = await request(app).post("/v1/customer/auth/discord/start").send({ redirectUri: DISCORD_BACK, back: "/city" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("DISCORD_OFF");
  });

  test("on: to Discord with a signed state; back with a code, a new account by its verified email, signed in", async () => {
    await setSignIn({ discord: { enabled: true, clientId: CLIENT } });
    expect((await request(app).post("/v1/customer/auth/discord/start").send({ redirectUri: "https://evil.test/api/account/discord/callback?x", back: "/" })).body.error).toBe("SOCIAL_RETURN");
    const start = await request(app).post("/v1/customer/auth/discord/start").send({ redirectUri: DISCORD_BACK, back: "/city" }).expect(200);
    const url = new URL(start.body.url);
    expect(url.origin + url.pathname).toBe("https://discord.com/oauth2/authorize");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ client_id: CLIENT, response_type: "code", scope: "identify email", redirect_uri: DISCORD_BACK });

    // The owner hasn't kept the secret yet.
    const noSecret = await request(app).post("/v1/customer/auth/discord").send({ code: "discord-code-123", state: url.searchParams.get("state") });
    expect(noSecret.status).toBe(409);
    expect(noSecret.body.error).toBe("DISCORD_SECRET");
    await keepSecret();

    const state = await discordState("/city");
    const res = await request(app).post("/v1/customer/auth/discord").send({ code: "discord-code-123", state }).expect(200);
    expect(res.body).toMatchObject({ isNew: true, back: "/city", user: { email: "noor.discord@example.com", name: "Noor", discordId: "80351110224678912", steamId: null } });
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    // Traded with the owner's secret, for the address the state named.
    const traded = new URLSearchParams(said.asked.find((a) => a.url.endsWith("/oauth2/token"))!.body);
    expect(Object.fromEntries(traded)).toEqual({ client_id: CLIENT, client_secret: "the-discord-secret", grant_type: "authorization_code", code: "discord-code-123", redirect_uri: DISCORD_BACK });
    expect(said.asked.find((a) => a.url.endsWith("/users/@me"))!.body).toBe("Bearer discord-access");
    // The session works.
    await request(app).post("/v1/customer/auth/refresh").send({ refreshToken: res.body.refreshToken }).expect(200);

    // The same state never signs in twice.
    const again = await request(app).post("/v1/customer/auth/discord").send({ code: "discord-code-123", state });
    expect(again.status).toBe(400);
    expect(again.body.error).toBe("SOCIAL_STATE");
    // Next time: the same account, by its Discord.
    said.discordUser = { ...said.discordUser, email: "noor.discord@example.com" };
    const back = await request(app).post("/v1/customer/auth/discord").send({ code: "discord-code-456", state: await discordState("/") }).expect(200);
    expect(back.body).toMatchObject({ isNew: false, user: { id: res.body.user.id } });
  });

  test("an account with the same email is the one signed in (linked from now on); one Discord account per email", async () => {
    await setSignIn({ discord: { enabled: true, clientId: CLIENT } });
    await keepSecret();
    const kept = await prisma.user.create({ data: { email: "kept.discord@example.com", name: "Kept" } });
    said.discordUser = { id: "80351110224678999", email: "kept.discord@example.com", verified: true, username: "kept" };
    const res = await request(app).post("/v1/customer/auth/discord").send({ code: "discord-code-789", state: await discordState() }).expect(200);
    expect(res.body).toMatchObject({ isNew: false, user: { id: kept.id, name: "Kept", discordId: "80351110224678999" } });
    // Another Discord account with the same email isn't let in.
    said.discordUser = { id: "80351110224670000", email: "kept.discord@example.com", verified: true, username: "other" };
    const other = await request(app).post("/v1/customer/auth/discord").send({ code: "discord-code-000", state: await discordState() });
    expect(other.status).toBe(409);
    expect(other.body.error).toBe("DISCORD_OTHER_ACCOUNT");
  });

  test("an email Discord doesn't vouch for, or Discord saying no: nobody signed in", async () => {
    await setSignIn({ discord: { enabled: true, clientId: CLIENT } });
    await keepSecret();
    said.discordUser = { id: "80351110224671111", email: "other.discord@example.com", verified: false, username: "x" };
    const unverified = await request(app).post("/v1/customer/auth/discord").send({ code: "discord-code-111", state: await discordState() });
    expect(unverified.status).toBe(401);
    expect(unverified.body.error).toBe("DISCORD_EMAIL");
    said.token = false;
    const refused = await request(app).post("/v1/customer/auth/discord").send({ code: "discord-code-222", state: await discordState() });
    expect(refused.status).toBe(401);
    expect(refused.body.error).toBe("DISCORD_REFUSED");
    expect(await prisma.user.count({ where: { email: "other.discord@example.com" } })).toBe(0);
  });
});

describe("Linking Steam", () => {
  async function signedIn(email: string) {
    const user = await prisma.user.upsert({ where: { email }, create: { email, name: "Player" }, update: {} });
    await setSignIn({ discord: { enabled: true, clientId: CLIENT } });
    await keepSecret();
    said.discordUser = { id: email === EMAILS[0] ? "80351110224678912" : "80351110224678999", email, verified: true, username: "p" };
    const res = await request(app).post("/v1/customer/auth/discord").send({ code: "discord-code-steam", state: await discordState() }).expect(200);
    return { id: user.id, auth: { Authorization: `Bearer ${res.body.accessToken}` } };
  }

  test("off: no link", async () => {
    const me = await signedIn(EMAILS[0]);
    const res = await request(app).post("/v1/customer/me/steam/start").set(me.auth).send({ returnTo: STEAM_BACK, back: "/account" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("STEAM_OFF");
  });

  test("on: to Steam and back; Steam's answer asked back of Steam; kept on the account the state names, and unlinked", async () => {
    const me = await signedIn(EMAILS[0]);
    await setSignIn({ discord: { enabled: true, clientId: CLIENT }, steam: { enabled: true } });
    await request(app).post("/v1/customer/me/steam/start").send({ returnTo: STEAM_BACK }).expect(401);
    expect((await request(app).post("/v1/customer/me/steam/start").set(me.auth).send({ returnTo: "https://evil.test/steam" })).body.error).toBe("SOCIAL_RETURN");
    const start = await request(app).post("/v1/customer/me/steam/start").set(me.auth).send({ returnTo: STEAM_BACK, back: "/account" }).expect(200);
    const url = new URL(start.body.url);
    expect(url.origin + url.pathname).toBe(STEAM_OPENID);
    expect(url.searchParams.get("openid.mode")).toBe("checkid_setup");
    expect(url.searchParams.get("openid.realm")).toBe(SHOP);
    expect(url.searchParams.get("openid.return_to")!.startsWith(`${STEAM_BACK}?state=`)).toBe(true);

    // Steam says its own answer isn't real.
    said.steamValid = false;
    const fake = steamAnswer(start.body.url);
    const refused = await request(app).post("/v1/customer/auth/steam").send(fake);
    expect(refused.status).toBe(401);
    expect(refused.body.error).toBe("STEAM_REFUSED");

    said.steamValid = true;
    const next = await request(app).post("/v1/customer/me/steam/start").set(me.auth).send({ returnTo: STEAM_BACK, back: "/account" }).expect(200);
    const answer = steamAnswer(next.body.url);
    const linked = await request(app).post("/v1/customer/auth/steam").send(answer).expect(200);
    expect(linked.body).toMatchObject({ back: "/account", user: { id: me.id, steamId: "76561198000000001" } });
    const asked = new URLSearchParams(said.asked.filter((a) => a.url === STEAM_OPENID).at(-1)!.body);
    expect(asked.get("openid.mode")).toBe("check_authentication");
    expect(asked.get("openid.sig")).toBe("c2lnbmF0dXJl");
    expect((await request(app).get("/v1/customer/me").set(me.auth).expect(200)).body.steamId).toBe("76561198000000001");
    // The same answer never links twice.
    expect((await request(app).post("/v1/customer/auth/steam").send(answer)).body.error).toBe("SOCIAL_STATE");

    // Someone else's state can't be pointed at a claimed id that isn't Steam's.
    const odd = steamAnswer((await request(app).post("/v1/customer/me/steam/start").set(me.auth).send({ returnTo: STEAM_BACK }).expect(200)).body.url);
    odd.params["openid.claimed_id"] = "https://evil.test/openid/id/76561198000000002";
    expect((await request(app).post("/v1/customer/auth/steam").send(odd)).body.error).toBe("STEAM_REFUSED");

    // One Steam account per account.
    const other = await signedIn(EMAILS[1]);
    await setSignIn({ discord: { enabled: true, clientId: CLIENT }, steam: { enabled: true } });
    const theirs = await request(app).post("/v1/customer/me/steam/start").set(other.auth).send({ returnTo: STEAM_BACK }).expect(200);
    const taken = await request(app).post("/v1/customer/auth/steam").send(steamAnswer(theirs.body.url));
    expect(taken.status).toBe(409);
    expect(taken.body.error).toBe("STEAM_OTHER_ACCOUNT");

    const unlinked = await request(app).delete("/v1/customer/me/steam").set(me.auth).expect(200);
    expect(unlinked.body.steamId).toBeNull();
  });
});
