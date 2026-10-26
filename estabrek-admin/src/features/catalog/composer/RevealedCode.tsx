// A code shown in full, with a copy button (the codes block, an order's delivery).
import React from "react";
import { toast } from "../../../lib/toast";
import { tr } from "@/lib/words";

export function RevealedCode({ code, onHide }: { code: string; onHide: () => void }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(tr("نسخ الكود", "Copy the code"));
    } catch {
      toast.error(tr("ما انسخ — ممكن تحديده ونسخه باليد", "Didn't copy — select it and copy it by hand"));
    }
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <code dir="ltr" className="select-all rounded bg-black/30 px-2 py-0.5 font-mono text-xs text-white" data-testid="revealed-code">
        {code}
      </code>
      <button type="button" onClick={() => void copy()} className="rounded-lg px-2 py-1 text-xs text-accent-300 hover:bg-accent-500/10">
        {tr("نسخ", "Copy")}
      </button>
      <button type="button" onClick={onHide} className="rounded-lg px-2 py-1 text-xs text-white/50 hover:bg-white/5">
        {tr("إخفاء", "Hide")}
      </button>
    </span>
  );
}
