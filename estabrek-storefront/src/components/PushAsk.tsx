"use client";
/**
 * Notifications on the shopper's side (lib/pushClient.ts): while the owner has them on (header.app.push), a phone that
 * said yes before tells the API again once a visit (and when the shopper signs in or out on it, so their order's news
 * reaches them there and nowhere else); and, if the owner chose the small card, the shop asks once, after a while,
 * never over the install offer, and not again for a month after the shopper closes it. The browser's own question
 * only comes after the shopper's tap. Nothing of this runs inside the admin's editor frames.
 * It lives inside the account's provider (so a phone is tied to who is signed in on it), deep in the page's own
 * layers: the card itself is drawn on the page's top level, above the shop's floating buttons.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/words";
import type { PushAsk as Ask } from "@/lib/pwa";
import { inEditorFrame, pushState, syncPush, turnPushOn } from "@/lib/pushClient";
import { useOptionalAccount } from "@/store/account";
import s from "./AppShell.module.css";

const CLOSED_KEY = "shop-push-ask-closed";
const MONTH = 30 * 24 * 60 * 60 * 1000;
/** How long a shopper looks around before the shop asks. */
export const ASK_AFTER_MS = 25_000;

const closedLately = () => {
  try {
    return Date.now() - Number(localStorage.getItem(CLOSED_KEY) || 0) < MONTH;
  } catch {
    return false;
  }
};

export function PushAsk({ on, ask, lang, name, icon }: { on: boolean; ask: Ask; lang: Lang; name: string; icon: string }) {
  const account = useOptionalAccount();
  const status = account?.status ?? "guest";
  const userId = account?.user?.id ?? null;
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<"on" | "denied" | "failed" | null>(null);

  // Said yes before: the API hears from this phone (who is signed in on it, its language).
  useEffect(() => {
    if (!on || status === "loading" || inEditorFrame()) return;
    void (async () => {
      const auth = status === "signedIn" && account ? await account.authHeaders() : {};
      await syncPush(lang, status === "signedIn" ? (userId ?? "signed-in") : "guest", auth);
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, status, userId, lang]);

  // Asking, once, after a while.
  useEffect(() => {
    if (!on || ask !== "banner" || inEditorFrame()) return;
    let gone = false;
    const timer = window.setTimeout(async () => {
      if (gone || closedLately() || document.querySelector('[data-testid="app-install"]')) return;
      if ((await pushState()) !== "off" || gone) return;
      setShown(true);
    }, ASK_AFTER_MS);
    return () => {
      gone = true;
      window.clearTimeout(timer);
    };
  }, [on, ask]);

  if (!on || !shown) return null;

  const close = () => {
    setShown(false);
    try {
      localStorage.setItem(CLOSED_KEY, String(Date.now()));
    } catch {
      /* storage blocked: closed for this visit */
    }
  };
  const yes = async () => {
    setBusy(true);
    const auth = status === "signedIn" && account ? await account.authHeaders() : {};
    const out = await turnPushOn(lang, status === "signedIn" ? (userId ?? "signed-in") : "guest", auth);
    setBusy(false);
    setSaid(out);
    if (out !== "failed") window.setTimeout(close, out === "on" ? 2500 : 5000);
  };

  return createPortal(
    <div className={s.banner} role="dialog" aria-label={tr(lang, "الإشعارات", "Notifications")} data-testid="push-ask">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {icon ? <img className={s.icon} src={icon} alt="" width={48} height={48} /> : null}
      <div className={s.words}>
        <strong>{tr(lang, `إشعارات ${name}`, "{0} notifications", [name])}</strong>
        {said === "on" ? (
          <span role="status" data-testid="push-ask-done">{tr(lang, "تمام، رح نخبّرك بالجديد.", "Done: we'll let you know.")}</span>
        ) : said === "denied" ? (
          <span role="status" data-testid="push-ask-denied">{tr(lang, "الإشعارات موقّفة بإعدادات المتصفح.", "Notifications are blocked in the browser's settings.")}</span>
        ) : said === "failed" ? (
          <span role="status" data-testid="push-ask-failed">{tr(lang, "ما زبطت هلّق. ممكن المحاولة بعد شوي.", "That didn't work just now. Try again in a little while.")}</span>
        ) : (
          <span>{tr(lang, "العروض الجديدة، والقطع اللي رجعت، ووين صار الطلب.", "New offers, pieces back in stock, and where your order is.")}</span>
        )}
      </div>
      <div className={s.actions}>
        {said ? null : (
          <button type="button" className={s.go} onClick={() => void yes()} disabled={busy} data-testid="push-ask-yes">
            {tr(lang, "إيه، خبّروني", "Yes, tell me")}
          </button>
        )}
        <button type="button" className={s.close} onClick={close} aria-label={tr(lang, "مش هلّق", "Not now")} data-testid="push-ask-close">
          ✕
        </button>
      </div>
    </div>,
    document.body,
  );
}
