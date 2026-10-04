// src/features/orders/OrderPrintPage.tsx
// Printable Arabic invoice (A4) or delivery label for one or many orders:
// /print/orders?ids=a,b,c&type=invoice|slip
import React, { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { getOrder } from "../../api/orders.api";
import { dateTime, deliveryFor, isPaid, num, orderLines, orderTotal, shekel, shortOrderId, type OrderLike } from "../../lib/orders";
import { useDelivery } from "./useDelivery";

const css = `
  .print-root { background:#f5f1ee; color:#2a1b22; min-height:100vh; padding:24px; font-family:"IBM Plex Sans Arabic","Cairo",system-ui,sans-serif; }
  .sheet { background:#fff; width:210mm; min-height:148mm; margin:0 auto 24px; padding:14mm 14mm 12mm; box-shadow:0 10px 40px -20px rgba(60,20,40,.35); border-radius:8px; }
  .slip { width:148mm; min-height:100mm; padding:10mm; }
  .print-root h1,.print-root h2 { margin:0; }
  .brand { display:flex; align-items:center; justify-content:space-between; gap:16px; border-bottom:2px solid #7d2448; padding-bottom:10px; }
  .brand img { height:44px; width:auto; }
  .brand .name { font-size:26px; font-weight:700; color:#7d2448; }
  .muted { color:#7a6570; font-size:12px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:14px 0; }
  .box { border:1px solid #ecdde4; border-radius:10px; padding:10px 12px; font-size:13px; line-height:1.8; }
  .box b { color:#2a1b22; }
  table.lines { width:100%; border-collapse:collapse; font-size:13px; }
  table.lines th { background:#f8eef2; color:#5e2a42; font-weight:600; text-align:right; padding:8px; }
  table.lines td { border-bottom:1px solid #f0e4ea; padding:8px; vertical-align:middle; }
  table.lines td.n, table.lines th.n { text-align:left; white-space:nowrap; }
  .thumb { width:34px; height:42px; object-fit:cover; border-radius:6px; background:#f4ebe3; }
  .totals { margin-top:10px; margin-inline-start:auto; width:60%; font-size:13px; }
  .totals div { display:flex; justify-content:space-between; padding:4px 0; }
  .totals .grand { border-top:2px solid #7d2448; margin-top:6px; padding-top:8px; font-size:17px; font-weight:700; color:#7d2448; }
  .stamp { display:inline-block; border:2px solid #2f7a52; color:#2f7a52; border-radius:8px; padding:2px 10px; font-weight:700; transform:rotate(-4deg); }
  .collect { font-size:30px; font-weight:800; color:#7d2448; }
  .pr-toolbar { position:sticky; top:0; display:flex; gap:8px; justify-content:center; margin-bottom:16px; }
  .pr-toolbar button { background:#7d2448; color:#fff; border:0; border-radius:10px; padding:10px 18px; font:inherit; cursor:pointer; }
  .pr-toolbar button.alt { background:#fff; color:#7d2448; border:1px solid #e3cdd8; }
  @media screen and (max-width: 820px) {
    .print-root { padding:12px; }
    .sheet { width:auto; padding:16px; }
    .grid2 { grid-template-columns:1fr; }
    .totals { width:100%; }
  }
  @media print {
    @page { size: auto; margin: 8mm; }
    body { background:#fff !important; }
    .print-root { background:#fff; padding:0; }
    .pr-toolbar { display:none; }
    .sheet { box-shadow:none; margin:0; border-radius:0; page-break-after:always; break-after:page; width:auto; }
  }
`;

export default function OrderPrintPage() {
  const [params, setParams] = useSearchParams();
  const ids = useMemo(() => (params.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean), [params]);
  const type = params.get("type") === "slip" ? "slip" : "invoice";
  const { delivery, storeName, logoUrl, storePhone, loaded } = useDelivery();
  const results = useQueries({ queries: ids.map((id) => ({ queryKey: ["admin", "orders", "details", id], queryFn: () => getOrder(id) })) });
  const ready = results.length > 0 && results.every((r) => !r.isLoading);
  const orders = results.map((r) => r.data as (OrderLike & { couponCode?: string | null }) | undefined).filter(Boolean) as OrderLike[];

  useEffect(() => {
    document.title = type === "slip" ? "ملصقات التوصيل" : "فواتير";
    if (!ready || !loaded) return;
    const t = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(t);
  }, [ready, loaded, type]);

  const setType = (t: "invoice" | "slip") => { const n = new URLSearchParams(params); n.set("type", t); setParams(n, { replace: true }); };

  return (
    <div dir="rtl" className="print-root" data-testid="print-page">
      <style>{css}</style>
      <div className="pr-toolbar">
        <button type="button" onClick={() => window.print()}>🖨 طباعة</button>
        <button type="button" className="alt" onClick={() => setType(type === "slip" ? "invoice" : "slip")}>{type === "slip" ? "عرض الفواتير" : "عرض ملصقات التوصيل"}</button>
      </div>
      {!ready && <p style={{ textAlign: "center" }}>جارٍ تحميل {ids.length} طلب…</p>}
      {ready && !orders.length && <p style={{ textAlign: "center" }}>لم نجد الطلبات.</p>}
      {orders.map((o) => {
        const subtotal = o.subtotal != null ? num(o.subtotal) : orderLines(o).reduce((s, l) => s + num(l.lineSubtotal ?? num(l.unitPrice) * l.quantity), 0);
        const discount = num(o.discountAmount);
        const total = orderTotal(o);
        const d = deliveryFor(o.city, subtotal, delivery);
        const collect = total + (d.fee ?? 0);
        const address = [o.city, o.address].filter(Boolean).join("، ");
        if (type === "slip") {
          return (
            <section key={o.id} className="sheet slip">
              <div className="brand"><span className="name">{storeName}</span><span className="muted" dir="ltr">#{shortOrderId(o.id)}</span></div>
              <div style={{ marginTop: 12, fontSize: 15, lineHeight: 1.9 }}>
                <div><span className="muted">إلى: </span><b style={{ fontSize: 20 }}>{o.customerName}</b></div>
                <div><span className="muted">هاتف: </span><b dir="ltr">{o.phone}</b></div>
                <div><span className="muted">العنوان: </span><b>{address || "—"}</b></div>
                {o.note ? <div><span className="muted">ملاحظة: </span>{o.note}</div> : null}
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div><div className="muted">المبلغ عند الاستلام</div><div className="collect">{isPaid(o) ? "مدفوع" : shekel(collect)}</div></div>
                <div className="muted" style={{ textAlign: "left" }}>{orderLines(o).reduce((s, l) => s + l.quantity, 0)} قطع<br />{storePhone ? <span dir="ltr">{storePhone}</span> : null}</div>
              </div>
            </section>
          );
        }
        return (
          <section key={o.id} className="sheet">
            <div className="brand">
              <div>{logoUrl ? <img src={logoUrl} alt={storeName} /> : <span className="name">{storeName}</span>}</div>
              <div style={{ textAlign: "left" }}>
                <h1 style={{ fontSize: 20, color: "#7d2448" }}>فاتورة</h1>
                <div className="muted" dir="ltr">#{shortOrderId(o.id)}</div>
                <div className="muted">{dateTime(o.createdAt)}</div>
              </div>
            </div>
            <div className="grid2">
              <div className="box"><div className="muted">الزبونة</div><b>{o.customerName}</b><br /><span dir="ltr">{o.phone}</span><br />{address || "—"}</div>
              <div className="box"><div className="muted">الدفع والتوصيل</div>{isPaid(o) ? <span className="stamp">مدفوع</span> : <b>الدفع نقداً عند الاستلام</b>}<br />التوصيل: {d.zone?.name ?? (o.city || "—")}{o.note ? <><br /><span className="muted">ملاحظة: </span>{o.note}</> : null}</div>
            </div>
            <table className="lines">
              <thead><tr><th></th><th>القطعة</th><th>اللون / المقاس</th><th className="n">السعر</th><th className="n">الكمية</th><th className="n">المجموع</th></tr></thead>
              <tbody>
                {orderLines(o).map((l, i) => (
                  <tr key={i}>
                    <td style={{ width: 40 }}>{l.imageUrl ? <img className="thumb" src={l.imageUrl} alt="" /> : null}</td>
                    <td><b>{l.productTitle}</b>{l.sku ? <div className="muted" dir="ltr">{l.sku}</div> : null}</td>
                    <td>{[l.colorName, l.sizeName].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="n">{shekel(l.unitPrice)}</td>
                    <td className="n">{l.quantity}</td>
                    <td className="n">{shekel(l.lineTotal ?? l.lineSubtotal ?? num(l.unitPrice) * l.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="totals">
              <div><span>المجموع</span><span>{shekel(subtotal)}</span></div>
              {discount > 0 ? <div><span>الخصم{o.couponCode ? ` (${o.couponCode})` : ""}</span><span>−{shekel(discount)}</span></div> : null}
              <div><span>التوصيل</span><span>{d.fee == null ? "—" : d.free ? "مجاني" : shekel(d.fee)}</span></div>
              <div className="grand"><span>{isPaid(o) ? "المدفوع" : "المطلوب عند الاستلام"}</span><span>{shekel(collect)}</span></div>
            </div>
            <p className="muted" style={{ marginTop: 18, textAlign: "center" }}>شكراً لاختياركِ {storeName} 🌸{storePhone ? <> · للاستفسار: <span dir="ltr">{storePhone}</span></> : null}</p>
          </section>
        );
      })}
    </div>
  );
}
