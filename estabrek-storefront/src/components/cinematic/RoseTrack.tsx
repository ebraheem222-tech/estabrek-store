"use client";
/**
 * «تابعي طلبكِ»: an order placed without an account, found by its number (as the order page and the WhatsApp
 * message show it) and the phone it was placed with. Shows where it is (OrderTracker), its pieces and total.
 * Nothing is kept on the device; the API answers only when both match, and a few tries at most.
 */
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { formatMoney } from "@/lib/catalog";
import { tr } from "@/lib/words";
import { useLanguage } from "./Language";
import { OrderTracker, type OrderStep } from "./OrderTracker";
import { Icon } from "./Icons";

type Found = {
  order: string;
  status: string;
  createdAt: string;
  steps: OrderStep[];
  city: string | null;
  total: number | null;
  currencyCode: string;
  items: Array<{ productTitle: string; productSlug: string | null; colorName: string | null; sizeName: string | null; quantity: number; imageUrl: string | null }>;
};

export function RoseTrack() {
  const { language: lang } = useLanguage();
  const [order, setOrder] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "missing" | "many" | "error">("idle");
  const [found, setFound] = useState<Found | null>(null);

  // The order page links here with its number (?o=…).
  useEffect(() => {
    const o = new URLSearchParams(window.location.search).get("o");
    if (o) setOrder(o.slice(0, 40));
  }, []);

  const look = async (e: FormEvent) => {
    e.preventDefault();
    if (order.trim().replace(/^#/, "").length < 8 || phone.replace(/\D/g, "").length < 6) { setState("missing"); return; }
    setState("busy");
    setFound(null);
    try {
      const r = await fetch(`${apiBaseClient()}/catalog/order-requests/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: order.trim(), phone: phone.trim() }),
      });
      if (r.status === 429) { setState("many"); return; }
      if (!r.ok) { setState(r.status === 404 || r.status === 400 ? "missing" : "error"); return; }
      setFound(await r.json());
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <section className="rose-trackpage" aria-labelledby="track-title">
      <header className="rose-cart-head">
        <span className="atelier-eyebrow">{tr(lang, "طلبكِ", "YOUR ORDER")}</span>
        <h1 id="track-title">{tr(lang, "تابعي طلبكِ.", "Track your order.")}</h1>
        <p>{tr(lang, "اكتبي رقم الطلب (من صفحة الطلب أو رسالة الواتساب) ورقم التلفون اللي طلبتي فيه.", "Enter the order number (from the order page or the WhatsApp message) and the phone you ordered with.")}</p>
      </header>
      <form className="rose-track-form" onSubmit={look} data-testid="track-form" noValidate>
        <label>
          <span>{tr(lang, "رقم الطلب", "Order number")}</span>
          <input value={order} onChange={(e) => setOrder(e.target.value)} dir="ltr" autoComplete="off" spellCheck={false} placeholder="#a1b2c3d4" maxLength={40} />
        </label>
        <label>
          <span>{tr(lang, "رقم التلفون", "Phone")}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} />
        </label>
        <button type="submit" className="atelier-button button-dark" disabled={state === "busy"}>
          {state === "busy" ? tr(lang, "عم ندوّر…", "Looking…") : tr(lang, "وين طلبي؟", "Where is my order?")}<Icon name="arrow" />
        </button>
        {state === "missing" ? <p className="rose-review-error" role="alert">{tr(lang, "ما لقينا طلب بهالرقم وهالتلفون. تأكدي منهم وجرّبي كمان مرة.", "We couldn't find an order with that number and phone. Check them and try again.")}</p> : null}
        {state === "many" ? <p className="rose-review-error" role="alert">{tr(lang, "محاولات كتير. جرّبي بعد شوي.", "Too many tries. Please try again in a little while.")}</p> : null}
        {state === "error" ? <p className="rose-review-error" role="alert">{tr(lang, "صار خطأ. جرّبي كمان مرة.", "Something went wrong. Please try again.")}</p> : null}
      </form>

      {found ? (
        <div className="rose-track-found" data-testid="track-found" aria-live="polite">
          <div className="rose-track-found-head">
            <b dir="ltr">#{found.order}</b>
            {found.total != null ? <span>{formatMoney(found.total, found.currencyCode)}</span> : null}
          </div>
          <OrderTracker status={found.status} steps={found.steps} city={found.city} />
          <ul className="rose-account-order-items">
            {found.items.map((i, n) => (
              <li key={n}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.imageUrl ? <img src={i.imageUrl} alt="" loading="lazy" /> : null}
                <span>
                  {i.productSlug ? <Link href={`/p/${encodeURIComponent(i.productSlug)}`}>{i.productTitle}</Link> : i.productTitle}
                  <small>{[i.colorName, i.sizeName, i.quantity > 1 ? `× ${i.quantity}` : null].filter(Boolean).join(" · ")}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
