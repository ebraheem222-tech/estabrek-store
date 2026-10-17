/**
 * What a video conversion makes (a "rendition"): container and codec, size,
 * frame rate, quality, sound, key frames and an optional phone crop. The same
 * profile becomes a Cloudinary transformation or ffmpeg arguments, so both
 * providers make the same thing. Pure (tested).
 */
import { z } from "zod";
import type { VideoPresetName } from "./mediaSettings.js";

export const VIDEO_WIDTHS = [0, 640, 720, 854, 1080, 1280, 1920, 2560] as const;
export const VIDEO_FPS = [0, 24, 25, 30, 50, 60, 120] as const;

export const VideoProfileSchema = z
  .object({
    format: z.enum(["mp4", "webm"]),
    codec: z.enum(["h264", "h265", "vp9", "av1"]),
    /** Widest it may be (0 = as uploaded; never made bigger). */
    maxWidth: z.number().int().refine((w) => (VIDEO_WIDTHS as readonly number[]).includes(w), { message: "Not one of the offered widths" }),
    /** Frames a second (0 = as uploaded). */
    fps: z.number().int().refine((f) => (VIDEO_FPS as readonly number[]).includes(f), { message: "Not one of the offered frame rates" }),
    quality: z.enum(["best", "good", "eco", "low"]),
    /** No sound track (smaller; the shop's scroll films are silent). */
    mute: z.boolean(),
    /** A key frame every this many seconds (0 = the encoder's choice). Small = smooth scroll-scrubbing. */
    keyframeSeconds: z.number().min(0).max(10),
    /** "phone": cut to 9:16 around the middle. */
    crop: z.enum(["none", "phone"]),
  })
  .refine((p) => (p.format === "mp4" ? p.codec !== "vp9" : p.codec === "vp9" || p.codec === "av1"), {
    message: "MP4 takes H.264, H.265 or AV1; WebM takes VP9 or AV1",
    path: ["codec"],
  });

export type VideoProfile = z.infer<typeof VideoProfileSchema>;

export const VIDEO_PRESET_PROFILES: Record<VideoPresetName, VideoProfile> = {
  /** Plays anywhere, normal size. */
  web: { format: "mp4", codec: "h264", maxWidth: 1280, fps: 0, quality: "good", mute: false, keyframeSeconds: 0, crop: "none" },
  /** For scroll scenes: a key frame every 0.05 s so any position shows at once (like the shop's films). */
  scroll: { format: "mp4", codec: "h264", maxWidth: 1920, fps: 0, quality: "best", mute: true, keyframeSeconds: 0.05, crop: "none" },
  /** The same for phones, cut to 9:16. */
  scrollPhone: { format: "mp4", codec: "h264", maxWidth: 720, fps: 0, quality: "best", mute: true, keyframeSeconds: 0.05, crop: "phone" },
  /** Smallest file for slow connections. */
  small: { format: "webm", codec: "vp9", maxWidth: 854, fps: 0, quality: "eco", mute: false, keyframeSeconds: 0, crop: "none" },
};

/** Profile → Cloudinary transformation, e.g. "vc_h264,w_1280,c_limit,q_auto:good". */
export function cloudinaryTransformation(p: VideoProfile): string {
  const parts = [`vc_${p.codec}`];
  if (p.crop === "phone") parts.push("c_fill", "ar_9:16", "g_center", ...(p.maxWidth ? [`w_${p.maxWidth}`] : []));
  else if (p.maxWidth) parts.push(`w_${p.maxWidth}`, "c_limit");
  if (p.fps) parts.push(`fps_${p.fps}`);
  parts.push(`q_auto:${p.quality}`);
  if (p.keyframeSeconds > 0) parts.push(`ki_${Number(p.keyframeSeconds.toFixed(3))}`);
  return parts.join(",") + (p.mute ? "/ac_none" : "");
}

const CRF: Record<VideoProfile["codec"], Record<VideoProfile["quality"], number>> = {
  h264: { best: 18, good: 23, eco: 28, low: 32 },
  h265: { best: 20, good: 26, eco: 30, low: 34 },
  vp9: { best: 24, good: 32, eco: 38, low: 44 },
  av1: { best: 24, good: 32, eco: 38, low: 44 },
};

/** Profile → ffmpeg arguments (the source's frame rate sets the key-frame spacing when fps is "as uploaded"). */
export function ffmpegArgs(input: string, output: string, p: VideoProfile, sourceFps = 30): string[] {
  const filters: string[] = [];
  if (p.crop === "phone") filters.push("crop='min(iw,ih*9/16)':'min(ih,iw*16/9)'");
  if (p.maxWidth) filters.push(`scale='min(${p.maxWidth},iw)':-2`);
  if (p.fps) filters.push(`fps=${p.fps}`);
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", input];
  if (filters.length) args.push("-vf", filters.join(","));
  const crf = String(CRF[p.codec][p.quality]);
  if (p.codec === "h264") args.push("-c:v", "libx264", "-preset", "medium", "-crf", crf, "-pix_fmt", "yuv420p");
  else if (p.codec === "h265") args.push("-c:v", "libx265", "-preset", "medium", "-crf", crf, "-pix_fmt", "yuv420p", "-tag:v", "hvc1");
  else if (p.codec === "vp9") args.push("-c:v", "libvpx-vp9", "-crf", crf, "-b:v", "0", "-row-mt", "1");
  else args.push("-c:v", "libaom-av1", "-crf", crf, "-b:v", "0", "-cpu-used", "6");
  if (p.keyframeSeconds > 0) {
    const gop = Math.max(1, Math.round(p.keyframeSeconds * (p.fps || sourceFps || 30)));
    args.push("-g", String(gop), "-keyint_min", String(gop), "-sc_threshold", "0");
  }
  if (p.mute) args.push("-an");
  else if (p.format === "mp4") args.push("-c:a", "aac", "-b:a", "128k");
  else args.push("-c:a", "libopus", "-b:a", "96k");
  if (p.format === "mp4") args.push("-movflags", "+faststart");
  args.push(output);
  return args;
}

