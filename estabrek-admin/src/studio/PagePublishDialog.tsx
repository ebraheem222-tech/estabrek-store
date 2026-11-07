import { useState } from "react";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { tr } from "../lib/words";
import type { Page, PublishChoices } from "../api/pages.api";

type Props = { page: Page; force: boolean; busy: boolean; initialOptions?: Partial<PublishChoices>; onClose: () => void; onConfirm: (choices: PublishChoices) => void | Promise<void> };

export function PagePublishDialog({ page, force, busy, initialOptions, onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<PublishChoices["mode"]>(initialOptions?.mode ?? "keep_schedule");
  const [republishArchived, setRepublishArchived] = useState(initialOptions?.republishArchived ?? false);
  const hasWindow = Boolean(page.publishAt || page.unpublishAt);
  return <Modal open title={force ? tr("الصفحة تغيّرت من مكان تاني", "The page changed elsewhere") : tr("نشر التغييرات؟", "Publish the changes?")} onClose={() => { if (!busy) onClose(); }} disableBackdropClose={busy} widthClassName="max-w-lg" footer={null}>
    <div className="space-y-4" data-testid="page-publish-dialog">
      <p className="text-sm text-white/65">{force
        ? tr("النشر بيكتب المسودة فوق تغييرات المحتوى الأحدث، مع حفظ النسخة الحالية بالسجل. حالة النشر والمواعيد لازم تضل مطابقة للمراجعة.", "Publishing replaces newer content with this draft and keeps a revision. Publication status and dates must still match your review.")
        : tr("بتنحفظ نسخة بالسجل قبل النشر. ظهور الصفحة للزوار يعتمد على المواعيد وتحديث الموقع.", "A revision is kept before publishing. Public availability depends on the publication window and storefront refresh.")}</p>
      {hasWindow ? <div className="space-y-2 rounded-xl border border-white/10 p-3 text-sm" data-testid="page-publish-window">
        <p>{tr("مواعيد النشر الحالية", "Current publication window")}</p>
        {page.publishAt ? <p className="text-xs text-white/60">{tr("تبدأ", "Starts")}: <time dateTime={page.publishAt}>{new Date(page.publishAt).toLocaleString()}</time></p> : null}
        {page.unpublishAt ? <p className="text-xs text-white/60">{tr("تنتهي", "Ends")}: <time dateTime={page.unpublishAt}>{new Date(page.unpublishAt).toLocaleString()}</time></p> : null}
        <label className="flex items-center gap-2"><input type="radio" name="publication-mode" checked={mode === "keep_schedule"} disabled={busy} onChange={() => setMode("keep_schedule")} data-testid="page-publish-keep-schedule" />{tr("انشر المحتوى مع الحفاظ على المواعيد", "Publish content and keep the dates")}</label>
        <label className="flex items-center gap-2"><input type="radio" name="publication-mode" checked={mode === "now"} disabled={busy} onChange={() => setMode("now")} data-testid="page-publish-now" />{tr("انشر الآن وألغِ مواعيد البداية والنهاية", "Publish now and clear the start and end dates")}</label>
      </div> : null}
      {page.status === "ARCHIVED" ? <label className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200"><input type="checkbox" checked={republishArchived} disabled={busy} onChange={(event) => setRepublishArchived(event.target.checked)} data-testid="page-publish-archive" />{tr("أريد إعادة نشر هذه الصفحة المؤرشفة", "I want to republish this archived page")}</label> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={busy} onClick={onClose}>{tr("إلغاء", "Cancel")}</Button>
        <Button variant={force ? "danger" : "primary"} isLoading={busy} disabled={page.status === "ARCHIVED" && !republishArchived} onClick={() => void onConfirm({ mode, republishArchived })} data-testid="page-publish-confirm">{tr("نشر", "Publish")}</Button>
      </div>
    </div>
  </Modal>;
}
