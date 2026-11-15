// سجل التشغيل: the page's words and small sums, apart from the page so they can be tested.
// New words are written in the three languages side by side ("عربي|English|עברית"); a job's and
// a rule's own names come from their pages' words (jobNames.ts, automationText.ts).
import type { Run, RunKind, RunsSummary } from "../../api/runs.api";
import type { JobRun } from "../../api/jobs.api";
import { TRIGGER_TEXT as RULE_TRIGGER } from "./automationText";
import { jobLabel } from "./jobNames";
import { TRIGGER_TEXT as JOB_TRIGGER, runSummary } from "./jobsText";

type Lang = "ar" | "en" | "he";
const part = (words: string, lang: Lang) => {
  const [ar, en, he] = words.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[lang];
};

export const KINDS: RunKind[] = ["job", "automation", "webhook", "task", "function"];
export const KIND_NAME: Record<RunKind, string> = {
  job: "مهمة بالخلفية|Background job|משימת רקע",
  automation: "تلقائية|Automation|אוטומציה",
  webhook: "Webhook|Webhook|Webhook",
  task: "شغل بالصف|Queued task|משימה בתור",
  function: "Function|Function|פונקציה",
};

/** What ran, by the name its own page calls it. */
export function runName(run: Pick<Run, "kind" | "name">): string {
  return run.kind === "job" ? jobLabel(run.name) : run.name;
}

/** What started it, in words. */
export function runTrigger(run: Pick<Run, "kind" | "trigger">, lang: Lang): string {
  const t = run.trigger;
  if (!t) return "";
  if (t === "test") return part("تجربة|A try|ניסיון", lang);
  if (run.kind === "job") return (JOB_TRIGGER as Record<string, string>)[t] ?? t;
  if (run.kind === "automation") return (RULE_TRIGGER as Record<string, { label: string }>)[t]?.label ?? t;
  return t;
}

/** What it did, or why it failed. */
export function runDid(run: Pick<Run, "kind" | "name" | "ok" | "result" | "error" | "times">, lang: Lang): string {
  if (!run.ok) return run.error || part("فشل|Failed|נכשל", lang);
  const r = run.result;
  if (run.kind === "job") {
    const counts = r && Object.values(r).every((v) => typeof v === "number") ? (r as JobRun["counts"]) : null;
    // A row that stands for an hour of timer runs: what they did together, or that there was nothing to do.
    if (run.times > 1 && !Object.values(counts ?? {}).some((v) => v > 0)) return part("اشتغلت وما كان في شي تعمله|Ran, with nothing to do|רצה, לא היה מה לעשות", lang);
    return runSummary(run.name, { ok: true, counts, error: null });
  }
  if (r && typeof r.did === "string") return r.did;
  if (r && typeof r.status === "number") return part("انقبل ({n})|Accepted ({n})|התקבל ({n})", lang).replace("{n}", String(r.status));
  return part("تمام|Done|בוצע", lang);
}

/** How long: one run's time, or for a folded row the usual time of one of its runs. */
export function runTook(run: Pick<Run, "ms" | "times">): number {
  return run.times > 1 ? Math.round(run.ms / run.times) : run.ms;
}

/** A row that stands for an hour of a job's timer runs: how many they were. */
export function runTimes(run: Pick<Run, "times">, lang: Lang): string {
  return run.times > 1 ? part("{n} مرة بالساعة|{n} times in the hour|{n} פעמים בשעה", lang).replace("{n}", run.times.toLocaleString("en")) : "";
}

/** The last day, in a line. */
export function summaryLine(s: Pick<RunsSummary, "runs" | "failures">, lang: Lang): string {
  const runs = part("{n} تشغيل بآخر 24 ساعة|{n} runs in the last 24 hours|{n} הרצות ב-24 השעות האחרונות", lang).replace("{n}", s.runs.toLocaleString("en"));
  if (!s.failures) return `${runs} · ${part("ولا واحد فشل|none failed|אף אחת לא נכשלה", lang)}`;
  return `${runs} · ${part("{n} فشل|{n} failed|{n} נכשלו", lang).replace("{n}", s.failures.toLocaleString("en"))}`;
}

/** How far back the log goes, and how long it keeps. */
export function keepLine(s: Pick<RunsSummary, "from" | "keepDays">, now: number, lang: Lang): string {
  const keeps = part("السجل بيحفظ {n} يوم|The log keeps {n} days|היומן שומר {n} ימים", lang).replace("{n}", String(s.keepDays));
  if (!s.from) return keeps;
  const days = Math.max(0, Math.floor((now - Date.parse(s.from)) / 86_400_000));
  const since = days < 1 ? part("بلّش اليوم|It started today|התחיל היום", lang) : part("فيه آخر {n} يوم|It holds the last {n} days|יש בו את {n} הימים האחרונים", lang).replace("{n}", String(Math.min(days, s.keepDays)));
  return `${keeps} · ${since}`;
}

/** A moment as the page says it: the time today, the day and time before. */
export function whenText(iso: string, now: number, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const locale = lang === "ar" ? "ar" : lang === "he" ? "he-IL" : "en-GB";
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return new Date(now).toDateString() === d.toDateString() ? time : `${d.toLocaleDateString(locale, { month: "short", day: "numeric" })} ${time}`;
}
