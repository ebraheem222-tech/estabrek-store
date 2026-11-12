/**
 * Sparkling stars on a picture, in focus mode (docs/cms-big-engine-plan.ar.md A3+):
 *  - found on the picture: its corners, edges or highlights (the frame reads its pixels, shared/sparkle.ts), as many
 *    as asked, spread apart, on the product only for a cut-out picture;
 *  - placed by hand: with the pen on, a click on the picture adds one; on the canvas a star is dragged to move it
 *    and double-clicked to take it away (SparkleHandles);
 *  - their look: drawing, colour, size, speed, when they twinkle, a glow.
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../../api/pages.api";
import { SPARKLE_LIMITS, SPARKLE_PATHS, SPARKLE_SHAPES, type Sparkle, type SparkleMode, type SparkleShape } from "../../../../shared/sparkle";
import { Range } from "../LookPanels";
import { say } from "../say";

type Ops = (label: string, ops: PageDraftOp[]) => void;
export type FindAsk = { mode: SparkleMode; count: number; spread: number; productOnly: boolean };
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const control = "w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white";
const MODE_WORD: Record<SparkleMode, string> = {
  all: "الكل (زوايا ولمعات)|All (corners and highlights)|הכול (פינות והברקות)",
  corners: "الزوايا|Corners|פינות",
  edges: "الحواف|Edges|קצוות",
  highlights: "اللمعات|Highlights|הברקות",
};
const SHAPE_WORD: Record<SparkleShape, string> = { glint: "لمعة|Glint|ניצוץ", star: "نجمة|Star|כוכב", flare: "وهج|Flare|הילה", cross: "صليب ضوء|Cross of light|צלב אור" };
const WHEN_WORD: Record<NonNullable<Sparkle["when"]>, string> = { always: "دايماً|Always|תמיד", hover: "لما الماوس فوقها|While the pointer is on it|כשהעכבר עליה", few: "كم مرة لما تفتح الصفحة|A few times as the page opens|כמה פעמים בפתיחה" };
const COLOURS: Array<[string, string]> = [["white", "أبيض|White|לבן"], ["#ffd76a", "ذهبي|Gold|זהב"], ["#e6f0ff", "فضي|Silver|כסף"], ["accent", "لون المتجر|Store colour|צבע החנות"], ["accent-soft", "لون المتجر الفاتح|Soft store colour|צבע חנות בהיר"]];

export function SparklePanel({ node, busy, onOps, onFind, finding, note, pen, onPen, chosen }: {
  node: PageTreeNode;
  busy: boolean;
  onOps: Ops;
  /** Ask the frame to find places for stars on the picture. */
  onFind: (ask: FindAsk) => void;
  finding: boolean;
  note: string | null;
  /** A click on the picture adds a star. */
  pen: boolean;
  onPen: (on: boolean) => void;
  /** A star chosen in the parts list ("s3"). */
  chosen?: string | null;
}) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const sparkle = (props.sparkle as Sparkle | undefined) ?? null;
  const [ask, setAsk] = useState<FindAsk>({ mode: "all", count: 18, spread: 0.06, productOnly: false });
  const save = (label: string, next: Sparkle | null) => {
    if (!busy) onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...props, sparkle: next && next.points.length ? next : undefined } }]);
  };
  const set = (patch: Partial<Sparkle>) => sparkle && save(say("شكل النجوم|The stars' look|מראה הכוכבים"), { ...sparkle, ...patch });
  const star = chosen && /^s\d+$/.test(chosen) ? Number(chosen.slice(1)) : null;
  const one = sparkle && star !== null ? sparkle.points[star] : null;
  return (
    <div className="space-y-3 rounded-xl border border-accent-400/30 p-3" data-testid="studio-sparkle" data-count={sparkle?.points.length ?? 0}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/80">✦ {say("نجوم براقة|Sparkling stars|כוכבים נוצצים")} · {sparkle?.points.length ?? 0}</div>
        {sparkle ? <button type="button" className={btn} disabled={busy} onClick={() => save(say("شيل النجوم|Remove the stars|הסרת הכוכבים"), null)} data-testid="studio-sparkle-clear">{say("امسحها|Clear|נקה")}</button> : null}
      </div>

      <div className="space-y-2 rounded-lg border border-white/[0.08] p-2">
        <label className="block text-[11px] text-white/55">
          {say("وين تلمع|Where they shine|איפה הם נוצצים")}
          <select className={`${control} mt-1`} disabled={busy || finding} value={ask.mode} onChange={(e) => setAsk({ ...ask, mode: e.target.value as SparkleMode })} data-testid="studio-sparkle-mode">
            {(Object.keys(MODE_WORD) as SparkleMode[]).map((m) => <option key={m} value={m}>{say(MODE_WORD[m])}</option>)}
          </select>
        </label>
        <Range label={say("كم نجمة|How many|כמה")} min={1} max={SPARKLE_LIMITS.points} step={1} busy={busy || finding} value={ask.count} onSave={(v) => setAsk({ ...ask, count: v })} testId="studio-sparkle-count" />
        <Range label={say("البعد بينها|Space between them|מרווח ביניהם")} min={0.01} max={0.3} step={0.01} busy={busy || finding} value={ask.spread} onSave={(v) => setAsk({ ...ask, spread: v })} testId="studio-sparkle-spread" />
        <label className="flex items-center gap-2 text-[11px] text-white/60">
          <input type="checkbox" checked={ask.productOnly} disabled={busy || finding} onChange={(e) => setAsk({ ...ask, productOnly: e.target.checked })} />
          {say("على المنتج بس (صورة مقصوصة الخلفية)|On the product only (a cut-out picture)|על המוצר בלבד (תמונה חתוכה)")}
        </label>
        <button type="button" className="w-full rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40" disabled={busy || finding} onClick={() => onFind(ask)} data-testid="studio-sparkle-find">
          {finding ? say("عم ندوّر…|Looking…|מחפשים…") : say("دوّر على أماكنها بالصورة|Find their places in the picture|מצא את מקומם בתמונה")}
        </button>
        {note ? <p className="text-[11px] leading-5 text-amber-200/80" data-testid="studio-sparkle-note">{note}</p> : null}
      </div>

      <label className="flex items-center gap-2 text-[11px] text-white/70">
        <input type="checkbox" checked={pen} onChange={(e) => { onPen(e.target.checked); e.currentTarget.blur(); }} data-testid="studio-sparkle-pen" />
        {say("كبسة على الصورة بتزيد نجمة (اسحب النجمة لتحرّكها، كبستين لتشيلها)|A click on the picture adds a star (drag one to move it, double-click to remove it)|לחיצה על התמונה מוסיפה כוכב")}
      </label>

      {one && sparkle ? (
        <div className="space-y-2 rounded-lg border border-sky-400/40 p-2" data-testid="studio-sparkle-one">
          <Range label={say("حجم هالنجمة|This star's size|גודל הכוכב")} min={0.2} max={3} step={0.05} busy={busy} value={one.s ?? 1} onSave={(v) => save(say("حجم نجمة|A star's size|גודל כוכב"), { ...sparkle, points: sparkle.points.map((p, i) => (i === star ? { ...p, s: v } : p)) })} testId="studio-sparkle-one-size" />
          <button type="button" className={btn} disabled={busy} onClick={() => save(say("شيل نجمة|Remove a star|הסרת כוכב"), { ...sparkle, points: sparkle.points.filter((_, i) => i !== star) })} data-testid="studio-sparkle-one-remove">{say("شيل هالنجمة|Remove this star|הסר כוכב זה")}</button>
        </div>
      ) : null}

      {sparkle ? (
        <div className="space-y-2" data-testid="studio-sparkle-look">
          <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label={say("رسمتها|Its drawing|הציור")}>
            {SPARKLE_SHAPES.map((sh) => (
              <button key={sh} type="button" role="radio" aria-checked={(sparkle.shape ?? "glint") === sh} title={say(SHAPE_WORD[sh])} disabled={busy}
                className={`grid place-items-center rounded-lg p-1.5 ${(sparkle.shape ?? "glint") === sh ? "bg-accent-500/30" : "bg-white/[0.06] hover:bg-white/[0.1]"}`}
                onClick={() => set({ shape: sh })} data-testid="studio-sparkle-shape" data-shape={sh}>
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-100" aria-hidden="true"><path d={SPARKLE_PATHS[sh]} fill="currentColor" /></svg>
              </button>
            ))}
          </div>
          <label className="block text-[11px] text-white/55">
            {say("لونها|Their colour|הצבע")}
            <select className={`${control} mt-1`} disabled={busy} value={sparkle.color ?? "white"} onChange={(e) => set({ color: e.target.value === "white" ? undefined : e.target.value })} data-testid="studio-sparkle-colour">
              {COLOURS.map(([v, w]) => <option key={v} value={v}>{say(w)}</option>)}
            </select>
          </label>
          <Range label={say("حجمها|Their size|הגודל")} unit="px" min={SPARKLE_LIMITS.size[0]} max={SPARKLE_LIMITS.size[1]} step={1} busy={busy} value={sparkle.size ?? 16} onSave={(v) => set({ size: v })} testId="studio-sparkle-size" />
          <Range label={say("بطء اللمعة|Twinkle time|זמן הנצנוץ")} unit="s" min={SPARKLE_LIMITS.speed[0]} max={SPARKLE_LIMITS.speed[1]} step={0.1} busy={busy} value={sparkle.speed ?? 1.8} onSave={(v) => set({ speed: v })} testId="studio-sparkle-speed" />
          <label className="block text-[11px] text-white/55">
            {say("إمتى تلمع|When they twinkle|מתי הם נוצצים")}
            <select className={`${control} mt-1`} disabled={busy} value={sparkle.when ?? "always"} onChange={(e) => set({ when: e.target.value === "always" ? undefined : (e.target.value as Sparkle["when"]) })} data-testid="studio-sparkle-when">
              {(Object.keys(WHEN_WORD) as Array<NonNullable<Sparkle["when"]>>).map((w) => <option key={w} value={w}>{say(WHEN_WORD[w])}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-white/60">
            <input type="checkbox" checked={sparkle.glow === true} disabled={busy} onChange={(e) => set({ glow: e.target.checked || undefined })} data-testid="studio-sparkle-glow" />
            {say("وهج حواليها|A glow around them|הילה סביבם")}
          </label>
        </div>
      ) : null}
    </div>
  );
}
