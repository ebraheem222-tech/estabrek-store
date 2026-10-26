/**
 * The video in the admin's browser, for the 3D scan: opened from a file (it never leaves
 * the computer) or from the video library, frames read by seeking (a few a second, small),
 * one frame at the video's own size for finding the mat sharply, and in the end the
 * product cut out of chosen frames at a bigger size, as one sprite sheet (WebP with see-
 * through background) for the 360° viewer.
 */
import type { Analysis, ScanFrame } from "./analyse";
import type { Box, Img } from "./vision";

export type OpenVideo = { video: HTMLVideoElement; duration: number; width: number; height: number; close: () => void };

const once = (el: EventTarget, ok: string, ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const done = (fn: () => void) => {
      clearTimeout(timer);
      el.removeEventListener(ok, onOk);
      el.removeEventListener("error", onErr);
      signal?.removeEventListener("abort", onAbort);
      fn();
    };
    const onOk = () => done(resolve);
    const onErr = () => done(() => reject(new Error("VIDEO_UNREADABLE")));
    const onAbort = () => done(() => reject(new DOMException("Aborted", "AbortError")));
    const timer = setTimeout(() => done(() => reject(new Error("VIDEO_TIMEOUT"))), ms);
    el.addEventListener(ok, onOk);
    el.addEventListener("error", onErr);
    signal?.addEventListener("abort", onAbort);
  });

/** Opens a file or an address (the library's: Cloudinary or the store's server, both readable from here). */
export async function openVideo(src: File | string, signal?: AbortSignal): Promise<OpenVideo> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  if (typeof src === "string") video.crossOrigin = "anonymous";
  const close = () => {
    video.removeAttribute("src");
    video.load();
    if (typeof src !== "string") URL.revokeObjectURL(url);
  };
  try {
    const ready = once(video, "loadeddata", 30_000, signal);
    video.src = url;
    await ready;
    // Recorded in a browser (WebM) the length is often unknown until the end is reached:
    // asking for a time far past it makes the browser work it out.
    if (video.duration === Infinity) {
      const known = once(video, "durationchange", 30_000, signal);
      video.currentTime = 1e101;
      await known;
      await seek(video, 0, signal);
    }
    if (!video.videoWidth || !Number.isFinite(video.duration)) throw new Error("VIDEO_UNREADABLE");
  } catch (e) {
    close();
    throw e;
  }
  return { video, duration: video.duration, width: video.videoWidth, height: video.videoHeight, close };
}

async function seek(video: HTMLVideoElement, t: number, signal?: AbortSignal) {
  const at = Math.max(0, Math.min(t, video.duration - 0.01));
  if (Math.abs(video.currentTime - at) < 1e-4) return;
  const done = once(video, "seeked", 10_000, signal);
  video.currentTime = at;
  await done;
}

/** Moves the video to a time (and waits for that frame). */
export const seekTo = (v: OpenVideo, t: number, signal?: AbortSignal) => seek(v.video, t, signal);

/** The frame at a time, `width` pixels wide. */
export async function frameAt(v: OpenVideo, t: number, width: number, signal?: AbortSignal): Promise<Img> {
  await seek(v.video, t, signal);
  const w = Math.min(width, v.width);
  const h = Math.round((v.height * w) / v.width);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(v.video, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h);
  return { w, h, data: d.data };
}

/** Frames through the whole video: up to `max`, 4–12 a second, `width` pixels wide. */
export async function readFrames(v: OpenVideo, opts: { width: number; max: number; onProgress?: (f: number) => unknown; signal?: AbortSignal }) {
  const rate = Math.max(4, Math.min(12, opts.max / v.duration));
  const n = Math.max(2, Math.min(opts.max, Math.floor(v.duration * rate)));
  const frames: Img[] = [];
  const times: number[] = [];
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / rate;
    frames.push(await frameAt(v, t, opts.width, opts.signal));
    times.push(t);
    await opts.onProgress?.((k + 1) / n);
  }
  return { frames, times };
}

/** Around every frame's product, with a little room: the same box for all, so the turn doesn't jump. */
export function cropOf(turn: ScanFrame[], w: number, h: number): Box {
  const b = { x0: w, y0: h, x1: 0, y1: 0 };
  for (const f of turn) {
    b.x0 = Math.min(b.x0, f.box.x0);
    b.y0 = Math.min(b.y0, f.box.y0);
    b.x1 = Math.max(b.x1, f.box.x1);
    b.y1 = Math.max(b.y1, f.box.y1);
  }
  const mx = Math.round((b.x1 - b.x0) * 0.05) + 2;
  const my = Math.round((b.y1 - b.y0) * 0.05) + 2;
  return { x0: Math.max(0, b.x0 - mx), y0: Math.max(0, b.y0 - my), x1: Math.min(w - 1, b.x1 + mx), y1: Math.min(h - 1, b.y1 + my) };
}

