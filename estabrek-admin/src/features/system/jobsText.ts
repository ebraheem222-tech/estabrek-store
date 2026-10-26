// Plain-Arabic texts and small helpers for the background jobs page (المهام بالخلفية). Pure (tested).
import type { Job, JobGroup, JobRun, JobStatus, JobTrigger } from "../../api/jobs.api";
import { durationText, formatBytes } from "./cacheText";
import { msText } from "./speedText";

export const JOB_GROUPS: Array<{ group: JobGroup; label: string }> = [
  { group: "messages", label: "الرسايل" },
  { group: "data", label: "البيانات والنسخ" },
  { group: "cache", label: "الكاش والشعبية" },
  { group: "media", label: "الوسائط" },
  { group: "selling", label: "البيع" },
  { group: "control", label: "التحكم" },
];

export const STATUS_TEXT: Record<JobStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  running: { label: "شغّال هلّق", variant: "info" },
  waiting: { label: "ماشي", variant: "success" },
  paused: { label: "موقّف", variant: "warning" },
  off: { label: "مطفي من السيرفر", variant: "default" },
  onDemand: { label: "وقت الحاجة", variant: "default" },
};

export const TRIGGER_TEXT: Record<JobTrigger, string> = {
  start: "بعد تشغيل السيرفر",
  schedule: "على الوقت",
  event: "بعد تغيير",
  admin: "من الإدارة",
};

/** Why the server's settings keep a job off, and how to turn it on. */
export const OFF_TEXT: Record<string, string> = {
  OUTBOX_WORKER: "مطفي من السيرفر. ليشتغل لحاله ضيف OUTBOX_WORKER=true على Railway. «شغّل هلّق» بيبعت اللي بالدور.",
  STOCK_ALERT_INTERVAL_MS: "مطفي من السيرفر (STOCK_ALERT_INTERVAL_MS=0 على Railway).",
  BACKUP_CHECK_MS: "مطفي من السيرفر (BACKUP_CHECK_MS=0 على Railway).",
  NODE_ENV: "مطفي بوضع التجربة.",
};

/** What pausing costs, for the confirm box (jobs not listed pause without asking). */
export const PAUSE_WARNING: Record<string, string> = {
  outbox: "الرسايل (طلبات، كلمات مرور، تتبّع) ما رح تنبعت لحتى تكمّل.",
  stockAlerts: "الزباين اللي طالبين «رجع للمخزون» ما رح يوصلهم إيميل لحتى تكمّل.",
  backup: "ما رح تنعمل نسخة احتياطية يومية لحتى تكمّل.",
  popularitySave: "الشعبية بتضل بذاكرة السيرفر وبتضيع إذا عمل إعادة تشغيل.",
  rumSave: "تقارير سرعة الزباين بتضل بالذاكرة وبتضيع إذا السيرفر عمل إعادة تشغيل.",
  cacheSweep: "الأجوبة المنتهية بتضل بالذاكرة لحتى تمتلي.",
};

const COUNT_TEXT: Record<string, string> = {
  checked: "انفحص",
  sent: "انبعت",
  failed: "فشل",
  made: "نسخة",
  rows: "سطر",
  requests: "طلب",
  photos: "صورة",
  products: "منتج",
  built: "انبنى",
  skipped: "ما احتاج",
  errors: "خطأ",
  removed: "انشال",
  started: "موسم بلّش",
  ended: "موسم خلص",
  missed: "موسم فات",
  applied: "تغيير صار",
  undone: "تغيير رجع",
  stock: "تنبيه مخزون",
  viral: "تنبيه انتشار",
  unpinned: "انشال تثبيت",
};

export function everyText(ms: number | null): string {
  if (ms == null) return "وقت الحاجة";
  return `كل ${durationText(ms / 1000)}`;
}

/** "قبل 12 ثانية", "قبل 3 دقايق"… */
export function agoText(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "لسا ما اشتغل";
  const s = Math.round((now - Date.parse(iso)) / 1000);
  if (!Number.isFinite(s)) return "";
  if (s < 5) return "هلّق";
  return `قبل ${durationText(s)}`;
}

/** "بعد 12 ثانية"… ("هلّق" when it's due). */
export function inText(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const s = Math.round((Date.parse(iso) - now) / 1000);
  if (!Number.isFinite(s)) return "";
  if (s < 2) return "هلّق";
  return `بعد ${durationText(s)}`;
}

/** What a run did: "3 انبعت · 1 فشل", "ما كان في شي", or its error. */
export function runSummary(name: string, run: Pick<JobRun, "ok" | "counts" | "error">): string {
  if (!run.ok) return run.error || "فشل";
  const c = run.counts;
  if (!c) return "تمام";
  if (name === "backup" && !c.made) return "مش وقت النسخة";
  const parts = Object.entries(c)
    .filter(([k, v]) => v > 0 && k !== "checked")
    .map(([k, v]) => (k === "bytes" ? formatBytes(v) : `${v.toLocaleString("en")} ${COUNT_TEXT[k] ?? k}`));
  if (!parts.length) return c.checked ? `${c.checked.toLocaleString("en")} ${COUNT_TEXT.checked}، ما في شي يتبعت` : "ما كان في شي";
  return parts.join(" · ");
}

export const runTimeText = (ms: number) => msText(ms);

export type JobHealth = { label: string; variant: "danger" | "warning"; note: string };

/** A problem worth the owner's eye, or null. */
export function jobHealth(job: Pick<Job, "stuck" | "late" | "failuresInRow" | "runningSince" | "everyMs">, now = Date.now()): JobHealth | null {
  if (job.stuck) return { label: "عالق", variant: "danger", note: `شغّال من ${agoText(job.runningSince, now).replace("قبل ", "")} وما خلص. إعادة تشغيل السيرفر بتوقفه.` };
  if (job.late) return { label: "متأخر", variant: "danger", note: `كان لازم يشتغل ${everyText(job.everyMs)} وما اشتغل من مدة. ممكن الوقت تبعه وقف: إعادة تشغيل السيرفر بترجّعه.` };
  if (job.failuresInRow >= 3) return { label: "عم يفشل", variant: "danger", note: `فشل ${job.failuresInRow} مرات ورا بعض.` };
  if (job.failuresInRow > 0) return { label: "آخر مرة فشل", variant: "warning", note: "المرة الجاية ممكن تزبط. شوف الخطأ تحت." };
  return null;
}

const TIMER_CHOICES = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10_800, 21_600, 43_200, 86_400, 172_800].map((s) => s * 1000);

/** The timers the admin may pick for a job (within its limits, with the current and default ones). */
export function timerChoices(job: Pick<Job, "everyMs" | "defaultEveryMs" | "limits">): number[] {
  if (job.everyMs == null || !job.limits) return [];
  const { min, max } = job.limits;
  const set = new Set(TIMER_CHOICES.filter((ms) => ms >= min && ms <= max));
  set.add(job.everyMs);
  if (job.defaultEveryMs != null) set.add(job.defaultEveryMs);
  return [...set].sort((a, b) => a - b);
}

export function jobsSummary(jobs: Array<Pick<Job, "status" | "stuck" | "late" | "failuresInRow" | "runningSince" | "everyMs">>, now = Date.now()) {
  return {
    running: jobs.filter((j) => j.status === "running").length,
    paused: jobs.filter((j) => j.status === "paused").length,
    off: jobs.filter((j) => j.status === "off").length,
    problems: jobs.filter((j) => jobHealth(j, now)?.variant === "danger").length,
  };
}
