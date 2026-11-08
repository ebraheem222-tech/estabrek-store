/**
 * The scroll effects for the selected element, all shown at once in groups: a click puts one
 * on (another click takes it off), keeping the rest of its motion. On a section it can also be
 * put on every section of the page, or taken off all of them, in one step back with undo.
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { tr } from "../lib/words";
import { motionOp, type Motion } from "./look";
import { SCROLL_GROUPS, scrollEffectOf, scrollEffectsFor, withScroll } from "./scrollEffects";

export function ScrollEffectsPanel({ node, sections, busy, onOps }: {
  node: PageTreeNode;
  /** The page's own sections (for "every section"). */
  sections: PageTreeNode[];
  busy: boolean;
  onOps: (label: string, ops: PageDraftOp[]) => void;
}) {
  const motion = node.motion as Motion | undefined;
  const now = scrollEffectOf(motion);
  const list = scrollEffectsFor(node.type);
  const chosen = list.find((e) => e.key === now);
  const isSection = node.type === "section";
  const toAll = (scroll: NonNullable<Motion["scroll"]> | null, label: string) =>
    onOps(label, sections.map((s) => motionOp(s, withScroll(s.motion as Motion | undefined, scroll))));
  return (
    <div className="space-y-2.5 rounded-xl border border-white/[0.08] p-3" data-testid="studio-scroll-effects">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{tr("تأثير التمرير", "Scroll effect")}</div>
        <span className="text-[10px] text-white/40">{chosen ? chosen.name() : tr("بلا تأثير", "No effect")}</span>
      </div>
      {SCROLL_GROUPS.map(([group, title]) => {
        const items = list.filter((e) => e.group === group);
        if (!items.length) return null;
        return (
          <div key={group} data-scroll-group={group}>
            <div className="mb-1 text-[10px] font-medium text-white/50">{title()}</div>
            <div className="grid grid-cols-2 gap-1">
              {items.map((e) => (
                <button key={e.key} type="button" disabled={busy} aria-pressed={now === e.key} data-scroll-effect={e.key} title={e.name()}
                  onClick={() => onOps(`${tr("تأثير التمرير", "Scroll effect")}: ${e.name()}`, [motionOp(node, withScroll(motion, now === e.key ? null : e.scroll))])}
                  className={`truncate rounded-lg border px-2 py-1.5 text-start text-[11px] disabled:opacity-40 ${now === e.key ? "border-accent-400/70 bg-accent-500/15 text-white" : "border-white/[0.08] text-white/75 hover:bg-white/[0.05]"}`}>
                  {e.name()}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {isSection && sections.length > 1 ? (
        <div className="flex flex-wrap gap-1 border-t border-white/[0.06] pt-2">
          <button type="button" disabled={busy || !chosen} onClick={() => chosen && toAll(chosen.scroll, `${tr("تأثير التمرير لكل الأقسام", "Scroll effect on every section")}: ${chosen.name()}`)} className="rounded-lg bg-accent-500/80 px-2 py-1 text-[11px] text-white disabled:opacity-40" data-testid="studio-scroll-all">
            {tr("طبّقه على كل أقسام الصفحة", "Put it on every section of the page")}
          </button>
          <button type="button" disabled={busy || !sections.some((s) => (s.motion as Motion | undefined)?.scroll)} onClick={() => toAll(null, tr("بلا تأثير تمرير لكل الأقسام", "No scroll effect on any section"))} className="rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] text-red-300 disabled:opacity-40" data-testid="studio-scroll-none-all">
            {tr("شيله من كل الأقسام", "Take it off every section")}
          </button>
        </div>
      ) : null}
      <p className="text-[10px] leading-4 text-white/35">{tr("ما بيتحرك للي طالب حركة أقل.", "It stays still for whoever asked for less motion.")}</p>
    </div>
  );
}
