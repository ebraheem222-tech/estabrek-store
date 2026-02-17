"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CatalogProduct, CatalogItem, CatalogVariant } from "@/lib/catalog";
import { catalogItemKey, catalogItemLabel, formatMoney } from "@/lib/catalog";
import { useCart } from "@/store/cart";
import { useAnimationEffects } from "@/components/AnimationEffectsProvider";
import { useToastShortcuts } from "@/components/Toast";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";

type Selection = {
  colorKey: string; // either colorName or a fallback key
  sizeKey: string; // size name or "default"
};

function variantSizeKey(v: CatalogVariant) {
  const n = (v.size?.name ?? "").trim();
  return n || "default";
}

function normalizeHex(v?: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  return s.startsWith("#") ? s : `#${s}`;
}

export default function ProductBuyBox({
  product,
  colorKey,
  onColorChange,
}: {
  product: CatalogProduct;
  colorKey?: string;
  onColorChange?: (k: string) => void;
}) {
  const { addItem } = useCart();
  const settings = useStorefrontSettings();
  const { fireConfetti } = useAnimationEffects();
  const toast = useToastShortcuts();
  const [stockAlertActive, setStockAlertActive] = useState(false);
  const [priceAlertActive, setPriceAlertActive] = useState(false);

  const items = product.items ?? [];

  const byColor = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    items.forEach((it, idx) => map.set(catalogItemKey(it, idx), it));
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
  const [colorsOpen, setColorsOpen] = useState(false);
  const [colorSearch, setColorSearch] = useState("");

  // External sync from gallery (controlled color)
  useEffect(() => {
    if (!colorKey) return;
    if (colorKey === sel.colorKey) return;
    const it = byColor.get(colorKey);
    const firstVar = it?.variants?.[0];
    setSel({
      colorKey,
      sizeKey: firstVar ? variantSizeKey(firstVar) : "default",
    });
  }, [colorKey, byColor, sel.colorKey]);

  const selectedItem = sel.colorKey ? byColor.get(sel.colorKey) : undefined;
  const variants = selectedItem?.variants ?? [];

  const allVariants = useMemo(
    () => (items ?? []).flatMap((it) => it?.variants ?? []),
    [items]
  );

  const sizeKeys = useMemo(() => {
    const out: string[] = [];
    const source = allVariants.length ? allVariants : variants;
    for (const v of source) {
      const k = variantSizeKey(v);
      if (!out.includes(k)) out.push(k);
    }
    return out;
  }, [allVariants, variants]);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    const found = variants.find((v) => variantSizeKey(v) === sel.sizeKey);
    return found ?? variants[0];
  }, [variants, sel.sizeKey]);

  const canAdd = !!selectedVariant && (selectedVariant.stock == null || selectedVariant.stock > 0);
  const selectedPrice = selectedVariant ? Number(selectedVariant.price) : null;
  const compareAt = selectedVariant
    ? Number((selectedVariant as any).compareAt ?? (selectedVariant as any).compareAtPrice ?? NaN)
    : NaN;
  const hasCompareDiscount =
    Number.isFinite(compareAt) && selectedPrice != null && compareAt > selectedPrice;
  const showStockAlert = settings.stockAlertEnabled && !canAdd && variants.length > 0;
  const showPriceAlert = settings.priceDropAlertEnabled && selectedPrice != null && !hasCompareDiscount;

  const colorLabel = (key: string, idx: number) => {
    const it = byColor.get(key);
    return it ? catalogItemLabel(it, idx) : `Color ${idx + 1}`;
  };

  const colorSwatchHex = (key: string): string | null => {
    const it = byColor.get(key);
    return (
      normalizeHex(it?.colorHex ?? null) ||
      normalizeHex(it?.suggestedColors?.[0] ?? null)
    );
  };

  const colorHasAvailable = (key: string): boolean => {
    const it = byColor.get(key);
    if (!it) return false;
    const vars = it.variants ?? [];
    if (!vars.length) return false;
    if (vars.some((v) => v.stock == null)) return true;
    return vars.some((v) => (v.stock ?? 0) > 0);
  };

  const selectedColorName = useMemo(() => {
    const idx = colorKeys.findIndex((k) => k === sel.colorKey);
    return sel.colorKey ? colorLabel(sel.colorKey, Math.max(0, idx)) : "";
  }, [sel.colorKey, colorKeys]);

  const selectedColorHex = useMemo(() => (sel.colorKey ? colorSwatchHex(sel.colorKey) : null), [sel.colorKey]);

  const filteredColorKeys = useMemo(() => {
    const q = colorSearch.trim().toLowerCase();
    if (!q) return colorKeys;
    return colorKeys.filter((k, idx) => {
      const name = colorLabel(k, idx).toLowerCase();
      const hex = (colorSwatchHex(k) || "").toLowerCase();
      return name.includes(q) || hex.includes(q);
    });
  }, [colorKeys, colorSearch]);

  function pickColor(nextColorKey: string) {
    const it = byColor.get(nextColorKey);
    const firstVar = it?.variants?.[0];
    setSel({
      colorKey: nextColorKey,
      sizeKey: firstVar ? variantSizeKey(firstVar) : "default",
    });
    setStatus(null);
    onColorChange?.(nextColorKey);
  }

  function pickSize(nextSizeKey: string) {
    setSel((s) => ({ ...s, sizeKey: nextSizeKey }));
    setStatus(null);
  }

  function onAdd(event?: React.MouseEvent) {
    if (!selectedVariant) return;
    addItem(selectedVariant.id, Math.max(1, qty));
    fireConfetti(event?.clientX, event?.clientY);
    toast.cartAdded(product.title);
    setStatus("تمت الإضافة للسلة ✅");
    window.setTimeout(() => setStatus(null), 2500);
  }

  return (
    <div className="buy-box glass-card rounded-3xl p-6 text-[color:var(--text)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <h3 className="text-lg font-bold text-[color:var(--text)] flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            الشراء
          </h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">اختر اللون والمقاس ثم أضف للسلة</p>
        </div>
        {selectedPrice != null && selectedPrice > 0 ? (
          <div className="text-right">
            <div className="text-2xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] bg-clip-text text-transparent">
              {formatMoney(selectedPrice, undefined)}
            </div>
            <div className="text-xs text-[color:var(--muted)]">شامل الضريبة</div>
          </div>
        ) : (
          <div className="text-right text-sm text-[color:var(--muted)]">تواصل للسعر</div>
        )}
      </div>

      {/* Colors Section */}
      {colorKeys.length > 0 ? (
        <div className="mt-5 buy-box-section">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span className="text-sm font-semibold">الألوان</span>
              <span className="text-xs text-[color:var(--muted)] bg-white/5 px-2 py-0.5 rounded-full">{colorKeys.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setColorsOpen(true)}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-2)] transition-colors flex items-center gap-1"
            >
              عرض الكل
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Selected Color Display */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/[0.06] mb-3">
            <span
              className="h-10 w-10 rounded-xl border-2 border-white/20 shadow-lg"
              style={{ 
                backgroundColor: selectedColorHex ?? "transparent",
                boxShadow: selectedColorHex ? `0 4px 15px ${selectedColorHex}40` : 'none'
              }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[color:var(--text)]">{selectedColorName || "اختر لون"}</div>
              <div className="text-xs text-[color:var(--muted)]">اللون المحدد</div>
            </div>
          </div>

          {/* Quick Color Swatches */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {colorKeys.slice(0, 10).map((k, idx) => {
              const active = k === sel.colorKey;
              const disabled = !colorHasAvailable(k);
              const hex = colorSwatchHex(k);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={disabled}
                  onClick={() => (!disabled ? pickColor(k) : null)}
                  className={
                    "color-swatch h-9 w-9 shrink-0 rounded-xl border-2 transition-all " +
                    (disabled
                      ? "border-white/10 opacity-30 cursor-not-allowed"
                      : active
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 scale-110 active"
                      : "border-white/15 hover:border-white/30 hover:scale-105")
                  }
                  style={{ 
                    backgroundColor: hex ?? "transparent",
                    boxShadow: active && hex ? `0 4px 15px ${hex}50` : 'none'
                  }}
                  title={colorLabel(k, idx)}
                />
              );
            })}
            {colorKeys.length > 10 ? (
              <button
                type="button"
                onClick={() => setColorsOpen(true)}
                className="shrink-0 h-9 px-4 rounded-xl border border-white/15 bg-white/5 text-xs text-[color:var(--text)] hover:bg-white/10 transition-colors flex items-center gap-1"
              >
                +{colorKeys.length - 10}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : null}
          </div>

          {/* Color Picker Modal */}
          {colorsOpen ? (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setColorsOpen(false)} aria-hidden />

              <div className="color-modal relative w-full max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl glass-card shadow-2xl max-h-[80vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      اختر اللون
                    </h4>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">الألوان غير المتوفرة معطّلة</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setColorsOpen(false)}
                    className="w-10 h-10 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-[color:var(--text)] hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Search */}
                <div className="p-5 border-b border-white/10">
                  <div className="relative">
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      value={colorSearch}
                      onChange={(e) => setColorSearch(e.target.value)}
                      placeholder="ابحث عن لون…"
                      className="w-full rounded-xl border border-white/15 bg-black/30 pr-10 pl-4 py-3 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Color Grid */}
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
                    {filteredColorKeys.map((k, idx) => {
                      const active = k === sel.colorKey;
                      const disabled = !colorHasAvailable(k);
                      const hex = colorSwatchHex(k);
                      const label = colorLabel(k, idx);
                      return (
                        <button
                          key={k}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            pickColor(k);
                            setColorsOpen(false);
                          }}
                          className={
                            "stagger-item aspect-square rounded-xl border-2 transition-all " +
                            (disabled
                              ? "border-white/10 opacity-25 cursor-not-allowed"
                              : active
                              ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 scale-105"
                              : "border-white/15 hover:scale-105 hover:border-white/30")
                          }
                          style={{ 
                            backgroundColor: hex ?? "transparent",
                            animationDelay: `${idx * 30}ms`
                          }}
                          title={label}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-4 text-center text-sm text-[color:var(--muted)]">
                    {filteredColorKeys.length} لون متاح
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Sizes Section */}
      {sizeKeys.length > 0 ? (
        <div className="mt-4 buy-box-section">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="text-sm font-semibold">المقاسات</span>
          </div>
          <div className="flex flex-wrap gap-2">
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
                    "size-btn rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all " +
                    (disabled
                      ? "border-white/10 bg-white/5 text-[color:var(--muted)] opacity-40 cursor-not-allowed"
                      : active
                      ? "active border-transparent"
                      : "border-white/15 bg-white/5 text-[color:var(--text)] hover:border-white/25 hover:bg-white/10")
                  }
                >
                  {k === "default" ? "مقاس واحد" : k}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* No Variants Warning */}
      {!variants.length ? (
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-amber-200">
            هذا المنتج لا يحتوي خيارات (Variants) بعد.
          </div>
        </div>
      ) : null}

      {/* Quantity + Add to Cart */}
      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Quantity Control */}
          <div className="qty-input-group">
            <button
              type="button"
              className="qty-btn"
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
              className="w-12 text-center bg-transparent text-sm font-semibold outline-none"
            />
            <button
              type="button"
              className="qty-btn"
              onClick={() => setQty(qty + 1)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            disabled={!canAdd}
            onClick={(e) => onAdd(e)}
            className={
              "add-to-cart-btn flex-1 rounded-xl px-6 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 " +
              (canAdd
                ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white shadow-lg"
                : "bg-white/10 text-[color:var(--muted)] cursor-not-allowed")
            }
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            أضف للسلة
          </button>
        </div>

        {/* Status Messages */}
        {status ? (
          <div className="success-message flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {status}
          </div>
        ) : null}
        
        {!canAdd && variants.length > 0 ? (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            هذا الخيار غير متوفر حالياً
          </div>
        ) : null}

        {(showStockAlert || showPriceAlert) ? (
          <div className="flex flex-wrap gap-2">
            {showStockAlert ? (
              <button
                type="button"
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-[color:var(--text)] hover:bg-white/10 transition-colors disabled:opacity-60"
                onClick={() => {
                  if (stockAlertActive) return;
                  setStockAlertActive(true);
                  toast.info("تم تفعيل تنبيه توفر المنتج", product.title);
                }}
                disabled={stockAlertActive}
              >
                {stockAlertActive ? "تنبيه التوفر مُفعل" : "تنبيه عند توفر المنتج"}
              </button>
            ) : null}
            {showPriceAlert ? (
              <button
                type="button"
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-[color:var(--text)] hover:bg-white/10 transition-colors disabled:opacity-60"
                onClick={() => {
                  if (priceAlertActive) return;
                  setPriceAlertActive(true);
                  toast.info("تم تفعيل تنبيه انخفاض السعر", product.title);
                }}
                disabled={priceAlertActive}
              >
                {priceAlertActive ? "تنبيه السعر مُفعل" : "تنبيه انخفاض السعر"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
