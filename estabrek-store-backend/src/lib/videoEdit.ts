/**
 * A video made in the editor (focus mode, A4; shared/videoEdit.ts in the admin reads the same project and plays it
 * live): its clips one after another (each trimmed, sped up or slowed, muted), words at their times, music under it,
 * the frame's shape, a fade in and out. Made by Cloudinary as one address (no work on this server): the clips are
 * joined with `fl_splice` (each at the same size, trimmed in its own step), the words are text layers timed in their
 * `fl_layer_apply` step (cloudinary.com/documentation/video_concatenation, video_text_layers).
 */
import { z } from "zod";

const SRC = /^(\/(?!\/)|https:\/\/)[^\s<>"'`\\]+$/;
const id = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);
const src = z.string().max(2000).regex(SRC);
export const Project = z.object({
  clips: z.array(z.object({
    id, src, in: z.number().min(0).max(36000), out: z.number().min(0).max(36000),
    speed: z.number().min(0.25).max(4).optional(), mute: z.boolean().optional(),
  }).refine((c) => c.out - c.in >= 0.1, "A clip is too short")).min(1).max(20),
  words: z.array(z.object({
    id, text: z.string().trim().min(1).max(120), at: z.number().min(0).max(600), dur: z.number().min(0.2).max(600),
    place: z.enum(["top", "middle", "bottom"]).optional(), size: z.number().min(12).max(160).optional(),
    color: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(), box: z.boolean().optional(),
  })).max(20).optional(),
  music: z.object({ src, volume: z.number().min(0).max(1).optional() }).optional(),
  ratio: z.enum(["original", "16:9", "9:16", "1:1", "4:5"]).optional(),
  mute: z.boolean().optional(),
  fade: z.boolean().optional(),
}).refine((p) => p.clips.reduce((s, c) => s + (c.out - c.in) / (c.speed ?? 1), 0) <= 600, "The video is longer than 10 minutes");
export type Project = z.infer<typeof Project>;

/** The public id of a video of this store's Cloudinary, from its address (any transformation before it). */
export function videoPublicId(raw: string, cloudName: string | undefined): string | null {
  if (!cloudName) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== "res.cloudinary.com") return null;
  const parts = u.pathname.split("/").filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch { return p; } });
  if (parts.length < 4 || parts[0] !== cloudName || parts[1] !== "video" || parts[2] !== "upload") return null;
  let rest = parts.slice(3);
  const version = rest.findIndex((p) => /^v\d+$/.test(p));
  if (version >= 0) rest = rest.slice(version + 1);
  else while (rest.length > 1 && /^[a-z]{1,3}_[^/]*$/.test(rest[0]) && rest[0].includes("_")) rest = rest.slice(1);
  if (!rest.length || rest.some((p) => p === ".." || p === ".")) return null;
  const last = rest[rest.length - 1].replace(/\.[a-z0-9]{2,5}$/i, "");
  return [...rest.slice(0, -1), last].join("/") || null;
}

/** The finished frame's size for a shape (as filmed: the first clip's, even, at most 1920 on its long side). */
export function frameSize(ratio: Project["ratio"], first: { w: number | null; h: number | null }) {
  switch (ratio) {
    case "16:9": return { w: 1280, h: 720 };
    case "9:16": return { w: 720, h: 1280 };
    case "1:1": return { w: 1080, h: 1080 };
    case "4:5": return { w: 1080, h: 1350 };
    default: {
      if (!first.w || !first.h) return { w: 1280, h: 720 };
      const k = Math.min(1, 1920 / Math.max(first.w, first.h));
      const even = (v: number) => Math.max(2, Math.round((v * k) / 2) * 2);
      return { w: even(first.w), h: even(first.h) };
    }
  }
}

const s2 = (v: number) => String(Math.round(v * 100) / 100);
/** A speed as Cloudinary's accelerate (percent: -50 … 100). */
const accelerate = (speed = 1) => (speed === 1 ? null : `e_accelerate:${Math.round(Math.max(-50, Math.min(100, (speed - 1) * 100)))}`);
/** Words for a text layer: the address's own escapes, and Cloudinary's for commas and slashes. */
const textOf = (t: string) => encodeURIComponent(t).replace(/%2C/g, "%252C").replace(/%2F/g, "%252F");

/**
 * The transformation that makes the video: `ids` are the clips' public ids (in order), `musicId` the music's.
 * The address is then https://res.cloudinary.com/<cloud>/video/upload/<chain>/<ids[0]>.mp4.
 */
export function cloudinaryChain(p: Project, ids: string[], size: { w: number; h: number }, musicId?: string | null): string {
  const fill = `c_fill,g_center,h_${size.h},w_${size.w}`;
  const parts: string[] = [];
  const [first, ...rest] = p.clips;
  parts.push([`so_${s2(first.in)}`, `eo_${s2(first.out)}`, accelerate(first.speed), first.mute ? "ac_none" : null, fill].filter(Boolean).join(","));
  rest.forEach((c, i) => {
    parts.push([`so_${s2(c.in)}`, `eo_${s2(c.out)}`, accelerate(c.speed), c.mute ? "ac_none" : null, "fl_splice", `l_video:${ids[i + 1].replace(/\//g, ":")}`].filter(Boolean).join(","));
    parts.push(fill);
    parts.push("fl_layer_apply");
  });
  if (p.mute) parts.push("ac_none");
  const length = p.clips.reduce((s, c) => s + (c.out - c.in) / (c.speed ?? 1), 0);
  if (musicId) {
    const volume = Math.round(((p.music?.volume ?? 0.6) - 1) * 100);
    parts.push([`l_audio:${musicId.replace(/\//g, ":")}`, `du_${s2(length)}`, volume ? `e_volume:${volume}` : null].filter(Boolean).join(","));
    parts.push("fl_layer_apply,so_0");
  }
  for (const w of p.words ?? []) {
    const size_ = Math.round(w.size ?? 48);
    const color = (w.color ?? "#ffffff").replace("#", "");
    const hex = color.length === 3 ? color.split("").map((x) => x + x).join("") : color;
    parts.push([`l_text:Noto%20Sans%20Arabic_${size_}_bold:${textOf(w.text)}`, `co_rgb:${hex}`, w.box ? "b_rgb:00000099" : null].filter(Boolean).join(","));
    const g = w.place === "top" ? "g_north,y_0.08" : w.place === "middle" ? "g_center" : "g_south,y_0.08";
    parts.push(`fl_layer_apply,${g},so_${s2(w.at)},du_${s2(w.dur)}`);
  }
  if (p.fade) parts.push("e_fade:600", "e_fade:-600");
  return parts.join("/");
}
