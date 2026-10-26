/**
 * A drawing's panel in the new editor: the ready drawings (with their knobs), one's own
 * SVG (pasted or from a file, turned into safe data — what's left out is named), its
 * colours one by one, its line width and the words screen readers hear. ArtView draws
 * a drawing here the way the shop does (theme colours shown as the rose design's).
 */
import { useId, useState, type ReactNode } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { styleOp } from "./columns";
import { Range } from "./LookPanels";
import { ColourPick, NumberField } from "./StudioTreePanels";
import { Field } from "./StudioPanels";
import { hasLines, importSvg, lineWidthOf, paletteOf, recolor, setLineWidth, type Art, type ArtNode } from "./svgArt";
import { SHAPES, defaultsOf, shapeByKey } from "./svgShapes";

type Ops = (label: string, ops: PageDraftOp[]) => void;
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const SHOWN: Record<string, string> = {
  text: "#3b2530", muted: "#8d7380", accent: "#c86b98", "accent-soft": "#f6d6e4", "accent-contrast": "#ffffff",
  bg: "#fff8f4", surface: "#ffffff", border: "#e7d6dd", white: "#ffffff", black: "#000000", transparent: "transparent",
};
const CAMEL = (k: string) => k.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

/** A drawing as SVG, here in the editor. */
export function ArtView({ art, className }: { art: Art; className?: string }) {
  const prefix = useId().replace(/[^\w-]/g, "");
  const draw = (n: ArtNode, i: number): ReactNode => {
    const props: Record<string, unknown> = { key: i };
    for (const [k, v] of Object.entries(n.a)) {
      if (k === "id") props.id = `${prefix}-${v}`;
      else if (v.startsWith("url(#")) props[CAMEL(k)] = v.replace("url(#", `url(#${prefix}-`);
      else props[CAMEL(k)] = SHOWN[v] ?? (v === "currentColor" ? SHOWN.accent : v);
    }
    const Tag = n.t as "path";
    return <Tag {...(props as object)}>{(n.c ?? []).map(draw)}</Tag>;
  };
  return (
    <svg viewBox={art.viewBox} className={className} aria-hidden="true">
      {art.nodes.map(draw)}
    </svg>
  );
}

const PROBLEM: Record<string, () => string> = {
  big: () => tr("الملف كبير كتير (أكتر من 400KB).", "The file is too big (over 400 KB)."),
  notSvg: () => tr("هاد مش ملف SVG.", "That isn't an SVG file."),
  empty: () => tr("ما ضل فيه ولا شكل مسموح.", "No allowed shape was left in it."),
};

