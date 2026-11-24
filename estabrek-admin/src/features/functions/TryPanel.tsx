// الـ Functions: try one. What it is handed is typed here; "try" runs the draft dry (nothing is
// written or sent, every step says what it would do); "run" runs what is published, for real.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import type { FnInput, Outcome } from "../../api/functions.api";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import { stepOfLine, toVal } from "./fnDraft";
import { ACT_NAME, INPUT_TYPE, failText, lineText, outcomeLine, shapeText, whereText } from "./fnText";

const field = "h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";

/** What was typed for the inputs, as the function is handed it: a list or a thing is read as JSON. */
export function inputsOut(inputs: FnInput[], typed: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const i of inputs) {
    const text = typed[i.name] ?? "";
    if (text.trim() === "") continue;
    out[i.name] = i.type === "list" || i.type === "any" ? toVal(text) : text;
  }
  return out;
}

/** Which turn of a loop a line is from: "do.0.do[3].1" → 4. */
const turnOf = (at: string) => {
  const m = /\[(\d+)\](?!.*\[)/.exec(at);
  return m ? Number(m[1]) + 1 : null;
};

export function TryPanel({ inputs, canRun, canRunLive, busy, outcome, onRun, onKeep }: { inputs: FnInput[]; canRun: boolean; /** Published: it can run for real. */ canRunLive: boolean; busy: boolean; outcome: Outcome | null; onRun: (input: Record<string, unknown>, real: boolean) => void; /** What was just tried is kept as a test: these inputs, and whether it went through. */ onKeep?: (input: Record<string, unknown>, ok: boolean) => void }) {
  const lang = adminLang();
  const [typed, setTyped] = useState<Record<string, string>>({});
  return (
    <div className="space-y-3" data-testid="fn-try">
      {inputs.length ? (
        <div className="space-y-2">
          {inputs.map((i) => (
            <label key={i.name} className="flex flex-wrap items-center gap-2 text-sm">
              <bdi dir="ltr" className="w-32 shrink-0 truncate text-white/80">
                {i.name}
                {i.required ? " *" : ""}
              </bdi>
              <input className={field} dir="auto" value={typed[i.name] ?? ""} placeholder={say(INPUT_TYPE[i.type])} onChange={(e) => setTyped({ ...typed, [i.name]: e.target.value })} data-testid={`fn-try-input-${i.name}`} />
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/60">{say("هالـ function ما بتاخد مدخلات.|This function takes no inputs.|הפונקציה הזאת לא מקבלת קלטים.")}</p>
      )}
      {canRun ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => onRun(inputsOut(inputs, typed), false)} isLoading={busy} data-testid="fn-try-dry">
            {say("جرّب (ما بيغيّر شي)|Try it (changes nothing)|ניסיון (לא משנה דבר)")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onRun(inputsOut(inputs, typed), true)} disabled={busy || !canRunLive} data-testid="fn-try-real">
            {say("شغّل المنشورة فعلاً|Run the published one for real|הרצת המפורסמת באמת")}
          </Button>
          {!canRunLive ? <span className="text-xs text-white/60">{say("التشغيل الفعلي بيصير بعد النشر.|It runs for real once it is published.|הרצה אמיתית אפשרית אחרי פרסום.")}</span> : null}
        </div>
      ) : null}

      {outcome ? (
        <div className="space-y-3 rounded-xl border border-white/10 p-3" data-testid="fn-outcome" data-ok={outcome.ok} data-dry={outcome.dry}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className={`text-sm font-medium ${outcome.ok ? "text-emerald-300" : "text-red-300"}`} data-testid="fn-outcome-line">
              {outcomeLine(outcome, lang)}
            </div>
            {/* A try that showed what it should: kept as a test, so it is checked before every publish. */}
            {canRun && onKeep && outcome.dry ? (
              <button type="button" className="rounded-lg bg-white/[0.07] px-3 py-1.5 text-xs hover:bg-white/12" onClick={() => onKeep(inputsOut(inputs, typed), outcome.ok)} data-testid="fn-try-keep">
                {say("＋ احفظها كاختبار|＋ Keep it as a test|＋ לשמור כבדיקה")}
              </button>
            ) : null}
          </div>
          {/* A real run is kept in the run log, with what each step did: its number is what to quote. */}
          {outcome.runId ? (
            <div className="text-xs text-white/70" data-testid="fn-outcome-run">
              {outcome.version ? `${say("النسخة {n}|Version {n}|גרסה {n}").replace("{n}", String(outcome.version))} · ` : ""}
              {say("محفوظ بـ|Kept in the|נשמר ב")}{" "}
              <Link to="/admin/system/runs" className="underline">
                {say("سجل التشغيل|run log|יומן ההרצות")}
              </Link>{" "}
              {say("برقم|as|בתור")} <bdi dir="ltr" className="font-mono">{outcome.runId}</bdi>
            </div>
          ) : null}
          {outcome.error ? (
            <div className="text-sm text-red-300" data-testid="fn-outcome-error">
              {outcome.failedAt ? <span className="text-white/60">{whereText(outcome.failedAt, lang)}: </span> : null}
              <bdi>{failText(outcome.error, lang)}</bdi>
            </div>
          ) : null}
          {/* It went through, with an answer the function doesn't promise ("what it gives back"). */}
          {outcome.shape ? (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200" data-testid="fn-outcome-shape">
              {say("الجواب مش متل ما بتوعد:|The answer isn't what it promises:|התשובה אינה מה שהיא מבטיחה:")} <bdi>{shapeText(outcome.shape, lang)}</bdi>
            </div>
          ) : null}
          {outcome.ok && outcome.value !== null && outcome.value !== undefined ? (
            <div>
              <div className="mb-1 text-xs text-white/60">{say("الجواب|The answer|התשובה")}</div>
              <pre dir="ltr" className="max-h-60 overflow-auto rounded-lg bg-black/30 p-2 text-start text-xs" data-testid="fn-outcome-value">
                {JSON.stringify(outcome.value, null, 2)}
              </pre>
            </div>
          ) : outcome.valueCut ? (
            <p className="text-xs text-white/60">{say("الجواب أطول من ما بتعرضه الصفحة.|The answer is longer than the page shows.|התשובה ארוכה ממה שהדף מציג.")}</p>
          ) : null}
          <ol className="divide-y divide-white/10 text-sm" data-testid="fn-trace">
            {outcome.trace.map((l, k) => {
              const turn = turnOf(l.at);
              return (
                <li key={k} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5" data-ok={l.ok}>
                  <div className="min-w-0">
                    <span className="text-xs text-white/60">
                      {whereText(stepOfLine(l.at), lang)}
                      {turn ? ` (${say("الدورة {n}|turn {n}|סיבוב {n}").replace("{n}", String(turn))})` : ""}
                    </span>{" "}
                    <span className="font-medium">{say(ACT_NAME[l.act] ?? l.act)}</span>{" "}
                    <bdi className={l.ok ? "text-white/80" : "text-red-300"}>{lineText(l, lang)}</bdi>
                  </div>
                  <span className="shrink-0 text-xs text-white/60">{l.ms} ms</span>
                  {/* What a code step wrote with log(). */}
                  {l.log?.length ? (
                    <pre dir="ltr" className="mt-1 max-h-40 w-full basis-full overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-start text-xs text-white/80" data-testid={`fn-trace-log-${k}`}>
                      {l.log.join("\n")}
                    </pre>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {outcome.counts.steps > outcome.trace.length ? <p className="text-xs text-white/60">{say("الخطوات أكتر من ما بتعرضه الصفحة: هاد أولها.|More steps ran than the page shows: these are the first.|רצו יותר שלבים ממה שהדף מציג: אלה הראשונים.")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
