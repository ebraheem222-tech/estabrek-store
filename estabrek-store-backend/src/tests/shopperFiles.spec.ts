import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import sharp from "sharp";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { forgetKeys } from "../lib/apiKeys.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetHits } from "../lib/hitLimit.js";
import { forgetShoppers } from "../modules/data/data.routes.js";
import { sniff, cleanName } from "../lib/fileKinds.js";
import { cleanFiles, cloudinaryFiles, setFileStorage, type FileStorage } from "../lib/shopperFiles.js";

// Files from shoppers (stage 2, item 4): a picture or file field the owner opened for uploads takes a shopper's file
// within its own limits (how many MB, which kinds: read from the file's own bytes), keeps a picture as a plain webp,
// and answers what to write: a public file's address, or "file:<id>" for a private one, which reads back as a link
// that runs out to those who may read the row, and as nothing to anyone else. A row only takes its writer's own
// files; files no row holds a day later go. Storage is played here: nothing reaches Cloudinary.

const PREFIX = "files-spec-";
const T = `${PREFIX}jobs`;
const P = `${PREFIX}open`;
const admin = "/v1/admin";
type Obj = Record<string, any>;
const kept = new Map<string, { data: Buffer; private: boolean; resource: string }>();
const removed: string[] = [];
let n = 0;
const played: FileStorage = {
  ready: () => true,
  put: async (data, o) => {
    const location = `${o.folder}/f${++n}`;
    kept.set(location, { data, private: o.private, resource: o.resource });
    return { location, url: o.private ? null : `https://res.cloudinary.com/demo/${o.resource}/upload/${location}.${o.format}` };
  },
  remove: async (location) => {
    removed.push(location);
    kept.delete(location);
  },
  link: (location) => `https://files.test/private/${location}?expires=600`,
};

const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const open = (id: string, settings: Obj) => request(app).put(`${admin}/api/tables/${id}`).send({ read: "off", create: "off", update: "off", delete: "off", ...settings });
const auth = (req: request.Test, who: string | null) => (!who ? req : who.startsWith("ek_") ? req.set("X-Api-Key", who) : req.set("Authorization", `Bearer ${who}`));
const up = (table: string, field: string, who: string | null, file: Buffer, name: string) => auth(request(app).post(`/v1/data/${table}/files/${field}`), who).attach("file", file, name);
const add = (table: string, who: string | null, values: Obj) => auth(request(app).post(`/v1/data/${table}`), who).send({ values });
const get = (path: string, who: string | null) => auth(request(app).get(`/v1/data${path}`), who);

const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(2000, 32), Buffer.from("\n%%EOF")]);
const EXE = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(500, 1)]);
let png: Buffer;
let jobs = "";
let pub = "";
let mona = "";
let sami = "";
let key = "";

async function setAccounts(on: boolean) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: on } });
  forgetFeatures();
}
async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.storedFile.deleteMany({ where: { collectionId: { in: old.map((c) => c.id) } } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.apiKey.deleteMany({ where: { name: "Files spec" } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@files-spec.test" } } });
  forgetKeys();
  forgetHits();
  forgetShoppers();
}

beforeAll(async () => {
  await clean();
  await setAccounts(true);
  setFileStorage(played);
  png = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: { r: 200, g: 80, b: 120 } } }).png().withMetadata({ exif: { IFD0: { Make: "Phone" } } }).toBuffer();
  const [a, b] = await Promise.all([prisma.user.create({ data: { email: "mona@files-spec.test", name: "Mona" } }), prisma.user.create({ data: { email: "sami@files-spec.test", name: "Sami" } })]);
  mona = signCustomerToken(a.id);
  sami = signCustomerToken(b.id);
  jobs = await mk(T, [
    { id: "name", type: "text", required: true },
    { id: "photo", type: "image", upload: { maxMb: 2 } },
    { id: "cv", type: "file", upload: { maxMb: 1, kinds: ["pdf"], private: true } },
    { id: "plain", type: "file" },
  ]);
  pub = await mk(P, [{ id: "name", type: "text", required: true }, { id: "cv", type: "file", upload: { maxMb: 1, kinds: ["pdf", "doc"], private: true } }]);
  await open(jobs, { read: "customer", create: "customer", update: "customer" }).expect(200);
  await open(pub, { read: "public", create: "public", update: "key" }).expect(200);
  key = (await request(app).post(`${admin}/api/keys`).send({ name: "Files spec", scopes: { tables: "*", acts: ["read", "create", "update"] } }).expect(201)).body.secret as string;
});
afterAll(async () => {
  await clean();
  await setAccounts(false);
  setFileStorage(cloudinaryFiles);
});
beforeEach(() => {
  forgetHits();
});

