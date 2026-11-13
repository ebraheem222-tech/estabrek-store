import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { loadListData } from "../lib/collections.js";
import { expandLists } from "../lib/collectionTree.js";
import { dayOf } from "../lib/storeTime.js";

// The newer kinds of field with the database (B2): rows written from a file's words, then asked,
// sorted, searched, kept the only one, and sent out and back. Requests without a token run as the
// test owner. Days are the store's (Asia/Jerusalem unless STORE_TIMEZONE says otherwise).

const SLUG = "kinds-spec-things";
const fields = [
  { id: "title", type: "text", required: true },
  { id: "email", type: "email", unique: true },
  { id: "phone", type: "phone", unique: true },
  { id: "at", type: "datetime" },
  { id: "price", type: "money", currency: "USD", min: 0 },
  { id: "tags", type: "multiSelect", options: [{ id: "new", name: { en: "New", ar: "جديد" } }, { id: "sale", name: { en: "On sale" } }, { id: "last", name: { en: "Last pieces" } }] },
  { id: "manual", type: "file" },
  { id: "clip", type: "video" },
  { id: "model", type: "model3d" },
  { id: "extra", type: "json" },
  { id: "place", type: "location" },
];
let id = "";
const base = () => `/v1/admin/collections/${id}`;
const slugs = async (q: Record<string, unknown> = {}) => ((await request(app).get(`${base()}/rows`).query({ q: JSON.stringify({ sort: [{ field: "$slug", dir: "asc" }], ...q }) }).expect(200)).body.rows as Array<{ slug: string }>).map((r) => r.slug);
const by = (...filters: Array<Record<string, unknown>>) => slugs({ filters });
const row = (slug: string) => prisma.collectionItem.findFirstOrThrow({ where: { collectionId: id, slug } });

async function clean() {
  await prisma.collection.deleteMany({ where: { slug: SLUG } });
}
beforeAll(async () => {
  await clean();
  const made = await request(app).post("/v1/admin/collections").send({ slug: SLUG, name: { en: "Kinds spec" }, fields }).expect(201);
  id = made.body.id;
});
afterAll(clean);

const FILE = [
  { slug: "chair", status: "published", values: { title: "Chair", email: "Sara@Example.test", phone: "+970 599-000 001", at: "13/11/2026 14:30", price: "$1,250.50", tags: "جديد, On sale", manual: "https://files.test/chair-guide.pdf", clip: "/media/chair.mp4", model: "https://files.test/chair.glb", extra: '{"sizes":["S","M"],"note":"hand made"}', place: "31.778, 35.235, The old city" } },
  { slug: "table", values: { title: "Table", email: "lina@example.test", phone: "0599 000 002", at: "2026-11-14 01:00", price: "80", tags: "last" } },
  { slug: "lamp", values: { title: "Lamp", at: "2026-11-13T23:30:00Z", price: "0", extra: "12" } },
  { slug: "rug", values: { title: "Rug" } },
];

describe("Rows written from a file's words", () => {
  test("each kind is kept as it holds values; what isn't one is refused by name", async () => {
    const bad = [{ slug: "bad", values: { title: "Bad", email: "nope", phone: "call", at: "soon", price: "-5", tags: "new, old", manual: "ftp://x", model: "https://files.test/a.png", place: "here" } }];
    const out = await request(app).post(`${base()}/rows/import`).send({ rows: [...FILE, ...bad], lang: "en" }).expect(200);
    expect(out.body).toMatchObject({ created: 4, updated: 0 });
    expect(out.body.rejected).toEqual([
      {
        row: 4,
        slug: "bad",
        issues: [
          { field: "email", message: "An email address" },
          { field: "phone", message: "A phone number" },
          { field: "at", message: "A date and time" },
          { field: "price", message: "Too small" },
          { field: "tags", message: "Some of its choices" },
          { field: "manual", message: "A file's address" },
          { field: "model", message: "A 3D model's address (.glb or .gltf)" },
          { field: "place", message: "A place: latitude and longitude" },
        ],
      },
    ]);
    const chair = await row("chair");
    expect(chair.data).toEqual({
      title: { en: "Chair" },
      email: "sara@example.test",
      phone: "+970 599-000 001",
      // The store's wall clock (two hours ahead of UTC in November).
      at: "2026-11-13T12:30:00.000Z",
      price: 1250.5,
      tags: ["new", "sale"],
      manual: "https://files.test/chair-guide.pdf",
      clip: "/media/chair.mp4",
      model: "https://files.test/chair.glb",
      extra: { sizes: ["S", "M"], note: "hand made" },
      place: { lat: 31.778, lng: 35.235, label: "The old city" },
    });
    expect((await row("lamp")).data).toEqual({ title: { en: "Lamp" }, at: "2026-11-13T23:30:00.000Z", price: 0, extra: 12 });
  });
});

