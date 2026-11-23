"use client";
// A game server site's next wipe (sites wave G6b; backend lib/wipes.ts fills it from the site's schedule as the page
// is served): the day and hour in the server's own time zone, a countdown once the page runs here, the schedule in
// words, when the last one was, and the owner's note. Drawn on the server with the date alone (the same everywhere);
// the countdown starts in the browser.
import { useEffect, useState } from "react";
import type { TreeLang } from "./tree";
import css from "./WipeCountdownView.module.css";

type Wipe = { next: string | null; last: string | null; every: "weekly" | "biweekly" | "monthly" | "date"; day: string; time: string; zone: string; note: unknown };

const DAYS = {
  ar: { sun: "الأحد", mon: "الاتنين", tue: "التلاتا", wed: "الأربعا", thu: "الخميس", fri: "الجمعة", sat: "السبت" },
  en: { sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" },
  he: { sun: "ראשון", mon: "שני", tue: "שלישי", wed: "רביעי", thu: "חמישי", fri: "שישי", sat: "שבת" },
} as const;
const WORDS = {
  ar: { title: "المسح الجاي", units: ["يوم", "ساعة", "دقيقة", "ثانية"], done: "المسح صار! العالم الجديد ناطركم.", none: "موعد المسح الجاي بيطلع هون قريباً.", last: "آخر مسح", ago: (n: number) => (n === 0 ? "اليوم" : n === 1 ? "مبارح" : `قبل ${n} يوم`), weekly: "كل {day}، الساعة {time}", biweekly: "كل أسبوعين يوم {day}، الساعة {time}", monthly: "أول {day} بكل شهر، الساعة {time}", date: "مرّة وحدة، الساعة {time}" },
  en: { title: "The next wipe", units: ["days", "hours", "min", "sec"], done: "The wipe is here! The new world is waiting.", none: "The next wipe's date shows here soon.", last: "Last wipe", ago: (n: number) => (n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`), weekly: "Every {day} at {time}", biweekly: "Every other {day} at {time}", monthly: "The first {day} of each month at {time}", date: "Once, at {time}" },
  he: { title: "המחיקה הבאה", units: ["ימים", "שעות", "דקות", "שניות"], done: "המחיקה כאן! העולם החדש מחכה.", none: "מועד המחיקה הבאה יופיע כאן בקרוב.", last: "מחיקה אחרונה", ago: (n: number) => (n === 0 ? "היום" : n === 1 ? "אתמול" : `לפני ${n} ימים`), weekly: "כל יום {day} ב־{time}", biweekly: "כל שבועיים ביום {day} ב־{time}", monthly: "יום {day} הראשון בכל חודש ב־{time}", date: "פעם אחת, ב־{time}" },
} as const;
const LOCALE = { ar: "ar-u-nu-latn", en: "en-GB", he: "he-IL" } as const;

const isWipe = (v: unknown): v is Wipe => !!v && typeof v === "object" && typeof (v as Wipe).zone === "string" && typeof (v as Wipe).time === "string";
const wordsIn = (v: unknown, lang: TreeLang): string => (typeof v === "string" ? v : v && typeof v === "object" ? String((v as Record<string, unknown>)[lang] ?? (v as Record<string, unknown>).ar ?? "") : "");
/** A moment as the server's own clock reads it. */
function when(iso: string, zone: string, lang: TreeLang) {
  try {
    return new Intl.DateTimeFormat(LOCALE[lang] ?? LOCALE.ar, { timeZone: zone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

export function WipeCountdownView({ wipe, lang, title, done, none, size }: { wipe: unknown; lang: TreeLang; title: string; done: string; none: string; size: "big" | "small" }) {
  const w = WORDS[lang] ?? WORDS.ar;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!isWipe(wipe) || (!wipe.next && !wipe.last)) return <p className={css.none} data-wipe="none">{none || w.none}</p>;
  const day = (DAYS[lang] ?? DAYS.ar)[wipe.day as keyof (typeof DAYS)["ar"]] ?? wipe.day;
  // «كل خميس»، «أول خميس»: Arabic says the day without its article there.
  const dayWord = lang === "ar" && (wipe.every === "monthly" || wipe.every === "weekly") ? day.replace(/^ال/, "") : day;
  const rule = w[wipe.every].replace("{day}", dayWord).replace("{time}", wipe.time);
  const left = wipe.next && now !== null ? Math.max(0, Date.parse(wipe.next) - now) : null;
  const parts = left === null ? null : [Math.floor(left / 86_400_000), Math.floor((left % 86_400_000) / 3_600_000), Math.floor((left % 3_600_000) / 60_000), Math.floor((left % 60_000) / 1000)];
  const lastDays = wipe.last && now !== null ? Math.floor((now - Date.parse(wipe.last)) / 86_400_000) : null;
  const note = wordsIn(wipe.note, lang);
  return (
    <div className={css.wrap} data-wipe={wipe.next ? "next" : "past"} data-size={size}>
      <p className={css.title}>{title || w.title}</p>
      {wipe.next ? (
        <>
          {left === 0 ? (
            <p className={css.done} data-wipe-done data-gp="go">{done || w.done}</p>
          ) : (
            <div className={css.boxes} dir="ltr" aria-live="off" data-wipe-left={parts ? "" : undefined}>
              {(parts ?? [null, null, null, null]).map((n, i) => (
                <span key={i} className={css.box} data-gp="tile">
                  <b data-gp="num">{n === null ? "–" : String(n).padStart(i ? 2 : 1, "0")}</b>
                  <small>{w.units[i]}</small>
                </span>
              ))}
            </div>
          )}
          <p className={css.date} data-wipe-date suppressHydrationWarning>
            {when(wipe.next, wipe.zone, lang)} <span className={css.zone} dir="ltr">({wipe.zone})</span>
          </p>
        </>
      ) : null}
      <p className={css.rule} data-wipe-rule>{rule}</p>
      {wipe.last ? (
        <p className={css.last} data-wipe-last suppressHydrationWarning>
          {w.last}: {lastDays === null ? when(wipe.last, wipe.zone, lang) : w.ago(lastDays)}
        </p>
      ) : null}
      {note ? <p className={css.note}>{note}</p> : null}
    </div>
  );
}