describe("What a file is", () => {
  test("read from its own bytes, not its name", () => {
    expect(sniff(Buffer.from("89504e470d0a1a0a0000", "hex"), "photo.jpg")).toMatchObject({ kind: "image", ext: "png" });
    expect(sniff(Buffer.from("ffd8ffe000104a46", "hex"), "x")).toMatchObject({ kind: "image", ext: "jpg" });
    expect(sniff(PDF, "cv.pdf")).toMatchObject({ kind: "pdf", ext: "pdf" });
    expect(sniff(Buffer.from("504b030414000000", "hex"), "cv.docx")).toMatchObject({ kind: "doc", ext: "docx" });
    expect(sniff(Buffer.from("504b030414000000", "hex"), "sales.xlsx")).toMatchObject({ kind: "sheet", ext: "xlsx" });
    expect(sniff(Buffer.from("504b030414000000", "hex"), "all.zip")).toMatchObject({ kind: "zip" });
    expect(sniff(Buffer.from("ID3\u0004\u0000song"), "a.mp3")).toMatchObject({ kind: "audio", ext: "mp3" });
    expect(sniff(Buffer.from("name,price\nscarf,40\n"), "list.csv")).toMatchObject({ kind: "sheet", ext: "csv" });
    expect(sniff(Buffer.from("hello there"), "note.txt")).toMatchObject({ kind: "text" });
    // A program called a PDF is nothing we take; nor are words with a NUL in them.
    expect(sniff(EXE, "cv.pdf")).toBeNull();
    expect(sniff(Buffer.from("a\u0000b"), "note.txt")).toBeNull();
    expect(cleanName("C:\\Users\\me\\My CV <final>.PDF", "pdf")).toBe("My CV final.pdf");
  });
});