/** One made version of a video (a file, or an HLS stream), kept in MediaAsset.renditions. */
export type Rendition = {
  id: string;
  preset: VideoPresetName | "custom" | "hls";
  /** "hls": `stream` is set and `url` is the stream's master playlist (.m3u8). Older ones have no kind: files. */
  kind?: "file" | "hls";
  profile: VideoProfile | null;
  stream?: StreamProfile | null;
  /** The sizes in a stream (heights), when known. */
  heights?: number[] | null;
  status: "processing" | "ready" | "failed";
  url: string | null;
  bytes: number | null;
  error: string | null;
  createdAt: string;
  checkedAt: string | null;
};

export function parseRenditions(raw: unknown): Rendition[] {
  return Array.isArray(raw) ? (raw.filter((r) => r && typeof r === "object" && typeof (r as Rendition).id === "string") as Rendition[]) : [];
}

/* ---------------- Streaming (HLS, like YouTube) ---------------- */

/**
 * An adaptive stream: the video cut into pieces of a few seconds, in several
 * sizes; the player picks the size the connection can carry and changes it
 * while playing. Nobody downloads the whole file to watch it. For normal
 * playback only: the scroll scenes need a single file they can jump around in.
 */
export const STREAM_LADDERS = {
  /** up to 1080p */
  full_hd: [1080, 720, 480, 360],
  /** up to 720p */
  hd: [720, 480, 360],
  /** up to 480p (slow connections, small files) */
  sd: [480, 360, 240],
} as const;

export type StreamLadder = keyof typeof STREAM_LADDERS;

export const StreamProfileSchema = z.object({
  ladder: z.enum(["full_hd", "hd", "sd"]),
  /** Seconds per piece (on the server's disk; Cloudinary uses its own). */
  segmentSeconds: z.number().int().min(2).max(10),
});

export type StreamProfile = z.infer<typeof StreamProfileSchema>;

export const DEFAULT_STREAM: StreamProfile = { ladder: "full_hd", segmentSeconds: 4 };

const STREAM_BITRATE: Record<number, number> = { 1080: 5000, 720: 2800, 480: 1400, 360: 800, 240: 400 };

/** The sizes made for a source: the ladder's steps not bigger than the source (at least the smallest). */
export function streamHeights(ladder: StreamLadder, sourceHeight: number | null) {
  const steps = [...STREAM_LADDERS[ladder]];
  if (!sourceHeight) return steps;
  const fit = steps.filter((h) => h <= sourceHeight);
  return fit.length ? fit : [steps[steps.length - 1]];
}

/**
 * ffmpeg arguments for an HLS stream in `dir`: dir/master.m3u8, and per size
 * dir/v<n>/index.m3u8 with its pieces. Key frames fall exactly on every piece,
 * so the player can switch size between any two pieces.
 */
export function ffmpegHlsArgs(input: string, dir: string, p: StreamProfile, source: { height: number | null; hasAudio: boolean }) {
  const heights = streamHeights(p.ladder, source.height);
  const n = heights.length;
  const split = n > 1 ? `[0:v]split=${n}${heights.map((_, i) => `[s${i}]`).join("")};` : "";
  const scales = heights.map((h, i) => `${n > 1 ? `[s${i}]` : "[0:v]"}scale=-2:${h}[v${i}]`).join(";");
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", input, "-filter_complex", split + scales];
  heights.forEach((h, i) => {
    const kb = STREAM_BITRATE[h] ?? 1000;
    args.push("-map", `[v${i}]`, `-c:v:${i}`, "libx264", `-b:v:${i}`, `${kb}k`, `-maxrate:v:${i}`, `${Math.round(kb * 1.07)}k`, `-bufsize:v:${i}`, `${kb * 2}k`);
    if (source.hasAudio) args.push("-map", "0:a:0");
  });
  args.push("-preset", "veryfast", "-pix_fmt", "yuv420p", "-sc_threshold", "0", "-force_key_frames", `expr:gte(t,n_forced*${p.segmentSeconds})`);
  if (source.hasAudio) args.push("-c:a", "aac", "-b:a", "128k", "-ac", "2");
  args.push(
    "-f",
    "hls",
    "-hls_time",
    String(p.segmentSeconds),
    "-hls_playlist_type",
    "vod",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_filename",
    `${dir}/v%v/piece_%03d.ts`,
    "-master_pl_name",
    "master.m3u8",
    "-var_stream_map",
    heights.map((_, i) => (source.hasAudio ? `v:${i},a:${i}` : `v:${i}`)).join(" "),
    `${dir}/v%v/index.m3u8`,
  );
  return { args, heights };
}
