// src/features/dashboard/DashboardPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "../../hooks/useDashboard";
import { useAuth } from "../../hooks/useAuth";
import { Spinner, Skeleton } from "../../components/ui/Spinner";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { formatDateTime } from "../../lib/format";
import { cn } from "../../components/ui/cn";
import type { AdminPermission } from "../../lib/authz";

// Icons
const Icons = {
  orders: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  products: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  outbox: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  reviews: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  arrowUp: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
    </svg>
  ),
  arrowDown: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
    </svg>
  ),
};

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

type StatCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: { value: number; up: boolean };
  color?: "default" | "success" | "warning" | "danger" | "accent";
  delay?: number;
};

function StatCard({ label, value, icon, trend, color = "default", delay = 0 }: StatCardProps) {
  const colors = {
    default: "from-white/[0.04] to-transparent border-white/[0.06]",
    success: "from-emerald-500/10 to-transparent border-emerald-500/20",
    warning: "from-amber-500/10 to-transparent border-amber-500/20",
    danger: "from-red-500/10 to-transparent border-red-500/20",
    accent: "from-accent-500/10 to-transparent border-accent-500/20",
  };

  const iconColors = {
    default: "text-white/60",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-red-400",
    accent: "text-accent-400",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-lg",
        colors[color],
        "animate-fade-in-up"
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
      </div>

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-white/50 font-medium">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">{value.toLocaleString("ar-SA")}</p>
          {trend && (
            <div className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              trend.up ? "text-emerald-400" : "text-red-400"
            )}>
              {trend.up ? Icons.arrowUp : Icons.arrowDown}
              <span>{trend.value}%</span>
              <span className="text-white/40">من أمس</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center bg-white/[0.05]",
          iconColors[color]
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function OrderStatusCard({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  const colorClasses: Record<string, string> = {
    NEW: "bg-blue-500",
    CONTACTED: "bg-amber-500",
    ACCEPTED: "bg-emerald-500",
    REJECTED: "bg-red-500",
    SHIPPED: "bg-accent-500",
    CLOSED: "bg-white/30",
    CANCELED: "bg-rose-500",
    REFUNDED: "bg-violet-400",
  };

  return (
    <div
      className="flex items-center justify-between py-3 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-center gap-3">
        <span className={cn("w-2 h-2 rounded-full", colorClasses[color] || "bg-white/30")} />
        <span className="text-sm text-white/70">{label}</span>
      </div>
      <span className="text-lg font-semibold text-white tabular-nums">{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { overviewQuery } = useDashboard();

  if (overviewQuery.isLoading) {
    return <LoadingSkeleton />;
  }

  if (overviewQuery.isError) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">فشل تحميل البيانات</h3>
        <p className="mt-2 text-sm text-white/50">حدث خطأ أثناء تحميل لوحة التحكم. يرجى المحاولة مرة أخرى.</p>
        <Button variant="secondary" className="mt-4" onClick={() => overviewQuery.refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const data: any = overviewQuery.data ?? {};
  const counts = data.counts ?? {};
  const latestOrders = data.latestOrders ?? [];
  const ordersByStatus = counts.ordersByStatus ?? {};
  const canReadOrders = hasPermission("orders:read");
  const canReadCatalog = hasPermission("catalog:read");
  const canReadOutbox = hasPermission("outbox:read");
  const canReadUgc = hasPermission("ugc:read");

  const can = (permission: AdminPermission) => hasPermission(permission);

  const mainStats = [
    canReadOrders
      ? { label: "إجمالي الطلبات", value: counts.orders ?? 0, icon: Icons.orders, color: "accent" as const }
      : null,
    canReadCatalog
      ? { label: "المنتجات", value: counts.products ?? 0, icon: Icons.products, color: "default" as const }
      : null,
    canReadOutbox
      ? { label: "رسائل معلقة", value: counts.outboxQueued ?? 0, icon: Icons.outbox, color: counts.outboxQueued > 0 ? "warning" as const : "default" as const }
      : null,
    canReadUgc
      ? { label: "تقييمات معلقة", value: counts.reviewsPending ?? 0, icon: Icons.reviews, color: counts.reviewsPending > 0 ? "accent" as const : "default" as const }
      : null,
  ].filter(Boolean);

  const quickActions = [
    can("catalog:read") ? { label: "إدارة المنتجات", to: "/admin/catalog/products" } : null,
    can("orders:read") ? { label: "عرض الطلبات", to: "/admin/orders" } : null,
    can("outbox:read") ? { label: "صندوق الرسائل", to: "/admin/outbox" } : null,
    can("settings:read") ? { label: "الإعدادات", to: "/admin/settings" } : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      {mainStats.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mainStats.map((stat, i) => (
            <StatCard
              key={stat.label}
              {...stat}
              delay={i * 50}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-5 text-sm text-white/60">
          لا توجد إحصائيات متاحة لحسابك حالياً.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Latest Orders */}
        {canReadOrders && (
          <div className="lg:col-span-2 glass rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-semibold text-white">آخر الطلبات</h2>
                <p className="text-xs text-white/40 mt-0.5">آخر 10 طلبات وردت</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/orders")}>
                عرض الكل
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>الحالة</TH>
                    <TH>العميل</TH>
                    <TH>المنتج</TH>
                    <TH>التاريخ</TH>
                  </TR>
                </THead>
                <TBody>
                  {latestOrders.length ? (
                    latestOrders.slice(0, 5).map((o: any) => (
                      <TR
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/orders/${o.id}`)}
                      >
                        <TD>
                          <Badge variant={statusVariant(o.status) as any} dot>
                            {statusLabel(o.status)}
                          </Badge>
                        </TD>
                        <TD className="font-medium text-white">{o.customerName ?? "-"}</TD>
                        <TD className="text-white/60 text-xs">
                          {o.variant?.item?.product?.title ?? "-"}
                        </TD>
                        <TD className="text-white/50 text-xs tabular-nums">
                          {formatDateTime(o.createdAt)}
                        </TD>
                      </TR>
                    ))
                  ) : (
                    <TR>
                      <TD className="text-center py-8 text-white/40" colSpan={4}>
                        لا يوجد طلبات بعد
                      </TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </div>
          </div>
        )}

        {/* Order Status Breakdown */}
        {canReadOrders && (
          <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <h2 className="text-base font-semibold text-white">حالات الطلبات</h2>
            <p className="text-xs text-white/40 mt-0.5">توزيع الطلبات حسب الحالة</p>

            <div className="mt-4 divide-y divide-white/[0.04]">
              <OrderStatusCard label="جديد" value={ordersByStatus.NEW ?? 0} color="NEW" delay={350} />
              <OrderStatusCard label="تم التواصل" value={ordersByStatus.CONTACTED ?? 0} color="CONTACTED" delay={400} />
              <OrderStatusCard label="مقبول" value={ordersByStatus.ACCEPTED ?? 0} color="ACCEPTED" delay={450} />
              <OrderStatusCard label="مرفوض" value={ordersByStatus.REJECTED ?? 0} color="REJECTED" delay={500} />
              <OrderStatusCard label="تم الشحن" value={ordersByStatus.SHIPPED ?? 0} color="SHIPPED" delay={550} />
              <OrderStatusCard label="مغلق" value={ordersByStatus.CLOSED ?? 0} color="CLOSED" delay={600} />
              <OrderStatusCard label="ملغي" value={ordersByStatus.CANCELED ?? 0} color="CANCELED" delay={650} />
              <OrderStatusCard label="مسترجع" value={ordersByStatus.REFUNDED ?? 0} color="REFUNDED" delay={700} />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <h2 className="text-base font-semibold text-white mb-4">إجراءات سريعة</h2>
        {quickActions.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Button key={action.to} variant="secondary" onClick={() => navigate(action.to)}>
                {action.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/60">
            لا توجد إجراءات سريعة متاحة بحسب الصلاحيات الحالية.
          </p>
        )}
      </div>
    </div>
  );
}
