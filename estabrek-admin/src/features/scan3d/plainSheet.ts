/**
 * The 360° sheet from a plain video: `times` round one turn, each frame cut out of its
 * background by the background remover (lib/bgRemove.ts, the fast model: one small mask a
 * frame) or kept as filmed; the same box round the product in every frame so it doesn't
 * jump; then each cell drawn from the video at its own size, the mask grown to it with a
 * soft edge, see-through or laid on a colour; WebP keeps the see-through.
 */
import { removeBackground } from "../../lib/bgRemove";
import { maskBox, sheetGrid, unionBox } from "./plainTurn";
import { frameAt, seekTo, type OpenVideo } from "./video";

/** "kept" as filmed, "cut" see-through, or a colour (#rrggbb) under the cut-out product. */
export type PlainBackground = "kept" | "cut" | string;
export type PlainSheet = { blob: Blob; cols: number; rows: number; cellW: number; cellH: number; frames: Array<{ angle: number; time: number }> };
export type PlainStep = "cut" | "draw";
type Cut = (img: ImageData, opts: { quality: "fast"; maxSide: number; signal?: AbortSignal }) => Promise<{ width: number; height: number; mask: Uint8ClampedArray }>;

const MASK_SIDE = 512;

/** A 0–255 mask read between its pixels, as 0–1 with a soft edge. */
function maskAt(mask: Uint8ClampedArray, w: number, h: number, x: number, y: number) {
  const x0 = Math.max(0, Math.min(w - 2, Math.floor(x - 0.5)));
  const y0 = Math.max(0, Math.min(h - 2, Math.floor(y - 0.5)));
  const fx = Math.max(0, Math.min(1, x - 0.5 - x0));
  const fy = Math.max(0, Math.min(1, y - 0.5 - y0));
  const at = (xx: number, yy: number) => mask[Math.min(h - 1, yy) * w + Math.min(w - 1, xx)];
  const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
  const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
  return Math.max(0, Math.min(1, ((a + (b - a) * fy) / 255 - 0.15) / 0.7));
}

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export async function renderPlainSheet(
  v: OpenVideo,
  times: number[],
  opts: { background: PlainBackground; cellH?: number; onProgress?: (step: PlainStep, f: number) => unknown; signal?: AbortSignal; cut?: Cut },
): Promise<PlainSheet> {
  const cutting = opts.background !== "kept";
  const cut: Cut = opts.cut ?? ((img, o) => removeBackground(img, o));
  // 1. Each frame's mask, small (and where the product is in it).
  const masks: Array<{ w: number; h: number; mask: Uint8ClampedArray }> = [];
  const sw = Math.min(MASK_SIDE, v.width);
  const sh = Math.round((v.height * sw) / v.width);
  if (cutting) {
    for (let k = 0; k < times.length; k++) {
      const f = await frameAt(v, times[k], sw, opts.signal);
      const c = await cut(new ImageData(new Uint8ClampedArray(f.data), f.w, f.h), { quality: "fast", maxSide: MASK_SIDE, signal: opts.signal });
      masks.push({ w: c.width, h: c.height, mask: c.mask });
      await opts.onProgress?.("cut", (k + 1) / times.length);
    }
  }
  const crop = cutting ? unionBox(masks.map((m) => maskBox(m.mask, m.w, m.h)), sw, sh) : { x0: 0, y0: 0, x1: sw - 1, y1: sh - 1 };
  // 2. The cells at the video's own size.
  const scale = v.width / sw;
  const cropW = (crop.x1 - crop.x0 + 1) * scale;
  const cropH = (crop.y1 - crop.y0 + 1) * scale;
  const cellH = Math.round(Math.min(opts.cellH ?? 400, cropH));
  const cellW = Math.max(8, Math.round((cropW * cellH) / cropH));
  const { cols, rows } = sheetGrid(times.length, cellW, cellH);
  const sheet = document.createElement("canvas");
  sheet.width = cols * cellW;
  sheet.height = rows * cellH;
  const sctx = sheet.getContext("2d")!;
  const cell = document.createElement("canvas");
  cell.width = cellW;
  cell.height = cellH;
  const cctx = cell.getContext("2d", { willReadFrequently: true })!;
  const bg = cutting && /^#[0-9a-f]{6}$/i.test(opts.background) ? hexRgb(opts.background) : null;
  for (let k = 0; k < times.length; k++) {
    await seekTo(v, times[k], opts.signal);
    cctx.clearRect(0, 0, cellW, cellH);
    cctx.drawImage(v.video, crop.x0 * scale, crop.y0 * scale, cropW, cropH, 0, 0, cellW, cellH);
    if (cutting) {
      const m = masks[k];
      const img = cctx.getImageData(0, 0, cellW, cellH);
      const d = img.data;
      for (let y = 0; y < cellH; y++)
        for (let x = 0; x < cellW; x++) {
          const ax = (crop.x0 + ((x + 0.5) * (crop.x1 - crop.x0 + 1)) / cellW) * (m.w / sw);
          const ay = (crop.y0 + ((y + 0.5) * (crop.y1 - crop.y0 + 1)) / cellH) * (m.h / sh);
          const a = maskAt(m.mask, m.w, m.h, ax, ay);
          const i = (y * cellW + x) * 4;
          if (bg) {
            d[i] = Math.round(d[i] * a + bg[0] * (1 - a));
            d[i + 1] = Math.round(d[i + 1] * a + bg[1] * (1 - a));
            d[i + 2] = Math.round(d[i + 2] * a + bg[2] * (1 - a));
            d[i + 3] = 255;
          } else d[i + 3] = Math.round(a * 255);
        }
      cctx.putImageData(img, 0, 0);
    }
    sctx.drawImage(cell, (k % cols) * cellW, Math.floor(k / cols) * cellH);
    await opts.onProgress?.("draw", (k + 1) / times.length);
  }
  const blob = await new Promise<Blob>((resolve, reject) => sheet.toBlob((b) => (b ? resolve(b) : reject(new Error("SHEET_FAILED"))), "image/webp", 0.86));
  return { blob, cols, rows, cellW, cellH, frames: times.map((time, k) => ({ angle: Math.round(((k * 360) / times.length) * 10) / 10, time })) };
}
