import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { Field } from "./StudioPanels";
import { Choice } from "./StudioTreePanels";
import { Range } from "./LookPanels";
import type { Ids } from "./columns";

type Props = { node: PageTreeNode; lang: Lang; busy: boolean; ids: Ids; onOps: (label: string, ops: PageDraftOp[]) => void };
export function DeckPanel({ node, lang, busy, ids, onOps }: Props) {
  const p = node.props, panels = node.children ?? [];
  // Layers can remove a panel independently of this inspector. Drop its obsolete label.
  const existingLabels = (p.labels ?? {}) as Record<string, Record<string, string>>;
  const labels = Object.fromEntries(panels.filter(panel => existingLabels[panel.id]).map(panel => [panel.id, existingLabels[panel.id]]));
  const initial = Math.max(0, Math.min(panels.length - 1, Number(p.initial) || 0));
  const save = (patch: Record<string, unknown>, ops: PageDraftOp[] = []) => onOps(tr("لوحات العرض", "Presentation panels"), [...ops, { op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const move = (index: number, target: number) => {
    const order = panels.slice(), selected = panels[initial]?.id;
    order.splice(target, 0, ...order.splice(index, 1));
    save({ initial: Math.max(0, order.findIndex(panel => panel.id === selected)) }, [{ op: "move", nodeId: panels[index].id, parentId: node.id, index: target }]);
  };
  const add = () => {
    const id = ids("panel"), title = { ar: "لوحة جديدة", en: "New panel", he: "לוח חדש" }[lang];
    save({ labels: { ...labels, [id]: { [lang]: title } } }, [{ op: "insert", parentId: node.id, index: panels.length, node: { id, type: "stack", props: {}, style: { base: { pad: [40, 24, 40, 24], gap: 20 } }, children: [{ id: ids("h"), type: "heading", props: { level: 2, text: { [lang]: title } } }] } }]);
  };
  return <div className="space-y-3 rounded-xl border border-white/10 p-3" data-testid="studio-deck">
    <Choice label={tr("العرض", "Presentation")} value={String(p.presentation ?? "deck")} options={[["deck", tr("صفحات متتابعة", "Slide pages")], ["tabs", tr("تبويبات", "Tabs")], ["vertical-tabs", tr("تبويبات عمودية", "Vertical tabs")]]} busy={busy} onPick={presentation => save({ presentation })} />
    <Choice label={tr("الانتقال", "Transition")} value={String(p.transition ?? "fade")} options={[["fade", tr("تلاشي", "Fade")], ["slide", tr("انزلاق", "Slide")], ["wipe", tr("كشف", "Wipe")]]} busy={busy} onPick={transition => save({ transition })} />
    <Range label={tr("مدة الانتقال", "Transition duration")} value={typeof p.duration === "number" ? p.duration : .5} min={0} max={2} step={.1} busy={busy} onSave={duration => save({ duration })} />
    <Choice label={tr("اللوحة الأولى", "Initial panel")} value={String(initial)} options={panels.map((panel, i) => [String(i), labels[panel.id]?.[lang] || `${i + 1}`])} busy={busy} onPick={value => save({ initial: Number(value) })} />
    {(["arrows", "dots", "menu"] as const).map(key => <label key={key} className="flex justify-between text-xs"><span>{{ arrows: tr("أسهم التنقل", "Navigation arrows"), dots: tr("نقاط التنقل", "Navigation dots"), menu: tr("قائمة المحتويات", "Contents menu") }[key]}</span><input type="checkbox" disabled={busy} checked={p[key] !== false} onChange={event => save({ [key]: event.target.checked })} /></label>)}
    {panels.map((panel, i) => <div key={panel.id} className="space-y-2 rounded border border-white/10 p-2">
      <Field label={`${tr("لوحة", "Panel")} ${i + 1}`} value={labels[panel.id]?.[lang] || ""} onSave={value => save({ labels: { ...labels, [panel.id]: { ...labels[panel.id], [lang]: value.slice(0, 80) } } })} />
      <div className="flex gap-3 text-xs">
        <button type="button" disabled={busy || i === 0} onClick={() => move(i, i - 1)} data-testid={`deck-panel-up-${panel.id}`}>↑</button>
        <button type="button" disabled={busy || i === panels.length - 1} onClick={() => move(i, i + 1)} data-testid={`deck-panel-down-${panel.id}`}>↓</button>
        <button type="button" disabled={busy} onClick={() => { const next = { ...labels }; delete next[panel.id]; const selected = panels[initial]?.id; const rest = panels.filter(child => child.id !== panel.id); save({ labels: next, initial: Math.max(0, rest.findIndex(child => child.id === selected)) }, [{ op: "remove", nodeId: panel.id }]); }}>{tr("حذف", "Delete")}</button>
      </div>
    </div>)}
    <button type="button" disabled={busy || panels.length >= 12} onClick={add} data-testid="deck-panel-add" className="rounded bg-white/10 px-3 py-2 text-xs">+ {tr("إضافة لوحة", "Add panel")}</button>
  </div>;
}
