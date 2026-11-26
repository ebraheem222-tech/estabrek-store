/**
 * «قصّ بكبسة»: which model picks the thing clicked in a picture, and the sums around it (sam.ts runs it in
 * samWorker.ts). Pure, so it is tested on its own.
 *
 * The model: SlimSAM-77 (a slimmed Segment Anything; Apache-2.0: github.com/czg1225/SlimSAM, from Meta's SAM, also
 * Apache-2.0), as ONNX from huggingface.co/Xenova/slimsam-77-uniform, its 8-bit files pinned to one revision and
 * checked against their SHA-256 like the other models here. Two parts: the picture's reader (once a picture, ~8.9 MB)
 * and the picker (each click, ~4.9 MB, a tenth of a second). Free, on the owner's device, without any key. A store
 * can host the same files itself (VITE_SAM_ENCODER_URL / VITE_SAM_DECODER_URL).
 *
 * As its own processor does: the picture's longest side 1024 px, normalised as ImageNet, padded to 1024 × 1024 at
 * its right and bottom; clicks in those 1024 px; three low masks (256 × 256, logits) and how sure it is of each.
 */
import type { ModelSpec } from "./bgEngine";

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const BASE = "https://huggingface.co/Xenova/slimsam-77-uniform/resolve/5850ab45f587c112167512ffef949107115e26a0/onnx";

export type SamModel = Omit<ModelSpec, "id" | "size"> & { id: "slimsam-77-encoder-int8" | "slimsam-77-decoder-int8" };
export const SAM_MODELS = {
  encoder: { id: "slimsam-77-encoder-int8", url: env.VITE_SAM_ENCODER_URL || `${BASE}/vision_encoder_quantized.onnx`, bytes: 8_882_165, sha256: "cce23c7b2e5d4f330932738fb67ba518e04b0d99ccdd1cccd22a7da4e01f2971" },
  decoder: { id: "slimsam-77-decoder-int8", url: env.VITE_SAM_DECODER_URL || `${BASE}/prompt_encoder_mask_decoder_quantized.onnx`, bytes: 4_903_810, sha256: "cb90b279f549d2cab7fd6e20c38522438c65d84bdcca3d2a764cff7d857fdce2" },
} satisfies Record<string, SamModel>;
export const SAM_BYTES = SAM_MODELS.encoder.bytes + SAM_MODELS.decoder.bytes;

export const SAM_SIDE = 1024;
const LOW = 256;
/** A click on the picture (its own pixels): keep what is there, or leave it out. */
export type SamPoint = { x: number; y: number; keep: boolean };

/** The picture's size as the model reads it (its longest side 1024) and the scale from the picture to it. */
export function samInputSize(w: number, h: number) {
  const k = SAM_SIDE / Math.max(1, w, h);
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)), k };
}

const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
/** The picture's pixels (RGBA at samInputSize) as the model reads them: channels first, normalised, zeros to 1024². */
export function samInput(rgba: ArrayLike<number>, w: number, h: number): Float32Array {
  const n = SAM_SIDE * SAM_SIDE, out = new Float32Array(3 * n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = y * SAM_SIDE + x;
    for (let c = 0; c < 3; c++) out[c * n + o] = (rgba[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  }
  return out;
}

/** The clicks as the picker reads them: [1, 1, N, 2] places in the model's pixels and [1, 1, N] kinds (1 keep, 0 leave out). */
export function samPrompt(points: SamPoint[], k: number) {
  const coords = new Float32Array(points.length * 2), labels = new BigInt64Array(points.length);
  points.forEach((p, i) => {
    coords[i * 2] = p.x * k;
    coords[i * 2 + 1] = p.y * k;
    labels[i] = p.keep ? 1n : 0n;
  });
  return { coords, labels };
}

/** Which of the three masks: the one the model is surest of. */
export function bestMask(iou: ArrayLike<number>) {
  let best = 0;
  for (let i = 1; i < iou.length; i++) if (iou[i] > iou[best]) best = i;
  return best;
}

/**
 * A mask at the picture's own size (`outW` × `outH`, 0 … 255) from the model's low mask `which` (logits, 3 × 256²):
 * read between its pixels where the picture's part of the 1024² falls (`rw` × `rh`), with a soft edge one or two
 * pixels wide (the logit through a steep curve), not a staircase.
 */
export function samMask(pred: ArrayLike<number>, which: number, rw: number, rh: number, outW: number, outH: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(outW * outH), base = which * LOW * LOW, s = LOW / SAM_SIDE;
  const at = (x: number, y: number) => pred[base + y * LOW + x];
  // Read inside the picture's own part only: its edge rows don't blend with the padding below or beside it.
  const maxX = Math.max(0, Math.min(LOW - 1, rw * s - 1)), maxY = Math.max(0, Math.min(LOW - 1, rh * s - 1));
  for (let y = 0; y < outH; y++) {
    const fy = Math.min(maxY, Math.max(0, ((y + 0.5) * rh / outH) * s - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(LOW - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < outW; x++) {
      const fx = Math.min(maxX, Math.max(0, ((x + 0.5) * rw / outW) * s - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(LOW - 1, x0 + 1), tx = fx - x0;
      const v = (at(x0, y0) * (1 - tx) + at(x1, y0) * tx) * (1 - ty) + (at(x0, y1) * (1 - tx) + at(x1, y1) * tx) * ty;
      out[y * outW + x] = Math.round(255 / (1 + Math.exp(-v * 4)));
    }
  }
  return out;
}

export type SamPhase = "download" | "prepare" | "read" | "pick";
export type SamErrorCode = "NO_WORKER" | "IMAGE_LOAD" | "MODEL_DOWNLOAD" | "MODEL_CHECK" | "RUN_FAILED" | "ABORTED";
export class SamError extends Error {
  readonly code: SamErrorCode;
  constructor(code: SamErrorCode, message: string = code) {
    super(message);
    this.name = "SamError";
    this.code = code;
  }
}

/** What the page and the worker say to each other. */
export type SamIn =
  | { type: "read"; id: number; bitmap: ImageBitmap }
  | { type: "pick"; id: number; coords: Float32Array; labels: BigInt64Array };
export type SamOut =
  | { type: "progress"; id: number; phase: SamPhase; loaded?: number; total?: number }
  | { type: "read"; id: number; rw: number; rh: number; k: number }
  | { type: "picked"; id: number; pred: Float32Array; iou: Float32Array }
  | { type: "error"; id: number; code: SamErrorCode; message: string };
