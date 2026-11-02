/**
 * The old page editor is retiring (track B, phase 8): every page opens in the new editor,
 * which turns old sections into its own elements. The old one stays at /admin/pages/:id/classic
 * for a while, behind this notice, until no page needs it.
 */
import { Link, Navigate, useParams } from "react-router-dom";
import { tr } from "../../lib/words";

/** /admin/pages/:id: the page in the new editor. */
export function OpenInStudio() {
  const { id } = useParams();
  return <Navigate to={`/studio/${encodeURIComponent(id ?? "")}`} replace />;
}

export function OldEditorNotice() {
  const { id } = useParams();
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100" role="note" data-testid="old-editor-notice">
      <span className="me-auto">
        {tr(
          "المحرر القديم رح ينشال. كل الصفحات بتنفتح بالمحرر الجديد، وفيه بتقدر تحوّل الأقسام القديمة لعناصر جديدة.",
          "The old editor is retiring. Every page opens in the new editor, where old sections can be turned into new elements.",
        )}
      </span>
      <Link to={`/studio/${encodeURIComponent(id ?? "")}`} className="rounded-lg bg-accent-500 px-2.5 py-1 font-medium text-white hover:bg-accent-400" data-testid="old-editor-open-new">
        {tr("افتحها بالمحرر الجديد", "Open it in the new editor")}
      </Link>
    </div>
  );
}
