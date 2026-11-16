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
import type { FnDef, FnFull, FnInput, FnTest, FnVersion, InputType, Outcome, Problem, TestsOutcome } from "../../api/functions.api";
import { countSteps, freeName, nameOk, stepOfLine } from "./fnDraft";
import { INPUT_TYPE, STATE_NAME, problemText, stateOf, whereText } from "./fnText";
import { FnTriggers } from "./FnTriggers";
import { BuilderProvider, CondList, Line, StepList, type Builder } from "./StepList";
import { TryPanel } from "./TryPanel";
import { TestsPanel, newTest } from "./TestsPanel";
import { VersionsPanel } from "./VersionsPanel";

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
  // Its own tests (kept with it, saved with the draft), and how they went the last time they ran.
  const [tests, setTests] = useState<FnTest[]>([]);
  const [ran, setRan] = useState<TestsOutcome | null>(null);
  useEffect(() => {
    if (!fn) return;
    setDraft(fn.draft);
    setName(fn.name);
    setNote(fn.note ?? "");
    setTests(fn.tests ?? []);
  }, [fn?.id, fn?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !!fn && !!draft && (!same(draft, fn.draft) || name.trim() !== fn.name || note.trim() !== (fn.note ?? "") || !same(tests, fn.tests ?? []));
  /** What is on the page, as it is saved. */
  const page = () => ({ name: name.trim() || fn!.name, note: note.trim() || null, draft: draft!, tests });
  const took = (saved: FnFull) => {
    qc.setQueryData(["functions", id], saved);
    void qc.invalidateQueries({ queryKey: ["functions"], exact: true });
  };
  const onError = (e: unknown) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) });

  const save = useMutation({ mutationFn: () => FnAPI.saveFunction(id, page()), onSuccess: took, onError });
  const toggle = useMutation({ mutationFn: (enabled: boolean) => FnAPI.saveFunction(id, { enabled }), onSuccess: took, onError });
  const publish = useMutation({
    mutationFn: async () => {
      // What is on the page is what gets published: saved first when it changed.
      if (dirty) took(await FnAPI.saveFunction(id, page()));
      return FnAPI.publishFunction(id);
    },
    onSuccess: (saved) => {
      took(saved);
      setRan(null);
      toast.success(say("انتشرت|Published|פורסמה"), { description: say("هاي الخطوات هي اللي بتشتغل من هلأ.|These steps are what runs from now on.|מעכשיו אלה השלבים שרצים.") });
    },
    onError: (e) => {
      // One of its own tests didn't pass: the publish stopped, and each test says how it went.
      const refused = (e as { response?: { data?: { error?: string; details?: TestsOutcome } } })?.response?.data;
      if (refused?.error === "FN_TESTS_FAILED" && refused.details?.results) {
        setRan(refused.details);
        toast.error(say("ما انتشرت|Not published|לא פורסמה"), { description: say("في اختبارات ما نجحت. شوفها تحت بقسم الاختبارات.|Some of its tests didn't pass. See them below, under the tests.|חלק מהבדיקות לא עברו. הן מופיעות למטה, באזור הבדיקות.") });
        document.querySelector('[data-testid="fn-tests"]')?.scrollIntoView?.({ block: "center" });
      } else onError(e);
      void qc.invalidateQueries({ queryKey: ["functions", id] });
    },
  });
  // An older version published again, or taken into the draft.
  const back = useMutation({
    mutationFn: ({ n, to }: { n: number; to: "live" | "draft" }) => FnAPI.restoreFnVersion(id, n, to),
    onSuccess: (saved, { n, to }) => {
      took(saved);
      setRan(null);
      setOutcome(null);
      if (to === "live") toast.success(say("رجعت النسخة {n} تشتغل|Version {n} runs again|גרסה {n} שוב רצה").replace("{n}", String(n)), { description: say("انحفظت كنسخة جديدة رقم {v}.|It was kept as a new version, number {v}.|היא נשמרה כגרסה חדשה, מספר {v}.").replace("{v}", String(saved.version ?? "")) });
      else toast.success(say("خطوات النسخة {n} صارت بالمسودة|Version {n}'s steps are in the draft|השלבים של גרסה {n} נמצאים בטיוטה").replace("{n}", String(n)), { description: say("اللي بيشتغل ما تغيّر لحد ما تنشر.|What runs hasn't changed until you publish.|מה שרץ לא השתנה עד שתפרסמו.") });
    },
    onError: (e) => {
      // It points at things that are gone since (a table, a connection, a function): each is said.
      const refused = (e as { response?: { data?: { error?: string; details?: { problems?: Problem[] } } } })?.response?.data;
      if (refused?.error === "FN_HAS_PROBLEMS" && refused.details?.problems?.length) {
        toast.error(say("ما بتنتشر متل ما هي|It can't be published as it is|אי אפשר לפרסם אותה כמו שהיא"), {
          description: `${say("بتحكي عن أشياء ما عادت موجودة:|It talks about things that aren't there any more:|היא מתייחסת לדברים שכבר לא קיימים:")} ${refused.details.problems.map((p) => `${whereText(p.at, lang)}: ${problemText(p.message, lang)}`).join(" · ")} ${say("حطها بالمسودة وصلّحها.|Put it in the draft and mend it.|העבירו אותה לטיוטה ותקנו.")}`,
        });
      } else onError(e);
    },
  });
  const restore = async (v: FnVersion, to: "live" | "draft") => {
    const n = String(v.n);
    const sure =
      to === "live"
        ? await confirm({
            title: say("نشر النسخة {n} من جديد|Publish version {n} again|פרסום מחדש של גרסה {n}").replace("{n}", n),
            message: say("خطوات النسخة {n} بترجع هي اللي بتشتغل، كنسخة جديدة. المسودة اللي عم تشتغل عليها ما بتتغيّر.|Version {n}'s steps become what runs again, as a new version. The draft you are working on isn't changed.|השלבים של גרסה {n} חוזרים להיות מה שרץ, כגרסה חדשה. הטיוטה שעליה עובדים לא משתנה.").replace("{n}", n),
            confirmText: say("انشرها|Publish it|פרסום"),
            variant: "warning",
          })
        : // Nothing would be lost: the draft is what is published (or this very version).
          !dirty && !fn?.changed
          ? true
          : await confirm({
              title: say("النسخة {n} للمسودة|Version {n} into the draft|גרסה {n} לטיוטה").replace("{n}", n),
              message: say("المسودة بتتبدّل بخطوات النسخة {n}، والتعديلات اللي فيها وما انتشرت بتروح. اللي بيشتغل ما بيتغيّر.|The draft is replaced by version {n}'s steps, and the changes in it that weren't published are lost. What runs isn't changed.|הטיוטה מוחלפת בשלבים של גרסה {n}, והשינויים שבה שלא פורסמו יאבדו. מה שרץ לא משתנה.").replace("{n}", n),
              confirmText: say("بدّل المسودة|Replace the draft|החלפת הטיוטה"),
              variant: "warning",
            });
    if (sure) back.mutate({ n: v.n, to });
  };
  const test = useMutation({
    mutationFn: async () => {
      // The tests run what is on the page: saved first when it changed.
      if (dirty) took(await FnAPI.saveFunction(id, page()));
      return FnAPI.runFnTests(id);
    },
    onSuccess: setRan,
    onError,
  });
  const run = useMutation({
    mutationFn: async ({ input, real }: { input: Record<string, unknown>; real: boolean }) => {
      // The draft is tried as it is on the page.
      if (!real && dirty) took(await FnAPI.saveFunction(id, page()));
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
        ? { def: draft, change: setDraft, tables: list.data.tables, fns: list.data.functions.filter((f) => f.id !== id), ops: list.data.ops, problems: dirty ? [] : fn?.problems ?? [], failedAt: outcome?.failedAt ? stepOfLine(outcome.failedAt) : null, canWrite, openAt, setOpenAt, cage: list.data.limits.cage, codeMax: list.data.limits.code, outside: list.data.outside }
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
            {fn.published && fn.version ? (
              <span className="text-xs text-white/70" data-testid="fn-version">
                {say("النسخة {n}|Version {n}|גרסה {n}").replace("{n}", String(fn.version))}
              </span>
            ) : null}
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
          {fn.feature ? (
            <p className={`mt-3 text-sm ${fn.feature.enabled ? "text-white/60" : "rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-amber-200"}`} data-testid="fn-feature">
              {fn.feature.enabled
                ? say("جزء من الميزة:|Part of the feature:|חלק מהתכונה:")
                : say("ميزتها موقّفة، فما في شي بيشغّلها لحد ما ترجع الميزة تشتغل:|Its feature is switched off, so nothing starts it until the feature is on again:|התכונה שלה כבויה, ולכן שום דבר לא מפעיל אותה עד שהתכונה תופעל שוב:")}{" "}
              <Link to={`/admin/my-features/${fn.feature.id}`} className="underline">
                {fn.feature.name}
              </Link>
            </p>
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
          <p className="mt-1 text-xs text-white/60">
            <Line text={say("المدخلات اللي بتوصلها لما تشتغل. الخطوات بتسميها {{input.name}}.|What it gets when it runs. The steps name them {{input.name}}.|מה שהיא מקבלת כשהיא רצה. השלבים קוראים להם {{input.name}}.")} />
          </p>
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
            <Line
              text={say(
                "الـ function بتوقف عند أول خطوة بتفشل، واللي انعمل قبلها بيضل. هون بتقول شو يصير وقتها: تنبيه، رسالة، أو تسجيل بجدول. سبب الفشل اسمه {{error}}.|A function stops at the first step that fails, and what was done before it stays. Here you say what happens then: a bell, a message, a row written down. The failure is called {{error}}.|פונקציה נעצרת בשלב הראשון שנכשל, ומה שנעשה לפניו נשאר. כאן קובעים מה קורה אז: התראה, הודעה או רישום בטבלה. הכישלון נקרא {{error}}.",
              )}
            />
          </p>
          <div className="mt-3">
            <StepList list={["fail"]} fail />
          </div>
        </section>

        <section className={box}>
          <h2 className="font-medium">{say("شو بيشغّلها|What starts it|מה מפעיל אותה")}</h2>
          <p className="mt-1 text-xs text-white/60">
            {say(
              "لحالها: لما سطر ينضاف أو يتعدّل بجدول، على وقت، لما يصير شي بالمتجر، لما زبون يكبس زر أو برنامج يناديها، أو لما نظام تاني يبعت webhook. كل تغيير هون بينحفظ فوراً.|By itself: when a row is added or changed in a table, on a schedule, when something happens in the store, when a shopper presses a button or a program calls it, or when another system sends a webhook. Every change here is saved at once.|מעצמה: כששורה נוספת או משתנה בטבלה, לפי לוח זמנים, כשמשהו קורה בחנות, כשלקוח לוחץ על כפתור או תוכנה קוראת לה, או כשמערכת אחרת שולחת webhook. כל שינוי כאן נשמר מיד.",
            )}
          </p>
          <div className="mt-3">
            <FnTriggers
              fn={fn}
              tables={list.data!.tables}
              meta={list.data!.triggers}
              canWrite={canWrite}
              inputs={draft.inputs}
              onAddInputs={(names) => setInputs([...draft.inputs, ...names.filter((n) => !draft.inputs.some((i) => i.name === n)).map((name) => ({ name, type: "any" as const }))])}
            />
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
              onKeep={(input, ok) => {
                if (tests.length >= (list.data?.limits.tests ?? 20)) return void toast.error(say("وصلت لأكتر عدد اختبارات|No room for another test|אין מקום לבדיקה נוספת"));
                setTests([...tests, newTest(tests, say("اختبار {n}|Test {n}|בדיקה {n}").replace("{n}", String(tests.length + 1)), { input: input as FnTest["input"], expect: { ok } })]);
                toast.success(say("انضافت للاختبارات|Added to the tests|נוספה לבדיקות"), { description: say("احفظ المسودة لتنحفظ معها.|Save the draft to keep it.|שמרו את הטיוטה כדי לשמור אותה.") });
              }}
              onRun={async (input, real) => {
                if (real && !(await confirm({ title: say("تشغيل فعلي|A real run|הרצה אמיתית"), message: say("الخطوات المنشورة رح تشتغل فعلاً: بتكتب بالجداول، بتبعت رسايل وبتتصل بالمواقع. متأكد؟|The published steps will run for real: they write to the tables, send messages and call sites. Sure?|השלבים שפורסמו ירוצו באמת: הם כותבים לטבלאות, שולחים הודעות ופונים לאתרים. בטוח?"), confirmText: say("شغّل|Run|הרצה"), variant: "warning" }))) return;
                run.mutate({ input, real });
              }}
            />
          </div>
        </section>
        <section className={box}>
          <h2 className="font-medium">{say("الاختبارات|Tests|בדיקות")}</h2>
          <p className="mt-1 text-xs text-white/70">
            {say(
              "كل اختبار: شو بتنعطى الـ function، وشو لازم يصير. بيشتغلوا متل التجربة (ما بيكتبوا ولا بيبعتوا، وبيقرأوا جداولك متل ما هي هلأ)، وبيشتغلوا لحالهم قبل كل نشر: إذا واحد ما نجح، النشر بيوقف.|Each test: what the function is handed, and what must come of it. They run like a try (they write and send nothing, and read your tables as they are now), and by themselves before every publish: if one doesn't pass, the publish stops.|כל בדיקה: מה הפונקציה מקבלת ומה צריך לקרות. הן רצות כמו ניסיון (לא כותבות ולא שולחות, וקוראות את הטבלאות כפי שהן עכשיו), ומעצמן לפני כל פרסום: אם אחת לא עוברת, הפרסום נעצר.",
            )}
          </p>
          <div className="mt-3">
            <TestsPanel inputs={draft.inputs} tests={tests} onChange={setTests} canWrite={canWrite} ran={dirty ? null : ran} busy={test.isPending} onRun={() => test.mutate()} max={list.data?.limits.tests ?? 20} usesCaller={JSON.stringify(draft).includes("{{caller")} />
          </div>
        </section>
        <section className={box}>
          <h2 className="font-medium">{say("النسخ|Versions|גרסאות")}</h2>
          <p className="mt-1 text-xs text-white/70">
            {say(
              "كل نشر بينحفظ كنسخة برقم وما بتتغيّر بعدها. آخر نسخة هي اللي بتشتغل، وشغل انطلب قبل نشر جديد بيكمّل على نسخته. إذا نشر جديد خرّب شي: انشر نسخة قديمة من جديد، أو حطها بالمسودة لتشتغل عليها. بينحفظ آخر {n} نسخة.|Every publish is kept as a numbered version and never changes after that. The newest one is what runs, and work that was asked for before a new publish finishes on its own version. If a new publish broke something: publish an older version again, or put it in the draft to work on. The last {n} versions are kept.|כל פרסום נשמר כגרסה ממוספרת ואינו משתנה אחר כך. הגרסה האחרונה היא שרצה, ועבודה שהתבקשה לפני פרסום חדש מסתיימת בגרסה שלה. אם פרסום חדש קלקל משהו: פרסמו שוב גרסה ישנה, או העבירו אותה לטיוטה כדי לעבוד עליה. נשמרות {n} הגרסאות האחרונות.",
            ).replace("{n}", String(fn.versionsKept ?? 50))}
          </p>
          <div className="mt-3">
            <VersionsPanel fn={fn} ctx={{ tables: list.data!.tables, fns: list.data!.functions, outside: list.data!.outside }} canWrite={canWrite} busy={back.isPending} onRestore={restore} />
          </div>
        </section>
        {dialog}
      </div>
    </BuilderProvider>
  );
}
