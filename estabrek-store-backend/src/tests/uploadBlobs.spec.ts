import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import sharp from "sharp";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { isCloudinaryEnabled } from "../lib/cloudinary.js";
import { loadCloudinaryAccount } from "../lib/cloudinaryAccount.js";
import { IMAGES_DIR } from "../modules/admin/uploads.controller.js";
import { UPLOAD_BLOB_MAX_BYTES, cleanUploadKey, keepDuplicateUpload, keepUploadBlob, readUpload, uploadKeyFromAddress } from "../lib/uploadBlobs.js";

// Pictures uploaded from the admin without a Cloudinary account: written on the server's disk, which Railway wipes at
// every deploy, so their bytes are kept in the database too (lib/uploadBlobs.ts) and /uploads/<path> is answered from
// there when the disk lost the file. With the database; no Cloudinary (the env's account is put aside). Requests to
// /v1/admin without a token run as the test owner.

// sharp keeps files open on Windows while they're cached: the deleted files must really go.
sharp.cache(false);

const ENV = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLOUDINARY_URL"] as const;
const had: Record<string, string | undefined> = {};
const madeAssets = new Set<string>();
const madeKeys = new Set<string>();
const madeFiles = new Set<string>();
let categoryId: string | null = null;
let productId: string | null = null;

/** A picture nobody else has (noise), so the library's duplicate check never finds another spec's. */
async function noisePng(width = 48, height = 32) {
  return sharp(randomBytes(width * height * 3), { raw: { width, height, channels: 3 } }).png().toBuffer();
}

async function uploadPng(png: Buffer, name = "logo.png") {
  const res = await request(app).post("/v1/admin/uploads/images").attach("file", png, { filename: name, contentType: "image/png" });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  const file = res.body.files[0];
  madeAssets.add(file.id);
  madeKeys.add(`images/${file.filename}`);
  return file as { id: string; filename: string; path: string; url: string; mimetype: string };
}

/** What a redeploy does: the server's disk comes back empty. */
async function wipeDisk(filename: string) {
  await fs.rm(path.join(IMAGES_DIR, filename), { force: true, maxRetries: 5, retryDelay: 100 });
  await expect(fs.stat(path.join(IMAGES_DIR, filename))).rejects.toThrow();
}

beforeAll(async () => {
  for (const k of ENV) {
    had[k] = process.env[k];
    delete process.env[k];
  }
  await loadCloudinaryAccount();
  expect(isCloudinaryEnabled()).toBe(false);
});

afterEach(() => {
  for (const k of ENV) delete process.env[k];
});

afterAll(async () => {
  const assets = await prisma.mediaAsset.findMany({ where: { id: { in: [...madeAssets] } }, select: { filename: true } });
  for (const a of assets) madeKeys.add(`images/${a.filename}`);
  await prisma.productItemImage.deleteMany({ where: { item: { productId: productId ?? "-" } } });
  await prisma.productItem.deleteMany({ where: { productId: productId ?? "-" } });
  if (productId) await prisma.product.deleteMany({ where: { id: productId } });
  if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.mediaAsset.deleteMany({ where: { id: { in: [...madeAssets] } } });
  await prisma.uploadBlob.deleteMany({ where: { path: { in: [...madeKeys] } } });
  for (const key of madeKeys) await fs.rm(path.join(IMAGES_DIR, path.basename(key)), { force: true, maxRetries: 5, retryDelay: 100 });
  for (const f of madeFiles) await fs.rm(f, { force: true, maxRetries: 5, retryDelay: 100 });
  for (const k of ENV) if (had[k] !== undefined) process.env[k] = had[k];
  await loadCloudinaryAccount();
});

