import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { forgetKeys } from "../lib/apiKeys.js";
import { forgetHits } from "../lib/hitLimit.js";

// The automatic API's documents, with the database (B4): /v1/data/openapi.json describes what the
// caller could call (anyone: what is open to everyone; a key: what it reaches), and the admin gets
// the whole of what is open, with TypeScript types. What the document says is what the routes do.

const PREFIX = "docs-spec-";
const P = `${PREFIX}posts`;
const A = `${PREFIX}authors`;
const F = `${PREFIX}forms`;
const admin = "/v1/admin";
type Doc = { openapi: string; servers: Array<{ url: string }>; paths: Record<string, Record<string, { operationId: string; security: unknown[] }>>; components: { schemas: Record<string, { properties: Record<string, unknown>; required?: string[] }> } };
const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const open = (id: string, access: Record<string, string>) => request(app).put(`${admin}/api/tables/${id}`).send({ read: "off", create: "off", update: "off", delete: "off", ...access }).expect(200);
const newKey = async (scopes: { tables: "*" | string[]; acts: string[] }) => (await request(app).post(`${admin}/api/keys`).send({ name: "Docs spec", scopes }).expect(201)).body.secret as string;
const docFor = async (key?: string) => (await (key ? request(app).get("/v1/data/openapi.json").set("X-Api-Key", key) : request(app).get("/v1/data/openapi.json")).expect(200)).body as Doc;
/** Only this spec's tables (the database may hold others'). */
const mine = (doc: Doc) => Object.keys(doc.paths).filter((p) => p.includes(PREFIX));

