// src/features/orders/OrderDetailsPage.tsx
// One order, everything the owner needs: who and where, what she ordered, how much
// to collect with delivery, the next step, a ready WhatsApp message and the history.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOrderDetails, useOrdersActions } from "../../hooks/useOrders";
import { cn } from "../../components/ui/cn";
import {
  MESSAGE_KINDS, messageLang, NEXT_STEP_LABEL, ORDER_STATUSES, STATUS_INFO, buildMessage, dateTime, deliveryFor, isPaid, messageForStatus,
  nextStep, num, orderLines, orderTotal, moneyText, shortOrderId, timeAgo, waLink, type MessageKind, type OrderLike, type OrderStatus,
} from "../../lib/orders";
import { toast } from "../../lib/toast";
import { PaidChip, SourceChip, StatusPill, Thumb, WhatsAppIcon } from "./orderUi";
import { useDelivery } from "./useDelivery";
import { DeliveryCard } from "./DeliveryCard";
import { AiOrderCard } from "./AiOrderCard";
import { useOrderDelivery } from "./useOrderDelivery";
import type { Audience } from "../../lib/storeIdentity";
import { isRtl } from "../../lib/lang";
import { tr } from "@/lib/words";

type FullOrder = OrderLike & {
  history?: Array<{ id: string; fromStatus?: string | null; toStatus: string; note?: string | null; at: string }>;
  country?: string | null;
  email?: string | null;
};

