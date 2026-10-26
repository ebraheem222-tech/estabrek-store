// Picking a video from the library for a page section: the original or one of its
// ready converted versions, with its cover. See features/media/VideosPage.tsx.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import * as VideosAPI from "../../api/videos.api";
import type { Video } from "../../api/videos.api";
import { PRESET_TEXT, durationText, renditionSummary } from "../../features/media/videoText";
import { tr } from "@/lib/words";

export function VideoPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** stream: an adaptive stream (the section's provider becomes HLS). */
  onPick: (pick: { url: string; posterUrl: string | null; video: Video; stream: boolean }) => void;
}) {
  const q = useQuery({ queryKey: ["media", "videos"], queryFn: VideosAPI.getVideoLibrary, enabled: open });
  const [chosen, setChosen] = useState<string | null>(null);
  const video = q.data?.items.find((v) => v.id === chosen) ?? null;
  const pick = (url: string, stream = false) => {
    if (!video) return;
    onPick({ url, posterUrl: video.posterUrl, video, stream });
    onClose();
  };
  return (
    <Modal open={open} title={video ? video.displayName || tr("فيديو", "Video") : tr("اختيار فيديو", "Choose a video")} onClose={onClose} widthClassName="max-w-3xl">
      <div className="max-h-[70vh] overflow-y-auto" data-testid="video-picker">
        {q.isLoading ? (
          <Spinner />
        ) : q.isError ? (
          <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
        ) : video ? (
          <div className="space-y-3">
            <button type="button" className="text-xs underline opacity-70" onClick={() => setChosen(null)}>
              {tr("→ رجوع للفيديوهات", "← Back to videos")}
            </button>
            <p className="text-xs text-white/60">
              {tr("للسكرول نسخة «للسكرول» أحسن: أي مكان بالفيديو بيبيّن فوراً وهو بيتحرك مع الصفحة. للعرض العادي «البث المتكيّف» أحسن: بيتحمّل قطع حسب سرعة النت.", "For scrolling, use the “for scrolling” copy: any moment of the video shows at once as the page moves. For normal playback, “adaptive streaming” is better: it loads in pieces to suit the connection.")}
            </p>
            <ul className="divide-y divide-white/10">
              {video.renditions
                .filter((r) => r.status === "ready" && r.url)
                .map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block text-sm">{PRESET_TEXT[r.preset].label}</span>
                      <span className="block text-xs text-white/50">{renditionSummary(r)}</span>
                    </span>
                    <button type="button" className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15" onClick={() => pick(r.url!, r.kind === "hls")}>
                      {tr("اختيار", "Choose")}
                    </button>
                  </li>
                ))}
              <li className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm">{tr("الأصلي (متل ما انرفع)", "Original (as uploaded)")}</span>
                <button type="button" className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10" onClick={() => pick(video.url)}>
                  {tr("اختيار", "Choose")}
                </button>
              </li>
            </ul>
          </div>
        ) : q.data?.items.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {q.data.items.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => setChosen(v.id)} className="w-full overflow-hidden rounded-xl border border-white/10 text-start hover:border-white/20">
                  <div className="relative aspect-video bg-black/40">
                    {v.posterUrl ? <img src={v.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                    <span className="absolute bottom-1.5 end-1.5 rounded bg-black/70 px-1 text-[11px] text-white">{durationText(v.durationMs)}</span>
                  </div>
                  <div className="truncate p-2 text-xs">{v.displayName || tr("فيديو", "Video")}</div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/60">
            {tr("ما في فيديوهات بالمكتبة.", "No videos in the library.")}{" "}
            <Link to="/admin/media/videos" className="underline">
              {tr("رفع فيديو", "Upload a video")}
            </Link>
          </p>
        )}
      </div>
    </Modal>
  );
}
