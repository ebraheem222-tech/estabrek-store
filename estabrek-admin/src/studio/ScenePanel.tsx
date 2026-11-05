import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { tr } from "../lib/words";
import { Range } from "./LookPanels";
import { ColourPick } from "./StudioTreePanels";

const KINDS: Array<[string, () => string, string]> = [
  ["constellation", () => tr("كوكبات", "Constellation"), "✧"],
  ["orbs", () => tr("كرات ضوء", "Orbs"), "◉"],
  ["waves", () => tr("أمواج", "Waves"), "≈"],
  ["grid", () => tr("شبكة منظور", "Perspective grid"), "▦"],
  ["starfield", () => tr("حقل نجوم", "Starfield"), "✦"],
  ["ribbons", () => tr("شرائط", "Ribbons"), "〰"],
  ["snow", () => tr("ثلج", "Snow"), "❄"],
  ["fireworks", () => tr("ألعاب نارية", "Fireworks"), "✺"],
];
type Obj = Record<string, unknown>;
export function ScenePanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  const raw = node.props?.scene;
  const scene = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Obj : null;
  const save = (next: Obj | null) => onOps(tr("مشهد خلفية القسم", "Section background scene"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, scene: next ?? undefined } }]);
  return (
    <div className="space-y-2.5 rounded-xl border border-white/[0.08] p-3" data-testid="studio-scene">
      <div className="text-xs font-medium text-white/70">{tr("مشهد خلفية القسم", "Section background scene")}</div>
      <div className="grid grid-cols-4 gap-1" role="group" aria-label={tr("نوع المشهد", "Scene kind")}>
        {KINDS.map(([kind, name, glyph]) => <button type="button" key={kind} disabled={busy} aria-pressed={scene?.kind === kind} data-scene-kind={kind} onClick={() => save({ amount: 32, speed: 1, intensity: 1, interactive: false, ...scene, kind })} className={`rounded-lg px-1 py-1.5 text-center text-[10px] disabled:opacity-40 ${scene?.kind === kind ? "bg-accent-500/30 text-white" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"}`}><span className="block text-base" aria-hidden="true">{glyph}</span>{name()}</button>)}
      </div>
      {scene ? <div className="space-y-2">
        <ColourPick label={tr("لون المشهد", "Scene colour")} value={scene.color ?? "accent"} busy={busy} onPick={(color) => save({ ...scene, color: color ?? undefined })} testId="studio-scene-color" />
        <ColourPick label={tr("اللون الثاني للمشهد", "Scene secondary colour")} value={scene.secondary ?? "text"} busy={busy} onPick={(secondary) => save({ ...scene, secondary: secondary ?? undefined })} testId="studio-scene-secondary" />
        <Range label={tr("كمية عناصر المشهد", "Scene amount")} value={typeof scene.amount === "number" ? scene.amount : 32} min={8} max={100} busy={busy} onSave={(amount) => save({ ...scene, amount })} testId="studio-scene-amount" />
        <Range label={tr("سرعة المشهد", "Scene speed")} value={typeof scene.speed === "number" ? scene.speed : 1} min={0} max={3} step={0.1} busy={busy} onSave={(speed) => save({ ...scene, speed })} testId="studio-scene-speed" />
        <Range label={tr("شدة المشهد", "Scene intensity")} value={typeof scene.intensity === "number" ? scene.intensity : 1} min={0} max={2} step={0.1} busy={busy} onSave={(intensity) => save({ ...scene, intensity })} testId="studio-scene-intensity" />
        <label className="flex items-center justify-between gap-2 text-xs text-white/75"><span>{tr("يتفاعل مع المؤشر", "Respond to pointer")}</span><input type="checkbox" disabled={busy} checked={scene.interactive === true} onChange={(e) => save({ ...scene, interactive: e.target.checked })} data-testid="studio-scene-interactive" /></label>
        <p className="text-[10px] leading-4 text-white/40">{tr("يتوقف خارج الشاشة، ويعرض صورة ثابتة عند تقليل الحركة.", "Pauses out of view; shows a still frame with reduced motion.")}</p>
        <button type="button" disabled={busy} className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-red-300 disabled:opacity-40" onClick={() => save(null)}>{tr("إزالة المشهد", "Remove scene")}</button>
      </div> : null}
    </div>
  );
}
