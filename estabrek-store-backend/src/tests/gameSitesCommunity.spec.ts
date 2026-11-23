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
import { forgetRoblox, joinOf, readStatus, whereOf } from "../lib/gameStatus.js";
import { forgetSiteSettings } from "../lib/siteSettings.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// Gamers' community sites (wave G7c of docs/sites-300-plan.ar.md), installed from the admin's own files. Each opens
// with its community's own pulse: a Roblox game's players now (Roblox's public games API), a Discord server's online
// and members (its invite's public answer); nothing here reaches Roblox or Discord. A Roblox game's codes in force are
// read by everyone and leave by themselves after their last day; the coming events are in the order of their days and
// pass by themselves too; a member's card waits as a draft until the staff say yes; a clan's results come newest first.
// Requests to /v1/admin without a token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
const made: string[] = [];
const EMAIL = "maya@community-spec.test";
const PLACE = "1234567890";
const asked: string[] = [];

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
/** Everything a row's change started has run. */
async function settled() {
  for (let quiet = 0; quiet < 3; ) {
    await new Promise((r) => setTimeout(r, 25));
    await runTasks();
    quiet = rowEventsInFlight() || (await prisma.task.count({ where: { kind: "function", status: { in: ["waiting", "running"] }, runAt: { lte: new Date() } } })) ? 0 : quiet + 1;
  }
}
/** A site's function by its name, published (its triggers live). */
async function published(ids: Obj, name: string) {
  const fn = await prisma.fn.findFirst({ where: { id: { in: Object.values(ids.function) as string[] }, name: { startsWith: name } } });
  expect(fn, name).not.toBeNull();
  await request(app).post(`${at}/functions/${fn!.id}/publish`).expect(200);
  forgetTriggers();
  return fn!;
}
/** A function's daily schedule, due now: run as the store's clock would. */
async function runSchedule(fnId: string) {
  await prisma.fnTrigger.updateMany({ where: { fnId, kind: "schedule" }, data: { nextAt: new Date(Date.now() - 60_000) } });
  await runFnSchedule(new Date());
  await settled();
}
/** The pages' cached answers are renewed at most every 2 seconds after rows change (lib/rowWrites.ts refresh). */
const fresh = () => new Promise((r) => setTimeout(r, 2_100));
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  startFunctions();
  forgetFeatures();
  forgetRoblox();
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  // Roblox and Discord, played: their public answers for the samples' game and invites.
  const real = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith("https://apis.roblox.com/") || u.startsWith("https://games.roblox.com/") || u.startsWith("https://discord.com/api/")) asked.push(u);
    if (u === `https://apis.roblox.com/universes/v1/places/${PLACE}/universe`) return Response.json({ universeId: 4455667788 });
    if (u === "https://games.roblox.com/v1/games?universeIds=4455667788") return Response.json({ data: [{ id: 4455667788, rootPlaceId: Number(PLACE), name: "Cloud Tower", playing: 4321, visits: 9_870_000, maxPlayers: 30 }] });
    if (u.startsWith("https://apis.roblox.com/universes/v1/places/")) return Response.json({ errors: [{ message: "Not found" }] }, { status: 404 });
    if (u === "https://discord.com/api/v10/invites/gamersdiwan?with_counts=true") return Response.json({ code: "gamersdiwan", guild: { name: "Gamers' Diwan" }, approximate_presence_count: 128, approximate_member_count: 1450 });
    if (u === "https://discord.com/api/v10/invites/cloudtower?with_counts=true") return Response.json({ code: "cloudtower", guild: { name: "Cloud Tower" }, approximate_presence_count: 77, approximate_member_count: 900 });
    if (u === "https://discord.com/api/v10/invites/nighteagles?with_counts=true") return Response.json({ code: "nighteagles", guild: { name: "Night Eagles" }, approximate_presence_count: 9, approximate_member_count: 64 });
    if (u.startsWith("https://discord.com/api/v10/invites/")) return Response.json({ message: "Unknown Invite", code: 10006 }, { status: 404 });
    return real(url, init);
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
});

