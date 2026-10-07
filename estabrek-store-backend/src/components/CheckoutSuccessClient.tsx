"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/store/cart";

type VerifyState = "idle" | "loading" | "success" | "error";

function apiBase() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    process.env.API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:4000/v1"
  );
}

export default function CheckoutSuccessClient() {
  const searchParams = useSearchParams();
  const { clear } = useCart();
  const [state, setState] = useState<VerifyState>("idle");
  const [message, setMessage] = useState<string>("");
  const [orderId, setOrderId] = useState<string | null>(null);

  const provider = useMemo(() => {
    const explicit = searchParams.get("provider");
    if (explicit === "stripe" || explicit === "paypal") return explicit;
    if (searchParams.get("session_id")) return "stripe";
    if (searchParams.get("token")) return "paypal";
    return null;
  }, [searchParams]);

  const sessionId = useMemo(() => {
    return (
      searchParams.get("session_id") ||
      searchParams.get("token") ||
      searchParams.get("sessionId") ||
      ""
    );
  }, [searchParams]);

  useEffect(() => {
    if (!provider || !sessionId) {
      setState("error");
      setMessage("تعذر التحقق من عملية الدفع.");
      return;
    }

    let mounted = true;
    const verify = async () => {
      setState("loading");
      try {
        const res = await fetch(
          `${apiBase()}/storefront/checkout/verify?provider=${encodeURIComponent(provider)}&sessionId=${encodeURIComponent(
            sessionId
          )}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || "تعذر التحقق من الدفع.");
        }

        if (!data?.ok) {
          setState("error");
          setMessage("الدفع لم يكتمل بعد. يرجى المحاولة لاحقاً.");
          return;
        }

        const id = data?.orderId ? String(data.orderId) : null;
        if (mounted) {
          setOrderId(id);
          setState("success");
          setMessage(id ? `تم الدفع بنجاح. رقم الطلب: ${id}` : "تم الدفع بنجاح.");
          clear();
        }
      } catch (e: any) {
        if (!mounted) return;
        setState("error");
        setMessage(e?.message || "تعذر التحقق من الدفع.");
      }
    };

    verify();
    return () => {
      mounted = false;
    };
  }, [provider, sessionId, clear]);

  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
      {state === "loading" && (
        <div className="space-y-3">
          <div className="text-lg font-semibold">جارٍ تأكيد الدفع...</div>
          <div className="text-sm text-white/70">يرجى الانتظار قليلاً.</div>
        </div>
      )}

      {state === "success" && (
        <div className="space-y-3">
          <div className="text-2xl font-bold text-emerald-400">تم الدفع بنجاح</div>
          <div className="text-sm text-white/80">{message}</div>
          <div className="flex items-center justify-center gap-3 pt-3">
            <Link href="/shop" className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium">
              متابعة التسوق
            </Link>
            <Link href="/" className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white/80 hover:bg-white/5">
              الصفحة الرئيسية
            </Link>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-3">
          <div className="text-lg font-semibold text-amber-400">تعذر إكمال الدفع</div>
          <div className="text-sm text-white/80">{message}</div>
          <div className="flex items-center justify-center gap-3 pt-3">
            <Link href="/cart" className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium">
              العودة للسلة
            </Link>
            <Link href="/shop" className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white/80 hover:bg-white/5">
              تسوق من جديد
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
