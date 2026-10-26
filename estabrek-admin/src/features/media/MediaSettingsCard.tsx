// إعدادات الرفع: what happens to images and videos when they're uploaded (size
// limits, removing the hidden data from photos, format and quality, the first
// conversion and the cover of a video). Saved in the same history as السرعة والكاش.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as VideosAPI from "../../api/videos.api";
import type { MediaSettings } from "../../api/videos.api";
import { NumberInput, Segmented, Toggle } from "../system/cacheParts";
import { describeChanged } from "../system/cacheText";
import { PRESET_TEXT } from "./videoText";
import { tr } from "@/lib/words";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

const FORMAT_TEXT: Record<MediaSettings["images"]["format"], string> = { keep: tr("متل ما هي", "As it is"), webp: "WebP", avif: "AVIF", jpeg: "JPEG" };

export function MediaSettingsCard() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("media:write");
  const q = useQuery({ queryKey: ["media", "settings"], queryFn: VideosAPI.getMediaSettings });
  const [draft, setDraft] = useState<MediaSettings | null>(null);
  const [seen, setSeen] = useState<MediaSettings | null>(null);
  if (q.data && q.data.media !== seen) {
    setSeen(q.data.media);
    setDraft(q.data.media);
  }
  const patch = useMemo(() => {
    if (!draft || !q.data) return {};
    const out: { images?: Partial<MediaSettings["images"]>; videos?: Partial<MediaSettings["videos"]> } = {};
    for (const part of ["images", "videos"] as const) {
      const diff: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(draft[part])) if (v !== (q.data.media[part] as Record<string, unknown>)[k]) diff[k] = v;
      if (Object.keys(diff).length) (out as Record<string, unknown>)[part] = diff;
    }
    return out;
  }, [draft, q.data]);
  const dirty = Object.keys(patch).length > 0;
  const save = useMutation({
    mutationFn: () => VideosAPI.saveMediaSettings(patch),
    onSuccess: (out) => {
      toast.success(tr("انحفظت إعدادات الرفع", "Upload settings saved"), { description: describeChanged(out.changed) });
      qc.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (e) => toast.error(tr("ما انحفظ", "Not saved"), { description: getApiErrorMessage(e) }),
  });

  if (!q.data || !draft) {
    return (
      <section className={box}>
        {q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}
      </section>
    );
  }
  const { limits, defaults } = q.data;
  const img = <K extends keyof MediaSettings["images"]>(k: K, v: MediaSettings["images"][K]) => setDraft((d) => (d ? { ...d, images: { ...d.images, [k]: v } } : d));
  const vid = <K extends keyof MediaSettings["videos"]>(k: K, v: MediaSettings["videos"][K]) => setDraft((d) => (d ? { ...d, videos: { ...d.videos, [k]: v } } : d));
  const bad = (v: number, l: { min: number; max: number }) => !Number.isInteger(v) || v < l.min || v > l.max;
  const invalid =
    bad(draft.images.maxUploadMb, limits.imageMaxUploadMb) ||
    bad(draft.images.maxDimension, limits.maxDimension) ||
    bad(draft.images.quality, limits.quality) ||
    bad(draft.videos.maxUploadMb, limits.videoMaxUploadMb) ||
    bad(draft.videos.posterSecond, limits.posterSecond);

  return (
    <section className={box} data-testid="media-settings">
      <h2 className="font-semibold">{tr("إعدادات الرفع", "Upload settings")}</h2>
      <p className="mt-1 text-xs text-white/60">{tr("شو بصير بالصور والفيديوهات لما تنرفع. ما بتغيّر الملفات اللي انرفعت قبل.", "What happens to photos and videos when they're uploaded. Files uploaded before don't change.")}</p>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">{tr("الصور", "Photos")}</h3>
          <Toggle
            label={tr("حذف المعلومات المخفية من الصور", "Remove hidden info from photos")}
            help={tr("صور التلفون فيها نوع الجهاز ومكان التصوير (GPS). بتنحفظ الصورة من جديد بدونها، بجودة عالية.", "Phone photos hold the device model and where they were taken (GPS). The photo is saved again without them, at high quality.")}
            checked={draft.images.stripMetadata}
            disabled={!canWrite}
            onChange={(v) => img("stripMetadata", v)}
          />
          <NumberInput
            id="media-img-max"
            label={tr("أكبر حجم للصورة", "Largest photo size")}
            unit="MB"
            value={draft.images.maxUploadMb}
            def={defaults.images.maxUploadMb}
            limits={limits.imageMaxUploadMb}
            invalid={bad(draft.images.maxUploadMb, limits.imageMaxUploadMb)}
            disabled={!canWrite}
            onChange={(v) => img("maxUploadMb", v)}
          />
          <NumberInput
            id="media-img-dim"
            label={tr("أطول ضلع", "Longest side")}
            unit="px"
            help={tr("الصور الأكبر بتصغر لهالقد. 0 = تلقائي (4000 مع Cloudinary، 2000 على السيرفر).", "Bigger photos are shrunk to this. 0 = automatic (4000 with Cloudinary, 2000 on the server).")}
            hint={(v) => (v === 0 ? tr("تلقائي", "Automatic") : `${v}px`)}
            value={draft.images.maxDimension}
            def={defaults.images.maxDimension}
            limits={limits.maxDimension}
            invalid={bad(draft.images.maxDimension, limits.maxDimension)}
            disabled={!canWrite}
            onChange={(v) => img("maxDimension", v)}
          />
          <div>
            <span className="text-sm font-medium">{tr("الحفظ كـ", "Save as")}</span>
            <p className="mt-0.5 text-xs text-white/50">{tr("المتجر أصلاً بيبعت AVIF/WebP للزباين عن طريق Cloudinary. هاد بس للملف المحفوظ.", "The store already sends AVIF/WebP to customers through Cloudinary. This is only for the saved file.")}</p>
            <Segmented
              value={draft.images.format}
              disabled={!canWrite}
              onChange={(v) => img("format", v)}
              options={(Object.keys(FORMAT_TEXT) as Array<MediaSettings["images"]["format"]>).map((k) => ({ value: k, label: FORMAT_TEXT[k] }))}
            />
          </div>
          <NumberInput
            id="media-img-q"
            label={tr("الجودة لما تنحفظ من جديد", "Quality when saved again")}
            unit="%"
            hint={(v) => (v === 0 ? tr("تلقائي: 90", "Automatic: 90") : `${v}%`)}
            value={draft.images.quality}
            def={defaults.images.quality}
            limits={limits.quality}
            invalid={bad(draft.images.quality, limits.quality)}
            disabled={!canWrite}
            onChange={(v) => img("quality", v)}
          />
          <Toggle
            label={tr("شيل الخلفية بـ Cloudinary كمان", "Also remove backgrounds with Cloudinary")}
            help={tr(
              "«شيل الخلفية» بيشتغل مجاناً على الجهاز. لما هاد يكون شغّال، بينضاف خيار Cloudinary: كل صورة بتنحسب 75 تحويلة من باقة Cloudinary (يعني مدفوع).",
              "«Remove background» runs free on the device. When this is on, Cloudinary is offered too: each picture counts as 75 transformations of the Cloudinary plan (paid).",
            )}
            checked={draft.images.cloudCutout}
            disabled={!canWrite}
            onChange={(v) => img("cloudCutout", v)}
          />
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-medium">{tr("الفيديوهات", "Videos")}</h3>
          <NumberInput
            id="media-vid-max"
            label={tr("أكبر حجم للفيديو", "Largest video size")}
            unit="MB"
            value={draft.videos.maxUploadMb}
            def={defaults.videos.maxUploadMb}
            limits={limits.videoMaxUploadMb}
            invalid={bad(draft.videos.maxUploadMb, limits.videoMaxUploadMb)}
            disabled={!canWrite}
            onChange={(v) => vid("maxUploadMb", v)}
          />
          <Toggle
            label={tr("نسخة تلقائية بعد الرفع", "Make a version automatically after upload")}
            checked={draft.videos.autoConvert}
            disabled={!canWrite}
            onChange={(v) => vid("autoConvert", v)}
          />
          <div className={draft.videos.autoConvert ? "" : "opacity-50"}>
            <span className="text-sm font-medium">{tr("النسخة التلقائية", "The automatic version")}</span>
            <Segmented
              value={draft.videos.defaultPreset}
              disabled={!canWrite || !draft.videos.autoConvert}
              onChange={(v) => vid("defaultPreset", v)}
              options={q.data.presets.map((p) => ({ value: p, label: PRESET_TEXT[p].label }))}
            />
          </div>
          <NumberInput
            id="media-vid-poster"
            label={tr("الغلاف من الثانية", "Cover from second")}
            unit={tr("ثانية", "seconds")}
            help={tr("صورة الغلاف بتنعمل من هالإطار. بتتغيّر بعدين من الفيديو.", "The cover is made from this frame. It can be changed later from the video.")}
            value={draft.videos.posterSecond}
            def={defaults.videos.posterSecond}
            limits={limits.posterSecond}
            invalid={bad(draft.videos.posterSecond, limits.posterSecond)}
            disabled={!canWrite}
            onChange={(v) => vid("posterSecond", v)}
          />
        </div>
      </div>
      {canWrite && dirty ? (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
          {invalid ? <span className="text-xs text-red-300">{tr("في قيم برّا الحد المسموح", "Some values are outside the allowed range")}</span> : null}
          <Button variant="ghost" onClick={() => setDraft(q.data.media)}>
            {tr("تراجع", "Undo")}
          </Button>
          <Button variant="primary" onClick={() => save.mutate()} isLoading={save.isPending} disabled={invalid}>
            {tr("حفظ", "Save")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
