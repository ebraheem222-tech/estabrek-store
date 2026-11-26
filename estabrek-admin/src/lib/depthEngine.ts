/**
 * Which depth model runs, and the sums around it (depth.ts runs it in depthWorker.ts). Pure, so it is tested on its
 * own.
 *
 * The model: Depth Anything V2 Small (Apache-2.0: github.com/DepthAnything/Depth-Anything-V2; the larger ones are
 * for non-commercial use only and are not used), as ONNX from huggingface.co/onnx-community/depth-anything-v2-small,
 * pinned to one revision and checked against its SHA-256 like the background remover's (bgEngine.ts). It runs on the
 * owner's own device, free and without any key: half-precision on WebGPU (about 47 MB), or the 8-bit one on WASM
 * (about 26 MB). A store can host the same files itself (VITE_DEPTH_MODEL_GPU_URL / VITE_DEPTH_MODEL_CPU_URL).
 * Its answer is a relative depth, larger = nearer; it is spread over 0 … 255 (white = near).
 */
import type { Backend, GpuInfo, ModelSpec } from "./bgEngine";

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const BASE = "https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/4472b7362082ad9968fee890ca0f1e5aca36b93d/onnx";

export type DepthModelId = "depth-anything-v2-small-fp16" | "depth-anything-v2-small-int8";
export type DepthModel = Omit<ModelSpec, "id" | "size"> & { id: DepthModelId };
export const DEPTH_MODELS: Record<DepthModelId, DepthModel> = {
  "depth-anything-v2-small-fp16": {
    id: "depth-anything-v2-small-fp16",
    url: env.VITE_DEPTH_MODEL_GPU_URL || `${BASE}/model_fp16.onnx`,
    bytes: 49_642_442,
    sha256: "2df6223f206b5164e21f664ace61dabeb9bb6a49b8b5a3e00510b4807d0f5b04",
  },
  "depth-anything-v2-small-int8": {
    id: "depth-anything-v2-small-int8",
    url: env.VITE_DEPTH_MODEL_CPU_URL || `${BASE}/model_quantized.onnx`,
    bytes: 27_258_801,
    sha256: "fcf51f1b230362b28690bb9d1809bf0431f29cad20534e3f589bd7285547f20d",
  },
};
export type DepthPlan = { backend: Backend; model: DepthModel };

/** The model and runtime for this device: half precision on a WebGPU that has it, else the 8-bit one on WASM. */
export function depthPlan(gpu: GpuInfo): DepthPlan {
  const webgpu = gpu.webgpu && gpu.f16 && gpu.maxStorageBuffers >= 8 && !gpu.failedBefore;
  return webgpu ? { backend: "webgpu", model: DEPTH_MODELS["depth-anything-v2-small-fp16"] } : { backend: "wasm", model: DEPTH_MODELS["depth-anything-v2-small-int8"] };
}

/**
 * The size the model reads a picture at: its shorter side 518 px and its longer one in proportion (at most 924), each
 * a multiple of 14 (the model's patches), as its own image processor does ("keep aspect ratio, multiple of 14").
 */
export function depthInputSize(w: number, h: number): { w: number; h: number } {
  const to14 = (v: number) => Math.max(14, Math.round(v / 14) * 14);
  const short = Math.min(w, h), long = Math.max(w, h);
  const k = 518 / Math.max(1, short);
  const L = Math.min(924, to14(long * k));
  return w <= h ? { w: 518, h: L } : { w: L, h: 518 };
}

const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
/** A picture's pixels (RGBA, at the model's size) as the model reads them: channels first, scaled to 0 … 1, normalised. */
export function depthInput(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const n = w * h, out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  return out;
}

/**
 * The model's answer (one number a pixel, larger = nearer) as grey pixels (RGBA, white = near), spread between its
 * 1st and 99th hundredths so a few odd pixels don't flatten the rest.
 */
export function depthToGrey(values: ArrayLike<number>, w: number, h: number): Uint8ClampedArray {
  const n = w * h, sorted = Float32Array.from({ length: n }, (_, i) => values[i]).sort();
  const lo = sorted[Math.floor(n * 0.01)], hi = sorted[Math.min(n - 1, Math.floor(n * 0.99))], span = hi - lo || 1;
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const g = Math.round(Math.min(1, Math.max(0, (values[i] - lo) / span)) * 255);
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = g;
    out[i * 4 + 3] = 255;
  }
  return out;
}

/* ------------------------------------------------------------------ worker messages */

export type DepthIn =
  | { type: "depth"; id: number; model: DepthModel; backend: Backend; bitmap: ImageBitmap; w: number; h: number }
  | { type: "warm"; id: number; model: DepthModel; backend: Backend };
export type DepthPhase = "download" | "prepare" | "think";
export type DepthOut =
  | { type: "progress"; id: number; phase: DepthPhase; loaded?: number; total?: number }
  | { type: "done"; id: number; grey?: Uint8ClampedArray; w: number; h: number; backend: Backend }
  | { type: "error"; id: number; code: DepthErrorCode; message: string };
export type DepthErrorCode = "NO_WORKER" | "IMAGE_LOAD" | "MODEL_DOWNLOAD" | "MODEL_CHECK" | "GPU_FAILED" | "RUN_FAILED" | "ABORTED";
export class DepthError extends Error {
  readonly code: DepthErrorCode;
  constructor(code: DepthErrorCode, message: string = code) {
    super(message);
    this.name = "DepthError";
    this.code = code;
  }
}
