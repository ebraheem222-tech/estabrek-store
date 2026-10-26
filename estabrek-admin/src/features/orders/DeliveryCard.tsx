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
import { adminLang, type Lang } from "../../lib/lang";
import type { Audience } from "../../lib/storeIdentity";
import { tr } from "@/lib/words";

const TICKET_STATUS: Record<DeliveryAPI.TicketStatus, { label: string; cls: string }> = {
  VALID: { label: tr("صالحة", "Valid"), cls: "bg-emerald-500/15 text-emerald-200" },
  USED: { label: tr("دخلت", "Checked in"), cls: "bg-sky-500/15 text-sky-200" },
  CANCELLED: { label: tr("ملغية", "Cancelled"), cls: "bg-red-500/15 text-red-200" },
};

type Kinds = { digital: boolean; booking: boolean; files: boolean; codes: number | null; tickets: number };

/** The WhatsApp note with the shopper's private link, in their language and the store's voice. */
export function linkMessage(lang: Lang, her: boolean, first: string, link: string, k: Kinds) {
  const hi = `${lang === "en" ? "Hi" : lang === "he" ? "היי" : "أهلاً"}${first ? ` ${first}` : ""} ${her ? "🌸" : "👋"}`;
  const onlyTickets = k.booking && !k.digital;
  const onlyFiles = k.digital && !k.booking && k.codes == null;
  const manyTickets = k.tickets > 1;
  const manyCodes = (k.codes ?? 0) > 1;
  const oneCodeOnly = k.codes != null && !k.files && !k.booking && !manyCodes;
  let ready: string;
  let note: string;
  if (lang === "en") {
    ready = onlyTickets ? (manyTickets ? "Your tickets are ready" : "Your ticket is ready")
      : onlyFiles ? "Your files are ready to download"
      : `Your ${[k.files ? "files" : null, k.codes != null ? (manyCodes ? "codes" : "code") : null, k.booking ? "tickets" : null].filter(Boolean).join(" and ")} ${oneCodeOnly ? "is" : "are"} ready`;
    note = "This link is just for you, please don't share it.";
  } else if (lang === "he") {
    ready = onlyTickets ? (manyTickets ? "הכרטיסים שלך מוכנים" : "הכרטיס שלך מוכן")
      : onlyFiles ? "הקבצים שלך מוכנים להורדה"
      : `${[k.files ? "הקבצים" : null, k.codes != null ? (manyCodes ? "הקודים" : "הקוד") : null, k.booking ? "הכרטיסים" : null].filter(Boolean).join(" ו")} שלך ${oneCodeOnly ? "מוכן" : "מוכנים"}`;
    note = "הקישור אישי, נא לא לשתף אותו.";
  } else {
    ready = onlyTickets ? (manyTickets ? "تذاكرك جاهزة" : "تذكرتك جاهزة")
      : onlyFiles ? "ملفاتك جاهزة للتنزيل"
      : `${[k.files ? "ملفاتك" : null, k.codes != null ? (manyCodes ? "أكوادك" : "كودك") : null, k.booking ? "تذاكرك" : null].filter(Boolean).join(" و")} ${oneCodeOnly ? "جاهز" : "جاهزة"}`;
    note = her ? "الرابط خاص فيكِ، لا تشاركيه." : "الرابط خاص فيك، لا تشاركه.";
  }
  return `${hi}\n${ready}:\n${link}\n\n${note}`;
}

