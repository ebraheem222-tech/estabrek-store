import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { scanFile } from "../../lib/antivirus.js";
import {
  VIDEO_FOLDER,
  checkVideoUrl,
  cloudinaryVideo,
  deleteVideoFromCloudinary,
  isCloudinaryEnabled,
  requestVideoRendition,
  requestVideoStream,
  signVideoUpload,
  videoFrameUrl,
} from "../../lib/cloudinary.js";
import {
  DEFAULT_STREAM,
  STREAM_LADDERS,
  StreamProfileSchema,
  VIDEO_FPS,
  VIDEO_PRESET_PROFILES,
  VIDEO_WIDTHS,
  VideoProfileSchema,
  cloudinaryTransformation,
  ffmpegArgs,
  ffmpegHlsArgs,
  parseRenditions,
  streamHeights,
  type Rendition,
  type StreamProfile,
  type VideoProfile,
} from "../../lib/videoProfiles.js";
import { ffmpegAvailable, grabFrame, probeVideo, queueConversion, runFfmpeg } from "../../lib/ffmpeg.js";
import { MEDIA_LIMITS, MediaSettingsSchema, VIDEO_PRESETS, mediaSettings, mediaSettingsDefaults, type VideoPresetName } from "../../lib/mediaSettings.js";
import { readPerformance, savePerformance } from "../../lib/performanceSettings.js";
import { IMAGES_DIR, findUsageByFilename, ingestImages, makePublicUrl } from "./uploads.controller.js";
import { emitAutomation } from "../../lib/automations.js";

/**
 * /v1/admin/media/videos — the video library (admin → الوسائط → الفيديوهات) and
 * the upload settings for images and videos. Reading needs media:read, changes
 * media:write (admin.routes.ts).
 *
 * With Cloudinary (production) the admin's browser sends the file straight to
 * Cloudinary in 20 MB pieces (POST /sign gives it a signature), then tells us
 * (POST /): we check it with Cloudinary and keep it. Conversions are made by
 * Cloudinary in the background; we look at their addresses until they're ready.
 * Without Cloudinary the file comes here (POST /local) and ffmpeg converts it,
 * when the server has ffmpeg.
 */
const r = Router();

const VIDEOS_DIR = path.resolve(process.cwd(), "uploads", "videos");
const ABSOLUTE_MAX_VIDEO_MB = 2000;
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);
const RECHECK_MS = 5_000;

/** Admin → التلقائيات: "a video ready → tell me". */
function videoReady(asset: { id: string; displayName?: string | null; filename: string }, preset: string) {
  emitAutomation("video.ready", { video: asset.displayName || asset.filename, preset, videoId: asset.id, link: "/admin/media/videos" }, `video:${asset.id}:${preset}`);
}

const newId = () => randomBytes(6).toString("hex");

/* ---------------- Renditions: one writer per video ---------------- */

const locks = new Map<string, Promise<unknown>>();
/** Local conversions running in this server (a "processing" one not here was cut off by a restart). */
const running = new Set<string>();

function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(
    id,
    next.catch(() => undefined),
  );
  return next;
}

async function updateRenditions(assetId: string, change: (list: Rendition[]) => Rendition[]) {
  return withLock(assetId, async () => {
    const row = await prisma.mediaAsset.findUnique({ where: { id: assetId }, select: { renditions: true } });
    if (!row) return [];
    const next = change(parseRenditions(row.renditions));
    await prisma.mediaAsset.update({ where: { id: assetId }, data: { renditions: next as any } });
    return next;
  });
}

/* ---------------- Responses ---------------- */

const isLocal = (asset: { provider: string }) => asset.provider !== "CLOUDINARY";
const absolute = (req: any, url: string | null) => (url && url.startsWith("/") ? makePublicUrl(req, url) : url);

function originalUrl(req: any, asset: any) {
  return asset.url ?? makePublicUrl(req, `/uploads/${asset.filename}`);
}

