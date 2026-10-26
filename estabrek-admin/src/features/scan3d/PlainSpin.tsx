/**
 * A 360° view from a plain video (no printed mat), here in the admin's browser: the video
 * (a file or from the video library) is read small, one turn is found (plainTurn.ts) and
 * shown as its first and last frame so both ends can be moved, then 36 or 72 frames round
 * it become a sprite sheet — the background kept, cut out (lib/bgRemove.ts) or laid on a
 * colour (plainSheet.ts) — previewed turning, and saved as a scan. From a product it's
 * linked to that product (and one of its colours) for the shop's product page.
 */
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../../api/http";
import { linkScan, saveScan, type Scan, type ScanManifest } from "../../api/scans.api";
import { VideoPickerModal } from "../../components/media/VideoPickerModal";
import { BgRemoveError } from "../../lib/bgRemove";
import { toast } from "../../lib/toast";
import { tr } from "../../lib/words";
import { findTurn, greyOf, turnTimes } from "./plainTurn";
import { renderPlainSheet, type PlainBackground, type PlainSheet, type PlainStep } from "./plainSheet";
import { Spin360 } from "./Spin360";
import { frameAt, openVideo, readFrames, type OpenVideo } from "./video";

const btn = "rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs hover:bg-white/[0.1] disabled:opacity-30";
const primary = "rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40";
const card = "space-y-3 rounded-2xl border border-white/[0.08] p-4";
const chip = (on: boolean) => `rounded-lg px-2.5 py-1 text-xs ${on ? "bg-accent-500/30 text-white" : "bg-white/[0.06] text-white/75 hover:bg-white/[0.1]"} disabled:opacity-40`;
const MAX_SECONDS = 120;

export type SpinProduct = { id: string; name: string; colours: Array<{ id: string; name: string }> };
type Loaded = { video: OpenVideo; name: string; found: boolean };

const fmt = (s: number) => `${s.toFixed(2)}s`;

function Thumb({ video, at, label, testId }: { video: OpenVideo; at: number; label: string; testId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let gone = false;
    const t = window.setTimeout(() => {
      void frameAt(video, at, 240).then((f) => {
        const c = ref.current;
        if (gone || !c) return;
        c.width = f.w;
        c.height = f.h;
        c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(f.data), f.w, f.h), 0, 0);
      }).catch(() => undefined);
    }, 120);
    return () => {
      gone = true;
      window.clearTimeout(t);
    };
  }, [video, at]);
  return (
    <figure className="min-w-0 flex-1 space-y-1">
      <canvas ref={ref} className="block w-full rounded-lg bg-black/40" data-testid={testId} />
      <figcaption className="text-center text-[11px] text-white/55">{label}</figcaption>
    </figure>
  );
}

