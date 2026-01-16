"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogProduct, CatalogItem, CatalogVariant } from "@/lib/catalog";
import { formatMoney } from "@/lib/catalog";
import { getProductByIdClient, getProductBySlugClient } from "@/lib/apiClient";
import { useCart } from "@/store/cart";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { useAnimationEffects } from "@/components/AnimationEffectsProvider";
import { useToastShortcuts } from "@/components/Toast";

type Props = {
  productId?: string;
  slug?: string;
  // Optional to avoid fetching if you already have the full product.
  product?: CatalogProduct;
  className?: string;
  buttonLabel?: string;
};

type Selection = {
  colorKey: string;
  sizeKey: string;
};

function itemKey(it: CatalogItem, idx: number) {
  const c = (it.colorName ?? "").trim();
  return c || `__item_${idx}`;
}

function variantSizeKey(v: CatalogVariant) {
  const n = (v.size?.name ?? "").trim();
  return n || "default";
}

function flattenVariants(p: CatalogProduct) {
  const out: CatalogVariant[] = [];
  for (const it of p.items ?? []) {
    for (const v of it.variants ?? []) out.push(v);
  }
  return out;
}

function isInStock(v: CatalogVariant) {
  // If stock is null/undefined => treat as untracked (available)
  return v.stock == null || v.stock > 0;
}

