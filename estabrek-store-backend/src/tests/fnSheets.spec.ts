import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import { generateKeyPairSync, verify as verifySignature, type KeyObject } from "node:crypto";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { FnDefSchema, type FnDef } from "../lib/fnDef.js";
import { forgetConnections, setTransportForTests, type Transport } from "../lib/fnHttp.js";
import { READY_KEY, READY_LIMITS, cellOf, cellsOf, columnName, kindOf, kindsOut, rowsOf, settingsOf, sheetId, tabRef } from "../lib/fnKinds.js";
import { forgetReady } from "../lib/fnReady.js";
import { resetRunsForTests } from "../lib/runs.js";

// Google Sheets as a ready connection (F5), with the database: a service account's key (its JSON
// file) kept as a secret is, traded for an hour's token signed with its private key, and the
// "ready" step that adds a row to a spreadsheet or reads one. The network is stood in for here
// (it checks the signature with the account's public key); requests to /v1/admin without a token
// run as the test owner.

const PREFIX = "fnsheets-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
const conn = `${admin}/connections`;
const EMAIL = "store-sheets@made-up-project.iam.gserviceaccount.com";
const SHEET = "1aBcDeFgHiJkLmNoPqRsTuVwXyZ_0123456789-made";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET}/edit#gid=0`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://sheets.googleapis.com/v4/spreadsheets";

/** A service account made for this run (nothing real): its key file, and the public half to check what it signed. */
function account(email = EMAIL): { file: string; pub: KeyObject } {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  return { file: JSON.stringify({ type: "service_account", project_id: "made-up-project", private_key_id: "made-up", private_key: pem, client_email: email, client_id: "1", token_uri: TOKEN_URL }, null, 2), pub: publicKey };
}
let acct = account();

type Sent = { method: string; url: string; headers: Record<string, string>; body?: string };
type Out = { ok: boolean; dry: boolean; value: any; error: string | null; trace: Array<{ act: string; ok: boolean; note?: string }> };
let sent: Sent[] = [];
let tokens = 0;
/** What Google answers, by what was asked; the token endpoint checks the claim and its signature. */
let sheets: (req: Sent) => { status?: number; text: string } = () => ({ text: '{"updates":{"updatedRange":"Orders!A5:F5","updatedRows":1}}' });
let tokenAnswer: (() => { status: number; text: string }) | null = null;
let claims: Record<string, unknown>[] = [];
const network: Transport = async ({ method, url, headers, body }) => {
  const req = { method, url: url.toString(), headers, body };
  sent.push(req);
  if (req.url === TOKEN_URL) {
    if (tokenAnswer) return { ...tokenAnswer(), type: "application/json", cut: false };
    const form = new URLSearchParams(body ?? "");
    const [head, payload, signature] = (form.get("assertion") ?? "").split(".");
    const ok = form.get("grant_type") === "urn:ietf:params:oauth:grant-type:jwt-bearer" && verifySignature("RSA-SHA256", Buffer.from(`${head}.${payload}`), acct.pub, Buffer.from(signature ?? "", "base64url"));
    if (!ok) return { status: 400, type: "application/json", text: '{"error":"invalid_grant","error_description":"Invalid JWT Signature."}', cut: false };
    claims.push({ head: JSON.parse(Buffer.from(head, "base64url").toString()), ...JSON.parse(Buffer.from(payload, "base64url").toString()) });
    tokens += 1;
    return { status: 200, type: "application/json", text: JSON.stringify({ access_token: `made-up-access-token-${tokens}`, expires_in: 3599, token_type: "Bearer" }), cut: false };
  }
  const a = sheets(req);
  return { status: a.status ?? 200, type: "application/json; charset=UTF-8", text: a.text, cut: false };
};
const toSheets = () => sent.filter((s) => s.url.startsWith(API));
const toToken = () => sent.filter((s) => s.url === TOKEN_URL);

