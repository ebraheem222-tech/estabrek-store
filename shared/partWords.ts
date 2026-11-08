/** Optional word fields whose existing documents render a built-in localized label. */
export const COUNTDOWN_WORD_FIELDS = ["dayLabel", "hourLabel", "minuteLabel", "secondLabel"] as const;
type Words = Readonly<Record<"ar" | "en" | "he", string>>;
const DEFAULTS: Record<string, Record<string, Words>> = {
  countdown: {
    dayLabel: { ar: "يوم", en: "Days", he: "ימים" },
    hourLabel: { ar: "ساعة", en: "Hours", he: "שעות" },
    minuteLabel: { ar: "دقيقة", en: "Minutes", he: "דקות" },
    secondLabel: { ar: "ثانية", en: "Seconds", he: "שניות" },
  },
  beforeAfter: {
    beforeLabel: { ar: "قبل", en: "Before", he: "לפני" },
    afterLabel: { ar: "بعد", en: "After", he: "אחרי" },
  },
};
export function defaultPartWords(type: string | undefined, path: string): Words | undefined {
  return type && Object.hasOwn(DEFAULTS, type) && Object.hasOwn(DEFAULTS[type], path) ? DEFAULTS[type][path] : undefined;
}