export function QuickAddButton({ productId, slug, product, className, buttonLabel }: Props) {
  const settings = useStorefrontSettings();
  const { addItem } = useCart();
  const { fireConfetti } = useAnimationEffects();
  const toast = useToastShortcuts();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [p, setP] = useState<CatalogProduct | null>(product ?? null);
  const prefetchedRef = useRef(false);

  const variantsCount = useMemo(() => (p ? flattenVariants(p).length : 0), [p]);

  async function ensureProduct(opts?: { silent?: boolean }): Promise<CatalogProduct | null> {
    if (p) return p;
    if (!opts?.silent) {
      setLoading(true);
      setErr(null);
    }
    try {
      let full: CatalogProduct | null = null;
      if (slug) full = await getProductBySlugClient(slug);
      else if (productId) full = await getProductByIdClient(productId);
      setP(full);
      return full;
    } catch (e: any) {
      setErr(e?.message || "Error");
      return null;
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  async function onQuickAdd(e?: React.MouseEvent<HTMLButtonElement>) {
    const full = await ensureProduct();
    if (!full) return;

    const variants = flattenVariants(full);

    // إذا في Variant واحد فقط (أو واحد متوفر فقط): أضف مباشرة بدون Drawer
    const available = variants.filter(isInStock);
    const auto =
      variants.length === 1
        ? variants[0]
        : available.length === 1
        ? available[0]
        : null;

    if (auto) {
      if (!isInStock(auto)) {
        setStatus("غير متوفر حالياً");
        window.setTimeout(() => setStatus(null), 1600);
        return;
      }
      addItem(auto.id, 1);
      fireConfetti(e?.clientX, e?.clientY);
      toast.cartAdded(full.title);
      setStatus("انضاف للسلة ✅");
      window.setTimeout(() => setStatus(null), 1400);
      return;
    }

    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 220);
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={(e) => void onQuickAdd(e)}
        onMouseEnter={async () => {
          if (!settings.prefetchLinks) return;
          if (prefetchedRef.current) return;
          if (p || loading) return;
          prefetchedRef.current = true;
          await ensureProduct({ silent: true });
        }}
        className={
          "w-full rounded-xl px-3 py-2 text-sm font-semibold transition " +
          // Luxury: black/gold
          "bg-[color:var(--accent-2)] text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95 " +
          "border border-[color:var(--accent-2)]/50"
        }
      >
        {buttonLabel ?? "أضف للسلة"}
      </button>

      {status ? <div className="mt-2 text-xs text-emerald-700">{status}</div> : null}
      {err ? <div className="mt-2 text-xs text-red-700">{err}</div> : null}

      {open ? (
        <QuickAddDrawer product={p} loading={loading} onClose={close} closing={closing} />
      ) : null}
    </div>
  );
}

function QuickAddDrawer({
  product,
  loading,
  onClose,
  closing,
}: {
  product: CatalogProduct | null;
  loading: boolean;
  onClose: () => void;
  closing: boolean;
}) {
  const { addItem } = useCart();
  const { fireConfetti } = useAnimationEffects();
  const toast = useToastShortcuts();

  const items = product?.items ?? [];

  const byColor = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    items.forEach((it, idx) => map.set(itemKey(it, idx), it));
    return map;
  }, [items]);

  const colorKeys = useMemo(() => Array.from(byColor.keys()), [byColor]);

  const initialSel: Selection = useMemo(() => {
    const firstColor = colorKeys[0] ?? "";
    const it = firstColor ? byColor.get(firstColor) : undefined;
    const firstVar = it?.variants?.[0];
    return {
      colorKey: firstColor,
      sizeKey: firstVar ? variantSizeKey(firstVar) : "default",
    };
  }, [colorKeys, byColor]);

  const [sel, setSel] = useState<Selection>(initialSel);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<string | null>(null);

  const selectedItem = sel.colorKey ? byColor.get(sel.colorKey) : undefined;
  const variants = selectedItem?.variants ?? [];

  const sizeKeys = useMemo(() => {
    const out: string[] = [];
    for (const v of variants) {
      const k = variantSizeKey(v);
      if (!out.includes(k)) out.push(k);
    }
    return out;
  }, [variants]);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    const found = variants.find((v) => variantSizeKey(v) === sel.sizeKey);
    return found ?? variants[0];
  }, [variants, sel.sizeKey]);

  const canAdd = !!selectedVariant && (selectedVariant.stock == null || selectedVariant.stock > 0);
  const selectedPrice = selectedVariant ? Number(selectedVariant.price) : null;

  function pickColor(nextColorKey: string) {
    const it = byColor.get(nextColorKey);
    const firstVar = it?.variants?.[0];
    setSel({
      colorKey: nextColorKey,
      sizeKey: firstVar ? variantSizeKey(firstVar) : "default",
    });
    setStatus(null);
  }

  function pickSize(nextSizeKey: string) {
    setSel((s) => ({ ...s, sizeKey: nextSizeKey }));
    setStatus(null);
  }

  function onAdd() {
    if (!selectedVariant) return;
    addItem(selectedVariant.id, Math.max(1, qty));
    if (product) {
      fireConfetti();
      toast.cartAdded(product.title);
    }
    setStatus("تمت الإضافة ✅");
    window.setTimeout(() => {
      setStatus(null);
      onClose();
    }, 700);
  }

  const colorLabel = (key: string, idx: number) => {
    const it = byColor.get(key);
    const name = (it?.colorName ?? "").trim();
    return name || `Color ${idx + 1}`;
  };

  const colorSwatchHex = (key: string): string | null => {
    const it = byColor.get(key);
    const raw = (it?.colorHex ?? it?.suggestedColors?.[0] ?? "") as any;
    const s = String(raw || "").trim();
    if (!s) return null;
    return s.startsWith("#") ? s : `#${s}`;
  };


