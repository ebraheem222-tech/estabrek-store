"use client";
// A whole game server site's live status (sites wave G1; backend lib/gameSites.ts): up or down, how many play, its name
// and map, the last 24 hours, and a way in (the game's own link, or the address to copy). The server fills it as the
// page is served; here it is asked again every minute. In the editor (no status yet) it shows how it will look.
import { useEffect, useState } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import type { TreeLang } from "./tree";
import css from "./GameStatusView.module.css";

type Live = {
  featureId: string;
  game: "fivem" | "minecraft" | "bedrock" | "steam";
  online: boolean | null;
  players: number | null;
  max: number | null;
  name: string | null;
  map: string | null;
  at: string | null;
  join: { href: string | null; address: string };
  history: Array<{ hour: string; players: number | null; online: boolean | null }>;
  /** Its Discord, while its owner shows it: how many are on now, and in it. */
  discord?: { online: number; members: number } | null;
};

const WORDS = {
  ar: { on: "شغّال", off: "طافي", unknown: "لسّا ما انسأل", players: "لاعب", join: "فوت هلّق", copy: "انسخ العنوان", copied: "انتسخ", last: "آخر 24 ساعة", sample: "حالة السيرفر بتطلع هون", discordNow: "هلّق على الديسكورد", discordOf: "من" },
  en: { on: "Online", off: "Offline", unknown: "Not checked yet", players: "players", join: "Join now", copy: "Copy the address", copied: "Copied", last: "The last 24 hours", sample: "The server's status shows here", discordNow: "on Discord now", discordOf: "of" },
  he: { on: "מחובר", off: "כבוי", unknown: "עוד לא נבדק", players: "שחקנים", join: "להתחבר עכשיו", copy: "להעתיק את הכתובת", copied: "הועתק", last: "24 השעות האחרונות", sample: "מצב השרת יופיע כאן", discordNow: "ב-Discord עכשיו", discordOf: "מתוך" },
} as const;

const isLive = (v: unknown): v is Live => !!v && typeof v === "object" && typeof (v as Live).featureId === "string" && Array.isArray((v as Live).history);

export function GameStatusView({ live: first, lang, joinLabel, copyLabel, chart, size }: { live: unknown; lang: TreeLang; joinLabel?: string; copyLabel?: string; chart: boolean; size: "big" | "small" }) {
  const t = WORDS[lang] ?? WORDS.ar;
  const [live, setLive] = useState<Live | null>(isLive(first) ? first : null);
  const [copied, setCopied] = useState(false);
  const featureId = isLive(first) ? first.featureId : null;

  // Asked again every minute (the server reads the game every minute too).
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

  const state = !live || live.online === null ? "unknown" : live.online ? "on" : "off";
  const most = Math.max(1, live?.max ?? 0, ...(live?.history ?? []).map((h) => h.players ?? 0));
  const copy = async () => {
    if (!live) return;
    try {
      await navigator.clipboard.writeText(live.join.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the address stays shown to copy by hand */
    }
  };

  return (
    <div className={`${css.box} ${size === "big" ? css.big : css.small}`} data-state={state} data-testid="game-status" role="status" aria-live="polite">
      <div className={css.top}>
        <span className={css.dot} aria-hidden="true" />
        <strong className={css.state}>{live ? t[state] : t.sample}</strong>
        {live?.online && live.players !== null ? (
          <span className={css.players} dir="ltr" data-testid="game-players">
            {live.players}
            {live.max ? ` / ${live.max}` : ""} <span>{t.players}</span>
          </span>
        ) : null}
      </div>
      {live?.name || live?.map ? <div className={css.name}>{[live.name, live.map].filter(Boolean).join(" · ")}</div> : null}
      {live?.discord ? (
        <div className={css.discord} data-testid="game-discord">
          <span className={css.discordDot} aria-hidden="true" />
          <b dir="ltr">{live.discord.online.toLocaleString("en")}</b> {t.discordNow}
          <span className={css.discordOf}>
            {t.discordOf} <span dir="ltr">{live.discord.members.toLocaleString("en")}</span>
          </span>
        </div>
      ) : null}
      {chart && live ? (
        <div className={css.chart} role="img" aria-label={t.last} dir="ltr">
          {live.history.map((h) => (
            <span key={h.hour} className={css.bar} data-off={h.online === false ? "" : undefined} style={{ height: `${h.players === null ? 4 : Math.max(4, (h.players / most) * 100)}%` }} title={`${new Date(h.hour).getHours()}:00 · ${h.players ?? "—"}`} />
          ))}
        </div>
      ) : null}
      {live ? (
        <div className={css.ways}>
          {live.join.href ? (
            <a className={css.join} href={live.join.href} rel="nofollow" data-testid="game-join">
              {joinLabel || t.join}
            </a>
          ) : null}
          <button type="button" className={css.copy} onClick={copy} data-testid="game-copy">
            <code dir="ltr">{live.join.address}</code>
            <span>{copied ? t.copied : copyLabel || t.copy}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
