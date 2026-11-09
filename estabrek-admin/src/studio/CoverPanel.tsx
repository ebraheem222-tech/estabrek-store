/**
 * A section's "stays, then the next one covers it": on or off, how many screens it's held for,
 * what it does while it's covered, and whether phones get it too (studio/coverPin.ts).
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { Range } from "./LookPanels";
import { COVER_UNDERS, coverOfNode, coverOp, NEW_COVER, type Cover } from "./coverPin";
import { say } from "./say";

export function CoverPanel({ node, isLast, busy, onOps }: { node: PageTreeNode; isLast: boolean; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  const cover = coverOfNode(node);
  const save = (next: Cover | null) => onOps(say("يثبت ويتغطى|Held, then covered|נשאר ומתכסה"), [coverOp(node, next)]);
  return (
    <div className="space-y-2.5 rounded-xl border border-white/[0.08] p-3" data-testid="studio-cover">
      <label className="flex items-center justify-between gap-2 text-xs font-medium text-white/70">
        <span>{say("يثبت، والقسم اللي بعده يطلع فوقه|Stays, then the next section slides over it|נשאר, והמקטע הבא עולה מעליו")}</span>
        <input type="checkbox" disabled={busy} checked={Boolean(cover)} onChange={(e) => save(e.target.checked ? { ...NEW_COVER } : null)} data-testid="studio-cover-on" />
      </label>
      <p className="text-[10px] leading-4 text-white/40">
        {say(
          "القسم بيضل ثابت بالشاشة وانت بتعمل سكرول، وبعدين القسم اللي تحته بيطلع ويغطيه من تحت لفوق.|The section stays still on the screen as you scroll, then the section under it rises and covers it from the bottom up.|המקטע נשאר במקומו בזמן הגלילה, ואז המקטע שמתחתיו עולה ומכסה אותו מלמטה למעלה.",
        )}
      </p>
      {cover ? (
        <div className="space-y-2 rounded-lg bg-white/[0.04] p-2" data-testid="studio-cover-settings">
          <Range label={say("كم شاشة بيضل ثابت قبل ما يتغطى|Screens it stays before it's covered|כמה מסכים הוא נשאר לפני שמתכסה")} min={0} max={6} step={0.5} busy={busy} value={cover.hold} onSave={(hold) => save({ ...cover, hold })} testId="studio-cover-hold" />
          <div className="text-[11px] text-white/60">{say("وهو بيتغطى:|While it's covered:|בזמן שהוא מתכסה:")}</div>
          <div role="group" aria-label={say("شو بيصير فيه وهو بيتغطى|What it does while it's covered|מה קורה לו כשהוא מתכסה")} className="grid grid-cols-3 gap-1">
            {COVER_UNDERS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={cover.under === k} disabled={busy} data-cover-under={k} onClick={() => save({ ...cover, under: k })} className={`rounded-lg px-1 py-1.5 text-center text-[10px] ${cover.under === k ? "bg-accent-500/30 text-white ring-1 ring-accent-400" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"} disabled:opacity-40`}>
                {label()}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-2 text-xs text-white/75">
            <span>{say("على الموبايل كمان|On phones too|גם בטלפון")}</span>
            <input type="checkbox" disabled={busy} checked={cover.phone} onChange={(e) => save({ ...cover, phone: e.target.checked })} data-testid="studio-cover-phone" />
          </label>
          {isLast ? (
            <p className="text-[10px] leading-4 text-amber-300/80" data-testid="studio-cover-last">{say("هاد آخر قسم: ضيف قسم بعده عشان يغطيه.|This is the last section: add one after it to cover it.|זה המקטע האחרון: הוסף מקטע אחריו כדי שיכסה אותו.")}</p>
          ) : (
            <p className="text-[10px] leading-4 text-white/35">{say("القسم اللي بعده بيغطيه بخلفيته (أو بلون الصفحة). جرّبه بالسكرول بالمعاينة.|The next section covers it with its own background (or the page's colour). Scroll the preview to try it.|המקטע הבא מכסה אותו ברקע שלו (או בצבע הדף). גלול בתצוגה כדי לנסות.")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
