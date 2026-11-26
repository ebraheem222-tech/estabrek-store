/// <reference types="vite/client" />
/**
 * The worker that runs the depth model (depth.ts sends it pictures), so the admin stays responsive while it downloads
 * the model (once; it is kept in the browser's cache), prepares it and works. One model is kept ready at a time.
 */
import * as ort from "onnxruntime-web/webgpu";
import { depthInput, depthInputSize, depthToGrey, type DepthErrorCode, type DepthIn, type DepthModel, type DepthOut, type DepthPhase } from "./depthEngine";
import type { Backend } from "./bgEngine";

const CACHE = "depth-models-v1";
type Scope = { postMessage: (msg: DepthOut, transfer?: Transferable[]) => void; onmessage: ((e: MessageEvent<DepthIn>) => void) | null; crossOriginIsolated?: boolean };
const scope = self as unknown as Scope;

// As the background remover's worker: the runtime's own file from jsDelivr (too big for the admin's host).
const ORT_VERSION = ort.env.versions.web ?? ort.env.versions.common;
ort.env.wasm.wasmPaths = { wasm: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort-wasm-simd-threaded.asyncify.wasm` };
ort.env.wasm.numThreads = scope.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
ort.env.logLevel = "error";

class Failure extends Error {
  readonly code: DepthErrorCode;
  constructor(code: DepthErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
const post = (msg: DepthOut, transfer: Transferable[] = []) => scope.postMessage(msg, transfer);
const progress = (id: number, phase: DepthPhase, loaded?: number, total?: number) => post({ type: "progress", id, phase, loaded, total });

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The model's bytes: from the cache, or downloaded once (with progress) and checked. */
async function modelBytes(spec: DepthModel, id: number): Promise<Uint8Array> {
  const cache = await caches.open(CACHE).catch(() => null);
  const hit = await cache?.match(spec.url).catch(() => undefined);
  if (hit) return new Uint8Array(await hit.arrayBuffer());
  let res: Response;
  try {
    res = await fetch(spec.url, { mode: "cors", credentials: "omit" });
  } catch (e) {
    throw new Failure("MODEL_DOWNLOAD", String(e));
  }
  if (!res.ok || !res.body) throw new Failure("MODEL_DOWNLOAD", `HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || spec.bytes;
  const parts: Uint8Array[] = [];
  let loaded = 0, shown = -1;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    const pct = Math.floor((loaded / total) * 100);
    if (pct !== shown) { shown = pct; progress(id, "download", loaded, total); }
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const p of parts) { bytes.set(p, at); at += p.length; }
  if ((await sha256Hex(bytes)) !== spec.sha256) throw new Failure("MODEL_CHECK", "The downloaded model is not the expected file");
  await cache?.put(spec.url, new Response(bytes, { headers: { "content-type": "application/octet-stream" } })).catch(() => undefined);
  return bytes;
}

let ready: { key: string; session: ort.InferenceSession } | null = null;
async function sessionFor(spec: DepthModel, backend: Backend, id: number) {
  const key = `${spec.id}|${backend}`;
  if (ready?.key === key) return ready.session;
  if (ready) { await ready.session.release().catch(() => undefined); ready = null; }
  const bytes = await modelBytes(spec, id);
  progress(id, "prepare");
  try {
    const session = await ort.InferenceSession.create(bytes, { executionProviders: [backend], graphOptimizationLevel: "all" });
    ready = { key, session };
    return session;
  } catch (e) {
    if (backend === "wasm") await caches.open(CACHE).then((c) => c.delete(spec.url)).catch(() => undefined);
    throw new Failure(backend === "webgpu" ? "GPU_FAILED" : "RUN_FAILED", String(e));
  }
}

async function depth(msg: Extract<DepthIn, { type: "depth" }>) {
  const { id, model, backend, bitmap, w, h } = msg;
  const session = await sessionFor(model, backend, id);
  progress(id, "think");
  const size = depthInputSize(bitmap.width, bitmap.height);
  const canvas = new OffscreenCanvas(size.w, size.h);
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Failure("RUN_FAILED", "No 2D canvas in the worker");
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(bitmap, 0, 0, size.w, size.h);
  bitmap.close();
  const input = depthInput(g.getImageData(0, 0, size.w, size.h).data, size.w, size.h);
  let values: Float32Array, ow = size.w, oh = size.h;
  try {
    const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, size.h, size.w]) });
    const t = out[session.outputNames[0]];
    // [1, H, W] (or [H, W]): the last two are its size.
    oh = Number(t.dims[t.dims.length - 2]);
    ow = Number(t.dims[t.dims.length - 1]);
    values = t.data instanceof Float32Array ? t.data : Float32Array.from(t.data as ArrayLike<number>);
    t.dispose?.();
  } catch (e) {
    throw new Failure(backend === "webgpu" ? "GPU_FAILED" : "RUN_FAILED", String(e));
  }
  // Grey at the model's size, then the picture's (smoothly scaled).
  const grey = depthToGrey(values, ow, oh);
  const small = new OffscreenCanvas(ow, oh);
  small.getContext("2d")!.putImageData(new ImageData(grey as Uint8ClampedArray<ArrayBuffer>, ow, oh), 0, 0);
  const big = new OffscreenCanvas(w, h);
  const bg = big.getContext("2d", { willReadFrequently: true })!;
  bg.imageSmoothingEnabled = true;
  bg.imageSmoothingQuality = "high";
  bg.drawImage(small, 0, 0, w, h);
  const px = bg.getImageData(0, 0, w, h).data;
  post({ type: "done", id, grey: px, w, h, backend }, [px.buffer]);
}

async function warm(msg: Extract<DepthIn, { type: "warm" }>) {
  await sessionFor(msg.model, msg.backend, msg.id);
  post({ type: "done", id: msg.id, w: 0, h: 0, backend: msg.backend });
}

let queue = Promise.resolve();
scope.onmessage = (e) => {
  const msg = e.data;
  queue = queue.then(async () => {
    try {
      if (msg.type === "depth") await depth(msg);
      else await warm(msg);
    } catch (err) {
      const f = err instanceof Failure ? err : new Failure("RUN_FAILED", String(err));
      post({ type: "error", id: msg.id, code: f.code, message: f.message });
    }
  });
};
