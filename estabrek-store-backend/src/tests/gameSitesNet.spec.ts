import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetTriggers, rowEventsInFlight } from "../lib/fnTriggers.js";
import { runTasks } from "../lib/tasks.js";
import { issueLinkKey } from "../lib/gameLink.js";
import { gameView } from "../lib/gameSites.js";
import { forgetRanks } from "../lib/ranking.js";
import { forgetSiteSettings } from "../lib/siteSettings.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// Game server sites with several servers on one site (wave G7b of docs/sites-300-plan.ar.md), installed from the
// admin's own files. A Minecraft network's games sit behind its one address: each one's link says hello by its name,
// so the site shows each game's players and counts each one's play time (two in the same minute both count). A CS2
// community's servers each have their own address, asked and kept by their keys, apart from the main one's history.
// Its public ban list shows the bans in force; an accepted appeal on a ban lifts it. Requests to /v1/admin without a
// token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
const made: string[] = [];
let cs2: { id: string; ids: Obj } | null = null;
const EMAIL = "rami@net-spec.test";
const SARA = { id: "0f9a6c1e-2b3d-4e5f-8a7b-6c5d4e3f2a1b", name: "Sara_K" };
const OMAR = { id: "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b", name: "OmarMC" };
const LINA = { id: "2c3d4e5f-6071-4829-9a0b-1c2d3e4f5a6b", name: "LinaBuilds" };

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

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  startFunctions();
  forgetFeatures();
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});
afterAll(async () => {
  for (const id of made) {
    await request(app).post(`${at}/my-features/${id}/remove`).send({ rows: "delete" });
    await prisma.siteLink.deleteMany({ where: { featureId: id } });
    await prisma.gameSample.deleteMany({ where: { featureId: id } });
  }
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.task.deleteMany({ where: { kind: "function" } });
  await setAccounts(false);
  forgetFeatures();
  forgetFeatureGate();
  forgetSiteSettings();
  forgetTriggers();
  forgetRanks();
});

