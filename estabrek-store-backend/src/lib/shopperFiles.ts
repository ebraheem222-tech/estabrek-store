/**
 * Files from shoppers (stage 2, item 4): a shopper (or anyone, where a table lets anyone add) uploads a picture or a
 * file into a picture or file field the owner opened for it (lib/fileKinds.ts `upload`), then writes the row with
 * what came back:
 *  - a public file: its address, which the row holds like any picture's;
 *  - a private file: "file:<id>", which only who may read the row opens, through a link that runs out (10 minutes).
 * What a file is, is read from its own bytes; a picture is made a plain webp (no place or camera data kept); any
 * other file is scanned first where the server scans files (lib/antivirus.ts). Kept in Cloudinary (public, or
 * "authenticated" for private ones, like the shoppers' request photos). A file no row holds a day after its upload
 * is deleted by the job "dataFiles".
 */
import crypto from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import sharp from "sharp";
import { prisma } from "./prisma.js";
import { AppError } from "../utils/httpError.js";
import { getCloudinary, isCloudinaryEnabled } from "./cloudinary.js";
import { scanFile } from "./antivirus.js";
import { IMAGE_SIDE, cleanName, kindsOf, sniff, type FileKind, type UploadRules } from "./fileKinds.js";
import type { Field } from "./collectionTree.js";

export const LINK_MINUTES = 10;
export const FILE_LIMITS = { orphanHours: 24, perShopperHour: 40, perAnyoneHour: 12, clean: 200 } as const;

/* ---------------- Where files are kept ---------------- */

export type Resource = "image" | "raw";
export type FileStorage = {
  ready: () => boolean;
  put: (data: Buffer, o: { resource: Resource; private: boolean; folder: string; format: string }) => Promise<{ location: string; url: string | null }>;
  remove: (location: string, o: { resource: Resource; private: boolean }) => Promise<void>;
  /** A private file's link that runs out. */
  link: (location: string, o: { resource: Resource; format: string }) => string;
};

export const cloudinaryFiles: FileStorage = {
  ready: () => isCloudinaryEnabled(),
  put: (data, o) =>
    new Promise((resolve, reject) => {
      const cld = getCloudinary();
      if (!cld) return reject(new AppError(503, "STORAGE_NOT_READY", "Files can't be kept right now"));
      const id = crypto.randomBytes(12).toString("hex");
      const up = cld.uploader.upload_stream(
        {
          resource_type: o.resource,
          type: o.private ? "authenticated" : "upload",
          folder: o.folder,
          // A raw file keeps its extension in its id (Cloudinary serves it by that name).
          public_id: o.resource === "raw" ? `${id}.${o.format}` : id,
          overwrite: false,
          ...(o.resource === "image" ? { format: o.format } : {}),
        },
        (err, res) => (err || !res ? reject(err ?? new Error("UPLOAD_FAILED")) : resolve({ location: res.public_id, url: o.private ? null : res.secure_url })),
      );
      Readable.from(data).pipe(up);
    }),
  remove: async (location, o) => {
    const cld = getCloudinary();
    if (cld) await cld.uploader.destroy(location, { resource_type: o.resource, type: o.private ? "authenticated" : "upload", invalidate: true });
  },
  link: (location, o) => {
    const cld = getCloudinary();
    if (!cld) throw new AppError(503, "STORAGE_NOT_READY", "Files can't be opened right now");
    return cld.utils.private_download_url(location, o.resource === "image" ? o.format : "", { resource_type: o.resource, type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + LINK_MINUTES * 60 });
  },
};

let storage: FileStorage = cloudinaryFiles;
export const fileStorage = () => storage;
/** Tests only. */
export function setFileStorage(s: FileStorage) {
  storage = s;
}

/* ---------------- An upload ---------------- */

export type Uploaded = { buffer: Buffer; originalname: string; size: number };
export type SavedFile = { id: string; value: string; name: string; kind: FileKind; bytes: number; private: boolean; url: string | null };

