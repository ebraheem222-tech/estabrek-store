/**
 * The editor's panels for words in depth (a family from the fonts library, italic, caps,
 * fluid size, lines, decoration, outline, gradient paint, shadows), for the box (colour,
 * gradient, frosted glass, frame, corners, shadow), picture filters, and an element's
 * states (mouse over, focus, pressed) with their pace. Each change is one screen's look
 * (columns.ts styleOp); in a state the panels get the state's view (states.ts).
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import { tr } from "../lib/words";
import { styleOp } from "./columns";
import { shownLook } from "./look";
import { Range } from "./LookPanels";
import { NEEDS_NORMAL, STATES, STATE_LABEL, presetsOf, statesOf, type StateChoice, type StateName } from "./states";
import { loadStoreThemes, shopOrigin, type TreeFontInfo } from "./storeThemes";
import { Choice, ColourPick, NumberField, SCREEN_LABEL } from "./StudioTreePanels";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Obj = Record<string, any>;
const box = "space-y-2.5 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const control = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);

function Fold({ title, open, children, testId }: { title: string; open?: boolean; children: React.ReactNode; testId?: string }) {
  return (
    <details className="rounded-lg border border-white/[0.06] px-2 py-1.5" open={open} data-testid={testId}>
      <summary className="cursor-pointer select-none text-[11px] font-medium text-white/70">{title}</summary>
      <div className="mt-2 space-y-2.5">{children}</div>
    </details>
  );
}
const toggle = (label: string, on: boolean, busy: boolean, flip: (on: boolean) => void, testId?: string) => (
  <label className="flex items-center justify-between gap-2 text-xs">
    <span className="text-white/75">{label}</span>
    <input type="checkbox" disabled={busy} checked={on} onChange={(e) => flip(e.target.checked)} data-testid={testId} />
  </label>
);
const Head = ({ title, screen }: { title: string; screen: TreeScreen }) => (
  <div className="flex items-center justify-between gap-2">
    <div className="text-xs font-medium text-white/70">{title}</div>
    <span className="text-[10px] text-white/40">{SCREEN_LABEL[screen]()}</span>
  </div>
);

/* ------------------------------------------------------------------- fonts */

/** The fonts library (from the shop, shared with the themes page's list). */
export function useTreeFonts(): TreeFontInfo[] {
  const q = useQuery({ queryKey: ["store-themes", "full"], queryFn: loadStoreThemes, staleTime: 300_000 });
  return q.data?.fonts ?? [];
}
const loaded = new Set<string>();
/** Each family's files from the shop, so its name in the picker shows in its own letters. */
function useFontFaces(fonts: TreeFontInfo[]) {
  useEffect(() => {
    if (typeof FontFace === "undefined" || !document.fonts) return;
    for (const f of fonts) {
      if (loaded.has(f.slug)) continue;
      loaded.add(f.slug);
      for (const face of f.faces ?? []) {
        try {
          const ff = new FontFace(`th-${f.slug}`, `url(${shopOrigin()}${face.file}) format("woff2")`, { weight: face.weight, unicodeRange: face.range, display: "swap" });
          document.fonts.add(ff);
          void ff.load().catch(() => undefined);
        } catch {
          // A browser that refuses a face just shows the name in the admin's own font.
        }
      }
    }
  }, [fonts]);
}

const KIND_LABEL: Record<TreeFontInfo["kind"], () => string> = {
  sans: () => tr("بسيطة (بدون زوائد)", "Plain (sans)"),
  serif: () => tr("كلاسيك (بزوائد)", "Classic (serif)"),
  display: () => tr("للعناوين", "For headings"),
  script: () => tr("خط يد", "Handwriting"),
};
const SCRIPT_LABEL: Record<string, () => string> = { arabic: () => tr("عربي", "Arabic"), hebrew: () => tr("عبري", "Hebrew"), latin: () => tr("إنجليزي", "English") };
const GENERIC: Array<[string, () => string]> = [
  ["heading", () => tr("خط العناوين", "Headings' font")],
  ["body", () => tr("خط النص", "Body font")],
  ["serif", () => tr("بحواف (كلاسيك)", "Serif (classic)")],
  ["sans", () => tr("بسيط", "Plain sans")],
  ["mono", () => tr("آلة كاتبة", "Typewriter")],
];
const SAMPLE: Record<string, string> = { arabic: "أبجد هوز", hebrew: "אבגד", latin: "Aa Bb" };

