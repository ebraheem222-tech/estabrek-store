/**
 * The new editor's panels for the tree's own elements (track B, phase 3): columns
 * (their split, gap, alignment and what a phone does with them), a cell (colour,
 * inner space, shape, frame, alignment), a section of the page, each element's
 * settings (words in the language being edited, links, pictures, clips, a slider's
 * slides), and the list of elements to add. Every change goes out as draft changes, so undo works
 * on all of it.
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { MAX_CELLS, MAX_SLIDES, PRESETS, addSlides, changeSlide, dropCellOps, layoutOps, moveSlide, reduceWidths, sameWidths, shownWidths, slidesOf, styleOp, type NewKind, type Slide } from "./columns";
import { Field } from "./StudioPanels";
import { typeLabel } from "./treeIndex";

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
  const own = typeof value === "string" && HEX.test(value) ? value : null;
  const [hex, setHex] = useState(own ?? "#ffffff");
  return (
    <label className="block text-[11px] text-white/55">
      {label}
      <span className="flex items-center gap-1">
        <select className={control} disabled={busy} value={own ? "own" : typeof value === "string" ? value : ""} onChange={(e) => (e.target.value === "own" ? onPick(hex) : onPick(e.target.value || null))} data-testid={testId}>
          {COLOURS.map(([k, name]) => <option key={k} value={k}>{name()}</option>)}
          <option value="own">{tr("لون خاص", "A colour of its own")}</option>
        </select>
        <input type="color" aria-label={tr("لون خاص", "A colour of its own")} className="mt-1 h-8 w-9 shrink-0 cursor-pointer rounded border border-white/[0.1] bg-transparent" disabled={busy} value={six(own ?? hex)} onChange={(e) => setHex(e.target.value)} onBlur={() => hex !== own && onPick(hex)} />
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

const SHAPES: Array<[string, () => string, string]> = [
  ["rect", () => tr("مربع", "Square"), "rounded-none"],
  ["rounded", () => tr("زوايا ناعمة", "Soft corners"), "rounded-md"],
  ["pill", () => tr("كبسولة", "Pill"), "rounded-full"],
  ["arch", () => tr("قوس", "Arch"), "rounded-t-full"],
  ["circle", () => tr("دائرة", "Circle"), "rounded-full aspect-square"],
];

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
      <div className="text-[11px] text-white/55">
        {tr("الشكل", "Shape")}
        <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label={tr("الشكل", "Shape")} data-testid="studio-cell-shape">
          {SHAPES.map(([k, name, cls]) => (
            <button key={k} type="button" title={name()} aria-label={name()} aria-pressed={base.shape === k} disabled={busy} className={`${chip(base.shape === k)} flex items-center gap-1.5`} onClick={() => set(tr("شكل الخلية", "The cell's look"), { shape: base.shape === k ? null : k, radius: null })} data-value={k}>
              <span className={`inline-block h-4 w-5 border border-current ${cls}`} aria-hidden="true" />
              <span>{name()}</span>
            </button>
          ))}
        </div>
      </div>
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
const ICONS: Array<[string, () => string]> = [
  ["heart", () => tr("قلب", "Heart")],
  ["star", () => tr("نجمة", "Star")],
  ["truck", () => tr("توصيل", "Delivery")],
  ["shield", () => tr("حماية", "Protection")],
  ["gift", () => tr("هدية", "Gift")],
  ["phone", () => tr("هاتف", "Phone")],
  ["whatsapp", () => tr("واتساب", "WhatsApp")],
  ["mail", () => tr("بريد", "Mail")],
  ["check", () => tr("صح", "Tick")],
  ["sparkle", () => tr("لمعة", "Sparkle")],
  ["bag", () => tr("شنطة", "Bag")],
  ["return", () => tr("إرجاع", "Return")],
];

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
  const toggle = (key: string, label: string) => (
    <label key={key} className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/75">{label}</span>
      <input type="checkbox" disabled={busy} checked={p[key] !== false} onChange={(e) => setProps({ [key]: e.target.checked })} data-testid={`studio-slider-${key}`} />
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

export const EDITABLE = new Set(["heading", "text", "button", "image", "video", "slider", "icon", "spacer", "categories", "form"]);

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
            <label className="block text-[11px] text-white/55">
              {tr("الأيقونة", "Icon")}
              <select className={control} disabled={busy} value={String(p.name ?? "heart")} onChange={(e) => setProps({ name: e.target.value })}>
                {ICONS.map(([k, name]) => <option key={k} value={k}>{name()}</option>)}
              </select>
            </label>
            {words("label", tr("كلام جنبها (اختياري)", "Words beside it (optional)"))}
          </>
        );
      case "spacer":
        return <NumberField label={tr("الارتفاع", "Height")} suffix="px" value={typeof p.size === "number" ? p.size : 32} min={0} max={400} onSave={(v) => setProps({ size: v ?? 0 })} />;
      case "categories":
        return (
          <>
            {words("title", tr("العنوان (اختياري)", "Title (optional)"))}
            <NumberField label={tr("كم قسم", "How many")} value={typeof p.limit === "number" ? p.limit : 6} min={1} max={24} onSave={(v) => setProps({ limit: v ?? 6 })} />
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
