/**
 * Image and video upload settings (admin → الوسائط → إعدادات الرفع), saved in
 * PerformanceSettings.data.media. Read synchronously (`mediaSettings()`) from a
 * copy refreshed every 15 seconds, like the cache settings.
 *
 * Defaults are what uploads did before, with one change for privacy: photos are
 * re-saved without their hidden data (EXIF), which on phones includes the GPS
 * position where the photo was taken.
 */
import { z } from "zod";
import { prisma } from "./prisma.js";

export const MEDIA_LIMITS = {
  imageMaxUploadMb: { min: 1, max: 50 },
  maxDimension: { min: 0, max: 8000 },
  quality: { min: 0, max: 100 },
  videoMaxUploadMb: { min: 10, max: 2000 },
  posterSecond: { min: 0, max: 600 },
} as const;

const n = (key: keyof typeof MEDIA_LIMITS) => z.coerce.number().int().min(MEDIA_LIMITS[key].min).max(MEDIA_LIMITS[key].max);

export const VIDEO_PRESETS = ["web", "scroll", "scrollPhone", "small"] as const;
export type VideoPresetName = (typeof VIDEO_PRESETS)[number];

export const MediaSettingsSchema = z.object({
  images: z.object({
    /** Bigger files are refused. */
    maxUploadMb: n("imageMaxUploadMb"),
    /** Longest side in pixels (0 = automatic: 4000 with Cloudinary, 2000 on the server's disk). */
    maxDimension: n("maxDimension"),
    /** Re-save without hidden data (camera, GPS position). */
    stripMetadata: z.boolean(),
    /** Keep the uploaded format, or store as WebP / AVIF / JPEG. */
    format: z.enum(["keep", "webp", "avif", "jpeg"]),
    /** 1–100 when re-saved (0 = automatic: 90 with Cloudinary, 82 on disk). */
    quality: n("quality"),
  }),
  videos: z.object({
    maxUploadMb: n("videoMaxUploadMb"),
    /** Made right after an upload (when autoConvert is on). */
    defaultPreset: z.enum(VIDEO_PRESETS),
    autoConvert: z.boolean(),
    /** The cover image is the frame at this second. */
    posterSecond: n("posterSecond"),
  }),
});

export type MediaSettings = z.infer<typeof MediaSettingsSchema>;

export function mediaSettingsDefaults(): MediaSettings {
  return {
    images: { maxUploadMb: 10, maxDimension: 0, stripMetadata: true, format: "keep", quality: 0 },
    videos: { maxUploadMb: 500, defaultPreset: "web", autoConvert: true, posterSecond: 1 },
  };
}

export function mergeMediaSettings(saved: unknown, base: MediaSettings = mediaSettingsDefaults()): MediaSettings {
  const s = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const out: MediaSettings = { images: { ...base.images }, videos: { ...base.videos } };
  for (const part of ["images", "videos"] as const) {
    const p = s[part];
    if (!p || typeof p !== "object") continue;
    const shape = MediaSettingsSchema.shape[part].shape as Record<string, z.ZodTypeAny>;
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (!(k in shape)) continue;
      const ok = shape[k].safeParse(v);
      if (ok.success) (out[part] as Record<string, unknown>)[k] = ok.data;
    }
  }
  return out;
}

/** "media.images.maxUploadMb"-style names of what differs. */
export function mediaSettingsChanges(a: MediaSettings, b: MediaSettings): string[] {
  const out: string[] = [];
  for (const part of ["images", "videos"] as const) {
    for (const k of Object.keys(a[part]) as Array<keyof (typeof a)[typeof part]>) {
      if (a[part][k] !== b[part][k]) out.push(`media.${part}.${String(k)}`);
    }
  }
  return out;
}

let current: MediaSettings = mediaSettingsDefaults();
let loadedAt = 0;
let loading: Promise<void> | null = null;

/** The settings in force now. Never waits: refreshes in the background when stale. */
export function mediaSettings(): MediaSettings {
  if (Date.now() - loadedAt > 15_000 && !loading) void loadMediaSettings();
  return current;
}

export function loadMediaSettings(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
      const data = row?.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
      current = mergeMediaSettings(data.media);
    } catch {
      // keep what we have
    } finally {
      loadedAt = Date.now();
      loading = null;
    }
  })();
  return loading;
}

/** After a save from the admin: in force at once on this server. */
export function applyMediaSettings(next: MediaSettings) {
  current = next;
  loadedAt = Date.now();
}
