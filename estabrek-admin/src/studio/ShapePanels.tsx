/**
 * The editor's panels for shapes and backgrounds: the shape that cuts an element (25, drawn
 * as they cut), a pattern over a box's background, and a section's edges (a wave, an angle…
 * along its top or bottom, from the ready decorations).
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import { tr } from "../lib/words";
import { styleOp } from "./columns";
import { CUT_SHAPES, PATTERN_KINDS, patternCss } from "./cutShapes";
import { DecorPicker } from "./DecorPicker";
import { shownLook } from "./look";
import { Range } from "./LookPanels";
import { ArtView } from "./SvgPanel";
import { ColourPick, SCREEN_LABEL } from "./StudioTreePanels";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Obj = Record<string, unknown>;
const box = "space-y-2.5 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const ROSE = "#c86b98";

/** The shape that cuts an element: a click picks it, a second click puts it back as it was. */
export function ShapePicker({ value, busy, onPick, testId }: { value: unknown; busy: boolean; onPick: (shape: string | null) => void; testId?: string }) {
  return (
    <div className="text-[11px] text-white/55">
      {tr("الشكل", "Shape")}
      <div className="mt-1 grid grid-cols-7 gap-1" role="group" aria-label={tr("الشكل", "Shape")} data-testid={testId}>
        {CUT_SHAPES.map(([k, name, d]) => (
          <button key={k} type="button" title={name()} aria-label={name()} aria-pressed={value === k} disabled={busy} onClick={() => onPick(value === k ? null : k)} className={`grid aspect-square place-items-center rounded-md p-1 ${value === k ? "bg-accent-500/30 text-white" : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1]"} disabled:opacity-40`} data-value={k}>
            <svg viewBox="-4 -4 108 108" className="h-full w-full" aria-hidden="true"><path d={d} fill="currentColor" /></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

/** A pattern over the background on this screen: its kind, colour, size and strength. */
export function PatternPanel({ node, screen, busy, onOps }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops }) {
  const p = isObj(shownLook(node, screen, "pattern")) ? (shownLook(node, screen, "pattern") as Obj) : null;
  const save = (patch: Obj | null) => onOps(tr("نقشة الخلفية", "Background pattern"), [styleOp(node, screen, { pattern: patch })]);
  return (
    <div className={box} data-testid="studio-pattern">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{tr("نقشة فوق الخلفية", "A pattern over the background")}</div>
        <span className="text-[10px] text-white/40">{SCREEN_LABEL[screen]()}</span>
      </div>
      <div className="grid grid-cols-6 gap-1" role="group" aria-label={tr("النقشة", "Pattern")}>
        {PATTERN_KINDS.map(([k, name]) => (
          <button key={k} type="button" title={name()} aria-label={name()} aria-pressed={p?.kind === k} disabled={busy} onClick={() => save(p?.kind === k ? null : { kind: k, color: (p?.color as string) ?? "accent", size: (p?.size as number) ?? 24, opacity: (p?.opacity as number) ?? 0.25 })} className={`aspect-square rounded-md border bg-[#fffaf7] ${p?.kind === k ? "border-[#c86b98] ring-2 ring-[#c86b98]/60" : "border-[#ead7df]"} disabled:opacity-40`} style={patternCss(k, ROSE, 10)} data-pattern={k} />
        ))}
      </div>
      {p ? (
        <div className="space-y-2">
          <ColourPick label={tr("لونها", "Its colour")} value={p.color} busy={busy} onPick={(c) => c && save({ ...p, color: c })} testId="studio-pattern-color" />
          <Range label={tr("حجمها", "Its size")} min={4} max={120} unit="px" busy={busy} value={Number(p.size) || 24} onSave={(n) => save({ ...p, size: n })} testId="studio-pattern-size" />
          <Range label={tr("قوّتها", "Its strength")} min={0.05} max={1} step={0.05} busy={busy} value={typeof p.opacity === "number" ? p.opacity : 1} onSave={(n) => save({ ...p, opacity: n })} testId="studio-pattern-opacity" />
          <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(null)}>{tr("بلا نقشة", "No pattern")}</button>
        </div>
      ) : null}
    </div>
  );
}

const PARTICLE_KINDS: Array<[string, () => string, string]> = [
  ["snow", () => tr("ثلج", "Snow"), "❄"],
  ["stars", () => tr("نجوم", "Stars"), "✦"],
  ["bubbles", () => tr("فقاعات", "Bubbles"), "◌"],
  ["links", () => tr("نقاط موصولة", "Connected dots"), "⋰"],
  ["fireflies", () => tr("يراعات", "Fireflies"), "✺"],
  ["confetti", () => tr("قصاصات ملونة", "Confetti"), "✱"],
  ["hearts", () => tr("قلوب", "Hearts"), "♥"],
  ["sparkles", () => tr("لمعات", "Sparkles"), "✧"],
];
/** Particles behind a section: their kind, colour, how many and how fast. */
export function ParticlesPanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: Ops }) {
  const p = isObj(node.props?.particles) ? (node.props.particles as Obj) : null;
  const save = (next: Obj | null) => onOps(tr("جزيئات القسم", "The section's particles"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, particles: next ?? undefined } }]);
  return (
    <div className={box} data-testid="studio-particles">
      <div className="text-xs font-medium text-white/70">{tr("جزيئات متحركة ورا القسم", "Moving particles behind the section")}</div>
      <div className="grid grid-cols-4 gap-1" role="group" aria-label={tr("النوع", "Kind")}>
        {PARTICLE_KINDS.map(([k, name, mark]) => (
          <button key={k} type="button" title={name()} aria-pressed={p?.kind === k} disabled={busy} onClick={() => save(p?.kind === k ? null : { ...(p ?? {}), kind: k })} className={`rounded-lg px-1 py-1.5 text-center text-[10px] ${p?.kind === k ? "bg-accent-500/30 text-white" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"} disabled:opacity-40`} data-particles={k}>
            <span className="block text-base leading-5" aria-hidden="true">{mark}</span>
            {name()}
          </button>
        ))}
      </div>
      {p ? (
        <div className="space-y-2">
          <ColourPick label={tr("لونها (فاضي = لون المتجر)", "Their colour (empty = the store's)")} value={p.color ?? ""} busy={busy} onPick={(c) => save({ ...p, color: c ?? undefined })} testId="studio-particles-color" />
          <Range label={tr("كميتها", "How many")} min={0.2} max={3} step={0.1} busy={busy} value={typeof p.amount === "number" ? p.amount : 1} onSave={(n) => save({ ...p, amount: n })} testId="studio-particles-amount" />
          <Range label={tr("سرعتها", "How fast")} min={0.2} max={3} step={0.1} busy={busy} value={typeof p.speed === "number" ? p.speed : 1} onSave={(n) => save({ ...p, speed: n })} testId="studio-particles-speed" />
          <p className="text-[10px] leading-4 text-white/35">{tr("بترتاح لما القسم مش ظاهر، ومش للي طالب حركة أقل.", "They rest while the section is out of sight, and aren't shown to whoever asked for less motion.")}</p>
        </div>
      ) : null}
    </div>
  );
}