/** Picks the words' family: as designed, the theme's two, a plain kind, or one from the library (drawn in itself). */
export function FontPicker({ node, screen, busy, onOps }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops }) {
  const fonts = useTreeFonts();
  useFontFaces(fonts);
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState("");
  const family = shownLook(node, screen, "family");
  const font = shownLook(node, screen, "font");
  const current = typeof family === "string" ? fonts.find((f) => f.slug === family)?.name ?? family : GENERIC.find(([k]) => k === font)?.[1]() ?? tr("متل التصميم", "As designed");
  const save = (patch: Obj) => {
    onOps(tr("الخط", "Font"), [styleOp(node, screen, patch)]);
    setOpen(false);
  };
  const shown = useMemo(() => {
    const q = find.trim().toLowerCase();
    return q ? fonts.filter((f) => f.name.toLowerCase().includes(q) || f.slug.includes(q)) : fonts;
  }, [fonts, find]);
  const groups = (Object.keys(KIND_LABEL) as Array<TreeFontInfo["kind"]>).map((k) => [k, shown.filter((f) => f.kind === k)] as const).filter(([, list]) => list.length);
  const item = (on: boolean) => `flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-xs ${on ? "bg-accent-500/20 text-white" : "text-white/80 hover:bg-white/[0.06]"}`;
  return (
    <div className="text-[11px] text-white/55">
      {tr("الخط", "Font")}
      <button type="button" className={`${control} flex items-center justify-between text-start`} disabled={busy} onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="studio-font-picker">
        <span style={typeof family === "string" ? { fontFamily: `"th-${family}"` } : undefined}>{current}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="mt-1 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-white/[0.1] bg-surface-950 p-2" data-testid="studio-font-list">
          <input className={control} placeholder={tr("دوّر على خط", "Find a font")} value={find} onChange={(e) => setFind(e.target.value)} />
          <button type="button" className={item(family === undefined && font === undefined)} onClick={() => save({ family: null, font: null })}>{tr("متل التصميم", "As designed")}</button>
          {GENERIC.map(([k, name]) => (
            <button key={k} type="button" className={item(family === undefined && font === k)} onClick={() => save({ family: null, font: k })} data-font={k}>{name()}</button>
          ))}
          {groups.map(([kind, list]) => (
            <div key={kind}>
              <div className="px-1 pb-1 pt-2 text-[10px] uppercase tracking-wide text-white/40">{KIND_LABEL[kind]()}</div>
              {list.map((f) => (
                <button key={f.slug} type="button" className={item(family === f.slug)} onClick={() => save({ family: f.slug, font: null })} data-font={f.slug} title={f.scripts.map((s) => SCRIPT_LABEL[s]?.() ?? s).join(" · ")}>
                  <span style={{ fontFamily: `"th-${f.slug}"`, fontSize: 15 }}>{f.name}</span>
                  <span className="shrink-0 text-[13px] text-white/45" style={{ fontFamily: `"th-${f.slug}"` }}>{SAMPLE[f.scripts.includes("arabic") ? "arabic" : f.scripts.includes("hebrew") ? "hebrew" : "latin"]}</span>
                </button>
              ))}
            </div>
          ))}
          {!fonts.length ? <p className="px-1 text-[11px] text-white/40">{tr("ما قدرنا نجيب قائمة الخطوط من المتجر.", "Couldn't get the font list from the shop.")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- words, more */

const SHADOW_PRESETS: Array<[string, () => string, Obj[]]> = [
  ["soft", () => tr("ناعم", "Soft"), [{ x: 0, y: 2, blur: 8, color: "#00000040" }]],
  ["long", () => tr("طويل", "Long"), [{ x: 3, y: 3, blur: 0, color: "accent-soft" }, { x: 6, y: 6, blur: 0, color: "#00000022" }]],
  ["deep", () => tr("بارز 3D", "Raised 3D"), [1, 2, 3, 4].map((i) => ({ x: i, y: i, blur: 0, color: `#000000${["55", "44", "33", "22"][i - 1]}` }))],
  ["neon", () => tr("نيون", "Neon"), [{ x: 0, y: 0, blur: 6, color: "accent" }, { x: 0, y: 0, blur: 18, color: "accent" }]],
];

/**
 * Words beyond font and size: italic, capitals, fluid size, line count, even lines,
 * columns, spacing between words, a line under them, an outline, gradient paint, shadows.
 * `inState`: only what a state may change (the paint, never the layout of the words).
 */
export function TypeMorePanel({ node, screen, busy, onOps, inState = false }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops; inState?: boolean }) {
  const v = (k: string) => shownLook(node, screen, k);
  const save = (label: string, patch: Obj) => onOps(label, [styleOp(node, screen, patch)]);
  const deco = isObj(v("decoration")) ? (v("decoration") as Obj) : null;
  const stroke = isObj(v("stroke")) ? (v("stroke") as Obj) : null;
  const fill = isObj(v("fill")) ? (v("fill") as Obj) : null;
  const shadows = Array.isArray(v("shadows")) ? (v("shadows") as Obj[]) : [];
  const size = typeof v("size") === "number" ? (v("size") as number) : null;
  const sizeMin = typeof v("sizeMin") === "number" ? (v("sizeMin") as number) : null;
  const wordy = node.type === "heading" || node.type === "text";
  return (
    <div className={box} data-testid="studio-type-more">
      <Head title={inState ? tr("طلاء الكلام", "The words' paint") : tr("الكلام بالتفصيل", "The words in detail")} screen={screen} />
      {!inState ? (
        <>
          {toggle(tr("مايل", "Italic"), v("italic") === true, busy, (on) => save(tr("مايل", "Italic"), { italic: on || null }), "studio-type-italic")}
          <Choice
            label={tr("الأحرف (للإنجليزي)", "Letters (for English)")} value={String(v("caps") ?? "")} busy={busy} testId="studio-type-caps"
            options={[["", tr("متل ما انكتبت", "As written")], ["upper", "ABC"], ["lower", "abc"], ["title", "Abc"], ["small", tr("كبيرة صغيرة", "Small caps")]]}
            onPick={(c) => save(tr("الأحرف", "Letters"), { caps: c || null })}
          />
          {size !== null ? (
            <>
              {toggle(tr("حجم مرن (بيصغر لحاله عالموبايل)", "Fluid size (shrinks by itself on a phone)"), sizeMin !== null, busy, (on) => save(tr("حجم مرن", "Fluid size"), { sizeMin: on ? Math.max(8, Math.round(size * 0.6)) : null }), "studio-type-fluid")}
              {sizeMin !== null ? <Range label={tr("حجمه عالموبايل", "Its size on a phone")} min={8} max={Math.max(9, size - 1)} unit="px" busy={busy} value={Math.min(sizeMin, size - 1)} onSave={(n) => save(tr("حجم مرن", "Fluid size"), { sizeMin: n })} testId="studio-type-size-min" /> : null}
            </>
          ) : null}
          {wordy ? (
            <>
              <NumberField label={tr("أكتر إشي كم سطر (بعدها …)", "At most this many lines (then …)")} value={typeof v("lines") === "number" ? (v("lines") as number) : undefined} min={1} max={12} onSave={(n) => save(tr("عدد السطور", "Line count"), { lines: n })} testId="studio-type-lines" />
              <Choice
                label={tr("توزيع السطور", "Line breaking")} value={String(v("balance") ?? "")} busy={busy} testId="studio-type-balance"
                options={[["", tr("عادي", "Normal")], ["balance", tr("سطور متساوية", "Even lines")], ["pretty", tr("بلا كلمة لحالها آخر سطر", "No lonely last word")]]}
                onPick={(b) => save(tr("توزيع السطور", "Line breaking"), { balance: b || null })}
              />
              <Choice
                label={tr("أعمدة كلام", "Text columns")} value={String(v("textColumns") ?? "1")} busy={busy} testId="studio-type-columns"
                options={[["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]]}
                onPick={(c) => save(tr("أعمدة كلام", "Text columns"), { textColumns: c === "1" ? null : Number(c) })}
              />
            </>
          ) : null}
        </>
      ) : null}
      <Range label={tr("المسافة بين الكلمات", "Word spacing")} min={-10} max={40} unit="px" busy={busy} value={typeof v("wordSpacing") === "number" ? (v("wordSpacing") as number) : 0} onSave={(n) => save(tr("المسافة بين الكلمات", "Word spacing"), { wordSpacing: n || null })} testId="studio-type-words" />

      <Fold title={tr("خط تحت أو فوق الكلام", "A line under or over the words")} open={Boolean(deco)} testId="studio-type-deco">
        <Choice
          label={tr("الخط", "Line")} value={String(deco?.line ?? "")} busy={busy} testId="studio-deco-line"
          options={[["", tr("بلا", "None")], ["underline", tr("تحت", "Under")], ["overline", tr("فوق", "Over")], ["through", tr("بالنص", "Through")]]}
          onPick={(l) => save(tr("خط الكلام", "Text line"), { decoration: l ? { ...(deco ?? {}), line: l } : null })}
        />
        {deco ? (
          <>
            <Choice
              label={tr("شكله", "Its look")} value={String(deco.style ?? "solid")} busy={busy}
              options={[["solid", "—"], ["wavy", "〰"], ["dotted", "···"], ["dashed", "- -"], ["double", "="]]}
              onPick={(s) => save(tr("خط الكلام", "Text line"), { decoration: { ...deco, style: s === "solid" ? undefined : s } })}
            />
            <ColourPick label={tr("لونه", "Its colour")} value={deco.color ?? ""} busy={busy} onPick={(c) => save(tr("خط الكلام", "Text line"), { decoration: { ...deco, color: c ?? undefined } })} />
            <Range label={tr("سماكته", "Thickness")} min={1} max={12} unit="px" busy={busy} value={deco.width ?? 1} onSave={(n) => save(tr("خط الكلام", "Text line"), { decoration: { ...deco, width: n } })} />
            <Range label={tr("بعده عن الكلام", "Distance from the words")} min={-10} max={30} unit="px" busy={busy} value={deco.offset ?? 4} onSave={(n) => save(tr("خط الكلام", "Text line"), { decoration: { ...deco, offset: n } })} />
          </>
        ) : null}
      </Fold>

      <Fold title={tr("إطار الحروف وطلاء متدرّج", "Letter outline and gradient paint")} open={Boolean(stroke || fill)}>
        {toggle(tr("إطار حوالين الحروف", "An outline around the letters"), Boolean(stroke), busy, (on) => save(tr("إطار الحروف", "Letter outline"), { stroke: on ? { width: 1, color: "text" } : null }), "studio-type-stroke")}
        {stroke ? (
          <>
            <Range label={tr("سماكته", "Thickness")} min={0} max={10} step={0.5} unit="px" busy={busy} value={stroke.width} onSave={(n) => save(tr("إطار الحروف", "Letter outline"), { stroke: { ...stroke, width: n } })} />
            <ColourPick label={tr("لونه", "Its colour")} value={stroke.color} busy={busy} onPick={(c) => c && save(tr("إطار الحروف", "Letter outline"), { stroke: { ...stroke, color: c } })} />
            <p className="text-[10px] leading-4 text-white/35">{tr("مع لون كلام شفاف بيطلع كلام مفرّغ.", "With a see-through text colour the words look hollow.")}</p>
          </>
        ) : null}
        {toggle(tr("حروف بلون متدرّج", "Letters in a gradient"), Boolean(fill), busy, (on) => save(tr("طلاء متدرّج", "Gradient paint"), { fill: on ? { color: "accent", to: "#ff9ec7", angle: 90 } : null }), "studio-type-fill")}
        {fill ? (
          <>
            <ColourPick label={tr("من", "From")} value={fill.color} busy={busy} onPick={(c) => c && save(tr("طلاء متدرّج", "Gradient paint"), { fill: { ...fill, color: c } })} />
            <ColourPick label={tr("بالنص (أو بلا)", "Through (or none)")} value={fill.via ?? ""} busy={busy} onPick={(c) => save(tr("طلاء متدرّج", "Gradient paint"), { fill: { ...fill, via: c ?? undefined } })} />
            <ColourPick label={tr("لـ", "To")} value={fill.to} busy={busy} onPick={(c) => c && save(tr("طلاء متدرّج", "Gradient paint"), { fill: { ...fill, to: c } })} />
            <Range label={tr("الاتجاه", "Direction")} min={0} max={360} step={5} unit="°" busy={busy} value={fill.angle ?? 180} onSave={(n) => save(tr("طلاء متدرّج", "Gradient paint"), { fill: { ...fill, angle: n } })} />
          </>
        ) : null}
      </Fold>

      <Fold title={tr("ظلال الكلام", "The words' shadows")} open={shadows.length > 0} testId="studio-type-shadows">
        <div className="flex flex-wrap gap-1">
          {SHADOW_PRESETS.map(([k, name, list]) => (
            <button key={k} type="button" className={btn} disabled={busy} onClick={() => save(tr("ظلال الكلام", "The words' shadows"), { shadows: list })} data-preset={k}>{name()}</button>
          ))}
          {shadows.length ? <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(tr("ظلال الكلام", "The words' shadows"), { shadows: null })}>{tr("بلا", "None")}</button> : null}
        </div>
        {shadows.map((sh, i) => {
          const put = (patch: Obj) => save(tr("ظلال الكلام", "The words' shadows"), { shadows: shadows.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={i} className="space-y-1 rounded-lg bg-white/[0.03] p-2" data-testid="studio-type-shadow">
              <div className="flex items-center justify-between text-[11px] text-white/50">
                <span>{tr("ظل", "Shadow")} {i + 1}</span>
                <button type="button" className="text-red-300 hover:underline" disabled={busy} onClick={() => save(tr("ظلال الكلام", "The words' shadows"), { shadows: shadows.length > 1 ? shadows.filter((_, j) => j !== i) : null })}>{tr("شيل", "Remove")}</button>
              </div>
              <Range label={tr("لليمين والشمال", "Sideways")} min={-100} max={100} unit="px" busy={busy} value={sh.x} onSave={(n) => put({ x: n })} />
              <Range label={tr("لتحت", "Down")} min={-100} max={100} unit="px" busy={busy} value={sh.y} onSave={(n) => put({ y: n })} />
              <Range label={tr("النعومة", "Softness")} min={0} max={200} unit="px" busy={busy} value={sh.blur} onSave={(n) => put({ blur: n })} />
              <ColourPick label={tr("اللون", "Colour")} value={sh.color} busy={busy} onPick={(c) => c && put({ color: c })} />
            </div>
          );
        })}
        {shadows.length < 4 ? <button type="button" className={btn} disabled={busy} onClick={() => save(tr("ظلال الكلام", "The words' shadows"), { shadows: [...shadows, { x: 0, y: 4, blur: 12, color: "#00000040" }] })} data-testid="studio-type-shadow-add">+ {tr("ظل", "Shadow")}</button> : null}
      </Fold>
    </div>
  );
}

/* --------------------------------------------------------------------- box */

/** The box: colour, gradient, frosted glass, frame, corners, a ready shadow (`skip`: what a button's own panel already has). */
export function BoxPanel({ node, screen, busy, onOps, skip = [] }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops; skip?: Array<"bg" | "border" | "radius"> }) {
  const v = (k: string) => shownLook(node, screen, k);
  const save = (label: string, patch: Obj) => onOps(label, [styleOp(node, screen, patch)]);
  const grad = isObj(v("gradient")) ? (v("gradient") as Obj) : null;
  const glass = isObj(v("backdrop")) ? (v("backdrop") as Obj) : null;
  const border = isObj(v("border")) ? (v("border") as Obj) : null;
  return (
    <div className={box} data-testid="studio-box">
      <Head title={tr("الخلفية والإطار", "Background and frame")} screen={screen} />
      {skip.includes("bg") ? null : <ColourPick label={tr("لون الخلفية", "Background colour")} value={v("bg") ?? ""} busy={busy} onPick={(c) => save(tr("الخلفية", "Background"), { bg: c })} testId="studio-box-bg" />}
      {toggle(tr("خلفية متدرّجة", "A gradient background"), Boolean(grad), busy, (on) => save(tr("خلفية متدرّجة", "Gradient background"), { gradient: on ? { color: "accent-soft", to: "bg", angle: 160 } : null }), "studio-box-gradient")}
      {grad ? (
        <div className="space-y-2 rounded-lg bg-white/[0.03] p-2">
          <ColourPick label={tr("من", "From")} value={grad.color} busy={busy} onPick={(c) => c && save(tr("خلفية متدرّجة", "Gradient background"), { gradient: { ...grad, color: c } })} />
          <ColourPick label={tr("بالنص (أو بلا)", "Through (or none)")} value={grad.via ?? ""} busy={busy} onPick={(c) => save(tr("خلفية متدرّجة", "Gradient background"), { gradient: { ...grad, via: c ?? undefined } })} />
          <ColourPick label={tr("لـ", "To")} value={grad.to} busy={busy} onPick={(c) => c && save(tr("خلفية متدرّجة", "Gradient background"), { gradient: { ...grad, to: c } })} />
          {toggle(tr("من النص لبرّا (دائري)", "From the middle out (round)"), grad.radial === true, busy, (on) => save(tr("خلفية متدرّجة", "Gradient background"), { gradient: { ...grad, radial: on || undefined } }))}
          {!grad.radial ? <Range label={tr("الاتجاه", "Direction")} min={0} max={360} step={5} unit="°" busy={busy} value={grad.angle ?? 180} onSave={(n) => save(tr("خلفية متدرّجة", "Gradient background"), { gradient: { ...grad, angle: n } })} /> : null}
        </div>
      ) : null}
      {toggle(tr("زجاج مغبّش (بيغبّش اللي وراه)", "Frosted glass (blurs what's behind)"), Boolean(glass), busy, (on) => save(tr("زجاج مغبّش", "Frosted glass"), { backdrop: on ? { blur: 12, saturate: 1.4 } : null }), "studio-box-glass")}
      {glass ? (
        <>
          <Range label={tr("التغبيش", "Blur")} min={0} max={40} unit="px" busy={busy} value={glass.blur} onSave={(n) => save(tr("زجاج مغبّش", "Frosted glass"), { backdrop: { ...glass, blur: n } })} />
          <p className="text-[10px] leading-4 text-white/35">{tr("بيبيّن أحلى مع لون خلفية شفاف شوي.", "Looks best with a slightly see-through background colour.")}</p>
        </>
      ) : null}
      {skip.includes("border") ? null : <Choice
        label={tr("الإطار", "Frame")} value={border ? String(border.style ?? "solid") : "none"} busy={busy} testId="studio-box-border"
        options={[["none", tr("بلا", "None")], ["solid", "—"], ["dashed", "- -"], ["dotted", "···"]]}
        onPick={(s) => save(tr("الإطار", "Frame"), { border: s === "none" ? null : { width: border?.width ?? 1, color: border?.color ?? "border", ...(s === "solid" ? {} : { style: s }) } })}
      />}
      {border && !skip.includes("border") ? (
        <>
          <Range label={tr("سماكة الإطار", "Frame thickness")} min={0} max={20} unit="px" busy={busy} value={border.width} onSave={(n) => save(tr("الإطار", "Frame"), { border: { ...border, width: n } })} />
          <ColourPick label={tr("لون الإطار", "Frame colour")} value={border.color} busy={busy} onPick={(c) => c && save(tr("الإطار", "Frame"), { border: { ...border, color: c } })} />
        </>
      ) : null}
      {skip.includes("radius") ? null : <Range label={tr("استدارة الزوايا", "Corner rounding")} min={0} max={120} unit="px" busy={busy} value={typeof v("radius") === "number" ? (v("radius") as number) : 0} onSave={(n) => save(tr("الزوايا", "Corners"), { radius: n || null })} testId="studio-box-radius" />}
      <Choice
        label={tr("ظل جاهز", "A ready shadow")} value={String(v("shadow") ?? "")} busy={busy} testId="studio-box-shadow"
        options={[["", tr("متل التصميم", "As designed")], ["none", tr("بلا", "None")], ["sm", tr("خفيف", "Light")], ["md", tr("وسط", "Medium")], ["lg", tr("قوي", "Strong")]]}
        onPick={(s) => save(tr("الظل", "Shadow"), { shadow: s || null })}
      />
    </div>
  );
}

/** Inner space: top and bottom, and the sides (each side follows the text direction). */
export function PadPanel({ node, screen, busy, onOps }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops }) {
  const pad = shownLook(node, screen, "pad");
  const [v, h] = Array.isArray(pad) && pad.length === 4 ? [Number(pad[0]) || 0, Number(pad[1]) || 0] : [0, 0];
  const save = (nv: number, nh: number) => onOps(tr("المسافة جوّا", "Inner space"), [styleOp(node, screen, { pad: nv || nh ? [nv, nh, nv, nh] : null })]);
  return (
    <div className={box} data-testid="studio-pad">
      <Head title={tr("المسافة جوّا", "Inner space")} screen={screen} />
      <Range label={tr("فوق وتحت", "Top and bottom")} min={0} max={160} unit="px" busy={busy} value={v} onSave={(n) => save(n, h)} testId="studio-pad-v" />
      <Range label={tr("عالجنبين", "The sides")} min={0} max={160} unit="px" busy={busy} value={h} onSave={(n) => save(v, n)} testId="studio-pad-h" />
    </div>
  );
}

/* ----------------------------------------------------------------- filters */

const FILTERS: Array<[string, () => string, number, number, number, number, string]> = [
  // key, label, min, max, step, default, unit
  ["gray", () => tr("أبيض وأسود", "Black and white"), 0, 100, 1, 0, "%"],
  ["bright", () => tr("الإضاءة", "Brightness"), 0, 300, 5, 100, "%"],
  ["contrast", () => tr("التباين", "Contrast"), 0, 300, 5, 100, "%"],
  ["saturate", () => tr("قوة الألوان", "Colour strength"), 0, 300, 5, 100, "%"],
  ["hue", () => tr("تدوير الألوان", "Turn the colours"), -180, 180, 5, 0, "°"],
  ["blur", () => tr("تغبيش", "Blur"), 0, 40, 1, 0, "px"],
];
/** Picture filters: black and white, brighter, more contrast or colour, colours turned, blurred. */
export function FiltersPanel({ node, screen, busy, onOps }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops }) {
  const f = isObj(shownLook(node, screen, "filters")) ? (shownLook(node, screen, "filters") as Obj) : {};
  const save = (next: Obj) => onOps(tr("الفلاتر", "Filters"), [styleOp(node, screen, { filters: Object.keys(next).length ? next : null })]);
  const scaled = (k: string) => k !== "hue" && k !== "blur";
  return (
    <Fold title={tr("فلاتر (أبيض وأسود، إضاءة…)", "Filters (black and white, brightness…)")} open={Object.keys(f).length > 0} testId="studio-filters">
      {FILTERS.map(([k, label, min, max, step, def, unit]) => (
        <Range
          key={k} label={label()} min={min} max={max} step={step} unit={unit} busy={busy}
          value={typeof f[k] === "number" ? Math.round(f[k] * (scaled(k) ? 100 : 1)) : def}
          onSave={(n) => {
            const next = { ...f };
            if (n === def) delete next[k];
            else next[k] = scaled(k) ? n / 100 : n;
            save(next);
          }}
          testId={`studio-filter-${k}`}
        />
      ))}
      {Object.keys(f).length ? <button type="button" className={btn} disabled={busy} onClick={() => save({})}>{tr("بلا فلاتر", "No filters")}</button> : null}
    </Fold>
  );
}

/* ------------------------------------------------------------------ states */

/** Normal, mouse over, focused, pressed: which look the panels below change. A dot = it has one. */
export function StatesBar({ node, state, onState }: { node: PageTreeNode; state: StateChoice; onState: (s: StateChoice) => void }) {
  const has = new Set(statesOf(node));
  return (
    <div className="space-y-1.5 rounded-xl border border-accent-400/25 bg-accent-500/[0.05] p-2" data-testid="studio-states">
      <div className="text-[11px] text-white/60">{tr("شكله لما…", "Its look when…")}</div>
      <div className="grid grid-cols-4 gap-1" role="tablist" aria-label={tr("الحالة", "State")}>
        {(["normal", ...STATES] as StateChoice[]).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={state === s} onClick={() => onState(s)} className={`relative rounded-lg px-1 py-1.5 text-[11px] leading-tight ${state === s ? "bg-accent-500/80 text-white" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"}`} data-state={s} title={STATE_LABEL[s]()}>
            {STATE_LABEL[s]()}
            {s !== "normal" && has.has(s as StateName) ? <span className="absolute end-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      {state === "hover" ? <p className="text-[10px] leading-4 text-white/40">{tr("الموبايل ما فيه ماوس: هاد الشكل بيبيّن عالكمبيوتر بس.", "Phones have no mouse: this look shows on computers only.")}</p> : null}
      {state === "focused" ? <p className="text-[10px] leading-4 text-white/40">{tr("لما حدا يوصله بزر Tab: خلّيه واضح، بيساعد اللي ما بيستعمل ماوس.", "When someone reaches it with Tab: keep it clear, it helps people who don't use a mouse.")}</p> : null}
    </div>
  );
}

/** A state's ready looks, and clearing it. */
export function StatePresets({ node, view, state, screen, busy, onOps, onOwn }: {
  node: PageTreeNode; view: PageTreeNode; state: StateName; screen: TreeScreen; busy: boolean;
  /** Changes to the state's view (mapped back by the caller). */
  onOps: Ops;
  /** Changes to the element's own normal look. */
  onOwn: Ops;
}) {
  const own = ((view.style ?? {}) as Record<string, Obj | undefined>)[screen];
  return (
    <div className={box} data-testid="studio-state-presets">
      <Head title={tr("أشكال جاهزة", "Ready looks")} screen={screen} />
      <div className="grid grid-cols-2 gap-1">
        {presetsOf(state, node.type).map((p) => (
          <button
            key={p.key} type="button" disabled={busy} className="truncate rounded-lg border border-white/[0.08] px-1.5 py-1.5 text-start text-[11px] text-white/80 hover:bg-white/[0.05] disabled:opacity-40" data-preset={p.key}
            onClick={() => {
              onOps(p.label(), [styleOp(view, screen, p.look)]);
              const normal = NEEDS_NORMAL[p.key];
              if (normal) onOwn(p.label(), [styleOp(node, screen, normal)]);
            }}
          >
            {p.label()}
          </button>
        ))}
      </div>
      {own && Object.keys(own).length ? (
        <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => onOps(tr("شيل الشكل", "Remove the look"), [{ op: "setStyle", nodeId: view.id, screen, style: null }])} data-testid="studio-state-clear">
          {tr("شيل شكل هالحالة", "Remove this state's look")}
        </button>
      ) : null}
    </div>
  );
}

const EASES: Array<[string, () => string]> = [
  ["smooth", () => tr("ناعمة", "Smooth")],
  ["soft", () => tr("هادية", "Gentle")],
  ["strong", () => tr("قوية", "Strong")],
  ["back", () => tr("بترجع شوي", "Overshoots")],
  ["elastic", () => tr("مطاطية", "Elastic")],
  ["bounce", () => tr("بتنط", "Bouncy")],
  ["linear", () => tr("ثابتة", "Even")],
];
/** How fast it changes to its states and back (kept per screen, the computer's for all unless a screen says). */
export function TransitionPanel({ node, screen, busy, onOps }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops }) {
  const t = isObj(shownLook(node, screen, "transition")) ? (shownLook(node, screen, "transition") as Obj) : null;
  const save = (patch: Obj | null) => onOps(tr("سرعة التغيير", "Change speed"), [styleOp(node, screen, { transition: patch ? { duration: 0.3, ...(t ?? {}), ...patch } : null })]);
  return (
    <div className={box} data-testid="studio-transition">
      <Head title={tr("كيف بيتغيّر", "How it changes")} screen={screen} />
      <Range label={tr("المدة", "Duration")} min={0} max={2} step={0.05} unit="s" busy={busy} value={t?.duration ?? 0.3} onSave={(n) => save({ duration: n })} testId="studio-transition-duration" />
      <label className="block text-[11px] text-white/55">
        {tr("نوع الحركة", "Kind of motion")}
        <select className={control} disabled={busy} value={String(t?.ease ?? "smooth")} onChange={(e) => save({ ease: e.target.value === "smooth" ? undefined : e.target.value })} data-testid="studio-transition-ease">
          {EASES.map(([k, name]) => <option key={k} value={k}>{name()}</option>)}
        </select>
      </label>
      <Range label={tr("بيستنى قبل", "Waits first")} min={0} max={1} step={0.05} unit="s" busy={busy} value={t?.delay ?? 0} onSave={(n) => save({ delay: n || undefined })} />
      {t ? <button type="button" className={btn} disabled={busy} onClick={() => save(null)}>{tr("رجوع للسرعة العادية", "Back to the usual speed")}</button> : null}
    </div>
  );
}