describe("A picture uploaded without Cloudinary", () => {
  test("is kept in the database too, with its type and size", async () => {
    const png = await noisePng();
    const file = await uploadPng(png);
    expect(file.path).toBe(`/uploads/images/${file.filename}`);
    const onDisk = await fs.readFile(path.join(IMAGES_DIR, file.filename));
    const row = await prisma.uploadBlob.findUnique({ where: { path: `images/${file.filename}` } });
    expect(row).toMatchObject({ mime: "image/png", size: onDisk.length });
    expect(Buffer.from(row!.bytes).equals(onDisk)).toBe(true);
    expect(row!.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  test("still opens at the same address after a redeploy empties the disk", async () => {
    const file = await uploadPng(await noisePng());
    const before = await request(app).get(file.path).expect(200);
    await wipeDisk(file.filename);

    const after = await request(app).get(file.path).expect(200);
    expect(after.headers["content-type"]).toBe("image/png");
    expect(after.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(Buffer.from(after.body).equals(Buffer.from(before.body))).toBe(true);
    expect((await sharp(after.body).metadata()).format).toBe("png");

    // A browser that has it already gets a 304; HEAD answers the size without the bytes.
    const etag = after.headers.etag;
    expect(etag).toMatch(/^"[0-9a-f]{64}"$/);
    await request(app).get(file.path).set("If-None-Match", etag).expect(304);
    const head = await request(app).head(file.path).expect(200);
    expect(Number(head.headers["content-length"])).toBe(after.body.length);
  });

  test("keeps showing when Cloudinary is connected later", async () => {
    const file = await uploadPng(await noisePng());
    await wipeDisk(file.filename);
    process.env.CLOUDINARY_CLOUD_NAME = "later-store";
    process.env.CLOUDINARY_API_KEY = "123456789012345";
    process.env.CLOUDINARY_API_SECRET = "made-up-secret-for-a-test-0003";
    expect(isCloudinaryEnabled()).toBe(true);
    await request(app).get(file.path).expect(200).expect("Content-Type", "image/png");
  });

  test("deleting it from the library forgets its bytes", async () => {
    const file = await uploadPng(await noisePng());
    await request(app).delete(`/v1/admin/uploads/images/${file.id}`).expect(200);
    madeAssets.delete(file.id);
    expect(await prisma.uploadBlob.findUnique({ where: { path: `images/${file.filename}` } })).toBeNull();
    await request(app).get(file.path).expect(404);
  });

  test("can still be edited (focus mode) once the disk lost it", async () => {
    const file = await uploadPng(await noisePng(64, 40));
    await wipeDisk(file.filename);
    const res = await request(app).post("/v1/admin/uploads/edit").send({ url: file.url, recipe: { rotate: 90 } });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    madeAssets.add(res.body.file.id);
    madeKeys.add(`images/${res.body.file.filename}`);
    expect({ width: res.body.width, height: res.body.height }).toEqual({ width: 40, height: 64 });
    // The edited copy is kept the same way.
    await wipeDisk(res.body.file.filename);
    await request(app).get(res.body.file.path).expect(200).expect("Content-Type", "image/webp");
  });
});

describe("A picture lost by a deploy before this", () => {
  test("comes back under its old address when the same picture is uploaded again", async () => {
    const png = await noisePng();
    const old = await uploadPng(png);
    // As it was before pictures were kept in the database: the row says LOCAL, the disk lost the file.
    await prisma.uploadBlob.delete({ where: { path: `images/${old.filename}` } });
    await wipeDisk(old.filename);
    await request(app).get(old.path).expect(404);

    const again = await uploadPng(png);
    expect(again.id).toBe(old.id); // the library's duplicate check gives the old one back…
    expect(again.path).toBe(old.path);
    await request(app).get(old.path).expect(200).expect("Content-Type", "image/png"); // …and its address works again
  });

  test("a found duplicate still on the disk is kept from there", async () => {
    const png = await noisePng();
    const old = await uploadPng(png);
    await prisma.uploadBlob.delete({ where: { path: `images/${old.filename}` } });
    const onDisk = await fs.readFile(path.join(IMAGES_DIR, old.filename));
    const spare = path.join(os.tmpdir(), `spare-${Date.now()}.png`);
    madeFiles.add(spare);
    await fs.writeFile(spare, await noisePng());
    expect(await keepDuplicateUpload({ filename: old.filename, provider: "LOCAL", url: null }, { filePath: spare, mime: "image/png" })).toBe("from-disk");
    const row = await prisma.uploadBlob.findUnique({ where: { path: `images/${old.filename}` } });
    expect(Buffer.from(row!.bytes).equals(onDisk)).toBe(true);
    expect(await keepDuplicateUpload({ filename: old.filename, provider: "LOCAL", url: null }, { filePath: spare })).toBe("kept");
    expect(await keepDuplicateUpload({ filename: "x", provider: "CLOUDINARY", url: "https://res.cloudinary.com/x" }, { filePath: spare })).toBe("cloud");
  });
});

describe("The product photos wizard", () => {
  test("keeps its pictures in the database too", async () => {
    const slug = `blob-spec-${Date.now()}`;
    categoryId = (await prisma.category.create({ data: { name: "Blob spec", slug } })).id;
    productId = (await prisma.product.create({ data: { title: "Blob spec", slug, categoryId } })).id;
    const res = await request(app).post(`/v1/admin/catalog/products/${productId}/images/batch`).attach("files", await noisePng(), { filename: "front.png", contentType: "image/png" });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const file = res.body.files[0];
    madeAssets.add(file.id);
    madeKeys.add(`images/${file.filename}`);
    await wipeDisk(file.filename);
    await request(app).get(file.path).expect(200).expect("Content-Type", "image/png");
  });
});

describe("Kept files", () => {
  test("only plain paths under uploads/ are looked up", async () => {
    expect(cleanUploadKey("images/1795190743262-e81be7a6f1b96.png")).toBe("images/1795190743262-e81be7a6f1b96.png");
    for (const bad of ["", "../package.json", "images/../../x", "/etc/passwd", "images//x.png", "images\\x.png", "images/x y.png", "images/x.png\0"]) expect(cleanUploadKey(bad)).toBeNull();
    expect(uploadKeyFromAddress("https://api.example.com/uploads/images/a.png")).toBe("images/a.png");
    expect(uploadKeyFromAddress("/uploads/images/a.png")).toBe("images/a.png");
    expect(uploadKeyFromAddress("https://api.example.com/v1/settings")).toBeNull();
    expect(uploadKeyFromAddress("/uploads/%2E%2E/package.json")).toBeNull();
    await request(app).get("/uploads/..%2F..%2Fpackage.json").expect(404);
    await request(app).get("/uploads/images/never-uploaded.png").expect(404);
  });

  test("a file too big to keep stays on the disk only", async () => {
    const big = path.join(os.tmpdir(), `big-${Date.now()}.png`);
    madeFiles.add(big);
    await fs.writeFile(big, Buffer.alloc(UPLOAD_BLOB_MAX_BYTES + 1));
    expect(await keepUploadBlob("images/too-big-for-the-database.png", big, "image/png")).toBe(false);
    expect(await prisma.uploadBlob.findUnique({ where: { path: "images/too-big-for-the-database.png" } })).toBeNull();
  });

  test("anything but a picture type goes out as plain bytes", async () => {
    const odd = path.join(os.tmpdir(), `odd-${Date.now()}.png`);
    madeFiles.add(odd);
    await fs.writeFile(odd, "<svg onload=alert(1)>");
    const key = `images/odd-type-${Date.now()}.bin`;
    madeKeys.add(key);
    expect(await keepUploadBlob(key, odd, "text/html")).toBe(true);
    const res = await request(app).get(`/uploads/${key}`).expect(200);
    expect(res.headers["content-type"]).toBe("application/octet-stream");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect((await readUpload(key))?.mime).toBe("application/octet-stream");
  });
});