describe("Asking, sorting and searching", () => {
  test("emails and phones", async () => {
    expect(await by({ field: "email", op: "contains", value: "EXAMPLE" })).toEqual(["chair", "table"]);
    expect(await by({ field: "email", op: "is", value: "SARA@example.test" })).toEqual(["chair"]);
    expect(await by({ field: "email", op: "isNot", value: "sara@example.test" })).toEqual(["lamp", "rug", "table"]);
    expect(await by({ field: "email", op: "startsWith", value: "lina" })).toEqual(["table"]);
    expect(await by({ field: "email", op: "endsWith", value: "@example.test" })).toEqual(["chair", "table"]);
    expect(await by({ field: "email", op: "empty" })).toEqual(["lamp", "rug"]);
    // A number is the same number however it's spaced.
    expect(await by({ field: "phone", op: "is", value: "+970599000001" })).toEqual(["chair"]);
    expect(await by({ field: "phone", op: "is", value: "0599-000-002" })).toEqual(["table"]);
    expect(await by({ field: "phone", op: "contains", value: "599 000" })).toEqual(["chair", "table"]);
    expect(await by({ field: "phone", op: "notEmpty" })).toEqual(["chair", "table"]);
  });

  test("a date with its time: a day asked about is the store's day", async () => {
    // 23:30 UTC on the 13th and 01:00 store time on the 14th are both the 14th there.
    expect(dayOf("2026-11-13T23:30:00.000Z")).toBe("2026-11-14");
    expect(await by({ field: "at", op: "is", value: "2026-11-13" })).toEqual(["chair"]);
    expect(await by({ field: "at", op: "is", value: "2026-11-14" })).toEqual(["lamp", "table"]);
    expect(await by({ field: "at", op: "gt", value: "2026-11-13" })).toEqual(["lamp", "table"]);
    expect(await by({ field: "at", op: "gte", value: "2026-11-13" })).toEqual(["chair", "lamp", "table"]);
    expect(await by({ field: "at", op: "lt", value: "2026-11-14" })).toEqual(["chair"]);
    expect(await by({ field: "at", op: "lte", value: "2026-11-13" })).toEqual(["chair"]);
    expect(await by({ field: "at", op: "between", value: "2026-11-13", value2: "2026-11-14" })).toEqual(["chair", "lamp", "table"]);
    expect(await by({ field: "at", op: "empty" })).toEqual(["rug"]);
    expect(await slugs({ sort: [{ field: "at", dir: "desc" }] })).toEqual(["lamp", "table", "chair", "rug"]);
    expect(await slugs({ sort: [{ field: "at", dir: "asc" }] })).toEqual(["chair", "table", "lamp", "rug"]);
  });

  test("money, several choices, files, JSON and places", async () => {
    expect(await by({ field: "price", op: "gt", value: 50 })).toEqual(["chair", "table"]);
    expect(await by({ field: "price", op: "between", value: 0, value2: 100 })).toEqual(["lamp", "table"]);
    expect(await by({ field: "price", op: "is", value: 0 })).toEqual(["lamp"]);
    expect(await by({ field: "price", op: "empty" })).toEqual(["rug"]);
    expect(await slugs({ sort: [{ field: "price", dir: "desc" }] })).toEqual(["chair", "table", "lamp", "rug"]);
    expect(await by({ field: "tags", op: "anyOf", value: ["sale"] })).toEqual(["chair"]);
    expect(await by({ field: "tags", op: "anyOf", value: ["new", "last"] })).toEqual(["chair", "table"]);
    expect(await by({ field: "tags", op: "empty" })).toEqual(["lamp", "rug"]);
    expect(await by({ field: "tags", op: "notEmpty" })).toEqual(["chair", "table"]);
    expect(await by({ field: "manual", op: "contains", value: "GUIDE" })).toEqual(["chair"]);
    expect(await by({ field: "clip", op: "notEmpty" })).toEqual(["chair"]);
    expect(await by({ field: "model", op: "empty" })).toEqual(["lamp", "rug", "table"]);
    expect(await by({ field: "extra", op: "notEmpty" })).toEqual(["chair", "lamp"]);
    expect(await by({ field: "place", op: "notEmpty" })).toEqual(["chair"]);
    expect(await by({ field: "place", op: "empty" })).toEqual(["lamp", "rug", "table"]);
    await request(app).get(`${base()}/rows`).query({ q: JSON.stringify({ filters: [{ field: "tags", op: "is", value: "new" }] }) }).expect(400);
    await request(app).get(`${base()}/rows`).query({ q: JSON.stringify({ filters: [{ field: "extra", op: "contains", value: "x" }] }) }).expect(400);
  });

  test("search finds words inside every kind: an email, a place's name, JSON's words", async () => {
    expect(await slugs({ search: "lina@" })).toEqual(["table"]);
    expect(await slugs({ search: "old city" })).toEqual(["chair"]);
    expect(await slugs({ search: "hand made" })).toEqual(["chair"]);
    expect(await slugs({ search: "chair-guide" })).toEqual(["chair"]);
    // A field's name inside JSON is a key, not a value: not found.
    expect(await slugs({ search: "sizes" })).toEqual([]);
  });
});

