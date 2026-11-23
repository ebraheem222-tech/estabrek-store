import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetSiteSettings } from "../lib/siteSettings.js";
import { forgetTwitch } from "../lib/twitch.js";

// A Rust server's site (wave G6b of docs/sites-300-plan.ar.md), with the database: installed from the admin's own
// files. Its pages are served with the next wipe by its schedule (the first Thursday of each month at 19:00 London, as
// its settings start; changed, the page follows) and its streamers: without Twitch keys their channels alone; with
// them (Twitch played here: nothing reaches it) who is live, the live first, with their stream; keys Twitch refuses
// say so on the panel. The shop never learns the keys. Requests to /v1/admin without a token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
let featureId = "";
let ids: Obj = {};
const asked: string[] = [];
const ID = "spec1client2id3abc";
const SECRET = "spec4secret5value6xyz";

const all = (n: Obj): Obj[] => [n, ...(n.children ?? []).flatMap(all)];
const served = async (slug: string, type: string) => all((await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(slug)}&locale=en`).expect(200)).body.tree.root).filter((n) => n.type === type);
const panel = async (kind: string) => (await request(app).get(`${at}/site-panels/${featureId}/today?lang=en`).expect(200)).body.parts.find((p: Obj) => p.kind === kind);
const settings = async (values: Obj) => {
  await request(app).put(`${at}/my-features/${featureId}/settings`).send({ values }).expect(200);
  forgetSiteSettings();
};

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  const real = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (!u.startsWith("https://id.twitch.tv/") && !u.startsWith("https://api.twitch.tv/")) return real(url, init);
    asked.push(u.replace(/\?.*$/, (q) => q.split("&").sort().join("&")));
    if (u.startsWith("https://id.twitch.tv/oauth2/token")) {
      const form = new URLSearchParams(String(init?.body ?? ""));
      return form.get("client_id") === ID && form.get("client_secret") === SECRET ? Response.json({ access_token: "app-token-1", expires_in: 5_000_000, token_type: "bearer" }) : new Response(JSON.stringify({ status: 403, message: "invalid client secret" }), { status: 403 });
    }
    if ((init?.headers as Record<string, string>)?.Authorization !== "Bearer app-token-1") return new Response("{}", { status: 401 });
    if (u.includes("/helix/streams")) return Response.json({ data: [{ user_login: "layla_builds", user_name: "Layla_Builds", type: "live", title: "Day 1: a base that won't break", game_name: "Rust", viewer_count: 1234, started_at: "2026-11-23T10:00:00Z", thumbnail_url: "https://static-cdn.jtvnw.net/previews-ttv/live_user_layla_builds-{width}x{height}.jpg" }, { user_login: "rami_raids", type: "live", title: "Raid night", game_name: "Rust", viewer_count: 40, started_at: "2026-11-23T11:00:00Z", thumbnail_url: "https://evil.example/x.jpg" }] });
    if (u.includes("/helix/users")) return Response.json({ data: [{ login: "abu_sakhr", profile_image_url: "https://static-cdn.jtvnw.net/jtv_user_pictures/abu.png" }, { login: "layla_builds", profile_image_url: "https://static-cdn.jtvnw.net/jtv_user_pictures/layla.png" }] });
    return new Response("{}", { status: 404 });
  });
  forgetFeatures();
  forgetTwitch();
  const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile("site-rust-wipe", { lang: "ar" }), lang: "ar" });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
  featureId = res.body.id;
  ids = (await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } }))!.template!.ids;
  await request(app).put(`${at}/my-features/${featureId}`).send({ enabled: true }).expect(200);
  await prisma.page.updateMany({ where: { id: { in: Object.values(ids.page) as string[] } }, data: { status: "PUBLISHED" } });
  // The owner fills in their streamers' channels.
  const channels: Record<string, string> = { "abu-sakhr": "abu_sakhr", "layla-builds": "https://www.twitch.tv/Layla_Builds", "rami-raids": "rami_raids" };
  for (const [slug, twitch] of Object.entries(channels)) await prisma.collectionItem.updateMany({ where: { collectionId: ids.table.streamers, slug }, data: { status: "PUBLISHED" } }).then(async () => {
    const row = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: ids.table.streamers, slug } });
    await prisma.collectionItem.update({ where: { id: row.id }, data: { data: { ...(row.data as Obj), twitch: { ar: twitch } } } });
  });
});
afterAll(async () => {
  vi.unstubAllGlobals();
  if (featureId) await request(app).post(`${at}/my-features/${featureId}/remove`).send({ rows: "delete" });
  forgetFeatures();
  forgetFeatureGate();
  forgetTwitch();
});

describe("A Rust server's site", () => {
  test("the next wipe on its first page and its own page, by its schedule; changed, the page follows", async () => {
    const [home] = await served("/island", "wipeCountdown");
    const wipe = home.props.wipe;
    expect(wipe).toMatchObject({ every: "monthly", day: "thu", time: "19:00", zone: "Europe/London", note: { en: "The server is back within a quarter of an hour of the wipe, and the new map goes up on Discord an hour before." } });
    // The first Thursday of a month, at 19:00 in London; the last one before it.
    const next = new Date(wipe.next);
    expect(next.getTime()).toBeGreaterThan(Date.now());
    expect(next.getUTCDay()).toBe(4);
    expect(next.getUTCDate()).toBeLessThanOrEqual(7);
    expect(new Date(wipe.last).getTime()).toBeLessThanOrEqual(Date.now());
    expect((await served("/wipe", "wipeCountdown"))[0].props.wipe.next).toBe(wipe.next);
    expect((await panel("wipe")).wipe).toMatchObject({ next: wipe.next, every: "monthly" });
    // Every Saturday at 20:00 in Amman.
    await settings({ wipeEvery: "weekly", wipeDay: "sat", wipeTime: "20:00", wipeZone: "amman" });
    const weekly = (await served("/island", "wipeCountdown"))[0].props.wipe;
    expect(weekly).toMatchObject({ every: "weekly", day: "sat", time: "20:00", zone: "Asia/Amman" });
    expect(new Date(weekly.next).toISOString().slice(11, 16)).toBe("17:00");
    expect(Date.parse(weekly.next) - Date.now()).toBeLessThanOrEqual(7 * 86_400_000);
    // A time that isn't one: no schedule, and the page says so.
    await settings({ wipeTime: "late" });
    expect((await served("/island", "wipeCountdown"))[0].props.wipe).toBeNull();
    expect((await panel("wipe")).wipe).toBeNull();
  });

  test("the streamers without Twitch keys: their channels, nobody marked live, Twitch never asked", async () => {
    const [list] = await served("/streamers", "streamers");
    expect(list.props.crew.live).toBe(false);
    expect(list.props.crew.list.map((s: Obj) => [s.name, s.url, s.live])).toEqual([
      ["أبو صخر", "https://www.twitch.tv/abu_sakhr", null],
      ["ليلى بتبني", "https://www.twitch.tv/layla_builds", null],
      ["رامي والغارات", "https://www.twitch.tv/rami_raids", null],
    ]);
    expect(asked).toEqual([]);
    expect(await panel("streamers")).toMatchObject({ connected: false, failed: false, total: 3, live: [] });
  });

  test("with the owner's keys: who is live (the most watched first), their stream and pictures, asked once; the keys never reach the shop", async () => {
    await settings({ twitchClientId: ID, twitchSecret: SECRET });
    const page = (await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent("/streamers")}&locale=en`).expect(200)).body;
    const crew = all(page.tree.root).find((n) => n.type === "streamers")!.props.crew;
    expect(crew.live).toBe(true);
    expect(crew.list.map((s: Obj) => s.login)).toEqual(["layla_builds", "rami_raids", "abu_sakhr"]);
    expect(crew.list[0].live).toEqual({ title: "Day 1: a base that won't break", game: "Rust", viewers: 1234, since: "2026-11-23T10:00:00Z", thumb: "https://static-cdn.jtvnw.net/previews-ttv/live_user_layla_builds-440x248.jpg" });
    // A picture from anywhere but Twitch's own is left out.
    expect(crew.list[1].live.thumb).toBeNull();
    expect(crew.list[0].picture).toBe("https://static-cdn.jtvnw.net/jtv_user_pictures/layla.png");
    expect(crew.list[2]).toMatchObject({ live: null, picture: "https://static-cdn.jtvnw.net/jtv_user_pictures/abu.png" });
    expect(JSON.stringify(page)).not.toMatch(new RegExp(`${ID}|${SECRET}|app-token`));
    // The home page's band and the panel: kept, Twitch not asked again.
    const before = asked.length;
    expect((await served("/island", "streamers"))[0].props.crew.list[0].login).toBe("layla_builds");
    expect(await panel("streamers")).toMatchObject({ connected: true, failed: false, total: 3, live: [{ name: "ليلى بتبني", viewers: 1234 }, { name: "رامي والغارات", viewers: 40 }] });
    expect(asked.length).toBe(before);
    expect(asked.filter((u) => u.includes("oauth2/token"))).toHaveLength(1);
  });

  test("keys Twitch refuses: the panel says so, the page lists the channels as without keys", async () => {
    await settings({ twitchSecret: "wrong7secret8value9" });
    expect(await panel("streamers")).toMatchObject({ connected: true, failed: true, live: [] });
    const crew = (await served("/streamers", "streamers"))[0].props.crew;
    expect(crew.live).toBe(false);
    expect(crew.list.every((s: Obj) => s.live === null)).toBe(true);
  });
});
