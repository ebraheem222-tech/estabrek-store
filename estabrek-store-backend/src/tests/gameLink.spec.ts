import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetFeatures } from "../lib/features.js";
import { readPlainZip } from "../lib/plainZip.js";

// A game server's link (wave G5 of docs/sites-300-plan.ar.md), with the database: the FiveM roleplay site installed
// from the admin's own files. Its panel gives the link stamped with a new key (a new download stops the old key);
// with it the game server says hello, asks whether a player connecting may come in while the whitelist is on (by
// their Discord, their Steam, or the shop account their game account is linked to), and links a game account by the
// code a signed-in player took from «حسابي». Requests to /v1/admin without a token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
let featureId = "";
let ids: Obj = {};
let sara = "";
let saraId = "";
let key = "";
const EMAILS = ["sara@link-spec.test", "omar@link-spec.test"];

/** The link as the panel's download gives it: the files, and the key in its config. */
async function download() {
  const res = await request(app).post(`${at}/site-panels/${featureId}/today/link/download`).send({ lang: "ar" }).buffer(true).parse((r, done) => {
    const chunks: Buffer[] = [];
    r.on("data", (c: Buffer) => chunks.push(c));
    r.on("end", () => done(null, Buffer.concat(chunks)));
  });
  expect(res.status).toBe(200);
  expect(res.headers["content-disposition"]).toBe('attachment; filename="site-link.zip"');
  const files = readPlainZip(res.body as Buffer);
  const config = files.find((f) => f.name === "site-link/config.lua")!.data.toString();
  return { files, config, key: /Config\.Key = "([^"]+)"/.exec(config)![1] };
}
const link = (path: string, body: Obj, k = key) => request(app).post(`/v1/link${path}`).set("Authorization", `Bearer ${k}`).send(body);

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: true } });
  forgetFeatures();
  const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile("site-fivem-rp", { lang: "ar" }), lang: "ar" });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
  featureId = res.body.id;
  ids = (await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } }))!.template!.ids;
  await request(app).put(`${at}/my-features/${featureId}`).send({ enabled: true }).expect(200);
  const player = await prisma.user.create({ data: { email: EMAILS[0], name: "Sara Khalil" } });
  saraId = player.id;
  sara = signCustomerToken(player.id);
});
afterAll(async () => {
  if (featureId) await request(app).post(`${at}/my-features/${featureId}/remove`).send({ rows: "delete" });
  if (featureId) await prisma.siteLink.deleteMany({ where: { featureId } });
  await prisma.gameLinkCode.deleteMany({ where: { userId: saraId } });
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  forgetFeatures();
  forgetFeatureGate();
});

