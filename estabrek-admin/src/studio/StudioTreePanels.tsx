/**
 * The new editor's panels for the tree's own elements (track B, phase 3): columns
 * (their split, gap, alignment and what a phone does with them), a cell (colour,
 * inner space, shape, frame, alignment), a section of the page, each element's
 * settings (words in the language being edited, links, pictures, clips, a slider's
 * slides), and the list of elements to add. Every change goes out as draft changes, so undo works
 * on all of it.
 */
import { useEffect, useRef, useState } from "react";
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import { VideoPickerModal } from "../components/media/VideoPickerModal";
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { MAX_CELLS, MAX_SLIDES, PRESETS, addSlides, changeSlide, dropCellOps, layoutOps, moveSlide, reduceWidths, sameWidths, shownWidths, slidesOf, styleOp, type NewKind, type Slide } from "./columns";
import { Field } from "./StudioPanels";
import { ShapePicker } from "./ShapePanels";
import { IconGlyph, IconPicker } from "./IconPicker";
import { iconLineOf, iconShown, withIconLine } from "./iconLibrary";
import type { Art } from "./svgArt";
import { typeLabel } from "./treeIndex";
import { say } from "./say";
import { TokenSelect, tokenName, tokenOf, useTokens } from "./designTokens";
import { SLIDER_ARROW_LOOK_NAMES, SLIDER_DOT_LOOK_NAMES, SLIDER_LOOK_NAMES } from "./sliderLooks";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Ids = (prefix: string) => string;
type Look = Record<string, unknown>;