function fullLink(d: OrderDelivery) {
  if (d.url) return d.url;
  if (!d.path) return null;
  const base = (env.VITE_STOREFRONT_BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}${d.path}` : null;
}

export function DeliveryCard({ orderId, status, onChange, shopperLang, audience }: { orderId: string; status: string; onChange?: () => void; shopperLang?: Lang; audience?: Audience }) {
  const qc = useQueryClient();
  const q = useOrderDelivery(orderId, status);
  const [emailEdit, setEmailEdit] = useState<string | null>(null);
  const set = (d: OrderDelivery) => {
    qc.setQueryData(["admin", "orders", "delivery", orderId, status], d);
    onChange?.();
  };
  const release = useMutation({
    mutationFn: () => DeliveryAPI.releaseOrderDelivery(orderId),
    onSuccess: (d) => { set(d); toast.success(tr("انسلّمت للزبون", "Delivered to the customer")); },
    onError: (e) => toast.error(tr("ما انسلّمت", "Not delivered"), { description: getApiErrorMessage(e) }),
  });
  const email = useMutation({
    mutationFn: (to?: string) => DeliveryAPI.sendOrderDeliveryEmail(orderId, to),
    onSuccess: (d) => {
      set(d);
      setEmailEdit(null);
      if (d.live === false) toast.info(tr("الإيميل انسجّل بس ما انبعت فعلياً", "The email was logged but not actually sent"), { description: tr("لازم ينضاف RESEND_API_KEY و EMAIL_FROM بالسيرفر.", "Add RESEND_API_KEY and EMAIL_FROM on the server.") });
      else toast.success(tr(`انبعت لـ ${d.email}`, "Sent to {0}", [d.email]));
    },
    onError: (e) => toast.error(tr("ما انبعت الإيميل", "The email wasn't sent"), { description: getApiErrorMessage(e) }),
  });
  const newLink = useMutation({
    mutationFn: () => DeliveryAPI.newOrderDeliveryLink(orderId),
    onSuccess: (d) => { set(d); toast.success(tr("انعمل رابط جديد — القديم وقف", "A new link was made — the old one stopped")); },
    onError: (e) => toast.error(tr("ما انعمل رابط", "No link was made"), { description: getApiErrorMessage(e) }),
  });
  const replace = useMutation({
    mutationFn: (codeId: string) => DeliveryAPI.replaceOrderCode(orderId, codeId),
    onSuccess: (d) => {
      set(d);
      if (d.codesMissing) toast.error(tr("انلغى الكود بس ما في كود ثاني", "The code was cancelled but there's no other code"), { description: tr("لازم تنضاف أكواد للمنتج، وبعدين «تسليم الناقص».", "Add codes to the product, then “Deliver what's missing”.") });
      else toast.success(tr("انلغى الكود وأخد الزبون واحد جديد", "The code was cancelled and the customer got a new one"));
    },
    onError: (e) => toast.error(tr("ما انبدّل", "Not swapped"), { description: getApiErrorMessage(e) }),
  });

  const d = q.data;
  if (!d || !d.needed) return null;
  const link = fullLink(d);
  const codes = d.codes ?? [];
  const hasFiles = d.kinds.digital && (d.files.length > 0 || (!d.sellsCodes && !d.sellsLicences));
  const what = [hasFiles ? tr("الملفات", "files") : null, d.sellsLicences ? tr("النسخ المحمية", "protected copies") : null, d.sellsCodes ? tr("الأكواد", "codes") : null, d.kinds.booking ? tr("التذاكر", "tickets") : null].filter(Boolean).join(tr(" و", " and "));
  const first = (d.customerName || "").trim().split(/\s+/)[0] || "";
  const kinds: Kinds = { digital: d.kinds.digital, booking: d.kinds.booking, files: hasFiles, codes: d.sellsCodes ? codes.length : null, tickets: d.tickets.length };
  const waText = link ? linkMessage(shopperLang ?? adminLang(), (audience ?? "women") === "women", first, link, kinds) : "";
  const wa = link ? waLink(d.phone, waText) : null;
  const copy = () => link && void navigator.clipboard?.writeText(link).then(() => toast.success(tr("انسخ الرابط", "Link copied")));
  const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm disabled:opacity-50";

  return (
    <section className="glass rounded-2xl p-4 sm:p-5" data-testid="delivery-card">
      <h2 className="mb-1 text-base font-semibold text-white">{d.kinds.booking && !d.kinds.digital ? "🎟️" : d.sellsLicences && !hasFiles ? "🔒" : d.sellsCodes && !hasFiles ? "🔑" : "⬇️"} {tr(`${what} للزبون`, "For the customer: {0}", [what])}</h2>

      {d.closed ? (
        <p className="text-sm text-red-300">{tr("الطلب مسكّر، فالرابط والتذاكر واقفين.", "The order is closed, so the link and tickets are stopped.")}</p>
      ) : !d.released ? (
        <div className="space-y-3">
          <p className="text-[12px] leading-5 text-white/55">{tr("بتنسلّم لحالها لما ينقبل الطلب (أو فوراً إذا الدفع أونلاين). إذا وصل الدفع بطريقة ثانية، التسليم من هون:", "Delivered by itself once the order is accepted (or right away when paid online). If payment came another way, deliver it now:")}</p>
          <button type="button" disabled={release.isPending} onClick={() => release.mutate()} className={cn(btn, "w-full bg-accent-500/25 text-white hover:bg-accent-500/35")} data-testid="release-now">
            {tr(`تسليم ${what} هلّق`, "Deliver {0} now", [what])}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[12px] text-white/50">{tr("انسلّمت", "Delivered")} {d.deliveredAt ? dateTime(d.deliveredAt) : ""}</p>
          {link ? (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-surface-925 px-3 py-2">
                <span dir="ltr" className="min-w-0 flex-1 truncate text-xs text-white/70" data-testid="delivery-link">{link}</span>
                <button type="button" onClick={copy} className="shrink-0 text-xs text-accent-300 hover:text-accent-200">{tr("نسخ", "Copy")}</button>
                <a href={link} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-white/55 hover:text-white">{tr("فتح ↗", "Open ↗")}</a>
              </div>
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer" className={cn(btn, "w-full bg-emerald-500 font-semibold text-white hover:bg-emerald-400")}>
                  <WhatsAppIcon className="h-4 w-4" />{tr("بعت الرابط بالواتساب", "Send the link on WhatsApp")}
                </a>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-amber-300">{tr("الرابط جاهز بس عنوان المتجر ناقص (STOREFRONT_URL بالسيرفر).", "The link is ready but the store's address is missing (STOREFRONT_URL on the server).")}</p>
          )}
          {!d.storefrontUrlSet ? <p className="text-[11px] text-amber-300/90">{tr("عشان الرابط يوصل بالإيميل، لازم ينضاف STOREFRONT_URL بمتغيرات Railway.", "For the link to work by email, add STOREFRONT_URL to the Railway variables.")}</p> : null}

          {/* Email */}
          <div className="rounded-xl border border-white/[0.08] p-3 text-sm">
            {emailEdit !== null ? (
              <div className="flex flex-wrap gap-2">
                <input dir="ltr" type="email" value={emailEdit} onChange={(e) => setEmailEdit(e.target.value)} placeholder="name@example.com" className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white" aria-label={tr("إيميل الزبون", "Customer's email")} />
                <button type="button" disabled={!/^\S+@\S+\.\S+$/.test(emailEdit.trim()) || email.isPending} onClick={() => email.mutate(emailEdit.trim())} className={cn(btn, "bg-accent-500 text-white")}>{tr("بعت", "Send")}</button>
                <button type="button" onClick={() => setEmailEdit(null)} className="h-10 px-2 text-xs text-white/55">{tr("إلغاء", "Cancel")}</button>
              </div>
            ) : d.email ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white/55">{tr("الإيميل:", "Email:")}</span>
                <span dir="ltr" className="text-white/85">{d.email}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", d.emailSentAt ? "bg-emerald-500/15 text-emerald-200" : "bg-white/[0.06] text-white/55")}>
                  {d.emailSentAt ? tr(`انبعت ${dateTime(d.emailSentAt)}`, "Sent {0}", [dateTime(d.emailSentAt)]) : tr("لسا ما انبعت", "Not sent yet")}
                </span>
                <span className="ms-auto flex gap-2">
                  <button type="button" disabled={email.isPending} onClick={() => email.mutate(undefined)} className="text-xs text-accent-300 hover:text-accent-200">{d.emailSentAt ? tr("إعادة إرسال", "Send again") : tr("بعت هلّق", "Send now")}</button>
                  <button type="button" onClick={() => setEmailEdit(d.email ?? "")} className="text-xs text-white/50 hover:text-white">{tr("تغيير", "Change")}</button>
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white/55">{tr("ما في إيميل.", "No email left.")}</span>
                <button type="button" onClick={() => setEmailEdit("")} className="text-xs text-accent-300 hover:text-accent-200">{tr("+ إضافة إيميل وبعت", "+ Add an email and send")}</button>
              </div>
            )}
            {!d.emailReady ? <p className="mt-2 text-[11px] text-white/40">{tr("الإيميلات بتنبعت فعلياً بس لما يكون Resend مضبوط بالسيرفر.", "Emails are only really sent once Resend is set up on the server.")}</p> : null}
          </div>
        </div>
      )}

      {d.files.length ? (
        <div className="mt-4">
          <h3 className="mb-1 text-xs text-white/50">{tr("الملفات (كل ملف لحد", "Files (each file up to")} {d.maxDownloads} {tr("تنزيلات)", "downloads)")}</h3>
          <ul className="space-y-1 text-sm">
            {d.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-white/85">{f.kind === "link" ? "🔗" : "📄"} {f.name}</span>
                <span className={cn("shrink-0 text-[11px]", f.downloads ? "text-emerald-300" : "text-white/40")}>{f.downloads ? tr(`نزّلته ${f.downloads}×`, "Downloaded {0}×", [f.downloads]) : tr("لسا ما نزّلته", "Not downloaded yet")}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : d.kinds.digital && !d.sellsCodes && !d.sellsLicences ? (
        <p className="mt-4 text-xs text-amber-300">{tr("المنتج الرقمي ما عليه ملفات! بتنضاف من صفحة المنتج.", "The digital product has no files! Add them on the product page.")}</p>
      ) : null}

      {d.sellsLicences ? <OrderLicences orderId={orderId} licences={d.licences ?? []} released={d.released} closed={d.closed} /> : null}

      {d.sellsCodes ? (
        <div className="mt-4" data-testid="delivery-codes">
          <h3 className="mb-1 text-xs text-white/50">{tr("الأكواد (", "Codes (")}{codes.filter((c) => c.status === "delivered").length})</h3>
          {d.released && d.codesMissing ? (
            <div className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-200" data-testid="codes-missing">
              {tr("ناقص", "Missing")} {codesCount(d.codesMissing)} {tr("— الأكواد خلصت. لازم تنضاف أكواد للمنتج وبعدين:", "— the codes ran out. Add codes to the product, then:")}
              {!d.closed ? (
                <button type="button" disabled={release.isPending} onClick={() => release.mutate()} className="ms-2 rounded-lg bg-white/10 px-2 py-1 text-white hover:bg-white/15">
                  {tr("تسليم الناقص", "Deliver what's missing")}
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
                    if (window.confirm(tr(`الكود ${masked(c.last4)} ما زبط مع الزبون؟ بنلغيه وبياخد الكود اللي بعده من القائمة.`, "The code {0} didn't work for the customer? We'll cancel it and they get the next code on the list.", [masked(c.last4)]))) replace.mutate(c.id);
                  }}
                />
              ))}
            </ul>
          ) : !d.released ? (
            <p className="text-xs text-white/45">{tr("كل قطعة بتاخد كود لما تنسلّم.", "Each piece gets a code once delivered.")}</p>
          ) : null}
        </div>
      ) : null}

      {d.tickets.length ? (
        <div className="mt-4">
          <h3 className="mb-1 flex items-center justify-between text-xs text-white/50">
            <span>{tr("التذاكر (", "Tickets (")}{d.tickets.length})</span>
            <Link to="/admin/tickets" className="text-accent-300 hover:text-accent-200">{tr("صفحة الدخول", "Check-in page")} <span className="inline-block ltr:-scale-x-100">←</span></Link>
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
          onClick={() => { if (window.confirm(tr("رابط جديد؟ الرابط القديم رح يوقف (مثلاً إذا انشارك بالغلط).", "A new link? The old link will stop (e.g. if it was shared by mistake)."))) newLink.mutate(); }}
          className="mt-4 text-[11px] text-white/40 hover:text-white/70"
        >
          {tr("رابط جديد (يوقف القديم)", "New link (stops the old one)")}
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
      toast.error(tr("ما انفتح الكود", "The code didn't open"), { description: getApiErrorMessage(e) });
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5" data-testid="order-code">
      {shown ? <RevealedCode code={shown} onHide={() => setShown(null)} /> : <span dir="ltr" className="font-mono text-white">{masked(c.last4)}</span>}
      <span className={cn("rounded-full px-2 py-0.5 text-[11px]", CODE_STATUS[c.status].cls)}>{c.status === "delivered" ? tr("مع الزبون", "With the customer") : CODE_STATUS[c.status].label}</span>
      <span className="ms-auto flex items-center gap-2">
        {!shown ? (
          <button type="button" onClick={() => void show()} className="text-xs text-white/60 hover:text-white">
            {tr("إظهار", "Show")}
          </button>
        ) : null}
        {canSwap ? (
          <button type="button" disabled={busy} onClick={onReplace} className="text-xs text-amber-300 hover:text-amber-200 disabled:opacity-50">
            {tr("تبديل", "Swap")}
          </button>
        ) : null}
      </span>
      {/* The card is narrow: what it is and whether she looked, on its own line. */}
      <span className="basis-full text-xs text-white/55">
        {c.title}
        {c.status === "delivered" ? <span className={c.viewedAt ? "text-emerald-300/80" : "text-white/40"}> · {c.viewedAt ? tr(`شافته ${dateTime(c.viewedAt)}`, "Seen {0}", [dateTime(c.viewedAt)]) : tr("لسا ما شافته", "Not seen yet")}</span> : null}
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
      toast.success(tr("انشال الجهاز: التفعيل ممكن على جهاز ثاني", "Device removed: it can be activated on another device"));
      void qc.invalidateQueries({ queryKey: ["admin", "orders", "delivery", orderId] });
    },
    onError: (e) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) }),
  });
  const act = useMutation({
    mutationFn: ({ id, what }: { id: string; what: "renew" | "stop" | "restore" }) =>
      what === "renew" ? ProtectedAPI.renewLicence(orderId, id) : what === "stop" ? ProtectedAPI.stopLicence(orderId, id) : ProtectedAPI.restoreLicence(orderId, id),
    onSuccess: (_r, v) => {
      toast.success(v.what === "renew" ? tr("تجدّدت المدة ورجعت التنزيلات", "The window was renewed and the downloads reset") : v.what === "stop" ? tr("وقف السيريال", "Serial stopped") : tr("رجع السيريال يشتغل", "Serial working again"));
      void qc.invalidateQueries({ queryKey: ["admin", "orders", "delivery", orderId] });
    },
    onError: (e) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) }),
  });
  return (
    <div className="mt-4" data-testid="delivery-licences">
      <h3 className="mb-1 text-xs text-white/50">{tr("النسخ المحمية (", "Protected copies (")}{licences.filter((l) => l.status === "active").length})</h3>
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
                if (window.confirm(tr("شيل هالجهاز من السيريال؟ البرنامج عليه بيوقف بآخر فحص، والتفعيل بيصير ممكن على جهاز ثاني.", "Remove this device from the serial? The program on it stops at its next check, and it can be activated on another device."))) reset.mutate({ licenceId: l.id, activationId });
              }}
              onAct={(what) => {
                if (what === "stop" && !window.confirm(tr(`توقيف السيريال ${masked(l.last4)}؟ ما رح يقدر حدا ينزّل فيه بعد هيك (مثلاً إذا انشارك).`, "Stop the serial {0}? Nobody can download with it after this (e.g. if it was shared).", [masked(l.last4)]))) return;
                act.mutate({ id: l.id, what });
              }}
            />
          ))}
        </ul>
      ) : !released ? (
        <p className="text-xs text-white/45">{tr("كل قطعة بتاخد سيريال لما تنسلّم الطلبية (دفع أونلاين أو قبول).", "Each piece gets a serial once the order is delivered (online payment or acceptance).")}</p>
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
      toast.error(tr("ما انفتح السيريال", "The serial didn't open"), { description: getApiErrorMessage(e) });
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5" data-testid="order-licence">
      {shown ? <RevealedCode code={shown} onHide={() => setShown(null)} /> : <span dir="ltr" className="font-mono text-white">{masked(l.last4)}</span>}
      <span className={cn("rounded-full px-2 py-0.5 text-[11px]", state.cls)}>{state.label}</span>
      <span className="ms-auto flex items-center gap-2">
        {!shown ? (
          <button type="button" onClick={() => void show()} className="text-xs text-white/60 hover:text-white">
            {tr("إظهار", "Show")}
          </button>
        ) : null}
        {!closed && l.status === "active" ? (
          <>
            <button type="button" disabled={busy} onClick={() => onAct("renew")} className="text-xs text-accent-300 hover:text-accent-200 disabled:opacity-50" title={tr("مدة جديدة وكل التنزيلات من أول", "A new window and all downloads from the start")}>
              {tr("تجديد", "Renew")}
            </button>
            <button type="button" disabled={busy} onClick={() => onAct("stop")} className="text-xs text-red-300 hover:text-red-200 disabled:opacity-50">
              {tr("توقيف", "Stop")}
            </button>
          </>
        ) : null}
        {!closed && l.status === "revoked" && l.revokedReason === "owner" ? (
          <button type="button" disabled={busy} onClick={() => onAct("restore")} className="text-xs text-emerald-300 hover:text-emerald-200 disabled:opacity-50">
            {tr("ترجيع", "Restore")}
          </button>
        ) : null}
      </span>
      <span className="basis-full text-xs text-white/55">
        {l.title} · {downloadsText(l.downloads, l.maxDownloads)}
        {l.status === "active" ? <span className="text-white/40"> · {left ?? tr("انتهت مدة التنزيل", "The download window is over")}</span> : null}
      </span>
      {l.activations?.length ? (
        <ul className="basis-full space-y-1" data-testid="licence-devices">
          {l.activations.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 text-[11px] text-white/55">
              <span>💻 {a.deviceName || tr("جهاز", "Device")}</span>
              <span className="text-white/35">{tr("· آخر مرة", "· last seen")} {dateTime(a.lastSeenAt)}{a.appVersion ? ` · v${a.appVersion}` : ""}</span>
              {a.status === "active" ? (
                !closed ? (
                  <button type="button" disabled={busy} onClick={() => onReset(a.id)} className="ms-auto text-amber-300 hover:text-amber-200 disabled:opacity-50">
                    {tr("شيل الجهاز", "Remove device")}
                  </button>
                ) : null
              ) : (
                <span className="ms-auto text-white/35">{tr("انشال", "Removed")}</span>
              )}
            </li>
          ))}
        </ul>
      ) : l.status === "active" ? (
        <span className="basis-full text-[11px] text-white/35">{tr("مش مفعّل على أي جهاز بعد (لحد", "Not activated on any device yet (up to")} {l.maxDevices ?? 1})</span>
      ) : null}
    </li>
  );
}
