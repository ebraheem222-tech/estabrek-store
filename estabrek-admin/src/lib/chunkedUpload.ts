/**
 * Sends a big file to Cloudinary in pieces, straight from the browser (it never
 * passes through our server). Every piece carries the same upload id and its
 * byte range; Cloudinary puts them together and answers the last one with the
 * finished video. A piece that fails is sent again (up to 5 times, waiting a
 * little longer each time); a paused or broken upload continues from the piece
 * it stopped at.
 */

export type ChunkRange = { start: number; end: number };

/** Pieces of `chunkBytes` (Cloudinary wants at least 5 MB each, except the last). */
export function planChunks(size: number, chunkBytes: number): ChunkRange[] {
  const step = Math.max(5 * 1024 * 1024, chunkBytes);
  const out: ChunkRange[] = [];
  for (let start = 0; start < size; start += step) out.push({ start, end: Math.min(size, start + step) });
  if (!out.length) out.push({ start: 0, end: 0 });
  return out;
}

export const contentRange = (r: ChunkRange, size: number) => `bytes ${r.start}-${Math.max(r.start, r.end - 1)}/${size}`;

/** What Cloudinary answers a piece (the last one: the finished video). */
export type CloudinaryAnswer = {
  public_id?: string;
  duration?: number;
  frame_rate?: number;
  video?: unknown;
  audio?: unknown;
  error?: { message?: string };
  [key: string]: unknown;
} | null;

export type SendPiece = (piece: Blob, range: ChunkRange, onProgress: (loaded: number) => void, signal: AbortSignal) => Promise<{ status: number; body: CloudinaryAnswer }>;

export type ChunkedUpload = {
  /** Where the next piece starts (keep it to continue later). */
  offset: number;
  result: CloudinaryAnswer;
};

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/** Sends the pieces from `state.offset`. Resolves with Cloudinary's answer to the last piece. */
export async function sendInChunks(opts: {
  file: Blob;
  chunkBytes: number;
  state: ChunkedUpload;
  send: SendPiece;
  signal: AbortSignal;
  onProgress?: (sent: number, total: number) => void;
  retries?: number;
  backoffMs?: number;
}) {
  const { file, state, send, signal } = opts;
  const retries = opts.retries ?? 5;
  const backoff = opts.backoffMs ?? 1000;
  for (const range of planChunks(file.size, opts.chunkBytes)) {
    if (range.end <= state.offset) continue;
    for (let attempt = 0; ; attempt++) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      try {
        const res = await send(file.slice(range.start, range.end), range, (loaded) => opts.onProgress?.(range.start + loaded, file.size), signal);
        if (res.status >= 200 && res.status < 300) {
          state.offset = range.end;
          if (res.body && typeof res.body === "object" && res.body.public_id) state.result = res.body;
          opts.onProgress?.(range.end, file.size);
          break;
        }
        const message = res.body?.error?.message || `Cloudinary answered ${res.status}`;
        // 4xx (except a timeout or too-many) won't get better by trying again.
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) throw Object.assign(new Error(message), { final: true });
        throw new Error(message);
      } catch (e) {
        const err = e as { name?: string; final?: boolean };
        if (err?.name === "AbortError" || err?.final || attempt >= retries) throw e;
        await wait(backoff * 2 ** attempt, signal);
      }
    }
  }
  return state.result;
}

/** One piece over XMLHttpRequest (fetch can't report upload progress). */
export function xhrPiece(url: string, fields: Record<string, string>, uploadId: string, totalSize: number): SendPiece {
  return (piece, range, onProgress, signal) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("X-Unique-Upload-Id", uploadId);
      xhr.setRequestHeader("Content-Range", contentRange(range, totalSize));
      xhr.upload.onprogress = (e) => onProgress(e.loaded);
      xhr.onload = () => {
        let body: CloudinaryAnswer = null;
        try {
          body = JSON.parse(xhr.responseText || "null") as CloudinaryAnswer;
        } catch {
          body = null;
        }
        resolve({ status: xhr.status, body });
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new Error("Timed out"));
      const abort = () => {
        xhr.abort();
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal.aborted) return abort();
      signal.addEventListener("abort", abort, { once: true });
      const form = new FormData();
      for (const [k, v] of Object.entries(fields)) form.append(k, v);
      form.append("file", piece);
      xhr.send(form);
    });
}

export function newUploadId() {
  const c = globalThis.crypto as Crypto | undefined;
  return c?.randomUUID ? c.randomUUID().replace(/-/g, "") : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}