describe("A community's pulse", () => {
  test("a Roblox game by its link or its place, a Discord server by its invite: asked of their own APIs, joined by their links", async () => {
    expect(whereOf("roblox", "https://www.roblox.com/games/1234567890/Cloud-Tower")).toEqual({ place: PLACE });
    expect(whereOf("roblox", "roblox.com/games/1234567890")).toEqual({ place: PLACE });
    expect(whereOf("roblox", PLACE)).toEqual({ place: PLACE });
    expect(whereOf("roblox", "play.example.com")).toBeNull();
    expect(whereOf("discord", "https://discord.gg/gamersdiwan")).toEqual({ invite: "gamersdiwan" });
    expect(whereOf("discord", "discord.com/invite/gamersdiwan")).toEqual({ invite: "gamersdiwan" });
    expect(whereOf("discord", "gamersdiwan")).toEqual({ invite: "gamersdiwan" });
    expect(whereOf("discord", "https://evil.example/gamersdiwan")).toBeNull();
    expect(joinOf("roblox", PLACE)).toEqual({ href: `https://www.roblox.com/games/${PLACE}`, address: `roblox.com/games/${PLACE}` });
    expect(joinOf("discord", "gamersdiwan")).toEqual({ href: "https://discord.gg/gamersdiwan", address: "discord.gg/gamersdiwan" });

    expect(await readStatus("roblox", `https://www.roblox.com/games/${PLACE}/Cloud-Tower`)).toMatchObject({ online: true, players: 4321, max: null, name: "Cloud Tower" });
    expect(await readStatus("discord", "https://discord.gg/gamersdiwan")).toMatchObject({ online: true, players: 128, max: 1450, name: "Gamers' Diwan" });
    // A dead invite, a game that isn't there: down, with why.
    expect(await readStatus("discord", "https://discord.gg/gone")).toMatchObject({ online: false, error: "It answered 404" });
    expect(await readStatus("roblox", "999999999")).toMatchObject({ online: false });
    // Only their own fixed addresses were asked.
    expect(asked.every((u) => /^https:\/\/(apis\.roblox\.com|games\.roblox\.com|discord\.com\/api\/v10\/invites)\//.test(u))).toBe(true);
  });
});

describe("A Roblox game's community", () => {
  test("its players now on the home page, the codes in force for everyone, and a code past its last day leaving by itself", async () => {
    const { id, ids } = await install("site-roblox-community");
    expect((await readSite(id))?.online).toBe(true);
    const view = (await gameView(id, Date.now() + 21_000))!;
    expect(view).toMatchObject({ game: "roblox", online: true, players: 4321, max: null, name: "Cloud Tower", join: { href: `https://www.roblox.com/games/${PLACE}` }, discord: { online: 77, members: 900 } });
    const home = await served("/play");
    const [status] = all(home.tree.root).filter((n) => n.type === "gameStatus");
    expect(status.props.live).toMatchObject({ game: "roblox", players: 4321 });
    // Its Roblox group beside the Discord, and its line at the end: not Roblox's own, nothing sold here.
    const text = JSON.stringify(home);
    expect(text).toContain("https://www.roblox.com/communities/12345678/Cloud-Tower");
    expect(text).toContain("not part of or endorsed by Roblox Corporation");

    // The codes: read in the visitor's browser, the working ones (newest first), the expired ones below.
    const codesPage = await served("/codes");
    const lists = all(codesPage.tree.root).filter((n) => n.props?.live?.table);
    expect(lists.map((l) => l.props.live.where)).toEqual([[{ field: "status", op: "is", value: "active" }], [{ field: "status", op: "is", value: "expired" }]]);
    const table = lists[0].props.live.table as string;
    const open = (await request(app).get(`/v1/data/${table}?status[is]=active&shown=1&lang=en`).expect(200)).body as { data: Obj[] };
    expect(open.data.map((r) => r.shown.code).sort()).toEqual(["FLOOR100", "GOLDWINGS", "WINTER26"]);
    // Its copy button copies the row's own code.
    expect(JSON.stringify(lists[0])).toContain("{{row_code}}");

    // Every night: a working code past its last day leaves the working ones; one with no last day or a later one stays.
    const rows = await prisma.collectionItem.findMany({ where: { collectionId: ids.table.codes, deletedAt: null } });
    const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));
    await prisma.collectionItem.update({ where: { id: bySlug.floor100.id }, data: { data: { ...(bySlug.floor100.data as Obj), until: day(-1) } } });
    await prisma.collectionItem.update({ where: { id: bySlug.winter26.id }, data: { data: { ...(bySlug.winter26.data as Obj), until: day(2) } } });
    const fn = await published(ids, "كود خلص يومه");
    await runSchedule(fn.id);
    const after = await prisma.collectionItem.findMany({ where: { collectionId: ids.table.codes, deletedAt: null } });
    expect(Object.fromEntries(after.map((r) => [r.slug, (r.data as Obj).status]))).toEqual({ floor100: "expired", goldwings: "active", winter26: "active", summer26: "expired" });
  });
});