export function PlainSpin({ product, onSaved }: { product?: SpinProduct; onSaved?: (scan: Scan) => void }) {
  const qc = useQueryClient();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reading, setReading] = useState<number | null>(null);
  const [turn, setTurn] = useState<{ start: number; end: number } | null>(null);
  const [count, setCount] = useState<36 | 72>(36);
  const [background, setBackground] = useState<PlainBackground>("cut");
  const [colour, setColour] = useState("#ffffff");
  const [cellH, setCellH] = useState<320 | 480>(320);
  const [building, setBuilding] = useState<{ step: PlainStep; progress: number } | null>(null);
  const [sheet, setSheet] = useState<(PlainSheet & { url: string }) | null>(null);
  const [name, setName] = useState("");
  const [itemId, setItemId] = useState("");
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const loadedRef = useRef<Loaded | null>(null);
  loadedRef.current = loaded;
  useEffect(() => () => loadedRef.current?.video.close(), []);
  const sheetUrl = sheet?.url;
  useEffect(() => () => { if (sheetUrl) URL.revokeObjectURL(sheetUrl); }, [sheetUrl]);

  const open = async (src: File | string, label: string) => {
    abort.current?.abort();
    loaded?.video.close();
    setLoaded(null);
    setSheet(null);
    setTurn(null);
    setError(null);
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      const video = await openVideo(src, ctl.signal);
      if (video.duration > MAX_SECONDS) {
        video.close();
        return setError(tr("الفيديو أطول من دقيقتين: قصّه للفّة وحدة.", "The video is longer than two minutes: trim it to one turn."));
      }
      setReading(0);
      const { frames, times } = await readFrames(video, { width: 160, max: 240, signal: ctl.signal, onProgress: (f) => setReading(f) });
      const found = findTurn(frames.map((f) => greyOf(f, 48)), times);
      setTurn(found ? { start: found.start, end: found.end } : { start: 0, end: video.duration });
      setLoaded({ video, name: label, found: Boolean(found) });
      setName(label.replace(/\.[^.]+$/, ""));
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(tr("ما انقرا الفيديو. جرّب MP4 أو WebM.", "The video couldn't be read. Try MP4 or WebM."));
    } finally {
      setReading(null);
    }
  };

  const build = async () => {
    if (!loaded || !turn) return;
    setError(null);
    setSheet(null);
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      setBuilding({ step: background === "kept" ? "draw" : "cut", progress: 0 });
      const bg = background === "colour" ? colour : background;
      const s = await renderPlainSheet(loaded.video, turnTimes(turn.start, turn.end, count), { background: bg, cellH, signal: ctl.signal, onProgress: (step, progress) => setBuilding({ step, progress }) });
      setSheet({ ...s, url: URL.createObjectURL(s.blob) });
    } catch (e) {
      if ((e as Error).name === "AbortError" || (e instanceof BgRemoveError && e.code === "ABORTED")) return;
      setError(e instanceof BgRemoveError ? `${tr("ما انشالت الخلفية", "The background wasn't removed")} (${e.code})` : tr("ما انعمل العرض.", "The view wasn't made."));
    } finally {
      setBuilding(null);
    }
  };

  const save = async () => {
    if (!loaded || !sheet || !turn) return;
    setSaving(true);
    try {
      const bg = background === "colour" ? colour : background;
      const manifest: ScanManifest = {
        version: 1,
        cols: sheet.cols,
        rows: sheet.rows,
        cellW: sheet.cellW,
        cellH: sheet.cellH,
        frames: sheet.frames,
        elevation: null,
        heightMm: null,
        video: { name: loaded.name.slice(0, 200), duration: Math.round(loaded.video.duration * 1000) / 1000, width: loaded.video.width, height: loaded.video.height },
        checks: [{ id: "turn", level: loaded.found ? "ok" : "warn" }],
        mode: "plain",
        background: bg,
      };
      let scan = await saveScan(sheet.blob, manifest, name.trim() || loaded.name);
      if (product) scan = await linkScan(scan.id, { productId: product.id, itemId: itemId || null });
      await qc.invalidateQueries({ queryKey: ["media", "scans"] });
      toast.success(product ? tr("انحفظ العرض وانربط بالمنتج", "The view was saved and linked to the product") : tr("انحفظ العرض", "The view was saved"));
      onSaved?.(scan);
    } catch (e) {
      toast.error(tr("ما انحفظ العرض", "The view wasn't saved"), { description: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const busy = reading !== null || building !== null || saving;
  const stepLabel: Record<PlainStep, string> = { cut: tr("عم نشيل الخلفية من كل لقطة", "Removing each frame's background"), draw: tr("عم نرسم اللقطات", "Drawing the frames") };
  return (
    <div className="space-y-4" data-testid="plain-spin">
      <section className={card} aria-label={tr("الفيديو", "The video")}>
        <h2 className="text-sm font-semibold">{tr("١. فيديو للقطعة وهي عم تلف", "1. A video of the product turning")}</h2>
        <p className="text-xs leading-6 text-white/55">{tr("صوّرها عصحن بيلف أو لفّها بإيدك لفة كاملة، والكاميرا ثابتة. خلفية سادة بتطلع أحلى بعد شيلها.", "Film it on a turntable or turn it by hand, one whole turn, with the camera still. A plain background comes out best once removed.")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${primary} cursor-pointer`}>
            {tr("فيديو من الجهاز", "A video from this computer")}
            <input type="file" accept="video/*" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void open(f, f.name); }} data-testid="plain-file" />
          </label>
          <button type="button" className={btn} disabled={busy} onClick={() => setPicking(true)}>{tr("من مكتبة الفيديوهات", "From the video library")}</button>
          {reading !== null || building ? <button type="button" className={btn} onClick={() => abort.current?.abort()} data-testid="plain-cancel">{tr("إلغاء", "Cancel")}</button> : null}
        </div>
        {reading !== null ? <Progress label={tr("عم نقرا الفيديو وندوّر عاللفّة", "Reading the video and finding the turn")} value={reading} /> : null}
        {error ? <p className="text-xs text-red-300" data-testid="plain-error">{error}</p> : null}
      </section>

      {loaded && turn ? (
        <section className={card} aria-label={tr("اللفّة", "The turn")} data-testid="plain-turn" data-found={loaded.found ? "1" : "0"}>
          <h2 className="text-sm font-semibold">{tr("٢. وين بتبلّش اللفّة ووين بتخلص", "2. Where the turn starts and ends")}</h2>
          <p className={`text-xs leading-6 ${loaded.found ? "text-emerald-200/80" : "text-amber-200/80"}`}>
            {loaded.found ? tr("لقينا لفّة كاملة. الصورتين لازم يكونوا تقريباً نفس الشي.", "One whole turn was found. The two pictures should look almost the same.") : tr("ما قدرنا نلاقي لفّة كاملة لحالنا (يمكن القطعة شكلها نفسه من كل الجهات). علّم البداية والنهاية بإيدك.", "No whole turn was found by itself (the product may look the same all round). Mark the start and end by hand.")}
          </p>
          <div className="flex gap-2">
            <Thumb video={loaded.video} at={turn.start} label={`${tr("البداية", "Start")} · ${fmt(turn.start)}`} testId="plain-thumb-start" />
            <Thumb video={loaded.video} at={turn.end} label={`${tr("النهاية", "End")} · ${fmt(turn.end)}`} testId="plain-thumb-end" />
          </div>
          {(["start", "end"] as const).map((k) => (
            <label key={k} className="block text-[11px] text-white/55">
              {k === "start" ? tr("البداية", "Start") : tr("النهاية", "End")}
              <input type="range" min={0} max={loaded.video.duration} step={0.05} value={turn[k]} disabled={busy} className="mt-1 w-full accent-[#c86b98]" data-testid={`plain-${k}`}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTurn((t) => (t ? (k === "start" ? { start: Math.min(v, t.end - 0.2), end: t.end } : { start: t.start, end: Math.max(v, t.start + 0.2) }) : t));
                  setSheet(null);
                }} />
            </label>
          ))}

          <h2 className="pt-2 text-sm font-semibold">{tr("٣. شكل العرض", "3. The view")}</h2>
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label={tr("كم لقطة", "How many frames")}>
            <span className="me-1 text-[11px] text-white/55">{tr("كم لقطة", "How many frames")}</span>
            {([36, 72] as const).map((n) => <button key={n} type="button" className={chip(count === n)} aria-pressed={count === n} disabled={busy} onClick={() => { setCount(n); setSheet(null); }}>{n}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label={tr("الخلفية", "Background")} data-testid="plain-background">
            <span className="me-1 text-[11px] text-white/55">{tr("الخلفية", "Background")}</span>
            {([["cut", tr("بلا خلفية (شفافة)", "None (see-through)")], ["colour", tr("لون", "A colour")], ["kept", tr("متل ما تصوّرت", "As filmed")]] as const).map(([k, label]) => (
              <button key={k} type="button" className={chip(background === k)} aria-pressed={background === k} disabled={busy} onClick={() => { setBackground(k); setSheet(null); }} data-value={k}>{label}</button>
            ))}
            {background === "colour" ? <input type="color" aria-label={tr("لون الخلفية", "Background colour")} className="h-7 w-9 cursor-pointer rounded border border-white/[0.1] bg-transparent" value={colour} disabled={busy} onChange={(e) => { setColour(e.target.value); setSheet(null); }} /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label={tr("الحجم", "Size")}>
            <span className="me-1 text-[11px] text-white/55">{tr("الحجم", "Size")}</span>
            {([320, 480] as const).map((n) => <button key={n} type="button" className={chip(cellH === n)} aria-pressed={cellH === n} disabled={busy} onClick={() => { setCellH(n); setSheet(null); }}>{n === 320 ? tr("عادي", "Normal") : tr("كبير (أوضح، أتقل)", "Large (sharper, heavier)")}</button>)}
          </div>
          <p className="text-[11px] leading-5 text-white/40">{background === "kept" ? tr("الخلفية بتضل متل ما هي.", "The background stays as it is.") : tr("شيل الخلفية بيصير هون عالجهاز، لقطة لقطة (أول مرة بينزل الموديل).", "The background is removed here on this computer, frame by frame (the model downloads the first time).")}</p>
          <button type="button" className={primary} disabled={busy} onClick={() => void build()} data-testid="plain-build">{tr("اعمل العرض", "Make the view")}</button>
          {building ? <Progress label={stepLabel[building.step]} value={building.progress} /> : null}
        </section>
      ) : null}

      {sheet && loaded ? (
        <section className={card} aria-label={tr("العرض", "The view")} data-testid="plain-result">
          <h2 className="text-sm font-semibold">{tr("٤. جرّبه واحفظه", "4. Try it and save it")}</h2>
          <Spin360 source={{ kind: "sheet", url: sheet.url, cols: sheet.cols, cellW: sheet.cellW, cellH: sheet.cellH, count: sheet.frames.length }} testId="plain-spin-view" />
          <p className="text-center text-[11px] text-white/45" dir="ltr">{sheet.frames.length} · {sheet.cellW}×{sheet.cellH} · {Math.round(sheet.blob.size / 1024)} KB</p>
          <label className="block text-[11px] text-white/55">
            {tr("الاسم", "Name")}
            <input className="mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white" value={name} onChange={(e) => setName(e.target.value)} data-testid="plain-name" />
          </label>
          {product && product.colours.length > 1 ? (
            <label className="block text-[11px] text-white/55">
              {tr("لأي لون", "For which colour")}
              <select className="mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white" value={itemId} onChange={(e) => setItemId(e.target.value)} data-testid="plain-colour">
                <option value="">{tr("كل الألوان", "Every colour")}</option>
                {product.colours.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          ) : null}
          <button type="button" className={primary} disabled={busy} onClick={() => void save()} data-testid="plain-save">
            {product ? `${tr("احفظ واربطه بـ", "Save and link it to")} ${product.name}` : tr("احفظ بالوسائط", "Save to the media library")}
          </button>
        </section>
      ) : null}

      <VideoPickerModal open={picking} onClose={() => setPicking(false)} onPick={(p) => { setPicking(false); void open(p.url, (p.video as { displayName?: string | null }).displayName || "video"); }} />
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1" data-testid="plain-progress">
      <div className="text-xs text-white/60">{label}</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full bg-accent-500 transition-[width]" style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </div>
  );
}
