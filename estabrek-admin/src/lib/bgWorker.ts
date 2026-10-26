/// <reference types="vite/client" />
/**
 * The worker that runs the background model (bgRemove.ts sends it pictures), so the
 * admin stays responsive while it downloads the model, prepares it (several seconds)
 * and cuts. One model is kept ready at a time.
 */
import * as ort from "onnxruntime-web/webgpu";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url";
import { logitsToMask, resizeMask, toModelInput } from "./cutout";
import type { Backend, BgErrorCode, ModelSpec, Phase, WorkerIn, WorkerOut } from "./bgEngine";

/** Where downloaded models are kept (a new name when the files change). */
const CACHE = "bg-remove-models-v1";

type Scope = {
  postMessage: (msg: WorkerOut, transfer?: Transferable[]) => void;
  onmessage: ((e: MessageEvent<WorkerIn>) => void) | null;
  crossOriginIsolated?: boolean;
  location: { href: string };
};
const scope = self as unknown as Scope;

ort.env.wasm.wasmPaths = { wasm: new URL(wasmUrl, scope.location.href).href };
// Several threads only work when the page is cross-origin isolated (the admin isn't).
ort.env.wasm.numThreads = scope.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
ort.env.logLevel = "error";

class Failure extends Error {
  readonly code: BgErrorCode;
  constructor(code: BgErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const post = (msg: WorkerOut, transfer: Transferable[] = []) => scope.postMessage(msg, transfer);
const progress = (id: number, phase: Phase, loaded?: number, total?: number) => post({ type: "progress", id, phase, loaded, total });

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The model's bytes: from the cache, or downloaded once (with progress) and checked. */
async function modelBytes(spec: ModelSpec, id: number): Promise<Uint8Array> {
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
  let loaded = 0;
  let shown = -1;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    const pct = Math.floor((loaded / total) * 100);
    if (pct !== shown) {
      shown = pct;
      progress(id, "download", loaded, total);
    }
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const p of parts) {
    bytes.set(p, at);
    at += p.length;
  }
  if ((await sha256Hex(bytes)) !== spec.sha256) throw new Failure("MODEL_CHECK", "The downloaded model is not the expected file");
  await cache?.put(spec.url, new Response(bytes, { headers: { "content-type": "application/octet-stream" } })).catch(() => undefined);
  return bytes;
}

let ready: { key: string; session: ort.InferenceSession } | null = null;

async function sessionFor(spec: ModelSpec, backend: Backend, id: number) {
  const key = `${spec.id}|${backend}`;
  if (ready?.key === key) return ready.session;
  if (ready) {
    await ready.session.release().catch(() => undefined);
    ready = null;
  }
  const bytes = await modelBytes(spec, id);
  progress(id, "prepare");
  try {
    const session = await ort.InferenceSession.create(bytes, { executionProviders: [backend], graphOptimizationLevel: "all" });
    ready = { key, session };
    return session;
  } catch (e) {
    // A cached file that no longer opens is dropped, so the next try downloads it again.
    if (backend === "wasm") await caches.open(CACHE).then((c) => c.delete(spec.url)).catch(() => undefined);
    throw new Failure(backend === "webgpu" ? "GPU_FAILED" : "RUN_FAILED", String(e));
  }
}

async function cut(msg: Extract<WorkerIn, { type: "cut" }>) {
  const { id, model, backend, bitmap, w, h } = msg;
  const session = await sessionFor(model, backend, id);
  progress(id, "cut");
  const S = model.size;
  const canvas = new OffscreenCanvas(S, S);
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Failure("RUN_FAILED", "No 2D canvas in the worker");
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(bitmap, 0, 0, S, S);
  bitmap.close();
  const input = toModelInput(g.getImageData(0, 0, S, S).data, S);
  let logits: ArrayLike<number>;
  try {
    const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, S, S]) });
    const tensor = out[session.outputNames[0]];
    logits = tensor.data as Float32Array;
    tensor.dispose?.();
  } catch (e) {
    throw new Failure(backend === "webgpu" ? "GPU_FAILED" : "RUN_FAILED", String(e));
  }
  const mask = resizeMask(logitsToMask(logits, S), w, h);
  post({ type: "done", id, mask: mask.data, w, h, backend }, [mask.data.buffer]);
}

async function warm(msg: Extract<WorkerIn, { type: "warm" }>) {
  await sessionFor(msg.model, msg.backend, msg.id);
  post({ type: "done", id: msg.id, w: 0, h: 0, backend: msg.backend });
}

// One job at a time: the model and the graphics memory are shared.
let queue = Promise.resolve();
scope.onmessage = (e) => {
  const msg = e.data;
  queue = queue.then(async () => {
    try {
      if (msg.type === "cut") await cut(msg);
      else await warm(msg);
    } catch (err) {
      const f = err instanceof Failure ? err : new Failure("RUN_FAILED", String(err));
      if (f.code === "GPU_FAILED" && ready) {
        await ready.session.release().catch(() => undefined);
        ready = null;
      }
      post({ type: "error", id: msg.id, code: f.code, message: f.message });
    }
  });
};
