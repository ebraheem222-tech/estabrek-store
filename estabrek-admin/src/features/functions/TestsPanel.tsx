// الـ Functions: a function's own tests (F4). A test is what the function is handed and what must
// come of it: that it goes through (and, if said, gives back this), or that it stops (and, if
// said, with these words in its reason). They run the draft as try-outs and before every publish:
// one that doesn't pass stops the publish. Kept with the function, saved with its draft.
import { Button } from "../../components/ui/Button";
import type { FnInput, FnTest, TestResult, TestsOutcome } from "../../api/functions.api";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import { fromVal, toVal } from "./fnDraft";
import { INPUT_TYPE, failText, shapeText, testWhyText, whereText } from "./fnText";

const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const label = "text-xs text-white/70";

/** A new test's id: small letters and digits, its own among the function's. */
export function newTestId(taken: string[]): string {
  for (;;) {
    const id = `t${Math.random().toString(36).slice(2, 9)}`.replace(/[^a-z0-9]/g, "0");
    if (id.length >= 4 && !taken.includes(id)) return id;
  }
}
/** A fresh test, named after its place in the list. */
export const newTest = (tests: FnTest[], name: string, more: Partial<FnTest> = {}): FnTest => ({ id: newTestId(tests.map((t) => t.id)), name, input: {}, expect: { ok: true }, ...more });

/** What is typed for one input, as the test keeps it: a list or a thing is read as JSON; nothing typed isn't handed. */
export function setTestInput(test: FnTest, input: FnInput, text: string): FnTest {
  const rest = Object.fromEntries(Object.entries(test.input).filter(([k]) => k !== input.name));
  if (text.trim() === "") return { ...test, input: rest };
  return { ...test, input: { ...rest, [input.name]: input.type === "list" || input.type === "any" ? toVal(text) : text } };
}

function ResultLine({ result }: { result: TestResult }) {
  const lang = adminLang();
  return (
    <div className={`text-sm ${result.pass ? "text-emerald-300" : "text-red-300"}`} data-testid={`fn-test-${result.id}-result`} data-pass={result.pass}>
      <span className="font-medium">{result.pass ? say("✓ نجح|✓ Passed|✓ עבר") : say("✗ ما نجح|✗ Didn't pass|✗ לא עבר")}</span>
      {result.why ? <span> · {testWhyText(result.why, lang)}</span> : null}
      {result.why === "shape" && result.said ? (
        <span data-testid={`fn-test-${result.id}-shape`}>
          {" "}
          <bdi>{shapeText(result.said, lang)}</bdi>
        </span>
      ) : null}
      {/* What the run came to, beside what was expected of it. */}
      {!result.pass && result.error ? (
        <span>
          {" "}
          · {result.failedAt ? `${whereText(result.failedAt, lang)}: ` : ""}
          <bdi>{failText(result.error, lang)}</bdi>
        </span>
      ) : null}
      {!result.pass && result.why === "value" ? (
        <pre dir="ltr" className="mt-1 max-h-32 overflow-auto rounded-lg bg-black/30 p-2 text-start text-xs text-white/80" data-testid={`fn-test-${result.id}-got`}>
          {result.valueCut ? "…" : JSON.stringify(result.value ?? null, null, 2)}
        </pre>
      ) : null}
      <span className="text-xs text-white/70"> · {result.ms} ms</span>
    </div>
  );
}

