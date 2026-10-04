import React, { useState } from "react";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { MediaLibraryModal } from "../../components/media/MediaLibraryModal";

export default function MediaCenterPage() {
  const [open, setOpen] = useState(true);

  return (
    <div dir="rtl" className="space-y-4">
      <PageHeader
        title="مركز الوسائط"
        subtitle="إدارة الصور، المجلدات، الوسوم، التكرارات، والاستخدامات"
        right={
          <Button variant="primary" onClick={() => setOpen(true)}>
            فتح المكتبة
          </Button>
        }
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold text-white">الصور</div>
            <div className="mt-1 text-xs text-white/50">رفع، بحث، معاينة، وتعديل البيانات</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold text-white">المجلدات والوسوم</div>
            <div className="mt-1 text-xs text-white/50">تنظيم سريع للصور المستخدمة في المتجر</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold text-white">التكرارات والاستخدام</div>
            <div className="mt-1 text-xs text-white/50">تنظيف آمن بدون حذف صور مستخدمة</div>
          </div>
        </div>
      </div>

      <MediaLibraryModal open={open} onClose={() => setOpen(false)} title="مركز الوسائط" />
    </div>
  );
}
