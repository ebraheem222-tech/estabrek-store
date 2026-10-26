// One video: the player, the frame picker (a frame as the cover or as images), the
// converted versions with their links, a new conversion, renaming and deleting.
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import * as VideosAPI from "../../api/videos.api";
import type { ImageAsset, Rendition, StreamLadder, StreamProfile, Video, VideoLibrary, VideoPreset, VideoProfile } from "../../api/videos.api";
import { formatBytes } from "../system/cacheText";
import { Segmented, Toggle } from "../system/cacheParts";
import { CODEC_TEXT, LADDER_TEXT, PRESET_TEXT, QUALITY_TEXT, STATUS_TEXT, codecsFor, durationText, frameTimes, profileSummary, renditionSummary, timeText } from "./videoText";
import { tr } from "@/lib/words";

const field = "h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(tr("انتسخ الرابط", "Link copied"));
  } catch {
    toast.error(tr("ما قدرنا ننسخ", "Couldn't copy"), { description: text });
  }
}

export function VideoDetail({ video, library, canWrite, onClose }: { video: Video; library: VideoLibrary; canWrite: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const player = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<string>(video.url);
  const [t, setT] = useState(0);
  const [every, setEvery] = useState(2);
  const [frames, setFrames] = useState<ImageAsset[]>([]);
  const [name, setName] = useState(video.displayName ?? "");
  const [confirmDelete, setConfirmDelete] = useState<null | { usage: number }>(null);
  const duration = (video.durationMs ?? 0) / 1000;
  const refresh = () => qc.invalidateQueries({ queryKey: ["media", "videos"] });
  const onError = (e: unknown) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) });

  // A rename saved elsewhere (or a new video in the same window) starts the field over.
  const [named, setNamed] = useState(video.displayName);
  if (named !== video.displayName) {
    setNamed(video.displayName);
    setName(video.displayName ?? "");
  }

  const poster = useMutation({
    mutationFn: () => VideosAPI.grabFrames(video.id, { seconds: [t], as: "poster" }),
    onSuccess: () => {
      toast.success(tr("صار غلاف الفيديو", "It's now the video's cover"));
      refresh();
    },
    onError,
  });
  const asImages = useMutation({
    mutationFn: (seconds: number[]) => VideosAPI.grabFrames(video.id, { seconds, as: "image" }),
    onSuccess: (out) => {
      setFrames(out.images);
      toast.success(out.images.length === 1 ? tr("انحفظت الصورة بمكتبة الصور (مجلد frames)", "The photo was saved in the photo library (frames folder)") : tr(`انحفظت ${out.images.length} صور بمكتبة الصور (مجلد frames)`, "{0} photos were saved in the photo library (frames folder)", [out.images.length]));
    },
    onError,
  });
  const rename = useMutation({ mutationFn: () => VideosAPI.updateVideo(video.id, { displayName: name.trim() }), onSuccess: () => (toast.success(tr("انحفظ الاسم", "Name saved")), refresh()), onError });
  const removeRendition = useMutation({ mutationFn: (rid: string) => VideosAPI.deleteRendition(video.id, rid), onSuccess: refresh, onError });
  const remove = useMutation({
    mutationFn: () => VideosAPI.deleteVideo(video.id),
    onSuccess: () => {
      toast.success(tr("انحذف الفيديو", "Video deleted"));
      refresh();
      onClose();
    },
    onError,
  });
  const askDelete = async () => {
    try {
      const { usage } = await VideosAPI.videoUsage(video.id);
      setConfirmDelete({ usage: usage.length });
    } catch (e) {
      onError(e);
    }
  };

  const seek = (s: number) => {
    setT(s);
    if (player.current) player.current.currentTime = s;
  };
  const ready = video.renditions.filter((r) => r.status === "ready" && r.url && r.kind !== "hls");

  return (
    <Modal open title={video.displayName || tr("فيديو", "video")} onClose={onClose} widthClassName="max-w-4xl">
      <div className="max-h-[75vh] space-y-5 overflow-y-auto pe-1" data-testid="video-detail">
        <div className="space-y-2">
          <video
            ref={player}
            key={source}
            src={source}
            poster={video.posterUrl ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full rounded-xl bg-black"
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          />
          {ready.length ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-white/50">{tr("اللي عم يشتغل:", "Playing:")}</span>
              <button type="button" className={`rounded-lg px-2 py-1 ${source === video.url ? "bg-white/10" : "text-white/60"}`} onClick={() => setSource(video.url)}>
                {tr("الأصلي", "Original")}
              </button>
              {ready.map((r) => (
                <button key={r.id} type="button" className={`rounded-lg px-2 py-1 ${source === r.url ? "bg-white/10" : "text-white/60"}`} onClick={() => setSource(r.url!)}>
                  {PRESET_TEXT[r.preset].label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="font-medium">{tr("صور من الفيديو", "Photos from the video")}</h3>
          <p className="mt-0.5 text-xs text-white/50">{tr("المؤشر بيتحرّك للإطار المطلوب (أو تشغيل وتوقيف الفيديو)، وبعدها اختيار شو ينعمل فيه.", "Move the marker to the frame you want (or play and pause the video), then choose what to do with it.")}</p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={Math.max(0.01, duration)}
              step={video.fps ? 1 / video.fps : 0.04}
              value={Math.min(t, duration)}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full"
              dir="ltr"
              aria-label={tr("مكان الإطار", "Frame position")}
              disabled={!duration}
            />
            <span className="w-16 shrink-0 text-xs tabular-nums" dir="ltr">
              {timeText(t)}
            </span>
          </div>
          {canWrite ? (
            library.canGrabFrames ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => poster.mutate()} isLoading={poster.isPending}>
                  {tr("تعيينه غلاف الفيديو", "Make it the video's cover")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => asImages.mutate([t])} isLoading={asImages.isPending && asImages.variables?.length === 1}>
                  {tr("حفظه كصورة", "Save it as a photo")}
                </Button>
                <span className="mx-1 h-5 w-px bg-white/10" />
                <span className="text-xs text-white/60">{tr("صورة كل", "A photo every")}</span>
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={every}
                  onChange={(e) => setEvery(Number(e.target.value))}
                  className={`${field} w-20`}
                  dir="ltr"
                  aria-label={tr("كل كم ثانية", "Every how many seconds")}
                />
                <span className="text-xs text-white/60">{tr("ثانية", "seconds")}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!frameTimes(video.durationMs, every).length}
                  onClick={() => asImages.mutate(frameTimes(video.durationMs, every))}
                  isLoading={asImages.isPending && (asImages.variables?.length ?? 0) > 1}
                >
                  {tr(`تصدير ${frameTimes(video.durationMs, every).length} صور`, "Export {0} photos", [frameTimes(video.durationMs, every).length])}
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-amber-200">{tr("الصور من الفيديو بدها Cloudinary أو ffmpeg على السيرفر.", "Photos from the video need Cloudinary or ffmpeg on the server.")}</p>
            )
          ) : null}
          {frames.length ? (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {frames.map((img) => (
                <li key={img.id}>
                  <button type="button" onClick={() => copy(img.url)} title={tr("نسخ الرابط", "Copy link")} className="block w-full overflow-hidden rounded-lg border border-white/10">
                    <img src={img.url} alt="" className="aspect-video w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="font-medium">{tr("النسخ المحوّلة", "Converted versions")}</h3>
          <p className="mt-0.5 text-xs text-white/50">{tr("كل نسخة إلها رابط: بينتسخ وبينحط بقسم الفيديو بالصفحة. النسخ بتنعمل بالخلفية، وبتتحدّث هون لحالها.", "Each version has a link: copy it into a video section on the page. Versions are made in the background and update here by themselves.")}</p>
          {video.renditions.length ? (
            <ul className="mt-3 divide-y divide-white/10">
              {video.renditions.map((r) => (
                <RenditionRow key={r.id} r={r} canWrite={canWrite} onDelete={() => removeRendition.mutate(r.id)} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-white/60">{tr("ما في نسخ بعد.", "No versions yet.")}</p>
          )}
          {canWrite ? <ConvertForm video={video} library={library} onDone={refresh} /> : null}
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="font-medium">{tr("معلومات", "Info")}</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <Info label={tr("المدة", "Duration")} value={durationText(video.durationMs)} />
            <Info label={tr("الحجم", "Size")} value={video.width && video.height ? `${video.width}×${video.height}` : "—"} />
            <Info label={tr("الإطارات", "Frames")} value={video.fps ? tr(`${Math.round(video.fps * 100) / 100} بالثانية`, "{0} a second", [Math.round(video.fps * 100) / 100]) : "—"} />
            <Info label={tr("الملف", "File")} value={formatBytes(video.size)} />
            <Info label={tr("الترميز", "Codec")} value={video.meta?.codec ?? "—"} />
            <Info label={tr("الصوت", "Sound")} value={video.meta?.hasAudio ? tr("في", "Yes") : tr("ما في", "No")} />
            <Info label={tr("مكانه", "Stored on")} value={video.provider === "CLOUDINARY" ? "Cloudinary" : tr("السيرفر", "The server")} />
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => copy(video.url)}>
              {tr("نسخ رابط الأصلي", "Copy the original's link")}
            </Button>
          </div>
          {canWrite ? (
            <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/10 pt-4">
              <label className="min-w-0 flex-1">
                <span className="block text-xs text-white/60">{tr("الاسم", "Name")}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1 w-full`} />
              </label>
              <Button size="sm" variant="secondary" onClick={() => rename.mutate()} disabled={!name.trim() || name.trim() === video.displayName} isLoading={rename.isPending}>
                {tr("حفظ الاسم", "Save name")}
              </Button>
              <Button size="sm" variant="danger" onClick={askDelete} isLoading={remove.isPending}>
                {tr("حذف الفيديو", "Delete video")}
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title={tr("حذف الفيديو", "Delete video")}
        message={
          confirmDelete?.usage
            ? tr(`هالفيديو مستعمل بـ ${confirmDelete.usage} مكان (صفحات أو أقسام). إذا انحذف، رح يختفي من هناك. الحذف نهائي، مع كل النسخ.`, "This video is used in {0} places (pages or sections). If deleted, it disappears from there. Deleting is final, with every version.", [confirmDelete.usage])
            : tr("الفيديو وكل نسخه بينحذفوا نهائياً.", "The video and all its versions are deleted for good.")
        }
        confirmText={tr("حذف", "Delete")}
        variant="danger"
        isLoading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmDelete(null)}
      />
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-white/50">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function RenditionRow({ r, canWrite, onDelete }: { r: Rendition; canWrite: boolean; onDelete: () => void }) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid="rendition-row">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{PRESET_TEXT[r.preset].label}</span>
          <Badge size="sm" variant={STATUS_TEXT[r.status].variant} dot={r.status === "processing"}>
            {STATUS_TEXT[r.status].label}
          </Badge>
          {r.bytes ? <span className="text-xs tabular-nums text-white/50">{formatBytes(r.bytes)}</span> : null}
        </div>
        <div className="mt-0.5 text-xs text-white/50">{renditionSummary(r)}</div>
        {r.kind === "hls" && r.status === "ready" ? <div className="mt-0.5 text-[11px] text-white/40">{tr("بيشتغل بالمتجر (بقسم فيديو بالصفحة). المشغّل هون للملفات بس.", "Plays in the store (in a page's video section). The player here is for files only.")}</div> : null}
        {r.status === "failed" && r.error ? <div className="mt-0.5 text-xs text-red-300">{r.error}</div> : null}
      </div>
      <div className="flex shrink-0 gap-2">
        {r.status === "ready" && r.url ? (
          <>
            <Button size="xs" variant="secondary" onClick={() => copy(r.url!)}>
              {tr("نسخ الرابط", "Copy link")}
            </Button>
            <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg px-2 text-xs underline opacity-80 hover:opacity-100">
              {tr("فتح", "Open")}
            </a>
          </>
        ) : null}
        {canWrite ? (
          <Button size="xs" variant="ghost" onClick={onDelete}>
            {tr("حذف", "Delete")}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function ConvertForm({ video, library, onDone }: { video: Video; library: VideoLibrary; onDone: () => void }) {
  const [preset, setPreset] = useState<VideoPreset | "custom" | "hls">(library.settings.defaultPreset);
  const [profile, setProfile] = useState<VideoProfile>(library.presets.web);
  const [stream, setStream] = useState<StreamProfile>(library.streams?.default ?? { ladder: "full_hd", segmentSeconds: 4 });
  const set = <K extends keyof VideoProfile>(k: K, v: VideoProfile[K]) =>
    setProfile((p) => {
      const next = { ...p, [k]: v };
      // A container keeps a codec it takes.
      if (k === "format" && !codecsFor(next.format).includes(next.codec)) next.codec = codecsFor(next.format)[0];
      return next;
    });
  const start = useMutation({
    mutationFn: () =>
      VideosAPI.addRendition(video.id, preset === "custom" ? { preset: "custom", profile } : preset === "hls" ? { preset: "hls", stream } : { preset }),
    onSuccess: () => {
      toast.success(tr("بلّش التحويل", "Conversion started"), { description: tr("بيبيّن جاهز لحاله لما يخلص.", "It shows as ready by itself when done.") });
      onDone();
    },
    onError: (e) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) }),
  });
  if (!library.canConvert) return <p className="mt-3 text-xs text-amber-200">{tr("التحويل بده Cloudinary أو ffmpeg على السيرفر.", "Conversion needs Cloudinary or ffmpeg on the server.")}</p>;
  const summary =
    preset === "hls"
      ? renditionSummary({ kind: "hls", profile: null, stream, heights: (library.streams?.ladders[stream.ladder] ?? []).filter((h) => !video.height || h <= video.height) })
      : profileSummary(preset === "custom" ? profile : library.presets[preset]);
  return (
    <div className="mt-4 space-y-3 border-t border-white/10 pt-4" data-testid="convert-form">
      <span className="text-sm font-medium">{tr("تحويل جديد", "New conversion")}</span>
      <Segmented
        value={preset}
        disabled={false}
        onChange={(v) => {
          setPreset(v);
          if (v !== "custom" && v !== "hls") setProfile(library.presets[v]);
        }}
        options={(Object.keys(PRESET_TEXT) as Array<VideoPreset | "custom" | "hls">).map((k) => ({ value: k, label: PRESET_TEXT[k].label }))}
      />
      <p className="text-xs text-white/50">
        {PRESET_TEXT[preset].hint} <span className="text-white/40">({summary})</span>
      </p>
      {preset === "hls" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="block text-xs text-white/60">{tr("أعلى جودة بالبث", "Best quality in the stream")}</span>
            <Segmented
              value={stream.ladder}
              disabled={false}
              onChange={(v) => setStream((s) => ({ ...s, ladder: v as StreamLadder }))}
              options={(Object.keys(LADDER_TEXT) as StreamLadder[]).map((k) => ({ value: k, label: LADDER_TEXT[k] }))}
            />
          </div>
          {library.provider === "LOCAL" ? (
            <label className="block">
              <span className="block text-xs text-white/60">{tr("طول القطعة (ثانية)", "Piece length (seconds)")}</span>
              <input
                type="number"
                min={2}
                max={10}
                step={1}
                value={stream.segmentSeconds}
                onChange={(e) => setStream((s) => ({ ...s, segmentSeconds: Math.max(2, Math.min(10, Math.round(Number(e.target.value) || 4))) }))}
                className={`${field} mt-1 w-full`}
                dir="ltr"
              />
            </label>
          ) : (
            <p className="self-end text-xs text-white/50">{tr("Cloudinary بيقسم القطع بنفسه.", "Cloudinary cuts the pieces itself.")}</p>
          )}
        </div>
      ) : null}
      {preset === "custom" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Pick label={tr("الصيغة", "Format")} value={profile.format} options={["mp4", "webm"].map((f) => ({ value: f, label: f.toUpperCase() }))} onChange={(v) => set("format", v as VideoProfile["format"])} />
          <Pick label={tr("الترميز", "Codec")} value={profile.codec} options={codecsFor(profile.format).map((c) => ({ value: c, label: CODEC_TEXT[c] }))} onChange={(v) => set("codec", v as VideoProfile["codec"])} />
          <Pick
            label={tr("أعرض شي", "Widest")}
            value={String(profile.maxWidth)}
            options={library.choices.widths.map((w) => ({ value: String(w), label: w ? `${w}px` : tr("الأصلي", "Original") }))}
            onChange={(v) => set("maxWidth", Number(v))}
          />
          <Pick
            label={tr("الإطارات بالثانية", "Frames per second")}
            value={String(profile.fps)}
            options={library.choices.fps.map((f) => ({ value: String(f), label: f ? String(f) : tr("الأصلي", "Original") }))}
            onChange={(v) => set("fps", Number(v))}
          />
          <Pick
            label={tr("الجودة", "Quality")}
            value={profile.quality}
            options={(Object.keys(QUALITY_TEXT) as VideoProfile["quality"][]).map((q) => ({ value: q, label: QUALITY_TEXT[q] }))}
            onChange={(v) => set("quality", v as VideoProfile["quality"])}
          />
          <label className="block">
            <span className="block text-xs text-white/60">{tr("إطار رئيسي كل (ث)", "Keyframe every (s)")}</span>
            <input
              type="number"
              min={0}
              max={10}
              step={0.05}
              value={profile.keyframeSeconds}
              onChange={(e) => set("keyframeSeconds", Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
              className={`${field} mt-1 w-full`}
              dir="ltr"
            />
          </label>
          <div className="col-span-2 flex flex-wrap items-center gap-4 pt-4">
            <Toggle label={tr("بدون صوت", "No sound")} checked={profile.mute} disabled={false} onChange={(v) => set("mute", v)} />
            <Toggle label={tr("قص للتلفون (9:16)", "Crop for phones (9:16)")} checked={profile.crop === "phone"} disabled={false} onChange={(v) => set("crop", v ? "phone" : "none")} />
          </div>
        </div>
      ) : null}
      <Button size="sm" variant="primary" onClick={() => start.mutate()} isLoading={start.isPending}>
        {tr("بدء التحويل", "Start conversion")}
      </Button>
    </div>
  );
}

function Pick({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs text-white/60">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${field} mt-1 w-full`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
