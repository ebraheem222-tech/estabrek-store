/**
 * The ready looks for what's selected (phase 10): the kinds that fit it (buttons, cards,
 * backgrounds, frames, type, word effects, shadows, hovers, coming in, edges), their groups,
 * a search, and tiles drawn in the store's colours. Resting the pointer on a tile shows the
 * look on the element in the frame; a click puts it on (one step to undo).
 */
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PageTreeNode } from "../api/pages.api";
import { tr } from "../lib/words";
import { decorArt } from "./decor";
import { ArtView } from "./SvgPanel";
import { groupsOf, kindName, kindsFor, looksFor, type Ready, type ReadyKind } from "./looks";
import { EASING, enterFrames, hovered, lookCss, overlayCss } from "./looks/preview";
import type { ThumbColours } from "./templates/colours";

const PAGE = 60;
const chip = (on: boolean) => `shrink-0 rounded-full px-2 py-0.5 text-[11px] ${on ? "bg-accent-500/30 text-white" : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1]"}`;
/** A picture for frames: hills under a sun, in the store's colours. */
const photo = (c: ThumbColours) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 90'><rect width='120' height='90' fill='${c["accent-soft"]}'/><circle cx='88' cy='26' r='12' fill='${c.surface}'/><path d='M0 70L34 38L62 64L84 46L120 72V90H0Z' fill='${c.accent}'/><path d='M0 80L40 58L80 82L120 66V90H0Z' fill='${c.text}' opacity='.55'/></svg>`)}") center/cover`;

function Tile({ look, colours, on, onPick, onRest }: { look: Ready; colours: ThumbColours; on: boolean; onPick: () => void; onRest: (r: Ready | null) => void }) {
  const [over, setOver] = useState(false);
  const moving = useRef<HTMLDivElement>(null);
  const s = over ? hovered(look.style ?? {}) : look.style ?? {};
  const k = look.kind;
  const words = k === "type" || k === "paint";
  const css = lookCss(s, colours, words);
  const play = () => {
    const enter = look.motion?.enter;
    const hover = look.motion?.hover;
    const el = moving.current;
    if (!el || typeof el.animate !== "function") return;
    if (enter) el.animate(enterFrames(enter.kind, enter.distance), { duration: Math.min(1600, (enter.duration ?? 0.8) * 1000), easing: EASING[enter.ease ?? "smooth"] ?? "ease" });
    else if (hover) el.animate([{ transform: "none" }, { transform: hover.kind === "spin" || hover.kind === "flip" ? "rotate(180deg)" : "translateY(-4px) scale(1.06)" }, { transform: "none" }], { duration: 700, easing: "ease-in-out" });
  };
  const box: CSSProperties = { background: colours.bg, color: colours.text };
  let sample: ReactNode;
  if (k === "button") sample = <span className="inline-block whitespace-nowrap px-3 py-1.5 text-[11px] font-semibold" style={{ borderRadius: 6, ...css }}>{tr("تسوّق", "Shop")}</span>;
  else if (k === "card" || k === "shadow" || k === "hover" || k === "entrance")
    sample = (
      <div ref={moving} className="relative flex h-12 w-20 flex-col justify-center gap-1 overflow-hidden px-2" style={{ background: colours.surface, borderRadius: 8, ...(k === "entrance" ? {} : css) }}>
        <span className="h-1.5 w-10 rounded-full" style={{ background: css.color ?? colours.text, opacity: 0.8 }} />
        <span className="h-1 w-14 rounded-full" style={{ background: css.color ?? colours.muted, opacity: 0.45 }} />
        {overlayCss(s, colours) ? <span style={overlayCss(s, colours)!} /> : null}
      </div>
    );
  else if (k === "background")
    sample = (
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ ...css, color: css.color ?? colours.text }}>
        Aa
      </div>
    );
  else if (k === "frame")
    sample = (
      <div className="relative h-14" style={{ ...css, width: css.aspectRatio ? undefined : 72, height: 56, aspectRatio: css.aspectRatio, maxWidth: 96 }}>
        <div className="h-full w-full" style={{ background: photo(colours), borderRadius: "inherit", filter: css.filter }} />
        {overlayCss(s, colours) ? <span style={overlayCss(s, colours)!} /> : null}
      </div>
    );
  else if (words) sample = <span className="text-lg font-bold leading-tight" style={{ color: colours.text, ...css }}>{tr("أهلاً Aa", "Hello أهلاً")}</span>;
  else if (k === "edge" && look.edge) {
    const art = decorArt(look.edge, true);
    sample = art ? <div className="absolute inset-x-0 bottom-0" style={{ color: colours.accent }}><ArtView art={art} className="block h-10 w-full" /></div> : null;
  }
  return (
    <button
      type="button"
      onClick={onPick}
      onPointerEnter={() => {
        setOver(true);
        play();
        onRest(look);
      }}
      onPointerLeave={() => {
        setOver(false);
        onRest(null);
      }}
      className={`group relative flex flex-col overflow-hidden rounded-lg border text-start ${on ? "border-accent-400" : "border-white/[0.08] hover:border-white/25"}`}
      title={look.name()}
      data-testid="studio-look"
      data-id={look.id}
    >
      <div className="relative flex h-16 items-center justify-center overflow-hidden" style={box}>
        {sample}
      </div>
      <span className="truncate px-1.5 py-1 text-[10px] text-white/65">{look.name()}</span>
    </button>
  );
}

