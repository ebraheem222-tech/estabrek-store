// src/features/orders/OrdersPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "../../hooks/useOrders";
import type { OrderReqStatus } from "../../types/orders";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { Skeleton } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/EmptyState";
import { formatDateTime, formatPrice } from "../../lib/format";
import { cn } from "../../components/ui/cn";

const STATUS_OPTIONS = [
  { value: "", label: "جميع الحالات" },
  { value: "NEW", label: "جديد" },
  { value: "CONTACTED", label: "تم التواصل" },
  { value: "ACCEPTED", label: "مقبول" },
  { value: "REJECTED", label: "مرفوض" },
  { value: "SHIPPED", label: "تم الشحن" },
  { value: "CLOSED", label: "مغلق" },
  { value: "CANCELED", label: "ملغي" },
  { value: "REFUNDED", label: "مسترجع" },
];

function statusVariant(status?: string) {
  switch (status) {
    case "NEW": return "info";
    case "CONTACTED": return "warning";
    case "ACCEPTED": return "success";
    case "REJECTED": return "danger";
    case "SHIPPED": return "accent";
    case "CLOSED": return "default";
    case "CANCELED": return "danger";
    case "REFUNDED": return "warning";
    default: return "default";
  }
}

function statusLabel(status?: string) {
  switch (status) {
    case "NEW": return "جديد";
    case "CONTACTED": return "تم التواصل";
    case "ACCEPTED": return "مقبول";
    case "REJECTED": return "مرفوض";
    case "SHIPPED": return "تم الشحن";
    case "CLOSED": return "مغلق";
    case "CANCELED": return "ملغي";
    case "REFUNDED": return "مسترجع";
    default: return status;
  }
}

function orderSummary(order: any) {
  const items = order.items ?? [];
  if (items.length) {
    const first = items[0];
    return items.length > 1 ? `${first.productTitle} +${items.length - 1}` : first.productTitle;
  }
  return order.variant?.item?.product?.title ?? "-";
}

function orderQty(order: any) {
  const items = order.items ?? [];
  if (items.length) return items.reduce((s: number, it: any) => s + (it.quantity ?? 0), 0);
  return order.quantity ?? 1;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | OrderReqStatus>("");
  
  const { ordersQuery } = useOrders({ page, status: status || undefined });

  const data = ordersQuery.data;
  const orders = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  if (ordersQuery.isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">الطلبات</h2>
          <p className="text-sm text-white/50 mt-1">
            {total > 0 ? `${total} طلب` : "لا توجد طلبات"}
          </p>
        </div>
        
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => {
              const v = e.target.value;
              setStatus(v === "" ? "" : (v as OrderReqStatus));
              setPage(1);
            }}
            className="w-full sm:w-40"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => ordersQuery.refetch()}
            title="تحديث"
          >
            <svg className={cn("w-5 h-5", ordersQuery.isFetching && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <EmptyState
          title="لا توجد طلبات"
          description={status ? "لا توجد طلبات بهذه الحالة" : "لم يتم تسجيل أي طلب بعد"}
          action={
            status && (
              <Button variant="secondary" onClick={() => setStatus("")}>
                مسح الفلاتر
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {orders.map((order: any, index: number) => (
              <button
                key={order.id}
                type="button"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-right transition hover:bg-white/[0.05] animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => navigate(`/admin/orders/${order.id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={statusVariant(order.status) as any} dot>
                    {statusLabel(order.status)}
                  </Badge>
                  <div className="text-xs text-white/60 tabular-nums whitespace-nowrap">
                    {formatDateTime(order.createdAt)}
                  </div>
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{order.customerName ?? "-"}</div>
                <div className="mt-1 text-xs text-white/60" dir="ltr">{order.phone ?? "-"}</div>
                <div className="mt-2 text-sm text-white/80">{orderSummary(order)}</div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/60">
                  <span>{orderQty(order)} qty</span>
                  <span className="text-sm font-semibold text-white">
                    {order.total != null ? formatPrice(order.total) : "-"}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="hidden sm:block glass rounded-2xl overflow-hidden">
            <Table>
              <THead>
                <TR>
                  <TH>الحالة</TH>
                  <TH>العميل</TH>
                  <TH>الهاتف</TH>
                  <TH>المنتجات</TH>
                  <TH>عدد القطع</TH>
                  <TH>الإجمالي</TH>
                  <TH>التاريخ</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {orders.map((order: any, index: number) => (
                  <TR
                    key={order.id}
                    className="cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <TD>
                      <Badge variant={statusVariant(order.status) as any} dot>
                        {statusLabel(order.status)}
                      </Badge>
                    </TD>
                    <TD className="font-medium text-white">
                      {order.customerName ?? "-"}
                    </TD>
                    <TD className="text-white/60 font-mono text-xs" dir="ltr">
                      {order.phone ?? "-"}
                    </TD>
                    <TD className="text-white/70 text-sm max-w-[240px] truncate">
                      {orderSummary(order)}
                    </TD>
                    <TD className="text-white/60 tabular-nums">
                      {orderQty(order)}
                    </TD>
                    <TD className="text-white font-medium tabular-nums">
                      {order.total != null ? formatPrice(order.total) : "-"}
                    </TD>
                    <TD className="text-white/50 text-xs tabular-nums whitespace-nowrap">
                      {formatDateTime(order.createdAt)}
                    </TD>
                    <TD>
                      <button className="p-2 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
        />
      )}
    </div>
  );
}

