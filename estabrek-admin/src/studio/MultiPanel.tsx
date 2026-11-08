/**
 * The editor's panel for several selected elements, and its right-click menu: what can
 * be done to them together (selection.ts works it out; the editor sends the changes).
 */
import { useEffect, useRef } from "react";
import { tr } from "../lib/words";
import type { AlignHow } from "./selection";

const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const box = "space-y-2 rounded-xl border border-white/[0.08] p-3";

export type MultiActions = {
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  /** Null when they can't be grouped (not siblings, or a section or cell among them). */
  onGroup: (() => void) | null;
  /** Freely placed ones: lined up with each other; null when not all of them are placed freely. */
  onAlign: ((how: AlignHow) => void) | null;
  onDistribute: ((across: boolean) => void) | null;
  /** In the flow: where each sits across its row or column. */
  onSelf: (self: "start" | "center" | "end" | "stretch" | null) => void;
  onSameWidth: () => void;
  onSameLook: () => void;
  onClear: () => void;
};

const ALIGN: Array<[AlignHow, string, () => string]> = [
  ["start", "⇤", () => tr("على أول السطر", "To the line start")],
  ["center", "↔", () => tr("بالنص بالعرض", "Centred across")],
  ["end", "⇥", () => tr("على آخر السطر", "To the line end")],
  ["top", "⤒", () => tr("لفوق", "To the top")],
  ["middle", "↕", () => tr("بالنص بالطول", "Centred down")],
  ["bottom", "⤓", () => tr("لتحت", "To the bottom")],
];

