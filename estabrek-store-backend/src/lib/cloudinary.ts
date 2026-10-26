// src/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary is optional. If env vars are missing, the app falls back to LOCAL disk uploads.
 */
export function isCloudinaryEnabled() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export function getCloudinary() {
  if (!isCloudinaryEnabled()) return null;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  bytes: number;
  width?: number;
  height?: number;
  format?: string;
};

export async function uploadImageToCloudinary(params: {
  filePath: string;
  folder?: string | null;
  displayName?: string | null;
  tags?: string[];
}): Promise<CloudinaryUploadResult> {
  const cld = getCloudinary();
  if (!cld) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  const { filePath, folder, displayName, tags } = params;

  const res = await cld.uploader.upload(filePath, {
    folder: folder ? String(folder).trim() : undefined,
    resource_type: "image",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    tags: (tags ?? []).filter(Boolean),
    context: displayName ? { caption: displayName } : undefined,
  });

  return {
    url: res.secure_url,
    publicId: res.public_id,
    bytes: res.bytes,
    width: res.width,
    height: res.height,
    format: res.format,
  };
}

export async function deleteFromCloudinary(publicId: string) {
  const cld = getCloudinary();
  if (!cld) return { ok: false, reason: "CLOUDINARY_NOT_CONFIGURED" };
  const res = await cld.uploader.destroy(publicId, { resource_type: "image" });
  // res.result can be: "ok", "not found"
  return { ok: res.result === "ok" || res.result === "not found", result: res.result };
}

/* ---------------- 3D models ---------------- */

/** Where the stores' own 3D models go on Cloudinary (uploads outside it are refused). */
export const MODEL_FOLDER = "estabrek/models";

/** What the admin's browser needs to send a .glb straight to Cloudinary (a raw file). Signed for one hour. */
export function signModelUpload(now = Date.now()) {
  const cld = getCloudinary();
  if (!cld) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  const timestamp = Math.floor(now / 1000);
  const params = { folder: MODEL_FOLDER, timestamp };
  const signature = cld.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET as string);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME as string;
  return {
    cloudName,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    timestamp,
    signature,
    folder: MODEL_FOLDER,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
    expiresAt: new Date((timestamp + 3600) * 1000).toISOString(),
  };
}

/** Checks with Cloudinary that a raw file exists (and where it is). */
export async function cloudinaryRaw(publicId: string) {
  const cld = getCloudinary();
  if (!cld) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  const res: any = await cld.api.resource(publicId, { resource_type: "raw" });
  return { publicId: res.public_id as string, url: res.secure_url as string, bytes: Number(res.bytes) || 0 };
}

export async function deleteRawFromCloudinary(publicId: string) {
  const cld = getCloudinary();
  if (!cld) return { ok: false, reason: "CLOUDINARY_NOT_CONFIGURED" };
  const res = await cld.uploader.destroy(publicId, { resource_type: "raw" });
  return { ok: res.result === "ok" || res.result === "not found", result: res.result };
}

/* ---------------- Videos ---------------- */

/** Where admin videos go on Cloudinary (uploads outside it are refused). */
export const VIDEO_FOLDER = "estabrek/videos";
/** Each piece of a chunked upload (Cloudinary wants at least 5 MB, except the last). */
export const VIDEO_CHUNK_BYTES = 20 * 1024 * 1024;

/**
 * What the admin's browser needs to send a video straight to Cloudinary in
 * pieces (the file never passes through this server). Signed for one hour.
 */
export function signVideoUpload(now = Date.now()) {
  const cld = getCloudinary();
  if (!cld) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  const timestamp = Math.floor(now / 1000);
  const params = { folder: VIDEO_FOLDER, timestamp };
  const signature = cld.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET as string);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME as string;
  return {
    cloudName,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    timestamp,
    signature,
    folder: VIDEO_FOLDER,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    chunkBytes: VIDEO_CHUNK_BYTES,
    expiresAt: new Date((timestamp + 3600) * 1000).toISOString(),
  };
}

export type CloudinaryVideo = { publicId: string; url: string; bytes: number; width: number | null; height: number | null; format: string | null; durationMs: number | null; fps: number | null };

