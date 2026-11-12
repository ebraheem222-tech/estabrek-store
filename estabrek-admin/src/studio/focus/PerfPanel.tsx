/**
 * Speed per element in the editor (docs/cms-big-engine-plan.ar.md J1–J2):
 *  - PerfPanel: what the element costs the shopper's device (green, amber, red: perfCost.ts) and why, each reason
 *    with the setting that makes it lighter (one click); its own speed settings: full / balanced / light, a cap on
 *    its canvases' frames, resting off screen and while the page rests, lighter on phones, full only on strong
 *    devices. The shop honours them (pageTree/perf.ts, TreePerf).
 *  - PageBudget: the whole page's cost, what it has too many of, its heaviest elements (a click picks one), and a
 *    live measure of the page in the frame (frames a second, time the page was busy, motions running, canvases…).
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../../api/pages.api";
import { say } from "../say";
import { autoOf, costOf, lightenAll, pageBudget, type Level, type Perf } from "./perfCost";

type Ops = (label: string, ops: PageDraftOp[]) => void;
const COLOUR: Record<Level, string> = { low: "bg-emerald-500/25 text-emerald-200 border-emerald-400/40", mid: "bg-amber-500/25 text-amber-100 border-amber-400/40", high: "bg-rose-500/25 text-rose-100 border-rose-400/50" };
const WORD: Record<Level, string> = { low: "خفيف|Light|קל", mid: "متوسط|Medium|בינוני", high: "تقيل|Heavy|כבד" };
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const chip = (on: boolean) => `rounded-lg px-2 py-1 text-[11px] ${on ? "bg-accent-500/30 text-white" : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"}`;

export function PerfBadge({ level, points }: { level: Level; points: number }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${COLOUR[level]}`} data-testid="studio-perf-badge" data-level={level}>⚡ {say(WORD[level])} · {points}</span>;
}

export function PerfPanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: Ops }) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const perf = ((props.perf as Perf | undefined) ?? {}) as Perf;
  const cost = costOf(node);
  const save = (patch: Perf) => {
    if (busy) return;
    const next: Record<string, unknown> = { ...perf, ...patch };
    // The defaults drop out (full, no cap, resting, same on phones).
    for (const [k, v] of Object.entries(next)) if (v === undefined || (k === "tier" && v === "full") || (k === "offscreen" && v === "pause") || (k === "rest" && v === "pause") || (k === "phone" && v === "same") || (k === "strong" && v === false)) delete next[k];
    onOps(say("السرعة|Speed|מהירות"), [{ op: "setProps", nodeId: node.id, props: { ...props, perf: Object.keys(next).length ? next : undefined } }]);
  };
  return (
    <details className="rounded-xl border border-white/[0.08] p-3" data-testid="studio-perf" open={cost.level === "high" || undefined}>
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 text-xs text-white/70">
        <span>{say("السرعة على جهاز الزبون|Speed on the shopper's device|מהירות במכשיר הקונה")}</span>
        <PerfBadge level={cost.level} points={cost.points} />
      </summary>
      <div className="mt-2 space-y-2">
        {cost.reasons.length ? (
          <ul className="space-y-1" data-testid="studio-perf-reasons">
            {cost.reasons.map((r) => (
              <li key={r.key} className="flex items-start gap-2 text-[11px] text-white/60" data-key={r.key}>
                <span className="min-w-0 flex-1">{r.text}{r.points ? <span className="text-white/35"> · {Math.round(r.points)}</span> : null}</span>
                {r.fix && !Object.entries(r.fix).every(([k, v]) => (perf as Record<string, unknown>)[k] === v) ? (
                  <button type="button" className={btn} disabled={busy} onClick={() => save(r.fix!)} data-testid="studio-perf-fix" data-key={r.key}>{say("خفّفه|Lighten|הקל")}</button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-[11px] text-white/45">{say("ما فيه إشي تقيل.|Nothing heavy in it.|אין בו משהו כבד.")}</p>}
        <div className="flex gap-1" role="radiogroup" aria-label={say("الجودة|Quality|איכות")}>
          {(["full", "balanced", "light"] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={(perf.tier ?? "full") === t} className={chip((perf.tier ?? "full") === t)} disabled={busy} onClick={() => save({ tier: t })} data-testid="studio-perf-tier" data-tier={t}>
              {t === "full" ? say("كامل|Full|מלא") : t === "balanced" ? say("متوازن|Balanced|מאוזן") : say("خفيف|Light|קל")}
            </button>
          ))}
        </div>
        {cost.canvas ? (
          <label className="flex items-center justify-between gap-2 text-[11px] text-white/55">
            {say("أقصى إطارات بالثانية|Most frames a second|מקסימום פריימים")}
            <select className="rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white" disabled={busy} value={perf.fps ?? ""} onChange={(e) => save({ fps: e.target.value ? (Number(e.target.value) as Perf["fps"]) : undefined })} data-testid="studio-perf-fps">
              <option value="">{say("تلقائي|Automatic|אוטומטי")}</option>
              <option value="60">60</option>
              <option value="30">30</option>
              <option value="24">24</option>
            </select>
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-[11px] text-white/60"><input type="checkbox" checked={perf.offscreen !== "keep"} disabled={busy} onChange={(e) => save({ offscreen: e.target.checked ? "pause" : "keep" })} data-testid="studio-perf-offscreen" />{say("بيرتاح برّا الشاشة|Rests off screen|נח מחוץ למסך")}</label>
        <label className="flex items-center gap-2 text-[11px] text-white/60"><input type="checkbox" checked={perf.rest !== "keep"} disabled={busy} onChange={(e) => save({ rest: e.target.checked ? "pause" : "keep" })} data-testid="studio-perf-rest" />{say("بيرتاح لما الصفحة ساكنة|Rests while the page rests|נח כשהעמוד במנוחה")}</label>
        <label className="flex items-center gap-2 text-[11px] text-white/60"><input type="checkbox" checked={perf.phone === "light"} disabled={busy} onChange={(e) => save({ phone: e.target.checked ? "light" : "same" })} data-testid="studio-perf-phone" />{say("أخف عالتلفون (بدون تغبيش وظلال وحركة دايمة)|Lighter on phones (no blur, shadows or endless motion)|קל יותר בטלפון")}</label>
        <label className="flex items-center gap-2 text-[11px] text-white/60"><input type="checkbox" checked={perf.strong === true} disabled={busy} onChange={(e) => save({ strong: e.target.checked })} data-testid="studio-perf-strong" />{say("كامل بس عالأجهزة القوية|Full only on strong devices|מלא רק במכשירים חזקים")}</label>
      </div>
    </details>
  );
}

export type Sample = { fps: number; longMs: number; animations: number; canvases: number; videos: number; nodes: number };

export function PageBudget({ root, busy, onPick, onMeasure, onOps }: { root: PageTreeNode; busy: boolean; onPick: (id: string) => void; onMeasure: () => Promise<Sample | null>; onOps?: Ops }) {
  const b = pageBudget(root);
  const auto = autoOf(root);
  const fixes = lightenAll(root);
  const [sample, setSample] = useState<Sample | null>(null);
  const [measuring, setMeasuring] = useState(false);
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] p-3" data-testid="studio-page-budget" data-level={b.level}>
      <div className="flex items-center justify-between gap-2 text-xs text-white/70">
        <span>{say("ميزانية سرعة الصفحة|The page's speed budget|תקציב המהירות")}</span>
        <PerfBadge level={b.level} points={b.points} />
      </div>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-white/55">
        <dt>{say("بترسم كل لحظة|Drawn every moment|מצויר כל רגע")}</dt><dd className="text-end tabular-nums" data-testid="studio-budget-canvases">{b.canvases}</dd>
        <dt>{say("حركات ما بتخلص|Endless motions|תנועות אינסופיות")}</dt><dd className="text-end tabular-nums">{b.endless}</dd>
        <dt>{say("فيديو بيشتغل لحاله|Clips playing by themselves|סרטונים לבד")}</dt><dd className="text-end tabular-nums">{b.autoplay}</dd>
        <dt>{say("زجاج مغبّش|Frosted glass|זכוכית")}</dt><dd className="text-end tabular-nums">{b.glass}</dd>
      </dl>
      {b.warnings.map((w, i) => <p key={i} className="text-[11px] leading-5 text-amber-200/80" data-testid="studio-budget-warning">⚠ {w}</p>)}
      {b.heavy.length ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px] text-white/45">
            <span>{say("الأتقل|The heaviest|הכבדים ביותר")}</span>
            {onOps && fixes.length ? (
              <button type="button" className={btn} disabled={busy} onClick={() => onOps(say("خفّف الكل|Lighten them all|הקל על כולם"), fixes.map((f) => ({ op: "setProps", nodeId: f.id, props: f.props })))} data-testid="studio-budget-fix-all">
                {say(`خفّف الكل (${fixes.length})|Lighten them all (${fixes.length})|הקל על כולם (${fixes.length})`)}
              </button>
            ) : null}
          </div>
          {b.heavy.slice(0, 5).map((h) => (
            <button key={h.id} type="button" className={`${btn} flex w-full justify-between`} onClick={() => onPick(h.id)} data-testid="studio-budget-heavy" data-node={h.id}>
              <span className="truncate">{h.name}</span><span className="tabular-nums text-rose-200">{h.points}</span>
            </button>
          ))}
        </div>
      ) : null}
      {onOps ? (
        <div className="space-y-1 rounded-lg bg-white/[0.03] p-2" data-testid="studio-budget-auto" data-on={auto.on ? "" : undefined}>
          <label className="flex items-center gap-2 text-[11px] text-white/70">
            <input type="checkbox" checked={auto.on} disabled={busy} onChange={(e) => onOps(say("تخفيف تلقائي|Automatic lightening|הקלה אוטומטית"), [{ op: "setProps", nodeId: root.id, props: { ...(root.props ?? {}), perfAuto: e.target.checked ? undefined : false } }])} data-testid="studio-budget-auto-on" />
            {say("المتجر بيخفّف لحاله|The shop lightens it by itself|החנות מקלה לבד")}
          </label>
          {auto.on ? (
            <ul className="space-y-0.5 text-[10px] leading-4 text-white/45">
              {auto.lead ? <li data-testid="studio-budget-auto-item" data-key="lead">• {say(`أول صورة («${auto.lead}») بتتحمّل أول وبسرعة؛ الباقي لما يقربوا.|The first picture («${auto.lead}») loads first and early; the rest when they come near.|התמונה הראשונה נטענת ראשונה.`)}</li> : null}
              {auto.far ? <li data-testid="studio-budget-auto-item" data-key="far">• {say(`${auto.far} أقسام بعيدة بتترسم بس لما تقرب.|${auto.far} far sections drawn only when they come near.|${auto.far} חלקים רחוקים מצוירים רק כשמתקרבים.`)}</li> : null}
              {auto.glass ? <li data-testid="studio-budget-auto-item" data-key="glass">• {say(`عالأجهزة الضعيفة: بلا زجاج مغبّش (${auto.glass}).|On weak devices: no frosted glass (${auto.glass}).|במכשירים חלשים: בלי זכוכית.`)}</li> : null}
              {auto.canvases ? <li data-testid="studio-budget-auto-item" data-key="canvases">• {say(`عالأجهزة الضعيفة: الرسومات الحيّة بـ 24–30 إطار (${auto.canvases}).|On weak devices: live drawings at 24–30 frames (${auto.canvases}).|במכשירים חלשים: 24–30 פריימים.`)}</li> : null}
              {auto.autoplay ? <li data-testid="studio-budget-auto-item" data-key="autoplay">• {say(`اللي موفّر داتا: الفيديو ما بيشتغل لحاله (${auto.autoplay}).|Saving data: clips don't play by themselves (${auto.autoplay}).|חיסכון בנתונים: סרטונים לא מתנגנים לבד.`)}</li> : null}
              <li>• {say("الحركات اللي ما بتخلص بترتاح برّا الشاشة.|Endless motion rests off screen.|תנועה אינסופית נחה מחוץ למסך.")}</li>
            </ul>
          ) : null}
        </div>
      ) : null}
      <button type="button" className={`${btn} w-full`} disabled={busy || measuring} onClick={async () => { setMeasuring(true); setSample(await onMeasure()); setMeasuring(false); }} data-testid="studio-budget-measure">
        {measuring ? say("عم نقيس…|Measuring…|מודדים…") : say("قيس الصفحة هلأ|Measure the page now|מדוד את העמוד")}
      </button>
      {sample ? (
        <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-white/55" data-testid="studio-budget-sample" data-fps={sample.fps}>
          <dt>{say("إطارات بالثانية|Frames a second|פריימים לשנייה")}</dt><dd className="text-end tabular-nums">{sample.fps}</dd>
          <dt>{say("وقت مشغول|Busy time|זמן עסוק")}</dt><dd className="text-end tabular-nums">{sample.longMs} ms</dd>
          <dt>{say("حركات شغّالة|Motions running|תנועות פעילות")}</dt><dd className="text-end tabular-nums">{sample.animations}</dd>
          <dt>{say("رسومات (canvas)|Canvases|קנבסים")}</dt><dd className="text-end tabular-nums">{sample.canvases}</dd>
          <dt>{say("فيديو شغّال|Clips playing|סרטונים פעילים")}</dt><dd className="text-end tabular-nums">{sample.videos}</dd>
          <dt>{say("عناصر الصفحة|Page elements|רכיבים")}</dt><dd className="text-end tabular-nums">{sample.nodes}</dd>
        </dl>
      ) : null}
      <p className="text-[10px] leading-4 text-white/35">{say("العدد تقدير من إعدادات العناصر؛ القياس من الصفحة نفسها بهالجهاز.|The count estimates from the elements' settings; the measure is the page itself on this device.|הספירה היא הערכה; המדידה מהעמוד עצמו.")}</p>
    </div>
  );
}
