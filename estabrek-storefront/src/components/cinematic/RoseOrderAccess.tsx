"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { qrMatrix, qrPath } from "@/lib/qr";
import { attachmentName, licenceTimeLeft } from "@/lib/licenceTime";
import { useLanguage } from "./Language";
import { useNames } from "@/store/storeIdentity";
import { tr } from "@/lib/words";
import type { Lang } from "@/lib/i18n";
import { toneAr } from "@/lib/words";

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
type AccessCode = { code: string; title: string; redeemNote: string | null; orderItemId: string | null };
type AccessLicence = { id: string; title: string; serial: string; expiresAt: string; expired: boolean; downloadsLeft: number; maxDownloads: number; ready: boolean; devices?: { used: number; max: number } };
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
  /** Game keys, gift cards…: one per piece. */
  codes?: AccessCode[];
  /** Protected products: her serial and the encrypted copy to download. */
  licences?: AccessLicence[];
  /** The Windows launcher (binds the copy to her PC), when the shop offers it. */
  launcher?: { version: string; bytes: number; path: string } | null;
};

function size(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function when(start: string | null, end: string | null, lang: Lang) {
  if (!start) return null;
  try {
    const tz = "Asia/Jerusalem";
    const s = new Date(start);
    const day = new Intl.DateTimeFormat(lang, { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(s);
    const t = (d: Date) => new Intl.DateTimeFormat(lang, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    const comma = lang === "ar" ? "، " : ", ";
    return end ? `${day}${comma}${t(s)}–${t(new Date(end))}` : `${day}${comma}${t(s)}`;
  } catch {
    return null;
  }
}

/** The shopper's private order page: her downloads and tickets (from the link in her email / WhatsApp). */
export function RoseOrderAccess({ token }: { token: string }) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const n = useNames();
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
      if (res.status === 429) throw new Error(tr(lang, `وصلتِ للحد (${data?.maxDownloads ?? ""} تنزيلات لهالملف). تواصلي معنا إذا بدكِ كمان.`, "You've reached the download limit for this file. Contact us if you need more."));
      if (res.status === 410) throw new Error(tr(lang, "الطلب ملغي.", "This order was cancelled."));
      if (!res.ok || !body?.url) throw new Error(tr(lang, "ما قدرنا نجهّز الملف. جرّبي كمان شوي.", "We couldn't prepare the file. Try again shortly."));
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
        <span className="atelier-eyebrow">{tr(lang, "طلبكِ", "YOUR ORDER")}</span>
        <h1>{tr(lang, "لحظة…", "One moment…")}</h1>
      </section>
    );
  }
  if (state !== "ready" || !data) {
    return (
      <section className="rose-account rose-order-access" data-testid="order-access">
        <span className="atelier-eyebrow">{tr(lang, "طلبكِ", "YOUR ORDER")}</span>
        <h1>{state === "gone" ? (tr(lang, "هالرابط مش شغّال.", "This link doesn't work.")) : tr(lang, "ما قدرنا نفتح الطلب.", "We couldn't open the order.")}</h1>
        <p>{state === "gone" ? (tr(lang, "يمكن انعمل رابط جديد إلكِ. تواصلي معنا ونبعتلكِ ياه.", "A new link may have been made for you. Contact us and we'll send it.")) : tr(lang, "جرّبي كمان شوي.", "Please try again shortly.")}</p>
        <p><Link href="/contact">{tr(lang, "تواصلي معنا", "Contact us")}</Link></p>
      </section>
    );
  }

  const live = data.tickets.filter((t) => t.status !== "CANCELLED");
  const codes = data.codes ?? [];
  // Codes of the same product together, with how to use them once.
  const codeGroups = codes.reduce<Array<{ title: string; note: string | null; codes: string[] }>>((out, c) => {
    const g = out.find((x) => x.title === c.title && x.note === c.redeemNote);
    if (g) g.codes.push(c.code);
    else out.push({ title: c.title, note: c.redeemNote, codes: [c.code] });
    return out;
  }, []);
  return (
    <section className="rose-account rose-order-access" data-testid="order-access">
      <span className="atelier-eyebrow">{tr(lang, `طلب رقم ${data.shortId}`, "ORDER {0}", [data.shortId])}</span>
      <h1>{data.closed ? (tr(lang, "هالطلب انلغى.", "This order was cancelled.")) : data.firstName ? (tr(lang, `أهلاً ${data.firstName}.`, "Hi {0}.", [data.firstName])) : tr(lang, "طلبكِ.", "Your order.")}</h1>
      {data.closed ? (
        <p>{tr(lang, "الملفات والتذاكر واقفة. إذا في غلط تواصلي معنا.", "The files and tickets are no longer active. Contact us if this is a mistake.")}</p>
      ) : !data.delivered ? (
        <p>{tr(lang, "لسا ما تأكد الطلب. أول ما نأكده بتطلع ملفاتكِ وأكوادكِ وتذاكركِ هون.", "Your order isn't confirmed yet. Your files, codes and tickets appear here once it is.")}</p>
      ) : (
        <p className="no-print">{tr(lang, "هاي صفحتكِ الخاصة. لا تشاركي الرابط مع حدا.", "This page is yours alone — please don't share the link.")}</p>
      )}

      {live.length > 0 && (
        <div className="rose-order-tickets" data-testid="order-tickets">
          <h2>{live.length > 1 ? tr(lang, `تذاكركِ (${live.length})`, "Your tickets ({0})", [live.length]) : tr(lang, "تذكرتكِ", "Your ticket")}</h2>
          <ul>
            {live.map((t) => (
              <li key={t.code} className={t.status === "USED" ? "used" : undefined}>
                <TicketQr text={t.qr || t.code} label={tr(lang, `رمز QR للتذكرة ${t.code}`, "QR for ticket {0}", [t.code])} />
                <div className="rose-order-ticket-info">
                  <b>{t.title}{t.label ? ` · ${t.label}` : ""}</b>
                  {t.startsAt ? <span suppressHydrationWarning>🗓️ {when(t.startsAt, t.endsAt, lang)}</span> : null}
                  {t.location ? <span>📍 {t.location}</span> : null}
                  {t.holderName ? <span>👤 {t.holderName}</span> : null}
                  <code dir="ltr" data-testid="ticket-code">{t.code}</code>
                  {t.status === "USED" ? <em>{tr(lang, "✓ استُخدمت للدخول", "✓ Used at the door")}</em> : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="rose-order-note no-print">{tr(lang, "ورّي الـ QR أو الكود على الباب. كل تذكرة بتفوت مرة وحدة.", "Show the QR or the code at the door. Each ticket gets in once.")}</p>
          <button type="button" className="atelier-button no-print" onClick={() => window.print()}>{tr(lang, "اطبعي / احفظي PDF", "Print / save as PDF")}</button>
        </div>
      )}

      {codes.length > 0 && (
        <div className="rose-order-codes" data-testid="order-codes">
          <h2>{codes.length > 1 ? tr(lang, `أكوادكِ (${codes.length})`, "Your codes ({0})", [codes.length]) : tr(lang, "كودكِ", "Your code")}</h2>
          {codeGroups.map((g) => (
            <div key={`${g.title}|${g.note ?? ""}`} className="rose-order-code-group">
              <b>{g.title}</b>
              <ul>
                {g.codes.map((c) => (
                  <CodeLine key={c} code={c} ar={ar} />
                ))}
              </ul>
              {g.note ? <p className="rose-order-code-how">{tr(lang, "طريقة التفعيل: ", "How to redeem: ")}{g.note}</p> : null}
            </div>
          ))}
          <p className="rose-order-note">{tr(lang, "كل كود بيشتغل مرة وحدة. إذا ما زبط معكِ، تواصلي معنا وابعتي صورة للرسالة اللي طلعت.", "Each code works once. If one doesn't work, contact us with a screenshot of the message you got.")}</p>
        </div>
      )}

      {(data.licences ?? []).length > 0 && (
        <div className="rose-order-licences" data-testid="order-licences">
          <h2>{ar ? toneAr((data.licences ?? []).length > 1 ? `نسخكِ المحمية (${(data.licences ?? []).length})` : "نسختكِ المحمية") : tr(lang, "", "Your protected copy")}</h2>
          <ul>
            {(data.licences ?? []).map((l) => (
              <LicenceItem key={l.id} l={l} token={token} ar={ar} shortId={data.shortId} onDownloaded={(left) => setData((d) => (d ? { ...d, licences: (d.licences ?? []).map((x) => (x.id === l.id ? { ...x, downloadsLeft: left } : x)) } : d))} />
            ))}
          </ul>
          {data.launcher ? (
            <div className="rose-order-launcher" data-testid="order-launcher">
              <b>{tr(lang, `💻 برنامج ${n.store} (ويندوز)`, "💻 {0} launcher (Windows)", [n.store])}</b>
              <ol>
                <li>{tr(lang, "نزّلي النسخة المشفّرة من فوق.", "Download the encrypted copy above.")}</li>
                <li>
                  <a href={`${apiBaseClient()}${data.launcher.path}`} data-testid="launcher-link">{tr(lang, `نزّلي برنامج التشغيل (${data.launcher.version})`, "Download the launcher ({0})", [data.launcher.version])}</a>
                  {tr(lang, " وافتحيه. إذا ويندوز حذّر، اختاري «More info» وبعدين «Run anyway».", " and open it. If Windows warns you, choose “More info”, then “Run anyway”.")}
                </li>
                <li>{tr(lang, "اضغطي «إضافة منتج»، اختاري الملف والصقي السيريال: بيتفعّل على جهازكِ وبتشغّليه من هناك.", "Click “إضافة منتج”, pick the file and paste the serial: it activates on your PC and runs from there.")}</li>
              </ol>
            </div>
          ) : null}
          <p className="rose-order-note">
            {tr(lang, "بدون البرنامج: افتحي الملف بـ \u20667-Zip\u2069 أو WinRAR، ولما يطلب كلمة سر الصقي السيريال. (فتح الملفات المضغوطة العادي بويندوز ما بيفتح الملفات المشفّرة.) كل نسخة فيها علامة طلبكِ، فلا تشاركيها.", "Without the launcher: open the file with 7-Zip or WinRAR and paste the serial when it asks for a password (Windows' own ZIP viewer can't open encrypted files). Each copy carries your order's mark, so please don't share it.")}
          </p>
        </div>
      )}

      {data.files.length > 0 && (
        <div className="rose-order-files no-print" data-testid="order-files">
          <h2>{tr(lang, "ملفاتكِ", "Your files")}</h2>
          <ul>
            {data.files.map((f) => (
              <li key={f.id}>
                <div>
                  <b>{f.name}</b>
                  <span>{[f.productTitle, f.format?.toUpperCase(), size(f.bytes)].filter(Boolean).join(" · ")}</span>
                  <small>{tr(lang, `باقي ${f.left} من ${data.maxDownloads} تنزيلات`, "{0} of {1} downloads left", [f.left, data.maxDownloads])}</small>
                </div>
                <button type="button" className="atelier-button button-dark" disabled={busy === f.id || f.left <= 0} onClick={() => void download(f)}>
                  {busy === f.id ? (tr(lang, "لحظة…", "Preparing…")) : f.kind === "link" ? (tr(lang, "افتحي", "Open")) : tr(lang, "نزّلي", "Download")}
                </button>
              </li>
            ))}
          </ul>
          {msg ? <p className="rose-form-error" role="alert">{msg}</p> : null}
        </div>
      )}

      {data.items.length > 0 && (
        <details className="rose-order-items no-print">
          <summary>{tr(lang, "تفاصيل الطلب", "Order details")}</summary>
          <ul>
            {data.items.map((i, k) => (
              <li key={k}>{i.title}{i.variant ? ` · ${i.variant}` : ""} × {i.quantity}</li>
            ))}
          </ul>
        </details>
      )}
      <p className="no-print"><Link href="/shop">{tr(lang, "رجوع للمتجر", "Back to the shop")}</Link></p>
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

function CodeLine({ code, ar }: { code: string; ar: boolean }) {
  const { language: lang } = useLanguage();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <li>
      <code dir="ltr" data-testid="order-code">{code}</code>
      <button type="button" className="atelier-button button-dark no-print" onClick={() => void copy()} aria-label={tr(lang, `انسخي الكود ${code}`, "Copy code {0}", [code])}>
        {copied ? (tr(lang, "✓ انسخ", "✓ Copied")) : tr(lang, "انسخي", "Copy")}
      </button>
    </li>
  );
}

function LicenceItem({ l, token, ar, shortId, onDownloaded }: { l: AccessLicence; token: string; ar: boolean; shortId: string; onDownloaded: (left: number) => void }) {
  const { language: lang } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const left = licenceTimeLeft(l.expiresAt, lang);
  const over = l.expired || !left;
  const download = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${apiBaseClient()}/orders/access/${encodeURIComponent(token)}/licences/${encodeURIComponent(l.id)}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const code = String(body?.error ?? "");
        throw new Error(
          code === "DOWNLOAD_LIMIT"
            ? tr(lang, `وصلتِ للحد (${l.maxDownloads} تنزيلات). تواصلي معنا إذا بدكِ كمان.`, "You've reached the download limit. Contact us if you need more.")
            : code === "LICENCE_EXPIRED"
              ? tr(lang, "انتهت مدة التنزيل. تواصلي معنا لنجدّدها.", "The download window is over. Contact us to renew it.")
              : code === "LICENCE_STOPPED"
                ? tr(lang, "هالسيريال موقوف. تواصلي معنا.", "This serial was stopped. Contact us.")
                : code === "NOT_READY"
                  ? tr(lang, "الملف لسا بيتجهّز. جرّبي كمان شوي.", "The file isn't ready yet. Try again shortly.")
                  : tr(lang, "ما قدرنا نجهّز الملف. جرّبي كمان شوي.", "We couldn't prepare the file. Try again shortly."),
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachmentName(res.headers.get("content-disposition"), `estabrek-${shortId}.zip`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      onDownloaded(Math.max(0, l.downloadsLeft - 1));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <li data-testid="order-licence">
      <b>{l.title}</b>
      <div className="rose-order-serial">
        <span>{tr(lang, "السيريال (كلمة السر):", "Serial (the password):")}</span>
        <ul>
          <CodeLine code={l.serial} ar={ar} />
        </ul>
      </div>
      <small data-testid="licence-window">
        {over
          ? tr(lang, "انتهت مدة التنزيل. تواصلي معنا لنجدّدها.", "The download window is over. Contact us to renew it.")
          : !l.ready
            ? tr(lang, "الملف لسا بيتجهّز، بنبلّغكِ لما يجهز.", "The file is being prepared; we'll let you know.")
            : tr(lang, `${left} للتنزيل · ${l.downloadsLeft} من ${l.maxDownloads} تنزيلات باقية`, "{0} · {1} of {2} downloads left", [left, l.downloadsLeft, l.maxDownloads])}
      </small>
      {l.devices ? (
        <small data-testid="licence-devices">
          {tr(lang, `💻 مفعّل على ${l.devices.used} من ${l.devices.max} ${l.devices.max === 1 ? "جهاز" : "أجهزة"}`, "💻 Active on {0} of {1} PC{2}", [l.devices.used, l.devices.max, l.devices.max === 1 ? "" : "s"])}
        </small>
      ) : null}
      {!over && l.ready ? (
        <button type="button" className="atelier-button button-dark no-print" disabled={busy || l.downloadsLeft <= 0} onClick={() => void download()}>
          {busy ? (tr(lang, "لحظة، عم نجهّز نسختكِ…", "Preparing your copy…")) : tr(lang, "نزّلي النسخة المشفّرة", "Download the encrypted copy")}
        </button>
      ) : null}
      {msg ? <p className="rose-form-error" role="alert">{msg}</p> : null}
    </li>
  );
}
