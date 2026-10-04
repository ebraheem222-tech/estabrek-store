// src/features/orders/OrdersPage.tsx
// Orders inbox for a WhatsApp + cash-on-delivery shop: find any order by name,
// phone or number, see what each one needs, and move it forward in one tap.
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useOrdersActions, useOrdersList, useOrdersSummary } from "../../hooks/useOrders";
import { useDebounce } from "../../hooks/useDebounce";
import { Pagination } from "../../components/ui/Pagination";
import { cn } from "../../components/ui/cn";
import {
  NEXT_STEP_LABEL, ORDER_STATUSES, STATUS_INFO, buildMessage, dayStart, isPaid, itemsCount, messageForStatus, nextStep, orderLines,
  orderTotal, shekel, shortOrderId, timeAgo, waDigits, waLink, deliveryFor, type OrderLike, type OrderStatus,
} from "../../lib/orders";
import { DeliverySettingsDialog, PaidChip, SourceChip, StatusPill, Thumb, WhatsAppIcon } from "./orderUi";
import { useDelivery } from "./useDelivery";

type DateRange = "all" | "today" | "yesterday" | "week" | "month";
const RANGES: Array<{ key: DateRange; label: string }> = [
  { key: "all", label: "كل الأوقات" },
  { key: "today", label: "اليوم" },
  { key: "yesterday", label: "أمس" },
  { key: "week", label: "آخر ٧ أيام" },
  { key: "month", label: "آخر ٣٠ يوماً" },
];

function rangeDates(r: DateRange): { from?: string; to?: string } {
  switch (r) {
    case "today": return { from: dayStart(0) };
    case "yesterday": return { from: dayStart(-1), to: dayStart(-1) };
    case "week": return { from: dayStart(-6) };
    case "month": return { from: dayStart(-29) };
    default: return {};
  }
}

/** Same filters applied in the browser, so the list is right even before the server update. */
function matchesClient(o: OrderLike, f: { q: string; source: string; payment: string; city: string; from?: string; to?: string }) {
  if (f.q) {
    const q = f.q.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const phoneHit = digits.length >= 4 && [o.phone, o.whatsapp].some((p) => waDigits(p).includes(waDigits(digits) || digits) || String(p ?? "").replace(/\D/g, "").includes(digits));
    const textHit = [o.customerName, o.city, o.id].some((v) => String(v ?? "").toLowerCase().includes(q)) || shortOrderId(o.id).toLowerCase() === q.replace(/^#/, "");
    if (!phoneHit && !textHit) return false;
  }
  if (f.source && o.source !== f.source) return false;
  if (f.payment === "paid" && !isPaid(o)) return false;
  if (f.payment === "unpaid" && isPaid(o)) return false;
  if (f.city && !String(o.city ?? "").includes(f.city)) return false;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date(o.createdAt));
  if (f.from && day < f.from) return false;
  if (f.to && day > f.to) return false;
  return true;
}

