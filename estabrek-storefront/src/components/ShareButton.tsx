"use client";

import React, { useState } from "react";

export default function ShareButton({ title }: { title?: string }) {
  const [msg, setMsg] = useState<string | null>(null);

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      // Prefer native share when available
      // @ts-expect-error - navigator.share is not always typed in older libs
      if (navigator?.share) {
        // @ts-expect-error
        await navigator.share({ title: title || "", url });
        setMsg("تمت المشاركة ✅");
        window.setTimeout(() => setMsg(null), 1500);
        return;
      }
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMsg("تم نسخ الرابط ✅");
        window.setTimeout(() => setMsg(null), 1500);
      } else {
        setMsg("انسخ الرابط من المتصفح");
        window.setTimeout(() => setMsg(null), 2000);
      }
    } catch {
      setMsg("تعذر المشاركة");
      window.setTimeout(() => setMsg(null), 2000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onShare}
        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.08]"
      >
        مشاركة
      </button>
      {msg ? <span className="text-xs text-white/60">{msg}</span> : null}
    </div>
  );
}