function videoToResponse(req: any, asset: any) {
  return {
    id: asset.id,
    displayName: asset.displayName,
    folder: asset.folder,
    tags: asset.tags,
    provider: asset.provider,
    providerId: asset.providerId,
    url: originalUrl(req, asset),
    posterUrl: absolute(req, asset.posterUrl),
    durationMs: asset.durationMs,
    fps: asset.fps,
    width: asset.width,
    height: asset.height,
    size: asset.size,
    mime: asset.mime,
    meta: asset.videoMeta ?? null,
    renditions: parseRenditions(asset.renditions).map((x) => ({ ...x, url: absolute(req, x.url) })),
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

/** Looks again at conversions still being made (Cloudinary), or cut off by a restart (local). */
async function refreshRenditions(asset: any) {
  const list = parseRenditions(asset.renditions);
  const now = Date.now();
  const stale = list.filter((x) => x.status === "processing" && (!x.checkedAt || now - Date.parse(x.checkedAt) > RECHECK_MS));
  if (!stale.length) return asset;
  const results = new Map<string, Partial<Rendition>>();
  for (const x of stale) {
    if (isLocal(asset)) {
      if (!running.has(x.id)) results.set(x.id, { status: "failed", error: "The conversion stopped when the server restarted", checkedAt: new Date(now).toISOString() });
      continue;
    }
    if (!x.url) continue;
    const check = await checkVideoUrl(x.url);
    results.set(x.id, { status: check.status, bytes: x.kind === "hls" ? null : check.bytes, error: check.status === "failed" ? check.error : null, checkedAt: new Date(now).toISOString() });
  }
  if (!results.size) return asset;
  const next = await updateRenditions(asset.id, (all) => all.map((x) => (results.has(x.id) && x.status === "processing" ? { ...x, ...results.get(x.id) } : x)));
  for (const x of stale) if (results.get(x.id)?.status === "ready") videoReady(asset, x.kind === "hls" ? "hls" : String(x.preset));
  return { ...asset, renditions: next };
}

/** Conversions still being made (Cloudinary) looked at again, so "video ready" comes on time (the automations job). */
export async function checkProcessingVideos() {
  const recent = await prisma.mediaAsset.findMany({ where: { kind: "VIDEO", updatedAt: { gte: new Date(Date.now() - 3 * 86400_000) } }, take: 50 });
  for (const a of recent) if (parseRenditions(a.renditions).some((x) => x.status === "processing")) await refreshRenditions(a).catch(() => undefined);
}

async function loadVideo(id: string) {
  const asset = await prisma.mediaAsset.findFirst({ where: { id, kind: "VIDEO" } });
  if (!asset) throw NotFound("This video no longer exists");
  return asset;
}

/* ---------------- Settings (images and videos) ---------------- */

const SettingsPatch = z
  .object({
    images: MediaSettingsSchema.shape.images.partial().strict().optional(),
    videos: MediaSettingsSchema.shape.videos.partial().strict().optional(),
  })
  .strict();

r.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    const { media, row } = await readPerformance();
    res.json({ media, defaults: mediaSettingsDefaults(), limits: MEDIA_LIMITS, presets: VIDEO_PRESETS, updatedAt: row?.updatedAt ?? null });
  }),
);

r.patch(
  "/settings",
  asyncHandler(async (req, res) => {
    const body = SettingsPatch.parse(req.body ?? {});
    const { media } = await readPerformance();
    const next = MediaSettingsSchema.parse({ images: { ...media.images, ...(body.images ?? {}) }, videos: { ...media.videos, ...(body.videos ?? {}) } });
    const out = await savePerformance(req, { media: next });
    res.json({ media: out.media, changed: out.changed });
  }),
);

/* ---------------- The library ---------------- */

