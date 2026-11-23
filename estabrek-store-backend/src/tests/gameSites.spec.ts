import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import path from "node:path";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { readGameServers } from "../lib/gameSites.js";
import { forgetDiscordCounts } from "../lib/socialSignIn.js";

// A game server's whole site (wave G1 of docs/sites-300-plan.ar.md), with the database: the FiveM roleplay site
// installed from the admin's own files, its address set to a small FiveM of our own on this computer (asked because
// GAME_STATUS_PRIVATE is set here; production never asks a private address). Read once a minute by the job: its
// shop page's «حالة السيرفر» and the shop's own question show the players, the last 24 hours and the way in; its
// panel too, with «اسأل هلّق» once in 10 seconds. Requests without a token run as the test owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
const made: string[] = [];
let players = 87;
let server: http.Server;
let port = 0;

async function clean() {
  for (const id of made) await request(app).post(`${at}/my-features/${id}/remove`).send({ rows: "delete" });
  made.length = 0;
  forgetFeatureGate();
  forgetTriggers();
}
beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  process.env.GAME_STATUS_PRIVATE = "true";
  server = http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/dynamic.json") return res.end(JSON.stringify({ clients: players, sv_maxclients: 128, hostname: "Dew City", mapname: "Los Santos" }));
    if (req.url === "/info.json") return res.end(JSON.stringify({ server: "FXServer", vars: { sv_projectName: "Dew City RP" } }));
    res.statusCode = 404;
    res.end("{}");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
  // Its Discord's count, played (Discord's public invite answer): nothing reaches Discord.
  forgetDiscordCounts();
  const real = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) =>
    String(url).startsWith("https://discord.com/api/v10/invites/dewcity?") ? Response.json({ approximate_presence_count: 340, approximate_member_count: 2100 }) : real(url, init),
  );
  await clean();
});
afterAll(async () => {
  vi.unstubAllGlobals();
  delete process.env.GAME_STATUS_PRIVATE;
  server.close();
  await clean();
});

const all = (n: Obj): Obj[] => [n, ...(n.children ?? []).flatMap(all)];

describe("A game server's site", () => {
  test("read once a minute: its page, the shop's question and its panel show the players, the last hours and the way in", async () => {
    const file = sites.siteFile("site-fivem-rp", { lang: "en" });
    const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: file, lang: "en" });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
    const id = res.body.id as string;
    made.push(id);
    expect(res.body.settings.declared.map((d: Obj) => d.key)).toEqual(["noticeOn", "notice", "game", "serverAddress", "discordOn", "discordUrl", "rulesChanged", "applyOpen", "applyClosed", "applyWaitDays", "applyVotes", "rolePolice", "roleEms", "roleMechanic", "roleStaff", "tebexToken", "whitelistOn", "whitelistMessage", "twitchClientId", "twitchSecret", "notifyOn", "notifyEmail"]);
    const ids: Obj = (await prisma.feature.findUnique({ where: { id }, select: { template: true } }))!.template!.ids;
    await prisma.page.updateMany({ where: { id: { in: Object.values(ids.page) as string[] } }, data: { status: "PUBLISHED" } });
    await request(app).put(`${at}/my-features/${id}/settings`).send({ values: { serverAddress: `127.0.0.1:${port}`, discordUrl: "https://discord.gg/dewcity" } }).expect(200);

    // Off: the shop's question doesn't answer, and the job doesn't ask.
    await request(app).get(`/v1/storefront/game-status/${id}`).expect(404);
    expect((await readGameServers()).read).toBe(0);
    await request(app).put(`${at}/my-features/${id}`).send({ enabled: true }).expect(200);
    expect(await readGameServers()).toEqual({ read: 1, online: 1, failed: 0 });

    const status = (await request(app).get(`/v1/storefront/game-status/${id}`).expect(200)).body;
    expect(status).toMatchObject({ featureId: id, game: "fivem", online: true, players: 87, max: 128, name: "Dew City RP", map: "Los Santos", join: { href: `fivem://connect/127.0.0.1:${port}`, address: `127.0.0.1:${port}` } });
    expect(status.history).toHaveLength(24);
    expect(status.history[23]).toMatchObject({ players: 87, online: true });
    // Its Discord while the owner shows it: how many are on now, and in it.
    expect(status.discord).toEqual({ online: 340, members: 2100 });
    // The address the owner set is never a setting the shop reads.
    expect(JSON.stringify(status)).not.toContain("serverAddress");

    // The first page: «حالة السيرفر» filled as it is served; the Discord button with the owner's invite.
    const home = (await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent("/city")}&locale=en`).expect(200)).body;
    const box = all(home.tree.root).find((n) => n.type === "gameStatus");
    expect(box.props.live).toMatchObject({ featureId: id, players: 87, online: true });
    expect(box.props.join).toMatchObject({ en: "Join now" });
    expect(all(home.tree.root).filter((n) => n.type === "button" && n.props.href === "https://discord.gg/dewcity").length).toBeGreaterThan(0);

    // Its panel: the server now and its last hours; asked again now, once in 10 seconds.
    const today = (await request(app).get(`${at}/site-panels/${id}/today?lang=en`).expect(200)).body;
    const game = today.parts.find((p: Obj) => p.kind === "game");
    expect(game).toMatchObject({ key: "server", canCheck: true, status: { players: 87, online: true } });
    players = 91;
    const checked = (await request(app).post(`${at}/site-panels/${id}/today/server/check`).expect(200)).body;
    expect(checked.parts.find((p: Obj) => p.kind === "game").status.players).toBe(91);
    await request(app).post(`${at}/site-panels/${id}/today/server/check`).expect(429);

    // The server goes down: the next reading says so.
    server.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(await readGameServers()).toEqual({ read: 1, online: 0, failed: 1 });
    const down = (await request(app).get(`/v1/storefront/game-status/${id}`).expect(200)).body;
    expect(down).toMatchObject({ online: false, players: null });
    expect(await prisma.gameSample.count({ where: { featureId: id } })).toBe(3);
    await prisma.gameSample.deleteMany({ where: { featureId: id } });
  });
});
