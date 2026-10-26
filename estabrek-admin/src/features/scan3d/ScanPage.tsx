/**
 * 3D scan from a video (Admin → الوسائط → مسح 3D), first part: the product filmed turning
 * once on the printed mat becomes a 360° view, checked frame by frame, without AI and
 * without the video leaving the computer (the frames are read and cut out here).
 * The mat is printed from here; the video is a file or one from the video library; the
 * report says what is wrong when it is refused (the background or the camera moved, not a
 * whole turn, the product left the frame…); a good one is saved as a sprite sheet and its
 * manifest (scans.api.ts). From a good one the 3D model is built here too (build3d.ts:
 * carved from the cut-outs, coloured from the frames, a .glb in real size), previewed, and
 * saved with the store's 3D files, where the scene editor of the theme stage finds it.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../../api/http";
import { uploadModel } from "../../api/models3d.api";
import { deleteScan, linkScan, listScans, saveScan, type Scan, type ScanManifest } from "../../api/scans.api";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { VideoPickerModal } from "../../components/media/VideoPickerModal";
import { loc } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { tr } from "../../lib/words";
import { analyse, type Analysis, type Check } from "./analyse";
import { buildModel, type BuildQuality, type BuildStep, type Built } from "./build3d";
import { ModelPreview } from "./ModelPreview";
import { matSvg, type MatStyle } from "./mat";
import { Spin360 } from "./Spin360";
import { cropOf, cutout, evenFrames, frameAt, openVideo, readFrames, renderSheet, type OpenVideo } from "./video";

const btn = "rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs hover:bg-white/[0.1] disabled:opacity-30";
const primary = "rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40";
const card = "space-y-3 rounded-2xl border border-white/[0.08] p-4";
const ANALYSIS_WIDTH = 400;
const MAX_FRAMES = 180;
const MAX_SECONDS = 120;

type Phase = { step: "reading" | "analysing" | "preview" | "sheet" | "upload"; progress: number };
type Result = { analysis: Analysis; pictures: ImageData[]; strip: string[]; name: string; video: OpenVideo };

const pct = (v: number) => `${Math.round(v * 100)}%`;
const num = (v: number, digits = 1) => new Intl.NumberFormat(loc(), { maximumFractionDigits: digits }).format(v);

/** What each check says, in the admin's words. */
function checkText(c: Check): string {
  const v = c.value ?? 0;
  switch (c.id) {
    case "plate":
      if (c.level === "ok") return tr(`الحصيرة فاضية بأول ${num(v)} ثانية: منها عرفنا الخلفية.`, "The mat is empty for the first {0} s: that is the background.", [num(v)]);
      return v > 0
        ? tr(`الحصيرة فاضية ${num(v)} ثانية بس بالبداية. خلّيها ثانية على الأقل قبل ما تحط القطعة.`, "The mat is empty for only {0} s at the start. Keep it empty at least a second before putting the product down.", [num(v)])
        : tr("ما لقينا ثواني بالبداية والحصيرة فاضية. ابدأ التصوير قبل ما تحط القطعة.", "There are no seconds at the start with the mat empty. Start filming before putting the product down.");
    case "product":
      return tr("ما لقينا القطعة بالفيديو.", "No product was found in the video.");
    case "mat":
      return c.level === "ok"
        ? tr("لقينا الحصيرة: زاوية كل فريم مقاسة.", "The mat was found: every frame's angle is measured.")
        : tr("ما لقينا الحصيرة، فافترضنا إن القطعة بتلف بسرعة ثابتة. الزوايا تقريبية.", "The mat wasn't found, so the turn is taken to be steady. The angles are approximate.");
    case "edges":
      return c.level === "ok"
        ? tr("الخلفية ثابتة.", "The background stays the same.")
        : tr(`الخلفية تغيّرت أو شي تحرّك وراء القطعة (${pct(v)} من الفريمات). لازم الخلفية تضل ثابتة.`, "The background changed or something moved behind the product ({0} of the frames). The background must stay the same.", [pct(v)]);
    case "camera":
      return c.level === "ok" ? tr("الكاميرا ثابتة.", "The camera stays still.") : tr("الكاميرا تحركت خلال التصوير. ثبّت الموبايل على ستاند.", "The camera moved while filming. Put the phone on a stand.");
    case "light":
      return c.level === "ok"
        ? tr("الإضاءة ثابتة.", "The light stays the same.")
        : c.level === "warn"
          ? tr(`الإضاءة تغيّرت شوي (×${num(v, 2)}).`, "The light changed a little (×{0}).", [num(v, 2)])
          : tr(`الإضاءة تغيّرت كتير (×${num(v, 2)}). ثبّت السطوع بالموبايل وصوّر بضو ثابت.`, "The light changed a lot (×{0}). Lock the phone's exposure and film in steady light.", [num(v, 2)]);
    case "turn":
      if (c.level === "ok") return tr("لفة كاملة (360°).", "One whole turn (360°).");
      return v < 0
        ? tr("القطعة طلعت برّا الكادر قبل ما تكمّل اللفة.", "The product left the frame before the turn was complete.")
        : tr(`القطعة لفّت ${num(v, 0)}° بس. لازم لفة كاملة.`, "The product turned only {0}°. It needs one whole turn.", [num(v, 0)]);
    case "steady":
      return c.level === "ok" ? tr("اللفة كلها بنفس الاتجاه.", "The whole turn goes one way.") : tr("القطعة رجعت لورا خلال اللفة.", "The product turned back during the turn.");
    case "reading":
      return c.level === "ok" ? tr("قراءة الحصيرة واضحة.", "The mat reads clearly.") : tr("قراءة الحصيرة مش واضحة بكل الفريمات (غبش أو ضو قوي عليها).", "The mat doesn't read clearly in every frame (blur, or glare on it).");
    case "gaps":
      return c.level === "ok"
        ? tr(`الزوايا مغطّاة (أكبر فراغ ${num(v, 0)}°).`, "Every angle is covered (largest gap {0}°).", [num(v, 0)])
        : tr(`في زوايا ناقصة (فراغ ${num(v, 0)}°). لفّ أبطأ.`, "Some angles are missing (a {0}° gap). Turn it slower.", [num(v, 0)]);
    case "speed":
      return c.level === "ok"
        ? tr(`سرعة اللفة منيحة (${num(v, 0)}° بالثانية).`, "A good turning speed ({0}° a second).", [num(v, 0)])
        : tr(`اللفة سريعة (${num(v, 0)}° بالثانية)، ممكن يصير غبش.`, "The turn is fast ({0}° a second); frames may blur.", [num(v, 0)]);
    case "size":
      return c.level === "ok" ? tr("حجم القطعة بالكادر منيح.", "The product is a good size in the frame.") : tr("القطعة صغيرة بالكادر. قرّب الموبايل.", "The product is small in the frame. Bring the phone closer.");
    case "contrast":
      return c.level === "ok"
        ? tr("القطعة واضحة عن الخلفية.", "The product stands out from the background.")
        : tr(`لون القطعة قريب من الخلفية بأماكن (${pct(v)}). جرّب خلفية لونها مختلف.`, "The product's colour is close to the background in places ({0}). Try a background of another colour.", [pct(v)]);
  }
}

