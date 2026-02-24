// src/features/orders/OrderDetailsPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useOrderDetails } from "../../hooks/useOrders";

import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Badge } from "../../components/ui/Badge";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";

import { formatCurrencyILS, formatDateTime } from "../../lib/format";
import type { OrderReqStatus, OrderRequest } from "../../types/orders";

import OrderStatusModal from "./OrderStatusModal";
import OrderMessageModal from "./OrderMessageModal";
import { getInvoiceHtml } from "@/api/orders.api";
import { toast } from "@/lib/toast";

function statusBadgeVariant(status: OrderReqStatus) {
  switch (status) {
    case "NEW":
      return "info";
    case "CONTACTED":
      return "warning";
    case "ACCEPTED":
      return "success";
    case "REJECTED":
      return "danger";
    case "SHIPPED":
      return "info";
    case "CLOSED":
      return "default";
    case "CANCELED":
      return "danger";
    case "REFUNDED":
      return "warning";
    default:
      return "default";
  }
}

export default function OrderDetailsPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  const q = useOrderDetails(id ?? null);
  const order = (q.data as OrderRequest | undefined) ?? undefined;

  const [openStatus, setOpenStatus] = useState(false);
  const [openMessage, setOpenMessage] = useState(false);

  const [printing, setPrinting] = useState(false);

  async function handlePrintInvoice() {
    if (!id) return;
    let w: Window | null = null;
    setPrinting(true);

    try {
      // Open the popup synchronously to avoid browser popup blockers.
      w = window.open("", "_blank");
      if (!w) {
        toast.error("المتصفح منع فتح نافذة الطباعة. فعّل Popups للموقع.");
        return;
      }
      try {
        w.opener = null;
      } catch {
        // ignore
      }

      // Minimal loading screen while we fetch the invoice HTML.
      w.document.open();
      w.document.write(
        `<!doctype html><html><head><meta charset="utf-8" />
         <title>Invoice</title>
         <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0b1220;color:#fff}</style>
         </head><body>جاري تحميل الفاتورة...</body></html>`
      );
      w.document.close();

      const res: any = await getInvoiceHtml(id);
      const html = typeof res === "string" ? res : res?.html ?? String(res ?? "");

      w.document.open();
      w.document.write(
        html ||
          `<!doctype html><html><head><meta charset="utf-8" /><title>Invoice</title></head><body>لا يوجد HTML للفاتورة.</body></html>`
      );
      w.document.close();

      // Give the browser a tick to load fonts/images.
      setTimeout(() => {
        try {
          w?.focus();
          w?.print();
        } catch {
          // ignore
        }
      }, 250);
    } catch (e: any) {
      // Don't leave the user with a blank tab.
      try {
        if (w && !w.closed) {
          const msg = e?.response?.data?.message ?? e?.message ?? "فشل إنشاء الفاتورة";
          w.document.open();
          w.document.write(
            `<!doctype html><html><head><meta charset="utf-8" /><title>Invoice Error</title>
             <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:24px;background:#0b1220;color:#fff}pre{white-space:pre-wrap;background:#111827;border:1px solid rgba(255,255,255,.12);padding:12px;border-radius:12px}</style>
             </head><body><h2>فشل إنشاء الفاتورة</h2><pre>${String(msg)}</pre></body></html>`
          );
          w.document.close();
        }
      } catch {
        // ignore
      }

      toast.error(e?.response?.data?.message ?? "فشل إنشاء الفاتورة");
    } finally {
      setPrinting(false);
    }
  }

  const variantInfo = useMemo(() => {
    const v: any = order?.variant;
    if (!v) return null;
    const size = v.size?.name ?? v.sizeId;
    const productTitle = v.item?.product?.title ?? "";
    const color = v.item?.colorName ?? "";
    return { sku: v.sku, price: v.price, size, productTitle, color };
  }, [order]);

  const items = order?.items ?? [];
  const subtotal = Number(order?.subtotal ?? 0);
  const discountAmount = Number(order?.discountAmount ?? 0);
  const total = Number(order?.total ?? Math.max(0, subtotal - discountAmount));

  if (q.isLoading) {
    return (
      <div dir="rtl" className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handlePrintInvoice} disabled={printing}>
            طباعة فاتورة
          </Button>

          <Spinner />
          <div className="text-sm opacity-80">جاري التحميل…</div>
        </div>
      </div>
    );
  }

  if (q.isError || !order) {
    return (
      <div dir="rtl" className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
        فشل تحميل تفاصيل الطلب.
        <div className="mt-4">
          <Button variant="ghost" onClick={() => nav("/admin/orders")}>
            رجوع للطلبات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-semibold">تفاصيل الطلب</div>
            <div className="mt-1 text-xs opacity-70">
              ID: <span className="opacity-100">{order.id}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => nav("/admin/orders")}>
              رجوع
            </Button>
            <Button variant="secondary" onClick={handlePrintInvoice} disabled={printing}>
              {printing ? "جاري الطباعة…" : "طباعة فاتورة"}
            </Button>
            <Button variant="secondary" onClick={() => setOpenMessage(true)}>
              إرسال رسالة
            </Button>
            <Button variant="primary" onClick={() => setOpenStatus(true)}>
              تغيير الحالة
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">الحالة</div>
            <div className="mt-2">
              <Badge variant={statusBadgeVariant(order.status) as any}>{order.status}</Badge>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">العميل</div>
            <div className="mt-2 font-semibold">{order.customerName}</div>
            <div className="mt-1 text-xs opacity-70" dir="ltr">
              {order.phone}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">التاريخ</div>
            <div className="mt-2 text-sm">{formatDateTime(order.createdAt)}</div>
            <div className="mt-1 text-xs opacity-70">آخر تحديث: {formatDateTime(order.updatedAt)}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">المجموع</div>
            <div className="mt-2 text-sm font-semibold tabular-nums">{formatCurrencyILS(subtotal)}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">الخصم</div>
            <div className="mt-2 text-sm font-semibold tabular-nums">{formatCurrencyILS(discountAmount)}</div>
            {order.couponCode ? (
              <div className="mt-1 text-xs opacity-70" dir="ltr">
                كود: <span className="opacity-100">{order.couponCode}</span>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70">الإجمالي بعد الخصم</div>
            <div className="mt-2 text-sm font-semibold tabular-nums">{formatCurrencyILS(total)}</div>
          </div>

          {items.length === 0 && variantInfo ? (
            <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs opacity-70">المنتج</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-xs opacity-70">الاسم</div>
                  <div className="text-sm font-semibold">{variantInfo.productTitle || "-"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">اللون</div>
                  <div className="text-sm">{variantInfo.color || "-"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">المقاس</div>
                  <div className="text-sm">{variantInfo.size || "-"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">السعر</div>
                  <div className="text-sm">{formatCurrencyILS(variantInfo.price as any)}</div>
                </div>
              </div>
              <div className="mt-2 text-xs opacity-70">
                SKU: <span className="opacity-100" dir="ltr">{variantInfo.sku}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">المنتجات</div>
          <div className="text-xs opacity-70">OrderRequestItem</div>
        </div>

        {items.length ? (
                    <>
            <div className="space-y-3 sm:hidden">
              {items.map((it: any) => (
                <div key={it.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    {it.imageUrl ? (
                      <img
                        src={it.imageUrl}
                        alt={it.productTitle}
                        className="h-10 w-10 rounded-lg object-cover border border-white/10"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-white/10 border border-white/10" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{it.productTitle ?? "-"}</div>
                      <div className="text-xs opacity-70" dir="ltr">{it.sku ?? it.variantId}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {it.colorName ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                        <span
                          className="h-3 w-3 rounded-full border border-white/20"
                          style={{ background: it.colorHex ?? "#999" }}
                        />
                        <span>{it.colorName}</span>
                      </span>
                    ) : (
                      <span className="opacity-60">-</span>
                    )}
                    {it.sizeName ? (
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1">
                        {it.sizeName}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/70">
                    <div>الكمية: <span className="text-white tabular-nums">{it.quantity ?? 1}</span></div>
                    <div>سعر الوحدة: <span className="text-white tabular-nums">{formatCurrencyILS(it.unitPrice)}</span></div>
                    <div>الإجمالي: <span className="text-white tabular-nums">{formatCurrencyILS(it.lineSubtotal)}</span></div>
                    <div>الخصم: <span className="text-white tabular-nums">{formatCurrencyILS(it.lineDiscount ?? 0)}</span></div>
                    <div className="col-span-2">الصافي: <span className="text-white tabular-nums">{formatCurrencyILS(it.lineTotal ?? it.lineSubtotal)}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              <Table>
                <THead>
                  <TR>
                    <TH>المنتج</TH>
                    <TH>الخصائص</TH>
                    <TH>الكمية</TH>
                    <TH>سعر</TH>
                    <TH>سعر الإجمالي</TH>
                    <TH>خصم</TH>
                    <TH>الإجمالي</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((it: any) => (
                    <TR key={it.id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          {it.imageUrl ? (
                            <img
                              src={it.imageUrl}
                              alt={it.productTitle}
                              className="h-10 w-10 rounded-lg object-cover border border-white/10"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-white/10 border border-white/10" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate max-w-[280px]">{it.productTitle ?? "-"}</div>
                            <div className="text-xs opacity-70" dir="ltr">{it.sku ?? it.variantId}</div>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          {it.colorName ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                              <span
                                className="h-3 w-3 rounded-full border border-white/20"
                                style={{ background: it.colorHex ?? "#999" }}
                              />
                              <span>{it.colorName}</span>
                            </span>
                          ) : (
                            <span className="opacity-60">-</span>
                          )}
                          {it.sizeName ? (
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1">
                              {it.sizeName}
                            </span>
                          ) : null}
                        </div>
                      </TD>
                      <TD className="tabular-nums">{it.quantity ?? 1}</TD>
                      <TD className="tabular-nums">{formatCurrencyILS(it.unitPrice)}</TD>
                      <TD className="tabular-nums">{formatCurrencyILS(it.lineSubtotal)}</TD>
                      <TD className="tabular-nums">{formatCurrencyILS(it.lineDiscount ?? 0)}</TD>
                      <TD className="tabular-nums">{formatCurrencyILS(it.lineTotal ?? it.lineSubtotal)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-sm opacity-70">لا يوجد items مسجلة لهذا الطلب (قديم).</div>
        )}
      </div>

      {/* History */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">سجل الحالات</div>
          <div className="text-xs opacity-70">OrderRequestHistory</div>
        </div>

                <>
          <div className="space-y-3 sm:hidden">
            {(order.history ?? []).length ? (
              (order.history ?? []).map((h: any) => (
                <div key={h.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs opacity-70">{formatDateTime(h.at)}</div>
                    <Badge variant={statusBadgeVariant(h.toStatus) as any}>{h.toStatus}</Badge>
                  </div>
                  <div className="mt-2 text-sm">{h.note ?? "-"}</div>
                  <div className="mt-1 text-xs opacity-70">{h.fromStatus ?? "-"}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm opacity-70">لا يوجد سجل.</div>
            )}
          </div>
          <div className="hidden sm:block">
            <Table>
              <THead>
                <TR>
                  <TH>من</TH>
                  <TH>إلى</TH>
                  <TH>الملاحظة</TH>
                  <TH>الوقت</TH>
                </TR>
              </THead>
              <TBody>
                {(order.history ?? []).length ? (
                  (order.history ?? []).map((h: any) => (
                    <TR key={h.id}>
                      <TD>{h.fromStatus ?? "-"}</TD>
                      <TD>
                        <Badge variant={statusBadgeVariant(h.toStatus) as any}>{h.toStatus}</Badge>
                      </TD>
                      <TD className="opacity-90">{h.note ?? "-"}</TD>
                      <TD>{formatDateTime(h.at)}</TD>
                    </TR>
                  ))
                ) : (
                  <TR>
                    <TD colSpan={4} className="opacity-70">
                      لا يوجد سجل.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </div>
        </>
      </div>

      {/* Outbox messages related (if backend includes them) */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">رسائل الإرسال</div>
          <div className="text-xs opacity-70">OutboxMessage</div>
        </div>

                <>
          <div className="space-y-3 sm:hidden">
            {(order.messages ?? []).length ? (
              (order.messages ?? []).map((m: any) => (
                <div key={m.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{m.channel}</div>
                    <div className="text-xs opacity-70">{formatDateTime(m.createdAt)}</div>
                  </div>
                  <div dir="ltr" className="mt-2 text-xs opacity-80">{m.to}</div>
                  <div className="mt-2 text-xs opacity-70">{m.status}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm opacity-70">لا يوجد رسائل.</div>
            )}
          </div>
          <div className="hidden sm:block">
            <Table>
              <THead>
                <TR>
                  <TH>القناة</TH>
                  <TH>إلى</TH>
                  <TH>الحالة</TH>
                  <TH>الوقت</TH>
                </TR>
              </THead>
              <TBody>
                {(order.messages ?? []).length ? (
                  (order.messages ?? []).map((m: any) => (
                    <TR key={m.id}>
                      <TD>{m.channel}</TD>
                      <TD dir="ltr" className="text-left">
                        {m.to}
                      </TD>
                      <TD>{m.status}</TD>
                      <TD>{formatDateTime(m.createdAt)}</TD>
                    </TR>
                  ))
                ) : (
                  <TR>
                    <TD colSpan={4} className="opacity-70">
                      لا يوجد رسائل.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </div>
        </>
      </div>

      <OrderStatusModal open={openStatus} order={order} onClose={() => setOpenStatus(false)} />
      <OrderMessageModal open={openMessage} order={order} onClose={() => setOpenMessage(false)} />
    </div>
  );
}



