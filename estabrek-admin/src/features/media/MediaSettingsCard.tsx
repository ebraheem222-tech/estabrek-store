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

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

const FORMAT_TEXT: Record<MediaSettings["images"]["format"], string> = { keep: "متل ما هي", webp: "WebP", avif: "AVIF", jpeg: "JPEG" };

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
      toast.success("انحفظت إعدادات الرفع", { description: describeChanged(out.changed) });
      qc.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (e) => toast.error("ما انحفظ", { description: getApiErrorMessage(e) }),
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
      <h2 className="font-semibold">إعدادات الرفع</h2>
      <p className="mt-1 text-xs text-white/60">شو بصير بالصور والفيديوهات لما تنرفع. ما بتغيّر الملفات اللي انرفعت قبل.</p>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">الصور</h3>
          <Toggle
            label="شيل المعلومات المخفية من الصور"
            help="صور التلفون فيها نوع الجهاز ومكان التصوير (GPS). بتنحفظ الصورة من جديد بدونها، بجودة عالية."
            checked={draft.images.stripMetadata}
            disabled={!canWrite}
            onChange={(v) => img("stripMetadata", v)}
          />
          <NumberInput
            id="media-img-max"
            label="أكبر حجم للصورة"
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
            label="أطول ضلع"
            unit="px"
            help="الصور الأكبر بتصغر لهالقد. 0 = تلقائي (4000 مع Cloudinary، 2000 على السيرفر)."
            hint={(v) => (v === 0 ? "تلقائي" : `${v}px`)}
            value={draft.images.maxDimension}
            def={defaults.images.maxDimension}
            limits={limits.maxDimension}
            invalid={bad(draft.images.maxDimension, limits.maxDimension)}
            disabled={!canWrite}
            onChange={(v) => img("maxDimension", v)}
          />
          <div>
            <span className="text-sm font-medium">احفظها كـ</span>
            <p className="mt-0.5 text-xs text-white/50">المتجر أصلاً بيبعت AVIF/WebP للزباين عن طريق Cloudinary. هاد بس للملف المحفوظ.</p>
            <Segmented
              value={draft.images.format}
              disabled={!canWrite}
              onChange={(v) => img("format", v)}
              options={(Object.keys(FORMAT_TEXT) as Array<MediaSettings["images"]["format"]>).map((k) => ({ value: k, label: FORMAT_TEXT[k] }))}
            />
          </div>
          <NumberInput
            id="media-img-q"
            label="الجودة لما تنحفظ من جديد"
            unit="%"
            hint={(v) => (v === 0 ? "تلقائي: 90" : `${v}%`)}
            value={draft.images.quality}
            def={defaults.images.quality}
            limits={limits.quality}
            invalid={bad(draft.images.quality, limits.quality)}
            disabled={!canWrite}
            onChange={(v) => img("quality", v)}
          />
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-medium">الفيديوهات</h3>
          <NumberInput
            id="media-vid-max"
            label="أكبر حجم للفيديو"
            unit="MB"
            value={draft.videos.maxUploadMb}
            def={defaults.videos.maxUploadMb}
            limits={limits.videoMaxUploadMb}
            invalid={bad(draft.videos.maxUploadMb, limits.videoMaxUploadMb)}
            disabled={!canWrite}
            onChange={(v) => vid("maxUploadMb", v)}
          />
          <Toggle
            label="اعمل نسخة تلقائياً بعد الرفع"
            checked={draft.videos.autoConvert}
            disabled={!canWrite}
            onChange={(v) => vid("autoConvert", v)}
          />
          <div className={draft.videos.autoConvert ? "" : "opacity-50"}>
            <span className="text-sm font-medium">النسخة التلقائية</span>
            <Segmented
              value={draft.videos.defaultPreset}
              disabled={!canWrite || !draft.videos.autoConvert}
              onChange={(v) => vid("defaultPreset", v)}
              options={q.data.presets.map((p) => ({ value: p, label: PRESET_TEXT[p].label }))}
            />
          </div>
          <NumberInput
            id="media-vid-poster"
            label="الغلاف من الثانية"
            unit="ثانية"
            help="صورة الغلاف بتنعمل من هالإطار. بتقدر تغيّرها بعدين من الفيديو."
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
          {invalid ? <span className="text-xs text-red-300">في قيم برّا الحد المسموح</span> : null}
          <Button variant="ghost" onClick={() => setDraft(q.data.media)}>
            تراجع
          </Button>
          <Button variant="primary" onClick={() => save.mutate()} isLoading={save.isPending} disabled={invalid}>
            حفظ
          </Button>
        </div>
      ) : null}
    </section>
  );
}
