"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiBaseClient } from "@/lib/apiClient";
import { useLanguage } from "./Language";
import { tr } from "@/lib/words";

/**
 * A payment the shop asked for (a function's «اطلب دفع» step; backend lib/payLinks.ts): a booking, a membership, a
 * deposit. What it is and how much, and the ways to pay the shop switched on; back from the gateway the page asks
 * the server whether it was paid (the server asks the gateway). The link is its permission: nothing here says who
 * it is for.
 */
type Provider = "stripe" | "paypal";
type View = { title: string; amount: number; currency: string; status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED"; providers: Provider[]; back: string | null; paidAt: string | null };
type State = "loading" | "ready" | "checking" | "going" | "gone";

const locale = (lang: string) => (lang === "ar" ? "ar-u-nu-latn" : lang === "he" ? "he-IL" : "en-GB");
function money(amount: number, currency: string, lang: string) {
  try {
    return new Intl.NumberFormat(locale(lang), { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function RosePayRequest({ token }: { token: string }) {
  const { language: lang } = useLanguage();
  const params = useSearchParams();
  // Back from the gateway (it adds provider=…), or back without paying.
  const returned = params.get("provider") === "stripe" || params.get("provider") === "paypal";
  const cancelled = params.get("cancelled") === "1";
  const [view, setView] = useState<View | null>(null);
  const [state, setState] = useState<State>(token ? "loading" : "gone");
  const [note, setNote] = useState<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (!token || asked.current) return;
    asked.current = true;
    const base = `${apiBaseClient()}/pay/${encodeURIComponent(token)}`;
    (async () => {
      try {
        const res = await fetch(base, { cache: "no-store" });
        if (res.status === 404) return setState("gone");
        if (!res.ok) throw new Error(String(res.status));
        let seen = (await res.json()) as View;
        if (returned && seen.status === "PENDING") {
          setView(seen);
          setState("checking");
          const back = await fetch(`${base}/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
          if (back.ok) seen = (await back.json()) as View;
          if (seen.status === "PENDING") setNote(tr(lang, "لسا ما وصلنا الدفع. إذا دفعتِ، استني شوي وافتحي الصفحة من جديد.", "The payment hasn't reached us yet. If you paid, wait a moment and open this page again."));
        }
        setView(seen);
        setState("ready");
      } catch {
        setState("ready");
        setNote(tr(lang, "صار خطأ. جرّبي كمان مرة.", "Something went wrong. Please try again."));
      }
    })();
  }, [token, returned, lang]);

  const pay = async (provider: Provider) => {
    setState("going");
    setNote(null);
    try {
      const res = await fetch(`${apiBaseClient()}/pay/${encodeURIComponent(token)}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider }) });
      const out = (await res.json().catch(() => ({}))) as { redirectUrl?: string };
      if (!res.ok || !out.redirectUrl) throw new Error(String(res.status));
      window.location.assign(out.redirectUrl);
    } catch {
      setState("ready");
      setNote(tr(lang, "ما قدرنا نفتح صفحة الدفع. جرّبي كمان مرة.", "We couldn't open the payment page. Please try again."));
    }
  };

  const status = state === "gone" ? "GONE" : (view?.status ?? "LOADING");
  return (
    <section className="rose-account rose-pay" data-testid="pay-page" data-status={status} aria-busy={state === "loading" || state === "checking"}>
      <span className="atelier-eyebrow">{tr(lang, "دفعة", "PAYMENT")}</span>
      {state === "gone" ? (
        <>
          <h1>{tr(lang, "هالرابط مش شغّال.", "This link doesn't work.")}</h1>
          <p>{tr(lang, "تأكدي إنه منسوخ كامل، أو احكي معنا.", "Check it was copied whole, or get in touch with us.")}</p>
        </>
      ) : !view ? (
        <p>{tr(lang, "لحظة…", "One moment…")}</p>
      ) : (
        <>
          <h1 data-testid="pay-title">{view.title}</h1>
          <p className="rose-pay-amount" data-testid="pay-amount">
            <bdi>{money(view.amount, view.currency, lang)}</bdi>
          </p>
          {state === "checking" ? (
            <p role="status">{tr(lang, "عم نتأكد من الدفع…", "Checking the payment…")}</p>
          ) : view.status === "PAID" ? (
            <>
              <p role="status" data-testid="pay-done">{tr(lang, "وصلت الدفعة. شكراً إلكِ!", "Payment received. Thank you!")}</p>
              <p>
                <Link href={view.back || "/"} className="atelier-button button-dark" data-testid="pay-back">
                  {view.back ? tr(lang, "كمّلي", "Continue") : tr(lang, "رجوع للمتجر", "Back to the shop")}
                </Link>
              </p>
            </>
          ) : view.status === "EXPIRED" ? (
            <p>{tr(lang, "خلص وقت هالرابط. احكي معنا لنبعتلك واحد جديد.", "This link has run out. Get in touch and we'll send you a new one.")}</p>
          ) : view.status === "CANCELLED" ? (
            <p>{tr(lang, "هالدفعة انلغت.", "This payment was called off.")}</p>
          ) : view.providers.length ? (
            <>
              {cancelled ? <p>{tr(lang, "رجعتِ قبل ما تدفعي. بتقدري تجربي كمان مرة.", "You came back before paying. You can try again.")}</p> : null}
              <div className="rose-pay-actions">
                {view.providers.map((p) => (
                  <button key={p} type="button" className={`atelier-button ${p === "stripe" ? "button-dark" : ""}`} disabled={state === "going"} onClick={() => pay(p)} data-testid={`pay-with-${p}`}>
                    {p === "stripe" ? tr(lang, "ادفعي بالبطاقة", "Pay by card") : tr(lang, "ادفعي بـ PayPal", "Pay with PayPal")}
                  </button>
                ))}
              </div>
              <p className="rose-pay-safe">{tr(lang, "الدفع بيصير بصفحة آمنة عند شركة الدفع، ونحنا ما بنشوف تفاصيل بطاقتك.", "You pay on the payment company's own secure page; we never see your card details.")}</p>
            </>
          ) : (
            <p>{tr(lang, "الدفع أونلاين مش متاح هلأ. احكي معنا.", "Paying online isn't available right now. Get in touch with us.")}</p>
          )}
          {note ? (
            <p className="rose-form-error" role="alert" data-testid="pay-note">
              {note}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
