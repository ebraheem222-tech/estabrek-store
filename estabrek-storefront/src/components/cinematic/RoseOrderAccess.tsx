"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { qrMatrix, qrPath } from "@/lib/qr";
import { useLanguage } from "./Language";

type AccessFile = { id: string; name: string; productTitle: string; kind: string; bytes: number | null; format: string | null; downloads: number; left: number };
type AccessTicket = {
  code: string;
  qr?: string;
  title: string;
  label: string | null;
  holderName: string | null;
  status: "VALID" | "USED" | "CANCELLED";
  checkedInAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
};
type Access = {
  shortId: string;
  status: string;
  closed: boolean;
  delivered: boolean;
  firstName: string;
  items: Array<{ title: string; variant: string | null; quantity: number; imageUrl: string | null; fulfillment: string }>;
  files: AccessFile[];
  maxDownloads: number;
  tickets: AccessTicket[];
};

function size(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function when(start: string | null, end: string | null, ar: boolean) {
  if (!start) return null;
  try {
    const tz = "Asia/Jerusalem";
    const s = new Date(start);
    const day = new Intl.DateTimeFormat(ar ? "ar" : "en", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(s);
    const t = (d: Date) => new Intl.DateTimeFormat(ar ? "ar" : "en", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    return end ? `${day}، ${t(s)}–${t(new Date(end))}` : `${day}، ${t(s)}`;
  } catch {
    return null;
  }
}

/** The shopper's private order page: her downloads and tickets (from the link in her email / WhatsApp). */
export function RoseOrderAccess({ token }: { token: string }) {
  const ar = useLanguage().language === "ar";
  const [data, setData] = useState<Access | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "gone" | "error">(token ? "loading" : "gone");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetch(`${apiBaseClient()}/orders/access/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 404) return setState("gone");
        if (!res.ok) throw new Error(String(res.status));
        setData((await res.json()) as Access);
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [token]);

  const download = async (f: AccessFile) => {
    setBusy(f.id);
    setMsg(null);
    // Opened inside the click, so the browser allows it.
    const tab = f.kind === "link" ? window.open("", "_blank") : null;
    try {
      const res = await fetch(`${apiBaseClient()}/orders/access/${encodeURIComponent(token)}/files/${encodeURIComponent(f.id)}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.status === 429) throw new Error(ar ? `وصلتِ للحد (${data?.maxDownloads ?? ""} تنزيلات لهالملف). تواصلي معنا إذا بدكِ كمان.` : "You've reached the download limit for this file. Contact us if you need more.");
      if (res.status === 410) throw new Error(ar ? "الطلب ملغي." : "This order was cancelled.");
      if (!res.ok || !body?.url) throw new Error(ar ? "ما قدرنا نجهّز الملف. جرّبي كمان شوي." : "We couldn't prepare the file. Try again shortly.");
      if (tab) tab.location.href = body.url;
      else window.location.href = body.url;
      setData((d) => (d ? { ...d, files: d.files.map((x) => (x.id === f.id ? { ...x, downloads: x.downloads + 1, left: Math.max(0, x.left - 1) } : x)) } : d));
    } catch (e) {
      tab?.close();
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (state === "loading") {
    return (
      <section className="rose-account rose-order-access" aria-busy="true">
        <span className="atelier-eyebrow">{ar ? "طلبكِ" : "YOUR ORDER"}</span>
        <h1>{ar ? "لحظة…" : "One moment…"}</h1>
      </section>
    );
  }
  if (state !== "ready" || !data) {
    return (
      <section className="rose-account rose-order-access" data-testid="order-access">
        <span className="atelier-eyebrow">{ar ? "طلبكِ" : "YOUR ORDER"}</span>
        <h1>{state === "gone" ? (ar ? "هالرابط مش شغّال." : "This link doesn't work.") : ar ? "ما قدرنا نفتح الطلب." : "We couldn't open the order."}</h1>
        <p>{state === "gone" ? (ar ? "يمكن انعمل رابط جديد إلكِ. تواصلي معنا ونبعتلكِ ياه." : "A new link may have been made for you. Contact us and we'll send it.") : ar ? "جرّبي كمان شوي." : "Please try again shortly."}</p>
        <p><Link href="/contact">{ar ? "تواصلي معنا" : "Contact us"}</Link></p>
      </section>
    );
  }

  const live = data.tickets.filter((t) => t.status !== "CANCELLED");
  return (
    <section className="rose-account rose-order-access" data-testid="order-access">
      <span className="atelier-eyebrow">{ar ? `طلب رقم ${data.shortId}` : `ORDER ${data.shortId}`}</span>
      <h1>{data.closed ? (ar ? "هالطلب انلغى." : "This order was cancelled.") : data.firstName ? (ar ? `أهلاً ${data.firstName}.` : `Hi ${data.firstName}.`) : ar ? "طلبكِ." : "Your order."}</h1>
      {data.closed ? (
        <p>{ar ? "الملفات والتذاكر واقفة. إذا في غلط تواصلي معنا." : "The files and tickets are no longer active. Contact us if this is a mistake."}</p>
      ) : !data.delivered ? (
        <p>{ar ? "لسا ما تأكد الطلب. أول ما نأكده بتطلع ملفاتكِ وتذاكركِ هون." : "Your order isn't confirmed yet. Your files and tickets appear here once it is."}</p>
      ) : (
        <p className="no-print">{ar ? "هاي صفحتكِ الخاصة. لا تشاركي الرابط مع حدا." : "This page is yours alone — please don't share the link."}</p>
      )}

      {live.length > 0 && (
        <div className="rose-order-tickets" data-testid="order-tickets">
          <h2>{ar ? (live.length > 1 ? `تذاكركِ (${live.length})` : "تذكرتكِ") : live.length > 1 ? `Your tickets (${live.length})` : "Your ticket"}</h2>
          <ul>
            {live.map((t) => (
              <li key={t.code} className={t.status === "USED" ? "used" : undefined}>
                <TicketQr text={t.qr || t.code} label={ar ? `رمز QR للتذكرة ${t.code}` : `QR for ticket ${t.code}`} />
                <div className="rose-order-ticket-info">
                  <b>{t.title}{t.label ? ` · ${t.label}` : ""}</b>
                  {t.startsAt ? <span suppressHydrationWarning>🗓️ {when(t.startsAt, t.endsAt, ar)}</span> : null}
                  {t.location ? <span>📍 {t.location}</span> : null}
                  {t.holderName ? <span>👤 {t.holderName}</span> : null}
                  <code dir="ltr" data-testid="ticket-code">{t.code}</code>
                  {t.status === "USED" ? <em>{ar ? "✓ استُخدمت للدخول" : "✓ Used at the door"}</em> : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="rose-order-note no-print">{ar ? "ورّي الـ QR أو الكود على الباب. كل تذكرة بتفوت مرة وحدة." : "Show the QR or the code at the door. Each ticket gets in once."}</p>
          <button type="button" className="atelier-button no-print" onClick={() => window.print()}>{ar ? "اطبعي / احفظي PDF" : "Print / save as PDF"}</button>
        </div>
      )}

      {data.files.length > 0 && (
        <div className="rose-order-files no-print" data-testid="order-files">
          <h2>{ar ? "ملفاتكِ" : "Your files"}</h2>
          <ul>
            {data.files.map((f) => (
              <li key={f.id}>
                <div>
                  <b>{f.name}</b>
                  <span>{[f.productTitle, f.format?.toUpperCase(), size(f.bytes)].filter(Boolean).join(" · ")}</span>
                  <small>{ar ? `باقي ${f.left} من ${data.maxDownloads} تنزيلات` : `${f.left} of ${data.maxDownloads} downloads left`}</small>
                </div>
                <button type="button" className="atelier-button button-dark" disabled={busy === f.id || f.left <= 0} onClick={() => void download(f)}>
                  {busy === f.id ? (ar ? "لحظة…" : "Preparing…") : f.kind === "link" ? (ar ? "افتحي" : "Open") : ar ? "نزّلي" : "Download"}
                </button>
              </li>
            ))}
          </ul>
          {msg ? <p className="rose-form-error" role="alert">{msg}</p> : null}
        </div>
      )}

      {data.items.length > 0 && (
        <details className="rose-order-items no-print">
          <summary>{ar ? "تفاصيل الطلب" : "Order details"}</summary>
          <ul>
            {data.items.map((i, k) => (
              <li key={k}>{i.title}{i.variant ? ` · ${i.variant}` : ""} × {i.quantity}</li>
            ))}
          </ul>
        </details>
      )}
      <p className="no-print"><Link href="/shop">{ar ? "رجوع للمتجر" : "Back to the shop"}</Link></p>
    </section>
  );
}

function TicketQr({ text, label }: { text: string; label: string }) {
  const svg = useMemo(() => {
    try {
      return qrPath(qrMatrix(text), 3);
    } catch {
      return null;
    }
  }, [text]);
  if (!svg) return null;
  return (
    <svg className="rose-order-qr" viewBox={`0 0 ${svg.size} ${svg.size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={svg.size} height={svg.size} fill="#fff" />
      <path d={svg.d} fill="#000" />
    </svg>
  );
}
