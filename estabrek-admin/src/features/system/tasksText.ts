// صف الشغل: the page's words and small sums, apart from the page so they can be tested.
// Written in the three languages side by side ("عربي|English|עברית").
import type { Task, TaskStatus, TasksPage } from "../../api/tasks.api";

type Lang = "ar" | "en" | "he";
const part = (words: string, lang: Lang) => {
  const [ar, en, he] = words.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[lang];
};
const fill = (words: string, lang: Lang, values: Record<string, string | number>) => part(words, lang).replace(/\{(\w+)\}/g, (_m, k: string) => String(values[k] ?? ""));

/** The states, in the order the page offers them: what needs the owner first. */
export const STATUSES: TaskStatus[] = ["failed", "waiting", "running", "done", "cancelled"];
export const STATUS_NAME: Record<TaskStatus, string> = {
  failed: "بدها نظر|Needs a look|דורש בדיקה",
  waiting: "بتستنى|Waiting|ממתין",
  running: "عم تنعمل|Being done|מתבצע",
  done: "خلصت|Done|הושלם",
  cancelled: "انشالت|Dismissed|בוטל",
};

/** The kinds of work, by a name the owner knows. One the page doesn't know is shown as the server calls it. */
const KIND_NAME: Record<string, string> = {
  automation: "حدث لتلقائية|An automation's event|אירוע לאוטומציה",
  function: "تشغيل function|A function's run|הרצת פונקציה",
};
export const taskKindName = (kind: string, lang: Lang) => (KIND_NAME[kind] ? part(KIND_NAME[kind], lang) : kind);

