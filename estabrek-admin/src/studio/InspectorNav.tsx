/**
 * The inspector's order and way around it: an element's settings come in groups, the ones used most first (its
 * content, its look, its motion, edges and backgrounds, behaviour, layout), each under a small heading; a bar
 * that stays at the top finds a setting by its words (cards that don't mention them step aside until the search
 * is cleared) and goes to a group:
 *  - one section at a time (`sections`): the bar's chips are tabs, and only the chosen group's cards show under
 *    the element's name and actions (a search still looks through every group);
 *  - or all of them in one long list, the chips jumping to a group.
 * Nothing is taken out of the page: the bar only scrolls and hides.
 */
import { useEffect, useRef, useState } from "react";
import { say } from "./say";

export const INSPECTOR_GROUPS = ["content", "look", "motion", "decor", "behaviour", "layout"] as const;
export type InspectorGroupId = (typeof INSPECTOR_GROUPS)[number];
export const GROUP_WORD: Record<InspectorGroupId, string> = {
  content: "المحتوى|Content|תוכן",
  look: "الشكل|Look|מראה",
  motion: "الحركة|Motion|תנועה",
  decor: "حواف وخلفيات|Edges and backgrounds|קצוות ורקעים",
  behaviour: "تصرّف وإظهار|Behaviour and showing|התנהגות והצגה",
  layout: "المكان والحجم|Place and size|מיקום וגודל",
};
export const GROUP_ICON: Record<InspectorGroupId, string> = { content: "✎", look: "◐", motion: "➜", decor: "▧", behaviour: "⚙", layout: "⤢" };

