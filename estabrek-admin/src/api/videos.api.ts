// The video library and the image/video upload settings (admin → الوسائط → الفيديوهات).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type VideoPreset = "web" | "scroll" | "scrollPhone" | "small";

export type VideoProfile = {
  format: "mp4" | "webm";
  codec: "h264" | "h265" | "vp9" | "av1";
  maxWidth: number;
  fps: number;
  quality: "best" | "good" | "eco" | "low";
  mute: boolean;
  keyframeSeconds: number;
  crop: "none" | "phone";
};

export type StreamLadder = "full_hd" | "hd" | "sd";
export type StreamProfile = { ladder: StreamLadder; segmentSeconds: number };

export type Rendition = {
  id: string;
  preset: VideoPreset | "custom" | "hls";
  /** "hls": an adaptive stream (url = its .m3u8). Older versions have no kind: files. */
  kind?: "file" | "hls";
  profile: VideoProfile | null;
  stream?: StreamProfile | null;
  heights?: number[] | null;
  status: "processing" | "ready" | "failed";
  url: string | null;
  bytes: number | null;
  error: string | null;
  createdAt: string;
  checkedAt: string | null;
};

export type Video = {
  id: string;
  displayName: string | null;
  folder: string | null;
  tags: string[];
  provider: "CLOUDINARY" | "LOCAL";
  providerId: string | null;
  url: string;
  posterUrl: string | null;
  durationMs: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
  size: number;
  mime: string;
  meta: { codec?: string | null; hasAudio?: boolean; format?: string | null } | null;
  renditions: Rendition[];
  createdAt: string;
  updatedAt: string;
};

export type VideoLibrary = {
  provider: "CLOUDINARY" | "LOCAL";
  ffmpeg: boolean;
  canConvert: boolean;
  canGrabFrames: boolean;
  settings: MediaSettings["videos"];
  presets: Record<VideoPreset, VideoProfile>;
  streams: { ladders: Record<StreamLadder, number[]>; default: StreamProfile };
  choices: { widths: number[]; fps: number[] };
  items: Video[];
};

export type MediaSettings = {
  images: { maxUploadMb: number; maxDimension: number; stripMetadata: boolean; format: "keep" | "webp" | "avif" | "jpeg"; quality: number; cloudCutout: boolean };
  videos: { maxUploadMb: number; defaultPreset: VideoPreset; autoConvert: boolean; posterSecond: number };
};

export type MediaLimits = Record<"imageMaxUploadMb" | "maxDimension" | "quality" | "videoMaxUploadMb" | "posterSecond", { min: number; max: number }>;

export type MediaSettingsPage = { media: MediaSettings; defaults: MediaSettings; limits: MediaLimits; presets: VideoPreset[]; updatedAt: string | null };

export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
  chunkBytes: number;
  expiresAt: string;
  maxBytes: number;
};

export type ImageAsset = { id: string; url: string; width: number | null; height: number | null; displayName: string | null; folder: string | null };

const V = ENDPOINTS.admin.mediaVideos;

export async function getVideoLibrary() {
  return (await api.get(V.base)).data as VideoLibrary;
}

export async function getVideo(id: string) {
  return (await api.get(V.one(id))).data as Video;
}

export async function getMediaSettings() {
  return (await api.get(V.settings)).data as MediaSettingsPage;
}

export async function saveMediaSettings(patch: { images?: Partial<MediaSettings["images"]>; videos?: Partial<MediaSettings["videos"]> }) {
  return (await api.patch(V.settings, patch)).data as { media: MediaSettings; changed: string[] };
}

export async function signVideoUpload() {
  return (await api.post(V.sign, {})).data as UploadSignature;
}

/** After the browser sent the file to Cloudinary: the server checks it and keeps it. */
export async function completeCloudinaryUpload(body: { publicId: string; displayName?: string; upload?: Record<string, unknown> }) {
  return (await api.post(V.base, body)).data as Video;
}

/** Without Cloudinary: the file goes to the server in one request. */
export async function uploadLocalVideo(file: File, opts: { displayName?: string; onProgress?: (fraction: number) => void; signal?: AbortSignal }) {
  const form = new FormData();
  form.append("file", file);
  if (opts.displayName) form.append("displayName", opts.displayName);
  const res = await api.post(V.local, form, {
    // Multipart, not the client's default JSON (which would drop the file).
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 0,
    signal: opts.signal,
    onUploadProgress: (e) => opts.onProgress?.(e.total ? e.loaded / e.total : 0),
  });
  return res.data as Video;
}

export async function updateVideo(id: string, patch: { displayName?: string; posterUrl?: string | null }) {
  return (await api.patch(V.one(id), patch)).data as Video;
}

export async function deleteVideo(id: string) {
  await api.delete(V.one(id));
}

export async function videoUsage(id: string) {
  return (await api.get(V.usage(id))).data as { usage: Array<Record<string, string>> };
}

export async function addRendition(id: string, body: { preset: VideoPreset } | { preset: "custom"; profile: VideoProfile } | { preset: "hls"; stream: StreamProfile }) {
  return (await api.post(V.renditions(id), body)).data as { id: string; video: Video };
}

export async function deleteRendition(id: string, rid: string) {
  return (await api.delete(V.rendition(id, rid))).data as Video;
}

export async function grabFrames(id: string, body: { seconds: number[]; as: "image" | "poster"; format?: "webp" | "jpg"; width?: number }) {
  return (await api.post(V.frames(id), body, { timeout: 120_000 })).data as { images: ImageAsset[]; video?: Video };
}