const VERDICT = {
  ok: () => tr("الفيديو منيح للمسح.", "The video is good for a scan."),
  warn: () => tr("الفيديو بينفع، بس في ملاحظات.", "The video works, with a few notes."),
  reject: () => tr("الفيديو مرفوض. هاي الأسباب:", "The video is refused. Here is why:"),
};
const LEVEL_ICON = { ok: "✓", warn: "!", reject: "✕" };
const LEVEL_CLASS = { ok: "text-emerald-300", warn: "text-amber-300", reject: "text-red-300" };

/** The mat as a page to print (100%, A4) in its own frame. */
function printMat(svg: string) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><title>Mat</title><style>@page{size:A4;margin:0}html,body{margin:0}svg{display:block;width:210mm;height:297mm}</style></head><body>${svg.replace(/^<\?xml[^>]*>/, "")}</body></html>`);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 200);
}

/** A frame with everything but the product dimmed: how the cut came out. */
function stripPicture(frame: { w: number; h: number; data: Uint8ClampedArray }, mask: Uint8Array) {
  const c = document.createElement("canvas");
  c.width = frame.w;
  c.height = frame.h;
  const img = new ImageData(frame.w, frame.h);
  for (let i = 0; i < mask.length; i++) {
    const k = mask[i] ? 1 : 0.28;
    img.data[i * 4] = frame.data[i * 4] * k;
    img.data[i * 4 + 1] = frame.data[i * 4 + 1] * k;
    img.data[i * 4 + 2] = frame.data[i * 4 + 2] * k + (mask[i] ? 0 : 30);
    img.data[i * 4 + 3] = 255;
  }
  c.getContext("2d")!.putImageData(img, 0, 0);
  return c.toDataURL("image/jpeg", 0.8);
}

/** Lets the page draw now and then while the work goes on. */
function breather() {
  let last = performance.now();
  return async () => {
    if (performance.now() - last < 40) return;
    await new Promise((r) => setTimeout(r, 0));
    last = performance.now();
  };
}

export default function ScanPage() {
  const qc = useQueryClient();
  const scans = useQuery({ queryKey: ["media", "scans"], queryFn: () => listScans() });
  // Only scans whose manifest can be shown (an odd record mustn't break the page).
  const saved = (scans.data?.items ?? []).filter((s) => s.manifest?.frames?.length && s.manifest.cols && s.manifest.cellW && s.manifest.cellH);
  const [style, setStyle] = useState<MatStyle>("colour");
  const svg = useMemo(
    () =>
      matSvg(
        {
          title: tr("حصيرة المسح 3D", "3D scan mat"),
          print: tr("اطبعها بحجم 100% (بدون ملاءمة للصفحة). المسطرة لازم تكون 10 سم بالزبط.", "Print at 100% (no fit to page). The ruler must measure exactly 10 cm."),
          ruler: tr("10 سم", "10 cm"),
          cut: tr("قصّها على الخط المتقطّع وحطها بنص الصحن اللي بيلف.", "Cut along the dashed line and put it in the middle of the turntable."),
        },
        style,
      ),
    [style],
  );
  const svgUrl = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg]);

  const [picking, setPicking] = useState(false);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [name, setName] = useState("");
  const [removing, setRemoving] = useState<Scan | null>(null);
  const [quality, setQuality] = useState<BuildQuality>("normal");
  const [building, setBuilding] = useState<{ step: BuildStep | "upload"; progress: number } | null>(null);
  const [built, setBuilt] = useState<(Built & { url: string; savedUrl?: string }) | null>(null);
  // The download link lives as long as its model (not each change to it, like being saved).
  const builtUrl = built?.url;
  useEffect(
    () => () => {
      if (builtUrl) URL.revokeObjectURL(builtUrl);
    },
    [builtUrl],
  );
  const abort = useRef<AbortController | null>(null);
  // The scan saved from this video: its 3D model, saved before or after it, is linked to it (the shop's product page offers "3D").
  const savedScan = useRef<string | null>(null);
  const resultRef = useRef<Result | null>(null);
  resultRef.current = result;
  useEffect(() => () => resultRef.current?.video.close(), []);

  const run = async (src: File | string, label: string) => {
    abort.current?.abort();
    result?.video.close();
    setResult(null);
    setBuilt(null);
    setError(null);
    savedScan.current = null;
    const ctl = new AbortController();
    abort.current = ctl;
    const rest = breather();
    let video: OpenVideo | null = null;
    try {
      setPhase({ step: "reading", progress: 0 });
      video = await openVideo(src, ctl.signal);
      if (video.duration > MAX_SECONDS) throw new Error("TOO_LONG");
      const hiPlate = await frameAt(video, Math.min(0.25, video.duration / 4), 1280, ctl.signal);
      const { frames, times } = await readFrames(video, {
        width: ANALYSIS_WIDTH,
        max: MAX_FRAMES,
        signal: ctl.signal,
        onProgress: (f) => {
          setPhase({ step: "reading", progress: f });
          return rest();
        },
      });
      const analysis = await analyse({
        frames,
        times,
        hiPlate,
        onProgress: (f) => {
          if (ctl.signal.aborted) throw new DOMException("Aborted", "AbortError");
          setPhase({ step: "analysing", progress: f });
          return rest();
        },
      });
      setPhase({ step: "preview", progress: 1 });
      await rest();
      let pictures: ImageData[] = [];
      let strip: string[] = [];
      if (analysis.turn.length) {
        const crop = cropOf(analysis.turn, analysis.w, analysis.h);
        pictures = evenFrames(analysis.turn, 72).map((f) => cutout(frames[f.index], f, crop));
        strip = evenFrames(analysis.turn, 8).map((f) => stripPicture(frames[f.index], f.mask));
      }
      setResult({ analysis, pictures, strip, name: label, video });
      setName(label.replace(/\.[a-z0-9]+$/i, ""));
      video = null;
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      const code = (e as Error)?.message;
      setError(
        code === "TOO_LONG"
          ? tr(`الفيديو أطول من ${MAX_SECONDS / 60} دقايق. صوّر لفة وحدة بس (10–20 ثانية).`, "The video is longer than {0} minutes. Film one turn only (10–20 seconds).", [MAX_SECONDS / 60])
          : code === "VIDEO_UNREADABLE" || code === "VIDEO_TIMEOUT"
            ? tr("المتصفح ما قدر يقرأ الفيديو. إذا مصوّر بآيفون (HEVC)، ارفعه لمكتبة الفيديوهات أول (بيتحوّل لـ MP4) واختاره من هناك.", "The browser couldn't read the video. If it was filmed on an iPhone (HEVC), upload it to the video library first (it is converted to MP4) and pick it from there.")
            : getApiErrorMessage(e),
      );
    } finally {
      video?.close();
      if (abort.current === ctl) setPhase(null);
    }
  };

  const save = async () => {
    if (!result) return;
    const { analysis, video } = result;
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      setPhase({ step: "sheet", progress: 0 });
      const sheet = await renderSheet(video, analysis, { count: 72, cellH: 320, signal: ctl.signal, onProgress: (f) => setPhase({ step: "sheet", progress: f }) });
      const manifest: ScanManifest = {
        version: 1,
        cols: sheet.cols,
        rows: sheet.rows,
        cellW: sheet.cellW,
        cellH: sheet.cellH,
        frames: sheet.frames,
        elevation: analysis.mat ? Math.round(analysis.mat.elevation * 10) / 10 : null,
        heightMm: analysis.heightMm ? Math.round(analysis.heightMm) : null,
        video: { name: result.name.slice(0, 200), duration: Math.round(video.duration * 100) / 100, width: video.width, height: video.height },
        checks: analysis.checks.map((c) => ({ id: c.id, level: c.level, ...(c.value !== undefined ? { value: Math.round(c.value * 1000) / 1000 } : {}) })),
        mode: "mat",
        background: "cut",
        ...(built?.savedUrl ? { model: { url: built.savedUrl } } : {}),
      };
      setPhase({ step: "upload", progress: 0 });
      const scan = await saveScan(sheet.blob, manifest, name.trim() || result.name, (f) => setPhase({ step: "upload", progress: f }));
      savedScan.current = scan.id;
      toast.success(tr("انحفظ المسح", "The scan was saved"));
      void qc.invalidateQueries({ queryKey: ["media", "scans"] });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error(tr("ما انحفظ المسح", "The scan wasn't saved"), { description: getApiErrorMessage(e) });
    } finally {
      if (abort.current === ctl) setPhase(null);
    }
  };

  const build = async () => {
    if (!result) return;
    const ctl = new AbortController();
    abort.current = ctl;
    setBuilt(null);
    try {
      const made = await buildModel(result.video, result.analysis, {
        quality,
        name: name.trim() || result.name,
        signal: ctl.signal,
        onProgress: (step, progress) => setBuilding({ step, progress }),
      });
      setBuilt({ ...made, url: URL.createObjectURL(made.glb) });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error(tr("ما انبنى الموديل", "The model wasn't built"), { description: getApiErrorMessage(e) });
    } finally {
      setBuilding(null);
    }
  };

  const saveModel = async () => {
    if (!built || !result) return;
    try {
      setBuilding({ step: "upload", progress: 0 });
      const file = new File([built.glb], `${(name.trim() || result.name).replace(/[\\/:*?"<>|]+/g, "-")}.glb`, { type: "model/gltf-binary" });
      const saved = await uploadModel(file, { onProgress: (f) => setBuilding({ step: "upload", progress: f }) });
      setBuilt({ ...built, savedUrl: saved.url });
      if (savedScan.current) await linkScan(savedScan.current, { modelUrl: saved.url }).catch(() => undefined);
      toast.success(tr("انحفظ الموديل بملفات الـ 3D", "The model was saved with the 3D files"));
    } catch (e) {
      toast.error(tr("ما انحفظ الموديل", "The model wasn't saved"), { description: getApiErrorMessage(e) });
    } finally {
      setBuilding(null);
    }
  };

  const buildLabel: Record<BuildStep | "upload", string> = {
    carve: tr("عم ننحت الشكل من القص…", "Carving the shape from the cut-outs…"),
    surface: tr("عم نعمل السطح…", "Making the surface…"),
    colour: tr("عم نلوّن من الفريمات…", "Colouring it from the frames…"),
    file: tr("عم نجهّز الملف…", "Preparing the file…"),
    upload: tr("عم نرفع الموديل…", "Uploading the model…"),
  };

  const a = result?.analysis;
  const stepLabel: Record<Phase["step"], string> = {
    reading: tr("عم نقرأ الفريمات…", "Reading the frames…"),
    analysing: tr("عم نفصل القطعة عن الخلفية ونقيس الزوايا…", "Separating the product from the background and measuring the angles…"),
    preview: tr("عم نجهّز المعاينة…", "Preparing the preview…"),
    sheet: tr("عم نقصّ القطعة بحجم أكبر…", "Cutting the product out at a bigger size…"),
    upload: tr("عم نرفع المسح…", "Uploading the scan…"),
  };

  return (
    <div className="space-y-4" data-testid="scan-page">
      <header>
        <h1 className="text-xl font-semibold">{tr("مسح 3D من فيديو", "3D scan from a video")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-white/55">
          {tr(
            "صوّر القطعة وهي بتلف لفة وحدة على الحصيرة المطبوعة. منفصلها عن الخلفية بكل فريم ومنقيس زاويتها، فبيطلع عرض 360°، والخطوة الجاية موديل 3D. كله بمتصفحك، والفيديو ما بيطلع لبرّا.",
            "Film the product turning once on the printed mat. It is separated from the background in every frame and its angle measured, giving a 360° view; a 3D model comes next. All in your browser: the video doesn't leave your computer.",
          )}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card} aria-label={tr("الحصيرة", "The mat")}>
          <h2 className="text-sm font-semibold">{tr("١. اطبع الحصيرة", "1. Print the mat")}</h2>
          <div className="flex flex-wrap gap-1" role="group" aria-label={tr("نوع الحصيرة", "Kind of mat")}>
            {(["colour", "mono"] as const).map((s) => (
              <button key={s} type="button" className={`${btn} ${style === s ? "bg-accent-500/25 text-white" : ""}`} aria-pressed={style === s} onClick={() => setStyle(s)} data-testid={`scan-mat-${s}`}>
                {s === "colour" ? tr("ملوّنة (أحسن)", "In colour (best)") : tr("أبيض وأسود", "Black and white")}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <img src={svgUrl} alt={tr("الحصيرة", "The mat")} className="h-44 shrink-0 rounded-lg border border-white/10 bg-white" data-testid="scan-mat-preview" />
            <p className="text-[11px] leading-5 text-white/50">
              {style === "colour"
                ? tr("الملوّنة بتخلّي القطع السودا والبيضا والرمادية واضحة فوقها. إذا قطعتك بنفسجية أو خضرا فاتحة، استعمل الأبيض والأسود.", "In colour, black, white and grey products stand out on it. If your product is purple or light green, use the black-and-white one.")
                : tr("للطابعات بدون ألوان. القطع السودا أو البيضا بتخسر شوي من قصّها فوق الحصيرة.", "For printers without colour. Black or white products lose a little of their cut over the mat.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primary} onClick={() => printMat(svg)} data-testid="scan-mat-print">
              {tr("اطبع الحصيرة", "Print the mat")}
            </button>
            <a className={btn} href={svgUrl} download={`scan-mat-${style}.svg`} data-testid="scan-mat-download">
              {tr("نزّل الملف (SVG)", "Download the file (SVG)")}
            </a>
          </div>
        </section>

        <section className={card} aria-label={tr("طريقة التصوير", "How to film")}>
          <h2 className="text-sm font-semibold">{tr("٢. صوّر لفة وحدة", "2. Film one turn")}</h2>
          <ol className="list-decimal space-y-1.5 ps-5 text-xs leading-5 text-white/70">
            <li>{tr("الموبايل ثابت على ستاند، أعلى من القطعة شوي (من 20 لـ 40 درجة)، والحصيرة كلها بالكادر.", "The phone still on a stand, a little above the product (20–40°), the whole mat in the frame.")}</li>
            <li>{tr("خلفية سادة لونها مختلف عن القطعة، وضو ثابت. إذا الموبايل بيسمح، ثبّت السطوع والفوكس.", "A plain background in another colour than the product, and steady light. If the phone allows, lock exposure and focus.")}</li>
            <li>{tr("ابدأ التصوير والحصيرة فاضية ثانيتين، بعدين حط القطعة بالنص وشيل إيدك.", "Start filming with the mat empty for two seconds, then put the product in the middle and take your hand away.")}</li>
            <li>{tr("خلّيها تلف لفة كاملة بهدوء (10–20 ثانية)، كلها جوّا الكادر.", "Let it turn once, slowly (10–20 seconds), all of it in the frame.")}</li>
            <li>{tr("لا تحرّك الموبايل، وما حدا يمرق ورا.", "Don't move the phone, and nobody walks behind.")}</li>
          </ol>
        </section>
      </div>

      <section className={card} aria-label={tr("الفيديو", "The video")}>
        <h2 className="text-sm font-semibold">{tr("٣. اختار الفيديو", "3. Choose the video")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${primary} cursor-pointer`}>
            {tr("فيديو من الجهاز", "A video from this computer")}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={Boolean(phase)}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void run(f, f.name);
              }}
              data-testid="scan-file"
            />
          </label>
          <button type="button" className={btn} disabled={Boolean(phase)} onClick={() => setPicking(true)}>
            {tr("من مكتبة الفيديوهات", "From the video library")}
          </button>
          {phase ? (
            <button type="button" className={btn} onClick={() => abort.current?.abort()} data-testid="scan-cancel">
              {tr("إلغاء", "Cancel")}
            </button>
          ) : null}
        </div>
        {phase ? (
          <div className="space-y-1" data-testid="scan-progress">
            <div className="text-xs text-white/60">{stepLabel[phase.step]}</div>
            <div className="h-1.5 overflow-hidden rounded bg-white/[0.08]">
              <div className="h-full bg-accent-500 transition-[width]" style={{ width: pct(phase.progress) }} />
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-400/20 bg-red-500/10 p-2 text-xs text-red-200" role="alert" data-testid="scan-error">
            {error}
          </p>
        ) : null}
      </section>

      {a ? (
        <section className={card} aria-label={tr("النتيجة", "The result")} data-testid="scan-result" data-verdict={a.verdict}>
          <div className={`rounded-xl p-3 text-sm font-medium ${a.verdict === "ok" ? "bg-emerald-500/10 text-emerald-200" : a.verdict === "warn" ? "bg-amber-500/10 text-amber-200" : "bg-red-500/10 text-red-200"}`}>{VERDICT[a.verdict]()}</div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ul className="space-y-1.5" data-testid="scan-checks">
              {a.checks
                .slice()
                .sort((x, y) => ["reject", "warn", "ok"].indexOf(x.level) - ["reject", "warn", "ok"].indexOf(y.level))
                .map((c) => (
                  <li key={c.id} className="flex gap-2 text-xs leading-5" data-check={c.id} data-level={c.level}>
                    <span className={`w-4 shrink-0 text-center font-bold ${LEVEL_CLASS[c.level]}`} aria-hidden>
                      {LEVEL_ICON[c.level]}
                    </span>
                    <span className="text-white/75">{checkText(c)}</span>
                  </li>
                ))}
            </ul>
            {result!.pictures.length ? (
              <div className="space-y-2">
                <Spin360 source={{ kind: "frames", frames: result!.pictures }} testId="scan-spin" />
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/55 sm:grid-cols-4">
                  <div>
                    <dt>{tr("الفريمات", "Frames")}</dt>
                    <dd className="text-white/80">{a.turn.length}</dd>
                  </div>
                  <div>
                    <dt>{tr("اللفة", "The turn")}</dt>
                    <dd className="text-white/80">{num(a.rotation, 0)}°</dd>
                  </div>
                  {a.mat ? (
                    <div>
                      <dt>{tr("ارتفاع الكاميرا", "Camera height")}</dt>
                      <dd className="text-white/80">{num(a.mat.elevation, 0)}°</dd>
                    </div>
                  ) : null}
                  {a.heightMm ? (
                    <div>
                      <dt>{tr("طول القطعة تقريباً", "Product height, about")}</dt>
                      <dd className="text-white/80">
                        {num(a.heightMm / 10)} {tr("سم", "cm")}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
          </div>
          {result!.strip.length ? (
            <div className="space-y-1">
              <div className="text-[11px] text-white/45">{tr("القص على 8 زوايا (الغامق خلفية):", "The cut at 8 angles (dimmed = background):")}</div>
              <div className="grid grid-cols-4 gap-1 sm:grid-cols-8" data-testid="scan-strip">
                {result!.strip.map((src, i) => (
                  <img key={i} src={src} alt="" className="w-full rounded" />
                ))}
              </div>
            </div>
          ) : null}
          {a.verdict !== "reject" && a.turn.length ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
              <input className="w-60 rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("اسم المسح", "The scan's name")} aria-label={tr("اسم المسح", "The scan's name")} data-testid="scan-name" />
              <button type="button" className={primary} disabled={Boolean(phase)} onClick={() => void save()} data-testid="scan-save">
                {tr("احفظ المسح", "Save the scan")}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {a && a.verdict !== "reject" && a.turn.length ? (
        <section className={card} aria-label={tr("الموديل 3D", "The 3D model")} data-testid="scan-model">
          <h2 className="text-sm font-semibold">{tr("٤. الموديل 3D", "4. The 3D model")}</h2>
          {a.mat ? (
            <>
              <p className="max-w-3xl text-[11px] leading-5 text-white/50">
                {tr(
                  "منبني الشكل من قص القطعة بكل الزوايا، ومنلوّنه من الفريمات، فبيطلع ملف GLB بحجمها الحقيقي. الأماكن المجوّفة اللي ما بتبين من أي زاوية (متل جوّا كوباية) بتطلع معبّاية.",
                  "The shape is built from the product's cut-out at every angle and coloured from the frames, giving a GLB file at its real size. Hollows no angle shows (like the inside of a cup) come out filled.",
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1" role="group" aria-label={tr("الدقة", "Detail")}>
                  {(["normal", "high"] as const).map((q) => (
                    <button key={q} type="button" className={`${btn} ${quality === q ? "bg-accent-500/25 text-white" : ""}`} aria-pressed={quality === q} onClick={() => setQuality(q)} data-testid={`scan-quality-${q}`}>
                      {q === "normal" ? tr("دقة عادية (أسرع وأخف)", "Normal detail (faster, lighter)") : tr("دقة عالية", "High detail")}
                    </button>
                  ))}
                </div>
                <button type="button" className={primary} disabled={Boolean(building) || Boolean(phase)} onClick={() => void build()} data-testid="scan-build">
                  {built ? tr("ابنِه من جديد", "Build it again") : tr("ابنِ الموديل", "Build the model")}
                </button>
              </div>
              {building ? (
                <div className="space-y-1" data-testid="scan-build-progress">
                  <div className="text-xs text-white/60">{buildLabel[building.step]}</div>
                  <div className="h-1.5 overflow-hidden rounded bg-white/[0.08]">
                    <div className="h-full bg-accent-500 transition-[width]" style={{ width: pct(building.progress) }} />
                  </div>
                </div>
              ) : null}
              {built ? (
                <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)]" data-testid="scan-built">
                  <ModelPreview mesh={built.mesh} testId="scan-model-preview" />
                  <div className="space-y-3">
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/55">
                      <div>
                        <dt>{tr("الحجم (عرض × عمق × طول)", "Size (width × depth × height)")}</dt>
                        <dd className="text-white/80" dir="ltr" data-testid="scan-model-size">
                          {built.sizeMm.map((v) => num(v / 10)).join(" × ")} {tr("سم", "cm")}
                        </dd>
                      </div>
                      <div>
                        <dt>{tr("المثلثات", "Triangles")}</dt>
                        <dd className="text-white/80">{num(built.triangles, 0)}</dd>
                      </div>
                      <div>
                        <dt>{tr("حجم الملف", "File size")}</dt>
                        <dd className="text-white/80">{num(built.glb.size / 1024 / 1024)} MB</dd>
                      </div>
                      <div>
                        <dt>{tr("مغطّى بالفريمات", "Seen by the frames")}</dt>
                        <dd className="text-white/80">{pct(built.seen)}</dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={primary} disabled={Boolean(building) || Boolean(built.savedUrl)} onClick={() => void saveModel()} data-testid="scan-model-save">
                        {built.savedUrl ? tr("انحفظ ✓", "Saved ✓") : tr("احفظه بملفات الـ 3D", "Save it with the 3D files")}
                      </button>
                      <a className={btn} href={built.url} download={`${(name.trim() || result!.name).replace(/\.[a-z0-9]+$/i, "")}.glb`} data-testid="scan-model-download">
                        {tr("نزّل الملف (GLB)", "Download the file (GLB)")}
                      </a>
                    </div>
                    {built.savedUrl ? (
                      <p className="text-[11px] leading-5 text-white/55">
                        {tr("الموديل صار بملفات الـ 3D. بتلاقيه بمحرّر المشهد ← ملف 3D خاص ← من الملفات المرفوعة.", "The model is in the 3D files now: the scene editor → Your own 3D file → From uploaded files.")}{" "}
                        <Link className="underline" to="/admin/themes">
                          {tr("افتح ثيمات المتجر", "Open the store themes")}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-amber-200">{tr("بدون الحصيرة ما منقدر نبني موديل 3D: هي اللي بتعرّفنا مكان الكاميرا وزاوية كل فريم.", "Without the mat a 3D model can't be built: it tells where the camera is and each frame's angle.")}</p>
          )}
        </section>
      ) : null}

      <section className={card} aria-label={tr("المسوحات المحفوظة", "Saved scans")}>
        <h2 className="text-sm font-semibold">{tr("المسوحات المحفوظة", "Saved scans")}</h2>
        {saved.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="scan-list">
            {saved.map((s) => (
              <li key={s.id} className="space-y-2 rounded-xl bg-white/[0.03] p-3" data-testid="scan-item">
                <Spin360 source={{ kind: "sheet", url: s.url, cols: s.manifest.cols, cellW: s.manifest.cellW, cellH: s.manifest.cellH, count: s.manifest.frames.length }} height={180} />
                <div className="flex items-center gap-2 text-xs">
                  <span className="me-auto truncate font-medium">{s.displayName || tr("مسح", "Scan")}</span>
                  <span className="text-white/40">{new Date(s.createdAt).toLocaleDateString(loc())}</span>
                  <button type="button" className="text-red-300 hover:text-red-200" onClick={() => setRemoving(s)} aria-label={tr("حذف", "Delete")}>
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-white/40">{scans.isLoading ? tr("عم يحمّل…", "Loading…") : tr("ما في مسوحات لسّا.", "No scans yet.")}</p>
        )}
      </section>

      <VideoPickerModal open={picking} onClose={() => setPicking(false)} onPick={({ url, video }) => void run(url, video.displayName || tr("فيديو", "Video"))} />
      <ConfirmDialog
        open={Boolean(removing)}
        title={tr("حذف المسح؟", "Delete the scan?")}
        message={tr("المسح بينحذف من المكتبة.", "The scan is removed from the library.")}
        confirmText={tr("حذف", "Delete")}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await deleteScan(removing.id);
            void qc.invalidateQueries({ queryKey: ["media", "scans"] });
          } catch (e) {
            toast.error(tr("ما انحذف المسح", "The scan wasn't deleted"), { description: getApiErrorMessage(e) });
          } finally {
            setRemoving(null);
          }
        }}
      />
    </div>
  );
}
