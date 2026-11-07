import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { CardDesignFields, InteractionFields } from "../features/settings/VisualControlsForm";
import { tr } from "../lib/words";
import type { InteractionEvent } from "../../../estabrek-storefront/src/lib/visualControls";
export function VisualControlsPanel({ node, targets, busy, onOps, onTest }: { node: PageTreeNode; targets: { id: string; label: string }[]; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void; onTest: (event: InteractionEvent) => void }) {
  const set = (key: string, value: unknown) => { const props = { ...node.props }; if (value === undefined) delete props[key]; else props[key] = value; onOps(tr("تخصيص البطاقة والتفاعل", "Card and interaction override"), [{ op: "setProps", nodeId: node.id, props, ...(node.type === "page" ? { controls: true as const } : {}) }]); };
  return <div className="space-y-3" data-testid="studio-visual-controls">
    {["page", "shop", "products"].includes(node.type) && <CardDesignFields value={node.props?.cardDesign} disabled={busy} onChange={value => set("cardDesign", value)} />}
    <InteractionFields value={node.props?.interactions} disabled={busy} onChange={value => set("interactions", value)} targets={targets} onTest={onTest} />
  </div>;
}
