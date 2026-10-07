"use client";
import { useEffect, useState, type FormEvent } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { useOptionalAccount } from "@/store/account";
import { useLanguage } from "./Language";

const EMAIL_KEY = "estabrek_alert_email";

/**
 * "بلّغيني لما يرجع": under add-to-bag on a sold-out size. She leaves her email
 * (no account needed) and gets one email when the size is back in stock.
 */
export function RoseStockAlert({ variantId, label }: { variantId: string; label: string }) {
  const ar = useLanguage().language === "ar";
  const account = useOptionalAccount();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "hidden">("idle");
  const [error, setError] = useState<string | null>(null);

  // Her email from last time (or her account) is filled in for her.
  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(EMAIL_KEY) ?? "";
    } catch {
      /* private window */
    }
    setEmail((e) => e || account?.user?.email || saved);
  }, [account?.user?.email]);

  // Another size: a fresh form.
  useEffect(() => {
    setState((s) => (s === "hidden" ? s : "idle"));
    setError(null);
  }, [variantId]);

  if (state === "hidden") return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError(ar ? "اكتبي إيميل صحيح." : "Please enter a valid email.");
      return;
    }
    setState("sending");
    setError(null);
    try {
      const res = await fetch(`${apiBaseClient()}/stock-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, variantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === "FEATURE_OFF") return setState("hidden");
        setState("idle");
        setError(
          data?.error === "IN_STOCK"
            ? ar ? "هذا المقاس رجع متوفر! حدّثي الصفحة." : "This size is back! Refresh the page."
            : data?.error === "TOO_MANY_ALERTS" || data?.error === "RATE_LIMIT" || res.status === 429
              ? ar ? "طلبات كثيرة. جرّبي بعد شوي." : "Too many requests. Try again shortly."
              : data?.error === "VALIDATION_ERROR"
                ? ar ? "اكتبي إيميل صحيح." : "Please enter a valid email."
                : ar ? "صار خطأ. جرّبي كمان مرة." : "Something went wrong. Please try again.",
        );
        return;
      }
      try {
        localStorage.setItem(EMAIL_KEY, value);
      } catch {
        /* private window */
      }
      setState("done");
    } catch {
      setState("idle");
      setError(ar ? "ما في اتصال. جرّبي كمان مرة." : "No connection. Please try again.");
    }
  };

  if (state === "done") {
    return (
      <div className="rose-stock-alert done" role="status" data-testid="stock-alert-done">
        <strong>{ar ? "تمام، سجّلناكِ." : "You're on the list."}</strong>
        <p>{ar ? `أول ما يرجع ${label} منبعتلكِ إيميل على ${email.trim()}.` : `We'll email ${email.trim()} as soon as ${label} is back.`}</p>
      </div>
    );
  }

  return (
    <form className="rose-stock-alert" onSubmit={submit} noValidate data-testid="stock-alert">
      <strong>{ar ? "بلّغيني لما يرجع" : "Tell me when it's back"}</strong>
      <p>{ar ? `${label} نفد. اتركي إيميلكِ ومنبعتلكِ رسالة وحدة أول ما يرجع.` : `${label} is sold out. Leave your email and we'll send one message when it's back.`}</p>
      <div className="rose-stock-alert-row">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          placeholder="name@example.com"
          aria-label={ar ? "الإيميل" : "Email"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="atelier-button button-dark" disabled={state === "sending"}>
          {state === "sending" ? (ar ? "لحظة…" : "One moment…") : ar ? "بلّغيني" : "Notify me"}
        </button>
      </div>
      {error ? <p className="rose-form-error" role="alert">{error}</p> : null}
    </form>
  );
}
