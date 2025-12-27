"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CatalogProduct, CatalogItem, CatalogVariant } from "@/lib/catalog";
import { formatMoney } from "@/lib/catalog";
import { useCart } from "@/store/cart";

type Selection = {
  colorKey: string; // either colorName or a fallback key
  sizeKey: string; // size name or "default"
};

function itemKey(it: CatalogItem, idx: number) {
  const c = (it.colorName ?? "").trim();
  return c || `__item_${idx}`;
}

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

  const items = product.items ?? [];

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

  const colorLabel = (key: string, idx: number) => {
    const it = byColor.get(key);
    const name = (it?.colorName ?? "").trim();
    return name || `Color ${idx + 1}`;
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

  function onAdd() {
    if (!selectedVariant) return;
    addItem(selectedVariant.id, Math.max(1, qty));
    setStatus("تمت الإضافة للسلة ✅");
    window.setTimeout(() => setStatus(null), 1800);
  }

  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-[color:var(--text)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--text)]">الشراء</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">اختر اللون والمقاس ثم أضف للسلة</div>
        </div>
        {selectedPrice != null ? (
          <div className="text-sm font-semibold text-[color:var(--text)]">{formatMoney(selectedPrice, undefined)}</div>
        ) : null}
      </div>

      {/* Colors (AliExpress-style): circles + "choose" window for many colors */}
      {colorKeys.length > 0 ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">الألوان</div>
            <button
              type="button"
              onClick={() => setColorsOpen(true)}
              className="text-xs text-[color:var(--muted)] hover:text-[color:var(--text)]"
            >
              اختيار اللون
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span
              className="h-8 w-8 rounded-full border border-[color:var(--border)]"
              style={{ backgroundColor: selectedColorHex ?? "transparent" }}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="truncate text-sm text-[color:var(--text)]">{selectedColorName || "—"}</div>
              <div className="text-xs text-[color:var(--muted)]">{colorKeys.length} لون</div>
            </div>
          </div>

          {/* Quick bar: show a few circles for fast switching */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
            {colorKeys.slice(0, 12).map((k, idx) => {
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
                    "h-8 w-8 shrink-0 rounded-full border transition " +
                    (disabled
                      ? "border-white/10 opacity-35"
                      : active
                      ? "border-[color:var(--accent-2)] ring-2 ring-[color:var(--accent-2)]/20"
                      : "border-white/10 hover:scale-[1.03]")
                  }
                  style={{ backgroundColor: hex ?? "transparent" }}
                  title={colorLabel(k, idx)}
                />
              );
            })}
            {colorKeys.length > 12 ? (
              <button
                type="button"
                onClick={() => setColorsOpen(true)}
                className="ml-1 shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-[color:var(--text)] hover:bg-white/[0.06]"
              >
                +{colorKeys.length - 12}
              </button>
            ) : null}
          </div>

          {colorsOpen ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setColorsOpen(false)} aria-hidden />

              <div className="relative w-full max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[color:var(--surface)] shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <div className="text-base font-semibold">اختر اللون</div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">دوائر الألوان — غير المتوفر يكون معطّل</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setColorsOpen(false)}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[color:var(--text)] hover:bg-white/[0.08]"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5">
                  <input
                    value={colorSearch}
                    onChange={(e) => setColorSearch(e.target.value)}
                    placeholder="ابحث عن لون…"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)]"
                  />

                  <div className="mt-4 grid grid-cols-8 gap-2 sm:grid-cols-10">
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
                            "h-9 w-9 rounded-full border transition " +
                            (disabled
                              ? "border-white/10 opacity-30"
                              : active
                              ? "border-[color:var(--accent-2)] ring-2 ring-[color:var(--accent-2)]/25"
                              : "border-white/10 hover:scale-[1.05]")
                          }
                          style={{ backgroundColor: hex ?? "transparent" }}
                          title={label}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-4 text-xs text-[color:var(--muted)]">
                    {filteredColorKeys.length} نتيجة
                  </div>
                </div>
              </div>
            </div>
          ) : null}
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

      {!variants.length ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-[color:var(--muted)]">
          هذا المنتج لا يحتوي خيارات (Variants) بعد.
        </div>
      ) : null}

      {/* Quantity + Add */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <span className="text-sm text-[color:var(--muted)]">Qty</span>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
            className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm"
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
    </div>
  );
}



