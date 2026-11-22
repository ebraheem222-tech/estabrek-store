"use client";
/**
 * Discord and Steam on the account page (sites wave G2; lib/socialSignIn.ts; the store's API checks everything):
 *  - signed out: «ادخل بحساب Discord», a plain link (the shop's own route sends them to Discord and back);
 *  - signed in: their game accounts, Steam linked or not (Steam gives no email, so it is linked to the account they
 *    are in), and Discord once they came in with it.
 * The shop's routes come back with ?signin=CODE or ?steam=linked|CODE, said here in words.
 */
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/words";
import { AccountError, accountErrorText, useAccount, type Customer } from "@/store/account";
import css from "./SocialAccounts.module.css";

const CODE = /^[A-Z_]{3,40}$/;

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418Z"
      />
    </svg>
  );
}

/** Signed out: «ادخل بحساب Discord», back to where they were going once it is done. */
export function DiscordSignIn({ lang, next }: { lang: Lang; next: string | null }) {
  return (
    <a className={css.discord} href={`/api/account/discord/start?back=${encodeURIComponent(next ?? "/account")}`} rel="nofollow" data-testid="discord-sign-in">
      <DiscordMark />
      <span>{tr(lang, "ادخل بحساب Discord", "Continue with Discord")}</span>
    </a>
  );
}

/** Why the last sign-in through Discord didn't go (?signin=CODE). */
export function SignInProblem({ lang }: { lang: Lang }) {
  const why = useSearchParams().get("signin");
  if (!why || !CODE.test(why)) return null;
  return (
    <p className="rose-form-error" role="alert" data-testid="sign-in-problem">
      {accountErrorText(new AccountError(why, 0), lang)}
    </p>
  );
}

/** Signed in: the accounts they play with (only while Steam is on, or once they came in with Discord). */
export function GameAccounts({ lang, steam }: { lang: Lang; steam: boolean }) {
  const { user, api, setUser } = useAccount();
  const said = useSearchParams().get("steam");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!user || (!steam && !user.discordId)) return null;

  const link = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { url } = await api<{ url: string }>("/customer/me/steam/start", {
        method: "POST",
        body: JSON.stringify({ returnTo: `${window.location.origin}/api/account/steam/callback`, back: window.location.pathname }),
      });
      if (typeof url !== "string" || !url.startsWith("https://steamcommunity.com/openid/login?")) throw new AccountError("STEAM_REFUSED", 0);
      window.location.assign(url);
    } catch (x) {
      setErr(accountErrorText(x, lang));
      setBusy(false);
    }
  };
  const unlink = async () => {
    setBusy(true);
    setErr(null);
    try {
      setUser(await api<Customer>("/customer/me/steam", { method: "DELETE" }));
    } catch (x) {
      setErr(accountErrorText(x, lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={css.games} data-testid="game-accounts" aria-label={tr(lang, "حسابات اللعب", "Game accounts")}>
      <h2>{tr(lang, "حسابات اللعب", "Game accounts")}</h2>
      {user.discordId ? (
        <div className={css.row} data-testid="discord-account">
          <span className={css.brand} data-brand="discord">
            <DiscordMark />
            Discord
          </span>
          <b>{tr(lang, "مربوط", "Linked")}</b>
        </div>
      ) : null}
      {steam ? (
        <div className={css.row} data-testid="steam-account">
          <span className={css.brand} data-brand="steam">Steam</span>
          {user.steamId ? (
            <>
              <code dir="ltr">{user.steamId}</code>
              <button type="button" className={css.quiet} onClick={() => void unlink()} disabled={busy}>
                {tr(lang, "فك الربط", "Unlink")}
              </button>
            </>
          ) : (
            <button type="button" className={css.steam} onClick={() => void link()} disabled={busy} data-testid="steam-link">
              {busy ? tr(lang, "لحظة…", "One moment…") : tr(lang, "اربط حساب Steam", "Link your Steam account")}
            </button>
          )}
        </div>
      ) : null}
      {said === "linked" && user.steamId ? (
        <p className={css.note} role="status" data-testid="steam-linked">
          {tr(lang, "انربط حساب Steam.", "Your Steam account is linked.")}
        </p>
      ) : said && CODE.test(said) ? (
        <p className="rose-form-error" role="alert">{accountErrorText(new AccountError(said, 0), lang)}</p>
      ) : null}
      {err ? <p className="rose-form-error" role="alert">{err}</p> : null}
    </section>
  );
}
