"use client";
// A game server site's ranking on one of its boards (sites wave G6a; backend lib/ranking.ts fills it as the page is
// served): its best players today, this week, this month or of all time, each window a tab. Play time reads as hours
// and minutes, a lap as minutes, seconds and thousandths, any other number with its thousands grouped. In the editor
// (no numbers yet) it shows how it will look.
import { useState } from "react";
import type { TreeLang } from "./tree";
import css from "./LeaderboardView.module.css";

type Win = "day" | "week" | "month" | "all";
type Rank = { n: number; name: string; value: number };
type Ranks = { key: string; unit: "minutes" | "number" | "lap"; best: "high" | "low"; windows: Partial<Record<Win, Rank[]>> };

const WORDS = {
  ar: { day: "اليوم", week: "هالأسبوع", month: "هالشهر", all: "من الأول", empty: "لسّا ما في أرقام هون.", h: "س", m: "د", player: "لاعب", rank: "المرتبة", name: "اللاعب", value: "الرقم" },
  en: { day: "Today", week: "This week", month: "This month", all: "All time", empty: "No numbers here yet.", h: "h", m: "m", player: "Player", rank: "Rank", name: "Player", value: "Score" },
  he: { day: "היום", week: "השבוע", month: "החודש", all: "מאז ומעולם", empty: "עוד אין כאן מספרים.", h: "ש'", m: "ד'", player: "שחקן", rank: "מקום", name: "שחקן", value: "תוצאה" },
} as const;
const ORDER: Win[] = ["day", "week", "month", "all"];
const isRanks = (v: unknown): v is Ranks => !!v && typeof v === "object" && !!(v as Ranks).windows && typeof (v as Ranks).windows === "object";

/** A number as its board's unit reads. */
export function scoreText(value: number, unit: Ranks["unit"], lang: TreeLang): string {
  const w = WORDS[lang] ?? WORDS.ar;
  if (unit === "minutes") {
    const total = Math.max(0, Math.round(value));
    const h = Math.floor(total / 60);
    const m = total % 60;
    const space = lang === "en" ? "" : " ";
    return h ? `${h.toLocaleString("en")}${space}${w.h} ${m}${space}${w.m}` : `${m}${space}${w.m}`;
  }
  if (unit === "lap") {
    const ms = Math.max(0, Math.round(value));
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const rest = `${String(s).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
    return h ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
  }
  return value.toLocaleString("en", { maximumFractionDigits: 2 });
}

export function LeaderboardView({ ranks, lang, empty, labels }: { ranks: unknown; lang: TreeLang; empty: string; labels: Partial<Record<Win, string>> }) {
  const w = WORDS[lang] ?? WORDS.ar;
  const shown = isRanks(ranks) ? ORDER.filter((k) => Array.isArray(ranks.windows[k])) : [];
  const [tab, setTab] = useState<Win | null>(null);
  if (!isRanks(ranks) || !shown.length) {
    // In the editor's frame (no numbers yet): how it will look; on the shop, the owner's words.
    const inStudio = typeof window !== "undefined" && window.parent !== window && /\/studio-frame/.test(window.location.pathname);
    if (!inStudio) return <p className={css.empty} data-ranks="none">{empty || w.empty}</p>;
    return (
      <ol className={css.list} data-ranks="sample">
        {[1, 2, 3, 4, 5].map((n) => (
          <li key={n} className={css.row} data-gp="tile" data-top={n <= 3 ? n : undefined}>
            <span className={css.n}>{n}</span>
            <span className={css.name}>{w.player} {n}</span>
            <span className={css.value} dir="ltr" data-gp="num">{scoreText((6 - n) * 437, "minutes", lang)}</span>
          </li>
        ))}
      </ol>
    );
  }
  const current = tab && shown.includes(tab) ? tab : shown[0];
  const rows = ranks.windows[current] ?? [];
  return (
    <div className={css.wrap} data-ranks={ranks.key}>
      {shown.length > 1 ? (
        <div className={css.tabs} role="tablist">
          {shown.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={k === current} className={css.tab} onClick={() => setTab(k)} data-window={k}>
              {labels[k] || w[k]}
            </button>
          ))}
        </div>
      ) : null}
      <div role={shown.length > 1 ? "tabpanel" : undefined}>
        {rows.length ? (
          <ol className={css.list} aria-label={labels[current] || w[current]}>
            {rows.map((r) => (
              <li key={`${r.n}-${r.name}`} className={css.row} data-gp="tile" data-top={r.n <= 3 ? r.n : undefined}>
                <span className={css.n} aria-label={`${w.rank} ${r.n}`}>{r.n}</span>
                <bdi className={css.name}>{r.name}</bdi>
                <span className={css.value} dir="ltr" data-gp="num">{scoreText(r.value, ranks.unit, lang)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={css.empty} data-ranks="empty">{empty || w.empty}</p>
        )}
      </div>
    </div>
  );
}
