import type { PageTreeNode } from "../api/pages.api";
import { tr } from "../lib/words";
import { typeLabel } from "./treeIndex";

type ObjectKind = "svg" | "model3d";

/** Direct access to a section's nested drawings/models, including legacy overlays. */
export function SectionObjectsPanel({ node, selected, busy, canAdd, onAdd, onSelect }: {
  node: PageTreeNode;
  selected: string | null;
  busy: boolean;
  canAdd: (kind: ObjectKind) => boolean;
  onAdd: (kind: ObjectKind) => void;
  onSelect: (id: string) => void;
}) {
  const objects: PageTreeNode[] = [];
  const walk = (n: PageTreeNode) => {
    if (n.type === "svg" || n.type === "model3d") objects.push(n);
    n.children?.forEach(walk);
  };
  node.children?.forEach(walk);
  return <div className="space-y-2 rounded-xl border border-white/[0.08] p-3" data-testid="studio-section-objects">
    <div className="text-xs font-medium text-white/70">{tr("رسمات وموديلات هذا القسم", "This section's drawings and models")}</div>
    <p className="text-[11px] leading-5 text-white/45">{tr("اختَر العنصر لتعديل رسمته أو ملفه وإعداداته.", "Select an object to edit its drawing or file and settings.")}</p>
    <div className="flex flex-wrap gap-1">
      {(["svg", "model3d"] as const).map(kind => <button key={kind} type="button" disabled={busy || !canAdd(kind)} onClick={() => onAdd(kind)} className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40" data-testid={`studio-section-add-${kind}`}>
        {kind === "svg" ? tr("إضافة رسمة SVG", "Add an SVG drawing") : tr("إضافة موديل 3D", "Add a 3D model")}
      </button>)}
    </div>
    {objects.length ? <div className="flex flex-wrap gap-1">{objects.map(object => <button key={object.id} type="button" aria-pressed={selected === object.id} disabled={busy} onClick={() => onSelect(object.id)} data-node={object.id} className={`rounded-lg border px-2 py-1 text-xs disabled:opacity-40 ${selected === object.id ? "border-accent-400/60 bg-accent-500/20" : "border-white/10 hover:bg-white/[0.06]"}`}>
      {object.name || typeLabel(object.type)}
    </button>)}</div> : null}
  </div>;
}
