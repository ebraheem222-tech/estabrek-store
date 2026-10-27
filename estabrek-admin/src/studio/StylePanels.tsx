/**
 * The editor's style panels for words, buttons, pictures and clips, and where each shows:
 * for the tree's own elements and for parts of old sections and scenes alike (those are
 * handed in as a look's node, see StudioPage). Every change is one screen's look
 * (columns.ts styleOp), so undo has one step each.
 */
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import { tr } from "../lib/words";
import { styleOp } from "./columns";
import { lookOf, shownLook } from "./look";
import { Range } from "./LookPanels";
import { Choice, ColourPick, NumberField, SCREEN_LABEL } from "./StudioTreePanels";

type Ops = (label: string, ops: PageDraftOp[]) => void;
const box = "space-y-2.5 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";

const FONTS: Array<[string, () => string]> = [
  ["", () => tr("متل التصميم", "As designed")],
  ["heading", () => tr("خط العناوين", "Headings' font")],
  ["body", () => tr("خط النص", "Body font")],
  ["serif", () => tr("بحواف (كلاسيك)", "Serif (classic)")],
  ["sans", () => tr("بسيط", "Plain sans")],
  ["mono", () => tr("آلة كاتبة", "Typewriter")],
];
const WEIGHTS: Array<[string, () => string]> = [
  ["", () => tr("متل التصميم", "As designed")],
  ["300", () => tr("رفيع", "Light")],
  ["400", () => tr("عادي", "Regular")],
  ["600", () => tr("نص غامق", "Semi-bold")],
  ["700", () => tr("غامق", "Bold")],
  ["800", () => tr("غامق كتير", "Extra bold")],
];

/** Words: font, size, weight, colour, alignment, line height, spacing between letters. */
export function TextStylePanel({ node, screen, busy, onOps, only }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops; only?: Array<"font" | "size" | "weight" | "color" | "align" | "lines"> }) {
  const has = (k: string) => !only || (only as string[]).includes(k);
  const v = (k: string) => shownLook(node, screen, k);
  const save = (label: string, patch: Record<string, unknown>) => onOps(label, [styleOp(node, screen, patch)]);
  const lh = typeof v("lineHeight") === "number" ? (v("lineHeight") as number) : null;
  const ls = typeof v("letterSpacing") === "number" ? (v("letterSpacing") as number) : null;
  return (
    <div className={box} data-testid="studio-text-style">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{tr("الكلام", "The words")}</div>
        <span className="text-[10px] text-white/40">{SCREEN_LABEL[screen]()}</span>
      </div>
      {has("font") ? (
        <label className="block text-[11px] text-white/55">
          {tr("الخط", "Font")}
          <select className="mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white" disabled={busy} value={String(v("font") ?? "")} onChange={(e) => save(tr("الخط", "Font"), { font: e.target.value || null })} data-testid="studio-style-font">
            {FONTS.map(([k, name]) => <option key={k} value={k}>{name()}</option>)}
          </select>
        </label>
      ) : null}
      {has("size") ? <NumberField label={tr("حجم الخط (فاضي = متل التصميم)", "Font size (empty = as designed)")} suffix="px" value={typeof v("size") === "number" ? (v("size") as number) : undefined} min={8} max={200} onSave={(n) => save(tr("حجم الخط", "Font size"), { size: n })} testId="studio-style-size" /> : null}
      {has("weight") ? (
        <label className="block text-[11px] text-white/55">
          {tr("سماكة الخط", "Weight")}
          <select className="mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white" disabled={busy} value={String(v("weight") ?? "")} onChange={(e) => save(tr("سماكة الخط", "Weight"), { weight: e.target.value ? Number(e.target.value) : null })} data-testid="studio-style-weight">
            {WEIGHTS.map(([k, name]) => <option key={k} value={k}>{name()}</option>)}
          </select>
        </label>
      ) : null}
      {has("color") ? <ColourPick label={tr("لون الكلام", "Text colour")} value={v("color")} busy={busy} onPick={(c) => save(tr("لون الكلام", "Text colour"), { color: c })} testId="studio-style-color" /> : null}
      {has("align") ? (
        <Choice
          label={tr("المحاذاة", "Alignment")} value={String(v("textAlign") ?? "")} busy={busy} testId="studio-style-align"
          options={[["", tr("متل التصميم", "As designed")], ["start", tr("أول السطر", "Line start")], ["center", tr("بالنص", "Centre")], ["end", tr("آخر السطر", "Line end")]]}
          onPick={(a) => save(tr("المحاذاة", "Alignment"), { textAlign: a || null })}
        />
      ) : null}
      {has("lines") ? (
        <>
          <Range label={tr("المسافة بين السطور", "Line height")} min={0.8} max={3} step={0.05} busy={busy} value={lh ?? 1.5} onSave={(n) => save(tr("المسافة بين السطور", "Line height"), { lineHeight: n })} testId="studio-style-line" />
          <Range label={tr("المسافة بين الحروف", "Letter spacing")} min={-5} max={20} step={0.5} unit="px" busy={busy} value={ls ?? 0} onSave={(n) => save(tr("المسافة بين الحروف", "Letter spacing"), { letterSpacing: n || null })} testId="studio-style-spacing" />
          {lh !== null || ls !== null ? <button type="button" className={btn} disabled={busy} onClick={() => save(tr("المسافات", "Spacing"), { lineHeight: null, letterSpacing: null })}>{tr("رجوع لمسافات التصميم", "Back to the design's spacing")}</button> : null}
        </>
      ) : null}
    </div>
  );
}