export default function OrdersPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") || "") as "" | OrderStatus;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim(), 300);
  // ?range=today etc. opens the list on a period (used by the quick search).
  const [range, setRange] = useState<DateRange>(() => {
    const r = params.get("range");
    return RANGES.some((x) => x.key === r) ? (r as DateRange) : "all";
  });
  const [source, setSource] = useState("");
  const [payment, setPayment] = useState("");
  const [city, setCity] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { delivery, storeName } = useDelivery();
  // Refreshed with every poll, used for "new in the last hour".
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);

  const dates = rangeDates(range);
  const filters = { status: status || undefined, page, pageSize: 25, q: q || undefined, ...dates, source: source || undefined, city: city.trim() || undefined, payment: (payment || undefined) as "paid" | "unpaid" | undefined };
  const list = useOrdersList(filters);
  const summary = useOrdersSummary();
  const { updateStatus } = useOrdersActions();

  const orders = useMemo(
    () => ((list.data?.data ?? []) as OrderLike[]).filter((o) => matchesClient(o, { q, source, payment, city: city.trim(), ...dates })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.data, q, source, payment, city, range],
  );
  const counts = summary.data?.counts ?? {};
  const allCount = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const filtering = Boolean(q || source || payment || city.trim() || range !== "all");

  const setStatus = (s: "" | OrderStatus) => {
    const next = new URLSearchParams(params);
    if (s) next.set("status", s); else next.delete("status");
    setParams(next, { replace: true });
    setPage(1);
    setSelected({});
  };

  const bulkMove = async (to: OrderStatus) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    for (const id of selectedIds) {
      try { await updateStatus.mutateAsync({ id, toStatus: to }); } catch { /* toast shown by the hook */ }
    }
    setBulkBusy(false);
    setSelected({});
  };

  const printSelected = () => window.open(`/print/orders?ids=${selectedIds.join(",")}`, "_blank", "noopener");

  return (
    <div dir="rtl" className="space-y-4" data-testid="orders-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">الطلبات</h1>
          <p className="mt-1 text-sm text-white/55">
            {counts.NEW ? <><b className="text-sky-300">{counts.NEW}</b> طلب جديد ينتظر التواصل · </> : null}
            يتحدث تلقائياً كل ٣٠ ثانية
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDeliveryOpen(true)} className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm text-white/80 hover:bg-white/[0.06]">🚚 أسعار التوصيل</button>
          <button type="button" onClick={() => { void list.refetch(); void summary.refetch(); }} className="h-10 rounded-xl border border-white/[0.1] px-4 text-sm text-white/80 hover:bg-white/[0.06]">{list.isFetching ? "جارٍ التحديث…" : "↻ تحديث"}</button>
        </div>
      </div>

      {/* Status tabs with counts */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="حالة الطلب">
        <StatusTab active={!status} onClick={() => setStatus("")} label="الكل" count={allCount || undefined} />
        {ORDER_STATUSES.map((s) => (
          <StatusTab key={s} active={status === s} onClick={() => setStatus(s)} label={STATUS_INFO[s].label} count={counts[s]} highlight={s === "NEW" && (counts.NEW ?? 0) > 0} />
        ))}
      </div>

      {/* Search + filters */}
      <div className="glass rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="ابحثي بالاسم أو رقم الهاتف أو رقم الطلب"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-925 pe-3 ps-10 text-sm text-white placeholder:text-white/35 focus:border-accent-500/50 focus:outline-none"
              aria-label="بحث في الطلبات"
              type="search"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40" aria-hidden>⌕</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => (
              <button key={r.key} type="button" onClick={() => { setRange(r.key); setPage(1); }} aria-pressed={range === r.key}
                className={cn("h-9 rounded-full border px-3 text-xs transition", range === r.key ? "border-accent-500/60 bg-accent-500/20 text-white" : "border-white/[0.08] text-white/65 hover:text-white")}>
                {r.label}
              </button>
            ))}
            <button type="button" onClick={() => setShowMore((v) => !v)} className="h-9 rounded-full px-3 text-xs text-accent-300 hover:bg-accent-500/10">{showMore ? "فلاتر أقل" : "فلاتر أكثر"}</button>
          </div>
        </div>
        {showMore && (
          <div className="mt-3 flex flex-wrap gap-2">
            <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-white/[0.08] bg-surface-925 px-3 text-sm text-white" aria-label="مصدر الطلب">
              <option value="">كل المصادر</option>
              <option value="WHATSAPP_CART">واتساب</option>
              <option value="DIRECT_CART">طلب مباشر</option>
              <option value="EMAIL_CART">إيميل</option>
            </select>
            <select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-white/[0.08] bg-surface-925 px-3 text-sm text-white" aria-label="الدفع">
              <option value="">الدفع: الكل</option>
              <option value="unpaid">لم يُستلم المبلغ</option>
              <option value="paid">تم استلام المبلغ</option>
            </select>
            <input value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} placeholder="المدينة" className="h-10 w-40 rounded-xl border border-white/[0.08] bg-surface-925 px-3 text-sm text-white placeholder:text-white/35" aria-label="المدينة" />
            {filtering && <button type="button" onClick={() => { setSearch(""); setRange("all"); setSource(""); setPayment(""); setCity(""); }} className="h-10 rounded-xl px-3 text-sm text-white/60 hover:text-white">مسح الفلاتر</button>}
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-accent-500/30 bg-surface-950/95 p-3 backdrop-blur">
          <span className="text-sm text-white/80">تم اختيار <b>{selectedIds.length}</b></span>
          <select disabled={bulkBusy} defaultValue="" onChange={(e) => { const v = e.target.value as OrderStatus; e.target.value = ""; if (v) void bulkMove(v); }} className="h-9 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white" aria-label="تغيير حالة المختار">
            <option value="">{bulkBusy ? "جارٍ التحديث…" : "تغيير الحالة إلى…"}</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_INFO[s].label}</option>)}
          </select>
          <button type="button" onClick={printSelected} className="h-9 rounded-xl border border-white/[0.1] px-3 text-sm text-white/85 hover:bg-white/[0.06]">🖨 طباعة الفواتير</button>
          <button type="button" onClick={() => setSelected({})} className="ms-auto h-9 rounded-xl px-3 text-sm text-white/55 hover:text-white">إلغاء الاختيار</button>
        </div>
      )}

      {/* List */}
      <div className="glass overflow-hidden rounded-2xl">
        {list.isLoading ? (
          <div className="space-y-2 p-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />)}</div>
        ) : list.isError ? (
          <div className="p-10 text-center text-sm text-red-300">تعذّر تحميل الطلبات. <button type="button" className="underline" onClick={() => void list.refetch()}>إعادة المحاولة</button></div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl" aria-hidden>🌸</div>
            <div className="mt-3 text-sm text-white/70">{filtering ? "لا توجد طلبات بهذه الفلاتر." : status ? `لا توجد طلبات «${STATUS_INFO[status].label}» حالياً.` : "لا توجد طلبات بعد."}</div>
          </div>
        ) : (
          <>
            <div className="hidden items-center gap-3 border-b border-white/[0.06] px-4 py-2 text-[11px] text-white/45 md:flex">
              <input type="checkbox" aria-label="اختيار الكل" checked={orders.every((o) => selected[o.id])} onChange={(e) => setSelected(e.target.checked ? Object.fromEntries(orders.map((o) => [o.id, true])) : {})} />
              <span className="flex-1">الزبونة والطلب</span>
              <span className="w-24 text-center">المبلغ</span>
              <span className="w-28 text-center">الحالة</span>
              <span className="w-[220px] text-left">إجراءات</span>
            </div>
            <ul className="divide-y divide-white/[0.06]">
              {orders.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  now={now}
                  selected={!!selected[o.id]}
                  onSelect={(v) => setSelected((s) => ({ ...s, [o.id]: v }))}
                  onOpen={() => nav(`/admin/orders/${o.id}`)}
                  onAdvance={(to) => updateStatus.mutate({ id: o.id, toStatus: to })}
                  busy={updateStatus.isPending && updateStatus.variables?.id === o.id}
                  whatsappHref={waLink(o.whatsapp || o.phone, buildMessage(messageForStatus(o.status), o, { storeName, deliveryFee: deliveryFor(o.city, orderTotal(o), delivery).fee }))}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <Pagination page={page} totalPages={list.data?.totalPages ?? 1} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />

      <DeliverySettingsDialog open={deliveryOpen} value={delivery} onClose={() => setDeliveryOpen(false)} />
    </div>
  );
}

function StatusTab({ active, onClick, label, count, highlight }: { active: boolean; onClick: () => void; label: string; count?: number; highlight?: boolean }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick}
      className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm transition", active ? "border-accent-500/60 bg-accent-500/20 text-white" : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:text-white")}>
      {label}
      {count != null && count > 0 && <span className={cn("min-w-[1.4rem] rounded-full px-1.5 text-center text-[11px] font-semibold", highlight ? "bg-sky-400 text-sky-950" : "bg-white/10 text-white/70")}>{count}</span>}
    </button>
  );
}

