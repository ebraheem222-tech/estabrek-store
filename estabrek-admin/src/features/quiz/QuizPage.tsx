// سؤال وجواب: a few visitors (1، 3، 7، 15… or a draw) get a chance to answer
// questions easy → hard; all right → a one-time coupon for their phone. The
// switch and rules, this period's numbers, the questions (each approved by
// the owner before it's asked) and the winners.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as QuizAPI from "../../api/quiz.api";
import type { QuestionInput, QuizQuestion, QuizSettings } from "../../api/quiz.api";
import { relativeTime } from "../team/teamText";
import { LEVEL_LABELS, TOPIC_LABELS, chanceSteps, scheduleText } from "./quizText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";

export default function QuizPage() {
  const q = useQuery({ queryKey: ["quiz"], queryFn: QuizAPI.getQuiz });
  return (
    <div dir="rtl" className="space-y-4 pb-24" data-testid="quiz-page">
      {q.isLoading ? (
        <div className={`${box} flex items-center gap-2 text-sm`}><Spinner /> جاري التحميل…</div>
      ) : q.isError || !q.data ? (
        <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</div>
      ) : (
        <>
          <Settings key={JSON.stringify(q.data.settings)} data={q.data} />
          <Numbers data={q.data} />
        </>
      )}
      <Questions />
      <Winners />
    </div>
  );
}