export function LooksPanel({ node, label, colours, busy, current, onPick, onRest }: {
  node: PageTreeNode;
  /** What's selected, as the editor names it. */
  label: string;
  colours: ThumbColours;
  busy: boolean;
  /** The look last put on it here (marked). */
  current: string | null;
  onPick: (r: Ready) => void;
  /** The pointer rests on a look (null: it left). */
  onRest: (r: Ready | null) => void;
}) {
  const kinds = useMemo(() => kindsFor(node.type), [node.type]);
  const [kind, setKind] = useState<ReadyKind | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const k = kind && kinds.includes(kind) ? kind : kinds[0] ?? null;
  const groups = useMemo(() => (k ? groupsOf(k) : []), [k]);
  const looks = useMemo(() => (k ? looksFor(node.type, k, group, q) : []), [node.type, k, group, q]);
  // How many tiles show; another element, kind, group or search starts again at the first page.
  const view = `${node.id}|${k}|${group}|${q}`;
  const [more, setMore] = useState({ view, n: PAGE });
  const shown = more.view === view ? more.n : PAGE;
  if (!k) return <p className="px-2 py-4 text-xs text-white/45" data-testid="studio-looks-none">{tr("ما في أشكال جاهزة لهالعنصر.", "There are no ready looks for this element.")}</p>;
  return (
    <div className="space-y-2" data-testid="studio-looks" onPointerLeave={() => onRest(null)}>
      <div className="px-1 text-[11px] text-white/50">{tr("أشكال جاهزة لـ", "Ready looks for")} <span className="text-white/80">{label}</span></div>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label={tr("نوع الشكل", "Kind of look")}>
        {kinds.map((x) => (
          <button key={x} type="button" role="tab" aria-selected={x === k} className={chip(x === k)} onClick={() => { setKind(x); setGroup(null); }} data-testid="studio-looks-kind" data-kind={x}>
            {kindName(x)}
          </button>
        ))}
      </div>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("دوّر بالأشكال", "Find a look")} className="w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white" data-testid="studio-looks-find" />
      {groups.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button type="button" className={chip(group === null)} onClick={() => setGroup(null)}>{tr("الكل", "All")}</button>
          {groups.map(([g, gn]) => (
            <button key={g} type="button" className={chip(group === g)} onClick={() => setGroup(g)} data-testid="studio-looks-group" data-group={g}>{gn()}</button>
          ))}
        </div>
      ) : null}
      <div className="px-1 text-[10px] text-white/35" data-testid="studio-looks-count" data-count={looks.length}>{tr(`${looks.length} شكل`, "{0} looks", [looks.length])}</div>
      <div className={`grid grid-cols-2 gap-1.5 ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {looks.slice(0, shown).map((r) => (
          <Tile key={r.id} look={r} colours={colours} on={current === r.id} onPick={() => onPick(r)} onRest={onRest} />
        ))}
      </div>
      {looks.length > shown ? (
        <button type="button" className="w-full rounded-lg bg-white/[0.05] py-1.5 text-xs text-white/70 hover:bg-white/[0.1]" onClick={() => setMore({ view, n: shown + PAGE })} data-testid="studio-looks-more">
          {tr(`كمان (${looks.length - shown})`, "More ({0})", [looks.length - shown])}
        </button>
      ) : null}
      <p className="px-1 text-[10px] leading-4 text-white/35">{tr("وقّف الماوس على شكل لتشوفه عالصفحة، واكبس لتحطه. بيتحط عالشاشة اللي مختارها.", "Rest the pointer on a look to see it on the page, click to put it on. It goes on the screen size you're on.")}</p>
    </div>
  );
}
