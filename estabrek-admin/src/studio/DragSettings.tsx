/**
 * How dragging on the canvas behaves (phase 9), from the editor's top bar: what a dragged
 * element does with what it meets, whether it stays inside its holder, a grid, equal gaps,
 * and the keys that change a drag while it's going. Kept in this browser (dragPlan.ts).
 */
import { useState } from "react";
import { tr } from "../lib/words";
import { GRID_STEPS, type DragPrefs } from "./dragPlan";
import type { CollideMode } from "./space";

const MODES: Array<[CollideMode, string, () => string, () => string]> = [
  ["overlap", "⧉", () => tr("بيمرق فوق غيره", "Passes over others"), () => tr("متل قبل: بيتحط فوق أو تحت اللي جنبه.", "As before: it can sit over or under what's beside it.")],
  ["block", "▮", () => tr("بيوقف عند غيره", "Stops at others"), () => tr("ما بيدخل بغيره، وبيزحط على طول الحافة.", "It doesn't go into others, and slides along their edges.")],
  ["push", "⇥", () => tr("بيدفش اللي قدامه", "Pushes what's in the way"), () => tr("بيزيح العناصر الحرة اللي بطريقه، لحد حافة الحاوية.", "It shifts the free elements in its way, up to the holder's edge.")],
  ["magnet", "🧲", () => tr("مغناطيس", "Magnet"), () => tr("لما يقرب من غيره بيلزق جنبه تماماً.", "When it comes near another it sits flush beside it.")],
];

export function DragSettings({ prefs, onChange }: { prefs: DragPrefs; onChange: (p: Partial<DragPrefs>) => void }) {
  const [open, setOpen] = useState(false);
  const now = MODES.find((m) => m[0] === prefs.mode) ?? MODES[0];
  return (
    <div className="relative">
      <button
        type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className={`h-7 rounded-lg px-2 text-xs ${open ? "bg-white/[0.12] text-white" : "text-white/75 hover:bg-white/[0.06]"}`}
        title={tr("كيف بيتصرف العنصر لما تسحبه", "How an element behaves as you drag it")} data-testid="studio-drag-toggle" data-mode={prefs.mode}
      >
        {now[1]} {tr("السحب", "Dragging")}
      </button>
      {open ? (
        <div className="absolute end-0 top-9 z-40 w-72 space-y-3 rounded-xl border border-white/[0.1] bg-surface-900 p-3 text-xs text-white/80 shadow-2xl" data-testid="studio-drag-settings">
          <div className="space-y-1" role="radiogroup" aria-label={tr("لما يلاقي عنصر تاني", "When it meets another element")}>
            <div className="text-[11px] text-white/50">{tr("لما يلاقي عنصر تاني", "When it meets another element")}</div>
            {MODES.map(([id, icon, name, hint]) => (
              <button
                key={id} type="button" role="radio" aria-checked={prefs.mode === id} onClick={() => onChange({ mode: id })}
                className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-start ${prefs.mode === id ? "bg-accent-500/25 text-white" : "hover:bg-white/[0.05]"}`}
                data-testid="studio-drag-mode" data-mode={id}
              >
                <span className="w-4 text-center">{icon}</span>
                <span>
                  <span className="block">{name()}</span>
                  <span className="block text-[10px] text-white/45">{hint()}</span>
                </span>
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-2">
            {tr("بيضل جوّا الحاوية تبعه", "Stays inside its holder")}
            <input type="checkbox" checked={prefs.inside} onChange={(e) => onChange({ inside: e.target.checked })} data-testid="studio-drag-inside" />
          </label>
          <label className="flex items-center justify-between gap-2">
            {tr("مسافات متساوية مع اللي جنبه", "Equal gaps with those beside it")}
            <input type="checkbox" checked={prefs.gaps} onChange={(e) => onChange({ gaps: e.target.checked })} data-testid="studio-drag-gaps" />
          </label>
          <label className="flex items-center justify-between gap-2">
            {tr("شبكة", "Grid")}
            <select value={prefs.grid} onChange={(e) => onChange({ grid: Number(e.target.value) })} className="rounded-md border border-white/[0.1] bg-surface-925 px-1.5 py-0.5 text-xs" data-testid="studio-drag-grid">
              {GRID_STEPS.map((g) => (
                <option key={g} value={g}>{g ? `${g}px` : tr("بلا", "Off")}</option>
              ))}
            </select>
          </label>
          <p className="border-t border-white/[0.06] pt-2 text-[10px] leading-4 text-white/45">
            {tr(
              "وانت عم تسحب: Shift خط مستقيم أو 45°، Ctrl بلا لزق، Alt لما تفلت بيعمل نسخة، Esc بيلغي. اسحبه لبرّا الحاوية لجوّا مكان تاني بيفوت فيه.",
              "While dragging: Shift keeps a straight or 45° line, Ctrl stops snapping, Alt as you let go leaves a copy, Esc gives up. Drag it out of its holder onto another place to put it in there.",
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
