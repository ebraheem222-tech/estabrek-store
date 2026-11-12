/**
 * The inspector's order and way around it: an element's settings come in groups, the ones used most first (its
 * content, its look, its motion, edges and backgrounds, behaviour, layout), each under a small heading; a bar
 * that stays at the top jumps to a group and finds a setting by its words (cards that don't mention them step
 * aside until the search is cleared). Nothing is taken out of the page: the bar only scrolls and hides.
 */
import { useEffect, useRef, useState } from "react";
import { say } from "./say";

export const INSPECTOR_GROUPS = ["content", "look", "motion", "decor", "behaviour", "layout"] as const;
export type InspectorGroupId = (typeof INSPECTOR_GROUPS)[number];
const WORD: Record<InspectorGroupId, string> = {
  content: "المحتوى|Content|תוכן",
  look: "الشكل|Look|מראה",
  motion: "الحركة|Motion|תנועה",
  decor: "حواف وخلفيات|Edges and backgrounds|קצוות ורקעים",
  behaviour: "تصرّف وإظهار|Behaviour and showing|התנהגות והצגה",
  layout: "المكان والحجم|Place and size|מיקום וגודל",
};
const ICON: Record<InspectorGroupId, string> = { content: "✎", look: "◐", motion: "➜", decor: "▧", behaviour: "⚙", layout: "⤢" };

/** A group's heading (hidden by CSS when nothing follows it before the next heading). */
export function InspectorGroup({ id }: { id: InspectorGroupId }) {
  return (
    <h3 className="insp-group flex items-center gap-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-accent-200/90" data-insp-group={id}>
      <span aria-hidden="true">{ICON[id]}</span>
      <span>{say(WORD[id])}</span>
      <span className="h-px flex-1 bg-white/[0.1]" aria-hidden="true" />
    </h3>
  );
}

/** Whether a card mentions the words looked for (its text, its fields' hints and its lists' choices). */
export function cardMatches(card: Element, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${card.textContent ?? ""} ${[...card.querySelectorAll("input[placeholder],textarea[placeholder]")].map((i) => i.getAttribute("placeholder")).join(" ")}`.toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}

/** The bar at the top of the inspector: jump to a group, find a setting. `watch` changes whenever the inspector's content does. */
export function InspectorJump({ watch }: { watch: unknown }) {
  const bar = useRef<HTMLDivElement>(null);
  const [groups, setGroups] = useState<InspectorGroupId[]>([]);
  const [query, setQuery] = useState("");
  const [none, setNone] = useState(false);
  // After every draw: which groups are there, and the search applied again (cards come and go with the selection).
  useEffect(() => {
    const root = bar.current?.parentElement;
    if (!root) return;
    const shown = INSPECTOR_GROUPS.filter((g) => { const h = root.querySelector<HTMLElement>(`[data-insp-group="${g}"]`); return Boolean(h && h.offsetParent !== null); });
    setGroups((was) => (was.join() === shown.join() ? was : shown));
    let any = false;
    for (const card of root.querySelectorAll<HTMLElement>("[data-insp-list] > *")) {
      if (card.hasAttribute("data-insp-list") || card.hasAttribute("data-insp-group")) continue;
      const hit = cardMatches(card, query);
      card.toggleAttribute("data-insp-hidden", !hit);
      if (hit) any = true;
    }
    root.toggleAttribute("data-insp-finding", Boolean(query.trim()));
    setNone(Boolean(query.trim()) && !any);
  });
  // A new selection starts with everything shown.
  useEffect(() => { setQuery(""); }, [watch]);
  const go = (g: InspectorGroupId) => {
    const root = bar.current?.parentElement;
    const h = root?.querySelector<HTMLElement>(`[data-insp-group="${g}"]`);
    if (!root || !h) return;
    root.scrollTo({ top: Math.max(0, h.offsetTop - (bar.current?.offsetHeight ?? 0) - 6), behavior: "smooth" });
  };
  if (!groups.length && !query) return <div ref={bar} hidden data-testid="studio-insp-jump" />;
  return (
    <div ref={bar} className="sticky top-0 z-[5] -mx-3 -mt-3 mb-3 space-y-1.5 border-b border-white/[0.08] bg-surface-950/95 px-3 py-2 backdrop-blur" data-testid="studio-insp-jump">
      <input
        type="search" value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder={say("دوّر على إعداد: لون، ظل، حركة…|Find a setting: colour, shadow, motion…|חיפוש הגדרה: צבע, צל, תנועה…")}
        className="w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white placeholder:text-white/35"
        data-testid="studio-insp-find"
      />
      {query.trim() ? (
        none ? <p className="text-[11px] text-amber-200/80" data-testid="studio-insp-none">{say("ما في إعداد بهالاسم لهالعنصر.|No setting by that name for this element.|אין הגדרה בשם הזה.")}</p> : null
      ) : (
        <div className="flex flex-wrap gap-1" role="navigation" aria-label={say("مجموعات الإعدادات|Groups of settings|קבוצות הגדרות")}>
          {groups.map((g) => (
            <button key={g} type="button" onClick={() => go(g)} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/75 hover:bg-accent-500/25 hover:text-white" data-testid="studio-insp-chip" data-group={g}>
              <span aria-hidden="true">{ICON[g]}</span> {say(WORD[g])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
