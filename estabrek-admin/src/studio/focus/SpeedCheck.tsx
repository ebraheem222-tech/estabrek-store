/**
 * The page's speed checked before it's published (docs/cms-big-engine-plan.ar.md J5): the editor's frame scrolls the
 * page from top to bottom with everything moving (StudioBridge "perfLab") and counts its frames a second, the frames
 * that came late, the time it was busy and how much it jumped; the verdict uses the same lines as real shoppers'
 * numbers (RUM). It's compared with the check kept at the last publish (this browser), and a slow page offers to
 * lighten its heaviest elements first. It only warns: publishing stays the owner's call.
 * Also here: the alert when real shoppers' speed got worse lately (RUM), with the way back to the page as it was
 * before its last publish.
 */
import { useState } from "react";
import type { RumAlerts } from "../../api/speed.api";
import { say } from "../say";

export type Lab = { fps: number; slow: number; longMs: number; cls: number; ms: number };
export type Verdict = "good" | "okay" | "poor";

/** Good: smooth (≥ 50 a second, few late frames), little busy time, no jumps; poor: under 30, many late, long tasks or jumps. */
export function verdictOf(l: Lab): Verdict {
  if (l.fps < 30 || l.slow > 15 || l.longMs > 600 || l.cls > 0.25) return "poor";
  if (l.fps >= 50 && l.slow <= 5 && l.longMs <= 200 && l.cls <= 0.1) return "good";
  return "okay";
}
const KEY = (pageId: string) => `estabrek:lab:${pageId}`;
export function lastLab(pageId: string): Lab | null {
  try { const v = JSON.parse(localStorage.getItem(KEY(pageId)) ?? "null"); return v && typeof v.fps === "number" ? (v as Lab) : null; } catch { return null; }
}
export function keepLab(pageId: string, lab: Lab | null) {
  if (!lab) return;
  try { localStorage.setItem(KEY(pageId), JSON.stringify(lab)); } catch { /* the next check just has nothing to compare with */ }
}

