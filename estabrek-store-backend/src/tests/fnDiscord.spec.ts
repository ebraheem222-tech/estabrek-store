import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetConnections, setTransportForTests, type Transport } from "../lib/fnHttp.js";
import { kindOf, kindsOut } from "../lib/fnKinds.js";
import { forgetReady } from "../lib/fnReady.js";
import { resetRunsForTests } from "../lib/runs.js";

// Discord as a ready connection (wave G2 of docs/sites-300-plan.ar.md), with the database: the owner's bot, connected
// once, writes in a channel and gives or takes a role; a game server's site gives the role to whoever it accepts
// ({{caller.discordId}}, or a customer step's {{player.discordId}}). Its token goes in a header to discord.com alone.
// The network is stood in for here; requests to /v1/admin without a token run as the test owner.

const PREFIX = "fndiscord-spec-";
const at = "/v1/admin/functions";
const conn = "/v1/admin/connections";
// A made-up token in a bot token's shape (three parts with dots), put together here so no file holds one.
const TOKEN = ["test".padEnd(24, "x"), "fakeit", "notarealtoken".padEnd(38, "z")].join(".");
const GUILD = "111111111111111111";
const CHANNEL = "222222222222222222";
const ROLE = "333333333333333333";
const MEMBER = "80351110224678912";
const EMAIL = "fndiscord.player@example.com";
type Sent = { method: string; url: string; headers: Record<string, string>; body?: string };

let sent: Sent[] = [];
let answer: (req: Sent) => { status?: number; text: string };
const network: Transport = async ({ method, url, headers, body }) => {
  const req = { method, url: url.toString(), headers, body };
  sent.push(req);
  const a = answer(req);
  return { status: a.status ?? 200, type: "application/json", text: a.text, cut: false };
};

const make = async (name: string, def: Record<string, unknown>, publish = true) => {
  const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200)).body;
  if (publish) {
    expect(saved.problems).toEqual([]);
    await request(app).post(`${at}/${made.id}/publish`).expect(200);
  }
  return { id: made.id as string, problems: saved.problems as Array<{ at: string; message: string }> };
};
const run = async (id: string, input: Record<string, unknown> = {}) => (await request(app).post(`${at}/${id}/run`).send({ input, dry: false, which: "live" }).expect(200)).body;
const discord = async (settings: Record<string, string> = { guild: GUILD, channel: CHANNEL }) =>
  ((await request(app).post(`${conn}/ready`).send({ kind: "discord", name: "City bot", key: `Bot ${TOKEN}`, settings }).expect(201)).body.ready as Array<{ id: string; name: string }>).find((c) => c.name === "City bot")!.id;

async function clean() {
  await resetRunsForTests();
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fnConnection.deleteMany({});
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  forgetConnections();
  forgetReady();
  sent = [];
  answer = () => ({ text: '{"id":"999999999999999999"}' });
}
beforeAll(() => setTransportForTests(network));
beforeEach(clean);
afterAll(async () => {
  await clean();
  setTransportForTests(null);
});

describe("Discord, by itself", () => {
  test("what a page is told; a bot's token as it is kept; its IDs are numbers", () => {
    expect(kindsOut().map((k) => k.kind)).toEqual(["telegram", "slack", "discord", "google", "api", "neon", "railway", "vercel", "cloudflare"]);
    expect(kindsOut().find((k) => k.kind === "discord")).toMatchObject({
      kind: "discord",
      label: "Discord",
      host: "discord.com",
      settings: [{ id: "guild", max: 22 }, { id: "channel", max: 22 }],
      actions: [{ id: "message" }, { id: "giveRole" }, { id: "takeRole" }],
      test: { sends: false },
    });
    const d = kindOf("discord")!;
    expect(d.key(`Bot ${TOKEN}`)).toBe(TOKEN);
    expect(d.key(TOKEN)).toBe(TOKEN);
    expect(d.key("123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw")).toBeNull();
    expect(d.settings[0].tidy!(` ${GUILD} `)).toBe(GUILD);
    expect(d.settings[0].tidy!("my server")).toBeNull();
  });
});