/** A picture as kept: upright, at most IMAGE_SIDE a side, webp, nothing about where or with what it was taken. */
async function cleanPicture(buf: Buffer) {
  try {
    const { data } = await sharp(buf, { failOnError: false }).rotate().resize({ width: IMAGE_SIDE, height: IMAGE_SIDE, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
    return data;
  } catch {
    throw new AppError(400, "FILE_UNREADABLE", "This picture can't be read");
  }
}

/** Scanned where the server scans files; a file it can't scan isn't kept. */
async function scanned(buf: Buffer, ext: string) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "upload-"));
  try {
    const file = path.join(dir, `upload.${ext}`);
    await writeFile(file, buf);
    const out = await scanFile(file);
    if (!out.ok) throw new AppError(out.code === "FILE_INFECTED" ? 422 : 503, out.code, out.code === "FILE_INFECTED" ? "This file was refused" : "This file couldn't be checked; try again later");
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * One file into one field of a table, under the field's own rules (FILE_TOO_BIG, FILE_KIND), kept, and noted.
 * `owner`: the signed-in shopper who uploaded it (a row only takes their own files, or anyone's unclaimed ones).
 */
export async function saveUpload(table: { id: string; slug: string }, field: Field, file: Uploaded, owner: string | null): Promise<SavedFile> {
  const rules = field.upload as UploadRules | undefined;
  if (!rules || (field.type !== "image" && field.type !== "file")) throw new AppError(400, "NO_UPLOADS", "This field doesn't take uploads");
  if (file.size > rules.maxMb * 1024 * 1024) throw new AppError(413, "FILE_TOO_BIG", `Up to ${rules.maxMb} MB`, { maxMb: rules.maxMb });
  const what = sniff(file.buffer, file.originalname);
  const kinds = kindsOf(field.type, rules);
  if (!what || !kinds.includes(what.kind)) throw new AppError(415, "FILE_KIND", "This kind of file isn't taken here", { kinds });
  if (!storage.ready()) throw new AppError(503, "STORAGE_NOT_READY", "Files can't be kept right now");
  const picture = what.kind === "image";
  const data = picture ? await cleanPicture(file.buffer) : file.buffer;
  if (!picture) await scanned(data, what.ext);
  const format = picture ? "webp" : what.ext;
  const resource: Resource = picture ? "image" : "raw";
  const isPrivate = rules.private === true;
  const put = await storage.put(data, { resource, private: isPrivate, folder: `estabrek-data/${table.slug}`, format });
  const saved = await prisma.storedFile.create({
    data: { collectionId: table.id, field: field.id, ownerId: owner, location: put.location, resource, format, name: cleanName(file.originalname, format), kind: what.kind, bytes: data.length, private: isPrivate, url: put.url },
  });
  return { id: saved.id, value: isPrivate ? `file:${saved.id}` : put.url!, name: saved.name, kind: what.kind, bytes: saved.bytes, private: isPrivate, url: put.url };
}

/* ---------------- Rows that hold files ---------------- */

/**
 * The private files a write names ("file:<id>") that it may not: not this table's and field's, or another shopper's
 * (a key may name any). Each as a row's problem.
 */
export async function fileIssues(table: { id: string }, fields: Field[], values: Record<string, unknown>, writer: { key: boolean; shopper: string | null }): Promise<Array<{ field: string; message: string }>> {
  const asked = fields.filter((f) => (f.type === "image" || f.type === "file") && typeof values[f.id] === "string" && /^file:/.test(String(values[f.id]).trim()));
  if (!asked.length) return [];
  const ids = asked.map((f) => String(values[f.id]).trim().slice(5));
  const found = await prisma.storedFile.findMany({ where: { id: { in: ids } }, select: { id: true, collectionId: true, field: true, ownerId: true } });
  return asked.flatMap((f) => {
    const id = String(values[f.id]).trim().slice(5);
    const x = found.find((y) => y.id === id);
    const mine = writer.key || !x?.ownerId || x.ownerId === writer.shopper;
    return x && x.collectionId === table.id && x.field === f.id && mine ? [] : [{ field: f.id, message: "No such file" }];
  });
}

/** Links for the private files these values name, by id: what a reader allowed to see the row gets (null: none). */
export async function privateLinks(ids: string[]): Promise<Map<string, { url: string; name: string; kind: string; bytes: number }>> {
  const out = new Map<string, { url: string; name: string; kind: string; bytes: number }>();
  if (!ids.length || !storage.ready()) return out;
  const files = await prisma.storedFile.findMany({ where: { id: { in: [...new Set(ids)] } } });
  for (const f of files) out.set(f.id, { url: storage.link(f.location, { resource: f.resource as Resource, format: f.format }), name: f.name, kind: f.kind, bytes: f.bytes });
  return out;
}

/**
 * The job "dataFiles": files no row holds (not even in the trash) a day after their upload are deleted, where they
 * are kept and here.
 */
export async function cleanFiles(now = Date.now()): Promise<{ removed: number }> {
  const before = new Date(now - FILE_LIMITS.orphanHours * 3600_000);
  const lost = await prisma.$queryRaw<Array<{ id: string; location: string; resource: string; private: boolean }>>`
    SELECT f."id", f."location", f."resource", f."private" FROM "StoredFile" f
    WHERE f."createdAt" < ${before}
      AND NOT EXISTS (
        SELECT 1 FROM "CollectionItem" i
        WHERE i."collectionId" = f."collectionId" AND i."data"->>f."field" IN ('file:' || f."id", COALESCE(f."url", ''))
      )
    LIMIT ${FILE_LIMITS.clean}`;
  let removed = 0;
  for (const f of lost) {
    await storage.remove(f.location, { resource: f.resource as Resource, private: f.private }).catch(() => undefined);
    await prisma.storedFile.delete({ where: { id: f.id } }).catch(() => undefined);
    removed += 1;
  }
  return { removed };
}