export function SvgPanel({ node, lang, busy, onOps }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops }) {
  const p = (node.props ?? {}) as Record<string, unknown>;
  const art = p.art as Art | undefined;
  const lib = shapeByKey(p.shape);
  const knobs = (p.knobs ?? {}) as Record<string, number>;
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const setProps = (label: string, patch: Record<string, unknown>) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const take = (text: string) => {
    const r = importSvg(text);
    if (!r.art) return setNote(PROBLEM[r.problem ?? "empty"]());
    setNote(r.dropped.length ? `${tr("انشالت أشياء مش مسموحة", "Left out, not allowed")}: ${r.dropped.join("، ")}` : tr("انضافت كاملة.", "Taken in whole."));
    setPaste("");
    setProps(tr("رسمة خاصة", "Own drawing"), { art: r.art, shape: undefined, knobs: undefined });
  };
  const width = art ? lineWidthOf(art) : null;
  const baseWidth = (((node.style ?? {}) as Record<string, Record<string, unknown>>).base ?? {}).width;
  const shownWidth = typeof baseWidth === "string" && /^\d+px$/.test(baseWidth) ? parseInt(baseWidth, 10) : undefined;
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] p-3" data-testid="studio-svg">
      <div className="text-xs font-medium text-white/70">{tr("الرسمة", "Drawing")}</div>
      {art ? <ArtView art={art} className="mx-auto block h-24 w-full rounded-lg bg-white/[0.92] p-2" /> : null}
      <div className="grid grid-cols-4 gap-1" role="group" aria-label={tr("رسمات جاهزة", "Ready drawings")} data-testid="studio-svg-shapes">
        {SHAPES.map((s) => (
          <button
            key={s.key} type="button" disabled={busy} title={s.label()} aria-label={s.label()} aria-pressed={p.shape === s.key}
            onClick={() => setProps(s.label(), { shape: s.key, knobs: defaultsOf(s), art: s.make(defaultsOf(s)) })}
            className={`rounded-lg border p-1 ${p.shape === s.key ? "border-accent-400/70 bg-white/[0.9]" : "border-white/[0.08] bg-white/[0.75] hover:bg-white/[0.9]"} disabled:opacity-40`}
            data-shape={s.key}
          >
            <ArtView art={s.make(defaultsOf(s))} className="block h-8 w-full" />
          </button>
        ))}
      </div>
      {lib && lib.knobs.length ? (
        <div className="space-y-2">
          {lib.knobs.map((kn) => (
            <Range
              key={kn.key} label={kn.label()} min={kn.min} max={kn.max} step={kn.step} busy={busy} value={knobs[kn.key] ?? kn.def}
              onSave={(v) => {
                const next = { ...defaultsOf(lib), ...knobs, [kn.key]: v };
                setProps(lib.label(), { knobs: next, art: lib.make(next) });
              }}
              testId={`studio-knob-${kn.key}`}
            />
          ))}
        </div>
      ) : null}

      <details className="rounded-lg border border-white/[0.06] px-2 py-1.5" data-testid="studio-svg-own">
        <summary className="cursor-pointer select-none text-[11px] font-medium text-white/70">{tr("رسمتك (ملف SVG)", "Your own (an SVG file)")}</summary>
        <div className="mt-2 space-y-2">
          <label className="block text-[11px] text-white/55">
            {tr("الصق كود SVG", "Paste SVG code")}
            <textarea dir="ltr" className="mt-1 min-h-[72px] w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 font-mono text-[11px] text-white" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="<svg viewBox=…>…</svg>" data-testid="studio-svg-paste" />
          </label>
          <div className="flex flex-wrap gap-1">
            <button type="button" className={btn} disabled={busy || !paste.trim()} onClick={() => take(paste)} data-testid="studio-svg-take">{tr("استعمال الكود", "Use the code")}</button>
            <label className={`${btn} cursor-pointer`}>
              {tr("أو اختيار ملف", "Or choose a file")}
              <input type="file" accept=".svg,image/svg+xml" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void f.text().then(take); e.target.value = ""; }} data-testid="studio-svg-file" />
            </label>
          </div>
          <p className="text-[10px] leading-4 text-white/35">{tr("بنحتفظ بالأشكال والألوان بس: السكربتات والروابط والصور والخطوط بتنشال، وأي نص لازم يتحوّل لأشكال قبل.", "Only shapes and colours are kept: scripts, links, pictures and fonts are left out, and any text has to be turned into shapes first.")}</p>
        </div>
      </details>
      {note ? <p className="text-[11px] leading-5 text-amber-200/80" data-testid="studio-svg-note">{note}</p> : null}

      {art ? (
        <div className="space-y-2">
          <div className="text-[11px] text-white/55">{tr("ألوانها", "Its colours")}</div>
          {paletteOf(art).slice(0, 12).map((c, i) => (
            <ColourPick key={`${c}-${i}`} label={`${tr("لون", "Colour")} ${i + 1}`} value={c} busy={busy} onPick={(to) => to && to !== c && setProps(tr("لون الرسمة", "Drawing colour"), { art: recolor(art, c, to) })} testId="studio-svg-colour" />
          ))}
          {width !== null && hasLines(art) ? (
            <Range label={tr("سمك الخطوط", "Line width")} min={0.5} max={30} step={0.5} busy={busy} value={width} onSave={(v) => setProps(tr("سمك الخطوط", "Line width"), { art: setLineWidth(art, v) })} testId="studio-svg-line" />
          ) : null}
        </div>
      ) : null}
      <Field label={tr("وصفها لقارئ الشاشة (فاضي = زينة بس)", "Its description for screen readers (empty = decoration only)")} value={typeof p.label === "object" && p.label ? String((p.label as Record<string, string>)[lang] ?? "") : ""} onSave={(v) => {
        const words = { ...((p.label ?? {}) as Record<string, string>) };
        if (v.trim()) words[lang] = v;
        else delete words[lang];
        setProps(tr("تعديل", "Edit"), { label: Object.keys(words).length ? words : undefined });
      }} />
      <p className="text-[10px] leading-4 text-white/35">{tr("لحركتها (ترسم حالها، تتحوّل لشكل تاني، خطوط ماشية): لوحة الحركة تحت.", "For its motion (draws itself, turns into another shape, running lines): the motion panel below.")}</p>
      <NumberField label={tr("عرضها (فاضي = عرض مكانها)", "Its width (empty = its place's width)")} suffix="px" value={shownWidth} min={8} max={2000} onSave={(v) => onOps(tr("الحجم", "Size"), [styleOp(node, "base", { width: v ? `${v}px` : null })])} testId="studio-svg-width" />
    </div>
  );
}
