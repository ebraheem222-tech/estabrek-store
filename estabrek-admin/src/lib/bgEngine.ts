/**
 * Which engine and model cut a background out (bgRemove.ts runs them). Pure, so it is
 * tested on its own.
 *
 * Two engines:
 * - "browser" (the default, free): BiRefNet_lite (MIT, github.com/ZhengPeng7/BiRefNet)
 *   runs on this device. The model is downloaded once from Hugging Face, checked against
 *   its SHA-256 and kept in the browser's cache. With WebGPU it uses the 1024 px graph
 *   (best edges, about 115 MB); without it, the 512 px graph on WASM (about 98 MB, slower,
 *   softer edges), because the 1024 graph needs more than WASM's 4 GB of memory.
 * - "cloudinary" (paid per picture, off unless switched on in media settings): the
 *   store's Cloudinary account removes it (the server calls it, see uploads.controller).
 *
 * The 1024 graph is the official ONNX export with only its topology rewritten so WebGPU
 * can run it (same weights): huggingface.co/jiabins0303/birefnet-lite-1024-webgpu.
 * The 512 graph is a re-export at 512 px: huggingface.co/studioludens/birefnet-lite-512.
 * Both MIT. A store can host the same files itself (VITE_BG_MODEL_BEST_URL /
 * VITE_BG_MODEL_FAST_URL); the SHA-256 check stays.
 */

export type EngineId = "browser" | "cloudinary";
export type Backend = "webgpu" | "wasm";
export type ModelId = "birefnet-lite-1024" | "birefnet-lite-512";
/** "best" = the sharpest edges this device can do; "fast" = the 512 graph (e.g. many frames of a video). */
export type Quality = "best" | "fast";

export type ModelSpec = {
  id: ModelId;
  url: string;
  /** Input is size×size. */
  size: number;
  bytes: number;
  sha256: string;
};

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const MODELS: Record<ModelId, ModelSpec> = {
  "birefnet-lite-1024": {
    id: "birefnet-lite-1024",
    url: env.VITE_BG_MODEL_BEST_URL || "https://huggingface.co/jiabins0303/birefnet-lite-1024-webgpu/resolve/1ad01cef0f4101a285c5a3e0bd7f15597d93403f/onnx/model_fp16.onnx",
    size: 1024,
    bytes: 114_834_127,
    sha256: "4059896039dfccb0f15b9080ff06d11d90e499449bb045e797055eb8901cf5f4",
  },
  "birefnet-lite-512": {
    id: "birefnet-lite-512",
    url: env.VITE_BG_MODEL_FAST_URL || "https://huggingface.co/studioludens/birefnet-lite-512/resolve/962e67969ec6acec9c19fab76acee4f5e22e990c/onnx/model_fp16.onnx",
    size: 512,
    bytes: 98_484_532,
    sha256: "eff9216bb2f9d3f023d9c2b7196845a7485739ab1f231593633e4d2344ffc516",
  },
};

/** What this browser's graphics can do (bgRemove.gpuInfo()). */
export type GpuInfo = {
  webgpu: boolean;
  /** Half-precision maths in shaders (both graphs are fp16). */
  f16: boolean;
  maxStorageBuffers: number;
  /** WebGPU failed here before (not enough graphics memory…): WASM from then on. */
  failedBefore?: boolean;
};

export type BrowserPlan = { backend: Backend; model: ModelSpec };

/** The model and runtime for this device. */
export function browserPlan(gpu: GpuInfo, quality: Quality = "best"): BrowserPlan {
  const webgpu = gpu.webgpu && gpu.f16 && gpu.maxStorageBuffers >= 8 && !gpu.failedBefore;
  if (!webgpu) return { backend: "wasm", model: MODELS["birefnet-lite-512"] };
  return { backend: "webgpu", model: MODELS[quality === "fast" ? "birefnet-lite-512" : "birefnet-lite-1024"] };
}

/** Cloudinary as the media settings and the server report it. */
export type CloudState = {
  /** Switched on in media settings. */
  on: boolean;
  /** The store has Cloudinary keys. */
  ready: boolean;
};

export type EngineChoice = { engine: EngineId } | { error: "CLOUD_OFF" | "CLOUD_NOT_READY" };

/** The engine to use: the free one unless Cloudinary is asked for and can be used. */
export function chooseEngine(want: EngineId | "auto" | undefined, cloud: CloudState | null | undefined): EngineChoice {
  if (want !== "cloudinary") return { engine: "browser" };
  if (!cloud?.on) return { error: "CLOUD_OFF" };
  if (!cloud.ready) return { error: "CLOUD_NOT_READY" };
  return { engine: "cloudinary" };
}

/** The engines to offer in a picker: Cloudinary only when it is switched on. */
export function engineOptions(cloud: CloudState | null | undefined): Array<{ id: EngineId; usable: boolean }> {
  const out: Array<{ id: EngineId; usable: boolean }> = [{ id: "browser", usable: true }];
  if (cloud?.on) out.push({ id: "cloudinary", usable: cloud.ready });
  return out;
}

/** "45 MB" style, for the download note. */
export function megabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/* ------------------------------------------------------------------ worker messages */

export type WorkerIn =
  | { type: "cut"; id: number; model: ModelSpec; backend: Backend; bitmap: ImageBitmap; w: number; h: number }
  | { type: "warm"; id: number; model: ModelSpec; backend: Backend };

export type Phase = "download" | "prepare" | "cut" | "cloud";

export type WorkerOut =
  | { type: "progress"; id: number; phase: Phase; loaded?: number; total?: number }
  | { type: "done"; id: number; mask?: Uint8ClampedArray; w: number; h: number; backend: Backend }
  | { type: "error"; id: number; code: BgErrorCode; message: string };

export type BgErrorCode =
  | "NO_WORKER"
  | "IMAGE_LOAD"
  | "MODEL_DOWNLOAD"
  | "MODEL_CHECK"
  | "GPU_FAILED"
  | "RUN_FAILED"
  | "ABORTED"
  | "CLOUD_OFF"
  | "CLOUD_NOT_READY"
  | "CLOUD_NEEDS_URL"
  | "CLOUD_FAILED";

export class BgRemoveError extends Error {
  readonly code: BgErrorCode;
  /** Cloudinary: the server's own code (CLOUD_CUTOUT_NOT_ENABLED, NOT_ON_CLOUDINARY…). */
  readonly serverCode?: string;
  constructor(code: BgErrorCode, message: string = code, serverCode?: string) {
    super(message);
    this.name = "BgRemoveError";
    this.code = code;
    this.serverCode = serverCode;
  }
}

/** A worker message before it gets its number. */
export type WorkerJob = WorkerIn extends infer T ? (T extends unknown ? Omit<T, "id"> : never) : never;
