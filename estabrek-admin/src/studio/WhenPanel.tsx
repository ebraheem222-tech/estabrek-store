/**
 * When an element shows (props.when, any kind but the page): from a moment, until another, or between the two, in the
 * shop's own time. The shop leaves it out at any other time (pageTree/TreeWhen.tsx, checked every minute in the
 * shopper's browser); in the editor it always shows, with its times here. One change = one step back with undo.
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { say } from "./say";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type When = { from?: string; until?: string };
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const MOMENT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** The element's time to show as it is kept, or none. */
export function whenOf(node: PageTreeNode): When {
  const w = (node.props as Record<string, unknown> | undefined)?.when;
  if (!w || typeof w !== "object") return {};
  const { from, until } = w as Record<string, unknown>;
  return { ...(typeof from === "string" ? { from } : {}), ...(typeof until === "string" ? { until } : {}) };
}

/** The props with a new time to show (both ends gone = none at all; an end before its start isn't kept). */
export function withWhen(props: Record<string, unknown>, when: When): Record<string, unknown> | null {
  const clean: When = {};
  if (when.from && MOMENT.test(when.from)) clean.from = when.from;
  if (when.until && MOMENT.test(when.until)) clean.until = when.until;
  if (clean.from && clean.until && Date.parse(clean.from) >= Date.parse(clean.until)) return null;
  const { when: _old, ...rest } = props;
  return clean.from || clean.until ? { ...rest, when: clean } : rest;
}

/** Where it stands now: waiting for its start, showing, or over. */
export function whenState(when: When, now = Date.now()): "always" | "soon" | "now" | "over" {
  if (!when.from && !when.until) return "always";
  if (when.from && now < Date.parse(when.from)) return "soon";
  if (when.until && now >= Date.parse(when.until)) return "over";
  return "now";
}

const STATE: Record<ReturnType<typeof whenState>, string> = {
  always: "دايماً بيبيّن|Always shows|תמיד מוצג",
  soon: "لسا ما إجا وقته|Its time hasn't come yet|הזמן שלו עוד לא הגיע",
  now: "عم يبيّن هلّق|Showing now|מוצג עכשיו",
  over: "خلص وقته (مخفي بالمتجر)|Its time is over (hidden in the shop)|הזמן שלו נגמר (מוסתר בחנות)",
};

export function WhenPanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: Ops }) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const when = whenOf(node);
  const state = whenState(when);
  const save = (next: When) => {
    if (busy) return;
    const out = withWhen(props, next);
    if (out) onOps(say("وقت الظهور|Time to show|זמן הופעה"), [{ op: "setProps", nodeId: node.id, props: out }]);
  };
  const moment = (key: keyof When, label: string) => (
    <label className="block text-[11px] text-white/55">
      {label}
      <span className="mt-1 flex items-center gap-1">
        <input
          type="datetime-local" dir="ltr" disabled={busy} defaultValue={when[key]?.slice(0, 16) ?? ""} key={`${key}:${when[key] ?? ""}`}
          className="min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white"
          onChange={(e) => e.target.value && save({ ...when, [key]: e.target.value })} data-testid={`studio-when-${key}`}
        />
        {when[key] ? <button type="button" className={btn} disabled={busy} onClick={() => save({ ...when, [key]: undefined })} aria-label={say("شيل|Remove|הסרה")}>✕</button> : null}
      </span>
    </label>
  );
  return (
    <details className="rounded-xl border border-white/[0.08] p-3" data-testid="studio-when" open={state !== "always" || undefined}>
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 text-xs text-white/70">
        <span>{say("وقت الظهور|Time to show|זמן הופעה")}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${state === "over" ? "bg-rose-500/20 text-rose-100" : state === "soon" ? "bg-amber-500/20 text-amber-100" : state === "now" ? "bg-emerald-500/20 text-emerald-100" : "bg-white/[0.06] text-white/50"}`} data-testid="studio-when-state" data-state={state}>{say(STATE[state])}</span>
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-[10px] leading-4 text-white/40">{say("للعروض والمناسبات: بيبيّن بالمتجر بس بين الوقتين (بوقت المتجر)، وبالمحرر بيضل باين.|For offers and occasions: it shows in the shop only between the two times (the shop's time), and stays in sight in the editor.|למבצעים ולאירועים: מוצג בחנות רק בין שני הזמנים (שעון החנות), ונשאר גלוי בעורך.")}</p>
        {moment("from", say("من (اختياري)|From (optional)|מ־ (רשות)"))}
        {moment("until", say("لحد (اختياري)|Until (optional)|עד (רשות)"))}
      </div>
    </details>
  );
}