type Where = "top" | "bottom";
/** A section's edges: a band along its top or bottom, its height (and on a phone), colour, and which way it faces. */
export function EdgesPanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: Ops }) {
  const [picking, setPicking] = useState<Where | null>(null);
  const edges = (isObj(node.props?.edges) ? node.props.edges : {}) as Partial<Record<Where, Obj>>;
  const put = (where: Where, edge: Obj | null) => {
    const next = { ...edges, [where]: edge ?? undefined };
    const keep = Object.values(next).some(Boolean);
    onOps(tr("حافة القسم", "The section's edge"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, edges: keep ? next : undefined } }]);
  };
  const toggle = (label: string, on: boolean, flip: (on: boolean) => void, testId?: string) => (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/75">{label}</span>
      <input type="checkbox" disabled={busy} checked={on} onChange={(e) => flip(e.target.checked)} data-testid={testId} />
    </label>
  );
  return (
    <div className={box} data-testid="studio-edges">
      <div className="text-xs font-medium text-white/70">{tr("حواف القسم (موجة، زاوية، قوس…)", "The section's edges (a wave, an angle, an arc…)")}</div>
      {(["top", "bottom"] as Where[]).map((where) => {
        const e = edges[where];
        const art = e?.art as Parameters<typeof ArtView>[0]["art"] | undefined;
        return (
          <div key={where} className="space-y-2 rounded-lg bg-white/[0.03] p-2" data-edge={where}>
            <div className="flex items-center justify-between gap-2 text-[11px] text-white/60">
              <span>{where === "top" ? tr("فوق", "Top") : tr("تحت", "Bottom")}</span>
              <button type="button" className={btn} disabled={busy} onClick={() => setPicking(where)} data-testid={`studio-edge-pick-${where}`}>{e ? tr("غيّر الشكل", "Change the shape") : tr("+ حافة", "+ Edge")}</button>
            </div>
            {e && art ? (
              <>
                <div className="rounded-md bg-[#fffaf7] p-1" style={{ color: ROSE }}>
                  <ArtView art={art} className={`block h-8 w-full ${where === "top" ? "-scale-y-100" : ""} ${e.flip ? "-scale-x-100" : ""}`} />
                </div>
                <Range label={tr("ارتفاعها", "Its height")} min={4} max={400} unit="px" busy={busy} value={Number(e.height) || 80} onSave={(n) => put(where, { ...e, height: n })} testId={`studio-edge-height-${where}`} />
                {toggle(tr("ارتفاع تاني عالموبايل", "Another height on a phone"), typeof e.phone === "number", (on) => put(where, { ...e, phone: on ? Math.max(4, Math.round((Number(e.height) || 80) / 2)) : undefined }))}
                {typeof e.phone === "number" ? <Range label={tr("ارتفاعها عالموبايل", "Its height on a phone")} min={4} max={400} unit="px" busy={busy} value={e.phone} onSave={(n) => put(where, { ...e, phone: n })} /> : null}
                <ColourPick label={tr("لونها (غالباً لون القسم اللي جنبه)", "Its colour (usually the next section's)")} value={e.color} busy={busy} onPick={(c) => c && put(where, { ...e, color: c })} testId={`studio-edge-color-${where}`} />
                {toggle(tr("بالمقلوب (من الجهة التانية)", "Mirrored (from the other side)"), e.flip === true, (on) => put(where, { ...e, flip: on || undefined }), `studio-edge-flip-${where}`)}
                {toggle(tr("فوق المحتوى", "Over the content"), e.front === true, (on) => put(where, { ...e, front: on || undefined }))}
                <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => put(where, null)}>{tr("شيل الحافة", "Remove the edge")}</button>
              </>
            ) : null}
          </div>
        );
      })}
      <DecorPicker
        open={picking !== null} edges onClose={() => setPicking(null)}
        onPick={(d) => {
          const where = picking!;
          setPicking(null);
          put(where, { height: 80, color: "bg", ...edges[where], art: d.plain });
        }}
      />
    </div>
  );
}
