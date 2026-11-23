import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetFeatures } from "../lib/features.js";
import { issueLinkKey } from "../lib/gameLink.js";
import { addScores, boardView, forgetRanks } from "../lib/ranking.js";

// A game server's rankings (wave G6a of docs/sites-300-plan.ar.md), with the database: the Minecraft survival site
// installed from the admin's own files, with its three boards (play time summed, money as the latest, the parkour's
// fastest lap). The server's link counts play time at each hello (once a minute however often it says hello) and
// sends its own numbers; each player has a row a day and one for all time on a board; the «الترتيب» page is served
// with each board's best players in its windows. Requests to /v1/admin without a token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
const DAY = 86_400_000;
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
let featureId = "";
let ids: Obj = {};
let key = "";
const SARA = { id: "0f9a6c1e-2b3d-4e5f-8a7b-6c5d4e3f2a1b", name: "Sara_K" };
const OMAR = { id: "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b", name: "OmarMC" };

const link = (p: string, body: Obj) => request(app).post(`/v1/link${p}`).set("Authorization", `Bearer ${key}`).send(body);
const rowsOf = async (board: string) => (await prisma.collectionItem.findMany({ where: { collectionId: ids.table.scores, deletedAt: null } })).map((r) => r.data as Obj).filter((d) => d.board === board);
const all = (n: Obj): Obj[] => [n, ...(n.children ?? []).flatMap(all)];
/** A while since the last hello. */
const later = (ms: number) => prisma.siteLink.update({ where: { featureId }, data: { lastSeenAt: new Date(Date.now() - ms) } });

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  forgetFeatures();
  const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile("site-minecraft-survival", { lang: "ar" }), lang: "ar" });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
  featureId = res.body.id;
  ids = (await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } }))!.template!.ids;
  await request(app).put(`${at}/my-features/${featureId}`).send({ enabled: true }).expect(200);
  await prisma.page.updateMany({ where: { id: { in: Object.values(ids.page) as string[] } }, data: { status: "PUBLISHED" } });
  key = await issueLinkKey(featureId);
  forgetRanks();
});
afterAll(async () => {
  if (featureId) await request(app).post(`${at}/my-features/${featureId}/remove`).send({ rows: "delete" });
  if (featureId) await prisma.siteLink.deleteMany({ where: { featureId } });
  forgetFeatures();
  forgetFeatureGate();
  forgetRanks();
});

