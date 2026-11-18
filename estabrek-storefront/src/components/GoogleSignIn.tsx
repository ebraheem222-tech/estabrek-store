"use client";
/**
 * Google's own "Continue with Google" button (Google Identity Services), shown on the account page while the owner
 * has signing in with Google on (lib/googleSignIn.ts). Google's script is loaded only here, only then. The token
 * Google hands back goes to the shop's server (app/api/account/google), which has the store's API check it.
 */
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { accountErrorText, useAccount, type Customer } from "@/store/account";

type GoogleId = {
  initialize: (o: { client_id: string; callback: (r: { credential?: string }) => void; ux_mode?: "popup"; context?: string; itp_support?: boolean }) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

const SCRIPT = "https://accounts.google.com/gsi/client";
let loading: Promise<GoogleId | null> | null = null;
/** Google's script, once a page. */
function googleScript(): Promise<GoogleId | null> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise((done) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => done(window.google?.accounts?.id ?? null);
    s.onerror = () => {
      loading = null;
      done(null);
    };
    document.head.appendChild(s);
  });
  return loading;
}

export function GoogleSignIn({ clientId, lang, onSignedIn }: { clientId: string; lang: Lang; onSignedIn?: (user: Customer) => void }) {
  const { signInWithGoogle } = useAccount();
  const box = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The newest callbacks, without drawing the button again.
  const then = useRef({ signInWithGoogle, onSignedIn, lang });
  then.current = { signInWithGoogle, onSignedIn, lang };

  useEffect(() => {
    let gone = false;
    void googleScript().then((id) => {
      if (gone || !id || !box.current) return;
      id.initialize({
        client_id: clientId,
        ux_mode: "popup",
        context: "signin",
        itp_support: true,
        callback: async ({ credential }) => {
          if (!credential) return;
          setBusy(true);
          setErr(null);
          try {
            const user = await then.current.signInWithGoogle(credential);
            then.current.onSignedIn?.(user);
          } catch (x) {
            setErr(accountErrorText(x, then.current.lang));
          } finally {
            setBusy(false);
          }
        },
      });
      id.renderButton(box.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "pill", logo_alignment: "left", width: 300, locale: lang });
    });
    return () => {
      gone = true;
    };
  }, [clientId, lang]);

  return (
    <div className="rose-account-google" data-testid="google-sign-in" aria-busy={busy}>
      <div ref={box} data-testid="google-sign-in-button" />
      {err ? (
        <p className="rose-form-error" role="alert" data-testid="google-sign-in-error">
          {err}
        </p>
      ) : null}
    </div>
  );
}
