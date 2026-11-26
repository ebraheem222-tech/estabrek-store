/**
 * «قصّ بكبسة»: pickSession(picture) reads a picture once with the model on this device (samWorker.ts; which model:
 * samEngine.ts), free and without any key; then each pick(clicks) gives the mask of the thing clicked (keep these
 * places, leave those out) at the picture's own size, in a tenth of a second. One picture at a time.
 */
import { SAM_BYTES, SamError, bestMask, samMask, samPrompt, type SamIn, type SamOut, type SamPhase, type SamPoint } from "./samEngine";

export { SamError, SAM_BYTES, type SamPoint } from "./samEngine";
export type SamProgress = { phase: SamPhase; loaded?: number; total?: number };
export type PickSession = {
  /** The mask (0 … 255, `w` × `h`) of what the clicks (in the picture's own pixels) point at; how sure the model is. */
  pick: (points: SamPoint[], w: number, h: number) => Promise<{ mask: Uint8ClampedArray; score: number }>;
};

let worker: Worker | null = null;
let nextId = 1;
type Done = Extract<SamOut, { type: "read" | "picked" }>;
const waiting = new Map<number, { ok: (m: Done) => void; no: (e: SamError) => void; onProgress?: (p: SamProgress) => void }>();
function getWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") throw new SamError("NO_WORKER", "This browser can't run the model");
  worker = new Worker(new URL("./samWorker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<SamOut>) => {
    const msg = e.data, job = waiting.get(msg.id);
    if (!job) return;
    if (msg.type === "progress") job.onProgress?.({ phase: msg.phase, loaded: msg.loaded, total: msg.total });
    else {
      waiting.delete(msg.id);
      if (msg.type === "error") job.no(new SamError(msg.code, msg.message));
      else job.ok(msg);
    }
  };
  worker.onerror = (e) => {
    for (const job of waiting.values()) job.no(new SamError("NO_WORKER", e.message || "The worker stopped"));
    waiting.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}
type Job = SamIn extends infer T ? (T extends unknown ? Omit<T, "id"> : never) : never;
function ask(msg: Job, transfer: Transferable[], onProgress?: (p: SamProgress) => void, signal?: AbortSignal) {
  const w = getWorker(), id = nextId++;
  return new Promise<Done>((ok, no) => {
    if (signal?.aborted) return no(new SamError("ABORTED"));
    const stop = () => {
      worker?.terminate();
      worker = null;
      for (const j of waiting.values()) j.no(new SamError("ABORTED"));
      waiting.clear();
    };
    signal?.addEventListener("abort", stop, { once: true });
    waiting.set(id, { ok: (m) => { signal?.removeEventListener("abort", stop); ok(m); }, no: (e) => { signal?.removeEventListener("abort", stop); no(e); }, onProgress });
    w.postMessage({ ...msg, id } as SamIn, transfer);
  });
}

async function bitmapOf(source: string | Blob | ImageData): Promise<ImageBitmap> {
  try {
    if (source instanceof ImageData) return await createImageBitmap(source);
    const blob = typeof source === "string" ? await (await fetch(source, { mode: "cors", credentials: "omit" })).blob() : source;
    return await createImageBitmap(blob);
  } catch (e) {
    throw new SamError("IMAGE_LOAD", String(e));
  }
}

/** Reads the picture with the model (downloading it the first time). Throws SamError (its `code` says why). */
export async function pickSession(source: string | Blob | ImageData, opts: { onProgress?: (p: SamProgress) => void; signal?: AbortSignal } = {}): Promise<PickSession> {
  const bitmap = await bitmapOf(source);
  const read = (await ask({ type: "read", bitmap }, [bitmap], opts.onProgress, opts.signal)) as Extract<SamOut, { type: "read" }>;
  return {
    pick: async (points, w, h) => {
      if (!points.length) return { mask: new Uint8ClampedArray(w * h), score: 0 };
      // The clicks in the model's pixels (the picture was read at rw × rh of its 1024²).
      const { coords, labels } = samPrompt(points.map((p) => ({ ...p, x: (p.x * read.rw) / w, y: (p.y * read.rh) / h })), 1);
      const got = (await ask({ type: "pick", coords, labels }, [coords.buffer, labels.buffer])) as Extract<SamOut, { type: "picked" }>;
      const which = bestMask(got.iou);
      return { mask: samMask(got.pred, which, read.rw, read.rh, w, h), score: got.iou[which] };
    },
  };
}