async function capabilities() {
  const cloud = isCloudinaryEnabled();
  const ffmpeg = await ffmpegAvailable();
  return { provider: cloud ? "CLOUDINARY" : "LOCAL", ffmpeg, canConvert: cloud || ffmpeg, canGrabFrames: cloud || ffmpeg };
}

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await prisma.mediaAsset.findMany({ where: { kind: "VIDEO" }, orderBy: { createdAt: "desc" }, take: 200 });
    const items = [];
    for (const row of rows) items.push(videoToResponse(req, await refreshRenditions(row)));
    res.json({
      ...(await capabilities()),
      settings: mediaSettings().videos,
      presets: VIDEO_PRESET_PROFILES,
      streams: { ladders: STREAM_LADDERS, default: DEFAULT_STREAM },
      choices: { widths: VIDEO_WIDTHS, fps: VIDEO_FPS },
      items,
    });
  }),
);

r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(videoToResponse(req, await refreshRenditions(await loadVideo(String(req.params.id)))));
  }),
);

/** Where a video's link is used (pages, sections, settings, products). */
r.get(
  "/:id/usage",
  asyncHandler(async (req, res) => {
    const asset = await loadVideo(String(req.params.id));
    const needles = isLocal(asset) ? [asset.filename, `/uploads/videos/${asset.id}/`] : [asset.providerId ?? asset.filename];
    const seen = new Set<string>();
    const usage = [];
    for (const needle of needles) {
      for (const u of await findUsageByFilename(needle)) {
        const k = JSON.stringify(u);
        if (!seen.has(k)) {
          seen.add(k);
          usage.push(u);
        }
      }
    }
    res.json({ usage });
  }),
);

/* ---------------- Uploading ---------------- */

/** Cloudinary: what the browser needs to send the file in pieces. */
r.post(
  "/sign",
  asyncHandler(async (_req, res) => {
    if (!isCloudinaryEnabled()) throw new AppError(409, "CLOUDINARY_NOT_CONFIGURED", "Videos go to the server's disk (no Cloudinary): use /local");
    res.json({ ...signVideoUpload(), maxBytes: mediaSettings().videos.maxUploadMb * 1024 * 1024 });
  }),
);

const CompleteBody = z
  .object({
    publicId: z.string().trim().min(1).max(300),
    displayName: z.string().trim().max(200).optional(),
    folder: z.string().trim().max(100).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
    /** What Cloudinary answered the browser (codec, sound); checked values come from Cloudinary itself. */
    upload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/** The first conversion and the cover after an upload (as the admin set). */
async function afterUpload(req: any, asset: any) {
  const s = mediaSettings().videos;
  const second = Math.min(s.posterSecond, Math.max(0, ((asset.durationMs ?? 0) / 1000) - 0.1));
  try {
    await setPoster(asset, second);
  } catch {
    // no cover yet: the admin can pick a frame later
  }
  if (s.autoConvert) {
    try {
      await addRendition(req, asset, s.defaultPreset, VIDEO_PRESET_PROFILES[s.defaultPreset]);
    } catch {
      // shown on the video: the admin can start it again
    }
  }
}

/** Cloudinary: the browser finished sending the file. */
r.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!isCloudinaryEnabled()) throw new AppError(409, "CLOUDINARY_NOT_CONFIGURED", "Cloudinary isn't set up");
    const body = CompleteBody.parse(req.body ?? {});
    if (!body.publicId.startsWith(`${VIDEO_FOLDER}/`)) throw new AppError(400, "NOT_OUR_VIDEO", "Only videos uploaded from this admin can be added");
    const existing = await prisma.mediaAsset.findFirst({ where: { kind: "VIDEO", providerId: body.publicId } });
    if (existing) return res.json(videoToResponse(req, existing));
    let info;
    try {
      info = await cloudinaryVideo(body.publicId);
    } catch {
      throw new AppError(404, "VIDEO_NOT_FOUND", "Cloudinary doesn't have this video");
    }
    const up = body.upload ?? {};
    const upFps = Number(up.frame_rate);
    const upDuration = Number(up.duration);
    const video = (up.video ?? {}) as Record<string, unknown>;
    const created = await prisma.mediaAsset.create({
      data: {
        kind: "VIDEO",
        filename: info.publicId,
        url: info.url,
        provider: "CLOUDINARY",
        providerId: info.publicId,
        displayName: body.displayName || info.publicId.split("/").pop() || "video",
        folder: body.folder || null,
        tags: body.tags ?? [],
        mime: info.format ? `video/${info.format === "mov" ? "quicktime" : info.format}` : "video/mp4",
        size: info.bytes,
        width: info.width,
        height: info.height,
        durationMs: info.durationMs ?? (Number.isFinite(upDuration) && upDuration > 0 ? Math.round(upDuration * 1000) : null),
        fps: info.fps ?? (Number.isFinite(upFps) && upFps > 0 ? upFps : null),
        videoMeta: { codec: typeof video.codec === "string" ? video.codec : null, hasAudio: !!up.audio && Object.keys(up.audio as object).length > 0, format: info.format },
      },
    });
    await afterUpload(req, created);
    res.status(201).json(videoToResponse(req, await loadVideo(created.id)));
  }),
);