describe("A function's step through Discord", () => {
  test("its token is tried by asking Discord who the bot is; a message to the usual channel, nobody pinged by what is in it", async () => {
    const id = await discord();
    answer = () => ({ text: '{"id":"444","username":"City Bot"}' });
    const tried = (await request(app).post(`${conn}/ready/${id}/test`).send({}).expect(200)).body;
    expect(tried).toMatchObject({ ok: true, said: "City Bot" });
    expect(sent[0]).toMatchObject({ method: "GET", url: "https://discord.com/api/v10/users/@me" });
    expect(sent[0].headers.authorization).toBe(`Bot ${TOKEN}`);

    sent = [];
    answer = () => ({ text: '{"id":"999999999999999999"}' });
    const fn = await make("message", { inputs: [{ name: "name", type: "text" }], do: [{ act: "ready", via: id, what: "message", give: { text: "New application from {{input.name}} @everyone" }, as: "sent" }, { act: "return", value: "{{sent.body}}" }] });
    const out = await run(fn.id, { name: "Sara" });
    expect(out).toMatchObject({ ok: true, value: { id: "999999999999999999" } });
    expect(sent[0]).toMatchObject({ method: "POST", url: `https://discord.com/api/v10/channels/${CHANNEL}/messages` });
    expect(sent[0].headers.authorization).toBe(`Bot ${TOKEN}`);
    expect(JSON.parse(sent[0].body!)).toEqual({ content: "New application from Sara @everyone", allowed_mentions: { parse: [] } });
    expect(JSON.stringify(out)).not.toContain(TOKEN);
  });

  test("a role given to the player a customer step found, and taken back; a member's ID can't bend the address", async () => {
    const id = await discord({ guild: GUILD });
    await prisma.user.create({ data: { email: EMAIL, name: "Player", discordId: MEMBER, steamId: "76561198000000001" } });
    answer = () => ({ status: 204, text: "" });
    const fn = await make("role", {
      inputs: [{ name: "who", type: "text" }],
      do: [
        { act: "customer", who: "{{input.who}}", mark: "read", as: "player" },
        { act: "ready", via: id, what: "giveRole", give: { member: "{{player.discordId}}", role: ROLE }, as: "given" },
        { act: "return", value: { ok: "{{given.ok}}", steam: "{{player.steamId}}" } },
      ],
    });
    expect(await run(fn.id, { who: EMAIL })).toMatchObject({ ok: true, value: { ok: true, steam: "76561198000000001" } });
    expect(sent[0]).toMatchObject({ method: "PUT", url: `https://discord.com/api/v10/guilds/${GUILD}/members/${MEMBER}/roles/${ROLE}` });

    sent = [];
    const take = await make("take", { inputs: [{ name: "member", type: "text" }], do: [{ act: "ready", via: id, what: "takeRole", give: { member: "{{input.member}}", role: ROLE } }] });
    expect((await run(take.id, { member: MEMBER })).ok).toBe(true);
    expect(sent[0]).toMatchObject({ method: "DELETE", url: `https://discord.com/api/v10/guilds/${GUILD}/members/${MEMBER}/roles/${ROLE}` });
    // What a run puts in the address stays one part of it.
    sent = [];
    await run(take.id, { member: "../../channels/1/messages" });
    expect(sent[0].url).toBe(`https://discord.com/api/v10/guilds/${GUILD}/members/..%2F..%2Fchannels%2F1%2Fmessages/roles/${ROLE}`);
  });

  test("Discord's no, in its own words; the player's own Discord and Steam can be named by a step", async () => {
    const id = await discord({ guild: GUILD });
    answer = () => ({ status: 403, text: '{"message":"Missing Permissions","code":50013}' });
    const fn = await make("mine", { do: [{ act: "ready", via: id, what: "giveRole", give: { member: "{{caller.discordId}}", role: ROLE } }, { act: "return", value: "{{caller.steamId}}" }] });
    const out = await run(fn.id);
    expect(out).toMatchObject({ ok: false, failedAt: "do.0" });
    expect(out.error).toContain("Missing Permissions");
  });
});
