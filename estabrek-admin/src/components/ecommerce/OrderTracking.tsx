// ============================================================
// ESTABREK E-COMMERCE - ORDER TRACKING
// ============================================================

import React from "react";
import { cn } from "../ui/cn";

// ============================================================
// TYPES
// ============================================================

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export interface OrderTrackingStep {
  status: OrderStatus;
  title: string;
  titleAr: string;
  date?: string;
  description?: string;
  completed: boolean;
  current: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  date: string;
  total: number;
  currency?: string;
  items: Array<{
    id: string;
    name: string;
    nameAr?: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  shippingAddress?: {
    fullName: string;
    phone: string;
    city: string;
    address: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
}

// ============================================================
// ORDER STATUS BADGE
// ============================================================

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
    pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-700" },
    confirmed: { label: "تم التأكيد", color: "bg-blue-100 text-blue-700" },
    processing: { label: "قيد التجهيز", color: "bg-purple-100 text-purple-700" },
    shipped: { label: "تم الشحن", color: "bg-indigo-100 text-indigo-700" },
    delivered: { label: "تم التوصيل", color: "bg-green-100 text-green-700" },
    cancelled: { label: "ملغي", color: "bg-red-100 text-red-700" },
  };

  const config = statusConfig[status];

  return (
    <span className={cn("px-3 py-1 rounded-full text-sm font-medium", config.color, className)}>
      {config.label}
    </span>
  );
}

// ============================================================
// ORDER TRACKING TIMELINE
// ============================================================

export function OrderTrackingTimeline({
  steps,
  className,
}: {
  steps: OrderTrackingStep[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-0", className)}>
      {steps.map((step, index) => (
        <div key={step.status} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                step.completed
                  ? "bg-green-500 border-green-500 text-white"
                  : step.current
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                  : "bg-[var(--color-bg-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]"
              )}
            >
              {step.completed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="font-bold">{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-0.5 h-16 transition-colors",
                  step.completed ? "bg-green-500" : "bg-[var(--color-border)]"
                )}
              />
            )}
          </div>

          {/* Content */}
          <div className="pb-8">
            <h4
              className={cn(
                "font-bold",
                step.completed || step.current ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"
              )}
            >
              {step.titleAr}
            </h4>
            {step.date && (
              <p className="text-sm text-[var(--color-text-muted)]">{step.date}</p>
            )}
            {step.description && (
              <p className="text-sm text-[var(--color-text-muted)] mt-1">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// ORDER CARD
// ============================================================

export function OrderCard({
  order,
  onClick,
  className,
}: {
  order: Order;
  onClick?: () => void;
  className?: string;
}) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("ar-IL", {
      style: "currency",
      currency: order.currency || "ILS",
      minimumFractionDigits: 0,
    }).format(price);

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 cursor-pointer hover:shadow-lg transition-shadow",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">رقم الطلب</p>
          <p className="font-bold">{order.orderNumber}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex items-center gap-3 mb-4">
        {order.items.slice(0, 3).map((item, i) => (
          <div
            key={i}
            className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--color-bg-alt)]"
          >
            {item.image ? (
              <img src={item.image} alt={item.nameAr || item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
            )}
          </div>
        ))}
        {order.items.length > 3 && (
          <div className="w-16 h-16 rounded-xl bg-[var(--color-bg-alt)] flex items-center justify-center text-sm font-medium">
            +{order.items.length - 3}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">{order.date}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{order.items.length} منتج</p>
        </div>
        <p className="text-xl font-bold text-[var(--color-accent)]">{formatPrice(order.total)}</p>
      </div>
    </div>
  );
}

// ============================================================
// ORDER DETAILS
// ============================================================

export function OrderDetails({
  order,
  onReorder,
  onCancel,
  className,
}: {
  order: Order;
  onReorder?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("ar-IL", {
      style: "currency",
      currency: order.currency || "ILS",
      minimumFractionDigits: 0,
    }).format(price);

  const trackingSteps: OrderTrackingStep[] = [
    { status: "pending", title: "Pending", titleAr: "قيد الانتظار", completed: true, current: false },
    { status: "confirmed", title: "Confirmed", titleAr: "تم التأكيد", completed: order.status !== "pending", current: order.status === "confirmed" },
    { status: "processing", title: "Processing", titleAr: "قيد التجهيز", completed: ["processing", "shipped", "delivered"].includes(order.status), current: order.status === "processing" },
    { status: "shipped", title: "Shipped", titleAr: "تم الشحن", completed: ["shipped", "delivered"].includes(order.status), current: order.status === "shipped" },
    { status: "delivered", title: "Delivered", titleAr: "تم التوصيل", completed: order.status === "delivered", current: order.status === "delivered" },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">طلب #{order.orderNumber}</h1>
          <p className="text-[var(--color-text-muted)]">{order.date}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Tracking */}
      {order.status !== "cancelled" && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-bold mb-6">تتبع الطلب</h2>
          <OrderTrackingTimeline steps={trackingSteps} />
          {order.trackingNumber && (
            <div className="mt-4 p-4 bg-[var(--color-bg-alt)] rounded-xl">
              <p className="text-sm text-[var(--color-text-muted)]">رقم التتبع</p>
              <p className="font-mono font-bold">{order.trackingNumber}</p>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold mb-4">المنتجات</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-[var(--color-bg-alt)]">
                {item.image ? (
                  <img src={item.image} alt={item.nameAr || item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold">{item.nameAr || item.name}</h4>
                <p className="text-sm text-[var(--color-text-muted)]">الكمية: {item.quantity}</p>
              </div>
              <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--color-border)] mt-4 pt-4 flex justify-between">
          <span className="font-bold">الإجمالي</span>
          <span className="text-xl font-bold text-[var(--color-accent)]">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {onReorder && (
          <button
            onClick={onReorder}
            className="flex-1 py-3 bg-[var(--color-accent)] text-white rounded-xl font-bold hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            إعادة الطلب
          </button>
        )}
        {onCancel && order.status === "pending" && (
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-red-500 text-red-500 rounded-xl font-bold hover:bg-red-50 transition-colors"
          >
            إلغاء الطلب
          </button>
        )}
      </div>
    </div>
  );
}

export default OrderDetails;
