/**
 * «شيل الخلفية»: removeBackground(picture) → the picture's pixels and a mask (0 =
 * background, 255 = the product), by the free engine on this device (a worker,
 * bgWorker.ts) or by the store's Cloudinary. Which engine and model: bgEngine.ts.
 * The pixel work (cut-out, flatten, brush): cutout.ts.
 *
 * Reused by anything that needs a product without its background (the media library,
 * a product's photos, the frames of a 360° video):
 *
 *   const cut = await removeBackground(file, { quality: "fast" });
 *   const png = await cutoutBlob(cut);                       // transparent PNG
 *   const jpg = await cutoutBlob(cut, { background: "#ffffff" });
 */
import { cloudCutout, CloudCutoutError } from "../api/uploads.api";
import { BgRemoveError, MODELS, browserPlan, type Backend, type BrowserPlan, type EngineId, type GpuInfo, type ModelId, type Phase, type Quality, type WorkerIn, type WorkerJob, type WorkerOut } from "./bgEngine";
import { composite, maskFromAlpha, type Background } from "./cutout";

export { BgRemoveError } from "./bgEngine";

export type CutoutSource = string | Blob | ImageBitmap | ImageData | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;

export type Cutout = {
  width: number;
  height: number;
  /** The picture's own pixels at this size (what the "keep" brush brings back). */
  image: ImageData;
  /** One byte a pixel: 0 = background, 255 = the product. */
  mask: Uint8ClampedArray;
  engine: Backend | "cloudinary";
  model?: ModelId;
};

export type BgProgress = { phase: Phase; loaded?: number; total?: number };

export type RemoveBackgroundOptions = {
  /** "browser" (free, default) or "cloudinary" (the server asks the store's Cloudinary). */
  engine?: EngineId;
  /** "best" (default) or "fast": the 512 px model (many frames of a video). */
  quality?: Quality;
  /** The picture is made smaller than this first (longest side, default 4096). */
  maxSide?: number;
  /** The picture's address on Cloudinary when `image` is not that address (Cloudinary engine). */
  sourceUrl?: string;
  /** Cloudinary only: finer edges for fur and fluffy things. */
  fineEdges?: boolean;
  onProgress?: (p: BgProgress) => void;
  signal?: AbortSignal;
};

/* ------------------------------------------------------------------ pictures in */

async function toBitmap(source: CutoutSource): Promise<ImageBitmap> {
  try {
    if (typeof source === "string") {
      const res = await fetch(source, { mode: "cors", credentials: "omit" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await createImageBitmap(await res.blob());
    }
    if (source instanceof ImageBitmap) return await createImageBitmap(source);
    if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement && !source.complete) await source.decode();
    return await createImageBitmap(source as ImageBitmapSource);
  } catch (e) {
    throw new BgRemoveError("IMAGE_LOAD", String(e));
  }
}

function canvas2d(w: number, h: number) {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new BgRemoveError("IMAGE_LOAD", "No 2D canvas");
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  return { c, g };
}

/** The picture as pixels, no bigger than maxSide (and the bitmap, at that size). */
async function loadPicture(source: CutoutSource, maxSide: number, size?: { w: number; h: number }) {
  const bmp = await toBitmap(source);
  const scale = size ? 1 : Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = size?.w ?? Math.max(1, Math.round(bmp.width * scale));
  const h = size?.h ?? Math.max(1, Math.round(bmp.height * scale));
  const { c, g } = canvas2d(w, h);
  g.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return { image: g.getImageData(0, 0, w, h), bitmap: c.transferToImageBitmap() };
}

/* ------------------------------------------------------------------ this device */

const GPU_FAILED_KEY = "bg-remove:webgpu-failed";
type GpuAdapterLike = { features: { has(f: string): boolean }; limits: { maxStorageBuffersPerShaderStage: number } };
let gpuCache: Promise<GpuInfo> | null = null;

/** What WebGPU can do here (asked once). */
export function gpuInfo(): Promise<GpuInfo> {
  gpuCache ??= (async () => {
    let failedBefore = false;
    try {
      failedBefore = localStorage.getItem(GPU_FAILED_KEY) === "1";
    } catch {
      // private mode
    }
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<GpuAdapterLike | null> } }).gpu;
    if (!gpu) return { webgpu: false, f16: false, maxStorageBuffers: 0, failedBefore };
    try {
      const a = await gpu.requestAdapter();
      if (!a) return { webgpu: false, f16: false, maxStorageBuffers: 0, failedBefore };
      return { webgpu: true, f16: a.features.has("shader-f16"), maxStorageBuffers: a.limits.maxStorageBuffersPerShaderStage, failedBefore };
    } catch {
      return { webgpu: false, f16: false, maxStorageBuffers: 0, failedBefore };
    }
  })();
  return gpuCache;
}