const addReady = (body: Record<string, unknown>) => request(app).post(`${conn}/ready`).send(body);
type Ready = { id: string; name: string; kind: string; settings: Record<string, string> };
const connect = async (name = "Orders", settings: Record<string, string> = { sheet: SHEET_URL, tab: "Orders" }) => ((await addReady({ kind: "google", name, key: acct.file, settings }).expect(201)).body.ready as Ready[]).find((c) => c.name === name)!;
const make = async (name: string, def: Partial<FnDef>, publish = true) => {
  const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200)).body;
  if (publish) {
    expect(saved.problems).toEqual([]);
    await request(app).post(`${at}/${made.id}/publish`).expect(200);
  }
  return { id: made.id as string, problems: saved.problems as Array<{ at: string; message: string }> };
};
const run = async (id: string, input: Record<string, unknown> = {}, opts: { dry?: boolean; which?: "draft" | "live" } = {}) => (await request(app).post(`${at}/${id}/run`).send({ input, dry: false, which: "live", ...opts }).expect(200)).body as Out;

async function clean() {
  await resetRunsForTests();
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fnConnection.deleteMany({});
  await prisma.fnSite.deleteMany({});
  forgetConnections();
  forgetReady();
  sent = [];
  claims = [];
  tokens = 0;
  tokenAnswer = null;
  sheets = () => ({ text: '{"updates":{"updatedRange":"Orders!A5:F5","updatedRows":1}}' });
}
beforeAll(() => setTransportForTests(network));
beforeEach(clean);
afterAll(async () => {
  await clean();
  setTransportForTests(null);
});