describe("Changing rows", () => {
  test("a cell of each kind, written as people write it", async () => {
    const rug = await row("rug");
    const patch = (values: Record<string, unknown>) => request(app).patch(`${base()}/rows/${rug.id}`).send({ values, lang: "en" });
    const saved = await patch({ email: " Rug@Shop.test ", phone: "0599000009", at: "2026-12-01T09:00", price: "₪95", tags: "last, new", place: "32.08, 34.78", extra: '{"ok":true}', clip: "https://v.test/rug.mp4" }).expect(200);
    expect(saved.body.data).toEqual({ title: { en: "Rug" }, email: "rug@shop.test", phone: "0599000009", at: "2026-12-01T07:00:00.000Z", price: 95, tags: ["new", "last"], place: { lat: 32.08, lng: 34.78 }, extra: { ok: true }, clip: "https://v.test/rug.mp4" });
    // As the admin sends them: a moment, a list, a whole place.
    const typed = await patch({ at: "2026-12-02T10:00:00.000Z", tags: ["sale"], place: { lat: 32, lng: 34.5, label: "Shop" }, extra: [1, 2] }).expect(200);
    expect(typed.body.data).toMatchObject({ at: "2026-12-02T10:00:00.000Z", tags: ["sale"], place: { lat: 32, lng: 34.5, label: "Shop" }, extra: [1, 2] });
    expect((await patch({ tags: "", extra: null, place: "" }).expect(200)).body.data).toEqual({ title: { en: "Rug" }, email: "rug@shop.test", phone: "0599000009", at: "2026-12-02T10:00:00.000Z", price: 95, clip: "https://v.test/rug.mp4" });
    await patch({ tags: "new, gone" }).expect(400);
    await patch({ price: -1 }).expect(400);
    await patch({ place: { lat: 200, lng: 0 } }).expect(400);
  });

  test("the only email and the only phone, however they're written", async () => {
    const rug = await row("rug");
    const taken = async (values: Record<string, unknown>) => ((await request(app).patch(`${base()}/rows/${rug.id}`).send({ values, lang: "en" }).expect(400)).body.details.issues as Array<{ field: string; message: string }>).map((i) => `${i.field}: ${i.message}`);
    expect(await taken({ email: "SARA@EXAMPLE.TEST" })).toEqual(["email: Already used"]);
    expect(await taken({ phone: "+970599000001" })).toEqual(["phone: Already used"]);
    expect(await taken({ phone: "(+970) 599 000 001" })).toEqual(["phone: Already used"]);
    await request(app).patch(`${base()}/rows/${rug.id}`).send({ values: { phone: "0599-000-009" }, lang: "en" }).expect(200);
    // One value for many rows: fine for several choices and money.
    const [lamp, table] = [await row("lamp"), await row("table")];
    expect((await request(app).post(`${base()}/rows/bulk`).send({ ids: [lamp.id, table.id], op: "set", field: "tags", value: "new, sale" }).expect(200)).body.changed).toBe(2);
    expect((await row("lamp")).data).toMatchObject({ tags: ["new", "sale"] });
    expect((await request(app).post(`${base()}/rows/bulk`).send({ ids: [lamp.id, table.id], op: "set", field: "price", value: "$40" }).expect(200)).body.changed).toBe(2);
    await request(app).post(`${base()}/rows/bulk`).send({ ids: [lamp.id], op: "set", field: "tags", value: "gone" }).expect(400);
  });
});