describe("A game server's rankings", () => {
  test("play time: a minute for each player online at each hello, once a minute however often it says hello", async () => {
    await link("/hello", { game: "minecraft", players: 2, online: [SARA, OMAR] }).expect(200);
    // Again at once (a restart): not counted again.
    await link("/hello", { game: "minecraft", players: 2, online: [SARA, OMAR, SARA] }).expect(200);
    await later(65_000);
    await link("/hello", { game: "minecraft", players: 1, online: [SARA, { id: "not an id!", name: "x" }] }).expect(200);
    const rows = await rowsOf("playtime");
    const sara = rows.filter((r) => r.playerId === SARA.id);
    expect(sara.map((r) => [r.span, r.value]).sort()).toEqual([["all", 2], ["day", 2]]);
    expect(sara.find((r) => r.span === "day")!.day).toBe(new Date().toISOString().slice(0, 10));
    expect(rows.filter((r) => r.playerId === OMAR.id).map((r) => r.value)).toEqual([1, 1]);
    expect(rows.find((r) => r.playerId === SARA.id)!.player).toEqual({ ar: "Sara_K", en: "Sara_K", he: "Sara_K" });
    // Nobody else came in.
    expect(new Set(rows.map((r) => r.playerId))).toEqual(new Set([SARA.id, OMAR.id]));
  });

  test("the server's own numbers: each board adds them up its way; what isn't a board, a number or a player is left out", async () => {
    const said = await link("/scores", { items: [
      { board: "money", player: SARA, value: 100 },
      { board: "money", player: OMAR, value: 900 },
      { board: "money", player: SARA, value: 250 },
      { board: "parkour", player: SARA, value: 90_000 },
      { board: "parkour", player: SARA, value: 83_456 },
      { board: "parkour", player: OMAR, value: 95_000 },
      { board: "nope", player: SARA, value: 1 },
      { board: "money", player: { id: "", name: "x" }, value: 1 },
      { board: "money", player: SARA, value: "lots" },
      { board: "money", player: SARA, value: 1e15 },
    ] }).expect(200);
    expect(said.body).toEqual({ kept: 6, skipped: 4 });
    // A later word: the latest money, the best lap stays.
    await link("/scores", { items: [{ board: "money", player: SARA, value: 40 }, { board: "parkour", player: SARA, value: 99_000 }] }).expect(200);
    const money = await rowsOf("money");
    expect(money.filter((r) => r.playerId === SARA.id).map((r) => r.value)).toEqual([40, 40]);
    expect((await rowsOf("parkour")).filter((r) => r.playerId === SARA.id).map((r) => r.value)).toEqual([83_456, 83_456]);
    await link("/scores", { items: [] }).expect(200);
    await request(app).post("/v1/link/scores").set("Authorization", "Bearer lk_not-a-real-key-at-all-xxxxxxxxxx").send({ items: [] }).expect(401);
  });

  test("a board's best in each window: today, 7 days, 30 days and all time; the fastest lap first", async () => {
    // Rami played 12 days ago and Lina 3 days ago (their days' rows, and all time).
    await addScores(featureId, [{ board: "playtime", player: { id: "rami-1", name: "Rami" }, value: 500 }], Date.now() - 12 * DAY);
    await addScores(featureId, [{ board: "playtime", player: { id: "lina-1", name: "Lina" }, value: 30 }], Date.now() - 3 * DAY);
    forgetRanks();
    const v = (await boardView(featureId, "playtime", ["day", "week", "month", "all"], 10))!;
    expect(v).toMatchObject({ key: "playtime", unit: "minutes", best: "high" });
    const names = (w: keyof typeof v.windows) => v.windows[w]!.map((r) => `${r.n}.${r.name}:${r.value}`);
    expect(names("day")).toEqual(["1.Sara_K:2", "2.OmarMC:1"]);
    expect(names("week")).toEqual(["1.Lina:30", "2.Sara_K:2", "3.OmarMC:1"]);
    expect(names("month")).toEqual(["1.Rami:500", "2.Lina:30", "3.Sara_K:2", "4.OmarMC:1"]);
    expect(names("all")).toEqual(names("month"));
    const lap = (await boardView(featureId, "parkour", ["all"], 10))!;
    expect(lap.windows.all!.map((r) => [r.name, r.value])).toEqual([["Sara_K", 83_456], ["OmarMC", 95_000]]);
    expect((await boardView(featureId, "money", ["week"], 3))!.windows.week!.map((r) => r.name)).toEqual(["OmarMC", "Sara_K"]);
    expect(await boardView(featureId, "nope", ["week"], 10)).toBeNull();
  });

  test("the «الترتيب» page served with each board's best players; a board the owner put in the trash starts over", async () => {
    forgetRanks();
    const page = (await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent("/ranking")}&locale=ar`).expect(200)).body;
    const boards = all(page.tree.root).filter((n) => n.type === "leaderboard");
    expect(boards.map((n) => n.props.board)).toEqual(["playtime", "money", "parkour"]);
    expect(boards[0].props.ranks.windows.week.map((r: Obj) => r.name)).toEqual(["Lina", "Sara_K", "OmarMC"]);
    expect(Object.keys(boards[0].props.ranks.windows)).toEqual(["week", "month", "all"]);
    expect(boards[2].props.ranks).toMatchObject({ unit: "lap", best: "low" });
    // Nothing private reaches the shop: no player's game id.
    expect(JSON.stringify(page)).not.toContain(SARA.id);
    // The owner empties the money board (its rows to the trash): the next number starts it over.
    await prisma.collectionItem.updateMany({ where: { collectionId: ids.table.scores, data: { path: ["board"], equals: "money" } }, data: { deletedAt: new Date() } });
    await link("/scores", { items: [{ board: "money", player: SARA, value: 7 }] }).expect(200);
    expect((await rowsOf("money")).map((r) => r.value)).toEqual([7, 7]);
  });
});
