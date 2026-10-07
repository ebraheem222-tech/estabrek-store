"use client";
import Link from "next/link";
import { useState } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { useLanguage } from "./Language";

/** Stops a back-in-stock alert (or all of hers) from the link in the email. */
export function RoseStockAlertStop({ token }: { token: string }) {
  const ar = useLanguage().language === "ar";
  const [state, setState] = useState<"idle" | "sending" | "done" | "gone">(token ? "idle" : "gone");
  const [error, setError] = useState<string | null>(null);

  const stop = async (all: boolean) => {
    setState("sending");
    setError(null);
    try {
      const res = await fetch(`${apiBaseClient()}/stock-alerts/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, all }),
      });
      if (res.status === 404) return setState("gone");
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
    } catch {
      setState("idle");
      setError(ar ? "صار خطأ. جرّبي كمان مرة." : "Something went wrong. Please try again.");
    }
  };

  return (
    <section className="rose-account rose-stock-stop" data-testid="stock-alert-stop">
      <span className="atelier-eyebrow">{ar ? "تنبيه التوفّر" : "BACK-IN-STOCK ALERT"}</span>
      {state === "done" ? (
        <>
          <h1>{ar ? "وقّفنا التنبيه." : "Alert stopped."}</h1>
          <p>{ar ? "ما رح نبعتلكِ عن هالقطعة. بتقدري تطلبي تنبيه جديد من صفحة أي قطعة." : "We won't email you about it. You can ask again from any piece."}</p>
        </>
      ) : state === "gone" ? (
        <>
          <h1>{ar ? "هالرابط ما عاد شغّال." : "This link no longer works."}</h1>
          <p>{ar ? "يمكن التنبيه انبعت أو انوقف قبل." : "The alert may have been sent or stopped already."}</p>
        </>
      ) : (
        <>
          <h1>{ar ? "إيقاف تنبيه «رجعت متوفرة»؟" : "Stop this back-in-stock alert?"}</h1>
          <p>{ar ? "ما رح يوصلكِ إيميل لما ترجع القطعة." : "You won't get an email when the piece is back."}</p>
          <div className="rose-stock-stop-actions">
            <button type="button" className="atelier-button button-dark" disabled={state === "sending"} onClick={() => stop(false)}>
              {ar ? "إيقاف هالتنبيه" : "Stop this alert"}
            </button>
            <button type="button" className="atelier-button" disabled={state === "sending"} onClick={() => stop(true)}>
              {ar ? "إيقاف كل تنبيهاتي" : "Stop all my alerts"}
            </button>
          </div>
          {error ? <p className="rose-form-error" role="alert">{error}</p> : null}
        </>
      )}
      <p>
        <Link href="/shop">{ar ? "رجوع للتسوّق" : "Back to the shop"}</Link>
      </p>
    </section>
  );
}
