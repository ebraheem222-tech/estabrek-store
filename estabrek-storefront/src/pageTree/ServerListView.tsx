"use client";
// A network's or a community's own servers (sites wave G7b; backend lib/gameSites.ts fills props.live with the site's
// status as the page is served): each one up or down, how many are on it, what it is, and a way in (its own address,
// or the main one with what to type once in: "/server bedwars"). Asked again every minute, like the main status. In the
// editor (no status yet) it shows how it will look.
import { useEffect, useState } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import type { TreeLang } from "./tree";
import css from "./ServerListView.module.css";

type Sub = {
  key: string;
  title: unknown;
  line: unknown;
  hint: unknown;
  game: "fivem" | "minecraft" | "bedrock" | "steam" | "web";
  /** A website's or a machine's speed (wave G7d2). */
  ms?: number | null;
  online: boolean | null;
  players: number | null;
  max: number | null;
  map: string | null;
  join: { href: string | null; address: string };
};
type Live = { featureId: string; servers: Sub[] | null };

const WORDS = {
  ar: { on: "شغّال", off: "طافي", unknown: "لسّا ما انسأل", players: "لاعب", join: "فوت عليه", copy: "انسخ العنوان", copied: "انتسخ", then: "بعدها اكتب", sample: "سيرفر", empty: "السيرفرات بتطلع هون قريباً.", up: "شغّال", down: "واقف" },
  en: { on: "Online", off: "Offline", unknown: "Not checked yet", players: "players", join: "Join it", copy: "Copy the address", copied: "Copied", then: "Then type", sample: "Server", empty: "The servers show here soon.", up: "Up", down: "Down" },
  he: { on: "מחובר", off: "כבוי", unknown: "עוד לא נבדק", players: "שחקנים", join: "להתחבר אליו", copy: "להעתיק את הכתובת", copied: "הועתק", then: "ואז להקליד", sample: "שרת", empty: "השרתים יופיעו כאן בקרוב.", up: "פועל", down: "לא פועל" },
} as const;

const isLive = (v: unknown): v is Live => !!v && typeof v === "object" && typeof (v as Live).featureId === "string";
const wordsIn = (v: unknown, lang: TreeLang): string => (typeof v === "string" ? v : v && typeof v === "object" ? String((v as Record<string, unknown>)[lang] ?? (v as Record<string, unknown>).ar ?? "") : "");

export function ServerListView({ live: first, lang, joinLabel, copyLabel, empty, columns, size }: { live: unknown; lang: TreeLang; joinLabel?: string; copyLabel?: string; empty?: string; columns: number; size: "big" | "small" }) {
  const t = WORDS[lang] ?? WORDS.ar;
  const [live, setLive] = useState<Live | null>(isLive(first) ? first : null);
  const [copied, setCopied] = useState<string | null>(null);
  const featureId = isLive(first) ? first.featureId : null;

  // Asked again every minute (the server reads them every minute too).
  useEffect(() => {
    if (!featureId) return;
    let alive = true;
    const ask = async () => {
      try {
        const res = await fetch(`${apiBaseClient()}/storefront/game-status/${encodeURIComponent(featureId)}`, { cache: "no-store" });
        const body = (await res.json().catch(() => null)) as unknown;
        if (alive && res.ok && isLive(body)) setLive(body);
      } catch {
        /* the next minute */
      }
    };
    const timer = window.setInterval(ask, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [featureId]);

  const copy = async (s: Sub) => {
    try {
      await navigator.clipboard.writeText(s.join.address);
      setCopied(s.key);
      window.setTimeout(() => setCopied((k) => (k === s.key ? null : k)), 2000);
    } catch {
      /* the address stays shown to copy by hand */
    }
  };

  const list = live?.servers ?? [];
  if (!list.length) {
    // In the editor's frame (no status yet): how it will look; on the shop, the owner's words.
    const inStudio = typeof window !== "undefined" && window.parent !== window && /\/studio-frame/.test(window.location.pathname);
    if (!inStudio) return <p className={css.empty} data-servers="none">{empty || t.empty}</p>;
    return (
      <div className={css.grid} style={{ ["--cols" as string]: columns }} data-one={columns === 1 ? "" : undefined} data-servers="sample">
        {[1, 2, 3].slice(0, Math.max(1, columns)).map((n) => (
          <article key={n} className={`${css.card} ${size === "big" ? css.big : css.small}`} data-state="on" data-gp="panel">
            <div className={css.top}>
              <span className={css.dot} aria-hidden="true" />
              <h3 className={css.title}>{t.sample} {n}</h3>
              <span className={css.players} dir="ltr" data-gp="num">{40 - n * 7}</span>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className={css.grid} style={{ ["--cols" as string]: columns }} data-one={columns === 1 ? "" : undefined} data-testid="server-list">
      {list.map((s) => {
        const state = s.online === null ? "unknown" : s.online ? "on" : "off";
        const hint = wordsIn(s.hint, lang);
        const line = wordsIn(s.line, lang);
        return (
          <article key={s.key} className={`${css.card} ${size === "big" ? css.big : css.small}`} data-state={state} data-server={s.key} data-gp="panel" role="status" aria-live="polite">
            <div className={css.top}>
              <span className={css.dot} aria-hidden="true" />
              <h3 className={css.title}>{wordsIn(s.title, lang) || s.key}</h3>
              {s.game === "web" ? (
                // A machine on a status page: up or down, and how fast it answered.
                <span className={css.state} data-testid="server-web">
                  {s.online === null ? t.unknown : s.online ? t.up : t.down}
                  {s.online && typeof s.ms === "number" ? <bdi className={css.players}> {s.ms} ms</bdi> : null}
                </span>
              ) : s.online && s.players !== null ? (
                <span className={css.players} dir="ltr" data-testid="server-players" data-gp="num">
                  {s.players}
                  {s.max ? ` / ${s.max}` : ""} <span>{t.players}</span>
                </span>
              ) : (
                <span className={css.state}>{t[state]}</span>
              )}
            </div>
            {line && size === "big" ? <p className={css.line}>{line}</p> : null}
            {s.map && size === "big" ? <p className={css.map}>{s.map}</p> : null}
            {s.game === "web" ? null : <div className={css.ways}>
              {s.join.href ? (
                <a className={css.join} href={s.join.href} rel="nofollow" data-testid="server-join" data-gp="go">
                  {joinLabel || t.join}
                </a>
              ) : null}
              <button type="button" className={css.copy} onClick={() => copy(s)} data-testid="server-copy" data-gp="ghost">
                <code dir="ltr">{s.join.address}</code>
                <span>{copied === s.key ? t.copied : copyLabel || t.copy}</span>
              </button>
            </div>}
            {hint ? (
              <p className={css.hint}>
                {t.then} <code dir="ltr">{hint}</code>
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