describe("Several servers on one site", () => {
  test("a network: each game behind the one address says hello by its name, with its players and its own minute of play time", async () => {
    const { id, ids } = await install("site-minecraft-network");
    const key = await issueLinkKey(id);
    const link = (body: Obj) => request(app).post("/v1/link/hello").set("Authorization", `Bearer ${key}`).send(body);
    // Two of its games in the same minute, then one of them again at once (a restart): counted once.
    await link({ game: "minecraft", version: "1.2.0", players: 2, max: 16, online: [SARA, OMAR], server: "bedwars" }).expect(200);
    await link({ game: "minecraft", version: "1.2.0", players: 1, max: 8, online: [LINA], server: "SkyWars" }).expect(200);
    await link({ game: "minecraft", version: "1.2.0", players: 2, max: 16, online: [SARA, OMAR], server: "bedwars" }).expect(200);
    // A name that isn't one is the server with no name's.
    await link({ game: "minecraft", players: 0, online: [], server: "not a name!" }).expect(200);

    const view = (await gameView(id, Date.now() + 21_000))!;
    expect(view.servers!.map((x) => [x.key, x.online, x.players, x.max, x.from])).toEqual([
      ["lobby", null, null, null, null],
      ["bedwars", true, 2, 16, "link"],
      ["skywars", true, 1, 8, "link"],
      ["duels", null, null, null, null],
      ["parkour", null, null, null, null],
    ]);
    // Joined through the network's one address, with what to type there.
    expect(view.servers![1]).toMatchObject({ join: { href: null, address: "play.arenas.example" }, hint: { en: "/server bedwars" }, title: { en: "Bed Wars" } });
    // The main server's own status has none of theirs.
    expect(view.online).toBeNull();
    const stored = (await prisma.siteLink.findUnique({ where: { featureId: id } }))!;
    expect(Object.keys(stored.servers as Obj).sort()).toEqual(["", "bedwars", "skywars"]);
    expect(stored.lastPlayers).toBe(3);

    // Play time: each player on either game got their minute; the repeat counted nothing.
    const rows = (await prisma.collectionItem.findMany({ where: { collectionId: ids.table.scores, deletedAt: null } })).map((r) => r.data as Obj).filter((d) => d.board === "playtime" && d.span === "all");
    expect(rows.map((r) => [r.playerId, r.value]).sort()).toEqual([[SARA.id, 1], [OMAR.id, 1], [LINA.id, 1]].sort());
    // Its rankings: a board for each game.
    const boards = await prisma.collectionItem.findMany({ where: { collectionId: ids.table.boards, deletedAt: null }, select: { slug: true } });
    expect(boards.map((b) => b.slug).sort()).toEqual(["bedwars-wins", "duels-wins", "parkour-best", "playtime", "skywars-wins"]);

    // A game quiet for minutes is down; the page shows each one with the status.
    const quiet = { ...(stored.servers as Obj), bedwars: { ...(stored.servers as Obj).bedwars, at: new Date(Date.now() - 5 * 60_000).toISOString() } };
    await prisma.siteLink.update({ where: { featureId: id }, data: { servers: quiet } });
    const later = (await gameView(id, Date.now() + 42_000))!;
    expect(later.servers!.find((x) => x.key === "bedwars")).toMatchObject({ online: false, players: null, from: "link" });
    const page = await served("/lobby");
    const [list] = all(page.tree.root).filter((n) => n.type === "serverList");
    expect(list.props.live.servers.map((x: Obj) => x.key)).toEqual(["lobby", "bedwars", "skywars", "duels", "parkour"]);
    expect(all((await served("/servers")).tree.root).some((n) => n.type === "serverList")).toBe(true);
  });

  test("a CS2 community: its servers asked at their own addresses and kept by their keys, apart from the main one's history", async () => {
    cs2 = await install("site-cs2-community");
    const { id } = cs2;
    const ago = (ms: number) => new Date(Date.now() - ms);
    await prisma.gameSample.createMany({ data: [
      { featureId: id, server: "retake", at: ago(120_000), online: false },
      { featureId: id, server: "retake", at: ago(30_000), online: true, players: 8, max: 10, map: "de_inferno" },
      { featureId: id, server: "surf", at: ago(30_000), online: false },
    ] });
    const view = (await gameView(id, Date.now() + 21_000))!;
    expect(view.servers!.map((x) => [x.key, x.online, x.players, x.from])).toEqual([
      ["retake", true, 8, "asked"],
      ["surf", false, null, "asked"],
      ["deathmatch", null, null, null],
      ["awp", null, null, null],
    ]);
    expect(view.servers![0]).toMatchObject({ max: 10, map: "de_inferno", join: { href: "steam://connect/cs.crosshair.example:27015", address: "cs.crosshair.example:27015" } });
    expect(view.servers![1].join.href).toBe("steam://connect/cs.crosshair.example:27016");
    // The main server was never asked: its status and its last 24 hours are its own.
    expect(view.online).toBeNull();
    expect(view.history.every((h) => h.players === null)).toBe(true);
    // The storefront's every-minute answer carries them too.
    const live = (await request(app).get(`/v1/storefront/game-status/${id}`).expect(200)).body;
    expect(live.servers.map((x: Obj) => x.key)).toEqual(["retake", "surf", "deathmatch", "awp"]);
  });

  test("the public ban list shows the bans in force; an accepted appeal lifts its ban", async () => {
    const { id, ids } = cs2 ?? (cs2 = await install("site-cs2-community"));
    const text = JSON.stringify(await served("/bans"));
    for (const n of ["B-1042", "B-1041", "B-1040"]) expect(text).toContain(n);
    // The banned player appeals, the staff accept: the ban is lifted by the site's function (published).
    await setAccounts(true);
    const player = await prisma.user.create({ data: { email: EMAIL, name: "Rami" } });
    const fn = await prisma.fn.findFirst({ where: { id: { in: Object.values(ids.function) as string[] }, name: { startsWith: "استئناف انقبل" } } });
    expect(fn).not.toBeNull();
    await request(app).post(`${at}/functions/${fn!.id}/publish`).expect(200);
    forgetTriggers();
    // This site's own appeals table (the network installed before it has one too).
    const table = (await prisma.collection.findUnique({ where: { id: ids.table.appeals }, select: { slug: true } }))!.slug;
    const appeal = (await request(app).post(`/v1/data/${table}`).set("Authorization", `Bearer ${signCustomerToken(player.id)}`).send({ values: { ban: "B-1041", character: "nightowl", what: "Banned on deathmatch.", why: "It was a friend on my mic." }, lang: "en" }).expect(201)).body;
    await request(app).post(`${at}/site-panels/${id}/today/appeals/decide`).send({ row: appeal.id, decision: "lift" }).expect(200);
    await settled();
    const bans = await prisma.collectionItem.findMany({ where: { collectionId: ids.table.bans, deletedAt: null } });
    const state = Object.fromEntries(bans.map((b) => [b.slug, (b.data as Obj).status]));
    expect(state).toEqual({ "b-1042": "active", "b-1041": "lifted", "b-1040": "active" });
    expect(JSON.stringify(await served("/bans"))).not.toContain("B-1041");
  });
});