describe("Out and back, and on the shop", () => {
  test("the CSV goes back in as it came out", async () => {
    const before = (await prisma.collectionItem.findMany({ where: { collectionId: id }, orderBy: { slug: "asc" } })).map((r) => [r.slug, r.data]);
    const csv = (await request(app).get(`${base()}/rows/export`).query({ q: JSON.stringify({ sort: [{ field: "$slug", dir: "asc" }] }) }).expect(200)).text.slice(1);
    const [head, ...lines] = csv.trim().split("\r\n");
    expect(head).toBe("slug,status,title.ar,title.en,title.he,email,phone,at,price,tags,manual,clip,model,extra,place");
    expect(lines[0]).toBe(`chair,PUBLISHED,,Chair,,sara@example.test,'+970 599-000 001,2026-11-13T12:30:00.000Z,1250.5,"new, sale",https://files.test/chair-guide.pdf,/media/chair.mp4,https://files.test/chair.glb,"{""note"":""hand made"",""sizes"":[""S"",""M""]}","31.778, 35.235, The old city"`);
    // A small reader for the test: quoted cells with commas and doubled quotes.
    const cells = (line: string) => [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)].slice(0, -1).map((m) => (m[1].startsWith('"') ? m[1].slice(1, -1).replace(/""/g, '"') : m[1]));
    const names = head.split(",");
    const rows = lines.map((line) => {
      const c = cells(line);
      const values: Record<string, string> = {};
      names.forEach((name, i) => { if (i > 1 && c[i]) values[name] = c[i]; });
      return { slug: c[0], status: c[1], values };
    });
    const out = await request(app).post(`${base()}/rows/import`).send({ rows, mode: "upsert", lang: "en" }).expect(200);
    expect(out.body).toMatchObject({ created: 0, updated: 4, rejected: [] });
    expect((await prisma.collectionItem.findMany({ where: { collectionId: id }, orderBy: { slug: "asc" } })).map((r) => [r.slug, r.data])).toEqual(before);
  });

  test("a list on a page shows a published row's values as words and links", async () => {
    const card = { id: "card", type: "stack", props: {}, children: [
      { id: "price", type: "text", props: { text: { en: "Price" }, bind: { text: "price" } } },
      { id: "tags", type: "text", props: { text: { en: "Tags" }, bind: { text: "tags" } } },
      { id: "mail", type: "button", props: { label: { en: "Write" }, href: "/", bind: { label: "email", href: "email" } } },
      { id: "map", type: "button", props: { label: { en: "Map" }, href: "/", bind: { label: "place", href: "place" } } },
      { id: "film", type: "video", props: { src: "/sample.mp4", bind: { src: "clip" } } },
    ] };
    const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "list", type: "collectionList", props: { collectionId: id }, children: [card] }] } };
    const drawn = expandLists(tree as never, await loadListData(tree as never)) as any;
    const kids = drawn.root.children[0].children[0].children as Array<{ id: string; props: Record<string, any> }>;
    const props = (nodeId: string) => kids.find((k) => k.id === nodeId)!.props;
    expect(props("price").text.en).toBe("US$1,250.50");
    expect(props("tags").text).toMatchObject({ en: "New, On sale", ar: "جديد، On sale" });
    expect(props("mail")).toMatchObject({ label: { en: "sara@example.test" }, href: "mailto:sara@example.test" });
    expect(props("map")).toMatchObject({ label: { en: "The old city" }, href: "https://www.google.com/maps/search/?api=1&query=31.778,35.235" });
    expect(props("film").src).toBe("/media/chair.mp4");
  });
});