describe("The kind, by itself", () => {
  test("what a page is told: its key is a file, its settings, what is worked out from the key, what it does", () => {
    const g = kindsOut().find((k) => k.kind === "google")!;
    expect(kindsOut().map((k) => k.kind)).toEqual(["telegram", "slack", "google"]);
    expect(g).toEqual({
      kind: "google",
      label: "Google Sheets",
      host: "sheets.googleapis.com",
      settings: [{ id: "sheet", max: 300 }, { id: "tab", max: 100 }],
      actions: [
        { id: "append", fields: [{ id: "sheet", required: true, long: false, or: "sheet" }, { id: "tab", required: true, long: false, or: "tab" }, { id: "cells", required: true, long: true }] },
        { id: "read", fields: [{ id: "sheet", required: true, long: false, or: "sheet" }, { id: "tab", required: true, long: false, or: "tab" }, { id: "range", required: false, long: false }] },
      ],
      test: { sends: false },
      keyFile: ".json",
      derived: ["account"],
    });
    // The others are as they were.
    expect(kindsOut()[0]).not.toHaveProperty("keyFile");
    expect(READY_LIMITS.key).toBeGreaterThan(acct.file.length);
  });

  test("its key: a service account's file, kept as its address and private key and nothing else of it", () => {
    const g = kindOf("google")!;
    const kept = JSON.parse(g.key(acct.file)!);
    expect(Object.keys(kept)).toEqual(["client_email", "private_key"]);
    expect(kept.client_email).toBe(EMAIL);
    expect(g.derive!(g.key(acct.file)!)).toEqual({ account: EMAIL });
    const file = JSON.parse(acct.file);
    for (const bad of [
      "not json",
      JSON.stringify({ ...file, type: "authorized_user" }),
      JSON.stringify({ ...file, private_key: undefined }),
      JSON.stringify({ ...file, private_key: "-----BEGIN " + "PRIVATE KEY-----\nbroken\n-----END " + "PRIVATE KEY-----\n" }),
      JSON.stringify({ ...file, client_email: "someone@gmail.com" }),
      "",
    ])
      expect(g.key(bad)).toBeNull();
    expect(g.keyLooks).toContain("service_account");
  });

  test("a spreadsheet by its address or its id, a tab in quotes, columns by letter, cells made plain values", () => {
    expect(sheetId(SHEET_URL)).toBe(SHEET);
    expect(sheetId(`  ${SHEET} `)).toBe(SHEET);
    expect(sheetId("https://docs.google.com/document/d/abc/edit")).toBeNull();
    expect(sheetId("short")).toBeNull();
    expect(sheetId("{{input.sheet}}")).toBeNull();
    expect([tabRef("Orders"), tabRef("It's here")]).toEqual(["'Orders'", "'It''s here'"]);
    expect([0, 25, 26, 51, 701, 702].map(columnName)).toEqual(["A", "Z", "AA", "AZ", "ZZ", "AAA"]);
    expect([cellOf(240), cellOf(true), cellOf("x"), cellOf(null), cellOf(undefined), cellOf(Number.NaN), cellOf(["a", 2, null]), cellOf({ x: 1 }), cellOf([{ x: 1 }])]).toEqual([240, true, "x", "", "", "", "a, 2, ", '{"x":1}', '[{"x":1}]']);
    expect(cellsOf(" a \n\n b\r\nc\n\n\n")).toEqual(["a", "", "b", "c"]);
    expect(cellsOf("x\n".repeat(150))).toHaveLength(READY_LIMITS.cells);
    // The first row names the columns; a column with no name goes by its letter; a short row is filled in.
    expect(rowsOf([["product", "price", ""], ["Shawl", "120", "x"], ["Abaya"]])).toEqual({ values: [["product", "price", ""], ["Shawl", "120", "x"], ["Abaya"]], rows: [{ product: "Shawl", price: "120", C: "x" }, { product: "Abaya", price: "", C: "" }], count: 2 });
    expect(rowsOf(undefined)).toEqual({ values: [], rows: [], count: 0 });
    expect(rowsOf([["a"], ["1", "2"]]).rows).toEqual([{ a: "1", B: "2" }]);
  });

  test("its settings: the sheet's address kept as its id; what is worked out from the key isn't typed", () => {
    const g = kindOf("google")!;
    expect(settingsOf(g, { sheet: SHEET_URL, tab: " Orders " })).toEqual({ sheet: SHEET, tab: "Orders" });
    expect(settingsOf(g, { sheet: "not a sheet" })).toBeNull();
    expect(settingsOf(g, { tab: "{{input.tab}}" })).toBeNull();
    // A page sends back what it was shown: the account is left out, never refused nor taken.
    expect(settingsOf(g, { sheet: SHEET, account: "someone@else.test" })).toEqual({ sheet: SHEET });
    expect(settingsOf(g, { sheet: "" })).toEqual({});
    // The others still refuse a setting they don't have.
    expect(settingsOf(kindOf("telegram")!, { account: "x" })).toBeNull();
  });

  test("its calls: the key is a token in a header; the sheet, tab and range are made safe for the address", () => {
    const g = kindOf("google")!;
    const [append, read] = g.actions;
    const call = append.call({ sheet: SHEET, tab: "Orders" }, { cells: "{{input.name}}\n{{input.total}}" });
    expect(call).toMatchObject({ method: "POST", url: `${API}/${SHEET}/values/'Orders':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, headers: { authorization: `Bearer {{secret.${READY_KEY}}}` }, body: { majorDimension: "ROWS", values: [["{{input.name}}", "{{input.total}}"]] } });
    // The step's own spreadsheet (an address too) and tab come before the connection's usual ones; a run's name stays for the call to fill.
    expect(append.call({ sheet: SHEET, tab: "Orders" }, { sheet: SHEET_URL.replace(SHEET, "2zz" + SHEET.slice(3)), tab: "It's here", cells: "x" }).url).toBe(`${API}/2zz${SHEET.slice(3)}/values/'It''s%20here':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`);
    expect(append.call({ sheet: SHEET }, { tab: "{{input.tab}}", cells: "x" }).url).toBe(`${API}/${SHEET}/values/'{{input.tab}}':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`);
    expect(append.call({}, { cells: "x" }).finish!({ majorDimension: "ROWS", values: [[1, ["a", "b"], { x: 1 }, null]] })).toEqual({ majorDimension: "ROWS", values: [[1, "a, b", '{"x":1}', ""]] });
    expect(read.call({ sheet: SHEET, tab: "Prices" }, { range: "A1:B10" }).url).toBe(`${API}/${SHEET}/values/'Prices'!A1%3AB10?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`);
    expect(read.call({ sheet: SHEET, tab: "Prices" }, {}).url).toBe(`${API}/${SHEET}/values/'Prices'?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`);
    expect(append.answer!({ updates: { updatedRange: "Orders!A5:B5", updatedRows: 1 } })).toEqual({ range: "Orders!A5:B5", rows: 1 });
    expect(g.why({ error: { code: 403, message: "The caller does not have permission", status: "PERMISSION_DENIED" } })).toBe("The caller does not have permission");
    expect(g.test.call({}, "")).toBeNull();
    expect(g.test.said(null, { account: EMAIL })).toBe(EMAIL);
    expect(g.test.said({ properties: { title: "Orders 2026" }, sheets: [{ properties: { title: "Sheet1" } }, { properties: { title: "Archive" } }] })).toBe("Orders 2026 (Sheet1, Archive)");
    // The claim it signs: who, for what, to whom, for an hour.
    const ask = g.token!.ask(g.key(acct.file)!, Date.UTC(2026, 10, 17, 12));
    expect([ask.url, ask.type]).toEqual([TOKEN_URL, "application/x-www-form-urlencoded"]);
    const [head, payload] = new URLSearchParams(ask.body).get("assertion")!.split(".");
    expect(JSON.parse(Buffer.from(head, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toEqual({ iss: EMAIL, scope: "https://www.googleapis.com/auth/spreadsheets", aud: TOKEN_URL, iat: 1_794_916_800, exp: 1_794_920_400 });
    expect(g.token!.read({ access_token: "made-up", expires_in: 3599 })).toEqual({ token: "made-up", seconds: 3599 });
    expect(g.token!.read({ error: "invalid_grant" })).toBeNull();
    expect(g.token!.why({ error: "invalid_grant", error_description: "Invalid JWT Signature." })).toBe("Invalid JWT Signature.");
  });
});

describe("A spreadsheet connected", () => {
  test("its key is never answered; the account to share the sheet with is; the account stays with the key", async () => {
    const c = await connect();
    expect(c.settings).toEqual({ sheet: SHEET, tab: "Orders", account: EMAIL });
    const page = JSON.stringify((await request(app).get(conn).expect(200)).body);
    expect(page).not.toContain("PRIVATE KEY");
    expect(page).not.toContain(acct.file.slice(200, 260));
    // Saved again as a page sends it (the account in it, even changed): the account is the key's.
    const again = ((await request(app).put(`${conn}/ready/${c.id}`).send({ settings: { sheet: SHEET, tab: "Archive", account: "someone@else.test" } }).expect(200)).body.ready as Ready[])[0];
    expect(again.settings).toEqual({ sheet: SHEET, tab: "Archive", account: EMAIL });
    // A new name only: the settings stay.
    expect(((await request(app).put(`${conn}/ready/${c.id}`).send({ name: "Orders sheet" }).expect(200)).body.ready as Ready[])[0].settings).toEqual({ sheet: SHEET, tab: "Archive", account: EMAIL });
    // A new key (another account): its address comes with it.
    acct = account("other@made-up-project.iam.gserviceaccount.com");
    expect(((await request(app).put(`${conn}/ready/${c.id}`).send({ key: acct.file }).expect(200)).body.ready as Ready[])[0].settings).toEqual({ sheet: SHEET, tab: "Archive", account: "other@made-up-project.iam.gserviceaccount.com" });
    acct = account();
    // What isn't a key, or a sheet, is said.
    expect((await addReady({ kind: "google", name: "Bad", key: '{"type":"service_account"}' }).expect(400)).body).toMatchObject({ error: "KEY_INVALID" });
    expect((await addReady({ kind: "google", name: "Bad", key: acct.file, settings: { sheet: "https://example.com/x" } }).expect(400)).body.error).toBe("SETTING_INVALID");
    await addReady({ kind: "google", name: "Huge", key: "x".repeat(READY_LIMITS.key + 1) }).expect(400);
  });

  test("tried: the key traded for a token and the spreadsheet's title and tabs read; without one, the account", async () => {
    const c = await connect();
    sheets = () => ({ text: '{"properties":{"title":"Orders 2026"},"sheets":[{"properties":{"title":"Orders"}},{"properties":{"title":"Archive"}}]}' });
    expect((await request(app).post(`${conn}/ready/${c.id}/test`).send({}).expect(200)).body).toEqual({ ok: true, status: 200, said: "Orders 2026 (Orders, Archive)", why: null, sends: false });
    expect(toToken()).toHaveLength(1);
    expect(toToken()[0]).toMatchObject({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" } });
    expect(claims[0]).toMatchObject({ head: { alg: "RS256", typ: "JWT" }, iss: EMAIL, scope: "https://www.googleapis.com/auth/spreadsheets", aud: TOKEN_URL });
    expect((claims[0].exp as number) - (claims[0].iat as number)).toBe(3600);
    expect(Math.abs((claims[0].iat as number) - Date.now() / 1000)).toBeLessThan(60);
    expect(toSheets()[0]).toMatchObject({ method: "GET", url: `${API}/${SHEET}?fields=properties.title,sheets.properties.title`, headers: { authorization: "Bearer made-up-access-token-1" } });
    // The private key never leaves: only what it signed.
    expect(sent.some((s) => JSON.stringify(s).includes("PRIVATE KEY"))).toBe(false);
    // No spreadsheet: the token is the test, and the account is what is said.
    const bare = await connect("Bare", {});
    sent = [];
    expect((await request(app).post(`${conn}/ready/${bare.id}/test`).send({}).expect(200)).body).toEqual({ ok: true, status: 200, said: EMAIL, why: null, sends: false });
    expect([toToken().length, toSheets().length]).toEqual([1, 0]);
    // Google says no to the key, or to the sheet: in its own words.
    tokenAnswer = () => ({ status: 400, text: '{"error":"invalid_grant","error_description":"Invalid JWT Signature."}' });
    expect((await request(app).post(`${conn}/ready/${c.id}/test`).send({}).expect(200)).body).toEqual({ ok: false, status: 0, said: null, why: "Google Sheets refused the key: Invalid JWT Signature.", sends: false });
    tokenAnswer = null;
    sheets = () => ({ status: 403, text: '{"error":{"code":403,"message":"The caller does not have permission","status":"PERMISSION_DENIED"}}' });
    expect((await request(app).post(`${conn}/ready/${c.id}/test`).send({}).expect(200)).body).toEqual({ ok: false, status: 403, said: null, why: "The caller does not have permission", sends: false });
  });

  test("a function adds a row: each line a cell, a number stays a number, nothing becomes a formula", async () => {
    const c = await connect();
    const { id } = await make("append", {
      inputs: [{ name: "name", type: "text" }, { name: "total", type: "number" }, { name: "tags", type: "any" }, { name: "meta", type: "any" }],
      do: [
        { act: "ready", via: c.id, what: "append", give: { cells: "{{input.name}}\n{{input.total}}\n\n{{input.tags}}\n=HYPERLINK(\"https://x.test\")\n{{input.meta}}\nOrder of {{input.name}}\n\n" }, as: "added" },
        { act: "return", value: "{{added.body}}" },
      ],
    });
    const out = await run(id, { name: "Sara", total: 240, tags: ["silk", "rose"], meta: { gift: true } });
    expect(out).toMatchObject({ ok: true, value: { range: "Orders!A5:F5", rows: 1 } });
    const [token, append] = sent;
    expect(token.url).toBe(TOKEN_URL);
    expect(append).toMatchObject({ method: "POST", url: `${API}/${SHEET}/values/'Orders':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, headers: { authorization: "Bearer made-up-access-token-1", "content-type": "application/json" } });
    expect(JSON.parse(append.body!)).toEqual({ majorDimension: "ROWS", values: [["Sara", 240, "", "silk, rose", '=HYPERLINK("https://x.test")', '{"gift":true}', "Order of Sara"]] });
    expect(out.trace.find((t) => t.act === "ready")).toMatchObject({ ok: true });
    // Another run within the hour: the same token, nothing traded again.
    await run(id, { name: "Lina", total: 99, tags: [], meta: null });
    expect([toToken().length, toSheets().length]).toEqual([1, 2]);
    expect(toSheets()[1].headers.authorization).toBe("Bearer made-up-access-token-1");
    // The key changed (or the server restarted): traded afresh.
    forgetReady();
    await run(id, { name: "Maya", total: 1, tags: [], meta: null });
    expect(toToken()).toHaveLength(2);
    expect(toSheets()[2].headers.authorization).toBe("Bearer made-up-access-token-2");
    // A try (dry) sends nothing at all: no token is asked for.
    sent = [];
    const dry = await run(id, { name: "x", total: 1, tags: [], meta: null }, { dry: true, which: "draft" });
    expect([dry.ok, sent.length]).toEqual([true, 0]);
  });

  test("a function reads a sheet: its rows by the first row's names", async () => {
    const c = await connect("Prices", { sheet: SHEET, tab: "Prices" });
    sheets = (req) => ({ text: JSON.stringify({ range: "Prices!A1:B3", majorDimension: "ROWS", values: [["product", "price"], ["Shawl", "120"], ["Abaya", req.headers.authorization.slice(7)]] }) });
    const { id } = await make("read", {
      do: [
        { act: "ready", via: c.id, what: "read", give: { range: "A1:B10" }, as: "prices" },
        { act: "return", value: { rows: "{{prices.body.rows}}", count: "{{prices.body.count}}", first: "{{prices.body.rows.0.price}}" } },
      ],
    });
    const out = await run(id);
    expect(toSheets()[0]).toMatchObject({ method: "GET", url: `${API}/${SHEET}/values/'Prices'!A1%3AB10?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE` });
    expect(out.ok).toBe(true);
    expect(out.value.count).toBe(2);
    expect(out.value.first).toBe("120");
    expect(out.value.rows[0]).toEqual({ product: "Shawl", price: "120" });
    // A token that comes back in an answer is cut out before the run sees it.
    expect(JSON.stringify(out)).not.toContain("made-up-access-token");
    expect(out.value.rows[1].price).toBe("•••");
  });

  test("what stands in the way: a sheet or tab nobody named, Google saying no, the site closed to other steps", async () => {
    const bare = await connect("Bare", {});
    const p = (await make("nothing", { do: [{ act: "ready", via: bare.id, what: "append", give: {} }] }, false)).problems.map((x) => x.message);
    expect(p).toEqual(["The spreadsheet is empty", "The tab is empty", "The row is empty"]);
    const read = (await make("unread", { do: [{ act: "ready", via: bare.id, what: "read", give: { sheet: SHEET, tab: "Prices" } }] }, false)).problems;
    expect(read).toEqual([]);
    expect(FnDefSchema.safeParse({ inputs: [], do: [{ act: "ready", via: bare.id, what: "append", give: { cells: "x", sheet: SHEET, tab: "T" } }] }).success).toBe(true);
    // Google says no in a run: the run stops, with its words.
    const c = await connect();
    sheets = () => ({ status: 403, text: '{"error":{"code":403,"message":"The caller does not have permission","status":"PERMISSION_DENIED"}}' });
    const { id } = await make("refused", { do: [{ act: "ready", via: c.id, what: "append", give: { cells: "x" } }] });
    const out = await run(id);
    expect([out.ok, out.error]).toEqual([false, 'Google Sheets "Orders" answered 403: The caller does not have permission']);
    tokenAnswer = () => ({ status: 400, text: '{"error":"invalid_grant","error_description":"Invalid JWT Signature."}' });
    forgetReady();
    expect((await run(id)).error).toBe("Google Sheets refused the key: Invalid JWT Signature.");
    tokenAnswer = null;
    // Its site isn't opened to a step that calls sites, and its key (or token) can't be named there.
    const { problems } = await make("borrow", { do: [{ act: "http", method: "GET", url: `${API}/${SHEET}`, headers: { authorization: `Bearer {{secret.${READY_KEY}}}` } }] }, false);
    expect(problems.map((x) => x.message).join(" | ")).toMatch(/sheets\.googleapis\.com|CONNECTION_KEY|secret/);
  });
});
