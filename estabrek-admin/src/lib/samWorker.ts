/// <reference types="vite/client" />
/**
 * The worker that runs «قصّ بكبسة»'s model (samEngine.ts): it downloads its two parts once (kept in the browser's
 * cache, checked against their SHA-256), reads a picture once (its embeddings stay here), then answers each click
 * with three low masks and how sure it is of each. The admin stays responsive meanwhile.
 */
import * as ort from "onnxruntime-web/webgpu";
import { SAM_MODELS, SAM_SIDE, samInput, samInputSize, type SamErrorCode, type SamIn, type SamModel, type SamOut, type SamPhase } from "./samEngine";

const CACHE = "sam-models-v1";
type Scope = { postMessage: (msg: SamOut, transfer?: Transferable[]) => void; onmessage: ((e: MessageEvent<SamIn>) => void) | null; crossOriginIsolated?: boolean };
const scope = self as unknown as Scope;

// The same runtime as the other models' workers (one download for all): its own file from jsDelivr.
const ORT_VERSION = ort.env.versions.web ?? ort.env.versions.common;
ort.env.wasm.wasmPaths = { wasm: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort-wasm-simd-threaded.asyncify.wasm` };
ort.env.wasm.numThreads = scope.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
ort.env.logLevel = "error";

class Failure extends Error {
  readonly code: SamErrorCode;
  constructor(code: SamErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
const post = (msg: SamOut, transfer: Transferable[] = []) => scope.postMessage(msg, transfer);
const progress = (id: number, phase: SamPhase, loaded?: number, total?: number) => post({ type: "progress", id, phase, loaded, total });

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A part's bytes: from the cache, or downloaded once (its progress counted with what came before) and checked. */
async function modelBytes(spec: SamModel, id: number, before: number, total: number): Promise<Uint8Array> {
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
  const parts: Uint8Array[] = [];
  let loaded = 0, shown = -1;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    const pct = Math.floor(((before + loaded) / total) * 100);
    if (pct !== shown) { shown = pct; progress(id, "download", before + loaded, total); }
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const p of parts) { bytes.set(p, at); at += p.length; }
  if ((await sha256Hex(bytes)) !== spec.sha256) throw new Failure("MODEL_CHECK", "The downloaded model is not the expected file");
  await cache?.put(spec.url, new Response(bytes, { headers: { "content-type": "application/octet-stream" } })).catch(() => undefined);
  return bytes;
}

let sessions: { encoder: ort.InferenceSession; decoder: ort.InferenceSession } | null = null;
async function ready(id: number) {
  if (sessions) return sessions;
  const total = SAM_MODELS.encoder.bytes + SAM_MODELS.decoder.bytes;
  const enc = await modelBytes(SAM_MODELS.encoder, id, 0, total);
  const dec = await modelBytes(SAM_MODELS.decoder, id, SAM_MODELS.encoder.bytes, total);
  progress(id, "prepare");
  try {
    const opts = { executionProviders: ["wasm"], graphOptimizationLevel: "all" } as const;
    sessions = { encoder: await ort.InferenceSession.create(enc, opts), decoder: await ort.InferenceSession.create(dec, opts) };
    return sessions;
  } catch (e) {
    await caches.open(CACHE).then((c) => Promise.all([c.delete(SAM_MODELS.encoder.url), c.delete(SAM_MODELS.decoder.url)])).catch(() => undefined);
    throw new Failure("RUN_FAILED", String(e));
  }
}

// The picture read last: its embeddings, for its clicks.
let read: { embeddings: ort.Tensor; positional: ort.Tensor } | null = null;

async function readPicture(msg: Extract<SamIn, { type: "read" }>) {
  const { encoder } = await ready(msg.id);
  progress(msg.id, "read");
  const size = samInputSize(msg.bitmap.width, msg.bitmap.height);
  const canvas = new OffscreenCanvas(size.w, size.h);
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Failure("RUN_FAILED", "No 2D canvas in the worker");
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(msg.bitmap, 0, 0, size.w, size.h);
  msg.bitmap.close();
  const input = samInput(g.getImageData(0, 0, size.w, size.h).data, size.w, size.h);
  try {
    read?.embeddings.dispose?.();
    read?.positional.dispose?.();
    read = null;
    const out = await encoder.run({ pixel_values: new ort.Tensor("float32", input, [1, 3, SAM_SIDE, SAM_SIDE]) });
    read = { embeddings: out.image_embeddings, positional: out.image_positional_embeddings };
  } catch (e) {
    throw new Failure("RUN_FAILED", String(e));
  }
  post({ type: "read", id: msg.id, rw: size.w, rh: size.h, k: size.k });
}

async function pick(msg: Extract<SamIn, { type: "pick" }>) {
  const { decoder } = await ready(msg.id);
  if (!read) throw new Failure("RUN_FAILED", "No picture was read");
  const n = msg.labels.length;
  try {
    const out = await decoder.run({
      input_points: new ort.Tensor("float32", msg.coords, [1, 1, n, 2]),
      input_labels: new ort.Tensor("int64", msg.labels, [1, 1, n]),
      image_embeddings: read.embeddings,
      image_positional_embeddings: read.positional,
    });
    const pred = Float32Array.from(out.pred_masks.data as ArrayLike<number>), iou = Float32Array.from(out.iou_scores.data as ArrayLike<number>);
    post({ type: "picked", id: msg.id, pred, iou }, [pred.buffer, iou.buffer]);
  } catch (e) {
    throw new Failure("RUN_FAILED", String(e));
  }
}

let queue = Promise.resolve();
scope.onmessage = (e) => {
  const msg = e.data;
  queue = queue.then(async () => {
    try {
      if (msg.type === "read") await readPicture(msg);
      else await pick(msg);
    } catch (err) {
      const f = err instanceof Failure ? err : new Failure("RUN_FAILED", String(err));
      post({ type: "error", id: msg.id, code: f.code, message: f.message });
    }
  });
};
