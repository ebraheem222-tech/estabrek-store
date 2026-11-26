/**
 * «عمق الصورة»: estimateDepth(picture) → a grey picture of how near each part is (white = near), made on this device
 * by the depth model in a worker (depthWorker.ts; which model: depthEngine.ts), free and without any key; or
 * quickDepth(picture): the picture's light as a stand-in, at once and without a model. depthFile() makes either a PNG
 * to upload beside the picture. The shop lifts the picture by it (shared/photo3d.ts).
 */
import { gpuInfo } from "./bgRemove";
import { DepthError, depthPlan, type DepthIn, type DepthOut, type DepthPhase, type DepthPlan } from "./depthEngine";
import { lightDepth } from "../../../shared/photo3d";

export { DepthError } from "./depthEngine";
export type DepthMap = { width: number; height: number; grey: Uint8ClampedArray; engine: "webgpu" | "wasm" | "light" };
export type DepthProgress = { phase: DepthPhase; loaded?: number; total?: number };

/** The longest side of a depth picture (its detail is shapes, not texture). */
const SIDE = 512;
const GPU_FAILED_KEY = "depth:webgpu-failed";

async function bitmapOf(source: string | Blob): Promise<ImageBitmap> {
  try {
    const blob = typeof source === "string" ? await (await fetch(source, { mode: "cors", credentials: "omit" })).blob() : source;
    return await createImageBitmap(blob);
  } catch (e) {
    throw new DepthError("IMAGE_LOAD", String(e));
  }
}
const sizeOf = (w: number, h: number) => {
  const k = Math.min(1, SIDE / Math.max(w, h));
  return { w: Math.max(2, Math.round(w * k)), h: Math.max(2, Math.round(h * k)) };
};

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, { ok: (m: Extract<DepthOut, { type: "done" }>) => void; no: (e: DepthError) => void; onProgress?: (p: DepthProgress) => void }>();
function getWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") throw new DepthError("NO_WORKER", "This browser can't run the model");
  worker = new Worker(new URL("./depthWorker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<DepthOut>) => {
    const msg = e.data, job = waiting.get(msg.id);
    if (!job) return;
    if (msg.type === "progress") job.onProgress?.({ phase: msg.phase, loaded: msg.loaded, total: msg.total });
    else {
      waiting.delete(msg.id);
      if (msg.type === "done") job.ok(msg);
      else job.no(new DepthError(msg.code, msg.message));
    }
  };
  worker.onerror = (e) => {
    for (const job of waiting.values()) job.no(new DepthError("NO_WORKER", e.message || "The worker stopped"));
    waiting.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}
type Job = DepthIn extends infer T ? (T extends unknown ? Omit<T, "id"> : never) : never;
function ask(msg: Job, transfer: Transferable[], onProgress?: (p: DepthProgress) => void, signal?: AbortSignal) {
  const w = getWorker(), id = nextId++;
  return new Promise<Extract<DepthOut, { type: "done" }>>((ok, no) => {
    if (signal?.aborted) return no(new DepthError("ABORTED"));
    const stop = () => {
      worker?.terminate();
      worker = null;
      for (const j of waiting.values()) j.no(new DepthError("ABORTED"));
      waiting.clear();
    };
    signal?.addEventListener("abort", stop, { once: true });
    waiting.set(id, { ok: (m) => { signal?.removeEventListener("abort", stop); ok(m); }, no: (e) => { signal?.removeEventListener("abort", stop); no(e); }, onProgress });
    w.postMessage({ ...msg, id } as DepthIn, transfer);
  });
}

/** The model and runtime this device will use (for the download note: its size). */
export async function depthPlanHere(): Promise<DepthPlan> {
  let failedBefore = false;
  try {
    failedBefore = localStorage.getItem(GPU_FAILED_KEY) === "1";
  } catch {
    // private mode
  }
  return depthPlan({ ...(await gpuInfo()), failedBefore });
}

/** The picture's depth by the model on this device. Throws DepthError (its `code` says why). */
export async function estimateDepth(source: string | Blob, opts: { onProgress?: (p: DepthProgress) => void; signal?: AbortSignal } = {}): Promise<DepthMap> {
  const bitmap = await bitmapOf(source);
  const { w, h } = sizeOf(bitmap.width, bitmap.height);
  let plan = await depthPlanHere();
  const spare = plan.backend === "webgpu" ? await createImageBitmap(bitmap) : null;
  try {
    const done = await ask({ type: "depth", model: plan.model, backend: plan.backend, bitmap, w, h }, [bitmap], opts.onProgress, opts.signal);
    spare?.close();
    return { width: w, height: h, grey: done.grey!, engine: done.backend };
  } catch (e) {
    // The graphics card didn't manage: this device uses WASM from now on.
    if (!(e instanceof DepthError) || e.code !== "GPU_FAILED" || !spare) throw e;
    try {
      localStorage.setItem(GPU_FAILED_KEY, "1");
    } catch {
      // private mode
    }
    plan = await depthPlanHere();
    const done = await ask({ type: "depth", model: plan.model, backend: plan.backend, bitmap: spare, w, h }, [spare], opts.onProgress, opts.signal);
    return { width: w, height: h, grey: done.grey!, engine: done.backend };
  }
}

/** The picture's light as its depth (no model: at once, rougher). */
export async function quickDepth(source: string | Blob): Promise<DepthMap> {
  const bitmap = await bitmapOf(source);
  const { w, h } = sizeOf(bitmap.width, bitmap.height);
  const c = new OffscreenCanvas(w, h), g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new DepthError("IMAGE_LOAD", "No 2D canvas");
  g.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return { width: w, height: h, grey: lightDepth(g.getImageData(0, 0, w, h).data, w, h), engine: "light" };
}

/** A depth picture as a PNG file to upload. */
export async function depthFile(map: DepthMap, name = "depth"): Promise<File> {
  const c = new OffscreenCanvas(map.width, map.height);
  c.getContext("2d")!.putImageData(new ImageData(map.grey as Uint8ClampedArray<ArrayBuffer>, map.width, map.height), 0, 0);
  const blob = await c.convertToBlob({ type: "image/png" });
  return new File([blob], `${name.replace(/[^\w-]+/g, "-").slice(0, 40) || "depth"}-depth.png`, { type: "image/png" });
}
