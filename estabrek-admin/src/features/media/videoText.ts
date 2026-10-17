// Plain-Arabic labels and small helpers for the video library. Pure (tested).
import type { Rendition, StreamLadder, VideoPreset, VideoProfile } from "../../api/videos.api";

export const PRESET_TEXT: Record<VideoPreset | "custom" | "hls", { label: string; hint: string }> = {
  web: { label: "للعرض العادي", hint: "MP4 بيشتغل بكل مكان، عرض 1280." },
  scroll: { label: "للسكرول (كمبيوتر)", hint: "إطار رئيسي كل 0.05 ثانية: أي مكان بالسكرول بيبيّن فوراً. بدون صوت، عرض 1920." },
  scrollPhone: { label: "للسكرول (تلفون 9:16)", hint: "متل اللي قبله بس مقصوص طولي للتلفون، عرض 720." },
  small: { label: "أصغر حجم (WebM)", hint: "VP9 بعرض 854: للإنترنت البطيء." },
  custom: { label: "مخصص", hint: "اختار كل شي بنفسك." },
  hls: {
    label: "بث متكيّف (HLS)",
    hint: "متل يوتيوب: الفيديو بينقسم قطع صغيرة بكذا جودة، والمشغّل بيختار حسب سرعة نت الزبون وبيغيّر وهو شغّال. ما حدا بينزّل الفيديو كامل. للعرض العادي بس، مش للسكرول.",
  },
};

export const LADDER_TEXT: Record<StreamLadder, string> = { full_hd: "لحد 1080p", hd: "لحد 720p", sd: "لحد 480p (نت بطيء)" };

/** What a version is, in one line: a file's settings, or a stream's sizes. */
export function renditionSummary(r: Pick<Rendition, "kind" | "profile" | "stream" | "heights">): string {
  if (r.kind === "hls" || !r.profile) {
    const sizes = r.heights?.length ? r.heights.map((h) => `${h}p`).join("، ") : r.stream ? LADDER_TEXT[r.stream.ladder] : "";
    return ["HLS", sizes, r.stream ? `قطع ${r.stream.segmentSeconds} ث` : null].filter(Boolean).join(" · ");
  }
  return profileSummary(r.profile);
}

export const QUALITY_TEXT: Record<VideoProfile["quality"], string> = { best: "أعلى جودة", good: "جيدة", eco: "توفير", low: "أصغر حجم" };

export const CODEC_TEXT: Record<VideoProfile["codec"], string> = { h264: "H.264", h265: "H.265", vp9: "VP9", av1: "AV1" };

export const STATUS_TEXT: Record<Rendition["status"], { label: string; variant: "success" | "warning" | "danger" }> = {
  ready: { label: "جاهز", variant: "success" },
  processing: { label: "عم ينعمل…", variant: "warning" },
  failed: { label: "ما زبط", variant: "danger" },
};

/** Codecs a container takes. */
export function codecsFor(format: VideoProfile["format"]): VideoProfile["codec"][] {
  return format === "mp4" ? ["h264", "h265", "av1"] : ["vp9", "av1"];
}

/** "MP4 · H.264 · 1280px · بدون صوت" */
export function profileSummary(p: VideoProfile): string {
  return [
    `${p.format.toUpperCase()} · ${CODEC_TEXT[p.codec]}`,
    p.maxWidth ? `${p.maxWidth}px` : "الحجم الأصلي",
    p.crop === "phone" ? "9:16" : null,
    p.fps ? `${p.fps} إطار` : null,
    QUALITY_TEXT[p.quality],
    p.mute ? "بدون صوت" : null,
    p.keyframeSeconds > 0 ? `إطار رئيسي كل ${p.keyframeSeconds} ث` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** 65_400 ms → "1:05" */
export function durationText(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 2.5 → "0:02.50" (the frame picker's clock). */
export function timeText(seconds: number): string {
  const t = Math.max(0, seconds);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

/** Frames every `every` seconds through the video, at most `max` (the server takes 24 at once). */
export function frameTimes(durationMs: number | null, every: number, max = 24): number[] {
  const end = (durationMs ?? 0) / 1000;
  if (!(every > 0) || end <= 0) return [];
  const out: number[] = [];
  for (let t = 0; t < end - 0.05 && out.length < max; t += every) out.push(Math.round(t * 100) / 100);
  return out;
}

export function renditionCounts(list: Rendition[]) {
  return {
    ready: list.filter((r) => r.status === "ready").length,
    processing: list.filter((r) => r.status === "processing").length,
    failed: list.filter((r) => r.status === "failed").length,
  };
}

/** "2 جاهزة · 1 عم تنعمل" for a card. */
export function renditionsLine(list: Rendition[]): string {
  if (!list.length) return "ما في نسخ محوّلة";
  const c = renditionCounts(list);
  return [c.ready ? `${c.ready} جاهزة` : null, c.processing ? `${c.processing} عم تنعمل` : null, c.failed ? `${c.failed} ما زبطت` : null].filter(Boolean).join(" · ");
}

/** Upload speed and what's left: "4.2 MB/ث · باقي دقيقتين". */
export function speedText(bytesPerSecond: number, remainingBytes: number): string {
  if (!(bytesPerSecond > 0)) return "";
  const mbs = bytesPerSecond / (1024 * 1024);
  const left = remainingBytes / bytesPerSecond;
  const leftText = left < 60 ? `${Math.max(1, Math.round(left))} ثانية` : left < 120 ? "دقيقة" : `${Math.round(left / 60)} دقايق`;
  return `${mbs >= 10 ? Math.round(mbs) : mbs.toFixed(1)} MB/ث · باقي ${leftText}`;
}

export const ACCEPT_VIDEO = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v";

export function isVideoFile(f: { name: string; type: string }) {
  return /\.(mp4|webm|mov|m4v)$/i.test(f.name) || /^video\/(mp4|webm|quicktime|x-m4v)$/i.test(f.type);
}