const colorHasAvailable = (key: string): boolean => {
  const it = byColor.get(key);
  if (!it) return false;
  const vars = it.variants ?? [];
  if (!vars.length) return false;
  // if stock is null => treat as available (untracked)
  if (vars.some((v) => v.stock == null)) return true;
  return vars.some((v) => (v.stock ?? 0) > 0);
};
  return (
    <div className="fixed inset-0 z-50">
      <div
        className={
          "absolute inset-0 bg-black/60 transition-opacity duration-200 " +
          (closing ? "opacity-0" : "opacity-100")
        }
        onClick={onClose}
        aria-hidden
      />

      {/* Desktop: right drawer. Mobile: bottom sheet. */}
      <div
        className={
          "absolute bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:top-0 sm:right-0 " +
          "w-full sm:w-[420px] sm:max-w-[92vw] " +
          "max-h-[92vh] sm:h-full overflow-y-auto " +
          "border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] shadow-2xl " +
          "rounded-t-3xl sm:rounded-none sm:rounded-l-3xl " +
          "transition-transform duration-200 will-change-transform " +
          (closing ? "translate-y-full sm:translate-y-0 sm:translate-x-full" : "translate-y-0 sm:translate-x-0")
        }
      >
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-5">
          <div>
            <div className="text-base font-semibold">أضف للسلة</div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              اختر اللون والمقاس
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text)] hover:brightness-95"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 text-sm text-[color:var(--muted)]">
              <LoadingIndicator className="flex items-center justify-center" fallback={<span>Loading…</span>} />
            </div>
          ) : !product ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 text-sm text-[color:var(--muted)]">
              ما قدرنا نجيب بيانات المنتج.
            </div>
          ) : variants.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 text-sm text-[color:var(--muted)]">
              هذا المنتج لا يحتوي خيارات (Variants) بعد.
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm font-semibold line-clamp-2">{product.title}</div>
                {selectedPrice != null ? (
                  <div className="text-sm text-[color:var(--text)]">{formatMoney(selectedPrice, undefined)}</div>
                ) : null}
              </div>

              {/* Colors */}
              {colorKeys.length > 0 ? (
                <div className="mt-4">
                  <div className="text-sm font-semibold">الألوان</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {colorKeys.map((k, idx) => {
                      const active = k === sel.colorKey;
                      const disabled = !colorHasAvailable(k);
                      const swatch = colorSwatchHex(k);
                      return (
                        <button
                          key={k}
                          type="button"
                          disabled={disabled}
                          onClick={() => (!disabled ? pickColor(k) : null)}
                          className={
                            "rounded-full border px-3 py-1 text-sm transition " +
                            (disabled
                              ? "border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--muted)] opacity-50"
                              : active
                              ? "border-[color:var(--accent-2)] bg-[color:var(--surface-2)] text-[color:var(--text)]"
                              : "border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text)] hover:brightness-95")
                          }
                        >
                          <span className="inline-flex items-center gap-2">
                            {swatch ? (
                              <span
                                className="h-4 w-4 rounded-full border border-[color:var(--border)]"
                                style={{ background: swatch }}
                                aria-hidden
                              />
                            ) : null}
                            <span>{colorLabel(k, idx)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Sizes */}
              {sizeKeys.length > 0 ? (
                <div className="mt-4">
                  <div className="text-sm font-semibold">المقاسات</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sizeKeys.map((k) => {
                      const active = k === sel.sizeKey;
                      const v = variants.find((vv) => variantSizeKey(vv) === k);
                      const disabled = !v || (v.stock != null && v.stock <= 0);
                      return (
                        <button
                          key={k}
                          type="button"
                          disabled={disabled}
                          onClick={() => pickSize(k)}
                          className={
                            "rounded-full border px-3 py-1 text-sm transition " +
                            (disabled
                              ? "border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--muted)] opacity-50"
                              : active
                              ? "border-[color:var(--accent-2)] bg-[color:var(--surface-2)] text-[color:var(--text)]"
                              : "border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text)] hover:brightness-95")
                          }
                        >
                          {k === "default" ? "مقاس واحد" : k}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2">
                  <span className="text-sm text-[color:var(--muted)]">Qty</span>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                    className="w-16 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-sm text-[color:var(--text)]"
                  />
                </div>

                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={onAdd}
                  className={
                    "rounded-xl px-4 py-2 text-sm font-semibold transition " +
                    (canAdd
                      ? "bg-[color:var(--accent-2)] text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95"
                      : "bg-[color:var(--surface-2)] text-[color:var(--text)] opacity-50")
                  }
                >
                  أضف للسلة
                </button>
              </div>

              {status ? <div className="mt-3 text-sm text-emerald-300">{status}</div> : null}
              {!canAdd ? <div className="mt-2 text-xs text-red-300">هذا الخيار غير متوفر حالياً.</div> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