export function TestsPanel({
  inputs,
  tests,
  onChange,
  canWrite,
  ran,
  busy,
  onRun,
  max,
  usesCaller,
}: {
  inputs: FnInput[];
  tests: FnTest[];
  onChange: (tests: FnTest[]) => void;
  canWrite: boolean;
  /** How the tests went the last time they ran (null: not run since the last change). */
  ran: TestsOutcome | null;
  busy: boolean;
  onRun: () => void;
  max: number;
  /** The steps name who is calling: a test can say who it is run as. */
  usesCaller: boolean;
}) {
  const set = (k: number, next: FnTest) => onChange(tests.map((t, i) => (i === k ? next : t)));
  const resultOf = (id: string) => ran?.results.find((r) => r.id === id);
  return (
    <div className="space-y-3" data-testid="fn-tests">
      {tests.length ? (
        <ol className="space-y-2">
          {tests.map((t, k) => {
            const result = resultOf(t.id);
            return (
              <li key={t.id} className={`space-y-2 rounded-xl border p-3 ${result ? (result.pass ? "border-emerald-400/40" : "border-red-400/60") : "border-white/10"} bg-white/3`} data-testid={`fn-test-${k}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <input className={`${field} flex-1`} value={t.name} maxLength={80} disabled={!canWrite} onChange={(e) => set(k, { ...t, name: e.target.value })} aria-label={say("اسم الاختبار|The test's name|שם הבדיקה")} data-testid={`fn-test-${k}-name`} />
                  {canWrite ? (
                    <button type="button" className="rounded-sm px-2 text-white/70 hover:bg-white/10 hover:text-white" onClick={() => onChange(tests.filter((_, i) => i !== k))} aria-label={say("احذف الاختبار|Delete the test|מחיקת הבדיקה")} data-testid={`fn-test-${k}-remove`}>
                      ✕
                    </button>
                  ) : null}
                </div>
                {/* What it hands the function. */}
                {inputs.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {inputs.map((i) => (
                      <label key={i.name} className="flex items-center gap-2 text-sm">
                        <bdi dir="ltr" className="w-28 shrink-0 truncate text-white/80">
                          {i.name}
                          {i.required ? " *" : ""}
                        </bdi>
                        <input className={`${field} flex-1`} dir="auto" value={fromVal(t.input[i.name] as never)} placeholder={say(INPUT_TYPE[i.type])} disabled={!canWrite} onChange={(e) => set(k, setTestInput(t, i, e.target.value))} data-testid={`fn-test-${k}-input-${i.name}`} />
                      </label>
                    ))}
                  </div>
                ) : null}
                {usesCaller ? (
                  <label className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={label}>{say("كأنه المنادي إيميله|As if the caller's email were|כאילו האימייל של הקורא הוא")}</span>
                    <input
                      className={`${field} flex-1`}
                      dir="ltr"
                      value={t.caller?.email ?? ""}
                      placeholder={say("إيميلك إنت|your own email|האימייל שלך")}
                      disabled={!canWrite}
                      onChange={(e) => {
                        const email = e.target.value.trim();
                        const { caller: _was, ...rest } = t;
                        set(k, email ? { ...rest, caller: { email } } : rest);
                      }}
                      data-testid={`fn-test-${k}-caller`}
                    />
                  </label>
                ) : null}
                {/* What must come of it. */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={label}>{say("اللازم يصير|What must happen|מה צריך לקרות")}</span>
                  <select className={field} value={t.expect.ok ? "ok" : "stop"} disabled={!canWrite} onChange={(e) => set(k, { ...t, expect: { ok: e.target.value === "ok" } })} data-testid={`fn-test-${k}-ok`}>
                    <option value="ok">{say("تمشي للآخر|It goes through|היא עוברת עד הסוף")}</option>
                    <option value="stop">{say("توقف|It stops|היא נעצרת")}</option>
                  </select>
                  {t.expect.ok ? (
                    <input
                      className={`${field} min-w-48 flex-1`}
                      dir="ltr"
                      value={t.expect.value === undefined ? "" : fromVal(t.expect.value as never)}
                      placeholder={say('وجوابها بالضبط (اختياري): 5 أو {"ok": true}|and gives back exactly (optional): 5 or {"ok": true}|ומחזירה בדיוק (לא חובה): 5 או {"ok": true}')}
                      disabled={!canWrite}
                      onChange={(e) => set(k, { ...t, expect: e.target.value.trim() === "" ? { ok: true } : { ok: true, value: toVal(e.target.value) } })}
                      data-testid={`fn-test-${k}-value`}
                    />
                  ) : (
                    <input
                      className={`${field} min-w-48 flex-1`}
                      dir="auto"
                      value={t.expect.error ?? ""}
                      maxLength={200}
                      placeholder={say("وسببها فيه هالكلام (اختياري)|and its reason holds these words (optional)|והסיבה שלה מכילה את המילים האלה (לא חובה)")}
                      disabled={!canWrite}
                      onChange={(e) => set(k, { ...t, expect: e.target.value.trim() === "" ? { ok: false } : { ok: false, error: e.target.value } })}
                      data-testid={`fn-test-${k}-error`}
                    />
                  )}
                </div>
                {result ? <ResultLine result={result} /> : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-white/70" data-testid="fn-tests-empty">
          {say("ما في اختبارات لسا. بدونها النشر بيمشي متل ما هو.|No tests yet. Without them publishing goes on as it is.|עדיין אין בדיקות. בלעדיהן הפרסום ממשיך כרגיל.")}
        </p>
      )}
      {canWrite ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="rounded-lg bg-white/[0.07] px-3 py-1.5 text-sm hover:bg-white/12 disabled:opacity-40" disabled={tests.length >= max} onClick={() => onChange([...tests, newTest(tests, say("اختبار {n}|Test {n}|בדיקה {n}").replace("{n}", String(tests.length + 1)))])} data-testid="fn-test-add">
            {say("＋ اختبار|＋ A test|＋ בדיקה")}
          </button>
          {tests.length ? (
            <Button size="sm" variant="secondary" onClick={onRun} isLoading={busy} data-testid="fn-tests-run">
              {say("شغّل الاختبارات|Run the tests|הרצת הבדיקות")}
            </Button>
          ) : null}
          {ran && tests.length ? (
            <span className={`text-sm ${ran.failed ? "text-red-300" : "text-emerald-300"}`} data-testid="fn-tests-summary">
              {ran.failed
                ? say("{f} من {n} ما نجحوا: النشر واقف لحد ما ينجحوا|{f} of {n} didn't pass: publishing waits until they do|{f} מתוך {n} לא עברו: הפרסום ממתין עד שיעברו").replace("{f}", String(ran.failed)).replace("{n}", String(ran.results.length))
                : say("كلهم نجحوا ({n})|All passed ({n})|כולן עברו ({n})").replace("{n}", String(ran.results.length))}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
