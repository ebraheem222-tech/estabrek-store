import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetSiteSettings, settingsOfFeature } from "../lib/siteSettings.js";

// More game server sites (wave G7a of docs/sites-300-plan.ar.md), installed from the admin's own files. A racing
// server's countdown is its weekly race (its own page, /races, and its own words), on its schedule; a server for
// families and schools has no Discord (its button and band start off), keeps a whitelist by application (the link's
// switch), and sells nothing. Requests to /v1/admin without a token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
const made: string[] = [];

const all = (n: Obj): Obj[] => [n, ...(n.children ?? []).flatMap(all)];
const served = async (slug: string, type: string) => all((await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(slug)}&locale=en`).expect(200)).body.tree.root).filter((n) => n.type === type);
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

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  forgetFeatures();
});
afterAll(async () => {
  for (const id of made) await request(app).post(`${at}/my-features/${id}/remove`).send({ rows: "delete" });
  forgetFeatures();
  forgetFeatureGate();
  forgetSiteSettings();
});

describe("More game server sites", () => {
  test("a racing server: its weekly race counts down on its own page and its home, in its own words", async () => {
    const { id, ids } = await install("site-fivem-racing");
    const pages = await prisma.page.findMany({ where: { id: { in: Object.values(ids.page) as string[] } }, select: { slug: true } });
    expect(pages.map((p) => p.slug)).toContain("/races");
    expect(pages.map((p) => p.slug)).not.toContain("/wipe");
    const [big] = await served("/races", "wipeCountdown");
    expect(big.props.title).toMatchObject({ en: "The next race" });
    expect(big.props.done).toMatchObject({ en: "The race is on! Get to the track." });
    expect(big.props.wipe).toMatchObject({ every: "weekly", day: "fri", time: "21:00", zone: "Asia/Amman" });
    // Every Friday at 21:00 in Amman: within a week, on a Friday there.
    const next = new Date(big.props.wipe.next);
    expect(next.getTime() - Date.now()).toBeLessThanOrEqual(7 * 86_400_000);
    expect(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Amman", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(next)).toBe("Fri 21:00");
    const [home] = await served("/circuit", "wipeCountdown");
    expect(home.props.wipe.next).toBe(big.props.wipe.next);
    // Its rankings: a lap on each track (the lowest wins) and drift scores.
    const s = await settingsOfFeature(id);
    expect(s?.values.discordOn).toBe(true);
    const boards = await prisma.collectionItem.findMany({ where: { collectionId: ids.table.boards, deletedAt: null }, select: { slug: true } });
    expect(boards.map((b) => b.slug).sort()).toEqual(["drift", "lap-desert", "lap-harbour"]);
  });

  test("a server for families and schools: no Discord, a whitelist by application, nothing for sale", async () => {
    const { id, ids } = await install("site-minecraft-family");
    const s = await settingsOfFeature(id);
    expect(s?.values.discordOn).toBe(false);
    expect(s?.decls.map((d) => d.key)).toContain("whitelistOn");
    expect(Object.keys(ids.table)).not.toContain("packages");
    expect(Object.keys(ids.table)).not.toContain("boards");
    // Its first page: the status, no Discord band while it is off.
    const page = (await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent("/village")}&locale=en`).expect(200)).body;
    expect(all(page.tree.root).some((n) => n.type === "gameStatus")).toBe(true);
    expect(JSON.stringify(page)).not.toContain("discord.gg");
  });
});
