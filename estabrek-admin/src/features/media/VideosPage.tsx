// الفيديوهات: upload videos (straight to Cloudinary in pieces, or to the server),
// convert them (presets or custom), pick frames as images or as the cover, and copy
// the links for the pages. See useVideoUploads.ts and VideoDetail.tsx.
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { useAuth } from "../../hooks/useAuth";
import * as VideosAPI from "../../api/videos.api";
import type { Video } from "../../api/videos.api";
import { formatBytes } from "../system/cacheText";
import { ACCEPT_VIDEO, durationText, isVideoFile, renditionsLine, speedText } from "./videoText";
import { useVideoUploads, type UploadItem } from "./useVideoUploads";
import { VideoDetail } from "./VideoDetail";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

export default function VideosPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("media:write");
  const q = useQuery({
    queryKey: ["media", "videos"],
    queryFn: VideosAPI.getVideoLibrary,
    // While a conversion is being made, look again every few seconds.
    refetchInterval: (query) => (query.state.data?.items.some((v) => v.renditions.some((r) => r.status === "processing")) ? 4000 : false),
  });
  const lib = q.data;
  const maxBytes = (lib?.settings.maxUploadMb ?? 500) * 1024 * 1024;
  const uploads = useVideoUploads({
    provider: lib?.provider,
    maxBytes,
    onDone: () => qc.invalidateQueries({ queryKey: ["media", "videos"] }),
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const open = lib?.items.find((v) => v.id === openId) ?? null;

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter(isVideoFile);
    if (files.length) uploads.add(files);
  };

  return (
    <div dir="rtl" className="space-y-4" data-testid="videos-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">الفيديوهات</h1>
        <p className="mt-1 text-sm text-white/60">
          ارفع الفيديو مرة وحدة، وحوّله لنسخ للعرض العادي أو للسكرول أو للتلفون، وطلّع منه صور (غلاف أو صور للمنتجات). انسخ الرابط وحطه بقسم الفيديو بأي صفحة، أو
          اختاره من «اختار من الفيديوهات» بمحرر الصفحات.
        </p>
        {lib ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge size="sm" variant={lib.provider === "CLOUDINARY" ? "success" : "default"}>
              {lib.provider === "CLOUDINARY" ? "Cloudinary: بيرفع مباشرة بقطع" : "على السيرفر (بدون Cloudinary)"}
            </Badge>
            <Badge size="sm" variant={lib.canConvert ? "success" : "warning"}>
              {lib.canConvert ? "التحويل شغّال" : "التحويل بدو Cloudinary أو ffmpeg"}
            </Badge>
            <Badge size="sm">الحد {lib.settings.maxUploadMb} MB</Badge>
            {lib.settings.autoConvert ? <Badge size="sm">بعد الرفع: نسخة تلقائية</Badge> : null}
          </div>
        ) : null}
        {lib && lib.provider === "LOCAL" ? (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            بدون Cloudinary الفيديو بينحفظ على قرص السيرفر. على Railway القرص بيتفضّى مع كل نشر جديد، فهاد بس للتجربة على جهازك.
          </p>
        ) : null}
      </section>

      {canWrite ? (
        <section
          className={`${box} border-dashed ${drag ? "border-pink-400/70 bg-pink-500/5" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            take(e.dataTransfer.files);
          }}
          data-testid="video-drop"
        >
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm">اسحب فيديوهات لهون، أو</p>
            <Button variant="primary" onClick={() => input.current?.click()} disabled={!lib}>
              اختار فيديو
            </Button>
            <p className="text-xs text-white/50">MP4، WebM أو MOV. الفيديوهات الكبيرة بتنبعت بقطع، وإذا انقطع النت بتكمّل من مكانها.</p>
            <input
              ref={input}
              type="file"
              accept={ACCEPT_VIDEO}
              multiple
              className="hidden"
              onChange={(e) => {
                take(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          {uploads.items.length ? (
            <ul className="mt-2 divide-y divide-white/10" data-testid="upload-queue">
              {uploads.items.map((u) => (
                <UploadRow key={u.id} item={u} onPause={() => uploads.pause(u.id)} onResume={() => uploads.resume(u.id)} onRemove={() => uploads.remove(u.id)} />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className={box}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">المكتبة</h2>
          {lib ? <span className="text-xs text-white/50">{lib.items.length} فيديو</span> : null}
        </div>
        {q.isLoading ? (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Spinner /> جاري التحميل…
          </div>
        ) : q.isError ? (
          <div className="mt-3 text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
        ) : lib && lib.items.length ? (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="video-list">
            {lib.items.map((v) => (
              <VideoCard key={v.id} video={v} onOpen={() => setOpenId(v.id)} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-white/60">لسا ما في فيديوهات.</p>
        )}
      </section>

      {open && lib ? <VideoDetail video={open} library={lib} canWrite={canWrite} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

function UploadRow({ item, onPause, onResume, onRemove }: { item: UploadItem; onPause: () => void; onResume: () => void; onRemove: () => void }) {
  const fraction = item.file.size ? item.sent / item.file.size : 0;
  const label =
    item.status === "waiting"
      ? "بالدور"
      : item.status === "uploading"
        ? speedText(item.speed, item.file.size - item.sent) || "عم يرفع…"
        : item.status === "paused"
          ? "موقّف"
          : item.status === "saving"
            ? "عم يتجهّز…"
            : item.status === "done"
              ? "انرفع"
              : item.error || "ما زبط";
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center" data-testid="upload-row">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate" dir="ltr" style={{ textAlign: "right" }}>
            {item.file.name}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-white/50">
            {formatBytes(item.sent)} / {formatBytes(item.file.size)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${item.status === "failed" ? "bg-red-400" : item.status === "done" ? "bg-emerald-400" : "bg-pink-400"}`}
            style={{ width: `${Math.round(fraction * 100)}%` }}
          />
        </div>
        <p className={`mt-1 text-xs ${item.status === "failed" ? "text-red-300" : "text-white/50"}`}>{label}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {item.status === "uploading" ? (
          <Button size="xs" variant="ghost" onClick={onPause}>
            وقّف
          </Button>
        ) : null}
        {item.status === "paused" || item.status === "failed" ? (
          <Button size="xs" variant="secondary" onClick={onResume}>
            كمّل
          </Button>
        ) : null}
        {item.status !== "saving" ? (
          <Button size="xs" variant="ghost" onClick={onRemove}>
            {item.status === "done" ? "إخفاء" : "إلغاء"}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function VideoCard({ video, onOpen }: { video: Video; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-right hover:border-white/20" data-testid="video-card">
        <div className="relative aspect-video w-full bg-black/40">
          {video.posterUrl ? <img src={video.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
          <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] tabular-nums text-white">{durationText(video.durationMs)}</span>
        </div>
        <div className="p-3">
          <div className="truncate text-sm font-medium">{video.displayName || "فيديو"}</div>
          <div className="mt-1 text-[11px] text-white/50">
            {[video.width && video.height ? `${video.width}×${video.height}` : null, video.fps ? `${Math.round(video.fps)} إطار` : null, formatBytes(video.size)].filter(Boolean).join(" · ")}
          </div>
          <div className="mt-1 text-[11px] text-white/60">{renditionsLine(video.renditions)}</div>
        </div>
      </button>
    </li>
  );
}
