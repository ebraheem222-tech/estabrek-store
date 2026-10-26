/**
 * The editor's Add panel (like Wix's): sections, ready blocks, words, pictures and clips,
 * drawings, 3D, the store's own blocks, and motions for what's selected. A click adds next
 * to the selection (before, after or inside it, as chosen at the top); dragging onto the
 * page puts it where it's dropped (between sections, inside a place, or over a section).
 */
import type { PageTreeNode } from "../api/pages.api";
import { tr } from "../lib/words";
import { hasPreset, presetsFor, type Motion, type MotionPreset } from "./look";
import { SplitPicker } from "./StudioTreePanels";
import { typeLabel } from "./treeIndex";
import type { AddKind, Where } from "./insert";

const GROUPS: Array<{ key: string; title: () => string; kinds: Array<[AddKind, () => string, string]> }> = [
  {
    key: "ready",
    title: () => tr("أقسام جاهزة", "Ready sections"),
    kinds: [
      ["section", () => tr("قسم فاضي", "Empty section"), "▭"],
      ["ready-intro", () => tr("عنوان ونص وزر", "Heading, text and button"), "☰"],
      ["ready-split", () => tr("صورة وكلام", "Picture and words"), "◧"],
      ["ready-video", () => tr("فيديو وكلام فوقه", "Video with words over it"), "▶"],
      ["ready-gallery", () => tr("معرض صور", "Picture gallery"), "▦"],
    ],
  },
  {
    key: "text",
    title: () => tr("كلام وأزرار", "Words and buttons"),
    kinds: [
      ["heading", () => typeLabel("heading"), "H"],
      ["text", () => typeLabel("text"), "¶"],
      ["button", () => typeLabel("button"), "⬭"],
    ],
  },
  {
    key: "media",
    title: () => tr("صور وفيديو", "Pictures and video"),
    kinds: [
      ["image", () => typeLabel("image"), "▣"],
      ["video", () => typeLabel("video"), "▶"],
      ["slider", () => typeLabel("slider"), "⇆"],
    ],
  },
  {
    key: "shapes",
    title: () => tr("رسومات وزينة", "Drawings and decoration"),
    kinds: [
      ["svg", () => tr("رسمة أو شكل", "Drawing or shape"), "✿"],
      ["icon", () => typeLabel("icon"), "♥"],
      ["divider", () => typeLabel("divider"), "—"],
      ["spacer", () => typeLabel("spacer"), "↕"],
    ],
  },
  {
    key: "more",
    title: () => tr("3D والمتجر", "3D and the store"),
    kinds: [
      ["product360", () => typeLabel("product360"), "⟳"],
      ["columns", () => typeLabel("columns"), "▥"],
      ["categories", () => typeLabel("categories"), "▤"],
      ["form", () => typeLabel("form"), "✉"],
    ],
  },
];

const WHERE: Array<[Where, () => string]> = [
  ["before", () => tr("قبله", "Before")],
  ["after", () => tr("بعده", "After")],
  ["inside", () => tr("جوّاه / فوقه", "Inside / over it")],
];

export function AddPanel({ where, canWhere, target, busy, can, onWhere, onAdd, onDragKind, onSplit, motionNode, motion, onMotion }: {
  where: Where;
  /** Which places are open for the selection. */
  canWhere: Record<Where, boolean>;
  /** What it's added next to ("Seasons", or "the end of the page"). */
  target: string;
  busy: boolean;
  /** Whether a kind can go where chosen. */
  can: (kind: AddKind) => boolean;
  onWhere: (w: Where) => void;
  onAdd: (kind: AddKind) => void;
  onDragKind: (kind: AddKind | null) => void;
  /** A new section with columns (`widths`). */
  onSplit: (widths: number[]) => void;
  /** What a motion goes on (the selected element, or a piece of a section), and its motion now. */
  motionNode: PageTreeNode | null;
  motion: Motion | undefined;
  onMotion: (p: MotionPreset) => void;
}) {
  return (
    <div className="space-y-4" data-testid="studio-add-panel">
      <div className="space-y-1.5 rounded-xl border border-white/[0.08] p-2">
        <div className="text-[11px] text-white/50">
          {tr("بينضاف", "Adds")} <span className="text-white/80">{target}</span>
        </div>
        <div className="flex gap-1" role="group" aria-label={tr("مكان الإضافة", "Where it's added")} data-testid="studio-add-where">
          {WHERE.map(([w, name]) => (
            <button
              key={w}
              type="button"
              disabled={!canWhere[w]}
              aria-pressed={where === w}
              onClick={() => onWhere(w)}
              className={`flex-1 rounded-lg px-1.5 py-1 text-[11px] disabled:opacity-30 ${where === w ? "bg-accent-500/30 text-white" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"}`}
              data-where={w}
            >
              {name()}
            </button>
          ))}
        </div>
        <p className="text-[10px] leading-4 text-white/35">{tr("كبسة بتضيف هون، أو اسحب لأي مكان بالصفحة: بين قسمين، لجوّا خلية، أو فوق قسم.", "Click to add here, or drag anywhere on the page: between two sections, into a cell, or over a section.")}</p>
      </div>

      {GROUPS.map((g) => (
        <section key={g.key} className="space-y-1.5" aria-label={g.title()}>
          <h3 className="text-[11px] font-medium text-white/60">{g.title()}</h3>
          <div className="grid grid-cols-2 gap-1">
            {g.kinds.map(([k, name, mark]) => {
              const ok = !busy && can(k);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={!ok}
                  draggable={!busy}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", k);
                    e.dataTransfer.effectAllowed = "copy";
                    onDragKind(k);
                  }}
                  onDragEnd={() => onDragKind(null)}
                  onClick={() => onAdd(k)}
                  className="flex cursor-grab items-center gap-1.5 truncate rounded-lg border border-white/[0.08] px-2 py-2 text-start text-[11px] text-white/80 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
                  data-testid="studio-add-item"
                  data-kind={k}
                  title={name()}
                >
                  <span className="w-4 shrink-0 text-center text-white/45" aria-hidden="true">{mark}</span>
                  <span className="truncate">{name()}</span>
                </button>
              );
            })}
          </div>
          {g.key === "ready" ? (
            <div className="space-y-1 pt-1">
              <div className="text-[10px] text-white/40">{tr("قسم بأعمدة", "A section with columns")}</div>
              <SplitPicker busy={busy || !can("section")} onPick={onSplit} testId="studio-add-split" />
            </div>
          ) : null}
        </section>
      ))}

      <section className="space-y-1.5" aria-label={tr("حركة", "Motion")} data-testid="studio-add-motion">
        <h3 className="text-[11px] font-medium text-white/60">{tr("حركة للمحدد", "Motion for the selection")}</h3>
        {motionNode ? (
          <div className="grid grid-cols-2 gap-1">
            {presetsFor(motionNode.type, motionNode).map((p) => {
              const on = hasPreset(motion, p);
              return (
                <button key={p.key} type="button" disabled={busy} aria-pressed={on} onClick={() => onMotion(p)} className={`truncate rounded-lg border px-2 py-1.5 text-start text-[11px] ${on ? "border-accent-400/70 bg-accent-500/15 text-white" : "border-white/[0.08] text-white/75 hover:bg-white/[0.05]"} disabled:opacity-40`} data-preset={p.key} title={p.label()}>
                  {p.label()}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] leading-5 text-white/40">{tr("اختار عنصر بالصفحة لتعطيه حركة.", "Select something on the page to give it motion.")}</p>
        )}
      </section>
    </div>
  );
}