/** Checks with Cloudinary that the video exists (and where it is). */
export async function cloudinaryVideo(publicId: string): Promise<CloudinaryVideo> {
  const cld = getCloudinary();
  if (!cld) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  const res: any = await cld.api.resource(publicId, { resource_type: "video", media_metadata: true });
  const fps = Number(res.frame_rate ?? res.video_metadata?.r_frame_rate?.split?.("/")?.[0]);
  const duration = Number(res.duration ?? res.video_metadata?.duration);
  return {
    publicId: res.public_id,
    url: res.secure_url,
    bytes: Number(res.bytes) || 0,
    width: Number(res.width) || null,
    height: Number(res.height) || null,
    format: res.format ?? null,
    durationMs: Number.isFinite(duration) && duration > 0 ? Math.round(duration * 1000) : null,
    fps: Number.isFinite(fps) && fps > 0 ? fps : null,
  };
}

/** The address of a converted version (made on Cloudinary, see requestVideoRendition). */
export function videoRenditionUrl(publicId: string, transformation: string, format: string) {
  const cld = getCloudinary();
  if (!cld) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  return cld.url(publicId, { resource_type: "video", secure: true, format, raw_transformation: transformation, urlAnalytics: false });
}

/** Asks Cloudinary to make a converted version in the background (big videos can't be made on the fly). */
export async function requestVideoRendition(publicId: string, transformation: string, format: string) {
  const cld = getCloudinary();
  if (!cld) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  await cld.uploader.explicit(publicId, {
    type: "upload",
    resource_type: "video",
    eager: [{ raw_transformation: transformation, format }],
    eager_async: true,
  });
  return videoRenditionUrl(publicId, transformation, format);
}

/** The frame at `seconds` as an image address (webp, jpg or png). */
export function videoFrameUrl(publicId: string, seconds: number, format: "webp" | "jpg" | "png" = "webp", width = 1600) {
  const cld = getCloudinary();
  if (!cld) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  return cld.url(publicId, {
    resource_type: "video",
    secure: true,
    format,
    urlAnalytics: false,
    transformation: [{ start_offset: Math.max(0, Math.round(seconds * 100) / 100), width, crop: "limit", quality: "auto" }],
  });
}

/** ready (with its size), still being made (423), or failed (Cloudinary's reason). */
export async function checkVideoUrl(url: string): Promise<{ status: "ready" | "processing" | "failed"; bytes: number | null; error: string | null }> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) return { status: "ready", bytes: Number(res.headers.get("content-length")) || null, error: null };
    if (res.status === 423) return { status: "processing", bytes: null, error: null };
    return { status: "failed", bytes: null, error: res.headers.get("x-cld-error") || `HTTP ${res.status}` };
  } catch (e: any) {
    // Network trouble: say "still being made" and look again later.
    return { status: "processing", bytes: null, error: e?.message ?? null };
  }
}

export async function deleteVideoFromCloudinary(publicId: string) {
  const cld = getCloudinary();
  if (!cld) return { ok: false, reason: "CLOUDINARY_NOT_CONFIGURED" };
  const res = await cld.uploader.destroy(publicId, { resource_type: "video", invalidate: true });
  return { ok: res.result === "ok" || res.result === "not found", result: res.result };
}

/** The address of an adaptive stream (HLS master playlist) made with a streaming profile. */
export function videoStreamUrl(publicId: string, ladder: "full_hd" | "hd" | "sd") {
  const cld = getCloudinary();
  if (!cld) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  return cld.url(publicId, { resource_type: "video", secure: true, format: "m3u8", streaming_profile: ladder, urlAnalytics: false });
}

/** Asks Cloudinary to make the stream's pieces in the background (streams are always made ahead). */
export async function requestVideoStream(publicId: string, ladder: "full_hd" | "hd" | "sd") {
  const cld = getCloudinary();
  if (!cld) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  await cld.uploader.explicit(publicId, {
    type: "upload",
    resource_type: "video",
    eager: [{ streaming_profile: ladder, format: "m3u8" }],
    eager_async: true,
  });
  return videoStreamUrl(publicId, ladder);
}