describe("A Discord community", () => {
  test("who is on now, the coming events by their day (a passed one moves to the past by itself), and a member's card shown on the staff's yes", async () => {
    const { id, ids } = await install("site-discord-community");
    await readSite(id);
    const view = (await gameView(id, Date.now() + 21_000))!;
    // Its status is the Discord itself: no second count of it.
    expect(view).toMatchObject({ game: "discord", online: true, players: 128, max: 1450, name: "Gamers' Diwan", join: { href: "https://discord.gg/gamersdiwan" }, discord: null });

    // The coming events by their day, the nearest first, whatever order they were added in.
    const events = await prisma.collectionItem.findMany({ where: { collectionId: ids.table.events, deletedAt: null } });
    const ev = Object.fromEntries(events.map((r) => [r.slug, r]));
    await prisma.collectionItem.update({ where: { id: ev["finals-watch"].id }, data: { data: { ...(ev["finals-watch"].data as Obj), date: day(1) } } });
    await prisma.collectionItem.update({ where: { id: ev["party-night"].id }, data: { data: { ...(ev["party-night"].data as Obj), date: day(-1) } } });
    await fresh();
    let page = JSON.stringify(await served("/events"));
    const where = (t: string) => page.indexOf(t);
    expect(where("Watching the final")).toBeGreaterThan(-1);
    expect(where("Watching the final")).toBeLessThan(where("The two-against-two cup"));
    // The one whose day passed: done by the nightly function, then among the past ones.
    const fn = await published(ids, "فعالية مرق يومها");
    await runSchedule(fn.id);
    const party = await prisma.collectionItem.findUnique({ where: { id: ev["party-night"].id } });
    expect((party!.data as Obj).status).toBe("done");
    const after = await prisma.collectionItem.findUnique({ where: { id: ev["duo-cup"].id } });
    expect((after!.data as Obj).status).toBe("upcoming");
    await fresh();
    page = JSON.stringify(await served("/events"));
    expect(where("Party games night")).toBeGreaterThan(where("The two-against-two cup"));

    // A signed-in member puts up their card: a draft until the staff say yes, one card each, never its state.
    await setAccounts(true);
    const member = await prisma.user.create({ data: { email: EMAIL, name: "Maya" } });
    const as = `Bearer ${signCustomerToken(member.id)}`;
    const table = (await prisma.collection.findUnique({ where: { id: ids.table.members }, select: { slug: true } }))!.slug;
    const card = { tag: "Maya_Builds", games: "Building games", platform: "pc", discordName: "maya_builds", about: "Calm co-op evenings." };
    expect((await request(app).post(`/v1/data/${table}`).set("Authorization", as).send({ values: { ...card, state: "shown" }, lang: "en" })).status).toBeGreaterThanOrEqual(400);
    const row = (await request(app).post(`/v1/data/${table}`).set("Authorization", as).send({ values: card, lang: "en" }).expect(201)).body;
    expect((await request(app).post(`/v1/data/${table}`).set("Authorization", as).send({ values: { ...card, tag: "Maya_Again" }, lang: "en" })).status).toBeGreaterThanOrEqual(400);
    await settled();
    const stored = await prisma.collectionItem.findUnique({ where: { id: row.id } });
    expect([stored!.status, (stored!.data as Obj).state]).toEqual(["DRAFT", "waiting"]);
    expect(JSON.stringify(await served("/members"))).not.toContain("Maya_Builds");
    // The staff say yes on the panel: the site's function publishes it into the directory.
    await published(ids, "بطاقة انقبلت");
    await request(app).post(`${at}/site-panels/${id}/today/membersQueue/decide`).send({ row: row.id, decision: "show" }).expect(200);
    await settled();
    const shown = await prisma.collectionItem.findUnique({ where: { id: row.id } });
    expect([shown!.status, (shown!.data as Obj).state]).toEqual(["PUBLISHED", "shown"]);
    await fresh();
    expect(JSON.stringify(await served("/members"))).toContain("Maya_Builds");
  }, 30_000);
});

describe("A clan", () => {
  test("its roster by part, its results newest first with the score, and applying as a player", async () => {
    // One site's pages a store: the Discord community's /events would be in the way.
    for (const other of made.splice(0)) {
      await request(app).post(`${at}/my-features/${other}/remove`).send({ rows: "delete" });
      await prisma.gameSample.deleteMany({ where: { featureId: other } });
    }
    await fresh();
    const { id } = await install("site-gaming-clan");
    await readSite(id);
    expect((await gameView(id, Date.now() + 21_000))!).toMatchObject({ game: "discord", players: 9, max: 64, name: "Night Eagles" });
    const roster = JSON.stringify(await served("/roster"));
    for (const part of ["Captain", "Main players", "Subs", "Coach and staff"]) expect(roster).toContain(part);
    expect(roster.indexOf("Falcon")).toBeLessThan(roster.indexOf("Main players"));
    expect(roster.indexOf("Coach Hadi")).toBeGreaterThan(roster.indexOf("Coach and staff"));
    const matches = JSON.stringify(await served("/events"));
    expect(matches.indexOf("Storm Riders")).toBeLessThan(matches.indexOf("Blue Owls"));
    expect(matches.indexOf("Blue Owls")).toBeLessThan(matches.indexOf("Sand Vipers"));
    expect(matches).toContain("2 - 1");
    // The coming match is with the coming ones, before the results.
    expect(matches.indexOf("Red Foxes")).toBeLessThan(matches.indexOf("Storm Riders"));
    // Its form asks for the player themself, not a character.
    const form = JSON.stringify(await served("/apply/player"));
    expect(form).toContain("Your name in games");
    expect(form).not.toContain("Your character's name");
  }, 20_000);
});
