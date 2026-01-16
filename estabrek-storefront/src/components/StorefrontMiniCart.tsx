"use client";

import { useEffect, useMemo, useState } from "react";
import { MiniCart } from "@/components/MiniCart";
import { useCart } from "@/store/cart";

type Quote = {
  currencyCode?: string | null;
  lines?: Array<{
    variantId: string;
    quantity: number;
    unitPrice?: string | number;
    productId?: string;
    productTitle?: string;
    colorName?: string | null;
    sizeName?: string | null;
    imageUrl?: string | null;
  }>;
};

function apiBase() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    process.env.API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:4000/v1"
  );
}

function resolveCurrencySymbol(code?: string | null) {
  if (code === "USD") return "$";
  if (code === "EUR") return "€";
  if (code === "ILS") return "₪";
  return code ?? "₪";
}

export function StorefrontMiniCart({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { items, setQty, removeItem, clear } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const itemsKey = useMemo(() => JSON.stringify(items), [items]);

  useEffect(() => {
    if (!open) return;
    if (!items.length) {
      setQuote(null);
      return;
    }
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBase()}/catalog/cart-quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok) throw new Error(data?.message || "Failed to load cart");
        setQuote(data);
      } catch {
        if (mounted) setQuote(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [open, itemsKey]);

  const currency = resolveCurrencySymbol(quote?.currencyCode ?? null);
  const cartItems = useMemo(() => {
    const lines = quote?.lines ?? [];
    return lines.map((line) => {
      const variantLabel = [line.colorName, line.sizeName].filter(Boolean).join(" / ");
      return {
        id: line.variantId,
        variantId: line.variantId,
        productId: line.productId ?? "",
        title: line.productTitle ?? "Item",
        variant: variantLabel || undefined,
        price: Number(line.unitPrice ?? 0),
        quantity: Number(line.quantity ?? 0),
        imageUrl: line.imageUrl ?? undefined,
      };
    });
  }, [quote]);

  return (
    <MiniCart
      isOpen={open}
      onClose={onClose}
      items={loading ? [] : cartItems}
      onUpdateQuantity={(itemId, quantity) => {
        if (quantity <= 0) {
          removeItem(itemId);
          return;
        }
        setQty(itemId, quantity);
      }}
      onRemoveItem={(itemId) => removeItem(itemId)}
      onClearCart={items.length ? clear : undefined}
      currency={currency}
      checkoutUrl="/cart"
    />
  );
}