let posts = "";
let authors = "";
let forms = "";

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.apiKey.deleteMany({ where: { name: "Docs spec" } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@docs-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  forgetKeys();
  forgetHits();
  invalidateAccess();
}

beforeAll(async () => {
  await clean();
  authors = await mk(A, [{ id: "name", type: "text", required: true }]);
  posts = await mk(P, [
    { id: "title", type: "text", required: true },
    { id: "price", type: "number", min: 0 },
    { id: "tag", type: "select", options: [{ id: "news" }, { id: "guide" }] },
    { id: "author", type: "relation", to: authors },
  ]);
  forms = await mk(F, [{ id: "name", type: "text", required: true }, { id: "message", type: "longText" }]);
  await request(app).post(`${admin}/collections/${posts}/rows/import`).send({ lang: "en", rows: [{ slug: "p1", status: "PUBLISHED", values: { title: "First", price: 10, tag: "news" } }] }).expect(200);
});
afterAll(clean);

describe("The API's own description", () => {
  test("with every table closed there is a document, and nothing of these tables in it", async () => {
    const doc = await docFor();
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.servers).toEqual([{ url: "/v1/data" }]);
    expect(doc.paths["/"].get.operationId).toBe("listTables");
    expect(mine(doc)).toEqual([]);
    expect(JSON.stringify(doc)).not.toContain(PREFIX);
    // The name is the document's, not a table's.
    expect((await request(app).get("/v1/data/openapi").expect(404)).body.error).toBe("NOT_FOUND");
  });

  test("anyone's document: what is open to everyone; a key's: what it reaches", async () => {
    await open(posts, { read: "public", create: "key", update: "key", delete: "key" });
    await open(authors, { read: "key" });
    await open(forms, { create: "public" });
    const anyone = await docFor();
    expect(mine(anyone)).toEqual([`/${P}`, `/${P}/{row}`, `/${F}`]);
    expect(Object.keys(anyone.paths[`/${P}`])).toEqual(["get"]);
    expect(Object.keys(anyone.paths[`/${F}`])).toEqual(["post"]);
    expect(JSON.stringify(anyone)).not.toContain(A);
    // The posts' author links a table that isn't anyone's: not among the fields either.
    expect(Object.keys(anyone.components.schemas.DocsSpecPostsValues.properties)).toEqual(["title", "price", "tag"]);

    const whole = await docFor(await newKey({ tables: "*", acts: ["read", "create", "update", "delete"] }));
    expect(mine(whole)).toEqual([`/${A}`, `/${A}/{row}`, `/${P}`, `/${P}/{row}`, `/${F}`]);
    expect(Object.keys(whole.paths[`/${P}`])).toEqual(["get", "post"]);
    expect(Object.keys(whole.paths[`/${P}/{row}`])).toEqual(["get", "patch", "delete"]);
    expect(Object.keys(whole.components.schemas.DocsSpecPostsValues.properties)).toEqual(["title", "price", "tag", "author"]);
    expect(whole.components.schemas.DocsSpecPostsCreate.properties.values).toMatchObject({ required: ["title"] });

    const reader = await docFor(await newKey({ tables: [posts], acts: ["read"] }));
    expect(mine(reader)).toEqual([`/${P}`, `/${P}/{row}`, `/${F}`]);
    expect(Object.keys(reader.paths[`/${P}`])).toEqual(["get"]);
    // A key that doesn't work gets no document, like any other request.
    expect((await request(app).get("/v1/data/openapi.json").set("X-Api-Key", `ek_${"z".repeat(32)}`).expect(401)).body.error).toBe("INVALID_KEY");
  });

  test("what the document says is what the routes do", async () => {
    const key = await newKey({ tables: "*", acts: ["read", "create", "update", "delete"] });
    const doc = await docFor(key);
    const call = (method: string, path: string, body?: object) => {
      const req = (request(app) as unknown as Record<string, (url: string) => request.Test>)[method](`/v1/data${path}`).set("X-Api-Key", key);
      return body ? req.send(body) : req;
    };
    // Every documented operation of these tables is there and lets this key in.
    const made = (await call("post", `/${P}`, { values: { title: "From the document" }, lang: "en" }).expect(201)).body;
    const ops: Array<[string, string, number, object?]> = [
      ["get", `/${P}`, 200],
      ["get", `/${P}/p1`, 200],
      ["patch", `/${P}/${made.id}`, 200, { values: { price: 3 } }],
      ["delete", `/${P}/${made.id}`, 200],
      ["get", `/${A}`, 200],
      ["post", `/${F}`, 201, { values: { name: "A visitor" } }],
    ];
    const documented = mine(doc).flatMap((path) => Object.keys(doc.paths[path]).map((method) => `${method} ${path}`));
    expect(documented.sort()).toEqual([`get /${P}`, `post /${P}`, `get /${P}/{row}`, `patch /${P}/{row}`, `delete /${P}/{row}`, `get /${A}`, `get /${A}/{row}`, `post /${F}`].sort());
    for (const [method, path, status, body] of ops) await call(method, path, body).expect(status);
    // And what isn't documented isn't there.
    await call("delete", `/${A}/x`).expect(403);
    await call("get", `/${F}`).expect(403);
    // A row answers exactly the fields the document lists for it, and the row's own.
    const row = (await call("get", `/${P}/p1`).expect(200)).body;
    expect(Object.keys(row).sort()).toEqual([...doc.components.schemas.DocsSpecPostsRow.required!].sort());
    expect(Object.keys(row.values)).toEqual(Object.keys(doc.components.schemas.DocsSpecPostsValues.properties));
    const page = (await call("get", `/${P}?pageSize=1`).expect(200)).body;
    expect(Object.keys(page).sort()).toEqual([...doc.components.schemas.DocsSpecPostsPage.required!].sort());
    // A page on another address may read the key's limit from the answer.
    expect((await call("get", `/${P}`).expect(200)).headers["access-control-expose-headers"]).toContain("X-RateLimit-Key-Remaining");
  });

  test("the admin gets the whole of what is open, with types to copy; looking needs api:read", async () => {
    const out = (await request(app).get(`${admin}/api/docs`).expect(200)).body as { tables: number; openapi: Doc; types: string; openapiPath: string };
    expect(out.openapiPath).toBe("/v1/data/openapi.json");
    expect(mine(out.openapi)).toEqual([`/${A}`, `/${A}/{row}`, `/${P}`, `/${P}/{row}`, `/${F}`]);
    expect(Object.keys(out.openapi.paths[`/${P}/{row}`])).toEqual(["get", "patch", "delete"]);
    expect(out.tables).toBeGreaterThanOrEqual(3);
    expect(out.types).toContain(`/** ${P}: /v1/data/${P} */`);
    expect(out.types).toContain(["export type DocsSpecPostsValues<T = Words> = {", "  title: T | null;", "  price: number | null;", '  tag: "news" | "guide" | null;', "  author: LinkedRow<T>[];", "};"].join("\n"));
    expect(out.types).toContain("export type DocsSpecFormsInput = {\n  name: string | Words;\n  message?: string | Words | null;\n};");
    // A table closed again is gone from both.
    await open(forms, {});
    const after = (await request(app).get(`${admin}/api/docs`).expect(200)).body as { openapi: Doc; types: string };
    expect(mine(after.openapi)).not.toContain(`/${F}`);
    expect(after.types).not.toContain("DocsSpecForms");

    const role = await prisma.staffRole.create({ data: { name: `${PREFIX}editor`, permissions: ["pages:read", "pages:write"] } });
    const member = await prisma.adminUser.create({ data: { email: "editor@docs-spec.test", name: "editor", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    const token = `Bearer ${signAccessToken({ sub: member.id, role: "STAFF", email: member.email })}`;
    expect((await request(app).get(`${admin}/api/docs`).set("Authorization", token).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED", required: ["api:read"] });
  });
});
