// «شيل الخلفية» for one picture: the cut is made (free on this device, or by Cloudinary
// when switched on), fixed up with a brush (keep / erase, size, soft edge, undo), laid on
// transparency, white or a colour, and saved as a NEW picture. The original never changes.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";
import { toast } from "../../lib/toast";
import { getApiErrorMessage } from "../../api/http";
import type { MediaImage } from "../../api/uploads.api";
import { removeBackground, type BgProgress, type Cutout } from "../../lib/bgRemove";
import type { CloudState, EngineId } from "../../lib/bgEngine";
import { MaskHistory, applyMask, dab, stroke, unionRect, type Background, type Brush, type BrushMode, type Rect } from "../../lib/cutout";
import { cutoutErrorText, firstDownloadText, planText, progressText, useCloudCutout } from "./cutoutText";
import { CHECKER, readCutoutPrefs, saveCutout, saveCutoutPrefs, startEngine, useFreeEngine, type CutoutTarget } from "./cutoutShared";
import { tr } from "@/lib/words";

const backgroundCss = (bg: Background) => (bg === "transparent" ? CHECKER : bg);

export function EnginePicker({ value, onChange, cloud, disabled }: { value: EngineId; onChange: (v: EngineId) => void; cloud: CloudState | null; disabled?: boolean }) {
  if (!cloud?.on) return null;
  const options: Array<{ id: EngineId; label: string; usable: boolean }> = [
    { id: "browser", label: tr("مجاني (على هالجهاز)", "Free (on this device)"), usable: true },
    { id: "cloudinary", label: tr("Cloudinary (مدفوع)", "Cloudinary (paid)"), usable: cloud.ready },
  ];
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1" role="radiogroup" aria-label={tr("المحرّك", "Engine")}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={disabled || !o.usable}
          title={o.usable ? undefined : tr("المتجر ما عنده حساب Cloudinary", "The store has no Cloudinary account")}
          onClick={() => onChange(o.id)}
          className={cn("flex-1 rounded-lg px-3 py-1.5 text-sm transition disabled:opacity-50", value === o.id ? "bg-white/10 font-medium text-white" : "text-white/60 hover:bg-white/5")}
          data-testid={`cutout-engine-${o.id}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function BackgroundPicker({ value, onChange }: { value: Background; onChange: (v: Background) => void }) {
  const isColour = value !== "transparent" && value.toLowerCase() !== "#ffffff";
  const chip = (active: boolean) => cn("inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm transition", active ? "border-accent-400/70 bg-white/10 text-white" : "border-white/10 text-white/70 hover:bg-white/5");
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr("الخلفية", "Background")}>
      <button type="button" role="radio" aria-checked={value === "transparent"} onClick={() => onChange("transparent")} className={chip(value === "transparent")} data-testid="cutout-bg-transparent">
        <span className="h-4 w-4 rounded border border-white/20" style={{ background: CHECKER, backgroundSize: "8px 8px" }} />
        {tr("شفافة", "Transparent")}
      </button>
      <button type="button" role="radio" aria-checked={value.toLowerCase() === "#ffffff"} onClick={() => onChange("#ffffff")} className={chip(value.toLowerCase() === "#ffffff")} data-testid="cutout-bg-white">
        <span className="h-4 w-4 rounded border border-white/20" style={{ background: "#ffffff" }} />
        {tr("بيضا", "White")}
      </button>
      <label className={cn(chip(isColour), "relative cursor-pointer")} title={tr("لون", "Colour")}>
        <span className="h-4 w-4 rounded border border-white/20" style={{ background: isColour ? value : "linear-gradient(135deg,#f9a8d4,#93c5fd)" }} />
        {tr("لون", "Colour")}
        <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={isColour ? value : "#f4e7ec"} onChange={(e) => onChange(e.target.value)} aria-label={tr("لون الخلفية", "Background colour")} data-testid="cutout-bg-colour" />
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ the editor */

type Status = { kind: "idle" } | { kind: "ask" } | { kind: "working"; progress: BgProgress | null } | { kind: "ready" } | { kind: "error"; message: string };

type Props = {
  open: boolean;
  target: CutoutTarget | null;
  onClose: () => void;
  /** The new picture; `replace` when it should take the original's place (a product's photos). */
  onSaved?: (picture: MediaImage, how: { replace: boolean }) => void;
  /** Offer "use it instead of the original" (the original stays in the media library). */
  canReplace?: boolean;
};

const GHOST = 0.22;
const EDIT_MAX_SIDE = 2560;

export function CutoutEditor({ open, target, onClose, onSaved, canReplace }: Props) {
  const cloud = useCloudCutout();
  const free = useFreeEngine(open);
  const [engine, setEngine] = useState<EngineId>("browser");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [background, setBackground] = useState<Background>(() => readCutoutPrefs().background);
  const [mode, setMode] = useState<BrushMode>("erase");
  const [brushPx, setBrushPx] = useState(() => readCutoutPrefs().brush);
  const [softness, setSoftness] = useState(() => readCutoutPrefs().softness);
  const [ghost, setGhost] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [, setVersion] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const cutRef = useRef<Cutout | null>(null);
  const modelMask = useRef<Uint8ClampedArray | null>(null);
  const history = useRef<MaskHistory | null>(null);
  const out = useRef<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const abort = useRef<AbortController | null>(null);
  const drawing = useRef<{ last: [number, number]; rect: Rect | null } | null>(null);
  const ghostRef = useRef(ghost);
  ghostRef.current = ghost;

  const cut = cutRef.current;
  const busy = status.kind === "working";

  /* ---------------- drawing */
  const redraw = useCallback((rect?: Rect | null) => {
    const c = cutRef.current;
    const canvas = canvasRef.current;
    if (!c || !canvas || !out.current) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    const full = { x0: 0, y0: 0, x1: c.width, y1: c.height };
    const r = rect ?? full;
    applyMask({ w: c.width, h: c.height, data: c.image.data }, { w: c.width, h: c.height, data: c.mask }, out.current.data, r, ghostRef.current ? GHOST : 0);
    g.putImageData(out.current, 0, 0, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  }, []);

  const showOriginal = (on: boolean) => {
    const c = cutRef.current;
    const g = canvasRef.current?.getContext("2d");
    if (!c || !g) return;
    if (on) g.putImageData(c.image, 0, 0);
    else redraw();
  };

  useEffect(() => {
    if (status.kind === "ready") redraw();
  }, [ghost, status.kind, redraw]);

  /* ---------------- the cut */
  const run = useCallback(
    async (which: EngineId) => {
      if (!target) return;
      abort.current?.abort();
      const ctl = new AbortController();
      abort.current = ctl;
      setStatus({ kind: "working", progress: null });
      try {
        const c = await removeBackground(target.url, {
          engine: which,
          maxSide: EDIT_MAX_SIDE,
          signal: ctl.signal,
          onProgress: (p) => setStatus({ kind: "working", progress: p }),
        });
        if (ctl.signal.aborted) return;
        if (which === "browser") free.markSaved();
        cutRef.current = c;
        modelMask.current = c.mask.slice();
        history.current = new MaskHistory({ w: c.width, h: c.height, data: c.mask });
        out.current = new ImageData(c.width, c.height);
        setZoom(1);
        setStatus({ kind: "ready" });
        setVersion((v) => v + 1);
      } catch (e) {
        if (ctl.signal.aborted) return;
        setStatus({ kind: "error", message: cutoutErrorText(e) });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target],
  );

  // A new picture: start again (the first download of the model waits for a yes).
  useEffect(() => {
    if (!open || !target) return;
    cutRef.current = null;
    history.current = null;
    const which = startEngine(cloud);
    setEngine(which);
    setStatus({ kind: "idle" });
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.url]);

  useEffect(() => {
    if (!open || !target || status.kind !== "idle") return;
    if (engine === "cloudinary") void run("cloudinary");
    else if (free.saved === true) void run("browser");
    else if (free.saved === false) setStatus({ kind: "ask" });
  }, [open, target, status.kind, engine, free.saved, run]);

  const pickEngine = (v: EngineId) => {
    setEngine(v);
    saveCutoutPrefs({ engine: v });
    cutRef.current = null;
    setStatus({ kind: "idle" });
  };

  /* ---------------- the canvas's size */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [open, status.kind]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const c = cutRef.current;
    if (!canvas || !c || status.kind !== "ready") return;
    if (canvas.width !== c.width || canvas.height !== c.height) {
      canvas.width = c.width;
      canvas.height = c.height;
    }
    redraw();
  }, [status.kind, redraw]);

  const fit = cut && box.w && box.h ? Math.min((box.w - 16) / cut.width, (box.h - 16) / cut.height) : 0;
  const shownW = cut ? Math.max(1, Math.round(cut.width * fit * zoom)) : 0;

  /* ---------------- the brush */
  const brushFor = (canvas: HTMLCanvasElement): Brush => {
    const r = canvas.getBoundingClientRect();
    return { mode, radius: (brushPx / 2) * (canvas.width / Math.max(1, r.width)), softness };
  };
  const toImage = (canvas: HTMLCanvasElement, e: React.PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) * canvas.width) / r.width, ((e.clientY - r.top) * canvas.height) / r.height];
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const c = cutRef.current;
    if (!c || !history.current || e.button > 0) return;
    canvas.setPointerCapture(e.pointerId);
    history.current.begin();
    const p = toImage(canvas, e);
    const rect = dab({ w: c.width, h: c.height, data: c.mask }, p[0], p[1], brushFor(canvas));
    drawing.current = { last: p, rect };
    redraw(rect);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const r = canvas.getBoundingClientRect();
    setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
    const c = cutRef.current;
    const d = drawing.current;
    if (!c || !d) return;
    const p = toImage(canvas, e);
    const rect = stroke({ w: c.width, h: c.height, data: c.mask }, d.last, p, brushFor(canvas));
    d.last = p;
    d.rect = unionRect(d.rect, rect);
    redraw(rect);
  };

  const endStroke = () => {
    const d = drawing.current;
    drawing.current = null;
    if (!d || !history.current) return;
    history.current.commit(d.rect);
    setVersion((v) => v + 1);
  };

  const undo = useCallback(() => {
    const rect = history.current?.undo();
    if (rect) redraw(rect);
    setVersion((v) => v + 1);
  }, [redraw]);
  const redo = useCallback(() => {
    const rect = history.current?.redo();
    if (rect) redraw(rect);
    setVersion((v) => v + 1);
  }, [redraw]);
  const backToModel = () => {
    if (!history.current || !modelMask.current) return;
    history.current.replace(modelMask.current);
    redraw();
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    if (!open || status.kind !== "ready") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && k === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "[") setBrushPx((v) => Math.max(4, v - 6));
      else if (e.key === "]") setBrushPx((v) => Math.min(160, v + 6));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, status.kind, undo, redo]);

  /* ---------------- saving */
  const close = () => {
    abort.current?.abort();
    onClose();
  };

  const save = async (replace: boolean) => {
    const c = cutRef.current;
    if (!c || !target) return;
    setSaving(true);
    try {
      const picture = await saveCutout(c, background, target);
      toast.success(tr("انحفظت صورة جديدة بدون خلفية — الأصلية ضلّت متل ما هي", "A new picture without the background was saved — the original stays as it was"));
      onSaved?.(picture, { replace });
      onClose();
    } catch (e) {
      toast.error(tr("ما انحفظت الصورة", "The picture wasn't saved"), { description: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const changeBackground = (v: Background) => {
    setBackground(v);
    saveCutoutPrefs({ background: v });
  };

  const h = history.current;
  const sizeLabel = tr(`حجم الفرشاة ${brushPx}`, "Brush size {0}", [brushPx]);

  return (
    <Modal
      open={open}
      onClose={close}
      title={tr("شيل الخلفية", "Remove background")}
      widthClassName="max-w-6xl"
      disableBackdropClose
      closeText={tr("إلغاء", "Cancel")}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="me-auto text-xs text-white/50">{tr("بتنحفظ صورة جديدة بالمكتبة، والأصلية بتضل متل ما هي.", "A new picture is saved in the library; the original stays as it is.")}</span>
          {canReplace ? (
            <Button variant="secondary" onClick={() => void save(true)} disabled={status.kind !== "ready"} isLoading={saving} data-testid="cutout-save-replace">
              {tr("حفظ وتبديلها بالمنتج", "Save and use it in the product")}
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => void save(false)} disabled={status.kind !== "ready"} isLoading={saving} data-testid="cutout-save">
            {canReplace ? tr("حفظ كصورة جديدة جنبها", "Save as a new picture next to it") : tr("حفظ كصورة جديدة", "Save as a new picture")}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]" data-testid="cutout-editor">
        <div className="min-w-0 space-y-2">
          <div
            ref={boxRef}
            className="relative flex h-[56vh] min-h-[280px] items-center justify-center overflow-auto rounded-2xl border border-white/10 bg-black/30"
          >
            {status.kind === "ready" && cut ? (
              <div className="relative m-auto shrink-0" style={{ width: shownW, background: backgroundCss(background) }}>
                <canvas
                  ref={canvasRef}
                  className="block h-auto w-full touch-none"
                  style={{ cursor: "none" }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endStroke}
                  onPointerCancel={endStroke}
                  onPointerLeave={() => setCursor(null)}
                  data-testid="cutout-canvas"
                  aria-label={tr("الصورة: الفرشاة بترجّع أو بتمسح", "The picture: the brush keeps or erases")}
                />
                {cursor ? (
                  <span
                    aria-hidden
                    className={cn("pointer-events-none absolute rounded-full border-2", mode === "keep" ? "border-emerald-400" : "border-rose-400")}
                    style={{ width: brushPx, height: brushPx, left: cursor.x - brushPx / 2, top: cursor.y - brushPx / 2, boxShadow: "0 0 0 1px rgba(0,0,0,.45)" }}
                  />
                ) : null}
              </div>
            ) : (
              <div className="max-w-md p-6 text-center text-sm text-white/80">
                {target ? <img src={target.url} alt="" className="mx-auto mb-4 max-h-48 rounded-xl object-contain opacity-60" /> : null}
                {status.kind === "working" ? (
                  <div className="space-y-3" role="status" data-testid="cutout-working">
                    <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <div>{progressText(status.progress)}</div>
                    {status.progress?.phase === "download" && status.progress.total ? (
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-accent-500 transition-all" style={{ width: `${Math.round(((status.progress.loaded ?? 0) / status.progress.total) * 100)}%` }} />
                      </div>
                    ) : null}
                  </div>
                ) : status.kind === "ask" && free.plan ? (
                  <div className="space-y-3" data-testid="cutout-ask">
                    <div>{firstDownloadText(free.plan)}</div>
                    <div className="text-xs text-white/50">{planText(free.plan)}</div>
                    <Button variant="primary" onClick={() => void run("browser")} data-testid="cutout-start">
                      {tr("تنزيل النموذج وشيل الخلفية", "Download the model and remove the background")}
                    </Button>
                  </div>
                ) : status.kind === "error" ? (
                  <div className="space-y-3" role="alert" data-testid="cutout-error">
                    <div className="text-rose-200">{status.message}</div>
                    <Button variant="secondary" onClick={() => void run(engine)}>
                      {tr("إعادة المحاولة", "Try again")}
                    </Button>
                  </div>
                ) : (
                  <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
              </div>
            )}
          </div>
          {status.kind === "ready" ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
              <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(1, z / 1.5))} disabled={zoom <= 1} aria-label={tr("تصغير", "Zoom out")}>
                −
              </Button>
              <span className="min-w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(6, z * 1.5))} disabled={zoom >= 6} aria-label={tr("تكبير", "Zoom in")}>
                +
              </Button>
              <button
                type="button"
                className="ms-auto rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/5"
                onPointerDown={() => showOriginal(true)}
                onPointerUp={() => showOriginal(false)}
                onPointerLeave={() => showOriginal(false)}
                data-testid="cutout-compare"
              >
                {tr("ضغطة مطوّلة: قبل", "Hold: before")}
              </button>
              <span>{cut ? `${cut.width}×${cut.height}` : ""}</span>
            </div>
          ) : null}
        </div>

        <div className="space-y-5 text-sm">
          {cloud?.on ? (
            <section className="space-y-2">
              <div className="font-medium">{tr("المحرّك", "Engine")}</div>
              <EnginePicker value={engine} onChange={pickEngine} cloud={cloud} disabled={busy} />
              <p className="text-xs text-white/50">
                {engine === "cloudinary"
                  ? tr(`كل صورة بتنحسب ${cloud.transformations} تحويلة من باقة Cloudinary.`, "Each picture counts as {0} transformations of the Cloudinary plan.", [cloud.transformations])
                  : planText(free.plan)}
              </p>
            </section>
          ) : (
            <p className="text-xs text-white/50">{planText(free.plan)}</p>
          )}

          <section className="space-y-2">
            <div className="font-medium">{tr("الخلفية", "Background")}</div>
            <BackgroundPicker value={background} onChange={changeBackground} />
          </section>

          <section className={cn("space-y-3", status.kind !== "ready" && "pointer-events-none opacity-50")}>
            <div className="font-medium">{tr("تصليح بالفرشاة", "Fix up with the brush")}</div>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1" role="radiogroup" aria-label={tr("الفرشاة", "Brush")}>
              {(
                [
                  ["keep", tr("ترجيع", "Keep")],
                  ["erase", tr("مسح", "Erase")],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={cn("rounded-lg px-3 py-1.5 transition", mode === m ? "bg-white/10 font-medium text-white" : "text-white/60 hover:bg-white/5")}
                  data-testid={`cutout-brush-${m}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="text-xs text-white/60">{sizeLabel}</span>
              <input
                type="range"
                min={4}
                max={160}
                value={brushPx}
                onChange={(e) => {
                  setBrushPx(Number(e.target.value));
                  saveCutoutPrefs({ brush: Number(e.target.value) });
                }}
                className="w-full"
                aria-label={sizeLabel}
                data-testid="cutout-brush-size"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/60">{tr(`نعومة الطرف ${Math.round(softness * 100)}%`, "Soft edge {0}%", [Math.round(softness * 100)])}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(softness * 100)}
                onChange={(e) => {
                  setSoftness(Number(e.target.value) / 100);
                  saveCutoutPrefs({ softness: Number(e.target.value) / 100 });
                }}
                className="w-full"
                aria-label={tr("نعومة الطرف", "Soft edge")}
                data-testid="cutout-brush-soft"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-white/70">
              <input type="checkbox" checked={ghost} onChange={(e) => setGhost(e.target.checked)} />
              {tr("إظهار الجزء المشال بخفّة (بيساعد بالترجيع)", "Show the removed part faintly (helps when keeping)")}
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={undo} disabled={!h?.canUndo} data-testid="cutout-undo">
                {tr("↶ تراجع", "↶ Undo")}
              </Button>
              <Button variant="ghost" size="sm" onClick={redo} disabled={!h?.canRedo} data-testid="cutout-redo">
                {tr("↷ إعادة", "↷ Redo")}
              </Button>
              <Button variant="ghost" size="sm" onClick={backToModel} disabled={!h?.canUndo} title={tr("بيرجع لنتيجة القص الأولى", "Back to the first cut")}>
                {tr("من الأول", "Start over")}
              </Button>
            </div>
            <p className="text-[11px] leading-5 text-white/40">{tr("اختصارات: Ctrl+Z تراجع، Ctrl+Y إعادة، [ و ] حجم الفرشاة.", "Shortcuts: Ctrl+Z undo, Ctrl+Y redo, [ and ] brush size.")}</p>
          </section>
        </div>
      </div>
    </Modal>
  );
}
