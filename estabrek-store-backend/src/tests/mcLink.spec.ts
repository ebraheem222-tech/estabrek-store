import { afterAll, beforeAll, describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetFeatures } from "../lib/features.js";
import { LINK_ASSETS } from "../lib/gameLink.js";
import { readPlainZip } from "../lib/plainZip.js";

// A Minecraft server's link (wave G5b of docs/sites-300-plan.ar.md), with the database: the survival site installed
// from the admin's own files. Its panel gives the Paper plugin (built by estabrek-link/build.mjs) with its properties
// stamped: the site's name, where to call, a new key. With it the server says hello, links a player's Minecraft
// account by the code from «حسابي», and gives what was bought in the site's own store: each purchase waiting to be
// given, whose buyer linked an account, handed over once with its package's command and the player's name in it,
// then given or failed with why; one stuck being given goes back after 10 minutes. The site has no whitelist (it has
// no applications). Requests to /v1/admin without a token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
let featureId = "";
let ids: Obj = {};
let key = "";
const users: Record<string, string> = {};
const EMAILS = ["sara@mc-link-spec.test", "omar@mc-link-spec.test"];
const SARA_UUID = "0f9a6c1e-2b3d-4e5f-8a7b-6c5d4e3f2a1b";

/** The plugin as the panel's download gives it: the jar's files, and its properties. */
async function download() {
  const res = await request(app).post(`${at}/site-panels/${featureId}/today/link/download`).send({ lang: "en" }).buffer(true).parse((r, done) => {
    const chunks: Buffer[] = [];
    r.on("data", (c: Buffer) => chunks.push(c));
    r.on("end", () => done(null, Buffer.concat(chunks)));
  });
  expect(res.status).toBe(200);
  expect(res.headers["content-disposition"]).toBe('attachment; filename="site-link.jar"');
  expect(res.headers["content-type"]).toContain("application/java-archive");
  const files = readPlainZip(res.body as Buffer);
  const props = files.find((f) => f.name === "site-link.properties")!.data.toString("utf8");
  const values = Object.fromEntries(props.split("\n").filter((l) => /^\w+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
  return { files, props, values };
}
const link = (p: string, body: Obj, k = key) => request(app).post(`/v1/link${p}`).set("Authorization", `Bearer ${k}`).send(body);
const packageId = async (slug: string) => (await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: ids.table.packages, slug } })).id;
const statusOf = async (id: string) => ((await prisma.collectionItem.findUniqueOrThrow({ where: { id } })).data as Obj).status;
/** A purchase as the paid function leaves it: theirs, waiting to be given (or another status). */
async function purchase(slug: string, who: string, status = "waiting", pkg?: string) {
  const row = await prisma.collectionItem.create({
    data: { collectionId: ids.table.purchases, slug: `p-${slug}`, status: "PUBLISHED", ownerId: users[who], data: { package: { ar: slug }, packageId: pkg ?? (await packageId("star-rank")), price: 20, status } },
  });
  return row.id;
}

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: true } });
  forgetFeatures();
  const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile("site-minecraft-survival", { lang: "ar" }), lang: "ar" });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
  featureId = res.body.id;
  ids = (await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } }))!.template!.ids;
  await request(app).put(`${at}/my-features/${featureId}`).send({ enabled: true }).expect(200);
  for (const [i, email] of EMAILS.entries()) users[i ? "omar" : "sara"] = (await prisma.user.create({ data: { email, name: i ? "Omar" : "Sara" } })).id;
});
afterAll(async () => {
  if (featureId) await request(app).post(`${at}/my-features/${featureId}/remove`).send({ rows: "delete" });
  if (featureId) await prisma.siteLink.deleteMany({ where: { featureId } });
  await prisma.gameLinkCode.deleteMany({ where: { userId: { in: Object.values(users) } } });
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  forgetFeatures();
  forgetFeatureGate();
});