function markGpuFailed() {
  gpuCache = null;
  try {
    localStorage.setItem(GPU_FAILED_KEY, "1");
  } catch {
    // private mode
  }
}

/** The plan for the free engine on this device (which model, WebGPU or WASM). */
export async function planHere(quality: Quality = "best"): Promise<BrowserPlan> {
  return browserPlan(await gpuInfo(), quality);
}

const CACHE = "bg-remove-models-v1";

/** Is this model already downloaded on this device? */
export async function isModelSaved(id: ModelId): Promise<boolean> {
  try {
    const c = await caches.open(CACHE);
    return Boolean(await c.match(MODELS[id].url));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ the worker */

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, { resolve: (m: Extract<WorkerOut, { type: "done" }>) => void; reject: (e: BgRemoveError) => void; onProgress?: (p: BgProgress) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") throw new BgRemoveError("NO_WORKER", "This browser can't run the model");
  worker = new Worker(new URL("./bgWorker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<WorkerOut>) => {
    const msg = e.data;
    const job = waiting.get(msg.id);
    if (!job) return;
    if (msg.type === "progress") job.onProgress?.({ phase: msg.phase, loaded: msg.loaded, total: msg.total });
    else {
      waiting.delete(msg.id);
      if (msg.type === "done") job.resolve(msg);
      else job.reject(new BgRemoveError(msg.code, msg.message));
    }
  };
  worker.onerror = (e) => {
    for (const job of waiting.values()) job.reject(new BgRemoveError("NO_WORKER", e.message || "The worker stopped"));
    waiting.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** Stops the worker (and whatever it was downloading). The next call starts a new one. */
export function stopBackgroundWorker() {
  worker?.terminate();
  worker = null;
  for (const job of waiting.values()) job.reject(new BgRemoveError("ABORTED"));
  waiting.clear();
}

function ask(msg: WorkerJob, transfer: Transferable[], opts: Pick<RemoveBackgroundOptions, "onProgress" | "signal">) {
  const w = getWorker();
  const id = nextId++;
  return new Promise<Extract<WorkerOut, { type: "done" }>>((resolve, reject) => {
    const onAbort = () => {
      // A download or a cut in progress can't be stopped halfway: the worker goes.
      if (waiting.has(id)) stopBackgroundWorker();
    };
    if (opts.signal?.aborted) return reject(new BgRemoveError("ABORTED"));
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    waiting.set(id, {
      resolve: (m) => {
        opts.signal?.removeEventListener("abort", onAbort);
        resolve(m);
      },
      reject: (e) => {
        opts.signal?.removeEventListener("abort", onAbort);
        reject(e);
      },
      onProgress: opts.onProgress,
    });
    w.postMessage({ ...msg, id } as WorkerIn, transfer);
  });
}

/** Downloads and prepares the free engine's model ahead of time (e.g. before cutting many frames). */
export async function warmBackgroundModel(opts: Pick<RemoveBackgroundOptions, "quality" | "onProgress" | "signal"> = {}) {
  const plan = await planHere(opts.quality);
  await ask({ type: "warm", model: plan.model, backend: plan.backend }, [], opts);
  return plan;
}

async function cutHere(source: CutoutSource, opts: RemoveBackgroundOptions): Promise<Cutout> {
  const { image, bitmap } = await loadPicture(source, opts.maxSide ?? 4096);
  const run = async (plan: BrowserPlan, bmp: ImageBitmap) => ask({ type: "cut", model: plan.model, backend: plan.backend, bitmap: bmp, w: image.width, h: image.height }, [bmp], opts);
  let plan = await planHere(opts.quality);
  let done: Extract<WorkerOut, { type: "done" }>;
  const spare = plan.backend === "webgpu" ? await createImageBitmap(bitmap) : null;
  try {
    done = await run(plan, bitmap);
    spare?.close();
  } catch (e) {
    // WebGPU didn't manage (graphics memory…): this device uses WASM from now on.
    if (!(e instanceof BgRemoveError) || e.code !== "GPU_FAILED" || !spare) throw e;
    markGpuFailed();
    plan = await planHere(opts.quality);
    done = await run(plan, spare);
  }
  return { width: image.width, height: image.height, image, mask: done.mask!, engine: done.backend, model: plan.model.id };
}

async function cutWithCloudinary(source: CutoutSource, opts: RemoveBackgroundOptions): Promise<Cutout> {
  const url = opts.sourceUrl ?? (typeof source === "string" ? source : "");
  if (!/^https?:\/\//i.test(url)) throw new BgRemoveError("CLOUD_NEEDS_URL", "Cloudinary needs the picture's address on Cloudinary");
  opts.onProgress?.({ phase: "cloud" });
  let png: Blob;
  try {
    png = await cloudCutout({ url, fineEdges: opts.fineEdges }, opts.signal);
  } catch (e) {
    if (opts.signal?.aborted) throw new BgRemoveError("ABORTED");
    const err = e instanceof CloudCutoutError ? e : null;
    throw new BgRemoveError("CLOUD_FAILED", err?.message || String(e), err?.code);
  }
  // Cloudinary's alpha, on the picture's own pixels at the same size.
  const cut = await loadPicture(png, Number.MAX_SAFE_INTEGER);
  cut.bitmap.close();
  const own = await loadPicture(source, 0, { w: cut.image.width, h: cut.image.height });
  own.bitmap.close();
  const mask = maskFromAlpha({ w: cut.image.width, h: cut.image.height, data: cut.image.data }).data;
  return { width: cut.image.width, height: cut.image.height, image: own.image, mask, engine: "cloudinary" };
}

/** The picture without its background. Throws BgRemoveError (its `code` says why). */
export async function removeBackground(source: CutoutSource, opts: RemoveBackgroundOptions = {}): Promise<Cutout> {
  if (opts.signal?.aborted) throw new BgRemoveError("ABORTED");
  return opts.engine === "cloudinary" ? cutWithCloudinary(source, opts) : cutHere(source, opts);
}

/* ------------------------------------------------------------------ pictures out */

/** The cut-out's pixels: transparent, or laid on a colour (#rrggbb). */
export function cutoutImageData(cut: Pick<Cutout, "width" | "height" | "image" | "mask">, background: Background = "transparent"): ImageData {
  const px = composite({ w: cut.width, h: cut.height, data: cut.image.data }, { w: cut.width, h: cut.height, data: cut.mask }, background);
  return new ImageData(px as Uint8ClampedArray<ArrayBuffer>, cut.width, cut.height);
}

/**
 * The cut-out as a file to save: PNG when transparent (real alpha), JPEG on a colour,
 * unless `type` says otherwise ("image/webp" keeps alpha where the browser can write it).
 */
export async function cutoutBlob(
  cut: Pick<Cutout, "width" | "height" | "image" | "mask">,
  opts: { background?: Background; type?: "image/png" | "image/webp" | "image/jpeg"; quality?: number } = {},
): Promise<Blob> {
  const background = opts.background ?? "transparent";
  const type = opts.type ?? (background === "transparent" ? "image/png" : "image/jpeg");
  const { c, g } = canvas2d(cut.width, cut.height);
  g.putImageData(cutoutImageData(cut, background), 0, 0);
  return c.convertToBlob({ type, quality: opts.quality ?? 0.92 });
}
