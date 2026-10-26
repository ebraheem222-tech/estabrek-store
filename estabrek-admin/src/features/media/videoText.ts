// Plain-Arabic labels and small helpers for the video library. Pure (tested).
import type { Rendition, StreamLadder, VideoPreset, VideoProfile } from "../../api/videos.api";
import { tr } from "@/lib/words";

export const PRESET_TEXT: Record<VideoPreset | "custom" | "hls", { label: string; hint: string }> = {
  web: { label: tr("للعرض العادي", "For normal playback"), hint: tr("MP4 بيشتغل بكل مكان، عرض 1280.", "MP4 that plays everywhere, 1280 wide.") },
  scroll: { label: tr("للسكرول (كمبيوتر)", "For scrolling (computer)"), hint: tr("إطار رئيسي كل 0.05 ثانية: أي مكان بالسكرول بيبيّن فوراً. بدون صوت، عرض 1920.", "A keyframe every 0.05 seconds: any point of the scroll shows at once. No sound, 1920 wide.") },
  scrollPhone: { label: tr("للسكرول (تلفون 9:16)", "For scrolling (phone 9:16)"), hint: tr("متل اللي قبله بس مقصوص طولي للتلفون، عرض 720.", "Like the one before but cropped tall for phones, 720 wide.") },
  small: { label: tr("أصغر حجم (WebM)", "Smallest size (WebM)"), hint: tr("VP9 بعرض 854: للإنترنت البطيء.", "VP9 at 854 wide: for slow internet.") },
  custom: { label: tr("مخصص", "Custom"), hint: tr("كل شي بيتحدد باليد.", "Choose everything yourself.") },
  hls: {
    label: tr("بث متكيّف (HLS)", "Adaptive streaming (HLS)"),
    hint: tr("متل يوتيوب: الفيديو بينقسم قطع صغيرة بكذا جودة، والمشغّل بيختار حسب سرعة نت الزبون وبيغيّر وهو شغّال. ما حدا بينزّل الفيديو كامل. للعرض العادي بس، مش للسكرول.", "Like YouTube: the video is cut into small pieces at several qualities, and the player picks by the customer's internet speed and switches while playing. Nobody downloads the whole video. For normal playback only, not scrolling."),
  },
};

export const LADDER_TEXT: Record<StreamLadder, string> = { full_hd: tr("لحد 1080p", "Up to 1080p"), hd: tr("لحد 720p", "Up to 720p"), sd: tr("لحد 480p (نت بطيء)", "Up to 480p (slow internet)") };

/** What a version is, in one line: a file's settings, or a stream's sizes. */
export function renditionSummary(r: Pick<Rendition, "kind" | "profile" | "stream" | "heights">): string {
  if (r.kind === "hls" || !r.profile) {
    const sizes = r.heights?.length ? r.heights.map((h) => `${h}p`).join(tr("، ", ", ")) : r.stream ? LADDER_TEXT[r.stream.ladder] : "";
    return ["HLS", sizes, r.stream ? tr(`قطع ${r.stream.segmentSeconds} ث`, "{0}s pieces", [r.stream.segmentSeconds]) : null].filter(Boolean).join(" · ");
  }
  return profileSummary(r.profile);
}

export const QUALITY_TEXT: Record<VideoProfile["quality"], string> = { best: tr("أعلى جودة", "Best quality"), good: tr("جيدة", "Good"), eco: tr("توفير", "Saver"), low: tr("أصغر حجم", "Smallest") };

export const CODEC_TEXT: Record<VideoProfile["codec"], string> = { h264: "H.264", h265: "H.265", vp9: "VP9", av1: "AV1" };

export const STATUS_TEXT: Record<Rendition["status"], { label: string; variant: "success" | "warning" | "danger" }> = {
  ready: { label: tr("جاهز", "Ready"), variant: "success" },
  processing: { label: tr("عم ينعمل…", "Working…"), variant: "warning" },
  failed: { label: tr("ما زبط", "That didn't work"), variant: "danger" },
};

/** Codecs a container takes. */
export function codecsFor(format: VideoProfile["format"]): VideoProfile["codec"][] {
  return format === "mp4" ? ["h264", "h265", "av1"] : ["vp9", "av1"];
}

/** "MP4 · H.264 · 1280px · بدون صوت" */
export function profileSummary(p: VideoProfile): string {
  return [
    `${p.format.toUpperCase()} · ${CODEC_TEXT[p.codec]}`,
    p.maxWidth ? `${p.maxWidth}px` : tr("الحجم الأصلي", "Original size"),
    p.crop === "phone" ? "9:16" : null,
    p.fps ? tr(`${p.fps} إطار`, "{0} fps", [p.fps]) : null,
    QUALITY_TEXT[p.quality],
    p.mute ? tr("بدون صوت", "No sound") : null,
    p.keyframeSeconds > 0 ? tr(`إطار رئيسي كل ${p.keyframeSeconds} ث`, "A keyframe every {0}s", [p.keyframeSeconds]) : null,
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
  if (!list.length) return tr("ما في نسخ محوّلة", "No converted versions");
  const c = renditionCounts(list);
  return [c.ready ? tr(`${c.ready} جاهزة`, "{0} ready", [c.ready]) : null, c.processing ? tr(`${c.processing} عم تنعمل`, "{0} working", [c.processing]) : null, c.failed ? tr(`${c.failed} ما زبطت`, "{0} failed", [c.failed]) : null].filter(Boolean).join(" · ");
}

/** Upload speed and what's left: "4.2 MB/ث · باقي دقيقتين". */
export function speedText(bytesPerSecond: number, remainingBytes: number): string {
  if (!(bytesPerSecond > 0)) return "";
  const mbs = bytesPerSecond / (1024 * 1024);
  const left = remainingBytes / bytesPerSecond;
  const leftText = left < 60 ? tr(`${Math.max(1, Math.round(left))} ثانية`, "{0} seconds", [Math.max(1, Math.round(left))]) : left < 120 ? tr("دقيقة", "1 minute") : tr(`${Math.round(left / 60)} دقايق`, "{0} minutes", [Math.round(left / 60)]);
  return tr(`${mbs >= 10 ? Math.round(mbs) : mbs.toFixed(1)} MB/ث · باقي ${leftText}`, "{0} MB/s · {1} left", [mbs >= 10 ? Math.round(mbs) : mbs.toFixed(1), leftText]);
}

export const ACCEPT_VIDEO = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v";

export function isVideoFile(f: { name: string; type: string }) {
  return /\.(mp4|webm|mov|m4v)$/i.test(f.name) || /^video\/(mp4|webm|quicktime|x-m4v)$/i.test(f.type);
}
