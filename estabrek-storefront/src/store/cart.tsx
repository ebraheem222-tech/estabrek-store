"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { roseReact } from "@/lib/roseEvents";
import { signal } from "@/lib/signals";
import { abConvert } from "@/lib/ab";
import { noteHomeBag } from "@/lib/homeStats";

/** What the shopper wrote or chose for one line (a gift card's name and message, a configurator's parts). */
export type LineDetail = { label: string; value: string };
/**
 * A line of the bag. `key` is what tells two lines apart: the variant, or the variant with its details, so two gift
 * cards of one amount for two people are two lines (the server keeps them apart too).
 */
export type CartItem = { variantId: string; quantity: number; details?: LineDetail[]; key: string };

/** The shopper's details as the store keeps them: up to 6, a label (40) and a value (300), trimmed, none empty. */
export function cleanDetails(raw: unknown): LineDetail[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map((d) => (d && typeof d === "object" ? { label: String((d as LineDetail).label ?? "").trim().slice(0, 40), value: String((d as LineDetail).value ?? "").trim().slice(0, 300) } : null))
    .filter((d): d is LineDetail => !!d && !!d.label && !!d.value)
    .slice(0, 6);
  return out.length ? out : undefined;
}
/** A line's key: its variant, or its variant and details (the same on the server's lines: catalog.service lineKey). */
export function lineKey(variantId: string, details?: LineDetail[] | null): string {
  return details?.length ? `${variantId}|${details.map((d) => `${d.label}=${d.value}`).join("|")}` : variantId;
}
const lineOf = (variantId: string, quantity: number, details?: LineDetail[]): CartItem => ({ variantId, quantity, ...(details ? { details } : {}), key: lineKey(variantId, details) });
/** Sent on window when a piece is added to the bag ({ variantId, quantity }): the small bag (RoseMiniBag) opens on it. */
export const BAG_ADDED = "estabrek:bag-added";
/** Sent on window to open the small bag as it is (the header's bag icon, when the owner chose so). */
export const BAG_OPEN = "estabrek:bag-open";

type CartCtx = {
  items: CartItem[];
  /** `details`: the shopper's own words or choices for this line (a line of its own when they differ). */
  addItem: (variantId: string, qty?: number, details?: LineDetail[]) => void;
  /** By a line's key (a line without details: its variant id). */
  setQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
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
      .map((x) => lineOf(x.variantId, Math.max(1, Number(x.quantity || 1)), cleanDetails(x.details)));
  } catch {
    return [];
  }
}
function writeLS(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.map(({ key: _key, ...item }) => item)));
  } catch {}
}

export function CartProvider({ children, isolated = false }: { children: React.ReactNode; isolated?: boolean }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (!isolated) setItems(readLS());
  }, [isolated]);

  useEffect(() => {
    if (isolated || typeof window === "undefined") return;
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
  }, [isolated]);

  const api: CartCtx = useMemo(() => {
    return {
      items,
      count: items.reduce((a, b) => a + (b.quantity || 0), 0),
      addItem: (variantId, qty = 1, rawDetails) => {
        const addQty = Math.max(1, Number(qty || 1));
        const details = cleanDetails(rawDetails);
        const key = lineKey(variantId, details);
        if (!isolated) {
          roseReact("cart-add"); signal("bag", { variantId }); abConvert("bag"); noteHomeBag();
          window.setTimeout(() => window.dispatchEvent(new CustomEvent(BAG_ADDED, { detail: { variantId, quantity: addQty } })), 0);
        }
        setItems((prev) => {
          const i = prev.findIndex((x) => x.key === key);
          if (i >= 0) {
            const next = [...prev];
            next[i] = { ...next[i], quantity: next[i].quantity + addQty };
            if (!isolated) writeLS(next);
            return next;
          }
          const next = [...prev, lineOf(variantId, addQty, details)];
          if (!isolated) writeLS(next);
          return next;
        });
      },
      setQty: (key, qty) => {
        const q = Math.max(1, Number(qty || 1));
        setItems((prev) => {
          const next = prev.map((x) => (x.key === key ? { ...x, quantity: q } : x));
          if (!isolated) writeLS(next);
          return next;
        });
      },
      removeItem: (key) =>
        setItems((prev) => {
          const next = prev.filter((x) => x.key !== key);
          if (!isolated) writeLS(next);
          return next;
        }),
      clear: () =>
        setItems(() => {
          if (!isolated) writeLS([]);
          return [];
        }),
    };
  }, [items, isolated]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used within CartProvider");
  return v;
}
