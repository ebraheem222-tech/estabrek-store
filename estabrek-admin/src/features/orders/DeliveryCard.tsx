// Files and tickets of an order (digital products / bookings): the shopper's
// private link, WhatsApp/email to send it, downloads and tickets at a glance.
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrderDelivery } from "./useOrderDelivery";
import { Link } from "react-router-dom";
import { cn } from "../../components/ui/cn";
import { getApiErrorMessage } from "../../api/http";
import * as DeliveryAPI from "../../api/fulfillment.api";
import type { OrderDelivery } from "../../api/fulfillment.api";
import { env } from "../../config/env";
import { dateTime, waLink } from "../../lib/orders";
import { toast } from "../../lib/toast";
import { WhatsAppIcon } from "./orderUi";

const TICKET_STATUS: Record<DeliveryAPI.TicketStatus, { label: string; cls: string }> = {
  VALID: { label: "صالحة", cls: "bg-emerald-500/15 text-emerald-200" },
  USED: { label: "دخلت", cls: "bg-sky-500/15 text-sky-200" },
  CANCELLED: { label: "ملغية", cls: "bg-red-500/15 text-red-200" },
};

function fullLink(d: OrderDelivery) {
  if (d.url) return d.url;
  if (!d.path) return null;
  const base = (env.VITE_STOREFRONT_BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}${d.path}` : null;
}

export function DeliveryCard({ orderId, status, onChange }: { orderId: string; status: string; onChange?: () => void }) {
  const qc = useQueryClient();
  const q = useOrderDelivery(orderId, status);
  const [emailEdit, setEmailEdit] = useState<string | null>(null);
  const set = (d: OrderDelivery) => {
    qc.setQueryData(["admin", "orders", "delivery", orderId, status], d);
    onChange?.();
  };
  const release = useMutation({
    mutationFn: () => DeliveryAPI.releaseOrderDelivery(orderId),
    onSuccess: (d) => { set(d); toast.success("انسلّمت للزبونة"); },
    onError: (e) => toast.error("ما انسلّمت", { description: getApiErrorMessage(e) }),
  });
  const email = useMutation({
    mutationFn: (to?: string) => DeliveryAPI.sendOrderDeliveryEmail(orderId, to),
    onSuccess: (d) => {
      set(d);
      setEmailEdit(null);
      if (d.live === false) toast.info("الإيميل انسجّل بس ما انبعت فعلياً", { description: "لازم تضيف RESEND_API_KEY و EMAIL_FROM بالسيرفر." });
      else toast.success(`انبعت لـ ${d.email}`);
    },
    onError: (e) => toast.error("ما انبعت الإيميل", { description: getApiErrorMessage(e) }),
  });
  const newLink = useMutation({
    mutationFn: () => DeliveryAPI.newOrderDeliveryLink(orderId),
    onSuccess: (d) => { set(d); toast.success("انعمل رابط جديد — القديم وقف"); },
    onError: (e) => toast.error("ما انعمل رابط", { description: getApiErrorMessage(e) }),
  });

  const d = q.data;
  if (!d || !d.needed) return null;
  const link = fullLink(d);
  const what = [d.kinds.digital ? "الملفات" : null, d.kinds.booking ? "التذاكر" : null].filter(Boolean).join(" و");
  const first = (d.customerName || "").trim().split(/\s+/)[0] || "";
  const waText = link ? `أهلاً ${first} 🌸\n${d.kinds.booking && !d.kinds.digital ? (d.tickets.length > 1 ? "تذاكرك جاهزة" : "تذكرتك جاهزة") : d.kinds.digital && !d.kinds.booking ? "ملفاتك جاهزة للتنزيل" : "ملفاتك وتذاكرك جاهزة"}:\n${link}\n\nالرابط خاص فيكِ، لا تشاركيه.` : "";
  const wa = link ? waLink(d.phone, waText) : null;
  const copy = () => link && void navigator.clipboard?.writeText(link).then(() => toast.success("انسخ الرابط"));
  const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm disabled:opacity-50";

  return (
    <section className="glass rounded-2xl p-4 sm:p-5" data-testid="delivery-card">
      <h2 className="mb-1 text-base font-semibold text-white">{d.kinds.booking && !d.kinds.digital ? "🎟️" : "⬇️"} {what} للزبونة</h2>

      {d.closed ? (
        <p className="text-sm text-red-300">الطلب مسكّر، فالرابط والتذاكر واقفين.</p>
      ) : !d.released ? (
        <div className="space-y-3">
          <p className="text-[12px] leading-5 text-white/55">بتنسلّم لحالها لما تقبلي الطلب (أو فوراً إذا دفعت أونلاين). إذا وصلك الدفع بطريقة ثانية، سلّميها هلّق:</p>
          <button type="button" disabled={release.isPending} onClick={() => release.mutate()} className={cn(btn, "w-full bg-accent-500/25 text-white hover:bg-accent-500/35")} data-testid="release-now">
            سلّمي {what} هلّق
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[12px] text-white/50">انسلّمت {d.deliveredAt ? dateTime(d.deliveredAt) : ""}</p>
          {link ? (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-surface-925 px-3 py-2">
                <span dir="ltr" className="min-w-0 flex-1 truncate text-xs text-white/70" data-testid="delivery-link">{link}</span>
                <button type="button" onClick={copy} className="shrink-0 text-xs text-accent-300 hover:text-accent-200">نسخ</button>
                <a href={link} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-white/55 hover:text-white">فتح ↗</a>
              </div>
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer" className={cn(btn, "w-full bg-emerald-500 font-semibold text-white hover:bg-emerald-400")}>
                  <WhatsAppIcon className="h-4 w-4" />ابعتي الرابط بالواتساب
                </a>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-amber-300">الرابط جاهز بس عنوان المتجر ناقص (STOREFRONT_URL بالسيرفر).</p>
          )}
          {!d.storefrontUrlSet ? <p className="text-[11px] text-amber-300/90">عشان الرابط يوصل بالإيميل، ضيف STOREFRONT_URL بمتغيرات Railway.</p> : null}

          {/* Email */}
          <div className="rounded-xl border border-white/[0.08] p-3 text-sm">
            {emailEdit !== null ? (
              <div className="flex flex-wrap gap-2">
                <input dir="ltr" type="email" value={emailEdit} onChange={(e) => setEmailEdit(e.target.value)} placeholder="name@example.com" className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white" aria-label="إيميل الزبونة" />
                <button type="button" disabled={!/^\S+@\S+\.\S+$/.test(emailEdit.trim()) || email.isPending} onClick={() => email.mutate(emailEdit.trim())} className={cn(btn, "bg-accent-500 text-white")}>بعت</button>
                <button type="button" onClick={() => setEmailEdit(null)} className="h-10 px-2 text-xs text-white/55">إلغاء</button>
              </div>
            ) : d.email ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white/55">الإيميل:</span>
                <span dir="ltr" className="text-white/85">{d.email}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", d.emailSentAt ? "bg-emerald-500/15 text-emerald-200" : "bg-white/[0.06] text-white/55")}>
                  {d.emailSentAt ? `انبعت ${dateTime(d.emailSentAt)}` : "لسا ما انبعت"}
                </span>
                <span className="ms-auto flex gap-2">
                  <button type="button" disabled={email.isPending} onClick={() => email.mutate(undefined)} className="text-xs text-accent-300 hover:text-accent-200">{d.emailSentAt ? "إعادة إرسال" : "بعت هلّق"}</button>
                  <button type="button" onClick={() => setEmailEdit(d.email ?? "")} className="text-xs text-white/50 hover:text-white">تغيير</button>
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white/55">ما تركت إيميل.</span>
                <button type="button" onClick={() => setEmailEdit("")} className="text-xs text-accent-300 hover:text-accent-200">+ ضيفي إيميل وابعتي</button>
              </div>
            )}
            {!d.emailReady ? <p className="mt-2 text-[11px] text-white/40">الإيميلات بتنبعت فعلياً بس لما يكون Resend مضبوط بالسيرفر.</p> : null}
          </div>
        </div>
      )}

      {d.files.length ? (
        <div className="mt-4">
          <h3 className="mb-1 text-xs text-white/50">الملفات (كل ملف لحد {d.maxDownloads} تنزيلات)</h3>
          <ul className="space-y-1 text-sm">
            {d.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-white/85">{f.kind === "link" ? "🔗" : "📄"} {f.name}</span>
                <span className={cn("shrink-0 text-[11px]", f.downloads ? "text-emerald-300" : "text-white/40")}>{f.downloads ? `نزّلته ${f.downloads}×` : "لسا ما نزّلته"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : d.kinds.digital ? (
        <p className="mt-4 text-xs text-amber-300">المنتج الرقمي ما عليه ملفات! ضيفيها من صفحة المنتج.</p>
      ) : null}

      {d.tickets.length ? (
        <div className="mt-4">
          <h3 className="mb-1 flex items-center justify-between text-xs text-white/50">
            <span>التذاكر ({d.tickets.length})</span>
            <Link to="/admin/tickets" className="text-accent-300 hover:text-accent-200">صفحة الدخول ←</Link>
          </h3>
          <ul className="space-y-1.5 text-sm">
            {d.tickets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5">
                <span dir="ltr" className="font-mono text-white">{t.code}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-white/55">{[t.title, t.label].filter(Boolean).join(" · ")}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", TICKET_STATUS[t.status].cls)}>{TICKET_STATUS[t.status].label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {d.released && !d.closed ? (
        <button
          type="button"
          disabled={newLink.isPending}
          onClick={() => { if (window.confirm("رابط جديد؟ الرابط القديم رح يوقف (مثلاً إذا انشارك بالغلط).")) newLink.mutate(); }}
          className="mt-4 text-[11px] text-white/40 hover:text-white/70"
        >
          رابط جديد (يوقف القديم)
        </button>
      ) : null}
    </section>
  );
}
