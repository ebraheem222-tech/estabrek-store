import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken, signCustomerToken } from "../config/security.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetTriggers, rowEventsInFlight } from "../lib/fnTriggers.js";
import { runTasks } from "../lib/tasks.js";
import { startFunctions } from "../modules/functions/functions.service.js";
import { heldWords } from "../lib/siteWaits.js";

// A game server's applications (wave G3 of docs/sites-300-plan.ar.md), with the database: the FiveM roleplay site
// installed from the admin's own files. A signed-in player applies for a job through the data API, as the shop's
// form does (its kind fixed by the form); they read their own, never write its state or the staff's answer, nor see
// the staff's notes. While one waits for an answer, and for the days the owner set after it, another of the same
// kind waits. In the panel each member of the staff votes once (changed, taken back), «اقبل» waits for the yes the
// owner set, and accepted, the site's function adds the player to the whitelist and writes to them.
// Requests to /v1/admin without a token run as the test owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
let featureId = "";
let sara = "";
let saraId = "";
let nour = "";
const EMAILS = ["sara@apply-spec.test", "lina@apply-spec.test"];
const STAFF = "nour@apply-spec.test";

async function setAccounts(on: boolean) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: on } });
  forgetFeatures();
}
async function clean() {
  if (featureId) await request(app).post(`${at}/my-features/${featureId}/remove`).send({ rows: "delete" });
  featureId = "";
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  await prisma.adminUser.deleteMany({ where: { email: STAFF } });
  await prisma.task.deleteMany({ where: { kind: "function" } });
  forgetFeatureGate();
  forgetTriggers();
}
/** Everything a row's change started has run. */
async function settled() {
  for (let quiet = 0; quiet < 3; ) {
    await new Promise((r) => setTimeout(r, 25));
    await runTasks();
    quiet = rowEventsInFlight() || (await prisma.task.count({ where: { kind: "function", status: { in: ["waiting", "running"] }, runAt: { lte: new Date() } } })) ? 0 : quiet + 1;
  }
}
const apply = (token: string, values: Obj) => request(app).post("/v1/data/applications").set("Authorization", `Bearer ${token}`).send({ values, lang: "ar" });
const police = { kind: "police", character: "Omar Haddad", age: 21, story: "From the north side.", why: "To keep it safe.", question: "I'd report it.", rules: true };

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  // A function's runs from a trigger go through the queue (the server starts it).
  startFunctions();
  await clean();
  await setAccounts(true);
  const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile("site-fivem-rp", { lang: "en" }), lang: "en" });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
  featureId = res.body.id;
  await request(app).put(`${at}/my-features/${featureId}`).send({ enabled: true }).expect(200);
  const player = await prisma.user.create({ data: { email: EMAILS[0], name: "Sara Khalil", discordId: "80351110224678912", steamId: "76561198000000001" } });
  saraId = player.id;
  sara = signCustomerToken(player.id);
  const member = await prisma.adminUser.create({ data: { email: STAFF, name: "Nour", passwordHash: "x", role: "SUPERADMIN", status: "ACTIVE" } });
  nour = signAccessToken({ sub: member.id, role: "SUPERADMIN", email: member.email });
});
afterAll(async () => {
  await clean();
  await setAccounts(false);
});

