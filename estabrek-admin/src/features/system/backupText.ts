// Plain-Arabic helpers for the backups page. Pure (tested).
import type { BackupRun } from "../../api/system.api";

export function humanBytes(n: number | null | undefined) {
  if (n == null) return "";
  if (n < 1024) return `${n} بايت`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} كيلوبايت`;
  return `${(n / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

export type Health = { level: "ok" | "warn" | "bad"; text: string };

/** How safe the store is right now, from the last good backup. */
export function backupHealth(last: Pick<BackupRun, "startedAt"> | null, opts: { enabled: boolean; storageReady: boolean }, now = Date.now()): Health {
  if (!opts.storageReady) return { level: "bad", text: "ما في مكان لحفظ النسخ. لازم Cloudinary يكون مضبوط بالسيرفر." };
  if (!last) return { level: opts.enabled ? "warn" : "bad", text: opts.enabled ? "لسا ما انحفظت أي نسخة. أول وحدة بتنعمل خلال دقايق، أو اكبس «خذ نسخة هلّق»." : "ما في ولا نسخة، والنسخ اليومي مطفي." };
  const hours = (now - new Date(last.startedAt).getTime()) / 3_600_000;
  if (hours <= 30) return { level: "ok", text: "الداتا محمية. آخر نسخة عمرها أقل من يوم." };
  if (!opts.enabled) return { level: "bad", text: "النسخ اليومي مطفي، وآخر نسخة قديمة." };
  return { level: hours <= 72 ? "warn" : "bad", text: "آخر نسخة أقدم من يوم. شوف إذا في خطأ بالقائمة تحت." };
}

export const TRIGGER_TEXT: Record<string, string> = { auto: "تلقائية", manual: "باليد" };

export const STATUS_TEXT: Record<BackupRun["status"], { label: string; variant: "success" | "warning" | "danger" | undefined }> = {
  SUCCEEDED: { label: "تمّت", variant: "success" },
  RUNNING: { label: "عم تنعمل…", variant: "warning" },
  FAILED: { label: "فشلت", variant: "danger" },
};

const ERRORS: Record<string, string> = {
  STORAGE_NOT_READY: "ما في مكان حفظ (Cloudinary مش مضبوط)",
  TOO_BIG_FOR_STORAGE: "النسخة أكبر من المسموح بمكان الحفظ. نزّلها على جهازك بدلها",
  CLOUDINARY_NOT_CONFIGURED: "Cloudinary مش مضبوط",
};

export function errorText(code: string | null | undefined) {
  if (!code) return "";
  return ERRORS[code] ?? code;
}

/** "الساعة 3 بالليل" style text for the daily hour (Israel time). */
export function hourText(h: number) {
  if (h === 0) return "12 بالليل";
  if (h < 5) return `${h} بالليل`;
  if (h < 12) return `${h} الصبح`;
  if (h === 12) return "12 الظهر";
  if (h < 18) return `${h - 12} بعد الظهر`;
  return `${h - 12} المسا`;
}