describe("Uploads", () => {
  test("a picture is kept as a plain webp, at most 2400 px, its address the value to write", async () => {
    const out = (await up(T, "photo", mona, png, "IMG_2001.PNG").expect(201)).body;
    expect(out).toMatchObject({ kind: "image", private: false, name: "IMG_2001.webp" });
    expect(out.value).toMatch(/^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/estabrek-data\/files-spec-jobs\/f\d+\.webp$/);
    const stored = kept.get(out.value.replace(/^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\//, "").replace(/\.webp$/, ""))!;
    const meta = await sharp(stored.data).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 2400, height: 1200 });
    expect(meta.exif).toBeUndefined();
    const row = await prisma.storedFile.findUniqueOrThrow({ where: { id: out.id } });
    expect(row).toMatchObject({ field: "photo", format: "webp", resource: "image", private: false, url: out.value });
    expect(row.ownerId).not.toBeNull();
  });

  test("each field's own limits: its size, its kinds, only where the owner opened it; who may add rows", async () => {
    expect((await up(T, "cv", mona, Buffer.concat([PDF, Buffer.alloc(1_100_000)]), "big.pdf").expect(413)).body).toMatchObject({ error: "FILE_TOO_BIG", details: { maxMb: 1 } });
    expect((await up(T, "cv", mona, png, "cv.png").expect(415)).body).toMatchObject({ error: "FILE_KIND", details: { kinds: ["pdf"] } });
    expect((await up(T, "cv", mona, EXE, "cv.pdf").expect(415)).body.error).toBe("FILE_KIND");
    expect((await up(T, "plain", mona, PDF, "x.pdf").expect(404)).body.error).toBe("NO_UPLOADS");
    expect((await up(T, "name", mona, PDF, "x.pdf").expect(404)).body.error).toBe("NO_UPLOADS");
    expect((await up(T, "cv", null, PDF, "cv.pdf").expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    expect((await auth(request(app).post(`/v1/data/${T}/files/cv`), mona).expect(400)).body.error).toBe("FILE_NEEDED");
    // Only a picture or a file field takes uploads.
    const bad = await request(app).post(`${admin}/collections`).send({ slug: `${PREFIX}bad`, name: { en: "bad" }, fields: [{ id: "x", type: "text", upload: { maxMb: 2 } }] });
    expect(bad.status).toBe(400);
  });

  test("a private file: its row holds file:<id>, read back as a link that runs out, to the shopper and a key only; a row takes only its writer's own files", async () => {
    const cv = (await up(T, "cv", mona, PDF, "Mona CV.pdf").expect(201)).body;
    expect(cv).toMatchObject({ kind: "pdf", private: true, url: null, name: "Mona CV.pdf" });
    expect(cv.value).toBe(`file:${cv.id}`);
    expect(kept.get((await prisma.storedFile.findUniqueOrThrow({ where: { id: cv.id } })).location)?.private).toBe(true);
    // Sami can't put Mona's file in his row.
    expect((await add(T, sami, { name: { en: "Sami" }, cv: cv.value }).expect(400)).body.details.issues).toEqual([{ field: "cv", message: "No such file" }]);
    // Nor a file of another field.
    const photo = (await up(T, "photo", mona, png, "me.png").expect(201)).body;
    const made = (await add(T, mona, { name: { en: "Mona" }, cv: cv.value, photo: photo.value }).expect(201)).body as Obj;
    expect(made.values.cv).toBe(`https://files.test/private/${(await prisma.storedFile.findUniqueOrThrow({ where: { id: cv.id } })).location}?expires=600`);
    expect(made.values.photo).toBe(photo.value);
    const mine = (await get(`/${T}`, mona).expect(200)).body.data as Obj[];
    expect(mine[0].values.cv).toMatch(/^https:\/\/files\.test\/private\//);
    expect(((await get(`/${T}`, key).expect(200)).body.data as Obj[])[0].values.cv).toMatch(/^https:\/\/files\.test\/private\//);
    // Kept as written.
    expect(((await prisma.collectionItem.findUniqueOrThrow({ where: { id: made.id } })).data as Obj).cv).toBe(cv.value);
    // The admin opens it from the grid.
    expect((await request(app).get(`${admin}/collections/${jobs}/files/${cv.id}`).expect(200)).body).toMatchObject({ name: "Mona CV.pdf", kind: "pdf", url: expect.stringMatching(/^https:\/\/files\.test\/private\//) });
    expect((await request(app).get(`${admin}/collections/${pub}/files/${cv.id}`).expect(404)).body.error).toBe("NOT_FOUND");
  });

  test("where anyone may add: anyone uploads (so many an hour); a private file is nothing to a reader without a token", async () => {
    const cv = (await up(P, "cv", null, Buffer.concat([Buffer.from("504b0304", "hex"), Buffer.alloc(300)]), "cv.docx").expect(201)).body;
    expect(cv).toMatchObject({ kind: "doc", private: true });
    expect((await prisma.storedFile.findUniqueOrThrow({ where: { id: cv.id } })).ownerId).toBeNull();
    const made = (await add(P, null, { name: { en: "Anon" }, cv: cv.value }).expect(201)).body as Obj;
    expect(made.values.cv).toBeNull();
    // Published by a key, read by anyone: still nothing; by a key: the link.
    await auth(request(app).patch(`/v1/data/${P}/${made.id}`), key).send({ status: "published" }).expect(200);
    expect(((await get(`/${P}`, null).expect(200)).body.data as Obj[])[0].values.cv).toBeNull();
    expect(((await get(`/${P}`, key).expect(200)).body.data as Obj[])[0].values.cv).toMatch(/^https:\/\/files\.test\/private\//);
    for (let i = 0; i < 11; i++) await up(P, "cv", null, PDF, "x.pdf").expect(201);
    expect((await up(P, "cv", null, PDF, "x.pdf").expect(429)).body.error).toBe("RATE_LIMIT");
  });

  test("files no row holds a day later go; the ones a row holds stay", async () => {
    const before = await prisma.storedFile.count({ where: { collectionId: { in: [jobs, pub] } } });
    await prisma.storedFile.updateMany({ where: { collectionId: { in: [jobs, pub] } }, data: { createdAt: new Date(Date.now() - 25 * 3600_000) } });
    const { removed: count } = await cleanFiles();
    const left = await prisma.storedFile.findMany({ where: { collectionId: { in: [jobs, pub] } } });
    // Mona's row holds her CV and her photo (by its address); the anonymous row holds its CV.
    expect(left).toHaveLength(3);
    expect(count).toBe(before - 3);
    expect(removed.length).toBeGreaterThanOrEqual(count);
    // A fresh upload isn't touched however unheld.
    await up(T, "photo", mona, png, "new.png").expect(201);
    expect((await cleanFiles()).removed).toBe(0);
  });
});
