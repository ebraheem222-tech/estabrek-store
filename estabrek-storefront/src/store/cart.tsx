"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { variantId: string; quantity: number };

type CartCtx = {
  items: CartItem[];
  addItem: (variantId: string, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
  count: number;
};

const KEY = "estabrak_cart_v1";
const Ctx = createContext<CartCtx | null>(null);

function readLS(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x.variantId === "string")
      .map((x) => ({ variantId: x.variantId, quantity: Math.max(1, Number(x.quantity || 1)) }));
  } catch {
    return [];
  }
}
function writeLS(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readLS());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(readLS());
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") setItems(readLS());
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const api: CartCtx = useMemo(() => {
    return {
      items,
      count: items.reduce((a, b) => a + (b.quantity || 0), 0),
      addItem: (variantId, qty = 1) => {
        const addQty = Math.max(1, Number(qty || 1));
        setItems((prev) => {
          const i = prev.findIndex((x) => x.variantId === variantId);
          if (i >= 0) {
            const next = [...prev];
            next[i] = { ...next[i], quantity: next[i].quantity + addQty };
            writeLS(next);
            return next;
          }
          const next = [...prev, { variantId, quantity: addQty }];
          writeLS(next);
          return next;
        });
      },
      setQty: (variantId, qty) => {
        const q = Math.max(1, Number(qty || 1));
        setItems((prev) => {
          const next = prev.map((x) => (x.variantId === variantId ? { ...x, quantity: q } : x));
          writeLS(next);
          return next;
        });
      },
      removeItem: (variantId) =>
        setItems((prev) => {
          const next = prev.filter((x) => x.variantId !== variantId);
          writeLS(next);
          return next;
        }),
      clear: () =>
        setItems(() => {
          writeLS([]);
          return [];
        }),
    };
  }, [items]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used within CartProvider");
  return v;
}
