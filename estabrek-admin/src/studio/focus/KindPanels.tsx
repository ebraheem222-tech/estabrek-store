/**
 * The other kinds in focus mode (docs/cms-big-engine-plan.ar.md A6):
 *  - CurvePanel: a heading's or text's words along an arc, a wave or a circle (shared/textCurve.ts), how bent, the
 *    words' size and spacing; a small drawing shows the curve;
 *  - SlidePanel: one slide of a slider (its parts in focus mode): shown in the page, moved, its caption in the
 *    page's language, taken away.
 */
import type { PageDraftOp, PageTreeNode } from "../../api/pages.api";
import type { Lang } from "../../lib/lang";
import { CURVES, curvePath, type Curve, type CurveKind } from "../../../../shared/textCurve";
import { changeSlide, moveSlide, slidesOf } from "../columns";
import { Range } from "../LookPanels";
import { say } from "../say";

type Ops = (label: string, ops: PageDraftOp[]) => void;
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const chip = (on: boolean) => `rounded-lg px-2 py-1 text-[11px] ${on ? "bg-accent-500/30 text-white" : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"}`;
const box = "space-y-2 rounded-xl border border-accent-400/30 p-3";
const KIND_WORD: Record<CurveKind, string> = { arc: "قوس|Arc|קשת", wave: "موجة|Wave|גל", circle: "دائرة|Circle|עיגול" };

export function CurvePanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: Ops }) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const curve = (props.curve as Curve | undefined) ?? null;
  const save = (next: Curve | null) => { if (!busy) onOps(say("كلام على منحنى|Words on a curve|מילים על עקומה"), [{ op: "setProps", nodeId: node.id, props: { ...props, curve: next ?? undefined } }]); };
  const shape = curve ? curvePath(curve.kind, curve.bend ?? 50) : null;
  return (
    <div className={box} data-testid="studio-curve" data-kind={curve?.kind ?? "none"}>
      <div className="text-xs font-medium text-white/80">〰 {say("الكلام على منحنى|Words on a curve|מילים על עקומה")}</div>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={say("المنحنى|The curve|העקומה")}>
        <button type="button" role="radio" aria-checked={!curve} className={chip(!curve)} disabled={busy} onClick={() => save(null)} data-testid="studio-curve-kind" data-kind="none">{say("مستقيم|Straight|ישר")}</button>
        {CURVES.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={curve?.kind === k} className={chip(curve?.kind === k)} disabled={busy} onClick={() => save({ ...(curve ?? {}), kind: k })} data-testid="studio-curve-kind" data-kind={k}>{say(KIND_WORD[k])}</button>
        ))}
      </div>
      {curve && shape ? (
        <>
          <svg viewBox={shape.viewBox} className="block h-14 w-full rounded-lg bg-white/[0.04]" aria-hidden="true"><path d={shape.d} fill="none" stroke="rgb(168,140,255)" strokeWidth={curve.kind === "circle" ? 18 : 8} /></svg>
          {curve.kind !== "circle" ? <Range label={say("الانحناء (لتحت ← لفوق)|Bend (down ← up)|כיפוף")} min={-100} max={100} step={1} busy={busy} value={curve.bend ?? 50} onSave={(v) => save({ ...curve, bend: v })} testId="studio-curve-bend" /> : null}
          <Range label={say("حجم الكلام|Words' size|גודל המילים")} min={20} max={240} step={1} busy={busy} value={curve.size ?? 80} onSave={(v) => save({ ...curve, size: v })} testId="studio-curve-size" />
          <Range label={say("البعد بين الحروف|Letter spacing|ריווח אותיות")} min={-10} max={60} step={1} busy={busy} value={curve.space ?? 0} onSave={(v) => save({ ...curve, space: v || undefined })} testId="studio-curve-space" />
        </>
      ) : null}
    </div>
  );
}

export function SlidePanel({ node, index, lang, busy, onOps, onShow }: { node: PageTreeNode; index: number; lang: Lang; busy: boolean; onOps: Ops; onShow: (i: number) => void }) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const slides = slidesOf(node);
  const slide = slides[index];
  if (!slide) return null;
  const save = (next: typeof slides, label = say("شريحة|A slide|שקופית")) => { if (!busy) onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...props, slides: next } }]); };
  return (
    <div className={box} data-testid="studio-focus-slide" data-i={index}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/80">{say("الشريحة|Slide|שקופית")} {index + 1} / {slides.length}</div>
        <button type="button" className={btn} onClick={() => onShow(index)} data-testid="studio-focus-slide-show">👁 {say("ورجيني|Show me|הצג")}</button>
      </div>
      <div className="flex gap-1">
        <button type="button" className={btn} disabled={busy || index === 0} onClick={() => save(moveSlide(slides, index, -1))} data-testid="studio-focus-slide-before">← {say("قبل|Earlier|לפני")}</button>
        <button type="button" className={btn} disabled={busy || index === slides.length - 1} onClick={() => save(moveSlide(slides, index, 1))} data-testid="studio-focus-slide-after">{say("بعد|Later|אחרי")} →</button>
        <span className="flex-1" />
        <button type="button" className={btn} disabled={busy || slides.length < 2} onClick={() => save(slides.filter((_, i) => i !== index), say("شيل شريحة|Remove a slide|הסרת שקופית"))} data-testid="studio-focus-slide-remove">{say("شيلها|Remove|הסר")}</button>
      </div>
      <label className="block text-[11px] text-white/55">
        {say("وصفها تحتها|Its caption|הכיתוב")}
        <input className="mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white" dir="auto" maxLength={200} disabled={busy} defaultValue={slide.caption?.[lang] ?? ""} key={`${index}:${lang}:${slide.caption?.[lang] ?? ""}`}
          onBlur={(e) => { if (e.target.value !== (slide.caption?.[lang] ?? "")) save(changeSlide(slides, index, { caption: { ...(slide.caption ?? {}), [lang]: e.target.value } })); }} data-testid="studio-focus-slide-caption" />
      </label>
    </div>
  );
}
