// Small pieces shared by the orders list, the order page and printing.
import React, { useEffect, useState } from "react";
import { cn } from "../../components/ui/cn";
import { STATUS_INFO, TONE_CLASS, isPaid, sourceLabel, type DeliverySettings, type DeliveryZone, type OrderStatus } from "../../lib/orders";
import { useSaveDelivery } from "./useDelivery";

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const info = STATUS_INFO[status as OrderStatus];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", TONE_CLASS[info?.tone ?? "muted"], className)} title={info?.hint}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {info?.label ?? status}
    </span>
  );
}

export function SourceChip({ source }: { source?: string | null }) {
  const wa = source === "WHATSAPP_CART";
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px]", wa ? "bg-emerald-500/12 text-emerald-300" : "bg-white/[0.06] text-white/60")}>
      {wa && <WhatsAppIcon className="h-3 w-3" />}
      {sourceLabel(source)}
    </span>
  );
}

export function PaidChip({ order }: { order: { paymentStatus?: string | null } }) {
  return isPaid(order)
    ? <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] text-emerald-300">✓ تم الدفع</span>
    : <span className="inline-flex items-center whitespace-nowrap rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/50">الدفع عند الاستلام</span>;
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.05 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.5A9.9 9.9 0 1 0 12.05 2Zm5.8 14.1c-.25.7-1.45 1.33-2 1.4-.5.08-1.15.11-1.85-.12-.43-.13-.98-.32-1.69-.62-2.98-1.29-4.93-4.29-5.08-4.49-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.6-.37.79-.37h.57c.18 0 .43-.07.67.51.25.6.84 2.06.92 2.21.07.15.12.33.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.45.52-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.05 1.13 1.01 2.09 1.32 2.38 1.47.3.15.47.12.65-.07.17-.2.74-.87.94-1.17.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.35.08.12.08.72-.17 1.41Z" />
    </svg>
  );
}

export function Thumb({ src, className }: { src?: string | null; className?: string }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-lg bg-white/[0.06]", className)}>
      {src ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
    </span>
  );
}

/* ---------------------------------------------------------------- delivery */

export function DeliverySettingsDialog({ open, value, onClose }: { open: boolean; value: DeliverySettings; onClose: () => void }) {
  // Mounted only while open, so the form starts from the saved values each time.
  return open ? <DeliveryForm value={value} onClose={onClose} /> : null;
}

function DeliveryForm({ value, onClose }: { value: DeliverySettings; onClose: () => void }) {
  const save = useSaveDelivery();
  const [zones, setZones] = useState<Array<DeliveryZone & { citiesText: string; feeText: string }>>(() => value.zones.map((z) => ({ ...z, citiesText: z.cities.join("، "), feeText: String(z.fee) })));
  const [defaultFee, setDefaultFee] = useState(value.defaultFee == null ? "" : String(value.defaultFee));
  const [freeOver, setFreeOver] = useState(value.freeOver == null ? "" : String(value.freeOver));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const field = "h-10 w-full rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white placeholder:text-white/30 focus:border-accent-500/50 focus:outline-none";
  const submit = async () => {
    await save.mutateAsync({
      zones: zones.filter((z) => z.name.trim()).map((z) => ({ id: z.id, name: z.name.trim(), fee: Number(z.feeText) || 0, cities: z.citiesText.split(/[,،\n]/).map((c) => c.trim()).filter(Boolean) })),
      defaultFee: defaultFee.trim() === "" ? null : Number(defaultFee) || 0,
      freeOver: freeOver.trim() === "" ? null : Number(freeOver) || 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="أسعار التوصيل" dir="rtl" className="glass max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface-950 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">أسعار التوصيل</h2>
            <p className="mt-1 text-xs leading-5 text-white/55">مناطق التوصيل وسعر كل منطقة. نختار المنطقة من مدينة الزبونة تلقائياً، وتظهر في الطلب والفاتورة ورسالة الواتساب.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-white/60 hover:bg-white/[0.06] hover:text-white" aria-label="إغلاق">✕</button>
        </div>
        <div className="mt-4 space-y-3">
          {zones.map((z, i) => (
            <div key={z.id} className="grid gap-2 rounded-xl border border-white/[0.08] p-3 sm:grid-cols-[1fr_110px_auto]">
              <input className={field} placeholder="اسم المنطقة (مثلاً: القدس)" value={z.name} onChange={(e) => setZones((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="اسم المنطقة" />
              <div className="relative">
                <input className={cn(field, "ps-7")} inputMode="decimal" placeholder="السعر" value={z.feeText} onChange={(e) => setZones((all) => all.map((x, j) => (j === i ? { ...x, feeText: e.target.value.replace(/[^\d.]/g, "") } : x)))} aria-label="سعر التوصيل" />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40">₪</span>
              </div>
              <button type="button" onClick={() => setZones((all) => all.filter((_, j) => j !== i))} className="h-10 rounded-xl px-3 text-sm text-red-300/80 hover:bg-red-500/10">حذف</button>
              <input className={cn(field, "sm:col-span-3")} placeholder="المدن (افصلي بفاصلة): القدس، بيت حنينا، شعفاط" value={z.citiesText} onChange={(e) => setZones((all) => all.map((x, j) => (j === i ? { ...x, citiesText: e.target.value } : x)))} aria-label="المدن" />
            </div>
          ))}
          <button type="button" onClick={() => setZones((all) => [...all, { id: `z${Date.now().toString(36)}`, name: "", fee: 0, cities: [], citiesText: "", feeText: "" }])} className="text-sm text-accent-300 hover:text-accent-200">+ إضافة منطقة</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-white/60">
            سعر التوصيل لباقي المدن
            <input className={cn(field, "mt-1")} inputMode="decimal" placeholder="اتركيها فارغة إذا غير معروف" value={defaultFee} onChange={(e) => setDefaultFee(e.target.value.replace(/[^\d.]/g, ""))} />
          </label>
          <label className="text-xs text-white/60">
            توصيل مجاني للطلبات فوق
            <input className={cn(field, "mt-1")} inputMode="decimal" placeholder="مثلاً 300 — فارغ = بدون" value={freeOver} onChange={(e) => setFreeOver(e.target.value.replace(/[^\d.]/g, ""))} />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm text-white/70 hover:bg-white/[0.06]">إلغاء</button>
          <button type="button" disabled={save.isPending} onClick={() => void submit()} className="h-10 rounded-xl bg-accent-500 px-5 text-sm font-semibold text-white hover:bg-accent-400 disabled:opacity-60">{save.isPending ? "جارٍ الحفظ…" : "حفظ"}</button>
        </div>
      </div>
    </div>
  );
}
