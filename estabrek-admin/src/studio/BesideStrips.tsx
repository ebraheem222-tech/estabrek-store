/**
 * The two strips of section tabs that stand beside what's selected (beside.ts): its settings on one side (content,
 * behaviour, place and size), its look on the other (look, motion, edges and backgrounds) with a button that opens
 * the Add panel for it. A tab opens its section in the floating inspector on that side; the open one pressed again
 * closes the inspector, so the element is in full view.
 */
import { say } from "./say";
import { SIDE_GROUPS, type Place, type Side } from "./beside";
import { GROUP_ICON, GROUP_WORD, type InspectorGroupId } from "./InspectorNav";

const pill = (on: boolean) => `grid h-8 w-8 place-items-center rounded-full border text-sm shadow-lg transition-colors ${on ? "border-accent-400 bg-accent-500 text-white" : "border-white/[0.12] bg-surface-950/95 text-white/80 hover:bg-accent-500/30 hover:text-white"}`;

export function BesideStrips({ place, groups, active, onPick, onAdd }: {
  place: Place;
  groups: InspectorGroupId[];
  /** The open section (null when the inspector is closed). */
  active: InspectorGroupId | null;
  onPick: (g: InspectorGroupId) => void;
  onAdd?: () => void;
}) {
  const strip = (side: Side) => {
    const mine = groups.filter((g) => SIDE_GROUPS[side].includes(g));
    if (!mine.length && !(side === "right" && onAdd)) return null;
    return (
      <div className="fixed z-30 hidden flex-col gap-1.5 lg:flex" style={{ left: place.strips[side].left, top: place.strips[side].top }} role="toolbar" aria-label={side === "left" ? say("إعدادات العنصر|The element's settings|הגדרות הרכיב") : say("شكل العنصر والإضافة|The element's look and adding|מראה הרכיב והוספה")} data-testid="studio-beside-strip" data-side={side} onPointerDown={(e) => e.stopPropagation()}>
        {mine.map((g) => (
          <button key={g} type="button" className={pill(active === g)} aria-pressed={active === g} title={say(GROUP_WORD[g])} aria-label={say(GROUP_WORD[g])} onClick={() => onPick(g)} data-testid="studio-beside-tab" data-group={g}>
            <span aria-hidden="true">{GROUP_ICON[g]}</span>
          </button>
        ))}
        {side === "right" && onAdd ? (
          <button type="button" className={pill(false)} title={say("أضف عنصر جنبه|Add an element next to it|הוסף רכיב לידו")} aria-label={say("أضف عنصر جنبه|Add an element next to it|הוסף רכיב לידו")} onClick={onAdd} data-testid="studio-beside-add">
            <span aria-hidden="true">＋</span>
          </button>
        ) : null}
      </div>
    );
  };
  return <>{strip("left")}{strip("right")}</>;
}