describe("A game server's link", () => {
  test("the panel's download: stamped with the site's name, a new key and where to call, never the platform's name", async () => {
    const before = (await request(app).get(`${at}/site-panels/${featureId}/today?lang=en`).expect(200)).body.parts.find((p: Obj) => p.kind === "link");
    expect(before).toMatchObject({ game: "fivem", made: false, lastSeenAt: null, whitelist: false, canDownload: true });
    const got = await download();
    key = got.key;
    expect(got.files.map((f) => f.name).sort()).toEqual(["site-link/config.lua", "site-link/fxmanifest.lua", "site-link/server.lua"]);
    expect(key).toMatch(/^lk_[A-Za-z0-9_-]{30,}$/);
    expect(got.config).toContain('Config.Name = "مدينة الندى"');
    expect(got.config).toMatch(/Config\.Api = "http:\/\/127\.0\.0\.1:\d+\/v1\/link"/);
    expect(got.config).toContain('Config.Lang = "ar"');
    for (const f of got.files) expect(f.data.toString()).not.toMatch(/estabrek|__SITE_/i);
    // The key is kept hashed.
    const kept = await prisma.siteLink.findUniqueOrThrow({ where: { featureId } });
    expect(kept.keyHash).not.toContain(key);
    expect(kept.keyHint).toBe(key.slice(-4));
  });

  test("hello every minute: kept for the panel; a key that isn't a site's is refused", async () => {
    await link("/hello", { game: "fivem", version: "1.0.0", players: 42 }, "lk_not-a-real-key-at-all-xxxxxxxxxx").expect(401);
    expect((await link("/hello", { game: "fivem", version: "1.0.0", players: 42 }).expect(200)).body).toEqual({ whitelist: false });
    const part = (await request(app).get(`${at}/site-panels/${featureId}/today?lang=en`).expect(200)).body.parts.find((p: Obj) => p.kind === "link");
    expect(part).toMatchObject({ made: true, lastVersion: "1.0.0", lastPlayers: 42, keyHint: key.slice(-4) });
    expect(part.lastSeenAt).toBeTruthy();
  });

  test("the whitelist: everyone while off; on, those in its table by Discord, Steam or a linked account, the others in the owner's words", async () => {
    expect((await link("/whitelist", { ids: { license: "abc" }, lang: "ar" }).expect(200)).body).toEqual({ allowed: true });
    await request(app).put(`${at}/my-features/${featureId}/settings`).send({ values: { whitelistOn: true } }).expect(200);
    expect((await link("/hello", { game: "fivem", players: 1 }).expect(200)).body).toEqual({ whitelist: true });
    // Nobody in the table yet: refused, in the site's words.
    const no = (await link("/whitelist", { ids: { license: "abc", discord: "80351110224678912" }, lang: "ar" }).expect(200)).body;
    expect(no).toEqual({ allowed: false, message: "إنت مش عالوايتلست لسّا. قدّم من صفحة «التقديم» بموقعنا، وبعد ما تنقبل بتقدر تفوت." });
    // Accepted players, as the applications' function writes them.
    await prisma.collectionItem.createMany({ data: [
      { collectionId: ids.table.whitelist, slug: "w1", status: "PUBLISHED", data: { player: { ar: "Omar" }, discordId: { ar: "80351110224678912" } } },
      { collectionId: ids.table.whitelist, slug: "w2", status: "PUBLISHED", data: { player: { ar: "Rami" }, steamId: { ar: "76561198265685624" } } },
      { collectionId: ids.table.whitelist, slug: "w3", status: "PUBLISHED", data: { player: { ar: "Sara" }, email: EMAILS[0] } },
    ] });
    expect((await link("/whitelist", { ids: { discord: "80351110224678912" } }).expect(200)).body.allowed).toBe(true);
    expect((await link("/whitelist", { ids: { steam: "110000112345678" } }).expect(200)).body.allowed).toBe(true);
    // Sara's game account isn't linked yet: her license says nothing.
    expect((await link("/whitelist", { ids: { license: "sara-license" }, lang: "en" }).expect(200)).body).toMatchObject({ allowed: false });
    // The owner's own words.
    await request(app).put(`${at}/my-features/${featureId}/settings`).send({ values: { whitelistMessage: { ar: "قدّم بالديسكورد أول", en: "Apply on Discord first" } } }).expect(200);
    expect((await link("/whitelist", { ids: { license: "nobody" }, lang: "en" }).expect(200)).body).toEqual({ allowed: false, message: "Apply on Discord first" });
  });

  test("a game account linked by the code from «حسابي»: once, to one shop account; then the whitelist knows it", async () => {
    const shopper = (p: string) => request(app).get(`/v1/customer/me${p}`).set("Authorization", `Bearer ${sara}`);
    expect((await shopper("/game-link").expect(200)).body).toEqual({ available: true, fivem: null, minecraft: null });
    const code = (await request(app).post("/v1/customer/me/game-link").set("Authorization", `Bearer ${sara}`).expect(200)).body;
    expect(code.code).toMatch(/^\d{6}$/);
    // A wrong code, then hers: linked, in the site's language.
    expect((await link("/claim", { code: "000000", game: "fivem", account: { id: "sara-license", name: "SaraK" }, lang: "ar" }).expect(200)).body.ok).toBe(false);
    const done = (await link("/claim", { code: code.code, game: "fivem", account: { id: "sara-license", name: "SaraK" }, lang: "ar" }).expect(200)).body;
    expect(done).toEqual({ ok: true, message: "تم! حساب اللعبة صار مربوط بحساب Sara بالموقع." });
    expect((await shopper("/game-link").expect(200)).body).toEqual({ available: true, fivem: "SaraK", minecraft: null });
    // The code is used up.
    expect((await link("/claim", { code: code.code, game: "fivem", account: { id: "sara-license", name: "SaraK" } }).expect(200)).body.ok).toBe(false);
    // Her license now names her: she is in the table by her email.
    expect((await link("/whitelist", { ids: { license: "sara-license" } }).expect(200)).body.allowed).toBe(true);
    // Another shopper can't take her game account.
    const omar = await prisma.user.create({ data: { email: EMAILS[1], name: "Omar" } });
    const theirs = (await request(app).post("/v1/customer/me/game-link").set("Authorization", `Bearer ${signCustomerToken(omar.id)}`).expect(200)).body;
    expect((await link("/claim", { code: theirs.code, game: "fivem", account: { id: "sara-license", name: "x" }, lang: "en" }).expect(200)).body).toEqual({ ok: false, message: "This game account is linked to another account on the site." });
    // Let go.
    expect((await request(app).delete("/v1/customer/me/game-link/fivem").set("Authorization", `Bearer ${sara}`).expect(200)).body.fivem).toBeNull();
  });

  test("a new download makes a new key, and the old one stops", async () => {
    const old = key;
    const again = await download();
    expect(again.key).not.toBe(old);
    await link("/hello", { game: "fivem" }, old).expect(401);
    await link("/hello", { game: "fivem" }, again.key).expect(200);
    // A switched-off site's key answers no more.
    await request(app).put(`${at}/my-features/${featureId}`).send({ enabled: false }).expect(200);
    await link("/hello", { game: "fivem" }, again.key).expect(401);
  });
});
