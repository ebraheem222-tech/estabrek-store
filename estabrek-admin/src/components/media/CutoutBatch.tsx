// «شيل الخلفية» for many pictures at once (all of a product's photos, or the ones chosen
// in the media library): one after the other, same engine and background, each saved as
// a new picture. No brush here: a picture that needs fixing is opened on its own.
import React, { useEffect, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";
import type { MediaImage } from "../../api/uploads.api";
import { removeBackground, type BgProgress } from "../../lib/bgRemove";
import type { EngineId } from "../../lib/bgEngine";
import type { Background } from "../../lib/cutout";
import { BackgroundPicker, EnginePicker } from "./CutoutEditor";
import { readCutoutPrefs, saveCutout, saveCutoutPrefs, startEngine, useFreeEngine, type CutoutTarget } from "./cutoutShared";
import { cutoutErrorText, firstDownloadText, planText, progressText, useCloudCutout } from "./cutoutText";
import { tr } from "@/lib/words";

export type BatchTarget = CutoutTarget & { key: string };

type ItemState = { kind: "waiting" } | { kind: "working" } | { kind: "done" } | { kind: "error"; message: string };

type Props = {
  open: boolean;
  targets: BatchTarget[];
  onClose: () => void;
  /** Each new picture as soon as it is saved. */
  onSaved?: (key: string, picture: MediaImage, how: { replace: boolean }) => void;
  /** Offer "instead of the originals" (a product's photos; the originals stay in the library). */
  canReplace?: boolean;
};

export function CutoutBatch({ open, targets: given, onClose, onSaved, canReplace }: Props) {
  const cloud = useCloudCutout();
  const free = useFreeEngine(open);
  const [engine, setEngine] = useState<EngineId>("browser");
  const [background, setBackground] = useState<Background>(() => readCutoutPrefs().background);
  const [replace, setReplace] = useState(false);
  // The pictures as they were when this opened: new cut-outs joining the product don't join the list.
  const [targets, setTargets] = useState<BatchTarget[]>([]);
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<BgProgress | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setEngine(startEngine(cloud));
    setTargets(given);
    setStates(Object.fromEntries(given.map((t) => [t.key, { kind: "waiting" } as ItemState])));
    setProgress(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const done = targets.filter((t) => states[t.key]?.kind === "done").length;
  const failed = targets.filter((t) => states[t.key]?.kind === "error").length;
  const left = targets.filter((t) => (states[t.key]?.kind ?? "waiting") !== "done");

  const start = async () => {
    const ctl = new AbortController();
    abort.current = ctl;
    setRunning(true);
    for (const t of left) {
      if (ctl.signal.aborted) break;
      setStates((s) => ({ ...s, [t.key]: { kind: "working" } }));
      setProgress(null);
      try {
        const cut = await removeBackground(t.url, { engine, maxSide: 2560, signal: ctl.signal, onProgress: setProgress });
        if (engine === "browser") free.markSaved();
        const picture = await saveCutout(cut, background, t);
        setStates((s) => ({ ...s, [t.key]: { kind: "done" } }));
        onSaved?.(t.key, picture, { replace });
      } catch (e) {
        if (ctl.signal.aborted) {
          setStates((s) => ({ ...s, [t.key]: { kind: "waiting" } }));
          break;
        }
        setStates((s) => ({ ...s, [t.key]: { kind: "error", message: cutoutErrorText(e) } }));
      }
    }
    setRunning(false);
    setProgress(null);
    abort.current = null;
  };

  const stop = () => abort.current?.abort();
  const close = () => {
    stop();
    onClose();
  };

  const needsDownload = engine === "browser" && free.saved === false && free.plan;

  return (
    <Modal
      open={open}
      onClose={close}
      title={tr("شيل الخلفية عن كل الصور", "Remove the background from all the pictures")}
      widthClassName="max-w-3xl"
      disableBackdropClose
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="me-auto text-xs text-white/60" role="status" data-testid="cutout-batch-count">
            {tr(`خلص ${done} من ${targets.length}`, "{0} of {1} done", [done, targets.length])}
            {failed ? tr(` · ما زبطت ${failed}`, " · {0} didn't work", [failed]) : ""}
          </span>
          {running ? (
            <Button variant="secondary" onClick={stop}>
              {tr("إيقاف", "Stop")}
            </Button>
          ) : null}
          {left.length ? (
            <Button variant="primary" onClick={() => void start()} disabled={running} isLoading={running} data-testid="cutout-batch-start">
              {done || failed ? tr("تكميل الباقي", "Do the rest") : tr("شيل الخلفيات", "Remove the backgrounds")}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4 text-sm" data-testid="cutout-batch">
        {cloud?.on ? (
          <section className="space-y-2">
            <div className="font-medium">{tr("المحرّك", "Engine")}</div>
            <EnginePicker
              value={engine}
              cloud={cloud}
              disabled={running}
              onChange={(v) => {
                setEngine(v);
                saveCutoutPrefs({ engine: v });
              }}
            />
            {engine === "cloudinary" ? (
              <p className="text-xs text-white/50">
                {tr(`كل صورة بتنحسب ${cloud.transformations} تحويلة من باقة Cloudinary (${targets.length} صور = ${targets.length * cloud.transformations}).`, "Each picture counts as {0} transformations of the Cloudinary plan ({1} pictures = {2}).", [cloud.transformations, targets.length, targets.length * cloud.transformations])}
              </p>
            ) : null}
          </section>
        ) : null}
        {engine === "browser" ? <p className="text-xs text-white/50">{planText(free.plan)}</p> : null}
        {needsDownload ? <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70">{firstDownloadText(free.plan!)}</p> : null}

        <section className="space-y-2">
          <div className="font-medium">{tr("الخلفية", "Background")}</div>
          <BackgroundPicker
            value={background}
            onChange={(v) => {
              setBackground(v);
              saveCutoutPrefs({ background: v });
            }}
          />
        </section>

        {canReplace ? (
          <section className="space-y-2">
            <div className="font-medium">{tr("الصور الجديدة", "The new pictures")}</div>
            <div className="grid gap-1 rounded-xl bg-white/5 p-1 sm:grid-cols-2" role="radiogroup">
              {(
                [
                  [false, tr("جنب الأصلية", "Next to the originals")],
                  [true, tr("بدل الأصلية بالمنتج", "Instead of the originals in the product")],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={replace === v}
                  disabled={running}
                  onClick={() => setReplace(v)}
                  className={cn("rounded-lg px-3 py-1.5 transition", replace === v ? "bg-white/10 font-medium text-white" : "text-white/60 hover:bg-white/5")}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/50">{tr("بالحالتين الأصلية بتضل بمكتبة الوسائط.", "Either way the originals stay in the media library.")}</p>
          </section>
        ) : null}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {targets.map((t) => {
            const st = states[t.key] ?? { kind: "waiting" };
            return (
              <div key={t.key} className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20" data-testid="cutout-batch-item" data-state={st.kind} title={st.kind === "error" ? st.message : undefined}>
                <img src={t.url} alt="" className={cn("h-full w-full object-cover", st.kind === "done" && "opacity-60")} />
                {st.kind === "working" ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/50 p-1 text-center text-[10px] text-white">
                    <span>
                      <span className="mx-auto mb-1 block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {progress?.phase === "download" && progress.total ? `${Math.round(((progress.loaded ?? 0) / progress.total) * 100)}%` : ""}
                    </span>
                  </div>
                ) : st.kind === "done" ? (
                  <span className="absolute end-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-xs text-white">✓</span>
                ) : st.kind === "error" ? (
                  <span className="absolute inset-x-0 bottom-0 bg-rose-950/80 p-1 text-[10px] leading-4 text-rose-100">{st.message}</span>
                ) : null}
              </div>
            );
          })}
        </div>
        {running && progress ? <p className="text-xs text-white/60">{progressText(progress)}</p> : null}
      </div>
    </Modal>
  );
}
