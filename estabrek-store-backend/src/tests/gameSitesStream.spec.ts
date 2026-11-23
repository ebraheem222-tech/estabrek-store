import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetTriggers, rowEventsInFlight, runFnSchedule } from "../lib/fnTriggers.js";
import { runTasks } from "../lib/tasks.js";
import { gameView, readSite } from "../lib/gameSites.js";
import { joinOf, readStatus, whereOf } from "../lib/gameStatus.js";
import { forgetTwitch } from "../lib/twitch.js";
import { forgetSiteSettings } from "../lib/siteSettings.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// More gamers' community sites (wave G7c2 of docs/sites-300-plan.ar.md), installed from the admin's own files. A
// looking-for-a-group board: a signed-in player's post goes on the board at once (a function publishes it), one open
// post each, read by everyone through the table's API by game; a post closes by itself after its time (a code step every
// quarter hour). A streamer's site opens with their Twitch channel, asked only with the site's own keys (Twitch is
// played here: nothing reaches it), with their followers' server, the week's streams, clips and sponsors.
// Requests to /v1/admin without a token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
const made: string[] = [];
const EMAIL = "sahm@lfg-spec.test";
// Made up, made at run time (never a key's whole shape in the file).
const ID = ["spec", "client", "id", "7788"].join("");
const SECRET = ["spec", "secret", "value", "9900"].join("");
let live = true;

