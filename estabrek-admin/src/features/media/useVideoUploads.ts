// The upload queue of the video library: each file goes to Cloudinary in pieces
// (or to the server in one request without Cloudinary), with progress, speed,
// pause and continue. See lib/chunkedUpload.ts.
import { useCallback, useEffect, useRef, useState } from "react";
import * as VideosAPI from "../../api/videos.api";
import type { UploadSignature, Video } from "../../api/videos.api";
import { newUploadId, sendInChunks, xhrPiece, type ChunkedUpload } from "../../lib/chunkedUpload";
import { getApiErrorMessage } from "../../api/http";
import { tr } from "@/lib/words";

export type UploadItem = {
  id: string;
  file: File;
  status: "waiting" | "uploading" | "paused" | "saving" | "done" | "failed";
  sent: number;
  /** Bytes a second, over the last few seconds. */
  speed: number;
  error: string | null;
  video: Video | null;
};

type Running = { controller: AbortController; state: ChunkedUpload; uploadId: string; sign: UploadSignature | null; samples: Array<[number, number]> };

const nameOf = (file: File) => file.name.replace(/\.[^.]+$/, "");

export function useVideoUploads(opts: { provider: "CLOUDINARY" | "LOCAL" | undefined; maxBytes: number; onDone: (v: Video) => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const runs = useRef(new Map<string, Running>());
  const onDone = useRef(opts.onDone);
  onDone.current = opts.onDone;

  const patch = useCallback((id: string, p: Partial<UploadItem>) => setItems((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x))), []);

  const progress = useCallback(
    (id: string, sent: number) => {
      const run = runs.current.get(id);
      const now = performance.now();
      let speed = 0;
      if (run) {
        run.samples.push([now, sent]);
        while (run.samples.length > 2 && now - run.samples[0][0] > 5000) run.samples.shift();
        const [t0, b0] = run.samples[0];
        speed = now > t0 ? ((sent - b0) * 1000) / (now - t0) : 0;
      }
      patch(id, { sent, speed });
    },
    [patch],
  );

  const start = useCallback(
    async (item: UploadItem) => {
      const prev = runs.current.get(item.id);
      const run: Running = { controller: new AbortController(), state: prev?.state ?? { offset: 0, result: null }, uploadId: prev?.uploadId ?? newUploadId(), sign: prev?.sign ?? null, samples: [] };
      runs.current.set(item.id, run);
      patch(item.id, { status: "uploading", error: null });
      try {
        let video: Video;
        if (opts.provider === "LOCAL") {
          video = await VideosAPI.uploadLocalVideo(item.file, { displayName: nameOf(item.file), signal: run.controller.signal, onProgress: (f) => progress(item.id, f * item.file.size) });
        } else {
          // A signature lasts an hour: a new one when less than 10 minutes are left.
          if (!run.sign || Date.parse(run.sign.expiresAt) - Date.now() < 10 * 60_000) run.sign = await VideosAPI.signVideoUpload();
          const sign = run.sign;
          if (item.file.size > sign.maxBytes) throw new Error(tr(`أكبر من الحد (${Math.round(sign.maxBytes / 1024 / 1024)} MB)`, "Bigger than the limit ({0} MB)", [Math.round(sign.maxBytes / 1024 / 1024)]));
          const fields = { api_key: sign.apiKey, timestamp: String(sign.timestamp), signature: sign.signature, folder: sign.folder };
          const result = await sendInChunks({
            file: item.file,
            chunkBytes: sign.chunkBytes,
            state: run.state,
            send: xhrPiece(sign.uploadUrl, fields, run.uploadId, item.file.size),
            signal: run.controller.signal,
            onProgress: (s) => progress(item.id, s),
          });
          if (!result?.public_id) throw new Error("Cloudinary didn't finish the upload");
          patch(item.id, { status: "saving", sent: item.file.size });
          video = await VideosAPI.completeCloudinaryUpload({
            publicId: result.public_id,
            displayName: nameOf(item.file),
            upload: { duration: result.duration, frame_rate: result.frame_rate, video: result.video, audio: result.audio },
          });
        }
        runs.current.delete(item.id);
        patch(item.id, { status: "done", sent: item.file.size, video });
        onDone.current(video);
      } catch (e) {
        const err = e as { name?: string; message?: string; response?: unknown };
        if (err?.name === "AbortError" || err?.name === "CanceledError") {
          patch(item.id, { status: "paused" });
          return;
        }
        patch(item.id, { status: "failed", error: err?.response ? getApiErrorMessage(e) : err?.message ?? String(e) });
      }
    },
    [opts.provider, patch, progress],
  );

  // One upload at a time: the next waiting one starts when nothing is sending.
  useEffect(() => {
    if (!opts.provider) return;
    if (items.some((x) => x.status === "uploading" || x.status === "saving")) return;
    const next = items.find((x) => x.status === "waiting");
    if (next) void start(next);
  }, [items, opts.provider, start]);

  // Leaving the page would stop the uploads.
  useEffect(() => {
    const busy = items.some((x) => x.status === "uploading" || x.status === "saving" || x.status === "waiting");
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [items]);

  const add = useCallback(
    (files: File[]) => {
      const fresh = files.map<UploadItem>((file) => ({
        id: newUploadId(),
        file,
        status: opts.maxBytes && file.size > opts.maxBytes ? "failed" : "waiting",
        sent: 0,
        speed: 0,
        error: opts.maxBytes && file.size > opts.maxBytes ? tr(`أكبر من الحد (${Math.round(opts.maxBytes / 1024 / 1024)} MB)`, "Bigger than the limit ({0} MB)", [Math.round(opts.maxBytes / 1024 / 1024)]) : null,
        video: null,
      }));
      setItems((list) => [...list, ...fresh]);
    },
    [opts.maxBytes],
  );

  const pause = useCallback((id: string) => runs.current.get(id)?.controller.abort(), []);
  /** Continue a paused or failed upload (Cloudinary: from the piece it stopped at). */
  const resume = useCallback((id: string) => patch(id, { status: "waiting", error: null }), [patch]);
  const remove = useCallback((id: string) => {
    runs.current.get(id)?.controller.abort();
    runs.current.delete(id);
    setItems((list) => list.filter((x) => x.id !== id));
  }, []);
  const clearDone = useCallback(() => setItems((list) => list.filter((x) => x.status !== "done")), []);

  return { items, add, pause, resume, remove, clearDone };
}
