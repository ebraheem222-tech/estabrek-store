// «جرّب النموذج»: the owner's own questions (real ones from shoppers), asked to the shop's assistant
// as it is now, in the background. Runs side by side (the last 3): each answer with its time, the
// pieces it showed, whether it didn't know, and the owner's mark. Before switching to another model
// (or a smaller one), the owner runs the same questions and compares.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import * as AiAPI from "../../api/ai.api";
import type { EvalAnswer, EvalMark, EvalRun, EvalState } from "../../api/ai.api";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { formatDateTime } from "../../lib/format";
import { say } from "../../studio/say";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";

/** What a run came to: the average time, the failures, the answers marked good of those marked. */
export function runSummary(run: EvalRun) {
  const done = run.answers.length;
  const ok = run.answers.filter((a) => a.ok);
  const marked = run.answers.filter((a) => a.mark);
  return {
    done,
    failed: done - ok.length,
    avgMs: ok.length ? Math.round(ok.reduce((n, a) => n + a.ms, 0) / ok.length) : 0,
    good: marked.filter((a) => a.mark === "good").length,
    marked: marked.length,
  };
}

const seconds = (ms: number) => (ms / 1000).toFixed(1);

function Cell({ run, a, canWrite }: { run: EvalRun; a: EvalAnswer | undefined; canWrite: boolean }) {
  const qc = useQueryClient();
  const mark = useMutation({
    mutationFn: (m: EvalMark | null) => AiAPI.markEvalAnswer(run.id, a!.qid, m),
    onMutate: (m) => {
      qc.setQueryData<EvalState>(["ai-eval"], (old) =>
        old ? { ...old, runs: old.runs.map((r) => (r.id !== run.id ? r : { ...r, answers: r.answers.map((x) => (x.qid === a!.qid ? { ...x, mark: m } : x)) })) } : old,
      );
    },
    onError: (e) => {
      toast.error(say("ما انحفظ|Not saved|לא נשמר"), { description: getApiErrorMessage(e) });
      qc.invalidateQueries({ queryKey: ["ai-eval"] });
    },
  });
  if (!a) return <td className="min-w-[220px] p-2 align-top text-xs text-white/35">{run.running ? say("بالدور…|Waiting…|ממתין…") : "—"}</td>;
  return (
    <td className="min-w-[220px] p-2 align-top text-xs" data-testid="eval-cell">
      {a.ok ? <p className="whitespace-pre-wrap leading-6">{a.answer}</p> : <p className="text-red-200">{a.error}</p>}
      {a.products.length ? <p className="mt-1 text-[11px] text-white/50">🛍 {a.products.join(" · ")}</p> : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/45">
        <span dir="ltr">{seconds(a.ms)} s</span>
        {a.ok && a.missed ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-200">{say("ما عرف|Didn't know|לא ידע")}</span> : null}
        {canWrite && a.ok ? (
          <span className="ms-auto flex gap-1">
            {(["good", "bad"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={a.mark === m}
                aria-label={m === "good" ? say("جواب منيح|Good answer|תשובה טובה") : say("جواب مش منيح|Bad answer|תשובה לא טובה")}
                onClick={() => mark.mutate(a.mark === m ? null : m)}
                className={`grid h-7 w-7 place-items-center rounded-full border ${a.mark === m ? (m === "good" ? "border-emerald-400 bg-emerald-500/20" : "border-red-400 bg-red-500/20") : "border-white/10 hover:border-white/30"}`}
                data-testid={`eval-mark-${m}`}
              >
                {m === "good" ? "👍" : "👎"}
              </button>
            ))}
          </span>
        ) : null}
      </div>
    </td>
  );
}

export default function AiEvalPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const q = useQuery({ queryKey: ["ai-eval"], queryFn: AiAPI.evalState, refetchInterval: (query) => (query.state.data?.running ? 1500 : false) });
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (q.data && text === null) setText(q.data.questions.map((x) => x.text).join("\n"));
  }, [q.data, text]);
  const lines = (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const saved = (q.data?.questions ?? []).map((x) => x.text).join("\n");
  const dirty = text !== null && lines.join("\n") !== saved;

  const save = useMutation({
    mutationFn: () => AiAPI.saveEvalQuestions(lines),
    onSuccess: (d) => {
      qc.setQueryData(["ai-eval"], d);
      setText(d.questions.map((x) => x.text).join("\n"));
      toast.success(say("انحفظوا|Saved|נשמרו"));
    },
    onError: (e) => toast.error(say("ما انحفظوا|Not saved|לא נשמרו"), { description: getApiErrorMessage(e) }),
  });
  const run = useMutation({
    mutationFn: AiAPI.startEvalRun,
    onSuccess: (d) => qc.setQueryData(["ai-eval"], d),
    onError: (e) => toast.error(say("ما بلّش|It didn't start|לא התחיל"), { description: getApiErrorMessage(e) }),
  });
  const remove = useMutation({
    mutationFn: AiAPI.deleteEvalRun,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-eval"] }),
    onError: (e) => toast.error(say("ما انمسح|Not deleted|לא נמחק"), { description: getApiErrorMessage(e) }),
  });

  const d = q.data;
  const limit = d?.limits.questions ?? 50;
  return (
    <div className="space-y-4 pb-24" data-testid="ai-eval-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">{say("جرّب النموذج 🧪|Try the model 🧪|לנסות את המודל 🧪")}</h1>
        <p className="mt-1 text-sm leading-6 text-white/60">
          {say(
            "اكتب أسئلة حقيقية من زباينك (سؤال بكل سطر، لحد 50). بكبسة بتنسأل كلها لمساعد المتجر زي ما هو هلأ، وبتشوف الأجوبة جنب بعض مع الوقت. علّم 👍 أو 👎، وقبل ما تغيّر النموذج (أو تعلّمه «صغير») جرّب نفس الأسئلة وقارن.|Write real questions from your shoppers (one per line, up to 50). One press asks them all to the shop's assistant as it is now, and the answers show side by side with their times. Mark 👍 or 👎, and before changing the model (or marking it small) run the same questions and compare.|כותבים שאלות אמיתיות מהלקוחות (שאלה בכל שורה, עד 50). בלחיצה אחת כולן נשאלות את עוזר החנות כפי שהוא עכשיו, והתשובות מוצגות זו לצד זו עם הזמן. מסמנים 👍 או 👎, ולפני שמחליפים מודל (או מסמנים אותו כקטן) מריצים את אותן שאלות ומשווים.",
          )}{" "}
          <Link to="/admin/ai" className="underline underline-offset-2">{say("وين بيشتغل الذكاء الاصطناعي|Where the AI runs|איפה ה־AI רץ")}</Link>
        </p>
      </section>

      {q.isLoading ? (
        <div className={`${box} flex items-center gap-2 text-sm`}><Spinner /> …</div>
      ) : q.isError || !d ? (
        <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</div>
      ) : (
        <>
          <section className={box}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{say("الأسئلة|The questions|השאלות")}</h2>
              <span className={`text-xs tabular-nums ${lines.length > limit ? "text-amber-300" : "text-white/45"}`}>{lines.length} / {limit}</span>
            </div>
            <textarea
              className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm leading-7"
              rows={8}
              value={text ?? ""}
              disabled={!canWrite}
              onChange={(e) => setText(e.target.value)}
              placeholder={say("عندكم مقاس L بالعباية السودا؟\nقديش بياخد التوصيل لنابلس؟\nبدي إشي للعرس بلون فاتح|Do you have the black abaya in L?\nHow long is delivery to Nablus?\nSomething light-coloured for a wedding|יש את העבאיה השחורה במידה L?\nכמה זמן לוקח משלוח לשכם?\nמשהו בצבע בהיר לחתונה")}
              aria-label={say("الأسئلة، سؤال بكل سطر|The questions, one per line|השאלות, שאלה בכל שורה")}
              data-testid="eval-questions"
            />
            {canWrite ? (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button variant="secondary" disabled={!dirty} isLoading={save.isPending} onClick={() => save.mutate()} data-testid="eval-save">{say("احفظ الأسئلة|Save the questions|שמירת השאלות")}</Button>
                <Button variant="primary" disabled={d.running || dirty || !d.questions.length} isLoading={run.isPending} onClick={() => run.mutate()} data-testid="eval-start">
                  {say(`اسأل الـ ${d.questions.length} سؤال ▶|Ask all ${d.questions.length} ▶|לשאול את כל ה־${d.questions.length} ▶`)}
                </Button>
              </div>
            ) : null}
          </section>

          {d.runs.length ? (
            <section className={`${box} overflow-x-auto`} data-testid="eval-runs">
              <table className="w-full border-separate border-spacing-0 text-start">
                <thead>
                  <tr>
                    <th className="min-w-[160px] p-2 text-start text-xs font-medium text-white/50">{say("السؤال|Question|שאלה")}</th>
                    {d.runs.map((r) => {
                      const sum = runSummary(r);
                      return (
                        <th key={r.id} className="min-w-[220px] p-2 text-start align-top text-xs font-normal" data-testid="eval-run">
                          <span className="block font-mono text-sm text-white" dir="ltr">{r.model}</span>
                          <span className="block text-white/45">{formatDateTime(r.at)}</span>
                          {r.running ? (
                            <span className="mt-1 flex items-center gap-1.5 text-white/70" data-testid="eval-run-progress"><Spinner /> {say(`${sum.done} من ${r.total}|${sum.done} of ${r.total}|${sum.done} מתוך ${r.total}`)}</span>
                          ) : (
                            <span className="mt-1 block text-white/70" data-testid="eval-run-summary">
                              {say(`بالمعدل ${seconds(sum.avgMs)} ث|${seconds(sum.avgMs)} s on average|${seconds(sum.avgMs)} ש׳ בממוצע`)}
                              {sum.failed ? ` · ${say(`${sum.failed} ما ردّ|${sum.failed} failed|${sum.failed} נכשלו`)}` : ""}
                              {sum.marked ? ` · 👍 ${sum.good}/${sum.marked}` : ""}
                            </span>
                          )}
                          {canWrite && !r.running ? (
                            <button type="button" className="mt-1 text-[11px] text-white/40 underline-offset-2 hover:underline" onClick={() => remove.mutate(r.id)}>{say("امسح|Delete|מחיקה")}</button>
                          ) : null}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {d.questions.map((qq) => (
                    <tr key={qq.id} className="border-t border-white/[0.06]">
                      <td className="p-2 align-top text-sm">{qq.text}</td>
                      {d.runs.map((r) => (
                        <Cell key={r.id} run={r} a={r.answers.find((x) => x.qid === qq.id)} canWrite={canWrite} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
