// Files, codes and tickets of an order (digital products / bookings): the
// shopper's private link, WhatsApp/email to send it, downloads, codes and
// tickets at a glance.
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
import { RevealedCode } from "../catalog/composer/RevealedCode";
import { useReveal } from "../catalog/composer/useReveal";
import { CODE_STATUS, canReplace, codesCount, masked } from "../catalog/composer/codesText";
import * as ProtectedAPI from "../../api/protected.api";
import type { OrderLicence } from "../../api/protected.api";
import { downloadsText, licenceState, timeLeft } from "../catalog/composer/protectedText";

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
  const replace = useMutation({
    mutationFn: (codeId: string) => DeliveryAPI.replaceOrderCode(orderId, codeId),
    onSuccess: (d) => {
      set(d);
      if (d.codesMissing) toast.error("انلغى الكود بس ما في كود ثاني", { description: "ضيفي أكواد للمنتج، وبعدين «سلّمي الناقص»." });
      else toast.success("انلغى الكود وأخدت الزبونة واحد جديد");
    },
    onError: (e) => toast.error("ما انبدّل", { description: getApiErrorMessage(e) }),
  });

  const d = q.data;
  if (!d || !d.needed) return null;
  const link = fullLink(d);
  const codes = d.codes ?? [];
  const hasFiles = d.kinds.digital && (d.files.length > 0 || (!d.sellsCodes && !d.sellsLicences));
  const what = [hasFiles ? "الملفات" : null, d.sellsLicences ? "النسخ المحمية" : null, d.sellsCodes ? "الأكواد" : null, d.kinds.booking ? "التذاكر" : null].filter(Boolean).join(" و");
  const first = (d.customerName || "").trim().split(/\s+/)[0] || "";
  const ready =
    d.kinds.booking && !d.kinds.digital
      ? d.tickets.length > 1 ? "تذاكرك جاهزة" : "تذكرتك جاهزة"
      : d.kinds.digital && !d.kinds.booking && !d.sellsCodes
        ? "ملفاتك جاهزة للتنزيل"
        : `${[hasFiles ? "ملفاتك" : null, d.sellsCodes ? (codes.length > 1 ? "أكوادك" : "كودك") : null, d.kinds.booking ? "تذاكرك" : null].filter(Boolean).join(" و")} ${d.sellsCodes && !hasFiles && !d.kinds.booking && codes.length <= 1 ? "جاهز" : "جاهزة"}`;
  const waText = link ? `أهلاً ${first} 🌸\n${ready}:\n${link}\n\nالرابط خاص فيكِ، لا تشاركيه.` : "";
  const wa = link ? waLink(d.phone, waText) : null;
  const copy = () => link && void navigator.clipboard?.writeText(link).then(() => toast.success("انسخ الرابط"));
  const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm disabled:opacity-50";

  return (
    <section className="glass rounded-2xl p-4 sm:p-5" data-testid="delivery-card">
      <h2 className="mb-1 text-base font-semibold text-white">{d.kinds.booking && !d.kinds.digital ? "🎟️" : d.sellsLicences && !hasFiles ? "🔒" : d.sellsCodes && !hasFiles ? "🔑" : "⬇️"} {what} للزبونة</h2>

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
      ) : d.kinds.digital && !d.sellsCodes && !d.sellsLicences ? (
        <p className="mt-4 text-xs text-amber-300">المنتج الرقمي ما عليه ملفات! ضيفيها من صفحة المنتج.</p>
      ) : null}

      {d.sellsLicences ? <OrderLicences orderId={orderId} licences={d.licences ?? []} released={d.released} closed={d.closed} /> : null}

      {d.sellsCodes ? (
        <div className="mt-4" data-testid="delivery-codes">
          <h3 className="mb-1 text-xs text-white/50">الأكواد ({codes.filter((c) => c.status === "delivered").length})</h3>
          {d.released && d.codesMissing ? (
            <div className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-200" data-testid="codes-missing">
              ناقص {codesCount(d.codesMissing)} — الأكواد خلصت. ضيفي أكواد للمنتج وبعدين:
              {!d.closed ? (
                <button type="button" disabled={release.isPending} onClick={() => release.mutate()} className="ms-2 rounded-lg bg-white/10 px-2 py-1 text-white hover:bg-white/15">
                  سلّمي الناقص
                </button>
              ) : null}
            </div>
          ) : null}
          {codes.length ? (
            <ul className="space-y-1.5 text-sm">
              {codes.map((c) => (
                <OrderCodeRow
                  key={c.id}
                  c={c}
                  canSwap={canReplace(c, d.closed)}
                  busy={replace.isPending}
                  reveal={() => DeliveryAPI.revealOrderCode(orderId, c.id)}
                  onReplace={() => {
                    if (window.confirm(`الكود ${masked(c.last4)} ما زبط معها؟ بنلغيه وبتاخد الكود اللي بعده من القائمة.`)) replace.mutate(c.id);
                  }}
                />
              ))}
            </ul>
          ) : !d.released ? (
            <p className="text-xs text-white/45">بتاخد كود لكل قطعة لما تنسلّم.</p>
          ) : null}
        </div>
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

function OrderCodeRow({ c, canSwap, busy, reveal, onReplace }: { c: NonNullable<OrderDelivery["codes"]>[number]; canSwap: boolean; busy: boolean; reveal: () => Promise<string>; onReplace: () => void }) {
  const [shown, setShown] = useReveal();
  const show = async () => {
    try {
      setShown(await reveal());
    } catch (e) {
      toast.error("ما انفتح الكود", { description: getApiErrorMessage(e) });
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5" data-testid="order-code">
      {shown ? <RevealedCode code={shown} onHide={() => setShown(null)} /> : <span dir="ltr" className="font-mono text-white">{masked(c.last4)}</span>}
      <span className={cn("rounded-full px-2 py-0.5 text-[11px]", CODE_STATUS[c.status].cls)}>{c.status === "delivered" ? "معها" : CODE_STATUS[c.status].label}</span>
      <span className="ms-auto flex items-center gap-2">
        {!shown ? (
          <button type="button" onClick={() => void show()} className="text-xs text-white/60 hover:text-white">
            إظهار
          </button>
        ) : null}
        {canSwap ? (
          <button type="button" disabled={busy} onClick={onReplace} className="text-xs text-amber-300 hover:text-amber-200 disabled:opacity-50">
            تبديل
          </button>
        ) : null}
      </span>
      {/* The card is narrow: what it is and whether she looked, on its own line. */}
      <span className="basis-full text-xs text-white/55">
        {c.title}
        {c.status === "delivered" ? <span className={c.viewedAt ? "text-emerald-300/80" : "text-white/40"}> · {c.viewedAt ? `شافته ${dateTime(c.viewedAt)}` : "لسا ما شافته"}</span> : null}
      </span>
    </li>
  );
}

/** A protected product's serials: last 4 until revealed, the window, downloads; renew, stop, restore. */
function OrderLicences({ orderId, licences, released, closed }: { orderId: string; licences: OrderLicence[]; released: boolean; closed: boolean }) {
  const qc = useQueryClient();
  const reset = useMutation({
    mutationFn: ({ licenceId, activationId }: { licenceId: string; activationId: string }) => ProtectedAPI.resetActivation(orderId, licenceId, activationId),
    onSuccess: () => {
      toast.success("انشال الجهاز: بتقدر تفعّل على جهاز ثاني");
      void qc.invalidateQueries({ queryKey: ["admin", "orders", "delivery", orderId] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const act = useMutation({
    mutationFn: ({ id, what }: { id: string; what: "renew" | "stop" | "restore" }) =>
      what === "renew" ? ProtectedAPI.renewLicence(orderId, id) : what === "stop" ? ProtectedAPI.stopLicence(orderId, id) : ProtectedAPI.restoreLicence(orderId, id),
    onSuccess: (_r, v) => {
      toast.success(v.what === "renew" ? "تجدّدت المدة ورجعت التنزيلات" : v.what === "stop" ? "وقف السيريال" : "رجع السيريال يشتغل");
      void qc.invalidateQueries({ queryKey: ["admin", "orders", "delivery", orderId] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  return (
    <div className="mt-4" data-testid="delivery-licences">
      <h3 className="mb-1 text-xs text-white/50">النسخ المحمية ({licences.filter((l) => l.status === "active").length})</h3>
      {licences.length ? (
        <ul className="space-y-1.5 text-sm">
          {licences.map((l) => (
            <LicenceRow
              key={l.id}
              l={l}
              closed={closed}
              busy={act.isPending || reset.isPending}
              reveal={() => ProtectedAPI.revealLicence(orderId, l.id)}
              onReset={(activationId) => {
                if (window.confirm("شيلي هالجهاز من السيريال؟ البرنامج عليه بيوقف بآخر فحص، وبتقدر تفعّل على جهاز ثاني.")) reset.mutate({ licenceId: l.id, activationId });
              }}
              onAct={(what) => {
                if (what === "stop" && !window.confirm(`توقيف السيريال ${masked(l.last4)}؟ ما رح تقدر تنزّل فيه بعد هيك (مثلاً إذا انشارك).`)) return;
                act.mutate({ id: l.id, what });
              }}
            />
          ))}
        </ul>
      ) : !released ? (
        <p className="text-xs text-white/45">كل قطعة بتاخد سيريال لما تنسلّم الطلبية (دفع أونلاين أو قبول).</p>
      ) : null}
    </div>
  );
}

function LicenceRow({ l, closed, busy, reveal, onAct, onReset }: { l: OrderLicence; closed: boolean; busy: boolean; reveal: () => Promise<string>; onAct: (what: "renew" | "stop" | "restore") => void; onReset: (activationId: string) => void }) {
  const [shown, setShown] = useReveal();
  const state = licenceState(l);
  const left = timeLeft(l.expiresAt);
  const show = async () => {
    try {
      setShown(await reveal());
    } catch (e) {
      toast.error("ما انفتح السيريال", { description: getApiErrorMessage(e) });
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5" data-testid="order-licence">
      {shown ? <RevealedCode code={shown} onHide={() => setShown(null)} /> : <span dir="ltr" className="font-mono text-white">{masked(l.last4)}</span>}
      <span className={cn("rounded-full px-2 py-0.5 text-[11px]", state.cls)}>{state.label}</span>
      <span className="ms-auto flex items-center gap-2">
        {!shown ? (
          <button type="button" onClick={() => void show()} className="text-xs text-white/60 hover:text-white">
            إظهار
          </button>
        ) : null}
        {!closed && l.status === "active" ? (
          <>
            <button type="button" disabled={busy} onClick={() => onAct("renew")} className="text-xs text-accent-300 hover:text-accent-200 disabled:opacity-50" title="مدة جديدة وكل التنزيلات من أول">
              تجديد
            </button>
            <button type="button" disabled={busy} onClick={() => onAct("stop")} className="text-xs text-red-300 hover:text-red-200 disabled:opacity-50">
              توقيف
            </button>
          </>
        ) : null}
        {!closed && l.status === "revoked" && l.revokedReason === "owner" ? (
          <button type="button" disabled={busy} onClick={() => onAct("restore")} className="text-xs text-emerald-300 hover:text-emerald-200 disabled:opacity-50">
            رجّعيه
          </button>
        ) : null}
      </span>
      <span className="basis-full text-xs text-white/55">
        {l.title} · {downloadsText(l.downloads, l.maxDownloads)}
        {l.status === "active" ? <span className="text-white/40"> · {left ?? "انتهت مدة التنزيل"}</span> : null}
      </span>
      {l.activations?.length ? (
        <ul className="basis-full space-y-1" data-testid="licence-devices">
          {l.activations.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 text-[11px] text-white/55">
              <span>💻 {a.deviceName || "جهاز"}</span>
              <span className="text-white/35">· آخر مرة {dateTime(a.lastSeenAt)}{a.appVersion ? ` · v${a.appVersion}` : ""}</span>
              {a.status === "active" ? (
                !closed ? (
                  <button type="button" disabled={busy} onClick={() => onReset(a.id)} className="ms-auto text-amber-300 hover:text-amber-200 disabled:opacity-50">
                    شيلي الجهاز
                  </button>
                ) : null
              ) : (
                <span className="ms-auto text-white/35">انشال</span>
              )}
            </li>
          ))}
        </ul>
      ) : l.status === "active" ? (
        <span className="basis-full text-[11px] text-white/35">مش مفعّل على أي جهاز بعد (لحد {l.maxDevices ?? 1})</span>
      ) : null}
    </li>
  );
}
