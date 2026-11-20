// src/lib/uploadBlobs.ts
/**
 * Pictures uploaded from the admin, kept in the database when the store has no Cloudinary account.
 *
 * Without Cloudinary an upload is written under the server's uploads/ folder and served by express.static at
 * /uploads (app.ts). On Railway that disk is wiped at every deploy, so the bytes are kept in UploadBlob too, and
 * /uploads/<path> is answered from the database when the file isn't on the disk (serveUploadBlob, mounted right
 * after the static files). The address stays the same, so nothing saved in rows changes; when Cloudinary is
 * connected later, new pictures go there and these keep showing.
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { RequestHandler } from "express";
import { prisma } from "./prisma.js";

/** The folder express.static serves at /uploads. */
export const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
/** The largest file kept in the database. A logo or a product photo is far smaller after the optimizer (2000 px). */
export const UPLOAD_BLOB_MAX_BYTES = 10 * 1024 * 1024;

const MIME_OF: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};
/** Only picture types are answered as themselves; anything else goes out as plain bytes. */
const SERVED_MIME = new Set(Object.values(MIME_OF));

const servedMime = (mime: string | null | undefined, key: string) => {
  const m = String(mime ?? "").toLowerCase();
  if (SERVED_MIME.has(m)) return m;
  return MIME_OF[path.extname(key).toLowerCase()] ?? "application/octet-stream";
};

/** A key ("images/x.png") made only of plain name parts; null for anything else (.., slashes, odd letters). */
export function cleanUploadKey(raw: string): string | null {
  const key = String(raw ?? "");
  if (!key || key.length > 300) return null;
  const parts = key.split("/");
  if (parts.some((s) => !s || s === "." || s === ".." || !/^[\w.-]+$/.test(s))) return null;
  return key;
}

/** The key of a picture of the media library (MediaAsset.filename of a LOCAL one). */
export const imageBlobKey = (filename: string) => `images/${filename}`;

/** The key of an address on this server (/uploads/images/x.png, or the whole URL); null when it isn't one. */
export function uploadKeyFromAddress(address: string): string | null {
  let pathname = String(address ?? "");
  try {
    if (/^https?:\/\//i.test(pathname)) pathname = new URL(pathname).pathname;
    pathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!pathname.startsWith("/uploads/")) return null;
  return cleanUploadKey(pathname.slice("/uploads/".length));
}

const diskPath = (key: string) => path.join(UPLOADS_ROOT, ...key.split("/"));
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/**
 * Keeps a file's bytes in the database under `key`, so it outlives the server's disk. False when it is too big to
 * keep (it then stays on the disk only, as before) or the key isn't a plain one.
 */
export async function keepUploadBlob(key: string, filePath: string, mime?: string | null): Promise<boolean> {
  const clean = cleanUploadKey(key);
  if (!clean) return false;
  const bytes = await fs.readFile(filePath);
  if (bytes.length > UPLOAD_BLOB_MAX_BYTES) {
    console.warn(`[uploads] ${clean} is ${bytes.length} bytes, over the ${UPLOAD_BLOB_MAX_BYTES} kept in the database: it is on the server's disk only`);
    return false;
  }
  const data = { mime: servedMime(mime, clean), size: bytes.length, sha256: sha256(bytes), bytes };
  await prisma.uploadBlob.upsert({ where: { path: clean }, create: { path: clean, ...data }, update: data });
  return true;
}

/** Forgets a kept file (its picture was deleted from the library). */
export async function forgetUploadBlob(key: string) {
  const clean = cleanUploadKey(key);
  if (clean) await prisma.uploadBlob.deleteMany({ where: { path: clean } });
}

/** A file under uploads/: from the disk, or from the database when the disk lost it. */
export async function readUpload(key: string): Promise<{ bytes: Buffer; mime: string } | null> {
  const clean = cleanUploadKey(key);
  if (!clean) return null;
  try {
    return { bytes: await fs.readFile(diskPath(clean)), mime: servedMime(null, clean) };
  } catch {
    // not on the disk: the database
  }
  const row = await prisma.uploadBlob.findUnique({ where: { path: clean }, select: { bytes: true, mime: true } });
  return row ? { bytes: Buffer.from(row.bytes), mime: servedMime(row.mime, clean) } : null;
}

const onDisk = (key: string) =>
  fs.stat(diskPath(key)).then(
    (st) => st.isFile(),
    () => false,
  );

/**
 * Makes sure a picture kept on the server (not Cloudinary) outlives the disk: a found duplicate is returned instead
 * of a new upload, so its bytes must be somewhere. Kept already → nothing. Still on the disk → kept from there.
 * Lost (a deploy wiped it before its bytes were kept here) → the same picture just uploaded takes its place, so its
 * old address, saved in settings or pages, shows again.
 */
export async function keepDuplicateUpload(asset: { filename: string; provider?: string | null; url?: string | null }, upload: { filePath: string; mime?: string | null }): Promise<"cloud" | "skipped" | "kept" | "from-disk" | "restored"> {
  if (asset.provider === "CLOUDINARY" || asset.url) return "cloud";
  const key = imageBlobKey(asset.filename);
  if (!cleanUploadKey(key)) return "skipped";
  if (await prisma.uploadBlob.findUnique({ where: { path: key }, select: { path: true } })) return "kept";
  if (await onDisk(key)) {
    await keepUploadBlob(key, diskPath(key), MIME_OF[path.extname(key).toLowerCase()]);
    return "from-disk";
  }
  await keepUploadBlob(key, upload.filePath, upload.mime);
  return "restored";
}

/**
 * /uploads/<path> from the database, mounted right after express.static (which answers what is on the disk).
 * Long cache: a kept file's name is new for every upload, so its bytes never change.
 */
export const serveUploadBlob: RequestHandler = async (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  let key: string | null = null;
  try {
    key = cleanUploadKey(decodeURIComponent(req.path.replace(/^\/+/, "")));
  } catch {
    key = null;
  }
  if (!key) return next();
  try {
    const row = await prisma.uploadBlob.findUnique({ where: { path: key } });
    if (!row) return next();
    res.setHeader("Content-Type", servedMime(row.mime, key));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", `"${row.sha256}"`);
    res.setHeader("Last-Modified", row.updatedAt.toUTCString());
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.fresh) return res.status(304).end();
    const bytes = Buffer.from(row.bytes);
    res.setHeader("Content-Length", String(bytes.length));
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).end(bytes);
  } catch (e) {
    return next(e);
  }
};
