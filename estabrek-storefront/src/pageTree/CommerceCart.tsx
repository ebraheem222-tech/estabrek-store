"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { RoseCart, type CartLayoutParts, type RoseCartProps } from "@/components/cinematic/RoseCart";
import { tr } from "@/lib/words";
import type { TreeLang } from "./tree";

const Parts = createContext<CartLayoutParts | null>(null);
export type CommerceCartSettings = Omit<RoseCartProps, "renderLayout">;

/** Preview owns synthetic state only: no cart/account hooks, quote requests or purchase callbacks. */
function PreviewCart({ children, lang }: { children: ReactNode; lang: TreeLang }) {
  const [quantity, setQuantity] = useState(1);
  const total = (129 * quantity).toFixed(2);
  const parts: CartLayoutParts = {
    items: <div className="cms-cart-sample"><strong>{tr(lang, "منتج تجريبي", "Sample product")}</strong><div className="rose-cart-qty"><button type="button" aria-label={tr(lang, "إنقاص", "Less")} onClick={() => setQuantity(value => Math.max(1, value - 1))}>−</button><span>{quantity}</span><button type="button" aria-label={tr(lang, "زيادة", "More")} onClick={() => setQuantity(value => value + 1)}>+</button></div></div>,
    summary: <><h2>{tr(lang, "ملخص الطلب", "Order summary")}</h2><dl><div><dt>{tr(lang, "الإجمالي", "Total")}</dt><dd>{total} ₪</dd></div></dl></>,
    checkout: <><h3>{tr(lang, "معاينة إتمام الطلب", "Checkout preview")}</h3><p>{tr(lang, "بيانات تجريبية؛ إرسال الطلب متوقف في المحرّر.", "Sample data; purchases are disabled in the editor.")}</p><button type="button" disabled>{tr(lang, "إتمام الطلب", "Place order")}</button></>,
  };
  return <Parts.Provider value={parts}><div className="cms-commerce" data-commerce-preview="cart">{children}</div></Parts.Provider>;
}

export function CommerceCartProvider({ children, preview, settings, lang }: { children: ReactNode; preview: boolean; settings: CommerceCartSettings; lang: TreeLang }) {
  if (preview) return <PreviewCart lang={lang}>{children}</PreviewCart>;
  return <RoseCart {...settings} renderLayout={parts => <Parts.Provider value={parts}><div className="cms-commerce" data-commerce-cart="">{children}</div></Parts.Provider>} />;
}

export function CommerceCartPart({ part }: { part: "items" | "summary" | "checkout" }) {
  const parts = useContext(Parts);
  return <div className={part === "items" ? "cms-cart-items" : `rose-cart-summary cms-cart-${part}`}>{parts?.[part] ?? null}</div>;
}