/** How much of the product is at a point of the frame (its mask read between pixels, a soft edge). */
function alphaAt(mask: Uint8Array, w: number, h: number, x: number, y: number) {
  const x0 = Math.max(0, Math.min(w - 2, Math.floor(x - 0.5)));
  const y0 = Math.max(0, Math.min(h - 2, Math.floor(y - 0.5)));
  const fx = Math.max(0, Math.min(1, x - 0.5 - x0));
  const fy = Math.max(0, Math.min(1, y - 0.5 - y0));
  const a = mask[y0 * w + x0] + (mask[y0 * w + x0 + 1] - mask[y0 * w + x0]) * fx;
  const b = mask[(y0 + 1) * w + x0] + (mask[(y0 + 1) * w + x0 + 1] - mask[(y0 + 1) * w + x0]) * fx;
  const v = a + (b - a) * fy;
  // A soft edge about a pixel wide.
  return Math.max(0, Math.min(1, (v - 0.3) / 0.4));
}

/** One frame's product cut out at the analysis size (for the preview), as ImageData of the crop. */
export function cutout(frame: Img, f: ScanFrame, crop: Box): ImageData {
  const cw = crop.x1 - crop.x0 + 1;
  const ch = crop.y1 - crop.y0 + 1;
  const out = new ImageData(cw, ch);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const sx = crop.x0 + x;
      const sy = crop.y0 + y;
      const si = (sy * frame.w + sx) * 4;
      const o = (y * cw + x) * 4;
      out.data[o] = frame.data[si];
      out.data[o + 1] = frame.data[si + 1];
      out.data[o + 2] = frame.data[si + 2];
      out.data[o + 3] = Math.round(alphaAt(f.mask, frame.w, frame.h, sx + 0.5, sy + 0.5) * 255);
    }
  return out;
}

/** The frames nearest to `count` even steps round the turn (no frame twice). */
export function evenFrames(turn: ScanFrame[], count: number) {
  const picked: ScanFrame[] = [];
  for (let k = 0; k < count; k++) {
    const want = (k * 360) / count;
    let best: ScanFrame | null = null;
    for (const f of turn) if (!best || Math.abs(f.angle - want) < Math.abs(best.angle - want)) best = f;
    if (best && picked[picked.length - 1] !== best) picked.push(best);
  }
  return picked;
}

export type Sheet = { blob: Blob; cols: number; rows: number; cellW: number; cellH: number; frames: Array<{ angle: number; time: number }> };

/**
 * The 360° sheet: `count` frames round the turn, each the product cut out of the video at
 * its own size (the mask, found smaller, grown to it with soft edges), `cellH` pixels tall,
 * in a grid; WebP keeps the see-through background.
 */
export async function renderSheet(v: OpenVideo, a: Analysis, opts: { count?: number; cellH?: number; onProgress?: (f: number) => unknown; signal?: AbortSignal } = {}): Promise<Sheet> {
  const frames = evenFrames(a.turn, opts.count ?? 72);
  const crop = cropOf(a.turn, a.w, a.h);
  const scale = v.width / a.w;
  const cropW = (crop.x1 - crop.x0 + 1) * scale;
  const cropH = (crop.y1 - crop.y0 + 1) * scale;
  const cellH = Math.round(Math.min(opts.cellH ?? 320, cropH));
  const cellW = Math.round((cropW * cellH) / cropH);
  const cols = Math.ceil(Math.sqrt((frames.length * cellH) / cellW));
  const rows = Math.ceil(frames.length / cols);
  const sheet = document.createElement("canvas");
  sheet.width = cols * cellW;
  sheet.height = rows * cellH;
  const sctx = sheet.getContext("2d")!;
  const cell = document.createElement("canvas");
  cell.width = cellW;
  cell.height = cellH;
  const cctx = cell.getContext("2d", { willReadFrequently: true })!;
  for (let k = 0; k < frames.length; k++) {
    const f = frames[k];
    await seek(v.video, f.time, opts.signal);
    cctx.clearRect(0, 0, cellW, cellH);
    cctx.drawImage(v.video, crop.x0 * scale, crop.y0 * scale, cropW, cropH, 0, 0, cellW, cellH);
    const img = cctx.getImageData(0, 0, cellW, cellH);
    for (let y = 0; y < cellH; y++)
      for (let x = 0; x < cellW; x++) {
        const ax = crop.x0 + ((x + 0.5) * (crop.x1 - crop.x0 + 1)) / cellW;
        const ay = crop.y0 + ((y + 0.5) * (crop.y1 - crop.y0 + 1)) / cellH;
        img.data[(y * cellW + x) * 4 + 3] = Math.round(alphaAt(f.mask, a.w, a.h, ax, ay) * 255);
      }
    cctx.putImageData(img, 0, 0);
    sctx.drawImage(cell, (k % cols) * cellW, Math.floor(k / cols) * cellH);
    await opts.onProgress?.((k + 1) / frames.length);
  }
  const blob = await new Promise<Blob>((resolve, reject) => sheet.toBlob((b) => (b ? resolve(b) : reject(new Error("SHEET_FAILED"))), "image/webp", 0.86));
  return { blob, cols, rows, cellW, cellH, frames: frames.map((f) => ({ angle: Math.round(f.angle * 10) / 10, time: Math.round(f.time * 1000) / 1000 })) };
}
