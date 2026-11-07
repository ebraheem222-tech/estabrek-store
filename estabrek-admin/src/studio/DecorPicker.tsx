/**
 * Picking a ready decoration (waves, angles, curves, blobs, ornaments, frames…), group by
 * group; `edges` = only the bands that can run along an object's top or bottom.
 */
import { useMemo, useState } from "react";
import { Modal } from "../components/ui/Modal";
import { tr } from "../lib/words";
import { DECOR_GROUPS, decorations, isEdge, type Decor } from "./decor";
import { ArtView } from "./SvgPanel";

export function DecorPicker({ open, edges, onPick, onClose }: { open: boolean; edges?: boolean; onPick: (d: Decor) => void; onClose: () => void }) {
  const list = useMemo(() => (open ? decorations().filter((d) => !edges || isEdge(d)) : []), [open, edges]);
  const groups = DECOR_GROUPS.filter(([g]) => list.some((d) => d.group === g));
  const [group, setGroup] = useState<string>("");
  const shown = list.filter((d) => !group || d.group === group);
  return (
    <Modal open={open} title={edges ? tr("حواف SVG", "SVG edges") : tr("زخارف جاهزة", "Ready decorations")} onClose={onClose} widthClassName="max-w-3xl">
      <div className="space-y-3" data-testid="decor-picker">
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {[["", () => tr("الكل", "All")] as const, ...groups].map(([g, name]) => (
            <button key={g || "all"} type="button" role="tab" aria-selected={group === g} onClick={() => setGroup(g)} className={`rounded-lg px-2.5 py-1 text-xs ${group === g ? "bg-accent-500 text-white" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"}`} data-group={g || "all"}>
              {name()}
            </button>
          ))}
        </div>
        <div className={`grid h-[50vh] content-start gap-2 overflow-y-auto ${edges ? "grid-cols-2" : "grid-cols-[repeat(auto-fill,minmax(6rem,1fr))]"}`} data-testid="decor-grid">
          {shown.map((d) => (
            <button key={d.key} type="button" title={d.name()} aria-label={d.name()} onClick={() => onPick(d)} className="rounded-lg border border-[#ead7df] bg-[#fffaf7] p-2 hover:bg-[#fff3ee]" data-decor={d.key}>
              <ArtView art={d.art} className={`block w-full ${edges ? "h-10" : "h-16"}`} />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