const PADS: Record<string, [number, number, number, number]> = { s: [6, 14, 6, 14], m: [10, 22, 10, 22], l: [14, 32, 14, 32] };

/** A button: its colours, shape, frame and size. */
export function ButtonStylePanel({ node, screen, busy, onOps }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops }) {
  const v = (k: string) => shownLook(node, screen, k);
  const save = (label: string, patch: Record<string, unknown>) => onOps(label, [styleOp(node, screen, patch)]);
  const radius = v("radius");
  const shape = radius === 0 ? "square" : radius === 12 ? "soft" : radius === 999 ? "pill" : "";
  const pad = v("pad") as number[] | undefined;
  const size = pad ? (Object.entries(PADS).find(([, p]) => p.join() === pad.join())?.[0] ?? "") : "";
  const border = v("border") as { color?: string } | undefined;
  return (
    <div className={box} data-testid="studio-button-style">
      <div className="text-xs font-medium text-white/70">{tr("شكل الزر", "The button's look")}</div>
      <ColourPick label={tr("لون الزر", "Button colour")} value={v("bg")} busy={busy} onPick={(c) => save(tr("لون الزر", "Button colour"), { bg: c })} testId="studio-button-bg" />
      <ColourPick label={tr("لون الكلام", "Text colour")} value={v("color")} busy={busy} onPick={(c) => save(tr("لون الكلام", "Text colour"), { color: c })} testId="studio-button-color" />
      <Choice
        label={tr("الشكل", "Shape")} value={shape} busy={busy} testId="studio-button-shape"
        options={[["", tr("متل التصميم", "As designed")], ["square", tr("مربع", "Square")], ["soft", tr("زوايا ناعمة", "Soft corners")], ["pill", tr("كبسولة", "Pill")]]}
        onPick={(s) => save(tr("شكل الزر", "The button's look"), { radius: s === "square" ? 0 : s === "soft" ? 12 : s === "pill" ? 999 : null })}
      />
      <Choice
        label={tr("الحجم", "Size")} value={size} busy={busy} testId="studio-button-size"
        options={[["", tr("متل التصميم", "As designed")], ["s", tr("صغير", "Small")], ["m", tr("وسط", "Medium")], ["l", tr("كبير", "Large")]]}
        onPick={(s) => save(tr("حجم الزر", "Button size"), { pad: s ? PADS[s] : null })}
      />
      <Choice
        label={tr("الإطار", "Frame")} value={border ? "line" : "none"} busy={busy}
        options={[["none", tr("بلا", "None")], ["line", tr("خط", "Line")]]}
        onPick={(s) => save(tr("الإطار", "Frame"), { border: s === "line" ? { width: 1, color: typeof v("color") === "string" ? v("color") : "text" } : null })}
      />
    </div>
  );
}

const SPOTS: Array<[number, number]> = [[0, 0], [50, 0], [100, 0], [0, 50], [50, 50], [100, 50], [0, 100], [50, 100], [100, 100]];

