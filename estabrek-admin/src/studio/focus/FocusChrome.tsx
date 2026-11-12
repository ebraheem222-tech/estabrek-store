/**
 * Focus mode's frame around an opened element (docs/cms-big-engine-plan.ar.md A1):
 *  - FocusMask: the canvas dims around it, its outline glows (one svg, no pointer: the canvas still takes clicks);
 *  - FocusBar: the path along the top (the page › … › the element › its part), and the way out;
 *  - FocusParts: its parts down the side (a drawing's shapes, a container's elements).
 */
import type { Box } from "../geometry";
import { say } from "../say";
import type { FocusGroup, FocusPart } from "./focusKinds";

const GLYPH: Record<FocusGroup, string> = { svg: "✎", image: "▣", video: "▶", model: "◈", text: "T", container: "▤", other: "◇" };

/** The dim around the opened element: everything but its box (and a little room) under a veil. */
export function FocusMask({ box, area }: { box: Box | null; area: { w: number; h: number } }) {
  if (!box || !area.w || !area.h) return null;
  const pad = 6, r = 10;
  const x = box.x - pad, y = box.y - pad, w = box.w + pad * 2, h = box.h + pad * 2;
  const hole = `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${w - 2 * r}a${r},${r} 0 0 1 -${r},-${r}v-${h - 2 * r}a${r},${r} 0 0 1 ${r},-${r}z`;
  return (
    <svg className="pointer-events-none absolute inset-0" width={area.w} height={area.h} aria-hidden="true" data-testid="studio-focus-mask">
      <path d={`M0,0H${area.w}V${area.h}H0Z${hole}`} fillRule="evenodd" fill="rgba(6,6,14,0.62)" />
      <path d={hole} fill="none" stroke="rgba(168,140,255,0.9)" strokeWidth={1.5} />
      <path d={hole} fill="none" stroke="rgba(168,140,255,0.25)" strokeWidth={8} />
    </svg>
  );
}

export type Crumb = { id: string; label: string; inside: boolean };

/** The path along the top: what's around the opened element (a click there leaves it), it, and what's open in it. */
export function FocusBar({ group, crumbs, current, part, showAll, onCrumb, onPart, onShowAll, onExit }: {
  group: FocusGroup;
  crumbs: Crumb[];
  current: string | null;
  part: FocusPart | null;
  showAll: boolean;
  onCrumb: (id: string, inside: boolean) => void;
  onPart: () => void;
  onShowAll: (on: boolean) => void;
  onExit: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-3 top-2 z-[6] flex items-center gap-2 rounded-xl border border-white/[0.1] bg-surface-950/90 px-2 py-1.5 text-xs shadow-xl backdrop-blur" data-testid="studio-focus-bar" data-group={group} onPointerDown={(e) => e.stopPropagation()}>
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-accent-500/30 text-[13px] text-white" aria-hidden="true">{GLYPH[group]}</span>
      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap" aria-label={say("مسار العنصر المفتوح|The open element's path|נתיב הרכיב הפתוח")}>
        {crumbs.map((c, i) => (
          <span key={c.id} className="flex items-center gap-1">
            {i ? <span className="inline-block text-white/30 ltr:-scale-x-100">‹</span> : null}
            <button type="button" onClick={() => onCrumb(c.id, c.inside)} className={`rounded px-1.5 py-0.5 hover:bg-white/[0.08] ${c.id === current && !part ? "bg-white/[0.08] text-white" : c.inside ? "text-white/75" : "text-white/40"}`} data-testid="studio-focus-crumb" data-inside={c.inside ? "1" : undefined}>
              {c.label}
            </button>
          </span>
        ))}
        {part ? (
          <span className="flex items-center gap-1">
            <span className="inline-block text-white/30 ltr:-scale-x-100">‹</span>
            <button type="button" onClick={onPart} className="rounded bg-white/[0.08] px-1.5 py-0.5 text-white" data-testid="studio-focus-crumb-part">{part.label}</button>
          </span>
        ) : null}
      </nav>
      <label className="flex shrink-0 items-center gap-1 text-white/60" title={say("كل إعدادات العنصر، متل برّا الوضع|All the element's settings, as outside this mode|כל הגדרות הרכיב, כמו מחוץ למצב")}>
        <input type="checkbox" checked={showAll} onChange={(e) => onShowAll(e.target.checked)} data-testid="studio-focus-all" />
        {say("كل الإعدادات|All settings|כל ההגדרות")}
      </label>
      <button type="button" onClick={onExit} className="shrink-0 rounded-lg bg-white/[0.08] px-2 py-1 hover:bg-white/[0.14]" data-testid="studio-focus-exit">
        {say("خروج (Esc)|Leave (Esc)|יציאה (Esc)")}
      </button>
    </div>
  );
}

/** The opened element's parts down the side. */
export function FocusParts({ title, parts, chosen, onPick, onOpen, empty }: {
  title: string;
  parts: FocusPart[];
  chosen: string | null;
  onPick: (part: FocusPart) => void;
  onOpen?: (part: FocusPart) => void;
  empty: string;
}) {
  return (
    <div className="space-y-2" data-testid="studio-focus-parts">
      <div className="px-1 text-xs font-medium text-white/70">{title}</div>
      {parts.length ? (
        <ul className="space-y-0.5" role="listbox" aria-label={title}>
          {parts.map((p) => (
            <li key={p.id} role="option" aria-selected={p.id === chosen}>
              <button
                type="button"
                onClick={() => onPick(p)}
                onDoubleClick={onOpen && p.nodeId ? () => onOpen(p) : undefined}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-start text-xs ${p.id === chosen ? "bg-accent-500/30 text-white" : "text-white/70 hover:bg-white/[0.06]"}`}
                style={{ paddingInlineStart: 8 + p.depth * 12 }}
                data-testid="studio-focus-part"
                data-part={p.id}
              >
                <span className="font-mono text-[10px] text-white/35" dir="ltr">{p.kind}</span>
                <span className="min-w-0 flex-1 truncate">{p.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 text-[11px] leading-5 text-white/40">{empty}</p>
      )}
      {onOpen && parts.some((p) => p.nodeId) ? <p className="px-1 text-[10px] leading-4 text-white/30">{say("كبسة بتختار الجزء، وكبستين بتفتحه لحاله.|A click picks a part; a double-click opens it on its own.|לחיצה בוחרת חלק; לחיצה כפולה פותחת אותו.")}</p> : null}
    </div>
  );
}