const FLOW: OrderStatus[] = ["NEW", "CONTACTED", "ACCEPTED", "SHIPPED", "CLOSED"];

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const q = useOrderDetails(id ?? null);
  const order = q.data as FullOrder | undefined;
  const { updateStatus, updateDetails } = useOrdersActions();
  const { delivery, storeNameIn, audience } = useDelivery();
  const [justMoved, setJustMoved] = useState<OrderStatus | null>(null);
  // Files/tickets: an order with nothing to ship needs no address.
  const handover = useOrderDelivery(order?.id ?? "", order?.status ?? "");
  const noShipping = Boolean(handover.data?.needed && !handover.data.kinds.shipping);

  if (q.isLoading) return <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>;
  if (!order) return <div className="glass rounded-2xl p-10 text-center text-sm text-white/70">{tr("لم نجد هذا الطلب.", "We couldn't find this order.")} <Link className="text-accent-300" to="/admin/orders">{tr("رجوع للطلبات", "Back to orders")}</Link></div>;

  const total = orderTotal(order);
  const subtotal = order.subtotal != null ? num(order.subtotal) : orderLines(order).reduce((s, l) => s + num(l.lineSubtotal ?? num(l.unitPrice) * l.quantity), 0);
  const discount = num(order.discountAmount);
  const d = deliveryFor(order.city, subtotal, delivery);
  const collect = total + (d.fee ?? 0);
  const next = nextStep(order.status);

  // The hooks show the error toast; here we only need to know if it worked.
  const move = async (to: OrderStatus, note?: string) => {
    try {
      await updateStatus.mutateAsync({ id: order.id, toStatus: to, note });
      setJustMoved(to);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-4" data-testid="order-details">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/orders" className="text-xs text-white/50 hover:text-white"><span className="inline-block ltr:-scale-x-100">→</span> {tr("الطلبات", "Orders")}</Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
            {tr("طلب", "Order")} <span dir="ltr">#{shortOrderId(order.id)}</span>
            <StatusPill status={order.status} />
            <SourceChip source={order.source} />
          </h1>
          <p className="mt-1 text-xs text-white/50">{dateTime(order.createdAt)} · {timeAgo(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/print/orders?ids=${order.id}`} target="_blank" rel="noreferrer" className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm leading-10 text-white/85 hover:bg-white/[0.06]">{tr("🖨 الفاتورة", "🖨 Invoice")}</a>
          <a href={`/print/orders?ids=${order.id}&type=slip`} target="_blank" rel="noreferrer" className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm leading-10 text-white/85 hover:bg-white/[0.06]">{tr("🏷 ملصق التوصيل", "🏷 Delivery label")}</a>
        </div>
      </div>

      {/* Status */}
      <StatusCard order={order} next={next} busy={updateStatus.isPending} onMove={move} />

      {justMoved && (
        <AfterMoveBanner
          to={justMoved}
          href={waLink(order.whatsapp || order.phone, buildMessage(messageForStatus(justMoved), { ...order, status: justMoved }, { storeName: storeNameIn(messageLang(order)), audience, deliveryFee: d.fee }))}
          onClose={() => setJustMoved(null)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {/* Items */}
          <section className="glass rounded-2xl p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold text-white">{tr("القطع (", "Items (")}{orderLines(order).reduce((s, l) => s + l.quantity, 0)})</h2>
            <ul className="divide-y divide-white/[0.06]">
              {orderLines(order).map((l, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <Thumb src={l.imageUrl} className="h-20 w-16 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white">{l.productTitle}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                      {l.colorName && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-white/70">{tr("اللون:", "Colour:")} {l.colorName}</span>}
                      {l.sizeName && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-white/70">{tr("المقاس:", "Size:")} {l.sizeName}</span>}
                      {l.sku && <span className="px-1 text-white/35" dir="ltr">{l.sku}</span>}
                    </div>
                  </div>
                  <div className="text-end text-sm">
                    <div className="text-white/60">{moneyText(l.unitPrice)} × {l.quantity}</div>
                    <div className="font-semibold text-white">{moneyText(l.lineTotal ?? l.lineSubtotal ?? num(l.unitPrice) * l.quantity)}</div>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-2 rounded-xl bg-white/[0.03] p-4 text-sm">
              <Row label={tr("المجموع", "Total")}>{moneyText(subtotal)}</Row>
              {discount > 0 && <Row label={tr(`الخصم${order.couponCode ? ` (${order.couponCode})` : ""}`, "Discount{0}", [order.couponCode ? ` (${order.couponCode})` : ""])} className="text-emerald-300">−{moneyText(discount)}</Row>}
              <Row label={tr(`التوصيل${d.zone ? ` — ${d.zone.name}` : ""}`, "Delivery{0}", [d.zone ? ` — ${d.zone.name}` : ""])}>
                {d.fee == null ? <span className="text-white/45">{tr("غير محدد ·", "Not set ·")} <DeliveryHint /></span> : d.free ? <span className="text-emerald-300">{tr("مجاني", "Free")}</span> : moneyText(d.fee)}
              </Row>
              <div className="flex items-center justify-between border-t border-dashed border-white/10 pt-2 text-base">
                <dt className="font-semibold text-white">{tr("يُحصَّل من الزبون", "To collect from the customer")}</dt>
                <dd className="text-lg font-bold text-accent-200">{moneyText(collect)}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] p-3">
              <div className="flex items-center gap-2 text-sm text-white/80"><PaidChip order={order} /> {tr("الدفع نقداً عند الاستلام", "Cash on delivery")}</div>
              <button
                type="button"
                disabled={updateDetails.isPending}
                onClick={() => updateDetails.mutate({ id: order.id, body: isPaid(order) ? { paymentStatus: "UNPAID" } : { paymentStatus: "PAID", paymentProvider: order.paymentProvider || "COD" } }, { onSuccess: () => toast.success(isPaid(order) ? tr("أُلغي تسجيل الدفع", "Payment record removed") : tr(`سُجّل استلام ${moneyText(collect)}`, "Recorded receiving {0}", [moneyText(collect)])) })}
                className={cn("h-10 rounded-xl px-4 text-sm font-medium disabled:opacity-60", isPaid(order) ? "border border-white/[0.1] text-white/70 hover:bg-white/[0.06]" : "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30")}
              >
                {isPaid(order) ? tr("إلغاء تسجيل الدفع", "Undo payment record") : tr(`✓ استلمنا المبلغ ${moneyText(collect)}`, "✓ We received {0}", [moneyText(collect)])}
              </button>
            </div>
          </section>

          <Timeline order={order} onAddNote={(note) => updateDetails.mutateAsync({ id: order.id, body: { note } })} />
        </div>

        <div className="min-w-0 space-y-4">
          <DeliveryCard orderId={order.id} status={order.status} shopperLang={messageLang(order)} audience={audience} />
          <AiOrderCard orderId={order.id} phone={order.whatsapp || order.phone} />
          <CustomerCard order={order} noShipping={noShipping} saving={updateDetails.isPending} onSave={(body) => updateDetails.mutateAsync({ id: order.id, body })} />
          <WhatsAppComposer order={order} storeName={storeNameIn(messageLang(order))} audience={audience} deliveryFee={d.fee} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <dt className="text-white/60">{label}</dt>
      <dd className="text-white">{children}</dd>
    </div>
  );
}

function DeliveryHint() {
  return <Link to="/admin/orders" className="text-accent-300 hover:text-accent-200">{tr("تحديد أسعار التوصيل", "Set delivery prices")}</Link>;
}

/* ------------------------------------------------------------------ status */

function StatusCard({ order, next, busy, onMove }: { order: FullOrder; next: OrderStatus | null; busy: boolean; onMove: (to: OrderStatus, note?: string) => Promise<boolean> }) {
  const [other, setOther] = useState(false);
  const [to, setTo] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const idx = FLOW.indexOf(order.status as OrderStatus);
  const off = idx < 0;
  const stepsRef = useRef<HTMLOListElement>(null);
  // On phones the steps scroll sideways: keep the current one in view.
  useEffect(() => {
    const el = stepsRef.current?.querySelector<HTMLElement>('[aria-current="step"]');
    const ol = stepsRef.current;
    if (el && ol && ol.scrollWidth > ol.clientWidth) el.scrollIntoView({ block: "nearest", inline: "center" });
  }, [order.status]);

  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <ol ref={stepsRef} className="flex items-center gap-1 overflow-x-auto pb-1" aria-label={tr("مراحل الطلب", "Order steps")}>
        {FLOW.map((s, i) => {
          const done = !off && i < idx, current = s === order.status;
          return (
            <li key={s} aria-current={current ? "step" : undefined} className="flex shrink-0 items-center gap-1 sm:min-w-0 sm:flex-1 sm:shrink">
              <span className={cn("flex min-w-0 items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs", current ? "bg-accent-500/25 text-white" : done ? "text-emerald-300" : "text-white/40")}>
                <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px]", current ? "bg-accent-500 text-white" : done ? "bg-emerald-500/25" : "bg-white/[0.06]")}>{done ? "✓" : i + 1}</span>
                {STATUS_INFO[s].label}
              </span>
              {i < FLOW.length - 1 && <span className={cn("h-px min-w-[12px] flex-1", done ? "bg-emerald-500/40" : "bg-white/10")} aria-hidden />}
            </li>
          );
        })}
      </ol>
      {off && <p className="mt-2 text-sm text-red-300">{tr("هذا الطلب", "This order is")} {STATUS_INFO[order.status as OrderStatus]?.label ?? order.status}.</p>}
      <p className="mt-3 text-xs text-white/50">{STATUS_INFO[order.status as OrderStatus]?.hint}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {next && (
          <button type="button" data-testid="next-step" disabled={busy} onClick={() => void onMove(next)} className="h-11 rounded-xl bg-accent-500 px-5 text-sm font-semibold text-white hover:bg-accent-400 disabled:opacity-60">
            {busy ? tr("جارٍ الحفظ…", "Saving…") : <>{NEXT_STEP_LABEL[next]} <span className="inline-block ltr:-scale-x-100">←</span></>}
          </button>
        )}
        <button type="button" onClick={() => setOther((v) => !v)} className="h-11 rounded-xl border border-white/[0.1] px-4 text-sm text-white/75 hover:bg-white/[0.06]">{other ? tr("إغلاق", "Close") : tr("حالة أخرى / ملاحظة", "Other status / note")}</button>
      </div>
      {other && (
        <div className="mt-3 grid gap-2 rounded-xl border border-white/[0.08] p-3 sm:grid-cols-[200px_1fr_auto]">
          <select value={to} onChange={(e) => setTo(e.target.value as OrderStatus)} className="h-10 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white" aria-label={tr("الحالة الجديدة", "New status")}>
            <option value="">{tr("اختيار الحالة…", "Choose the status…")}</option>
            {ORDER_STATUSES.filter((s) => s !== order.status).map((s) => <option key={s} value={s}>{STATUS_INFO[s].label}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("ملاحظة (اختياري): مثلاً اتصلنا وما في رد", "Note (optional): e.g. we called, no answer")} className="h-10 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white placeholder:text-white/35" aria-label={tr("ملاحظة الحالة", "Status note")} />
          <button type="button" disabled={!to || busy} onClick={() => to && void onMove(to, note).then((ok) => { if (ok) { setOther(false); setTo(""); setNote(""); } })} className="h-10 rounded-xl bg-accent-500/25 px-4 text-sm text-white hover:bg-accent-500/35 disabled:opacity-50">{tr("حفظ", "Save")}</button>
          {to && <p className="text-xs text-white/50 sm:col-span-3">{STATUS_INFO[to].hint}</p>}
        </div>
      )}
    </section>
  );
}

function AfterMoveBanner({ to, href, onClose }: { to: OrderStatus; href: string | null; onClose: () => void }) {
  if (!href) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
      <span className="text-white/85">{tr("أصبح الطلب «", "The order is now “")}{STATUS_INFO[to].label}{tr("». نبعت رسالة جاهزة للزبون؟", "”. Send the customer a ready message?")}</span>
      <a href={href} target="_blank" rel="noreferrer" onClick={onClose} className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-500 px-4 font-medium text-white hover:bg-emerald-400"><WhatsAppIcon className="h-4 w-4" />{tr("فتح واتساب", "Open WhatsApp")}</a>
      <button type="button" onClick={onClose} className="ms-auto text-white/50 hover:text-white">{tr("لاحقاً", "Later")}</button>
    </div>
  );
}

/* ---------------------------------------------------------------- customer */

function CustomerCard({ order, noShipping, saving, onSave }: { order: FullOrder; noShipping?: boolean; saving: boolean; onSave: (body: { customerName?: string; phone?: string; whatsapp?: string | null; email?: string | null; city?: string | null; address?: string | null }) => Promise<unknown> }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ customerName: "", phone: "", whatsapp: "", email: "", city: "", address: "" });
  const startEdit = () => {
    setF({ customerName: order.customerName ?? "", phone: order.phone ?? "", whatsapp: order.whatsapp ?? "", email: order.email ?? "", city: order.city ?? "", address: order.address ?? "" });
    setEdit(true);
  };
  const field = "h-10 w-full rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white placeholder:text-white/35";
  const copy = (text: string) => { void navigator.clipboard?.writeText(text).then(() => toast.success(tr("نُسخ", "Copied"))); };
  const fullAddress = [order.city, order.address].filter(Boolean).join(tr("، ", ", "));

  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">{tr("الزبون والتوصيل", "Customer and delivery")}</h2>
        {!edit && <button type="button" onClick={startEdit} className="rounded-lg px-2 py-1 text-xs text-accent-300 hover:bg-accent-500/10">{tr("تعديل", "Edit")}</button>}
      </div>
      {edit ? (
        <div className="space-y-2">
          <input className={field} value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} placeholder={tr("الاسم", "Name")} aria-label={tr("الاسم", "Name")} />
          <input className={field} dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder={tr("الهاتف", "Phone")} aria-label={tr("الهاتف", "Phone")} />
          <input className={field} dir="ltr" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder={tr("واتساب (إذا مختلف)", "WhatsApp (if different)")} aria-label={tr("واتساب", "WhatsApp")} />
          <input className={field} dir="ltr" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder={tr("الإيميل (للملفات والتذاكر)", "Email (for files and tickets)")} aria-label={tr("الإيميل", "Email")} />
          <input className={field} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder={tr("المدينة", "City")} aria-label={tr("المدينة", "City")} />
          <textarea className={cn(field, "h-20 py-2")} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder={tr("العنوان بالتفصيل", "Full address")} aria-label={tr("العنوان", "Address")} />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setEdit(false)} className="h-9 rounded-xl px-3 text-sm text-white/60 hover:text-white">{tr("إلغاء", "Cancel")}</button>
            <button type="button" disabled={saving || !f.customerName.trim() || !f.phone.trim()} onClick={() => void onSave({ customerName: f.customerName.trim(), phone: f.phone.trim(), whatsapp: f.whatsapp.trim() || null, email: f.email.trim() || null, city: f.city.trim() || null, address: f.address.trim() || null }).then(() => { setEdit(false); toast.success(tr("حُفظت البيانات", "Details saved")); }, () => { /* toast shown by the hook */ })} className="h-9 rounded-xl bg-accent-500 px-4 text-sm text-white hover:bg-accent-400 disabled:opacity-50">{tr("حفظ", "Save")}</button>
          </div>
        </div>
      ) : (
        <dl className="space-y-3 text-sm">
          <div><dt className="text-[11px] text-white/45">{tr("الاسم", "Name")}</dt><dd className="text-white">{order.customerName}</dd></div>
          <div>
            <dt className="text-[11px] text-white/45">{tr("الهاتف", "Phone")}</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <a href={`tel:${order.phone}`} dir="ltr" className="text-white hover:text-accent-200">{order.phone}</a>
              <button type="button" onClick={() => copy(order.phone)} className="text-[11px] text-white/45 hover:text-white">{tr("نسخ", "Copy")}</button>
              {order.whatsapp && order.whatsapp !== order.phone && <span className="text-[11px] text-white/50">{tr("واتساب:", "WhatsApp:")} <span dir="ltr">{order.whatsapp}</span></span>}
            </dd>
          </div>
          {order.email && (
            <div>
              <dt className="text-[11px] text-white/45">{tr("الإيميل", "Email")}</dt>
              <dd dir="ltr" className="text-end text-white">{order.email}</dd>
            </div>
          )}
          <div>
            <dt className="text-[11px] text-white/45">{tr("العنوان", "Address")}</dt>
            <dd className={cn(fullAddress || noShipping ? "text-white" : "text-amber-300/90")}>
              {fullAddress || (noShipping ? <span className="text-white/55">{tr("ما في شحن (ملفات/تذاكر)", "No shipping (files/tickets)")}</span> : tr("لا يوجد عنوان — لازم نسأل الزبون عنه", "No address — ask the customer for it"))}
              {fullAddress && <button type="button" onClick={() => copy(fullAddress)} className="ms-2 text-[11px] text-white/45 hover:text-white">{tr("نسخ", "Copy")}</button>}
            </dd>
          </div>
          {order.note && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3">
              <dt className="text-[11px] text-amber-200/80">{tr("ملاحظة الزبون", "Customer's note")}</dt>
              <dd className="mt-1 whitespace-pre-line text-white/90">{order.note}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- WhatsApp */

function WhatsAppComposer({ order, storeName, audience, deliveryFee }: { order: FullOrder; storeName: string; audience: Audience; deliveryFee: number | null }) {
  const [kind, setKind] = useState<MessageKind>(() => messageForStatus(order.status));
  // null = the ready message (follows order changes); a string = the owner edited it.
  const [edited, setEdited] = useState<string | null>(null);
  const generated = useMemo(() => buildMessage(kind, order, { storeName, deliveryFee, audience }), [kind, order, storeName, deliveryFee, audience]);
  const text = edited ?? generated;
  const href = waLink(order.whatsapp || order.phone, text);

  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-white"><WhatsAppIcon className="h-4 w-4 text-emerald-300" />{tr("رسالة للزبون", "Message to the customer")}</h2>
      <p className="mb-3 text-[11px] leading-5 text-white/45">{tr("رسالة جاهزة بتنختار وبتتعدّل، وبعدها بتنفتح محادثة واتساب مع الزبون والرسالة مكتوبة.", "Pick a ready message and edit it, then a WhatsApp chat opens with the customer and the message written.")}</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {MESSAGE_KINDS.map((m) => (
          <button key={m.kind} type="button" onClick={() => { setKind(m.kind); setEdited(null); }} aria-pressed={kind === m.kind}
            className={cn("h-8 rounded-full border px-3 text-xs", kind === m.kind ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100" : "border-white/[0.08] text-white/65 hover:text-white")}>
            {m.label}
          </button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setEdited(e.target.value)} dir={isRtl(messageLang(order)) ? "rtl" : "ltr"} className="h-44 w-full resize-y rounded-xl border border-white/[0.1] bg-surface-925 p-3 text-sm leading-6 text-white" aria-label={tr("نص الرسالة", "Message text")} />
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400">
          <WhatsAppIcon className="h-4 w-4" />{tr("فتح واتساب وإرسال", "Open WhatsApp and send")}
        </a>
      ) : <p className="mt-2 text-xs text-red-300">{tr("لا يوجد رقم هاتف صالح.", "No valid phone number.")}</p>}
    </section>
  );
}

/* ---------------------------------------------------------------- history */

function Timeline({ order, onAddNote }: { order: FullOrder; onAddNote: (note: string) => Promise<unknown> }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const items = [...(order.history ?? [])].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const add = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try { await onAddNote(note.trim()); setNote(""); } catch { /* toast shown by the hook */ } finally { setSaving(false); }
  };
  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <h2 className="mb-3 text-base font-semibold text-white">{tr("سجل الطلب", "Order history")}</h2>
      <div className="mb-4 flex gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void add(); }} placeholder={tr("ملاحظة داخلية…", "Add an internal note…")} className="h-10 flex-1 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white placeholder:text-white/35" aria-label={tr("ملاحظة داخلية", "Internal note")} />
        <button type="button" disabled={!note.trim() || saving} onClick={() => void add()} className="h-10 rounded-xl bg-white/[0.08] px-4 text-sm text-white hover:bg-white/[0.12] disabled:opacity-40">{tr("إضافة", "Add")}</button>
      </div>
      <ol className="relative space-y-4 border-s border-white/[0.08] ps-4">
        {items.map((h) => (
          <li key={h.id} className="relative">
            <span className="absolute -start-[1.36rem] top-1 h-2.5 w-2.5 rounded-full bg-accent-400" aria-hidden />
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
              {h.fromStatus !== h.toStatus ? <StatusPill status={h.toStatus} /> : <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-white/60">{tr("ملاحظة", "Note")}</span>}
              {dateTime(h.at)}
            </div>
            {h.note && <p className="mt-1 whitespace-pre-line text-sm text-white/85">{h.note}</p>}
          </li>
        ))}
        <li className="relative">
          <span className="absolute -start-[1.36rem] top-1 h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden />
          <div className="text-xs text-white/50">{tr("وصل الطلب ·", "Order received ·")} {dateTime(order.createdAt)}</div>
        </li>
      </ol>
    </section>
  );
}
