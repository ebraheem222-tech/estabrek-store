import type { PageTreeNode, PageDraftOp, TreeScreen } from "../api/pages.api";
import { NumberField } from "./StudioTreePanels";
import { shownLook } from "./look";
import { styleOp } from "./columns";
import { tr } from "../lib/words";
export function PartSizeFields({ node, screen, busy, onOps }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  return <fieldset disabled={busy} className="space-y-2 rounded-xl border border-white/10 p-3" data-testid="studio-part-size">
    {([['width', tr("العرض", "Width")], ['height', tr("الارتفاع", "Height")]] as const).map(([key, label]) => {
      const value = shownLook(node, screen, key);
      return <NumberField key={`${node.id}:${key}:${screen}`} label={label} value={typeof value === "string" && /^\d+(?:\.\d+)?px$/.test(value) ? parseFloat(value) : undefined} min={0} max={4000} suffix="px" testId={`studio-part-${key}`} onSave={v => onOps(label, [styleOp(node, screen, { [key]: v === null ? null : `${v}px` })])} />;
    })}
  </fieldset>;
}