function Settings({ data }: { data: Awaited<ReturnType<typeof QuizAPI.getQuiz>> }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const [s, setS] = useState<QuizSettings>(data.settings);
  const set = (p: Partial<QuizSettings>) => setS((x) => ({ ...x, ...p }));
  const dirty = JSON.stringify(s) !== JSON.stringify(data.settings);
  const short = data.approved < s.questions;
  const save = useMutation({
    mutationFn: () => QuizAPI.saveQuiz(s),
    onSuccess: () => { toast.success(s.enabled ? "«سؤال وجواب» شغّال" : "انحفظ"); qc.invalidateQueries({ queryKey: ["quiz"] }); qc.invalidateQueries({ queryKey: ["features"] }); },
    onError: (e) => toast.error("ما انحفظ", { description: getApiErrorMessage(e) }),
  });
  const num = (label: string, key: keyof QuizSettings, min: number, max: number, hint?: string) => (
    <label className="block">
      <span className="mb-1 block text-xs text-white/55">{label}</span>
      <input type="number" dir="ltr" min={min} max={max} className={`${field} w-28`} value={s[key] as number} disabled={!canWrite} onChange={(e) => set({ [key]: Math.max(min, Math.min(max, Math.round(Number(e.target.value) || min))) } as Partial<QuizSettings>)} aria-label={label} />
      {hint ? <span className="mt-1 block text-[11px] text-white/40">{hint}</span> : null}
    </label>
  );

  return (
    <section className={box} data-testid="quiz-settings">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">سؤال وجواب 🎁</h1>
          <p className="mt-1 text-sm text-white/60">
            رزان بتعرض على زوار قليلين يجاوبوا على أسئلة دينية من السهل للصعب. اللي بتجاوب كلها صح بتربح كوبون خصم لمرة وحدة، لرقمها بس. الزبونة هي اللي بتختار تلعب.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/70">{s.enabled ? "شغّال" : "مطفي"}</span>
          <ToggleSwitch checked={s.enabled} label="«سؤال وجواب» شغّال" disabled={!canWrite} onChange={(v) => set({ enabled: v })} />
        </div>
      </div>
      {short ? (
        <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100" data-testid="quiz-short">
          لازم توافق على {s.questions} أسئلة على الأقل قبل ما تشغّله (موافق هلّق على {data.approved}). راجع الأسئلة تحت ووافق على اللي بتريدها.
        </p>
      ) : null}
      <p className="mt-2 text-xs text-white/45">رزان لازم تكون ظاهرة بالمتجر (<Link className="underline" to="/admin/razan">صفحة رزان</Link>) — هي اللي بتعرض الفرصة.</p>

      <fieldset className="mt-4">
        <legend className="mb-2 text-xs text-white/55">مين بياخد فرصة</legend>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="طريقة الفرص">
          {([["counter", "بالعدّ", `الزائرة رقم ${scheduleText(s.base, 5)} بهالفترة.`], ["chance", "بالحظ", `أول جائزة بفرصة ${s.startChance}%، وبعد كل جائزة الفرصة بتصير ÷${s.base}.`]] as const).map(([k, l, h]) => (
            <button key={k} type="button" role="radio" aria-checked={s.mode === k} disabled={!canWrite} onClick={() => set({ mode: k })} className={`rounded-xl border p-3 text-start ${s.mode === k ? "border-accent-400/60 bg-accent-500/15" : "border-white/10 hover:border-white/25"}`}>
              <span className="block text-sm font-medium">{l}</span>
              <span className="mt-0.5 block text-[11px] text-white/50">{h}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {num("المضاعف (2 = 1، 3، 7، 15…)", "base", 2, 5, s.mode === "counter" ? `الفرص: ${scheduleText(s.base)}` : `الفرص: ${chanceSteps(s.startChance, s.base).join(" ← ")}`)}
        {s.mode === "chance" ? num("فرصة أول جائزة (%)", "startChance", 1, 100) : null}
        {num("العدّاد بيرجع من الصفر كل (يوم)", "resetDays", 1, 60, "7 = كل أسبوع (من يوم الأحد).")}
        {num("أكثر عدد كوبونات بالفترة", "maxPerPeriod", 1, 200)}
        {num("الخصم (%)", "percent", 1, 50)}
        {num("الكوبون صالح (ساعة)", "hours", 6, 336)}
        {num("عدد الأسئلة بالمحاولة", "questions", 3, 10, "لازم كلها صح.")}
      </div>
      <p className="mt-4 text-[11px] leading-6 text-white/45">
        مسابقة مجانية بالمعرفة، بدون شرط شراء، ومحاولة وحدة لكل فرصة. الكوبون بيشتغل مرة وحدة ومع نفس رقم الهاتف بس. تأكد إنها مناسبة لقوانين المسابقات عندك.
      </p>
      {canWrite && dirty ? (
        <div className="mt-4 flex justify-end">
          <Button variant="primary" isLoading={save.isPending} disabled={s.enabled && short} onClick={() => save.mutate()}>حفظ</Button>
        </div>
      ) : null}
    </section>
  );
}

function Numbers({ data }: { data: Awaited<ReturnType<typeof QuizAPI.getQuiz>> }) {
  const st = data.stats;
  const end = new Date(st.endsAt).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" });
  const facts: Array<[string, React.ReactNode]> = [
    ["زوار بهالفترة", st.visitors],
    ...(st.nextChanceAt ? ([["الفرصة الجاية للزائرة رقم", st.nextChanceAt]] as Array<[string, React.ReactNode]>) : []),
    ["أخدوا فرصة", st.chances],
    ["لعبوا", st.plays],
    ["جاوبوا كلها صح", st.passes],
    ["ربحوا كوبون", `${st.wins} / ${data.settings.maxPerPeriod}`],
  ];
  return (
    <section className={box} data-testid="quiz-numbers">
      <h2 className="font-semibold">هالفترة</h2>
      <p className="mt-0.5 text-xs text-white/50">بتخلص {end} وبيرجع العدّاد من الصفر.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {facts.map(([l, v]) => (
          <div key={l} className="rounded-xl border border-white/10 p-3">
            <span className="block text-xs text-white/50">{l}</span>
            <span className="mt-1 block text-lg font-semibold tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const EMPTY: QuestionInput = { text: "", choices: ["", "", ""], answer: 0, level: 1, topic: "general" };

function Questions() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const q = useQuery({ queryKey: ["quiz-questions"], queryFn: QuizAPI.listQuestions });
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [gone, setGone] = useState<QuizQuestion | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["quiz-questions"] }); qc.invalidateQueries({ queryKey: ["quiz"] }); };
  const patch = useMutation({
    mutationFn: (v: { id: string; p: Partial<QuestionInput> }) => QuizAPI.updateQuestion(v.id, v.p),
    onSuccess: () => refresh(),
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const del = useMutation({
    mutationFn: (id: string) => QuizAPI.deleteQuestion(id),
    onSuccess: () => { toast.success("انحذف السؤال"); setGone(null); refresh(); },
    onError: (e) => toast.error("ما انحذف", { description: getApiErrorMessage(e) }),
  });
  const list = q.data?.questions ?? [];
  const waiting = list.filter((x) => !x.approved).length;

  return (
    <section className={box} data-testid="quiz-questions">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">الأسئلة</h2>
          <p className="mt-0.5 text-xs text-white/50">
            بينسأل بس السؤال اللي وافقت عليه. بكل محاولة بتطلع أسئلة من كل مستوى، من السهل للصعب.{waiting ? ` ${waiting} سؤال بانتظار مراجعتك.` : ""}
          </p>
        </div>
        {canWrite ? <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>+ سؤال</Button> : null}
      </div>
      {editing === "new" ? <QuestionForm initial={EMPTY} onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} /> : null}
      {q.isLoading ? <div className="mt-3 flex items-center gap-2 text-sm"><Spinner /> …</div> : null}
      {[1, 2, 3].map((lvl) => {
        const rows = list.filter((x) => x.level === lvl);
        if (!rows.length) return null;
        return (
          <div key={lvl} className="mt-4">
            <h3 className="mb-2 text-xs text-white/55">{LEVEL_LABELS[lvl]} ({rows.length})</h3>
            <ul className="space-y-2">
              {rows.map((x) => (
                <li key={x.id} className={`rounded-xl border p-3 ${x.approved ? "border-white/10" : "border-amber-400/30 bg-amber-500/[0.04]"}`} data-testid="quiz-question">
                  {editing === x.id ? (
                    <QuestionForm initial={x} id={x.id} onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} />
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start gap-2">
                        <p className="min-w-0 flex-1 text-sm font-medium">{x.text}</p>
                        <Badge variant="default" size="sm">{TOPIC_LABELS[x.topic] ?? x.topic}</Badge>
                        {x.approved ? <Badge variant="success" size="sm">موافق عليه</Badge> : <Badge variant="warning" size="sm">بانتظار مراجعتك</Badge>}
                        {!x.active ? <Badge variant="default" size="sm">موقّف</Badge> : null}
                      </div>
                      <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {x.choices.map((c, i) => (
                          <li key={i} className={`rounded-full border px-2 py-0.5 ${i === x.answer ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200" : "border-white/10 text-white/60"}`}>{i === x.answer ? "✓ " : ""}{c}</li>
                        ))}
                      </ul>
                      {canWrite ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button size="sm" variant={x.approved ? "ghost" : "primary"} isLoading={patch.isPending && patch.variables?.id === x.id} onClick={() => patch.mutate({ id: x.id, p: { approved: !x.approved } })}>
                            {x.approved ? "إلغاء الموافقة" : "موافق ✓"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => patch.mutate({ id: x.id, p: { active: !x.active } })}>{x.active ? "وقّف" : "رجّع"}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(x.id)}>تعديل</Button>
                          <Button size="sm" variant="ghost" className="text-red-300" onClick={() => setGone(x)}>حذف</Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <ConfirmDialog open={Boolean(gone)} title="حذف السؤال" message={gone?.text ?? ""} confirmText="احذف" isLoading={del.isPending} onConfirm={() => { if (gone) del.mutate(gone.id); }} onClose={() => setGone(null)} />
    </section>
  );
}

function QuestionForm({ initial, id, onDone, onCancel }: { initial: QuestionInput; id?: string; onDone: () => void; onCancel: () => void }) {
  const [v, setV] = useState<QuestionInput>({ text: initial.text, choices: [...initial.choices], answer: initial.answer, level: initial.level, topic: initial.topic });
  const save = useMutation({
    mutationFn: () => {
      // Empty boxes are dropped; the right answer keeps pointing at its text.
      const filled = v.choices.map((c, i) => [i, c.trim()] as const).filter(([, c]) => c);
      const body = { ...v, text: v.text.trim(), choices: filled.map(([, c]) => c), answer: Math.max(0, filled.findIndex(([i]) => i === v.answer)) };
      return id ? QuizAPI.updateQuestion(id, body) : QuizAPI.createQuestion(body);
    },
    onSuccess: () => { toast.success(id ? "انحفظ السؤال" : "انضاف السؤال — وافق عليه لما تكون جاهز"); onDone(); },
    onError: (e) => toast.error("ما انحفظ", { description: getApiErrorMessage(e) }),
  });
  const filled = v.choices.filter((c) => c.trim()).length;
  const ok = v.text.trim().length >= 5 && filled >= 2 && v.choices[v.answer]?.trim();
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-white/10 p-3" data-testid="quiz-question-form">
      <label className="block">
        <span className="mb-1 block text-xs text-white/55">السؤال</span>
        <input className={field} value={v.text} maxLength={300} onChange={(e) => setV({ ...v, text: e.target.value })} aria-label="نص السؤال" />
      </label>
      <fieldset>
        <legend className="mb-1 text-xs text-white/55">الأجوبة (اختر الصح)</legend>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name={`ans-${id ?? "new"}`} checked={v.answer === i} onChange={() => setV({ ...v, answer: i })} aria-label={`الجواب ${i + 1} هو الصح`} />
              <input className={field} value={v.choices[i] ?? ""} maxLength={120} placeholder={i >= 2 ? "اختياري" : ""} onChange={(e) => { const c = [...v.choices]; c[i] = e.target.value; setV({ ...v, choices: c }); }} aria-label={`الجواب ${i + 1}`} />
            </div>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <select className={`${field} w-auto`} value={v.level} onChange={(e) => setV({ ...v, level: Number(e.target.value) })} aria-label="المستوى">
          {[1, 2, 3].map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
        </select>
        <select className={`${field} w-auto`} value={v.topic} onChange={(e) => setV({ ...v, topic: e.target.value })} aria-label="الموضوع">
          {Object.entries(TOPIC_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" disabled={!ok} isLoading={save.isPending} onClick={() => save.mutate()}>حفظ</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>إلغاء</Button>
      </div>
    </div>
  );
}

function Winners() {
  const q = useQuery({ queryKey: ["quiz-winners"], queryFn: QuizAPI.listWinners });
  const rows = q.data?.winners ?? [];
  return (
    <section className={box} data-testid="quiz-winners">
      <h2 className="font-semibold">اللي ربحوا</h2>
      {q.isLoading ? <div className="mt-3 flex items-center gap-2 text-sm"><Spinner /> …</div> : !rows.length ? (
        <p className="mt-2 text-sm text-white/50">لسا ما ربح حدا.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {rows.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="font-mono" dir="ltr">{w.code}</span>
              <span className="text-white/70">{w.name ? `${w.name} · ` : ""}<span dir="ltr">…{w.phone.slice(-4)}</span></span>
              <Badge variant={w.used ? "success" : w.endsAt && new Date(w.endsAt) < new Date() ? "default" : "warning"} size="sm">
                {w.used ? "انستعمل" : w.endsAt && new Date(w.endsAt) < new Date() ? "خلصت مدته" : `${w.percent}% — لسا`}
              </Badge>
              <span className="ms-auto text-xs text-white/45">{relativeTime(w.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