describe("Applying to a game server", () => {
  test("a player applies as themself, reads theirs, and never writes its state, the answer or the notes", async () => {
    // Not signed in: asked to.
    await request(app).post("/v1/data/applications").send({ values: police }).expect(401);
    // Its state and the staff's answer are the store's; the staff's notes aren't there for a player.
    const bad = (await apply(sara, { ...police, status: "accepted", reply: "Welcome!", notes: "x" }).expect(400)).body;
    expect(bad.details.issues).toEqual(expect.arrayContaining([{ field: "status", message: "Only the store sets this" }, { field: "reply", message: "Only the store sets this" }, { field: "notes", message: "No such column" }]));
    const made = (await apply(sara, police).expect(201)).body;
    expect(made.values).toMatchObject({ kind: "police", character: { ar: "Omar Haddad" }, status: "fresh" });
    expect(made.values).not.toHaveProperty("notes");
    expect((await prisma.collectionItem.findUnique({ where: { id: made.id } }))!.ownerId).toBe(saraId);
    const mine = (await request(app).get("/v1/data/applications?mine=added").set("Authorization", `Bearer ${sara}`).expect(200)).body.data;
    expect(mine.map((r: Obj) => r.values.status)).toEqual(["fresh"]);
    // Changing it afterwards isn't a player's either.
    await request(app).patch(`/v1/data/applications/${made.id}`).set("Authorization", `Bearer ${sara}`).send({ values: { status: "accepted" } }).expect(403);
  });

  test("one of a kind at a time, and again only after the days the owner set; another kind meanwhile", async () => {
    // The first is still waiting for an answer: the same kind waits too, in the player's words.
    const held = (await apply(sara, police).expect(400)).body;
    expect(held.details.issues).toEqual([{ field: "kind", message: heldWords({ why: "waiting" }).en, say: heldWords({ why: "waiting" }) }]);
    expect(held.details.issues[0].say.ar).toContain("لسّا عم ينراجع");
    // Another kind is another application.
    await apply(sara, { ...police, kind: "ems", question: "Triage first." }).expect(201);
    // Turned down today: the next one of that kind after the 7 days.
    const first = await prisma.collectionItem.findFirst({ where: { ownerId: saraId, data: { path: ["kind"], equals: "police" } } });
    await request(app).post(`${at}/site-panels/${featureId}/today/applications/decide`).send({ row: first!.id, decision: "reject" }).expect(200);
    const soon = (await apply(sara, police).expect(400)).body.details.issues[0];
    expect(soon.say).toEqual(heldWords({ why: "soon", since: 0, left: 7 }));
    expect(soon.say.ar).toBe("قدّمت اليوم. فيك تقدّم كمان مرة بعد 7 أيام.");
    // The owner sets no wait: it may be sent again.
    await request(app).put(`${at}/my-features/${featureId}/settings`).send({ values: { applyWaitDays: 0 } }).expect(200);
    await apply(sara, police).expect(201);
  });

  test("the staff vote once each, «accept» waits for the yes the owner set, and the player is whitelisted and told", async () => {
    // Its functions, published: the player told and whitelisted when decided.
    const ids: Obj = (await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } }))!.template!.ids;
    const decided = await prisma.fn.findFirst({ where: { id: { in: Object.values(ids.function) as string[] }, name: "لما ينقرّر طلب تقديم" } });
    await request(app).post(`${at}/functions/${decided!.id}/publish`).expect(200);
    forgetTriggers();

    const page = async (token?: string) => {
      const req = request(app).get(`${at}/site-panels/${featureId}/today?lang=en`);
      return (await (token ? req.set("Authorization", `Bearer ${token}`) : req).expect(200)).body;
    };
    const queue = (p: Obj) => p.parts.find((x: Obj) => x.key === "applications");
    const q = queue(await page());
    expect(q.votes).toEqual({ need: 2 });
    expect(q.decisions.find((d: Obj) => d.key === "accept")).toMatchObject({ afterVotes: true, tone: "good" });
    const row = q.rows.find((r: Obj) => r.cells.kind === "police" && r.cells.status === "fresh");
    // Who applied: the player's name, email and game accounts.
    expect(row.cells.$by).toEqual({ name: "Sara Khalil", email: EMAILS[0], discordId: "80351110224678912", steamId: "76561198000000001" });
    expect(row.votes).toEqual({ yes: 0, no: 0, mine: null, by: [] });

    const vote = (said: string, token?: string, note?: string) => {
      const req = request(app).post(`${at}/site-panels/${featureId}/today/applications/vote`).send({ row: row.id, vote: said, ...(note ? { note } : {}) });
      return token ? req.set("Authorization", `Bearer ${token}`) : req;
    };
    const accept = () => request(app).post(`${at}/site-panels/${featureId}/today/applications/decide`).send({ row: row.id, decision: "accept" });
    // No yes yet: it waits.
    expect((await accept().expect(409)).body).toMatchObject({ error: "VOTES_NEEDED", details: { need: 2, yes: 0 } });
    // The owner says no, then yes with a note: one vote, changed.
    await vote("no").expect(200);
    const once = queue((await vote("yes", undefined, "Strong answers").expect(200)).body).rows.find((r: Obj) => r.id === row.id);
    expect(once.votes).toMatchObject({ yes: 1, no: 0, mine: "yes", by: [{ vote: "yes", note: "Strong answers", me: true }] });
    await accept().expect(409);
    // Nour votes too, as herself: two yes, each with its name.
    const two = queue((await vote("yes", nour).expect(200)).body).rows.find((r: Obj) => r.id === row.id);
    expect(two.votes.yes).toBe(2);
    expect(two.votes.mine).toBe("yes");
    expect(two.votes.by.map((v: Obj) => v.name)).toEqual(["test@local", "Nour"]);
    // Taken back and given again: still two.
    await vote("none", nour).expect(200);
    expect(await prisma.rowVote.count({ where: { itemId: row.id } })).toBe(1);
    await vote("yes", nour).expect(200);
    // A queue that doesn't count votes takes none.
    await request(app).post(`${at}/site-panels/${featureId}/today/nope/vote`).send({ row: row.id, vote: "yes" }).expect(404);

    // Accepted: out of the queue; the player is on the whitelist with their game accounts, and is written to.
    const after = (await accept().expect(200)).body;
    expect(queue(after).rows.some((r: Obj) => r.id === row.id)).toBe(false);
    await settled();
    const listed = await prisma.collectionItem.findMany({ where: { collectionId: ids.table.whitelist, deletedAt: null } });
    expect(listed.map((r) => r.data)).toEqual([{ player: { ar: "Omar Haddad" }, email: EMAILS[0], discordId: { ar: "80351110224678912" }, steamId: { ar: "76561198000000001" }, kind: "police" }]);
    const mail = await prisma.outboxMessage.findFirst({ where: { to: EMAILS[0], template: "FN_MESSAGE" }, orderBy: { createdAt: "desc" } });
    expect(mail?.payloadJson).toMatchObject({ subject: "انقبلت!" });
    expect(JSON.stringify(mail?.payloadJson)).toContain("Omar Haddad");
    // The player reads where it stands.
    const mine = (await request(app).get("/v1/data/applications?mine=added").set("Authorization", `Bearer ${sara}`).expect(200)).body.data;
    expect(mine.filter((r: Obj) => r.values.kind === "police").map((r: Obj) => r.values.status).sort()).toEqual(["accepted", "rejected"]);
  }, 30_000);
});
