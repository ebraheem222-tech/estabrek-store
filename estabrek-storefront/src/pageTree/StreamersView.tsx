"use client";
// A game server site's streamers (sites wave G6b; backend lib/twitch.ts fills them as the page is served): the live
// first, each with their stream's picture, title, game and how many watch, and a way to it on Twitch in a new tab; the
// others with their picture, a line about them and their channel. Where the site has no Twitch keys, nobody is marked
// live. In the editor (none yet) it shows how it will look.
import type { TreeLang } from "./tree";
import css from "./StreamersView.module.css";

type Live = { title: string; game: string; viewers: number; since: string; thumb: string | null };
type Streamer = { name: string; login: string | null; url: string | null; picture: string | null; about: unknown; live: Live | null };
type Crew = { live: boolean; list: Streamer[] };

const WORDS = {
  ar: { live: "لايف", watch: "شوف البث", channel: "القناة", empty: "الستريمرز بيطلعوا هون قريباً.", watching: (n: string) => `${n} عم يتفرّجوا`, nobody: "ما حدا لايف هلّق.", sample: "ستريمر" },
  en: { live: "Live", watch: "Watch the stream", channel: "Channel", empty: "The streamers show here soon.", watching: (n: string) => `${n} watching`, nobody: "Nobody is live right now.", sample: "Streamer" },
  he: { live: "בשידור", watch: "לצפות בשידור", channel: "ערוץ", empty: "הסטרימרים יופיעו כאן בקרוב.", watching: (n: string) => `${n} צופים`, nobody: "אף אחד לא בשידור כרגע.", sample: "סטרימר" },
} as const;

const isCrew = (v: unknown): v is Crew => !!v && typeof v === "object" && Array.isArray((v as Crew).list);
const wordsIn = (v: unknown, lang: TreeLang): string => (typeof v === "string" ? v : v && typeof v === "object" ? String((v as Record<string, unknown>)[lang] ?? (v as Record<string, unknown>).ar ?? "") : "");
const initial = (name: string) => Array.from(name.trim())[0]?.toUpperCase() ?? "?";

export function StreamersView({ crew, lang, liveLabel, watch, channel, empty, columns, onlyLive }: { crew: unknown; lang: TreeLang; liveLabel: string; watch: string; channel: string; empty: string; columns: number; onlyLive: boolean }) {
  const w = WORDS[lang] ?? WORDS.ar;
  if (!isCrew(crew) || !crew.list.length) {
    const inStudio = typeof window !== "undefined" && window.parent !== window && /\/studio-frame/.test(window.location.pathname);
    if (!inStudio) return <p className={css.empty} data-streamers="empty">{empty || w.empty}</p>;
    return (
      <div className={css.grid} style={{ ["--cols" as string]: String(columns) }} data-streamers="sample">
        {[1, 2, 3].slice(0, columns).map((n) => (
          <article key={n} className={css.card} data-gp="panel">
            <span className={css.avatar} aria-hidden>{n}</span>
            <h3 className={css.name}>{w.sample} {n}</h3>
          </article>
        ))}
      </div>
    );
  }
  const list = onlyLive ? crew.list.filter((s) => s.live) : crew.list;
  if (!list.length) return <p className={css.empty} data-streamers="nobody">{w.nobody}</p>;
  const count = (n: number) => w.watching(n.toLocaleString("en"));
  return (
    <div className={css.grid} style={{ ["--cols" as string]: String(columns) }} data-streamers="list">
      {list.map((s, i) => (
        <article key={`${s.login ?? s.name}-${i}`} className={css.card} data-gp="panel" data-live={s.live ? "yes" : undefined} data-login={s.login ?? undefined}>
          {s.live ? (
            <div className={css.shot}>
              {s.live.thumb ? <img src={s.live.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
              <span className={css.badge}>{liveLabel || w.live}</span>
              <span className={css.viewers}>{count(s.live.viewers)}</span>
            </div>
          ) : null}
          <div className={css.who}>
            {s.picture ? <img className={css.avatar} src={s.picture} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className={css.avatar} aria-hidden>{initial(s.name)}</span>}
            <div className={css.whoText}>
              <h3 className={css.name}>
                <bdi>{s.name}</bdi>
              </h3>
              {s.live?.game ? <p className={css.game}>{s.live.game}</p> : null}
            </div>
          </div>
          {s.live?.title ? <p className={css.title}>{s.live.title}</p> : wordsIn(s.about, lang) ? <p className={css.about}>{wordsIn(s.about, lang)}</p> : null}
          {s.url ? (
            <a className={s.live ? css.watch : css.channel} data-gp={s.live ? "go" : "ghost"} href={s.url} target="_blank" rel="noopener noreferrer">
              {s.live ? watch || w.watch : channel || w.channel}
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}