const COLOUR: Record<Verdict, string> = { good: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100", okay: "border-amber-400/40 bg-amber-500/10 text-amber-100", poor: "border-rose-400/50 bg-rose-500/10 text-rose-100" };
const WORD: Record<Verdict, string> = { good: "سريعة|Fast|מהיר", okay: "مقبولة|Okay|סביר", poor: "بطيئة|Slow|איטי" };

/** The check's result (measured before the dialog opened, so the dialog itself isn't counted). */
export function SpeedCheck({ pageId, lab, fixes, onLighten }: { pageId: string; lab: Lab | null | "waiting"; fixes: number; onLighten: () => void }) {
  const before = lastLab(pageId);
  if (lab === "waiting") return <p className="rounded-xl border border-white/10 p-3 text-xs text-white/55" data-testid="studio-speed-check" data-state="waiting">⏱ {say("عم نفحص سرعة الصفحة (بنمشي فيها من فوق لتحت)…|Checking the page's speed (scrolling it top to bottom)…|בודקים את מהירות העמוד…")}</p>;
  if (!lab) return <p className="rounded-xl border border-white/10 p-3 text-xs text-white/45" data-testid="studio-speed-check" data-state="none">{say("ما قدرنا نفحص السرعة هلأ.|The speed couldn't be checked now.|לא ניתן לבדוק עכשיו.")}</p>;
  const v = verdictOf(lab);
  const slower = before && lab.fps < before.fps * 0.85;
  return (
    <div className={`space-y-1 rounded-xl border p-3 text-xs ${COLOUR[v]}`} data-testid="studio-speed-check" data-state="done" data-verdict={v}>
      <div className="font-medium">⏱ {say("سرعة الصفحة|The page's speed|מהירות העמוד")}: {say(WORD[v])}</div>
      <div className="tabular-nums opacity-80">{say(`${lab.fps} إطار بالثانية · ${lab.slow}% متأخرة · ${lab.longMs} ms مشغولة · قفزات ${lab.cls}|${lab.fps} frames a second · ${lab.slow}% late · ${lab.longMs} ms busy · jumps ${lab.cls}|${lab.fps} פריימים לשנייה · ${lab.slow}% באיחור`)}</div>
      {slower ? <div data-testid="studio-speed-slower">⚠ {say(`أبطأ من آخر نشر (${before!.fps} ← ${lab.fps} إطار).|Slower than at the last publish (${before!.fps} → ${lab.fps} frames).|איטי יותר מהפרסום האחרון.`)}</div> : null}
      {v !== "good" && fixes ? (
        <button type="button" className="rounded-lg bg-white/10 px-2 py-1 hover:bg-white/20" onClick={onLighten} data-testid="studio-speed-lighten">{say(`خفّف الأتقل قبل النشر (${fixes})|Lighten the heaviest first (${fixes})|הקל על הכבדים קודם`)}</button>
      ) : null}
    </div>
  );
}

/** Real shoppers' speed got worse lately on this kind of page: what, and the way back to before this page's last publish. */
export function SlowdownAlert({ alerts, pageId, rumPage, busy, onRollback }: { alerts: RumAlerts; pageId: string; rumPage: string; busy: boolean; onRollback: (revisionId: string) => void }) {
  const [sure, setSure] = useState<string | null>(null);
  const mine = alerts.alerts.filter((a) => a.page === rumPage);
  if (!mine.length) return null;
  const publish = alerts.publishes.find((p) => p.pageId === pageId);
  const unit = (m: string, v: number) => (m === "scrollFps" || m === "sceneFps" ? `${Math.round(v)} fps` : m === "cls" ? String(Math.round(v * 100) / 100) : m === "slowFrames" ? `${Math.round(v)}%` : `${(v / 1000).toFixed(1)} s`);
  return (
    <div className="space-y-1 rounded-lg border border-rose-400/40 bg-rose-500/10 p-2 text-[11px] text-rose-100" data-testid="studio-slowdown">
      <div className="font-medium">⚠ {say("عند الزباين، هالنوع من الصفحات صار أبطأ آخر يومين|For shoppers, this kind of page got slower these two days|אצל הקונים, הדפים האלה האטו")}</div>
      {mine.map((a) => (
        <div key={`${a.page}:${a.device}`} className="opacity-85">
          {a.device === "phone" ? say("موبايل|Phone|טלפון") : a.device === "tablet" ? say("تابلت|Tablet|טאבלט") : say("كمبيوتر|Computer|מחשב")}: {a.worse.map((w) => `${w.metric} ${unit(w.metric, w.before)} → ${unit(w.metric, w.now)}`).join(" · ")}
        </div>
      ))}
      {publish ? (
        sure === publish.revisionId ? (
          <div className="flex flex-wrap items-center gap-1">
            <span>{say("أكيد؟ الصفحة المنشورة بترجع متل ما كانت قبل هالنشر.|Sure? The live page goes back to how it was before that publish.|בטוח? העמוד יחזור לגרסה הקודמת.")}</span>
            <button type="button" className="rounded-lg bg-rose-500/40 px-2 py-1" disabled={busy} onClick={() => { setSure(null); onRollback(publish.revisionId); }} data-testid="studio-slowdown-rollback-yes">{say("إي، رجّعها|Yes, go back|כן, החזר")}</button>
            <button type="button" className="rounded-lg bg-white/10 px-2 py-1" onClick={() => setSure(null)}>{say("لا|No|לא")}</button>
          </div>
        ) : (
          <button type="button" className="rounded-lg bg-white/10 px-2 py-1 hover:bg-white/20" disabled={busy} onClick={() => setSure(publish.revisionId)} data-testid="studio-slowdown-rollback">
            {say(`هالصفحة انتشرت ${new Date(publish.at).toLocaleString()}: رجّعها للنسخة اللي قبل|This page was published ${new Date(publish.at).toLocaleString()}: go back to the version before|העמוד פורסם ${new Date(publish.at).toLocaleString()}: חזור לגרסה הקודמת`)}
          </button>
        )
      ) : <div className="opacity-70">{say("ما انتشرت هالصفحة بهالأيام: شوف «الأتقل» تحت أو صفحات تانية من نفس النوع.|This page wasn't published these days: see «the heaviest» below or other pages of this kind.|העמוד לא פורסם בימים האלה.")}</div>}
    </div>
  );
}