const localStorage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(VIDEOS_DIR, { recursive: true });
      cb(null, VIDEOS_DIR);
    } catch (e: any) {
      cb(e, VIDEOS_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${newId()}${VIDEO_EXT.has(ext) ? ext : ".mp4"}`);
  },
});

/** Without Cloudinary: the file comes to this server (one request, with progress in the admin). */
r.post("/local", (req, res, next) => {
  if (isCloudinaryEnabled()) return res.status(409).json({ error: "USE_CLOUDINARY", message: "Videos go to Cloudinary: use /sign" });
  const maxMb = Math.min(ABSOLUTE_MAX_VIDEO_MB, mediaSettings().videos.maxUploadMb);
  const upload = multer({
    storage: localStorage,
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (_r, file, cb) => {
      const ok = VIDEO_EXT.has(path.extname(file.originalname || "").toLowerCase()) && VIDEO_MIME.has((file.mimetype || "").toLowerCase());
      if (ok) return cb(null, true);
      const err = new Error("INVALID_FILE_TYPE") as any;
      err.code = "INVALID_FILE_TYPE";
      cb(err);
    },
  }).single("file");
  upload(req as any, res as any, async (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "FILE_TOO_LARGE", message: `Max video size is ${maxMb}MB` });
      if (err.code === "INVALID_FILE_TYPE") return res.status(415).json({ error: "INVALID_FILE_TYPE", message: "Only MP4, WebM or MOV videos" });
      return res.status(400).json({ error: "UPLOAD_FAILED", message: err.message ?? String(err) });
    }
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: "NO_FILE" });
    const full = path.join(VIDEOS_DIR, file.filename);
    try {
      const scan = await scanFile(full);
      if (!scan.ok) {
        await fs.unlink(full).catch(() => undefined);
        return res.status(scan.code === "FILE_INFECTED" ? 422 : 503).json({ error: scan.code, message: scan.message });
      }
      let info = { durationMs: null as number | null, width: null as number | null, height: null as number | null, fps: null as number | null, codec: null as string | null, hasAudio: false };
      if (await ffmpegAvailable()) {
        try {
          info = await probeVideo(full);
        } catch {
          await fs.unlink(full).catch(() => undefined);
          return res.status(415).json({ error: "NOT_A_VIDEO", message: "This file has no video ffmpeg can read" });
        }
      }
      const created = await prisma.mediaAsset.create({
        data: {
          kind: "VIDEO",
          filename: `videos/${file.filename}`,
          provider: "LOCAL",
          displayName: String(req.body?.displayName || file.originalname || file.filename).slice(0, 200),
          folder: req.body?.folder ? String(req.body.folder).slice(0, 100) : null,
          tags: [],
          mime: file.mimetype,
          size: file.size,
          width: info.width,
          height: info.height,
          durationMs: info.durationMs,
          fps: info.fps,
          videoMeta: { codec: info.codec, hasAudio: info.hasAudio, format: path.extname(file.filename).slice(1) },
        },
      });
      await afterUpload(req, created);
      res.status(201).json(videoToResponse(req, await loadVideo(created.id)));
    } catch (e) {
      next(e);
    }
  });
});

/* ---------------- Editing ---------------- */

const PatchBody = z
  .object({
    displayName: z.string().trim().min(1).max(200).optional(),
    folder: z.string().trim().max(100).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
    posterUrl: z.string().trim().url().max(2000).nullable().optional(),
  })
  .strict();

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const asset = await loadVideo(String(req.params.id));
    const body = PatchBody.parse(req.body ?? {});
    const updated = await prisma.mediaAsset.update({ where: { id: asset.id }, data: body });
    res.json(videoToResponse(req, updated));
  }),
);

/* ---------------- Conversions ---------------- */

async function addRendition(req: any, asset: any, preset: VideoPresetName | "custom", profile: VideoProfile) {
  const id = newId();
  const base: Rendition = { id, preset, profile, status: "processing", url: null, bytes: null, error: null, createdAt: new Date().toISOString(), checkedAt: null };
  if (!isLocal(asset)) {
    try {
      const url = await requestVideoRendition(asset.providerId, cloudinaryTransformation(profile), profile.format);
      await updateRenditions(asset.id, (all) => [...all, { ...base, url }]);
    } catch (e: any) {
      await updateRenditions(asset.id, (all) => [...all, { ...base, status: "failed", error: String(e?.message ?? e).slice(0, 300) }]);
    }
    return id;
  }
  if (!(await ffmpegAvailable())) throw new AppError(409, "NO_FFMPEG", "Converting needs Cloudinary or ffmpeg on the server");
  const rel = `/uploads/videos/${asset.id}/${id}.${profile.format}`;
  const out = path.resolve(process.cwd(), rel.slice(1));
  const input = path.resolve(process.cwd(), "uploads", asset.filename);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await updateRenditions(asset.id, (all) => [...all, { ...base, url: rel }]);
  running.add(id);
  void queueConversion(async () => {
    try {
      await runFfmpeg(ffmpegArgs(input, out, profile, asset.fps ?? 30));
      const st = await fs.stat(out);
      await updateRenditions(asset.id, (all) => all.map((x) => (x.id === id ? { ...x, status: "ready", bytes: st.size, checkedAt: new Date().toISOString() } : x)));
      videoReady(asset, base.preset);
    } catch (e: any) {
      await fs.unlink(out).catch(() => undefined);
      await updateRenditions(asset.id, (all) =>
        all.map((x) => (x.id === id ? { ...x, status: "failed", error: String(e?.message ?? e).slice(0, 300), checkedAt: new Date().toISOString() } : x)),
      );
    } finally {
      running.delete(id);
    }
  });
  return id;
}

/** Total size of a folder's files (a stream's pieces). */
async function folderBytes(dir: string): Promise<number> {
  let total = 0;
  for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? await folderBytes(full) : (await fs.stat(full).catch(() => ({ size: 0 }))).size;
  }
  return total;
}

/** An adaptive stream (HLS): Cloudinary's streaming profile, or ffmpeg's ladder on the server's disk. */
async function addStream(asset: any, stream: StreamProfile) {
  const id = newId();
  const heights = streamHeights(stream.ladder, asset.height ?? null);
  const base: Rendition = {
    id,
    preset: "hls",
    kind: "hls",
    profile: null,
    stream,
    heights,
    status: "processing",
    url: null,
    bytes: null,
    error: null,
    createdAt: new Date().toISOString(),
    checkedAt: null,
  };
  if (!isLocal(asset)) {
    try {
      const url = await requestVideoStream(asset.providerId, stream.ladder);
      await updateRenditions(asset.id, (all) => [...all, { ...base, url }]);
    } catch (e: any) {
      await updateRenditions(asset.id, (all) => [...all, { ...base, status: "failed", error: String(e?.message ?? e).slice(0, 300) }]);
    }
    return id;
  }
  if (!(await ffmpegAvailable())) throw new AppError(409, "NO_FFMPEG", "Streaming needs Cloudinary or ffmpeg on the server");
  const relDir = `/uploads/videos/${asset.id}/${id}`;
  const dir = path.resolve(process.cwd(), relDir.slice(1));
  const input = path.resolve(process.cwd(), "uploads", asset.filename);
  await fs.mkdir(dir, { recursive: true });
  await updateRenditions(asset.id, (all) => [...all, { ...base, url: `${relDir}/master.m3u8` }]);
  running.add(id);
  const hasAudio = !!(asset.videoMeta as { hasAudio?: boolean } | null)?.hasAudio;
  void queueConversion(async () => {
    try {
      const { args } = ffmpegHlsArgs(input, dir, stream, { height: asset.height ?? null, hasAudio });
      await runFfmpeg(args);
      const bytes = await folderBytes(dir);
      await updateRenditions(asset.id, (all) => all.map((x) => (x.id === id ? { ...x, status: "ready", bytes, checkedAt: new Date().toISOString() } : x)));
      videoReady(asset, "hls");
    } catch (e: any) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await updateRenditions(asset.id, (all) =>
        all.map((x) => (x.id === id ? { ...x, status: "failed", error: String(e?.message ?? e).slice(0, 300), checkedAt: new Date().toISOString() } : x)),
      );
    } finally {
      running.delete(id);
    }
  });
  return id;
}

const RenditionBody = z
  .object({
    preset: z.enum([...VIDEO_PRESETS, "custom", "hls"] as [string, ...string[]]),
    profile: VideoProfileSchema.optional(),
    stream: StreamProfileSchema.optional(),
  })
  .strict()
  .refine((b) => b.preset !== "custom" || !!b.profile, { message: "A custom conversion needs its settings", path: ["profile"] });

r.post(
  "/:id/renditions",
  asyncHandler(async (req, res) => {
    const asset = await loadVideo(String(req.params.id));
    const body = RenditionBody.parse(req.body ?? {});
    let id: string;
    if (body.preset === "hls") id = await addStream(asset, body.stream ?? DEFAULT_STREAM);
    else {
      const preset = body.preset as VideoPresetName | "custom";
      id = await addRendition(req, asset, preset, preset === "custom" ? body.profile! : VIDEO_PRESET_PROFILES[preset]);
    }
    const fresh = await loadVideo(asset.id);
    res.status(201).json({ id, video: videoToResponse(req, fresh) });
  }),
);

r.delete(
  "/:id/renditions/:rid",
  asyncHandler(async (req, res) => {
    const asset = await loadVideo(String(req.params.id));
    const rid = String(req.params.rid);
    const target = parseRenditions(asset.renditions).find((x) => x.id === rid);
    if (!target) throw NotFound("This version no longer exists");
    if (isLocal(asset) && target.url?.startsWith("/uploads/videos/")) {
      const file = path.resolve(process.cwd(), target.url.slice(1));
      // A stream is a folder of pieces; a file is one file.
      if (target.kind === "hls") await fs.rm(path.dirname(file), { recursive: true, force: true }).catch(() => undefined);
      else await fs.unlink(file).catch(() => undefined);
    }
    await updateRenditions(asset.id, (all) => all.filter((x) => x.id !== rid));
    res.json(videoToResponse(req, await loadVideo(asset.id)));
  }),
);

/* ---------------- Frames ---------------- */

/** Makes a frame the cover. Cloudinary: an address; on disk: an image file next to the video. */
async function setPoster(asset: any, seconds: number) {
  if (!isLocal(asset)) {
    const posterUrl = videoFrameUrl(asset.providerId, seconds, "webp", 1280);
    await prisma.mediaAsset.update({ where: { id: asset.id }, data: { posterUrl } });
    return posterUrl;
  }
  if (!(await ffmpegAvailable())) throw new AppError(409, "NO_FFMPEG", "Frames need Cloudinary or ffmpeg on the server");
  const rel = `/uploads/videos/${asset.id}/poster-${Math.round(seconds * 1000)}.webp`;
  const out = path.resolve(process.cwd(), rel.slice(1));
  await fs.mkdir(path.dirname(out), { recursive: true });
  await grabFrame(path.resolve(process.cwd(), "uploads", asset.filename), seconds, out, 1280);
  await prisma.mediaAsset.update({ where: { id: asset.id }, data: { posterUrl: rel } });
  return rel;
}

/** A frame saved as an image in IMAGES_DIR (then taken in like an upload). */
async function frameToImageFile(asset: any, seconds: number, format: "webp" | "jpg", width: number) {
  const name = `${Date.now()}-${newId()}.${format}`;
  const out = path.join(IMAGES_DIR, name);
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  if (!isLocal(asset)) {
    const url = videoFrameUrl(asset.providerId, seconds, format, width);
    const res = await fetch(url);
    if (!res.ok) throw new AppError(502, "FRAME_FAILED", res.headers.get("x-cld-error") || `Cloudinary answered ${res.status}`);
    await fs.writeFile(out, Buffer.from(await res.arrayBuffer()));
  } else {
    if (!(await ffmpegAvailable())) throw new AppError(409, "NO_FFMPEG", "Frames need Cloudinary or ffmpeg on the server");
    await grabFrame(path.resolve(process.cwd(), "uploads", asset.filename), seconds, out, width);
  }
  const st = await fs.stat(out);
  return { filename: name, size: st.size, mimetype: format === "jpg" ? "image/jpeg" : "image/webp" };
}

const FramesBody = z
  .object({
    seconds: z.array(z.number().min(0).max(36_000)).min(1).max(24),
    as: z.enum(["image", "poster"]),
    format: z.enum(["webp", "jpg"]).default("webp"),
    width: z.coerce.number().int().min(320).max(3840).default(1600),
    folder: z.string().trim().max(100).optional(),
  })
  .strict()
  .refine((b) => b.as !== "poster" || b.seconds.length === 1, { message: "One frame for the cover", path: ["seconds"] });

r.post(
  "/:id/frames",
  asyncHandler(async (req, res) => {
    const asset = await loadVideo(String(req.params.id));
    const body = FramesBody.parse(req.body ?? {});
    const end = asset.durationMs ? asset.durationMs / 1000 : Infinity;
    const seconds = body.seconds.map((s) => Math.min(s, Math.max(0, end - 0.05)));
    if (body.as === "poster") {
      await setPoster(asset, seconds[0]);
      return res.json({ video: videoToResponse(req, await loadVideo(asset.id)), images: [] });
    }
    const files = [];
    for (const s of seconds) {
      const f = await frameToImageFile(asset, s, body.format, body.width);
      files.push({ ...f, originalname: `${asset.displayName ?? "video"}-${s.toFixed(2)}s.${body.format}` });
    }
    const folder = body.folder || "frames";
    const result = await ingestImages(req, files, { folder, tags: ["frame"] });
    if ("error" in result) throw new AppError(result.status, result.error, result.message);
    res.status(201).json({ images: result.files });
  }),
);

/* ---------------- Deleting ---------------- */

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const asset = await loadVideo(String(req.params.id));
    if (!isLocal(asset)) {
      const out = await deleteVideoFromCloudinary(asset.providerId!);
      if (!out.ok) throw new AppError(502, "DELETE_FAILED", "Cloudinary couldn't delete it; try again");
    } else {
      await fs.unlink(path.resolve(process.cwd(), "uploads", asset.filename)).catch(() => undefined);
      await fs.rm(path.join(VIDEOS_DIR, asset.id), { recursive: true, force: true }).catch(() => undefined);
    }
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    res.json({ ok: true });
  }),
);

export default r;
