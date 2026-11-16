// الـ Functions: one function. Its sentence is the recipes': what it is handed, if → do, else,
// and what to do when a step fails. The draft is what is edited here; "publish" makes it what
// runs. It is tried dry before that: nothing is written or sent.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { useConfirm } from "../../components/useConfirm";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as FnAPI from "../../api/functions.api";
import type { FnDef, FnFull, FnInput, InputType, Outcome, Problem } from "../../api/functions.api";
import { countSteps, freeName, nameOk, stepOfLine } from "./fnDraft";
import { INPUT_TYPE, STATE_NAME, problemText, stateOf, whereText } from "./fnText";
import { BuilderProvider, CondList, StepList, type Builder } from "./StepList";
import { TryPanel } from "./TryPanel";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const BADGE = { draft: "default", changed: "warning", live: "success", off: "default" } as const;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function FunctionEditor() {
  const { id = "" } = useParams();
  const lang = adminLang();
  const qc = useQueryClient();
  const canWrite = useAuth().hasPermission("functions:write");
  const [confirm, dialog] = useConfirm();
  const list = useQuery({ queryKey: ["functions"], queryFn: FnAPI.getFunctions });
  const q = useQuery({ queryKey: ["functions", id], queryFn: () => FnAPI.getFunction(id), enabled: !!id });
  const fn = q.data;

  // What is being edited: the draft, the name and the note. They follow the server until the first change here.
  const [draft, setDraft] = useState<FnDef | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [openAt, setOpenAt] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  useEffect(() => {
    if (!fn) return;
    setDraft(fn.draft);
    setName(fn.name);
    setNote(fn.note ?? "");
  }, [fn?.id, fn?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !!fn && !!draft && (!same(draft, fn.draft) || name.trim() !== fn.name || note.trim() !== (fn.note ?? ""));
  const took = (saved: FnFull) => {
    qc.setQueryData(["functions", id], saved);
    void qc.invalidateQueries({ queryKey: ["functions"], exact: true });
  };
  const onError = (e: unknown) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) });

  const save = useMutation({ mutationFn: () => FnAPI.saveFunction(id, { name: name.trim() || fn!.name, note: note.trim() || null, draft: draft! }), onSuccess: took, onError });
  const toggle = useMutation({ mutationFn: (enabled: boolean) => FnAPI.saveFunction(id, { enabled }), onSuccess: took, onError });
  const publish = useMutation({
    mutationFn: async () => {
      // What is on the page is what gets published: saved first when it changed.
      if (dirty) took(await FnAPI.saveFunction(id, { name: name.trim() || fn!.name, note: note.trim() || null, draft: draft! }));
      return FnAPI.publishFunction(id);
    },
    onSuccess: (saved) => {
      took(saved);
      toast.success(say("انتشرت|Published|פורסמה"), { description: say("هاي الخطوات هي اللي بتشتغل من هلأ.|These steps are what runs from now on.|מעכשיו אלה השלבים שרצים.") });
    },
    onError: (e) => {
      onError(e);
      void qc.invalidateQueries({ queryKey: ["functions", id] });
    },
  });
  const run = useMutation({
    mutationFn: async ({ input, real }: { input: Record<string, unknown>; real: boolean }) => {
      // The draft is tried as it is on the page.
      if (!real && dirty) took(await FnAPI.saveFunction(id, { name: name.trim() || fn!.name, note: note.trim() || null, draft: draft! }));
      return FnAPI.runFunction(id, { input, dry: !real, which: real ? "live" : "draft" });
    },
    onSuccess: (out) => {
      setOutcome(out);
      void qc.invalidateQueries({ queryKey: ["functions"] });
    },
    onError,
  });

  const builder = useMemo<Builder | null>(
    () =>
      draft && list.data
        ? { def: draft, change: setDraft, tables: list.data.tables, fns: list.data.functions.filter((f) => f.id !== id), ops: list.data.ops, problems: dirty ? [] : fn?.problems ?? [], failedAt: outcome?.failedAt ? stepOfLine(outcome.failedAt) : null, canWrite, openAt, setOpenAt }
        : null,
    [draft, list.data, id, dirty, fn?.problems, outcome?.failedAt, canWrite, openAt],
  );

  if (q.isLoading || list.isLoading) return <Spinner />;
  if (q.isError || !fn || !draft || !builder) return <div className="text-sm text-red-200">{getApiErrorMessage(q.error ?? list.error)}</div>;

  const state = stateOf(fn);
  const problems: Problem[] = dirty ? [] : fn.problems;
  const setInputs = (inputs: FnInput[]) => setDraft({ ...draft, inputs });
  // A problem that no step's card shows (the function's own conditions, its inputs) is said at the top.
  const loose = problems.filter((p) => p.at.startsWith("if."));

  return (
    <BuilderProvider value={builder}>
      <div className="space-y-4 pb-24" data-testid="fn-editor">
        <section className={box}>
          <Link to="/admin/functions" className="text-xs text-white/60 underline">
            {say("← كل الـ functions|← All functions|← כל הפונקציות")}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input className={`${field} h-10 flex-1 text-base font-semibold`} value={name} disabled={!canWrite} maxLength={80} onChange={(e) => setName(e.target.value)} aria-label={say("اسم الـ function|The function's name|שם הפונקציה")} data-testid="fn-name" />
            <Badge variant={BADGE[state]} size="sm">
              <span data-testid="fn-state">{say(STATE_NAME[state])}</span>
            </Badge>
            {fn.published ? <ToggleSwitch checked={fn.enabled} label={say("شغّالة|Switched on|פועלת")} disabled={!canWrite} busy={toggle.isPending} onChange={(v) => toggle.mutate(v)} /> : null}
          </div>
          <input className={`${field} mt-2 w-full`} value={note} disabled={!canWrite} maxLength={300} placeholder={say("شو بتعمل؟ (ملاحظة إلك)|What does it do? (a note for you)|מה היא עושה? (הערה בשבילך)")} onChange={(e) => setNote(e.target.value)} data-testid="fn-note" />
          {canWrite ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => save.mutate()} disabled={!dirty} isLoading={save.isPending} data-testid="fn-save">
                {say("احفظ المسودة|Save the draft|שמירת הטיוטה")}
              </Button>
              <Button size="sm" variant="primary" onClick={() => publish.mutate()} disabled={!dirty && !fn.changed} isLoading={publish.isPending} data-testid="fn-publish">
                {say("انشر|Publish|פרסום")}
              </Button>
              <span className="text-xs text-white/60" data-testid="fn-dirty">
                {dirty
                  ? say("في تعديلات مش محفوظة.|There are changes that aren't saved.|יש שינויים שלא נשמרו.")
                  : fn.published && fn.changed
                    ? say("المسودة محفوظة، بس اللي بيشتغل هو اللي انتشر قبل.|The draft is saved; what runs is what was published before.|הטיוטה נשמרה; מה שרץ הוא מה שפורסם קודם.")
                    : ""}
              </span>
            </div>
          ) : null}
          {!dirty && problems.length ? (
            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200" data-testid="fn-problems">
              <div className="font-medium">{say("قبل النشر، صلّح هدول ({n}):|Before publishing, fix these ({n}):|לפני הפרסום יש לתקן ({n}):").replace("{n}", String(problems.length))}</div>
              <ul className="mt-1 space-y-0.5">
                {problems.slice(0, 12).map((p, k) => (
                  <li key={k}>
                    <button type="button" className="underline" onClick={() => setOpenAt(p.at.replace(/\.if\.\d+$/, ""))}>
                      {whereText(p.at, lang)}
                    </button>
                    : {problemText(p.message, lang)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className={box} data-testid="fn-inputs">
          <h2 className="font-medium">{say("شو بتنعطى|What it is handed|מה היא מקבלת")}</h2>
          <p className="mt-1 text-xs text-white/60">{say("المدخلات اللي بتوصلها لما تشتغل. الخطوات بتسميها {{input.الاسم}}.|What it gets when it runs. The steps name them {{input.name}}.|מה שהיא מקבלת כשהיא רצה. השלבים קוראים להם {{input.name}}.")}</p>
          <div className="mt-3 space-y-2">
            {draft.inputs.map((i, k) => (
              <div key={k} className="flex flex-wrap items-center gap-2" data-testid={`fn-input-${k}`}>
                <input
                  className={`${field} w-40 ${nameOk(i.name) || i.name === "input" ? "" : "border-red-400/60"}`}
                  dir="ltr"
                  value={i.name}
                  disabled={!canWrite}
                  onChange={(e) => setInputs(draft.inputs.map((x, n) => (n === k ? { ...x, name: e.target.value.trim() } : x)))}
                  data-testid={`fn-input-${k}-name`}
                />
                <select className={field} value={i.type} disabled={!canWrite} onChange={(e) => setInputs(draft.inputs.map((x, n) => (n === k ? { ...x, type: e.target.value as InputType } : x)))} data-testid={`fn-input-${k}-type`}>
                  {Object.keys(INPUT_TYPE).map((t) => (
                    <option key={t} value={t}>
                      {say(INPUT_TYPE[t])}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-sm text-white/80">
                  <input type="checkbox" className="h-4 w-4 accent-current" checked={!!i.required} disabled={!canWrite} onChange={(e) => setInputs(draft.inputs.map((x, n) => (n === k ? { ...x, required: e.target.checked || undefined } : x)))} data-testid={`fn-input-${k}-required`} />
                  {say("لازم|Needed|חובה")}
                </label>
                {canWrite ? (
                  <button type="button" className="h-9 px-2 text-sm text-white/60 hover:text-red-300" onClick={() => setInputs(draft.inputs.filter((_x, n) => n !== k))} aria-label={say("شيل المدخل|Remove the input|הסרת הקלט")} data-testid={`fn-input-${k}-remove`}>
                    ✕
                  </button>
                ) : null}
              </div>
            ))}
            {canWrite ? (
              <button type="button" className="text-sm underline" onClick={() => setInputs([...draft.inputs, { name: freeName("value", draft.inputs.map((i) => i.name)), type: "text" }])} data-testid="fn-input-add">
                {say("＋ مدخل|＋ input|＋ קלט")}
              </button>
            ) : null}
          </div>
        </section>

        <section className={box}>
          <h2 className="font-medium">{say("إذا|If|אם")}</h2>
          <p className="mt-1 text-xs text-white/60">{say("اختياري: شرط على المدخلات. إذا ما صحّ، بتمشي خطوات «وإلا» (إذا في).|Optional: a condition on what it is handed. When it doesn't hold, the “else” steps run (if there are any).|רשות: תנאי על הקלטים. אם הוא לא מתקיים, רצים שלבי «אחרת» (אם יש).")}</p>
          {loose.length ? (
            <ul className="mt-2 text-xs text-amber-300" data-testid="fn-if-problems">
              {loose.map((p, k) => (
                <li key={k}>
                  {whereText(p.at, lang)}: {problemText(p.message, lang)}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3">
            <CondList at={["if"]} list="if" conds={draft.if ?? []} match={draft.match} onChange={(conds, match) => setDraft({ ...draft, if: conds.length ? conds : undefined, match: conds.length > 1 ? match : undefined, ...(conds.length ? {} : { else: undefined }) })} />
          </div>
        </section>

        <section className={box}>
          <h2 className="font-medium">
            {say("اعمل|Do|לעשות")} <span className="text-xs font-normal text-white/60">({countSteps(draft.do)})</span>
          </h2>
          <div className="mt-3">
            <StepList list={["do"]} />
          </div>
        </section>

        {draft.if?.length ? (
          <section className={box}>
            <h2 className="font-medium">{say("وإلا|Else|אחרת")}</h2>
            <div className="mt-3">
              <StepList list={["else"]} />
            </div>
          </section>
        ) : null}

        <section className={box}>
          <h2 className="font-medium">{say("إذا فشلت خطوة|If a step fails|אם שלב נכשל")}</h2>
          <p className="mt-1 text-xs text-white/60">
            {say(
              "الـ function بتوقف عند أول خطوة بتفشل، واللي انعمل قبلها بيضل. هون بتقول شو يصير وقتها: تنبيه، رسالة، أو تسجيل بجدول. سبب الفشل اسمه {{error}}.|A function stops at the first step that fails, and what was done before it stays. Here you say what happens then: a bell, a message, a row written down. The failure is called {{error}}.|פונקציה נעצרת בשלב הראשון שנכשל, ומה שנעשה לפניו נשאר. כאן קובעים מה קורה אז: התראה, הודעה או רישום בטבלה. הכישלון נקרא {{error}}.",
            )}
          </p>
          <div className="mt-3">
            <StepList list={["fail"]} fail />
          </div>
        </section>

        <section className={box}>
          <h2 className="font-medium">{say("جرّبها|Try it|ניסיון")}</h2>
          <p className="mt-1 text-xs text-white/60">{say("التجربة بتمشي على المسودة وما بتكتب ولا بتبعت شي: كل خطوة بتقول شو كانت رح تعمل.|A try runs the draft and writes or sends nothing: every step says what it would have done.|ניסיון מריץ את הטיוטה ולא כותב או שולח דבר: כל שלב אומר מה היה עושה.")}</p>
          <div className="mt-3">
            <TryPanel
              inputs={draft.inputs}
              canRun={canWrite}
              canRunLive={fn.published}
              busy={run.isPending}
              outcome={outcome}
              onRun={async (input, real) => {
                if (real && !(await confirm({ title: say("تشغيل فعلي|A real run|הרצה אמיתית"), message: say("الخطوات المنشورة رح تشتغل فعلاً: بتكتب بالجداول وبتبعت رسايل. متأكد؟|The published steps will run for real: they write to the tables and send messages. Sure?|השלבים שפורסמו ירוצו באמת: הם כותבים לטבלאות ושולחים הודעות. בטוח?"), confirmText: say("شغّل|Run|הרצה"), variant: "warning" }))) return;
                run.mutate({ input, real });
              }}
            />
          </div>
        </section>
        {dialog}
      </div>
    </BuilderProvider>
  );
}