function OrderRow({ order: o, now, selected, onSelect, onOpen, onAdvance, busy, whatsappHref }: {
  order: OrderLike; now: number; selected: boolean; onSelect: (v: boolean) => void; onOpen: () => void; onAdvance: (to: OrderStatus) => void; busy: boolean; whatsappHref: string | null;
}) {
  const lines = orderLines(o);
  const next = nextStep(o.status);
  const fresh = o.status === "NEW" && now - new Date(o.createdAt).getTime() < 3600_000;
  const first = lines[0];
  return (
    <li className={cn("group relative flex flex-wrap items-center gap-3 px-3 py-3 transition hover:bg-white/[0.025] md:flex-nowrap md:px-4", fresh && "bg-sky-500/[0.05]")} data-testid="order-row">
      {fresh && <span className="absolute inset-y-0 right-0 w-1 bg-sky-400" aria-hidden />}
      <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} aria-label={`اختيار طلب ${o.customerName}`} />
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 basis-[calc(100%-2.5rem)] items-center gap-3 text-right md:basis-auto">
        <Thumb src={first?.imageUrl} className="h-14 w-11" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <b className="truncate text-sm text-white">{o.customerName}</b>
            <span className="text-[11px] text-white/40" dir="ltr">#{shortOrderId(o.id)}</span>
            <SourceChip source={o.source} />
          </span>
          <span className="mt-0.5 block truncate text-xs text-white/60">
            {first?.productTitle}{lines.length > 1 ? ` +${lines.length - 1}` : ""} · {itemsCount(o)} قطع{o.city ? ` · ${o.city}` : ""}
          </span>
          <span className="mt-0.5 block text-[11px] text-white/40"><span dir="ltr">{o.phone}</span> · {timeAgo(o.createdAt)}</span>
        </span>
      </button>
      <div className="flex items-center gap-2 ps-7 md:block md:w-24 md:ps-0 md:text-center">
        <div className="text-sm font-semibold text-white">{shekel(orderTotal(o))}</div>
        <div className="md:mt-0.5"><PaidChip order={o} /></div>
      </div>
      <div className="md:w-28 md:text-center"><StatusPill status={o.status} /></div>
      <div className="flex w-full items-center justify-end gap-1.5 md:w-[220px]">
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" title="رسالة واتساب جاهزة" aria-label={`واتساب ${o.customerName}`}>
            <WhatsAppIcon className="h-4 w-4" />
          </a>
        )}
        {next && (
          <button type="button" disabled={busy} onClick={() => onAdvance(next)} className="h-9 rounded-xl bg-accent-500/20 px-3 text-xs font-medium text-accent-100 hover:bg-accent-500/30 disabled:opacity-50">
            {busy ? "…" : NEXT_STEP_LABEL[next]}
          </button>
        )}
        <Link to={`/admin/orders/${o.id}`} className="h-9 rounded-xl px-3 text-xs leading-9 text-white/60 hover:bg-white/[0.06] hover:text-white">فتح</Link>
      </div>
    </li>
  );
}
