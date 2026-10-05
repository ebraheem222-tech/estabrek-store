// A product's sizes in one window: count, type the new quantities, save once.
// Used from the products list (and anywhere a quick stock change is needed).
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { cn } from "../../components/ui/cn";
import { applyStockChanges, productStock, type StockRow } from "../../api/inventory.api";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";

const digits = (v: string) => v.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[^\d]/g, "");

export function QuickStockModal({ productId, title, onClose }: { productId: string | null; title?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<StockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let alive = true;
    setRows(null); setError(null); setNext({}); setReason("");
    productStock(productId)
      .then((r) => alive && setRows([...r].sort((a, b) => String(a.colorName).localeCompare(String(b.colorName)) || a.sizeOrder - b.sizeOrder)))
      .catch((e) => alive && setError(getApiErrorMessage(e)));
    return () => { alive = false; };
  }, [productId]);

  const changed = useMemo(() => (rows ?? []).filter((r) => next[r.variantId] !== undefined && next[r.variantId] !== "" && Number(next[r.variantId]) !== r.stock), [rows, next]);
  const valueOf = (r: StockRow) => (next[r.variantId] !== undefined ? next[r.variantId] : String(r.stock));
  const step = (r: StockRow, d: number) => setNext((n) => ({ ...n, [r.variantId]: String(Math.max(0, Number(valueOf(r) || 0) + d)) }));

  const save = async () => {
    if (!changed.length) return onClose();
    setSaving(true);
    try {
      const res = await applyStockChanges(changed.map((r) => ({ variantId: r.variantId, mode: "set" as const, value: Number(next[r.variantId]) })), reason.trim() || null);
      await Promise.all([qc.invalidateQueries({ queryKey: ["catalog", "products"] }), qc.invalidateQueries({ queryKey: ["inventory"] }), qc.invalidateQueries({ queryKey: ["admin-product-full"] })]);
      if (res.failed) toast.error(`لم تُحفظ ${res.failed} من ${changed.length}`, { description: "حاولي مرة أخرى" });
      else toast.success(`حُفظت كميات ${res.updated} ${res.updated === 1 ? "مقاس" : "مقاسات"}`);
      onClose();
    } catch (e) {
      toast.error("لم تُحفظ الكميات", { description: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const total = (rows ?? []).reduce((s, r) => s + Number(valueOf(r) || 0), 0);
  return (
    <Modal
      open={Boolean(productId)}
      title={title ? `كميات: ${title}` : "الكميات"}
      onClose={onClose}
      widthClassName="max-w-xl"
      footer={
        <div className="flex w-full flex-wrap items-center gap-2">
          <Button variant="primary" onClick={save} isLoading={saving} disabled={!rows}>
            {changed.length ? `حفظ ${changed.length} ${changed.length === 1 ? "تغيير" : "تغييرات"}` : "تم"}
          </Button>
          {productId ? <Link to={`/admin/catalog/products/${productId}`} className="text-sm text-accent-300 hover:text-accent-200" onClick={onClose}>فتح صفحة المنتج</Link> : null}
          <span className="ms-auto text-xs text-white/50">المجموع: <b className="text-white">{total}</b></span>
        </div>
      }
    >
      <div dir="rtl" data-testid="quick-stock">
        {error ? <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
        {!rows && !error ? <div className="py-6 text-center text-sm text-white/55">جارٍ التحميل…</div> : null}
        {rows && rows.length === 0 ? <div className="py-6 text-center text-sm text-white/55">لا توجد مقاسات لهذا المنتج.</div> : null}
        {rows && rows.length > 0 && (
          <>
            <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08]">
              {rows.map((r) => {
                const v = valueOf(r);
                const dirty = next[r.variantId] !== undefined && Number(v) !== r.stock;
                return (
                  <li key={r.variantId} className={cn("flex items-center gap-3 px-3 py-2", dirty && "bg-accent-500/[0.06]")}>
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/25" style={{ background: r.colorHex || "#888" }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white">{r.colorName} · <b>{r.size}</b></div>
                      <div dir="ltr" className="truncate text-right font-mono text-[11px] text-white/45">{r.sku}</div>
                    </div>
                    {dirty ? <span className="text-[11px] text-white/45">كان {r.stock}</span> : null}
                    <div className="inline-flex items-center rounded-lg border border-white/[0.1] bg-white/[0.02]">
                      <button type="button" onClick={() => step(r, -1)} className="h-9 w-9 text-white/60 hover:text-white" aria-label="إنقاص">−</button>
                      <input
                        className={cn("h-9 w-14 bg-transparent text-center text-sm focus:outline-none", Number(v) <= 0 ? "text-red-300" : "text-white")}
                        inputMode="numeric"
                        value={v}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setNext((n) => ({ ...n, [r.variantId]: digits(e.target.value) }))}
                        aria-label={`كمية ${r.colorName} ${r.size}`}
                      />
                      <button type="button" onClick={() => step(r, 1)} className="h-9 w-9 text-white/60 hover:text-white" aria-label="زيادة">+</button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <label className="mt-3 block text-xs text-white/55">
              السبب (اختياري، يظهر في سجل المخزون)
              <input className="mt-1 h-10 w-full rounded-xl border border-white/[0.08] bg-surface-925 px-3 text-sm text-white focus:outline-none" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: جرد، بضاعة وصلت، تالف" />
            </label>
          </>
        )}
      </div>
    </Modal>
  );
}