/** A picture or clip: how it fills its frame, which point stays in sight, its corners, see-through. */
export function MediaStylePanel({ node, screen, busy, onOps }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops }) {
  const v = (k: string) => shownLook(node, screen, k);
  const save = (label: string, patch: Record<string, unknown>) => onOps(label, [styleOp(node, screen, patch)]);
  const focus = (v("focus") as { x: number; y: number } | undefined) ?? { x: 50, y: 50 };
  return (
    <div className={box} data-testid="studio-media-style">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{tr("الصورة بإطارها", "The picture in its frame")}</div>
        <span className="text-[10px] text-white/40">{SCREEN_LABEL[screen]()}</span>
      </div>
      <Choice
        label={tr("كيف بتعبّي الإطار", "How it fills the frame")} value={String(v("fit") ?? "cover")} busy={busy} testId="studio-media-fit"
        options={[["cover", tr("بتعبّيه كله (بتنقص من الأطراف)", "Fills it (edges may be cut)")], ["contain", tr("كلها بتبيّن", "Shows whole")]]}
        onPick={(f) => save(tr("تعبئة الإطار", "Fill"), { fit: f === "cover" ? null : f })}
      />
      <div className="text-[11px] text-white/55">
        {tr("النقطة اللي بتضل ظاهرة", "The point that stays in sight")}
        <div className="mt-1 flex items-start gap-3">
          <div className="grid w-20 shrink-0 grid-cols-3 gap-1" role="group" aria-label={tr("النقطة اللي بتضل ظاهرة", "The point that stays in sight")} data-testid="studio-media-focus">
            {SPOTS.map(([x, y]) => (
              <button key={`${x}-${y}`} type="button" disabled={busy} aria-pressed={focus.x === x && focus.y === y} onClick={() => save(tr("نقطة التركيز", "Focus point"), { focus: x === 50 && y === 50 ? null : { x, y } })} className={`h-5 rounded ${focus.x === x && focus.y === y ? "bg-accent-500/70" : "bg-white/[0.08] hover:bg-white/[0.14]"}`} data-spot={`${x},${y}`} />
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <Range label={tr("يمين وشمال", "Across")} min={0} max={100} unit="%" busy={busy} value={focus.x} onSave={(x) => save(tr("نقطة التركيز", "Focus point"), { focus: { ...focus, x } })} />
            <Range label={tr("فوق وتحت", "Down")} min={0} max={100} unit="%" busy={busy} value={focus.y} onSave={(y) => save(tr("نقطة التركيز", "Focus point"), { focus: { ...focus, y } })} />
          </div>
        </div>
      </div>
      <Range label={tr("استدارة الزوايا", "Corner rounding")} min={0} max={120} unit="px" busy={busy} value={typeof v("radius") === "number" ? (v("radius") as number) : 0} onSave={(r) => save(tr("الزوايا", "Corners"), { radius: r || null })} testId="studio-media-radius" />
      <Range label={tr("الشفافية (100 = واضح كله)", "See-through (100 = fully seen)")} min={0} max={100} unit="%" busy={busy} value={Math.round((typeof v("opacity") === "number" ? (v("opacity") as number) : 1) * 100)} onSave={(o) => save(tr("الشفافية", "See-through"), { opacity: o === 100 ? null : o / 100 })} testId="studio-media-opacity" />
    </div>
  );
}

/**
 * Where it shows: the computer, the tablet, the phone. A smaller screen follows the bigger
 * one unless it has its own choice (the shop's pageTree/css.ts hiddenRules).
 */
export function ShowOnPanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: Ops }) {
  const own = (s: TreeScreen) => lookOf(node, s).hidden;
  const b = own("base") === true;
  const t = typeof own("tablet") === "boolean" ? (own("tablet") as boolean) : b;
  const m = typeof own("mobile") === "boolean" ? (own("mobile") as boolean) : t;
  const hidden: Record<TreeScreen, boolean> = { base: b, tablet: t, mobile: m };
  const flip = (s: TreeScreen, show: boolean) => {
    const h = { ...hidden, [s]: !show };
    onOps(show ? tr("إظهار", "Show") : tr("إخفاء", "Hide"), [
      styleOp(node, "base", { hidden: h.base || null }),
      styleOp(node, "tablet", { hidden: h.tablet === h.base ? null : h.tablet }),
      styleOp(node, "mobile", { hidden: h.mobile === h.tablet ? null : h.mobile }),
    ]);
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/[0.08] px-3 py-2 text-[11px] text-white/60" data-testid="studio-show-on">
      <span>{tr("بيبيّن على", "Shows on")}</span>
      {(["base", "tablet", "mobile"] as const).map((s) => (
        <label key={s} className="flex items-center gap-1">
          <input type="checkbox" disabled={busy} checked={!hidden[s]} onChange={(e) => flip(s, e.target.checked)} data-screen={s} />
          <span>{SCREEN_LABEL[s]()}</span>
        </label>
      ))}
    </div>
  );
}
