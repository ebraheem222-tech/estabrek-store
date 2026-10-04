// src/features/orders/OrderDetailsPage.tsx
// One order, everything the owner needs: who and where, what she ordered, how much
// to collect with delivery, the next step, a ready WhatsApp message and the history.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOrderDetails, useOrdersActions } from "../../hooks/useOrders";
import { cn } from "../../components/ui/cn";
import {
  MESSAGE_KINDS, NEXT_STEP_LABEL, ORDER_STATUSES, STATUS_INFO, buildMessage, dateTime, deliveryFor, isPaid, messageForStatus,
  nextStep, num, orderLines, orderTotal, shekel, shortOrderId, timeAgo, waLink, type MessageKind, type OrderLike, type OrderStatus,
} from "../../lib/orders";
import { toast } from "../../lib/toast";
import { PaidChip, SourceChip, StatusPill, Thumb, WhatsAppIcon } from "./orderUi";
import { useDelivery } from "./useDelivery";

type FullOrder = OrderLike & {
  history?: Array<{ id: string; fromStatus?: string | null; toStatus: string; note?: string | null; at: string }>;
  country?: string | null;
};

const FLOW: OrderStatus[] = ["NEW", "CONTACTED", "ACCEPTED", "SHIPPED", "CLOSED"];

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const q = useOrderDetails(id ?? null);
  const order = q.data as FullOrder | undefined;
  const { updateStatus, updateDetails } = useOrdersActions();
  const { delivery, storeName } = useDelivery();
  const [justMoved, setJustMoved] = useState<OrderStatus | null>(null);

  if (q.isLoading) return <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>;
  if (!order) return <div className="glass rounded-2xl p-10 text-center text-sm text-white/70">لم نجد هذا الطلب. <Link className="text-accent-300" to="/admin/orders">رجوع للطلبات</Link></div>;

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
    <div dir="rtl" className="space-y-4" data-testid="order-details">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/orders" className="text-xs text-white/50 hover:text-white">→ الطلبات</Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
            طلب <span dir="ltr">#{shortOrderId(order.id)}</span>
            <StatusPill status={order.status} />
            <SourceChip source={order.source} />
          </h1>
          <p className="mt-1 text-xs text-white/50">{dateTime(order.createdAt)} · {timeAgo(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/print/orders?ids=${order.id}`} target="_blank" rel="noreferrer" className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm leading-10 text-white/85 hover:bg-white/[0.06]">🖨 الفاتورة</a>
          <a href={`/print/orders?ids=${order.id}&type=slip`} target="_blank" rel="noreferrer" className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm leading-10 text-white/85 hover:bg-white/[0.06]">🏷 ملصق التوصيل</a>
        </div>
      </div>

      {/* Status */}
      <StatusCard order={order} next={next} busy={updateStatus.isPending} onMove={move} />

      {justMoved && (
        <AfterMoveBanner
          to={justMoved}
          href={waLink(order.whatsapp || order.phone, buildMessage(messageForStatus(justMoved), { ...order, status: justMoved }, { storeName, deliveryFee: d.fee }))}
          onClose={() => setJustMoved(null)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {/* Items */}
          <section className="glass rounded-2xl p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold text-white">القطع ({orderLines(order).reduce((s, l) => s + l.quantity, 0)})</h2>
            <ul className="divide-y divide-white/[0.06]">
              {orderLines(order).map((l, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <Thumb src={l.imageUrl} className="h-20 w-16 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white">{l.productTitle}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                      {l.colorName && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-white/70">اللون: {l.colorName}</span>}
                      {l.sizeName && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-white/70">المقاس: {l.sizeName}</span>}
                      {l.sku && <span className="px-1 text-white/35" dir="ltr">{l.sku}</span>}
                    </div>
                  </div>
                  <div className="text-left text-sm">
                    <div className="text-white/60">{shekel(l.unitPrice)} × {l.quantity}</div>
                    <div className="font-semibold text-white">{shekel(l.lineTotal ?? l.lineSubtotal ?? num(l.unitPrice) * l.quantity)}</div>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-2 rounded-xl bg-white/[0.03] p-4 text-sm">
              <Row label="المجموع">{shekel(subtotal)}</Row>
              {discount > 0 && <Row label={`الخصم${order.couponCode ? ` (${order.couponCode})` : ""}`} className="text-emerald-300">−{shekel(discount)}</Row>}
              <Row label={`التوصيل${d.zone ? ` — ${d.zone.name}` : ""}`}>
                {d.fee == null ? <span className="text-white/45">غير محدد · <DeliveryHint /></span> : d.free ? <span className="text-emerald-300">مجاني</span> : shekel(d.fee)}
              </Row>
              <div className="flex items-center justify-between border-t border-dashed border-white/10 pt-2 text-base">
                <dt className="font-semibold text-white">يُحصَّل من الزبونة</dt>
                <dd className="text-lg font-bold text-accent-200">{shekel(collect)}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] p-3">
              <div className="flex items-center gap-2 text-sm text-white/80"><PaidChip order={order} /> الدفع نقداً عند الاستلام</div>
              <button
                type="button"
                disabled={updateDetails.isPending}
                onClick={() => updateDetails.mutate({ id: order.id, body: isPaid(order) ? { paymentStatus: "UNPAID" } : { paymentStatus: "PAID", paymentProvider: order.paymentProvider || "COD" } }, { onSuccess: () => toast.success(isPaid(order) ? "أُلغي تسجيل الدفع" : `سُجّل استلام ${shekel(collect)}`) })}
                className={cn("h-10 rounded-xl px-4 text-sm font-medium disabled:opacity-60", isPaid(order) ? "border border-white/[0.1] text-white/70 hover:bg-white/[0.06]" : "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30")}
              >
                {isPaid(order) ? "إلغاء تسجيل الدفع" : `✓ استلمنا المبلغ ${shekel(collect)}`}
              </button>
            </div>
          </section>

          <Timeline order={order} onAddNote={(note) => updateDetails.mutateAsync({ id: order.id, body: { note } })} />
        </div>

        <div className="min-w-0 space-y-4">
          <CustomerCard order={order} saving={updateDetails.isPending} onSave={(body) => updateDetails.mutateAsync({ id: order.id, body })} />
          <WhatsAppComposer order={order} storeName={storeName} deliveryFee={d.fee} />
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
  return <Link to="/admin/orders" className="text-accent-300 hover:text-accent-200">حدّدي أسعار التوصيل</Link>;
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
      <ol ref={stepsRef} className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="مراحل الطلب">
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
      {off && <p className="mt-2 text-sm text-red-300">هذا الطلب {STATUS_INFO[order.status as OrderStatus]?.label ?? order.status}.</p>}
      <p className="mt-3 text-xs text-white/50">{STATUS_INFO[order.status as OrderStatus]?.hint}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {next && (
          <button type="button" data-testid="next-step" disabled={busy} onClick={() => void onMove(next)} className="h-11 rounded-xl bg-accent-500 px-5 text-sm font-semibold text-white hover:bg-accent-400 disabled:opacity-60">
            {busy ? "جارٍ الحفظ…" : `${NEXT_STEP_LABEL[next]} ←`}
          </button>
        )}
        <button type="button" onClick={() => setOther((v) => !v)} className="h-11 rounded-xl border border-white/[0.1] px-4 text-sm text-white/75 hover:bg-white/[0.06]">{other ? "إغلاق" : "حالة أخرى / ملاحظة"}</button>
      </div>
      {other && (
        <div className="mt-3 grid gap-2 rounded-xl border border-white/[0.08] p-3 sm:grid-cols-[200px_1fr_auto]">
          <select value={to} onChange={(e) => setTo(e.target.value as OrderStatus)} className="h-10 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white" aria-label="الحالة الجديدة">
            <option value="">اختاري الحالة…</option>
            {ORDER_STATUSES.filter((s) => s !== order.status).map((s) => <option key={s} value={s}>{STATUS_INFO[s].label}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري): مثلاً اتصلنا ولم ترد" className="h-10 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white placeholder:text-white/35" aria-label="ملاحظة الحالة" />
          <button type="button" disabled={!to || busy} onClick={() => to && void onMove(to, note).then((ok) => { if (ok) { setOther(false); setTo(""); setNote(""); } })} className="h-10 rounded-xl bg-accent-500/25 px-4 text-sm text-white hover:bg-accent-500/35 disabled:opacity-50">حفظ</button>
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
      <span className="text-white/85">أصبح الطلب «{STATUS_INFO[to].label}». أرسلي لها رسالة جاهزة؟</span>
      <a href={href} target="_blank" rel="noreferrer" onClick={onClose} className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-500 px-4 font-medium text-white hover:bg-emerald-400"><WhatsAppIcon className="h-4 w-4" />فتح واتساب</a>
      <button type="button" onClick={onClose} className="ms-auto text-white/50 hover:text-white">لاحقاً</button>
    </div>
  );
}

/* ---------------------------------------------------------------- customer */

function CustomerCard({ order, saving, onSave }: { order: FullOrder; saving: boolean; onSave: (body: { customerName?: string; phone?: string; whatsapp?: string | null; city?: string | null; address?: string | null }) => Promise<unknown> }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ customerName: "", phone: "", whatsapp: "", city: "", address: "" });
  const startEdit = () => {
    setF({ customerName: order.customerName ?? "", phone: order.phone ?? "", whatsapp: order.whatsapp ?? "", city: order.city ?? "", address: order.address ?? "" });
    setEdit(true);
  };
  const field = "h-10 w-full rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white placeholder:text-white/35";
  const copy = (text: string) => { void navigator.clipboard?.writeText(text).then(() => toast.success("نُسخ")); };
  const fullAddress = [order.city, order.address].filter(Boolean).join("، ");

  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">الزبونة والتوصيل</h2>
        {!edit && <button type="button" onClick={startEdit} className="rounded-lg px-2 py-1 text-xs text-accent-300 hover:bg-accent-500/10">تعديل</button>}
      </div>
      {edit ? (
        <div className="space-y-2">
          <input className={field} value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} placeholder="الاسم" aria-label="الاسم" />
          <input className={field} dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="الهاتف" aria-label="الهاتف" />
          <input className={field} dir="ltr" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="واتساب (إذا مختلف)" aria-label="واتساب" />
          <input className={field} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="المدينة" aria-label="المدينة" />
          <textarea className={cn(field, "h-20 py-2")} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="العنوان بالتفصيل" aria-label="العنوان" />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setEdit(false)} className="h-9 rounded-xl px-3 text-sm text-white/60 hover:text-white">إلغاء</button>
            <button type="button" disabled={saving || !f.customerName.trim() || !f.phone.trim()} onClick={() => void onSave({ customerName: f.customerName.trim(), phone: f.phone.trim(), whatsapp: f.whatsapp.trim() || null, city: f.city.trim() || null, address: f.address.trim() || null }).then(() => { setEdit(false); toast.success("حُفظت البيانات"); }, () => { /* toast shown by the hook */ })} className="h-9 rounded-xl bg-accent-500 px-4 text-sm text-white hover:bg-accent-400 disabled:opacity-50">حفظ</button>
          </div>
        </div>
      ) : (
        <dl className="space-y-3 text-sm">
          <div><dt className="text-[11px] text-white/45">الاسم</dt><dd className="text-white">{order.customerName}</dd></div>
          <div>
            <dt className="text-[11px] text-white/45">الهاتف</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <a href={`tel:${order.phone}`} dir="ltr" className="text-white hover:text-accent-200">{order.phone}</a>
              <button type="button" onClick={() => copy(order.phone)} className="text-[11px] text-white/45 hover:text-white">نسخ</button>
              {order.whatsapp && order.whatsapp !== order.phone && <span className="text-[11px] text-white/50">واتساب: <span dir="ltr">{order.whatsapp}</span></span>}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-white/45">العنوان</dt>
            <dd className={cn(fullAddress ? "text-white" : "text-amber-300/90")}>
              {fullAddress || "لا يوجد عنوان — اسأليها عنه"}
              {fullAddress && <button type="button" onClick={() => copy(fullAddress)} className="ms-2 text-[11px] text-white/45 hover:text-white">نسخ</button>}
            </dd>
          </div>
          {order.note && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3">
              <dt className="text-[11px] text-amber-200/80">ملاحظة الزبونة</dt>
              <dd className="mt-1 whitespace-pre-line text-white/90">{order.note}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- WhatsApp */

function WhatsAppComposer({ order, storeName, deliveryFee }: { order: FullOrder; storeName: string; deliveryFee: number | null }) {
  const [kind, setKind] = useState<MessageKind>(() => messageForStatus(order.status));
  // null = the ready message (follows order changes); a string = the owner edited it.
  const [edited, setEdited] = useState<string | null>(null);
  const generated = useMemo(() => buildMessage(kind, order, { storeName, deliveryFee }), [kind, order, storeName, deliveryFee]);
  const text = edited ?? generated;
  const href = waLink(order.whatsapp || order.phone, text);

  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-white"><WhatsAppIcon className="h-4 w-4 text-emerald-300" />رسالة للزبونة</h2>
      <p className="mb-3 text-[11px] leading-5 text-white/45">اختاري رسالة جاهزة وعدّليها، ثم تفتح محادثة واتساب معها والرسالة مكتوبة.</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {MESSAGE_KINDS.map((m) => (
          <button key={m.kind} type="button" onClick={() => { setKind(m.kind); setEdited(null); }} aria-pressed={kind === m.kind}
            className={cn("h-8 rounded-full border px-3 text-xs", kind === m.kind ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100" : "border-white/[0.08] text-white/65 hover:text-white")}>
            {m.label}
          </button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setEdited(e.target.value)} className="h-44 w-full resize-y rounded-xl border border-white/[0.1] bg-surface-925 p-3 text-sm leading-6 text-white" aria-label="نص الرسالة" />
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400">
          <WhatsAppIcon className="h-4 w-4" />فتح واتساب وإرسال
        </a>
      ) : <p className="mt-2 text-xs text-red-300">لا يوجد رقم هاتف صالح.</p>}
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
      <h2 className="mb-3 text-base font-semibold text-white">سجل الطلب</h2>
      <div className="mb-4 flex gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void add(); }} placeholder="أضيفي ملاحظة داخلية…" className="h-10 flex-1 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white placeholder:text-white/35" aria-label="ملاحظة داخلية" />
        <button type="button" disabled={!note.trim() || saving} onClick={() => void add()} className="h-10 rounded-xl bg-white/[0.08] px-4 text-sm text-white hover:bg-white/[0.12] disabled:opacity-40">إضافة</button>
      </div>
      <ol className="relative space-y-4 border-r border-white/[0.08] pr-4">
        {items.map((h) => (
          <li key={h.id} className="relative">
            <span className="absolute -right-[1.36rem] top-1 h-2.5 w-2.5 rounded-full bg-accent-400" aria-hidden />
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
              {h.fromStatus !== h.toStatus ? <StatusPill status={h.toStatus} /> : <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-white/60">ملاحظة</span>}
              {dateTime(h.at)}
            </div>
            {h.note && <p className="mt-1 whitespace-pre-line text-sm text-white/85">{h.note}</p>}
          </li>
        ))}
        <li className="relative">
          <span className="absolute -right-[1.36rem] top-1 h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden />
          <div className="text-xs text-white/50">وصل الطلب · {dateTime(order.createdAt)}</div>
        </li>
      </ol>
    </section>
  );
}