/** A group's heading (hidden by CSS when nothing follows it before the next heading, and when sections are tabs). */
export function InspectorGroup({ id }: { id: InspectorGroupId }) {
  return (
    <h3 className="insp-group flex items-center gap-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-accent-200/90" data-insp-group={id}>
      <span aria-hidden="true">{GROUP_ICON[id]}</span>
      <span>{say(GROUP_WORD[id])}</span>
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

/**
 * Each card's group, read from the page: in every list, what comes before the first heading is the element's own
 * top (its name, its actions: always shown), what follows a heading is in that heading's group.
 */
export function cardsByGroup(root: Element): Array<{ card: HTMLElement; group: InspectorGroupId | "top" }> {
  const out: Array<{ card: HTMLElement; group: InspectorGroupId | "top" }> = [];
  for (const list of root.querySelectorAll<HTMLElement>("[data-insp-list]")) {
    let group: InspectorGroupId | "top" = "top";
    for (const el of Array.from(list.children) as HTMLElement[]) {
      const head = el.getAttribute("data-insp-group");
      if (head) { group = head as InspectorGroupId; continue; }
      if (el.hasAttribute("data-insp-list")) continue;
      // A card can say which group it belongs to, wherever it stands (data-insp-as).
      const as = el.getAttribute("data-insp-as") as InspectorGroupId | null;
      out.push({ card: el, group: as && (INSPECTOR_GROUPS as readonly string[]).includes(as) ? as : group });
    }
  }
  return out;
}

/**
 * The bar at the top of the inspector. `watch` changes whenever what's selected does. With `sections`, `active` is
 * the group shown and `onActive` asks for another; `onGroups` tells which groups the selection has.
 */
export function InspectorJump({ watch, sections = false, tabs = true, active, onActive, onGroups, onSections, dock, onDock }: {
  watch: unknown;
  sections?: boolean;
  /** False when the tabs stand elsewhere (the strips beside the element): the bar names the open section instead. */
  tabs?: boolean;
  active?: InspectorGroupId | null;
  onActive?: (g: InspectorGroupId) => void;
  onGroups?: (groups: InspectorGroupId[]) => void;
  onSections?: (on: boolean) => void;
  dock?: "beside" | "side";
  onDock?: (dock: "beside" | "side") => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const [groups, setGroups] = useState<InspectorGroupId[]>([]);
  const [query, setQuery] = useState("");
  const [none, setNone] = useState(false);
  const jump = useRef<InspectorGroupId | null>(null);
  const finding = Boolean(query.trim());
  const shown = sections && active && groups.includes(active) ? active : null;
  // After every draw: which groups are there, and what shows (cards come and go with the selection).
  useEffect(() => {
    const root = bar.current?.parentElement;
    if (!root) return;
    const cards = cardsByGroup(root);
    const have = INSPECTOR_GROUPS.filter((g) => cards.some((c) => c.group === g));
    if (have.join() !== groups.join()) { setGroups(have); onGroups?.(have); }
    // The group asked for isn't in this selection: its first one instead.
    if (sections && have.length && (!active || !have.includes(active))) onActive?.(have[0]);
    let any = false;
    for (const { card, group } of cards) {
      const hit = cardMatches(card, query);
      card.toggleAttribute("data-insp-hidden", finding && !hit);
      card.toggleAttribute("data-insp-off", sections && !finding && group !== "top" && group !== shown);
      if (hit && (finding ? true : group !== "top")) any = true;
    }
    root.toggleAttribute("data-insp-finding", finding);
    if (sections) root.setAttribute("data-insp-mode", "sections");
    else root.removeAttribute("data-insp-mode");
    const empty = finding && !any;
    if (empty !== none) setNone(empty);
    // A chip just pressed: its group's first card comes under the bar.
    if (jump.current) {
      const g = jump.current;
      jump.current = null;
      const first = sections ? cards.find((c) => c.group === g)?.card : root.querySelector<HTMLElement>(`[data-insp-group="${g}"]`);
      if (first && typeof root.scrollTo === "function") root.scrollTo({ top: Math.max(0, first.offsetTop - (bar.current?.offsetHeight ?? 0) - 6), behavior: "smooth" });
    }
  });
  // A new selection starts with everything findable again.
  useEffect(() => { setQuery(""); }, [watch]);
  const go = (g: InspectorGroupId) => {
    jump.current = g;
    if (sections) onActive?.(g);
    else setGroups((was) => [...was]);
  };
  const tools = onSections || onDock;
  if (!groups.length && !query && !tools) return <div ref={bar} hidden data-testid="studio-insp-jump" />;
  return (
    <div ref={bar} className="sticky top-0 z-[5] -mx-3 -mt-3 mb-3 space-y-1.5 border-b border-white/[0.08] bg-surface-950/95 px-3 py-2 backdrop-blur" data-testid="studio-insp-jump" data-sections={sections ? "" : undefined}>
      <div className="flex items-center gap-1">
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={say("دوّر على إعداد: لون، ظل، حركة…|Find a setting: colour, shadow, motion…|חיפוש הגדרה: צבע, צל, תנועה…")}
          className="min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white placeholder:text-white/35"
          data-testid="studio-insp-find"
        />
        {onSections ? (
          <button type="button" aria-pressed={sections} onClick={() => onSections(!sections)} className={`h-7 shrink-0 rounded-lg px-1.5 text-[11px] ${sections ? "bg-accent-500/25 text-white" : "bg-white/[0.06] text-white/60"}`} title={say("قسم واحد كل مرة، أو كل الإعدادات بقائمة وحدة|One section at a time, or every setting in one list|קבוצה אחת בכל פעם, או הכול ברשימה אחת")} data-testid="studio-insp-sections">
            {sections ? say("أقسام|Sections|קבוצות") : say("الكل|All|הכול")}
          </button>
        ) : null}
        {onDock ? (
          <button type="button" aria-pressed={dock === "beside"} onClick={() => onDock(dock === "beside" ? "side" : "beside")} className={`h-7 shrink-0 rounded-lg px-1.5 text-[11px] ${dock === "beside" ? "bg-accent-500/25 text-white" : "bg-white/[0.06] text-white/60"}`} title={say("الإعدادات جنب العنصر، أو بلوح ثابت عالجنب|Settings beside the element, or in a fixed panel at the side|הגדרות ליד הרכיב, או בלוח קבוע בצד")} data-testid="studio-insp-dock">
            {dock === "beside" ? say("جنبه|Beside|לידו") : say("ثابت|Docked|קבוע")}
          </button>
        ) : null}
      </div>
      {finding ? (
        none ? <p className="text-[11px] text-amber-200/80" data-testid="studio-insp-none">{say("ما في إعداد بهالاسم لهالعنصر.|No setting by that name for this element.|אין הגדרה בשם הזה.")}</p> : null
      ) : sections && !tabs && shown ? (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white/85" data-testid="studio-insp-open" data-group={shown}>
          <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-500 text-[11px] text-white" aria-hidden="true">{GROUP_ICON[shown]}</span>
          {say(GROUP_WORD[shown])}
        </div>
      ) : groups.length ? (
        <div className="flex flex-wrap gap-1" role={sections ? "tablist" : "navigation"} aria-label={say("مجموعات الإعدادات|Groups of settings|קבוצות הגדרות")}>
          {groups.map((g) => (
            <button key={g} type="button" role={sections ? "tab" : undefined} aria-selected={sections ? shown === g : undefined} onClick={() => go(g)} className={`rounded-full px-2 py-0.5 text-[11px] ${sections && shown === g ? "bg-accent-500 text-white" : "bg-white/[0.06] text-white/75 hover:bg-accent-500/25 hover:text-white"}`} data-testid="studio-insp-chip" data-group={g}>
              <span aria-hidden="true">{GROUP_ICON[g]}</span> {say(GROUP_WORD[g])}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