/** Arabic counts: one, two, a few (3 to 10), many. */
const arabic = (n: number, [one, two, few]: [string, string, string]) => (n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${one}`);

/** How long, in a few words: "45 ثانية", "8 دقايق", "3 ساعات", "يومين". */
export function spanText(ms: number, lang: Lang): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.round(s / 60);
  const h = Math.round(m / 60);
  const d = Math.round(h / 24);
  if (lang === "ar") {
    if (s < 60) return s <= 10 && s > 2 ? `${s} ثواني` : `${s} ثانية`;
    if (m < 60) return arabic(m, ["دقيقة", "دقيقتين", "دقايق"]);
    if (h < 48) return arabic(h, ["ساعة", "ساعتين", "ساعات"]);
    return arabic(d, ["يوم", "يومين", "أيام"]);
  }
  if (s < 60) return fill("|{n} s|{n} שנ׳", lang, { n: s });
  if (m < 60) return fill("|{n} min|{n} דק׳", lang, { n: m });
  if (h < 48) return fill("|{n} h|{n} שע׳", lang, { n: h });
  return fill("|{n} days|{n} ימים", lang, { n: d });
}

/** The numbers, in a line. */
export function countsLine(p: Pick<TasksPage, "counts" | "doneToday">, lang: Lang): string {
  const c = p.counts;
  return [
    fill("{n} بتستنى|{n} waiting|{n} ממתינות", lang, { n: c.waiting.toLocaleString("en") }),
    ...(c.running ? [fill("{n} عم تنعمل|{n} being done|{n} מתבצעות", lang, { n: c.running.toLocaleString("en") })] : []),
    c.failed ? fill("{n} بدها نظر|{n} need a look|{n} דורשות בדיקה", lang, { n: c.failed.toLocaleString("en") }) : part("ولا وحدة بدها نظر|none needs a look|אף אחת לא דורשת בדיקה", lang),
    fill("{n} خلصت بآخر 24 ساعة|{n} done in the last 24 hours|{n} הושלמו ב-24 השעות האחרונות", lang, { n: p.doneToday.toLocaleString("en") }),
  ].join(" · ");
}

/** How long finished tasks stay on the page. */
export function keepLine(p: Pick<TasksPage, "keepDays">, lang: Lang): string {
  return fill("اللي خلصت بتضل {done} أيام، واللي بدها نظر أو انشالت {failed} يوم.|Done ones are kept {done} days; the ones that need a look or were dismissed, {failed} days.|משימות שהושלמו נשמרות {done} ימים; אלה שדורשות בדיקה או בוטלו, {failed} ימים.", lang, p.keepDays);
}

/** Work whose time came a while ago and nobody took it: the worker isn't running. */
export const LATE_AFTER_MS = 2 * 60_000;
export function lateText(p: Pick<TasksPage, "waitingSince" | "now">, lang: Lang): string {
  if (!p.waitingSince) return "";
  const waited = p.now - Date.parse(p.waitingSince);
  if (!(waited > LATE_AFTER_MS)) return "";
  return fill(
    "في شغل بيستنى من {t} وما حدا أخده. مهمة «صف الشغل» ممكن تكون موقّفة.|Work has waited {t} and nobody took it. The job “The queue” may be paused.|יש עבודה שממתינה {t} ואף אחד לא לקח אותה. ייתכן שהמשימה «תור העבודה» מושהית.",
    lang,
    { t: spanText(waited, lang) },
  );
}

/** "المحاولة 2 من 5", or how many tries it took. */
export function triesText(t: Pick<Task, "status" | "attempts" | "maxAttempts">, lang: Lang): string {
  if (!t.attempts) return part("ما انجرّبت لسا|Not tried yet|עוד לא נוסתה", lang);
  if (t.status === "done") {
    if (t.attempts === 1) return part("من أول مرة|At the first try|בניסיון הראשון", lang);
    if (lang === "ar") return `بعد ${arabic(t.attempts, ["محاولة", "محاولتين", "محاولات"])}`;
    return fill("|After {n} tries|אחרי {n} ניסיונות", lang, { n: t.attempts });
  }
  if (t.status === "running") return fill("المحاولة {n} من {max}|Try {n} of {max}|ניסיון {n} מתוך {max}", lang, { n: t.attempts, max: t.maxAttempts });
  return fill("{n} من {max} محاولات|{n} of {max} tries|{n} מתוך {max} ניסיונות", lang, { n: t.attempts, max: t.maxAttempts });
}

/** What happens to it next, or how it ended. */
export function nextText(t: Pick<Task, "status" | "attempts" | "runAt" | "lockedAt" | "finishedAt">, now: number, lang: Lang): string {
  if (t.status === "waiting") {
    const wait = Date.parse(t.runAt) - now;
    if (wait > 1000) return fill(t.attempts ? "المحاولة الجاية بعد {t}|Next try in {t}|הניסיון הבא בעוד {t}" : "بتبلّش بعد {t}|Starts in {t}|מתחילה בעוד {t}", lang, { t: spanText(wait, lang) });
    return part("دورها هلّق|Its turn is now|תורה עכשיו", lang);
  }
  if (t.status === "running") return t.lockedAt ? fill("من {t}|For {t}|כבר {t}", lang, { t: spanText(now - Date.parse(t.lockedAt), lang) }) : "";
  return "";
}

/** A moment as the page says it: the time today, the day and time before. */
export function whenText(iso: string | null, now: number, lang: Lang): string {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) return "";
  const locale = lang === "ar" ? "ar" : lang === "he" ? "he-IL" : "en-GB";
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return new Date(now).toDateString() === d.toDateString() ? time : `${d.toLocaleDateString(locale, { month: "short", day: "numeric" })} ${time}`;
}

/** An automation's event: how many of its rules ran. */
export function rulesRanText(n: number, lang: Lang): string {
  if (!n) return part("ولا قاعدة انطبقت|No rule applied|אף כלל לא חל", lang);
  if (n === 1) return part("قاعدة وحدة اشتغلت|1 rule ran|כלל אחד רץ", lang);
  if (lang === "ar") return n === 2 ? "قاعدتين اشتغلوا" : n <= 10 ? `${n} قواعد اشتغلت` : `${n} قاعدة اشتغلت`;
  return fill("|{n} rules ran|{n} כללים רצו", lang, { n });
}

/** What it did, in a few words, when it said. */
export function didText(t: Pick<Task, "kind" | "status" | "result">, lang: Lang): string {
  if (t.status !== "done") return "";
  const r = t.result;
  if (t.kind === "automation" && r && typeof r.rules === "number") return rulesRanText(r.rules, lang);
  return "";
}