const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const box = "space-y-3 rounded-xl border border-white/[0.08] p-3";
const control = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";
const chip = (on: boolean) => `rounded-lg px-2 py-1 text-xs ${on ? "bg-accent-500/30 text-white" : "bg-white/[0.06] text-white/75 hover:bg-white/[0.1]"} disabled:opacity-40`;
const lookOf = (n: PageTreeNode, screen: TreeScreen): Look => (((n.style ?? {}) as Record<string, Look | undefined>)[screen] ?? {});
const SAFE_LINK = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)[^\s<>"'`\\]*$/i;
const SAFE_FILE = /^(\/(?!\/)|https:\/\/)[^\s<>"'`\\]+$/i;

/** Where a change on one screen shows. */
export const SCREEN_LABEL: Record<TreeScreen, () => string> = {
  base: () => tr("الكمبيوتر", "The computer"),
  tablet: () => tr("التابلت", "The tablet"),
  mobile: () => tr("الموبايل", "The phone"),
};

/** A whole number that saves when the box is left (or Enter); empty clears it. */
export function NumberField({ label, value, min, max, onSave, testId, suffix }: { label: string; value: number | undefined; min: number; max: number; onSave: (v: number | null) => void; testId?: string; suffix?: string }) {
  const shown = value === undefined ? "" : String(value);
  const [v, setV] = useState(shown);
  const [was, setWas] = useState(shown);
  if (was !== shown) {
    setWas(shown);
    setV(shown);
  }
  const save = () => {
    if (v === shown) return;
    if (v.trim() === "") return onSave(null);
    const n = Math.round(Number(v));
    if (Number.isFinite(n)) onSave(Math.max(min, Math.min(max, n)));
    else setV(shown);
  };
  return (
    <label className="block text-[11px] text-white/55">
      {label}
      <span className="flex items-center gap-1">
        <input type="number" inputMode="numeric" min={min} max={max} dir="ltr" className={control} value={v} onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()} data-testid={testId} />
        {suffix ? <span className="mt-1 shrink-0 text-white/40" dir="ltr">{suffix}</span> : null}
      </span>
    </label>
  );
}

export function Choice<T extends string>({ label, value, options, onPick, busy, testId }: { label: string; value: T; options: Array<[T, string]>; onPick: (v: T) => void; busy: boolean; testId?: string }) {
  return (
    <div className="text-[11px] text-white/55">
      {label}
      <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label={label} data-testid={testId}>
        {options.map(([k, name]) => (
          <button key={k} type="button" className={chip(value === k)} aria-pressed={value === k} disabled={busy} onClick={() => value !== k && onPick(k)} data-value={k}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

const COLOURS: Array<[string, () => string]> = [
  ["", () => tr("بلا لون", "None")],
  ["surface", () => tr("لون السطح", "Surface")],
  ["bg", () => tr("لون الصفحة", "Page colour")],
  ["accent-soft", () => tr("لون الثيم الفاتح", "Light theme colour")],
  ["accent", () => tr("لون الثيم", "Theme colour")],
  ["text", () => tr("لون الكلام", "Text colour")],
  ["white", () => tr("أبيض", "White")],
  ["black", () => tr("أسود", "Black")],
];
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
/** The colour box takes #rrggbb only. */
const six = (h: string) => (h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h.slice(0, 7));

/** A theme colour, or a colour of one's own. */
export function ColourPick({ label, value, busy, onPick, testId }: { label: string; value: unknown; busy: boolean; onPick: (v: string | null) => void; testId?: string }) {
  const tokens = useTokens();
  const variable = tokenOf(tokens, "colors", value) as { value: string } | undefined;
  const own = typeof value === "string" && HEX.test(value) ? value : variable?.value ?? null;
  const [hex, setHex] = useState(six(own ?? "#ffffff"));
  const [was, setWas] = useState(value);
  const [dirty, setDirty] = useState(false);
  // Choosing "a colour of its own" opens the picker without changing anything yet (it used to turn it white first).
  const [choosing, setChoosing] = useState(false);
  if (was !== value) {
    setWas(value);
    setHex(six(own ?? "#ffffff"));
    setDirty(false);
    setChoosing(false);
  }
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef({ hex, dirty, busy, own, onPick });
  latest.current = { hex, dirty, busy, own, onPick };
  const commit = () => {
    const l = latest.current;
    if (!l.dirty || l.busy) return;
    setDirty(false);
    latest.current = { ...l, dirty: false };
    if (!l.own || l.hex.toLowerCase() !== six(l.own).toLowerCase()) l.onPick(l.hex);
  };
  // The colour is kept as soon as the picker closes (its own "change"), not only when something else is clicked.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const done = () => commit();
    el.addEventListener("change", done);
    return () => el.removeEventListener("change", done);
  }, []);
  const shown = variable ? String(value) : own || choosing ? "own" : typeof value === "string" ? value : "";
  return (
    <label className="block text-[11px] text-white/55">
      {label}
      <span className="flex items-center gap-1">
        <select className={control} disabled={busy} value={shown} onChange={(e) => {
          if (e.target.value !== "own") { setChoosing(false); onPick(e.target.value || null); return; }
          setChoosing(true);
          try { input.current?.showPicker(); } catch { input.current?.click(); }
        }} data-testid={testId}>
          {COLOURS.map(([k, name]) => <option key={k} value={k}>{name()}</option>)}
          {tokens?.colors.length ? <optgroup label={say("المتغيرات|Variables|משתנים")}>{tokens.colors.map((t) => <option key={t.id} value={`$${t.id}`}>◆ {tokenName(t)}</option>)}</optgroup> : null}
          <option value="own">{tr("لون خاص", "A colour of its own")}</option>
        </select>
        <input ref={input} type="color" aria-label={tr("لون خاص", "A colour of its own")} className="mt-1 h-8 w-9 shrink-0 cursor-pointer rounded border border-white/[0.1] bg-transparent" disabled={busy} value={six(hex)} onChange={(e) => { setHex(e.target.value); setDirty(true); latest.current = { ...latest.current, hex: e.target.value, dirty: true }; }} onBlur={commit} data-testid={testId ? `${testId}-own` : undefined} />
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ splits */

function SplitThumb({ widths }: { widths: number[] }) {
  return (
    <span className="flex h-5 w-full gap-0.5">
      {widths.map((w, i) => <span key={i} className="rounded-sm bg-current opacity-60" style={{ flexGrow: w, flexBasis: 0 }} />)}
    </span>
  );
}

/** The ready-made splits as small pictures. */
export function SplitPicker({ current, busy, onPick, testId = "studio-split" }: { current?: number[]; busy: boolean; onPick: (widths: number[]) => void; testId?: string }) {
  return (
    <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={tr("تقسيم الأعمدة", "Column split")} data-testid={testId}>
      {PRESETS.map((p) => {
        const on = sameWidths(current, p.widths);
        return (
          <button key={p.widths.join("-")} type="button" disabled={busy} title={p.label()} aria-label={p.label()} aria-pressed={on} onClick={() => onPick(p.widths)} className={`rounded-lg border px-2 py-2 ${on ? "border-accent-400/70 text-accent-200" : "border-white/[0.08] text-white/70 hover:bg-white/[0.04]"} disabled:opacity-40`} data-split={p.widths.join("-")}>
            <SplitThumb widths={p.widths} />
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- columns */

export function ColumnsPanel({ node, screen, busy, ids, onOps }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; ids: () => Ids; onOps: Ops }) {
  const base = lookOf(node, "base");
  const widths = shownWidths(node, "base");
  const ownHere = screen !== "base" && Array.isArray(lookOf(node, screen).widths) ? (lookOf(node, screen).widths as number[]) : null;
  const phone = typeof node.props?.phone === "string" ? (node.props.phone as string) : "stack";
  const split = (label: string, w: number[]) => onOps(label, layoutOps(node, w, ids()));
  return (
    <div className={box} data-testid="studio-columns">
      <div className="text-xs font-medium text-white/70">{tr("الأعمدة", "Columns")}</div>
      <SplitPicker current={widths} busy={busy} onPick={(w) => split(tr("تقسيم الأعمدة", "Column split"), w)} />
      <div className="space-y-1">
        <div className="text-[11px] text-white/55">{tr("على كيفك: كم جزء لكل عمود", "Your own: how many parts each column takes")}</div>
        <div className="flex flex-wrap items-end gap-1">
          {widths.map((w, i) => (
            <div key={i} className="w-12">
              <NumberField label={`${i + 1}`} value={w} min={1} max={12} testId="studio-col-width" onSave={(v) => {
                const next = widths.slice();
                next[i] = v ?? 1;
                onOps(tr("عرض الأعمدة", "Column widths"), [styleOp(node, "base", { widths: reduceWidths(next) })]);
              }} />
            </div>
          ))}
          <button type="button" className={btn} disabled={busy || widths.length >= MAX_CELLS} onClick={() => split(tr("عمود جديد", "New column"), [...widths, 1])} data-testid="studio-col-add">+ {tr("عمود", "Column")}</button>
          <button type="button" className={btn} disabled={busy || widths.length <= 1} onClick={() => split(tr("شيل عمود", "Remove a column"), widths.slice(0, -1))} data-testid="studio-col-remove">− {tr("عمود", "Column")}</button>
        </div>
        <p className="text-[11px] leading-5 text-white/40">{tr("بشيل عمود، محتواه بينقل للعمود اللي قبله.", "Removing a column moves what it holds into the one before it.")}</p>
      </div>
      <NumberField label={tr("المسافة بين الأعمدة", "Space between the columns")} suffix="px" value={typeof base.gap === "number" ? base.gap : undefined} min={0} max={120} onSave={(v) => onOps(tr("المسافة", "Spacing"), [styleOp(node, "base", { gap: v })])} />
      <TokenSelect group="spaces" value={base.gap} busy={busy} onPick={(v) => onOps(tr("المسافة", "Spacing"), [styleOp(node, "base", { gap: v })])} testId="studio-columns-gap-variable" />
      <Choice
        label={tr("ارتفاع الخلايا", "The cells' height")}
        value={(typeof base.align === "string" ? base.align : "stretch") as string}
        busy={busy}
        options={[["stretch", tr("كلها نفس الطول", "All the same height")], ["start", tr("من فوق", "Top")], ["center", tr("بالنص", "Middle")], ["end", tr("من تحت", "Bottom")]]}
        onPick={(v) => onOps(tr("محاذاة", "Alignment"), [styleOp(node, "base", { align: v === "stretch" ? null : v })])}
      />
      <Choice
        label={tr("على الموبايل", "On a phone")}
        value={phone}
        busy={busy}
        testId="studio-col-phone"
        options={[["stack", tr("فوق بعض", "One under the other")], ["reverse", tr("فوق بعض بالعكس", "Under each other, last first")], ["keep", tr("جنب بعض", "Side by side")]]}
        onPick={(v) => onOps(tr("الأعمدة على الموبايل", "Columns on a phone"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, phone: v === "stack" ? undefined : v } }])}
      />
      <p className="text-[11px] leading-5 text-white/40">
        {tr("لتغيير العرض بالسحب: اسحب الخط اللي بين خليتين بالصفحة. بينحفظ لـ", "To change widths by dragging: drag the line between two cells on the page. It's kept for")}: {SCREEN_LABEL[screen]()}.
      </p>
      {ownHere ? (
        <button type="button" className={btn} disabled={busy} onClick={() => onOps(tr("عرض الأعمدة", "Column widths"), [styleOp(node, screen, { widths: null })])} data-testid="studio-col-reset">
          {tr("رجوع لعرض الكمبيوتر", "Back to the computer's widths")}
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- cell */

export function CellPanel({ node, cols, busy, onOps }: { node: PageTreeNode; cols: PageTreeNode | null; busy: boolean; onOps: Ops }) {
  const base = lookOf(node, "base");
  const set = (label: string, patch: Look) => onOps(label, [styleOp(node, "base", patch)]);
  const pad = Array.isArray(base.pad) ? Number(base.pad[0]) : undefined;
  const border = (base.border ?? null) as { style?: string } | null;
  const at = cols?.children?.findIndex((c) => c.id === node.id) ?? -1;
  const align = typeof base.align === "string" ? base.align : "start";
  return (
    <div className={box} data-testid="studio-cell">
      <div className="text-xs font-medium text-white/70">{tr("شكل الخلية", "The cell's look")}</div>
      <ColourPick label={tr("الخلفية", "Background")} value={base.bg} busy={busy} onPick={(v) => set(tr("لون الخلية", "Cell colour"), { bg: v })} testId="studio-cell-bg" />
      <ShapePicker value={base.shape} busy={busy} onPick={(k) => set(tr("شكل الخلية", "The cell's look"), { shape: k, radius: null })} testId="studio-cell-shape" />
      <NumberField label={tr("المسافة جوّا الخلية", "Space inside the cell")} suffix="px" value={pad} min={0} max={160} testId="studio-cell-pad" onSave={(v) => set(tr("المسافة", "Spacing"), { pad: v ? [v, v, v, v] : null })} />
      <Choice
        label={tr("الإطار", "Frame")}
        value={(border ? (border.style === "dashed" ? "dashed" : "solid") : "none") as string}
        busy={busy}
        options={[["none", tr("بلا", "None")], ["solid", tr("خط", "Line")], ["dashed", tr("متقطع", "Dashed")]]}
        onPick={(v) => set(tr("الإطار", "Frame"), { border: v === "none" ? null : { width: 1, color: "border", style: v } })}
      />
      <Choice
        label={tr("الظل", "Shadow")}
        value={(typeof base.shadow === "string" ? base.shadow : "none") as string}
        busy={busy}
        options={[["none", tr("بلا", "None")], ["sm", tr("خفيف", "Light")], ["md", tr("وسط", "Medium")], ["lg", tr("قوي", "Strong")]]}
        onPick={(v) => set(tr("الظل", "Shadow"), { shadow: v === "none" ? null : v })}
      />
      <Choice
        label={tr("المحتوى بالطول", "Content, up and down")}
        value={(typeof base.justify === "string" ? base.justify : "start") as string}
        busy={busy}
        testId="studio-cell-v"
        options={[["start", tr("فوق", "Top")], ["center", tr("بالنص", "Middle")], ["end", tr("تحت", "Bottom")], ["between", tr("موزّع", "Spread")]]}
        onPick={(v) => set(tr("محاذاة", "Alignment"), { justify: v === "start" ? null : v })}
      />
      <Choice
        label={tr("المحتوى بالعرض", "Content, side to side")}
        value={align}
        busy={busy}
        testId="studio-cell-h"
        options={[["start", tr("أول السطر", "Line start")], ["center", tr("بالنص", "Middle")], ["end", tr("آخر السطر", "Line end")]]}
        onPick={(v) => set(tr("محاذاة", "Alignment"), v === "start" ? { align: null, textAlign: null } : { align: v, textAlign: v })}
      />
      <NumberField label={tr("أقل ارتفاع", "Smallest height")} suffix="px" value={typeof base.minHeight === "string" ? parseInt(base.minHeight, 10) || undefined : undefined} min={0} max={1600} onSave={(v) => set(tr("الارتفاع", "Height"), { minHeight: v ? `${v}px` : null })} />
      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-white/75">{tr("مخفية على الموبايل", "Hidden on a phone")}</span>
        <input type="checkbox" disabled={busy} checked={lookOf(node, "mobile").hidden === true} onChange={(e) => onOps(tr("إخفاء", "Hide"), [styleOp(node, "mobile", { hidden: e.target.checked ? true : null })])} />
      </label>
      {cols && (cols.children?.length ?? 0) > 1 ? (
        <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => onOps(tr("شيل الخلية", "Remove the cell"), dropCellOps(cols, at))} data-testid="studio-cell-remove">
          {tr("شيل الخلية (محتواها بينقل للجارة)", "Remove the cell (what it holds moves next door)")}
        </button>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- section */

export function SectionPanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: Ops }) {
  const base = lookOf(node, "base");
  const pad = Array.isArray(base.pad) ? Number(base.pad[0]) : undefined;
  return (
    <div className={box} data-testid="studio-tree-section">
      <div className="text-xs font-medium text-white/70">{tr("إعدادات القسم", "Section settings")}</div>
      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-white/75">{tr("المحتوى بعرض الصفحة", "Content at the page's width")}</span>
        <input type="checkbox" disabled={busy} checked={node.props?.contained === true} onChange={(e) => onOps(tr("تعديل", "Edit"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, contained: e.target.checked || undefined } }])} />
      </label>
      <ColourPick label={tr("الخلفية", "Background")} value={base.bg} busy={busy} onPick={(v) => onOps(tr("لون القسم", "Section colour"), [styleOp(node, "base", { bg: v })])} />
      <NumberField label={tr("المسافة فوق وتحت", "Space above and below")} suffix="px" value={pad} min={0} max={240} onSave={(v) => onOps(tr("المسافة", "Spacing"), [styleOp(node, "base", { pad: v === null ? null : [v, 0, v, 0] })])} />
    </div>
  );
}

/* ---------------------------------------------------------------- elements */

/** Words in one language over the others; empty takes that language out. */
const withWords = (t: unknown, lang: Lang, v: string) => {
  const out: Record<string, string> = { ...((t && typeof t === "object" ? t : {}) as Record<string, string>) };
  if (v.trim()) out[lang] = v;
  else delete out[lang];
  return out;
};
const wordsOf = (t: unknown, lang: Lang) => (t && typeof t === "object" ? String((t as Record<string, string>)[lang] ?? "") : typeof t === "string" ? t : "");
/** The frames a slider can take (its width to its height). */
const ASPECTS: Array<[string, () => string]> = [
  ["16 / 9", () => tr("عريض", "Wide")],
  ["4 / 3", () => tr("كلاسيك", "Classic")],
  ["1 / 1", () => tr("مربع", "Square")],
  ["4 / 5", () => tr("طولي", "Tall")],
  ["9 / 16", () => tr("ستوري", "Story")],
];

/**
 * A slider's slides and switches: pictures from the library (several at once), MP4 clips
 * by their link, each slide's words in the language being edited, its link, its place
 * in the row; turning by itself, looping, arrows, dots and the frame.
 */
/** An icon: which one (the library), and a line icon's line width. */
function IconFields({ node, busy, setProps }: { node: PageTreeNode; busy: boolean; setProps: (patch: Record<string, unknown>) => void }) {
  const p = (node.props ?? {}) as Record<string, unknown>;
  const [open, setOpen] = useState(false);
  const art = iconShown(p);
  const line = iconLineOf(p.art);
  const [width, setWidth] = useState<number | null>(null);
  const name = String(p.name ?? "");
  const commit = () => {
    if (width !== null && line !== undefined && width !== line) setProps({ art: withIconLine(p.art as Art, width) });
    setWidth(null);
  };
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-white/85" data-testid="studio-icon-now">{art ? <IconGlyph art={art} className="h-7 w-7" /> : null}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] text-white/55" dir="ltr">{name.replace(/^([a-z-]+):/, "$1 · ")}</div>
          <button type="button" className="mt-1 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40" disabled={busy} onClick={() => setOpen(true)} data-testid="studio-icon-pick">
            {tr("غيّر الأيقونة (أكتر من 16 ألف)", "Change the icon (over 16,000)")}
          </button>
        </div>
      </div>
      {line !== undefined ? (
        <label className="block text-[11px] text-white/55">
          {tr("سماكة الخط", "Line width")} <span className="text-white/40" dir="ltr">{width ?? line}</span>
          <input type="range" min={0.5} max={3} step={0.25} value={width ?? line} disabled={busy} className="mt-1 w-full accent-[#c86b98]" onChange={(e) => setWidth(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} data-testid="studio-icon-line" />
        </label>
      ) : null}
      <IconPicker
        open={open} current={name} line={line ?? 2} onClose={() => setOpen(false)}
        onPick={(ref, picked) => {
          setOpen(false);
          setProps({ name: ref, art: picked ?? undefined });
        }}
      />
    </>
  );
}

function SliderFields({ node, lang, busy, setProps }: { node: PageTreeNode; lang: Lang; busy: boolean; setProps: (patch: Record<string, unknown>) => void }) {
  const p = (node.props ?? {}) as Record<string, unknown>;
  const slides = slidesOf(node);
  const [open, setOpen] = useState(0);
  /** The library is open to add pictures, or to change slide i's picture. */
  const [pick, setPick] = useState<"add" | number | null>(null);
  const [clip, setClip] = useState<string | null>(null);
  const at = Math.max(0, Math.min(open, slides.length - 1));
  const s = slides[at];
  const full = slides.length >= MAX_SLIDES;
  const clipOk = clip !== null && SAFE_FILE.test(clip.trim());
  const save = (next: Slide[], openAt?: number) => {
    setProps({ slides: next });
    if (openAt !== undefined) setOpen(openAt);
  };
  const change = (patch: Partial<Slide>) => save(changeSlide(slides, at, patch));
  const seconds = typeof p.autoplay === "number" ? p.autoplay : null;
  const toggle = (key: string, label: string, def = true) => (
    <label key={key} className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/75">{label}</span>
      <input type="checkbox" disabled={busy} checked={p[key] === undefined ? def : p[key] === true} onChange={(e) => setProps({ [key]: e.target.checked })} data-testid={`studio-slider-${key}`} />
    </label>
  );
  return (
    <>
      <div className="text-[11px] text-white/55">
        {tr("الشرائح", "Slides")} <span dir="ltr">({slides.length}/{MAX_SLIDES})</span>
      </div>
      {slides.length ? (
        <div className="grid grid-cols-4 gap-1" role="group" aria-label={tr("الشرائح", "Slides")} data-testid="studio-slides">
          {slides.map((x, i) => (
            <button key={i} type="button" onClick={() => setOpen(i)} aria-pressed={i === at} aria-label={`${tr("شريحة", "Slide")} ${i + 1}`} className={`relative overflow-hidden rounded-md border ${i === at ? "border-accent-400" : "border-white/[0.08]"}`} data-testid="studio-slide">
              {x.kind === "video" ? <video src={x.src} muted playsInline preload="metadata" className="aspect-square w-full object-cover" /> : <img src={x.src} alt="" className="aspect-square w-full object-cover" />}
              <span className="absolute bottom-0 start-0 rounded-se bg-black/65 px-1 text-[10px] text-white">{i + 1}{x.kind === "video" ? " ▶" : ""}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] leading-5 text-white/40">{tr("لسا ما في شرائح: زيد صور أو فيديو.", "No slides yet: add pictures or a video.")}</p>
      )}
      <div className="flex flex-wrap gap-1">
        <button type="button" className={btn} disabled={busy || full} onClick={() => setPick("add")} data-testid="studio-slide-add-image">+ {tr("صور", "Pictures")}</button>
        <button type="button" className={btn} disabled={busy || full} onClick={() => setClip("")} data-testid="studio-slide-add-video">+ {tr("فيديو", "Video")}</button>
      </div>
      {clip !== null ? (
        <div className="space-y-1">
          <label className="block text-[11px] text-white/55">
            {tr("رابط الفيديو (MP4، من مكتبة الفيديوهات أو أي رابط https)", "Video link (MP4, from the video library or any https link)")}
            <input dir="ltr" className={control} value={clip} onChange={(e) => setClip(e.target.value)} placeholder="https://…/clip.mp4" data-testid="studio-slide-video-url" />
          </label>
          <div className="flex gap-1">
            <button type="button" className={btn} disabled={busy || !clipOk || full} onClick={() => { save(addSlides(slides, [clip.trim()], "video"), slides.length); setClip(null); }} data-testid="studio-slide-video-add">{tr("إضافة", "Add")}</button>
            <button type="button" className={btn} onClick={() => setClip(null)}>{tr("إلغاء", "Cancel")}</button>
          </div>
        </div>
      ) : null}
      {s ? (
        <div className="space-y-2 rounded-lg bg-white/[0.03] p-2" data-testid="studio-slide-edit">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-white/70">{tr("شريحة", "Slide")} {at + 1}</span>
            <span className="flex gap-1">
              <button type="button" className={btn} disabled={busy || at === 0} onClick={() => save(moveSlide(slides, at, -1), at - 1)} aria-label={tr("لقدّام", "Earlier")} data-testid="studio-slide-up">↑</button>
              <button type="button" className={btn} disabled={busy || at >= slides.length - 1} onClick={() => save(moveSlide(slides, at, 1), at + 1)} aria-label={tr("لورا", "Later")} data-testid="studio-slide-down">↓</button>
              <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(slides.filter((_, i) => i !== at), Math.max(0, at - 1))} data-testid="studio-slide-remove">{tr("شيل", "Remove")}</button>
            </span>
          </div>
          {s.kind === "video" ? (
            <Field label={tr("رابط الفيديو (MP4، من مكتبة الفيديوهات أو أي رابط https)", "Video link (MP4, from the video library or any https link)")} value={s.src} testId="studio-slide-src" onSave={(v) => SAFE_FILE.test(v.trim()) && change({ src: v.trim() })} />
          ) : (
            <button type="button" className={btn} disabled={busy} onClick={() => setPick(at)} data-testid="studio-slide-change">{tr("تغيير الصورة", "Change the picture")}</button>
          )}
          <Field label={tr("الكلام على الشريحة (اختياري)", "Words on the slide (optional)")} value={wordsOf(s.caption, lang)} onSave={(v) => change({ caption: withWords(s.caption, lang, v) })} testId="studio-slide-caption" />
          <Field label={tr("عنوان الشريحة", "Slide title")} value={wordsOf(s.title, lang)} onSave={(v) => change({ title: withWords(s.title, lang, v.slice(0, 160)) })} testId="studio-slide-title" />
          <Field label={tr("نص الشريحة", "Slide text")} multiline value={wordsOf(s.text, lang)} onSave={(v) => change({ text: withWords(s.text, lang, v.slice(0, 1200)) })} testId="studio-slide-text" />
          <Field label={tr("كلام زر الشريحة", "Slide button text")} value={wordsOf(s.cta, lang)} onSave={(v) => change({ cta: withWords(s.cta, lang, v.slice(0, 60)) })} testId="studio-slide-cta" />
          {s.kind === "image" ? <Field label={tr("وصف الصورة (لقارئ الشاشة)", "Picture description (for screen readers)")} value={wordsOf(s.alt, lang)} onSave={(v) => change({ alt: withWords(s.alt, lang, v) })} testId="studio-slide-alt" /> : null}
          <Field label={tr("رابط عند الكبس (اختياري)", "Link when tapped (optional)")} value={s.href ?? ""} testId="studio-slide-href" onSave={(v) => {
            const t = v.trim();
            if (!t) change({ href: undefined });
            else if (SAFE_LINK.test(t)) change({ href: t });
          }} />
        </div>
      ) : null}
      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-white/75">{tr("بتقلب لحالها", "Turns by itself")}</span>
        <input type="checkbox" disabled={busy} checked={seconds !== null} onChange={(e) => setProps({ autoplay: e.target.checked ? 5 : undefined })} data-testid="studio-slider-autoplay" />
      </label>
      {seconds !== null ? <NumberField label={tr("كل كم ثانية", "Every how many seconds")} suffix="s" value={seconds} min={2} max={30} testId="studio-slider-seconds" onSave={(v) => setProps({ autoplay: v ?? undefined })} /> : null}
      {toggle("loop", tr("بعد الأخيرة بترجع للأولى", "After the last, back to the first"))}
      {toggle("arrows", tr("أسهم", "Arrows"))}
      {toggle("dots", tr("نقاط", "Dots"))}
      <label className="block text-[11px] text-white/55">{tr("حركة الشرائح", "Slide effect")}
        <select className={control} disabled={busy} value={String(p.effect ?? "slide")} onChange={(e) => setProps({ effect: e.target.value })} data-testid="studio-slider-effect">
          {[["slide", tr("سحب", "Slide")], ["fade", tr("تلاشي", "Fade")], ["zoom", tr("تكبير", "Zoom")], ["wipe", tr("كشف", "Wipe")], ["flip", tr("قلب ثلاثي الأبعاد", "Flip")], ["coverflow", tr("بطاقات مجسّمة", "Coverflow")], ["slices", tr("شرائح ثلاثية الأبعاد", "3D slices")]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="block text-[11px] text-white/55">{tr("اتجاه الشرائح", "Slide axis")}
        <select className={control} disabled={busy} value={String(p.axis ?? "x")} onChange={(e) => setProps({ axis: e.target.value })} data-testid="studio-slider-axis"><option value="x">{tr("أفقي", "Horizontal")}</option><option value="y">{tr("عمودي", "Vertical")}</option></select>
      </label>
      <Field label={tr("مدة الحركة بالثواني (٠–٢)", "Transition duration in seconds (0–2)")} value={String(p.duration ?? 0.7)} testId="studio-slider-duration" onSave={(v) => { const n = Number(v); if (v.trim() && Number.isFinite(n)) setProps({ duration: Math.max(0, Math.min(2, n)) }); }} />
      {p.effect === "coverflow" ? <label className="block text-[11px] text-white/55">{tr("حجم بطاقات العرض", "Coverflow card size")} <input type="range" min={0.7} max={1.5} step={0.1} disabled={busy} value={typeof p.zoom === "number" ? p.zoom : 1} onChange={(e) => setProps({ zoom: Number(e.target.value) })} data-testid="studio-slider-zoom" className="mt-1 w-full" /></label> : null}
      {toggle("thumbnails", tr("صور مصغّرة", "Thumbnails"), false)}
      {toggle("progress", tr("مؤشر التقدّم", "Progress indicator"), false)}
      <label className="block text-[11px] text-white/55">{tr("مكان كلام الشريحة", "Caption position")}
        <select className={control} disabled={busy} value={String(p.captionPosition ?? "bottom")} onChange={(e) => setProps({ captionPosition: e.target.value })} data-testid="studio-slider-captionPosition"><option value="bottom">{tr("تحت", "Bottom")}</option><option value="center">{tr("بالنص", "Center")}</option><option value="split">{tr("بجانب الصورة", "Split")}</option></select>
      </label>
      <div className="space-y-1" data-testid="studio-slider-looks">
        <div className="text-[11px] text-white/55">{say("شكل السلايدر|The slider's shape|צורת הסליידר")}</div>
        <div className="grid grid-cols-4 gap-1">
          {SLIDER_LOOK_NAMES.map(([key, name, mark]) => {
            const on = (p.look ?? "plain") === key;
            return <button key={key} type="button" disabled={busy} aria-pressed={on} title={say(name)} onClick={() => setProps({ look: key === "plain" ? undefined : key })} data-testid={`studio-slider-look-${key}`} className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-[10px] leading-tight ${on ? "border-accent-400 bg-accent-500/15 text-white" : "border-white/[0.08] text-white/65 hover:border-white/25"}`}><span aria-hidden="true" className="text-base leading-none">{mark}</span>{say(name)}</button>;
          })}
        </div>
        {(p.look === "peek" || p.look === "trio") && (p.effect ?? "slide") !== "slide" ? <p className="text-[11px] leading-5 text-amber-100/70">{say("هالشكل بيبيّن أكتر من شريحة مع حركة «سحب» بس.|This shape shows more than one slide with the \"Slide\" effect only.|הצורה הזו מציגה יותר משקופית אחת רק עם האפקט \"החלקה\".")}</p> : null}
      </div>
      <label className="block text-[11px] text-white/55">{say("شكل الأسهم|Arrows' look|מראה החצים")}
        <select className={control} disabled={busy} value={String(p.arrowLook ?? "round")} onChange={(e) => setProps({ arrowLook: e.target.value === "round" ? undefined : e.target.value })} data-testid="studio-slider-arrowLook">
          {SLIDER_ARROW_LOOK_NAMES.map(([key, name]) => <option key={key} value={key}>{say(name)}</option>)}
        </select>
      </label>
      <label className="block text-[11px] text-white/55">{say("شكل النقاط|Dots' look|מראה הנקודות")}
        <select className={control} disabled={busy} value={String(p.dotLook ?? "dots")} onChange={(e) => setProps({ dotLook: e.target.value === "dots" ? undefined : e.target.value })} data-testid="studio-slider-dotLook">
          {SLIDER_DOT_LOOK_NAMES.map(([key, name]) => <option key={key} value={key}>{say(name)}</option>)}
        </select>
      </label>
      <Choice label={tr("شكل الإطار", "The frame's shape")} value={typeof p.aspect === "string" ? p.aspect : "16 / 9"} busy={busy} testId="studio-slider-aspect" options={ASPECTS.map(([k, name]) => [k, name()] as [string, string])} onPick={(v) => setProps({ aspect: v === "16 / 9" ? undefined : v })} />
      <p className="text-[11px] leading-5 text-white/40">{tr("بالمتجر بتنسحب بالإصبع، وما بتقلب لحالها عند اللي طالب حركة أقل.", "In the store it swipes by finger, and it doesn't turn by itself for anyone who asked for less motion.")}</p>
      <MediaLibraryModal
        key={String(pick)}
        open={pick !== null}
        multiple={pick === "add"}
        maxSelect={Math.max(1, MAX_SLIDES - slides.length)}
        title={tr("صور للسلايدر", "Pictures for the slider")}
        onClose={() => setPick(null)}
        onSelectMultiple={(urls) => {
          setPick(null);
          save(addSlides(slides, urls, "image"), slides.length);
        }}
        onSelect={(u) => {
          const i = pick;
          setPick(null);
          if (typeof i === "number") save(changeSlide(slides, i, { src: u, kind: "image" }));
        }}
      />
    </>
  );
}

export const EDITABLE = new Set(["heading", "text", "button", "image", "video", "slider", "icon", "spacer", "products", "categories", "form", "lottie", "rive"]);

export function ElementPanel({ node, lang, busy, onOps }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops }) {
  const [media, setMedia] = useState(false);
  const p = (node.props ?? {}) as Record<string, unknown>;
  const setProps = (patch: Record<string, unknown>) => onOps(tr("تعديل", "Edit"), [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const words = (key: string, label: string, multiline = false) => (
    <Field label={label} multiline={multiline} value={wordsOf(p[key], lang)} onSave={(v) => setProps({ [key]: withWords(p[key], lang, v) })} testId={`studio-prop-${key}`} />
  );
  const link = (key: string, label: string, required = false) => (
    <Field label={label} value={typeof p[key] === "string" ? (p[key] as string) : ""} testId={`studio-prop-${key}`} onSave={(v) => {
      const t = v.trim();
      if (!t && !required) return setProps({ [key]: undefined });
      if (SAFE_LINK.test(t)) setProps({ [key]: t });
    }} />
  );
  const toggle = (key: string, label: string, def = false) => (
    <label key={key} className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/75">{label}</span>
      <input type="checkbox" disabled={busy} checked={p[key] === undefined ? def : p[key] === true} onChange={(e) => setProps({ [key]: e.target.checked })} />
    </label>
  );
  const body = (() => {
    switch (node.type) {
      case "heading":
        return (
          <>
            {words("text", tr("العنوان", "Heading"), true)}
            <Choice label={tr("الحجم", "Size")} value={String(p.level ?? 2)} busy={busy} options={[["1", "H1"], ["2", "H2"], ["3", "H3"], ["4", "H4"]]} onPick={(v) => setProps({ level: Number(v) })} />
          </>
        );
      case "text":
        return words("text", tr("النص", "Text"), true);
      case "button":
        return (
          <>
            {words("label", tr("كلام الزر", "The button's words"))}
            {link("href", tr("الرابط (صفحة بالمتجر متل /shop، أو https://…)", "Link (a store page like /shop, or https://…)"), true)}
            <Choice label={tr("الشكل", "Shape")} value={String(p.variant ?? "solid")} busy={busy} options={[["solid", tr("معبّى", "Filled")], ["outline", tr("إطار", "Outline")], ["link", tr("رابط", "Link")]]} onPick={(v) => setProps({ variant: v })} />
            {toggle("newTab", tr("بيفتح بصفحة جديدة", "Opens in a new tab"))}
          </>
        );
      case "image":
        return (
          <>
            {typeof p.src === "string" ? <img src={p.src} alt="" className="h-28 w-full rounded-lg object-cover" /> : null}
            <button type="button" className={btn} disabled={busy} onClick={() => setMedia(true)} data-testid="studio-pick-image">{tr("تغيير الصورة", "Change the picture")}</button>
            {words("alt", tr("وصف الصورة (لقارئ الشاشة)", "Picture description (for screen readers)"))}
            {link("href", tr("رابط عند الكبس (اختياري)", "Link when tapped (optional)"))}
            <MediaLibraryModal open={media} onClose={() => setMedia(false)} title={tr("صورة", "Picture")} onSelect={(u) => { setMedia(false); setProps({ src: u }); }} />
          </>
        );
      case "video":
        return (
          <>
            <Field label={tr("رابط الفيديو (MP4، من مكتبة الفيديوهات أو أي رابط https)", "Video link (MP4, from the video library or any https link)")} value={typeof p.src === "string" ? p.src : ""} testId="studio-prop-src" onSave={(v) => SAFE_FILE.test(v.trim()) && setProps({ src: v.trim() })} />
            <button type="button" className={btn} disabled={busy} onClick={() => setMedia(true)} data-testid="studio-pick-video">{tr("من مكتبة الفيديوهات", "From the video library")}</button>
            {words("label", tr("وصف الفيديو لقارئ الشاشة", "Video description for screen readers"))}
            <VideoPickerModal open={media} onClose={() => setMedia(false)} onPick={({ url, posterUrl }) => { setMedia(false); setProps({ src: url, ...(posterUrl ? { poster: posterUrl } : {}) }); }} />
            {toggle("autoplay", tr("بيشتغل لحاله (بلا صوت)", "Plays by itself (muted)"))}
            {toggle("loop", tr("بيعيد من الأول", "Loops"))}
            {toggle("controls", tr("أزرار التشغيل", "Play controls"), true)}
          </>
        );
      case "slider":
        return <SliderFields node={node} lang={lang} busy={busy} setProps={setProps} />;
      case "icon":
        return (
          <>
            <IconFields node={node} busy={busy} setProps={setProps} />
            {words("label", tr("كلام جنبها (اختياري)", "Words beside it (optional)"))}
          </>
        );
      case "lottie":
      case "rive": {
        const lottie = node.type === "lottie";
        const fileOk = (v: string) => SAFE_FILE.test(v) && (lottie ? /\.(json|lottie)([?#]|$)/i : /\.riv([?#]|$)/i).test(v);
        const name = (key: string, label: string) => (
          <Field label={label} value={typeof p[key] === "string" ? (p[key] as string) : ""} testId={`studio-prop-${key}`} onSave={(v) => setProps({ [key]: v.trim() ? v.trim().slice(0, 60) : undefined })} />
        );
        return (
          <>
            <Field
              label={lottie ? tr("رابط ملف Lottie (‎.json أو ‎.lottie)", "The Lottie file's link (.json or .lottie)") : tr("رابط ملف Rive (‎.riv)", "The Rive file's link (.riv)")}
              value={typeof p.src === "string" ? p.src : ""} testId="studio-prop-src"
              onSave={(v) => (!v.trim() ? setProps({ src: undefined }) : fileOk(v.trim()) && setProps({ src: v.trim() }))}
            />
            {!p.src ? <p className="text-[11px] leading-5 text-amber-200/80">{tr("حطّي رابط الملف لحتى يبيّن بالمتجر.", "Add the file's link so it shows in the shop.")}</p> : null}
            <p className="text-[10px] leading-4 text-white/40">
              {lottie
                ? tr("من LottieFiles: افتحي الرسمة، «Share» ثم انسخي رابط ‎.lottie أو ‎.json.", "From LottieFiles: open the animation, “Share”, then copy its .lottie or .json link.")
                : tr("من Rive: صدّري الملف ‎.riv وارفعيه، أو حطّي رابطه المباشر.", "From Rive: export the .riv file and put up its direct link.")}
            </p>
            <Choice
              label={tr("بتشتغل", "It plays")} value={String(p.play ?? "auto")} busy={busy} testId="studio-anim-play"
              options={[
                ["auto", tr("لحالها", "By itself")], ["view", tr("لما تبيّن", "Once it's seen")], ["hover", tr("مع الماوس", "With the mouse")],
                ...(lottie ? [["scroll", tr("مع السكرول", "With the scroll")] as [string, string]] : []),
              ]}
              onPick={(v) => setProps({ play: v === "auto" ? undefined : v })}
            />
            {lottie ? (
              <>
                {p.play !== "scroll" ? toggle("loop", tr("بتعيد من الأول", "Loops"), true) : null}
                <Choice
                  label={tr("السرعة", "Speed")} value={String(p.speed ?? 1)} busy={busy} testId="studio-anim-speed"
                  options={[["0.5", tr("نص", "Half")], ["1", tr("عادية", "Normal")], ["1.5", "×1.5"], ["2", "×2"]]}
                  onPick={(v) => setProps({ speed: v === "1" ? undefined : Number(v) })}
                />
              </>
            ) : (
              <>
                {name("stateMachine", tr("اسم الـ State Machine (اختياري)", "The state machine's name (optional)"))}
                {name("artboard", tr("اسم الـ Artboard (اختياري)", "The artboard's name (optional)"))}
              </>
            )}
            {words("label", tr("وصفها لقارئ الشاشة (فاضي = زينة بس)", "Its description for screen readers (empty = decoration only)"))}
          </>
        );
      }
      case "spacer":
        return <NumberField label={tr("الارتفاع", "Height")} suffix="px" value={typeof p.size === "number" ? p.size : 32} min={0} max={400} onSave={(v) => setProps({ size: v ?? 0 })} />;
      case "products":
        return (
          <>
            {words("title", tr("العنوان (اختياري)", "Title (optional)"))}
            <Choice
              label={tr("أي منتجات", "Which products")} value={String(p.source ?? "new")} busy={busy} testId="studio-products-source"
              options={[["new", tr("الأحدث", "Newest")], ["best", tr("الأكثر مبيعاً", "Best sellers")]]}
              onPick={(v) => setProps({ source: v })}
            />
            <NumberField label={tr("كم منتج", "How many")} value={typeof p.limit === "number" ? p.limit : 8} min={1} max={48} onSave={(v) => setProps({ limit: v ?? 8 })} />
            <Choice label={tr("الترتيب", "Layout")} value={String(p.layout ?? "grid")} busy={busy} options={[["grid", tr("شبكة", "Grid")], ["row", tr("صف بيتمرّر", "A scrolling row")]]} onPick={(v) => setProps({ layout: v })} />
            <Choice
              label={tr("شكل الكروت", "Card look")} value={String(p.card ?? "plain")} busy={busy} testId="studio-products-card"
              options={[["plain", tr("عادي", "Plain")], ["bordered", tr("بإطار", "Framed")], ["shadow", tr("بظل", "Shadowed")], ["soft", tr("بلون ناعم", "Soft colour")], ["lift", tr("بيطلع مع الماوس", "Lifts under the mouse")]]}
              onPick={(v) => setProps({ card: v === "plain" ? undefined : v })}
            />
            <NumberField label={tr("كم بالصف (فاضي = 4)", "How many in a row (empty = 4)")} value={typeof p.columns === "number" ? p.columns : undefined} min={1} max={6} onSave={(v) => setProps({ columns: v ?? undefined })} testId="studio-products-columns" />
          </>
        );
      case "categories":
        return (
          <>
            {words("title", tr("العنوان (اختياري)", "Title (optional)"))}
            <NumberField label={tr("كم قسم", "How many")} value={typeof p.limit === "number" ? p.limit : 6} min={1} max={24} onSave={(v) => setProps({ limit: v ?? 6 })} />
            <Choice
              label={tr("شكل الكروت", "Card look")} value={String(p.look ?? "tall")} busy={busy} testId="studio-categories-look"
              options={[["tall", tr("طولية", "Tall")], ["square", tr("مربعة", "Square")], ["circle", tr("دوائر", "Circles")], ["overlay", tr("الاسم فوق الصورة", "Name over the picture")], ["pill", tr("كبسولات", "Pills")], ["banner", tr("عريضة", "Wide")]]}
              onPick={(v) => setProps({ look: v === "tall" ? undefined : v })}
            />
            <NumberField label={tr("كم بالصف (فاضي = 3)", "How many in a row (empty = 3)")} value={typeof p.columns === "number" ? p.columns : undefined} min={1} max={6} onSave={(v) => setProps({ columns: v ?? undefined })} testId="studio-categories-columns" />
          </>
        );
      case "form":
        return (
          <>
            <Choice label={tr("النوع", "Kind")} value={String(p.kind ?? "newsletter")} busy={busy} options={[["newsletter", tr("النشرة البريدية", "Newsletter")], ["contact", tr("تواصل", "Contact")]]} onPick={(v) => setProps({ kind: v })} />
            {words("title", tr("العنوان (اختياري)", "Title (optional)"))}
          </>
        );
      default:
        return null;
    }
  })();
  if (!body) return null;
  return (
    <div className={box} data-testid="studio-element">
      <div className="text-xs font-medium text-white/70">{typeLabel(node.type)}</div>
      {body}
    </div>
  );
}

/* ---------------------------------------------------------------- actions */

export function NodeActions({ canUp, canDown, busy, onUp, onDown, onCopy, onDelete }: { canUp: boolean; canDown: boolean; busy: boolean; onUp: () => void; onDown: () => void; onCopy?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex flex-wrap gap-1" data-testid="studio-node-actions">
      <button type="button" className={btn} disabled={busy || !canUp} onClick={onUp}>↑ {tr("لقدّام", "Earlier")}</button>
      <button type="button" className={btn} disabled={busy || !canDown} onClick={onDown}>↓ {tr("لورا", "Later")}</button>
      {onCopy ? <button type="button" className={btn} disabled={busy} onClick={onCopy} data-testid="studio-copy">{tr("نسخة", "Copy")}</button> : null}
      {onDelete ? <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={onDelete} data-testid="studio-delete">{tr("حذف", "Delete")}</button> : null}
    </div>
  );
}

/** What can be added here; a click adds it, and most can be dragged into a cell on the page. */
export function AddMenu({ kinds, busy, title, onAdd, onDragKind }: { kinds: NewKind[]; busy: boolean; title: string; onAdd: (kind: NewKind, src?: string) => void; onDragKind: (kind: NewKind | null) => void }) {
  /** The library is open for a picture, or for a slider's first picture. */
  const [media, setMedia] = useState<"image" | "slider" | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  if (!kinds.length) return null;
  const videoOk = video !== null && SAFE_FILE.test(video.trim());
  return (
    <div className="space-y-2" data-testid="studio-add">
      <div className="text-[11px] text-white/55">{title}</div>
      <div className="grid grid-cols-3 gap-1">
        {kinds.map((k) => {
          const needsFile = k === "image" || k === "video" || k === "slider";
          return (
            <button
              key={k}
              type="button"
              disabled={busy}
              draggable={!needsFile && !busy}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", k);
                e.dataTransfer.effectAllowed = "copy";
                onDragKind(k);
              }}
              onDragEnd={() => onDragKind(null)}
              onClick={() => (k === "image" || k === "slider" ? setMedia(k) : k === "video" ? setVideo("") : onAdd(k))}
              className={`truncate rounded-lg border border-white/[0.08] px-1.5 py-1.5 text-[11px] text-white/80 hover:bg-white/[0.06] disabled:opacity-40 ${needsFile ? "" : "cursor-grab"}`}
              data-testid="studio-add-kind"
              data-kind={k}
            >
              + {typeLabel(k)}
            </button>
          );
        })}
      </div>
      {video !== null ? (
        <div className="space-y-1">
          <label className="block text-[11px] text-white/55">
            {tr("رابط الفيديو (MP4، من مكتبة الفيديوهات أو أي رابط https)", "Video link (MP4, from the video library or any https link)")}
            <input dir="ltr" className={control} value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://…/clip.mp4" data-testid="studio-add-video-url" />
          </label>
          <div className="flex gap-1">
            <button type="button" className={btn} disabled={busy || !videoOk} onClick={() => { onAdd("video", video.trim()); setVideo(null); }}>{tr("إضافة", "Add")}</button>
            <button type="button" className={btn} onClick={() => setVideo(null)}>{tr("إلغاء", "Cancel")}</button>
          </div>
        </div>
      ) : null}
      <MediaLibraryModal
        open={media !== null}
        onClose={() => setMedia(null)}
        title={media === "slider" ? tr("أول صورة بالسلايدر", "The slider's first picture") : tr("صورة", "Picture")}
        onSelect={(u) => {
          const kind = media ?? "image";
          setMedia(null);
          onAdd(kind, u);
        }}
      />
      <p className="text-[10px] leading-4 text-white/35">{tr("اسحب عنصر لجوّا خلية بالصفحة، أو كبسة بتضيفه هون.", "Drag an element into a cell on the page, or click to add it here.")}</p>
    </div>
  );
}