describe("A Minecraft server's link", () => {
  test("the panel's download: the plugin with its properties stamped, its classes as built, never the platform's name; no whitelist", async () => {
    const before = (await request(app).get(`${at}/site-panels/${featureId}/today?lang=en`).expect(200)).body;
    expect(before.parts.find((p: Obj) => p.kind === "link")).toMatchObject({ game: "minecraft", made: false, whitelist: false, whitelistable: false, canDownload: true });
    expect(JSON.stringify(before.parts)).not.toContain("whitelistShow");
    const got = await download();
    key = got.values.key;
    expect(got.files.map((f) => f.name)).toEqual(["META-INF/MANIFEST.MF", "plugin.yml", "site-link.properties", "site/link/Json.class", "site/link/SiteLink.class"]);
    expect(key).toMatch(/^lk_[A-Za-z0-9_-]{30,}$/);
    expect(got.values.name).toBe("وادي السنديان");
    expect(got.values.api).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/v1\/link$/);
    expect(got.values.lang).toBe("en");
    for (const f of got.files) expect(f.data.toString("latin1")).not.toMatch(/estabrek|__SITE_/i);
    // Everything but its properties is the blank plugin, byte for byte.
    const blank = readPlainZip(fs.readFileSync(path.join(LINK_ASSETS, "minecraft", "site-link.jar")));
    for (const f of blank.filter((b) => b.name !== "site-link.properties")) expect(got.files.find((g) => g.name === f.name)!.data.equals(f.data), f.name).toBe(true);
    expect(blank.find((b) => b.name === "plugin.yml")!.data.toString()).toContain("main: site.link.SiteLink");
  });

  test("hello, and a Minecraft account linked by the code from «حسابي»", async () => {
    expect((await link("/hello", { game: "minecraft", version: "1.21.4", players: 7 }).expect(200)).body).toEqual({ whitelist: false });
    const code = (await request(app).post("/v1/customer/me/game-link").set("Authorization", `Bearer ${signCustomerToken(users.sara)}`).expect(200)).body.code;
    const done = (await link("/claim", { code, game: "minecraft", account: { id: SARA_UUID, name: "Sara_K" }, lang: "en" }).expect(200)).body;
    expect(done.ok).toBe(true);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: users.sara }, select: { minecraftUuid: true, minecraftName: true } })).toEqual({ minecraftUuid: SARA_UUID, minecraftName: "Sara_K" });
  });

  test("purchases given: each handed over once with its command, only a linked buyer's; then given, or failed with why", async () => {
    const star = await purchase("star", "sara");
    const unpaid = await purchase("unpaid", "sara", "unpaid");
    const omars = await purchase("omar", "omar");
    const nothing = await purchase("nothing", "sara", "waiting", "no-such-package");
    const first = (await link("/deliveries", {}).expect(200)).body;
    expect(first).toEqual({ items: [{ id: star, command: "lp user Sara_K parent add star" }] });
    expect(await statusOf(star)).toBe("giving");
    // Not paid, and not linked: left alone. No command to give it: failed at once, with why.
    expect([await statusOf(unpaid), await statusOf(omars)]).toEqual(["unpaid", "waiting"]);
    const failedRow = await prisma.collectionItem.findUniqueOrThrow({ where: { id: nothing } });
    expect(failedRow.data).toMatchObject({ status: "failed", note: { en: "The package has no command to give it" } });
    // Handed over once.
    expect((await link("/deliveries", {}).expect(200)).body).toEqual({ items: [] });
    // The server's word: given. A word on one it wasn't handed changes nothing.
    expect((await link("/deliveries/report", { items: [{ id: star, ok: true }, { id: omars, ok: true }] }).expect(200)).body).toEqual({ given: 1, failed: 0 });
    expect([await statusOf(star), await statusOf(omars)]).toEqual(["given", "waiting"]);

    // Omar links his account: his purchase goes; the command failed on the server, and says why.
    const code = (await request(app).post("/v1/customer/me/game-link").set("Authorization", `Bearer ${signCustomerToken(users.omar)}`).expect(200)).body.code;
    await link("/claim", { code, game: "minecraft", account: { id: "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b", name: "OmarMC" } }).expect(200);
    expect((await link("/deliveries", {}).expect(200)).body.items).toEqual([{ id: omars, command: "lp user OmarMC parent add star" }]);
    expect((await link("/deliveries/report", { items: [{ id: omars, ok: false, error: "Unknown command" }] }).expect(200)).body).toEqual({ given: 0, failed: 1 });
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: omars } })).data).toMatchObject({ status: "failed", note: { ar: "Unknown command" } });
  });

  test("one stuck being given (the server went down) goes back after 10 minutes and is handed over again", async () => {
    const stuck = await purchase("stuck", "sara");
    expect((await link("/deliveries", {}).expect(200)).body.items.map((i: Obj) => i.id)).toEqual([stuck]);
    await prisma.$executeRaw`UPDATE "CollectionItem" SET "updatedAt" = now() - interval '11 minutes' WHERE "id" = ${stuck}`;
    expect((await link("/deliveries", {}).expect(200)).body.items.map((i: Obj) => i.id)).toEqual([stuck]);
    expect(await statusOf(stuck)).toBe("giving");
    // A key that isn't the site's gets nothing.
    await link("/deliveries", {}, "lk_not-a-real-key-at-all-xxxxxxxxxx").expect(401);
  });
});
