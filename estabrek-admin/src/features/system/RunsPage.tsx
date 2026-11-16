// سجل التشغيل (E0.2): everything the server did by itself, in one list that a restart doesn't
// wipe: a background job's run, an automation's action, a webhook taken in. Newest first; by
// kind, or only what failed; a job's timer runs of one hour that went fine are one line.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import * as RunsAPI from "../../api/runs.api";
import type { Run, RunKind } from "../../api/runs.api";
import { runTimeText } from "./jobsText";
import { KINDS, KIND_NAME, keepLine, runDid, runName, runTimes, runTook, runTrigger, summaryLine, whenText } from "./runsText";
import { ACT_NAME, failText, lineText, part, shapeText, whereText } from "../functions/fnText";
import { stepOfLine } from "../functions/fnDraft";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const chip = (on: boolean) => `rounded-lg px-3 py-1.5 text-sm transition ${on ? "bg-white/10 font-medium" : "text-white/60 hover:bg-white/5"}`;
/** Where a kind's own page is. */
const PAGE: Partial<Record<RunKind, string>> = { job: "/admin/system/jobs", automation: "/admin/system/automations", task: "/admin/system/tasks", function: "/admin/functions" };

export default function RunsPage() {
  const lang = adminLang();
  const [kind, setKind] = useState<RunKind | "">("");
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState("");
  const q = useInfiniteQuery({
    queryKey: ["system", "runs", kind, failed, name],
    queryFn: ({ pageParam }) => RunsAPI.getRuns({ kind: kind || undefined, ok: failed ? false : undefined, name: name || undefined, before: pageParam || undefined, limit: 50 }),
    initialPageParam: "",
    getNextPageParam: (last) => last.next ?? undefined,
    refetchInterval: 30_000,
  });
  const first = q.data?.pages[0];
  const runs = q.data?.pages.flatMap((p) => p.runs) ?? [];
  const now = first?.now ?? Date.now();
  // The kinds that have runs come first; the ones nothing writes yet aren't offered.
  const kinds = KINDS.filter((k) => first?.summary?.kinds[k] || k === kind);

  return (
    <div className="space-y-4 pb-24" data-testid="runs-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">{say("سجل التشغيل|Run log|יומן הרצות")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say(
            "كل شي عمله السيرفر لحاله: المهام بالخلفية، التلقائيات، والـ webhooks اللي وصلت. محفوظ بقاعدة البيانات، فإعادة تشغيل السيرفر ما بتمسحه.|Everything the server did by itself: background jobs, automations, webhooks taken in. Kept in the database, so a restart doesn't wipe it.|כל מה שהשרת עשה בעצמו: משימות רקע, אוטומציות ו-webhooks שהתקבלו. נשמר במסד הנתונים, כך שהפעלה מחדש לא מוחקת אותו.",
          )}
        </p>
        {first?.summary ? (
          <div className="mt-4 space-y-1 text-sm">
            <div className={first.summary.failures ? "text-amber-300" : "text-white/80"} data-testid="runs-summary">
              {summaryLine(first.summary, lang)}
            </div>
            <div className="text-xs text-white/50" data-testid="runs-keep">
              {keepLine(first.summary, now, lang)}
            </div>
          </div>
        ) : null}
        {first?.summary?.failing.length ? (
          <ul className="mt-3 space-y-1 text-sm" data-testid="runs-failing">
            {first.summary.failing.map((f) => (
              <li key={`${f.kind}:${f.name}`} className="flex flex-wrap items-baseline gap-x-2">
                <button
                  type="button"
                  className="text-red-300 underline"
                  onClick={() => {
                    setKind(f.kind);
                    setName(f.name);
                    setFailed(true);
                  }}
                  data-testid={`runs-failing-${f.kind}-${f.name}`}
                >
                  {/* An address reads left to right, its first slash first. */}
                  <bdi dir={f.kind === "webhook" ? "ltr" : undefined}>{runName(f, lang)}</bdi>
                </button>
                <span className="text-xs text-white/60">{say("فشل {n} مرة|failed {n} times|נכשל {n} פעמים").replace("{n}", String(f.failures))}</span>
                {f.error ? <bdi className="text-xs text-white/50">{f.error}</bdi> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={box}>
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={say("نوع التشغيل|Kind of run|סוג ההרצה")}>
          <button type="button" role="tab" aria-selected={!kind} className={chip(!kind)} onClick={() => { setKind(""); setName(""); }} data-testid="runs-kind-all">
            {say("الكل|All|הכול")}
          </button>
          {kinds.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k} className={chip(kind === k)} onClick={() => { setKind(k); setName(""); }} data-testid={`runs-kind-${k}`}>
              {say(KIND_NAME[k])}
            </button>
          ))}
          <label className="ms-auto flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" className="h-4 w-4 accent-current" checked={failed} onChange={(e) => setFailed(e.target.checked)} data-testid="runs-failed-only" />
            {say("اللي فشل بس|Only what failed|רק מה שנכשל")}
          </label>
        </div>
        {name ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" data-testid="runs-name">
            <span className="text-white/60">{say("بس:|Only:|רק:")}</span>
            <bdi dir={kind === "webhook" ? "ltr" : undefined} className="font-medium">
              {runName({ kind: kind || "job", name }, lang)}
            </bdi>
            <button type="button" className="text-xs underline" onClick={() => setName("")} data-testid="runs-name-clear">
              {say("شيل|Clear|ניקוי")}
            </button>
          </div>
        ) : null}

        {q.isLoading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : q.isError ? (
          <div className="mt-4 text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
        ) : !runs.length ? (
          <p className="mt-4 text-sm text-white/60" data-testid="runs-empty">
            {failed ? say("ولا شي فشل. 👌|Nothing failed. 👌|שום דבר לא נכשל. 👌") : say("ما في تشغيلات لسا.|No runs yet.|עדיין אין הרצות.")}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10" data-testid="runs-list">
            {runs.map((r) => (
              <RunRow key={r.id} run={r} now={now} onName={() => { setKind(r.kind); setName(r.name); }} />
            ))}
          </ul>
        )}
        {q.hasNextPage ? (
          <div className="mt-4">
            <Button size="sm" variant="secondary" onClick={() => void q.fetchNextPage()} isLoading={q.isFetchingNextPage} data-testid="runs-more">
              {say("الأقدم|Older|ישנות יותר")}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function RunRow({ run, now, onName }: { run: Run; now: number; onName: () => void }) {
  const lang = adminLang();
  const page = PAGE[run.kind];
  const [open, setOpen] = useState(false);
  // A function's run: the version that ran, and what each of its steps did.
  const fn = run.kind === "function" ? run.detail : null;
  const steps = fn?.steps ?? [];
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3" data-testid={`run-${run.id}`} data-ok={run.ok}>
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={run.ok ? "default" : "danger"} size="sm">
            {say(KIND_NAME[run.kind])}
          </Badge>
          <button type="button" className="font-medium hover:underline" onClick={onName} title={say("بس هاد|Only this one|רק זה")}>
            <bdi dir={run.kind === "webhook" ? "ltr" : undefined}>{runName(run, lang)}</bdi>
          </button>
          {run.times > 1 ? <span className="text-xs text-white/50">{runTimes(run, lang)}</span> : null}
          {fn?.v ? (
            <span className="text-xs text-white/70" data-testid={`run-version-${run.id}`}>
              {say("النسخة {n}|Version {n}|גרסה {n}").replace("{n}", String(fn.v))}
            </span>
          ) : null}
          {page ? (
            <Link to={page} className="text-xs text-white/50 underline">
              {say("صفحته|Its page|הדף שלו")}
            </Link>
          ) : null}
        </div>
        <div className={`break-words text-sm ${run.ok ? "text-white/70" : "text-red-300"}`} data-testid={`run-did-${run.id}`}>
          <bdi>{run.kind === "function" && !run.ok && run.error ? failText(run.error, lang) : runDid(run, lang)}</bdi>
        </div>
        {fn?.answer ? (
          <div className="text-xs text-amber-300" data-testid={`run-answer-${run.id}`}>
            {say("جوابها ما كان متل ما بتوعد:|Its answer wasn't what it promises:|התשובה לא הייתה מה שהיא מבטיחה:")} <bdi>{shapeText(fn.answer, lang)}</bdi>
          </div>
        ) : null}
        {steps.length ? (
          <button type="button" className="text-xs underline" aria-expanded={open} onClick={() => setOpen(!open)} data-testid={`run-steps-toggle-${run.id}`}>
            {open ? say("خبّي الخطوات|Hide the steps|הסתרת השלבים") : say("شو عملت كل خطوة ({n})|What each step did ({n})|מה עשה כל שלב ({n})").replace("{n}", String(steps.filter((s) => !("cut" in s)).length))}
          </button>
        ) : null}
        {open ? (
          <ol className="mt-1 space-y-1 rounded-xl border border-white/10 p-3 text-sm" data-testid={`run-steps-${run.id}`}>
            {steps.map((s, k) =>
              "cut" in s ? (
                <li key={k} className="text-xs text-white/60">
                  {say("… {n} خطوة بالنص مش محفوظة|… {n} steps in between aren't kept|… {n} שלבים באמצע לא נשמרו").replace("{n}", String(s.cut))}
                </li>
              ) : (
                <li key={k} className="flex flex-wrap items-baseline justify-between gap-x-3" data-ok={s.ok}>
                  <div className="min-w-0">
                    <span className="text-xs text-white/60">{whereText(stepOfLine(s.at), lang)}</span> <span className="font-medium">{part(ACT_NAME[s.act as keyof typeof ACT_NAME] ?? s.act, lang)}</span>{" "}
                    <bdi className={s.ok ? "text-white/80" : "text-red-300"}>{lineText({ ok: s.ok, say: s.say as never, error: s.error }, lang)}</bdi>
                  </div>
                  <span className="shrink-0 text-xs text-white/60">{s.ms} ms</span>
                </li>
              ),
            )}
          </ol>
        ) : null}
        {run.subject ? (
          <bdi dir="ltr" className="block text-xs text-white/50">
            {run.subject}
          </bdi>
        ) : null}
      </div>
      <div className="shrink-0 text-end text-xs text-white/60">
        <div>{whenText(run.lastAt ?? run.startedAt, now, lang)}</div>
        <div>{[runTrigger(run, lang), runTimeText(runTook(run))].filter(Boolean).join(" · ")}</div>
      </div>
    </li>
  );
}
