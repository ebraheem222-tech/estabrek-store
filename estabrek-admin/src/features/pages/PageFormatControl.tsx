// The new CMS (track B): shows whether a page is drawn from its sections or from its
// tree, and switches it. Converting keeps every section as it is (an "old section"
// in the tree), so the shop looks the same; switching back is one click.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as PagesAPI from "../../api/pages.api";
import { getApiErrorMessage } from "../../api/http";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { toast } from "../../lib/toast";
import { tr } from "@/lib/words";

export function PageFormatControl({ page }: { page: Pick<PagesAPI.Page, "id" | "name" | "format"> }) {
  const qc = useQueryClient();
  const [asking, setAsking] = useState(false);
  const isTree = page.format === 2;
  const next: PagesAPI.PageFormat = isTree ? 1 : 2;
  const switchIt = useMutation({
    mutationFn: () => PagesAPI.setPageFormat(page.id, next),
    onSuccess: async () => {
      setAsking(false);
      toast.success(next === 2 ? tr("الصفحة صارت بالشكل الجديد", "The page is in the new format") : tr("الصفحة رجعت للأقسام", "The page is back to sections"));
      await qc.invalidateQueries({ queryKey: ["pages"] });
    },
    onError: (e) => toast.error(tr("ما تغيّر شكل الصفحة", "The page format didn't change"), { description: getApiErrorMessage(e) }),
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2" data-testid="page-format">
      <span
        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] ${isTree ? "bg-accent-500/15 text-accent-200" : "bg-white/[0.06] text-white/55"}`}
        title={isTree ? tr("بتنعرض من شجرة العناصر (المحرر الجديد)", "Drawn from its element tree (the new editor)") : tr("بتنعرض من قائمة الأقسام", "Drawn from its list of sections")}
      >
        {isTree ? tr("الشكل الجديد", "New format") : tr("أقسام", "Sections")}
      </span>
      <Link to={`/studio/${page.id}`} className="rounded-lg bg-accent-500/15 px-2 py-1 text-[11px] text-accent-100 hover:bg-accent-500/25" data-testid="page-studio">
        {tr("المحرر الجديد", "New editor")}
      </Link>
      <button type="button" onClick={() => setAsking(true)} className="rounded-lg px-2 py-1 text-[11px] text-accent-300 hover:bg-accent-500/10" data-testid="page-format-switch">
        {isTree ? tr("رجوع للأقسام", "Back to sections") : tr("تحويل للشكل الجديد", "Convert to the new format")}
      </button>
      <ConfirmDialog
        open={asking}
        title={next === 2 ? tr(`تحويل «${page.name}» للشكل الجديد؟`, "Convert “{0}” to the new format?", [page.name]) : tr(`رجوع «${page.name}» للأقسام؟`, "Take “{0}” back to sections?", [page.name])}
        message={
          next === 2
            ? tr(
                "كل قسم بيضل متل ما هو، كـ«قسم قديم» جوّا الشجرة، فالمتجر ما بيتغيّر. الأقسام بتضل تتعدّل من هون، والرجوع بكبسة. بتنحفظ نسخة قبل التحويل.",
                "Every section stays as it is, as an “old section” in the tree, so the shop doesn't change. The sections can still be edited here, and going back is one click. A revision is saved first.",
              )
            : tr(
                "المتجر بيرجع يعرض الصفحة من أقسامها. الشجرة بتضل محفوظة، وبتنحفظ نسخة قبل الرجوع.",
                "The shop goes back to drawing the page from its sections. The tree stays saved, and a revision is saved first.",
              )
        }
        confirmText={next === 2 ? tr("تحويل", "Convert") : tr("رجوع", "Go back")}
        cancelText={tr("إلغاء", "Cancel")}
        variant={next === 2 ? "info" : "warning"}
        isLoading={switchIt.isPending}
        onConfirm={() => switchIt.mutate()}
        onClose={() => setAsking(false)}
      />
    </div>
  );
}