const all = (n: Obj): Obj[] => [n, ...(n.children ?? []).flatMap(all)];
const served = async (slug: string) => (await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(slug)}&locale=en`).expect(200)).body;
async function install(key: string) {
  const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile(key, { lang: "en" }), lang: "en" });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
  const id: string = res.body.id;
  made.push(id);
  await request(app).put(`${at}/my-features/${id}`).send({ enabled: true }).expect(200);
  const ids = (await prisma.feature.findUnique({ where: { id }, select: { template: true } }))!.template!.ids as Obj;
  await prisma.page.updateMany({ where: { id: { in: Object.values(ids.page) as string[] } }, data: { status: "PUBLISHED" } });
  forgetSiteSettings();
  return { id, ids };
}
async function setAccounts(on: boolean) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: on } });
  forgetFeatures();
}
async function settled() {
  for (let quiet = 0; quiet < 3; ) {
    await new Promise((r) => setTimeout(r, 25));
    await runTasks();
    quiet = rowEventsInFlight() || (await prisma.task.count({ where: { kind: "function", status: { in: ["waiting", "running"] }, runAt: { lte: new Date() } } })) ? 0 : quiet + 1;
  }
}
async function published(ids: Obj, name: string) {
  const fn = await prisma.fn.findFirst({ where: { id: { in: Object.values(ids.function) as string[] }, name: { startsWith: name } } });
  expect(fn, name).not.toBeNull();
  await request(app).post(`${at}/functions/${fn!.id}/publish`).expect(200);
  forgetTriggers();
  return fn!;
}

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  startFunctions();
  forgetFeatures();
  forgetTwitch();
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const real = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (!u.startsWith("https://id.twitch.tv/") && !u.startsWith("https://api.twitch.tv/")) return real(url, init);
    if (u.startsWith("https://id.twitch.tv/oauth2/token")) {
      const form = new URLSearchParams(String(init?.body ?? ""));
      return form.get("client_id") === ID && form.get("client_secret") === SECRET ? Response.json({ access_token: "app-token-g7c2", expires_in: 5_000_000 }) : new Response("{}", { status: 403 });
    }
    if ((init?.headers as Record<string, string>)?.Authorization !== "Bearer app-token-g7c2") return new Response("{}", { status: 401 });
    if (u.includes("/helix/streams")) return Response.json({ data: live && u.includes("user_login=laithplays") ? [{ user_login: "laithplays", type: "live", title: "Building the castle with followers", game_name: "Minecraft", viewer_count: 1204, started_at: "2026-11-23T18:00:00Z", thumbnail_url: "https://static-cdn.jtvnw.net/previews-ttv/live_user_laithplays-{width}x{height}.jpg" }] : [] });
    return new Response("{}", { status: 404 });
  });
});
afterAll(async () => {
  vi.unstubAllGlobals();
  for (const id of made) {
    await request(app).post(`${at}/my-features/${id}/remove`).send({ rows: "delete" });
    await prisma.gameSample.deleteMany({ where: { featureId: id } });
  }
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.task.deleteMany({ where: { kind: "function" } });
  await setAccounts(false);
  forgetFeatures();
  forgetFeatureGate();
  forgetSiteSettings();
  forgetTriggers();
  forgetTwitch();
});

describe("A looking-for-a-group board", () => {
  test("a player's post goes on the board at once, one open post each, read by game; it closes by itself after its time", async () => {
    const { id, ids } = await install("site-lfg-board");
    await published(ids, "طلب جديد");
    const expire = await published(ids, "طلب خلص وقته");
    await setAccounts(true);
    const player = await prisma.user.create({ data: { email: EMAIL, name: "Sahm" } });
    const as = `Bearer ${signCustomerToken(player.id)}`;
    const table = (await prisma.collection.findUnique({ where: { id: ids.table.lfg }, select: { slug: true } }))!.slug;
    const post = { game: "valorant", mode: "Unrated 5v5", rank: "Gold 1", platform: "pc", region: "me", when: "now", mic: "yes", discordName: "sahm_tonight", note: "Need two more." };
    // Never its state; then the post itself, published by the site's function.
    expect((await request(app).post(`/v1/data/${table}`).set("Authorization", as).send({ values: { ...post, status: "closed" }, lang: "en" })).status).toBeGreaterThanOrEqual(400);
    const row = (await request(app).post(`/v1/data/${table}`).set("Authorization", as).send({ values: post, lang: "en" }).expect(201)).body;
    await settled();
    const stored = await prisma.collectionItem.findUnique({ where: { id: row.id } });
    expect([stored!.status, (stored!.data as Obj).status]).toEqual(["PUBLISHED", "open"]);
    // One open post each.
    expect((await request(app).post(`/v1/data/${table}`).set("Authorization", as).send({ values: { ...post, game: "fortnite" }, lang: "en" })).status).toBeGreaterThanOrEqual(400);
    // Everyone reads the open ones of a game, as the board's lists ask in the browser.
    const open = (await request(app).get(`/v1/data/${table}?status[is]=open&game[is]=valorant&shown=1&lang=en&sort=-createdAt`).expect(200)).body as { data: Obj[] };
    expect(open.data.map((r) => r.shown.discordName)).toEqual(["sahm_tonight", "sahm_aim"]);
    // The board's lists: one a game, read in the browser and again as posts come; its copy button copies the Discord name.
    const board = await served("/looking");
    const lists = all(board.tree.root).filter((n) => n.props?.live?.table === table && n.props.live.feed === "live");
    expect(lists.map((l) => l.props.live.where.find((x: Obj) => x.field === "game")?.value)).toEqual(["valorant", "fortnite", "rocketleague", "minecraft"]);
    expect(lists.every((l) => l.props.live.stream === true)).toBe(true);
    expect(JSON.stringify(lists[0])).toContain("{{row_discordName}}");

    // Its time: «now» is 3 hours. A «now» post 4 hours old closes; a «weekend» one 4 hours old and a fresh one stay open.
    const four = new Date(Date.now() - 4 * 3_600_000);
    await prisma.collectionItem.update({ where: { id: row.id }, data: { createdAt: four } });
    const ready = await prisma.collectionItem.findMany({ where: { collectionId: ids.table.lfg, deletedAt: null, NOT: { id: row.id } } });
    const weekend = ready.find((r) => (r.data as Obj).when === "weekend")!;
    await prisma.collectionItem.update({ where: { id: weekend.id }, data: { createdAt: four } });
    await prisma.fnTrigger.updateMany({ where: { fnId: expire.id, kind: "schedule" }, data: { nextAt: new Date(Date.now() - 60_000) } });
    await runFnSchedule(new Date());
    await settled();
    const after = await prisma.collectionItem.findMany({ where: { collectionId: ids.table.lfg, deletedAt: null } });
    const state = Object.fromEntries(after.map((r) => [(r.data as Obj).discordName?.en ?? (r.data as Obj).discordName?.ar, (r.data as Obj).status]));
    expect(state).toEqual({ sahm_tonight: "closed", sahm_aim: "open", layla_rl: "open", omar_builds: "open" });
    // Closed, a new post may come.
    expect((await request(app).post(`/v1/data/${table}`).set("Authorization", as).send({ values: { ...post, game: "fortnite" }, lang: "en" })).status).toBe(201);
    // The board's status is its Discord's.
    expect((await gameView(id))?.game).toBe("discord");
  }, 30_000);
});

describe("A streamer's site", () => {
  test("their Twitch channel as the status, asked only with the site's own keys; their server, week, clips and sponsors", async () => {
    expect(whereOf("twitch", "https://www.twitch.tv/LaithPlays")).toEqual({ channel: "laithplays" });
    expect(whereOf("twitch", "laithplays")).toEqual({ channel: "laithplays" });
    expect(whereOf("twitch", "https://evil.example/laithplays")).toBeNull();
    expect(joinOf("twitch", "laithplays")).toEqual({ href: "https://www.twitch.tv/laithplays", address: "twitch.tv/laithplays" });
    expect(await readStatus("twitch", "laithplays")).toMatchObject({ online: false, error: "No Twitch keys" });

    const { id, ids } = await install("site-gaming-streamer");
    const keys = (sites.siteFile("site-gaming-streamer", { lang: "en" }).settings as Obj[]).map((d) => d.key);
    expect(keys).toEqual(expect.arrayContaining(["game", "serverAddress", "twitchClientId", "twitchSecret"]));
    // Without keys the channel isn't asked, and nothing is kept.
    expect(await readSite(id)).toBeNull();
    expect(await prisma.gameSample.count({ where: { featureId: id } })).toBe(0);
    // With them: live, who watch, the stream's title and game; the way in is the channel.
    await request(app).put(`${at}/my-features/${id}/settings`).send({ values: { twitchClientId: ID, twitchSecret: SECRET } }).expect(200);
    forgetSiteSettings();
    expect(await readSite(id)).toMatchObject({ online: true, players: 1204, name: "Building the castle with followers", map: "Minecraft" });
    const view = (await gameView(id, Date.now() + 21_000))!;
    expect(view).toMatchObject({ game: "twitch", online: true, players: 1204, max: null, join: { href: "https://www.twitch.tv/laithplays" } });
    // Their followers' server, a Minecraft one with its own address, under the status.
    expect(view.servers?.map((x) => [x.key, x.game, x.join.address])).toEqual([["smp", "minecraft", "play.laithplays.example"]]);
    // Off the air: not live (kept, and drawn on the chart as such).
    live = false;
    forgetTwitch();
    await request(app).put(`${at}/my-features/${id}/settings`).send({ values: { twitchClientId: ID, twitchSecret: SECRET } }).expect(200);
    forgetSiteSettings();
    expect(await readSite(id)).toMatchObject({ online: false, players: null });

    const home = JSON.stringify(await served("/live"));
    for (const t of ["Building the castle with followers", "The castle fell in a second", "LAITH10", "The followers' server"]) expect(home).toContain(t);
    // Clips newest first.
    const clips = JSON.stringify(await served("/clips"));
    expect(clips.indexOf("The castle fell in a second")).toBeLessThan(clips.indexOf("The loudest scream ever"));
    expect(clips.indexOf("The loudest scream ever")).toBeLessThan(clips.indexOf("Five in one round"));
    expect(clips).toContain("https://www.twitch.tv/laithplays/clip/castle-falls");
    const week = JSON.stringify(await served("/schedule"));
    expect(week.indexOf("Saturday")).toBeLessThan(week.indexOf("Friday"));
    expect(ids.table.sponsors).toBeTruthy();
  }, 30_000);
});