/** Several elements selected: their names and what's done to all of them. */
export function MultiPanel({ names, busy, actions }: { names: string[]; busy: boolean; actions: MultiActions }) {
  return (
    <div className="space-y-3" data-testid="studio-multi" data-count={names.length}>
      <div>
        <div className="text-base font-semibold">{tr(`${names.length} عناصر محددة`, "{0} elements selected", [names.length])}</div>
        <ul className="mt-1 space-y-0.5 text-[11px] text-white/55">
          {names.slice(0, 8).map((n, i) => <li key={i} className="truncate">• {n}</li>)}
          {names.length > 8 ? <li>…</li> : null}
        </ul>
        <p className="mt-1 text-[10px] leading-4 text-white/35">{tr("Shift مع الكبسة بيزيد أو بيشيل عنصر. اسحب على الصفحة لتحدد بمربع (مع Shift بيزيد عالمحدد).", "Shift+click adds or removes one. Drag on the page to select with a box (with Shift it adds to the selection).")}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" className={btn} disabled={busy} onClick={actions.onDuplicate} data-testid="studio-multi-duplicate">{tr("نسخة منهم", "Duplicate")} <span className="text-white/40">Ctrl+D</span></button>
        <button type="button" className={btn} disabled={busy} onClick={actions.onCopy} data-testid="studio-multi-copy">{tr("نسخ", "Copy")} <span className="text-white/40">Ctrl+C</span></button>
        <button type="button" className={btn} disabled={busy || !actions.onGroup} onClick={() => actions.onGroup?.()} data-testid="studio-multi-group" title={actions.onGroup ? undefined : tr("التجميع للعناصر اللي بنفس المكان بس", "Grouping is for elements in the same place only")}>{tr("جمّعهم", "Group them")} <span className="text-white/40">Ctrl+G</span></button>
        <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={actions.onDelete} data-testid="studio-multi-delete">{tr("احذفهم", "Delete them")}</button>
      </div>
      {actions.onAlign ? (
        <div className={box} data-testid="studio-multi-align">
          <div className="text-xs font-medium text-white/70">{tr("صفّهم مع بعض", "Line them up")}</div>
          <div className="grid grid-cols-6 gap-1">
            {ALIGN.map(([how, icon, label]) => (
              <button key={how} type="button" className={btn} disabled={busy} title={label()} aria-label={label()} onClick={() => actions.onAlign!(how)} data-align={how}>{icon}</button>
            ))}
          </div>
          {actions.onDistribute ? (
            <div className="flex gap-1">
              <button type="button" className={btn} disabled={busy} onClick={() => actions.onDistribute!(true)} data-testid="studio-multi-spread-x">{tr("مسافات متساوية بالعرض", "Even gaps across")}</button>
              <button type="button" className={btn} disabled={busy} onClick={() => actions.onDistribute!(false)} data-testid="studio-multi-spread-y">{tr("بالطول", "Down")}</button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={box} data-testid="studio-multi-self">
          <div className="text-xs font-medium text-white/70">{tr("وين بيقعدوا بسطرهم", "Where they sit in their line")}</div>
          <div className="flex flex-wrap gap-1">
            {([["start", tr("أول", "Start")], ["center", tr("نص", "Centre")], ["end", tr("آخر", "End")], ["stretch", tr("كل العرض", "Full width")]] as const).map(([k, name]) => (
              <button key={k} type="button" className={btn} disabled={busy} onClick={() => actions.onSelf(k)} data-self={k}>{name}</button>
            ))}
            <button type="button" className={btn} disabled={busy} onClick={() => actions.onSelf(null)}>{tr("متل حاويتهم", "As their holder")}</button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        <button type="button" className={btn} disabled={busy} onClick={actions.onSameWidth} data-testid="studio-multi-width">{tr("نفس عرض الأول", "Same width as the first")}</button>
        <button type="button" className={btn} disabled={busy} onClick={actions.onSameLook} data-testid="studio-multi-look">{tr("نفس شكل الأول", "Same look as the first")}</button>
        <button type="button" className={btn} onClick={actions.onClear}>{tr("إلغاء التحديد", "Clear the selection")}</button>
      </div>
    </div>
  );
}

export type MenuItem = { label: string; keys?: string; onClick: () => void; disabled?: boolean; danger?: boolean } | "line";

/** The right-click menu, at the pointer; Esc, a click outside or a choice closes it. */
export function ContextMenu({ at, items, onClose }: { at: { x: number; y: number }; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const off = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) || !ref.current?.contains(document.activeElement)) return;
      const buttons = [...ref.current.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)')];
      if (!buttons.length) return;
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : (current + (e.key === "ArrowUp" ? -1 : 1) + buttons.length) % buttons.length;
      e.preventDefault(); e.stopPropagation(); buttons[next].focus();
    };
    window.addEventListener("pointerdown", off, true);
    window.addEventListener("keydown", key, true);
    ref.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    return () => {
      window.removeEventListener("pointerdown", off, true);
      window.removeEventListener("keydown", key, true);
    };
  }, [onClose]);
  // Kept inside the window.
  const x = Math.min(at.x, window.innerWidth - 240);
  const y = Math.min(at.y, window.innerHeight - 30 * items.length - 16);
  return (
    <div ref={ref} role="menu" className="fixed z-[60] max-h-[75vh] overflow-y-auto w-56 rounded-xl border border-white/[0.1] bg-surface-950 p-1 text-xs shadow-2xl" style={{ left: x, top: Math.max(8, y) }} data-testid="studio-menu">
      {items.map((it, i) =>
        it === "line" ? (
          <div key={i} className="my-1 border-t border-white/[0.08]" role="separator" />
        ) : (
          <button
            key={i} type="button" role="menuitem" disabled={it.disabled}
            className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-start hover:bg-white/[0.08] focus:bg-white/[0.08] focus:outline-none disabled:opacity-35 ${it.danger ? "text-red-300" : "text-white/85"}`}
            onClick={() => {
              onClose();
              it.onClick();
            }}
            data-menu={it.label}
          >
            <span>{it.label}</span>
            {it.keys ? <span className="text-[10px] text-white/35" dir="ltr">{it.keys}</span> : null}
          </button>
        ),
      )}
    </div>
  );
}
