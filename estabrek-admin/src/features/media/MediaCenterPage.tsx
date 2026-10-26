import React, { useState } from "react";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { MediaLibraryModal } from "../../components/media/MediaLibraryModal";
import { Link } from "react-router-dom";
import { MediaSettingsCard } from "./MediaSettingsCard";
import { tr } from "@/lib/words";

export default function MediaCenterPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr("مركز الوسائط", "Media centre")}
        subtitle={tr("إدارة الصور، المجلدات، الوسوم، التكرارات، والاستخدامات", "Manage photos, folders, tags, duplicates and uses")}
        right={
          <Button variant="primary" onClick={() => setOpen(true)}>
            {tr("فتح المكتبة", "Open the library")}
          </Button>
        }
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold text-white">{tr("الصور", "Photos")}</div>
            <div className="mt-1 text-xs text-white/50">{tr("رفع، بحث، معاينة، وتعديل البيانات", "Upload, search, preview and edit details")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold text-white">{tr("المجلدات والوسوم", "Folders and tags")}</div>
            <div className="mt-1 text-xs text-white/50">{tr("تنظيم سريع للصور المستخدمة في المتجر", "Quick sorting of the photos the store uses")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold text-white">{tr("التكرارات والاستخدام", "Duplicates and uses")}</div>
            <div className="mt-1 text-xs text-white/50">{tr("تنظيف آمن بدون حذف صور مستخدمة", "Safe clean-up without deleting photos in use")}</div>
          </div>
        </div>
        <Link
          to="/admin/media/videos"
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/20"
          data-testid="videos-link"
        >
          <span>
            <span className="block text-sm font-semibold text-white">{tr("الفيديوهات", "Videos")}</span>
            <span className="mt-1 block text-xs text-white/50">{tr("رفع كبير بقطع، تحويل لنسخ (عرض، سكرول، تلفون)، وصور من الفيديو", "Big uploads in pieces, conversion to versions (playback, scroll, phone), and photos from the video")}</span>
          </span>
          <span aria-hidden>←</span>
        </Link>
      </div>

      <MediaSettingsCard />

      <MediaLibraryModal open={open} onClose={() => setOpen(false)} title={tr("مركز الوسائط", "Media centre")} />
    </div>
  );
}
