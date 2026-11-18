"use client";
/**
 * «الإشعارات على هالجهاز» on the account page: notifications on this phone, on or off (lib/pushClient.ts). Shown only
 * while the owner has them on (the API's key answers); says so when the browser blocks them, and on an iPhone that the
 * shop has to be on the home screen first.
 */
import { useEffect, useState } from "react";
import { tr } from "@/lib/words";
import { pushState, shopKey, turnPushOff, turnPushOn, type PushState } from "@/lib/pushClient";
import { useOptionalAccount } from "@/store/account";
import { useLanguage } from "./cinematic/Language";

export function PushSwitch() {
  const { language: lang } = useLanguage();
  const account = useOptionalAccount();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let gone = false;
    void (async () => {
      if (!(await shopKey())) return;
      const now = await pushState();
      if (!gone) setState(now);
    })();
    return () => {
      gone = true;
    };
  }, []);

  if (!state || state === "unsupported") return null;

  const flip = async () => {
    setBusy(true);
    setFailed(false);
    if (state === "on") {
      await turnPushOff();
      setState("off");
    } else {
      const signedIn = account?.status === "signedIn";
      const auth = signedIn ? await account.authHeaders() : {};
      const out = await turnPushOn(lang, signedIn ? (account.user?.id ?? "signed-in") : "guest", auth);
      if (out === "failed") setFailed(true);
      setState(out === "on" ? "on" : out === "denied" ? "denied" : "off");
    }
    setBusy(false);
  };

  const note =
    state === "on"
      ? tr(lang, "شغّالة: العروض الجديدة ووين صار الطلب.", "On: new offers and where your order is.")
      : state === "denied"
        ? tr(lang, "موقّفة بإعدادات المتصفح، ومن هناك بتنفتح.", "Blocked in the browser's settings; they're turned on there.")
        : state === "install-first"
          ? tr(lang, "عالآيفون بتشتغل لما يكون المتجر على الشاشة الرئيسية: زر المشاركة، وبعدين «أضف إلى الشاشة الرئيسية».", "On an iPhone they work once the shop is on the home screen: the Share button, then “Add to Home Screen”.")
          : tr(lang, "موقّفة على هالجهاز.", "Off on this device.");
  const canFlip = state === "on" || state === "off";

  return (
    <div className="rose-account-push" data-testid="push-switch" data-state={state}>
      <div>
        <strong>{tr(lang, "الإشعارات على هالجهاز", "Notifications on this device")}</strong>
        <span>{note}</span>
        {failed ? (
          <span role="alert" data-testid="push-switch-failed">
            {tr(lang, "ما زبطت هلّق. ممكن المحاولة بعد شوي.", "That didn't work just now. Try again in a little while.")}
          </span>
        ) : null}
      </div>
      {canFlip ? (
        <button
          type="button"
          role="switch"
          aria-checked={state === "on"}
          aria-label={tr(lang, "الإشعارات على هالجهاز", "Notifications on this device")}
          className="rose-account-push-switch"
          onClick={() => void flip()}
          disabled={busy}
          data-testid="push-switch-toggle"
        >
          <i aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
